/* ============================================================
   CODEX · 宝可梦皮肤计划 — 场景皮肤系统（唯一样式真源）
   数据逐字来自 design.md §7 与 home.md 演示脚本。
   ============================================================ */

export type SceneId = 'grassland' | 'ocean' | 'cave' | 'magma' | 'snowfield' | 'plant';

/** 横幅着色角色 -> CSS 变量（见 TerminalWindow.bannerColor） */
export type BannerRole = 'prompt' | 'dim' | 'accent' | 'error' | 'output' | 'del';
export interface BannerSeg { t: string; r: BannerRole }
/** 'stripe' = 发电厂警示条纹分隔带（渲染为色块而非字符） */
export type BannerLine = BannerSeg[] | 'stripe';

export type ScriptLineKind = 'user' | 'think' | 'plan' | 'meta' | 'ctx' | 'add' | 'del' | 'success';
export interface ScriptLine { kind: ScriptLineKind; text: string }

export interface Pokemon { name: string; types: string[] }

export interface SceneDef {
  id: SceneId;
  no: string;          // No.001
  name: string;        // 草原
  en: string;          // GRASSLAND
  route: string;       // 1号道路 · GRASSLAND ROUTE
  symbol: string;      // ❀
  icon: string;        // /icon-grass.svg
  image: string;       // /scene-grassland.png
  encounter: string;   // 遭遇提示（toast 用）
  flavor: string;      // 完整 flavor 文案
  flavorShort: string; // 漫游卡一句
  keywords: string[];
  desc: string;        // 设计说明（图鉴口吻）
  pokemon: Pokemon[];
  ansi: string[];      // 16 色：0-7 normal, 8-15 bright
  ui: Record<string, string>; // --sc-* 值（供色板/内联样式使用）
  banner: BannerLine[];
  script: ScriptLine[];
}

/** 把一行按场景符号切分为 dim/prompt 段 */
function sym(symbol: string, line: string, base: BannerRole = 'dim'): BannerSeg[] {
  const out: BannerSeg[] = [];
  let buf = '';
  for (const ch of line) {
    if (ch === symbol) {
      if (buf) { out.push({ t: buf, r: base }); buf = ''; }
      out.push({ t: ch, r: 'prompt' });
    } else buf += ch;
  }
  if (buf) out.push({ t: buf, r: base });
  return out;
}
const L = (t: string, r: BannerRole = 'dim'): BannerSeg[] => [{ t, r }];
const mix = (...segs: BannerSeg[]): BannerSeg[] => segs;

