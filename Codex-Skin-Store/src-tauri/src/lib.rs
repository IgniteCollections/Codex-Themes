use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/* ------------------------------------------------------------------ */
/* 平台路径（与 Dream Skin 官方脚本逐一对齐）                            */
/* ------------------------------------------------------------------ */

fn state_root() -> Result<PathBuf, String> {
    #[cfg(windows)]
    {
        let base = std::env::var("LOCALAPPDATA")
            .map_err(|_| "LOCALAPPDATA is not set".to_string())?;
        return Ok(PathBuf::from(base).join("CodexDreamSkin"));
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME is not set".to_string())?;
        return Ok(PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("CodexDreamSkinStudio"));
    }
    #[allow(unreachable_code)]
    Err("unsupported platform".into())
}

fn engine_scripts(state: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        state.join("engine").join("scripts")
    }
    #[cfg(target_os = "macos")]
    {
        // macOS: engine lives in ~/.codex/codex-dream-skin-studio
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(home)
            .join(".codex")
            .join("codex-dream-skin-studio")
            .join("scripts")
    }
}

fn engine_css_path(state: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        state.join("engine").join("assets").join("dream-skin.css")
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(home)
            .join(".codex")
            .join("codex-dream-skin-studio")
            .join("assets")
            .join("dream-skin.css")
    }
}

fn active_theme_dir(state: &Path) -> PathBuf {
    // watch injector 监听的主题目录：Windows 为 active-theme/，
    // macOS（engine 1.2.0+）为 theme/（见官方 switch-theme-macos.sh）
    #[cfg(windows)]
    {
        state.join("active-theme")
    }
    #[cfg(target_os = "macos")]
    {
        state.join("theme")
    }
}

fn themes_dir(state: &Path) -> PathBuf {
    state.join("themes")
}

/* ------------------------------------------------------------------ */
/* 资源解析（dev 与 bundled 双模式）                                     */
/* ------------------------------------------------------------------ */

fn resource_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let p = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir: {e}"))?;
    // dev: <crate>/target/debug — walk up to the crate root's resources/
    let dev = p.parent().and_then(|t| t.parent()).map(|crate_root| {
        crate_root.join("resources")
    });
    if let Some(d) = dev {
        if d.join("themes").is_dir() {
            return Ok(d);
        }
    }
    Ok(p)
}

fn engine_resource_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let res = resource_dir(app)?;
    #[cfg(windows)]
    {
        Ok(res.join("engine-windows"))
    }
    #[cfg(target_os = "macos")]
    {
        Ok(res.join("engine-macos"))
    }
}

/* ------------------------------------------------------------------ */
/* 状态查询                                                            */
/* ------------------------------------------------------------------ */

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct EngineState {
    port: Option<u16>,
    injector_pid: Option<u32>,
    injector_started_at: Option<String>,
    codex_exe: Option<String>,
    codex_version: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StudioStatus {
    platform: String,
    state_root: String,
    codex_installed: bool,
    node_version: Option<String>,
    engine_installed: bool,
    injector_running: bool,
    injector_pid: Option<u32>,
    port: Option<u16>,
    active_theme: Option<String>,
    active_theme_name: Option<String>,
    paused: bool,
    codex_version: Option<String>,
    codex_running: bool,
}

fn read_engine_state(state: &Path) -> Option<EngineState> {
    let text = fs::read_to_string(state.join("state.json")).ok()?;
    serde_json::from_str(&text).ok()
}

#[cfg(windows)]
fn pid_running(pid: u32) -> bool {
    Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/NH", "/FO", "CSV"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
        .unwrap_or(false)
}

#[cfg(not(windows))]
fn pid_running(pid: u32) -> bool {
    Command::new("kill")
        .args(["-0", &pid.to_string()])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn codex_installed() -> bool {
    Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "if (Get-AppxPackage OpenAI.Codex) { 'yes' }",
        ])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains("yes"))
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn codex_installed() -> bool {
    Command::new("mdfind")
        .args(["kMDItemCFBundleIdentifier == 'com.openai.codex'"])
        .output()
        .map(|o| !String::from_utf8_lossy(&o.stdout).trim().is_empty())
        .unwrap_or(false)
}

#[cfg(windows)]
fn node_version() -> Option<String> {
    let out = Command::new("node").args(["-p", "process.versions.node"]).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let v = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let major: u32 = v.split('.').next()?.parse().ok()?;
    if major >= 22 {
        Some(v)
    } else {
        None
    }
}

#[cfg(target_os = "macos")]
fn node_version() -> Option<String> {
    // macOS 引擎用 ChatGPT 内置的签名 Node，无需系统 Node。
    Some("bundled (ChatGPT)".to_string())
}

