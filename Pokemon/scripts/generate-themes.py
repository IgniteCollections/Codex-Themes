#!/usr/bin/env python3
"""Generate pokemon-*.tmTheme files from Pokemon/app/src/themes/scenes.ts.

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
SCENES_TS = REPO / "Pokemon/app/src/themes/scenes.ts"
OUT_DIR = REPO / "Pokemon/themes"

# Per-scene TextMate scope mapping, derived from the 5-color palette by the
# rules in docs/themes/pokemon/design.md §3.2:
#   keyword=主色, string=第二强调, number=点缀, comment=低亮 ink, fn=暖色,
#   diff add/del = 语义绿/红（场景内保持可读的替换色）
# SceneId in themes/scenes.ts -> theme slug (file name suffix)
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

DERIVED = {
    "grassland": {
        "comment": "#6E8F5A",
        "fn": "#E8A93C",
        "diff_add": "#7AC74C",
        "diff_del": "#D4543A",
    },
    "ocean": {
        "comment": "#4E7391",
        "fn": "#F2B84B",
        "diff_add": "#3FD0A7",
        "diff_del": "#FF7F50",
    },
    "cave": {
        "comment": "#6E6E78",
        "fn": "#8A9A5B",
        "diff_add": "#8A9A5B",
        "diff_del": "#B0526B",
    },
    "magma": {
        "comment": "#6E6259",
        "fn": "#F5A623",
        "diff_add": "#B8C93A",
        "diff_del": "#D43D2A",
    },
    "snowfield": {
        "comment": "#5B7A94",
        "fn": "#4B7FB8",
        "diff_add": "#4FBF9A",
        "diff_del": "#D4647C",
    },
    "power-plant": {
        "comment": "#5A616B",
        "fn": "#9EFF00",
        "diff_add": "#9EFF00",
        "diff_del": "#E05A2B",
    },
    "space": {
        "comment": "#6C6C94",
        "fn": "#FFD700",
        "diff_add": "#3FD99A",
        "diff_del": "#E05A7A",
    },
    "city": {
        "comment": "#8A6EA8",
        "fn": "#FFD700",
        "diff_add": "#3FD99A",
        "diff_del": "#F2788A",
    },
    "lab": {
        "comment": "#5A7A8A",
        "fn": "#9B7BF0",
        "diff_add": "#3FD99A",
        "diff_del": "#F2788A",
    },
}

SCENE_TITLE = {
    "grassland": "Grassland 草原",
    "ocean": "Ocean 海洋",
    "cave": "Cave 洞穴",
    "magma": "Magma 岩浆",
    "snowfield": "Snowfield 雪原",
    "power-plant": "Power Plant 无人发电厂",
    "space": "Space 宇宙",
    "city": "City 城市",
    "lab": "Laboratory 实验室",
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
    """Parse each `const <var>: SceneDef = { ... }` block from themes/scenes.ts.

    Colors come from the `ui: { ... }` block:
      background <- ui.bg, foreground <- ui.fg, selection <- ui.selection,
      caret <- ui.accent, lineHighlight <- ui.panel
    plus the tmTheme slot colors keyword/string/number:
      primary <- ui.prompt, secondary <- ui.accent, accent <- ui.warning
    """
    scenes: dict[str, dict[str, str]] = {}
    for block in re.finditer(r"const\s+(\w+):\s*SceneDef\s*=\s*\{(.*?)\n\};", ts, re.S):
        var, body = block.group(1), block.group(2)
        if var not in SCENE_SLUG:
            continue
        sid = SCENE_SLUG[var]
        ui_m = re.search(r"ui:\s*\{(.*?)\n\s*\},", body, re.S)
        if not ui_m:
            sys.exit(f"missing ui block for scene {var}")
        ui = dict(
            re.findall(r"'?([\w-]+)'?:\s*'(#[0-9A-Fa-f]{6})'", ui_m.group(1))
        )
        for key in ("bg", "fg", "selection", "accent", "panel", "prompt", "warning"):
            if key not in ui:
                sys.exit(f"missing ui.{key} for scene {var}")
        scenes[sid] = {
            "id": sid,
            "primary": ui["prompt"].upper(),
            "secondary": ui["accent"].upper(),
            "accent": ui["warning"].upper(),
            "surface": ui["fg"].upper(),
            "ink": ui["bg"].upper(),
            "selection": ui["selection"].upper(),
            "panel": ui["panel"].upper(),
        }
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
            ("selection", s["selection"]),
            ("lineHighlight", s["panel"]),
            ("caret", s["secondary"]),
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
<!-- Pokemon {SCENE_TITLE[sid]} — generated from src/themes/scenes.ts, do not edit by hand -->
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
