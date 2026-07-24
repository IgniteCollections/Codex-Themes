//! Windows adapter：当前用户 Run 键守护 supervisor（docs/persistence/execution.md §3.2）。
//!
//! 首版用 HKCU\...\Run 注册表项（无需管理员、无需计划任务 XML），
//! Codex 发现沿用 Appx 查询 + 进程名兜底。
//! 本模块在非 Windows 平台也可编译：注册表/注册相关函数仅 windows cfg 下实现，
//! 其余纯逻辑（Run 键值转义、进程模式）跨平台可测。

#[cfg(windows)]
use std::path::PathBuf;

#[cfg(windows)]
use super::{CodexInstallation, PersistenceError, PersistencePlatform};
#[cfg(any(windows, test))]
use super::SupervisorSpec;

#[cfg(windows)]
pub const RUN_KEY_PATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
#[cfg(any(windows, test))]
pub const RUN_VALUE_NAME: &str = "CodexThemesSkinSupervisor";

/// 生成 Run 键的命令行值。含空格路径必须整体加引号（testing.md §2.3）。
#[cfg(any(windows, test))]
pub fn render_run_value(spec: &SupervisorSpec) -> String {
    format!(
        "\"{}\" \"{}\" --state-root \"{}\" --theme-dir \"{}\" --injector \"{}\" --codex-process \"{}\"",
        spec.node_path.display(),
        spec.supervisor_script.display(),
        spec.state_root.display(),
        spec.theme_dir.display(),
        spec.injector_script.display(),
        spec.codex_process_pattern,
    )
}

/// Windows 端进程观察用的匹配模式（supervisor 侧 PowerShell 查询）。
#[cfg(windows)]
pub fn codex_process_pattern() -> String {
    "Codex|ChatGPT".into()
}

#[cfg(windows)]
pub struct WindowsPersistence;

#[cfg(windows)]
impl PersistencePlatform for WindowsPersistence {
    fn register(&self, spec: &SupervisorSpec) -> Result<(), PersistenceError> {
        let value = render_run_value(spec);
        let out = std::process::Command::new("reg")
            .args(["add", &format!(r"HKCU\{RUN_KEY_PATH}"), "/v", RUN_VALUE_NAME, "/t", "REG_SZ", "/d", &value, "/f"])
            .output()
            .map_err(|e| PersistenceError::Register(format!("reg add: {e}")))?;
        if !out.status.success() {
            return Err(PersistenceError::Register(format!(
                "reg add 退出码 {:?}: {}",
                out.status.code(),
                String::from_utf8_lossy(&out.stderr).trim()
            )));
        }
        // 立即启动一个 supervisor 实例（Run 键只在下次登录生效）
        let _ = std::process::Command::new(&spec.node_path)
            .arg(&spec.supervisor_script)
            .arg("--state-root").arg(&spec.state_root)
            .arg("--theme-dir").arg(&spec.theme_dir)
            .arg("--injector").arg(&spec.injector_script)
            .arg("--codex-process").arg(&spec.codex_process_pattern)
            .spawn();
        Ok(())
    }

    fn unregister(&self) -> Result<(), PersistenceError> {
        let out = std::process::Command::new("reg")
            .args(["delete", &format!(r"HKCU\{RUN_KEY_PATH}"), "/v", RUN_VALUE_NAME, "/f"])
            .output()
            .map_err(|e| PersistenceError::Unregister(format!("reg delete: {e}")))?;
        if !out.status.success() {
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            // 值不存在时不算失败（幂等）
            if !stderr.contains("unable to find") && !stderr.contains("找不到") {
                return Err(PersistenceError::Unregister(format!(
                    "reg delete 退出码 {:?}: {}",
                    out.status.code(),
                    stderr.trim()
                )));
            }
        }
        Ok(())
    }

    fn is_registered(&self) -> bool {
        std::process::Command::new("reg")
            .args(["query", &format!(r"HKCU\{RUN_KEY_PATH}"), "/v", RUN_VALUE_NAME])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    fn discover_codex(&self) -> Result<CodexInstallation, PersistenceError> {
        // Appx（商店版）→ InstallLocation；Node 用系统 node（沿用 lib.rs 的检测）
        let out = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "(Get-AppxPackage OpenAI.Codex).InstallLocation",
            ])
            .output()
            .map_err(|e| PersistenceError::Discover(format!("powershell: {e}")))?;
        let location = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if location.is_empty() {
            return Err(PersistenceError::Discover(
                "找不到 Codex 安装（OpenAI.Codex），请确认已安装 Codex 桌面 App".into(),
            ));
        }
        let node = which_node().ok_or_else(|| {
            PersistenceError::Discover("系统 Node ≥ 22 缺失，无法运行 supervisor".into())
        })?;
        Ok(CodexInstallation {
            bundle_path: PathBuf::from(location),
            executable_name: "Codex.exe".into(),
            node_path: node,
            version: None,
        })
    }
}

#[cfg(windows)]
fn which_node() -> Option<PathBuf> {
    let out = std::process::Command::new("where").arg("node").output().ok()?;
    if !out.status.success() {
        return None;
    }
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .next()
        .map(|l| PathBuf::from(l.trim()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn spec() -> SupervisorSpec {
        SupervisorSpec {
            label: RUN_VALUE_NAME.into(),
            node_path: std::path::PathBuf::from(r"C:\Program Files\nodejs\node.exe"),
            supervisor_script: std::path::PathBuf::from(r"C:\Users\me\AppData\Local\CodexDreamSkin\engine\scripts\persistence-supervisor.mjs"),
            state_root: std::path::PathBuf::from(r"C:\Users\me\AppData\Local\CodexDreamSkin"),
            theme_dir: std::path::PathBuf::from(r"C:\Users\me\AppData\Local\CodexDreamSkin\active-theme"),
            injector_script: std::path::PathBuf::from(r"C:\Users\me\AppData\Local\CodexDreamSkin\engine\scripts\injector.mjs"),
            codex_process_pattern: "Codex|ChatGPT".into(),
            log_path: std::path::PathBuf::from(r"C:\Users\me\AppData\Local\CodexDreamSkin\supervisor.log"),
            error_log_path: std::path::PathBuf::from(r"C:\Users\me\AppData\Local\CodexDreamSkin\supervisor-error.log"),
        }
    }

    #[test]
    fn run_value_quotes_paths_with_spaces() {
        let value = render_run_value(&spec());
        assert!(value.starts_with("\"C:\\Program Files\\nodejs\\node.exe\""));
        assert!(value.contains("--state-root \"C:\\Users\\me\\AppData\\Local\\CodexDreamSkin\""));
        assert!(value.contains("--theme-dir \""));
        assert!(value.contains("--injector \""));
        assert!(value.contains("persistence-supervisor.mjs"));
    }

    #[test]
    fn run_value_supervises_supervisor_not_injector() {
        let value = render_run_value(&spec());
        // supervisor 脚本是第二个参数（紧随 node），injector 仅以 --injector 参数出现
        let supervisor_pos = value.find("persistence-supervisor.mjs").unwrap();
        let injector_flag_pos = value.find("--injector").unwrap();
        assert!(supervisor_pos < injector_flag_pos);
    }
}
