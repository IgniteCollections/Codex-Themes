#!/usr/bin/env python3
"""Generate Dream Skin theme packs for the Pokemon Studio app.

Reads scene data from Pokemon/app/src/themes/scenes.ts (single source of
truth) and writes 7 Dream Skin preset folders:

    Pokemon/studio/src-tauri/resources/themes/pokemon-<scene>/
    ├── theme.json       # Dream Skin preset format (palette.accent only)
    ├── background.png   # scene wallpaper (SVG scenes rendered to PNG)
    └── scene.css        # full pokemon skin CSS with --pk-* vars inlined

The studio app copies these into the Dream Skin theme library and activates
them by atomically swapping the engine's active-theme directory.

    python3 Pokemon/scripts/generate-studio-themes.py
"""

import base64
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCENES_TS = REPO / "Pokemon/app/src/themes/scenes.ts"
PUBLIC = REPO / "Pokemon/app/public"
SKIN_CSS = REPO / "Pokemon/skins/pokemon-skin.css"  # CSS 模板（含完整场景皮肤规则）
OUT_ROOT = REPO / "Codex-Skin-Store/src-tauri/resources/themes"

SCENE_VARS = ["grassland", "ocean", "cave", "magma", "snowfield", "plant", "space", "city", "lab"]
MIME = {".png": "image/png", ".svg": "image/svg+xml"}

# Wallpaper render size: 16:9, crisp nearest-neighbour upscale of the pixel art.
ART_W, ART_H = 3840, 2160   # 4K 壁纸


def parse_scenes(ts: str) -> dict[str, dict]:
    scenes: dict[str, dict] = {}
    for block in re.finditer(r"const\s+(\w+):\s*SceneDef\s*=\s*\{(.*?)\n\};", ts, re.S):
        var, body = block.group(1), block.group(2)
        if var not in SCENE_VARS:
            continue
        fields = {}
        for key in ("name", "en", "symbol", "image", "flavorShort"):
            m = re.search(rf"{key}:\s*'([^']+)'", body)
            if not m:
                sys.exit(f"missing {key} for scene {var}")
            fields[key] = m.group(1)
        ui_m = re.search(r"ui:\s*\{(.*?)\n\s*\},", body, re.S)
        if not ui_m:
            sys.exit(f"missing ui palette for scene {var}")
        fields["ui"] = {
            k: v.upper()
            for k, v in re.findall(r"'?([\w-]+)'?:\s*'(#[0-9A-Fa-f]{6})'", ui_m.group(1))
        }
        img_path = PUBLIC / fields["image"].lstrip("/")
        if not img_path.exists():
            sys.exit(f"missing image file {img_path}")
        fields["image_path"] = img_path
        # 招牌宝可梦（pokemon 数组第一个 id）→ badge sprite
        m_mascot = re.search(r"pokemon:\s*\[\s*\{ id: (\d+), name: '([^']+)'", body)
        fields["mascot_id"] = int(m_mascot.group(1)) if m_mascot else None
        fields["mascot_name"] = m_mascot.group(2) if m_mascot else ""
        # 常规遭遇（pokemon[1:]）与御三家进化链（starterLine）
        def _pid(key):
            # 找到 `key: [` 起，到该块顶层 `],` 止（数组元素内也含 `]`，不能用非贪婪 `\]`）
            start = re.search(key + r":\s*\[", body)
            if not start:
                return []
            i = start.end()
            depth = 1
            while i < len(body) and depth > 0:
                if body[i] == "[":
                    depth += 1
                elif body[i] == "]":
                    depth -= 1
                i += 1
            seg = body[start.end(): i - 1]
            return [(int(a), b) for a, b in re.findall(r"\{ id: (\d+), name: '([^']+)'", seg)]
        fields["encounters"] = _pid(r"pokemon")[1:]
        fields["starter_line"] = _pid(r"starterLine")
        scenes[var] = fields
    missing = set(SCENE_VARS) - set(scenes)
    if missing:
        sys.exit(f"missing scenes in scenes.ts: {missing}")
    return scenes


