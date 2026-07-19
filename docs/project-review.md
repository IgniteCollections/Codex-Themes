# Codex-Themes 项目评估与开发意见

日期： 2026-07-19
评估范围： 全仓库（`Pokemon/` 主题产物 + `Codex-Skin-Store/` 皮肤商店 + `docs/` + CI/Release）

> 本文是对仓库当前状态的独立评估，按优先级列出问题与建议，供下一步开发决策参考。所有论断附文件路径/行号支撑。

---

## 一、整体评价

项目定位清晰——为 Codex（CLI + 桌面 App）做主题皮肤，每个主题交付一整条产物线（TUI `.tmTheme` / 桌面 `codex-theme-v1` / Dream Skin 完整皮肤 / 展示网站 / Tauri 切换工具），共用 `scenes.ts` 单一数据源。宝可梦主题已交付 9 场景全产物，Windows + macOS 实测有记录，CI/分支保护/日期版本 release 流程已建立。

**做得好的地方**：

- 单一数据源设计思路正确：`Pokemon/app/src/themes/scenes.ts`（573 行）定义 9 场景全部信息，Python 脚本从它派生产物。
- 代码质量基本功扎实：`Pokemon/app` 与 `Codex-Skin-Store` 均开 TS `strict` + `noUnusedLocals/Parameters`，业务代码 **0 处 `any`**，`npm run lint` 0 warnings；Rust 后端所有 `#[tauri::command]` 返回 `Result<T, String>` 并 `map_err` 成中文错误信息。
- 产物矩阵完整且校验充分：9 场景 × (`.tmTheme` + desktop JSON/txt + terminal 4 格式 + Dream Skin preset)，`plutil -lint` / `--check-payload` / `--self-test` / 字符串解码对拍全通过。
- 实测驱动：macOS 适配发现 5 个真实缺陷并固化进 Rust 代码（[progress.md](themes/pokemon/progress.md) 详记）。
- 文档体系完善：guides / 主题档案 / CI-release 三层，可复现性好。

**主要风险（一句话）**：核心功能闭环已完成且质量尚可，但**合规（分发真人照片）、CI 覆盖（皮肤商店零 CI）、数据源一致性（三份分裂）、可发布性（安装包从未构建验证）**四个方面存在必须优先处理的硬伤，外加一批拆分后未收尾的遗留债务。

---

## 二、问题清单（按优先级）

### P0 - 合规风险：分发真人肖像照片

**现象**：vendor 的 Dream Skin 引擎资源里内嵌了一张日本 AV 女优「桥本有菜」的照片，且会被分发给每一个安装皮肤商店的用户。

**证据**：

- [preset-arina-hashimoto/theme.json](../Codex-Skin-Store/src-tauri/resources/engine-macos/presets/preset-arina-hashimoto/theme.json) `"name": "桥本有菜"`，`"image": "background.jpg"`。
- `engine-windows/assets/dream-reference.jpg`（688 KB）与 `engine-macos/presets/preset-arina-hashimoto/background.jpg` 的 MD5 **完全相同**（`443ab1e10f3b19c29a153c4d89b3e26f`）——是同一张照片。
- 该照片是 Windows engine 的默认 demo 主题（`engine-windows/assets/theme.json` 的 `image` 指向 `dream-reference.jpg`）。
- 安装引擎时（`Codex-Skin-Store/src-tauri/src/lib.rs` `install_engine`）会执行 vendor 的 `install-dream-skin-macos.sh`，把每个 `preset-*/` 幂等播种到用户主题库——即**每个安装用户本地都会拿到这张照片**，即使他们只想要宝可梦主题。
- `tauri.conf.json` 的 `bundle.resources` 把 `engine-windows` + `engine-macos` 同时打进所有平台安装包，照片随之进入 NSIS / DMG。

**矛盾点**：项目自己的红线就禁止此事。[presets/README.md:52](../Codex-Skin-Store/src-tauri/resources/engine-macos/presets/README.md) 明确写「❌ 真人肖像（明星、网红、AV 演员等）--涉肖像权，且本仓库带 MIT 与商业赞助」；[NOTICE.md:20-30](../Codex-Skin-Store/src-tauri/resources/engine-windows/NOTICE.md) 用「维护者例外」排除 MIT，但措辞自认「does not certify or grant third-party likeness...redistribution rights」——即项目自己承认没有再分发权。

