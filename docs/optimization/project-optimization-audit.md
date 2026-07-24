# Codex-Themes 项目完成度与优化方案

日期：2026-07-24  
评估基线：`pre-release` / `b20fc4a`  
评估范围：展示网站、主题生成管线、CLI/桌面主题产物、`Codex-Skin-Store`、Dream Skin 引擎、CI/Release、项目文档

## 1. 结论

项目的主题内容和核心演示已经基本完成，但距离“普通用户下载后可稳定长期使用”的发布状态还有明显差距。

- **业务功能完成度：约 84%**。9 个场景的主题产物、展示网站、CLI 主题、桌面配色、完整皮肤和皮肤商店主流程都已存在。
- **工程与发布完成度：约 61%**。CI 已建立，但自动化测试、安装包实发、签名/公证、跨平台端到端验证和重启持久化仍不完整。
- **综合完成度：约 71%**。该数字表示“达到可公开稳定发布标准”的完成度，不是代码行数或页面数量。

当前最重要的问题不是再增加主题，而是完成下面三个闭环：

1. Codex Desktop 正常退出、重新打开后，主题仍能自动恢复；
2. 从 `pre-release` 正式提升到 `main`，实际构建并发布可下载的 NSIS/DMG；
3. 为主题切换、配置改写、ZIP 导入和持久化补自动化测试及 Windows/macOS 实机回归。

## 2. 完成度评分

| 领域 | 权重 | 当前得分 | 完成度 | 判断 |
|---|---:|---:|---:|---|
| 主题数据与生成产物 | 15 | 15 | 100% | 9 场景、89 只宝可梦，生成内容和图片检查通过 |
| 展示网站 | 10 | 9 | 90% | 功能和构建完成，仍有包体与脚手架债务 |
| CLI 与官方桌面配色 | 10 | 10 | 100% | `.tmTheme`、`codex-theme-v1`、4 类终端配色均已生成 |
| Skin Store 核心流程 | 20 | 16 | 80% | 内置主题主流程已实现；恢复、ZIP 导入和完整 E2E 仍有缺陷 |
| 重启后主题持久化 | 15 | 5 | 33% | macOS 仅部分实现，Windows 实际为空实现，正常启动 Codex 不会开放 CDP |
| 质量保障与 CI | 15 | 10 | 67% | lint/build/clippy/生成校验完善，但单元测试与 E2E 为零 |
| 安装包与发布 | 10 | 3 | 30% | workflow 已写但尚未从 `main` 实际产出安装包 |
| 文档与可维护性 | 5 | 3 | 60% | 文档很多，但 7/9 场景、已完成/待办等状态大量过期 |
| **合计** | **100** | **71** | **71%** | 核心可演示，尚未达到稳定发布标准 |

评分证据：

- 本次本地执行两个前端项目的 lint/build、Rust `cargo test`/clippy、数据同步、图片尺寸和生成内容校验，全部通过。
- `cargo test` 显示 **0 个测试**；仓库也没有业务 `*.test.*` / `*.spec.*`。
- 最近一次远端 CI（run `29684508320`）四个 job 全部通过。
- `origin/pre-release` 比 `origin/main` 多 43 个提交；审计时没有 `pre-release → main` 发布 PR。
- 最新 release 为 `v2026.07.17-2345`，**assets 为空**，没有 NSIS/DMG 可下载。

## 3. 已完成内容

### 3.1 主题产物

- 9 个宝可梦场景已经完整落地：草原、海洋、洞穴、岩浆、雪原、无人发电厂、宇宙、城市、实验室。
- 每个场景已有：
  - Codex CLI `.tmTheme`；
  - Codex Desktop 官方 `codex-theme-v1` JSON 和导入字符串；
  - Windows Terminal、iTerm2、Alacritty、kitty 配色；
  - Dream Skin `theme.json`、壁纸和 `scene.css`；
  - 展示网站和 Skin Store 所需数据/素材。
- 生成检查确认 9 个场景、89 只宝可梦，数据副本当前同步。

### 3.2 展示网站

- React/Vite 展示网站已经具备首页、场景图鉴、安装页、场景切换、终端预览和素材展示。
- TypeScript 严格编译、ESLint 和生产构建均通过。
- 视觉风格和主题数据已经形成可演示产品，不再是原型页。

### 3.3 Codex Skin Store

