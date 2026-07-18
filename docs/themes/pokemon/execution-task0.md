# 宝可梦 Codex 主题 — 执行文档（任务 0：资料沉淀）

日期： 2026-07-18
分支： `feat/pokemon-theme-docs`（从最新 pre-release 创建）

## 本任务范围

产出 `docs/themes/pokemon/` 文档组（初始位于 docs/pokemon/，后随文档重组迁入）：

| 文档 | 内容 |
|---|---|
| [requirements.md](requirements.md) | 需求（整理自 Pokemon/info.md + plan.md），新增"真实 .tmTheme 产物"范围 |
| [codex-cli-theme-development.md](../../guides/codex-cli-theme-development.md) | **Codex 主题开发指南**（怎么开发主题：.tmTheme 结构、scope 清单、开发流程、验证命令） |
| [pokemon-theme-design.md](design.md) | **宝可梦主题设计总纲**（场景×宝可梦选角逻辑、配色推导、素材使用设计） |
| [codex-official-theming.md](../../guides/references/codex-official-theming.md) | 官方主题机制调研存档：.tmTheme、/theme、tui.* 配置键、能力边界 |
| [pokemon-assets.md](assets.md) | 三个素材库调研存档（策略已修订：私人用途，sprite 直接入库） |
| [roadmap.md](roadmap.md) | 全部待做任务清单与执行顺序 |

## 重要决策

- **真实产物选 .tmTheme**：这是 Codex TUI 官方唯一支持的自定义皮肤机制（语法高亮主题），放在 `~/.codex/themes/` + `/theme` 选择即可用。官方不支持整套 UI 颜色自定义，info.md 的 ANSI 16 色需求降级为"网站展示 + 终端模拟器导入产物 + tmTheme 取色来源"。
- **素材入库（2026-07-18 修订）**：所有者确认为个人私人用途、不在意版权限制，策略从"自绘字符画为主"修订为"PokeAPI/sprites Gen III sprite + 官方立绘直接入库，中文数据摘录使用"。中文名与图鉴描述从 NightCatSama/pokedex 的 `pokemon.json` 摘录。
- **vite.config.ts 端口修复**随本分支一起提交（去掉硬编码 3000，改用 PORT 环境变量；本机 3000 被 Docker 占用导致 dev server 起不来）。

## 验证

- 纯文档任务，验证 = 文档与调研来源一致 + CI build 通过（vite.config.ts 改动影响构建配置，需确认 build 仍绿）。
