# 宝可梦素材库调研

日期： 2026-07-18

三个候选素材仓库的详细调研，用于网站插画/图标与主题装饰。

## ⚠️ 版权总览（先看这个）

**三个仓库的素材全部是宝可梦公司（The Pokémon Company）版权资产的衍生品，没有一个有自由许可证。** 这意味着：

- 本仓库的**展示网站**用字符画/像素块自绘宝可梦元素（info.md 原本就这么要求），不嵌入任何抓取图片 —— 保持这个决策最安全
- 如果将来要在网站里展示官方 sprite，优先选 PokeAPI/sprites（出处最正、社区使用最广），且只用于非商业展示、注明出处；分发给终端用户的主题产物（`.tmTheme`、config）本身不含图片，无此风险
- NightCatSama/pokedex 和 HybridShivam/Pokemon 的素材**不建议直接拷贝进本仓库**

## 1. NightCatSama/pokedex

<https://github.com/NightCatSama/pokedex> — 「宝可梦中文数据，包含各种类型图片」

- **结构**：根目录只有 `images/`、`README.md`、`pokemon.json`，无应用代码
- **图片分类**：`gif/`（动图）、`normal/`（标准 PNG）、`pixel/`（**像素 PNG**）、`sprite/forward|back|shiny-forward|shiny-back`
- **命名**：按图鉴数字 ID，如 `images/pixel/1.png`；不按世代分目录
- **数据**：`pokemon.json` 含中/英/日名、身高体重、属性、特性、世代、捕获率、图鉴描述、进化链、种族值 —— **中文名+描述是本仓库最独特的价值**
- **许可证**：无 LICENSE，来源未说明，pixel 图尺寸/出处未标注

**对本项目的用途**：`pokemon.json` 的中文名与图鉴描述可作为 flavor 文案参考（手工摘录我们需要的 24 只，而非拷贝整个文件）；图片不使用。

## 2. PokeAPI/sprites

<https://github.com/PokeAPI/sprites> — PokéAPI 官方 sprite 托管仓

- **结构**：
  ```
  sprites/
  ├── pokemon/            # 默认 sprite（front/back/shiny/female 变体）
  │   ├── other/          # dream-world(SVG), official-artwork(475x475 PNG), home(512x512), showdown(动画GIF)
  │   └── versions/       # generation-i ~ ix 历代游戏 sprite
  └── items/              # 道具小图
  ```
- **像素风素材最全**：Gen I（红/蓝/黄，含灰度与 GBC 变体，40-56px）、Gen II（crystal 有动画 GIF）、Gen III（绿宝石/火红叶绿/红蓝宝，64×64 GBA 时代）—— 与我们 GBA 像素风定位最契合的是 **Gen III `versions/generation-iii/`**
- **URL 约定**：`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{category}/{id}.png`
- **许可证**：有 LICENCE.txt，但 sprite 本身是游戏版权资产；社区（Smogon 等）贡献补充了 650+ 号的 Gen V 风格图

**对本项目的用途**：如需真实 sprite（如开发调试对照、README 演示图）从这里取并注明出处；Gen III 64×64 是像素风参考基准。

## 3. HybridShivam/Pokemon

<https://github.com/HybridShivam/Pokemon> — PokéAPI 定制数据集 + 杉森建官方立绘

- **内容**：Gen I–IX + 传说 ZA 的**官方立绘**（Ken Sugimori 风高清插画）、形态变体（Mega/极巨化/地区形态）、缩略图；`assets/images/`（压缩）、`assets/imagesHQ/`（原质量）
- **无像素 sprite**——与本项目像素风方向不符
- **命名**：四位零填充 ID（`0001.png`），变体 `0006-Mega-X.png`
- **数据**：CSV/JSON 数据集（Veekun 来源）+ Python 抓取脚本
- **许可证**：**无开源许可证**，README 明示版权归宝可梦公司，「仅是数据汇编」

**对本项目的用途**：不使用。立绘风格与像素风冲突，版权风险最高。

## 结论

1. 网站宝可梦视觉元素：**自绘字符画/像素块**（现状，保持）
2. 中文名/图鉴描述文案：参考 NightCatSama/pokedex 的 `pokemon.json` 手工摘录
3. 像素风美术参考：PokeAPI/sprites 的 Gen III sprite（只作风格参考，不拷贝入库）
4. HybridShivam/Pokemon：弃用

## 附录：本项目 24 只宝可梦的图鉴 ID

| 场景 | 宝可梦（ID） |
|---|---|
| 草原 | 妙蛙种子 1、走路草 43、绿毛虫 10、波波 16 |
| 海洋 | 暴鲤龙 130、拉普拉斯 131、玛瑙水母 72、鲤鱼王 129 |
| 洞穴 | 超音蝠 41、小拳石 74、大岩蛇 95、地鼠 50 |
| 岩浆 | 小火龙 4、鸭嘴火兽 126、熔岩虫 218、煤炭龟 324 |
| 雪原 | 冰伊布 471、急冻鸟 144、海豹球 363、雪童子 361 |
| 发电厂 | 皮卡丘 25、小磁怪 81、电击兽 125、雷电球 100 |

PokeAPI sprites Gen III 示例 URL（小火龙）：
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/emerald/4.png`
