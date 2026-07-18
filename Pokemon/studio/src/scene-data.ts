/* ============================================================
   CODEX · 宝可梦皮肤计划 — 场景皮肤系统（唯一样式真源）
   数据逐字来自 design.md §7 与 home.md 演示脚本。
   ============================================================ */

export type SceneId = 'grassland' | 'ocean' | 'cave' | 'magma' | 'snowfield' | 'plant' | 'space' | 'city' | 'lab';

/** SceneId -> tmTheme 文件名后缀（plant 对应 pokemon-power-plant.tmTheme） */
export const SCENE_THEME_SLUG: Record<SceneId, string> = {
  grassland: 'grassland', ocean: 'ocean', cave: 'cave',
  magma: 'magma', snowfield: 'snowfield', plant: 'power-plant', space: 'space',
  city: 'city', lab: 'lab',
};

/** 横幅着色角色 -> CSS 变量（见 TerminalWindow.bannerColor） */
export type BannerRole = 'prompt' | 'dim' | 'accent' | 'error' | 'output' | 'del';
export interface BannerSeg { t: string; r: BannerRole }
/** 'stripe' = 发电厂警示条纹分隔带（渲染为色块而非字符） */
export type BannerLine = BannerSeg[] | 'stripe';

export type ScriptLineKind = 'user' | 'think' | 'plan' | 'meta' | 'ctx' | 'add' | 'del' | 'success';
export interface ScriptLine { kind: ScriptLineKind; text: string }

export type PokemonRole = 'mascot' | 'encounter' | 'legendary';

export interface Pokemon {
  id: number;        // 图鉴编号（sprite 文件名来源）
  name: string;
  types: string[];
  flavor: string;    // 图鉴描述（摘录，私人用途）
  role: PokemonRole;
}

export const pokemonSprite = (p: Pokemon): string =>
  `pokemon/${String(p.id).padStart(3, '0')}.png`;

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
  pokemon: Pokemon[];        // 招牌 + 常规遭遇（≥5，进化链单独成位）
  starterLine?: Pokemon[];   // 御三家/家族进化链（初始→一段→最终，图鉴页成长排列）
  legendaries: Pokemon[];    // 神兽/幻兽池（图鉴页 ??? 槽位）
  legendaryHint: string;     // 神兽池暗示文案
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
  encounter: '野生的 时拉比 出现了！',
  flavor: '野生的 时拉比 出现了！微风带来了青草的香气。',
  flavorShort: '微风带来了青草的香气。',
  keywords: ['#新绿', '#晨光', '#微风', '#1号道路'],
  desc: '1 号道路的清晨。嫩绿与阳光黄为主调，终端像一块被树荫覆盖的草地——柔和、护眼、适合白天长时间编码。强调色取妙蛙种子鳞茎的嫩绿，警告色用向阳花的明黄。',
  pokemon: [
    { id: 251, name: '时拉比', types: ['超能力', '草'], role: 'mascot', flavor: '能穿越时间的森林守护神，出现过的森林会草木繁茂。' },
    { id: 43, name: '走路草', types: ['草', '毒'], role: 'encounter', flavor: '白天把根扎进土里一动不动，夜里会到处走动散播种子。' },
    { id: 10, name: '绿毛虫', types: ['虫'], role: 'encounter', flavor: '从触角释放出强烈的臭气来赶走敌人，以此保护自己。' },
    { id: 16, name: '波波', types: ['一般', '飞行'], role: 'encounter', flavor: '性格温和，不喜欢战斗，但如果被欺负会扬起沙子反击。' },
    { id: 133, name: '伊布', types: ['一般'], role: 'encounter', flavor: '拥有不稳定的遗传基因，会根据环境进化成各种形态。' },
    { id: 192, name: '向日花怪', types: ['草'], role: 'encounter', flavor: '追逐太阳移动，太阳下山后会闭合花瓣一动不动。' },
  ],
  starterLine: [
    { id: 1, name: '妙蛙种子', types: ['草', '毒'], role: 'mascot', flavor: '出生的时候背上就有一颗种子，种子会跟着身体一起长大。' },
    { id: 2, name: '妙蛙草', types: ['草', '毒'], role: 'encounter', flavor: '背上的花苞越来越大，快要开花时身体会散发出香味。' },
    { id: 3, name: '妙蛙花', types: ['草', '毒'], role: 'encounter', flavor: '盛开的大花能吸收太阳能量，据说雨天后的花香会安抚人心。' },
  ],
  legendaries: [
    { id: 251, name: '时拉比', types: ['超能力', '草'], role: 'legendary', flavor: '能穿越时间的森林守护神，出现过的森林会草木繁茂。' },
    { id: 492, name: '谢米', types: ['草'], role: 'legendary', flavor: '拥有分解毒素让大地瞬间开满鲜花的力量，心怀感谢时会现身。' },
    { id: 640, name: '毕力吉翁', types: ['草', '格斗'], role: 'legendary', flavor: '圣剑士之一，能用头上的角斩断一切，守护同伴。' },
  ],
  legendaryHint: '草丛深处的时间缝隙里，隐约有粉色的影子掠过……',
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
    { kind: 'success', text: '✔ 完成 · 1 处修改 · 耗时 4.2s · 时拉比觉得很赞' },
  ],
};

