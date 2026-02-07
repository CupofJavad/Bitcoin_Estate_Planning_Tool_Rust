# Deploy Estate Planning Rust to Lunaverse

## Prerequisites

- Lunaverse server (see [Server_Management_Lunaverse](../../../Server_Management_Lunaverse) in the same workspace or repo)
- Existing PostgreSQL on server (create DB `estate_planning_rust` or use existing from `.env`)
- Docker on server

## 1. Create database (on server)

If using existing Postgres:

```bash
# SSH to server, then:
psql -U postgres -c "CREATE DATABASE estate_planning_rust;"
```

Or use pgAdmin / Cockpit. Credentials and host: see Server_Management_Lunaverse `.env` (e.g. `POSTGRES_*`, `LUNAVERSE_HOST`).

## 2. Build and run API container

From your Mac (or CI), build the image and push to a registry, or build on the server.

**Option A: Build on server**

```bash
# Copy project to server (e.g. rsync or git clone)
cd /path/to/Estate_Planning_Rust
docker build -t estate-planning-rust:latest .
```

**Option B: Build locally and load on server**

```bash
# Local
docker build -t estate-planning-rust:latest .
docker save estate-planning-rust:latest | gzip > estate-planning-rust.tar.gz
scp estate-planning-rust.tar.gz LUNAVERSE_SSH_USER@LUNAVERSE_HOST:~
# On server
docker load < ~/estate-planning-rust.tar.gz
```

**Run container**

On the server, run with `DATABASE_URL` pointing to existing Postgres (no secrets in repo; set on server):

```bash
docker run -d \
  --name estate-planning-rust \
  -p 8001:8000 \
  -e DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/estate_planning_rust" \
  -e API_HOST=0.0.0.0 \
  -e API_PORT=8000 \
  --restart unless-stopped \
  estate-planning-rust:latest
```

Migrations run automatically on startup. Health: `curl http://localhost:8001/health`.

## 3. Frontend

- **Option A:** Build frontend locally: `cd frontend && npm run build`, then serve the `out` or `.next/static` (and export) on the server (e.g. nginx static, or Node server on port 3001).
- **Option B:** Add an nginx server block on Lunaverse for the estate app (e.g. `estate.thegeeksnextdoor.com` → proxy to API on 8001 and/or frontend on 3001). See Server_Management_Lunaverse `scripts/server/nginx-thegeeksnextdoor.conf` for pattern.

## 4. Document in Server_Management_Lunaverse

Add a row to [SERVER_APPS_AND_SERVICES_TABLE.md](../../../Server_Management_Lunaverse/docs/SERVER_APPS_AND_SERVICES_TABLE.md) (already added for port 8001):

| App / service | Description | Local URL | Public URL | Notes |
|---------------|-------------|-----------|------------|-------|
| Estate Planning Rust | Rust API (estate plans, beneficiaries, timelock policies) | http://LUNAVERSE_HOST:8001 | — (Lab or LAN) | Uses existing Postgres DB `estate_planning_rust` |

Add port 8001 to the port summary and firewall if you expose it.

## Rollback

```bash
docker stop estate-planning-rust
docker rm estate-planning-rust
# Redeploy previous image if needed
```

If a migration was applied, roll back the DB manually (e.g. `sqlx migrate revert`) or restore from backup.
