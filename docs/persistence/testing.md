# 重启持久化 — 测试文档

日期：2026-07-24
需求：[`requirements.md`](requirements.md)（验收标准 A1–A10 编号与本文件对应）
实现：[`execution.md`](execution.md)

## 1. 测试策略

按 TDD 执行：先写失败测试，再实现。分层如下：

| 层 | 工具 | 目标 | 运行时机 |
|---|---|---|---|
| 单元测试（Rust） | `cargo test` | 领域模型、状态机、状态文件读写、TOML/参数契约 | 每次提交，CI 硬门禁 |
| 单元测试（supervisor） | `node --test` | 进程观察决策、CDP 探测、端口顺延、错误重试上限 | 每次提交，CI 硬门禁 |
| Adapter 集成测试 | `cargo test --features=platform-test`（需真实 macOS/Windows） | LaunchAgent/Run 键的注册注销、动态发现 | CI macOS/Windows runner |
| E2E（开发包） | 手动 + 脚本 | A1–A8、A10 | 每个 persistence PR 合并前 |
| E2E（安装包） | 手动 | A9（DMG/NSIS 全链路） | 发布 PR（pre-release→main）前 |

## 2. Rust 单元测试

### 2.1 状态文件（`persistence_store.rs`）

| 用例 | 输入 | 期望 |
|---|---|---|
| 读取不存在的文件 | 空目录 | `Ok(None)`，不报错 |
| 正常往返 | 写入 config → 读回 | 字段完全一致 |
| 原子写入 | 写入中断（注入 panic 前的临时文件） | 旧值完好，临时文件被清理 |
| 损坏 JSON | 手写垃圾内容 | 重置为 `disabled` 默认值 + 错误可查询，不 panic |
| 旧 schema 迁移 | `schemaVersion: 0`（无 `phase` 字段） | 迁移为 v1，保留 `enabled/port/activeThemeId` |
| 未知新 schema | `schemaVersion: 99` | 拒绝读取并报"需升级 Skin Store"，不静默丢数据 |
| 并发写入 | 两个线程同时写 | 最终文件是合法 JSON（atomic rename 保证） |

### 2.2 状态机（`domain/persistence.rs`）

| 用例 | 期望 |
|---|---|
| `watching + Codex 出现` | → `probing` |
| `probing + 有 CDP` | → `injecting` |
| `probing + 无 CDP` | → `needs-restart`（不自动重启） |
| `injecting + 成功` | → `injected`，写 `lastSuccessAt` |
| `injected + Codex 消失` | → `watching`（User Quit，不拉起） |
| 任意态 + 注销 | → `disabled` |
| 连续失败 3 次/小时 | → `error`，停止自动重试 |
| `needs-restart + Codex 重启` | → `probing`（重新探测，不重复打扰） |

### 2.3 Adapter 纯逻辑（可跨平台跑的部分）

| 用例 | 期望 |
|---|---|
| LaunchAgent plist 生成 | 含 supervisor（非 injector）路径、RunAtLoad=true、无硬编码 Node 路径 |
| plist label 稳定 | 与注销逻辑使用同一常量 |
| Run 键值生成 | 正确转义含空格路径 |
| `SupervisorSpec` 序列化 | 含 node/supervisor 脚本/端口/状态根 |
| 命令与脚本参数契约 | Rust 侧拼接的参数列表与 `persistence-supervisor.mjs` 的 arg parser 快照一致（防 P1-1 类回归） |

### 2.4 衔接点回归（已有代码）

| 用例 | 期望 |
|---|---|
| `switch_scene` 成功且 `enabled=true` | `persistence.json` 的 `activeThemeId` 同步更新（验收 A5） |
| `switch_scene` 成功且 `enabled=false` | 状态文件不被创建 |
| `stop_engine` 中 `remove_persistence` 失败 | 整体报错（不静默），CSS 重建结果保留 |

## 3. supervisor（Node）单元测试

`persistence-supervisor.mjs` 配套 `persistence-supervisor.test.mjs`（`node --test`）：