/* ---------------- No.002 海洋 ---------------- */
const ocean: SceneDef = {
  id: 'ocean',
  no: 'No.002', name: '海洋', en: 'OCEAN', route: '19号水路 · OCEAN ROUTE',
  symbol: '≈', icon: '/icon-ocean.svg', image: '/scene-ocean.png',
  encounter: '起源盖欧卡 从深海苏醒了！',
  flavor: '起源盖欧卡 从深海苏醒了！潮汐随它的呼吸涨落。',
  flavorShort: '溅起了巨大的水花。',
  keywords: ['#深海', '#浪花', '#潮汐', '#蓝色寂静'],
  desc: '深海蓝铺底，浪青作强调，珊瑚橙仅出现在错误与次强调上——像海面落日的一瞬。整体冷静、专注，适合深夜长会话，暴鲤龙的怒红被刻意压暗以保持海面的安静。',
  pokemon: [
    { id: 10077, name: '起源盖欧卡', types: ['水'], role: 'mascot', flavor: '回归起源姿态的海洋之神，挥一挥鳍就能召来淹没大陆的暴雨。' },
    { id: 131, name: '拉普拉斯', types: ['水', '冰'], role: 'encounter', flavor: '智商很高，能听懂人话，喜欢载人渡海。' },
    { id: 129, name: '鲤鱼王', types: ['水'], role: 'encounter', flavor: '只会跳来跳去的弱小宝可梦，但据说跳过龙门的个体能化龙。' },
    { id: 72, name: '玛瑙水母', types: ['水', '毒'], role: 'encounter', flavor: '身体几乎全是水，会随着海流成群漂流到岸边。' },
    { id: 116, name: '墨海马', types: ['水'], role: 'encounter', flavor: '用尾巴缠住珊瑚固定身体，从嘴里喷出墨汁逃跑。' },
    { id: 370, name: '爱心鱼', types: ['水'], role: 'encounter', flavor: '心形的身体象征着爱情，据说会给恋人带来好运。' },
  ],
  starterLine: [
    { id: 7, name: '杰尼龟', types: ['水'], role: 'encounter', flavor: '把头和四肢缩进壳里时，会从口中喷出强力的水枪。' },
    { id: 8, name: '卡咪龟', types: ['水'], role: 'encounter', flavor: '毛茸茸的尾巴是长寿的象征，据说能活一万年。' },
    { id: 9, name: '水箭龟', types: ['水'], role: 'encounter', flavor: '背上的两门水炮能射穿铁板，威力巨大。' },
  ],
  legendaries: [
    { id: 249, name: '洛奇亚', types: ['超能力', '飞行'], role: 'legendary', flavor: '被称为海神的传说宝可梦，轻轻振翅就能摧毁房屋，因此隐居深海。' },
    { id: 382, name: '盖欧卡', types: ['水'], role: 'legendary', flavor: '传说中用暴雨扩大海洋的宝可梦，与固拉多势不两立。' },
    { id: 245, name: '水君', types: ['水'], role: 'legendary', flavor: '北风的化身，四处奔走净化被污染的水源。' },
  ],
  legendaryHint: '漩涡深处沉睡着巨大的身影，海浪忽然安静了下来……',
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
  encounter: 'Mega 巨金怪 挡住了矿道！',
  flavor: 'Mega 巨金怪 挡住了矿道！洞顶传来金属的共振。',
  flavorShort: '洞顶传来翅膀的回声。',
  keywords: ['#月见山', '#矿晶', '#回声', '#头灯微光'],
  desc: '月见山深处。岩灰与暗紫构成洞壁，矿晶青是岩缝里发光的矿石，苔绿点缀像石缝里的微光。对比度刻意压低一档，营造「头灯照亮的一小圈」的洞穴感，矿晶青提示符是黑暗里的路标。',
  pokemon: [
    { id: 10076, name: 'Mega 巨金怪', types: ['钢', '超能力'], role: 'mascot', flavor: '超级进化后计算能力超越超级计算机，四只手臂能粉碎一切障碍。' },
    { id: 41, name: '超音蝠', types: ['毒', '飞行'], role: 'encounter', flavor: '没有眼睛，靠超声波在黑暗中飞行和探路。' },
    { id: 50, name: '地鼠', types: ['地面'], role: 'encounter', flavor: '在地下挖洞前进，被它耕过的土地会变得松软适合耕种。' },
    { id: 374, name: '铁哑铃', types: ['钢', '超能力'], role: 'encounter', flavor: '靠磁力浮在空中，用脑电波和同伴交流。' },
    { id: 408, name: '头盖龙', types: ['岩石'], role: 'encounter', flavor: '一亿年前的宝可梦，头盖骨像铁一样坚硬。' },
  ],
  starterLine: [
    { id: 74, name: '小拳石', types: ['岩石', '地面'], role: 'encounter', flavor: '圆圆的像块石头，登山道上经常被误踢。' },
    { id: 75, name: '隆隆石', types: ['岩石', '地面'], role: 'encounter', flavor: '从山上滚落时一路碾压，身体越滚越圆滑。' },
    { id: 76, name: '隆隆岩', types: ['岩石', '地面'], role: 'encounter', flavor: '硬邦邦的身体不怕任何攻击，炸开岩石开路。' },
  ],
  legendaries: [
    { id: 377, name: '雷吉洛克', types: ['岩石'], role: 'legendary', flavor: '全身由岩石构成，损坏的部分会用新的岩石修补。' },
    { id: 379, name: '雷吉斯奇鲁', types: ['钢'], role: 'legendary', flavor: '钢铁之躯经过数万年重压，比任何金属都坚硬。' },
    { id: 378, name: '雷吉艾斯', types: ['冰'], role: 'legendary', flavor: '身体由南极的冰构成，零下 200 度，靠近就会结冰。' },
    { id: 376, name: '巨金怪', types: ['钢', '超能力'], role: 'legendary', flavor: '由两只金属怪合体而成，四台大脑并列运算快过超级计算机。' },
  ],
  legendaryHint: '隧道尽头的石壁上，浮现出奇怪的圆点图案……',
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
  encounter: '原始固拉多 踏出了熔岩！',
  flavor: '原始固拉多 踏出了熔岩！大地在它脚下重新沸腾。',
  flavorShort: '火焰把四周照得通亮。',
  keywords: ['#红莲岛', '#熔岩流', '#余烬', '#火山口'],
  desc: '红莲岛火山口。熔岩红与炽橙是主光源，余烬黄负责警告与高亮，炭黑底让热色更烫。成功色不用常规绿，改用硫化黄绿，保持火山化学质感；蓝焰青只出现在次强调，像火焰最热的内芯。',
  pokemon: [
    { id: 10078, name: '原始固拉多', types: ['地面', '火'], role: 'mascot', flavor: '回归起源姿态的大地之神，炽热的躯体能让江河蒸干、熔岩覆盖大地。' },
    { id: 126, name: '鸭嘴火兽', types: ['火'], role: 'encounter', flavor: '体温高达 1200 度，从嘴和指尖喷出火焰。' },
    { id: 218, name: '熔岩虫', types: ['火'], role: 'encounter', flavor: '体内循环着高温熔岩，冷却下来就会变硬无法动弹。' },
    { id: 324, name: '煤炭龟', types: ['火'], role: 'encounter', flavor: '甲壳里烧着煤炭，遇到敌人会喷出黑烟逃走。' },
    { id: 58, name: '卡蒂狗', types: ['火'], role: 'encounter', flavor: '忠诚勇敢的宝可梦，会对着比它大的敌人吼叫。' },
    { id: 322, name: '呆火驼', types: ['火', '地面'], role: 'encounter', flavor: '背上的驼峰里储存着熔岩，愤怒时会喷发。' },
  ],
  starterLine: [
    { id: 4, name: '小火龙', types: ['火'], role: 'mascot', flavor: '尾巴上的火焰代表它的心情，火焰旺盛时说明它精神饱满。' },
    { id: 5, name: '火恐龙', types: ['火'], role: 'encounter', flavor: '性格粗暴，尾巴的火焰越烧越旺时会变得好战。' },
    { id: 6, name: '喷火龙', types: ['火', '飞行'], role: 'encounter', flavor: '翅膀能飞到 1400 米高空，喷出的火焰能融化岩石。' },
  ],
  legendaries: [
    { id: 146, name: '火焰鸟', types: ['火', '飞行'], role: 'legendary', flavor: '传说中的鸟宝可梦，翅膀上燃烧的火焰能把夜空照得通亮。' },
    { id: 383, name: '固拉多', types: ['地面'], role: 'legendary', flavor: '传说中创造大地、让海水蒸发的宝可梦，沉睡在岩浆深处。' },
    { id: 485, name: '席多蓝恩', types: ['火', '钢'], role: 'legendary', flavor: '栖息在火山口，熔岩般的血液在体内流动。' },
  ],
  legendaryHint: '岩浆湖的中心翻涌起来，大地深处传来低沉的咆哮……',
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
    { kind: 'success', text: '✔ 完成 · 100k 条 = 41ms · 提速 82× · 原始固拉多让大地沸腾' },
  ],
};

