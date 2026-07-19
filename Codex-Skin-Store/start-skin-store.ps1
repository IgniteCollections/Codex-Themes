# Codex 皮肤商店 — Windows 快速 debug 启动
# 不是安装：进入目录、按需装依赖、起 tauri dev（热更新）。
# 用法：右键「使用 PowerShell 运行」，或 powershell -File start-skin-store.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "== Codex 皮肤商店 (debug) =="
if (-not (Test-Path "node_modules")) {
  Write-Host "首次运行：安装前端依赖…"
  npm install
}
Write-Host "启动 tauri dev（前端热更新，Rust 改动自动重编译）…"
npx tauri dev
