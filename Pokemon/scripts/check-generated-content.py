#!/usr/bin/env python3
"""Semantic checks on generated artifacts (不受 Pillow/zlib 版本字节差异影响).

纯文本产物由 git diff 保证；本脚本校验含 PNG base64 产物与数据源的语义一致：
- scene.css 的 --pk-error 色值 == scenes.ts 该场景 ui.error
- mascotArt.ts 的宝可梦 id 集合 ⊇ scenes.ts 引用的全部 id
- 主题包 theme.json 的 id/accent == scenes.ts 该场景 ui.prompt

    python3 Pokemon/scripts/check-generated-content.py
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCENES_TS = REPO / "Pokemon/app/src/themes/scenes.ts"
SCENE_VARS = ["grassland", "ocean", "cave", "magma", "snowfield", "plant", "space", "city", "lab"]


def parse_scenes(ts: str) -> dict:
    scenes = {}
    for block in re.finditer(r"const\s+(\w+):\s*SceneDef\s*=\s*\{(.*?)\n\};", ts, re.S):
        var, body = block.group(1), block.group(2)
        if var not in SCENE_VARS:
            continue
        ui_m = re.search(r"ui:\s*\{(.*?)\n\s*\},", body, re.S)
        ui = dict(re.findall(r"'?([\w-]+)'?:\s*'(#[0-9A-Fa-f]{6})'", ui_m.group(1))) if ui_m else {}
        ids = {int(x) for x in re.findall(r"\{ id: (\d+), name:", body)}
        scenes[var] = {"ui": {k: v.upper() for k, v in ui.items()}, "ids": ids}
    return scenes


def main() -> int:
    scenes = parse_scenes(SCENES_TS.read_text(encoding="utf-8"))
    bad = []

    # 1) scene.css 的 --pk-error == ui.error
    for var, s in scenes.items():
        css_path = REPO / f"Codex-Skin-Store/src-tauri/resources/themes/pokemon-{var}/scene.css"
        if not css_path.exists():
            bad.append(f"missing scene.css: pokemon-{var}")
            continue
        css = css_path.read_text(encoding="utf-8")
        m = re.search(r"--pk-error:\s*(#[0-9A-Fa-f]{6})", css)
        # pk-error 映射的是 ui['diff-del-fg']（generate-studio-themes 的字段映射）
        expect = s["ui"].get("diff-del-fg", "").upper()
        if not m or m.group(1).upper() != expect:
            bad.append(f"pokemon-{var}: scene.css --pk-error {m and m.group(1)} != scenes.ui.diff-del-fg {expect}")

    # 2) mascotArt id 集合 ⊇ scenes 引用 id（两处一致）
    art = (REPO / "Pokemon/app/src/themes/mascotArt.ts").read_text(encoding="utf-8")
    art_ids = {int(x) for x in re.findall(r'"(\d+)": \{"full"', art)}
    need = set().union(*(s["ids"] for s in scenes.values()))
    missing = need - art_ids
    if missing:
        bad.append(f"mascotArt missing pokemon ids: {sorted(missing)}")

    # 3) theme.json accent == ui.prompt
    for var, s in scenes.items():
        tj_path = REPO / f"Codex-Skin-Store/src-tauri/resources/themes/pokemon-{var}/theme.json"
        if not tj_path.exists():
            bad.append(f"missing theme.json: pokemon-{var}")
            continue
        tj = json.loads(tj_path.read_text(encoding="utf-8"))
        accent = tj.get("palette", {}).get("accent", "").upper()
        if accent != s["ui"].get("prompt", "").upper():
            bad.append(f"pokemon-{var}: theme.json accent {accent} != scenes.ui.prompt {s['ui'].get('prompt')}")

    if bad:
        print("\n".join(bad))
        return 1
    print(f"generated content OK ({len(scenes)} scenes, {len(art_ids)} pokemon)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
