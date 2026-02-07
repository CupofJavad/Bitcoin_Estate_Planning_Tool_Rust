#[allow(unused_imports)]
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, patch, post},
    Json, Router,
};
use sqlx::PgPool;
use std::sync::Arc;

use crate::domain::*;
use crate::logging::{audit_log, AuditEvent};

pub type AppState = Arc<PgPool>;

pub fn router(pool: PgPool) -> Router {
    let state = Arc::new(pool);
    Router::new()
        .route("/health", get(health))
        .route("/version", get(version))
        .route(
            "/api/v1/estate-plans",
            get(list_estate_plans).post(create_estate_plan),
        )
        .route(
            "/api/v1/estate-plans/:id",
            get(get_estate_plan)
                .patch(update_estate_plan)
                .delete(delete_estate_plan),
        )
        .route(
            "/api/v1/beneficiaries",
            get(list_beneficiaries).post(create_beneficiary),
        )
        .route(
            "/api/v1/beneficiaries/:id",
            get(get_beneficiary)
                .patch(update_beneficiary)
                .delete(delete_beneficiary),
        )
        .route(
            "/api/v1/timelock-policies",
            get(list_timelock_policies).post(create_timelock_policy),
        )
        .route(
            "/api/v1/timelock-policies/:id",
            get(get_timelock_policy)
                .patch(update_timelock_policy)
                .delete(delete_timelock_policy),
        )
        .with_state(state)
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "OK")
}

#[derive(serde::Serialize)]
struct VersionResponse {
    app_version: &'static str,
    migration_version: Option<i64>,
}

async fn version(State(pool): State<AppState>) -> Json<VersionResponse> {
    let migration_version = sqlx::query_scalar::<_, i64>(
        "SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1",
    )
    .fetch_optional(pool.as_ref())
    .await
    .ok()
    .flatten();
    Json(VersionResponse {
        app_version: env!("CARGO_PKG_VERSION"),
        migration_version,
    })
}

// ----- Estate plans -----

async fn list_estate_plans(
    State(pool): State<AppState>,
) -> Result<Json<Vec<EstatePlan>>, ApiError> {
    let rows = sqlx::query_as::<_, EstatePlan>("SELECT id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at FROM estate_plans ORDER BY id")
        .fetch_all(pool.as_ref())
        .await?;
    Ok(Json(rows))
}

