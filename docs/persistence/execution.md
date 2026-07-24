# 重启持久化 — 执行文档

日期：2026-07-24
需求基线：[`requirements.md`](requirements.md)（术语、场景、验收标准以其为准）
测试矩阵：[`testing.md`](testing.md)

## 1. 总体架构

核心变化：持久化的守护对象从 **injector** 变为 **supervisor**。

```text
┌─────────────────────────────────────────────────────────┐
│ 用户级自启（LaunchAgent / 注册表 Run 键）                  │
│   └── PersistenceSupervisor（常驻，轻量）                  │
│         ├── 观察 Codex 进程出现/消失                      │
│         ├── 探测 CDP endpoint（保存的端口）                │
│         ├── 有 CDP → 拉起 watch injector → 重新注入       │
│         ├── 无 CDP → 提示用户（Controlled Restart 引导）   │
│         └── 读写状态文件（诊断真源）                        │
└─────────────────────────────────────────────────────────┘
         ▲ 注册/注销/状态查询                 ▲ 应用主题时写入
┌────────┴──────────────┐          ┌─────────┴────────────┐
│  Skin Store (Tauri)   │          │  Active Theme 状态目录 │
│  UI：开关/状态/修复    │          │  themes/ + theme.json │
└───────────────────────┘          └──────────────────────┘
```

关键决策：

- **supervisor 复用现有 `injector.mjs --watch` 的进程模型**，但由 supervisor 按需拉起 injector，而不是让 injector 自己常驻。这样"观察 Codex"与"注入"两个职责分离，injector 崩溃不影响观察循环；
- **supervisor 用 Node 脚本实现**（`persistence-supervisor.mjs`），与 injector 共用运行时（macOS 用 Codex 内置签名 Node，Windows 用系统 Node ≥ 22），不引入新的编译产物；
- **不修改 Codex 任何文件**（需求 §4.2），所有行为都通过进程观察 + CDP 完成；
- Rust 侧负责：注册/注销自启项、状态读写、UI 命令；Node 侧负责：进程观察、CDP 探测、拉起 injector。边界清晰，各自可测。

## 2. 领域模型

### 2.1 实体与值对象

| 概念 | 类型 | 说明 |
|---|---|---|
| `PersistenceConfig` | 值对象 | `enabled`、`port`、`supervisorVersion`、`schemaVersion` |
| `ActiveTheme` | 实体 | `id`、`name`、主题目录路径；由 `switch_scene`/`import_theme_zip` 写入 |
| `SupervisorState` | 实体 | 运行期状态：`phase`、`lastSuccessAt`、`lastInjectedThemeId`、`lastError` |
| `PersistenceStatus` | 值对象（UI 投影） | `disabled / registered / waiting-for-codex / injected / error` + 错误详情 |
| `CodexInstallation` | 值对象 | 动态发现结果：bundle 路径、Node 路径、进程匹配模式 |

### 2.2 状态机（supervisor `phase`）

```text
              注册成功
   disabled ──────────► watching ──Codex 出现──► probing
      ▲                    ▲                       │
      │                    │ Codex 消失             ├─ 有 CDP ─► injecting ─► injected
      │ 注销               │                        │              │
      └────────────────────┴◄── User Quit           └─ 无 CDP ─► needs-restart
            (任何状态可注销)        (回到 watching)         │
                                            用户执行 Controlled Restart 后 ─► probing
```

- 任何 `injecting/injected` 阶段 Codex 进程消失 → 回到 `watching`（不变量 I2）；
- 任何失败 → `error` 相 + `lastError`，不自动重试超过 3 次/小时，避免失败风暴；
- `needs-restart` 是稳定态：每次 Codex 重启后重新探测，不重复打扰用户。

### 2.3 状态文件

位置：`<状态根>/persistence.json`（macOS：`~/Library/Application Support/CodexDreamSkinStudio/`；Windows：`%LOCALAPPDATA%/CodexDreamSkin/`）。

```json
{
  "schemaVersion": 1,
  "enabled": true,
  "port": 9341,
  "supervisorVersion": "1.0.0",
  "activeThemeId": "grassland",
  "activeThemeName": "草原",
  "phase": "injected",
  "lastSuccessAt": "2026-07-24T10:00:00Z",
  "lastInjectedThemeId": "grassland",
  "lastError": null
}
```

