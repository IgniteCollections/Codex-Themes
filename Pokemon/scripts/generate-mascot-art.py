#!/usr/bin/env python3
"""Generate mascotArt.ts — the base64 pokemon sprite library.

Reads every pokemon id referenced in Pokemon/app/src/themes/scenes.ts
(pokemon + starterLine + legendaries), crops each sprite to its alpha
bounding box, and emits dual-resolution (96px / 48px) base64 data URLs to:

    Pokemon/app/src/themes/mascotArt.ts
    Codex-Skin-Store/src/mascotArt.ts

Regenerate after adding sprites or changing the roster:

    python3 Pokemon/scripts/generate-mascot-art.py
"""

import base64
import io
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

REPO = Path(__file__).resolve().parents[2]
SCENES_TS = REPO / "Pokemon/app/src/themes/scenes.ts"
PUBLIC = REPO / "Pokemon/app/public/pokemon"
OUT = [
    REPO / "Pokemon/app/src/themes/mascotArt.ts",
    REPO / "Codex-Skin-Store/src/mascotArt.ts",
]

# 官方人气补位（不在 scenes.ts 里也要进库，与 roster-rebalance 一致）
EXTRA_IDS = [59, 68, 94, 143, 248, 257, 282, 448, 571, 658]


def collect_ids() -> list[int]:
    ts = SCENES_TS.read_text(encoding="utf-8")
    ids = {int(m.group(1)) for m in re.finditer(r"\{ id: (\d+), name:", ts)}
    ids.update(EXTRA_IDS)
    return sorted(ids)


def data_url(img: Image.Image, target_h: int) -> str:
    w, h = img.size
    resized = img.resize((round(w * target_h / h), target_h), Image.NEAREST)
    buf = io.BytesIO()
    resized.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    import numpy as np

    ids = collect_ids()
    art: dict[str, dict[str, str]] = {}
    missing = []
    for pid in ids:
        f = PUBLIC / f"{pid:03d}.png"
        if not f.exists():
            missing.append(pid)
            continue
        im = Image.open(f).convert("RGBA")
        alpha = np.array(im)[:, :, 3]
        rows, cols = np.where(alpha > 8)
        pad = 3
        im = im.crop((
            max(0, cols.min() - pad), max(0, rows.min() - pad),
            min(im.width, cols.max() + pad), min(im.height, rows.max() + pad),
        ))
        art[str(pid)] = {"full": data_url(im, 96), "half": data_url(im, 48)}

    module = (
        "/* 宝可梦像素画库（alpha 裁边 sprite，双分辨率 base64 内嵌）\n"
        "   由 Pokemon/scripts/generate-mascot-art.py 从 scenes.ts 全阵容生成；\n"
        "   full=96px 高，half=48px。终端横幅/图鉴用。 */\n\n"
        "export const POKEMON_ART: Record<string, { full: string; half: string }> = "
        + json.dumps(art, ensure_ascii=False)
        + "\n\nexport const MASCOT_ART = POKEMON_ART;\n"
    )
    for out in OUT:
        out.write_text(module, encoding="utf-8")
        print(f"wrote {out.relative_to(REPO)} ({len(art)} pokemon)")
    if missing:
        print(f"warning: missing sprites for ids {missing}", file=sys.stderr)


if __name__ == "__main__":
    main()