async fn get_estate_plan(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<EstatePlanWithRelations>, ApiError> {
    let plan = sqlx::query_as::<_, EstatePlan>(
        "SELECT id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at FROM estate_plans WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ApiError::NotFound)?;

    let beneficiaries = sqlx::query_as::<_, Beneficiary>(
        "SELECT id, estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage::float8 AS allocation_percentage, created_at, updated_at FROM beneficiaries WHERE estate_plan_id = $1 ORDER BY id",
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    let timelock_policies = sqlx::query_as::<_, TimelockPolicy>(
        "SELECT id, estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active, created_at, updated_at FROM timelock_policies WHERE estate_plan_id = $1 ORDER BY id",
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    Ok(Json(EstatePlanWithRelations {
        plan,
        beneficiaries,
        timelock_policies,
    }))
}

async fn create_estate_plan(
    State(pool): State<AppState>,
    Json(body): Json<CreateEstatePlan>,
) -> Result<(StatusCode, Json<EstatePlan>), ApiError> {
    let row = sqlx::query_as::<_, EstatePlan>(
        "INSERT INTO estate_plans (user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active) VALUES (0, $1, $2, $3, $4, $5, $6) RETURNING id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at",
    )
    .bind(&body.name)
    .bind(&body.description)
    .bind(&body.bitcoin_address)
    .bind(&body.monero_address)
    .bind(&body.stacks_address)
    .bind(body.is_active)
    .fetch_one(pool.as_ref())
    .await?;
    audit_log(AuditEvent::EstatePlanCreated {
        id: row.id,
        name: row.name.clone(),
    });
    Ok((StatusCode::CREATED, Json(row)))
}

async fn update_estate_plan(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
    Json(body): Json<UpdateEstatePlan>,
) -> Result<Json<EstatePlan>, ApiError> {
    let existing = sqlx::query_as::<_, EstatePlan>("SELECT id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at FROM estate_plans WHERE id = $1")
        .bind(id)
        .fetch_optional(pool.as_ref())
        .await?
        .ok_or(ApiError::NotFound)?;

    let name = body.name.as_deref().unwrap_or(&existing.name);
    let description = body.description.or(existing.description);
    let bitcoin_address = body.bitcoin_address.or(existing.bitcoin_address);
    let monero_address = body.monero_address.or(existing.monero_address);
    let stacks_address = body.stacks_address.or(existing.stacks_address);
    let is_active = body.is_active.unwrap_or(existing.is_active);

    let row = sqlx::query_as::<_, EstatePlan>(
        "UPDATE estate_plans SET name = $1, description = $2, bitcoin_address = $3, monero_address = $4, stacks_address = $5, is_active = $6 WHERE id = $7 RETURNING id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at",
    )
    .bind(name)
    .bind(&description)
    .bind(&bitcoin_address)
    .bind(&monero_address)
    .bind(&stacks_address)
    .bind(is_active)
    .bind(id)
    .fetch_one(pool.as_ref())
    .await?;
    audit_log(AuditEvent::EstatePlanUpdated { id });
    Ok(Json(row))
}

async fn delete_estate_plan(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, ApiError> {
    let result = sqlx::query("DELETE FROM estate_plans WHERE id = $1")
        .bind(id)
        .execute(pool.as_ref())
        .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }
    audit_log(AuditEvent::EstatePlanDeleted { id });
    Ok(StatusCode::NO_CONTENT)
}

// ----- Beneficiaries -----

#[derive(Debug, serde::Deserialize)]
pub struct BeneficiaryFilter {
    pub estate_plan_id: Option<i32>,
}

async fn list_beneficiaries(
    State(pool): State<AppState>,
    Query(filter): Query<BeneficiaryFilter>,
) -> Result<Json<Vec<Beneficiary>>, ApiError> {
    let rows = if let Some(ep_id) = filter.estate_plan_id {
        sqlx::query_as::<_, Beneficiary>(
            "SELECT id, estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage::float8 AS allocation_percentage, created_at, updated_at FROM beneficiaries WHERE estate_plan_id = $1 ORDER BY id",
        )
        .bind(ep_id)
        .fetch_all(pool.as_ref())
        .await?
    } else {
        sqlx::query_as::<_, Beneficiary>(
            "SELECT id, estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage::float8 AS allocation_percentage, created_at, updated_at FROM beneficiaries ORDER BY id",
        )
        .fetch_all(pool.as_ref())
        .await?
    };
    Ok(Json(rows))
}

async fn get_beneficiary(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<Beneficiary>, ApiError> {
    let row = sqlx::query_as::<_, Beneficiary>(
        "SELECT id, estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage::float8 AS allocation_percentage, created_at, updated_at FROM beneficiaries WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ApiError::NotFound)?;
    Ok(Json(row))
}

/// Check that sum of allocation_percentage for estate_plan_id does not exceed 100 when adding or updating.
async fn check_allocation_sum(
    pool: &PgPool,
    estate_plan_id: i32,
    exclude_beneficiary_id: Option<i32>,
    additional: f64,
) -> Result<(), ApiError> {
    // Cast NUMERIC to float8 so sqlx decodes as f64
    let sum: Option<f64> = if let Some(exclude_id) = exclude_beneficiary_id {
        sqlx::query_scalar(
            "SELECT (COALESCE(SUM(allocation_percentage), 0)::float8) FROM beneficiaries WHERE estate_plan_id = $1 AND id != $2",
        )
        .bind(estate_plan_id)
        .bind(exclude_id)
        .fetch_one(pool)
        .await?
    } else {
        sqlx::query_scalar(
            "SELECT (COALESCE(SUM(allocation_percentage), 0)::float8) FROM beneficiaries WHERE estate_plan_id = $1",
        )
        .bind(estate_plan_id)
        .fetch_one(pool)
        .await?
    };
    let total = sum.unwrap_or(0.0) + additional;
    if total > 100.0 {
        return Err(ApiError::AllocationExceeded);
    }
    Ok(())
}

async fn create_beneficiary(
    State(pool): State<AppState>,
    Json(body): Json<CreateBeneficiary>,
) -> Result<(StatusCode, Json<Beneficiary>), ApiError> {
    check_allocation_sum(
        pool.as_ref(),
        body.estate_plan_id,
        None,
        body.allocation_percentage,
    )
    .await?;
    let row = sqlx::query_as::<_, Beneficiary>(
        "INSERT INTO beneficiaries (estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage::float8 AS allocation_percentage, created_at, updated_at",
    )
    .bind(body.estate_plan_id)
    .bind(&body.name)
    .bind(&body.email)
    .bind(&body.bitcoin_address)
    .bind(&body.monero_address)
    .bind(&body.stacks_address)
    .bind(body.allocation_percentage)
    .fetch_one(pool.as_ref())
    .await?;
    audit_log(AuditEvent::BeneficiaryCreated {
        id: row.id,
        estate_plan_id: row.estate_plan_id,
    });
    Ok((StatusCode::CREATED, Json(row)))
}

async fn update_beneficiary(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
    Json(body): Json<UpdateBeneficiary>,
) -> Result<Json<Beneficiary>, ApiError> {
    let existing = sqlx::query_as::<_, Beneficiary>(
        "SELECT id, estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage::float8 AS allocation_percentage, created_at, updated_at FROM beneficiaries WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ApiError::NotFound)?;

    if let Some(pct) = body.allocation_percentage {
        check_allocation_sum(pool.as_ref(), existing.estate_plan_id, Some(id), pct).await?;
    }

    let name = body.name.as_deref().unwrap_or(&existing.name);
    let email = body.email.or(existing.email);
    let bitcoin_address = body.bitcoin_address.or(existing.bitcoin_address);
    let monero_address = body.monero_address.or(existing.monero_address);
    let stacks_address = body.stacks_address.or(existing.stacks_address);
    let allocation_percentage = body
        .allocation_percentage
        .unwrap_or(existing.allocation_percentage);

    let row = sqlx::query_as::<_, Beneficiary>(
        "UPDATE beneficiaries SET name = $1, email = $2, bitcoin_address = $3, monero_address = $4, stacks_address = $5, allocation_percentage = $6 WHERE id = $7 RETURNING id, estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage::float8 AS allocation_percentage, created_at, updated_at",
    )
    .bind(name)
    .bind(&email)
    .bind(&bitcoin_address)
    .bind(&monero_address)
    .bind(&stacks_address)
    .bind(allocation_percentage)
    .bind(id)
    .fetch_one(pool.as_ref())
    .await?;
    audit_log(AuditEvent::BeneficiaryUpdated { id });
    Ok(Json(row))
}

async fn delete_beneficiary(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, ApiError> {
    let result = sqlx::query("DELETE FROM beneficiaries WHERE id = $1")
        .bind(id)
        .execute(pool.as_ref())
        .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }
    audit_log(AuditEvent::BeneficiaryDeleted { id });
    Ok(StatusCode::NO_CONTENT)
}

// ----- Timelock policies -----

#[derive(Debug, serde::Deserialize)]
pub struct TimelockFilter {
    pub estate_plan_id: Option<i32>,
}

async fn list_timelock_policies(
    State(pool): State<AppState>,
    Query(filter): Query<TimelockFilter>,
) -> Result<Json<Vec<TimelockPolicy>>, ApiError> {
    let rows = if let Some(ep_id) = filter.estate_plan_id {
        sqlx::query_as::<_, TimelockPolicy>(
            "SELECT id, estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active, created_at, updated_at FROM timelock_policies WHERE estate_plan_id = $1 ORDER BY id",
        )
        .bind(ep_id)
        .fetch_all(pool.as_ref())
        .await?
    } else {
        sqlx::query_as::<_, TimelockPolicy>(
            "SELECT id, estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active, created_at, updated_at FROM timelock_policies ORDER BY id",
        )
        .fetch_all(pool.as_ref())
        .await?
    };
    Ok(Json(rows))
}

async fn get_timelock_policy(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<TimelockPolicy>, ApiError> {
    let row = sqlx::query_as::<_, TimelockPolicy>(
        "SELECT id, estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active, created_at, updated_at FROM timelock_policies WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ApiError::NotFound)?;
    Ok(Json(row))
}

async fn create_timelock_policy(
    State(pool): State<AppState>,
    Json(body): Json<CreateTimelockPolicy>,
) -> Result<(StatusCode, Json<TimelockPolicy>), ApiError> {
    let row = sqlx::query_as::<_, TimelockPolicy>(
        "INSERT INTO timelock_policies (estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active, created_at, updated_at",
    )
    .bind(body.estate_plan_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(body.timelock_blocks)
    .bind(&body.trigger_condition)
    .bind(body.is_active)
    .fetch_one(pool.as_ref())
    .await?;
    audit_log(AuditEvent::TimelockPolicyCreated {
        id: row.id,
        estate_plan_id: row.estate_plan_id,
    });
    Ok((StatusCode::CREATED, Json(row)))
}

async fn update_timelock_policy(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
    Json(body): Json<UpdateTimelockPolicy>,
) -> Result<Json<TimelockPolicy>, ApiError> {
    let existing = sqlx::query_as::<_, TimelockPolicy>(
        "SELECT id, estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active, created_at, updated_at FROM timelock_policies WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ApiError::NotFound)?;

    let name = body.name.as_deref().unwrap_or(&existing.name);
    let description = body.description.or(existing.description);
    let timelock_blocks = body.timelock_blocks.unwrap_or(existing.timelock_blocks);
    let trigger_condition = body.trigger_condition.or(existing.trigger_condition);
    let is_active = body.is_active.unwrap_or(existing.is_active);

    let row = sqlx::query_as::<_, TimelockPolicy>(
        "UPDATE timelock_policies SET name = $1, description = $2, timelock_blocks = $3, trigger_condition = $4, is_active = $5 WHERE id = $6 RETURNING id, estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active, created_at, updated_at",
    )
    .bind(name)
    .bind(&description)
    .bind(timelock_blocks)
    .bind(&trigger_condition)
    .bind(is_active)
    .bind(id)
    .fetch_one(pool.as_ref())
    .await?;
    audit_log(AuditEvent::TimelockPolicyUpdated { id });
    Ok(Json(row))
}

async fn delete_timelock_policy(
    State(pool): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, ApiError> {
    let result = sqlx::query("DELETE FROM timelock_policies WHERE id = $1")
        .bind(id)
        .execute(pool.as_ref())
        .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }
    audit_log(AuditEvent::TimelockPolicyDeleted { id });
    Ok(StatusCode::NO_CONTENT)
}

// ----- Error (RFC 7807–style problem details) -----

/// Minimal RFC 7807 Problem Details for HTTP APIs (machine-readable errors).
#[derive(Debug, serde::Serialize)]
pub struct ProblemDetails {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    pub title: String,
    pub detail: String,
    pub status: u16,
}

#[derive(Debug)]
pub enum ApiError {
    NotFound,
    AllocationExceeded,
    Db(sqlx::Error),
}

impl From<sqlx::Error> for ApiError {
    fn from(e: sqlx::Error) -> Self {
        ApiError::Db(e)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, problem) = match &self {
            ApiError::NotFound => (
                StatusCode::NOT_FOUND,
                ProblemDetails {
                    r#type: Some("https://api.estateplanning.dev/problems/not-found".to_string()),
                    title: "Not Found".to_string(),
                    detail: "Not found".to_string(),
                    status: 404,
                },
            ),
            ApiError::AllocationExceeded => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ProblemDetails {
                    r#type: Some(
                        "https://api.estateplanning.dev/problems/allocation-exceeded".to_string(),
                    ),
                    title: "Allocation Exceeded".to_string(),
                    detail: "Beneficiary allocation total cannot exceed 100%".to_string(),
                    status: 422,
                },
            ),
            ApiError::Db(e) => {
                tracing::error!(error = %e, "DB error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ProblemDetails {
                        r#type: Some(
                            "https://api.estateplanning.dev/problems/internal".to_string(),
                        ),
                        title: "Internal Server Error".to_string(),
                        detail: "Internal server error".to_string(),
                        status: 500,
                    },
                )
            }
        };
        let mut res = (status, Json(problem)).into_response();
        res.headers_mut().insert(
            axum::http::header::CONTENT_TYPE,
            axum::http::HeaderValue::from_static("application/problem+json"),
        );
        res
    }
}
