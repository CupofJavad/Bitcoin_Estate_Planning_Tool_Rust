# Version State & Next Steps

**Snapshot date:** 2026-02-07  
**State:** Local stack verified (API + frontend + Postgres). All integration tests pass.

---

## Current version / state

| Component        | Version / state |
|-----------------|------------------|
| **App version** | `0.1.0` (`/version` → `app_version`, `migration_version`) |
| **Migration**   | `2` (estate_plans, beneficiaries, timelock_policies; + monero_address, stacks_address on plans & beneficiaries) |
| **API**         | Axum on `:8000`; health, version, full CRUD; request logging + audit events; multi-network addresses (BTC, XMR, STX) |
| **Frontend**    | Next.js on `:3000`; estate plans list/create, beneficiaries, timelock policies; BTC/XMR/STX address fields and copy |
| **Database**    | Postgres 15 (Docker); `docker compose -f infra/docker-compose.yml up -d` |
| **Tests**       | 11 integration tests (health, version, auth register/login, wrong password 401, estate CRUD, 401 required, allocation exceeded, timelock CRUD, 404, patch_me + change_password, admin 403); skip when DB unavailable |
| **Logging**     | `logs/estate_planning_rust.log` + stdout; request IDs; audit events for create/update/delete |

**Verified:** `curl http://localhost:8000/health` → OK; `curl http://localhost:8000/version` → JSON; frontend shows estate plans (e.g. “Allocation Test Plan”, Active).

---

## How to run (saved flow)

```bash
# From repo root: Estate_Planning_Rust/
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
cargo run                                    # API :8000, migrations on startup
# In another terminal:
cd frontend && npm install && npm run dev   # Frontend :3000
```

Frontend expects `NEXT_PUBLIC_API_URL=http://localhost:8000` (see `frontend/env.example`).

---

## Next steps (recommended order)

1. ~~**Version control**~~ **Done:** Git inited and committed in `Estate_Planning_Rust`.

2. ~~**Lightweight UI polish**~~ **Done:**  
   - API client parses server error body (text or JSON) and throws with that message so toasts show e.g. “Beneficiary allocation total cannot exceed 100%”.  
   - Global toasts via `GlobalToasts` in root layout; all catch blocks show `error.message`.  
   - Loading states were already present on list/detail and forms.

3. ~~**CI / quality**~~ **Done:**  
   - `.github/workflows/ci.yml`: on push/PR to `main`, runs `cargo fmt --check`, `cargo clippy`, and `cargo test` with a Postgres service so integration tests run.

4. **Run on server (Phase 0)**  
   - On the target server: clone/copy repo, set `.env` (e.g. `DATABASE_URL` for server Postgres), run same flow (docker for Postgres if needed, then `cargo run` and frontend).  
   - See [docs/DEPLOY.md](DEPLOY.md) for Lunaverse/deploy, **TLS/HTTPS** (§5), and **BCDR** (§6). Set `SECURE_COOKIE=true` in production.

5. **Checklists**  
   - Use [docs/checklists/CHECKLISTS_INDEX.md](checklists/CHECKLISTS_INDEX.md) and [DEVELOPER_CHECKLISTS_UNIVERSAL](../../Estate_Management/docs/checklists/DEVELOPER_CHECKLISTS_UNIVERSAL.md) for design/build/test/deploy sign-off. Track progress in [docs/GTM_PROGRESS.md](GTM_PROGRESS.md).

6. **Product readiness (GTM phases)**  
   - Auth (Phase A) and Account (Phase C) are in place: register, login, logout, session cookie, rate limiting, Secure cookie, scoped plans/beneficiaries/timelock, admin route; PATCH /me, POST /me/password, Account page, ToS/Privacy/Data/Contact pages and footer. **User rights:** Account deletion (POST /me/delete, cascade documented in DEPLOY §9) and data export (GET /me/export) with Account page UI. Phase D: admin users list/edit, audit view (GET /admin/audit, filters, export).  
   - **Stream B (branding):** Logo concept (docs/LOGO_CONCEPT.md, docs/brand/logo-concept.svg), favicon/OG, GTM consistency, README/copy — complete. **Stream C (legal):** ToS, Privacy, /data, /contact, footer disclaimer, DEPLOY §8 — complete. Main agent reviewed; no issues.  
   - Full GTM plan: [docs/GTM_PLAN.md](GTM_PLAN.md). **Next sequential:** Run DEPLOY §10 checklists → deploy + TLS (§5) → smoke → tag (e.g. v0.2.0-phase0). Progress: [docs/GTM_PROGRESS.md](GTM_PROGRESS.md), [docs/GTM_LIVE_CHECKLIST.md](GTM_LIVE_CHECKLIST.md).

---

## Phase 0 sequential steps (when deploying)

1. ~~**Run checklists**~~ **Done** — [checklists/PHASE0_CHECKLIST_RUN.md](checklists/PHASE0_CHECKLIST_RUN.md); gaps documented. DEPLOY §2 updated (Docker resource limits, cap-drop note).
2. **Deploy** — Server env (DB, API, frontend URL); build/run API and frontend; **TLS** (DEPLOY §5, e.g. Let’s Encrypt + nginx); secrets in env, not in repo.
3. **Smoke** — `./scripts/smoke.sh https://your-domain` (DEPLOY §11); then verify frontend loads and login works. Document result.
4. **Tag** — After committing: `git tag v0.2.0-phase0 -m "Phase 0 prep; see docs/RELEASE_v0.2.0-phase0.md"`. Release notes: [docs/RELEASE_v0.2.0-phase0.md](RELEASE_v0.2.0-phase0.md).
5. **BCDR** — Assign runbook owner in DEPLOY §6; schedule backup/restore test (at least once per release or quarterly).

---

## Fix applied in this state

- **NUMERIC vs f64:** Postgres `allocation_percentage` is NUMERIC; Rust used f64. All beneficiary SELECTs and allocation-sum queries now use `::float8` in SQL so decoding matches. Integration test `beneficiaries_allocation_exceeded` passes.
