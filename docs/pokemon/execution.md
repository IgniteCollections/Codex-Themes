# 宝可梦 Codex 主题 — 执行文档（任务 0：资料沉淀）

日期： 2026-07-18
分支： `feat/pokemon-theme-docs`（从最新 pre-release 创建）

## 本任务范围

只做资料调研与文档沉淀，不改产品代码。产出 `docs/pokemon/` 四份文档：

| 文档 | 内容 |
|---|---|
| [requirements.md](requirements.md) | 需求（整理自 Pokemon/info.md + plan.md），新增"真实 .tmTheme 产物"范围 |
| [codex-official-theming.md](codex-official-theming.md) | 官方主题机制调研：.tmTheme、/theme、tui.* 配置键、能力边界 |
| [pokemon-assets.md](pokemon-assets.md) | 三个素材库调研与版权结论 |
| [roadmap.md](roadmap.md) | 全部待做任务清单与执行顺序 |

## 重要决策

- **真实产物选 .tmTheme**：这是 Codex TUI 官方唯一支持的自定义皮肤机制（语法高亮主题），放在 `~/.codex/themes/` + `/theme` 选择即可用。官方不支持整套 UI 颜色自定义，info.md 的 ANSI 16 色需求降级为"网站展示 + 终端模拟器导入产物 + tmTheme 取色来源"。
- **素材不入库**：三个素材仓库均无自由许可证。网站维持自绘字符画/像素块；中文名与图鉴描述从 NightCatSama/pokedex 手工摘录；PokeAPI/sprites Gen III 仅作像素风参考。
- **vite.config.ts 端口修复**随本分支一起提交（去掉硬编码 3000，改用 PORT 环境变量；本机 3000 被 Docker 占用导致 dev server 起不来）。

## 验证

- 纯文档任务，验证 = 文档与调研来源一致 + CI build 通过（vite.config.ts 改动影响构建配置，需确认 build 仍绿）。
