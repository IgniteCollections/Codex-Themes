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
#   cp -r /tmp/dream-skin/macos/{assets,scripts,presets} engine-macos/
#   cp /tmp/dream-skin/macos/{LICENSE,NOTICE.md}   engine-windows/ engine-macos/
#   然后跑官方自检：
#   node engine-windows/scripts/injector.mjs --self-test
#   以及用任一主题包验证：
#   node engine-windows/scripts/injector.mjs --check-payload --theme-dir ../themes/pokemon-grassland
#
# 注意：macOS 的 presets/ 必须一起 vendor——install 脚本会 seed 默认主题
# preset-gothic-void-crusade，缺目录则安装直接失败（2026-07-18 实测修复）。
