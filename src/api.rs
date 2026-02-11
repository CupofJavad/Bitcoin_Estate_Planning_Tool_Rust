#[allow(unused_imports)]
use axum::{
    async_trait,
    extract::{FromRequestParts, Path, Query, State},
    http::{request::Parts, StatusCode},
    response::IntoResponse,
    routing::{delete, get, patch, post},
    Json, Router,
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use axum::middleware;
use crate::auth::{self, SESSION_COOKIE_NAME, SESSION_DURATION_DAYS};
use crate::domain::*;
use crate::logging::{audit_log, AuditEvent};
use crate::rate_limit::{self, RateLimitStore};
use serde_json::Value as JsonValue;

pub type AppState = Arc<PgPool>;

/// Current authenticated user (from session cookie). Use as extractor on protected routes.
pub struct CurrentUser(pub User);

#[async_trait]
impl FromRequestParts<AppState> for CurrentUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let jar = CookieJar::from_headers(&parts.headers);
        let session_id = jar
            .get(SESSION_COOKIE_NAME)
            .and_then(|c| Uuid::parse_str(c.value()).ok())
            .ok_or(ApiError::Unauthorized)?;
        let user = sqlx::query_as::<_, User>(
            "SELECT u.id, u.email, u.password_hash, u.name, u.email_verified_at, u.role, COALESCE(u.is_active, true) AS is_active, u.created_at, u.updated_at
             FROM users u
             INNER JOIN sessions s ON s.user_id = u.id
             WHERE s.id = $1 AND s.expires_at > $2",
        )
        .bind(session_id)
        .bind(Utc::now())
        .fetch_optional(state.as_ref())
        .await?
        .ok_or(ApiError::Unauthorized)?;
        if !user.is_active {
            return Err(ApiError::Unauthorized);
        }
        Ok(CurrentUser(user))
    }
}

pub fn router(pool: PgPool) -> Router {
    let state = Arc::new(pool);
    let rate_limit_store = Arc::new(RateLimitStore::default());
    rate_limit::init_store(Arc::clone(&rate_limit_store));

    let auth_rate_limited = Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route_layer(middleware::from_fn(rate_limit::auth_rate_limit_middleware))
        .with_state(state.clone());

    Router::new()
        .route("/health", get(health))
        .route("/version", get(version))
        .merge(auth_rate_limited)
        .route("/auth/logout", post(logout))
        .route("/api/v1/me", get(me).patch(patch_me))
        .route("/api/v1/me/password", post(change_password))
        .route("/api/v1/me/export", get(me_export))
        .route("/api/v1/me/delete", post(delete_account))
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
        .route("/api/v1/admin/users", get(admin_list_users))
        .route("/api/v1/admin/users/:id", patch(admin_patch_user))
        .route("/api/v1/admin/audit", get(admin_list_audit))
        .with_state(state)
}

// ----- Auth -----

async fn register(
    State(pool): State<AppState>,
    Json(body): Json<RegisterBody>,
) -> Result<(StatusCode, Json<MeResponse>), ApiError> {
    if body.email.is_empty() || body.password.len() < 8 {
        return Err(ApiError::BadRequest(
            "Email required and password must be at least 8 characters".to_string(),
        ));
    }
    let password_hash = auth::hash_password(&body.password).map_err(|_| ApiError::BadRequest("Invalid password".to_string()))?;
    let user: User = sqlx::query_as(
        "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'owner')
         RETURNING id, email, password_hash, name, email_verified_at, role, COALESCE(is_active, true) AS is_active, created_at, updated_at",
    )
    .bind(body.email.to_lowercase())
    .bind(&password_hash)
    .bind(&body.name)
    .fetch_one(pool.as_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(d) = &e {
            if d.is_unique_violation() {
                return ApiError::BadRequest("Email already registered".to_string());
            }
        }
        ApiError::Db(e)
    })?;
    let me_response = MeResponse {
        id: user.id,
        email: user.email.clone(),
        name: user.name.clone(),
        role: user.role.clone(),
        email_verified_at: user.email_verified_at,
        created_at: user.created_at,
    };
    Ok((StatusCode::CREATED, Json(me_response)))
}