/* ---------------- No.001 草原 ---------------- */
const grassland: SceneDef = {
  id: 'grassland',
  no: 'No.001', name: '草原', en: 'GRASSLAND', route: '1号道路 · GRASSLAND ROUTE',
  symbol: '❀', icon: '/icon-grass.svg', image: '/scene-grassland.png',
  encounter: '野生的 妙蛙种子 出现了！',
  flavor: '野生的 妙蛙种子 出现了！微风带来了青草的香气。',
  flavorShort: '微风带来了青草的香气。',
  keywords: ['#新绿', '#晨光', '#微风', '#1号道路'],
  desc: '1 号道路的清晨。嫩绿与阳光黄为主调，终端像一块被树荫覆盖的草地——柔和、护眼、适合白天长时间编码。强调色取妙蛙种子鳞茎的嫩绿，警告色用向阳花的明黄。',
  pokemon: [
    { name: '妙蛙种子', types: ['草', '毒'] }, { name: '走路草', types: ['草', '毒'] },
    { name: '绿毛虫', types: ['虫'] }, { name: '波波', types: ['一般', '飞行'] },
  ],
  ansi: ['#1E3A13', '#D95360', '#7AC74C', '#F7D02C', '#5FA8D3', '#C77DBB', '#57C7B0', '#F5FBEA',
         '#3D5A2E', '#F2788A', '#A3E176', '#FFE169', '#8CC8E8', '#E2A3D8', '#87E0CD', '#FFFFFF'],
  ui: {
    bg: '#0D1B0A', panel: '#12220D', inset: '#0A1507', fg: '#F5FBEA', 'fg-dim': '#9DBF8A',
    prompt: '#7AC74C', output: '#D9E8C8', success: '#A3E176', warning: '#F7D02C', error: '#F2788A',
    accent: '#F7D02C', 'accent-2': '#57C7B0', border: '#2E4A22', selection: '#31511F',
    'diff-add-bg': 'rgba(122,199,76,.15)', 'diff-add-fg': '#A3E176',
    'diff-del-bg': 'rgba(217,83,96,.15)', 'diff-del-fg': '#F2788A',
    'status-bg': '#4A7C2F', 'status-fg': '#F5FBEA',
  },
  banner: [
    sym('❀', '   ❀    ,     ❀    ,     ❀    ,     ❀'),
    L(' ,   ,\\|/,  ,   ,\\|/,  ,   ,\\|/,  ,'),
    sym('❀', '  ,   |/      ❀   |/      ,  |/'),
    L(' ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░'),
    L('        ▄▄▄▄▄'),
    L('      ▄█▀   ▀█▄'),
    L('      █ ▄   ▄ █'),
    mix({ t: '      █ ▐▌ ▐▌ █     ', r: 'dim' }, { t: '野生的 妙蛙种子 出现了！', r: 'prompt' }),
    mix({ t: '      █▄ ▀▀ ▄█     ', r: 'dim' }, { t: '微风带来了青草的香气。', r: 'prompt' }),
    L('       ▀█▄▄▄█▀'),
    L('     ▄▄█▓▓▓▓▓█▄▄'),
    L('     ▀▀▀▀▀▀▀▀▀▀▀'),
    L(' ─── 1号道路 · GRASSLAND ROUTE ───'),
  ],
  script: [
    { kind: 'user', text: '帮我把首页标题换成像素字体' },
    { kind: 'think', text: '✦ 已读取 3 个文件 · 拟定修改计划…' },
    { kind: 'plan', text: '  修改 src/components/Hero.tsx（1 处）' },
    { kind: 'meta', text: '--- a/src/components/Hero.tsx' },
    { kind: 'meta', text: '+++ b/src/components/Hero.tsx' },
    { kind: 'meta', text: '@@ -12,7 +12,7 @@' },
    { kind: 'del', text: '-  <h1 className="text-4xl font-sans">' },
    { kind: 'add', text: '+  <h1 className="font-pixel text-5xl tracking-wider">' },
    { kind: 'success', text: '✔ 完成 · 1 处修改 · 耗时 4.2s · 妙蛙种子觉得很赞' },
  ],
};

