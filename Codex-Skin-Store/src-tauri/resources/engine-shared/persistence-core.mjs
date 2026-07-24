/**
 * Persistence Supervisor — 决策核心（无副作用，供 node --test 直接覆盖）。
 *
 * 状态机（docs/persistence/execution.md §2.2）：
 *   watching → probing → injecting → injected
 *                │            │
 *                └─ 无 CDP → needs-restart
 *   任何态 + Codex 消失 → watching（User Quit，绝不拉起）
 *   任意失败累积超上限 → error（停止自动重试）
 *
 * 本模块只负责「给定观察结果，算出下一个状态与要执行的动作」，
 * 进程观察、CDP 探测、子进程拉起全部在 persistence-supervisor.mjs 中实现。
 */

export const PHASES = new Set([
  "watching",
  "probing",
  "injecting",
  "injected",
  "needs-restart",
  "error",
]);

export const DEFAULT_LIMITS = Object.freeze({
  /** 观察 Codex 进程的轮询间隔（毫秒）。 */
  pollIntervalMs: 3000,
  /** 注入完成判定超时（毫秒）。 */
  injectTimeoutMs: 15000,
  /** 每小时自动重试上限，超过进入 error 态（防止失败风暴）。 */
  maxAttemptsPerHour: 3,
  /** CDP 备用端口（端口被占用时顺延）。 */
  fallbackPorts: Object.freeze([9341, 9342, 9343, 9344, 9345]),
});

export function createInitialState(now, limits = DEFAULT_LIMITS) {
  return {
    phase: "watching",
    codexRunning: false,
    /** 当前 Injection Session 的标识（Codex pid），Codex 重启后必须重新注入。 */
    codexPid: null,
    port: limits.fallbackPorts[0],
    injectorPid: null,
    /** 滚动一小时窗口内的失败尝试时间戳。 */
    attempts: [],
    lastSuccessAt: null,
    lastInjectedThemeId: null,
    lastError: null,
    startedAt: now,
  };
}

/** 清理一小时之前的失败记录。 */
export function pruneAttempts(attempts, now, windowMs = 3600_000) {
  return attempts.filter((t) => now - t < windowMs);
}

/**
 * 纯决策函数：根据观察快照推进状态机。
 *
 * @param state 当前状态（不会被修改，返回新对象）
 * @param obs 观察快照：
 *   - codexPid: number|null  观察到的 Codex 主进程 pid（null = 未运行）
 *   - cdpOk: boolean         已保存端口上的 CDP endpoint 是否可用
 *   - injectorAlive: boolean 记录中的 injector 进程是否仍在运行
 *   - injected: boolean      injector 报告已完成本次注入（action 结果反馈）
 * @param now 当前时间戳（毫秒）
 * @returns { state, actions[] }，actions ∈
 *   {type:"probe-cdp"} 本次 tick 需要探测 CDP（调用方执行后回填 obs 重算）
 *   {type:"launch-injector", port}
 *   {type:"mark-injected"}
 *   {type:"kill-injector", pid}
 *   {type:"notify-needs-restart"}
 *   {type:"persist"} 状态需要写盘
 */
