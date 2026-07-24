//! persistence-config.json / persistence.json 的原子读写与 schema 迁移。
//!
//! 写入一律临时文件 + rename（与 lib.rs 的 atomic_write 同一约定）；
//! 读取失败（损坏 JSON / 未来 schema）不 panic：
//! - 损坏 JSON → Ok(None)（视为未启用，supervisor 会以默认配置重建）
//! - schemaVersion 更高 → Err(需升级 Skin Store)，不静默丢数据

use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::persistence::{PersistenceConfig, SupervisorStatus, SCHEMA_VERSION};

pub struct PersistenceStore {
    state_root: PathBuf,
}

impl PersistenceStore {
    pub fn new(state_root: PathBuf) -> Self {
        Self { state_root }
    }

    pub fn config_path(&self) -> PathBuf {
        self.state_root.join("persistence-config.json")
    }

    pub fn status_path(&self) -> PathBuf {
        self.state_root.join("persistence.json")
    }

    pub fn read_config(&self) -> Result<Option<PersistenceConfig>, String> {
        read_json(&self.config_path())
    }

    pub fn read_status(&self) -> Result<Option<SupervisorStatus>, String> {
        read_json(&self.status_path())
    }

    pub fn write_config(&self, config: &PersistenceConfig) -> Result<(), String> {
        atomic_write_json(&self.config_path(), config)
    }

    /// 更新启用状态中的 active theme（switch_scene 成功后调用）。
    /// 仅在已启用时写入；未启用/无配置时不创建文件（execution.md §5 衔接）。
    pub fn sync_active_theme(&self, theme_id: &str, theme_name: Option<&str>) -> Result<(), String> {
        let Some(mut config) = self.read_config()? else {
            return Ok(());
        };
        if !config.enabled {
            return Ok(());
        }
        config.active_theme_id = Some(theme_id.to_string());
        config.active_theme_name = theme_name.map(str::to_string);
        self.write_config(&config)
    }

    /// 注销持久化：移除配置与状态文件（Official Restore 的一部分）。
    pub fn clear(&self) -> Result<(), String> {
        for path in [self.config_path(), self.status_path()] {
            if path.exists() {
                fs::remove_file(&path).map_err(|e| format!("remove {}: {e}", path.display()))?;
            }
        }
        Ok(())
    }
}

fn read_json<T>(path: &Path) -> Result<Option<T>, String>
where
    T: serde::de::DeserializeOwned + HasSchemaVersion,
{
    let text = match fs::read_to_string(path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(format!("read {}: {e}", path.display())),
    };
    let raw: serde_json::Value = match serde_json::from_str(&text) {
        Ok(v) => v,
        Err(_) => return Ok(None), // 损坏文件按未启用处理
    };
    let version = raw
        .get("schemaVersion")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    if version > u64::from(SCHEMA_VERSION) {
        return Err(format!(
            "{} 的 schemaVersion={version} 高于本应用支持的 {SCHEMA_VERSION}，请升级 Skin Store",
            path.display()
        ));
    }
    // 旧 schema（0 = 没有版本号的早期实验文件）：字段与新 schema 兼容则直接解析，
    // 缺字段走 serde default；解析失败同样视为未启用而不是丢用户配置。
    match serde_json::from_value::<T>(raw) {
        Ok(v) => Ok(Some(v)),
        Err(_) => Ok(None),
    }
}

fn atomic_write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| format!("serialize: {e}"))?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir {}: {e}", parent.display()))?;
    }
    let tmp = path.with_extension("pokemon-tmp");
    fs::write(&tmp, &bytes).map_err(|e| format!("write {}: {e}", tmp.display()))?;
    fs::rename(&tmp, path).map_err(|e| format!("rename to {}: {e}", path.display()))
}

/// schema 版本探测用的标记 trait（read_json 需要从 Value 预读版本号）。
pub trait HasSchemaVersion {}
impl HasSchemaVersion for PersistenceConfig {}
impl HasSchemaVersion for SupervisorStatus {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::persistence::DEFAULT_CDP_PORT;

    fn temp_root(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "codex-skin-store-test-{}-{}",
            tag,
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn read_missing_config_returns_none() {
        let store = PersistenceStore::new(temp_root("missing"));
        assert!(store.read_config().unwrap().is_none());
    }

    #[test]
    fn config_round_trip() {
        let root = temp_root("roundtrip");
        let store = PersistenceStore::new(root.clone());
        let mut config = PersistenceConfig::enabled_default();
        config.active_theme_id = Some("grassland".into());
        store.write_config(&config).unwrap();
        let back = store.read_config().unwrap().unwrap();
        assert!(back.enabled);
        assert_eq!(back.port, Some(DEFAULT_CDP_PORT));
        assert_eq!(back.active_theme_id.as_deref(), Some("grassland"));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn corrupted_config_is_treated_as_disabled_not_error() {
        let root = temp_root("corrupt");
        let store = PersistenceStore::new(root.clone());
        fs::write(store.config_path(), b"{not json!!!").unwrap();
        assert!(store.read_config().unwrap().is_none());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn future_schema_is_an_explicit_error() {
        let root = temp_root("future");
        let store = PersistenceStore::new(root.clone());
        fs::write(
            store.config_path(),
            br#"{"schemaVersion": 99, "enabled": true}"#,
        )
        .unwrap();
        let err = store.read_config().unwrap_err();
        assert!(err.contains("升级"), "应提示升级: {err}");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn sync_active_theme_only_when_enabled() {
        let root = temp_root("sync");
        let store = PersistenceStore::new(root.clone());
        // 无配置：不创建文件
        store.sync_active_theme("ocean", Some("海洋")).unwrap();
        assert!(!store.config_path().exists());
        // 启用后：写入
        store
            .write_config(&PersistenceConfig::enabled_default())
            .unwrap();
        store.sync_active_theme("ocean", Some("海洋")).unwrap();
        let c = store.read_config().unwrap().unwrap();
        assert_eq!(c.active_theme_id.as_deref(), Some("ocean"));
        assert_eq!(c.active_theme_name.as_deref(), Some("海洋"));
        // 禁用后：不更新
        let mut c2 = c.clone();
        c2.enabled = false;
        store.write_config(&c2).unwrap();
        store.sync_active_theme("cave", None).unwrap();
        let c3 = store.read_config().unwrap().unwrap();
        assert_eq!(c3.active_theme_id.as_deref(), Some("ocean"));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn clear_removes_both_files() {
        let root = temp_root("clear");
        let store = PersistenceStore::new(root.clone());
        store
            .write_config(&PersistenceConfig::enabled_default())
            .unwrap();
        fs::write(store.status_path(), br#"{"schemaVersion":1,"enabled":true,"port":9341,"supervisorVersion":"1.0.0","phase":"watching","updatedAt":"t"}"#).unwrap();
        store.clear().unwrap();
        assert!(!store.config_path().exists());
        assert!(!store.status_path().exists());
        let _ = fs::remove_dir_all(root);
    }
}