**影响**：肖像权 + 声誉 + 合规风险，对一个 MIT + 商业赞助的开源仓库是致命级隐患。一旦被截图传播或被本人/经纪方主张权利，后果不可逆。

**建议**：

1. 立即从 vendor 资源移除 `preset-arina-hashimoto/` 与 `engine-windows/assets/dream-reference.jpg`，Windows engine 默认 demo 改用 `preset-gothic-void-crusade` 或程序化生成的抽象背景。
2. 同步删除 `docs/images/presets/arina-hashimoto-*` 源图与实测截图。
3. 在 vendor 上游（Dream Skin）也提 issue/PR 阻断该 preset 进入后续 vendor。
4. 清理后重跑 `generate-studio-themes.py` 重建 resources，确认安装包不再含该照片。

---

### P0 - CI 覆盖缺口：皮肤商店零 CI，release 不发布产物

**现象**：核心交付物 `Codex-Skin-Store`（前端 + 786 行 Rust 后端）完全不在 CI 检查范围内，且 release 流程不产出任何可下载的安装包。

**证据**：

- [ci.yml:20](../.github/workflows/ci.yml) 发现逻辑 `git ls-files '*/app/package.json'` 只匹配 `Pokemon/app/package.json`；`Codex-Skin-Store/package.json` 在顶层（非 `*/app/`）被跳过。
- `Codex-Skin-Store/package.json` 连 `lint` 脚本和 ESLint 依赖都没有（只有 `dev`/`build`/`tauri`）。
- Rust 后端（`src-tauri/`）无 `cargo check` / `clippy` / `tauri build` 任何 CI。
- [release.yml:34-42](../.github/workflows/release.yml) 只 `gh release create --generate-notes`，**不上传构建产物**——用户拿不到现成安装包，只能本地 `npx tauri build`。
- [progress.md](themes/pokemon/progress.md) 声称的「`cargo build` ✅」「`npm run build` studio 前端 ✅」都是本地手动执行，非 CI 门禁。

**影响**：任何 Rust 编译错误 / clippy 警告 / 前端类型错误都不会在 PR 阶段暴露；用户无法下载安装包，分发链路断裂。

**建议**：

1. ci.yml 增加一个 job：对 `Codex-Skin-Store` 跑 `npm ci && npm run build`（TS 严格编译）+ `cargo build --manifest-path Codex-Skin-Store/src-tauri/Cargo.toml` + `cargo clippy`。加入 `ci-gate.needs`。
2. 给 `Codex-Skin-Store` 加 ESLint 配置与 `lint` 脚本，与 `Pokemon/app` 对齐。
3. release.yml 增加构建 job：在 Windows runner 跑 `tauri build` 产 NSIS、macOS runner 产 DMG，`gh release upload` 上传产物。（需处理代码签名 / 公证，至少先出未签名的 dev 包。）

---

### P1 - 数据源分裂：违反单一数据源原则

**现象**：`scenes.ts` 及其派生资源在 `Pokemon/app` 与 `Codex-Skin-Store` 各有一份逐字节相同的副本，无同步机制，改一边另一边静默过期。

**证据**：

- `Pokemon/app/src/themes/scenes.ts`（573 行）与 `Codex-Skin-Store/src/scene-data.ts`（573 行）逐字节相同；另有 `Codex-Skin-Store/src/scenes.ts`（131 行）是精简派生版。
- `mascotArt.ts`（448 KB base64 sprite 库）两处 `diff -q` 无输出 = 完全相同。
- `sprites/`（83 只）与 `wallpapers/`（9 张）也在 `Codex-Skin-Store/src/` 下复制了一份。
- Python 生成脚本读 `Pokemon/app` 那份生成 `resources/themes/`，React UI 读 `Codex-Skin-Store` 那份渲染卡片——两边都活跃使用，**无任何同步检查**。

**影响**：调色板/宝可梦/文案改动后，展示网站与皮肤商店会静默不一致；[project-overview.md](guides/project-overview.md) 宣称的「单一数据源原则」名存实亡。

**建议**（择一）：

- 方案 A（推荐）：把 `scenes.ts` / `mascotArt.ts` / sprites / wallpapers 抽到一个共享目录（如 `shared/` 或 `packages/theme-data/`），两边用相对路径或 workspace 包引用。
- 方案 B（低成本）：保留两份，但加一个 CI 检查脚本 `scripts/check-data-sync.py`，对两份 `scenes.ts`/`mascotArt.ts` 做 `diff`，不一致即失败；并在生成脚本里同时写两份。

