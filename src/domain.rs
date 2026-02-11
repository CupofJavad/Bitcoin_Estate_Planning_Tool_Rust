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
}

fn default_true() -> bool {
    true
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstatePlanWithRelations {
    #[serde(flatten)]
    pub plan: EstatePlan,
    pub beneficiaries: Vec<Beneficiary>,
    pub timelock_policies: Vec<TimelockPolicy>,
}
