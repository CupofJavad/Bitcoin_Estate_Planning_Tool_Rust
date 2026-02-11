# GTM Progress Checklist

Track completion of [GTM_PLAN.md](GTM_PLAN.md) phases. Update this file as items are completed.

**Last updated:** 2026-02-07 (Phase 0 design/BCDR in DEPLOY; Phase D audit; Stream B/C complete and reviewed)

---

## Phase 0: Harden & Deploy (Pre–GTM)

### 3.0.1 Design checklist (Phase 0)

- [x] Requirements: Phase 0 scope = server deploy + TLS + env + checklist pass; no new features.
- [x] Architecture: API (Rust/Axum), frontend (Next.js), Postgres; Docker/VM; single region — confirmed (DEPLOY §0).
- [x] Security – design: TLS only in production; no secrets in repo; env-based config; CORS and allowed hosts documented.
- [x] Observability: Health (`/health`) and version (`/version`) exist; logging (request ID, audit events); no secrets/PII in logs.

### 3.0.2 Plan checklist (Phase 0)

- [x] Work breakdown: Server access, Postgres, build/run API, build/serve frontend, TLS, run checklists. — Documented in DEPLOY §0.
- [x] Risks: Server unavailable, DNS/TLS delay; mitigation: runbook, staging first. — DEPLOY §0.
- [x] Tracking: Tasks in backlog with "Phase 0" tag; GTM_LIVE_CHECKLIST and this file for sign-off.

### 3.0.3 Build checklist (Phase 0)

- [x] Config via env (DATABASE_URL, API_HOST/PORT, NEXT_PUBLIC_API_URL); no hardcoded secrets.
- [x] Dockerfile present and tested; migrations on startup; health check if applicable.
- [x] Frontend build: `npm run build`; production API URL from env.
- [x] Branch protection: default branch protected; PR + CI required.

### 3.0.4 Test checklist (Phase 0)

- [x] CI: `cargo fmt`, `cargo clippy`, `cargo test` (with Postgres) on every PR.
- [ ] Smoke: After deploy, GET /health and GET /version; frontend loads and lists estate plans.
- [x] No regression: Existing integration tests pass.
- [ ] E2E: Run scripted suite and/or MCP per [E2E_TEST_REPORT.md](E2E_TEST_REPORT.md) §5.

### 3.0.5 Deploy checklist (Phase 0)

- [ ] Version/tag: Release tagged (e.g. v0.2.0-phase0); release notes mention Phase 0.
- [ ] Pre-deploy: Staging smoke test; rollback plan documented.
- [ ] Secrets: Production secrets in secure store; not in repo.
- [ ] TLS: HTTPS only; HSTS and HTTP→HTTPS redirect (see [DEPLOY.md](DEPLOY.md)).
- [ ] Post-deploy: Smoke test production; document in DEPLOY and Server_Management_Lunaverse.
- [x] Run checklists: going_to_production_serverside, going_to_production_spa, docker_secure_deployment (see [checklists/CHECKLISTS_INDEX.md](checklists/CHECKLISTS_INDEX.md)). — Run completed; results and gaps in [checklists/PHASE0_CHECKLIST_RUN.md](checklists/PHASE0_CHECKLIST_RUN.md).

### 3.0.6 Definition of done (Phase 0)

- [ ] API and frontend run on target server; TLS in front; env-based config; CI green; checklists run and gaps documented or fixed; VERSION_STATE_AND_NEXT_STEPS updated.

### 3.0.7 BCDR (Business continuity and disaster recovery)

- [x] RTO/RPO defined and documented in [DEPLOY.md](DEPLOY.md) (RTO 4h, RPO 24h).
- [ ] Automated DB backups (daily or per deployment); retention (e.g. 7–30 days); test restore at least once per release or quarterly.
- [x] Runbook: Restore from backup; redeploy previous version; who to contact. Linked in DEPLOY §6.
- [ ] BCDR owner assigned; plan reviewed when architecture or data criticality changes.

---

## Phase A: Authentication & Identity

### 3.A.1 Design

- [x] Auth mechanism: Session-based (cookie + server-side sessions in Postgres); HttpOnly, SameSite.
- [x] Registration: Email + password; password length ≥ 8; email verification optional.
- [x] Login / logout: Login returns session cookie; logout invalidates session.
- [x] Current user: All protected routes resolve user from session; user_id in estate_plans and scoping.
- [x] Sensitive data: Passwords hashed (Argon2); no passwords/tokens in logs.
- [x] API surface: POST /auth/register, POST /auth/login, POST /auth/logout, GET /api/v1/me; plan/beneficiary/timelock scoped by user.

