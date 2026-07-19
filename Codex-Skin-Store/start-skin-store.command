#!/bin/bash
# Codex 皮肤商店 — macOS 快速 debug 启动（双击或 bash 运行）
# 不是安装：进入目录、按需装依赖、起 tauri dev（热更新）。
set -e
cd "$(dirname "$0")"
echo "== Codex 皮肤商店 (debug) =="
if [ ! -d node_modules ]; then
  echo "首次运行：安装前端依赖…"
  npm install
fi
echo "启动 tauri dev（前端热更新，Rust 改动自动重编译）…"
npx tauri dev
