#!/usr/bin/env bash
# 宝可梦皮肤注入器（包装 apply.mjs）
# 用法：./skins/apply.sh <scene|remove> [--port 9222]
set -euo pipefail
cd "$(dirname "$0")/.."
exec node skins/apply.mjs "$@"