/* ---------------- No.002 海洋 ---------------- */
const ocean: SceneDef = {
  id: 'ocean',
  no: 'No.002', name: '海洋', en: 'OCEAN', route: '19号水路 · OCEAN ROUTE',
  symbol: '≈', icon: '/icon-ocean.svg', image: '/scene-ocean.png',
  encounter: '野生的 鲤鱼王 跳出了水面！',
  flavor: '野生的 鲤鱼王 跳出了水面！溅起了巨大的水花。',
  flavorShort: '溅起了巨大的水花。',
  keywords: ['#深海', '#浪花', '#潮汐', '#蓝色寂静'],
  desc: '深海蓝铺底，浪青作强调，珊瑚橙仅出现在错误与次强调上——像海面落日的一瞬。整体冷静、专注，适合深夜长会话，暴鲤龙的怒红被刻意压暗以保持海面的安静。',
  pokemon: [
    { name: '暴鲤龙', types: ['水', '飞行'] }, { name: '拉普拉斯', types: ['水', '冰'] },
    { name: '玛瑙水母', types: ['水', '毒'] }, { name: '鲤鱼王', types: ['水'] },
  ],
  ansi: ['#062032', '#F2614C', '#3FA97C', '#F2C94C', '#2E9BD6', '#A06CD5', '#5FD4D0', '#EAF7FD',
         '#1A4258', '#FF8A75', '#67D3A2', '#FFE08A', '#5FBDF0', '#C49BEB', '#8FE8E4', '#FFFFFF'],
  ui: {
    bg: '#05141F', panel: '#0A2233', inset: '#030E17', fg: '#EAF7FD', 'fg-dim': '#8FB8CC',
    prompt: '#5FD4D0', output: '#C4E4F2', success: '#67D3A2', warning: '#F2C94C', error: '#FF8A75',
    accent: '#5FBDF0', 'accent-2': '#FF7F50', border: '#14384F', selection: '#12344A',
    'diff-add-bg': 'rgba(63,169,124,.16)', 'diff-add-fg': '#67D3A2',
    'diff-del-bg': 'rgba(242,97,76,.16)', 'diff-del-fg': '#FF8A75',
    'status-bg': '#0C3B5D', 'status-fg': '#EAF7FD',
  },
  banner: [
    L('  ≈ ～ ≈ ～ ≈ ～ ≈ ～ ≈ ～ ≈ ～ ≈', 'accent'),
    L('         ▄▄▀▀▀▄▄', 'prompt'),
    L('       ▄█ ▄   ▄ █▄', 'prompt'),
    L('      █  ▐▌   ▐▌  █', 'prompt'),
    mix({ t: '      █ ▄▄ ﹀﹀ ▄▄ █   ', r: 'prompt' }, { t: '野生的 鲤鱼王 跳出了水面！', r: 'prompt' }),
    mix({ t: '   ～  ', r: 'accent' }, { t: '▀█▄▄▄▄▄▄▄█▀', r: 'prompt' }, { t: ' ～  ', r: 'accent' }, { t: '溅起了巨大的水花。', r: 'prompt' }),
    mix({ t: '  ≈ ～ ≈ ', r: 'accent' }, { t: '▀▀▀▀▀▀', r: 'prompt' }, { t: ' ≈ ～ ≈', r: 'accent' }),
    L(' ～≈～≈～≈～≈～≈～≈～≈～≈～≈～≈～≈', 'accent'),
    L(' ─── 19号水路 · OCEAN ROUTE ───'),
  ],
  script: [
    { kind: 'user', text: '给 fetch 加上指数退避重试' },
    { kind: 'think', text: '✦ 分析 src/lib/api.ts …' },
    { kind: 'plan', text: '  修改 src/lib/api.ts（1 处）' },
    { kind: 'add', text: '+async function retry(fn, n = 3) {' },
    { kind: 'add', text: '+  try { return await fn() }' },
    { kind: 'add', text: '+  catch (e) { if (!n) throw e; await wait(2 ** (3 - n) * 500); return retry(fn, n - 1) }' },
    { kind: 'add', text: '+}' },
    { kind: 'success', text: '✔ 完成 · 新增 5 行 · 鲤鱼王翻起了水花' },
  ],
};

