//! macOS adapter：LaunchAgent 守护 supervisor + 动态发现 Codex bundle。
//!
//! 修复审计指出的缺陷：
//! - 守护对象从 injector 改为 supervisor；
//! - Node 路径通过 mdfind + 候选目录动态发现，不再硬编码 /Applications/ChatGPT.app；
//! - launchctl 一律校验退出码与 stderr（bootstrap/bootout/kickstart）。

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use super::{CodexInstallation, PersistenceError, PersistencePlatform, SupervisorSpec};

pub const SUPERVISOR_LABEL: &str = "com.codex-themes.skin-store.supervisor";
/// 旧实现注册的 injector LaunchAgent，迁移时需要清理。
pub const LEGACY_INJECTOR_LABEL: &str = "com.codex-themes.skin-store.injector";

pub struct MacosPersistence {
    home: PathBuf,
}

impl MacosPersistence {
    #[allow(dead_code)] // 经 default_service() 在生产构建中构造
    pub fn new() -> Result<Self, PersistenceError> {
        let home = std::env::var("HOME")
            .map_err(|_| PersistenceError::Io("HOME is not set".into()))?;
        Ok(Self {
            home: PathBuf::from(home),
        })
    }

    pub fn plist_path(&self) -> PathBuf {
        self.home
            .join("Library")
            .join("LaunchAgents")
            .join(format!("{SUPERVISOR_LABEL}.plist"))
    }

    pub fn legacy_plist_path(&self) -> PathBuf {
        self.home
            .join("Library")
            .join("LaunchAgents")
            .join(format!("{LEGACY_INJECTOR_LABEL}.plist"))
    }

    fn uid() -> Result<String, PersistenceError> {
        let out = Command::new("id")
            .arg("-u")
            .output()
            .map_err(|e| PersistenceError::Register(format!("id -u: {e}")))?;
        if !out.status.success() {
            return Err(PersistenceError::Register(format!(
                "id -u 退出码 {:?}",
                out.status.code()
            )));
        }
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    }

    /// 运行 launchctl 并校验退出码（审计缺陷 #4）。
    fn launchctl(args: &[&str]) -> Result<String, PersistenceError> {
        let out = Command::new("launchctl")
            .args(args)
            .output()
            .map_err(|e| PersistenceError::Register(format!("launchctl {:?}: {e}", args)))?;
        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        let stderr = String::from_utf8_lossy(&out.stderr).to_string();
        if !out.status.success() {
            return Err(PersistenceError::Register(format!(
                "launchctl {:?} 退出码 {:?}: {}",
                args,
                out.status.code(),
                stderr.trim()
            )));
        }
        Ok(stdout)
    }
}

/// 生成 supervisor 的 LaunchAgent plist。
/// 纯函数以便单元测试快照（testing.md §2.3）。
pub fn render_plist(spec: &SupervisorSpec) -> String {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>{label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{node}</string>
    <string>{supervisor}</string>
    <string>--state-root</string>
    <string>{state_root}</string>
    <string>--theme-dir</string>
    <string>{theme_dir}</string>
    <string>--injector</string>
    <string>{injector}</string>
    <string>--codex-process</string>
    <string>{pattern}</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>{log}</string>
  <key>StandardErrorPath</key><string>{err}</string>
</dict>
</plist>
"#,
        label = spec.label,
        node = spec.node_path.display(),
        supervisor = spec.supervisor_script.display(),
        state_root = spec.state_root.display(),
        theme_dir = spec.theme_dir.display(),
        injector = spec.injector_script.display(),
        pattern = spec.codex_process_pattern,
        log = spec.log_path.display(),
        err = spec.error_log_path.display(),
    )
}

/// 在候选 bundle 中找第一个同时含主可执行文件与签名 Node 的安装。
/// 纯函数：候选列表由调用方给（单元测试可喂临时目录）。
pub fn pick_installation(candidates: &[PathBuf]) -> Option<CodexInstallation> {
    for bundle in candidates {
        let info_plist = bundle.join("Contents").join("Info.plist");
        if !info_plist.is_file() {
            continue;
        }
        let node = bundle
            .join("Contents")
            .join("Resources")
            .join("cua_node")
            .join("bin")
            .join("node");
        if !node.is_file() {
            continue;
        }
        let executable = read_plist_raw(&info_plist, "CFBundleExecutable")?;
        let exe = bundle.join("Contents").join("MacOS").join(&executable);
        if !exe.is_file() {
            continue;
        }
        let version = read_plist_raw(&info_plist, "CFBundleShortVersionString");
        return Some(CodexInstallation {
            bundle_path: bundle.clone(),
            executable_name: executable,
            node_path: node,
            version,
        });
    }
    None
}