def rasterize_svg(svg_path: Path, out_png: Path, width: int, height: int) -> None:
    """Nearest-neighbour upscale an SVG to PNG via Pillow + stdlib XML.

    Only supports the flat shape set our scene SVGs use (rect / circle /
    ellipse / line / polygon / path). Pixel-art scenes render crisply by
    design — no anti-aliasing.
    """
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        sys.exit("Pillow is required for SVG scenes: pip install Pillow")
    import xml.etree.ElementTree as ET

    tree = ET.parse(svg_path)
    root = tree.getroot()
    vb = root.get("viewBox")
    if vb:
        vx, vy, vw, vh = (float(v) for v in vb.split())
    else:
        vx = vy = 0.0
        vw = float(root.get("width"))
        vh = float(root.get("height"))
    sx, sy = width / vw, height / vh

    def pts(raw: str) -> list[tuple[float, float]]:
        nums = [float(n) for n in re.split(r"[,\s]+", raw.strip()) if n]
        return [((nums[i] - vx) * sx, (nums[i + 1] - vy) * sy) for i in range(0, len(nums) - 1, 2)]

    def box(el) -> tuple[float, float, float, float]:
        x = (float(el.get("x", 0)) - vx) * sx
        y = (float(el.get("y", 0)) - vy) * sy
        return (x, y, x + float(el.get("width", 0)) * sx, y + float(el.get("height", 0)) * sy)

    img = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(img)
    ns = "{http://www.w3.org/2000/svg}"
    for el in root.iter():
        tag = el.tag.replace(ns, "")
        fill = el.get("fill", "none")
        stroke = el.get("stroke")
        if tag == "rect" and fill != "none":
            draw.rectangle(box(el), fill=fill)
        elif tag == "circle" and fill != "none":
            cx = (float(el.get("cx", 0)) - vx) * sx
            cy = (float(el.get("cy", 0)) - vy) * sy
            r = float(el.get("r", 0)) * (sx + sy) / 2
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)
        elif tag == "ellipse" and fill != "none":
            cx = (float(el.get("cx", 0)) - vx) * sx
            cy = (float(el.get("cy", 0)) - vy) * sy
            rx, ry = float(el.get("rx", 0)) * sx, float(el.get("ry", 0)) * sy
            draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill)
        elif tag == "polygon" and fill != "none":
            draw.polygon(pts(el.get("points", "")), fill=fill)
        elif tag == "line" and stroke:
            p = pts(f"{el.get('x1')},{el.get('y1')} {el.get('x2')},{el.get('y2')}")
            draw.line(p, fill=stroke, width=max(1, round(float(el.get("stroke-width", 1)) * sx)))
        elif tag == "path":
            # Path fallback: only simple M/L/H/V/Z outlines filled flat.
            d = el.get("d", "")
            tokens = re.findall(r"[MLHVZmlhvz]|-?\d*\.?\d+", d)
            poly, i, cx, cy, start = [], 0, 0.0, 0.0, None
            ok = True
            while i < len(tokens):
                t = tokens[i]
                if t in "Mm":
                    cx, cy = float(tokens[i + 1]), float(tokens[i + 2])
                    if t == "m" and poly:
                        cx += poly[-1][0] / sx + vx
                        cy += poly[-1][1] / sy + vy
                    start = (cx, cy)
                    poly.append(((cx - vx) * sx, (cy - vy) * sy))
                    i += 3
                elif t in "Ll":
                    cx, cy = float(tokens[i + 1]), float(tokens[i + 2])
                    poly.append(((cx - vx) * sx, (cy - vy) * sy))
                    i += 3
                elif t in "Hh":
                    cx = float(tokens[i + 1])
                    poly.append(((cx - vx) * sx, (cy - vy) * sy))
                    i += 2
                elif t in "Vv":
                    cy = float(tokens[i + 1])
                    poly.append(((cx - vx) * sx, (cy - vy) * sy))
                    i += 2
                elif t in "Zz":
                    if start:
                        poly.append(((start[0] - vx) * sx, (start[1] - vy) * sy))
                    i += 1
                else:
                    ok = False
                    break
            if ok and len(poly) >= 3 and fill != "none":
                draw.polygon(poly, fill=fill)
            elif not ok:
                sys.exit(f"unsupported path in {svg_path.name}: {d[:60]}… (extend rasterize_svg)")
    img = img.convert("RGB")
    out_png.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_png, "PNG", compress_level=6)