| 用例 | 期望 |
|---|---|
| 进程观察：Codex 未出现 | 不启动 injector，CPU 空闲（观察间隔 ≥ 2s） |
| Codex 出现 + CDP 可连 | 拉起 `injector.mjs --watch` 一次（不重复拉起） |
| Codex 出现 + 端口无响应 | 进入 `needs-restart`，状态文件记录 |
| 端口 9341 被占用 | 顺延到 9342 并更新状态文件（验收 A10） |
| 注入成功 | 状态写入 `lastSuccessAt` + theme id |
| Codex 退出 | injector 被回收（或自行退出后不再拉起），回到观察态 |
| 连续失败 | 3 次/小时后停止重试，写 `error` |
| 收到官方恢复信号（状态文件 `enabled=false`） | 退出自身 |

进程观察/CDP 客户端均依赖注入（传入 mock），测试不需要真实 Codex。

## 4. Adapter 集成测试（CI runner）

### macOS runner

```bash
cd Codex-Skin-Store/src-tauri
cargo test --features=platform-test persistence::macos
```

| 用例 | 期望 |
|---|---|
| register → is_registered | true，plist 存在 |
| register → unregister → is_registered | false，plist 删除，`launchctl print` 无 label |
| 重复 register | 幂等，无残留旧 label（含旧版 injector plist 清理） |
| 伪造 bundle 的 discover_codex | 能找到临时目录中的假 `cua_node/bin/node` |

### Windows runner

```bash
cargo test --features=platform-test persistence::windows
```

| 用例 | 期望 |
|---|---|
| register/unregister Run 键 | 注册表项出现/消失 |
| 重复 register | 幂等 |

## 5. E2E（开发包）— 验收标准映射

前置：真实 macOS/Windows 机器，Codex Desktop 已安装，Skin Store dev 构建（`npm run tauri dev`）。

| 步骤 | 验收 |
|---|---|
| 1. 应用主题 → 开启「自动恢复」→ 退出 Codex → Dock/开始菜单重新打开 | A1：15 秒内主题恢复 |
| 2. Codex 无 CDP 运行时开启开关 | A2：仅提示，用户确认后才 Controlled Restart |
| 3. 主动退出 Codex，观察 10 分钟 | A3：Codex 不被拉起（`pgrep`/任务管理器确认） |
| 4. 注销系统账户 → 重新登录 → 打开 Codex | A4：主题恢复 |
| 5. 切换主题 → 重启 Codex | A5：恢复新主题 |
| 6. 点「恢复官方」→ 检查 | A6：LaunchAgent/Run 键已删、无 supervisor/injector 进程、重启 Codex 无注入 |
| 7. 把 Codex.app 移到非标准路径（或改名为 ChatGPT.app 场景） | A7：动态发现正常，恢复功能不受影响 |
| 8. 删除 Node/破坏 plist 后打开 Skin Store | A8：UI 显示异常阶段与原因，「修复自动恢复」可修复 |
| 9. 占用 9341 端口后重启 Codex | A10：自动换端口，恢复成功 |

每轮 E2E 记录：机器/OS 版本/Codex 版本/结果，附在 PR 描述中。

## 6. E2E（安装包）— 发布前

发布 PR（`pre-release → main`）前，用 CI 产物（DMG + NSIS）各跑一遍第 5 节全部步骤，额外覆盖：

- 首次安装后 Gatekeeper/SmartScreen 提示可接受；
- 安装包内 supervisor 脚本路径正确（不存在 dev 路径残留）；
- 卸载 Skin Store 前先「恢复官方」，系统无残留自启项。

## 7. 验证命令汇总

```bash
# Rust 单元测试
cd Codex-Skin-Store/src-tauri && cargo test

# clippy（CI 门禁）
cargo clippy -- -D warnings

# supervisor 单元测试
node --test Codex-Skin-Store/resources/engine-shared/persistence-supervisor.test.mjs

# 前端 lint/build
cd Codex-Skin-Store && npm run lint && npm run build

# adapter 集成测试（各平台 runner）
cd Codex-Skin-Store/src-tauri && cargo test --features=platform-test
```

## 8. 覆盖率目标

- `domain/persistence.rs`、`persistence_store.rs`：行覆盖 ≥ 90%（纯逻辑，无借口）；
- adapter：关键路径（register/unregister/discover）有集成测试；
- supervisor：决策分支全覆盖（进程出现/消失、有/无 CDP、端口冲突、失败上限）；
- 不追求 UI 层覆盖率数字，UI 靠 E2E 关键路径兜底。
