use axum::http::header::{HeaderName, ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN};
use axum::http::HeaderValue;
use axum::http::Method;
use estate_planning_rust::{api, db, logging};
use std::net::SocketAddr;
use std::time::Duration;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut sig) =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        {
            sig.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => { tracing::info!("Received Ctrl-C, initiating graceful shutdown"); }
        _ = terminate => { tracing::info!("Received SIGTERM, initiating graceful shutdown"); }
    }
}

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

    // Background expired-session janitor (runs every 15 minutes)
    let janitor_pool = pool.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(900));
        loop {
            interval.tick().await;
            match db::prune_expired_sessions(&janitor_pool).await {
                Ok(n) if n > 0 => tracing::info!(pruned = n, "Pruned expired sessions"),
                Ok(_) => {}
                Err(e) => tracing::warn!(error = %e, "Expired session cleanup failed"),
            }
        }
    });

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

    let mut allowed_origins = vec![
        HeaderValue::from_static("http://localhost:3000"),
        HeaderValue::from_static("http://127.0.0.1:3000"),
        HeaderValue::from_static("http://localhost:3001"),
        HeaderValue::from_static("http://127.0.0.1:3001"),
        HeaderValue::from_static("http://localhost:8080"),
        HeaderValue::from_static("http://127.0.0.1:8080"),
        HeaderValue::from_static("https://estate.thegeeksnextdoor.com"),
        HeaderValue::from_static("http://estate.thegeeksnextdoor.com"),
    ];
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
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    tracing::info!("Server shut down cleanly");
    Ok(())
}
