//! OpenAPI 3.1 specification and lightweight interactive API explorer.

use axum::{
    http::header,
    response::{Html, IntoResponse},
    Json,
};
use serde_json::{json, Value};

pub async fn openapi_json() -> Json<Value> {
    Json(json!({
        "openapi": "3.1.0",
        "info": {
            "title": "Legacy Vault API",
            "version": env!("CARGO_PKG_VERSION"),
            "description": "Multi-chain sovereign estate planning API for Bitcoin (BTC), Monero (XMR), and Stacks (STX). Includes proof-of-life heartbeats, readiness scoring, BIP-380 Miniscript timelock descriptor generation, zero-knowledge encrypted vault notes, and verifiable heir inheritance packets."
        },
        "servers": [
            { "url": "http://localhost:8000", "description": "Local development" }
        ],
        "components": {
            "securitySchemes": {
                "sessionCookie": {
                    "type": "apiKey",
                    "in": "cookie",
                    "name": "session"
                }
            }
        },
        "paths": {
            "/health": {
                "get": { "tags": ["System"], "summary": "Liveness check", "responses": { "200": { "description": "OK" } } }
            },
            "/ready": {
                "get": { "tags": ["System"], "summary": "Readiness probe (verifies PostgreSQL connectivity and connection pool health)", "responses": { "200": { "description": "Ready" }, "503": { "description": "Database unavailable" } } }
            },
            "/metrics": {
                "get": { "tags": ["System"], "summary": "Prometheus exposition telemetry metrics", "responses": { "200": { "description": "text/plain Prometheus metrics" } } }
            },
            "/version": {
                "get": { "tags": ["System"], "summary": "Application & migration version", "responses": { "200": { "description": "Version metadata" } } }
            },
            "/auth/register": {
                "post": { "tags": ["Auth"], "summary": "Register new account", "responses": { "201": { "description": "Created" }, "400": { "description": "Validation error" } } }
            },
            "/auth/login": {
                "post": { "tags": ["Auth"], "summary": "Authenticate and set HttpOnly session cookie", "responses": { "200": { "description": "Authenticated" }, "401": { "description": "Unauthorized" } } }
            },
            "/auth/logout": {
                "post": { "tags": ["Auth"], "summary": "Invalidate session", "responses": { "204": { "description": "Logged out" } } }
            },
            "/api/v1/dashboard/summary": {
                "get": { "tags": ["Dashboard"], "security": [{ "sessionCookie": [] }], "summary": "Aggregated portfolio readiness, heartbeat health, and chain coverage", "responses": { "200": { "description": "Summary payload" } } }
            },
            "/api/v1/estate-plans": {
                "get": { "tags": ["Estate Plans"], "security": [{ "sessionCookie": [] }], "summary": "List user estate plans", "responses": { "200": { "description": "Array of estate plans" } } },
                "post": { "tags": ["Estate Plans"], "security": [{ "sessionCookie": [] }], "summary": "Create estate plan with optional heartbeat schedule", "responses": { "201": { "description": "Created estate plan" } } }
            },
            "/api/v1/estate-plans/{id}": {
                "get": { "tags": ["Estate Plans"], "security": [{ "sessionCookie": [] }], "summary": "Get estate plan with beneficiaries, timelock policies, heartbeat status, and readiness", "responses": { "200": { "description": "Estate plan detail" } } },
                "patch": { "tags": ["Estate Plans"], "security": [{ "sessionCookie": [] }], "summary": "Update estate plan", "responses": { "200": { "description": "Updated" } } },
                "delete": { "tags": ["Estate Plans"], "security": [{ "sessionCookie": [] }], "summary": "Delete estate plan", "responses": { "204": { "description": "Deleted" } } }
            },
            "/api/v1/estate-plans/{id}/checkin": {
                "post": { "tags": ["Heartbeat"], "security": [{ "sessionCookie": [] }], "summary": "Record proof-of-life check-in and reset dead-man's-switch timer", "responses": { "200": { "description": "Updated heartbeat status" } } }
            },
            "/api/v1/estate-plans/{id}/checkins": {
                "get": { "tags": ["Heartbeat"], "security": [{ "sessionCookie": [] }], "summary": "List proof-of-life check-in history", "responses": { "200": { "description": "Check-in records" } } }
            },
            "/api/v1/estate-plans/{id}/readiness": {
                "get": { "tags": ["Readiness"], "security": [{ "sessionCookie": [] }], "summary": "Compute 0-100 estate readiness score with itemized audit checks", "responses": { "200": { "description": "Readiness report" } } }
            },
            "/api/v1/estate-plans/{id}/inheritance-packet": {
                "get": { "tags": ["Heir Packet"], "security": [{ "sessionCookie": [] }], "summary": "Generate verifiable JSON heir inheritance packet with SHA-256 digest and Bitcoin Miniscript descriptors", "responses": { "200": { "description": "Inheritance packet" } } }
            },
            "/api/v1/estate-plans/{id}/vault-notes": {
                "get": { "tags": ["Zero-Knowledge Vault"], "security": [{ "sessionCookie": [] }], "summary": "List encrypted vault notes (ciphertext only)", "responses": { "200": { "description": "Encrypted notes" } } },
                "post": { "tags": ["Zero-Knowledge Vault"], "security": [{ "sessionCookie": [] }], "summary": "Store client-side AES-256-GCM encrypted vault note", "responses": { "201": { "description": "Stored" } } }
            },
            "/api/v1/vault-notes/{id}": {
                "delete": { "tags": ["Zero-Knowledge Vault"], "security": [{ "sessionCookie": [] }], "summary": "Delete encrypted vault note", "responses": { "204": { "description": "Deleted" } } }
            },
            "/api/v1/beneficiaries": {
                "get": { "tags": ["Beneficiaries"], "security": [{ "sessionCookie": [] }], "summary": "List beneficiaries", "responses": { "200": { "description": "Beneficiaries" } } },
                "post": { "tags": ["Beneficiaries"], "security": [{ "sessionCookie": [] }], "summary": "Add beneficiary (enforces sum <= 100%)", "responses": { "201": { "description": "Created" }, "422": { "description": "Allocation exceeded" } } }
            },
            "/api/v1/timelock-policies": {
                "get": { "tags": ["Timelock Policies"], "security": [{ "sessionCookie": [] }], "summary": "List timelock policies", "responses": { "200": { "description": "Policies" } } },
                "post": { "tags": ["Timelock Policies"], "security": [{ "sessionCookie": [] }], "summary": "Create Bitcoin timelock policy", "responses": { "201": { "description": "Created" } } }
            },
            "/api/v1/crypto/validate-address": {
                "post": { "tags": ["Crypto Primitives"], "summary": "Cryptographically verify BTC (Bech32/Bech32m/Base58Check), XMR (Keccak-256), or STX (c32check) address", "responses": { "200": { "description": "Validation result" } } }
            },
            "/api/v1/crypto/timelock-descriptor": {
                "post": { "tags": ["Crypto Primitives"], "summary": "Generate BIP-380 WSH & Taproot Miniscript timelock descriptors with checksums and Bitcoin Script ASM", "responses": { "200": { "description": "Descriptor bundle" } } }
            }
        }
    }))
}

