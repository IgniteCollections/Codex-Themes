import type { Pokemon, PokemonRole, Scene, SceneId } from "./types";

// 数据来源：docs/pokemon/pokemon-theme-design.md（选角逻辑）、
// docs/pokemon/requirements.md（配色基线，不可更改）。
// 图鉴描述摘录自 NightCatSama/pokedex pokemon.json（私人用途）。

export const POKEMON: Record<number, Pokemon> = {
  1: { id: 1, name: "妙蛙种子", types: ["草", "毒"], flavor: "出生的时候背上就有一颗种子，种子会跟着身体一起长大。" },
  4: { id: 4, name: "小火龙", types: ["火"], flavor: "尾巴上的火焰代表它的心情，火焰旺盛时说明它精神饱满。" },
  10: { id: 10, name: "绿毛虫", types: ["虫"], flavor: "从触角释放出强烈的臭气来赶走敌人，以此保护自己。" },
  16: { id: 16, name: "波波", types: ["一般", "飞行"], flavor: "性格温和，不喜欢战斗，但如果被欺负会扬起沙子反击。" },
  25: { id: 25, name: "皮卡丘", types: ["电"], flavor: "脸颊上的电气袋储存电力，生气时会一口气放电。" },
  41: { id: 41, name: "超音蝠", types: ["毒", "飞行"], flavor: "没有眼睛，靠超声波在黑暗中飞行和探路。" },
  43: { id: 43, name: "走路草", types: ["草", "毒"], flavor: "白天把根扎进土里一动不动，夜里会到处走动散播种子。" },
  50: { id: 50, name: "地鼠", types: ["地面"], flavor: "在地下挖洞前进，被它耕过的土地会变得松软适合耕种。" },
  72: { id: 72, name: "玛瑙水母", types: ["水", "毒"], flavor: "身体几乎全是水，会随着海流成群漂流到岸边。" },
  74: { id: 74, name: "小拳石", types: ["岩石", "地面"], flavor: "圆圆的像块石头，登山道上经常被误踢。" },
  81: { id: 81, name: "小磁怪", types: ["电", "钢"], flavor: "从身体两侧的磁铁放出磁力，浮在空中前进。" },
  95: { id: 95, name: "大岩蛇", types: ["岩石", "地面"], flavor: "在地下一边旋转身体一边掘进，时速可达 80 公里。" },
  100: { id: 100, name: "雷电球", types: ["电"], flavor: "外形酷似精灵球，一受刺激就会爆炸，经常被人误捡。" },
  125: { id: 125, name: "电击兽", types: ["电"], flavor: "喜欢电力，常出现在发电厂附近偷吃电能。" },
  126: { id: 126, name: "鸭嘴火兽", types: ["火"], flavor: "体温高达 1200 度，从嘴和指尖喷出火焰。" },
  129: { id: 129, name: "鲤鱼王", types: ["水"], flavor: "只会跳来跳去的弱小宝可梦，但据说跳过龙门的个体能化龙。" },
  130: { id: 130, name: "暴鲤龙", types: ["水", "飞行"], flavor: "一旦现身就会破坏一切，狂暴到把整片海域搅得天翻地覆。" },
  131: { id: 131, name: "拉普拉斯", types: ["水", "冰"], flavor: "智商很高，能听懂人话，喜欢载人渡海。" },
  144: { id: 144, name: "急冻鸟", types: ["冰", "飞行"], flavor: "传说中的鸟宝可梦，飞过之处会降下雪花。" },
  145: { id: 145, name: "闪电鸟", types: ["电", "飞行"], flavor: "传说中的鸟宝可梦，振翅时会响起雷鸣，栖息在雷云之中。" },
  146: { id: 146, name: "火焰鸟", types: ["火", "飞行"], flavor: "传说中的鸟宝可梦，翅膀上燃烧的火焰能把夜空照得通亮。" },
  218: { id: 218, name: "熔岩虫", types: ["火"], flavor: "体内循环着高温熔岩，冷却下来就会变硬无法动弹。" },
  243: { id: 243, name: "雷公", types: ["电"], flavor: "背负着雷云奔驰的传说宝可梦，吼声如同落雷。" },
  245: { id: 245, name: "水君", types: ["水"], flavor: "北风的化身，四处奔走净化被污染的水源。" },
  249: { id: 249, name: "洛奇亚", types: ["超能力", "飞行"], flavor: "被称为海神的传说宝可梦，轻轻振翅就能摧毁房屋，因此隐居深海。" },
  251: { id: 251, name: "时拉比", types: ["超能力", "草"], flavor: "能穿越时间的森林守护神，出现过的森林会草木繁茂。" },
  324: { id: 324, name: "煤炭龟", types: ["火"], flavor: "甲壳里烧着煤炭，遇到敌人会喷出黑烟逃走。" },
  361: { id: 361, name: "雪童子", types: ["冰"], flavor: "只生活在积雪深厚的寒冷地区，据说会带来财富。" },
  362: { id: 362, name: "冰鬼护", types: ["冰"], flavor: "体内的寒气能瞬间冻结空气中的水分，张开的嘴是冰之牙。" },
  363: { id: 363, name: "海豹球", types: ["冰", "水"], flavor: "在冰面上翻滚比走路更快，圆圆的身体怎么撞都不怕。" },
  377: { id: 377, name: "雷吉洛克", types: ["岩石"], flavor: "全身由岩石构成，损坏的部分会用新的岩石修补。" },
  378: { id: 378, name: "雷吉艾斯", types: ["冰"], flavor: "身体由南极的冰构成，零下 200 度，靠近就会结冰。" },
  379: { id: 379, name: "雷吉斯奇鲁", types: ["钢"], flavor: "钢铁之躯经过数万年重压，比任何金属都坚硬。" },
  382: { id: 382, name: "盖欧卡", types: ["水"], flavor: "传说中用暴雨扩大海洋的宝可梦，与固拉多势不两立。" },
  383: { id: 383, name: "固拉多", types: ["地面"], flavor: "传说中创造大地、让海水蒸发的宝可梦，沉睡在岩浆深处。" },
  471: { id: 471, name: "冰伊布", types: ["冰"], flavor: "伊布的进化形，能让体毛冻结成锐利的冰针射出。" },
  485: { id: 485, name: "席多蓝恩", types: ["火", "钢"], flavor: "栖息在火山口，熔岩般的血液在体内流动。" },
  492: { id: 492, name: "谢米", types: ["草"], flavor: "拥有分解毒素让大地瞬间开满鲜花的力量，心怀感谢时会现身。" },
  640: { id: 640, name: "毕力吉翁", types: ["草", "格斗"], flavor: "圣剑士之一，能用头上的角斩断一切，守护同伴。" },
  646: { id: 646, name: "酋雷姆", types: ["龙", "冰"], flavor: "拥有最强冷冻能力的龙宝可梦，等待着重获完整之躯。" },
  807: { id: 807, name: "捷拉奥拉", types: ["电"], flavor: "以雷电般的速度奔驰的幻之宝可梦，从掌心的肉垫放出高压电。" },
};