fn active_theme(state: &Path) -> (Option<String>, Option<String>) {
    let text = match fs::read_to_string(active_theme_dir(state).join("theme.json")) {
        Ok(t) => t,
        Err(_) => return (None, None),
    };
    let v: serde_json::Value = match serde_json::from_str(&text) {
        Ok(v) => v,
        Err(_) => return (None, None),
    };
    (
        v.get("id").and_then(|x| x.as_str()).map(String::from),
        v.get("name").and_then(|x| x.as_str()).map(String::from),
    )
}

#[cfg(target_os = "macos")]
fn codex_main_running() -> bool {
    // 与官方 install 脚本的 codex_is_running() 逐一对齐：
    // 只匹配主可执行文件（$CODEX_EXE 开头），Electron 的 Renderer/Service 子进程不算。
    let bundle = std::env::var("CODEX_APP_BUNDLE").unwrap_or_else(|_| "/Applications/ChatGPT.app".into());
    let exe = Command::new("plutil")
        .args([
            "-extract",
            "CFBundleExecutable",
            "raw",
            "-o",
            "-",
            &format!("{bundle}/Contents/Info.plist"),
        ])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());
    let Some(exe) = exe.filter(|e| !e.is_empty()) else {
        return false;
    };
    let main_exe = format!("{bundle}/Contents/MacOS/{exe}");
    Command::new("ps")
        .args(["-axo", "command="])
        .output()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .any(|line| line.trim_start().starts_with(&main_exe))
        })
        .unwrap_or(false)
}

#[cfg(not(target_os = "macos"))]
fn codex_main_running() -> bool {
    false
}

#[tauri::command]
fn get_status() -> Result<StudioStatus, String> {
    let state = state_root()?;
    let engine_state = read_engine_state(&state);
    let injector_running = engine_state
        .as_ref()
        .and_then(|s| s.injector_pid)
        .map(pid_running)
        .unwrap_or(false);
    let (active_theme, active_theme_name) = active_theme(&state);
    Ok(StudioStatus {
        platform: if cfg!(windows) { "windows" } else { "macos" }.into(),
        state_root: state.display().to_string(),
        codex_installed: codex_installed(),
        node_version: node_version(),
        engine_installed: engine_scripts(&state).is_dir(),
        injector_running,
        injector_pid: engine_state.as_ref().and_then(|s| s.injector_pid),
        port: engine_state.as_ref().and_then(|s| s.port),
        active_theme,
        active_theme_name,
        paused: state.join("paused").is_file(),
        codex_version: engine_state.and_then(|s| s.codex_version),
        codex_running: codex_main_running(),
    })
}

/* ------------------------------------------------------------------ */
/* 场景清单                                                            */
/* ------------------------------------------------------------------ */

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SceneInfo {
    id: String,
    name: String,
    accent: String,
    has_css: bool,
}

#[tauri::command]
fn list_scenes(app: tauri::AppHandle) -> Result<Vec<SceneInfo>, String> {
    let themes = resource_dir(&app)?.join("themes");
    let mut out = Vec::new();
    let entries = fs::read_dir(&themes)
        .map_err(|e| format!("read {}: {e}", themes.display()))?;
    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }
        let text = match fs::read_to_string(dir.join("theme.json")) {
            Ok(t) => t,
            Err(_) => continue,
        };
        let v: serde_json::Value = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(_) => continue,
        };
        out.push(SceneInfo {
            id: v["id"].as_str().unwrap_or_default().to_string(),
            name: v["name"].as_str().unwrap_or_default().to_string(),
            accent: v["palette"]["accent"]
                .as_str()
                .unwrap_or("#888888")
                .to_string(),
            has_css: dir.join("scene.css").is_file(),
        });
    }
    out.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(out)
}

/* ------------------------------------------------------------------ */
/* 官方脚本调用                                                        */
/* ------------------------------------------------------------------ */

fn engine_script(state: &Path, windows_name: &str, macos_name: &str) -> PathBuf {
    #[cfg(windows)]
    {
        let _ = macos_name;
        engine_scripts(state).join(windows_name)
    }
    #[cfg(target_os = "macos")]
    {
        let _ = windows_name;
        engine_scripts(state).join(macos_name)
    }
}