- 写入一律走已有的 `atomic_write`（先写临时文件再 rename）；
- 读取失败（损坏/旧 schema）→ 迁移或重置为 `disabled`，并向 UI 报告，不崩溃；
- `activeThemeId` 由 `switch_scene` 成功时同步更新（不变量 I4、验收 A5）。

## 3. 平台 Adapter

### 3.1 macOS

| 能力 | 实现 |
|---|---|
| 自启注册 | LaunchAgent `com.codex-themes.skin-store.supervisor.plist`，`RunAtLoad=true`、**`KeepAlive=false`**（supervisor 自己决定生死，崩溃由 launchd 的 `ThrottleInterval` 保护即可；若后续需要保活再开 `KeepAlive`，守护对象是 supervisor 而非 Codex，不违反 User Quit 语义） |
| 注册命令 | `launchctl bootstrap gui/<uid> <plist>` / `bootout` / `kickstart`；**检查退出码与 stderr**（修复审计缺陷 #4） |
| Codex 发现 | `mdfind kMDItemCFBundleIdentifier == 'com.openai.codex'`，取第一个含 `Contents/Resources/cua_node/bin/node` 的 bundle；fallback 扫描 `/Applications`、`~/Applications` |
| 进程观察 | `pgrep -fl` 匹配 bundle 可执行名，间隔 3s |
| Node | 发现到的 bundle 内签名 Node，不写死路径（修复审计缺陷 #3） |

### 3.2 Windows

| 能力 | 实现 |
|---|---|
| 自启注册 | 当前用户 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 键 `CodexThemesSkinSupervisor`，值为 `<node> <supervisor.mjs>`。备选：计划任务（登录触发器），首版用 Run 键即可 |
| Codex 发现 | `Get-AppxPackage OpenAI.Codex` 拿 InstallLocation；fallback `Get-Process` 匹配 `codex`/`ChatGPT` |
| 进程观察 | WMI `Win32_Process` 轮询（`Get-CimInstance`），间隔 3s；读取 CommandLine 判断是否带 `--remote-debugging-port` |
| Node | 系统 `node` ≥ 22（沿用现有 `node_version()` 检测；缺失时注册失败并引导安装） |

### 3.3 端口选择

- 默认 9341（沿用现状）；
- supervisor 启动时探测端口是否被非 Codex 进程占用，被占则顺延（9342…9350），更新状态文件并通知 injector；
- CDP 永远绑定 `127.0.0.1`（需求 §7）。

## 4. 代码结构（落在拆分后的模块上）

当前 `lib.rs` 约 1200 行，审计已要求拆分。持久化功能的落地**顺便完成对应部分的拆分**（不一次拆完整个文件，只拆持久化涉及的部分）：

```text
src-tauri/src/
├── lib.rs                 # 仅保留 run() 与命令注册
├── commands.rs            # #[tauri::command] 薄壳，调用 application 层
├── domain/
│   ├── mod.rs
│   └── persistence.rs     # PersistenceConfig / SupervisorState / PersistenceStatus / 状态机
├── application/
│   ├── mod.rs
│   └── persistence_service.rs  # enable/disable/repair/status 用例
└── infrastructure/
    ├── mod.rs
    ├── persistence_store.rs    # persistence.json 原子读写 + schema 迁移
    └── platform/
        ├── mod.rs              # trait PersistencePlatform
        ├── macos.rs            # LaunchAgent + mdfind + pgrep
        └── windows.rs          # Run 键 + Appx + WMI
```

`trait PersistencePlatform`：

```rust
pub trait PersistencePlatform {
    fn register(&self, spec: &SupervisorSpec) -> Result<(), PersistenceError>;
    fn unregister(&self) -> Result<(), PersistenceError>;
    fn is_registered(&self) -> bool;
    fn discover_codex(&self) -> Result<CodexInstallation, PersistenceError>;
}
```

错误类型 `PersistenceError` 带阶段标记（`Register / Discover / Io / Script`），保证 S6"失败可见"能精确到阶段。

引擎侧新增 `persistence-supervisor.mjs`，放在 vendor 引擎 `scripts/` 旁边（Skin Store 资源目录，安装引擎时一并部署到状态根）。