/// 静态候选目录（Spotlight 之外的兜底）。
pub fn static_candidates(home: &Path) -> Vec<PathBuf> {
    vec![
        PathBuf::from("/Applications/ChatGPT.app"),
        home.join("Applications").join("ChatGPT.app"),
        PathBuf::from("/Applications/Codex.app"),
        home.join("Applications").join("Codex.app"),
    ]
}

fn read_plist_raw(plist: &Path, key: &str) -> Option<String> {
    let out = Command::new("plutil")
        .args(["-extract", key, "raw", "-o", "-"])
        .arg(plist)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let value = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

impl PersistencePlatform for MacosPersistence {
    fn register(&self, spec: &SupervisorSpec) -> Result<(), PersistenceError> {
        let agents = self.home.join("Library").join("LaunchAgents");
        fs::create_dir_all(&agents)
            .map_err(|e| PersistenceError::Register(format!("mkdir LaunchAgents: {e}")))?;

        // 迁移：清理旧版 injector LaunchAgent（execution.md §8.1）
        self.unregister_legacy().map_err(|e| {
            PersistenceError::Register(format!("清理旧版 injector 自启项失败: {e}"))
        })?;

        let plist = render_plist(spec);
        let plist_path = self.plist_path();
        let tmp = plist_path.with_extension("pokemon-tmp");
        fs::write(&tmp, plist.as_bytes())
            .map_err(|e| PersistenceError::Register(format!("write plist: {e}")))?;
        fs::rename(&tmp, &plist_path)
            .map_err(|e| PersistenceError::Register(format!("rename plist: {e}")))?;

        let uid = Self::uid()?;
        let domain = format!("gui/{uid}");
        let target = format!("{domain}/{SUPERVISOR_LABEL}");
        // 幂等：已注册则先 bootout（bootout 未注册时返回非零，忽略）
        let _ = Command::new("launchctl")
            .args(["bootout", &target])
            .output();
        Self::launchctl(&["bootstrap", &domain, &plist_path.to_string_lossy()])?;
        Self::launchctl(&["kickstart", &target])?;
        Ok(())
    }

    fn unregister(&self) -> Result<(), PersistenceError> {
        let plist_path = self.plist_path();
        if plist_path.exists() {
            let uid = Self::uid()?;
            let target = format!("gui/{uid}/{SUPERVISOR_LABEL}");
            // bootout 可能因未加载而失败——只要文件删掉就算注销成功
            let _ = Command::new("launchctl").args(["bootout", &target]).output();
            fs::remove_file(&plist_path)
                .map_err(|e| PersistenceError::Unregister(format!("remove plist: {e}")))?;
        }
        self.unregister_legacy()?;
        Ok(())
    }

    fn is_registered(&self) -> bool {
        self.plist_path().exists()
    }

    fn discover_codex(&self) -> Result<CodexInstallation, PersistenceError> {
        // Spotlight 发现（非标准安装位置），再叠加静态候选
        let mut candidates: Vec<PathBuf> = Vec::new();
        if let Ok(out) = Command::new("mdfind")
            .args(["kMDItemCFBundleIdentifier == 'com.openai.codex'"])
            .output()
        {
            if out.status.success() {
                for line in String::from_utf8_lossy(&out.stdout).lines() {
                    let p = PathBuf::from(line.trim());
                    if !line.trim().is_empty() && p.is_dir() {
                        candidates.push(p);
                    }
                }
            }
        }
        candidates.extend(static_candidates(&self.home));
        pick_installation(&candidates).ok_or_else(|| {
            PersistenceError::Discover(
                "找不到 Codex/ChatGPT 安装（com.openai.codex），请确认已安装 Codex 桌面 App".into(),
            )
        })
    }
}

impl MacosPersistence {
    /// 清理旧版（injector 直挂 LaunchAgent）的注册，迁移幂等。
    fn unregister_legacy(&self) -> Result<(), PersistenceError> {
        let legacy = self.legacy_plist_path();
        if legacy.exists() {
            if let Ok(uid) = Self::uid() {
                let target = format!("gui/{uid}/{LEGACY_INJECTOR_LABEL}");
                let _ = Command::new("launchctl").args(["bootout", &target]).output();
            }
            // 兼容更旧的 launchctl unload 语义（老系统）
            let _ = Command::new("launchctl")
                .args(["unload", &legacy.to_string_lossy()])
                .output();
            fs::remove_file(&legacy)
                .map_err(|e| PersistenceError::Unregister(format!("remove legacy plist: {e}")))?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn spec() -> SupervisorSpec {
        SupervisorSpec {
            label: SUPERVISOR_LABEL.into(),
            node_path: PathBuf::from("/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node"),
            supervisor_script: PathBuf::from("/state/scripts/persistence-supervisor.mjs"),
            state_root: PathBuf::from("/state"),
            theme_dir: PathBuf::from("/state/theme"),
            injector_script: PathBuf::from("/state/scripts/injector.mjs"),
            codex_process_pattern: "ChatGPT|Codex".into(),
            log_path: PathBuf::from("/state/supervisor.log"),
            error_log_path: PathBuf::from("/state/supervisor-error.log"),
        }
    }

    #[test]
    fn plist_supervises_supervisor_not_injector() {
        let plist = render_plist(&spec());
        // 守护对象必须是 supervisor 脚本
        assert!(plist.contains("persistence-supervisor.mjs"));
        // injector 只作为参数出现（--injector），不是 ProgramArguments 的主程序
        let args_start = plist.find("<array>").unwrap();
        let args_end = plist.find("</array>").unwrap();
        let args = &plist[args_start..args_end];
        assert!(args.find("persistence-supervisor.mjs").unwrap() < args.find("--state-root").unwrap());
        assert!(plist.contains("<key>RunAtLoad</key><true/>"));
        assert!(plist.contains(SUPERVISOR_LABEL));
        assert!(!plist.contains(LEGACY_INJECTOR_LABEL));
    }

    #[test]
    fn plist_passes_full_supervisor_args() {
        let plist = render_plist(&spec());
        for expected in [
            "--state-root",
            "/state",
            "--theme-dir",
            "/state/theme",
            "--injector",
            "/state/scripts/injector.mjs",
            "--codex-process",
            "ChatGPT|Codex",
        ] {
            assert!(plist.contains(expected), "plist 缺少 {expected}");
        }
    }

    #[test]
    fn static_candidates_cover_chatgpt_and_codex() {
        let home = PathBuf::from("/Users/test");
        let candidates = static_candidates(&home);
        assert!(candidates.iter().any(|p| p.ends_with("ChatGPT.app")));
        assert!(candidates.iter().any(|p| p.ends_with("Codex.app")));
        assert!(candidates.iter().any(|p| p.starts_with("/Applications")));
        assert!(candidates.iter().any(|p| p.starts_with(&home)));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn pick_installation_requires_node_and_executable() {
        let root = std::env::temp_dir().join(format!("codex-pick-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let bundle = root.join("Fake.app");
        // 不完整 bundle：只有 Info.plist
        fs::create_dir_all(bundle.join("Contents")).unwrap();
        fs::write(
            bundle.join("Contents").join("Info.plist"),
            br#"<?xml version="1.0"?><plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>FakeCodex</string>
<key>CFBundleShortVersionString</key><string>1.0</string>
</dict></plist>"#,
        )
        .unwrap();
        assert!(pick_installation(std::slice::from_ref(&bundle)).is_none());

        // 补齐可执行文件与签名 Node
        fs::create_dir_all(bundle.join("Contents").join("MacOS")).unwrap();
        fs::write(bundle.join("Contents").join("MacOS").join("FakeCodex"), b"#!/bin/sh\n").unwrap();
        fs::create_dir_all(
            bundle
                .join("Contents")
                .join("Resources")
                .join("cua_node")
                .join("bin"),
        )
        .unwrap();
        fs::write(
            bundle
                .join("Contents")
                .join("Resources")
                .join("cua_node")
                .join("bin")
                .join("node"),
            b"#!/bin/sh\n",
        )
        .unwrap();

        let found = pick_installation(std::slice::from_ref(&bundle)).expect("应发现完整 bundle");
        assert_eq!(found.executable_name, "FakeCodex");
        assert!(found.node_path.ends_with("cua_node/bin/node"));
        assert_eq!(found.version.as_deref(), Some("1.0"));
        let _ = fs::remove_dir_all(root);
    }
}