---

### P1 - 可发布性：安装包从未构建验证

**现象**：`tauri build`（NSIS/DMG）从未实际跑通过。

**证据**：[progress.md](themes/pokemon/progress.md) 测试进度表「`tauri build` 安装包 NSIS/DMG ❌ 未验证」。

**影响**：核心交付物（桌面 App 安装包）是否能在用户机器上安装、运行、签名/公证通过，完全未知。实机测试用的是「App 同款逻辑的手动执行」，App 进程内 invoke 未逐一联调。

**建议**：在 P0 的 release.yml 构建 job 里首次实跑 `tauri build`，修复暴露的问题（很可能涉及 capabilities 权限、资源路径、签名）。同时补「App 内命令联调」实机测试。

---

### P1 - 生成管线单点失败：`mascotArt.ts` 无生成器 + `skins.ts` 已 drift

**现象**：

- `mascotArt.ts`（448 KB base64 sprite 库）文件头自称「由 scenes.ts 全阵容生成」，但 `Pokemon/scripts/` 下**没有任何生成脚本**。一旦文件丢失或需新增 sprite，无法重建。
- `skins.ts` 已与源不同步：提交 `2d15eb2`（壁纸升级 4K）更新了 `public/scene-*.png` 到 1920×1080，但**忘了重跑 `generate-skins.py`**。当前 `skins.ts` 内嵌的 `scene-grassland.png` base64 解出来是旧的 960×540；重跑脚本会改 9 行 base64。

**证据**：[generate-skins.py](../Pokemon/scripts/generate-skins.py) 重跑产生 9 行 diff（960×540 → 1920×1080）；`scripts/` 目录无 `generate-mascot-art.py` 或等价物。

**影响**：`mascotArt.ts` 是单点失败；`skins.ts` drift 意味着展示网站终端横幅用的壁纸分辨率落后于实际产物。

**建议**：

1. 重跑 `generate-skins.py` 并提交，修复 drift。
2. 补一个 `generate-mascot-art.py`（或把逻辑并入现有脚本），让 `mascotArt.ts` 可重生。
3. CI 增加一步：重跑所有生成脚本，`git diff --exit-code` 校验产物与源同步（同时也防此类 drift）。

---

### P1 - 生成脚本脆弱：regex 解析 TS + 多处二次硬编码真源

**现象**：6 个 Python 脚本都用正则解析 `scenes.ts`（而非 import TS），且多个脚本各自硬编码了一份 scenes.ts 之外的派生数据。

**证据**：

- 所有脚本核心正则：`re.finditer(r"const\s+(\w+):\s*SceneDef\s*=\s*\{(.*?)\n\};", ts, re.S)`（见 [generate-studio-themes.py:39](../Pokemon/scripts/generate-studio-themes.py) 等）。scenes.ts 结构一变（多嵌套层、字符串含 `\n};`、`const` 改 `let`、加注释）即静默崩。
- [generate-themes.py:38-93](../Pokemon/scripts/generate-themes.py) 硬编码 `DERIVED` 色映射（comment/fn/diff_add/diff_del）——这是 scenes.ts 之外的**第二真源**。
- [generate-desktop-themes.py](../Pokemon/scripts/generate-desktop-themes.py) 的 `CONTRAST` 表与 [installSnippets.ts:30-55](../Pokemon/app/src/pages/installSnippets.ts) 的 `buildDesktopThemeString` **重复实现**同一逻辑，靠人工保持一致。
- [generate-studio-themes.py:67-165](../Pokemon/scripts/generate-studio-themes.py) 自写 SVG 光栅化器只支持 rect/circle/ellipse/line/polygon/path 子集，复杂 SVG 直接 `sys.exit`。

**影响**：scenes.ts 改动可能让生成脚本静默失败或产物漂移；DERIVED/CONTRAST 与 scenes.ts 漂移会产生不一致的配色。

**建议**：

1. 把派生色（comment/fn/diff/contrast 等）直接写进 `scenes.ts` 的 `SceneDef`，消除 DERIVED/CONTRAST 第二真源。
2. `installSnippets.ts` 的 `buildXxx` 函数改为读 Python 脚本产出的 JSON，而非自己重算（消除 TS/Python 双实现）。
3. 长期：考虑用 TypeScript 写生成脚本（直接 import scenes.ts，类型安全），或用 `ts-json` 导出 scenes.ts 为 JSON 供 Python 读。

---