已经实现的主要能力：

- Tauri 2 + React 桌面应用；
- 检测 Codex、Node、引擎、injector 和当前主题状态；
- 安装 Dream Skin 引擎；
- 应用内置主题到 Codex Desktop；
- 应用主题到 Codex CLI；
- 暂停、恢复和验证皮肤；
- 第三方主题 ZIP 的选择和安全解包（持久列表及应用闭环仍未完成）；
- Windows/macOS 平台分支；
- CI 中的前端 lint/build、Rust build/clippy；
- Release workflow 中的 Windows NSIS 和 macOS DMG 构建定义。

### 3.4 已处理的旧评估问题

相对 [`docs/project-review.md`](../project-review.md)，以下问题已经处理或明显改善：

- 已删除无授权真人肖像 preset，默认资源替换为抽象背景；
- Skin Store 已进入 CI，并补 ESLint、Rust build 和 clippy；
- Release workflow 已加入 `tauri-action` 的 NSIS/DMG 构建配置；
- 已补 `generate-mascot-art.py`、数据同步和生成内容检查；
- Tauri dialog/process capability 已补齐；
- 核心网页中的 7 场景文案已部分改为 9 场景；
- ZIP 主题导入、CLI 旧主题键覆盖和 CSS 基础块丢失问题已修复。

## 4. 必须修复的内容

### P0：Codex Desktop 重启后主题丢失

#### 当前现象

当前主题不是写入 Codex 官方持久主题系统，而是通过 CDP 向 Electron renderer 注入 CSS。renderer 随 Codex 退出而销毁，所以每次重新启动都必须：

1. 让 Codex 带 `--remote-debugging-address=127.0.0.1` 和 `--remote-debugging-port=<port>` 启动；
2. 等待 CDP endpoint 可用；
3. 重新连接 renderer；
4. 读取已保存主题并重新注入。

目前 [`Codex-Skin-Store/src-tauri/src/lib.rs`](../../Codex-Skin-Store/src-tauri/src/lib.rs) 的 `install_persistence()` 只在 macOS 写了一个 LaunchAgent，让 `injector.mjs --watch` 常驻。它没有保证用户从 Dock/Finder 正常打开 Codex 时携带 CDP 参数。

因此当前实现只在“经皮肤商店或专用启动脚本启动 Codex”时有效，不能覆盖用户所说的“重启 Codex Desktop App”。Windows 的 `install_persistence()` 直接返回 `Ok(())`，并未真正注册持久化。

#### 当前实现中的具体缺陷

1. **正常启动没有 CDP**：injector 常驻不等于存在可注入的 CDP endpoint。
2. **Windows 为空实现**：注释声称依赖引擎机制，但没有注册、检测或验收该机制。
3. **错误被吞掉**：`start_engine()` 使用 `let _ = install_persistence(&state)`，注册失败仍向 UI 报应用成功。
4. **macOS 路径硬编码**：Node 固定为 `/Applications/ChatGPT.app/...`，不支持 Codex.app、非标准安装路径或未来目录变化。
5. **launchctl 结果未校验**：代码只检查命令是否成功启动，没有检查退出码和 stderr。
6. **状态不可见**：`get_status()` 没有返回“持久化已注册 / 异常 / 需要修复”状态。
7. **退出语义未定义**：不能用 KeepAlive 直接守护 Codex 本身，否则用户主动退出后会被强制重新打开。
8. **没有测试**：缺少退出重开、系统重启、端口变化、禁用持久化、恢复官方外观等测试。

#### 推荐方案：持久化启动监督器

增加一个独立的 `PersistenceSupervisor`，负责“观察 Codex 启动并保证其以可注入方式运行”，而不是只守护 injector。

建议流程：

```text
用户启用持久化
  → 保存 active theme + persistence.enabled + port
  → 注册当前用户级 supervisor
  → supervisor 等待 Codex 进程出现
  → 探测已保存 CDP endpoint
      → 有 CDP：启动/连接 watch injector，重新注入
      → 无 CDP：提示用户并执行一次受控重启，携带 CDP 参数
  → 注入成功后写入可诊断状态
  → 用户主动退出 Codex 后保持退出，不自动拉起
```

平台实现：