/* ---------------- No.005 雪原 ---------------- */
const snowfield: SceneDef = {
  id: 'snowfield',
  no: 'No.005', name: '雪原', en: 'SNOWFIELD', route: '217号道路 · SNOWFIELD ROUTE',
  symbol: '❄', icon: '/icon-snow.svg', image: '/scene-snowfield.png',
  encounter: '蕾冠王 踏雪而来！',
  flavor: '蕾冠王 踏雪而来！蹄印里开出了冰晶的花。',
  flavorShort: '空气中飘起了细小的冰晶。',
  keywords: ['#切锋市', '#极光', '#初雪', '#零下静谧'],
  desc: '切锋市以北的雪原。冰白前景浮在深夜蓝上，浅青与极光蓝像雪地上反射的天光，冰晶紫只做温柔的高光。全场景对比最高、最「干净」，长时间阅读最舒适——像雪后无风的清晨。',
  pokemon: [
    { id: 10193, name: '蕾冠王（骑白马）', types: ['超能力', '冰'], role: 'mascot', flavor: '驾驭雪暴马的丰饶之王，蹄声所至之处积雪化为良田。' },
    { id: 144, name: '急冻鸟', types: ['冰', '飞行'], role: 'encounter', flavor: '传说中的鸟宝可梦，飞过之处会降下雪花。' },
    { id: 363, name: '海豹球', types: ['冰', '水'], role: 'encounter', flavor: '在冰面上翻滚比走路更快，圆圆的身体怎么撞都不怕。' },
    { id: 220, name: '小山猪', types: ['冰', '地面'], role: 'encounter', flavor: '用鼻子拱开积雪寻找食物，有时会挖出温泉。' },
    { id: 459, name: '雪笠怪', types: ['草', '冰'], role: 'encounter', flavor: '站在雪地里一动不动装成树，等猎物靠近。' },
  ],
  starterLine: [
    { id: 361, name: '雪童子', types: ['冰'], role: 'encounter', flavor: '只生活在积雪深厚的寒冷地区，据说会带来财富。' },
    { id: 362, name: '冰鬼护', types: ['冰'], role: 'legendary', flavor: '体内的寒气能瞬间冻结空气中的水分，张开的嘴是冰之牙。' },
  ],
  legendaries: [
    { id: 646, name: '酋雷姆', types: ['龙', '冰'], role: 'legendary', flavor: '拥有最强冷冻能力的龙宝可梦，等待着重获完整之躯。' },
  ],
  legendaryHint: '暴风雪的另一头，一双蓝色的眼睛正注视着这边……',
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
  encounter: '闪电鸟 在机组间降临！',
  flavor: '闪电鸟 在机组间降临！全厂的电压表同时打到满格。',
  flavorShort: '电流划破了发电厂的寂静。',
  keywords: ['#无人发电厂', '#残余电流', '#警示条纹', '#十萬伏特'],
  desc: '废弃十年的无人发电厂。工业暗灰是生锈的机身，电光黄是残余电流，荧光绿只给「成功」——像黑暗中重新接通的一格电。锈橙标记废弃感，黄黑警示条纹是本场景独有的装饰纹样。',
  pokemon: [
    { id: 145, name: '闪电鸟', types: ['电', '飞行'], role: 'mascot', flavor: '雷云中的传说鸟宝可梦，拍动翅膀就会落下闪电。' },
    { id: 81, name: '小磁怪', types: ['电', '钢'], role: 'encounter', flavor: '从身体两侧的磁铁放出磁力，浮在空中前进。' },
    { id: 125, name: '电击兽', types: ['电'], role: 'encounter', flavor: '喜欢电力，常出现在发电厂附近偷吃电能。' },
    { id: 100, name: '雷电球', types: ['电'], role: 'encounter', flavor: '外形酷似精灵球，一受刺激就会爆炸，经常被人误捡。' },
    { id: 82, name: '三合一磁怪', types: ['电', '钢'], role: 'encounter', flavor: '三只小磁怪连在一起，磁力强大到会吸走周围的铁器。' },
    { id: 239, name: '电击怪', types: ['电'], role: 'encounter', flavor: '头上插着插头，摇晃身体储存电能。' },
  ],
  starterLine: [
    { id: 172, name: '皮丘', types: ['电'], role: 'encounter', flavor: '脸颊的电气袋还很小，受到惊吓会不小心放电电到自己。' },
    { id: 25, name: '皮卡丘', types: ['电'], role: 'mascot', flavor: '脸颊上的电气袋储存电力，生气时会一口气放电。' },
    { id: 26, name: '雷丘', types: ['电'], role: 'encounter', flavor: '电力强到能电倒一头大象，尾巴用来接地释放多余电力。' },
  ],
  legendaries: [
    { id: 145, name: '闪电鸟', types: ['电', '飞行'], role: 'legendary', flavor: '传说中的鸟宝可梦，振翅时会响起雷鸣，栖息在雷云之中。' },
    { id: 243, name: '雷公', types: ['电'], role: 'legendary', flavor: '背负着雷云奔驰的传说宝可梦，吼声如同落雷。' },
    { id: 807, name: '捷拉奥拉', types: ['电'], role: 'legendary', flavor: '以雷电般的速度奔驰的幻之宝可梦，从掌心的肉垫放出高压电。' },
  ],
  legendaryHint: '深处传来了巨大的翅膀声，整栋厂房的灯同时闪了一下……',
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
    { kind: 'success', text: '✔ 完成 · 新文件 1 个 · 闪电鸟充满了电！' },
  ],
};