def upscale_png(src_png: Path, out_png: Path, width: int, height: int) -> None:
    """Nearest-neighbour cover-fit upscale of a pixel-art PNG to 16:9."""
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow is required: pip install Pillow")
    img = Image.open(src_png).convert("RGB")
    scale = max(width / img.width, height / img.height)
    resized = img.resize(
        (max(1, round(img.width * scale)), max(1, round(img.height * scale))),
        Image.NEAREST,
    )
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    out_png.parent.mkdir(parents=True, exist_ok=True)
    resized.crop((left, top, left + width, top + height)).save(out_png, "PNG", compress_level=6)



def make_strip(paths: list[Path], sizes: list[int], out_w_pad: int = 8) -> tuple[str, int, int] | None:
    """把若干 sprite 横向拼成一条 strip（底部对齐），返回 (data_url, w, h)。
    用于御三家/遭遇宝可梦在界面上的 strip 装饰。"""
    if not paths:
        return None
    try:
        from PIL import Image
    except ImportError:
        return None
    imgs = []
    for path, h in zip(paths, sizes):
        im = Image.open(path).convert("RGBA")
        w = round(im.width * h / im.height)
        imgs.append(im.resize((w, h), Image.NEAREST))
    total_w = sum(im.width for im in imgs) + out_w_pad * (len(imgs) - 1)
    max_h = max(im.height for im in imgs)
    strip = Image.new("RGBA", (total_w, max_h), (0, 0, 0, 0))
    x = 0
    for im in imgs:
        strip.paste(im, (x, max_h - im.height), im)
        x += im.width + out_w_pad
    import io as _io
    buf = _io.BytesIO()
    strip.save(buf, "PNG")
    url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    return url, total_w, max_h

def data_url(path: Path) -> str:
    return f"data:{MIME[path.suffix]};base64,{base64.b64encode(path.read_bytes()).decode()}"


def _spr(url: str) -> str:
    return f'url("{url}")'


