use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::time::Duration;

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(database_url)
        .await
}

/// Ensures the default admin user exists (email: admin@localhost, password: admin, role: admin).
/// Safe to run on every startup; only inserts if the user does not exist.
pub async fn seed_admin_user_if_missing(pool: &PgPool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    const ADMIN_EMAIL: &str = "admin@localhost";
    let exists: Option<(i32,)> = sqlx::query_as("SELECT id FROM users WHERE email = $1")
        .bind(ADMIN_EMAIL)
        .fetch_optional(pool)
        .await?;
    if exists.is_some() {
        return Ok(());
    }
    let password_hash = crate::auth::hash_password("admin")
        .map_err(|e| format!("admin seed hash failed: {}", e))?;
    sqlx::query(
        "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin')",
    )
    .bind(ADMIN_EMAIL)
    .bind(&password_hash)
    .bind("Admin")
    .execute(pool)
    .await?;
    tracing::info!("Seeded default admin user (admin@localhost). Change password after first login.");
    Ok(())
}
