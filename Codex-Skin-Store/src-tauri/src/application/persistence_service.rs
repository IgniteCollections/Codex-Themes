//! 持久化用例层（docs/persistence/execution.md §4）：enable / disable / status / repair。

use std::path::PathBuf;

use crate::domain::persistence::{
    PersistenceConfig, PersistenceStatus, DEFAULT_CDP_PORT,
};
use crate::infrastructure::persistence_platform::{
    CodexInstallation, PersistenceError, PersistencePlatform, SupervisorSpec,
};
#[cfg(all(unix, not(test)))]
use crate::infrastructure::persistence_platform::macos::{MacosPersistence, SUPERVISOR_LABEL};
#[cfg(all(windows, not(test)))]
use crate::infrastructure::persistence_platform::windows::{
    codex_process_pattern, WindowsPersistence, RUN_VALUE_NAME,
};
use crate::infrastructure::persistence_store::PersistenceStore;

/// 供命令层使用的持久化服务接口（便于 impl Trait 返回与测试替身）。
#[cfg_attr(test, allow(dead_code))] // 测试构建中经 #[cfg(not(test))] 屏蔽了生产调用方
pub trait PersistenceServiceTrait {
    fn enable(&self, active_theme: Option<(String, String)>) -> Result<(), String>;
    fn disable(&self) -> Result<(), String>;
    fn remove_all(&self) -> Result<(), String>;
    fn repair(&self) -> Result<(), String>;
    fn status(&self) -> PersistenceStatus;
    #[allow(dead_code)]
    fn is_enabled(&self) -> bool;
    fn sync_active_theme(&self, theme_id: &str, theme_name: Option<&str>) -> Result<(), String>;
}

pub struct PersistenceService<P: PersistencePlatform> {
    platform: P,
    store: PersistenceStore,
    state_root: PathBuf,
    theme_dir: PathBuf,
    supervisor_script: PathBuf,
    injector_script: PathBuf,
}

#[cfg(all(unix, not(test)))]
pub fn default_service(
    state_root: PathBuf,
    theme_dir: PathBuf,
    scripts_dir: PathBuf,
) -> Result<PersistenceService<MacosPersistence>, PersistenceError> {
    PersistenceService::new(
        MacosPersistence::new()?,
        state_root,
        theme_dir,
        scripts_dir.join("persistence-supervisor.mjs"),
        scripts_dir.join("injector.mjs"),
    )
}

#[cfg(all(windows, not(test)))]
pub fn default_service(
    state_root: PathBuf,
    theme_dir: PathBuf,
    scripts_dir: PathBuf,
) -> Result<PersistenceService<WindowsPersistence>, PersistenceError> {
    PersistenceService::new(
        WindowsPersistence,
        state_root,
        theme_dir,
        scripts_dir.join("persistence-supervisor.mjs"),
        scripts_dir.join("injector.mjs"),
    )
}

impl<P: PersistencePlatform> PersistenceService<P> {
    pub fn new(
        platform: P,
        state_root: PathBuf,
        theme_dir: PathBuf,
        supervisor_script: PathBuf,
        injector_script: PathBuf,
    ) -> Result<Self, PersistenceError> {
        Ok(Self {
            platform,
            store: PersistenceStore::new(state_root.clone()),
            state_root,
            theme_dir,
            supervisor_script,
            injector_script,
        })
    }

    fn label(&self) -> String {
        #[cfg(all(unix, not(test)))]
        {
            SUPERVISOR_LABEL.to_string()
        }
        #[cfg(all(windows, not(test)))]
        {
            RUN_VALUE_NAME.to_string()
        }
        #[cfg(test)]
        {
            "test-supervisor-label".to_string()
        }
    }

    fn codex_pattern(&self, installation: &CodexInstallation) -> String {
        #[cfg(any(unix, test))]
        {
            // 用发现到的可执行名观察进程（覆盖 ChatGPT/Codex 两种 bundle）
            installation.executable_name.clone()
        }
        #[cfg(all(windows, not(test)))]
        {
            let _ = installation;
            codex_process_pattern()
        }
    }

