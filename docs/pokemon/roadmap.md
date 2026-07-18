# 宝可梦 Codex 主题 — 任务清单与路线图

日期： 2026-07-18

依赖资料：
- [requirements.md](requirements.md) — 需求与验收标准（6 场景 × 宝可梦 × 配色为不可更改项）
- **[desktop-theme-development-guide.md](desktop-theme-development-guide.md) — Codex 桌面 App 主题开发标准（主线，codex-theme-v1 格式规范）**
- **[pokemon-desktop-theme-design.md](pokemon-desktop-theme-design.md) — 宝可梦桌面主题设计定稿（3 神兽 + 3 人气阵容、字段映射）**
- [theme-development-guide.md](theme-development-guide.md) — TUI .tmTheme 开发指南（附属产物）
- [pokemon-theme-design.md](pokemon-theme-design.md) — 宝可梦主题设计总纲（场景选角逻辑、人气数据、配色推导）
- [codex-official-theming.md](codex-official-theming.md) — 官方机制调研存档
- [pokemon-assets.md](pokemon-assets.md) — 素材库调研存档（策略已修订为直接入库）

**主线已切换为 Codex 桌面 App 主题**（2026-07-18）：TUI .tmTheme 与展示站为附属产物，共享 scenes.ts 数据源。

每个任务遵循仓库流程：从最新 `pre-release` 建任务分支 → PR 到 `pre-release`（CI Gate 必须通过）→ 需要发布时开 `pre-release → main` PR，合并自动出日期版本 release。

## 任务总览

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| 0 | 资料沉淀到 docs/ | docs/pokemon/ 文档组 | ✅ PR #3/#4/#5/#6 |
| 1 | 6 场景 .tmTheme 主题产物 | `Pokemon/themes/pokemon-*.tmTheme` × 6（plutil 通过） | ✅ PR #7 |
| 2 | 主题数据建模 + 素材入库 | 40 只 sprite 入库 `public/pokemon/`；数据源最终落在 `src/themes/scenes.ts`（与既有 UI 数据融合，含神兽池） | ✅ PR #7 + 本 PR |
| 3 | 安装页对接真实产物 | tmTheme 安装命令 + tui.theme 片段 + /theme 流程；移除虚构的 codex theme 命令 | ✅ 本 PR |
| 4 | 场景图鉴页补全 | sprite 芯片、招牌展示卡、神兽池 ??? 槽位已接入；16 色色板/迷你终端此前已有 | ✅ 本 PR |
| 5 | 终端模拟器配色导出（可选） | 每场景 ANSI 16 色 JSON / itermcolors | 待办 |
| 5.5 | **桌面 App 主题包（主线）** | `Pokemon/themes/desktop/` 7×(.json + .codex-theme.txt) + 生成脚本 + 安装页「桌面客户端」段 + 本机导入实测 | 待办（优先） |
| 5.6 | 阵容 v3 扩编 + 宇宙场景 | 常规位改御三家进化链（含全部进化型）；新增宇宙场景（烈空坐招牌 + 超能力系）；~18 只新 sprite 入库；图鉴页进化链组件 | 待办（与 5.5 同批） |
| 6 | lint 债务清理 | 修复 12 个既有 lint error，CI 恢复 lint 硬失败 | 待办 |
| 7 | 视觉与交互动效打磨 | 切换动效、响应式、CRT 细节 | 待办 |

## 任务详情

### 任务 1 — 6 场景 .tmTheme 主题产物

- 在 `Pokemon/themes/` 下生成 `pokemon-grassland.tmTheme`、`pokemon-ocean.tmTheme`、`pokemon-cave.tmTheme`、`pokemon-magma.tmTheme`、`pokemon-snowfield.tmTheme`、`pokemon-power-plant.tmTheme`
- TextMate plist XML 格式：全局 settings（foreground/background/selection/lineHighlight/caret）+ 语法 scope（comment/keyword/string/number/constant/entity/support/markup）+ diff scope（`markup.inserted.diff` 用成功绿、`markup.deleted.diff` 用错误红/熔岩红等场景语义色）
- 取色来源：requirements.md 中每场景 5 色 + ANSI 16 色推导（写一个小的调色板推导脚本/数据文件，亮暗两组）
- 校验：plist 可被 `plutil -lint`（macOS）解析；CI 加一步校验脚本（可选）
- 参考格式：Catppuccin / bat 的 .tmTheme，社区合集 [mcpso/awesome-codex-themes](https://github.com/mcpso/awesome-codex-themes)

### 任务 2 — 主题数据建模（单一数据源）

- `Pokemon/app/src/data/scenes.ts`：把 6 场景的所有信息（名称、编号、提示符 ❀≈◆▲❄⚡、5 主色、ANSI 16 色、宝可梦列表、flavor 文案、设计说明、tmTheme 文件名）收敛为一个类型化数据文件
- 现有组件（SceneSwitcher、Scenes 页、终端演示、Install 页）改为从该文件读取，消除散落硬编码
- 任务 1 的 .tmTheme 生成与任务 3/4 的页面渲染共用此数据（可用脚本从 scenes.ts 生成 tmTheme，保证一致性）

### 任务 3 — 安装页对接真实产物

- 安装步骤改为真实流程：
  1. 安装 Codex CLI：`npm i -g @openai/codex`
  2. 复制主题文件：`mkdir -p ~/.codex/themes && curl -o ~/.codex/themes/pokemon-grassland.tmTheme <raw GitHub URL>`（release 后用 main 分支 raw URL）
  3. 写入 `~/.codex/config.toml`：`tui.theme = "pokemon-grassland"`（或 TUI 内 `/theme` 选择）
- 每个场景给出对应的 config.toml 片段 + ANSI 16 色 JSON，带复制按钮
- 文案中说明 .tmTheme 只管语法高亮，终端整体配色需配合终端模拟器主题（链接任务 5 产物）

### 任务 4 — 场景图鉴页补全

- 每场景档案卡：ANSI 16 色色块网格（normal/bright 两排）、场景 diff 高亮预览（add/del/context 行）、出没宝可梦芯片、设计说明、对应 .tmTheme 下载/复制入口
- 数据全部来自任务 2 的 scenes.ts

### 任务 5 — 终端模拟器配色导出（可选，优先级低）

- 每场景导出 ANSI 16 色：JSON（Windows Terminal 格式）、`.itermcolors`（iTerm2）、可选 alacritty/kitty toml
- 安装页提供下载/复制

### 任务 6 — lint 债务清理

- 12 个既有 error：`react-refresh/only-export-components`（8 处，把非组件导出拆到独立文件）、react-hooks 规则（setState in effect ×2、声明前访问 ×1、render 中调用非纯函数 ×1）
- 清理后移除 ci.yml 中 lint 的 `|| echo` 兜底，恢复硬失败
- 独立任务分支，不与功能开发混杂

### 任务 7 — 视觉与交互动效打磨

- 场景切换的换肤过渡（白闪/百叶窗式图鉴仪式感）
- 终端演示的打字机/输出节奏微调、移动端响应式、CRT 扫描线性能

## 建议执行顺序

1 → 2 可合并为一个分支（数据建模先行，tmTheme 由数据生成），然后 3 → 4，5/6/7 视优先级穿插。每完成 1-2 个任务可做一次 pre-release → main 发布。
