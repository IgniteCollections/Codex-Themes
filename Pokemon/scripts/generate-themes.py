#!/usr/bin/env python3
"""Generate pokemon-*.tmTheme files from Pokemon/app/src/data/scenes.ts.

Parses the scene palette/name/prompt info out of scenes.ts (single source of
truth) and emits TextMate themes to Pokemon/themes/. Regenerate after any
palette change:

    python3 Pokemon/scripts/generate-themes.py

Validate output with:  plutil -lint Pokemon/themes/*.tmTheme
"""

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCENES_TS = REPO / "Pokemon/app/src/data/scenes.ts"
OUT_DIR = REPO / "Pokemon/themes"

# Per-scene TextMate scope mapping, derived from the 5-color palette by the
# rules in docs/pokemon/pokemon-theme-design.md §3.2:
#   keyword=主色, string=第二强调, number=点缀, comment=低亮 ink, fn=暖色,
#   diff add/del = 语义绿/红（场景内保持可读的替换色）
DERIVED = {
    "grassland": {
        "comment": "#6E8F5A",
        "fn": "#E8A93C",
        "diff_add": "#7AC74C",
        "diff_del": "#D4543A",
        "line_highlight": "#274A1A",
    },
    "ocean": {
        "comment": "#4E7391",
        "fn": "#F2B84B",
        "diff_add": "#3FD0A7",
        "diff_del": "#FF7F50",
        "line_highlight": "#0F4A73",
    },
    "cave": {
        "comment": "#6E6E78",
        "fn": "#8A9A5B",
        "diff_add": "#8A9A5B",
        "diff_del": "#B0526B",
        "line_highlight": "#2E2E36",
    },
    "magma": {
        "comment": "#6E6259",
        "fn": "#F5A623",
        "diff_add": "#B8C93A",
        "diff_del": "#D43D2A",
        "line_highlight": "#2E1F18",
    },
    "snowfield": {
        "comment": "#5B7A94",
        "fn": "#4B7FB8",
        "diff_add": "#4FBF9A",
        "diff_del": "#D4647C",
        "line_highlight": "#DDEAF4",
    },
    "power-plant": {
        "comment": "#5A616B",
        "fn": "#9EFF00",
        "diff_add": "#9EFF00",
        "diff_del": "#E05A2B",
        "line_highlight": "#2E343D",
    },
}

SCENE_TITLE = {
    "grassland": "Grassland 草原",
    "ocean": "Ocean 海洋",
    "cave": "Cave 洞穴",
    "magma": "Magma 岩浆",
    "snowfield": "Snowfield 雪原",
    "power-plant": "Power Plant 无人发电厂",
}

SCOPES = [
    ("Comment", "comment, punctuation.definition.comment", "comment", None),
    ("Keyword", "keyword, storage, storage.type, keyword.control", "primary", "bold"),
    ("String", "string, string.quoted", "secondary", None),
    ("Number", "constant.numeric, constant.language", "accent", None),
    ("Function", "entity.name.function, support.function, meta.function-call", "fn", None),
    ("Type", "entity.name.type, entity.name.class, support.type, support.class", "accent", None),
    ("Variable", "variable, variable.parameter, variable.other", "surface", None),
    ("Operator", "keyword.operator, punctuation", "surface", None),
    ("Markup heading", "markup.heading, entity.name.section", "primary", "bold"),
    ("Markup bold", "markup.bold", "surface", "bold"),
    ("Markup italic", "markup.italic", "surface", "italic"),
    ("Markup code", "markup.inline.raw, markup.fenced_code", "secondary", None),
    ("Diff added", "markup.inserted, markup.inserted.diff", "diff_add", None),
    ("Diff deleted", "markup.deleted, markup.deleted.diff", "diff_del", None),
    ("Diff changed", "markup.changed, markup.changed.diff", "accent", None),
]


def parse_scenes(ts: str) -> dict[str, dict[str, str]]:
    scenes: dict[str, dict[str, str]] = {}
    for block in re.finditer(r'\{\s*\n\s*id:\s*"([\w-]+)",(.*?)\n\s*\},', ts, re.S):
        sid, body = block.group(1), block.group(2)
        entry: dict[str, str] = {"id": sid}
        for key in ("name", "nameEn", "location", "promptSymbol"):
            m = re.search(rf'{key}:\s*"((?:[^"\\]|\\.)*)"', body)
            if m:
                entry[key] = m.group(1)
        for key in ("primary", "secondary", "accent", "surface", "ink"):
            m = re.search(rf'{key}:\s*"(#[0-9A-Fa-f]{{6}})"', body)
            if not m:
                sys.exit(f"missing color {key} for scene {sid}")
            entry[key] = m.group(1).upper()
        scenes[sid] = entry
    return scenes


def plist_dict(items: list[tuple[str, str]], indent: int) -> str:
    pad = "  " * indent
    lines = [f"{pad}<dict>"]
    for k, v in items:
        lines.append(f"{pad}  <key>{k}</key>")
        lines.append(f"{pad}  <string>{v}</string>")
    lines.append(f"{pad}</dict>")
    return "\n".join(lines)


def render(sid: str, s: dict[str, str]) -> str:
    d = DERIVED[sid]
    color = {**{k: s[k] for k in ("primary", "secondary", "accent", "surface", "ink")}, **d}
    entries = []

    global_settings = plist_dict(
        [
            ("foreground", s["surface"]),
            ("background", s["ink"]),
            ("selection", s["secondary"]),
            ("lineHighlight", d["line_highlight"]),
            ("caret", s["accent"]),
        ],
        3,
    )
    entries.append(f"      <dict>\n        <key>settings</key>\n{global_settings}\n      </dict>")

    for name, scope, color_key, font_style in SCOPES:
        settings_items = [("foreground", color[color_key])]
        if font_style:
            settings_items.append(("fontStyle", font_style))
        settings = plist_dict(settings_items, 4)
        head = (
            f'        <key>name</key>\n'
            f'        <string>{name}</string>\n'
            f'        <key>scope</key>\n'
            f'        <string>{scope}</string>'
        )
        entries.append(
            f"      <dict>\n{head}\n        <key>settings</key>\n{settings}\n      </dict>"
        )

    body = "\n".join(entries)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Pokemon {SCENE_TITLE[sid]} — generated from src/data/scenes.ts, do not edit by hand -->
<plist version="1.0">
  <dict>
    <key>name</key>
    <string>Pokemon {SCENE_TITLE[sid]}</string>
    <key>settings</key>
    <array>
{body}
    </array>
  </dict>
</plist>
"""


def main() -> None:
    scenes = parse_scenes(SCENES_TS.read_text(encoding="utf-8"))
    missing = set(DERIVED) - set(scenes)
    if missing:
        sys.exit(f"scenes.ts missing scenes: {missing}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for sid in DERIVED:
        out = OUT_DIR / f"pokemon-{sid}.tmTheme"
        out.write_text(render(sid, scenes[sid]), encoding="utf-8")
        print(f"wrote {out.relative_to(REPO)}")


if __name__ == "__main__":
    main()
