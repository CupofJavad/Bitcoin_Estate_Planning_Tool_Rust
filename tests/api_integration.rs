//! Integration tests for the API. Require DATABASE_URL and a running Postgres (e.g. `docker compose -f infra/docker-compose.yml up -d`).
//! Logging is initialized so test runs produce logs for analysis.
//! If the database is unavailable, tests are skipped (no failure).

use axum::http::header::{ACCEPT, CONTENT_TYPE};
use axum::http::Method;
use estate_planning_rust::api;
use estate_planning_rust::db;
use std::sync::Once;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;

static INIT_TRACING: Once = Once::new();
static INIT_RATE_LIMIT: Once = Once::new();

fn init_tracing_once() {
    INIT_RATE_LIMIT.call_once(|| {
        std::env::set_var("RATE_LIMIT_MAX", "1000");
    });
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
    // With allow_credentials(true), CORS forbids * for origin/headers/methods; use explicit lists.
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::mirror_request())
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
        ])
        .allow_headers([CONTENT_TYPE, ACCEPT])
        .allow_credentials(true);
    // Relax rate limit so parallel tests don't get 429 (or set RATE_LIMIT_MAX=1000 in env).
    std::env::set_var("RATE_LIMIT_MAX", "1000");
    let app = api::router(pool).layer(trace_layer).layer(cors);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.ok()?;
    let addr = listener.local_addr().ok()?;
    let handle = tokio::spawn(async move { axum::serve(listener, app).await });
    Some((addr, handle))
}

/// Register, login, and return a client with session cookie for an isolated test user.
async fn auth_client(addr: std::net::SocketAddr) -> Option<reqwest::Client> {
    let email = format!("test-{}@example.com", uuid::Uuid::new_v4());
    let client = reqwest::Client::builder().cookie_store(true).build().ok()?;
    let register = serde_json::json!({
        "email": email,
        "password": "password1234",
        "name": "Test User"
    });
    let _ = client
        .post(format!("http://{}/auth/register", addr))
        .json(&register)
        .send()
        .await
        .ok()?;
    let login_res = client
        .post(format!("http://{}/auth/login", addr))
        .json(&serde_json::json!({ "email": email, "password": "password1234" }))
        .send()
        .await
        .ok()?;
    if login_res.status() != 200 {
        return None;
    }
    Some(client)
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
async fn auth_register_and_login() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::builder()
        .cookie_store(true)
        .build()
        .expect("client");
    let register = serde_json::json!({
        "email": "auth_test@example.com",
        "password": "password1234",
        "name": "Auth Test"
    });
    let res = client
        .post(format!("http://{}/auth/register", addr))
        .json(&register)
        .send()
        .await
        .expect("register");
    let status = res.status();
    assert!(
        status == 201 || status == 400,
        "register: {} (201 or 400 expected)",
        res.text().await.unwrap_or_default()
    );
    let res = client
        .post(format!("http://{}/auth/login", addr))
        .json(&serde_json::json!({ "email": "auth_test@example.com", "password": "password1234" }))
        .send()
        .await
        .expect("login");
    assert_eq!(
        res.status(),
        200,
        "login: {}",
        res.text().await.unwrap_or_default()
    );
    let me_res = client
        .get(format!("http://{}/api/v1/me", addr))
        .send()
        .await
        .expect("me");
    assert_eq!(me_res.status(), 200);
    let me: serde_json::Value = me_res.json().await.expect("json");
    assert_eq!(me["email"], "auth_test@example.com");
}

#[tokio::test]
async fn login_wrong_password_returns_401() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();
    let res = client
        .post(format!("http://{}/auth/login", addr))
        .json(&serde_json::json!({ "email": "nonexistent@example.com", "password": "wrongpass" }))
        .send()
        .await
        .expect("login");
    assert_eq!(res.status(), 401, "wrong credentials should return 401");
}

#[tokio::test]
async fn estate_plans_require_auth() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();
    let res = client
        .get(format!("http://{}/api/v1/estate-plans", addr))
        .send()
        .await
        .expect("list");
    assert_eq!(res.status(), 401);
}

#[tokio::test]
async fn estate_plans_crud() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = auth_client(addr).await.expect("auth client");
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
        "monero_address": null,
        "stacks_address": null,
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
    let client = auth_client(addr).await.expect("auth client");
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
    // RFC 7807 problem details: response should be JSON with title, detail, status
    let problem: serde_json::Value =
        serde_json::from_str(&body).expect("error body should be JSON");
    assert_eq!(problem["status"], 422);
    assert!(problem["detail"]
        .as_str()
        .unwrap()
        .to_lowercase()
        .contains("100"));

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
    let client = auth_client(addr).await.expect("auth client");
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
    let client = auth_client(addr).await.expect("auth client");
    let res = client
        .get(format!("http://{}/api/v1/estate-plans/99999", addr))
        .send()
        .await
        .expect("request");
    assert_eq!(res.status(), 404);
    // RFC 7807: error body must be JSON with title, detail, status
    let body = res.text().await.expect("body");
    let problem: serde_json::Value =
        serde_json::from_str(&body).expect("404 body should be problem JSON");
    assert_eq!(problem["status"], 404);
    assert!(problem.get("title").and_then(|v| v.as_str()).is_some());
    assert!(problem.get("detail").and_then(|v| v.as_str()).is_some());
}

