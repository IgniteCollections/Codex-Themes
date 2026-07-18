# Pokemon Studio — 宝可梦皮肤桌面 App

Tauri 2 托盘应用：囊括官方 [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 注入引擎（MIT，见 `src-tauri/resources/engine-*/NOTICE`），内置 7 个宝可梦场景主题，一键换肤 Codex 桌面 App。

## 架构

```
src-tauri/resources/
├── engine-windows/   # vendor: Dream Skin windows/{assets,scripts}（MIT）
├── engine-macos/     # vendor: Dream Skin macos 对应文件
└── themes/           # 构建期生成（勿手改）
    └── pokemon-<scene>/{theme.json, background.png, scene.css}
```

主题包由 `python3 Pokemon/scripts/generate-studio-themes.py` 从 `app/src/themes/scenes.ts`（单一数据源）生成。

## 换肤机制

1. 安装引擎：官方 `install-dream-skin.ps1 -NoShortcuts` / `install-dream-skin-macos.sh`
2. 切换场景：原子替换状态根 `active-theme/`（先图后 theme.json）+ 重建 engine `dream-skin.css` 的 pokemon 块 → watch injector 热应用（秒级）
3. 状态根：Windows `%LOCALAPPDATA%\CodexDreamSkin\` / macOS `~/Library/Application Support/CodexDreamSkinStudio/`

## 开发

```bash
python3 Pokemon/scripts/generate-studio-themes.py   # 生成主题包（需 Pillow: pip install Pillow）
cd Pokemon/studio && npm install && npm run tauri dev
```

## 前置条件

- 官方 Codex 桌面 App（Windows: 商店包 `OpenAI.Codex`；macOS: `com.openai.codex`）
- Node.js ≥ 22（Windows）；macOS 自动使用 ChatGPT 内置签名 Node

## 当前状态

- **Windows**：端到端实测通过（2026-07-18，Codex 26.715.4045.0）——安装引擎、草原/岩浆热切换（秒级）、恢复官方外观全链路可用。
- **macOS**：实现按官方脚本逐行对齐，未实测。

## 发布构建

```bash
cd Pokemon/studio && npm run tauri build   # 产出 NSIS 安装包（Windows）/ DMG（macOS）
```

