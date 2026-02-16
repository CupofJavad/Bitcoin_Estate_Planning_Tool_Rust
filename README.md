# Legacy Vault

[Demo Version Available Here](https://thegeeksnextdoor.com/portfolio/legacy-vault.html)

**Secure your crypto for those who come next.**

Multi-chain estate planning for Bitcoin (BTC), Monero (XMR), and Stacks (STX): estate plans, beneficiaries, and timelock policies. Rust-backed API + Next.js frontend; auth, roles, and admin in place for GTM.

## Stack

- **Backend:** Rust, Axum, SQLx, PostgreSQL
- **Frontend:** Next.js (in `frontend/`), points to Rust API via `NEXT_PUBLIC_API_URL`

## Local development

### Option A: App manager script (recommended)

Use the menu script to start, check status, or stop the app. It checks Docker, Postgres, API, and frontend and only starts what’s not running.

```bash
./scripts/app-manager.sh
```

- **Start app** — Ensures Docker is running, starts Postgres if needed, then API and frontend (only what’s missing).
- **Status** — Shows what’s running (Docker, Postgres, API, frontend) and URLs.
- **Stop app** — Stops API and frontend; Postgres is left running by default (configurable).

Non-interactive (e.g. for startup): `./scripts/app-manager.sh start` | `status` | `stop` | `restart`.

**Run at login (macOS):** System Settings → General → Login Items → add a new item and choose **Terminal** (or iTerm), then in Terminal preferences set “Shells open with” to run a command, e.g. `bash /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/scripts/app-manager.sh`. Or add the script to a small launcher that runs it in a new Terminal window.

Config (edit the top of `scripts/app-manager.sh` or use env): `LEGACY_VAULT_API_PORT`, `LEGACY_VAULT_FRONTEND_PORT`, `LEGACY_VAULT_STOP_POSTGRES=1` to stop Postgres when stopping the app.

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
   Frontend: http://localhost:3000. Set `NEXT_PUBLIC_API_URL=http://localhost:8000` (see `frontend/.env.local` or `frontend/env.example`).

**Default admin account (full privileges)**  
On first API startup a default admin user is created if missing. Log in with:
- **Email:** `admin@localhost`
- **Password:** `admin`  

Change the password after first login (Account page). This user has the `admin` role (user management, audit).

## API (MVP)

- `GET /health`
- `GET/POST /api/v1/estate-plans`, `GET/PATCH/DELETE /api/v1/estate-plans/:id`
- `GET/POST /api/v1/beneficiaries?estate_plan_id=`, `GET/PATCH/DELETE /api/v1/beneficiaries/:id`
- `GET/POST /api/v1/timelock-policies?estate_plan_id=`, `GET/PATCH/DELETE /api/v1/timelock-policies/:id`

Beneficiary allocation sum per plan must be ≤ 100%.

## Deploy (Lunaverse)

See [docs/DEPLOY.md](docs/DEPLOY.md). Summary: build Docker image for API, use existing Postgres on server, run migrations, expose port (e.g. 8001), optionally nginx for frontend.

## Docs

- [docs/VERSION_STATE_AND_NEXT_STEPS.md](docs/VERSION_STATE_AND_NEXT_STEPS.md) – current version snapshot and recommended next steps
- [docs/CRITICAL_INFO_FROM_VERSIONS.md](docs/CRITICAL_INFO_FROM_VERSIONS.md) – domain and API from existing versions
- [docs/checklists/CHECKLISTS_INDEX.md](docs/checklists/CHECKLISTS_INDEX.md) – links to shared checklists (post-MVP)