fn run_engine_script(state: &Path, script: PathBuf, args: &[&str]) -> Result<String, String> {
    if !script.is_file() {
        return Err(format!(
            "引擎脚本不存在（请先安装引擎）: {}",
            script.display()
        ));
    }
    let _ = state;
    #[cfg(windows)]
    let mut cmd = {
        let mut c = Command::new("powershell");
        c.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script.to_string_lossy(),
        ])
        .args(args);
        c
    };
    #[cfg(target_os = "macos")]
    let mut cmd = {
        let mut c = Command::new("bash");
        c.arg(&script).args(args);
        c
    };
    let out = cmd
        .output()
        .map_err(|e| format!("运行 {} 失败: {e}", script.display()))?;
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
    if !out.status.success() {
        return Err(format!(
            "{} 退出码 {:?}\n{}\n{}",
            script
                .file_name()
                .map(|f| f.to_string_lossy().into_owned())
                .unwrap_or_default(),
            out.status.code(),
            stdout.trim(),
            stderr.trim()
        ));
    }
    Ok(format!("{}\n{}", stdout.trim(), stderr.trim()))
}

/* ------------------------------------------------------------------ */
/* 安装引擎                                                            */
/* ------------------------------------------------------------------ */

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("mkdir {}: {e}", dst.display()))?;
    for entry in fs::read_dir(src).map_err(|e| format!("read {}: {e}", src.display()))? {
        let entry = entry.map_err(|e| e.to_string())?;
        let (s, d) = (entry.path(), dst.join(entry.file_name()));
        if s.is_dir() {
            copy_dir_recursive(&s, &d)?;
        } else {
            fs::copy(&s, &d).map_err(|e| format!("copy {}: {e}", s.display()))?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn install_engine(app: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = state_root()?;
        let vendor = engine_resource_dir(&app)?;
        if !vendor.is_dir() {
            return Err(format!("引擎资源缺失: {}", vendor.display()));
        }
        // 官方 install 脚本以自身位置为 SkillRoot（Split-Path -Parent $PSScriptRoot），
        // 因此把 vendor 树复制到状态根旁边的暂存目录，从那里运行。
        let staging = state.join(".pokemon-studio-vendor");
        if staging.exists() {
            fs::remove_dir_all(&staging).map_err(|e| e.to_string())?;
        }
        copy_dir_recursive(&vendor, &staging)?;
        #[cfg(windows)]
        let install = staging.join("scripts").join("install-dream-skin.ps1");
        #[cfg(target_os = "macos")]
        let install = staging.join("scripts").join("install-dream-skin-macos.sh");
        #[cfg(windows)]
        let result = run_engine_script(&state, install, &["-NoShortcuts"]);
        #[cfg(target_os = "macos")]
        let result = run_engine_script(
            &state,
            install,
            &["--no-launchers", "--no-launch"],
        );
        let _ = fs::remove_dir_all(&staging);
        result
    })
    .await
    .map_err(|e| format!("install task join: {e}"))?
}

/* ------------------------------------------------------------------ */
/* 场景切换（原子替换 active-theme + 重建 pokemon CSS 块）               */
/* ------------------------------------------------------------------ */

const CSS_BEGIN: &str = "/* pokemon-skin begin */";
const CSS_END: &str = "/* pokemon-skin end */";

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("pokemon-tmp");
    fs::write(&tmp, bytes).map_err(|e| format!("write {}: {e}", tmp.display()))?;
    fs::rename(&tmp, path).map_err(|e| format!("rename to {}: {e}", path.display()))?;
    Ok(())
}

fn rebuild_engine_css(state: &Path, scene_css: Option<&str>) -> Result<(), String> {
    let css_path = engine_css_path(state);
    let current = fs::read_to_string(&css_path)
        .map_err(|e| format!("read {}: {e}", css_path.display()))?;
    let stripped = match (current.find(CSS_BEGIN), current.find(CSS_END)) {
        (Some(b), Some(e)) if b < e => {
            format!("{}{}", &current[..b], &current[e + CSS_END.len()..])
        }
        _ => current,
    };
    let next = match scene_css {
        Some(css) => format!(
            "{}\n\n{}\n{}\n{}\n",
            stripped.trim_end(),
            CSS_BEGIN,
            css,
            CSS_END
        ),
        None => format!("{}\n", stripped.trim_end()),
    };
    atomic_write(&css_path, next.as_bytes())
}

