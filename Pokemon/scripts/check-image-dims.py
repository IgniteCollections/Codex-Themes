#!/usr/bin/env python3
"""Verify generated wallpapers have the expected dimensions (binary PNG 不逐字节校验).

PNG 字节受 Pillow/zlib 版本影响不可跨环境复现（CI vs 本地），但尺寸是确定性的：
网站壁纸 1920×1080，工作室主题包壁纸 3840×2160。尺寸不符 = 生成管线真出错。

    python3 Pokemon/scripts/check-image-dims.py
"""

import struct
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CHECKS = [
    ("Pokemon/app/public/scene-{s}.png", 1920, 1080),
    ("Codex-Skin-Store/src-tauri/resources/themes/pokemon-{s}/background.png", 3840, 2160),
]
SCENES = ["grassland", "ocean", "cave", "magma", "snowfield", "plant", "space", "city", "lab"]


def png_dims(path: Path) -> tuple[int, int]:
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {path}")
    w, h = struct.unpack(">II", head[16:24])
    return w, h


def main() -> int:
    bad = []
    for tpl, ew, eh in CHECKS:
        for s in SCENES:
            p = REPO / tpl.format(s=s)
            if not p.exists():
                bad.append(f"missing: {p.relative_to(REPO)}")
                continue
            try:
                w, h = png_dims(p)
            except Exception as e:
                bad.append(f"{p.relative_to(REPO)}: {e}")
                continue
            if (w, h) != (ew, eh):
                bad.append(f"{p.relative_to(REPO)}: {w}x{h} != expected {ew}x{eh}")
    if bad:
        print("\n".join(bad))
        return 1
    print(f"image dims OK ({len(CHECKS) * len(SCENES)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
