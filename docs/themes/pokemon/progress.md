# 宝可梦主题 — 开发与测试进度

日期： 2026-07-18

## 开发进度

| # | 任务 | 产出 | 状态 | PR |
|---|---|---|---|---|
| 0 | 资料沉淀到 docs/ | docs 文档组 | ✅ | #3/#4/#5/#6 |
| 1 | 9 场景 .tmTheme | `Pokemon/themes/pokemon-*.tmTheme` | ✅ plutil 通过 | #7 |
| 2 | 数据建模 + 素材入库 | scenes.ts 单一数据源；40 只 sprite 入 `app/public/pokemon/` | ✅ | #7/#8 |
| 3 | 安装页对接真实产物 | tmTheme 安装命令 + config.toml 片段 + /theme 流程 | ✅ | #8 |
| 4 | 场景图鉴页补全 | sprite 芯片、招牌展示卡、神兽池 ??? 槽位 | ✅ | #8 |
| 5.5 | 桌面 App 主题包 | `themes/desktop/` 9×(.json + .codex-theme.txt) + 生成脚本 + 安装页「桌面客户端」段 | ✅ | #12/#14 |
| 5.6 | 阵容 v4 + 宇宙场景 | 御三家进化链 + 宇宙（烈空坐）+ 新 sprite 入库 | ✅ | #10–#12 |
| 5.10 | **招牌神兽化 + 城市/实验室场景** | 9 场景招牌换神兽/Mega 形态（时拉比/起源盖欧卡/Mega巨金怪/Mega喷火龙Y/蕾冠王骑白马/闪电鸟/Mega裂空座）；新增城市(梦幻)/实验室(超梦)场景 × 全产物线 | ✅ | 本 PR |
| 5.7 | CSS 皮肤包（轨道 B） | `Pokemon/skins/`：pokemon-skin.css + renderer-inject.js + apply.mjs 注入器 | ✅ | #15 |
| 5.8 | **皮肤工作室 App** | `Codex-Skin-Store/`：Tauri 托盘 App + vendor Dream Skin 引擎 + 9 套 preset 生成器 | ✅ | #16 |
| 5.9 | **皮肤商店化 + macOS 适配** | 商店式 UI（皮肤卡片网格 + 详情大预览 + 打字机终端演示 + ANSI 色板 + 出没宝可梦）；macOS 实测修复 5 个缺陷 | ✅ | 本 PR |
| 5 | 终端模拟器配色导出 | `themes/terminal/` 9 场景 × 4 格式（Windows Terminal JSON / iTerm2 .itermcolors / Alacritty TOML / kitty conf）+ 生成脚本 + 安装页 ③④⑤ 片段 | ✅ | 本 PR |
| 6 | lint 债务清理 | 12 error 归零（8 个非组件导出拆文件 + 4 个 hooks 规则）；CI 恢复 lint 硬失败 | ✅ | #20 |
| 7 | 视觉与交互动效打磨 | 切换动效、响应式、CRT 细节 | 待办 | — |

> 任务 5（#19）、任务 6（#20）已于 2026-07-18 完成；剩余任务 7 为打磨项。

任务详情与执行顺序见 [roadmap.md](roadmap.md)。

## 测试进度

### 自动化/离线校验（全通过）

| 校验 | 对象 | 结果 |
|---|---|---|
| `plutil -lint` | 9 个 .tmTheme plist | ✅（PR #7 起，本 PR 扩到 9） |
| `plutil -lint` | 9 个 .itermcolors plist | ✅（本 PR） |
| JSON 解析校验 | 9 个 Windows Terminal scheme（生成脚本内置） | ✅（本 PR） |
| 字符串解码对拍 | 9 个 .codex-theme.txt ↔ 同名 .json | ✅ decode 一致 |
| 官方 injector `--check-payload` | 9 套 Dream Skin preset | ✅ 全部 pass（payload 62–110 KB） |
| 引擎 `--self-test` | vendor injector CDP 校验逻辑 | ✅ |
| `npm run build` | 展示网站 + studio 前端 | ✅ |
| `cargo build` | studio Rust 后端 | ✅ |
| CI（lint + build per `<Theme>/app/`） | 全部 PR | ✅ |

### 实机测试

| 场景 | 环境 | 结果 |
|---|---|---|
| codex-theme-v1 官方导入 | 桌面 App | ⚠️ 用户反馈效果不佳（官方机制只改颜色/字体，无壁纸）——已由 Dream Skin 路线替代为主线 |
| CSS 皮肤包（轨道 B，apply.mjs） | Windows + Codex 桌面 App | ⚠️ 未实机验证（机制与 Dream Skin 相同，已被 studio App 取代为主交付） |
| **皮肤工作室全流程** | **Windows 11 + Codex 26.715.4045.0 + Node 22.23.1** | ✅ 2026-07-18 实测：安装引擎 → 草原应用（像素壁纸+绿色 UI，官方 `--verify` pass）→ 热切换 草原→岩浆→草原（秒级）→ 恢复官方（state 清理、CDP 关闭） |
| 皮肤工作室 macOS 路径 | macOS 14 (Apple Silicon) + Codex 26.715.31925 + ChatGPT 内置 Node 24.14.0 | ✅ 2026-07-18 实测：引擎安装成功（修复 3 个真实缺陷后，见下）；皮肤商店 UI 预览迭代完成；切换链路 macOS 适配已按实测结论固化进 Rust |
| `tauri build` 安装包 | NSIS/DMG | ❌ 未验证 |
| App 内命令联调（非手动复现） | Windows | ⚠️ 实测用的是 App 同款逻辑的手动执行；App 进程内 invoke 未逐一联调 |

### macOS 实测发现并修复的缺陷（2026-07-18）

1. **vendor 缺 presets/**：macOS install 脚本 seed 默认主题 `preset-gothic-void-crusade`，vendor 时漏拷上游 `macos/presets/` → 安装直接失败。已补 vendor（2 套官方 preset，1.4MB）。
2. **活跃主题目录写错**：macOS 引擎 1.2.0 的 watch injector 监听的是 `<状态根>/theme/`（官方 `switch-theme-macos.sh` 的目标），不是文档里写的 `active-theme/`。Rust `active_theme_dir()` 已按平台分支。
3. **theme.json `focusX: null` 被 injector 拒绝**：`unit()` 校验只接受 0–1 数字或缺省，`null` 直接抛错。生成脚本改为省略字段（引擎显著性分析自动定焦点）。
4. **install 默认副作用**：官方脚本默认在桌面写 4 个 `.command` 启动器并立即启动 Codex——App 安装现传 `--no-launchers --no-launch`。
5. **Codex 主进程检测**：安装前 UI 需要知道 Codex 是否在跑；新增 `codex_main_running()`（与官方 `codex_is_running()` 逐一对齐，只匹配主可执行文件，Electron 子进程不算），运行中禁止点「安装引擎」。

### 实测注意事项（已固化进 studio App 代码）

- start 脚本结尾的 verify 会等 Codex shell 渲染，前台调用可能挂起数分钟 → App 全部 `spawn_blocking` 异步执行
- restore 会重开一个无 CDP 端口的 Codex → App 的 start 始终带 `-RestartExisting`
- Windows 引擎要求 Node ≥ 22（官方安装脚本硬校验）