/* ---------------- No.007 宇宙 · 天空 ---------------- */
const space: SceneDef = {
  id: 'space',
  no: 'No.007', name: '宇宙', en: 'SPACE', route: '天空之柱顶点 · SKY PILLAR APEX',
  symbol: '☄', icon: '/icon-space.svg', image: '/scene-space.svg',
  encounter: 'Mega 裂空座 撕裂云层！',
  flavor: 'Mega 裂空座 撕裂云层！臭氧层的风暴在为它让路。',
  flavorShort: '臭氧层的风暴在为它让路。',
  keywords: ['#天空之柱', '#臭氧层', '#流星', '#许愿星'],
  desc: '天空之柱的顶点，云层之上。深空黑压底，臭氧紫是平流层的暮色，流星金负责强调，裂空绿只给最重要的成功——像穿过云层的那个身影。凤王的虹色不出现在色板里，它属于云海之上的传说。',
  pokemon: [
    { id: 10079, name: 'Mega 裂空座', types: ['龙', '飞行'], role: 'mascot', flavor: '超级进化后体内的陨石能量觉醒，是能击穿臭氧层直抵宇宙的存在。' },
    { id: 149, name: '快龙', types: ['龙', '飞行'], role: 'encounter', flavor: '16 小时就能绕地球一圈，会救助海上遇难的船只。' },
    { id: 887, name: '多龙巴鲁托', types: ['龙', '幽灵'], role: 'encounter', flavor: '角上的洞里住着多龙梅西亚，能以音速发射出去。' },
    { id: 337, name: '月石', types: ['岩石', '超能力'], role: 'encounter', flavor: '据说来自月球，满月之夜会飘浮在空中吸收月光。' },
    { id: 338, name: '太阳岩', types: ['岩石', '超能力'], role: 'encounter', flavor: '据说来自太阳，旋转身体时能发出太阳般的光和热。' },
    { id: 334, name: '七夕青鸟', types: ['龙', '飞行'], role: 'encounter', flavor: '拥有棉花般蓬松的翅膀，歌声优美，会在云层上跳舞。' },
  ],
  starterLine: [
    { id: 371, name: '宝贝龙', types: ['龙'], role: 'encounter', flavor: '梦想着飞上天空，把头撞得又硬又结实。' },
    { id: 372, name: '甲壳龙', types: ['龙'], role: 'encounter', flavor: '坚硬的甲壳里正在孕育翅膀，破壳前不吃不喝。' },
    { id: 373, name: '暴飞龙', types: ['龙', '飞行'], role: 'encounter', flavor: '终于长出翅膀的宝可梦，在天空中尽情翱翔。' },
  ],
  legendaries: [
    { id: 250, name: '凤王', types: ['火', '飞行'], role: 'legendary', flavor: '传说中的虹色宝可梦，飞过之处会留下彩虹，见到它的人会获得幸福。' },
    { id: 380, name: '拉帝亚斯', types: ['龙', '超能力'], role: 'legendary', flavor: '水都的守护神之一，能隐身飞行，温柔地守护心爱之人。' },
    { id: 381, name: '拉帝欧斯', types: ['龙', '超能力'], role: 'legendary', flavor: '水都的守护神之一，速度超越喷气机，能看透人心。' },
    { id: 386, name: '代欧奇希斯', types: ['超能力'], role: 'legendary', flavor: '宇宙病毒的 DNA 突变而成的宝可梦，能自由变换四种形态。' },
    { id: 385, name: '基拉祈', types: ['钢', '超能力'], role: 'legendary', flavor: '千年醒来一次的许愿星，据说能实现任何愿望。' },
  ],
  legendaryHint: '彩虹划过云海，两颗流星在水都的上空交错而过……',
  ansi: ['#0B0B1E', '#E05A7A', '#00A86B', '#FFD700', '#6C5CE7', '#C77DBB', '#5FD4D0', '#E8E8F8',
         '#26264A', '#F28597', '#3FD99A', '#FFE169', '#8F7DF0', '#E2A3D8', '#8FE8E4', '#FFFFFF'],
  ui: {
    bg: '#0B0B1E', panel: '#131331', inset: '#070716', fg: '#E8E8F8', 'fg-dim': '#9A9AC0',
    prompt: '#FFD700', output: '#D8D8F0', success: '#3FD99A', warning: '#FFD700', error: '#F28597',
    accent: '#8F7DF0', 'accent-2': '#6C5CE7', border: '#2E2E56', selection: '#23234A',
    'diff-add-bg': 'rgba(0,168,107,.15)', 'diff-add-fg': '#3FD99A',
    'diff-del-bg': 'rgba(224,90,122,.18)', 'diff-del-fg': '#F28597',
    'status-bg': '#1B1B3E', 'status-fg': '#FFD700',
  },
  banner: [
    L('  ✦ 　 ˚ 　　 ✦ 　　˚ 　　　 ✦ 　 ˚ 　 ✦', 'dim'),
    mix({ t: '     ˚ 　　　', r: 'dim' }, { t: '☄', r: 'prompt' }, { t: ' 　　　 ˚ 　　　 ✦', r: 'dim' }),
    L('        ▄▄▄▄', 'output'),
    L('      ▄█▀▀▀▀█▄', 'output'),
    L('      █ ▄  ▄ █', 'output'),
    mix({ t: '      █ ▐▌▐▌ █      ', r: 'output' }, { t: '野生的 烈空坐 降临了！', r: 'prompt' }),
    mix({ t: '      █  ▀▀  █      ', r: 'output' }, { t: '臭氧层的风暴在为它让路。', r: 'prompt' }),
    L('     ▄█▄▄▄▄▄▄▄█▄', 'output'),
    L('  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀', 'accent'),
    L(' ─── 天空之柱顶点 · SKY PILLAR APEX ───'),
  ],
  script: [
    { kind: 'user', text: '给这个接口加上超时和降级' },
    { kind: 'think', text: '✦ 分析 src/api/client.ts · 网络层薄弱点 2 处…' },
    { kind: 'plan', text: '  修改 src/api/client.ts（2 处）' },
    { kind: 'add', text: '+const res = await timeout(fetch(url), 5000)' },
    { kind: 'add', text: '+  .catch(() => fallbackCache.get(url))' },
    { kind: 'success', text: '✔ 完成 · 接口韧性 +2 · Mega 裂空座在云端为你护航' },
  ],
};