- **macOS**：使用 LaunchAgent 只守护 supervisor；supervisor 监听 Codex/ChatGPT 进程启动。优先复用 `discover_codex_app` 的实际 bundle 和签名 Node，不写死 `/Applications/ChatGPT.app`。使用 `launchctl bootstrap/bootout/kickstart`，并检查退出码。
- **Windows**：使用当前用户登录启动项或计划任务运行 supervisor；检测 Codex 进程是否带 CDP 参数，没有时弹出确认并重启一次。不要依赖未验证的“引擎自身机制”。
- **两端共同规则**：active theme、port、启用状态、最后成功时间、最后错误和 supervisor 版本写入结构化状态文件。

不建议直接修改 Codex 安装包或 renderer 文件，因为这会破坏签名、升级兼容性和可恢复性。

#### UI 调整

Skin Store 增加：

- “重启后自动恢复主题”开关；
- 持久化状态：未启用 / 已注册 / 等待 Codex / 已注入 / 异常；
- “修复自动恢复”操作；
- 对首次受控重启给出明确说明；
- 将注册失败作为应用失败或部分失败显示，不允许静默忽略。

#### 验收标准

- 从 Skin Store 应用任意主题后退出 Codex，再从 Dock/开始菜单正常打开，主题在 15 秒内恢复；
- 允许首次检测到无 CDP 时进行一次明确提示的受控重启；
- 用户主动退出 Codex 后，Codex 保持退出，不被 supervisor 自动拉起；
- 注销/登录或系统重启后，再正常打开 Codex，主题仍恢复；
- 切换主题后重启，恢复的是最后一次成功应用的主题；
- “恢复官方”会注销 supervisor、停止 injector、清理持久化状态；
- Codex.app、ChatGPT.app 和非默认安装位置均通过动态发现；
- macOS 与 Windows 各至少完成一次真实安装包 E2E；
- 注册/启动失败会在 UI 和日志中显示具体原因。

### P0：发布链路尚未真正完成

[`release.yml`](../../.github/workflows/release.yml) 已定义 NSIS/DMG 构建，但它只在 `main` push 或手动触发时运行。当前核心实现仍在 `pre-release`：

- `pre-release` 比 `main` 多 43 个提交；
- 没有打开的 `pre-release → main` PR；
- 最新 release 没有任何 assets；
- 因而不能把“workflow 已编写”等同于“安装包已验证并发布”。

修复要求：

1. 先完成持久化 P0 和关键测试；
2. 在 Windows/macOS runner 上真实构建安装包；
3. 安装并走通首次启动、引擎安装、应用、重启恢复、官方恢复；
4. 处理 macOS 签名/公证和 Windows 签名策略；
5. 创建 `pre-release → main` 发布 PR；
6. 验证 release 同时包含 `.exe`/NSIS 与 `.dmg`，并保留校验值。

### P1：没有业务自动化测试

当前 `cargo test` 虽通过，但结果为 0 tests。建议优先补：

- `replace_tui_theme`：空配置、已有 `[tui]`、平铺 `tui.theme`、重复旧键、保留其他段；
- ZIP 导入：合法包、路径穿越、超大文件、重复 id、缺 `theme.json`、非法 JSON；
- 主题切换：active 目录原子替换、旧壁纸清理、CSS 标记块幂等；
- 持久化配置：注册、升级、注销、状态解析和错误传播；
- 生成脚本快照和 9 场景产物矩阵；
- React 关键流程：安装按钮、应用主题、导入 ZIP、错误提示；
- 两平台 E2E：安装 → 应用 → 退出/重开 → 验证 → 恢复。

### P1：三个已确认的功能缺陷

#### 1. macOS“恢复官方”参数不匹配

Rust `stop_engine()` 在 macOS 调用：

```text
restore-dream-skin-macos.sh --force-restart
```

但实际脚本只接受 `--restart-codex`、`--restore-base-theme`、`--uninstall` 和 `--port`。因此 macOS 用户从 Skin Store 点击“恢复官方”会得到 unknown argument，后续 CSS 清理和持久化注销也不会执行。

修复要求：

- 改为脚本真实支持的参数组合；
- 为 Rust command 与平台脚本建立参数契约测试；
- 验证恢复后 Codex 正常启动、CDP 关闭、injector 停止、LaunchAgent/启动项移除；
- 恢复失败时保留可修复状态，不能把部分恢复显示为成功。