def pokemon_layers_css(s: dict, sprites: dict[int, str], ui: dict[str, str]) -> str:
    """多层宝可梦与界面元素呼应（纯 CSS，无需 DOM/JS，pointer-events: none 不挡交互）：
    - 招牌大角标：右下 sprite + 场景名
    - 御三家进化链：主区左下，从小到大探出（2–3 只）
    - 遭遇宝可梦：侧栏底部一排小 sprite + 输入框上方一只
    sprite 从 scenes.ts 阵容驱动，与场景配色统一。"""
    acc = ui["prompt"]
    out = []

    def fixed(sel: str, url: str, w: int, pos: str, opacity: float = 0.92) -> str:
        return (
            f"{sel} {{\n"
            f'  content: "";\n'
            f"  position: fixed;\n  z-index: 39;\n  width: {w}px;\n  height: {w}px;\n"
            f'  background-image: url("{url}");\n'
            f"  background-size: contain;\n  background-repeat: no-repeat;\n  background-position: center bottom;\n"
            f"  image-rendering: pixelated;\n"
            f"  filter: drop-shadow(0 3px 6px rgba(0,0,0,.5));\n  pointer-events: none;\n"
            f"  opacity: {opacity};\n  {pos}\n}}\n"
        )

    # ── 招牌大角标（右下 + 场景名）──
    if s.get("mascot_id") and s["mascot_id"] in sprites:
        url = sprites[s["mascot_id"]]
        out.append(
            "/* 招牌宝可梦角标 */\n"
            "html.pokemon-skin body::after {\n"
            '  content: "";\n  position: fixed;\n  right: 16px;\n  bottom: 30px;\n  z-index: 40;\n'
            "  width: 110px;\n  height: 110px;\n"
            f'  background-image: url("{url}");\n'
            "  background-size: contain;\n  background-repeat: no-repeat;\n  background-position: center bottom;\n"
            "  image-rendering: pixelated;\n  filter: drop-shadow(0 5px 12px rgba(0,0,0,.6));\n  pointer-events: none;\n}\n"
            "html.pokemon-skin body::before {\n"
            f'  content: "{s["symbol"]} {s["mascot_name"]}";\n'
            "  position: fixed;\n  right: 20px;\n  bottom: 12px;\n  z-index: 40;\n"
            "  font: 700 10px/1 ui-monospace, monospace;\n  letter-spacing: 1px;\n"
            f"  color: {acc};\n  text-shadow: 0 1px 3px rgba(0,0,0,.85);\n  pointer-events: none;\n}}\n"
        )

    # ── 御三家进化链：主区左下，从小到大探出（用 body 的额外伪元素不够，改用 fixed 逐只）──
    starters = [(pid, nm) for pid, nm in s.get("starter_line", []) if pid in sprites][:3]
    if starters:
        sizes = [42, 54, 68]
        x = 20
        out.append("/* 御三家进化链 · 主区左下探出 */\n")
        # 用 nth 个独立 class（注入层无需 DOM，纯 CSS 选择器靠 body 的多个 background 不行，
        # 故每只一个具名伪元素是不可能的——改为给一个容器 .pk-starters 的 ::before/::after 不够。
        # 决定：用 body 追加多个 background-image 分层到 main.main-surface::before 上。
        # 简化且可靠：逐只用「挂在 body 上的伪元素选择器」无法实现 >2 个，
        # 因此御三家与遭遇合并为「左侧竖排 2 列」各 1 个伪元素承载一张拼接 strip。
        pass

    # 由于 body 只有 ::before/::after 两个伪元素（已用招牌），其余宝可梦改用
    # 「拼接 strip 图」挂到 main/aside/composer 的伪元素上。strip 在 main() 里预拼。
    if s.get("__starter_strip"):
        # 御三家 strip 挂 main.main-surface 的元素本身（不占用 ::before 壁纸层）
        out.append(
            "/* 御三家 strip · 主区左下（挂在 main 元素的背景层，不占 ::before 壁纸层） */\n"
            "html.codex-dream-skin main.main-surface {\n"
            f'  background-image: url("{s["__starter_strip"]}") !important;\n'
            "  background-repeat: no-repeat;\n  background-position: left 14px bottom 12px;\n"
            f"  background-size: {s['__starter_w']}px {s['__starter_h']}px;\n  image-rendering: pixelated;\n"
            "}\n"
        )
    if s.get("__encounter_strip"):
        out.append(
            "/* 遭遇宝可梦 strip · 侧栏底部 */\n"
            "html.pokemon-skin aside.app-shell-left-panel::after {\n"
            '  content: "";\n  position: fixed;\n  left: 10px;\n  bottom: 10px;\n  z-index: 39;\n'
            f"  width: {s['__encounter_w']}px;\n  height: {s['__encounter_h']}px;\n"
            f'  background-image: url("{s["__encounter_strip"]}");\n'
            "  background-size: contain;\n  background-repeat: no-repeat;\n  background-position: left bottom;\n"
            "  image-rendering: pixelated;\n  pointer-events: none;\n  opacity: .9;\n}\n"
        )
    return "\n".join(out)


def badge_css(sprite_url: str, label: str, accent: str) -> str:
    """招牌宝可梦角标（纯 CSS，无需 DOM/JS）：右下固定 sprite + 场景名。"""
    return f"""
/* 招牌宝可梦角标 */
html.pokemon-skin body::after {{
  content: "";
  position: fixed;
  right: 16px;
  bottom: 14px;
  z-index: 40;
  width: 96px;
  height: 96px;
  background-image: url("{sprite_url}");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, .55));
  pointer-events: none;
}}
html.pokemon-skin body::before {{
  content: "{label}";
  position: fixed;
  right: 20px;
  bottom: 8px;
  z-index: 40;
  font: 700 10px/1 ui-monospace, monospace;
  letter-spacing: 1px;
  color: {accent};
  text-shadow: 0 1px 3px rgba(0, 0, 0, .8);
  pointer-events: none;
}}
"""