/* ---------------- No.008 城市 · 紫苑夜色 ---------------- */
const city: SceneDef = {
  id: 'city',
  no: 'No.008', name: '城市', en: 'CITY', route: '金黄市天际线 · SAFFRON SKYLINE',
  symbol: '✦', icon: '/icon-city.svg', image: '/scene-city.svg',
  encounter: '野生的 梦幻 在霓虹间闪现！',
  flavor: '野生的 梦幻 在霓虹间闪现！整座城市的灯都为它亮了一拍。',
  flavorShort: '整座城市的灯都为它亮了一拍。',
  keywords: ['#霓虹', '#天际线', '#夜市', '#不夜城'],
  desc: '金黄市的午夜天际线。夜幕紫压底，霓虹粉是梦幻掠过橱窗的反光，灯光金只给状态栏与成功——像写字楼里最后熄的那盏灯。这是 7×24 小时的城市皮肤：热闹留在壁纸里，终端保持深夜的安静。',
  pokemon: [
    { id: 151, name: '梦幻', types: ['超能力'], role: 'mascot', flavor: '拥有所有宝可梦基因的幻之宝可梦，据说只有心地纯洁的人才能见到它。' },
    { id: 133, name: '伊布', types: ['一般'], role: 'encounter', flavor: '拥有不稳定的遗传基因，会根据环境进化成各种形态。' },
    { id: 172, name: '皮丘', types: ['电'], role: 'encounter', flavor: '电气袋还没发育完全，一吃惊就会漏电把自己吓一跳。' },
    { id: 58, name: '卡蒂狗', types: ['火'], role: 'encounter', flavor: '忠诚勇敢的宝可梦，是城市警队最可靠的搭档。' },
    { id: 41, name: '超音蝠', types: ['毒', '飞行'], role: 'encounter', flavor: '没有眼睛，靠超声波在黑夜的小巷间穿行觅食。' },
    { id: 220, name: '小山猪', types: ['冰', '地面'], role: 'encounter', flavor: '冬天溜进城市翻找食物的宝可梦，鼻子冻得通红也不在意。' },
  ],
  legendaries: [
    { id: 150, name: '超梦', types: ['超能力'], role: 'legendary', flavor: '由梦幻的基因人工制造的宝可梦，据说藏身在城市地下的深处。' },
    { id: 249, name: '洛奇亚', types: ['超能力', '飞行'], role: 'legendary', flavor: '气旋之神，台风夜偶尔会在海港的高楼顶现身。' },
    { id: 250, name: '凤王', types: ['火', '飞行'], role: 'legendary', flavor: '传说中的虹色宝可梦，黎明前从城市上空飞过时据说会留下彩虹。' },
  ],
  legendaryHint: '午夜的霓虹闪烁了三下——有什么正贴着高楼间的风掠过……',
  ansi: ['#241242', '#F2788A', '#3FD99A', '#FFD700', '#6C8EF0', '#F8B4D9', '#7BD3F0', '#F8E8F8',
         '#3A1E6E', '#F28597', '#6EE8B0', '#FFE169', '#8FA8F8', '#F8C8E4', '#8FE8F4', '#FFFFFF'],
  ui: {
    bg: '#160A26', panel: '#1E1032', inset: '#100720', fg: '#F8E8F8', 'fg-dim': '#B89BC8',
    prompt: '#F8B4D9', output: '#D8C8E8', success: '#3FD99A', warning: '#FFD700', error: '#F2788A',
    accent: '#FFD700', 'accent-2': '#7BD3F0', border: '#3A1E6E', selection: '#2E1652',
    'diff-add-bg': 'rgba(63,217,154,.15)', 'diff-add-fg': '#6EE8B0',
    'diff-del-bg': 'rgba(242,120,138,.18)', 'diff-del-fg': '#F28597',
    'status-bg': '#2E1652', 'status-fg': '#F8B4D9',
  },
  banner: [
    L('  ✦ ˚ 　　 ✦ 　　˚ 　 ✦ 　 ˚ 　　✦', 'dim'),
    L(' ▄ ▄▄ ▄ ▄▄▄ ▄▄ ▄ ▄▄ ▄▄▄ ▄ ▄▄ ▄▄', 'output'),
    L(' █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █', 'output'),
    mix({ t: ' █▓█ █ █▓█ █ █▓█ █ █▓█ █ █ ', r: 'output' }, { t: '野生的 梦幻 在霓虹间闪现！', r: 'prompt' }),
    mix({ t: ' █ █▓█ █ █ █▓█ █ █ █▓█ █ █ ', r: 'output' }, { t: '整座城市的灯都为它亮了一拍。', r: 'prompt' }),
    L(' █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █', 'output'),
    L(' ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀', 'accent'),
    L(' ─── 金黄市天际线 · SAFFRON SKYLINE ───'),
  ],
  script: [
    { kind: 'user', text: '把这个页面的配色调成深夜模式' },
    { kind: 'think', text: '✦ 分析 src/styles/theme.css · 找到 6 处硬编码亮色…' },
    { kind: 'plan', text: '  修改 src/styles/theme.css（6 处）' },
    { kind: 'add', text: "+  '--bg': '#160A26'," },
    { kind: 'add', text: "+  '--neon': '#F8B4D9'," },
    { kind: 'success', text: '✔ 完成 · 6 处修改 · 梦幻在霓虹深处眨了眨眼' },
  ],
};

