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
| **Tests**       | 6 integration tests (health, version, estate CRUD, allocation exceeded, timelock CRUD, 404); skip cleanly when DB unavailable |
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

4. **Run on server**  
   - On the target server: clone/copy repo, set `.env` (e.g. `DATABASE_URL` for server Postgres), run same flow (docker for Postgres if needed, then `cargo run` and frontend).  
   - See [docs/DEPLOY.md](DEPLOY.md) for Lunaverse/deploy notes.

5. **Checklists**  
   - Use [docs/checklists/CHECKLISTS_INDEX.md](checklists/CHECKLISTS_INDEX.md) and [DEVELOPER_CHECKLISTS_UNIVERSAL](../../Estate_Management/docs/checklists/DEVELOPER_CHECKLISTS_UNIVERSAL.md) for design/build/test/deploy sign-off before production.

6. **Product readiness (login, roles, admin, wallet, account)**  
   - Not in scope for the current MVP. Full GTM build plan (branding, phases, checklists): [docs/GTM_PLAN.md](GTM_PLAN.md). Phase overview: [docs/PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md).

---

## Fix applied in this state

- **NUMERIC vs f64:** Postgres `allocation_percentage` is NUMERIC; Rust used f64. All beneficiary SELECTs and allocation-sum queries now use `::float8` in SQL so decoding matches. Integration test `beneficiaries_allocation_exceeded` passes.
