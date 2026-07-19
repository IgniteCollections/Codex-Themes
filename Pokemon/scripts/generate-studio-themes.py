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


def data_url(path: Path) -> str:
    return f"data:{MIME[path.suffix]};base64,{base64.b64encode(path.read_bytes()).decode()}"


def build_scene_css(base_css: str, ui: dict[str, str], art_url: str) -> str:
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

        css = build_scene_css(base_css, s["ui"], data_url(bg))
        (out_dir / "scene.css").write_text(css, encoding="utf-8")
        print(f"pokemon-{var}: theme.json + background.png ({bg.stat().st_size // 1024} KB) + scene.css")

    print(f"\nwrote {len(SCENE_VARS)} theme packs to {OUT_ROOT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