### P2 - 依赖膨胀与死代码：`Pokemon/app` 装了约 41 个无用依赖

**现象**：`Pokemon/app` 业务代码只用 9 个依赖，但 package.json 列了约 50 个；`components/ui/` 整个 56 文件目录是 shadcn 脚手架残留，无任何页面/组件引用。

**证据**：

- [package.json:13-62](../Pokemon/app/package.json) 全部 26 个 `@radix-ui/*` + `react-hook-form`/`zod`/`recharts`/`embla-carousel`/`cmdk`/`vaul`/`sonner`/`next-themes`/`date-fns`/`react-day-picker` 等约 41 个，业务代码 0 引用（`Grep "from '@/components/ui/'"` 28 处命中全在 `ui/` 内部）。
- `Pokemon/app/src/components/ui/`（56 文件）、`info.md`（shadcn「40+ 组件」清单）、`README.md`（Vite 模板）、`components.json` 均脚手架残留未删。
- `package.json` `name: "my-app"`、`version: "0.0.0"` 也是脚手架默认值。
- `vite.config.ts` 引入的 `plugin-inspect-react-code` 未用。

**影响**：`node_modules` 臃肿、CI `npm ci` 慢（约 1 分钟）、lint/build 变慢、新人误解项目用了哪些库。

**建议**：删除 `components/ui/` 整个目录与 41 个未用依赖，`name` 改为 `pokemon-theme-app`。一次清理一个 PR。

---

### P2 - 拆分遗留未清理：死目录、过时引用、命名残留

**现象**：PR #33 把 studio 拆成 `Codex-Skin-Store` 后，旧痕迹散落多处未收尾。

**证据**：

- [Pokemon/studio/](../Pokemon/studio/) 是空壳：git 跟踪 0 文件，本地只剩 `dist/`/`node_modules`/`src-tauri/target/`，无 `src/`、`package.json`、`Cargo.toml`。应删除。
- [.claude/launch.json](../.claude/launch.json) 仍配 `pokemon-studio`（指向 `Pokemon/studio`），且缺 `Codex-Skin-Store` dev 配置。
- [README.md:42](../README.md) 仓库结构仍写「└── studio/ # 桌面切换工具」，未提 `Codex-Skin-Store/`。
- [generate-studio-themes.py:6-13](../Pokemon/scripts/generate-studio-themes.py) 文档字符串写输出到 `Pokemon/studio/...`，实际 `OUT_ROOT`（第 28 行）已改 `Codex-Skin-Store/...`。
- 命名残留：`lib.rs:430` `.pokemon-studio-vendor`、`lib.rs:515` `.pokemon-studio-staging`、`lib.rs:785` panic 文案「pokemon studio」、`Cargo.toml` description「Pokemon skin studio」、`App.tsx:8`/`lib.rs:128` `StudioStatus` 类型名。（注：macOS 路径 `CodexDreamSkinStudio` 在 `lib.rs:23` 是为对齐 vendor 硬编码路径，**不能改**。）
- [Pokemon/skins/](../Pokemon/skins/) 是被 supersede 的自研轻量 CDP 注入器（`apply.mjs`/`apply.sh`/`remove.sh`/`renderer-inject.js`），只支持 7 场景（缺 city+lab），已被 Skin Store 超集覆盖。

**建议**：删 `Pokemon/studio/` 与 `Pokemon/skins/`（或归档到 `docs/` 注明已弃用）；更新 launch.json / README / 脚本文档字符串；批量改名 `Studio*` → `Store*`（保留 macOS vendor 路径）。

---

### P2 - 文案陈旧：场景数 7 → 9 后未同步

**现象**：项目从 7 场景扩到 9 场景（+城市/实验室），但多处文案仍写 6 或 7。

**证据**：

- `index.html:7` 写「6 个」且只列 6 个；
- `Home.tsx:233/:410` 写「7 个」、`:247-249` 统计行 `06 场景 / 24 / 96+` 全过期；
- `Scenes.tsx:660` `図鑑 No.001–007`、`:753` `收服全部 7 个场景`；
- `installSnippets.ts:202` 注释「7 场景配置片段」。

**建议**：全局搜索 `7 个场景`/`6 个`/`001–007` 统一改为 9；统计数字（宝可梦数、sprite 数）按 `scenes.ts` 实际重算。

---

### P2 - 零测试

**现象**：全仓库无任何单元测试 / e2e（无 `*.test.*`、无 vitest/jest/playwright/pytest 依赖）。

