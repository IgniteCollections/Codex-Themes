//! 持久化领域模型（docs/persistence/execution.md §2）。
//!
//! 状态机的运行副本在 Node 侧（persistence-core.mjs，因为 supervisor 常驻进程
//! 是 Node 脚本）；本模块定义 Skin Store 侧共享的类型、状态文件 schema 与
//! 迁移/解析规则，并保证两侧序列化契约一致。

use serde::{Deserialize, Serialize};

pub const SCHEMA_VERSION: u32 = 1;
pub const SUPERVISOR_VERSION: &str = "1.0.0";
pub const DEFAULT_CDP_PORT: u16 = 9341;

/// supervisor 生命周期相位（与 persistence-core.mjs 的 PHASES 一一对应）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Phase {
    Watching,
    Probing,
    Injecting,
    Injected,
    NeedsRestart,
    Error,
}

/// 展示给 UI 的持久化状态（get_status 的投影）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PersistencePhase {
    /// 未启用（无配置文件或 enabled=false）
    Disabled,
    /// 已注册 supervisor，尚未上报运行状态
    Registered,
    /// supervisor 运行中，等待 Codex 出现
    WaitingForCodex,
    /// 已注入
    Injected,
    /// Codex 在运行但无 CDP，等待用户受控重启
    NeedsRestart,
    /// 异常（lastError 有详情）
    Error,
}

/// 用户配置（persistence-config.json）：Skin Store 写，supervisor 读。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceConfig {
    pub schema_version: u32,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    pub supervisor_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_theme_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_theme_name: Option<String>,
}

impl PersistenceConfig {
    pub fn enabled_default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            enabled: true,
            port: Some(DEFAULT_CDP_PORT),
            supervisor_version: SUPERVISOR_VERSION.to_string(),
            active_theme_id: None,
            active_theme_name: None,
        }
    }
}

/// 最近一次错误（状态文件内嵌）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LastError {
    pub stage: String,
    pub message: String,
    pub at: String,
}

/// supervisor 上报的运行状态（persistence.json）：supervisor 写，Skin Store 读。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SupervisorStatus {
    pub schema_version: u32,
    pub enabled: bool,
    pub port: u16,
    pub supervisor_version: String,
    #[serde(default)]
    pub active_theme_id: Option<String>,
    #[serde(default)]
    pub active_theme_name: Option<String>,
    pub phase: Phase,
    #[serde(default)]
    pub last_success_at: Option<String>,
    #[serde(default)]
    pub last_injected_theme_id: Option<String>,
    #[serde(default)]
    pub last_error: Option<LastError>,
    pub updated_at: String,
}

impl SupervisorStatus {
    /// 映射为 UI 相位。
    pub fn ui_phase(&self) -> PersistencePhase {
        if !self.enabled {
            return PersistencePhase::Disabled;
        }
        match self.phase {
            Phase::Watching | Phase::Probing => PersistencePhase::WaitingForCodex,
            Phase::Injecting | Phase::Injected => PersistencePhase::Injected,
            Phase::NeedsRestart => PersistencePhase::NeedsRestart,
            Phase::Error => PersistencePhase::Error,
        }
    }
}

/// get_status 暴露给前端的持久化投影。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceStatus {
    pub phase: PersistencePhase,
    pub active_theme_id: Option<String>,
    pub last_success_at: Option<String>,
    pub last_error: Option<LastError>,
}

impl PersistenceStatus {
    pub fn disabled() -> Self {
        Self {
            phase: PersistencePhase::Disabled,
            active_theme_id: None,
            last_success_at: None,
            last_error: None,
        }
    }