/* ---------------- No.003 洞穴 ---------------- */
const cave: SceneDef = {
  id: 'cave',
  no: 'No.003', name: '洞穴', en: 'CAVE', route: '月见山 B2F · MT.MOON CAVE',
  symbol: '◆', icon: '/icon-cave.svg', image: '/scene-cave.png',
  encounter: '野生的 超音蝠 从洞顶的黑暗中俯冲下来！',
  flavor: '野生的 超音蝠 从洞顶的黑暗中俯冲下来！',
  flavorShort: '洞顶传来翅膀的回声。',
  keywords: ['#月见山', '#矿晶', '#回声', '#头灯微光'],
  desc: '月见山深处。岩灰与暗紫构成洞壁，矿晶青是岩缝里发光的矿石，苔绿点缀像石缝里的微光。对比度刻意压低一档，营造「头灯照亮的一小圈」的洞穴感，矿晶青提示符是黑暗里的路标。',
  pokemon: [
    { name: '超音蝠', types: ['毒', '飞行'] }, { name: '小拳石', types: ['岩石', '地面'] },
    { name: '大岩蛇', types: ['岩石', '地面'] }, { name: '地鼠', types: ['地面'] },
  ],
  ansi: ['#26262E', '#C4564A', '#8A9A5B', '#D9B44A', '#4F7FA6', '#6B5B95', '#7BD3C8', '#D8D5C8',
         '#44444F', '#E07A6C', '#ADBE7C', '#F2D078', '#7AA8CC', '#8F7DBB', '#A3E6DC', '#F2F0E6'],
  ui: {
    bg: '#15151B', panel: '#1D1D25', inset: '#101016', fg: '#D8D5C8', 'fg-dim': '#8E8C93',
    prompt: '#7BD3C8', output: '#C4C1B4', success: '#ADBE7C', warning: '#D9B44A', error: '#E07A6C',
    accent: '#8F7DBB', 'accent-2': '#8A9A5B', border: '#34343F', selection: '#2C2C38',
    'diff-add-bg': 'rgba(138,154,91,.18)', 'diff-add-fg': '#ADBE7C',
    'diff-del-bg': 'rgba(196,86,74,.18)', 'diff-del-fg': '#E07A6C',
    'status-bg': '#3B3B42', 'status-fg': '#D8D5C8',
  },
  banner: [
    L(' █▀▀▀█▀▀▀▀▀▀█▀▀▀▀█▀▀▀▀▀▀█▀▀▀█▀▀▀▀█'),
    sym('◆', '  ▀▄  ▀▄ ◆   ▀▄   ▀▄ ◆   ▀▄  ▀▄'),
    L('        ▄▄▄▄', 'output'),
    L('      ▄█▀▀▀▀█▄', 'output'),
    L('      █ ▄  ▄ █', 'output'),
    mix({ t: '      █ ▐▌▐▌ █      ', r: 'output' }, { t: '野生的 地鼠 从土里探出了头！', r: 'prompt' }),
    mix({ t: '      █  ▀▀  █      ', r: 'output' }, { t: '洞顶传来超音蝠的回声……', r: 'prompt' }),
    L('     ▄█▄▄▄▄▄▄▄█▄', 'output'),
    L('  ▄▄█▓▓▓▓▓▓▓▓▓▓▓█▄▄', 'output'),
    L(' ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔'),
    L(' ─── 月见山 B2F · MT.MOON CAVE ───'),
  ],
  script: [
    { kind: 'user', text: '找出这个组件的内存泄漏' },
    { kind: 'think', text: '✦ 追踪 useEffect 依赖链 …' },
    { kind: 'plan', text: '  修改 src/hooks/useSocket.ts（1 处）' },
    { kind: 'meta', text: '@@ -8,6 +8,7 @@' },
    { kind: 'ctx', text: '  useEffect(() => {' },
    { kind: 'ctx', text: '    socket.on("tick", handler)' },
    { kind: 'add', text: '+    return () => socket.off("tick", handler)' },
    { kind: 'ctx', text: '  }, [])' },
    { kind: 'success', text: '✔ 已修复 · 泄漏源 1 处 · 地鼠帮你把洞填好了' },
  ],
};

