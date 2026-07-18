# Codex 桌面 App 主题开发标准

如何为 **Codex 桌面 App**（ChatGPT/Codex 桌面客户端）开发自定义主题。这是本项目的主线交付目标；CLI/TUI 的 .tmTheme 主题开发见 [theme-development-guide.md](theme-development-guide.md)（已完成的附属产物）。

日期： 2026-07-18

## 1. 官方机制速览

| 项 | 值 |
|---|---|
| 主题格式 | `codex-theme-v1:` 前缀 + URL-encoded JSON |
| 导入路径 | **Settings → Appearance → Import**（选择匹配的 light/dark 变体槽位） |
| 设置入口 | App 菜单 → Settings（macOS `Cmd+,` / Windows `Ctrl+,`） |
| 可定制 | 基础主题、强调色、背景色、前景色、UI 字体、代码字体、diff 颜色 |
| 分享 | 导入/导出同一个字符串，可直接发给他人 |

官方文档对 Appearance 的描述只有"基础主题、强调/背景/前景色、UI/代码字体、可分享"——以下 JSON 格式为社区实测反推（见文末来源），字段已在多个真实主题上验证。

## 2. codex-theme-v1 格式规范

### 2.1 结构

```
codex-theme-v1:<URL-encoded JSON>
```

解码后的 JSON（字段全集，基于真实主题样本）：

```json
{
  "codeThemeId": "codex",
  "variant": "dark",
  "theme": {
    "accent": "#36d7f5",
    "surface": "#121321",
    "ink": "#f1f0f5",
    "contrast": 64,
    "opaqueWindows": true,
    "fonts": { "code": null, "ui": null },
    "semanticColors": {
      "diffAdded": "#61d095",
      "diffRemoved": "#f26b7a",
      "skill": "#8e86ff"
    }
  }
}
```

### 2.2 字段规范

| 字段 | 类型 | 说明 | 取值规则 |
|---|---|---|---|
| `codeThemeId` | string | 内置语法高亮主题 ID | 已知值：`codex`（默认）、`tokyo-night`。未发现官方完整清单，用 `codex` 最稳 |
| `variant` | `"light"` \| `"dark"` | 主题变体槽位 | 导入时选错槽位会覆盖错主题，字符串与槽位必须一致 |
| `theme.accent` | hex | 强调色（按钮、聚焦、高亮） | 场景主色；与 surface 对比度要高 |
| `theme.surface` | hex | 背景色 | 场景底色 |
| `theme.ink` | hex | 前景/文字色 | 与 surface 对比度 ≥ 7:1（长时间阅读） |
| `theme.contrast` | int | 界面层次对比强度 | 实测样本：26（柔和浅色）/ 52（中）/ 64（强深色）。深色主题建议 50–64 |
| `theme.opaqueWindows` | bool | 窗口不透明（false = 毛玻璃透光） | 像素/终端风建议 true |
| `theme.fonts.code` / `fonts.ui` | string \| null | 字体名覆盖 | null = 默认；像素风可设等宽字体 |
| `theme.semanticColors.diffAdded` | hex | diff 新增行 | 语义绿（场景色相替换） |
| `theme.semanticColors.diffRemoved` | hex | diff 删除行 | 语义红（场景色相替换） |
| `theme.semanticColors.skill` | hex | skill 状态色 | 场景点缀色 |

### 2.3 生成方法

```python
import json, urllib.parse

payload = { ... }  # 上述结构
encoded = urllib.parse.quote(json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
theme_string = f"codex-theme-v1:{encoded}"
```

### 2.4 验证清单

- [ ] 字符串以 `codex-theme-v1:` 开头，后面是合法 URL-encoded JSON
- [ ] `variant` 与导入时选择的槽位（light/dark）一致
- [ ] 导入后：背景/文字/强调色符合设计；diff 增删行可清晰区分
- [ ] `ink` on `surface` 对比度 ≥ 7:1，`accent` on `surface` 对比度 ≥ 4.5:1
- [ ] 长会话阅读 30 分钟无明显疲劳（尤其高饱和 accent）

## 3. 本项目产物约定

| 产物 | 路径 | 说明 |
|---|---|---|
| 导入字符串 | `<Theme>/themes/desktop/<name>.codex-theme.txt` | 单行 paste-ready 字符串 |
| 原始 payload | `<Theme>/themes/desktop/<name>.json` | 解码后的 JSON（可读、可 diff） |
| 生成脚本 | `<Theme>/scripts/generate-desktop-themes.py` | 从 scenes 数据源派生，配色改动后重跑 |
| 安装指引 | 展示站安装页「桌面客户端」段 | 每个场景一段可复制字符串 + 导入步骤 |

## 4. 开发流程

```
1. 设计定稿   → 场景设计文档（阵容/色板/语义色映射）
2. 数据建模   → <Theme>/app/src/themes/scenes.ts（单一数据源，已有）
3. 生成产物   → scripts/generate-desktop-themes.py 输出 .json + .codex-theme.txt
4. 本机验证   → 桌面 App Settings → Appearance → Import 实测，对照 §2.4 清单
5. 网站对接   → 安装页加「桌面客户端」配置段（字符串 + 复制按钮 + 导入说明）
6. PR        → 任务分支 → pre-release（CI Gate）；发布 = pre-release → main
```

## 5. 与 TUI 主题的关系

| | 桌面 App（主线） | CLI/TUI（附属） |
|---|---|---|
| 格式 | `codex-theme-v1:` 字符串 | `.tmTheme` 文件 |
| 范围 | 整体 UI（背景/强调/字体/diff） | 仅语法高亮 |
| 安装 | Settings → Appearance → Import | `~/.codex/themes/` + `/theme` |
| 数据源 | 同一 scenes.ts 派生 | 同一 scenes.ts 派生 |

两套产物**从同一个 scenes.ts 派生**，保证任何场景在桌面 App、TUI、展示站三个环境里视觉一致。

## 来源

- 官方设置文档：[codex-docs.com/docs/reference/settings](https://www.codex-docs.com/docs/reference/settings)
- 格式实测（Andrew Ginns，含 GPT/Codex CLI/ChatGPT 三个真实样本）：[LinkedIn post](https://www.linkedin.com/posts/andrewginns_im-a-huge-fan-of-the-codex-app-and-now-you-activity-7438349015538135040-0sfW)
- 社区主题仓格式参考：[alexh/umi-codex-theme](https://github.com/alexh/umi-codex-theme)（.json payload + .codex-theme.txt 双产物模式，本项目沿用）
