# Estate Planning Rust (MVP)

Rust-backed API for Bitcoin estate planning: estate plans, beneficiaries, timelock policies. No auth in MVP.

## Stack

- **Backend:** Rust, Axum, SQLx, PostgreSQL
- **Frontend:** Next.js (in `frontend/`), points to Rust API via `NEXT_PUBLIC_API_URL`

## Local development

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
