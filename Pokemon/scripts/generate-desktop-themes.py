#!/usr/bin/env python3
"""Generate Codex desktop-app themes (codex-theme-v1 strings) from
Pokemon/app/src/themes/scenes.ts.

For each scene, emits two artifacts to Pokemon/themes/desktop/:
  pokemon-<slug>.json             readable payload (for diffing/review)
  pokemon-<slug>.codex-theme.txt  paste-ready import string

Import: Codex desktop app -> Settings -> Appearance -> Import (dark slot).
Spec: docs/guides/codex-desktop-theme-development.md
"""

import json
import re
import sys
import urllib.parse
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCENES_TS = REPO / "Pokemon/app/src/themes/scenes.ts"
OUT_DIR = REPO / "Pokemon/themes/desktop"

SCENE_SLUG = {
    "grassland": "grassland",
    "ocean": "ocean",
    "cave": "cave",
    "magma": "magma",
    "snowfield": "snowfield",
    "plant": "power-plant",
    "space": "space",
    "city": "city",
    "lab": "lab",
}

SCENE_TITLE = {
    "grassland": "草原",
    "ocean": "海洋",
    "cave": "洞穴",
    "magma": "岩浆",
    "snowfield": "雪原",
    "plant": "无人发电厂",
    "space": "宇宙",
    "city": "城市",
    "lab": "实验室",
}

# contrast per scene (docs/themes/pokemon/desktop-design.md §3)
CONTRAST = {
    "grassland": 52,
    "ocean": 56,
    "cave": 50,
    "magma": 56,
    "snowfield": 60,
    "power-plant": 60,
    "space": 62,
    "city": 58,
    "lab": 55,
}


def parse_ui_colors(ts: str) -> dict[str, dict[str, str]]:
    scenes: dict[str, dict[str, str]] = {}
    for block in re.finditer(r"const\s+(\w+):\s*SceneDef\s*=\s*\{(.*?)\n\};", ts, re.S):
        var, body = block.group(1), block.group(2)
        if var not in SCENE_SLUG:
            continue
        ui_m = re.search(r"ui:\s*\{(.*?)\n\s*\},", body, re.S)
        if not ui_m:
            sys.exit(f"missing ui block for scene {var}")
        ui = dict(re.findall(r"'?([\w-]+)'?:\s*'(#[0-9A-Fa-f]{6})'", ui_m.group(1)))
        for key in ("bg", "fg", "prompt", "accent-2", "diff-add-fg", "diff-del-fg"):
            if key not in ui:
                sys.exit(f"missing ui.{key} for scene {var}")
        scenes[SCENE_SLUG[var]] = {k: v.upper() for k, v in ui.items()}
    return scenes


def build_payload(slug: str, ui: dict[str, str]) -> dict:
    return {
        "codeThemeId": "codex",
        "variant": "dark",
        "theme": {
            "accent": ui["prompt"],
            "surface": ui["bg"],
            "ink": ui["fg"],
            "contrast": CONTRAST[slug],
            "opaqueWindows": True,
            "fonts": {"code": None, "ui": None},
            "semanticColors": {
                "diffAdded": ui["diff-add-fg"],
                "diffRemoved": ui["diff-del-fg"],
                "skill": ui["accent-2"],
            },
        },
    }


def main() -> None:
    scenes = parse_ui_colors(SCENES_TS.read_text(encoding="utf-8"))
    missing = set(SCENE_SLUG.values()) - set(scenes)
    if missing:
        sys.exit(f"scenes.ts missing scenes: {missing}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for slug in SCENE_SLUG.values():
        payload = build_payload(slug, scenes[slug])
        compact = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        theme_string = f"codex-theme-v1:{urllib.parse.quote(compact)}"

        (OUT_DIR / f"pokemon-{slug}.json").write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        (OUT_DIR / f"pokemon-{slug}.codex-theme.txt").write_text(
            theme_string + "\n", encoding="utf-8"
        )
        print(f"wrote pokemon-{slug} ({len(theme_string)} chars)")


if __name__ == "__main__":
    main()