async fn login(
    State(pool): State<AppState>,
    _jar: CookieJar,
    Json(body): Json<LoginBody>,
) -> Result<axum::response::Response, ApiError> {
    if body.email.is_empty() || body.password.is_empty() {
        return Err(ApiError::Unauthorized);
    }
    let user: User = sqlx::query_as(
        "SELECT id, email, password_hash, name, email_verified_at, role, COALESCE(is_active, true) AS is_active, created_at, updated_at FROM users WHERE email = $1",
    )
    .bind(body.email.to_lowercase())
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ApiError::Unauthorized)?;
    if !user.is_active || user.password_hash == "no-login" || !auth::verify_password(&body.password, &user.password_hash).unwrap_or(false) {
        return Err(ApiError::Unauthorized);
    }
    let session_id = Uuid::new_v4();
    let expires_at = Utc::now() + Duration::days(SESSION_DURATION_DAYS);
    sqlx::query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)")
        .bind(session_id)
        .bind(user.id)
        .bind(expires_at)
        .execute(pool.as_ref())
        .await?;
    let me_response = MeResponse {
        id: user.id,
        email: user.email.clone(),
        name: user.name.clone(),
        role: user.role.clone(),
        email_verified_at: user.email_verified_at,
        created_at: user.created_at,
    };
    let secure = std::env::var("SECURE_COOKIE").as_deref() == Ok("true");
    let cookie = Cookie::build((SESSION_COOKIE_NAME, session_id.to_string()))
        .path("/")
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
        .build();
    let mut res = (StatusCode::OK, Json(me_response)).into_response();
    res.headers_mut().insert(
        axum::http::header::SET_COOKIE,
        cookie.to_string().parse().unwrap(),
    );
    Ok(res)
}

async fn logout(State(pool): State<AppState>, jar: CookieJar) -> axum::response::Response {
    if let Some(cookie) = jar.get(SESSION_COOKIE_NAME) {
        if let Ok(session_id) = Uuid::parse_str(cookie.value()) {
            let _ = sqlx::query("DELETE FROM sessions WHERE id = $1")
                .bind(session_id)
                .execute(pool.as_ref())
                .await;
        }
    }
    let clear = Cookie::build((SESSION_COOKIE_NAME, ""))
        .path("/")
        .http_only(true)
        .max_age(cookie::time::Duration::seconds(0))
        .build();
    let mut res = StatusCode::NO_CONTENT.into_response();
    res.headers_mut().insert(
        axum::http::header::SET_COOKIE,
        clear.to_string().parse().unwrap(),
    );
    res
}

async fn me(CurrentUser(user): CurrentUser) -> Json<MeResponse> {
    Json(MeResponse {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified_at: user.email_verified_at,
        created_at: user.created_at,
    })
}

async fn patch_me(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Json(body): Json<UpdateMeBody>,
) -> Result<Json<MeResponse>, ApiError> {
    let name = body.name.as_deref().unwrap_or(user.name.as_deref().unwrap_or(""));
    let email = body
        .email
        .as_deref()
        .unwrap_or(&user.email)
        .to_lowercase();
    if email.is_empty() {
        return Err(ApiError::BadRequest("Email cannot be empty".to_string()));
    }
    let updated: User = sqlx::query_as(
        "UPDATE users SET name = $1, email = $2, updated_at = now() WHERE id = $3
         RETURNING id, email, password_hash, name, email_verified_at, role, COALESCE(is_active, true) AS is_active, created_at, updated_at",
    )
    .bind(if name.is_empty() { None::<&str> } else { Some(name) })
    .bind(&email)
    .bind(user.id)
    .fetch_one(pool.as_ref())
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(d) = &e {
            if d.is_unique_violation() {
                return ApiError::BadRequest("Email already in use".to_string());
            }
        }
        ApiError::Db(e)
    })?;
    Ok(Json(MeResponse {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        email_verified_at: updated.email_verified_at,
        created_at: updated.created_at,
    }))
}