    /// 合并配置与 supervisor 上报，生成 UI 投影。
    /// 规则（execution.md §2.1）：配置决定 enabled/theme，上报决定运行相位。
    pub fn project(
        config: Option<&PersistenceConfig>,
        report: Option<&SupervisorStatus>,
    ) -> Self {
        match (config, report) {
            (Some(c), _) if !c.enabled => Self::disabled(),
            (Some(c), Some(r)) => Self {
                phase: r.ui_phase(),
                active_theme_id: c.active_theme_id.clone().or_else(|| r.active_theme_id.clone()),
                last_success_at: r.last_success_at.clone(),
                last_error: r.last_error.clone(),
            },
            (Some(c), None) => Self {
                phase: PersistencePhase::Registered,
                active_theme_id: c.active_theme_id.clone(),
                last_success_at: None,
                last_error: None,
            },
            (None, _) => Self::disabled(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(enabled: bool) -> PersistenceConfig {
        PersistenceConfig {
            enabled,
            active_theme_id: Some("grassland".into()),
            active_theme_name: Some("草原".into()),
            ..PersistenceConfig::enabled_default()
        }
    }

    fn report(phase: Phase) -> SupervisorStatus {
        SupervisorStatus {
            schema_version: SCHEMA_VERSION,
            enabled: true,
            port: DEFAULT_CDP_PORT,
            supervisor_version: SUPERVISOR_VERSION.into(),
            active_theme_id: Some("grassland".into()),
            active_theme_name: Some("草原".into()),
            phase,
            last_success_at: Some("2026-07-24T10:00:00Z".into()),
            last_injected_theme_id: Some("grassland".into()),
            last_error: None,
            updated_at: "2026-07-24T10:00:01Z".into(),
        }
    }

    #[test]
    fn ui_phase_maps_running_phases() {
        assert_eq!(report(Phase::Watching).ui_phase(), PersistencePhase::WaitingForCodex);
        assert_eq!(report(Phase::Probing).ui_phase(), PersistencePhase::WaitingForCodex);
        assert_eq!(report(Phase::Injecting).ui_phase(), PersistencePhase::Injected);
        assert_eq!(report(Phase::Injected).ui_phase(), PersistencePhase::Injected);
        assert_eq!(report(Phase::NeedsRestart).ui_phase(), PersistencePhase::NeedsRestart);
        assert_eq!(report(Phase::Error).ui_phase(), PersistencePhase::Error);
    }

    #[test]
    fn project_disabled_when_config_disabled_or_missing() {
        assert_eq!(PersistenceStatus::project(None, None).phase, PersistencePhase::Disabled);
        assert_eq!(
            PersistenceStatus::project(Some(&cfg(false)), Some(&report(Phase::Injected))).phase,
            PersistencePhase::Disabled
        );
    }

    #[test]
    fn project_registered_when_no_report_yet() {
        let s = PersistenceStatus::project(Some(&cfg(true)), None);
        assert_eq!(s.phase, PersistencePhase::Registered);
        assert_eq!(s.active_theme_id.as_deref(), Some("grassland"));
    }

    #[test]
    fn project_merges_config_theme_with_report_phase() {
        let mut r = report(Phase::Error);
        r.last_error = Some(LastError {
            stage: "inject".into(),
            message: "injector exited".into(),
            at: "2026-07-24T10:01:00Z".into(),
        });
        let s = PersistenceStatus::project(Some(&cfg(true)), Some(&r));
        assert_eq!(s.phase, PersistencePhase::Error);
        assert_eq!(s.active_theme_id.as_deref(), Some("grassland"));
        assert_eq!(s.last_error.as_ref().map(|e| e.stage.as_str()), Some("inject"));
    }

    #[test]
    fn phase_serde_matches_node_contract() {
        // 与 persistence-core.mjs 的 kebab-case 相位字符串保持一致
        let json = serde_json::to_string(&Phase::NeedsRestart).unwrap();
        assert_eq!(json, "\"needs-restart\"");
        let back: Phase = serde_json::from_str("\"waiting\"")
            .unwrap_or(Phase::Watching);
        assert_eq!(back, Phase::Watching);
        let parsed: Phase = serde_json::from_str("\"injected\"").unwrap();
        assert_eq!(parsed, Phase::Injected);
    }
}
