/* 场景展示元数据（与 themes/<id>/theme.json 对应，静态以避免运行时读文件） */

import spr001 from "./sprites/001.png";
import spr004 from "./sprites/004.png";
import spr025 from "./sprites/025.png";
import spr095 from "./sprites/095.png";
import spr130 from "./sprites/130.png";
import spr384 from "./sprites/384.png";
import spr471 from "./sprites/471.png";

export interface SceneMeta {
  id: string;        // theme pack id
  label: string;     // 草原
  en: string;        // GRASSLAND
  symbol: string;    // ❀
  sprite: string;    // 招牌宝可梦 sprite（本地资源）
  flavor: string;    // 一句话
}

export const SCENES: SceneMeta[] = [
  { id: "pokemon-grassland", label: "草原", en: "GRASSLAND", symbol: "❀", sprite: spr001, flavor: "微风带来了青草的香气。" },
  { id: "pokemon-ocean", label: "海洋", en: "OCEAN", symbol: "≈", sprite: spr130, flavor: "溅起了巨大的水花。" },
  { id: "pokemon-cave", label: "洞穴", en: "CAVE", symbol: "◆", sprite: spr095, flavor: "洞顶传来翅膀的回声。" },
  { id: "pokemon-magma", label: "岩浆", en: "MAGMA", symbol: "▲", sprite: spr004, flavor: "火焰把四周照得通亮。" },
  { id: "pokemon-snowfield", label: "雪原", en: "SNOWFIELD", symbol: "❄", sprite: spr471, flavor: "空气中飘起了细小的冰晶。" },
  { id: "pokemon-plant", label: "无人发电厂", en: "POWER PLANT", symbol: "⚡", sprite: spr025, flavor: "电流划破了发电厂的寂静。" },
  { id: "pokemon-space", label: "宇宙", en: "SPACE", symbol: "☄", sprite: spr384, flavor: "臭氧层的风暴在为它让路。" },
];
