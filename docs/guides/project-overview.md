# Codex-Themes 项目总览

## 这个项目是什么

为 **Codex**（OpenAI 的 AI 编程助手，含 CLI/TUI 与桌面 App 两种形态）开发主题皮肤的仓库。每个主题交付一整条产物线，共用同一份场景数据源，保证任何环境下视觉一致。

当前主题：**宝可梦**（7 个栖息地场景，见 [`docs/themes/pokemon/`](../themes/pokemon/)）。

## 产物矩阵

| 产物 | 作用 | 格式 | 安装方式 |
|---|---|---|---|
| TUI 主题 | CLI 代码块/diff 语法高亮 | `.tmTheme` | `~/.codex/themes/` + TUI 内 `/theme` |
| 桌面 App 配色 | 官方 Appearance 导入（accent/背景/文字/diff 色） | `codex-theme-v1:` 字符串 | Settings → Appearance → Import |
| 桌面 App 完整皮肤 | 全局壁纸 + 全套 CSS 换肤 | Dream Skin preset（theme.json + 壁纸 + CSS） | 宝可梦皮肤工作室 App 一键切换 |
| 展示网站 | 场景预览、图鉴、配置复制 | Vite + React 静态站 | dev server / 静态部署 |
| 皮肤工作室 | 桌面切换工具（托盘 App） | Tauri 2（Rust + React） | NSIS / DMG 安装包 |

## 目录结构

```
Codex-Themes/
├── <Theme>/                # 一个主题 = 一个顶层目录（当前：Pokemon/）
│   ├── app/                # 展示网站；src/themes/scenes.ts 是单一数据源
│   ├── themes/             # TUI .tmTheme + desktop/codex-theme-v1 导入字符串
│   ├── skins/              # 桌面 CSS 皮肤包 + 轻量 CDP 注入器（轨道 B）
│   ├── studio/             # Tauri 切换工具（Dream Skin 引擎外壳）
│   └── scripts/            # 从数据源生成上述产物的脚本
└── docs/
    ├── guides/             # 通用开发指南（本目录）
    ├── themes/<theme>/     # 每主题档案：设计/素材/进度
    └── ci-release/         # 仓库流水线文档
```

**单一数据源原则**：`<Theme>/app/src/themes/scenes.ts` 定义场景全部信息（配色、宝可梦、文案、ANSI 色板），所有产物由 `scripts/generate-*.py` 从它派生。改配色 = 改 scenes.ts + 重跑生成脚本。

## 开发与发布流程

1. 从最新 `pre-release` 建任务分支
2. PR 回 `pre-release`，CI（每个 `<Theme>/app/` 的 lint + build）必须通过
3. 需要发布时开 `pre-release → main` PR，合并自动出日期版本 release（`vYYYY.MM.DD-HHMM`）

详见 [`docs/ci-release/`](../ci-release/)。

## 开发指南索引

| 要做什么 | 看哪篇 |
|---|---|
| 给 Codex CLI 做语法高亮主题 | [Codex CLI 主题开发](codex-cli-theme-development.md) |
| 给桌面 App 做官方可导入的配色主题 | [Codex 桌面 App 主题开发](codex-desktop-theme-development.md) |
| 理解桌面 App 完整换肤引擎（CDP 注入） | [Dream Skin 引擎](dream-skin-engine.md) |
| 开发/使用 Dream Skin 完整皮肤（壁纸+CSS） | [Dream Skin 主题开发与使用](dream-skin-theme-development.md) |
| 开发宝可梦主题本身 | [`docs/themes/pokemon/`](../themes/pokemon/) |
