# Dream Skin 主题开发与使用

为 [Dream Skin 引擎](dream-skin-engine.md) 开发主题（preset），以及安装/切换/恢复的操作方法。以本项目的宝可梦主题为实例。

## 1. 主题包（preset）格式

一个主题 = 一个文件夹：

```
pokemon-grassland/
├── theme.json       # 必需：元数据 + 壁纸焦点 + 强调色
├── background.png   # 必需：壁纸（png/jpg/jpeg/webp，≤16MB，推荐 2560×1440 16:9）
└── scene.css        # 可选：完整 CSS 皮肤层（本项目扩展，见 §3）
```

**theme.json**（只列生效字段）：

```json
{
  "schemaVersion": 1,
  "id": "pokemon-grassland",
  "name": "❀ 草原 · Grassland",
  "image": "background.png",
  "appearance": "dark",
  "art": { "safeArea": "auto", "taskMode": "ambient" },
  "palette": { "accent": "#7AC74C" }
}
```

| 字段 | 取值 | 建议 |
|---|---|---|
| `id` | 目录名同款 slug | 用专属前缀避开官方命名空间（官方 `preset-*` 种子、用户 `custom-*`；我们用 `pokemon-*`） |
| `appearance` | `auto`/`light`/`dark` | 深色系主题直接 `dark` |
| `art.focusX/focusY` | 0–1，或**省略字段** | 省略 = 引擎按图片显著性自动找焦点；构图特殊的壁纸再手写。⚠️ **不要写 `null`**——injector 的 `unit()` 校验只接受数字或缺省，`null` 直接抛错（2026-07-18 macOS 实测） |
| `art.safeArea` | `auto`/`left`/`right`/`center`/`none` | `auto`：引擎自动把内容少的一侧留给主界面 |
| `art.taskMode` | `auto`/`ambient`/`banner`/`off` | 任务页壁纸模式；`ambient` = 弱化显示 |
| `palette.accent` | CSS 颜色 | **唯一生效的颜色**，驱动原生控件强调色；不写则从壁纸自动提取 |

**校验**：写完后用引擎自带校验器检查：

```bash
node <engine>/scripts/injector.mjs --check-payload --theme-dir pokemon-grassland/
# → {"pass":true,"themeId":"pokemon-grassland","artMetadata":{"width":2560,"height":1440,...}}
```

**壁纸注意**：不支持 SVG。像素画建议先用最近邻放大到 2560×1440（本项目 `generate-studio-themes.py` 就是这么做的），引擎端 `image-rendering: pixelated` 保持锐利。

## 2. 安装与使用

### 方式 A：宝可梦皮肤工作室 App（推荐）

`Codex-Skin-Store/`（Tauri 托盘 App）封装了全部流程：安装引擎 → 9 个场景入主题库 → 点卡片切换。首次使用：

1. 完全退出 Codex，App 里点「安装引擎」（调官方 `install-dream-skin.ps1 -NoShortcuts`）
2. 点任意场景卡片 → 确认重启 Codex → 秒级换肤
3. 「恢复官方」一键还原

### 方式 B：官方脚本手动操作（Windows 示例）

```powershell
# 0. 前置：Node ≥ 22、官方 Codex 商店包；完全退出 Codex
# 1. 安装引擎（-NoShortcuts 不建桌面快捷方式）
powershell -ExecutionPolicy Bypass -File engine-windows/scripts/install-dream-skin.ps1 -NoShortcuts

# 2. 主题入库
$x = "$env:LOCALAPPDATA\CodexDreamSkin"
robocopy pokemon-grassland "$x\themes\pokemon-grassland" /E

# 3. 激活（先图后 json，json 是 commit marker）
copy "$x\themes\pokemon-grassland\background.png" "$x\active-theme\"
copy "$x\themes\pokemon-grassland\theme.json"    "$x\active-theme\"

# 4. 启动（带 CDP 重启 Codex + 常驻 injector；结尾 verify 可能等 1-2 分钟）
powershell -ExecutionPolicy Bypass -File "$x\engine\scripts\start-dream-skin.ps1" -RestartExisting

# 5. 换场景：重复步骤 3（换另一套主题文件）即可，秒级热应用
# 6. 暂停：在 $x\ 下放一个名为 paused 的文件；删掉即恢复
# 7. 恢复官方外观
powershell -ExecutionPolicy Bypass -File "$x\engine\scripts\restore-dream-skin.ps1" -ForceRestart
```

macOS 对应脚本在 `engine-macos/scripts/`（`*-macos.sh`），状态根在 `~/Library/Application Support/CodexDreamSkinStudio/`。

## 3. 完整 CSS 皮肤层（可选扩展）

基础主题只有「壁纸 + 强调色」。如果要场景级完整换肤（diff 配色、徽章、扫描线等），把自定义 CSS 幂等合并进 engine 的 `assets/dream-skin.css`（在 `active-theme` 切换时同步重建，用标记块管理）：

```css
/* pokemon-skin begin */
html.pokemon-skin { --pk-bg: #0D1B0A; ... }   /* 场景变量 */
...(完整皮肤规则，注意避开 codex-dream-skin-* 的固定 id)...
/* pokemon-skin end */
```

引擎会把合并后的整个 `dream-skin.css` 注入页面。恢复官方时把标记块删掉即可。本项目的 9 个 `scene.css` 由 `Pokemon/scripts/generate-studio-themes.py` 从 scenes.ts 生成，宝可梦皮肤工作室 App 自动完成合并/清除。

## 4. 排错

| 症状 | 排查 |
|---|---|
| `Node.js 22 or newer is required` | Windows 引擎需要 Node ≥ 22（nvm 切换即可）；macOS 用 ChatGPT 内置 Node 无此问题 |
| `Close Codex before installing` | 安装/恢复前必须完全退出 Codex（包括后台进程） |
| `Codex is open without a verified Dream Skin CDP endpoint` | Codex 已在无调试端口下运行：先关掉，或 start 加 `-RestartExisting` |
| start 脚本看似卡死 | 结尾的 verify 在等 Codex shell 渲染（登录/加载），最长数分钟；属正常现象，异步等待即可 |
| 换主题没生效 | 确认替换的是 `active-theme/`（不是 `themes/`）；确认没有 `paused` 文件；看 `%LOCALAPPDATA%\CodexDreamSkin\injector.log` |
| Codex 大版本更新后皮肤失效 | DOM class 变化导致，跑官方 `verify-dream-skin.ps1` 自检；升级 vendor 引擎跟进上游修复 |
