# 宝可梦皮肤桌面 App — 架构设计（Dream Skin 引擎 + Tauri 外壳）

日期： 2026-07-18
状态： 设计定稿（待实现）
前置调研： [dream-skin-research.md](../../guides/references/dream-skin-research.md)（概念层）；本文含引擎源码级结论（基于 Codex-Dream-Skin @ main, 2026-07-17, skin version 1.2.0）

## 1. 一句话

Tauri 2 托盘 App（`Pokemon/studio/`），囊括官方 Dream Skin 运行时（vendor 进仓库，随 App 资源分发），一键安装引擎、内置 7 个宝可梦场景主题、点卡片热切换 Codex 桌面 App 皮肤。平台：Windows + macOS。

## 2. 引擎源码级结论（调研结果）

### 2.1 运行时布局

| 平台 | 状态根 | 引擎安装位置 | 关键文件 |
|---|---|---|---|
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\` | `<状态根>\engine\`（install 时从源树复制并 SHA256 校验） | `state.json`、`active-theme\`、`themes\`、`paused` |
| macOS | `~/Library/Application Support/CodexDreamSkinStudio/` | `~/.codex/codex-dream-skin-studio/` | 同上 |

`state.json`（schemaVersion 3）：port、injectorPid、injectorStartedAt、browserId、codexExe、codexVersion 等。injector 是常驻 Node 进程（`injector.mjs --watch`）。

### 2.2 切换主题 = 换掉 active-theme 目录

watch 模式每 ≤30s 审计 `active-theme` 的 fingerprint（也检查文件 mtime stamp），变化即对所有已注入页面热更新（`Page.addScriptToEvaluateOnNewDocument` 注册 early payload + 立即 evaluate）。因此**切换主题不需要重启任何东西**：原子地替换 `active-theme/` 里的图片文件，最后替换 `theme.json`（commit marker），watch 自动热应用。macOS 的 `switch-theme-macos.sh` 就是这么干的（staging 目录 + mv，先图后 json）。

各平台状态目录有 reparse-point / symlink 安全检查（`Assert-DreamSkinNoReparseComponents`），写文件必须走普通目录、拒绝符号链接。

### 2.3 theme.json 实际生效字段（injector.mjs `loadTheme` + renderer-inject.js）

| 字段 | 生效？ | 说明 |
|---|---|---|
| `id` / `name` | ✅ | ≤80/120 字符单行；watch 日志用 |
| `image` | ✅ | 相对文件名，png/jpg/jpeg/webp，≤16MB，≤16384px / 50MP |
| `appearance` | ✅ | `auto`/`light`/`dark`（auto = 探测 shell class） |
| `art.focusX/focusY` | ✅ | 0–1，壁纸焦点定位；null = 图片显著性分析自动定 |
| `art.safeArea` | ✅ | `auto`/`left`/`right`/`center`/`none`——内容少的一侧留给主区 |
| `art.taskMode` | ✅ | `auto`/`ambient`/`banner`/`off`——任务页壁纸模式 |
| `palette.accent` | ✅ | **唯一生效的颜色字段**；CSS 颜色（hex/rgb/hsl/oklch），缺省时从壁纸图片自动提取强调色 |
| `colors.{background,panel,…}` | ❌ | 注入器完全不读（仅官方 preset 的展示性字段） |
| `brandSubtitle/tagline/quote/statusText/promo*` | ❌ | 同上 |

### 2.4 完整场景 CSS 的注入点

`loadPayload()` 从 `assets/`（即安装的 engine 目录）读 `dream-skin.css` + `renderer-inject.js`，把 theme 数据替换进模板后经 CDP evaluate。renderer 建的元素 id 固定为 `codex-dream-skin-style` / `codex-dream-skin-chrome`，window 状态键 `__CODEX_DREAM_SKIN_STATE__`——与我们的 `pokemon-skin.css`/`pokemon-skin-badge` **无冲突，可叠加**。

**结论：每场景完整 CSS 皮肤可行**——把场景 CSS 追加到 engine 的 `dream-skin.css`（注意会覆盖它的默认 wallpaper 规则，幂等重建即可），场景切换由 theme.json + 壁纸驱动。无需 fork injector 代码，只改 engine assets（属于已安装的运行时数据，不是改官方 App）。

### 2.5 官方脚本清单（我们驱动/调用的）

| 脚本 | 作用 | App 何时调 |
|---|---|---|
| `install-dream-skin.ps1 -NoShortcuts` / `install-dream-skin-macos.sh` | 复制 engine 到状态根、初始化主题库、写 config.toml 基础主题备份 | 首次启动向导 |
| `start-dream-skin.ps1 [-PromptRestart]` / `start-dream-skin-macos.sh` | 带 `--remote-debugging-address=127.0.0.1 --remote-debugging-port=<p>` 启动 Codex + 常驻 injector（Windows 默认 9335 / macOS 9341） | 「应用皮肤」按钮、引擎未运行时 |
| `restore-dream-skin.ps1` / `restore-dream-skin-macos.sh` | 关 injector、恢复官方外观（可选恢复 config.toml） | 「恢复官方」按钮 |
| `verify-dream-skin.ps1` / `verify-dream-skin-macos.sh` | 校验 CDP 回环 + 皮肤已加载 + 原生控件可用 | 状态自检 |
| `switch-theme-macos.sh --id <id>` | macOS 官方切换（热路径） | macOS 切换（或直接写 active-theme，二选一） |
| `tray-dream-skin.ps1` | 官方 Windows 托盘（我们自己的 App 替代它） | 不用 |

前置条件：Node.js 运行时（`Get-DreamSkinNodeRuntime` 负责发现）、官方 Codex 商店包/App（Windows 校验 `Get-AppxPackage OpenAI.Codex`，macOS 校验 bundle id `com.openai.codex`）。

## 3. 总体架构

```
Pokemon/studio/                     # Tauri 2 App（新目录）
├── src/                            # React 前端（复用展示站视觉语言：场景卡片、像素风）
├── src-tauri/                      # Rust：进程/文件/状态管理
│   └── resources/
│       ├── engine-windows/         # vendor：windows/{assets,scripts}（MIT，附 LICENSE+NOTICE）
│       ├── engine-macos/           # vendor：macos 对应文件
│       └── themes/                 # 构建期生成的 7 套主题包
│           └── pokemon-grassland/
│               ├── theme.json      # Dream Skin 格式（含 palette.accent）
│               ├── background.png  # 场景壁纸（scene-*.png）
│               └── scene.css       # 我们的完整场景皮肤（pokemon-skin.css 片段）
└── package.json
```

**数据流**：`scenes.ts`（单一数据源）→ 构建脚本 `scripts/generate-studio-themes.mjs` → 7 套主题包（Tauri resources）→ 安装时写入状态根 `themes/pokemon-<scene>/`。

**场景切换流程**（核心路径）：

```
用户点场景卡片
  → Rust: 校验状态根、无 reparse（复刻官方安全检查）
  → 写 themes/pokemon-<scene>/（若未安装）
  → staging 目录原子替换 active-theme/（先图后 theme.json）
  → 把 scene.css 段落重建进 engine/assets/dream-skin.css 的 pokemon 块（幂等标记）
  → 若 injector 未运行 → 调官方 start 脚本（-PromptRestart 语义在 App 内弹确认框）
  → watch 自动热应用（≤30s；通常 1-2s 内 stamp 检查就会触发）
