use estate_planning_rust::{api, db, logging};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
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
    let migrator =
        sqlx::migrate::Migrator::new(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations")).await?;
    migrator.run(&pool).await?;

    let migration_version: Option<String> = sqlx::query_scalar::<_, i64>("SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1")
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
        .on_response(|_res: &axum::response::Response, _latency: std::time::Duration, span: &tracing::Span| {
            span.in_scope(|| tracing::info!("request completed"));
        });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = api::router(pool)
        .layer(trace_layer)
        .layer(cors);
    let addr: SocketAddr = format!("{}:{}", host, port).parse()?;
    tracing::info!(%addr, "Listening");
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}