const p = (id: number, role: PokemonRole): Pokemon => ({ ...POKEMON[id], role });

export const SCENES: Scene[] = [
  {
    id: "grassland",
    no: "001",
    name: "草原",
    nameEn: "GRASSLAND",
    location: "1号道路 · GRASSLAND ROUTE",
    promptSymbol: "❀",
    flavor: "野生的 妙蛙种子 出现了！微风带来了青草的香气。",
    designNote:
      "嫩绿与深草绿构成基底，阳光黄负责强调与警告，奶白做正文，墨绿压底。成功色直接用嫩绿，像雨后的1号道路。",
    colors: {
      primary: "#7AC74C",   // 嫩绿
      secondary: "#4A7C2F", // 深草绿
      accent: "#F7D02C",    // 阳光黄
      surface: "#F5FBEA",   // 奶白
      ink: "#1E3A13",       // 墨绿文字
    },
    pokemon: [p(1, "mascot"), p(43, "encounter"), p(10, "encounter"), p(16, "encounter")],
    legendaries: [p(251, "legendary"), p(492, "legendary"), p(640, "legendary")],
    legendaryHint: "草丛深处的时间缝隙里，隐约有粉色的影子掠过……",
    tags: ["#1号道路", "#嫩绿", "#御三家", "#森林守护神"],
  },
  {
    id: "ocean",
    no: "002",
    name: "海洋",
    nameEn: "OCEAN",
    location: "21号水路 · OCEAN CURRENT",
    promptSymbol: "≈",
    flavor: "野生的 暴鲤龙 出现了！溅起了巨大的水花。",
    designNote:
      "深海蓝压底，浪青做主强调，泡沫白做正文，珊瑚橙只出现在警告与点缀。成功色用浪青，像浪尖反射的光。",
    colors: {
      primary: "#2E9BD6",   // 浪青
      secondary: "#0C3B5D", // 深海蓝
      accent: "#FF7F50",    // 珊瑚橙
      surface: "#EAF7FD",   // 泡沫白
      ink: "#062032",       // 夜蓝文字
    },
    pokemon: [p(130, "mascot"), p(131, "encounter"), p(72, "encounter"), p(129, "encounter")],
    legendaries: [p(249, "legendary"), p(382, "legendary"), p(245, "legendary")],
    legendaryHint: "漩涡深处沉睡着巨大的身影，海浪忽然安静了下来……",
    tags: ["#深海", "#跃龙门", "#海神", "#冲浪"],
  },
  {
    id: "cave",
    no: "003",
    name: "洞穴",
    nameEn: "CAVE",
    location: "月见山 · MT. MOON TUNNEL",
    promptSymbol: "◆",
    flavor: "野生的 大岩蛇 出现了！洞顶落下了碎石。",
    designNote:
      "岩灰与暗紫做主基调，苔绿与矿晶青做点缀，微光米做正文。整体压低明度，只有强调色像矿灯一样亮。",
    colors: {
      primary: "#6B5B95",   // 暗紫
      secondary: "#3B3B42", // 岩灰
      accent: "#7BD3C8",    // 矿晶青
      surface: "#D8D5C8",   // 微光米
      ink: "#191920",       // 深岩黑
    },
    pokemon: [p(95, "mascot"), p(41, "encounter"), p(74, "encounter"), p(50, "encounter")],
    legendaries: [p(377, "legendary"), p(379, "legendary"), p(378, "legendary")],
    legendaryHint: "隧道尽头的石壁上，浮现出奇怪的圆点图案……",
    tags: ["#月见山", "#矿灯", "#三神柱", "#封印遗迹"],
  },
  {
    id: "magma",
    no: "004",
    name: "岩浆",
    nameEn: "MAGMA",
    location: "红莲岛火山 · CINNABAR VOLCANO",
    promptSymbol: "▲",
    flavor: "野生的 小火龙 出现了！尾巴的火焰把四周照得通亮。",
    designNote:
      "熔岩红与炽橙是主光源，余烬黄负责警告与高亮，炭黑底让热色更烫。成功色不用常规绿，改用硫化黄绿保持火山化学质感。",
    colors: {
      primary: "#D43D2A",   // 熔岩红
      secondary: "#1C1512", // 炭黑
      accent: "#FFD166",    // 余烬黄
      surface: "#F5E6DC",   // 暖灰白
      ink: "#1C1512",       // 炭黑文字
    },
    pokemon: [p(4, "mascot"), p(126, "encounter"), p(218, "encounter"), p(324, "encounter")],
    legendaries: [p(146, "legendary"), p(383, "legendary"), p(485, "legendary")],
    legendaryHint: "岩浆湖的中心翻涌起来，大地深处传来低沉的咆哮……",
    tags: ["#红莲岛", "#熔岩流", "#余烬", "#火山口"],
  },
  {
    id: "snowfield",
    no: "005",
    name: "雪原",
    nameEn: "SNOWFIELD",
    location: "双子岛 · TWIN ISLAND GLACIER",
    promptSymbol: "❄",
    flavor: "野生的 冰伊布 出现了！呼吸在空中凝成了白雾。",
    designNote:
      "冰白做底，浅青与极光蓝做层次，冰晶紫点缀，深夜蓝做文字。整体偏冷的浅色系，像雪地里反光的阳光。",
    colors: {
      primary: "#6BA8D8",   // 极光蓝
      secondary: "#A8D8EA", // 浅青
      accent: "#B8B8E0",    // 冰晶紫
      surface: "#F2F9FC",   // 冰白
      ink: "#16324A",       // 深夜蓝文字
    },
    pokemon: [p(471, "mascot"), p(144, "encounter"), p(363, "encounter"), p(361, "encounter")],
    legendaries: [p(362, "legendary"), p(646, "legendary")],
    legendaryHint: "暴风雪的另一头，一双蓝色的眼睛正注视着这边……",
    tags: ["#双子岛", "#极光", "#传说三鸟", "#冰龙"],
  },
  {
    id: "power-plant",
    no: "006",
    name: "无人发电厂",
    nameEn: "POWER PLANT",
    location: "关都无人发电厂 · ABANDONED PLANT",
    promptSymbol: "⚡",
    flavor: "野生的 皮卡丘 出现了！废弃的机器间闪过一道电光。",
    designNote:
      "电光黄做主强调，工业暗灰压底，锈橙做点缀，警示条纹黄黑做危险语义，荧光绿只在最高亮出现一次。像废墟里唯一还通电的配电箱。",
    colors: {
      primary: "#F8D030",   // 电光黄
      secondary: "#23272E", // 工业暗灰
      accent: "#C46A1E",    // 锈橙
      surface: "#F4F6F8",   // 冷灰白
      ink: "#14171C",       // 炭灰文字
    },
    pokemon: [p(25, "mascot"), p(81, "encounter"), p(125, "encounter"), p(100, "encounter")],
    legendaries: [p(145, "legendary"), p(243, "legendary"), p(807, "legendary")],
    legendaryHint: "深处传来了巨大的翅膀声，整栋厂房的灯同时闪了一下……",
    tags: ["#无人发电厂", "#电光", "#2021票选冠军", "#雷云"],
  },
];

export const SCENE_MAP: Record<SceneId, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.id, s]),
) as Record<SceneId, Scene>;