#### 2. 仅有平铺 `tui.theme` 时会丢失新主题

`replace_tui_theme()` 遇到：

```toml
tui.theme = "old-theme"
```

会删除该行并把 `replaced` 设为 true，但没有插入新的 `[tui] theme = ...`。随后 `set_tui_theme()` 认为替换已完成，不会追加新段，最终配置里没有任何主题键。

修复要求：

- 解析并重写 TOML，不再依赖行级字符串规则；或至少保证删除平铺键时同步写入新 `[tui]` 段；
- 对平铺键、段内键、重复键、注释、CRLF 和无尾换行补测试；
- 原子写入前备份 `config.toml`，解析失败时不得覆盖用户配置。

#### 3. ZIP 导入主题链路没有闭环

当前实现中：

- `import_theme_zip()` 把主题写到用户主题库；
- `list_scenes()` 却读取应用内置 `resources/themes`，没有读取用户主题库；
- `switch_scene()` 同样只从内置 `resources/themes/<id>` 取包；
- 导入包内的 `.tmTheme` 被尝试写入应用 resources，签名后的 macOS App bundle 不应被运行时修改；
- UI 对导入主题隐藏 CLI 应用按钮，却显示“若含 `.tmTheme` 可应用到 CLI”的文案。

结果是导入成功提示不等于可用：用户主题不会被正确持久列出，刷新后可能消失，应用时会报“主题包不存在”，附带 CLI 主题也没有可执行入口。

修复要求：

- 明确区分 `BuiltinThemeRepository` 与 `ImportedThemeRepository`；
- 列表查询合并内置主题和用户主题库，并按 id 处理覆盖/冲突；
- 切换主题从已解析的 repository 定位包，不假设都在应用 resources；
- `.tmTheme` 保存在用户可写状态目录，应用时直接复制到 `~/.codex/themes`；
- 补“导入 → 刷新/重启 Skin Store → 仍显示 → 应用 Desktop → 应用 CLI → 删除”的 E2E；
- 修正文案，未实现的能力不得显示为可用。

### P1：跨平台验证不完整

现有进度文档记录 Windows 手动链路和 macOS 适配，但同时承认：

- `tauri build` 安装包未验证；
- Windows App 内 invoke 没有逐一联调；
- 重启持久化没有 Windows 实现；
- macOS 当前持久化实现没有正常 Dock 重开验收。

在真实安装包 E2E 完成前，不应标记为“Windows/macOS 稳定支持”。

### P1：文档状态相互矛盾

当前实现是 9 场景，但以下文档仍大量写 6 或 7：

- [`README.md`](../../README.md)；
- [`docs/themes/pokemon/progress.md`](../themes/pokemon/progress.md)；
- [`docs/themes/pokemon/roadmap.md`](../themes/pokemon/roadmap.md)；
- [`docs/themes/pokemon/README.md`](../themes/pokemon/README.md)；
- [`docs/guides/project-overview.md`](../guides/project-overview.md)；
- [`docs/guides/dream-skin-theme-development.md`](../guides/dream-skin-theme-development.md)；
- [`docs/themes/pokemon/studio-app-design.md`](../themes/pokemon/studio-app-design.md)。

`roadmap.md` 还把已经完成的终端主题、桌面主题、宇宙场景和 lint 清理标成待办。应把历史需求与当前状态分开：

- 原始需求保留并明确标注“历史基线”；
- 当前进度只维护一个真源；
- README、roadmap 和 progress 从该真源同步或在 CI 中检查关键数字。

## 5. 尚未完成的内容

### 发布阻断项

- 重启 Codex Desktop 后自动恢复主题的完整跨平台实现；
- 持久化开关、状态和错误反馈 UI；
- Windows/macOS 安装包真实构建和 E2E；
- `pre-release → main` 发布提升；
- release 安装包、签名/公证和下载说明。

### 功能收尾

- roadmap 任务 7：场景切换动效、响应式和 CRT 性能打磨；
- 第三方 ZIP 主题的持久化列表、实际应用、CLI 安装、删除、格式文档、兼容性说明和错误诊断；
- 持久化模式下的端口冲突、Codex 升级和应用路径变化自修复；
- 统一“Codex.app / ChatGPT.app / Codex Desktop”的产品命名和进程发现语义。

### 工程收尾

