# 桌面 App 换肤方案调研：codextheme.net / Codex-Dream-Skin

日期： 2026-07-18

用户给的参考站 [codextheme.net](https://codextheme.net) 调研结论，以及对本项目主线（桌面 App 主题）的影响。

## 1. codextheme.net 是什么

**不是主题市场**，而是社区项目 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)（~9k stars）的导览站。站点本身只提供：

- 8 张概念皮肤截图轮播（粉色系/财神红金/红白科幻/紫夜/蓝赛博/黑金等，**不提供色值**）
- **壁纸预览工具**：拖入自己的图片，在模拟 Codex UI（侧栏/输入框/卡片）上试看效果，纯本地运行不上传
- 安装指引（跳到原仓库的 macOS .command / Windows PowerShell 安装器）

## 2. Codex-Dream-Skin 的技术路线（CDP 注入）

与我们 `codex-theme-v1` 导入字符串完全不同的机制：

| | codex-theme-v1（我们当前方案） | Dream Skin（CDP 注入） |
|---|---|---|
| 原理 | 官方 Appearance → Import，改颜色/字体配置 | 以 `--remote-debugging-port` 启动 Codex（Electron），通过 CDP 向页面**注入 CSS + 装饰 DOM** |
| 能力 | accent/surface/ink/diff 色/字体/contrast | **任意 CSS**：全局壁纸背景（base64 data URL）、侧栏/卡片/输入框完全重绘 |
| 壁纸/图片 | ❌ 不支持 | ✅ 支持（--dream-skin-art，16:9 推荐 2560×1440） |
| 侵入性 | 零（官方功能） | 不改 asar/签名，CDP 只绑 127.0.0.1，一键恢复；但需要守护进程/watch 模式在运行 |
| 安装 | 粘贴字符串，10 秒 | 跑安装脚本，引擎装到 `~/.codex/codex-dream-skin-studio` |
| 安全注意 | 无 | 运行时本地开一个调试端口；只用原仓库脚本 |

技术要点（读 injector.mjs 源码确认）：CDP 发现 `app://` 页面 → 校验 ChatGPT shell 标记（`main.main-surface`、`aside.app-shell-left-panel`）→ 注入 `dream-skin.css` + `renderer-inject.js`，主题数据（accent `#7cff46` 等）以 JSON 替换进模板，壁纸转 base64 data URL，完成后给 `documentElement` 加 `codex-dream-skin` class 作为校验锚点。

## 3. 对本项目的意义

宝可梦主题在桌面 App 上可以做到比 codex-theme-v1 强得多的效果——**场景像素风景做全局壁纸 + 全套 CSS 换肤**，这是导入字符串做不到的（它连背景图都不支持）。

借鉴点：

1. **预览工具 UX**：codextheme.net 的"拖图试看"模式 ≈ 我们图鉴页的角色——用户先在网页上看到完整皮肤效果，再决定安装。我们的展示站已经是这个定位，且比它强（真实场景数据、可交互）
2. **CDP 注入是可行路径**：官方主题字段之外还有完整的 CSS 层可玩，社区已验证安全模式（loopback-only、不改签名、可恢复）
3. **双轨产物**：轻量用户用 codex-theme-v1（10 秒装完），重度用户用 CSS 皮肤包（壁纸 + 完整换肤）

## 4. 建议路线（供决策）

| 阶段 | 内容 | 依赖 |
|---|---|---|
| 已完成 | codex-theme-v1 × 7 导入字符串 | 无 |
| 下一步 A | 安装页「桌面客户端」段挂上 7 套字符串 | 无 |
| 下一步 B（推荐） | **宝可梦 CSS 皮肤包**：每场景一份 `pokemon-<scene>.css`（场景色板变量 + 像素纹理/扫描线装饰）+ 场景壁纸（scene-*.png 升级或像素风重绘），参照 Dream Skin 的注入协议做我们自己的轻量注入脚本（或兼容其 preset 结构） | 需要研究 renderer-inject.js 的 DOM 锚点 |

风险记录：CDP 注入依赖 Codex 内部 DOM 结构（class 名），App 更新可能失效——Dream Skin 用 verify/doctor 脚本应对，我们若做也需要同样的自检。