    fn build_spec(&self, installation: CodexInstallation) -> SupervisorSpec {
        SupervisorSpec {
            label: self.label(),
            codex_process_pattern: self.codex_pattern(&installation),
            node_path: installation.node_path,
            supervisor_script: self.supervisor_script.clone(),
            state_root: self.state_root.clone(),
            theme_dir: self.theme_dir.clone(),
            injector_script: self.injector_script.clone(),
            log_path: self.state_root.join("supervisor.log"),
            error_log_path: self.state_root.join("supervisor-error.log"),
        }
    }

    /// 启用持久化：发现 Codex → 写配置 → 注册 supervisor（FR-1）。
    pub fn enable(&self, active_theme: Option<(String, String)>) -> Result<(), String> {
        let installation = self.platform.discover_codex().map_err(|e| e.to_string())?;
        let mut config = PersistenceConfig::enabled_default();
        if let Some((id, name)) = active_theme {
            config.active_theme_id = Some(id);
            config.active_theme_name = Some(name);
        }
        // 端口沿用引擎 state.json（若有）
        if let Some(port) = self.engine_port() {
            config.port = Some(port);
        }
        self.store
            .write_config(&config)
            .map_err(|e| PersistenceError::Io(e).to_string())?;
        let spec = self.build_spec(installation);
        self.platform.register(&spec).map_err(|e| e.to_string())
    }

    /// 关闭持久化：注销 supervisor，保留配置（enabled=false），便于再次开启（FR-1）。
    pub fn disable(&self) -> Result<(), String> {
        self.platform.unregister().map_err(|e| e.to_string())?;
        if let Some(mut config) = self.store.read_config().map_err(|e| PersistenceError::Io(e).to_string())? {
            config.enabled = false;
            self.store
                .write_config(&config)
                .map_err(|e| PersistenceError::Io(e).to_string())?;
        }
        Ok(())
    }

    /// Official Restore 的持久化部分：注销 + 清理全部持久化状态（FR-5）。
    pub fn remove_all(&self) -> Result<(), String> {
        self.platform.unregister().map_err(|e| e.to_string())?;
        self.store.clear().map_err(|e| PersistenceError::Io(e).to_string())
    }

    /// 修复自动恢复：重跑注册（FR-4）。
    pub fn repair(&self) -> Result<(), String> {
        let config = self
            .store
            .read_config()
            .map_err(|e| PersistenceError::Io(e).to_string())?;
        let theme = config
            .filter(|c| c.enabled)
            .and_then(|c| c.active_theme_id.zip(c.active_theme_name));
        self.enable(theme)
    }

    /// UI 投影（FR-3）。
    pub fn status(&self) -> PersistenceStatus {
        let config = self.store.read_config().ok().flatten();
        let report = self.store.read_status().ok().flatten();
        PersistenceStatus::project(config.as_ref(), report.as_ref())
    }

    /// 是否已启用（供 start_engine 决定是否顺带注册）。
    #[allow(dead_code)] // 预留给「应用主题时如已启用则热更新 supervisor」场景
    pub fn is_enabled(&self) -> bool {
        matches!(
            self.store.read_config(),
            Ok(Some(c)) if c.enabled
        )
    }

    /// switch_scene 成功后同步 active theme 到持久化配置（A5）。
    #[allow(dead_code)] // trait 方法经 lib.rs 调用，实现本身被 trait 覆盖
    pub fn sync_active_theme(&self, theme_id: &str, theme_name: Option<&str>) -> Result<(), String> {
        self.store
            .sync_active_theme(theme_id, theme_name)
            .map_err(|e| PersistenceError::Io(e).to_string())
    }

    fn engine_port(&self) -> Option<u16> {
        let text = std::fs::read_to_string(self.state_root.join("state.json")).ok()?;
        let v: serde_json::Value = serde_json::from_str(&text).ok()?;
        v.get("port")?.as_u64().map(|p| p as u16).or(Some(DEFAULT_CDP_PORT))
    }
}

