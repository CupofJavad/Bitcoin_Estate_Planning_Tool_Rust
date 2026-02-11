# Deploy Legacy Vault (Estate_Planning_Rust) to Lunaverse

## 0. Phase 0: Requirements and architecture

- **Scope:** Server deploy, TLS, env-based config, checklist pass. No new features in Phase 0.
- **Architecture:** API (Rust/Axum), frontend (Next.js), PostgreSQL; Docker/VM; single region. Frontend can be static export served by nginx or Node.
- **Security (design):** TLS only in production; no secrets in repo; all config via env (DATABASE_URL, API_HOST/PORT, NEXT_PUBLIC_API_URL, SECURE_COOKIE); CORS and allowed hosts as per GTM; session cookie HttpOnly, Secure in prod.
- **Observability:** Health (`/health`) and version (`/version`); logging with request ID and audit events; no secrets or PII in logs.

### Phase 0: Work breakdown and risks (GTM 3.0.2)

- **Work breakdown:** (1) Server access and env setup, (2) Create Postgres DB, (3) Build and run API (Docker or binary), (4) Build and serve frontend (static export + nginx or Node), (5) TLS (Let’s Encrypt + nginx, §5), (6) Run checklists (§10), (7) Smoke test and document.
- **Risks:** Server or DNS unavailable; TLS/cert delay; migration failure on existing DB. **Mitigation:** Use staging first; document runbook (§6); keep DB backups; test restore.
- **Tracking:** Tag tasks with “Phase 0” in backlog; use [GTM_LIVE_CHECKLIST.md](GTM_LIVE_CHECKLIST.md) and [GTM_PROGRESS.md](GTM_PROGRESS.md) for sign-off.

## Prerequisites

- Lunaverse server (see [Server_Management_Lunaverse](../../../Server_Management_Lunaverse) in the same workspace or repo)
- Existing PostgreSQL on server (create DB `estate_planning_rust` or use existing from `.env`)
- Docker on server

## Env format (SSH and deploy)

Use your workspace `.env` with **no quotes after the `=` sign**. Example: `POSTGRES_PASSWORD=mypass` not `POSTGRES_PASSWORD="mypass"`.

**Required for deploy scripts:** `LUNAVERSE_HOST`, `LUNAVERSE_SSH_USER`, `LUNAVERSE_SSH_PORT` (default 22), `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.  
**Optional:** `LUNAVERSE_SSH_PASSWORD` (for `sshpass` when key-based SSH is not used), `POSTGRES_SUPERUSER`, `POSTGRES_SUPERUSER_PASSWORD` (for create-db step), `SECURE_COOKIE`, `RATE_LIMIT_MAX`.

Template: [deploy/env.lunaverse.example](../deploy/env.lunaverse.example). Copy into your main `.env` or source it; scripts read these variable names.

## 1. Create database (on server)

**Option A: One-command deploy (includes create-db)**  
From repo root, source your `.env` then run (creates DB if it does not exist):

```bash
source .env
CREATE_DB=1 ./Estate_Planning_Rust/scripts/deploy-to-lunaverse.sh
```

**Option B: Manual or script on server**

If using existing Postgres and your `.env` has `POSTGRES_*` (and optionally `POSTGRES_SUPERUSER` for CREATE DATABASE):

```bash
# SSH to server, then (or run scripts/create-db-on-server.sh with LEGACY_VAULT_ENV set):
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U ${POSTGRES_SUPERUSER:-postgres} -c "CREATE DATABASE estate_planning_rust;"
```

Or use pgAdmin / Cockpit. Credentials: your `.env` (`POSTGRES_*`, `LUNAVERSE_HOST`).

## 2. Build and run API container

**Option A: Automated (recommended)**  
From workspace root, with `.env` loaded (no quotes in .env). Make scripts executable once: `chmod +x Estate_Planning_Rust/scripts/deploy-to-lunaverse.sh Estate_Planning_Rust/scripts/run-on-server.sh Estate_Planning_Rust/scripts/create-db-on-server.sh`

```bash
source .env
./Estate_Planning_Rust/scripts/deploy-to-lunaverse.sh
```

This builds the image locally, saves it as a tarball, SCPs to the server, loads it, writes a server-side `.env` from your `POSTGRES_*` (and optional `SECURE_COOKIE`, `RATE_LIMIT_MAX`), and runs [scripts/run-on-server.sh](../scripts/run-on-server.sh). Use `CREATE_DB=1` to create the database first (uses `POSTGRES_SUPERUSER` / `POSTGRES_SUPERUSER_PASSWORD` if set). For key-based SSH, leave `LUNAVERSE_SSH_PASSWORD` unset; for password-based SSH, set it and ensure `sshpass` is installed.

**Option B: Build on server**

```bash
# Copy project to server (e.g. rsync or git clone)
cd /path/to/Estate_Planning_Rust
docker build -t estate-planning-rust:latest .
# Then on server, source env and run:
LEGACY_VAULT_ENV=/path/to/.env ./scripts/run-on-server.sh
```

**Option C: Build locally and load on server (manual)**

```bash
# Local
docker build -t estate-planning-rust:latest .
docker save estate-planning-rust:latest | gzip > estate-planning-rust.tar.gz
scp -P ${LUNAVERSE_SSH_PORT:-22} estate-planning-rust.tar.gz ${LUNAVERSE_SSH_USER}@${LUNAVERSE_HOST}:~
# On server
docker load < ~/estate-planning-rust.tar.gz
# Then run with scripts/run-on-server.sh (see Option B) or docker run below.
```

**Start/restart app on server from your Mac (no Docker on Mac)**  
To run Docker only on the server (e.g. you don’t want Docker on your MacBook), do one full deploy first, then start or restart the API on the server with:

```bash
source .env
./Estate_Planning_Rust/scripts/start-on-server.sh
```

This SSHs to the server and runs the API container there. Same `.env` as deploy; no local Docker required.

**Run container (manual)**  
On the server, with `DATABASE_URL` built from your `POSTGRES_*` (no secrets in repo):

```bash
docker run -d \
  --name estate-planning-rust \
  -p 8001:8000 \
  -e DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/estate_planning_rust" \
  -e API_HOST=0.0.0.0 \
  -e API_PORT=8000 \
  --restart unless-stopped \
  --memory=512m \
  --cpus=0.5 \
  --cap-drop=SETUID --cap-drop=SETGID \
  estate-planning-rust:latest
