# E2E Verification Runbook

Any agent or developer can use this runbook to verify Legacy Vault E2E (auth and key flows) in a few minutes.

## Prerequisites

- **PostgreSQL** running (Docker or local).
- **API:** `cd Estate_Planning_Rust && cargo run` → listening on http://localhost:8000 (admin user seeded).
- **Frontend:** `cd Estate_Planning_Rust/frontend && npm run dev` → http://localhost:3000.
- **Env:** `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

Optionally start all services with the app-manager script from workspace root: `scripts/app-manager.sh`.

## Order of execution

1. **Run scripted E2E** (from `Estate_Planning_Rust/frontend`):
   ```bash
   npm run e2e
   ```
   This runs Playwright tests for Auth 1.1–1.5 (and 1.2/1.4 happy path). Requires API and frontend to be up.

2. **Optional — MCP scenarios:** If Cursor’s Playwright MCP is available and the snapshot exposes element refs, run scenarios per [E2E_TEST_PLAN.md](E2E_TEST_PLAN.md) in order: Auth → Estate plans → Beneficiaries → Timelock → Account → Admin → Critical.

3. **Record results** in [E2E_TEST_REPORT.md](E2E_TEST_REPORT.md): per-scenario table, date, and whether run was “Scripted” or “MCP”.

## If a scenario fails

Use [E2E_TEST_PLAN.md](E2E_TEST_PLAN.md) §8 (Test result interpretation) and [AI_FRONTEND_TESTING.md](AI_FRONTEND_TESTING.md) → **Troubleshooting → Login/register not redirecting** (CORS, env, cookie checks).

## Teamwork

- **Scripted suite** (Agent 1) verifies auth and key flows without depending on MCP snapshot refs.
- **Docs** (Agent 2) define the canonical path and where to record.
- This runbook is the sequence any agent follows for verification.
