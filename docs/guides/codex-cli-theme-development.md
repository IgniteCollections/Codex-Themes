# Codex 主题开发指南

如何为 Codex CLI（TUI）开发一套自定义主题。本指南是仓库所有主题（宝可梦及未来主题）的通用开发手册。

来源：官方文档调研见 [codex-official-theming.md](references/codex-official-theming.md)；本文是面向开发者的操作指南。

## 1. 官方机制速览

| 项 | 值 |
|---|---|
| 主题格式 | TextMate `.tmTheme`（plist XML） |
| 安装目录 | `~/.codex/themes/`（即 `$CODEX_HOME/themes/`） |
| 启用方式 | TUI 内输入 `/theme` 选择（实时预览），或写 `config.toml` |
| 配置键 | `tui.theme = "<kebab-case-name>"`（对应 `<kebab-case-name>.tmTheme`） |
| 热加载 | 新放入的文件无需重启即被识别 |
| 作用范围 | **语法高亮**（Markdown 代码块、diff），不含整体 UI 颜色 |

可复用生态：任何 TextMate/Sublime/bat 主题（Catppuccin 等）的 `.tmTheme` 可直接放入使用。社区合集：[mcpso/awesome-codex-themes](https://github.com/mcpso/awesome-codex-themes)。

## 2. 能做什么 / 不能做什么

**能：**
- 代码块与 diff 的全部语法高亮色（keyword/string/comment/number/markup 等 scope）
- diff 增删行颜色（`markup.inserted.diff` / `markup.deleted.diff` / `markup.changed.diff`）
- 全局编辑色：foreground、background（影响高亮块底色）、selection、lineHighlight、caret
- 配合 `tui.status_line`、`tui.animations`、`tui.terminal_title` 等 config 键调整体验

**不能（官方不开放）：**
- TUI 整体 UI 颜色（边框、状态栏、提示符颜色）
- ANSI 16 色本身——那属于**终端模拟器**（iTerm2/kitty/Alacritty/Windows Terminal）的配置范畴

因此一套完整的"皮肤"通常是三层，主题包应分别产出：

| 层 | 产物 | 用户装在哪 |
|---|---|---|
| Codex 语法高亮 | `<name>.tmTheme` | `~/.codex/themes/` |
| 终端模拟器调色板 | ANSI 16 色（itermcolors / JSON / toml） | iTerm2/kitty/Alacritty 等 |
| Codex 体验配置 | `config.toml` 片段（tui.* 键） | `~/.codex/config.toml` |

## 3. .tmTheme 文件结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>name</key><string>Pokemon Grassland</string>
  <key>settings</key>
  <array>
    <!-- 第 1 项：全局设置（无 scope） -->
    <dict>
      <key>settings</key>
      <dict>
        <key>foreground</key><string>#F5FBEA</string>
        <key>background</key><string>#1E3A13</string>
        <key>selection</key><string>#4A7C2F</string>
        <key>lineHighlight</key><string>#274A1A</string>
        <key>caret</key><string>#F7D02C</string>
      </dict>
    </dict>
    <!-- 后续项：按 scope 定义语法色 -->
    <dict>
      <key>name</key><string>Comment</string>
      <key>scope</key><string>comment, punctuation.definition.comment</string>
      <key>settings</key>
      <dict><key>foreground</key><string>#8A9A5B</string></dict>
    </dict>
    <!-- ... keyword / string / number / constant / entity / support / markup ... -->
    <!-- diff 必备： -->
    <dict>
      <key>name</key><string>Diff added</string>
      <key>scope</key><string>markup.inserted.diff</string>
      <key>settings</key>
      <dict><key>foreground</key><string>#7AC74C</string></dict>
    </dict>
    <dict>
      <key>name</key><string>Diff deleted</string>
      <key>scope</key><string>markup.deleted.diff</string>
      <key>settings</key>
      <dict><key>foreground</key><string>#D43D2A</string></dict>
    </dict>
  </array>
</dict>
</plist>
```

### 必备 scope 清单（Codex 场景）

| scope | 用途 | 选色建议 |
|---|---|---|
| （全局） | 基础前景/背景/选区 | 主题主色板 |
| `comment` | 注释 | 低饱和副色， Readable 但不抢戏 |
| `keyword` | 关键字 | 主强调色 |
| `string` | 字符串 | 第二强调色 |
| `constant.numeric` | 数字 | 点缀色 |
| `entity.name.function` | 函数名 | 高亮暖色 |
| `variable` / `variable.parameter` | 变量 | 中性前景色微调 |
| `markup.heading` | Markdown 标题 | 主强调色加粗 |
| `markup.inserted.diff` | diff 新增行 | 语义绿（可用场景色替代，保持可读） |
| `markup.deleted.diff` | diff 删除行 | 语义红（同上） |
| `markup.changed.diff` | diff 修改行 | 语义黄/橙 |

终端是 256 色/真彩环境，hex 色直接使用即可；注意背景与前景对比度 ≥ 4.5:1（终端长时间阅读）。

## 4. 开发流程（本仓库标准）

```
1. 设计定稿    → 主题设计文档（场景/色板/语义色映射），放 docs/<theme>/
2. 数据建模    → <Theme>/app/src/data/ 中定义类型化主题数据（单一数据源）
3. 生成产物    → 由数据生成 .tmTheme（脚本或手写模板），放 <Theme>/themes/
4. 本地验证    → plutil -lint <file>.tmTheme 校验 plist 合法
                 cp 到 ~/.codex/themes/，codex TUI 内 /theme 实测
5. 网站对接    → 展示站从同一数据源渲染预览；安装页给真实安装命令
6. PR         → 任务分支 → pre-release（CI Gate）；发布 = pre-release → main
```

## 5. 验证命令

```bash
# plist 合法性（macOS 自带）
plutil -lint Pokemon/themes/pokemon-grassland.tmTheme

# 安装到本机 Codex
mkdir -p ~/.codex/themes
cp Pokemon/themes/pokemon-grassland.tmTheme ~/.codex/themes/

# 启用（二选一）
# a) codex TUI 内输入 /theme，滚动选择
# b) ~/.codex/config.toml 写入：
#    tui.theme = "pokemon-grassland"
```

实测检查点：
- [ ] `/theme` 列表里出现主题名，滚动有实时预览
- [ ] diff 新增/删除行颜色符合设计
- [ ] 代码块内 keyword/string/comment 可区分
- [ ] 深色终端背景下正文对比度舒适

## 6. 相关 tui.* 配置速查

```toml
tui.theme = "pokemon-grassland"
tui.animations = true                     # 欢迎屏/spinner 动画
tui.status_line = ["model", "tokens"]     # 底部状态栏条目
tui.terminal_title = ["spinner", "project"]
tui.notifications = true

# profile 级覆盖
[profiles.work.tui]
theme = "pokemon-power-plant"
```
