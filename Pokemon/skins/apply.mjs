#!/usr/bin/env node
/* 宝可梦皮肤注入器（CDP · loopback only）
 *
 * 用法：
 *   node skins/apply.mjs <scene> [--port 9222]
 *   scene: grassland | ocean | cave | magma | snowfield | plant | space | remove
 *
 * 前置：Codex/ChatGPT 桌面 App 以调试模式运行：
 *   /Applications/ChatGPT.app/Contents/MacOS/ChatGPT --remote-debugging-port=9222
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKINS_TS = path.join(ROOT, 'app/src/themes/skins.ts');
const CSS_PATH = path.join(ROOT, 'skins/pokemon-skin.css');
const RENDERER_PATH = path.join(ROOT, 'skins/renderer-inject.js');

const args = process.argv.slice(2);
const scene = args[0];
const portFlag = args.indexOf('--port');
const PORT = portFlag > -1 ? Number(args[portFlag + 1]) : 9222;

const VALID = ['grassland', 'ocean', 'cave', 'magma', 'snowfield', 'plant', 'space', 'remove'];
if (!VALID.includes(scene)) {
  console.error(`usage: apply.mjs <${VALID.join('|')}> [--port 9222]`);
  process.exit(1);
}

/* ---------- 解析 skins.ts（导出对象文本求值，避免依赖 TS 编译） ---------- */
async function loadSkins() {
  const ts = await readFile(SKINS_TS, 'utf8');
  const body = ts.slice(ts.indexOf('export const SKINS'));
  const objText = body.slice(body.indexOf('{'), body.lastIndexOf('};') + 1);
  // eslint-disable-next-line no-eval
  return eval(`(${objText})`);
}

/* ---------- CDP ---------- */
async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  if (!res.ok) throw new Error(`CDP http ${res.status} — is Codex running with --remote-debugging-port=${PORT}?`);
  return res.json();
}

function pickPage(targets) {
  return (
    targets.find((t) => t.type === 'page' && t.url.startsWith('app://')) ||
    targets.find((t) => t.type === 'page' && /chatgpt|codex/i.test(t.url + t.title))
  );
}

async function evaluate(wsUrl, expression) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('websocket connect failed'));
  });
  let id = 0;
  const send = (method, params) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      const onMsg = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', onMsg);
          msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  ws.close();
  if (result?.exceptionDetails) {
    const desc = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
    throw new Error(`page exception: ${desc}`);
  }
  return result?.result?.value;
}

/* ---------- payload ---------- */
function buildApplyPayload(css, renderer, sceneDef, sceneName) {
  const badge = {
    img: sceneDef.badgeImg,
    label: sceneDef.badgeLabel,
  };
  // 大字段按占位符唯一性从长到短替换（CSS 注释里不再引用占位符，避免注释行先于代码行被匹配）
  const pairs = [
    ['__PK_BADGE__', JSON.stringify(badge)],
    ['__PK_SCENE__', JSON.stringify(sceneName)],
    ['__PK_UI__', JSON.stringify(sceneDef.ui)],
    ['__PK_ART__', JSON.stringify(sceneDef.art)],
    ['__PK_CSS__', JSON.stringify(css)],
  ];
  return pairs.reduce(
    (text, [token, value]) => text.split(token).join(value),
    renderer,
  );
}

const REMOVE_EXPR = `(() => {
  document.documentElement.classList.remove('pokemon-skin');
  delete document.documentElement.dataset.pokemonSkin;
  document.getElementById('pokemon-skin-style')?.remove();
  document.getElementById('pokemon-skin-badge')?.remove();
  ['--pk-bg','--pk-panel','--pk-ink','--pk-accent','--pk-success','--pk-error','--pk-line','--pk-art']
    .forEach(v => document.documentElement.style.removeProperty(v));
  return 'pokemon-skin:removed';
})()`;

/* ---------- main ---------- */
const targets = await listTargets();
const page = pickPage(targets);
if (!page) {
  console.error('No Codex app page found over CDP. Start the app with --remote-debugging-port first.');
  process.exit(1);
}
console.log(`target: ${page.title || page.url}`);

if (scene === 'remove') {
  console.log(await evaluate(page.webSocketDebuggerUrl, REMOVE_EXPR));
  process.exit(0);
}

const skins = await loadSkins();
const def = skins[scene];
if (!def) {
  console.error(`scene ${scene} not in skins.ts — run: python3 Pokemon/scripts/generate-skins.py`);
  process.exit(1);
}

const [css, renderer] = await Promise.all([
  readFile(CSS_PATH, 'utf8'),
  readFile(RENDERER_PATH, 'utf8'),
]);

const SCENE_LABEL = {
  grassland: '❀ 草原', ocean: '≈ 海洋', cave: '◆ 洞穴',
  magma: '▲ 岩浆', snowfield: '❄ 雪原', plant: '⚡ 无人发电厂', space: '☄ 宇宙',
}[scene];

const payload = buildApplyPayload(css, renderer, {
  ui: def.ui,
  art: def.art,
  badgeImg: def.badgeImg,
  badgeLabel: SCENE_LABEL,
}, scene);

const out = await evaluate(page.webSocketDebuggerUrl, payload);
console.log(out ?? 'applied (no return value)');
console.log('提示：配合同名 codex-theme-v1 导入字符串效果更佳（安装页可一键复制）。');
