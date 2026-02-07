use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

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