- 单元、集成和 E2E 测试；
- 拆分 1127 行 Rust `lib.rs`：
  - `domain/theme`；
  - `application/theme_service`；
  - `infrastructure/engine`；
  - `infrastructure/persistence`；
  - `infrastructure/platform/{macos,windows}`；
  - `commands`；
- 抽离 463 行 `App.tsx` 的状态机、命令调用和页面区块；
- 消除 `Pokemon/app` 与 Skin Store 的主题数据/素材副本，或把同步检查升级为共享 package；
- 删除展示网站未使用的 shadcn `components/ui` 和依赖；
- 对前端 bundle 做 code split。当前构建警告：
  - 展示网站 JS 约 1.07 MB，gzip 约 527 KB；
  - Skin Store JS 约 728 KB，gzip 约 431 KB；
- 按目标平台打包资源，避免 macOS 安装包携带 Windows 引擎，反之亦然；
- 更新 7 个月未刷新的 Browserslist 数据。

## 6. 推荐执行顺序

| 阶段 | 任务 | 优先级 | 完成定义 |
|---|---|---|---|
| 1 | 持久化需求、状态模型与平台边界定稿 | P0 | 明确正常重开、主动退出、恢复官方的语义 |
| 2 | 先写持久化和配置改写测试 | P0 | 测试在旧实现上失败，覆盖 macOS/Windows adapter |
| 3 | 实现 supervisor + UI 状态 | P0 | 两平台均不再是空实现或静默失败 |
| 4 | 本地开发包 E2E | P0 | 退出/重开、系统重启、恢复官方全部通过 |
| 5 | 安装包 CI 与真实安装验证 | P0 | NSIS/DMG 可安装并完成完整流程 |
| 6 | 文档统一为 9 场景和真实状态 | P1 | README/progress/roadmap 无矛盾 |
| 7 | `pre-release → main` 发布 | P0 | release 有安装包 assets 和校验值 |
| 8 | Rust/React 拆分与依赖清理 | P2 | 行为不变、测试保持绿色、bundle 明显下降 |
| 9 | 视觉与交互动效打磨 | P2 | roadmap 任务 7 验收完成 |

## 7. 建议新增的任务文档

实现持久化前，建议在 `docs/persistence/` 下增加：

- `requirements.md`：用户场景、进程语义、安全边界、跨平台验收标准；
- `execution.md`：领域模型、supervisor 架构、分支/PR、迁移和回滚方案；
- `testing.md`：单元测试、adapter 测试、安装包 E2E 矩阵和验证命令。

领域语言建议统一：

- **Active Theme**：最后一次成功应用并持久保存的主题；
- **Persistence Supervisor**：观察 Codex 启动并确保可注入的后台组件；
- **Injection Session**：某次 Codex renderer 生命周期内的注入会话；
- **User Quit**：用户明确退出 Codex，supervisor 不得反向拉起；
- **Controlled Restart**：为补齐 CDP 参数，经用户同意执行的一次重启；
- **Official Restore**：注销持久化、停止 injector、移除注入并恢复官方外观。

## 8. 本次验证记录

在 `b20fc4a` 上执行：

```bash
cd Codex-Skin-Store
npm run lint
npm run build

cd src-tauri
cargo test
cargo clippy -- -D warnings

cd Pokemon/app
npm run lint -- --max-warnings=0
npm run build

python3 Pokemon/scripts/check-data-sync.py
python3 Pokemon/scripts/check-image-dims.py
python3 Pokemon/scripts/check-generated-content.py
```

结果：

- Skin Store lint/build：通过，有大 chunk 警告；
- 展示网站 lint/build：通过，有大 chunk 和 Browserslist 过期警告；
- Rust test/clippy：通过，但测试数为 0；
- 数据同步：2 组副本一致；
- 图片尺寸：18 个文件通过；
- 生成内容：9 场景、89 只宝可梦通过；
- 工作区验证后保持干净。

## 9. 发布判定

当前建议状态：**功能预发布（Feature Complete Beta），不建议标记为 Stable**。

达到 Stable 至少需要：

- P0 重启持久化在 Windows/macOS 实机通过；
- 安装包从 release 可下载并完成安装 E2E；
- 关键业务逻辑有自动化回归；
- 文档统一为当前 9 场景和真实平台支持状态；
- `pre-release` 正式提升到 `main`。
