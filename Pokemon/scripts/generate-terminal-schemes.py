#!/usr/bin/env python3
"""Generate terminal-emulator color schemes from scenes.ts (single source).

Emits per-scene schemes for 4 emulators into Pokemon/themes/terminal/:

    pokemon-<slug>.json          Windows Terminal scheme（与安装页 installSnippets.ts ③一致）
    pokemon-<slug>.itermcolors   iTerm2 preset（plist XML，plutil -lint 可校验）
    pokemon-<slug>.toml          Alacritty（[colors] 节）
    pokemon-<slug>.conf          kitty（指令行）

    python3 Pokemon/scripts/generate-terminal-schemes.py

Validate: plutil -lint Pokemon/themes/terminal/*.itermcolors
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCENES_TS = REPO / "Pokemon/app/src/themes/scenes.ts"
OUT_DIR = REPO / "Pokemon/themes" / "terminal"

SCENE_VARS = ["grassland", "ocean", "cave", "magma", "snowfield", "plant", "space"]
SCENE_SLUG = {
    "grassland": "grassland", "ocean": "ocean", "cave": "cave", "magma": "magma",
    "snowfield": "snowfield", "plant": "power-plant", "space": "space",
}

ANSI_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"]
BRIGHT_NAMES = [f"bright{n.capitalize()}" for n in ANSI_NAMES]


def parse_scenes(ts: str) -> dict[str, dict]:
    scenes: dict[str, dict] = {}
    for block in re.finditer(r"const\s+(\w+):\s*SceneDef\s*=\s*\{(.*?)\n\};", ts, re.S):
        var, body = block.group(1), block.group(2)
        if var not in SCENE_VARS:
            continue
        fields: dict = {}
        for key in ("name", "en"):
            m = re.search(rf"{key}:\s*'([^']+)'", body)
            if not m:
                sys.exit(f"missing {key} for scene {var}")
            fields[key] = m.group(1)
        ansi_m = re.search(r"ansi:\s*\[(.*?)\]", body, re.S)
        if not ansi_m:
            sys.exit(f"missing ansi for scene {var}")
        ansi = re.findall(r"'(#[0-9A-Fa-f]{6})'", ansi_m.group(1))
        if len(ansi) != 16:
            sys.exit(f"scene {var}: expected 16 ansi colors, got {len(ansi)}")
        fields["ansi"] = [c.upper() for c in ansi]
        ui_m = re.search(r"ui:\s*\{(.*?)\n\s*\},", body, re.S)
        if not ui_m:
            sys.exit(f"missing ui palette for scene {var}")
        fields["ui"] = {
            k: v.upper()
            for k, v in re.findall(r"'?([\w-]+)'?:\s*'(#[0-9A-Fa-f]{6})'", ui_m.group(1))
        }
        scenes[var] = fields
    missing = set(SCENE_VARS) - set(scenes)
    if missing:
        sys.exit(f"missing scenes in scenes.ts: {missing}")
    return scenes


def title_case(en: str) -> str:
    return en.title()


def hex_rgb(h: str) -> tuple[int, int, int]:
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def display_name(s: dict) -> str:
    return f"CODEX · {s['name']} {title_case(s['en'])}"


# ---------------- Windows Terminal JSON（与安装页 installSnippets.ts ③ 同布局） ----------------

def build_windows_terminal(s: dict) -> str:
    ui, ansi = s["ui"], s["ansi"]
    colors = list(zip(ANSI_NAMES + BRIGHT_NAMES, ansi))
    lines = [
        "{",
        f'  "name": "{display_name(s)}",',
        f'  "background": "{ui["bg"]}",',
        f'  "foreground": "{ui["fg"]}",',
        f'  "selectionBackground": "{ui["selection"]}",',
        f'  "cursorColor": "{ui["prompt"]}",',
    ]
    for g in range(4):
        parts = ", ".join(f'"{k}": "{v}"' for k, v in colors[g * 4 : g * 4 + 4])
        lines.append(f"  {parts}{',' if g < 3 else ''}")
    lines.append("}")
    return "\n".join(lines) + "\n"


# ---------------- iTerm2 .itermcolors（plist XML） ----------------

def iterm_component(h: str, channel: str) -> str:
    r, g, b = hex_rgb(h)
    v = {"red": r, "green": g, "blue": b}[channel] / 255
    return f"{v:.10f}".rstrip("0").rstrip(".")


def iterm_color_dict(h: str, indent: str) -> str:
    return "\n".join(
        f"{indent}<key>{c} Component</key>\n{indent}<real>{iterm_component(h, c)}</real>"
        for c in ("red", "green", "blue")
    ) + f"\n{indent}<key>Color Space</key>\n{indent}<string>sRGB</string>"


def build_itermcolors(s: dict) -> str:
    ui, ansi = s["ui"], s["ansi"]
    entries: list[tuple[str, str]] = [
        ("Background Color", ui["bg"]),
        ("Foreground Color", ui["fg"]),
        ("Selection Color", ui["selection"]),
        ("Cursor Color", ui["prompt"]),
        ("Cursor Text Color", ui["bg"]),
        ("Bold Color", ui["fg"]),
    ]
    entries += [(f"Ansi {i} Color", ansi[i]) for i in range(16)]
    body = []
    for key, h in entries:
        body.append(f"\t<key>{key}</key>\n\t<dict>\n{iterm_color_dict(h, chr(9) * 2)}\n\t</dict>")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" '
        '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
        '<plist version="1.0">\n<dict>\n' + "\n".join(body) + "\n</dict>\n</plist>\n"
    )


# ---------------- Alacritty TOML ----------------

def build_alacritty(s: dict) -> str:
    ui, ansi = s["ui"], s["ansi"]
    lines = [
        f"# {display_name(s)} — Alacritty colors（scenes.ts 派生，勿手改）",
        "[colors.primary]",
        f'background = "{ui["bg"]}"',
        f'foreground = "{ui["fg"]}"',
        "",
        "[colors.cursor]",
        f'text = "{ui["bg"]}"',
        f'cursor = "{ui["prompt"]}"',
        "",
        "[colors.selection]",
        f'text = "{ui["fg"]}"',
        f'background = "{ui["selection"]}"',
        "",
        "[colors.normal]",
    ]
    lines += [f'{n} = "{ansi[i]}"' for i, n in enumerate(ANSI_NAMES)]
    lines += ["", "[colors.bright]"]
    lines += [f'{n} = "{ansi[i + 8]}"' for i, n in enumerate(ANSI_NAMES)]
    return "\n".join(lines) + "\n"


# ---------------- kitty conf ----------------

def build_kitty(s: dict) -> str:
    ui, ansi = s["ui"], s["ansi"]
    lines = [
        f"# {display_name(s)} — kitty colors（scenes.ts 派生，勿手改）",
        f"background {ui['bg']}",
        f"foreground {ui['fg']}",
        f"cursor {ui['prompt']}",
        f"cursor_text_color {ui['bg']}",
        f"selection_background {ui['selection']}",
        f"selection_foreground {ui['fg']}",
        "",
    ]
    for i in range(8):
        lines.append(f"color{i} {ansi[i]}")
    for i in range(8, 16):
        lines.append(f"color{i} {ansi[i]}")
    return "\n".join(lines) + "\n"


def main() -> None:
    ts = SCENES_TS.read_text(encoding="utf-8")
    scenes = parse_scenes(ts)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for var in SCENE_VARS:
        s = scenes[var]
        slug = SCENE_SLUG[var]
        stem = OUT_DIR / f"pokemon-{slug}"
        (stem.with_suffix(".json")).write_text(build_windows_terminal(s), encoding="utf-8")
        (stem.with_suffix(".itermcolors")).write_text(build_itermcolors(s), encoding="utf-8")
        (stem.with_suffix(".toml")).write_text(build_alacritty(s), encoding="utf-8")
        (stem.with_suffix(".conf")).write_text(build_kitty(s), encoding="utf-8")
        # JSON 可被标准库解析（顺带校验输出）
        json.loads(stem.with_suffix(".json").read_text(encoding="utf-8"))
        print(f"pokemon-{slug}: .json + .itermcolors + .toml + .conf")

    index = {
        var: {
            "name": display_name(scenes[var]),
            "slug": f"pokemon-{SCENE_SLUG[var]}",
            "files": {
                "windows-terminal": f"pokemon-{SCENE_SLUG[var]}.json",
                "iterm2": f"pokemon-{SCENE_SLUG[var]}.itermcolors",
                "alacritty": f"pokemon-{SCENE_SLUG[var]}.toml",
                "kitty": f"pokemon-{SCENE_SLUG[var]}.conf",
            },
        }
        for var in SCENE_VARS
    }
    (OUT_DIR / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\nwrote {len(SCENE_VARS)} schemes × 4 emulators to {OUT_DIR.relative_to(REPO)}")


if __name__ == "__main__":
    main()