#[tauri::command]
fn switch_scene(app: tauri::AppHandle, scene_id: String) -> Result<String, String> {
    if !scene_id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("非法场景 id".into());
    }
    let state = state_root()?;
    let pack = resource_dir(&app)?.join("themes").join(&scene_id);
    let theme_json = pack.join("theme.json");
    if !theme_json.is_file() {
        return Err(format!("主题包不存在: {}", pack.display()));
    }
    if !engine_scripts(&state).is_dir() {
        return Err("引擎未安装，请先完成初始设置".into());
    }

    // 1) 场景包入主题库（幂等）
    let saved = themes_dir(&state).join(&scene_id);
    copy_dir_recursive(&pack, &saved)?;

    // 2) 原子替换活跃主题目录（staging → 逐文件 rename，先图后 json）
    let active = active_theme_dir(&state);
    let staging = state.join(".pokemon-studio-staging");
    if staging.exists() {
        fs::remove_dir_all(&staging).map_err(|e| e.to_string())?;
    }
    copy_dir_recursive(&saved, &staging)?;
    fs::create_dir_all(&active).map_err(|e| e.to_string())?;
    // 先替换图片，再替换 theme.json（官方约定：json 是 commit marker）。
    // 壁纸文件名以 theme.json 的 image 字段为准（官方 preset 用 .jpg，我们用 .png）。
    let theme_text = fs::read_to_string(staging.join("theme.json"))
        .map_err(|e| format!("read theme.json: {e}"))?;
    let theme_v: serde_json::Value =
        serde_json::from_str(&theme_text).map_err(|e| format!("parse theme.json: {e}"))?;
    let image_name = theme_v["image"].as_str().unwrap_or("background.png").to_string();
    let bg = staging.join(&image_name);
    if bg.is_file() {
        fs::rename(&bg, active.join(&image_name))
            .map_err(|e| format!("activate background: {e}"))?;
    }
    fs::rename(staging.join("theme.json"), active.join("theme.json"))
        .map_err(|e| format!("activate theme.json: {e}"))?;
    // 清理活跃目录里不属于本主题的文件（含上一主题的壁纸）
    for entry in fs::read_dir(&active).map_err(|e| e.to_string())?.flatten() {
        let name = entry.file_name();
        if name != "theme.json" && name != image_name.as_str() {
            let _ = fs::remove_file(entry.path());
        }
    }
    let _ = fs::remove_dir_all(&staging);

    // 3) 重建 engine CSS 的 pokemon 块（完整场景皮肤层）
    let scene_css = fs::read_to_string(saved.join("scene.css"))
        .map_err(|e| format!("read scene.css: {e}"))?;
    rebuild_engine_css(&state, Some(&scene_css))?;

    // 4) 清除暂停标记，让 watch injector 立即热应用
    let _ = fs::remove_file(state.join("paused"));

    Ok(format!("已切换到 {scene_id}，watch injector 将在数秒内热应用"))
}

/* ------------------------------------------------------------------ */
/* 引擎操作                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* 引擎操作                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
// 应用到 Codex CLI（写 ~/.codex/themes 的 tmTheme + config.toml 的 tui.theme）
/* ------------------------------------------------------------------ */

fn codex_home() -> Result<PathBuf, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "HOME/USERPROFILE is not set".to_string())?;
    Ok(PathBuf::from(home).join(".codex"))
}

/// tmTheme 文件名 slug：pokemon-plant → power-plant，其余同场景 id。
fn cli_slug(scene_id: &str) -> String {
    let id = scene_id.strip_prefix("pokemon-").unwrap_or(scene_id);
    match id {
        "plant" => "power-plant".to_string(),
        other => other.to_string(),
    }
}

/// 把主题写入 config.toml 的 [tui] 段：theme = "<slug>"。
/// 已有的 theme / tui.theme 键一并替换（旧的 theme 键会覆盖新值，必须清掉）。
fn set_tui_theme(config_path: &Path, slug: &str) -> Result<(), String> {
    let text = fs::read_to_string(config_path).unwrap_or_default();
    let new_line = format!("theme = \"{slug}\"");
    if let Some(out) = replace_tui_theme(&text, &new_line) {
        atomic_write(config_path, out.as_bytes())
    } else {
        // 无 theme 键：追加一个 [tui] 段
        let mut out = text.trim_end().to_string();
        if !out.is_empty() {
            out.push_str("\n\n");
        }
        out.push_str(&format!("[tui]\ntheme = \"{slug}\"\n"));
        atomic_write(config_path, out.as_bytes())
    }
}

/// 在 [tui] 段内替换 theme 键（含平铺 tui.theme 写法）；找不到返回 None。
fn replace_tui_theme(text: &str, new_line: &str) -> Option<String> {
    let mut in_tui = false;
    let mut replaced = false;
    let mut out = Vec::new();
    for line in text.lines() {
        let t = line.trim();
        if t.starts_with('[') && t.ends_with(']') {
            in_tui = t == "[tui]";
            out.push(line.to_string());
            continue;
        }
        if in_tui && t.starts_with("theme") && t.contains('=') && !t.starts_with("theme_") {
            // [tui] 段内 theme = ...（旧键会覆盖，统一替换）
            out.push(new_line.to_string());
            replaced = true;
            continue;
        }
        if t.starts_with("tui.theme") && t.contains('=') {
            // 平铺 tui.theme（无前缀段）——用新的段内 theme 统一承载，删旧行
            replaced = true;
            continue;
        }
        out.push(line.to_string());
    }
    if replaced { Some(out.join("\n") + "\n") } else { None }
}

