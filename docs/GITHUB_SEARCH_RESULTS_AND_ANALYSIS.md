# GitHub Search Results and Analysis

Summary of running the top 30 GitHub search queries and how we borrowed from existing repos to improve the app.

**Note:** **The-Key-Holders/bitcoin-estate-planning** is our own project (same product family as this Rust app), not a third-party repo we borrow from.

---

## How many results were used to improve the app?

| Category | Count | Explanation |
|----------|--------|--------------|
| **Repos whose pattern/code directly improved this app** | **2** | chridou/http-api-problem, frenetisch-applaudierend/problem-details-rs → we adopted RFC 7807 problem-details error responses. |
| **Concrete improvements applied** | **1** | Structured API errors (problem details JSON + `Content-Type: application/problem+json`). |
| **Notable repos found but not used** | **See table below** | Redundant, deferred, different stack, or same project. |

So: **2 repos** informed **1 improvement** (error response format). The rest of the hits were either already covered, out of scope, or your own repo.

---

## Why not use all potentially beneficial results?

Each notable result is listed below with a short reason it was or wasn’t used.

| Repo / result | Why used or why not used |
|----------------|---------------------------|
| **chridou/http-api-problem** | **Used.** Inspired RFC 7807–style error JSON (title, detail, status). We implemented a minimal version in-tree (no crate). |
| **frenetisch-applaudierend/problem-details-rs** | **Used.** Same pattern; confirmed approach for problem details. |
| **The-Key-Holders/bitcoin-estate-planning** | **Not applicable.** This is our own repo (same product), not an external source to borrow from. |
| **oyin-da/Digital-Will-and-Testament-Vault** | Different stack (Stacks/Clarity, not Rust/Axum). No direct code reuse; concept-only reference. |
| **launchbadge/realworld-axum-sqlx** | Used as reference for “good API shape”; we didn’t copy code. Problem-details pattern was the takeaway. |
| **JoeyMckenzie/realworld-rust-axum-sqlx** | Same; full-stack reference. Our stack is Axum + Next.js, not Yew. |
| **sheroz/axum-rest-api-sample** | We already have CORS + tracing. JWT and Redis were deliberately deferred (not in current MVP). |
| **wpcodevo/rust-axum-postgres-api** | CRUD + SQLx patterns already present; would be redundant. |
| **brix101/rust-rest-boilerplate** | We use serde + server-side rules (e.g. allocation sum). Validator crate + JWT deferred. |
| **softwaremill/rust-axum-sqlx-redis-ws-template** | Redis + WebSockets out of scope for current MVP. |
| **cudidotdev/Rust-axum-postgres-CRUD-app** | Simple CRUD; we already have equivalent. |
| **juhaku/utoipa** | **Deferred.** OpenAPI/Swagger would improve docs and SDKs; left out to avoid scope creep. Can add later. |
| **ProbablyClem/utoipauto** | Same; OpenAPI automation deferred. |
| **Rate limiting (axum-ratelimit, etc.)** | **Deferred.** To add when we harden for production/abuse. |
| **Pagination (paginator-axum, etc.)** | **Deferred.** Lists are small; can add limit/offset or cursor later. |
| **JWT auth (multiple repos)** | **Out of scope** for current MVP (no auth requirement yet). |
| **tokio-rs/axum examples (sqlx-postgres)** | Already aligned with our setup; no change needed. |

**Summary:** We used **2 repos** for **1 concrete improvement** (structured errors). Others were: our own project, already covered, different stack, or intentionally deferred (OpenAPI, rate limit, pagination, JWT, Redis, WebSockets) to keep scope manageable.

---

## Queries executed (top 30)

| # | Query | Total count | Notable repos (top hits) |
|---|--------|-------------|---------------------------|
| 1 | axum sqlx postgres | 56 | sheroz/axum-rest-api-sample (118★), wpcodevo/rust-axum-postgres-api (64★), brix101/rust-rest-boilerplate (45★), softwaremill/rust-axum-sqlx-redis-ws-template, cudidotdev/Rust-axum-postgres-CRUD-app |
| 2 | estate planning inheritance beneficiary | 2 | The-Key-Holders/bitcoin-estate-planning, oyin-da/Digital-Will-and-Testament-Vault (Stacks/Clarity) |
| 3 | language:Rust http-api-problem | 3 | chridou/http-api-problem (62★), frenetisch-applaudierend/problem-details-rs |
| 4 | realworld axum sqlx | 15 | launchbadge/realworld-axum-sqlx (1042★), JoeyMckenzie/realworld-rust-axum-sqlx (261★) |
| 5 | language:Rust utoipa openapi | 18 | juhaku/utoipa (3640★), ProbablyClem/utoipauto (185★) |

*(Additional queries 6–30 were defined in GITHUB_SEARCH_QUERIES.md; a subset was run via GitHub API; some timed out. The above represent the executed and analyzed set.)*

---

## Repos with directly borrowable aspects

| Repo | Aspect borrowed | How we use it |
|------|------------------|----------------|
| **chridou/http-api-problem**, **frenetisch-applaudierend/problem-details-rs** | RFC 7807 / RFC 9457 Problem Details for HTTP APIs | Return JSON error body with `type`, `title`, `detail`, `status` (and optional `instance`) so clients get machine-readable errors. Implemented as a minimal inline struct (no new crate). |
| **launchbadge/realworld-axum-sqlx** | Full Axum+SQLx patterns, error handling, structure | Reference for API layout and error response patterns; we adopted problem-details style. |
| **sheroz/axum-rest-api-sample** | JWT, Redis, CORS, logging | Already have CORS + tracing; JWT/Redis left for future. |
| **brix101/rust-rest-boilerplate** | Validator + JWT | Validation pattern; we use serde and server-side checks (e.g. allocation sum). |

---

## Aspects considered but deferred

- **utoipa / OpenAPI**: Generate OpenAPI spec from Rust types (juhaku/utoipa). Deferred to avoid scope creep; can add later for `/openapi.json` and Swagger UI.
- **Rate limiting**: axum-ratelimit, axum_rate_limiter. Deferred; add when needed for production.
- **Pagination**: paginator-axum, cursor/offset. Deferred; list endpoints return full lists for now.
- **JWT auth**: Multiple repos. Out of scope for current MVP.

---

## Implemented borrow: RFC 7807–style problem details

We implemented a minimal **Problem Details** response for API errors (inspired by http-api-problem and problem-details-rs):

- **Struct**: `ProblemDetails { type_url, title, detail, status }` (and optional `instance`).
- **Content-Type**: `application/problem+json`.
- **Behavior**: All `ApiError` variants (NotFound, AllocationExceeded, Db) now return JSON with `title`, `detail`, `status` so clients and tests can parse errors consistently.

Tests added:

- Integration test asserts that on allocation-exceeded (422) the response body is JSON containing `detail` and a message about 100% / allocation.
- Existing tests still pass; error logging unchanged.

---

## References

- [RFC 7807 – Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807)
- [chridou/http-api-problem](https://github.com/chridou/http-api-problem)
- [frenetisch-applaudierend/problem-details-rs](https://github.com/frenetisch-applaudierend/problem-details-rs)
- [launchbadge/realworld-axum-sqlx](https://github.com/launchbadge/realworld-axum-sqlx)
- [tokio-rs/axum examples (sqlx-postgres)](https://github.com/tokio-rs/axum/tree/main/examples/sqlx-postgres)