/* ---------------- No.009 实验室 · 基因培养舱 ---------------- */
const lab: SceneDef = {
  id: 'lab',
  no: 'No.009', name: '实验室', en: 'LABORATORY', route: '红莲岛研究所 · CINNABAR LAB',
  symbol: '⚗', icon: '/icon-lab.svg', image: '/scene-lab.svg',
  encounter: '超梦 在培养舱后睁开了眼睛！',
  flavor: '超梦 在培养舱后睁开了眼睛！仪器的读数全部爆表。',
  flavorShort: '仪器的读数全部爆表。',
  keywords: ['#培养舱', '#基因', '#冷光', '#红莲岛'],
  desc: '红莲岛研究所的地下三层。钢青压底，培养液的青光是主照明，基因紫只给超梦相关的强调——像舱体里缓缓睁开的眼睛。冷色系的精密感，适合调试与逆向工程的长夜。',
  pokemon: [
    { id: 150, name: '超梦', types: ['超能力'], role: 'mascot', flavor: '由梦幻的基因人工制造的宝可梦，拥有最强大的战斗能力，却对人类充满疑问。' },
    { id: 81, name: '小磁怪', types: ['电', '钢'], role: 'encounter', flavor: '被实验室的电磁波吸引而来，吸附在设备上一动不动。' },
    { id: 82, name: '三合一磁怪', types: ['电', '钢'], role: 'encounter', flavor: '三只小磁怪合为一体，发出的磁力能让仪器失灵。' },
    { id: 100, name: '雷电球', types: ['电'], role: 'encounter', flavor: '外形酷似精灵球，常被误捡——实验室事故的常客。' },
    { id: 72, name: '玛瑙水母', types: ['水', '毒'], role: 'encounter', flavor: '从研究所的排水管漂进来的不速之客。' },
    { id: 41, name: '超音蝠', types: ['毒', '飞行'], role: 'encounter', flavor: '栖息在通风管道里，超声波会干扰精密仪器。' },
  ],
  legendaries: [
    { id: 151, name: '梦幻', types: ['超能力'], role: 'legendary', flavor: '所有宝可梦基因的源头，据说它的一个细胞就能复制任何宝可梦。' },
    { id: 386, name: '代欧奇希斯', types: ['超能力'], role: 'legendary', flavor: '宇宙病毒的 DNA 突变而成的宝可梦，能自由变换四种形态。' },
    { id: 808, name: '美录梅塔', types: ['钢'], role: 'legendary', flavor: '从实验室诞生的幻之宝可梦，液态金属的身体能自由变形。' },
  ],
  legendaryHint: '培养舱的营养液无风自动，监控画面闪过一个粉色的残影……',
  ansi: ['#0D1420', '#F2788A', '#3FD99A', '#FFD166', '#5F8EF0', '#9B7BF0', '#57D3C7', '#E8F4F8',
         '#1E3248', '#F28597', '#6EE8B0', '#FFE169', '#8FA8F8', '#B89BF8', '#8FE8E4', '#FFFFFF'],
  ui: {
    bg: '#0C121C', panel: '#111A28', inset: '#080D16', fg: '#E8F4F8', 'fg-dim': '#8AA8B8',
    prompt: '#7BD3F0', output: '#C8DEE8', success: '#3FD99A', warning: '#FFD166', error: '#F2788A',
    accent: '#9B7BF0', 'accent-2': '#57D3C7', border: '#1E3248', selection: '#1A2C40',
    'diff-add-bg': 'rgba(63,217,154,.15)', 'diff-add-fg': '#6EE8B0',
    'diff-del-bg': 'rgba(242,120,138,.18)', 'diff-del-fg': '#F28597',
    'status-bg': '#1A2C40', 'status-fg': '#9B7BF0',
  },
  banner: [
    L(' ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄', 'output'),
    L(' █ ┌────┐ ┌──────┐ ┌────┐ █', 'output'),
    mix({ t: ' █ │▒▒▒▒│ │▓▓▓▓▓▓│ │▒▒▒▒│ █  ', r: 'output' }, { t: '超梦 在培养舱后睁开了眼睛！', r: 'prompt' }),
    mix({ t: ' █ │▒◉▒▒│ │▓◉▓▓◉▓│ │▒▒▒▒│ █  ', r: 'output' }, { t: '仪器的读数全部爆表。', r: 'prompt' }),
    L(' █ │▒▒▒▒│ │▓▓▓▓▓▓│ │▒▒▒▒│ █', 'output'),
    L(' █ └────┘ └──────┘ └────┘ █', 'output'),
    L(' ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀', 'accent'),
    L(' ─── 红莲岛研究所 · CINNABAR LAB ───'),
  ],
  script: [
    { kind: 'user', text: '给这个解析器补上异常分支的单测' },
    { kind: 'think', text: '✦ 分析 src/parser/lexer.ts · 异常分支覆盖率 62%…' },
    { kind: 'plan', text: '  新增 src/parser/lexer.test.ts（4 个用例）' },
    { kind: 'add', text: "+it('rejects malformed token stream', () =>" },
    { kind: 'add', text: '+  expect(() => lex(bad)).toThrow(LexError))' },
    { kind: 'success', text: '✔ 完成 · 覆盖率 62% → 91% · 超梦的读数稳定了' },
  ],
};

export const SCENES: SceneDef[] = [grassland, ocean, cave, magma, snowfield, plant, space, city, lab];

export const SCENE_MAP: Record<SceneId, SceneDef> = {
  grassland, ocean, cave, magma, snowfield, plant, space, city, lab,
};

export const SCENE_IDS: SceneId[] = SCENES.map((s) => s.id);

export function isSceneId(v: string | null | undefined): v is SceneId {
  return !!v && (SCENE_IDS as string[]).includes(v);
}
