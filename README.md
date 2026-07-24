# Codex-Themes

为 Codex（CLI + 桌面 App）开发主题皮肤的仓库。每个主题一套完整产物：TUI 语法高亮主题、桌面 App 配色、桌面 App 完整皮肤（壁纸 + CSS）、展示网站、切换工具。

## 主题

| 主题 | 目录 | 状态 |
|---|---|---|
| [宝可梦 Pokémon](docs/themes/pokemon/) | [`Pokemon/`](Pokemon/) | 9 场景全产物交付，桌面 App 皮肤 Windows 实测通过 |

## 文档

所有文档都在 [`docs/`](docs/) 下：

### 指南（[`docs/guides/`](docs/guides/)）

| 文档 | 内容 |
|---|---|
| [项目总览](docs/guides/project-overview.md) | 这个仓库是什么、产物矩阵、目录结构、开发与发布流程 |
| [Codex CLI 主题开发](docs/guides/codex-cli-theme-development.md) | `.tmTheme` 格式、安装与启用、scope 清单、开发流程（附[官方机制调研](docs/guides/references/codex-official-theming.md)） |
| [Codex 桌面 App 主题开发](docs/guides/codex-desktop-theme-development.md) | 官方 `codex-theme-v1` 导入字符串格式与字段规范 |
| [Dream Skin 引擎](docs/guides/dream-skin-engine.md) | 桌面 App 完整换肤的 CDP 注入引擎：是什么、内部机制、源码级结论（附[概念调研](docs/guides/references/dream-skin-research.md)） |
| [Dream Skin 主题开发与使用](docs/guides/dream-skin-theme-development.md) | preset 格式（theme.json + 壁纸 + 可选 CSS 层）、安装、切换、恢复 |

### 主题档案（[`docs/themes/`](docs/themes/)）

每个主题一个文件夹，含设计要点、素材来源、开发进度、测试进度：

- [`docs/themes/pokemon/`](docs/themes/pokemon/) — 宝可梦主题档案

### 仓库流程（[`docs/ci-release/`](docs/ci-release/)）

CI 检查与日期版本 release 流水线的[需求](docs/ci-release/requirements.md)、[执行](docs/ci-release/execution.md)、[测试](docs/ci-release/testing.md)文档。

## 仓库结构

```
<Pokemon>/                  # 一个主题 = 一个顶层目录
├── app/                    # 展示网站（Vite + React，含 scenes.ts 单一数据源）
├── themes/                 # TUI .tmTheme × 6 + desktop/codex-theme-v1 × 7
├── skins/                  # 桌面 App CSS 皮肤包（轻量 CDP 注入器）
Codex-Skin-Store/        # 皮肤商店桌面 App（Tauri，Dream Skin 引擎；CLI/桌面双应用）
└── scripts/                # 生成脚本（tmTheme / desktop / skins / studio 主题包）
docs/                       # 全部文档（见上）
```