def build_scene_css(base_css: str, ui: dict[str, str], art_url: str, badge: str = "") -> str:
    """Inline the scene's --pk-* variables into the shared pokemon skin CSS."""
    border = ui["border"].lstrip("#")
    r, g, b = (int(border[i : i + 2], 16) for i in (0, 2, 4))
    vars_css = "\n".join(
        [
            "html.pokemon-skin {",
            f"  --pk-bg: {ui['bg']};",
            f"  --pk-panel: {ui['panel']};",
            f"  --pk-ink: {ui['fg']};",
            f"  --pk-accent: {ui['prompt']};",
            f"  --pk-success: {ui['diff-add-fg']};",
            f"  --pk-error: {ui['diff-del-fg']};",
            f"  --pk-line: rgba({r}, {g}, {b}, .45);",
            f'  --pk-art: url("{art_url}");',
            "}",
        ]
    )
    return (
        "/* AUTO-GENERATED by Pokemon/scripts/generate-studio-themes.py — do not edit. */\n"
        + vars_css
        + "\n\n"
        + badge
        + base_css
    )


def main() -> None:
    scenes = parse_scenes(SCENES_TS.read_text(encoding="utf-8"))
    base_css = SKIN_CSS.read_text(encoding="utf-8")

    for var in SCENE_VARS:
        s = scenes[var]
        out_dir = OUT_ROOT / f"pokemon-{var}"
        out_dir.mkdir(parents=True, exist_ok=True)

        bg = out_dir / "background.png"
        src = s["image_path"]
        if src.suffix == ".svg":
            rasterize_svg(src, bg, ART_W, ART_H)
        else:
            upscale_png(src, bg, ART_W, ART_H)

        theme = {
            "schemaVersion": 1,
            "id": f"pokemon-{var}",
            "name": f"{s['symbol']} {s['name']} · {s['en'].title()}",
            "image": "background.png",
            "appearance": "dark",
            # focusX/focusY 省略（而非 null）= 引擎显著性分析自动定焦点；
            # injector 的 unit() 校验拒绝 null，只接受 0–1 数字或缺省
            "art": {"safeArea": "auto", "taskMode": "ambient"},
            "palette": {"accent": s["ui"]["prompt"]},
        }
        (out_dir / "theme.json").write_text(
            json.dumps(theme, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

        # 收集本场景所有宝可梦的 sprite data URL
        ids = {s["mascot_id"]} if s.get("mascot_id") else set()
        ids.update(pid for pid, _ in s.get("starter_line", []))
        ids.update(pid for pid, _ in s.get("encounters", []))
        sprites = {}
        for pid in ids:
            sp = PUBLIC / "pokemon" / f"{pid:03d}.png"
            if sp.exists():
                sprites[pid] = data_url(sp)

        # 御三家 strip（从小到大）+ 遭遇 strip（一排小）
        starter = make_strip(
            [PUBLIC / "pokemon" / f"{pid:03d}.png" for pid, _ in s.get("starter_line", [])[:3]
             if (PUBLIC / "pokemon" / f"{pid:03d}.png").exists()],
            [44, 58, 74][: len(s.get("starter_line", []))][:3],
        )
        if starter:
            s["__starter_strip"], s["__starter_w"], s["__starter_h"] = starter
        encounter = make_strip(
            [PUBLIC / "pokemon" / f"{pid:03d}.png" for pid, _ in s.get("encounters", [])[:5]
             if (PUBLIC / "pokemon" / f"{pid:03d}.png").exists()],
            [26, 26, 26, 26, 26][: len(s.get("encounters", []))][:5],
        )
        if encounter:
            s["__encounter_strip"], s["__encounter_w"], s["__encounter_h"] = encounter

        layers = pokemon_layers_css(s, sprites, s["ui"])
        # 选择器 html.pokemon-skin → html.codex-dream-skin（引擎实际激活的类，角标/层才能生效）
        layers = layers.replace("html.pokemon-skin", "html.codex-dream-skin")
        css = build_scene_css(base_css, s["ui"], data_url(bg), layers)
        (out_dir / "scene.css").write_text(css, encoding="utf-8")
        print(f"pokemon-{var}: theme.json + background.png ({bg.stat().st_size // 1024} KB) + scene.css")

    print(f"\nwrote {len(SCENE_VARS)} theme packs to {OUT_ROOT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