pub async fn api_docs_html() -> impl IntoResponse {
    let html = r#"<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Legacy Vault API Documentation</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0d1117; color: #e6edf3; }
    header { padding: 24px 32px; border-bottom: 1px solid #262c36; display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; font-size: 20px; font-weight: 600; color: #e2c275; }
    a { color: #e2c275; text-decoration: none; font-size: 14px; }
    main { max-width: 960px; margin: 32px auto; padding: 0 24px 64px; }
    .endpoint { background: #161b22; border: 1px solid #262c36; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; }
    .method { display: inline-block; font-family: monospace; font-weight: 700; font-size: 12px; padding: 3px 8px; border-radius: 4px; margin-right: 10px; }
    .get { background: #10382a; color: #34d399; }
    .post { background: #3b2d12; color: #f5c26b; }
    .patch { background: #1d2d44; color: #7dd3fc; }
    .delete { background: #3f181c; color: #fca5a5; }
    .path { font-family: monospace; font-size: 14px; color: #f0f6fc; }
    .summary { color: #9ca3af; font-size: 13px; margin-top: 6px; }
  </style>
</head>
<body>
  <header>
    <h1>Legacy Vault · OpenAPI 3.1 Reference</h1>
    <a href="/api/openapi.json">Download openapi.json →</a>
  </header>
  <main id="root">Loading specification…</main>
  <script>
    fetch('/api/openapi.json').then(r => r.json()).then(spec => {
      const root = document.getElementById('root');
      root.innerHTML = `<p style="color:#9ca3af;margin-bottom:24px">${spec.info.description}</p>`;
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, info] of Object.entries(methods)) {
          const el = document.createElement('div');
          el.className = 'endpoint';
          el.innerHTML = `<span class="method ${method}">${method.toUpperCase()}</span><span class="path">${path}</span><div class="summary">${info.summary || ''}</div>`;
          root.appendChild(el);
        }
      }
    });
  </script>
</body>
</html>"#;
    (
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        Html(html),
    )
}
