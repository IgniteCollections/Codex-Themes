/* ============================================================
   安装配置页 · 可复制配置片段生成器
   由 @/themes/scenes（唯一样式真源）派生，输出与 install.md
   逐字一致的三种格式：config.toml / ANSI JSON / CSS 变量。
   ============================================================ */
import { SCENES } from '@/themes/scenes';
import type { SceneDef, SceneId } from '@/themes/scenes';

export interface SceneSnippets {
  toml: string;   // ~/.codex/config.toml
  json: string;   // codex-theme-*.json（Windows Terminal / iTerm 通用）
  css: string;    // theme-*.css（网页实现用变量）
}

const ANSI_KEYS = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'] as const;
const BRIGHT_KEYS = ANSI_KEYS.map((k) => `bright${k[0].toUpperCase()}${k.slice(1)}`);

/** "GRASSLAND" → "Grassland"；"POWER PLANT" → "Power Plant" */
function titleCase(en: string): string {
  return en.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

/* ---------------- ① config.toml ---------------- */
function buildToml(s: SceneDef): string {
  const ui = s.ui;
  const uiRows: Array<[string, string]> = [
    ['background', ui.bg], ['foreground', ui.fg], ['dim', ui['fg-dim']],
    ['prompt', ui.prompt], ['output', ui.output], ['success', ui.success],
    ['warning', ui.warning], ['error', ui.error], ['accent', ui.accent],
    ['border', ui.border], ['status_bg', ui['status-bg']], ['status_fg', ui['status-fg']],
  ];
  const lines: string[] = [
    `# ~/.codex/config.toml — CODEX · ${s.name} ${s.en}`,
    '[theme]',
    `name = "${s.id}"`,
    `prompt_symbol = "${s.symbol}"`,
    `flavor = "${s.encounter}"`,
    '',
    '[theme.ui]',
    ...uiRows.map(([k, v]) => `${k.padEnd(12)}= "${v}"`),
    '',
    '[theme.ansi]',
    ...ANSI_KEYS.map((k, i) => `${k.padEnd(8)}= "${s.ansi[i]}"`),
    '',
    '[theme.ansi.bright]',
    ...ANSI_KEYS.map((k, i) => `${k.padEnd(8)}= "${s.ansi[i + 8]}"`),
  ];
  return lines.join('\n');
}

/* ---------------- ② codex-theme-*.json ---------------- */
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

/** 6 场景配置片段（模块加载时计算一次） */
export const SNIPPETS: Record<SceneId, SceneSnippets> = Object.fromEntries(
  SCENES.map((s) => [s.id, { toml: buildToml(s), json: buildJson(s), css: buildCss(s) }]),
) as Record<SceneId, SceneSnippets>;