```

Migrations run automatically on startup. Health: `curl http://localhost:8001/health`. See [checklists/PHASE0_CHECKLIST_RUN.md](checklists/PHASE0_CHECKLIST_RUN.md) for hardening notes.

## 3. Frontend

- **Option A:** Build frontend locally: `cd frontend && npm run build`, then serve the `out` or `.next/static` (and export) on the server (e.g. nginx static, or Node server on port 3001).
- **Option B:** Add an nginx server block on Lunaverse for the estate app (e.g. `estate.thegeeksnextdoor.com` → proxy to API on 8001 and/or frontend on 3001). See Server_Management_Lunaverse `scripts/server/nginx-thegeeksnextdoor.conf` for pattern.

## 4. Document in Server_Management_Lunaverse

Add a row to [SERVER_APPS_AND_SERVICES_TABLE.md](../../../Server_Management_Lunaverse/docs/SERVER_APPS_AND_SERVICES_TABLE.md) (already added for port 8001):

| App / service | Description | Local URL | Public URL | Notes |
|---------------|-------------|-----------|------------|-------|
| Legacy Vault (Estate_Planning_Rust) | Rust API (estate plans, beneficiaries, timelock policies) | http://LUNAVERSE_HOST:8001 | — (Lab or LAN) | Uses existing Postgres DB `estate_planning_rust` |

Add port 8001 to the port summary and firewall if you expose it.

## 5. TLS / HTTPS (Phase 0 – production)

In production, the app must be served over HTTPS only. The API and frontend should sit behind a reverse proxy (e.g. nginx) that terminates TLS.

- **Certificate:** Use Let’s Encrypt (e.g. certbot) or your host’s TLS certificate. Store cert and key on the server; do not commit to the repo.
- **nginx (example):**
  - Terminate TLS on port 443.
  - Proxy `https://your-domain/` (or `/api`) to the API (e.g. `http://127.0.0.1:8001`) and/or to the frontend (e.g. `http://127.0.0.1:3001`).
  - Redirect HTTP (80) → HTTPS (301).
  - Add security headers (see GTM and [dev_checklists_kb/checklists/going_to_production_serverside.md](../../dev_checklists_kb/checklists/going_to_production_serverside.md)):
    - `Strict-Transport-Security: max-age=31536000; includeSubdomains`
    - `X-Frame-Options: DENY` or `SAMEORIGIN`
    - `X-Content-Type-Options: nosniff`
