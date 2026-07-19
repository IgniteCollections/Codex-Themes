#!/usr/bin/env python3
"""Generate pixel-art scene wallpapers for the Pokemon theme.

Direct Pillow raster at 240×135 (nearest-neighbour ×4 → 960×540 for the
website) — replaces the old flat SVG scenes with layered, detailed art:
sky gradients, mid-ground silhouettes, foreground detail, scene-specific
signature elements. Palette per scene comes from scenes.ts (single source).

    python3 Pokemon/scripts/generate-scene-art.py

Outputs: Pokemon/app/public/scene-<id>.png (960×540)
Studio packs (2560×1440) are produced by generate-studio-themes.py from
these PNGs.
"""

import random
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "Pokemon/app/public"

W, H = 480, 270          # 渲染缓冲 = 逻辑画布 240×135 的 ×2（supersample，细节翻倍）
SCALE = 8                 # ×8 = 1920×1080 网站壁纸；工作室由 generate-studio-themes 放大到 4K


def hx(h: str) -> tuple[int, int, int]:
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def mix(a: tuple, b: tuple, t: float) -> tuple:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


class _ScaledDraw:
    """240×135 逻辑坐标 ×S=2 到 480×270 缓冲（supersample）。
    点 → S×S 小块保持像素颗粒；线/矩形/多边形/圆统一放大。"""
    S = 2
    def __init__(self, draw): self._d = draw
    def _pts(self, seq): return [(x * self.S, y * self.S) for x, y in seq]
    def point(self, xy, fill=None):
        x, y = xy
        self._d.rectangle([x*self.S, y*self.S, x*self.S+self.S-1, y*self.S+self.S-1], fill=fill)
    def line(self, xy, fill=None, width=1):
        self._d.line(self._pts(xy), fill=fill, width=max(1, width*self.S-1))
    def rectangle(self, xy, fill=None, outline=None):
        x0, y0, x1, y1 = xy
        self._d.rectangle([x0*self.S, y0*self.S, (x1+1)*self.S-1, (y1+1)*self.S-1], fill=fill, outline=outline)
    def polygon(self, xy, fill=None):
        self._d.polygon(self._pts(xy), fill=fill)
    def ellipse(self, xy, fill=None):
        x0, y0, x1, y1 = xy
        self._d.ellipse([x0*self.S, y0*self.S, (x1+1)*self.S-1, (y1+1)*self.S-1], fill=fill)
    def pieslice(self, xy, a0, a1, fill=None):
        x0, y0, x1, y1 = xy
        self._d.pieslice([x0*self.S, y0*self.S, (x1+1)*self.S-1, (y1+1)*self.S-1], a0, a1, fill=fill)


def canvas() -> tuple[Image.Image, "_ScaledDraw"]:
    img = Image.new("RGB", (W, H))
    return img, _ScaledDraw(ImageDraw.Draw(img))


def save(img: Image.Image, name: str) -> None:
    # 480×270 缓冲 ×4 = 1920×1080 网站壁纸（nearest 保持像素颗粒）
    img.resize((W * 4, H * 4), Image.NEAREST).save(OUT / f"scene-{name}.png")
    print(f"scene-{name}.png ({W*4}x{H*4})")


LW = W // 2  # 逻辑宽 240（手写元素按 240×135 逻辑坐标）


def vgrad(d, top: tuple, bottom: tuple, y0: int, y1: int) -> None:
    # 直接按缓冲行画满（不经过缩放 line，避免隔行黑带）
    S = d.S
    for y in range(y0, y1):
        c = mix(top, bottom, (y - y0) / max(1, y1 - y0))
        d._d.rectangle([0, y * S, W, (y + 1) * S - 1], fill=c)


def stars(d, rng, n, y_max, colors):
    for _ in range(n):
        x, y = rng.randrange(LW), rng.randrange(y_max)
        d.point((x, y), fill=rng.choice(colors))
        if rng.random() < 0.15:
            d.point((x + 1, y), fill=rng.choice(colors))


