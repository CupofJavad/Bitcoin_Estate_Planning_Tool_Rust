# Legacy Vault

**Secure your crypto for those who come next.**

Legacy Vault is a full-stack web application for **multi-chain digital estate planning**. It lets users create estate plans, assign beneficiaries with allocation percentages, and attach timelock policies for Bitcoin (BTC), Monero (XMR), and Stacks (STX). The app is designed for documentation and planning—not as legal or fiduciary advice.

---

## Table of contents

- [Project objectives](#project-objectives)
- [Features](#features)
- [Project design](#project-design)
- [Tech stack and tools](#tech-stack-and-tools)
- [Local development](#local-development)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Testing](#testing)
- [Documentation](#documentation)
- [Live site and links](#live-site-and-links)
- [License and disclaimer](#license-and-disclaimer)

---

## Project objectives

- **Document and plan** how crypto and related instructions should be handled for heirs and beneficiaries, across multiple chains (BTC, XMR, STX).
- **Store** estate plans, beneficiary allocations (up to 100% per plan), and timelock policy metadata in a secure, user-scoped way.
- **Support multi-user use** with authentication (register, login, logout), session-based access, and role-based access (owner, executor, admin).
- **Provide** an admin area for user management and audit logging, and an account area for profile, password change, data export, and account deletion.
- **Deploy** as a production-ready service with env-based config, TLS, and checklists for security and operations.

The product does **not** hold private keys, sign transactions, or execute timelocks on-chain; it is a planning and documentation tool.

---

## Features

| Area | Capabilities |
|------|----------------|
| **Auth** | Register (email, password 8+ chars, optional name), login, logout. Session cookie (HttpOnly, Secure in prod). Rate-limited auth endpoints. |
| **Estate plans** | Create, list, view, edit, delete. Each plan has name, description, optional BTC/XMR/STX addresses, and active flag. Scoped to the current user. |
| **Beneficiaries** | Add, edit, delete per plan. Name, optional email, allocation %, optional chain addresses. Total allocation per plan must be ≤ 100%. |
| **Timelock policies** | Add, edit, delete per plan. Name, description, timelock_blocks, trigger_condition, is_active. Metadata only (no on-chain execution). |
| **Account** | Profile (name, email), change password, export data (JSON), delete account (with confirmation and cascade). |
| **Admin** | List users, edit user (role, is_active). Audit log (list, filter, export). Admin-only routes; non-admin receive 403. |
| **Static / legal** | Terms of Service, Privacy Policy, Data & security, Contact pages; footer disclaimer. |

---

## Project design

### Architecture

- **Backend:** Rust (Axum) API. Stateless HTTP; session ID in cookie; all mutable state in PostgreSQL.
- **Frontend:** Next.js (App Router), React, TypeScript. Calls API with `credentials: 'include'`; handles 401 by redirecting to login.
- **Database:** PostgreSQL. Migrations run on API startup. Tables: users, sessions, estate_plans, beneficiaries, timelock_policies, audit_events.
- **Security:** Passwords hashed with Argon2. Session cookie HttpOnly, SameSite=Lax, Secure in production. CORS allows a specific frontend origin and credentials. No secrets in repo; config via env.

### Data model (high level)

- **Users** — id, email, password_hash, name, role (owner/executor/admin), is_active, timestamps.
- **Sessions** — id (UUID), user_id, expires_at; used for auth.
- **Estate plans** — user_id, name, description, optional bitcoin_address, monero_address, stacks_address, is_active.
- **Beneficiaries** — estate_plan_id, name, optional email, allocation_pct, optional chain addresses.
- **Timelock policies** — estate_plan_id, name, description, timelock_blocks, trigger_condition, is_active.
- **Audit events** — user_id, action, entity_type, entity_id, details, created_at.

All API reads/writes for plans, beneficiaries, and timelock policies are scoped by the plan owner’s `user_id` (cross-user isolation).

### User flows

1. **Auth** — Register or login → session set → redirect to home.
2. **Estate plans** — Home lists plans; create/edit/delete via modal or detail page.
3. **Beneficiaries** — From a plan’s detail page, add/edit/delete beneficiaries; allocation sum enforced.
4. **Timelock policies** — From the same detail page, add/edit/delete policies.
5. **Account** — Profile, change password, export data, delete account (with confirmation).
6. **Admin** — List users, edit role/active; view and export audit log.

See [docs/WORKFLOWS.md](docs/WORKFLOWS.md) for step-by-step flows and [docs/E2E_TEST_PLAN.md](docs/E2E_TEST_PLAN.md) for test scenarios.

---

## Tech stack and tools

### Backend

| Tool | Purpose |
|------|--------|
| **Rust** | Language for the API. |
| **Axum** | HTTP server and routing. |
| **SQLx** | Async PostgreSQL driver; compile-time checked queries. |
| **Argon2** | Password hashing (register, login, change password). |
| **tower_http** | CORS layer. |
| **serde / serde_json** | JSON (de)serialization. |
| **uuid** | Session IDs. |
| **chrono** | Timestamps and session expiry. |

### Frontend

| Tool | Purpose |
|------|--------|
| **Next.js 15** | React framework, App Router, server/client components. |
| **React 18** | UI components and hooks. |
| **TypeScript** | Typed JavaScript. |
| **Tailwind CSS** | Styling (slate/sky palette per GTM branding). |
| **Zustand** | Optional client state if needed. |
| **React Hook Form + Zod** | Form handling and validation. |
| **Recharts** | Optional charts (e.g. allocation). |
| **Lucide React** | Icons. |

### Infrastructure and dev

| Tool | Purpose |
|------|--------|
| **PostgreSQL 15** | Database (Docker or local). |
| **Docker Compose** | Local Postgres via `infra/docker-compose.yml`. |
| **Playwright** | E2E tests (`frontend/tests/e2e/auth.spec.ts`). |
| **GitHub Actions** | CI: `cargo fmt`, `cargo clippy`, `cargo test` (with Postgres). |

### Configuration

- **API:** `.env` (or env vars): `DATABASE_URL`, `API_HOST`, `API_PORT`, `SESSION_COOKIE_NAME`, `SECURE_COOKIE`, `RATE_LIMIT_MAX`, etc. See `.env.example` and [docs/DEPLOY.md](docs/DEPLOY.md).
- **Frontend:** `frontend/.env.local`: `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000`). See `frontend/env.example`.

---

## Local development

### Option A: App manager script (recommended)

One script to start, check status, or stop the app. It ensures Docker is up, starts Postgres if needed, then the API and frontend (only what’s not already running).

```bash
./scripts/app-manager.sh
```

- **Start app** — Starts Postgres (if needed), API, and frontend.
- **Status** — Shows what’s running and URLs.
- **Stop app** — Stops API and frontend; Postgres left running by default.

Non-interactive: `./scripts/app-manager.sh start | status | stop | restart`.

Optional config (top of script or env): `LEGACY_VAULT_API_PORT`, `LEGACY_VAULT_FRONTEND_PORT`, `LEGACY_VAULT_STOP_POSTGRES=1`.

### Option B: Manual steps

1. **Start Postgres**
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

2. **Configure env**
   ```bash
   cp .env.example .env
   # Edit .env if needed (default: postgres://postgres:postgres@localhost:5432/estate_planning_rust, API_PORT=8000)
   ```

3. **Run API**
   ```bash
   cargo run
   ```
   API: http://localhost:8000. Health: http://localhost:8000/health. Migrations run on startup.

4. **Run frontend**
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Frontend: http://localhost:3000. Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` (see `frontend/env.example`).

### Default admin account

On first API startup a default admin user is created if missing:

- **Email:** `admin@localhost`
- **Password:** `admin`

Change the password after first login (Account page). This user has the `admin` role (user management, audit).

---

## API overview

### Health and version

- `GET /health` — Returns `OK` (liveness).
- `GET /version` — Returns JSON: `app_version`, `migration_version`.

### Auth (public)

- `POST /auth/register` — Body: `{ email, password, name? }`. Creates user, no session (frontend may then login).
- `POST /auth/login` — Body: `{ email, password }`. Sets session cookie and returns user JSON.
- `POST /auth/logout` — Clears session (cookie).

### Current user (authenticated)

- `GET /api/v1/me` — Returns current user or 401.
- `PATCH /api/v1/me` — Update name/email.
- `POST /api/v1/me/password` — Change password (body: current_password, new_password).
- `GET /api/v1/me/export` — Export user’s data (estate plans, beneficiaries, timelock policies) as JSON.
- `POST /api/v1/me/delete` — Delete account (body: password, confirm text); cascade deletes then redirect to login.

### Estate plans (authenticated, scoped by user)

- `GET /api/v1/estate-plans` — List current user’s plans.
- `POST /api/v1/estate-plans` — Create plan.
- `GET /api/v1/estate-plans/:id` — Get one (owner only).
- `PATCH /api/v1/estate-plans/:id` — Update (owner only).
- `DELETE /api/v1/estate-plans/:id` — Delete (owner only); cascade to beneficiaries and timelock policies.

### Beneficiaries (authenticated, plan must belong to user)

- `GET /api/v1/beneficiaries?estate_plan_id=` — List for plan.
- `POST /api/v1/beneficiaries` — Create (allocation sum for plan must remain ≤ 100%).
- `GET /api/v1/beneficiaries/:id` — Get one.
- `PATCH /api/v1/beneficiaries/:id` — Update.
- `DELETE /api/v1/beneficiaries/:id` — Delete.

### Timelock policies (authenticated, plan must belong to user)

- `GET /api/v1/timelock-policies?estate_plan_id=` — List for plan.
- `POST /api/v1/timelock-policies` — Create.
- `GET /api/v1/timelock-policies/:id` — Get one.
- `PATCH /api/v1/timelock-policies/:id` — Update.
- `DELETE /api/v1/timelock-policies/:id` — Delete.

### Admin (admin role only)

- `GET /api/v1/admin/users` — List all users.
- `PATCH /api/v1/admin/users/:id` — Update role / is_active.
- `GET /api/v1/admin/audit` — List audit events (optional query: from, to, action, entity_type, limit).

All protected routes require a valid session cookie. Unauthenticated requests receive 401. Admin routes return 403 for non-admin users.

---

## Deployment

Deploy the API as a Docker container (or binary) and the frontend as a static export or Node server. Use existing PostgreSQL on the target server.

- **Full steps:** [docs/DEPLOY.md](docs/DEPLOY.md) (env, database, build, run, TLS, BCDR).
- **One-command deploy (from workspace root):** `source .env && CREATE_DB=1 ./Estate_Planning_Rust/scripts/deploy-to-lunaverse.sh`
- **Start/restart on server (no local Docker):** `./Estate_Planning_Rust/scripts/start-on-server.sh`

Required env (see [deploy/env.lunaverse.example](deploy/env.lunaverse.example)): `LUNAVERSE_HOST`, `LUNAVERSE_SSH_USER`, `POSTGRES_*`, etc. Set `SECURE_COOKIE=true` in production.

---

## Testing

- **Integration tests (Rust):** `cargo test` from repo root. Requires Postgres (e.g. `docker compose -f infra/docker-compose.yml up -d`). See [tests/api_integration.rs](tests/api_integration.rs).
- **E2E (Playwright):** From `frontend/`, run `npm run e2e`. Requires API and frontend running; see [docs/AGENT_PROMPT_E2E_FIX_LOOP.md](docs/AGENT_PROMPT_E2E_FIX_LOOP.md) and [docs/E2E_TEST_PLAN.md](docs/E2E_TEST_PLAN.md).
- **Smoke (post-deploy):** `./scripts/smoke.sh [BASE_URL]` for health and version checks.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/VERSION_STATE_AND_NEXT_STEPS.md](docs/VERSION_STATE_AND_NEXT_STEPS.md) | Current version, migration state, recommended next steps. |
| [docs/WORKFLOWS.md](docs/WORKFLOWS.md) | End-to-end user and admin workflows. |
| [docs/E2E_TEST_PLAN.md](docs/E2E_TEST_PLAN.md) | E2E scenarios, expected outcomes, root-cause checklist. |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Deployment, TLS, env, BCDR, runbook. |
| [docs/GTM_PLAN.md](docs/GTM_PLAN.md) | Go-to-market: branding, compliance, phases. |
| [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) | Phases from MVP to finished product. |
| [docs/LIVE_SITE_AND_PORTFOLIO.md](docs/LIVE_SITE_AND_PORTFOLIO.md) | Live site URLs, deploy steps, checklist (thegeeksnextdoor.com). |
| [docs/checklists/CHECKLISTS_INDEX.md](docs/checklists/CHECKLISTS_INDEX.md) | Links to security and production checklists. |
| [docs/CRITICAL_INFO_FROM_VERSIONS.md](docs/CRITICAL_INFO_FROM_VERSIONS.md) | Domain and API notes from existing versions. |

---

## Live site and links

- **Project page:** [thegeeksnextdoor.com/portfolio/legacy-vault.html](https://thegeeksnextdoor.com/portfolio/legacy-vault.html)
- **Try the app (Lab):** [thegeeksnextdoor.com/lab](https://thegeeksnextdoor.com/lab) — then use the Legacy Vault / Bitcoin Estate link.
- **Repository:** [github.com/CupofJavad/Bitcoin_Estate_Planning_Tool_Rust](https://github.com/CupofJavad/Bitcoin_Estate_Planning_Tool_Rust)

See [docs/LIVE_SITE_AND_PORTFOLIO.md](docs/LIVE_SITE_AND_PORTFOLIO.md) for deploy and verification steps.

---

## License and disclaimer

Legacy Vault is a **digital estate planning tool** for documentation and planning only. It is **not** legal, tax, or fiduciary advice. Users are responsible for their own key management, legal compliance, and beneficiary arrangements. See in-app Terms of Service and Privacy Policy for full disclaimers.
