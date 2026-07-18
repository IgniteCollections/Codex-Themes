# Dream Skin engine vendor 版本
#
# 本目录（engine-windows/、engine-macos/）vendored 自
# https://github.com/Fei-Away/Codex-Dream-Skin （MIT，见各目录 LICENSE / NOTICE.md）
#
# 当前版本：upstream main @ 2026-07-17（skin version 1.2.0）
#
# 升级方式：
#   git clone --depth 1 https://github.com/Fei-Away/Codex-Dream-Skin /tmp/dream-skin
#   cp -r /tmp/dream-skin/windows/{assets,scripts} engine-windows/
#   cp -r /tmp/dream-skin/macos/{assets,scripts}   engine-macos/
#   cp /tmp/dream-skin/macos/{LICENSE,NOTICE.md}   engine-windows/ engine-macos/
#   然后跑官方自检：
#   node engine-windows/scripts/injector.mjs --self-test
#   以及用任一主题包验证：
#   node engine-windows/scripts/injector.mjs --check-payload --theme-dir ../themes/pokemon-grassland