**影响**：生成脚本正则、`installSnippets.ts` 的 `buildXxx`、`scenes.ts` 的 `isSceneId`/`SCENE_THEME_SLUG`、`replace_tui_theme`（#34 修的 config.toml 重写）等漂移高发区无防护。

**建议**：优先给「生成脚本输出快照」+「`installSnippets.ts` 与 Python 产物对拍」+「`replace_tui_theme` 各种 config.toml 形态」补测试。生成脚本快照测试同时覆盖 P1 的 drift 问题。

---

### P3 - 性能与体验细节

- **5s 轮询偏重**：`Codex-Skin-Store/src/App.tsx:119` `get_status` 每 5s 触发，Windows 下每次 spawn `powershell Get-AppxPackage` + `node -p` + `tasklist` 三个进程，macOS 跑 `plutil` + `ps`。建议改 15s 或事件驱动。
- **resources 跨平台膨胀**：`tauri.conf.json` 把 `engine-windows` + `engine-macos` 同时打进所有平台安装包。建议用 Tauri 的 per-target resources 只打对应平台。
- **bundle 偏大**：`Pokemon/app` 单 chunk 1.08 MB / 536 KB gzip，主因 `mascotArt.ts`（448 KB）+ `skins.ts`（186 KB）base64 内联。建议改外部静态资源 + 懒加载，或按场景 code-split。
- **capabilities 可能缺权限**：`Codex-Skin-Store/src-tauri/capabilities/default.json` 只授权 `core:default` + 3 个 window 权限，**无 `dialog:default` / `process:default`**。Tauri 2 要求插件权限显式声明，`App.tsx:146/166` 的 `confirm()`（走 `@tauri-apps/plugin-dialog`）可能被静默拒绝——需实测点「应用皮肤」时 confirm 弹窗是否出现。

---

## 三、建议执行路线图

| 阶段 | 任务 | 对应问题 | 优先级 |
|---|---|---|---|
| **立刻** | 移除 `preset-arina-hashimoto` + `dream-reference.jpg` 及相关截图，重建 resources | P0 合规 | 阻断发布 |
| **立刻** | ci.yml 加 `Codex-Skin-Store` 前端 + Rust 检查；加 ESLint | P0 CI | 阻断后续 Rust 回归 |
| **短期** | release.yml 加 `tauri build` 构建并上传 NSIS/DMG；首次实跑修复问题 | P0/P1 可发布性 | 出可用安装包 |
| **短期** | 重跑 `generate-skins.py` 修 drift；补 `generate-mascot-art.py` | P1 单点失败 | 防数据丢失 |
| **短期** | 数据源合并或加 sync 检查脚本进 CI | P1 数据源分裂 | 防不一致 |
| **中期** | 派生色并入 `scenes.ts`；`installSnippets.ts` 改读 Python 产物；生成脚本快照测试 | P1 脆弱解析 + P2 测试 | 降维护成本 |
| **中期** | 删 `Pokemon/studio/` + `skins/`；清 41 个未用依赖 + 56 个 ui 死文件；更新 launch.json/README/命名 | P2 遗留 | 减噪声 |
| **中期** | 7→9 场景文案全局同步 | P2 文案 | 修准确性 |
| **长期** | 轮询改事件驱动；per-target resources；bundle code-split；capabilities 权限核实 | P3 性能体验 | 打磨 |
| **长期** | 任务 7（视觉与交互动效打磨）——roadmap 唯一未完成任务 | roadmap | 收尾 |

---

## 四、附：核实过的关键事实

| 事实 | 核实方式 |
|---|---|
| 两份 `scenes.ts`（573 行）逐字节相同 | `diff -q` 退出码 0 |
| `mascotArt.ts` 两处逐字节相同 | `diff -q` 无输出 |
| CI 只覆盖 `Pokemon/app` | `git ls-files '*/app/package.json'` 仅返回 `Pokemon/app/package.json` |
| `Pokemon/studio/` git 0 文件 | `git ls-files Pokemon/studio \| wc -l` = 0，`git check-ignore` 未命中（从未提交） |
| 真人照片两张 MD5 相同 | `443ab1e10f3b19c29a153c4d89b3e26f` |
| `skins.ts` drift | 重跑 `generate-skins.py` 产生 9 行 base64 diff |
| `mascotArt.ts` 无生成脚本 | `scripts/` 目录无对应 `.py` |
| release 不上传产物 | `release.yml` 仅 `gh release create --generate-notes` |
