use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ----- Auth (Phase A) -----

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i32,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub name: Option<String>,
    pub email_verified_at: Option<DateTime<Utc>>,
    pub role: String,
    #[serde(default)]
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Current user profile (no password); for GET /api/v1/me
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeResponse {
    pub id: i32,
    pub email: String,
    pub name: Option<String>,
    pub role: String,
    pub email_verified_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Session {
    pub id: Uuid,
    pub user_id: i32,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RegisterBody {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
}

/// PATCH /api/v1/me — update profile (name, email).
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMeBody {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
}

/// POST /api/v1/me/password — change password.
#[derive(Debug, Clone, Deserialize)]
pub struct ChangePasswordBody {
    pub current_password: String,
    pub new_password: String,
}

/// POST /api/v1/me/delete — delete account (requires password).
#[derive(Debug, Clone, Deserialize)]
pub struct DeleteAccountBody {
    pub password: String,
}

/// PATCH /api/v1/admin/users/:id — admin update user (role, is_active).
#[derive(Debug, Clone, Deserialize)]
pub struct AdminUpdateUserBody {
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

// ----- Estate plans -----

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EstatePlan {
    pub id: i32,
    pub user_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub bitcoin_address: Option<String>,
    pub monero_address: Option<String>,
    pub stacks_address: Option<String>,
    pub is_active: bool,
    pub heartbeat_interval_days: i32,
    pub last_checkin_at: DateTime<Utc>,
    pub grace_period_days: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEstatePlan {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub bitcoin_address: Option<String>,
    #[serde(default)]
    pub monero_address: Option<String>,
    #[serde(default)]
    pub stacks_address: Option<String>,
    #[serde(default = "default_true")]
    pub is_active: bool,
    #[serde(default = "default_heartbeat_days")]
    pub heartbeat_interval_days: i32,
    #[serde(default = "default_grace_days")]
    pub grace_period_days: i32,
}

fn default_true() -> bool {
    true
}

fn default_heartbeat_days() -> i32 {
    90
}

fn default_grace_days() -> i32 {
    14
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEstatePlan {
    #[serde(default)]
    pub name: Option<String>,
    pub description: Option<String>,
    pub bitcoin_address: Option<String>,
    pub monero_address: Option<String>,
    pub stacks_address: Option<String>,
    pub is_active: Option<bool>,
    #[serde(default)]
    pub heartbeat_interval_days: Option<i32>,
    #[serde(default)]
    pub grace_period_days: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Beneficiary {
    pub id: i32,
    pub estate_plan_id: i32,
    pub name: String,
    pub email: Option<String>,
    pub bitcoin_address: Option<String>,
    pub monero_address: Option<String>,
    pub stacks_address: Option<String>,
    pub allocation_percentage: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBeneficiary {
    pub estate_plan_id: i32,
    pub name: String,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub bitcoin_address: Option<String>,
    #[serde(default)]
    pub monero_address: Option<String>,
    #[serde(default)]
    pub stacks_address: Option<String>,
    pub allocation_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBeneficiary {
    #[serde(default)]
    pub name: Option<String>,
    pub email: Option<String>,
    pub bitcoin_address: Option<String>,
    pub monero_address: Option<String>,
    pub stacks_address: Option<String>,
    pub allocation_percentage: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TimelockPolicy {
    pub id: i32,
    pub estate_plan_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub timelock_blocks: i32,
    pub trigger_condition: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTimelockPolicy {
    pub estate_plan_id: i32,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub timelock_blocks: i32,
    #[serde(default)]
    pub trigger_condition: Option<String>,
    #[serde(default = "default_true")]
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTimelockPolicy {
    #[serde(default)]
    pub name: Option<String>,
    pub description: Option<String>,
    pub timelock_blocks: Option<i32>,
    pub trigger_condition: Option<String>,
    pub is_active: Option<bool>,
}

// ----- Heartbeat Check-ins, Readiness, & Zero-Knowledge Vault Notes (v2) -----

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PlanCheckin {
    pub id: i32,
    pub estate_plan_id: i32,
    pub user_id: i32,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCheckinBody {
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatStatus {
    /// "healthy" | "due_soon" | "grace_period" | "triggered"
    pub status: String,
    pub heartbeat_interval_days: i32,
    pub grace_period_days: i32,
    pub last_checkin_at: DateTime<Utc>,
    pub next_due_at: DateTime<Utc>,
    pub grace_ends_at: DateTime<Utc>,
    pub days_remaining: i64,
    pub progress_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessCheckItem {
    pub key: String,
    pub label: String,
    /// "pass" | "warn" | "fail"
    pub status: String,
    pub points: u8,
    pub max_points: u8,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessReport {
    pub score: u8,
    pub grade: String,
    pub checks: Vec<ReadinessCheckItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EncryptedVaultNote {
    pub id: i32,
    pub estate_plan_id: i32,
    pub title: String,
    pub ciphertext_b64: String,
    pub iv_b64: String,
    pub salt_b64: String,
    pub kdf_iterations: i32,
    pub algorithm: String,
    pub hint: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVaultNoteBody {
    pub title: String,
    pub ciphertext_b64: String,
    pub iv_b64: String,
    pub salt_b64: String,
    #[serde(default = "default_kdf_iterations")]
    pub kdf_iterations: i32,
    #[serde(default = "default_algorithm")]
    pub algorithm: String,
    #[serde(default)]
    pub hint: Option<String>,
}

fn default_kdf_iterations() -> i32 {
    310_000
}

fn default_algorithm() -> String {
    "AES-256-GCM".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstatePlanWithRelations {
    #[serde(flatten)]
    pub plan: EstatePlan,
    pub beneficiaries: Vec<Beneficiary>,
    pub timelock_policies: Vec<TimelockPolicy>,
    pub heartbeat: HeartbeatStatus,
    pub readiness: ReadinessReport,
    pub vault_notes_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainCoverage {
    pub btc_plans: usize,
    pub xmr_plans: usize,
    pub stx_plans: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanDashboardItem {
    pub id: i32,
    pub name: String,
    pub is_active: bool,
    pub beneficiary_count: usize,
    pub total_allocation: f64,
    pub timelock_count: usize,
    pub vault_notes_count: usize,
    pub readiness_score: u8,
    pub readiness_grade: String,
    pub heartbeat: HeartbeatStatus,
    pub chains: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub total_plans: usize,
    pub active_plans: usize,
    pub total_beneficiaries: usize,
    pub total_timelocks: usize,
    pub total_vault_notes: usize,
    pub average_readiness_score: u8,
    pub healthy_heartbeats: usize,
    pub attention_needed_heartbeats: usize,
    pub next_checkin_due_at: Option<DateTime<Utc>>,
    pub next_checkin_plan_id: Option<i32>,
    pub next_checkin_plan_name: Option<String>,
    pub chain_coverage: ChainCoverage,
    pub plans: Vec<PlanDashboardItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InheritancePacketPolicy {
    pub policy: TimelockPolicy,
    pub descriptor: crate::crypto::TimelockDescriptorResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InheritancePacket {
    pub schema_version: String,
    pub generated_at: DateTime<Utc>,
    pub integrity_sha256: String,
    pub plan: EstatePlan,
    pub heartbeat: HeartbeatStatus,
    pub readiness: ReadinessReport,
    pub beneficiaries: Vec<Beneficiary>,
    pub timelock_policies: Vec<InheritancePacketPolicy>,
    pub encrypted_vault_notes: Vec<EncryptedVaultNote>,
    pub recent_checkins: Vec<PlanCheckin>,
    pub heir_instructions: Vec<String>,
}