## 5. 与现有代码的衔接点

| 现有代码 | 改动 |
|---|---|
| `install_persistence()`（macOS） | 改为注册 supervisor plist（当前写的是 injector plist），走 `PersistencePlatform` |
| `install_persistence()`（Windows 空实现） | 实现 Run 键注册（修复审计缺陷 #2） |
| `remove_persistence()` | 注销 supervisor + 清理 `persistence.json`（Official Restore 一部分） |
| `engine_node()`（硬编码） | 移入 `CodexInstallation` 动态发现（修复审计缺陷 #3） |
| `get_status()` | 增加 `persistence: PersistenceStatus` 字段（修复审计缺陷 #5） |
| `switch_scene()` | 成功后更新 `persistence.json` 的 `activeThemeId`（若 `enabled`） |
| `stop_engine()` | 完整 Official Restore：unregister → 停 injector → 重建基础 CSS → 清状态 |

## 6. UI 改动

- 主题应用区新增「重启后自动恢复主题」开关，状态来自 `get_status().persistence`；
- 状态徽章：`未启用 / 已注册 / 等待 Codex / 已注入 / 异常`；
- 「异常」状态显示 `lastError` 阶段与原因，附「修复自动恢复」按钮（重跑注册）；
- 开启开关时若 Codex 正在运行且无 CDP：弹说明对话框「需要重启一次 Codex 才能启用自动恢复」，确认后执行 Controlled Restart，取消则开关回滚；
- 首次受控重启后 toast 提示「自动恢复已生效」。

## 7. 分支与 PR 计划（遵循仓库 pre-release 模型）

| PR | 分支 | 内容 | 依赖 |
|---|---|---|---|
| 1 | `docs/persistence-plan`（本分支） | 三份设计文档 | 无 |
| 2 | `feat/persistence-core` | 领域模型 + 状态文件 + `PersistencePlatform` trait + macOS/Windows adapter + 单元测试 | PR 1 |
| 3 | `feat/persistence-supervisor` | `persistence-supervisor.mjs` + injector 拉起逻辑 + adapter 集成测试 | PR 2 |
| 4 | `feat/persistence-ui` | `get_status` 扩展 + UI 开关/状态/修复/受控重启流程 | PR 3 |
| 5 | `test/persistence-e2e` | 开发包 E2E（macOS + Windows runner 或手动） | PR 4 |

每个 PR 独立可合、行为不回退：PR 2 落地时旧 `install_persistence` 行为保持可用（feature flag 或并存），PR 3 才切换守护对象。

## 8. 迁移与回滚

### 8.1 从旧实现迁移

用户系统里可能已存在旧的 injector LaunchAgent（`com.codex-themes.skin-store.injector.plist`）：

- 新版 `register()` 前先 `bootout` 并删除旧 plist；
- 旧 `state.json` 中的 `port` 迁移进 `persistence.json`；
- 迁移发生在 Skin Store 启动时（检测旧 plist 存在即执行），日志记录迁移结果。

### 8.2 回滚

- 任何阶段可用 Official Restore 回到官方状态（需求 I6）；
- 代码回滚（revert PR）后，残留的新 supervisor plist/Run 键对旧版本无害（旧版本不读 `persistence.json`），但发版说明需提示用户点一次「恢复官方」清理。

## 9. 安全边界

- CDP 仅 `127.0.0.1`；supervisor 不开放任何网络端口；
- supervisor 只启动两类子进程：签名 Node 运行的 injector、平台查询命令（pgrep/launchctl/powershell）；命令行参数不含用户输入拼接（主题 id 走 `sanitize_component` 白名单校验）；
- 状态文件不存任何 Codex 账号/会话信息；
- 受控重启只向 Codex 追加 `--remote-debugging-*` 参数，不修改其安装目录。

## 10. 待确认事项（实现前需验证）

1. Windows 商店版 Codex 的进程名与 CommandLine 是否可读（Appx 容器限制）——PR 2 前手动验证；
2. macOS `launchctl bootstrap gui/<uid>` 在未签名的 dev 构建上是否有额外权限弹窗——PR 3 前验证；
3. Codex 更新后 `cua_node` 路径是否稳定——动态发现已兜底，但需记录实测结果到 testing.md。
