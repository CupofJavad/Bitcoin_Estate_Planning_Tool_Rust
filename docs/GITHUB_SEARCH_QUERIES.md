# GitHub Search Queries for Borrowing Ideas

Queries to find repos with scripts, code, tools, schemas, SDKs, or patterns that can improve design, features, security, UX, and workflows of the Bitcoin Estate Planning app.

---

## Part 1: 50 Unique Search Queries (general + domain)

| # | Query | Focus |
|---|--------|--------|
| 1 | estate planning inheritance beneficiary | Domain: estate/beneficiary |
| 2 | bitcoin inheritance wallet recovery | Domain: crypto estate |
| 3 | timelock multisig bitcoin | Domain: timelock/multisig |
| 4 | allocation percentage beneficiary | Domain: allocation logic |
| 5 | axum sqlx postgres REST API | Stack: Rust API |
| 6 | rust api versioning migration | Backend: versioning |
| 7 | structured logging tracing rust api | Backend: logging |
| 8 | audit log create update delete api | Backend: audit |
| 9 | rate limit rust web api | Security: rate limiting |
| 10 | input validation rust api serde | Security: validation |
| 11 | health check readiness liveness api | Ops: health |
| 12 | OpenAPI schema rust axum | API: schema/SDK |
| 13 | Next.js fetch API error handling | Frontend: API client |
| 14 | react form validation allocation | Frontend: forms |
| 15 | CORS configuration rust api | Ops: CORS |
| 16 | environment config .env rust | Ops: config |
| 17 | docker compose postgres rust | Ops: Docker |
| 18 | integration test axum request | Testing: API tests |
| 19 | error handling api response rust | Backend: errors |
| 20 | CRUD REST postgres typescript | Full-stack pattern |
| 21 | jwt authentication rust api | Security: auth |
| 22 | sqlx migrate postgres | Backend: migrations |
| 23 | request id tracing middleware | Observability |
| 24 | pagination list api rust | API: pagination |
| 25 | soft delete api database | Data: soft delete |
| 26 | api version prefix v1 | API: versioning |
| 27 | toast notification error success | Frontend: toasts |
| 28 | modal form submit loading | Frontend: UX |
| 29 | pie chart allocation percentage | Frontend: charts |
| 30 | beneficiary bitcoin address validation | Domain + validation |
| 31 | will executor digital asset | Domain: estate |
| 32 | rust tower middleware layer | Backend: middleware |
| 33 | sql injection prevention parameterized | Security |
| 34 | api error status code 422 | API: error codes |
| 35 | database transaction rollback rust | Backend: transactions |
| 36 | frontend api base url env | Frontend: config |
| 37 | github actions rust test postgres | CI: tests |
| 38 | clippy rust ci workflow | CI: lint |
| 39 | readme setup run docker | Docs: onboarding |
| 40 | api pagination cursor offset | API: list design |
| 41 | enum status active inactive | Data: status enum |
| 42 | created_at updated_at trigger | DB: timestamps |
| 43 | cascade delete foreign key | DB: relations |
| 44 | rust serde json api response | Backend: JSON |
| 45 | react query swr fetch cache | Frontend: data |
| 46 | accessibility form label aria | Frontend: a11y |
| 47 | backup export data json | Ops: backup |
| 48 | schema migration rollback | DB: migrations |
| 49 | api documentation swagger | API: docs |
| 50 | multi-tenant user_id scope | Data: multi-tenant |

---

## Part 2: 20 Rust-focused queries (from research)

| # | Query | Focus |
|---|--------|--------|
| 51 | axum sqlx postgres example | Official/community Axum+SQLx |
| 52 | rust problem details RFC 7807 api | Structured error responses |
| 53 | axum-openapi utoipa swagger | OpenAPI/Swagger from Rust |
| 54 | axum rate limit middleware | Rate limiting |
| 55 | axum-trace-id request id | Request correlation |
| 56 | realworld axum sqlx | Full-stack Axum patterns |
| 57 | axum integration test sqlx | Test + DB patterns |
| 58 | tokio-rs axum examples sqlx-postgres | Official example |
| 59 | tower-request-id axum | Request ID (tower-http) |
| 60 | bitcoin rust multisig musig | Bitcoin/crypto Rust |
| 61 | serde_valid validate api | Request validation |
| 62 | paginator-axum cursor offset | List pagination |
| 63 | axum-route-error IntoResponse | Route error handling |
| 64 | http-api-problem axum | RFC 7807 in Axum |
| 65 | axum_login integration test | Auth + tests |
| 66 | clean_axum_demo tests | Test layout |
| 67 | axum health readiness | Health endpoints |
| 68 | sqlx migrate test database | Migration + tests |
| 69 | rust crate tracing tower_http | Observability |
| 70 | utoipa openapi derive | API spec from types |

---

## Top 30 queries to run (by priority)

Used for executing GitHub search and analysis (subset of 1–50 + 51–70 by relevance).

1. axum sqlx postgres REST API  
2. estate planning inheritance beneficiary  
3. rust api versioning migration  
4. structured logging tracing rust api  
5. audit log create update delete api  
6. integration test axum request  
7. error handling api response rust  
8. OpenAPI schema rust axum  
9. rate limit rust web api  
10. input validation rust api serde  
11. health check readiness liveness api  
12. timelock multisig bitcoin  
13. allocation percentage beneficiary  
14. Next.js fetch API error handling  
15. request id tracing middleware  
16. sqlx migrate postgres  
17. rust tower middleware layer  
18. api error status code 422  
19. database transaction rollback rust  
20. github actions rust test postgres  
21. CORS configuration rust api  
22. jwt authentication rust api  
23. pagination list api rust  
24. docker compose postgres rust  
25. environment config .env rust  
26. beneficiary bitcoin address validation  
27. CRUD REST postgres typescript  
28. toast notification error success  
29. clippy rust ci workflow  
30. readme setup run docker  

---

## Search results summary

See **[GITHUB_SEARCH_RESULTS_AND_ANALYSIS.md](GITHUB_SEARCH_RESULTS_AND_ANALYSIS.md)** for:

- Counts and notable repos per query (executed subset of top 30)
- Borrowed aspects (RFC 7807 problem details)
- Deferred aspects (OpenAPI, rate limit, pagination, JWT)
- References to source repos
