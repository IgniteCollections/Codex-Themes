# 宝可梦主题档案

把 Codex（CLI + 桌面 App）变成宝可梦图鉴世界：7 个栖息地场景（草原、海洋、洞穴、岩浆、雪原、无人发电厂、宇宙），每个场景一套配色、出没宝可梦、像素壁纸与 flavor 文案。设计锚点是 GBA Gen III 像素质感。

## 文档索引

| 文档 | 内容 |
|---|---|
| [requirements.md](requirements.md) | 需求基线（6 场景 × 宝可梦 × 配色为不可更改项） |
| [design.md](design.md) | 设计总纲：场景概念、选角逻辑（人气数据）、配色推导、素材使用设计 |
| [desktop-design.md](desktop-design.md) | 桌面 App 设计定稿：阵容 v4（御三家进化链 + 神兽池）、codex-theme-v1 字段映射 |
| [assets.md](assets.md) | 素材来源：三个素材库调研（PokeAPI/sprites、NightCatSama/pokedex 等）与版权事实 |
| [progress.md](progress.md) | **开发进度 + 测试进度**（各产物状态、实测记录） |
| [roadmap.md](roadmap.md) | 任务清单与执行顺序 |
| [studio-app-design.md](studio-app-design.md) | 皮肤工作室 App 架构设计（Dream Skin 引擎源码级结论 + Tauri 外壳决策） |
| [execution-task0.md](execution-task0.md) | 任务 0（资料沉淀）执行存档 |

## 产物速览

| 产物 | 位置 | 状态 |
|---|---|---|
| 展示网站（图鉴/安装页） | [`Pokemon/app/`](../../../Pokemon/app/) | ✅ |
| TUI 主题 ×6 | [`Pokemon/themes/*.tmTheme`](../../../Pokemon/themes/) | ✅ |
| 桌面 codex-theme-v1 ×7 | [`Pokemon/themes/desktop/`](../../../Pokemon/themes/desktop/) | ✅ |
| CSS 皮肤包（轻量注入器） | [`Pokemon/skins/`](../../../Pokemon/skins/) | ✅ |
| 皮肤工作室 App | [`Pokemon/studio/`](../../../Pokemon/studio/) | ✅ Windows 实测通过 |
| 单一数据源 | [`Pokemon/app/src/themes/scenes.ts`](../../../Pokemon/app/src/themes/scenes.ts) | — |

## 通用开发指南

开发 CLI 主题 / 桌面主题 / Dream Skin 皮肤的方法不在本档案里，见 [`docs/guides/`](../../guides/)（[项目总览](../../guides/project-overview.md)是入口）。
