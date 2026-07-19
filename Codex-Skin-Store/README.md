# Codex 皮肤商店（Codex Skin Store）

独立的通用皮肤商店桌面 App（Tauri 2）。浏览各主题系列的皮肤，**一键应用到 Codex 桌面 App（Dream Skin 引擎 CDP 注入）或 Codex CLI（.tmTheme 语法高亮）**。

## 与主题系列的关系

本商店是通用容器，不绑定任何单一主题。皮肤以「系列」组织，首发自带**宝可梦栖息地系列**（9 场景）。主题系列的数据源与生成脚本在各自目录（如 `Pokemon/`），商店通过 vendor 皮肤包使用：

```
Codex-Skin-Store/src-tauri/resources/
├── engine-windows/   # vendor: Dream Skin windows/{assets,scripts}（MIT）
├── engine-macos/     # vendor: Dream Skin macos/{assets,scripts,presets}
├── themes/           # 桌面 App 皮肤包（pokemon-<scene>/，由 Pokemon/scripts 生成）
│   └── pokemon-<scene>/{theme.json, background.png(4K), scene.css}
└── cli-themes/       # CLI 语法高亮主题（pokemon-<scene>.tmTheme）
```

新增主题系列 = 往 `resources/themes/` + `resources/cli-themes/` 放对应皮肤包，商店自动上架。

## 应用两条路径

| 目标 | 机制 | 按钮 |
|---|---|---|
| **Codex 桌面 App** | Dream Skin 引擎 CDP 注入（全局换肤：4K 壁纸 + 整套 UI） | 「应用 XX 到桌面 App」 |
| **Codex CLI / TUI** | 写 `~/.codex/themes/*.tmTheme` + `config.toml` 的 `[tui] theme`（代码块/diff 语法高亮） | 「应用 XX 到 CLI」 |

## 开发与打包

```bash
npm install
npx tauri dev      # 开发（热更新）
npx tauri build    # 打包 → src-tauri/target/release/bundle/{macos,dmg}
```

打包后把 `Codex 皮肤商店.app` 拖进「应用程序」即可双击启动（已去 quarantine）。

## 前置条件

- 官方 Codex 桌面 App（Windows: 商店包 `OpenAI.Codex`；macOS: `com.openai.codex`，即 /Applications/ChatGPT.app）
- Node.js ≥ 22（Windows）；macOS 自动用 ChatGPT 内置签名 Node
- CLI 应用仅需 Codex CLI（`npm i -g @openai/codex`）

> **注意**：CLI 的 `.tmTheme` 只管**代码块/diff 的语法高亮**，不是全局换肤——整体 UI 颜色官方不开放给 CLI。`/theme` 里能实时预览；`config.toml` 里若已有旧的 `[tui] theme=` 键，apply_cli 会一并替换（避免旧值覆盖）。