### 3.A.2 Schema (migrations)

- [x] users: id, email, password_hash, name, email_verified_at, role, created_at, updated_at.
- [x] sessions: id (UUID), user_id, expires_at, created_at.
- [x] estate_plans: user_id FK to users; backfill to system user.
- [x] Indexes: users(email), sessions(user_id), sessions(expires_at).

### 3.A.3 Backend (Rust)

- [x] Password hashing: Argon2; hash on register; verify on login.
- [x] Session: Middleware extracts user from cookie; 401 when missing/invalid.
- [x] Routes: Register, login, logout, GET /api/v1/me; all /api/v1/* protected except health/version.
- [x] Scoping: All plan/beneficiary/timelock operations scoped by current user.
- [x] Validation: Email non-empty; password length ≥ 8.
- [x] Rate limiting: Per-IP limit on POST /auth/login and POST /auth/register (see GTM 3.A.3).
- [x] Secure cookie: Set in production when SECURE_COOKIE=true (or equivalent).
- [x] Errors: RFC 7807 problem details for 401/403 and validation errors.

### 3.A.4 Frontend

- [x] Login page: Form; submit to /auth/login; redirect on success; session cookie (automatic).
- [x] Register page: Form; submit to /auth/register; redirect or auto-login.
- [x] Logout: Button/link calls /auth/logout and redirects to login.
- [x] Auth context: Current user from /api/v1/me; loading state; nav shows Log out / Account when logged in.
- [x] Protected routes: Redirect unauthenticated to login (AuthGate).
- [x] API client: Sends credentials (cookies); handles 401 (redirect to login).
- [x] Branding: Legacy Vault name, slogan, theme on login/register.

### 3.A.5 Tests

- [ ] Integration: Register → 201; login → 200 and session; wrong password → 401; GET /api/v1/estate-plans without auth → 401; with auth → 200 and only that user's plans.
- [x] Scoping: Create plan as user A; list as user B → plan not visible; get by ID as B → 404/403.
- [x] Security: No password or token in response body or logs.

### 3.A.6 Definition of done (Phase A)

- [x] Users can register and log in; logout works; all plan/beneficiary APIs require auth and are scoped; frontend has login/register and protected routes.
- [ ] Integration tests for auth flows (register, login, 401) added/updated.
- [ ] Security checklist items addressed; PRODUCT_ROADMAP and VERSION_STATE_AND_NEXT_STEPS updated.

---

## Phase B: User Types & Roles

- [x] Roles in DB (owner, executor, admin); admin route GET /api/v1/admin/users.
- [ ] Per-plan collaborators (optional): estate_plan_collaborators table and API.
- [ ] Frontend: Admin link only for admin; read-only view for beneficiaries/executors if applicable.

---

## Phase C: User Configuration & Account

- [x] Profile: GET/PATCH /api/v1/me; display and edit name, email.
- [x] Change password: POST /api/v1/me/password.
- [x] Account/Profile page in frontend (name, email, change password).
- [x] Account deletion: POST /api/v1/me/delete (password); cascade documented in DEPLOY §9; Account page delete with confirm.
- [x] Data export: GET /api/v1/me/export; Account page "Export my data" JSON download.
- [ ] Optional: preferences, 2FA (TOTP).

---

## Phase D: Admin

- [x] Admin route: GET /api/v1/admin/users (admin only).
- [x] Admin area in frontend: Users list, user edit (role, disable).
- [x] Audit view: List audit events; filter by date, user, action; export JSON. Backend: audit_events table (migration 005), GET /api/v1/admin/audit; frontend /admin/audit.
- [ ] Optional: system config (feature flags, maintenance mode).

---

## Branding (Part 1)

- [x] Name: Legacy Vault.
- [x] Slogan: "Secure your crypto for those who come next."
- [x] Theme: Colors (slate-900, sky-500, etc.) in login and layout.
- [x] Meta: title and description in layout.
- [ ] Logo/favicon: Symbol and favicon set (16×16, 32×32, 180×180).
- [x] Legal placeholders: ToS and Privacy Policy placeholder pages; footer links. Replace with full legal text before launch.

---

## Next recommended actions

1. **Complete Phase 0:** Deploy to server with TLS (see DEPLOY.md); run production/SPA/Docker checklists; document BCDR and runbook; tag release.
2. **Phase A tests:** Add or extend integration tests for register, login, 401 for unauthenticated plan list.
3. ~~**Phase C (account)**~~ **Done:** Account page with profile (name, email) and change password; PATCH /me, POST /me/password; footer with ToS and Privacy placeholders.
4. **Branding:** Add favicon set; replace ToS/Privacy placeholder content with full legal text before launch.
