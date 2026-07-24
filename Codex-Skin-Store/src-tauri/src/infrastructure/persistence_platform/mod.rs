//! 平台持久化抽象（docs/persistence/execution.md §3）。
//!
//! 守护对象是 **supervisor**（persistence-supervisor.mjs），不再是 injector：
//! LaunchAgent / Run 键只负责让 supervisor 常驻，supervisor 再观察 Codex
//! 并按需拉起 watch injector。

use std::fmt;
use std::path::PathBuf;

pub mod macos;
pub mod windows;

/// 持久化操作错误：带阶段标记，保证 UI 能精确显示失败环节（验收 A8）。
#[derive(Debug)]
pub enum PersistenceError {
    /// 注册自启项失败
    Register(String),
    /// 注销自启项失败
    Unregister(String),
    /// Codex 安装发现失败
    Discover(String),
    /// 状态文件 IO
    Io(String),
}

impl fmt::Display for PersistenceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Register(m) => write!(f, "注册失败: {m}"),
            Self::Unregister(m) => write!(f, "注销失败: {m}"),
            Self::Discover(m) => write!(f, "Codex 发现失败: {m}"),
            Self::Io(m) => write!(f, "状态读写失败: {m}"),
        }
    }
}

/// 一次发现的 Codex 安装（动态发现结果，禁止硬编码路径）。
#[derive(Debug, Clone, PartialEq)]
pub struct CodexInstallation {
    /// App bundle（macOS .app）或安装目录（Windows）
    pub bundle_path: PathBuf,
    /// 主可执行文件名（用于进程观察）
    pub executable_name: String,
    /// bundle 内签名 Node（macOS）；Windows 为系统 node
    pub node_path: PathBuf,
    /// 版本号（诊断用）
    pub version: Option<String>,
}

/// supervisor 启动规格（注册自启项时的完整参数）。
#[derive(Debug, Clone, PartialEq)]
pub struct SupervisorSpec {
    pub label: String,
    pub node_path: PathBuf,
    pub supervisor_script: PathBuf,
    pub state_root: PathBuf,
    pub theme_dir: PathBuf,
    pub injector_script: PathBuf,
    /// 进程观察用的匹配模式（如 "ChatGPT|Codex"）
    pub codex_process_pattern: String,
    pub log_path: PathBuf,
    pub error_log_path: PathBuf,
}

pub trait PersistencePlatform {
    /// 注册 supervisor 自启项（幂等：重复调用先卸再载）。
    fn register(&self, spec: &SupervisorSpec) -> Result<(), PersistenceError>;
    /// 注销自启项并停掉运行中的 supervisor。
    fn unregister(&self) -> Result<(), PersistenceError>;
    /// 自启项是否已注册。
    #[allow(dead_code)] // 预留给状态自检（UI 显示「已注册/需修复」）
    fn is_registered(&self) -> bool;
    /// 动态发现 Codex 安装（bundle / 签名 Node / 进程名）。
    fn discover_codex(&self) -> Result<CodexInstallation, PersistenceError>;
}
