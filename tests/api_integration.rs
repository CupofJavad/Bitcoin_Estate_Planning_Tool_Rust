//! Integration tests for the API. Require DATABASE_URL and a running Postgres (e.g. `docker compose -f infra/docker-compose.yml up -d`).
//! Logging is initialized so test runs produce logs for analysis.
//! If the database is unavailable, tests are skipped (no failure).

use estate_planning_rust::api;
use estate_planning_rust::db;
use std::sync::Once;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

static INIT_TRACING: Once = Once::new();

fn init_tracing_once() {
    INIT_TRACING.call_once(|| {
        let _ = tracing_subscriber::fmt()
            .with_env_filter(
                tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                    tracing_subscriber::EnvFilter::new(
                        "estate_planning_rust=info,tower_http=info,warn",
                    )
                }),
            )
            .with_writer(std::io::stderr)
            .try_init();
    });
}

/// Returns None if DB is unavailable (tests should skip).
async fn test_app() -> Option<(
    std::net::SocketAddr,
    tokio::task::JoinHandle<Result<(), std::io::Error>>,
)> {
    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").ok()?;
    let pool = db::create_pool(&database_url).await.ok()?;
    let migrator = sqlx::migrate::Migrator::new(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations"),
    )
    .await
    .ok()?;
    migrator.run(&pool).await.ok()?;

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
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    let app = api::router(pool).layer(trace_layer).layer(cors);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.ok()?;
    let addr = listener.local_addr().ok()?;
    let handle = tokio::spawn(async move { axum::serve(listener, app).await });
    Some((addr, handle))
}

#[tokio::test]
async fn health_returns_ok() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable (run: docker compose -f infra/docker-compose.yml up -d)");
        return;
    };
    let client = reqwest::Client::new();
    let res = client
        .get(format!("http://{}/health", addr))
        .send()
        .await
        .expect("request");
    assert_eq!(res.status(), 200, "health should return 200");
    let body = res.text().await.expect("body");
    assert_eq!(body, "OK");
}

#[tokio::test]
async fn version_returns_app_and_migration_version() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();
    let res = client
        .get(format!("http://{}/version", addr))
        .send()
        .await
        .expect("request");
    assert_eq!(res.status(), 200);
    let json: serde_json::Value = res.json().await.expect("json");
    assert!(json.get("app_version").is_some());
    // migration_version may be null or number
}

#[tokio::test]
async fn estate_plans_crud() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();
    let base = format!("http://{}/api/v1", addr);

    // List (empty or existing)
    let res = client
        .get(format!("{}/estate-plans", base))
        .send()
        .await
        .expect("list");
    assert_eq!(res.status(), 200);

    // Create
    let create = serde_json::json!({
        "name": "Test Plan Integration",
        "description": "For integration test",
        "bitcoin_address": null,
        "is_active": true
    });
    let res = client
        .post(format!("{}/estate-plans", base))
        .json(&create)
        .send()
        .await
        .expect("create");
    assert_eq!(
        res.status(),
        201,
        "create estate plan: {}",
        res.text().await.unwrap_or_default()
    );
    let plan: serde_json::Value = res.json().await.expect("json");
    let id = plan["id"].as_i64().expect("id");

    // Get by id (with relations)
    let res = client
        .get(format!("{}/estate-plans/{}", base, id))
        .send()
        .await
        .expect("get");
    assert_eq!(res.status(), 200);
    let with_rels: serde_json::Value = res.json().await.expect("json");
    assert_eq!(with_rels["name"], "Test Plan Integration");
    assert!(with_rels.get("beneficiaries").is_some());
    assert!(with_rels.get("timelock_policies").is_some());

    // Update
    let update = serde_json::json!({ "name": "Updated Plan Name" });
    let res = client
        .patch(format!("{}/estate-plans/{}", base, id))
        .json(&update)
        .send()
        .await
        .expect("update");
    assert_eq!(res.status(), 200);

    // Delete
    let res = client
        .delete(format!("{}/estate-plans/{}", base, id))
        .send()
        .await
        .expect("delete");
    assert_eq!(res.status(), 204);

    // Get again -> 404
    let res = client
        .get(format!("{}/estate-plans/{}", base, id))
        .send()
        .await
        .expect("get after delete");
    assert_eq!(res.status(), 404);
}

