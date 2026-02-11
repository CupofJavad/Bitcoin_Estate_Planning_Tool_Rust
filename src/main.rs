use axum::http::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, HeaderName, ORIGIN};
use axum::http::Method;
use axum::http::HeaderValue;
use estate_planning_rust::{api, db, logging};
use std::net::SocketAddr;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    dotenvy::dotenv().ok();

    let _log_guard = logging::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let host = std::env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = std::env::var("API_PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse()
        .expect("API_PORT must be a number");

    let pool = db::create_pool(&database_url).await?;
    let migrator = sqlx::migrate::Migrator::new(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations"),
    )
    .await?;
    migrator.run(&pool).await?;

    db::seed_admin_user_if_missing(&pool).await?;

    let migration_version: Option<String> = sqlx::query_scalar::<_, i64>(
        "SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten()
    .map(|v| v.to_string());
    logging::log_version_info(migration_version);

    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(|req: &axum::http::Request<axum::body::Body>| {
            let request_id = uuid::Uuid::new_v4();
            tracing::info_span!(
                "request",
                request_id = %request_id,
                method = %req.method(),
                uri = %req.uri()
            )
        })
        .on_response(
            |_res: &axum::response::Response,
             _latency: std::time::Duration,
             span: &tracing::Span| {
                span.in_scope(|| tracing::info!("request completed"));
            },
        );

    // Explicit origins and allow_credentials so browser stores Set-Cookie from login/register
    // (credentials: 'include' requires Access-Control-Allow-Credentials: true and specific origin, not *)
    // Include 3000 and 3001 so both default Next.js port and alternate port work.
    // Production: estate.thegeeksnextdoor.com (HTTP and HTTPS for flexibility).
    let mut allowed_origins = vec![
        HeaderValue::from_static("http://localhost:3000"),
        HeaderValue::from_static("http://127.0.0.1:3000"),
        HeaderValue::from_static("http://localhost:3001"),
        HeaderValue::from_static("http://127.0.0.1:3001"),
        HeaderValue::from_static("https://estate.thegeeksnextdoor.com"),
        HeaderValue::from_static("http://estate.thegeeksnextdoor.com"),
    ];
    // Optional extra origins from env (comma-separated), e.g. for staging
    if let Ok(extra) = std::env::var("CORS_EXTRA_ORIGINS") {
        for o in extra.split(',') {
            let o = o.trim();
            if !o.is_empty() {
                if let Ok(h) = HeaderValue::from_str(o) {
                    allowed_origins.push(h);
                }
            }
        }
    }
    // With allow_credentials(true), allow_methods and allow_headers cannot be *; use explicit lists.
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
        .allow_methods(AllowMethods::list([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ]))
        .allow_headers(AllowHeaders::list([
            CONTENT_TYPE,
            ACCEPT,
            AUTHORIZATION,
            ORIGIN,
            HeaderName::from_static("x-requested-with"),
        ]))
        .allow_credentials(true);

    let app = api::router(pool).layer(trace_layer).layer(cors);
    let addr: SocketAddr = format!("{}:{}", host, port).parse()?;
    tracing::info!(%addr, "Listening");
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}
