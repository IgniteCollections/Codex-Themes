import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LIMITS,
  createInitialState,
  decide,
  pruneAttempts,
  selectPort,
  toStateFile,
  SCHEMA_VERSION,
} from "./persistence-core.mjs";

const T0 = 1_800_000_000_000;
const BASE_CONFIG = {
  enabled: true,
  supervisorVersion: "1.0.0",
  activeThemeId: "grassland",
  activeThemeName: "草原",
};

function obs(overrides = {}) {
  return { codexPid: null, cdpOk: false, injectorAlive: false, injected: false, ...overrides };
}

test("Codex 未运行时保持 watching，不产生任何动作", () => {
  const state = createInitialState(T0);
  const { state: next, actions } = decide(state, obs(), T0 + 1000);
  assert.equal(next.phase, "watching");
  assert.deepEqual(actions, []);
});

test("Codex 出现 → probing 并要求探测 CDP", () => {
  const state = createInitialState(T0);
  const { state: next, actions } = decide(state, obs({ codexPid: 1234 }), T0 + 1000);
  assert.equal(next.phase, "probing");
  assert.equal(next.codexPid, 1234);
  assert.ok(actions.some((a) => a.type === "probe-cdp"));
  assert.ok(actions.some((a) => a.type === "persist"));
});

test("probing + 有 CDP → injecting 并拉起 injector", () => {
  let state = { ...createInitialState(T0), phase: "probing", codexPid: 1234, codexRunning: true };
  const { state: next, actions } = decide(state, obs({ codexPid: 1234, cdpOk: true }), T0 + 2000);
  assert.equal(next.phase, "injecting");
  const launch = actions.find((a) => a.type === "launch-injector");
  assert.ok(launch, "应拉起 injector");
  assert.equal(launch.port, DEFAULT_LIMITS.fallbackPorts[0]);
});

test("probing + 无 CDP → needs-restart，不自动重启 Codex", () => {
  let state = { ...createInitialState(T0), phase: "probing", codexPid: 1234, codexRunning: true };
  const { state: next, actions } = decide(state, obs({ codexPid: 1234, cdpOk: false }), T0 + 2000);
  assert.equal(next.phase, "needs-restart");
  assert.ok(actions.some((a) => a.type === "notify-needs-restart"));
  assert.ok(!actions.some((a) => a.type === "launch-injector"));
});

test("injecting + 注入成功 → injected，记录成功时间并清空失败计数", () => {
  let state = {
    ...createInitialState(T0),
    phase: "injecting",
    codexPid: 1234,
    codexRunning: true,
    injectorPid: 777,
    attempts: [T0 - 1000],
    lastError: { stage: "inject", message: "x", at: "…" },
  };
  const { state: next, actions } = decide(
    state,
    obs({ codexPid: 1234, injectorAlive: true, injected: true }),
    T0 + 3000,
  );
  assert.equal(next.phase, "injected");
  assert.equal(next.attempts.length, 0);
  assert.equal(next.lastError, null);
  assert.ok(next.lastSuccessAt);
  assert.ok(actions.some((a) => a.type === "mark-injected"));
});

test("User Quit：Codex 消失 → 回到 watching，回收 injector，绝不拉起 Codex", () => {
  let state = {
    ...createInitialState(T0),
    phase: "injected",
    codexPid: 1234,
    codexRunning: true,
    injectorPid: 777,
  };
  const { state: next, actions } = decide(
    state,
    obs({ codexPid: null, injectorAlive: true }),
    T0 + 4000,
  );
  assert.equal(next.phase, "watching");
  assert.equal(next.codexPid, null);
  assert.equal(next.injectorPid, null);
  assert.ok(actions.some((a) => a.type === "kill-injector" && a.pid === 777));
  assert.ok(!actions.some((a) => a.type === "launch-codex"), "绝不主动拉起 Codex");
});