export function decide(state, obs, now, limits = DEFAULT_LIMITS) {
  const next = { ...state };
  const actions = [];

  // --- 全局规则 1：持久化被关闭（由调用方在加载配置时拦截，不走到这里） ---
  // --- 全局规则 2：User Quit / Codex 消失 → 回到 watching，绝不拉起 ---
  if (!obs.codexPid) {
    if (state.injectorPid && obs.injectorAlive) {
      actions.push({ type: "kill-injector", pid: state.injectorPid });
    }
    if (state.phase !== "watching" || state.codexRunning || state.injectorPid) {
      next.phase = "watching";
      next.codexRunning = false;
      next.codexPid = null;
      next.injectorPid = null;
      actions.push({ type: "persist" });
    }
    return { state: next, actions };
  }

  // --- error 态：不重试，只等 Codex 重启或用户修复（外部命令重置） ---
  if (state.phase === "error") {
    // Codex 进程换了一批（重启过）则给一次自动恢复机会
    if (state.codexPid && obs.codexPid !== state.codexPid) {
      next.phase = "probing";
      next.codexPid = obs.codexPid;
      next.codexRunning = true;
      next.attempts = [];
      next.lastError = null;
      actions.push({ type: "probe-cdp" }, { type: "persist" });
    }
    return { state: next, actions };
  }

  const recordFailure = (stage, message) => {
    next.attempts = [...pruneAttempts(next.attempts, now), now];
    next.lastError = { stage, message, at: new Date(now).toISOString() };
    if (next.attempts.length >= limits.maxAttemptsPerHour) {
      next.phase = "error";
    }
    actions.push({ type: "persist" });
  };

  // --- Codex 正在运行 ---
  next.codexRunning = true;

  // Codex pid 变化 = 新的 Injection Session，必须重新注入
  if (state.codexPid !== obs.codexPid) {
    if (state.injectorPid && obs.injectorAlive) {
      actions.push({ type: "kill-injector", pid: state.injectorPid });
    }
    next.codexPid = obs.codexPid;
    next.injectorPid = null;
    next.phase = "probing";
    actions.push({ type: "probe-cdp" }, { type: "persist" });
    return { state: next, actions };
  }

  switch (state.phase) {
    case "watching": {
      next.phase = "probing";
      actions.push({ type: "probe-cdp" }, { type: "persist" });
      break;
    }
    case "probing": {
      if (obs.cdpOk) {
        next.phase = "injecting";
        actions.push(
          { type: "launch-injector", port: next.port },
          { type: "persist" },
        );
      } else {
        // 无 CDP：等用户 Controlled Restart，不自动重启 Codex
        if (state.phase !== "needs-restart") {
          next.phase = "needs-restart";
          actions.push({ type: "notify-needs-restart" }, { type: "persist" });
        }
      }
      break;
    }
    case "needs-restart": {
      // 用户完成受控重启后 pid 变化会走上面的分支；pid 未变但 CDP 出现
      // （例如用户手动加了参数）也要能恢复
      if (obs.cdpOk) {
        next.phase = "injecting";
        actions.push(
          { type: "launch-injector", port: next.port },
          { type: "persist" },
        );
      }
      break;
    }
    case "injecting": {
      if (!obs.injectorAlive && state.injectorPid) {
        recordFailure("inject", `injector(pid=${state.injectorPid}) 退出且未报告注入成功`);
        next.injectorPid = null;
        if (next.phase !== "error") {
          next.phase = "probing"; // 还有重试额度，下个 tick 重来
        }
      } else if (obs.injected) {
        next.phase = "injected";
        next.lastSuccessAt = new Date(now).toISOString();
        next.attempts = [];
        next.lastError = null;
        actions.push({ type: "mark-injected" }, { type: "persist" });
      }
      break;
    }
    case "injected": {
      if (!obs.injectorAlive && state.injectorPid) {
        // injector 掉了：重新拉起即可（Codex 没重启，CDP 还在）
        recordFailure("watch", `watch injector(pid=${state.injectorPid}) 异常退出`);
        next.injectorPid = null;
        if (next.phase !== "error") {
          next.phase = "probing";
        }
      }
      break;
    }
    default:
      break;
  }

  return { state: next, actions };
}

/**
 * 端口顺延：被占用时从候选列表选下一个（验收 A10）。
 * @param occupied 已被占用的端口集合
 */
export function selectPort(preferred, occupied, limits = DEFAULT_LIMITS) {
  if (!occupied.has(preferred)) return preferred;
  for (const candidate of limits.fallbackPorts) {
    if (!occupied.has(candidate)) return candidate;
  }
  return null; // 全部占用：调用方报错
}

/** 状态文件 schema（docs/persistence/execution.md §2.3）。 */
export const SCHEMA_VERSION = 1;

export function toStateFile(state, config, now) {
  return {
    schemaVersion: SCHEMA_VERSION,
    enabled: config.enabled,
    port: state.port,
    supervisorVersion: config.supervisorVersion,
    activeThemeId: config.activeThemeId,
    activeThemeName: config.activeThemeName,
    phase: state.phase,
    lastSuccessAt: state.lastSuccessAt,
    lastInjectedThemeId: state.lastInjectedThemeId,
    lastError: state.lastError,
    updatedAt: new Date(now).toISOString(),
  };
}