/* ---------------- No.004 岩浆 ---------------- */
const magma: SceneDef = {
  id: 'magma',
  no: 'No.004', name: '岩浆', en: 'MAGMA', route: '红莲岛火山 · CINNABAR VOLCANO',
  symbol: '▲', icon: '/icon-magma.svg', image: '/scene-magma.png',
  encounter: '野生的 小火龙 出现了！',
  flavor: '野生的 小火龙 出现了！尾巴的火焰把四周照得通亮。',
  flavorShort: '火焰把四周照得通亮。',
  keywords: ['#红莲岛', '#熔岩流', '#余烬', '#火山口'],
  desc: '红莲岛火山口。熔岩红与炽橙是主光源，余烬黄负责警告与高亮，炭黑底让热色更烫。成功色不用常规绿，改用硫化黄绿，保持火山化学质感；蓝焰青只出现在次强调，像火焰最热的内芯。',
  pokemon: [
    { name: '小火龙', types: ['火'] }, { name: '鸭嘴火兽', types: ['火'] },
    { name: '熔岩虫', types: ['火', '岩石'] }, { name: '煤炭龟', types: ['火'] },
  ],
  ansi: ['#1C1512', '#D43D2A', '#8FA33F', '#FFD166', '#4FA3D1', '#A85D9E', '#5FB8B3', '#EFE3D6',
         '#3A2C25', '#FF6B4A', '#B5C85E', '#FFE08F', '#7FC4E8', '#C986BE', '#84D8D2', '#FFF8EE'],
  ui: {
    bg: '#120B08', panel: '#1E1410', inset: '#0C0705', fg: '#F2E6D8', 'fg-dim': '#A89585',
    prompt: '#F5A623', output: '#E3CFB8', success: '#B5C85E', warning: '#FFD166', error: '#FF6B4A',
    accent: '#FFD166', 'accent-2': '#84D8D2', border: '#3A241A', selection: '#3D2318',
    'diff-add-bg': 'rgba(143,163,63,.18)', 'diff-add-fg': '#B5C85E',
    'diff-del-bg': 'rgba(212,61,42,.22)', 'diff-del-fg': '#FF6B4A',
    'status-bg': '#B73422', 'status-fg': '#FFE9D6',
  },
  banner: [
    sym('▲', '    ▲     ▲   ▲     ▲     ▲   ▲'),
    L('        ▄▄▄▄'),
    mix({ t: '      ▄█▀  ▀█▄          ', r: 'dim' }, { t: '▄█▓▄', r: 'error' }),
    mix({ t: '      █ ▄  ▄ █         ', r: 'dim' }, { t: '█▓▓▓█', r: 'error' }),
    mix({ t: '      █ ▐▌▐▌ █   ▄▄▄▄▄', r: 'dim' }, { t: '█▓▓▓▓▓█▄', r: 'error' }),
    mix({ t: '      █▄ ▀▀ ▄█   ▀▀▀▀▀', r: 'dim' }, { t: '█▓▓▓█▀', r: 'error' }),
    mix({ t: '       ▀█▄▄▄█▀        ', r: 'dim' }, { t: '▐█▓█▌', r: 'error' }, { t: '   ', r: 'dim' }, { t: '野生的 小火龙 出现了！', r: 'prompt' }),
    mix({ t: '      ▄▄██████▄▄      ▀▀▀▀    ', r: 'dim' }, { t: '尾巴的火焰把四周照得通亮。', r: 'prompt' }),
    L(' ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓', 'del'),
    L(' ─── 红莲岛火山 · CINNABAR VOLCANO ───'),
  ],
  script: [
    { kind: 'user', text: '把这个查找优化到 O(n)' },
    { kind: 'think', text: '✦ 基准测试：当前 O(n²) · 100k 条 = 3.4s' },
    { kind: 'plan', text: '  修改 src/utils/search.ts（1 处）' },
    { kind: 'del', text: '-const hit = list.filter(x => ids.includes(x.id))' },
    { kind: 'add', text: '+const set = new Set(ids)' },
    { kind: 'add', text: '+const hit = list.filter(x => set.has(x.id))' },
    { kind: 'success', text: '✔ 完成 · 100k 条 = 41ms · 提速 82× · 小火龙火力全开' },
  ],
};

