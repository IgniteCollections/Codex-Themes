# 宝可梦素材库调研

日期： 2026-07-18

三个候选素材仓库的详细调研，用于网站插画/图标与主题装饰。

> **2026-07-18 更新**：仓库所有者确认为个人私人用途，不在意素材版权限制。素材使用策略改为：PokeAPI/sprites 的 Gen III sprite 与官方立绘直接下载入库，NightCatSama/pokedex 的中文数据摘录使用。最新的素材使用设计以 [pokemon-theme-design.md](pokemon-theme-design.md#4-宝可梦素材使用设计私人使用官方-sprite-直接入库) 为准；本文件保留三库调研事实。

## ⚠️ 版权事实（存档）

三个仓库的素材均为宝可梦公司版权资产的衍生品，无自由许可证。私人使用场景下由仓库所有者自行承担风险；本项目的主题产物（`.tmTheme`、config）本身不含图片，不受此影响。

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

## 结论（2026-07-18 修订）

1. 网站宝可梦图像：**PokeAPI/sprites Gen III sprite 直接入库**（64×64 像素风，与 GBA 定位契合）；招牌宝可梦可加官方立绘
2. 中文名/图鉴描述：从 NightCatSama/pokedex 的 `pokemon.json` 摘录入库
3. 字符画保留用于终端上下文装饰
4. HybridShivam/Pokemon：不需要（立绘已有 PokeAPI 来源）

具体入库清单与页面使用方式见 [pokemon-theme-design.md §4](pokemon-theme-design.md)。

## 附录：本项目宝可梦图鉴 ID

### 常规阵容（24 只）

| 场景 | 宝可梦（ID） |
|---|---|
| 草原 | 妙蛙种子 1、走路草 43、绿毛虫 10、波波 16 |
| 海洋 | 暴鲤龙 130、拉普拉斯 131、玛瑙水母 72、鲤鱼王 129 |
| 洞穴 | 大岩蛇 95、超音蝠 41、小拳石 74、地鼠 50 |
| 岩浆 | 小火龙 4、鸭嘴火兽 126、熔岩虫 218、煤炭龟 324 |
| 雪原 | 冰伊布 471、急冻鸟 144、海豹球 363、雪童子 361 |
| 发电厂 | 皮卡丘 25、小磁怪 81、电击兽 125、雷电球 100 |

### 神兽/幻兽池（每场景 3 只，共 17 只去重）

| 场景 | 宝可梦（ID） |
|---|---|
| 草原 | 时拉比 251、谢米 492、毕力吉翁 640 |
| 海洋 | 洛奇亚 249、盖欧卡 382、水君 245 |
| 洞穴 | 雷吉洛克 377、雷吉斯奇鲁 379、雷吉艾斯 378 |
| 岩浆 | 火焰鸟 146、固拉多 383、席多蓝恩 485 |
| 雪原 | 急冻鸟 144（常规兼任）、冰鬼护 362、酋雷姆 646 |
| 发电厂 | 闪电鸟 145、雷公 243、捷拉奥拉 807 |

合计需下载 sprite：24 常规 + 17 神兽 - 1 重复（急冻鸟）= **40 只**。

PokeAPI sprites Gen III 示例 URL（小火龙）：
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/emerald/4.png`
