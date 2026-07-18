/* ============================================================
   安装配置页 · 可复制配置片段生成器
   由 @/themes/scenes（唯一样式真源）派生，输出：
   ① tmTheme 安装命令（.tmTheme -> ~/.codex/themes/）
   ② config.toml 片段（tui.theme）
   ③ codex-theme-*.json（终端模拟器 ANSI 调色板）
   ④ theme-*.css（网页实现用变量）
   ============================================================ */
import { SCENES, SCENE_THEME_SLUG } from '@/themes/scenes';
import type { SceneDef, SceneId } from '@/themes/scenes';

export interface SceneSnippets {
  install: string; // 安装 .tmTheme 的 bash 命令
  toml: string;    // ~/.codex/config.toml 片段
  json: string;    // codex-theme-*.json（Windows Terminal / iTerm 通用）
  css: string;     // theme-*.css（网页实现用变量）
}

const ANSI_KEYS = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'] as const;
const BRIGHT_KEYS = ANSI_KEYS.map((k) => `bright${k[0].toUpperCase()}${k.slice(1)}`);

/** "GRASSLAND" → "Grassland"；"POWER PLANT" → "Power Plant" */
function titleCase(en: string): string {
  return en.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

/* ---------------- ① .tmTheme 安装命令 ---------------- */
function buildInstall(s: SceneDef): string {
  const slug = SCENE_THEME_SLUG[s.id];
  const file = `pokemon-${slug}.tmTheme`;
  return [
    `# 收服 ${s.name} ${s.en} 主题（${file}）`,
    'mkdir -p ~/.codex/themes',
    '',
    '# 已 clone 本仓库：',
    `cp Pokemon/themes/${file} ~/.codex/themes/`,
    '',
    '# 或直接从 GitHub 下载：',
    `curl -fsSL -o ~/.codex/themes/${file} \\`,
    `  https://raw.githubusercontent.com/IgniteCollections/Codex-Themes/main/Pokemon/themes/${file}`,
    '',
    '# 然后启动 codex，输入 /theme 选择本主题',
  ].join('\n');
}

/* ---------------- ② config.toml ---------------- */
function buildToml(s: SceneDef): string {
  const slug = SCENE_THEME_SLUG[s.id];
  return [
    `# ~/.codex/config.toml — CODEX · ${s.name} ${s.en}`,
    `# 官方主题机制：语法高亮主题（代码块 / diff），对应 ~/.codex/themes/pokemon-${slug}.tmTheme`,
    `tui.theme = "pokemon-${slug}"`,
    '',
    '# 可选体验配置（docs/pokemon/codex-official-theming.md）',
    'tui.animations = true',
    `tui.terminal_title = ["spinner", "project"]`,
    '',
    '# 按 profile 覆盖示例：',
    `# [profiles.work.tui]`,
    `# theme = "pokemon-${slug}"`,
  ].join('\n');
}

/* ---------------- ③ codex-theme-*.json ---------------- */
function buildJson(s: SceneDef): string {
  const ui = s.ui;
  const colors: Array<[string, string]> = [
    ...ANSI_KEYS.map((k, i) => [k, s.ansi[i]] as [string, string]),
    ...BRIGHT_KEYS.map((k, i) => [k, s.ansi[i + 8]] as [string, string]),
  ];
  const lines: string[] = [
    '{',
    `  "name": "CODEX · ${s.name} ${titleCase(s.en)}",`,
    `  "background": "${ui.bg}",`,
    `  "foreground": "${ui.fg}",`,
    `  "selectionBackground": "${ui.selection}",`,
    `  "cursorColor": "${ui.prompt}",`,
  ];
  for (let g = 0; g < 4; g++) {
    const parts = colors.slice(g * 4, g * 4 + 4).map(([k, v]) => `"${k}": "${v}"`);
    lines.push(`  ${parts.join(', ')}${g < 3 ? ',' : ''}`);
  }
  lines.push('}');
  return lines.join('\n');
}

/* ---------------- ③ theme-*.css ---------------- */
function buildCss(s: SceneDef): string {
  const ui = s.ui;
  const lines: string[] = [
    `:root[data-scene="${s.id}"] {`,
    `  --sc-bg: ${ui.bg}; --sc-panel: ${ui.panel}; --sc-inset: ${ui.inset};`,
    `  --sc-fg: ${ui.fg}; --sc-fg-dim: ${ui['fg-dim']}; --sc-output: ${ui.output};`,
    `  --sc-prompt: ${ui.prompt}; --sc-accent: ${ui.accent}; --sc-accent-2: ${ui['accent-2']};`,
    `  --sc-success: ${ui.success}; --sc-warning: ${ui.warning}; --sc-error: ${ui.error};`,
    `  --sc-border: ${ui.border}; --sc-selection: ${ui.selection};`,
    `  --sc-diff-add-bg: ${ui['diff-add-bg']}; --sc-diff-add-fg: ${ui['diff-add-fg']};`,
    `  --sc-diff-del-bg: ${ui['diff-del-bg']}; --sc-diff-del-fg: ${ui['diff-del-fg']};`,
    `  --sc-status-bg: ${ui['status-bg']}; --sc-status-fg: ${ui['status-fg']};`,
  ];
  /* 发电厂独有：黄黑警示条纹变量（design.md §7.6） */
  if (s.id === 'plant') {
    lines.push(
      `  --sc-warning-stripe: repeating-linear-gradient(45deg, ${ui.prompt} 0 12px, ${ui.bg} 12px 24px);`,
    );
  }
  for (let g = 0; g < 4; g++) {
    const parts: string[] = [];
    for (let i = g * 4; i < g * 4 + 4; i++) parts.push(`--ansi-${i}:${s.ansi[i]};`);
    lines.push(`  ${parts.join(' ')}`);
  }
  lines.push('}');
  return lines.join('\n');
}

/** 7 场景配置片段（模块加载时计算一次） */
export const SNIPPETS: Record<SceneId, SceneSnippets> = Object.fromEntries(
  SCENES.map((s) => [s.id, {
    install: buildInstall(s),
    toml: buildToml(s),
    json: buildJson(s),
    css: buildCss(s),
  }]),
) as Record<SceneId, SceneSnippets>;