#[tokio::test]
async fn patch_me_and_change_password() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = auth_client(addr).await.expect("auth client");
    let base = format!("http://{}/api/v1", addr);

    // PATCH /me — update name
    let res = client
        .patch(format!("{}/me", base))
        .json(&serde_json::json!({ "name": "Updated Name" }))
        .send()
        .await
        .expect("patch me");
    assert_eq!(res.status(), 200);
    let me: serde_json::Value = res.json().await.expect("json");
    assert_eq!(me["name"], "Updated Name");
    let user_email = me["email"].as_str().expect("email").to_string();

    // Change password
    let res = client
        .post(format!("{}/me/password", base))
        .json(&serde_json::json!({
            "current_password": "password1234",
            "new_password": "newpassword123"
        }))
        .send()
        .await
        .expect("change password");
    assert_eq!(res.status(), 204);

    // Login with new password (new client to drop old session cookie)
    let client2 = reqwest::Client::builder()
        .cookie_store(true)
        .build()
        .expect("client");
    let res = client2
        .post(format!("http://{}/auth/login", addr))
        .json(&serde_json::json!({ "email": user_email, "password": "newpassword123" }))
        .send()
        .await
        .expect("login with new password");
    assert_eq!(res.status(), 200, "login with new password should succeed");
}

#[tokio::test]
async fn admin_list_users_requires_admin() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = auth_client(addr).await.expect("auth client");
    let res = client
        .get(format!("http://{}/api/v1/admin/users", addr))
        .send()
        .await
        .expect("request");
    assert_eq!(res.status(), 403, "non-admin should get 403 Forbidden");
}

#[tokio::test]
async fn security_headers_and_openapi_docs() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();
    let res = client
        .get(format!("http://{}/api/openapi.json", addr))
        .send()
        .await
        .expect("openapi request");
    assert_eq!(res.status(), 200);
    assert_eq!(
        res.headers()
            .get("x-content-type-options")
            .and_then(|v| v.to_str().ok()),
        Some("nosniff")
    );
    assert_eq!(
        res.headers()
            .get("x-frame-options")
            .and_then(|v| v.to_str().ok()),
        Some("DENY")
    );
    assert!(res.headers().contains_key("x-request-id"));

    let spec: serde_json::Value = res.json().await.expect("openapi json");
    assert_eq!(spec["openapi"], "3.1.0");
    assert!(spec["paths"]["/api/v1/estate-plans/{id}/inheritance-packet"].is_object());

    let docs = client
        .get(format!("http://{}/docs", addr))
        .send()
        .await
        .expect("docs request");
    assert_eq!(docs.status(), 200);
    assert!(docs.text().await.unwrap().contains("Legacy Vault"));
}

#[tokio::test]
async fn crypto_validate_address_and_descriptor() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = reqwest::Client::new();

    // Valid Bitcoin Bech32 P2WPKH
    let btc_res: serde_json::Value = client
        .post(format!("http://{}/api/v1/crypto/validate-address", addr))
        .json(&serde_json::json!({
            "chain": "btc",
            "address": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
        }))
        .send()
        .await
        .expect("btc validate")
        .json()
        .await
        .expect("json");
    assert_eq!(btc_res["valid"], true);
    assert_eq!(btc_res["checksum_verified"], true);

    // Invalid Bitcoin checksum
    let bad_res: serde_json::Value = client
        .post(format!("http://{}/api/v1/crypto/validate-address", addr))
        .json(&serde_json::json!({
            "chain": "btc",
            "address": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5"
        }))
        .send()
        .await
        .expect("bad btc validate")
        .json()
        .await
        .expect("json");
    assert_eq!(bad_res["valid"], false);

    // Miniscript BIP-380 timelock descriptor
    let desc: serde_json::Value = client
        .post(format!("http://{}/api/v1/crypto/timelock-descriptor", addr))
        .json(&serde_json::json!({
            "owner_key": "xpubOwner/0/*",
            "heir_keys": ["xpubHeir1/0/*", "xpubHeir2/0/*"],
            "heir_threshold": 2,
            "timelock_blocks": 12960,
            "lock_mode": "csv",
            "network": "mainnet"
        }))
        .send()
        .await
        .expect("descriptor")
        .json()
        .await
        .expect("json");
    assert!(desc["wsh_descriptor"]
        .as_str()
        .unwrap()
        .contains("older(12960)"));
    assert!(desc["taproot_descriptor"].as_str().unwrap().contains('#'));
}

