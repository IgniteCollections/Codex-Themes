/* 宝可梦皮肤 · 页面注入脚本（由 apply.sh 通过 CDP 执行，占位符见 apply.mjs）
   幂等：重复注入先清理旧实例。 */
(() => {
  const SCENE = __PK_SCENE__;
  const UI = __PK_UI__;
  const ART = __PK_ART__;
  const BADGE = __PK_BADGE__;

  /* 清理旧实例 */
  document.documentElement.classList.remove('pokemon-skin');
  document.getElementById('pokemon-skin-style')?.remove();
  document.getElementById('pokemon-skin-badge')?.remove();
  const root = document.documentElement;
  ['--pk-bg', '--pk-panel', '--pk-ink', '--pk-accent', '--pk-success', '--pk-error', '--pk-line', '--pk-art']
    .forEach((v) => root.style.removeProperty(v));

  /* 校验 Codex shell 锚点（Dream Skin 同款标记） */
  const anchored = document.querySelector('main.main-surface') || document.querySelector('aside.app-shell-left-panel');
  if (!anchored) {
    console.warn('[pokemon-skin] Codex shell markers not found; injecting anyway (selectors may not match).');
  }

  /* 注入 CSS */
  const style = document.createElement('style');
  style.id = 'pokemon-skin-style';
  style.textContent = __PK_CSS__;
  document.head.appendChild(style);

  /* 场景变量 */
  root.classList.add('pokemon-skin');
  root.dataset.pokemonSkin = SCENE;
  root.style.setProperty('--pk-bg', UI.bg);
  root.style.setProperty('--pk-panel', UI.panel);
  root.style.setProperty('--pk-ink', UI.fg);
  root.style.setProperty('--pk-accent', UI.prompt);
  root.style.setProperty('--pk-success', UI['diff-add-fg']);
  root.style.setProperty('--pk-error', UI['diff-del-fg']);
  const hex = UI.border.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  root.style.setProperty('--pk-line', `rgba(${r}, ${g}, ${b}, .45)`);
  root.style.setProperty('--pk-art', `url("${ART}")`);

  /* 场景角标（招牌 sprite + 场景名） */
  const badge = document.createElement('div');
  badge.id = 'pokemon-skin-badge';
  badge.innerHTML = `<img alt="" src="${BADGE.img}"><span>${BADGE.label}</span>`;
  document.body.appendChild(badge);

  console.info(`[pokemon-skin] applied: ${SCENE}`);
  return `pokemon-skin:${SCENE}`;
})();
