//! Advanced error logging and file version tracking.
//! - Structured logging to stdout and rotating file (logs/estate_planning_rust.log)
//! - Request ID per request for correlation
//! - Audit events for critical operations (create/update/delete)
//! - Version tracking: app version + migration version logged at startup

use std::io;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::fmt::format::FmtSpan;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, Layer};

const LOG_DIR: &str = "logs";
const LOG_FILE: &str = "estate_planning_rust.log";

/// Initialize tracing: stdout + file appender (non-blocking).
/// Returns a guard that must be held for the process lifetime so logs are flushed.
pub fn init() -> Option<WorkerGuard> {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("estate_planning_rust=info,tower_http=info,warn"));

    // Stdout layer
    let stdout_layer = tracing_subscriber::fmt::layer()
        .with_writer(io::stdout)
        .with_ansi(true)
        .with_target(true)
        .with_level(true)
        .with_span_events(FmtSpan::CLOSE)
        .with_filter(filter.clone());

    // File layer: create logs/ if needed, append to file
    let file_guard = match std::fs::create_dir_all(LOG_DIR) {
        Ok(()) => {
            let file_appender = tracing_appender::rolling::never(LOG_DIR, LOG_FILE);
            let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);
            let file_layer = tracing_subscriber::fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false)
                .with_target(true)
                .with_level(true)
                .with_span_events(FmtSpan::CLOSE)
                .with_filter(filter);
            tracing_subscriber::registry()
                .with(stdout_layer)
                .with(file_layer)
                .init();
            Some(guard)
        }
        Err(e) => {
            eprintln!("Could not create log dir {}: {}", LOG_DIR, e);
            tracing_subscriber::registry().with(stdout_layer).init();
            None
        }
    };

    file_guard
}

/// Log app and migration version at startup (file version tracking).
pub fn log_version_info(migration_version: Option<String>) {
    let app_version = env!("CARGO_PKG_VERSION");
    tracing::info!(
        app_version = %app_version,
        migration_version = ?migration_version,
        "version_tracking"
    );
}

/// Audit event for critical operations (integrated with error logging).
#[derive(Debug)]
pub enum AuditEvent {
    EstatePlanCreated { id: i32, name: String },
    EstatePlanUpdated { id: i32 },
    EstatePlanDeleted { id: i32 },
    BeneficiaryCreated { id: i32, estate_plan_id: i32 },
    BeneficiaryUpdated { id: i32 },
    BeneficiaryDeleted { id: i32 },
    TimelockPolicyCreated { id: i32, estate_plan_id: i32 },
    TimelockPolicyUpdated { id: i32 },
    TimelockPolicyDeleted { id: i32 },
}

pub fn audit_log(event: AuditEvent) {
    match &event {
        AuditEvent::EstatePlanCreated { id, name } => {
            tracing::info!(event = "estate_plan_created", plan_id = %id, plan_name = %name, "audit");
        }
        AuditEvent::EstatePlanUpdated { id } => {
            tracing::info!(event = "estate_plan_updated", plan_id = %id, "audit");
        }
        AuditEvent::EstatePlanDeleted { id } => {
            tracing::info!(event = "estate_plan_deleted", plan_id = %id, "audit");
        }
        AuditEvent::BeneficiaryCreated { id, estate_plan_id } => {
            tracing::info!(event = "beneficiary_created", beneficiary_id = %id, estate_plan_id = %estate_plan_id, "audit");
        }
        AuditEvent::BeneficiaryUpdated { id } => {
            tracing::info!(event = "beneficiary_updated", beneficiary_id = %id, "audit");
        }
        AuditEvent::BeneficiaryDeleted { id } => {
            tracing::info!(event = "beneficiary_deleted", beneficiary_id = %id, "audit");
        }
        AuditEvent::TimelockPolicyCreated { id, estate_plan_id } => {
            tracing::info!(event = "timelock_policy_created", policy_id = %id, estate_plan_id = %estate_plan_id, "audit");
        }
        AuditEvent::TimelockPolicyUpdated { id } => {
            tracing::info!(event = "timelock_policy_updated", policy_id = %id, "audit");
        }
        AuditEvent::TimelockPolicyDeleted { id } => {
            tracing::info!(event = "timelock_policy_deleted", policy_id = %id, "audit");
        }
    }
}