#[tauri::command]
fn apply_cli(app: tauri::AppHandle, scene_id: String) -> Result<String, String> {
    if !scene_id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("非法场景 id".into());
    }
    let slug = cli_slug(&scene_id);
    let file = format!("pokemon-{slug}.tmTheme");
    let src = resource_dir(&app)?.join("cli-themes").join(&file);
    if !src.is_file() {
        return Err(format!("CLI 主题文件不存在: {}", src.display()));
    }
    let home = codex_home()?;
    let themes_dir = home.join("themes");
    fs::create_dir_all(&themes_dir).map_err(|e| format!("mkdir {}: {e}", themes_dir.display()))?;
    fs::copy(&src, themes_dir.join(&file)).map_err(|e| format!("copy tmTheme: {e}"))?;
    let config = home.join("config.toml");
    set_tui_theme(&config, &format!("pokemon-{slug}"))?;
    Ok(format!(
        "已应用「{slug}」到 Codex CLI（{file} → ~/.codex/themes，config.toml tui.theme 已写入）。重启 codex 或用 /theme 生效"
    ))
}

#[tauri::command]
async fn start_engine() -> Result<String, String> {
    // 实测注意：start 脚本结尾的 verify 会等 Codex shell 渲染完成，
    // 前台调用可能挂起数分钟；必须异步执行。restore 后重开的 Codex
    // 无 CDP 端口，-RestartExisting 允许脚本自行重启它（已有 CDP 时无副作用）。
    tauri::async_runtime::spawn_blocking(|| {
        let state = state_root()?;
        let script = engine_script(&state, "start-dream-skin.ps1", "start-dream-skin-macos.sh");
        #[cfg(windows)]
        let args: &[&str] = &["-RestartExisting"];
        #[cfg(target_os = "macos")]
        let args: &[&str] = &["--restart-existing"];
        run_engine_script(&state, script, args)
    })
    .await
    .map_err(|e| format!("start task join: {e}"))?
}

#[tauri::command]
async fn stop_engine() -> Result<String, String> {
    // 恢复官方外观（关 injector + 移除注入），但保留引擎安装与主题库。
    tauri::async_runtime::spawn_blocking(|| {
        let state = state_root()?;
        let script = engine_script(&state, "restore-dream-skin.ps1", "restore-dream-skin-macos.sh");
        #[cfg(windows)]
        let args: &[&str] = &["-ForceRestart"];
        #[cfg(target_os = "macos")]
        let args: &[&str] = &["--force-restart"];
        let out = run_engine_script(&state, script, args)?;
        rebuild_engine_css(&state, None)?;
        Ok(out)
    })
    .await
    .map_err(|e| format!("stop task join: {e}"))?
}

#[tauri::command]
fn set_paused(paused: bool) -> Result<(), String> {
    let state = state_root()?;
    let marker = state.join("paused");
    if paused {
        atomic_write(&marker, b"paused\n")
    } else if marker.exists() {
        fs::remove_file(&marker).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
async fn verify_engine() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let state = state_root()?;
        let script = engine_script(&state, "verify-dream-skin.ps1", "verify-dream-skin-macos.sh");
        run_engine_script(&state, script, &[])
    })
    .await
    .map_err(|e| format!("verify task join: {e}"))?
}

/* ------------------------------------------------------------------ */
/* App 入口                                                            */
/* ------------------------------------------------------------------ */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            get_status,
            list_scenes,
            install_engine,
            switch_scene,
            apply_cli,
            start_engine,
            stop_engine,
            set_paused,
            verify_engine,
        ])
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};
            use tauri::Manager;

            let show = MenuItem::with_id(app, "show", "打开工作室", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "暂停皮肤", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &pause, &quit])?;

            let _tray = TrayIconBuilder::with_id("main")
                .tooltip("Codex 皮肤商店")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "pause" => {
                        let _ = set_paused(true);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, .. } = event {
                        if matches!(button, tauri::tray::MouseButton::Left) {
                            let app = tray.app_handle();
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // 关闭按钮 → 隐藏到托盘，不退出
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running pokemon studio");
}
