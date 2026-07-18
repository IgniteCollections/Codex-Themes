# 宝可梦 Codex 主题 — 任务清单与路线图

日期： 2026-07-18

依赖资料：
- [requirements.md](requirements.md) — 需求与验收标准（6 场景 × 宝可梦 × 配色为不可更改项）
- [theme-development-guide.md](theme-development-guide.md) — Codex 主题开发指南（.tmTheme 结构、scope 清单、验证流程）
- [pokemon-theme-design.md](pokemon-theme-design.md) — 宝可梦主题设计总纲（场景选角逻辑、配色推导、素材使用）
- [codex-official-theming.md](codex-official-theming.md) — 官方机制调研存档
- [pokemon-assets.md](pokemon-assets.md) — 素材库调研存档（策略已修订为直接入库）

每个任务遵循仓库流程：从最新 `pre-release` 建任务分支 → PR 到 `pre-release`（CI Gate 必须通过）→ 需要发布时开 `pre-release → main` PR，合并自动出日期版本 release。

## 任务总览

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| 0 | 资料沉淀到 docs/（本任务） | docs/pokemon/ 四份文档 | 进行中 |
| 1 | 6 场景 .tmTheme 主题产物 | `Pokemon/themes/pokemon-*.tmTheme` × 6 | 待办 |
| 2 | 主题数据建模 + 素材入库 | `src/data/scenes.ts` 单一数据源；24 只 Gen III sprite 下载至 `public/pokemon/`；24 只中文名/图鉴描述摘录入库 | 待办 |
| 3 | 安装页对接真实产物 | 真实安装命令（复制 .tmTheme + config.toml 片段），一键复制 | 待办 |
| 4 | 场景图鉴页补全 | 每场景完整档案卡：16 色色板、diff 预览、宝可梦、设计说明 | 待办 |
| 5 | 终端模拟器配色导出（可选） | 每场景 ANSI 16 色 JSON / itermcolors | 待办 |
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
