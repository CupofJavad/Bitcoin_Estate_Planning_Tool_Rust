use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::time::Duration;

fn env_u32(key: &str, default: u32) -> u32 {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

fn env_u64(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

/// Create a production-tuned PostgreSQL connection pool driven by environment variables.
pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let max_connections = env_u32("DB_MAX_CONNECTIONS", 25).clamp(2, 200);
    let min_connections = env_u32("DB_MIN_CONNECTIONS", 2).min(max_connections);
    let acquire_timeout_secs = env_u64("DB_ACQUIRE_TIMEOUT_SECS", 10).clamp(1, 60);
    let idle_timeout_secs = env_u64("DB_IDLE_TIMEOUT_SECS", 300).clamp(10, 3600);
    let max_lifetime_secs = env_u64("DB_MAX_LIFETIME_SECS", 1800).clamp(60, 86400);

    PgPoolOptions::new()
        .max_connections(max_connections)
        .min_connections(min_connections)
        .acquire_timeout(Duration::from_secs(acquire_timeout_secs))
        .idle_timeout(Duration::from_secs(idle_timeout_secs))
        .max_lifetime(Duration::from_secs(max_lifetime_secs))
        .test_before_acquire(true)
        .connect(database_url)
        .await
}

/// Ensures an initial admin user exists unless DISABLE_DEFAULT_ADMIN_SEED=true.
/// Production deployments should set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD (or disable seeding).
pub async fn seed_admin_user_if_missing(
    pool: &PgPool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if std::env::var("DISABLE_DEFAULT_ADMIN_SEED").as_deref() == Ok("true") {
        return Ok(());
    }

    let admin_email = std::env::var("ADMIN_SEED_EMAIL")
        .ok()
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "admin@localhost".to_string());
    let admin_password = std::env::var("ADMIN_SEED_PASSWORD")
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "admin".to_string());

    let exists: Option<(i32,)> = sqlx::query_as("SELECT id FROM users WHERE email = $1")
        .bind(&admin_email)
        .fetch_optional(pool)
        .await?;
    if exists.is_some() {
        return Ok(());
    }

    let password_hash = crate::auth::hash_password(&admin_password)
        .map_err(|e| format!("admin seed hash failed: {}", e))?;
    sqlx::query(
        "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin')",
    )
    .bind(&admin_email)
    .bind(&password_hash)
    .bind("Admin")
    .execute(pool)
    .await?;

    if admin_password == "admin" {
        tracing::warn!(
            email = %admin_email,
            "Seeded default admin user with development password. Set ADMIN_SEED_PASSWORD or change password immediately."
        );
    } else {
        tracing::info!(email = %admin_email, "Seeded initial admin user from environment configuration.");
    }
    Ok(())
}

/// Prune expired session rows to keep the sessions table bounded at production scale.
pub async fn prune_expired_sessions(pool: &PgPool) -> Result<u64, sqlx::Error> {
    let res = sqlx::query("DELETE FROM sessions WHERE expires_at < now()")
        .execute(pool)
        .await?;
    Ok(res.rows_affected())
}