def blob(d, cx, cy, r, color):
    """像素圆（实心，缩放上下文 ellipse）"""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def hills(d, rng, y_base, amp, color, step=3):
    x = 0
    while x < LW:
        h = rng.randint(amp // 2, amp)
        w2 = rng.randint(14, 30)
        d.polygon([(x, y_base), (x + w2 // 2, y_base - h), (x + w2, y_base)], fill=color)
        x += w2 - rng.randint(2, step + 2)


def ridge(d, rng, y_base, amp, color, seg=18):
    pts = [(0, y_base)]
    x = 0
    up = rng.random() < 0.5
    while x < LW:
        x += rng.randint(seg // 2, seg)
        y_base += rng.randint(-amp, amp) if up else rng.randint(-amp // 2, amp // 2)
        y_base = max(30, min(H - 20, y_base))
        pts.append((x, y_base))
        up = not up if rng.random() < 0.3 else up
    pts += [(LW, H // 2), (0, H // 2)]
    d.polygon(pts, fill=color)


# ============================================================ 草原
def grassland() -> None:
    rng = random.Random(7)
    img, d = canvas()
    vgrad(d, hx("#8EC8E8"), hx("#F5FBEA"), 0, 62)                     # 晨空
    blob(d, 38, 20, 9, hx("#F7D02C"))                                  # 太阳
    blob(d, 38, 20, 6, hx("#FFE169"))
    for (cx, cy, r) in [(150, 18, 8), (196, 26, 7), (96, 30, 6)]:      # 云
        for i in range(3):
            blob(d, cx + i * 9 - 9, cy + (i % 2) * 2, r - (i % 2), hx("#FFFFFF"))
    vgrad(d, hx("#A8D8C0"), hx("#7EB893"), 46, 68)                     # 远山
    ridge(d, rng, 62, 6, hx("#6BAF82"))
    ridge(d, rng, 70, 8, hx("#5A9E6E"))
    vgrad(d, hx("#8FCC6E"), hx("#5FA043"), 68, 100)                    # 中景草地
    hills(d, rng, 76, 10, hx("#79B85C"))
    # 小径（透视）
    d.polygon([(120, 78), (124, 78), (136, 135), (102, 135)], fill=hx("#E8D8A8"))
    d.polygon([(121, 78), (123, 78), (130, 135), (110, 135)], fill=hx("#DCC890"))
    vgrad(d, hx("#6FAF4E"), hx("#3E7A2B"), 100, 135)                   # 前景草
    # 草丛
    for _ in range(90):
        x, y = rng.randrange(LW), rng.randrange(96, 135)
        c = rng.choice([hx("#57C74C"), hx("#7AC74C"), hx("#4A9C2F")])
        d.line([(x, y), (x - 1, y - 2)], fill=c)
        d.line([(x, y), (x + 1, y - 2)], fill=c)
    # 花
    for _ in range(26):
        x, y = rng.randrange(LW), rng.randrange(92, 132)
        d.point((x, y), fill=rng.choice([hx("#F2788A"), hx("#FFE169"), hx("#FFFFFF")]))
    # 光斑
    for _ in range(12):
        x, y = rng.randrange(LW), rng.randrange(70, 110)
        d.point((x, y), fill=hx("#F7D02C"))
    # 右侧灌木
    blob(d, 208, 118, 10, hx("#2E5A1E")); blob(d, 220, 112, 8, hx("#2E5A1E"))
    blob(d, 206, 116, 8, hx("#3E7A2B")); blob(d, 218, 110, 6, hx("#4A9C2F"))
    save(img, "grassland")


# ============================================================ 海洋
def ocean() -> None:
    rng = random.Random(11)
    img, d = canvas()
    vgrad(d, hx("#04101F"), hx("#0C3B5D"), 0, 46)                      # 夜空
    stars(d, rng, 60, 40, [hx("#EAF7FD"), hx("#8CC8E8")])
    blob(d, 196, 16, 8, hx("#EAF7FD")); blob(d, 196, 16, 10, hx("#B8DCE8"))
    blob(d, 196, 16, 7, hx("#F5FCFF"))
    # 红莲岛火山剪影
    d.polygon([(150, 44), (176, 22), (202, 44)], fill=hx("#6E2430"))
    d.polygon([(168, 28), (176, 22), (184, 28)], fill=hx("#8E3240"))
    d.polygon([(173, 25), (176, 23), (179, 25)], fill=hx("#FF7F50"))   # 火口
    vgrad(d, hx("#1E6EA0"), hx("#0C3B5D"), 44, 90)                     # 海面远层
    vgrad(d, hx("#0C3B5D"), hx("#062032"), 90, 135)                    # 海面近层
    # 月光海面反光
    for y in range(48, 88, 3):
        w2 = max(1, 6 - (y - 48) // 6)
        x = 196 + rng.randint(-3, 3)
        d.line([(x - w2, y), (x + w2, y)], fill=hx("#2E6A8E"))
    # 浪层（三层，白沫错位）
    for (y, amp, col) in [(58, 2, hx("#2E9BD6")), (72, 2, hx("#2E9BD6")), (88, 3, hx("#57C7E0"))]:
        for x in range(0, LW, 4):
            dy = amp if (x // 4) % 2 == 0 else -amp
            d.line([(x, y + dy), (x + 3, y + dy)], fill=col)
            if (x // 4) % 5 == 0:
                d.line([(x, y + dy - 1), (x + 2, y + dy - 1)], fill=hx("#B8E4F4"))
    # 鱼群剪影
    for (fx, fy, s) in [(60, 104, 4), (70, 108, 3), (150, 100, 5)]:
        d.ellipse([fx - s, fy - s // 2, fx + s, fy + s // 2], fill=hx("#0A2A40"))
        d.polygon([(fx + s, fy), (fx + s + s // 2, fy - s // 3), (fx + s + s // 2, fy + s // 3)], fill=hx("#0A2A40"))
    # 近景礁石
    blob(d, 16, 128, 12, hx("#0E2436")); blob(d, 30, 132, 9, hx("#0E2436"))
    d.line([(4, 122), (28, 122)], fill=hx("#57C7E0"))                  # 浪拍礁石白沫
    d.line([(8, 120), (24, 120)], fill=hx("#EAF7FD"))
    # 气泡
    for _ in range(8):
        x, y = rng.randrange(120, 220), rng.randrange(96, 126)
        d.point((x, y), fill=hx("#8CC8E8"))
    save(img, "ocean")


# ============================================================ 洞穴
def cave() -> None:
    rng = random.Random(13)
    img, d = canvas()
    vgrad(d, hx("#1A1A22"), hx("#0E0E14"), 0, 135)                     # 洞体
    blob(d, 120, 70, 26, hx("#232330"))                                # 远处微光
    blob(d, 120, 70, 18, hx("#2A2A3A"))
    # 洞壁纹理
    for _ in range(160):
        x, y = rng.randrange(LW), rng.randrange(H // 2)
        d.point((x, y), fill=rng.choice([hx("#2A2A34"), hx("#20202A"), hx("#303040")]))
    # 顶部钟乳石（两排）
    for x in range(0, LW, 14):
        h = rng.randint(6, 14)
        d.polygon([(x, 0), (x + 5, 0), (x + 2, h)], fill=hx("#26262E"))
    for x in range(7, W, 22):
        h = rng.randint(10, 20)
        d.polygon([(x, 0), (x + 6, 0), (x + 3, h)], fill=hx("#1C1C24"))
    # 石笋
    for x in range(10, W, 26):
        h = rng.randint(5, 10)
        d.polygon([(x, 135), (x + 5, 135), (x + 2, 135 - h)], fill=hx("#1C1C24"))
    # 水晶簇（左右两组 + 散件）
    def crystal(cx, cy, s):
        d.polygon([(cx, cy), (cx + s, cy - s * 2), (cx + s * 2, cy)], fill=hx("#7BD3C8"))
        d.polygon([(cx + s // 2, cy), (cx + s, cy - s * 2), (cx + s, cy)], fill=hx("#A8E8E0"))
        d.point((cx + s, cy - s * 2 + 1), fill=hx("#E8FFFC"))
        d.polygon([(cx + s * 2 + 1, cy), (cx + s * 3, cy - s), (cx + s * 4 - 1, cy)], fill=hx("#5FB8AC"))
    crystal(28, 108, 7); crystal(52, 116, 5); crystal(196, 106, 8); crystal(220, 118, 5)
    crystal(116, 122, 4)
    # 发光蘑菇
    for (mx, my) in [(86, 126), (160, 124), (102, 130)]:
        d.line([(mx, my), (mx, my - 3)], fill=hx("#D8D5C8"))
        d.pieslice([mx - 3, my - 7, mx + 3, my - 1], 180, 360, fill=hx("#8A9A5B"))
        d.point((mx - 1, my - 5), fill=hx("#D8D5C8"))
    # 水珠滴落
    for x in (64, 128, 184):
        y = rng.randint(20, 60)
        d.point((x, y), fill=hx("#7BD3C8")); d.point((x, y + 3), fill=hx("#57B8AC"))
    # 地面矿石点缀
    for _ in range(24):
        x, y = rng.randrange(LW), rng.randrange(120, 135)
        d.point((x, y), fill=rng.choice([hx("#6B5B95"), hx("#8A9A5B"), hx("#3B3B42")]))
    save(img, "cave")


# ============================================================ 岩浆
def magma() -> None:
    rng = random.Random(17)
    img, d = canvas()
    vgrad(d, hx("#2A0E08"), hx("#4A1608"), 0, 46)                      # 火山夜空
    stars(d, rng, 30, 40, [hx("#FFD166"), hx("#F5A623")])              # 余烬星
    # 火山 + 烟
    d.polygon([(128, 44), (176, 8), (224, 44)], fill=hx("#1C1512"))
    d.polygon([(168, 16), (176, 8), (184, 16)], fill=hx("#3A1810"))
    d.rectangle([170, 10, 182, 14], fill=hx("#F5A623"))                # 火口
    d.rectangle([172, 11, 180, 13], fill=hx("#FFD166"))
    for (sx, sy, s) in [(176, 4, 6), (170, 0, 4), (184, 2, 3)]:        # 烟
        blob(d, sx, sy, s, hx("#4A3428"))
    # 远山
    ridge(d, rng, 46, 4, hx("#241812"))
    vgrad(d, hx("#D43D2A"), hx("#A82418"), 46, 90)                     # 岩浆远层
    vgrad(d, hx("#A82418"), hx("#6E1408"), 90, 135)                    # 岩浆近层
    # 岩浆波纹（亮边）
    for (y, col) in [(56, hx("#F5A623")), (72, hx("#F5A623")), (92, hx("#FF8C42")), (112, hx("#D43D2A"))]:
        for x in range(0, LW, 6):
            dy = 1 if (x // 6) % 2 == 0 else -1
            d.line([(x, y + dy), (x + 4, y + dy)], fill=col)
            if (x // 6) % 2 == 0:
                d.line([(x, y + dy - 1), (x + 3, y + dy - 1)], fill=hx("#FFD166"))
    # 岩浆泡
    for _ in range(6):
        x, y = rng.randrange(LW), rng.randrange(60, 124)
        r = rng.randint(1, 2)
        blob(d, x, y, r, hx("#F5A623")); d.point((x, y - 1), fill=hx("#FFE169"))
    # 漂浮岩台（带裂纹）
    for (rx, ry, rw) in [(18, 66, 26), (96, 78, 34), (186, 70, 30), (52, 108, 28), (150, 116, 32)]:
        d.rectangle([rx, ry, rx + rw, ry + 8], fill=hx("#241812"))
        d.rectangle([rx, ry, rx + rw, ry + 2], fill=hx("#3A2418"))
        for i in range(3):                                             # 熔岩裂纹
            cx = rx + rng.randint(3, rw - 6)
            d.line([(cx, ry + 2), (cx + 2, ry + 6)], fill=hx("#FFD166"))
    # 余烬飘浮（小而暗的琥珀点，个别亮星）
    for _ in range(46):
        x, y = rng.randrange(LW), rng.randrange(H // 2)
        d.point((x, y), fill=hx("#F5A623") if rng.random() < 0.75 else hx("#FFD166"))
    save(img, "magma")


# ============================================================ 雪原
def snowfield() -> None:
    rng = random.Random(19)
    img, d = canvas()
    vgrad(d, hx("#0A1626"), hx("#16324A"), 0, 60)                      # 极夜
    stars(d, rng, 80, 52, [hx("#F2F9FC"), hx("#A8D8EA"), hx("#B8B8E0")])
    blob(d, 204, 14, 6, hx("#E8F4FC")); blob(d, 204, 14, 8, hx("#C8E0F0"))
    # 极光（两条波带）
    for band, col in [(0, hx("#57C7A0")), (1, hx("#6BA8D8"))]:
        for x in range(LW):
            y = 18 + band * 10 + int(6 * __import__("math").sin((x + band * 40) / 18))
            d.point((x, y), fill=col)
            if rng.random() < 0.3:
                d.point((x, y + 1), fill=mix(col, hx("#0A1626"), 0.6))
    ridge(d, rng, 58, 8, hx("#2E4A66"))                                # 远山
    ridge(d, rng, 66, 6, hx("#3E5C7C"))
    vgrad(d, hx("#C8E4F2"), hx("#F2F9FC"), 66, 100)                    # 雪地
    # 冰湖
    d.rectangle([60, 92, 180, 104], fill=hx("#A8D8EA"))
    d.rectangle([60, 92, 180, 94], fill=hx("#C8ECF8"))
    for x in range(70, 176, 12):                                       # 月光倒影
        d.line([(x, 96), (x + 6, 96)], fill=hx("#E8F8FF"))
    vgrad(d, hx("#EAF4FA"), hx("#FFFFFF"), 104, 135)                   # 前景雪
    # 雪树（三棵大 + 远景一排）
    def tree(tx, ty, s, col):
        for i in range(3):
            w2 = s - i
            d.polygon([(tx, ty - s * 2 - i * 4), (tx - w2, ty - i * 4), (tx + w2, ty - i * 4)], fill=col)
            d.polygon([(tx, ty - s * 2 - i * 4), (tx - w2, ty - i * 4), (tx + w2 // 2, ty - i * 4)], fill=hx("#EAF6FC"))
        d.rectangle([tx - 1, ty - 2, tx + 1, ty], fill=hx("#2E4A66"))
    tree(30, 90, 6, hx("#16324A")); tree(52, 88, 5, hx("#1E3E58"))
    tree(200, 90, 6, hx("#16324A")); tree(222, 88, 5, hx("#1E3E58"))
    for x in range(90, 150, 14):
        tree(x, 76, 3, hx("#2E4A66"))
    # 飘雪
    for _ in range(70):
        x, y = rng.randrange(LW), rng.randrange(H // 2)
        d.point((x, y), fill=rng.choice([hx("#FFFFFF"), hx("#EAF6FC"), hx("#C8E4F2")]))
    save(img, "snowfield")


# ============================================================ 无人发电厂
def plant() -> None:
    rng = random.Random(23)
    img, d = canvas()
    vgrad(d, hx("#262A33"), hx("#161A21"), 0, 135)                     # 厂房
    for _ in range(120):                                               # 墙板噪点
        x, y = rng.randrange(LW), rng.randrange(80)
        d.point((x, y), fill=rng.choice([hx("#232730"), hx("#1A1D24")]))
    for y in range(0, 80, 16):                                         # 墙板缝
        d.line([(0, y), (LW, y)], fill=hx("#0A0C0F"))
    # 破窗 ×3（月光透入）
    for wx in (24, 104, 184):
        d.rectangle([wx, 12, wx + 28, 34], fill=hx("#3A4A5C"))
        for i in range(1, 3):
            d.line([(wx + i * 9 + 1, 12), (wx + i * 9 + 1, 34)], fill=hx("#0E1013"))
        d.line([(wx, 23), (wx + 28, 23)], fill=hx("#0E1013"))
        d.polygon([(wx + 14, 12), (wx + 20, 12), (wx + 17, 22)], fill=hx("#0E1013"))  # 破洞
        d.polygon([(wx + 4, 34), (wx + 12, 34), (wx + 20, 50), (wx + 10, 50)], fill=hx("#232C38"))  # 光锥
    # 机组（三台，指示灯）
    for gx in (16, 96, 176):
        d.rectangle([gx, 58, gx + 46, 96], fill=hx("#242832"))
        d.rectangle([gx, 58, gx + 46, 62], fill=hx("#303644"))
        d.rectangle([gx + 4, 66, gx + 42, 70], fill=hx("#161A22"))
        for lx in range(gx + 8, gx + 40, 10):                          # 指示灯组
            c = rng.choice([hx("#9EFF00"), hx("#F8D030"), hx("#3A3F47")])
            d.point((lx, 76), fill=c); d.point((lx, 79), fill=rng.choice([hx("#F2788A"), hx("#3A3F47")]))
    # 顶部电线
    for y, sag in [(44, 6), (50, 8)]:
        for x in range(0, LW, 4):
            dy = int(sag * __import__("math").sin(x / 30))
            d.point((x, y + dy), fill=hx("#0A0C0F"))
    # 闪电鸟落点：左机组顶
    d.rectangle([16, 54, 62, 58], fill=hx("#23272E"))
    # 火花（明亮的电焊星）
    for _ in range(34):
        x, y = rng.randrange(LW), rng.randrange(48, 112)
        c = rng.choice([hx("#F8D030"), hx("#FFE169"), hx("#F8D030"), hx("#C46A1E")])
        d.point((x, y), fill=c)
        if rng.random() < 0.4:
            d.point((x + 1, y - 1), fill=hx("#FFE169"))
    # 警示条纹立柱
    for px in (0, 228):
        for y in range(90, 135, 8):
            c = hx("#F8D030") if (y // 8) % 2 == 0 else hx("#14171C")
            d.rectangle([px, y, px + 12, y + 8], fill=c)
    vgrad(d, hx("#181C24"), hx("#0E1116"), 96, 135)                    # 地面
    for x in range(0, LW, 12):                                          # 地面反光缝
        d.line([(x, 100), (x, 135)], fill=hx("#08090B"))
    save(img, "plant")


# ============================================================ 宇宙
def space() -> None:
    rng = random.Random(29)
    img, d = canvas()
    vgrad(d, hx("#070716"), hx("#131331"), 0, 135)                     # 深空
    # 星云
    for (nx, ny, nr, col) in [(60, 30, 18, hx("#2E2E56")), (170, 50, 22, hx("#3A2E5E")), (120, 80, 14, hx("#1E2E4A"))]:
        for i in range(nr, 0, -2):
            blob(d, nx + rng.randint(-4, 4), ny + rng.randint(-3, 3), i, mix(col, hx("#070716"), 1 - i / nr / 1.6))
    stars(d, rng, 140, 120, [hx("#E8E8F8"), hx("#8F7DF0"), hx("#FFD700"), hx("#5FD4D0")])
    # 亮星十字
    for (sx, sy) in [(40, 22), (200, 36), (150, 18)]:
        d.line([(sx - 2, sy), (sx + 2, sy)], fill=hx("#FFFFFF"))
        d.line([(sx, sy - 2), (sx, sy + 2)], fill=hx("#FFFFFF"))
    # 流星 ×2
    for (mx, my, ln) in [(70, 26, 10), (180, 60, 8)]:
        for i in range(ln):
            d.point((mx + i, my + i // 2), fill=mix(hx("#FFD700"), hx("#131331"), i / ln))
        blob(d, mx - 1, my, 2, hx("#FFF0B0"))
    # 天空之柱（左下剪影塔）
    d.rectangle([18, 60, 34, 118], fill=hx("#1B1B3E"))
    d.rectangle([14, 54, 38, 62], fill=hx("#23234A"))
    d.rectangle([22, 66, 26, 110], fill=hx("#2E2E56"))
    for y in range(70, 110, 10):                                       # 塔窗
        d.point((30, y), fill=hx("#FFD700"))
    # 云层（三层，底部）
    for (cy, col) in [(108, hx("#23234A")), (118, hx("#2E2E56")), (128, hx("#3A3A6A"))]:
        for x in range(0, LW, 8):
            blob(d, x + rng.randint(-2, 2), cy + rng.randint(-1, 1), rng.randint(4, 7), col)
    # 裂空坐掠影（细长三角 + 翼）
    d.polygon([(150, 84), (168, 80), (166, 84), (168, 88)], fill=hx("#0B0B1E"))
    d.polygon([(158, 82), (152, 74), (162, 80)], fill=hx("#0B0B1E"))
    d.polygon([(158, 86), (152, 94), (162, 88)], fill=hx("#0B0B1E"))
    d.point((151, 84), fill=hx("#3FD99A"))                             # 目
    save(img, "space")


# ============================================================ 城市
def city() -> None:
    rng = random.Random(31)
    img, d = canvas()
    vgrad(d, hx("#1A0B2E"), hx("#2E1050"), 0, 70)                      # 夜空紫
    stars(d, rng, 50, 40, [hx("#F8E8F8"), hx("#B8A8E8")])
    blob(d, 200, 14, 6, hx("#F5E6C8")); blob(d, 198, 13, 4, hx("#FAF0DC"))
    # 远景楼群
    for bx, bw, bh in [(0, 16, 40), (18, 12, 48), (32, 18, 36), (52, 14, 52), (68, 20, 42),
                       (90, 12, 56), (104, 18, 44), (124, 14, 60), (140, 20, 46), (162, 12, 54),
                       (176, 18, 40), (196, 14, 50), (212, 16, 44), (230, 10, 38)]:
        d.rectangle([bx, 88 - bh, bx + bw, 88], fill=hx("#241242"))
    # 近景楼群 + 窗灯阵列
    for bx, bw, bh, col in [(4, 22, 52, hx("#321860")), (34, 18, 66, hx("#3A1E6E")),
                            (60, 26, 56, hx("#321860")), (94, 20, 72, hx("#3A1E6E")),
                            (122, 24, 60, hx("#321860")), (154, 18, 76, hx("#3A1E6E")),
                            (180, 24, 58, hx("#321860")), (212, 22, 66, hx("#3A1E6E"))]:
        top = 108 - bh
        d.rectangle([bx, top, bx + bw, 108], fill=col)
        d.rectangle([bx, top, bx + bw, top + 2], fill=hx("#241242"))
        for wy in range(top + 4, 104, 6):                              # 窗
            for wx in range(bx + 2, bx + bw - 2, 5):
                r = rng.random()
                if r < 0.28:
                    c = hx("#F8B4D9") if rng.random() < 0.6 else hx("#FFD700")
                    d.rectangle([wx, wy, wx + 2, wy + 2], fill=c)
        d.point((bx + bw // 2, top - 1), fill=hx("#F2788A"))           # 楼顶航空灯
    # 梦幻的粉色光点轨迹
    for i, (mx, my) in enumerate([(70, 46), (76, 42), (84, 40), (92, 42)]):
        d.point((mx, my), fill=mix(hx("#F8B4D9"), hx("#2E1050"), i / 5))
    blob(d, 96, 42, 2, hx("#F8B4D9"))
    # 街道 + 车流灯
    d.rectangle([0, 108, LW, 135], fill=hx("#0E0618"))
    d.rectangle([0, 108, LW, 110], fill=hx("#1A0B2E"))
    for x in range(6, W, 18):                                          # 路灯
        d.line([(x, 112), (x, 122)], fill=hx("#241242"))
        d.point((x, 111), fill=hx("#FFD700"))
    for x in range(20, W, 46):                                         # 车灯光带（稀疏）
        d.line([(x, 126), (x + 5, 126)], fill=hx("#F8B4D9"))
        d.line([(x + 14, 130), (x + 19, 130)], fill=hx("#FFD700"))
    save(img, "city")


# ============================================================ 实验室
def lab() -> None:
    rng = random.Random(37)
    img, d = canvas()
    vgrad(d, hx("#0D1420"), hx("#0A0F18"), 0, 135)                     # 实验室内
    for y in range(0, 96, 12):                                         # 墙面板
        d.line([(0, y), (LW, y)], fill=hx("#131E2E"))
    for x in range(0, LW, 32):
        d.line([(x, 0), (x, 96)], fill=hx("#101A28"))
    # 顶部灯带
    d.rectangle([10, 4, 110, 5], fill=hx("#2E4A5A"))
    d.rectangle([12, 4, 108, 5], fill=hx("#5FA8C8"))
    d.rectangle([130, 4, 230, 5], fill=hx("#2E4A5A"))
    d.rectangle([132, 4, 228, 5], fill=hx("#5FA8C8"))
    # 侧墙屏幕
    d.rectangle([6, 20, 34, 44], fill=hx("#0A1A24"))
    d.rectangle([8, 22, 32, 42], fill=hx("#0E2836"))
    for i in range(4):                                                 # 屏幕波形
        for x in range(9, 32):
            y = 26 + i * 4 + int(2 * __import__("math").sin((x + i * 9) / 3))
            d.point((x, y), fill=[hx("#7BD3F0"), hx("#9B7BF0"), hx("#3FD99A"), hx("#F2788A")][i])
    # 培养舱 ×3
    def pod(px, pw, glow, entity=None):
        d.rectangle([px, 16, px + pw, 96], fill=hx("#12283A"))
        d.rectangle([px + 2, 18, px + pw - 2, 94], fill=glow)
        d.rectangle([px + 2, 18, px + pw - 2, 24], fill=mix(glow, hx("#FFFFFF"), 0.25))
        for i in range(6):                                             # 气泡
            bx = px + 4 + rng.randint(0, pw - 8)
            by = 30 + rng.randint(0, 58)
            d.point((bx, by), fill=mix(glow, hx("#FFFFFF"), 0.4))
        if entity:
            entity(px, pw)
        d.rectangle([px - 2, 94, px + pw + 2, 100], fill=hx("#1E3248"))
        d.rectangle([px - 2, 14, px + pw + 2, 17], fill=hx("#1E3248"))
    pod(48, 26, hx("#1A4A5A"))
    def mewtwo(px, pw):
        cx = px + pw // 2
        blob(d, cx, 48, 6, hx("#3A3A6A"))                              # 头
        d.rectangle([cx - 4, 52, cx + 4, 74], fill=hx("#3A3A6A"))      # 身
        d.line([(cx + 3, 56), (cx + 10, 70)], fill=hx("#3A3A6A"))      # 尾
        d.line([(cx - 4, 58), (cx - 9, 70)], fill=hx("#3A3A6A"))       # 臂
        d.point((cx - 2, 47), fill=hx("#B89BF8")); d.point((cx + 2, 47), fill=hx("#B89BF8"))  # 眼
    pod(102, 36, hx("#2A2A5A"), mewtwo)
    pod(172, 26, hx("#1A4A5A"))
    # 管线
    d.rectangle([0, 100, LW, 103], fill=hx("#1E3248"))
    for x in (74, 120, 198):
        d.point((x, 101), fill=hx("#F2788A") if x == 120 else hx("#7BD3F0"))
    # 地板 + 反光
    vgrad(d, hx("#0A0F18"), hx("#060A12"), 104, 135)
    d.rectangle([102, 106, 138, 108], fill=hx("#1A2C40"))
    d.rectangle([48, 106, 74, 107], fill=hx("#14202E"))
    d.rectangle([172, 106, 198, 107], fill=hx("#14202E"))
    for x in range(0, LW, 20):
        d.line([(x, 104), (x - 6, 135)], fill=hx("#080D16"))
    save(img, "lab")


if __name__ == "__main__":
    grassland(); ocean(); cave(); magma(); snowfield(); plant(); space(); city(); lab()
    print(f"\nwrote 9 scene wallpapers to {OUT.relative_to(REPO)}")
