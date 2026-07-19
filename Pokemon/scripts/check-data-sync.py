#!/usr/bin/env python3
"""Verify the two copies of shared theme data stay in sync (P1 数据源分裂).

scenes.ts / mascotArt.ts 在 Pokemon/app 与 Codex-Skin-Store 各有一份副本。
本脚本对两份做逐字节 diff，不一致即非零退出（供 CI data-sync job 调用）。

    python3 Pokemon/scripts/check-data-sync.py
"""

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PAIRS = [
    ("Pokemon/app/src/themes/scenes.ts", "Codex-Skin-Store/src/scene-data.ts"),
    ("Pokemon/app/src/themes/mascotArt.ts", "Codex-Skin-Store/src/mascotArt.ts"),
]


def main() -> int:
    bad = []
    for a, b in PAIRS:
        pa, pb = REPO / a, REPO / b
        if not pa.exists() or not pb.exists():
            bad.append(f"missing: {a} or {b}")
            continue
        if pa.read_bytes() != pb.read_bytes():
            bad.append(f"drift: {a} != {b}")
    if bad:
        print("\n".join(bad))
        print("\n修复：以 Pokemon/app 为准，cp 到 Codex-Skin-Store（scene-data.ts / mascotArt.ts）")
        return 1
    print(f"data in sync ({len(PAIRS)} pairs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