#[tokio::test]
async fn heartbeat_readiness_vault_notes_and_inheritance_packet() {
    init_tracing_once();
    let Some((addr, _handle)) = test_app().await else {
        eprintln!("SKIP: DATABASE_URL unset or Postgres unreachable");
        return;
    };
    let client = auth_client(addr).await.expect("auth client");
    let base = format!("http://{}/api/v1", addr);

    // 1. Create estate plan with verified BTC + STX addresses and custom heartbeat schedule
    let plan: serde_json::Value = client
        .post(format!("{}/estate-plans", base))
        .json(&serde_json::json!({
            "name": "Sovereign Family Vault",
            "description": "Long-term cold storage inheritance vault",
            "bitcoin_address": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
            "stacks_address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
            "heartbeat_interval_days": 60,
            "grace_period_days": 14,
            "is_active": true
        }))
        .send()
        .await
        .expect("create plan")
        .json()
        .await
        .expect("plan json");
    let plan_id = plan["id"].as_i64().unwrap();
    assert_eq!(plan["heartbeat_interval_days"], 60);

    // 2. Add 100% beneficiary with verified BTC payout address
    let ben_res = client
        .post(format!("{}/beneficiaries", base))
        .json(&serde_json::json!({
            "estate_plan_id": plan_id,
            "name": "Elena Vance",
            "email": "elena@example.com",
            "bitcoin_address": "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
            "allocation_percentage": 100.0
        }))
        .send()
        .await
        .expect("create beneficiary");
    assert_eq!(ben_res.status(), 201);

    // 3. Add active timelock policy
    let tl_res = client
        .post(format!("{}/timelock-policies", base))
        .json(&serde_json::json!({
            "estate_plan_id": plan_id,
            "name": "6-Month Inactivity CSV Lock",
            "timelock_blocks": 26280,
            "trigger_condition": "inactivity",
            "is_active": true
        }))
        .send()
        .await
        .expect("create timelock");
    assert_eq!(tl_res.status(), 201);

    // 4. Record proof-of-life check-in
    let checkin: serde_json::Value = client
        .post(format!("{}/estate-plans/{}/checkin", base, plan_id))
        .json(&serde_json::json!({ "note": "Quarterly hardware wallet verification" }))
        .send()
        .await
        .expect("checkin")
        .json()
        .await
        .expect("checkin json");
    assert_eq!(checkin["heartbeat"]["status"], "healthy");
    assert_eq!(
        checkin["checkin"]["note"],
        "Quarterly hardware wallet verification"
    );

    // 5. Store a client-side AES-256-GCM zero-knowledge encrypted note
    let note: serde_json::Value = client
        .post(format!("{}/estate-plans/{}/vault-notes", base, plan_id))
        .json(&serde_json::json!({
            "title": "Coldcard Safe Deposit Location",
            "ciphertext_b64": "dGVzdC1jaXBoZXJ0ZXh0LWVuY3J5cHRlZA==",
            "iv_b64": "MTIzNDU2Nzg5MDEy",
            "salt_b64": "c2FsdC1ieXRlcy0xMjM0NTY=",
            "kdf_iterations": 310000,
            "algorithm": "AES-256-GCM",
            "hint": "Family wedding city + year"
        }))
        .send()
        .await
        .expect("create note")
        .json()
        .await
        .expect("note json");
    let note_id = note["id"].as_i64().unwrap();

    // 6. Verify Readiness Score is 100 (A+)
    let readiness: serde_json::Value = client
        .get(format!("{}/estate-plans/{}/readiness", base, plan_id))
        .send()
        .await
        .expect("readiness")
        .json()
        .await
        .expect("readiness json");
    assert_eq!(readiness["score"], 100);
    assert_eq!(readiness["grade"], "A+");

    // 7. Verify Inheritance Packet includes SHA-256 integrity digest and compiled Miniscript descriptor
    let packet: serde_json::Value = client
        .get(format!(
            "{}/estate-plans/{}/inheritance-packet",
            base, plan_id
        ))
        .send()
        .await
        .expect("packet")
        .json()
        .await
        .expect("packet json");
    assert_eq!(packet["integrity_sha256"].as_str().unwrap().len(), 64);
    assert_eq!(packet["timelock_policies"].as_array().unwrap().len(), 1);
    assert!(
        packet["timelock_policies"][0]["descriptor"]["wsh_descriptor"]
            .as_str()
            .unwrap()
            .contains("older(26280)")
    );

    // 8. Verify Dashboard Summary
    let summary: serde_json::Value = client
        .get(format!("{}/dashboard/summary", base))
        .send()
        .await
        .expect("summary")
        .json()
        .await
        .expect("summary json");
    assert!(summary["total_plans"].as_u64().unwrap() >= 1);
    assert!(summary["chain_coverage"]["btc_plans"].as_u64().unwrap() >= 1);

    // Cleanup note & plan
    let del_note = client
        .delete(format!("{}/vault-notes/{}", base, note_id))
        .send()
        .await
        .expect("delete note");
    assert_eq!(del_note.status(), 204);

    let del_plan = client
        .delete(format!("{}/estate-plans/{}", base, plan_id))
        .send()
        .await
        .expect("delete plan");
    assert_eq!(del_plan.status(), 204);
}
