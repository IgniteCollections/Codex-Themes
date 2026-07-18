# 宝可梦 CSS 皮肤包（CDP 注入 · 轨道 B）

对 Codex 桌面 App 做完整换肤：场景像素风壁纸 + 全套 CSS 皮肤。机制与 [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 相同（CDP 只绑 127.0.0.1，不改 app 签名，可一键恢复），实现为本项目自有的轻量注入器。

## 结构

```
skins/
├── pokemon-skin.css        # 7 场景皮肤（按 html[data-pokemon-skin="<scene>"] 切换）
├── renderer-inject.js      # 注入到页面的脚本（挂 class、设壁纸变量、状态提示）
└── apply.sh                # 注入器：发现 Codex CDP 目标 → 注入 CSS/JS
    remove.sh               # 一键恢复
```

## 用法

```bash
# 以调试模式启动 Codex 桌面 App（另开终端，先完全退出 App）
/Applications/ChatGPT.app/Contents/MacOS/ChatGPT --remote-debugging-port=9222 &

# 注入场景皮肤（7 选 1）
./skins/apply.sh grassland    # 草原
./skins/apply.sh space        # 宇宙
./skins/apply.sh power-plant  # 无人发电厂

# 恢复官方外观
./skins/remove.sh
```

## 每场景皮肤内容

- **全局壁纸**：场景像素风景（scene-*.png，image-rendering: pixelated 放大）+ 暗色 scrim 渐变保证可读性
- **色板变量**：`--pk-bg/panel/ink/accent/success/error/line` 取自 scenes.ts ui 色板（与 codex-theme-v1 同一份数据）
- **UI 覆盖**：侧栏（半透明场景面板色 + 模糊）、消息卡片（玻璃质感）、输入框（圆角玻璃 + 场景色聚焦环）、代码块/diff（场景语义色）
- **像素装饰**：CRT 扫描线叠加（极低透明度）、像素颗粒噪点

## 建议搭配

先导入对应场景的 codex-theme-v1（官方颜色层），再注入皮肤（壁纸 + 装饰层）——两层叠加就是完整皮肤。

## 注意

- 依赖 Codex 内部 DOM class（`main.main-surface`、`aside.app-shell-left-panel` 等），App 大版本更新可能需要适配；apply.sh 注入前会校验锚点存在
- 皮肤只作用于以调试模式启动的那个窗口；正常启动 Codex 即为官方外观
- 私人用途，素材不分发