```

**恢复官方**：调官方 restore 脚本；同时把 `dream-skin.css` 恢复为 vendor 原版。

**状态查询**：读 `state.json`（injectorPid/port/browserId）+ 读 `active-theme/theme.json` 的 id → 渲染「当前场景 / 引擎运行中 / 未安装」。

## 4. 关键决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| 引擎来源 | **vendor 官方运行时进 resources**（用户已确认"囊括官方安装，我们只是外壳"） | 开箱即用；MIT 许可（保留 LICENSE/NOTICE + 来源注明）；版本锁定可控，上游更新手动跟进 |
| App 形态 | **Tauri 2 托盘 + 窗口**（用户已确认） | ~10MB，Rust 侧做进程/文件管理比 Node 稳；前端复用现有 React 视觉 |
| 主题内容 | **官方 theme.json + 壁纸 + 完整场景 CSS**（用户已确认） | theme.json 驱动壁纸/焦点/强调色；scene.css 提供 diff 色/徽章/扫描线等完整氛围 |
| 切换机制 | **直接写 active-theme（原子替换），不 fork injector** | watch 自带热更新；官方 macOS 也是文件级切换；零引擎代码改动 |
| CSS 注入方式 | **改写 engine 的 dream-skin.css（幂等块），不 fork renderer-inject.js** | loadPayload 从 engine assets 读 CSS——这是数据不是代码；叠加 id 不冲突 |
| 跨平台 | Windows + macOS 双 vendor 引擎 | 差异集中在启动脚本与状态根路径，Rust 侧按平台分支 |
| 容器化 | **不做** | CDP 需要与桌面 App 同机 GUI 会话，容器无意义（用户括号内为可选项，明确放弃） |

## 5. 主题包格式（我们的产物 → Dream Skin preset）

`pokemon-grassland/theme.json`：

```json
{
  "schemaVersion": 1,
  "id": "pokemon-grassland",
  "name": "❀ 草原 · Bulbasaur",
  "image": "background.png",
  "appearance": "dark",
  "art": { "focusX": null, "focusY": null, "safeArea": "auto", "taskMode": "ambient" },
  "palette": { "accent": "#7AC74C" }
}
```

- `id` 用 `pokemon-` 前缀（避开官方 `preset-`/`custom-` 命名空间，官方种子脚本不会碰）
- `appearance: "dark"`——7 个场景全是深色设计
- `focusX/focusY: null`——让引擎的显著性分析自动找壁纸焦点（scene-*.png 构图各异，手写焦点后续可调）
- `palette.accent` 取 `skins.ts` 的 `ui.prompt`（场景主色）
- `scene.css`：从 `Pokemon/skins/pokemon-skin.css` 派生 + skins.ts 的 19 个 ui 色值内联为 `--pk-*` 变量 + `data-pokemon-skin` 选择器

## 6. App 功能清单（MVP）

1. **首次启动向导**：检测 Codex 已安装 → 检测 Node → 解压 vendor 引擎到临时目录并调官方 install 脚本 → 写入 7 套主题 → 完成
2. **场景网格**：7 张场景卡片（壁纸缩略图 + 招牌 sprite + 名称），点击即切换；当前激活场景高亮
3. **状态栏**：引擎运行状态（injector pid/port）、当前主题、Codex 运行状态
4. **操作**：应用皮肤（start）/ 暂停（写 paused 文件）/ 恢复官方（restore）/ 自检（verify）
5. **托盘**：左键开窗口，右键菜单（切换最近场景、暂停/恢复、退出）

非目标（本期不做）：自定义壁纸导入（官方引擎已有此能力，后续可加）、自动更新引擎、Windows 商店打包分发。

## 7. 风险与应对

| 风险 | 应对 |
|---|---|
| Codex App 更新导致 DOM class 变化 | 官方 verify 脚本自检 + renderer 的 MutationObserver 容错；升级 vendor 引擎即可跟进上游修复 |
| 状态根安全检查拒绝我们的写入 | 复刻官方的 reparse 检查逻辑；全部走普通文件、原子 mv |
| 改写 dream-skin.css 与上游更新冲突 | 幂等块标记 `/* pokemon-skin begin/end */`，每次切换重建；恢复官方时还原 vendor 原版 |
| macOS 未实测（开发机在 Windows） | macOS 路径按官方脚本逐行对齐；标注「Windows 已实测 / macOS 待实测」 |
| injector 热更新最坏 30s 延迟 | stamp 检查实际每 ~1.2s 循环一次，通常秒级；UI 上切换后显示「应用中…」轮询 active 状态 |

## 8. 实现顺序

1. `scripts/generate-studio-themes.py` — 从 skins.ts/scenes.ts 生成 7 套主题包（含 scene.css 派生）✅
2. `Pokemon/studio/` Tauri 脚手架 + Rust 引擎管理（安装/切换/状态/恢复）✅
3. React 场景网格 UI（复用展示站组件与样式）✅
4. Windows 端到端实测（Codex App 实机）✅（2026-07-18，见 §9）
5. 文档 + PR（任务分支 → pre-release）

## 9. Windows 端到端实测记录（2026-07-18）

环境：Windows 11，Codex 商店包 26.715.4045.0，Node 22.23.1（引擎要求 ≥22，Node 20 会被官方安装脚本拒绝）。

| 步骤 | 结果 |
|---|---|
| 官方 install 脚本（vendor 副本，-NoShortcuts） | ✅ engine 安装到 `%LOCALAPPDATA%\CodexDreamSkin\engine\` |
| 7 套主题包入 `themes/` + grassland 激活 | ✅ |
| start 脚本（Codex 带 CDP 端口 9335 启动 + watch injector） | ✅ verify pass（installed/style/chrome 均为 true） |
| 实机截图 | ✅ 草原像素壁纸 + 绿色系 UI（pokemon-grassland-live.png） |
| 热切换 grassland → magma（只换 active-theme + CSS 块） | ✅ 秒级热应用，无需重启（pokemon-magma-live.png） |
| 热切换 magma → grassland | ✅ |
| restore 脚本（恢复官方外观） | ✅ state.json 清理、CDP 端口关闭 |

实测注意事项：

- **App 侧 start 必须带 `-RestartExisting`**：restore 会重开一个无调试端口的 Codex，若用户随后直接点场景切换，官方 start 脚本会因「Codex 已开但无 CDP」报错。App 的 switch/start 流程应始终以 `-RestartExisting` 调用（该 flag 在已有 CDP 会话时无副作用）。
- **前台运行 start 脚本会挂起**：脚本结尾的 verify 步骤等待 Codex shell 渲染（用户登录/加载完成前一直阻塞）。App 必须**后台异步**调用脚本，不能阻塞 UI 线程等结果；状态以轮询 `state.json` + `injector.log` 为准。
- macOS 路径未实测（开发机为 Windows），macOS 实现按官方脚本逐行对齐，标注待验证。

