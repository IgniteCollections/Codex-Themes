/* 商店场景目录：由 generate-studio-themes 同款数据源（scene-data.ts）派生展示元数据，
   壁纸 / sprite 为本地资源（构建期内联）。 */

import { SCENES as sceneData } from "./scene-data";

import wallGrassland from "./wallpapers/scene-grassland.png";
import wallOcean from "./wallpapers/scene-ocean.png";
import wallCave from "./wallpapers/scene-cave.png";
import wallMagma from "./wallpapers/scene-magma.png";
import wallSnowfield from "./wallpapers/scene-snowfield.png";
import wallPlant from "./wallpapers/scene-plant.png";
import wallSpace from "./wallpapers/scene-space.svg";
import wallCity from "./wallpapers/scene-city.svg";
import wallLab from "./wallpapers/scene-lab.svg";

import spr001 from "./sprites/001.png";
import spr004 from "./sprites/004.png";
import spr010 from "./sprites/010.png";
import spr016 from "./sprites/016.png";
import spr025 from "./sprites/025.png";
import spr041 from "./sprites/041.png";
import spr043 from "./sprites/043.png";
import spr050 from "./sprites/050.png";
import spr072 from "./sprites/072.png";
import spr074 from "./sprites/074.png";
import spr081 from "./sprites/081.png";
import spr095 from "./sprites/095.png";
import spr100 from "./sprites/100.png";
import spr116 from "./sprites/116.png";
import spr125 from "./sprites/125.png";
import spr129 from "./sprites/129.png";
import spr130 from "./sprites/130.png";
import spr131 from "./sprites/131.png";
import spr133 from "./sprites/133.png";
import spr144 from "./sprites/144.png";
import spr192 from "./sprites/192.png";
import spr218 from "./sprites/218.png";
import spr239 from "./sprites/239.png";
import spr324 from "./sprites/324.png";
import spr363 from "./sprites/363.png";
import spr371 from "./sprites/371.png";
import spr384 from "./sprites/384.png";
import spr386 from "./sprites/386.png";
import spr471 from "./sprites/471.png";
import spr145 from "./sprites/145.png";
import spr150 from "./sprites/150.png";
import spr151 from "./sprites/151.png";
import spr251 from "./sprites/251.png";
import spr10037 from "./sprites/10037.png";
import spr10076 from "./sprites/10076.png";
import spr10077 from "./sprites/10077.png";
import spr10079 from "./sprites/10079.png";
import spr10193 from "./sprites/10193.png";

const SPRITES: Record<number, string> = {
  1: spr001, 4: spr004, 10: spr010, 16: spr016, 25: spr025, 41: spr041,
  43: spr043, 50: spr050, 72: spr072, 74: spr074, 81: spr081, 95: spr095,
  100: spr100, 116: spr116, 125: spr125, 129: spr129, 130: spr130, 131: spr131,
  133: spr133, 144: spr144, 192: spr192, 218: spr218, 239: spr239, 324: spr324,
  363: spr363, 371: spr371, 384: spr384, 386: spr386, 471: spr471,
  145: spr145, 150: spr150, 151: spr151, 251: spr251,
  10037: spr10037, 10076: spr10076, 10077: spr10077, 10079: spr10079, 10193: spr10193,
};

export const spriteOf = (id: number): string | undefined => SPRITES[id];

export interface ShopScene {
  /** Dream Skin 主题包 id（pokemon-<scene>） */
  packId: string;
  /** 场景内部 id（grassland 等） */
  sceneId: string;
  no: string;
  name: string;
  en: string;
  symbol: string;
  flavor: string;
  /** 商店卡片副标题（卖点） */
  tagline: string;
  desc: string;
  wallpaper: string;
  mascot: string;
  encounters: { id: number; name: string; sprite?: string }[];
  /** 商店用主色板：bg / panel / 强调 / 成功 / 警告 / 错误 */
  swatches: string[];
  accent: string;
  ansi: string[];
  keywords: string[];
}

const WALLPAPERS: Record<string, string> = {
  grassland: wallGrassland,
  ocean: wallOcean,
  cave: wallCave,
  magma: wallMagma,
  snowfield: wallSnowfield,
  plant: wallPlant,
  space: wallSpace,
  city: wallCity,
  lab: wallLab,
};

const TAGLINES: Record<string, string> = {
  grassland: "嫩绿晨光 · 护眼长编码",
  ocean: "深海浪潮 · 冷静输出",
  cave: "矿晶幽光 · 深夜氛围",
  magma: "熔岩炽橙 · 高能警示",
  snowfield: "极光冰晶 · 清透专注",
  plant: "电光警示 · 工业复古",
  space: "宇宙风暴 · 神兽格调",
  city: "霓虹夜色 · 不夜之城",
  lab: "培养舱冷光 · 基因实验",
};

export const SHOP_SCENES: ShopScene[] = sceneData.map((s) => ({
  packId: `pokemon-${s.id}`,
  sceneId: s.id,
  no: s.no,
  name: s.name,
  en: s.en,
  symbol: s.symbol,
  flavor: s.flavorShort,
  tagline: TAGLINES[s.id] ?? "",
  desc: s.desc,
  wallpaper: WALLPAPERS[s.id],
  mascot: SPRITES[s.pokemon[0]?.id ?? 0] ?? "",
  encounters: s.pokemon.map((p) => ({ id: p.id, name: p.name, sprite: SPRITES[p.id] })),
  swatches: [s.ui.bg, s.ui.panel, s.ui.prompt, s.ui.success, s.ui.warning, s.ui.error],
  accent: s.ui.prompt,
  ansi: s.ansi,
  keywords: s.keywords,
}));
