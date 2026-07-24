# 重启持久化 — 需求文档

日期：2026-07-24
基线：`pre-release` / `b20fc4a`（P1 修复 PR #42 之后）
来源：[`docs/optimization/project-optimization-audit.md`](../optimization/project-optimization-audit.md) §4 P0
姊妹文档：[`execution.md`](execution.md)（实现方案）、[`testing.md`](testing.md)（测试矩阵）

## 1. 问题陈述

Skin Store 应用的主题不是写入 Codex 官方持久主题系统，而是通过 CDP（Chrome DevTools Protocol）向 Codex Desktop 的 Electron renderer 注入 CSS。renderer 随 Codex 退出而销毁，因此**每次 Codex 重新启动，主题都会丢失**，除非：

1. Codex 以 `--remote-debugging-address=127.0.0.1 --remote-debugging-port=<port>` 启动（开放 CDP endpoint）；
2. 有常驻组件等待 CDP endpoint 可用；
3. 该组件读取已保存主题并重新注入。

当前实现（`Codex-Skin-Store/src-tauri/src/lib.rs` 的 `install_persistence()`）只在 macOS 注册了一个守护 **injector** 的 LaunchAgent，存在一组已确认缺陷：

| # | 缺陷 | 后果 |
|---|---|---|
| 1 | 用户从 Dock/Finder 正常启动 Codex 时不带 CDP 参数 | injector 常驻但没有可注入的目标，主题不恢复 |
| 2 | Windows `install_persistence()` 是空实现 | Windows 完全无持久化 |
| 3 | macOS Node 路径硬编码 `/Applications/ChatGPT.app/...` | Codex.app / 非标准安装路径下 LaunchAgent 直接失败 |
| 4 | `launchctl load` 不检查退出码与 stderr | 注册失败被当作成功 |
| 5 | `get_status()` 无持久化状态字段 | 用户无法感知"自动恢复"是否生效 |
| 6 | 没有用 KeepAlive 守护 Codex 本身的语义设计 | 若粗暴守护会导致用户主动退出后被强制拉起 |
| 7 | 无任何自动化测试 | 回归不可发现 |

## 2. 领域语言（统一术语）

实现、UI 文案与文档统一使用以下术语：

| 术语 | 定义 |
|---|---|
| **Active Theme** | 最后一次成功应用并持久保存到状态目录的主题 |
| **Persistence Supervisor** | 观察 Codex 启动并确保其以可注入方式运行的用户级后台组件 |
| **Injection Session** | 某次 Codex renderer 生命周期内的注入会话；renderer 销毁即会话结束 |
| **User Quit** | 用户明确退出 Codex。supervisor **不得**因此反向拉起 Codex |
| **Controlled Restart** | 检测到运行中的 Codex 无 CDP 参数时，经用户明确同意后执行的一次带 CDP 参数重启 |
| **Official Restore** | 注销持久化、停止 injector、移除注入 CSS 并恢复官方外观的完整动作 |

## 3. 用户场景

### S1 日常重启恢复（核心场景）

用户从 Skin Store 应用了主题并开启"重启后自动恢复"。之后某天用户正常退出 Codex（或重启了 Mac/PC），再从 Dock/开始菜单打开 Codex。15 秒内主题自动恢复，全程无感知。

### S2 首次启用时的受控重启

用户开启"重启后自动恢复"时 Codex 正在运行且不带 CDP 参数。Skin Store 明确提示"需要重启一次 Codex 才能启用自动恢复"，用户确认后执行 Controlled Restart；用户拒绝则保持未启用状态并说明后果。

### S3 用户主动退出不被打扰

用户主动退出 Codex 后，Codex 保持退出。supervisor 只在 Codex **再次出现**时工作，绝不自动拉起 Codex。

### S4 切换主题后重启

用户切换到新主题后重启 Codex，恢复的是**最后一次成功应用**的主题，不是历史主题。

### S5 恢复官方

用户点击"恢复官方"。系统注销 supervisor、停止 injector、清理注入与持久化状态，Codex 回到官方外观。之后重启 Codex 不再有任何注入行为。

### S6 注册失败可见

supervisor 注册失败（权限、路径、Node 缺失等）时，UI 明确显示失败原因与"修复自动恢复"入口，不允许静默忽略。

### S7 非标准安装环境

Codex 安装在非默认位置（`Codex.app`、`ChatGPT.app`、其他路径）时，supervisor 通过动态发现定位 bundle 与签名 Node，不依赖硬编码路径。

## 4. 范围

### 4.1 包含

- macOS 与 Windows 两平台的 supervisor 注册、运行、注销；
- Active Theme / 端口 / 启用状态 / 诊断信息的结构化状态文件；
- Skin Store UI：持久化开关、状态展示、"修复自动恢复"操作、首次受控重启说明；
- 无 CDP 时的一次性 Controlled Restart（需用户同意）；
- Official Restore 的完整清理；
- 单元测试、adapter 测试与两平台真实安装包 E2E（见 `testing.md`）。

### 4.2 不包含（明确不做）

- **不修改 Codex 安装包或 renderer 文件**——破坏签名、升级兼容性与可恢复性；
- **不用 KeepAlive / 看门狗守护 Codex 本身**——User Quit 语义不可违背；
- 不实现跨机器/多用户的主题漫游；
- 不处理 Codex CLI（终端）主题的持久化——CLI 主题写 `~/.codex/config.toml`，本身就是持久的，无需 supervisor。

## 5. 进程语义（不变量）

以下语义是验收的硬约束：

