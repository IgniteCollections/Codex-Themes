/**
 * Persistence Supervisor — 主循环与副作用。
 *
 * 用法（由 LaunchAgent / Run 键启动）：
 *   node persistence-supervisor.mjs \
 *     --state-root <CodexDreamSkinStudio 状态根> \
 *     --theme-dir <活跃主题目录> \
 *     --injector <injector.mjs 路径> \
 *     --codex-process <进程名正则，如 "ChatGPT|Codex">
 *
 * 设计约束（docs/persistence/requirements.md §5）：
 *   - 只观察 Codex，绝不主动启动 Codex；
 *   - 所有决策在 persistence-core.mjs 的 decide() 中完成，本文件只做 IO；
 *   - 状态文件写 <state-root>/persistence.json（原子写）。
 */
import fs from "node:fs/promises";
import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LIMITS,
  createInitialState,
  decide,
  toStateFile,
} from "./persistence-core.mjs";

const execFileAsync = promisify(execFile);

export function parseSupervisorArgs(argv) {
  const options = {
    stateRoot: null,
    themeDir: null,
    injector: null,
    codexProcess: "ChatGPT|Codex",
    pollIntervalMs: DEFAULT_LIMITS.pollIntervalMs,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--state-root") options.stateRoot = path.resolve(argv[++i]);
    else if (arg === "--theme-dir") options.themeDir = path.resolve(argv[++i]);
    else if (arg === "--injector") options.injector = path.resolve(argv[++i]);
    else if (arg === "--codex-process") options.codexProcess = argv[++i];
    else if (arg === "--poll-interval-ms") options.pollIntervalMs = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.stateRoot) throw new Error("Missing --state-root");
  if (!options.themeDir) throw new Error("Missing --theme-dir");
  if (!options.injector) throw new Error("Missing --injector");
  return options;
}

/** CDP 探测：/json/list 可访问即视为 endpoint 可用。 */
export async function probeCdp(port, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/json/list`, {
      redirect: "error",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** 默认进程观察（macOS）：pgrep 匹配 Codex 主进程，返回最老的 pid。 */
export async function findCodexPid(pattern) {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-x", "-o", "-f", pattern]);
    const pid = Number.parseInt(stdout.trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null; // pgrep 无匹配时退出码为 1
  }
}

export function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

export async function atomicWriteJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tmp, file);
}

/**
 * 运行 supervisor 主循环。
 * @param deps 可注入依赖（测试用）：observe/findCodexPid/probe/spawnInjector/notify/now
 */
export async function runSupervisor(options, deps = {}) {
  const now = deps.now ?? (() => Date.now());
  const findPid = deps.findCodexPid ?? (() => findCodexPid(options.codexProcess));
  const probe = deps.probe ?? ((port) => probeCdp(port));
  const notify = deps.notify ?? (() => {});
  const spawnInjector =
    deps.spawnInjector ??
    ((port) => {
      const child = spawn(
        process.execPath,
        [options.injector, "--watch", "--port", String(port), "--theme-dir", options.themeDir],
        { detached: true, stdio: "ignore" },
      );
      child.unref();
      return child.pid;
    });

  const configPath = path.join(options.stateRoot, "persistence-config.json");
  const statusPath = path.join(options.stateRoot, "persistence.json");
  const engineStatePath = path.join(options.stateRoot, "state.json");

  let state = createInitialState(now());
  let injectorPid = null;

  const tick = async () => {
    const config = await readJson(configPath);
    if (!config || config.enabled !== true) {
      // 持久化被关闭/移除：回收 injector 后退出（会被 launchd/Run 键按需再启）
      if (injectorPid && pidAlive(injectorPid)) {
        try { process.kill(injectorPid); } catch { /* already gone */ }
      }
      return false;
    }

    const codexPid = await findPid();
    const engineState = await readJson(engineStatePath);
    // 端口优先级：配置 > 引擎 state.json > 默认
    state.port = config.port ?? engineState?.port ?? state.port;

    // 当前 injector 是否报告注入完成（复用引擎 state.json 契约）
    const injected =
      injectorPid !== null &&
      engineState?.injectorPid === injectorPid &&
      typeof engineState?.injectorStartedAt === "string";

    let cdpOk = false;
    const needsProbe =
      codexPid !== null &&
      (state.phase === "watching" ||
        state.codexPid !== codexPid ||
        state.phase === "probing" ||
        state.phase === "needs-restart");
    if (needsProbe) {
      cdpOk = await probe(state.port);
    }

    const result = decide(
      { ...state, injectorPid },
      {
        codexPid,
        cdpOk,
        injectorAlive: injectorPid !== null && pidAlive(injectorPid),
        injected,
      },
      now(),
    );
    state = result.state;

    for (const action of result.actions) {
      if (action.type === "launch-injector") {
        try {
          injectorPid = spawnInjector(action.port);
          state.injectorPid = injectorPid;
        } catch (error) {
          state.lastError = { stage: "launch", message: String(error), at: new Date(now()).toISOString() };
        }
      } else if (action.type === "kill-injector") {
        try { process.kill(action.pid); } catch { /* already gone */ }
        if (injectorPid === action.pid) injectorPid = null;
      } else if (action.type === "notify-needs-restart") {
        await notify("needs-restart");
      } else if (action.type === "persist") {
        await atomicWriteJson(statusPath, toStateFile(state, config, now()));
      }
    }
    return true;
  };

  // 主循环：setInterval 驱动；Codex 消失时也会保持低频观察
  const runLoop = async () => {
    const keepGoing = await tick().catch(async (error) => {
      state.lastError = { stage: "tick", message: String(error), at: new Date(now()).toISOString() };
      const config = (await readJson(configPath)) ?? { enabled: true };
      await atomicWriteJson(statusPath, toStateFile(state, config, now())).catch(() => {});
      return true;
    });
    if (!keepGoing) return;
    setTimeout(runLoop, options.pollIntervalMs);
  };
  await runLoop();
}

const invokedDirectly =
  path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const options = parseSupervisorArgs(process.argv.slice(2));
  runSupervisor(options).catch((error) => {
    console.error(`[persistence-supervisor] fatal: ${error?.stack ?? error}`);
    process.exitCode = 1;
  });
}