test("Codex pid 变化 = 新 Injection Session → 重新 probing + 重新注入", () => {
  let state = {
    ...createInitialState(T0),
    phase: "injected",
    codexPid: 1234,
    codexRunning: true,
    injectorPid: 777,
  };
  const { state: next, actions } = decide(
    state,
    obs({ codexPid: 4321, injectorAlive: true }),
    T0 + 5000,
  );
  assert.equal(next.phase, "probing");
  assert.equal(next.codexPid, 4321);
  assert.equal(next.injectorPid, null);
  assert.ok(actions.some((a) => a.type === "kill-injector"));
  assert.ok(actions.some((a) => a.type === "probe-cdp"));
});

test("injector 在 injected 态异常退出 → 记失败并回到 probing 重试", () => {
  let state = {
    ...createInitialState(T0),
    phase: "injected",
    codexPid: 1234,
    codexRunning: true,
    injectorPid: 777,
  };
  const { state: next } = decide(
    state,
    obs({ codexPid: 1234, injectorAlive: false }),
    T0 + 6000,
  );
  assert.equal(next.phase, "probing");
  assert.equal(next.lastError.stage, "watch");
  assert.equal(next.attempts.length, 1);
});

test("失败达到每小时上限 → error 态，停止自动重试", () => {
  let state = {
    ...createInitialState(T0),
    phase: "injected",
    codexPid: 1234,
    codexRunning: true,
    injectorPid: 777,
    attempts: [T0 - 1000, T0 - 2000], // 一小时内已有 2 次
  };
  const { state: next } = decide(
    state,
    obs({ codexPid: 1234, injectorAlive: false }),
    T0,
  );
  assert.equal(next.phase, "error");
  assert.equal(next.attempts.length, DEFAULT_LIMITS.maxAttemptsPerHour);
});

test("error 态不做任何事；Codex 重启后给一次恢复机会", () => {
  let state = {
    ...createInitialState(T0),
    phase: "error",
    codexPid: 1234,
    codexRunning: true,
    lastError: { stage: "inject", message: "x", at: "…" },
  };
  // 同一 pid：不重试
  const same = decide(state, obs({ codexPid: 1234, cdpOk: true }), T0 + 1000);
  assert.equal(same.state.phase, "error");
  assert.deepEqual(same.actions, []);
  // Codex 重启（pid 变化）：自动恢复探测
  const restarted = decide(state, obs({ codexPid: 9999, cdpOk: true }), T0 + 2000);
  assert.equal(restarted.state.phase, "probing");
  assert.equal(restarted.state.lastError, null);
});

test("一小时前的失败记录会被清理", () => {
  const old = T0 - 3_700_000;
  const recent = T0 - 60_000;
  assert.deepEqual(pruneAttempts([old, recent], T0), [recent]);
});

test("端口顺延：被占用时选择下一个候选", () => {
  assert.equal(selectPort(9341, new Set()), 9341);
  assert.equal(selectPort(9341, new Set([9341])), 9342);
  assert.equal(selectPort(9341, new Set([9341, 9342, 9343, 9344, 9345])), null);
});

test("状态文件序列化符合 schema v1", () => {
  const state = {
    ...createInitialState(T0),
    phase: "injected",
    lastSuccessAt: "2026-07-24T10:00:00.000Z",
    lastInjectedThemeId: "grassland",
  };
  const file = toStateFile(state, BASE_CONFIG, T0);
  assert.equal(file.schemaVersion, SCHEMA_VERSION);
  assert.equal(file.enabled, true);
  assert.equal(file.phase, "injected");
  assert.equal(file.activeThemeId, "grassland");
  assert.equal(file.lastInjectedThemeId, "grassland");
  assert.equal(file.lastError, null);
  assert.ok(file.updatedAt);
});

test("needs-restart 态下 CDP 恢复（用户手动加参数）→ injecting", () => {
  let state = {
    ...createInitialState(T0),
    phase: "needs-restart",
    codexPid: 1234,
    codexRunning: true,
  };
  const { state: next, actions } = decide(
    state,
    obs({ codexPid: 1234, cdpOk: true }),
    T0 + 7000,
  );
  assert.equal(next.phase, "injecting");
  assert.ok(actions.some((a) => a.type === "launch-injector"));
});