async fn change_password(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Json(body): Json<ChangePasswordBody>,
) -> Result<StatusCode, ApiError> {
    if body.new_password.len() < 8 {
        return Err(ApiError::BadRequest(
            "New password must be at least 8 characters".to_string(),
        ));
    }
    let current: User = sqlx::query_as(
        "SELECT id, email, password_hash, name, email_verified_at, role, COALESCE(is_active, true) AS is_active, created_at, updated_at FROM users WHERE id = $1",
    )
    .bind(user.id)
    .fetch_one(pool.as_ref())
    .await?;
    if !auth::verify_password(&body.current_password, &current.password_hash).unwrap_or(false) {
        return Err(ApiError::Unauthorized);
    }
    let new_hash = auth::hash_password(&body.new_password).map_err(|_| ApiError::BadRequest("Invalid new password".to_string()))?;
    sqlx::query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2")
        .bind(&new_hash)
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, serde::Serialize)]
struct ExportResponse {
    exported_at: chrono::DateTime<Utc>,
    estate_plans: Vec<EstatePlanWithRelations>,
}

async fn me_export(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<ExportResponse>, ApiError> {
    let plans = sqlx::query_as::<_, EstatePlan>(
        "SELECT id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at FROM estate_plans WHERE user_id = $1 ORDER BY id",
    )
    .bind(user.id)
    .fetch_all(pool.as_ref())
    .await?;
    let mut estate_plans = Vec::with_capacity(plans.len());
    for plan in plans {
        let beneficiaries = sqlx::query_as::<_, Beneficiary>(
            "SELECT id, estate_plan_id, name, email, bitcoin_address, monero_address, stacks_address, allocation_percentage::float8 AS allocation_percentage, created_at, updated_at FROM beneficiaries WHERE estate_plan_id = $1 ORDER BY id",
        )
        .bind(plan.id)
        .fetch_all(pool.as_ref())
        .await?;
        let timelock_policies = sqlx::query_as::<_, TimelockPolicy>(
            "SELECT id, estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active, created_at, updated_at FROM timelock_policies WHERE estate_plan_id = $1 ORDER BY id",
        )
        .bind(plan.id)
        .fetch_all(pool.as_ref())
        .await?;
        estate_plans.push(EstatePlanWithRelations {
            plan,
            beneficiaries,
            timelock_policies,
        });
    }
    Ok(Json(ExportResponse {
        exported_at: Utc::now(),
        estate_plans,
    }))
}

async fn delete_account(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Json(body): Json<DeleteAccountBody>,
) -> Result<StatusCode, ApiError> {
    let current: User = sqlx::query_as(
        "SELECT id, email, password_hash, name, email_verified_at, role, COALESCE(is_active, true) AS is_active, created_at, updated_at FROM users WHERE id = $1",
    )
    .bind(user.id)
    .fetch_one(pool.as_ref())
    .await?;
    if !auth::verify_password(&body.password, &current.password_hash).unwrap_or(false) {
        return Err(ApiError::Unauthorized);
    }
    // Cascade: beneficiaries (via estate_plans), timelock_policies (via estate_plans), estate_plans, audit_events, sessions, user.
    sqlx::query("DELETE FROM beneficiaries WHERE estate_plan_id IN (SELECT id FROM estate_plans WHERE user_id = $1)")
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;
    sqlx::query("DELETE FROM timelock_policies WHERE estate_plan_id IN (SELECT id FROM estate_plans WHERE user_id = $1)")
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;
    sqlx::query("DELETE FROM estate_plans WHERE user_id = $1")
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;
    sqlx::query("DELETE FROM audit_events WHERE user_id = $1")
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
struct AdminUserSummary {
    id: i32,
    email: String,
    name: Option<String>,
    role: String,
    is_active: bool,
}

async fn admin_list_users(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<Vec<AdminUserSummary>>, ApiError> {
    if user.role != "admin" {
        return Err(ApiError::Forbidden);
    }
    let rows = sqlx::query_as::<_, AdminUserSummary>(
        "SELECT id, email, name, role, COALESCE(is_active, true) AS is_active FROM users ORDER BY id",
    )
    .fetch_all(pool.as_ref())
    .await?;
    Ok(Json(rows))
}

async fn admin_patch_user(
    State(pool): State<AppState>,
    CurrentUser(admin): CurrentUser,
    Path(id): Path<i32>,
    Json(body): Json<AdminUpdateUserBody>,
) -> Result<Json<AdminUserSummary>, ApiError> {
    if admin.role != "admin" {
        return Err(ApiError::Forbidden);
    }
    if body.role.is_none() && body.is_active.is_none() {
        return Err(ApiError::BadRequest("Provide role and/or is_active".to_string()));
    }
    let valid_roles = ["owner", "executor", "admin"];
    if let Some(ref r) = body.role {
        if !valid_roles.contains(&r.as_str()) {
            return Err(ApiError::BadRequest(format!(
                "role must be one of: {}",
                valid_roles.join(", ")
            )));
        }
    }
    if admin.id == id && body.is_active == Some(false) {
        return Err(ApiError::BadRequest("Cannot deactivate your own account".to_string()));
    }
    let row = sqlx::query_as::<_, AdminUserSummary>(
        "UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active), updated_at = now()
         WHERE id = $3 RETURNING id, email, name, role, COALESCE(is_active, true) AS is_active",
    )
    .bind(body.role)
    .bind(body.is_active)
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ApiError::NotFound)?;
    Ok(Json(row))
}

/// Persist audit event to DB for admin audit view. Logs and continues on error.
async fn record_audit_event(
    pool: &PgPool,
    user_id: i32,
    action: &str,
    entity_type: &str,
    entity_id: Option<i32>,
    details: Option<JsonValue>,
) {
    let _ = sqlx::query(
        "INSERT INTO audit_events (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(user_id)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(details)
    .execute(pool)
    .await;
}

#[derive(Debug, serde::Deserialize)]
pub struct AuditEventFilter {
    pub from: Option<String>,
    pub to: Option<String>,
    pub user_id: Option<i32>,
    pub action: Option<String>,
    pub entity_type: Option<String>,
    #[serde(default)]
    pub limit: Option<i32>,
}

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct AuditEventRow {
    pub id: i64,
    pub created_at: chrono::DateTime<Utc>,
    pub user_id: Option<i32>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<i32>,
    pub details: Option<JsonValue>,
}

async fn admin_list_audit(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Query(filter): Query<AuditEventFilter>,
) -> Result<Json<Vec<AuditEventRow>>, ApiError> {
    if user.role != "admin" {
        return Err(ApiError::Forbidden);
    }
    let limit = filter.limit.unwrap_or(100).clamp(1, 500);
    // Build query with optional filters (from/to as date or datetime strings, user_id, action, entity_type)
    let rows = sqlx::query_as::<_, AuditEventRow>(
        r#"
        SELECT id, created_at, user_id, action, entity_type, entity_id, details
        FROM audit_events
        WHERE ($1::timestamptz IS NULL OR created_at >= $1)
          AND ($2::timestamptz IS NULL OR created_at <= $2)
          AND ($3::int IS NULL OR user_id = $3)
          AND ($4::text IS NULL OR action = $4)
          AND ($5::text IS NULL OR entity_type = $5)
        ORDER BY created_at DESC
        LIMIT $6
        "#,
    )
    .bind(
        filter
            .from
            .as_ref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok().map(|dt| dt.with_timezone(&Utc))),
    )
    .bind(
        filter
            .to
            .as_ref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok().map(|dt| dt.with_timezone(&Utc))),
    )
    .bind(filter.user_id)
    .bind(filter.action.as_deref())
    .bind(filter.entity_type.as_deref())
    .bind(limit)
    .fetch_all(pool.as_ref())
    .await?;
    Ok(Json(rows))
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
    CurrentUser(user): CurrentUser,
) -> Result<Json<Vec<EstatePlan>>, ApiError> {
    let rows = sqlx::query_as::<_, EstatePlan>(
        "SELECT id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at FROM estate_plans WHERE user_id = $1 ORDER BY id",
    )
    .bind(user.id)
    .fetch_all(pool.as_ref())
    .await?;
    Ok(Json(rows))
}

async fn get_estate_plan(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
) -> Result<Json<EstatePlanWithRelations>, ApiError> {
    let plan = sqlx::query_as::<_, EstatePlan>(
        "SELECT id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at FROM estate_plans WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user.id)
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
    CurrentUser(user): CurrentUser,
    Json(body): Json<CreateEstatePlan>,
) -> Result<(StatusCode, Json<EstatePlan>), ApiError> {
    let row = sqlx::query_as::<_, EstatePlan>(
        "INSERT INTO estate_plans (user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at",
    )
    .bind(user.id)
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
    record_audit_event(
        pool.as_ref(),
        user.id,
        "created",
        "estate_plan",
        Some(row.id),
        Some(serde_json::json!({ "name": row.name })),
    )
    .await;
    Ok((StatusCode::CREATED, Json(row)))
}

async fn update_estate_plan(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Json(body): Json<UpdateEstatePlan>,
) -> Result<Json<EstatePlan>, ApiError> {
    let existing = sqlx::query_as::<_, EstatePlan>("SELECT id, user_id, name, description, bitcoin_address, monero_address, stacks_address, is_active, created_at, updated_at FROM estate_plans WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user.id)
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
    record_audit_event(pool.as_ref(), user.id, "updated", "estate_plan", Some(id), None).await;
    Ok(Json(row))
}

async fn delete_estate_plan(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
) -> Result<StatusCode, ApiError> {
    let result = sqlx::query("DELETE FROM estate_plans WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }
    audit_log(AuditEvent::EstatePlanDeleted { id });
    record_audit_event(pool.as_ref(), user.id, "deleted", "estate_plan", Some(id), None).await;
    Ok(StatusCode::NO_CONTENT)
}

// ----- Beneficiaries -----

#[derive(Debug, serde::Deserialize)]
pub struct BeneficiaryFilter {
    pub estate_plan_id: Option<i32>,
}

async fn list_beneficiaries(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Query(filter): Query<BeneficiaryFilter>,
) -> Result<Json<Vec<Beneficiary>>, ApiError> {
    let rows = if let Some(ep_id) = filter.estate_plan_id {
        sqlx::query_as::<_, Beneficiary>(
            "SELECT b.id, b.estate_plan_id, b.name, b.email, b.bitcoin_address, b.monero_address, b.stacks_address, b.allocation_percentage::float8 AS allocation_percentage, b.created_at, b.updated_at
             FROM beneficiaries b INNER JOIN estate_plans p ON p.id = b.estate_plan_id WHERE b.estate_plan_id = $1 AND p.user_id = $2 ORDER BY b.id",
        )
        .bind(ep_id)
        .bind(user.id)
        .fetch_all(pool.as_ref())
        .await?
    } else {
        sqlx::query_as::<_, Beneficiary>(
            "SELECT b.id, b.estate_plan_id, b.name, b.email, b.bitcoin_address, b.monero_address, b.stacks_address, b.allocation_percentage::float8 AS allocation_percentage, b.created_at, b.updated_at
             FROM beneficiaries b INNER JOIN estate_plans p ON p.id = b.estate_plan_id WHERE p.user_id = $1 ORDER BY b.id",
        )
        .bind(user.id)
        .fetch_all(pool.as_ref())
        .await?
    };
    Ok(Json(rows))
}

async fn get_beneficiary(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
) -> Result<Json<Beneficiary>, ApiError> {
    let row = sqlx::query_as::<_, Beneficiary>(
        "SELECT b.id, b.estate_plan_id, b.name, b.email, b.bitcoin_address, b.monero_address, b.stacks_address, b.allocation_percentage::float8 AS allocation_percentage, b.created_at, b.updated_at
         FROM beneficiaries b INNER JOIN estate_plans p ON p.id = b.estate_plan_id WHERE b.id = $1 AND p.user_id = $2",
    )
    .bind(id)
    .bind(user.id)
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
    CurrentUser(user): CurrentUser,
    Json(body): Json<CreateBeneficiary>,
) -> Result<(StatusCode, Json<Beneficiary>), ApiError> {
    let plan_owner: Option<i32> = sqlx::query_scalar("SELECT user_id FROM estate_plans WHERE id = $1")
        .bind(body.estate_plan_id)
        .fetch_optional(pool.as_ref())
        .await?;
    if plan_owner.as_ref() != Some(&user.id) {
        return Err(ApiError::NotFound);
    }
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
    record_audit_event(
        pool.as_ref(),
        user.id,
        "created",
        "beneficiary",
        Some(row.id),
        Some(serde_json::json!({ "estate_plan_id": row.estate_plan_id })),
    )
    .await;
    Ok((StatusCode::CREATED, Json(row)))
}

async fn update_beneficiary(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Json(body): Json<UpdateBeneficiary>,
) -> Result<Json<Beneficiary>, ApiError> {
    let existing = sqlx::query_as::<_, Beneficiary>(
        "SELECT b.id, b.estate_plan_id, b.name, b.email, b.bitcoin_address, b.monero_address, b.stacks_address, b.allocation_percentage::float8 AS allocation_percentage, b.created_at, b.updated_at
         FROM beneficiaries b INNER JOIN estate_plans p ON p.id = b.estate_plan_id WHERE b.id = $1 AND p.user_id = $2",
    )
    .bind(id)
    .bind(user.id)
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
    record_audit_event(pool.as_ref(), user.id, "updated", "beneficiary", Some(id), None).await;
    Ok(Json(row))
}

async fn delete_beneficiary(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
) -> Result<StatusCode, ApiError> {
    let result = sqlx::query(
        "DELETE FROM beneficiaries WHERE id = $1 AND estate_plan_id IN (SELECT id FROM estate_plans WHERE user_id = $2)",
    )
    .bind(id)
    .bind(user.id)
    .execute(pool.as_ref())
    .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }
    audit_log(AuditEvent::BeneficiaryDeleted { id });
    record_audit_event(pool.as_ref(), user.id, "deleted", "beneficiary", Some(id), None).await;
    Ok(StatusCode::NO_CONTENT)
}

// ----- Timelock policies -----

#[derive(Debug, serde::Deserialize)]
pub struct TimelockFilter {
    pub estate_plan_id: Option<i32>,
}

async fn list_timelock_policies(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Query(filter): Query<TimelockFilter>,
) -> Result<Json<Vec<TimelockPolicy>>, ApiError> {
    let rows = if let Some(ep_id) = filter.estate_plan_id {
        sqlx::query_as::<_, TimelockPolicy>(
            "SELECT t.id, t.estate_plan_id, t.name, t.description, t.timelock_blocks, t.trigger_condition, t.is_active, t.created_at, t.updated_at
             FROM timelock_policies t INNER JOIN estate_plans p ON p.id = t.estate_plan_id WHERE t.estate_plan_id = $1 AND p.user_id = $2 ORDER BY t.id",
        )
        .bind(ep_id)
        .bind(user.id)
        .fetch_all(pool.as_ref())
        .await?
    } else {
        sqlx::query_as::<_, TimelockPolicy>(
            "SELECT t.id, t.estate_plan_id, t.name, t.description, t.timelock_blocks, t.trigger_condition, t.is_active, t.created_at, t.updated_at
             FROM timelock_policies t INNER JOIN estate_plans p ON p.id = t.estate_plan_id WHERE p.user_id = $1 ORDER BY t.id",
        )
        .bind(user.id)
        .fetch_all(pool.as_ref())
        .await?
    };
    Ok(Json(rows))
}

async fn get_timelock_policy(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
) -> Result<Json<TimelockPolicy>, ApiError> {
    let row = sqlx::query_as::<_, TimelockPolicy>(
        "SELECT t.id, t.estate_plan_id, t.name, t.description, t.timelock_blocks, t.trigger_condition, t.is_active, t.created_at, t.updated_at
         FROM timelock_policies t INNER JOIN estate_plans p ON p.id = t.estate_plan_id WHERE t.id = $1 AND p.user_id = $2",
    )
    .bind(id)
    .bind(user.id)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(ApiError::NotFound)?;
    Ok(Json(row))
}

async fn create_timelock_policy(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Json(body): Json<CreateTimelockPolicy>,
) -> Result<(StatusCode, Json<TimelockPolicy>), ApiError> {
    let plan_owner: Option<i32> = sqlx::query_scalar("SELECT user_id FROM estate_plans WHERE id = $1")
        .bind(body.estate_plan_id)
        .fetch_optional(pool.as_ref())
        .await?;
    if plan_owner.as_ref() != Some(&user.id) {
        return Err(ApiError::NotFound);
    }
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
    record_audit_event(
        pool.as_ref(),
        user.id,
        "created",
        "timelock_policy",
        Some(row.id),
        Some(serde_json::json!({ "estate_plan_id": row.estate_plan_id })),
    )
    .await;
    Ok((StatusCode::CREATED, Json(row)))
}

async fn update_timelock_policy(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Json(body): Json<UpdateTimelockPolicy>,
) -> Result<Json<TimelockPolicy>, ApiError> {
    let existing = sqlx::query_as::<_, TimelockPolicy>(
        "SELECT t.id, t.estate_plan_id, t.name, t.description, t.timelock_blocks, t.trigger_condition, t.is_active, t.created_at, t.updated_at
         FROM timelock_policies t INNER JOIN estate_plans p ON p.id = t.estate_plan_id WHERE t.id = $1 AND p.user_id = $2",
    )
    .bind(id)
    .bind(user.id)
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
    record_audit_event(pool.as_ref(), user.id, "updated", "timelock_policy", Some(id), None).await;
    Ok(Json(row))
}

async fn delete_timelock_policy(
    State(pool): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
) -> Result<StatusCode, ApiError> {
    let result = sqlx::query(
        "DELETE FROM timelock_policies WHERE id = $1 AND estate_plan_id IN (SELECT id FROM estate_plans WHERE user_id = $2)",
    )
    .bind(id)
    .bind(user.id)
    .execute(pool.as_ref())
    .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }
    audit_log(AuditEvent::TimelockPolicyDeleted { id });
    record_audit_event(pool.as_ref(), user.id, "deleted", "timelock_policy", Some(id), None).await;
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
    Unauthorized,
    Forbidden,
    BadRequest(String),
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
            ApiError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                ProblemDetails {
                    r#type: Some("https://api.estateplanning.dev/problems/unauthorized".to_string()),
                    title: "Unauthorized".to_string(),
                    detail: "Authentication required".to_string(),
                    status: 401,
                },
            ),
            ApiError::Forbidden => (
                StatusCode::FORBIDDEN,
                ProblemDetails {
                    r#type: Some("https://api.estateplanning.dev/problems/forbidden".to_string()),
                    title: "Forbidden".to_string(),
                    detail: "Insufficient permissions".to_string(),
                    status: 403,
                },
            ),
            ApiError::BadRequest(ref msg) => (
                StatusCode::BAD_REQUEST,
                ProblemDetails {
                    r#type: Some("https://api.estateplanning.dev/problems/bad-request".to_string()),
                    title: "Bad Request".to_string(),
                    detail: msg.clone(),
                    status: 400,
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