#[tokio::test]
async fn beneficiaries_allocation_exceeded() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();
    let base = format!("http://{}/api/v1", addr);

    // Create plan
    let create_plan = serde_json::json!({
        "name": "Allocation Test Plan",
        "is_active": true
    });
    let res = client
        .post(format!("{}/estate-plans", base))
        .json(&create_plan)
        .send()
        .await
        .expect("create plan");
    assert_eq!(res.status(), 201);
    let plan: serde_json::Value = res.json().await.expect("json");
    let estate_plan_id = plan["id"].as_i64().expect("id") as i32;

    // Create beneficiary 60%
    let b1 = serde_json::json!({
        "estate_plan_id": estate_plan_id,
        "name": "Ben A",
        "allocation_percentage": 60.0
    });
    let res = client
        .post(format!("{}/beneficiaries", base))
        .json(&b1)
        .send()
        .await
        .expect("b1");
    assert_eq!(res.status(), 201);

    // Create beneficiary 50% -> total 110% -> 422
    let b2 = serde_json::json!({
        "estate_plan_id": estate_plan_id,
        "name": "Ben B",
        "allocation_percentage": 50.0
    });
    let res = client
        .post(format!("{}/beneficiaries", base))
        .json(&b2)
        .send()
        .await
        .expect("b2");
    assert_eq!(res.status(), 422, "allocation should exceed 100%");
    let body = res.text().await.expect("body");
    assert!(
        body.contains("100") || body.contains("allocation"),
        "error message should mention allocation"
    );

    // Cleanup: delete plan (cascades or we delete beneficiaries first depending on schema)
    let _ = client
        .delete(format!("{}/estate-plans/{}", base, estate_plan_id))
        .send()
        .await;
}

#[tokio::test]
async fn timelock_policies_crud() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();
    let base = format!("http://{}/api/v1", addr);

    // Create plan first
    let plan_json = serde_json::json!({ "name": "Timelock Test Plan", "is_active": true });
    let res = client
        .post(format!("{}/estate-plans", base))
        .json(&plan_json)
        .send()
        .await
        .expect("create plan");
    assert_eq!(res.status(), 201);
    let plan: serde_json::Value = res.json().await.expect("json");
    let estate_plan_id = plan["id"].as_i64().expect("id");

    // Create timelock policy
    let policy = serde_json::json!({
        "estate_plan_id": estate_plan_id,
        "name": "2-year lock",
        "description": "Unlock after 2 years",
        "timelock_blocks": 105120,
        "trigger_condition": "after_blocks",
        "is_active": true
    });
    let res = client
        .post(format!("{}/timelock-policies", base))
        .json(&policy)
        .send()
        .await
        .expect("create policy");
    assert_eq!(res.status(), 201);
    let created: serde_json::Value = res.json().await.expect("json");
    let policy_id = created["id"].as_i64().expect("id");

    // Get policy
    let res = client
        .get(format!("{}/timelock-policies/{}", base, policy_id))
        .send()
        .await
        .expect("get policy");
    assert_eq!(res.status(), 200);

    // Update
    let res = client
        .patch(format!("{}/timelock-policies/{}", base, policy_id))
        .json(&serde_json::json!({ "name": "Updated 2-year lock" }))
        .send()
        .await
        .expect("update policy");
    assert_eq!(res.status(), 200);

    // Delete
    let res = client
        .delete(format!("{}/timelock-policies/{}", base, policy_id))
        .send()
        .await
        .expect("delete policy");
    assert_eq!(res.status(), 204);

    // Cleanup plan
    let _ = client
        .delete(format!("{}/estate-plans/{}", base, estate_plan_id))
        .send()
        .await;
}

#[tokio::test]
async fn not_found_returns_404() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();
    let res = client
        .get(format!("http://{}/api/v1/estate-plans/99999", addr))
        .send()
        .await
        .expect("request");
    assert_eq!(res.status(), 404);
}