/* ---------------- No.005 雪原 ---------------- */
const snowfield: SceneDef = {
  id: 'snowfield',
  no: 'No.005', name: '雪原', en: 'SNOWFIELD', route: '217号道路 · SNOWFIELD ROUTE',
  symbol: '❄', icon: '/icon-snow.svg', image: '/scene-snowfield.png',
  encounter: '野生的 冰伊布 踏着风雪现身！',
  flavor: '野生的 冰伊布 踏着风雪现身！空气中飘起了细小的冰晶。',
  flavorShort: '空气中飘起了细小的冰晶。',
  keywords: ['#切锋市', '#极光', '#初雪', '#零下静谧'],
  desc: '切锋市以北的雪原。冰白前景浮在深夜蓝上，浅青与极光蓝像雪地上反射的天光，冰晶紫只做温柔的高光。全场景对比最高、最「干净」，长时间阅读最舒适——像雪后无风的清晨。',
  pokemon: [
    { name: '冰伊布', types: ['冰'] }, { name: '急冻鸟', types: ['冰', '飞行'] },
    { name: '海豹球', types: ['冰', '水'] }, { name: '雪童子', types: ['冰'] },
  ],
  ansi: ['#16324A', '#D95D72', '#5CC98E', '#F2CE6B', '#6BA8D8', '#B8B8E0', '#7FC7DE', '#F2F9FC',
         '#2C4E6A', '#F28597', '#82E0AC', '#FFE08F', '#93C4E8', '#D4D4F2', '#A8D8EA', '#FFFFFF'],
  ui: {
    bg: '#0A1622', panel: '#102338', inset: '#071019', fg: '#F2F9FC', 'fg-dim': '#9DB8CC',
    prompt: '#A8D8EA', output: '#D8EAF4', success: '#82E0AC', warning: '#F2CE6B', error: '#F28597',
    accent: '#93C4E8', 'accent-2': '#D4D4F2', border: '#1E3D5C', selection: '#1C3A57',
    'diff-add-bg': 'rgba(92,201,142,.15)', 'diff-add-fg': '#82E0AC',
    'diff-del-bg': 'rgba(217,93,114,.18)', 'diff-del-fg': '#F28597',
    'status-bg': '#16324A', 'status-fg': '#D9ECF8',
  },
  banner: [
    sym('❄', '   ❄    ❄   ❄    ❄    ❄   ❄    ❄'),
    L('         ▄▄▄▄'),
    sym('❄', '       ▄█▀▀▀▀█▄     ❄'),
    L('      █▀ ▄  ▄ ▀█'),
    mix({ t: '      █  ▐▌▐▌  █    ', r: 'dim' }, { t: '野生的 雪童子 在雪中滚了过来！', r: 'prompt' }),
    mix({ t: '      █▄  ▀▀  ▄█    ', r: 'dim' }, { t: '远处传来急冻鸟的鸣叫……', r: 'prompt' }),
    L('     ▄██▄▄▄▄▄▄██▄'),
    L('    ▀▀▀▀▀▀▀▀▀▀▀▀▀'),
    L(' ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔'),
    L(' ─── 217号道路 · SNOWFIELD ROUTE ───'),
  ],
  script: [
    { kind: 'user', text: '修复卡住的加载动画' },
    { kind: 'think', text: '✦ 定位到 animation-fill-mode 冲突 …' },
    { kind: 'plan', text: '  修改 src/styles/loader.css（1 处）' },
    { kind: 'del', text: '-.spinner { animation: spin 1s infinite; }' },
    { kind: 'add', text: '+.spinner { animation: spin 1s linear infinite; will-change: transform; }' },
    { kind: 'success', text: '✔ 完成 · 动画恢复流畅 · 冰伊布满意地抖落了雪' },
  ],
};

