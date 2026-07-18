# Plan — CODEX 宝可梦风格皮肤设计

## 目标
为 CODEX (终端编程助手) 设计一套宝可梦风格的皮肤/主题系统，包含 6 个场景：
草原、海洋、洞穴、岩浆、雪原、无人发电厂，每个场景匹配对应的宝可梦与配色方案。
最终以交互式展示网站交付：可切换场景、预览终端效果、复制配色配置。

## 场景 × 宝可梦匹配设计
| 场景 | 匹配宝可梦 | 主色调 |
|---|---|---|
| 草原 (Grassland) | 妙蛙种子 / 走路草 / 绿毛虫 | 嫩绿 + 草绿 + 阳光黄 |
| 海洋 (Ocean) | 暴鲤龙 / 拉普拉斯 / 玛瑙水母 | 深海蓝 + 浪花青 |
| 洞穴 (Cave) | 超音蝠 / 小拳石 / 大岩蛇 | 岩灰 + 暗紫 + 微光 |
| 岩浆 (Magma) | 小火龙 / 鸭嘴火兽 / 熔岩虫 | 熔岩红 + 橙黄 + 炭黑 |
| 雪原 (Snowfield) | 冰伊布 / 急冻鸟 / 海豹球 | 冰白 + 浅青 + 极光蓝 |
| 无人发电厂 (Power Plant) | 皮卡丘 / 小磁怪 / 电击兽 | 电光黄 + 工业暗灰 + 警示橙 |

## 阶段
### Stage 1 — 设计定稿（Orchestrator 完成）
- 确定每个场景的 ANSI 16 色调色板、UI 强调色、状态栏样式、宝可梦像素风元素
- 输出设计规范，注入 builder subagent prompt

### Stage 2 — 构建展示网站
- 加载技能: `vibecoding-webapp-swarm`（构建阶段开始时读取 SKILL.md）
- 派发 coder subagent 构建 React + Tailwind 单页应用：
  - 顶部场景选择器（6 个场景 Tab）
  - CODEX 终端模拟窗口：随场景切换整套配色、横幅、提示符
  - 宝可梦像素风装饰元素
  - 配色 Token 面板 + 一键复制 config
- 构建通过后由 Orchestrator 验证

### Stage 3 — 交付
- 调用 `mshtools-website_version_manager` (build_version, type=static) 保存网站版本
- 返回预览 URL
