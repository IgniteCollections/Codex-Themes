# Codex 皮肤商店（Pokemon Studio）

Tauri 2 托盘应用：**皮肤商店式 UI**——浏览 7 款宝可梦栖息地皮肤（壁纸卡片网格 + 详情大预览 + 打字机终端演示 + ANSI 16 色板 + 出没宝可梦），一键应用到 Codex 桌面 App。内核囊括官方 [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 注入引擎（MIT，见 `src-tauri/resources/engine-*/LICENSE`）。

## 架构

```
src/                    # React 商店前端
├── App.tsx             # 商店布局：卡片网格 + 皮肤详情 + 引擎状态/操作
├── TerminalPreview.tsx # 打字机终端演示（与展示站 TerminalWindow 同逻辑）
├── scene-data.ts       # 场景数据源（复制自 app/src/themes/scenes.ts）
├── scenes.ts           # 商店目录元数据（壁纸/sprite/色板/文案）
├── wallpapers/         # 场景壁纸（复制自 app/public/scene-*）
└── sprites/            # 招牌 + 遭遇宝可梦 sprite（复制自 app/public/pokemon/）

src-tauri/resources/
├── engine-windows/     # vendor: Dream Skin windows/{assets,scripts}（MIT）
├── engine-macos/       # vendor: Dream Skin macos/{assets,scripts,presets}
└── themes/             # 构建期生成（勿手改）
    └── pokemon-<scene>/{theme.json, background.png, scene.css}
```

主题包由 `python3 Pokemon/scripts/generate-studio-themes.py` 从 `app/src/themes/scenes.ts`（单一数据源）生成；`src/scene-data.ts` 是它的副本（商店 UI 直接复用 banner/script/配色做预览）。

## 换肤机制

1. 安装引擎：官方 `install-dream-skin.ps1 -NoShortcuts` / `install-dream-skin-macos.sh --no-launchers --no-launch`
2. 切换场景：原子替换状态根活跃主题目录（先图后 theme.json；Windows `active-theme/`，**macOS `theme/`**）+ 重建 engine `dream-skin.css` 的 pokemon 块 → watch injector 热应用（秒级）
3. 状态根：Windows `%LOCALAPPDATA%\CodexDreamSkin\` / macOS `~/Library/Application Support/CodexDreamSkinStudio/`

## 开发

```bash
python3 Pokemon/scripts/generate-studio-themes.py   # 生成主题包（需 Pillow: pip install Pillow）
cd Pokemon/studio && npm install && npm run tauri dev
```

浏览器预览（无 Tauri 后端，展示假数据商店 UI）：`npm run dev` → http://localhost:5174

## 前置条件

- 官方 Codex 桌面 App（Windows: 商店包 `OpenAI.Codex`；macOS: `com.openai.codex`，即 /Applications/ChatGPT.app）
- Node.js ≥ 22（Windows）；macOS 自动使用 ChatGPT 内置签名 Node

## 当前状态

- **Windows**：端到端实测通过（2026-07-18，Codex 26.715.4045.0）——安装引擎、草原/岩浆热切换（秒级）、恢复官方外观全链路可用。
- **macOS**：引擎安装实测通过（2026-07-18，Codex 26.715.31925，ChatGPT 内置 Node 24.14.0）；实测修复 5 个缺陷（见 `docs/themes/pokemon/progress.md`）。商店 UI 经浏览器预览迭代。

## 发布构建

```bash
cd Pokemon/studio && npm run tauri build   # 产出 NSIS 安装包（Windows）/ DMG（macOS）
```
