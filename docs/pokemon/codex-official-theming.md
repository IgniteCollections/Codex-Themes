# Codex CLI 官方主题机制调研

来源：
- [CLI customization | ChatGPT Learn](https://learn.chatgpt.com/docs/cli-customization)（官方教程，2026-07-18 调研）
- [Codex Config Reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [developers.openai.com/codex/cli-customization](https://developers.openai.com/codex/cli-customization)
- [openai/codex — /theme picker PR #49498](https://github.com/openai/codex/actions/runs/21352367316)
- [mcpso/awesome-codex-themes](https://github.com/mcpso/awesome-codex-themes)（社区 .tmTheme 合集）

## 核心结论：Codex TUI 的自定义皮肤 = `.tmTheme` 文件

Codex TUI 会对 Markdown 代码块和 diff 做语法高亮，主题是**语法高亮主题**，不是整套 UI 颜色的自由配置。官方支持的自定义皮肤路径：

1. 把 TextMate 格式的 `.tmTheme` 文件放到 `$CODEX_HOME/themes/`（默认 `~/.codex/themes/`）
2. 在 TUI 里输入 `/theme` 打开主题选择器（带实时预览，滚动即换），选择后自动写入 `tui.theme`
3. 新放入的主题文件**无需重启**即可被识别
4. 任何编辑器生态的 `.tmTheme`（Catppuccin、bat、Sublime/TextMate 主题库）都可直接复用

### config.toml 写法

```toml
# ~/.codex/config.toml
tui.theme = "pokemon-grassland"   # kebab-case 主题名，对应 themes/pokemon-grassland.tmTheme

# 按 profile 覆盖
[profiles.work.tui]
theme = "pokemon-power-plant"
```

## TUI 相关的其他 config.toml 键（Config Reference 实测存在）

```toml
tui.theme = "my-theme"                    # 语法高亮主题（kebab-case）
tui.alternate_screen = "auto"             # auto | always | never
tui.animations = true                     # 欢迎屏、shimmer、spinner 动画
tui.raw_output_mode = false               # /raw 或 alt-r 切换
tui.vim_mode_default = false              # /vim 切换
tui.show_tooltips = true
tui.status_line = ["item-a", "item-b"]    # 底部状态栏条目；null 关闭
tui.terminal_title = ["spinner", "project"]
tui.notifications = true
tui.notification_condition = "unfocused"  # unfocused | always
tui.notification_method = "auto"          # auto | osc9 | bel
notify = ["my-notify-command", "--flag"]  # 外部通知命令，收 JSON
tui.keymap.composer.submit = "ctrl-enter" # 键位绑定
```

## 重要边界（影响产品设计）

- **没有官方 ANSI 16 色配置**：Codex TUI 的整体 UI 色（背景、边框、状态栏颜色）不开放配置。info.md 中的「ANSI 16 色调色板」只能作为：(a) 网站展示的配色方案、(b) 用户终端模拟器（iTerm2/Alacritty/kitty 等）的配色导入产物、(c) `.tmTheme` 的取色来源。
- **状态栏内容可排序/开关，但颜色不可定制**（`tui.status_line` 只收条目列表）。
- **Codex 桌面 App 是另一套体系**：Settings → Appearance 自定义，用 `codex-theme-v1:` 字符串导入导出，与 TUI 的 `.tmTheme` 不通用。本项目目前只做 TUI 主题。

## 对本项目的落地方式

| 产物 | 格式 | 用户安装方式 |
|---|---|---|
| 场景语法高亮主题 | `Pokemon/themes/pokemon-<scene>.tmTheme` | 复制到 `~/.codex/themes/`，TUI 内 `/theme` 选择，或写 `tui.theme = "pokemon-<scene>"` |
| 终端模拟器配色 | ANSI 16 色 JSON / iTerm2 itermcolors（可选） | 导入终端模拟器 |
| 展示与分发 | Pokemon/app 网站 | 安装页给出一键复制命令 |

`.tmTheme` 是 TextMate 的 plist XML 格式，`settings` 数组第一项定义全局 `foreground`/`background`/`selection` 等，后续项按 `scope`（如 `keyword`、`string`、`comment`、`markup.diff.added`）定义语法色。diff 高亮常用 scope：`markup.inserted.diff`、`markup.deleted.diff`、`markup.changed.diff`。