- **API:** Set `SECURE_COOKIE=true` (or equivalent) in production so the session cookie is sent with `Secure`. Do not set in local/dev over HTTP.
- **Check:** Run [SSLLabs](https://www.ssllabs.com/ssltest/) or equivalent after go-live; fix any critical issues.

Reference: [GTM_PLAN.md](GTM_PLAN.md) Phase 0, [awesome_security_checklist](../../dev_checklists_kb/checklists/awesome_security_checklist.md).

---

## 6. Business continuity and disaster recovery (BCDR)

- **RTO/RPO (documented):**
  - **Recovery Time Objective (RTO):** Target maximum downtime **4 hours** (restore app + DB and verify).
  - **Recovery Point Objective (RPO):** Maximum acceptable data loss **24 hours**; backups at least daily.
- **Backups:**
  - Automated Postgres backups (e.g. daily or before each deploy). Use `pg_dump` or your host’s backup tool.
  - Retention: 7–30 days; keep at least one known-good backup before major migrations.
  - Store backups off-server and encrypted if they contain sensitive data.
- **Runbook (restore and rollback):**
  1. **Restore DB:** On server, `psql -U postgres -d estate_planning_rust < /path/to/backup.sql` (or drop DB, create, then restore). Verify with a quick query.
  2. **Rollback app:** `docker stop estate-planning-rust && docker rm estate-planning-rust`; deploy previous image (e.g. `docker run ... estate-planning-rust:previous-tag`). If migration was applied, either restore DB from pre-migration backup or run a revert migration if available.
  3. **Smoke test:** `curl https://your-domain/health` and `curl https://your-domain/version`; verify frontend loads and login works.
  4. **Contact:** [Assign: system owner / host contact; document in Server_Management_Lunaverse or here.]
- **Owner:** [Assign: name or team]. Responsible for BCDR and runbook updates; review when data criticality or topology changes.
- **Backup/restore test:** Schedule at least once per release or quarterly. Last run: ___________; document date and result here or in Server_Management_Lunaverse.

Reference: [GTM_PLAN.md](GTM_PLAN.md) § 3.0.7, [GTM_PROGRESS.md](GTM_PROGRESS.md).

---

## 7. Rollback

```bash
docker stop estate-planning-rust
docker rm estate-planning-rust
# Redeploy previous image if needed
```

If a migration was applied, roll back the DB manually (e.g. `sqlx migrate revert`) or restore from backup (see § 6).

---

## 8. Customer support (GTM §8.3, §1.5.3)

- **Channel:** Email or in-app contact form. Document the active channel in the app (Contact page at `/contact` and footer) and here.
- **Support email (placeholder):** **Before launch,** replace `support@legacyvault.example` with the real address and update `frontend/app/contact/page.tsx` and any mailto links.
- **Expectations:** Response within **48–72 hours** for non-urgent requests; prioritise security and data-incident reports; escalate per runbook.
- **Privacy requests:** Access, correction, deletion, export — respond within applicable law (e.g. one month under GDPR); document in Privacy Policy.

---

## 9. Account deletion and data export (user rights)

- **Account deletion:** User can request account deletion via Account page (password required). Backend `POST /api/v1/me/delete` verifies password then **cascades**: deletes user’s beneficiaries (via their estate plans), timelock policies (via estate plans), estate plans, audit_events rows for that user, sessions, then the user row. No soft-delete; data is removed. Aligns with Privacy Policy (account data erased within 30 days of request; implementation is immediate).
- **Data export:** User can download their data as JSON via Account page. Backend `GET /api/v1/me/export` returns all of the current user’s estate plans with beneficiaries and timelock policies (and `exported_at` timestamp). Frontend offers “Export my data” and triggers a file download.

---

## 10. Checklists to run (Phase 0)

Before or after first production deploy, run the following from the shared knowledge base and fix or document gaps:

| Checklist | When | Path (from repo root) |
|------------|------|------------------------|
| going_to_production_serverside | Server and API deploy | `dev_checklists_kb/checklists/going_to_production_serverside.md` |
| going_to_production_spa | Frontend build and deploy | `dev_checklists_kb/checklists/going_to_production_spa.md` |
| docker_secure_deployment | If using Docker in production | `dev_checklists_kb/checklists/docker_secure_deployment.md` |
| awesome_security_checklist | TLS, headers, auth | `dev_checklists_kb/checklists/awesome_security_checklist.md` |

Full index: [docs/checklists/CHECKLISTS_INDEX.md](checklists/CHECKLISTS_INDEX.md). Document any gaps or exceptions in this doc or in GTM_PROGRESS. **Checklist run (Phase 0):** [checklists/PHASE0_CHECKLIST_RUN.md](checklists/PHASE0_CHECKLIST_RUN.md).

---

## 11. Smoke test (post-deploy)

After deploy, verify API and optionally frontend:

```bash
# From Estate_Planning_Rust dir; default BASE_URL=http://localhost:8000
./scripts/smoke.sh
# Against Lunaverse (replace with your host or use LUNAVERSE_HOST from .env):
./scripts/smoke.sh http://${LUNAVERSE_HOST}:8001
# Or HTTPS once TLS is in place:
./scripts/smoke.sh https://your-domain
```

Manual checks: open frontend in browser → login page loads; register or log in → estate plans list loads. Document result in Server_Management_Lunaverse or here.

### Troubleshooting deploy

- **Create-db fails (password authentication for user postgres):** On the server, the `postgres` user’s password must match what we send. In `.env` set `POSTGRES_SUPERUSER=postgres` and `POSTGRES_SUPERUSER_PASSWORD=<actual_postgres_password>`. If that password is the same as your SSH password, leave `POSTGRES_SUPERUSER_PASSWORD` empty and the deploy script will use `LUNAVERSE_SSH_PASSWORD`. If it still fails, create the DB manually on the server (see below).
- **Container starts but health check fails (connection reset / connection refused):** The app often exits because it can’t connect to the DB (missing DB or wrong credentials). On the server run: `docker logs estate-planning-rust` to see the error. If the database doesn’t exist, create it (see below), then `docker restart estate-planning-rust`.
- **Create database manually on server:** SSH to the server, then e.g. `PGPASSWORD=<postgres_password> psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE estate_planning_rust;"` (use your actual postgres password and DB name from `POSTGRES_DB` in `.env`).
