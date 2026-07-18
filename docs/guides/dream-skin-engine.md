# Dream Skin 引擎

[Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)（~9.2k stars，MIT）是为 Codex 桌面 App 做**完整换肤**的开源引擎。官方 `codex-theme-v1` 导入只能改颜色和字体（连背景图都不支持），Dream Skin 通过 CDP 注入实现任意 CSS 换肤：全局壁纸、侧栏/卡片/输入框完全重绘。

本文是引擎机制说明与源码级结论（基于 upstream main @ 2026-07-17，skin version 1.2.0）。概念层调研见 [references/dream-skin-research.md](references/dream-skin-research.md)；怎么给它开发主题见 [dream-skin-theme-development.md](dream-skin-theme-development.md)。

> 本项目已将该引擎 vendor 进 `Pokemon/studio/src-tauri/resources/engine-{windows,macos}/`（含 LICENSE/NOTICE），宝可梦皮肤工作室 App 以它为运行时。

## 1. 工作原理

1. 以 `--remote-debugging-address=127.0.0.1 --remote-debugging-port=<p>` 启动 Codex 桌面 App（Electron）
2. 常驻 Node 进程（`injector.mjs --watch`）通过 CDP 发现 `app://` 页面，校验 shell 标记（`main.main-surface`、`aside.app-shell-left-panel`）
3. 把 `dream-skin.css` + 装饰 DOM 注入页面；主题数据（壁纸 base64、焦点、强调色）替换进模板
4. **watch 热更新**：审计 `active-theme/` 的指纹与文件戳，变化即对所有页面热应用（`Page.addScriptToEvaluateOnNewDocument` + 立即 evaluate）；页面刷新/新窗口自动重注

安全边界：不改 `app.asar`/签名、CDP 只绑 127.0.0.1、一键恢复官方外观。注意 CDP 会话期间本机其他程序也可连该端口（同用户），官方建议换肤期间只跑可信软件。

## 2. 运行时布局

| 平台 | 状态根 | 引擎安装位置 |
|---|---|---|
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\` | `<状态根>\engine\` |
| macOS | `~/Library/Application Support/CodexDreamSkinStudio/` | `~/.codex/codex-dream-skin-studio/` |

状态根关键文件：

```
<状态根>/
├── state.json        # injectorPid / port / browserId / codexExe（schemaVersion 3）
├── active-theme/     # 当前主题（theme.json + 壁纸）——watch 监听的就是它
├── themes/           # 已保存主题库（preset-*/custom-*/我们的 pokemon-*）
├── paused            # 存在即暂停注入
└── engine/           # 引擎本体（assets/dream-skin.css、scripts/injector.mjs 等）
```

前置条件：Windows 需官方商店包 `OpenAI.Codex` + **Node.js ≥ 22**；macOS 需 bundle id `com.openai.codex`，自动使用 ChatGPT 内置的签名 Node（`Contents/Resources/cua_node/bin/node`）。

## 3. 官方脚本（外部工具/App 可驱动）

| 脚本 | 作用 |
|---|---|
| `install-dream-skin.ps1 [-NoShortcuts]` / `install-dream-skin-macos.sh` | 复制 engine、初始化主题库、备份 config.toml 基础主题（**安装前需完全退出 Codex**） |
| `start-dream-skin.ps1 [-RestartExisting]` / `start-dream-skin-macos.sh` | 带 CDP 端口启动 Codex + 常驻 injector；结尾 verify 会等 shell 渲染（可能挂起数分钟，**调用方必须异步**） |
| `restore-dream-skin.ps1 [-ForceRestart]` / `restore-dream-skin-macos.sh` | 关 injector、恢复官方外观（会重开一个无 CDP 的 Codex） |
| `verify-dream-skin.ps1` / `verify-dream-skin-macos.sh` | 校验 CDP 回环 + 皮肤已加载 + 原生控件可用 |
| `switch-theme-macos.sh --id <id>` | macOS 官方主题切换（热路径） |
| `injector.mjs --check-payload --theme-dir <dir>` | 离线校验主题包合法性 |
| `injector.mjs --self-test` | 引擎 CDP 校验逻辑自测 |

## 4. 切换主题 = 原子替换 active-theme

不需要重启任何东西：staging 目录准备好新主题 → 先替换图片 → 最后替换 `theme.json`（commit marker）→ watch 在秒级内热应用。状态目录有 reparse-point/symlink 安全检查，写入必须走普通文件。

## 5. theme.json 实际生效字段（源码确认）

| 字段 | 生效？ | 说明 |
|---|---|---|
| `id` / `name` | ✅ | ≤80/120 字符单行 |
| `image` | ✅ | 相对文件名，png/jpg/jpeg/webp，≤16MB，≤16384px/50MP |
| `appearance` | ✅ | `auto`/`light`/`dark`（auto = 探测 shell class） |
| `art.focusX/focusY` | ✅ | 0–1 壁纸焦点；null = 图片显著性分析自动定 |
| `art.safeArea` | ✅ | `auto`/`left`/`right`/`center`/`none`——内容少的一侧留给主区 |
| `art.taskMode` | ✅ | `auto`/`ambient`/`banner`/`off`——任务页壁纸模式 |
| `palette.accent` | ✅ | **唯一生效的颜色字段**；缺省时从壁纸自动提取强调色 |
| `colors.{background,panel,…}` | ❌ | 注入器不读（官方 preset 的展示性字段） |
| `brandSubtitle/tagline/quote/promo*` | ❌ | 同上 |

## 6. 完整 CSS 皮肤的注入点

`loadPayload()` 从 **engine 目录**的 `assets/dream-skin.css` 读 CSS 注入页面。renderer 创建的元素 id 固定为 `codex-dream-skin-style` / `codex-dream-skin-chrome`，window 状态键 `__CODEX_DREAM_SKIN_STATE__`。

因此要在引擎之上叠加**完整场景 CSS**（如我们的 19 色场景皮肤），做法是幂等重建 engine 的 `dream-skin.css`（本项目用 `/* pokemon-skin begin/end */` 标记块管理），不需要 fork injector 代码。自定义注入层只要避开上述固定 id 即无冲突。