impl<P: PersistencePlatform> PersistenceServiceTrait for PersistenceService<P> {
    fn enable(&self, active_theme: Option<(String, String)>) -> Result<(), String> {
        self.enable(active_theme)
    }
    fn disable(&self) -> Result<(), String> {
        self.disable()
    }
    fn remove_all(&self) -> Result<(), String> {
        self.remove_all()
    }
    fn repair(&self) -> Result<(), String> {
        self.repair()
    }
    fn status(&self) -> PersistenceStatus {
        self.status()
    }
    fn is_enabled(&self) -> bool {
        self.is_enabled()
    }
    fn sync_active_theme(&self, theme_id: &str, theme_name: Option<&str>) -> Result<(), String> {
        self.sync_active_theme(theme_id, theme_name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    #[derive(Default)]
    struct FakePlatform {
        registered: RefCell<Option<SupervisorSpec>>,
        fail_register: RefCell<bool>,
    }

    impl FakePlatform {
        fn new() -> Self {
            Self::default()
        }

        fn discover_result() -> CodexInstallation {
            CodexInstallation {
                bundle_path: PathBuf::from("/fake/Codex.app"),
                executable_name: "Codex".into(),
                node_path: PathBuf::from("/fake/node"),
                version: Some("1.0".into()),
            }
        }
    }

    impl PersistencePlatform for FakePlatform {
        fn register(&self, spec: &SupervisorSpec) -> Result<(), PersistenceError> {
            if *self.fail_register.borrow() {
                return Err(PersistenceError::Register("模拟失败".into()));
            }
            *self.registered.borrow_mut() = Some(spec.clone());
            Ok(())
        }
        fn unregister(&self) -> Result<(), PersistenceError> {
            *self.registered.borrow_mut() = None;
            Ok(())
        }
        fn is_registered(&self) -> bool {
            self.registered.borrow().is_some()
        }
        fn discover_codex(&self) -> Result<CodexInstallation, PersistenceError> {
            Ok(Self::discover_result())
        }
    }

    fn service(tag: &str) -> (PersistenceService<FakePlatform>, PathBuf) {
        let root = std::env::temp_dir().join(format!("codex-svc-test-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let svc = PersistenceService::new(
            FakePlatform::new(),
            root.clone(),
            root.join("theme"),
            root.join("persistence-supervisor.mjs"),
            root.join("injector.mjs"),
        )
        .unwrap();
        (svc, root)
    }

    #[test]
    fn enable_discovers_codex_and_registers_supervisor() {
        let (svc, root) = service("enable");
        svc.enable(Some(("grassland".into(), "草原".into()))).unwrap();
        let spec = svc.platform.registered.borrow().clone().unwrap();
        // 守护对象是 supervisor 脚本
        assert!(spec
            .supervisor_script
            .ends_with("persistence-supervisor.mjs"));
        // 用发现到的可执行名做进程观察
        #[cfg(any(unix, test))]
        assert_eq!(spec.codex_process_pattern, "Codex");
        // 配置已持久化
        let config = svc.store.read_config().unwrap().unwrap();
        assert!(config.enabled);
        assert_eq!(config.active_theme_id.as_deref(), Some("grassland"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn enable_propagates_register_failure() {
        let (svc, root) = service("fail");
        *svc.platform.fail_register.borrow_mut() = true;
        let err = svc.enable(None).unwrap_err();
        assert!(err.contains("注册失败"), "错误应带阶段: {err}");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn disable_keeps_config_but_marks_disabled() {
        let (svc, root) = service("disable");
        svc.enable(Some(("ocean".into(), "海洋".into()))).unwrap();
        svc.disable().unwrap();
        assert!(!svc.platform.is_registered());
        let config = svc.store.read_config().unwrap().unwrap();
        assert!(!config.enabled);
        assert_eq!(config.active_theme_id.as_deref(), Some("ocean"), "主题记录应保留");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn remove_all_clears_registration_and_state() {
        let (svc, root) = service("remove");
        svc.enable(None).unwrap();
        svc.remove_all().unwrap();
        assert!(!svc.platform.is_registered());
        assert!(svc.store.read_config().unwrap().is_none());
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn status_projects_registered_when_enabled_without_report() {
        let (svc, root) = service("status");
        assert_eq!(
            svc.status().phase,
            crate::domain::persistence::PersistencePhase::Disabled
        );
        svc.enable(Some(("cave".into(), "洞穴".into()))).unwrap();
        let status = svc.status();
        assert_eq!(
            status.phase,
            crate::domain::persistence::PersistencePhase::Registered
        );
        assert_eq!(status.active_theme_id.as_deref(), Some("cave"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn repair_reruns_enable_with_saved_theme() {
        let (svc, root) = service("repair");
        svc.enable(Some(("magma".into(), "岩浆".into()))).unwrap();
        svc.platform.unregister().unwrap();
        svc.repair().unwrap();
        assert!(svc.platform.is_registered());
        let _ = std::fs::remove_dir_all(root);
    }
}