/* ---------------- No.006 无人发电厂 ---------------- */
const plant: SceneDef = {
  id: 'plant',
  no: 'No.006', name: '无人发电厂', en: 'POWER PLANT', route: '无人发电厂 · POWER PLANT',
  symbol: '⚡', icon: '/icon-plant.svg', image: '/scene-plant.png',
  encounter: '野生的 皮卡丘 出现了！',
  flavor: '野生的 皮卡丘 出现了！噼啪作响的电流划破了发电厂的寂静。',
  flavorShort: '电流划破了发电厂的寂静。',
  keywords: ['#无人发电厂', '#残余电流', '#警示条纹', '#十萬伏特'],
  desc: '废弃十年的无人发电厂。工业暗灰是生锈的机身，电光黄是残余电流，荧光绿只给「成功」——像黑暗中重新接通的一格电。锈橙标记废弃感，黄黑警示条纹是本场景独有的装饰纹样。',
  pokemon: [
    { name: '皮卡丘', types: ['电'] }, { name: '小磁怪', types: ['电', '钢'] },
    { name: '电击兽', types: ['电'] }, { name: '雷电球', types: ['电'] },
  ],
  ansi: ['#23272E', '#E5483F', '#9EFF00', '#F8D030', '#45B7E8', '#B06FD8', '#4DD8C8', '#D8DCE2',
         '#3B414B', '#FF6E64', '#BFFF4D', '#FFE066', '#7FD4F2', '#CD97E8', '#7FE8DB', '#F2F5F8'],
  ui: {
    bg: '#14171C', panel: '#1B1F26', inset: '#0E1114', fg: '#E8ECF0', 'fg-dim': '#8B919C',
    prompt: '#F8D030', output: '#C9CFD8', success: '#9EFF00', warning: '#F8D030', error: '#FF6E64',
    accent: '#9EFF00', 'accent-2': '#C46A1E', border: '#343A44', selection: '#2B313B',
    'diff-add-bg': 'rgba(158,255,0,.12)', 'diff-add-fg': '#BFFF4D',
    'diff-del-bg': 'rgba(229,72,63,.18)', 'diff-del-fg': '#FF6E64',
    'status-bg': '#23272E', 'status-fg': '#F8D030',
  },
  banner: [
    sym('⚡', '   ⚡        ⚡          ⚡      ⚡'),
    L('  ▐▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜▌'),
    L('   █▓▒░ WARNING · 高圧電流 ░▒▓█', 'error'),
    L('        ▄▄      ▄▄'),
    L('       █▀▀█▄▄▄▄█▀▀█'),
    L('       █ ▄ ▀▀▀▀ ▄ █'),
    mix({ t: '       █▐▌      ▐▌█    ', r: 'dim' }, { t: '野生的 皮卡丘 出现了！', r: 'prompt' }),
    mix({ t: '       █  ▄▄▄▄▄  █     ', r: 'dim' }, { t: '噼啪作响的电流划破了寂静。', r: 'prompt' }),
    L('       ▀█▄▄▄▄▄▄▄▄█▀'),
    'stripe',
    L(' ─── 无人发电厂 · POWER PLANT ───'),
  ],
  script: [
    { kind: 'user', text: '给 CLI 加一个进度条' },
    { kind: 'think', text: '✦ 使用 ANSI 转义序列渲染 …' },
    { kind: 'plan', text: '  新增 src/cli/progress.ts' },
    { kind: 'add', text: '+const bar = (p: number) =>' },
    { kind: 'add', text: '+  "█".repeat(p / 5) + "░".repeat(20 - p / 5)' },
    { kind: 'success', text: '✔ 完成 · 新文件 1 个 · 皮卡丘充满了电！' },
  ],
};

export const SCENES: SceneDef[] = [grassland, ocean, cave, magma, snowfield, plant];

export const SCENE_MAP: Record<SceneId, SceneDef> = {
  grassland, ocean, cave, magma, snowfield, plant,
};

export const SCENE_IDS: SceneId[] = SCENES.map((s) => s.id);

export function isSceneId(v: string | null | undefined): v is SceneId {
  return !!v && (SCENE_IDS as string[]).includes(v);
}