1. **I1 被动观察**：supervisor 只观察 Codex 进程的出现与 CDP 可用性，永不主动启动 Codex。唯一例外是 S2 中经用户明确同意的 Controlled Restart。
2. **I2 User Quit 终态**：Codex 进程消失后，supervisor 回到等待状态，不做任何拉起动作。
3. **I3 幂等注入**：对同一 Injection Session 重复注入是安全的；supervisor 崩溃重启后能识别"已注入"状态，不产生叠加样式。
4. **I4 状态真源**：Active Theme、端口、启用状态以状态目录中的结构化文件为准，内存状态与 UI 都是其投影。
5. **I5 失败可见**：注册、启动、注入的每一步失败都必须写入状态文件并可在 UI 中呈现，禁止静默吞错。
6. **I6 可完全移除**：Official Restore 后，系统中不残留任何自启项、后台进程或注入产物（引擎文件与主题库除外，它们属于"安装"而非"持久化"）。

## 6. 功能需求

### FR-1 持久化开关

Skin Store 提供"重启后自动恢复主题"开关。

- 开启：保存 Active Theme + 端口 + 启用状态 → 注册 supervisor → 若当前 Codex 无 CDP，进入 S2 受控重启流程；
- 关闭：注销 supervisor，保留 Active Theme 记录（用户再开启时无需重选主题）；
- 开关操作失败时回滚 UI 状态并显示具体原因。

### FR-2 supervisor 运行行为

supervisor 注册为当前用户级自启组件（不需要管理员/root）：

1. 等待 Codex 进程出现（轮询或系统事件，实现见 `execution.md`）；
2. 探测已保存端口的 CDP endpoint；
3. 有 CDP：启动/连接 watch injector，对当前 Injection Session 重新注入 Active Theme；
4. 无 CDP：向用户提示一次（系统通知或下次打开 Skin Store 时的横幅），引导执行 Controlled Restart；**不**在用户不知情时重启 Codex；
5. 注入成功后写入可诊断状态（最后成功时间、注入的 theme id、CDP 端口）。

### FR-3 状态与诊断

状态文件（结构化 JSON，schema 见 `execution.md`）至少包含：

- `enabled`：持久化是否启用；
- `activeThemeId` / `activeThemeName`；
- `port`：CDP 端口；
- `supervisorVersion`：用于升级迁移；
- `lastSuccessAt` / `lastInjectedThemeId`；
- `lastError`：最近一次失败的阶段与原因。

`get_status()` 向 UI 暴露持久化状态：`disabled / registered / waiting-for-codex / injected / error`。

### FR-4 修复操作

UI 提供"修复自动恢复"：重新执行注册流程（重写自启项、校验 Node 路径、校验状态文件），并报告修复结果。

### FR-5 恢复官方（Official Restore）

一键完成：注销 supervisor → 停止 injector → 重建基础 CSS（移除 pokemon 块）→ 清理持久化状态文件 → Codex 重启后回到官方外观。任何一步失败都不得报告整体成功，需保留可重试状态。

### FR-6 动态发现

Codex bundle 与签名 Node 一律通过运行时发现（macOS 复用 `mdfind`/`LSRegister` 语义，Windows 复用 Appx 查询），禁止硬编码绝对路径。发现失败属于"注册失败"，走 S6。

## 7. 非功能需求

- **开销**：supervisor 空闲时 CPU 可忽略（进程观察间隔 ≥ 2s 或事件驱动），内存 < 30 MB；
- **时延**：Codex 出现到注入完成 ≤ 15 秒（验收标准 A1）；
- **安全**：CDP 只绑定 `127.0.0.1`；端口冲突时自动选择新端口并更新状态文件；
- **升级兼容**：状态文件带 schema 版本，supervisor 升级时执行迁移，旧版本状态不得导致崩溃；
- **可回滚**：任何阶段都可通过 Official Restore 回到官方状态。

## 8. 验收标准

| # | 标准 | 对应场景 |
|---|---|---|
| A1 | 应用主题并开启持久化后退出 Codex，从 Dock/开始菜单正常打开，主题在 15 秒内恢复 | S1 |
| A2 | 首次检测到无 CDP 时，仅在用户明确同意后执行一次 Controlled Restart | S2 |
| A3 | 用户主动退出 Codex 后，Codex 保持退出 ≥ 10 分钟不被拉起 | S3 |
| A4 | 注销/登录或系统重启后正常打开 Codex，主题仍恢复 | S1 |
| A5 | 切换主题后重启，恢复的是最后一次成功应用的主题 | S4 |
| A6 | Official Restore 后：自启项已移除、injector 已停止、状态文件已清理、重启 Codex 无注入 | S5 |
| A7 | `Codex.app`、`ChatGPT.app`、非默认安装位置均通过动态发现正常工作 | S7 |
| A8 | 注册/启动/注入失败在 UI 与日志中显示具体阶段与原因 | S6 |
| A9 | macOS 与 Windows 各至少完成一次**真实安装包**（DMG/NSIS）E2E | 全部 |
| A10 | 端口被占用时自动换端口且恢复功能不受影响 | 健壮性 |

## 9. 已知风险

- **Codex 升级**：升级可能改变 bundle 结构、Node 路径或渲染流程。supervisor 需在每次工作时重新发现路径，发现失败进入 error 态并提示修复；
- **macOS 签名/公证**：未签名的 Skin Store 首次注册 LaunchAgent 可能被 Gatekeeper 拦截，E2E 需覆盖；
- **Windows 商店版 Codex（Appx）**：进程名与命令行获取方式与 exe 版不同，adapter 测试需覆盖；
- **多实例**：用户同时开多个 Codex 窗口属于同一 renderer 生命周期，注入语义不变，但 E2E 需确认不重复注入。
