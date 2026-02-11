# Agent Prompt: Full Frontend E2E Test (Legacy Vault)

**Copy the entire "Prompt to give to another agent" section below into a new chat with another AI agent. That agent should use Playwright MCP (browser tools) to test the complete Legacy Vault frontend using the referenced test plan and workflows.**

---

## Prompt to give to another agent

You are to **test the complete Legacy Vault frontend** end-to-end using the Playwright MCP browser tools (navigate, snapshot, click, type, fill form, etc.). Use the project’s **E2E test plan** and **workflow documentation** as the single source of truth for what to run and in what order. Your goal is to execute as many of the documented scenarios as possible, record pass/fail per scenario (and step where useful), and for any failure suggest a **root cause** using the plan’s guidance.

---

### 1. Prerequisites you must respect

- **App must be running** before you start browser tests:
  - **PostgreSQL:** Docker or local. If Docker: from repo run  
    `docker compose -f /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/infra/docker-compose.yml up -d`  
    (or use the app-manager script; see below.)
  - **API (Rust):** `cd /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust && cargo run` → must be listening on **http://localhost:8000** (health: http://localhost:8000/health). Ensure API CORS allows credentials and origin **http://localhost:3000** (see [AI_FRONTEND_TESTING.md](AI_FRONTEND_TESTING.md) → Troubleshooting if login/register do not redirect).
  - **Frontend (Next.js):** `cd /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/frontend && npm run dev` → must be serving **http://localhost:3000**.

- **Optional:** The user can start everything with the app manager script:  
  `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/scripts/app-manager.sh`  
  (from workspace root) or  
  `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/scripts/app-manager.sh`  
  (from Estate_Planning_Rust). If the app is not running, instruct the user to start it or run the script before continuing.

- **Default test accounts:**
  - **Admin (full privileges):** email `admin@localhost`, password `admin`. Use for all admin workflows (user list, edit user, audit log).
  - **End-user:** Register a new user (e.g. email `e2e@test.local`, password 8+ characters) and use that for end-user flows (estate plans, beneficiaries, timelock policies, account) so admin and owner flows are tested separately.

---

### 2. Authoritative documents (read these first)

You **must** use these files as the definition of scenarios, steps, expected outcomes, and root-cause hints. All paths below are absolute.

- **E2E test plan (all scenarios, expected outcomes, root-cause guidance):**  
  `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/docs/E2E_TEST_PLAN.md`  
  This document contains:
  - **Section 1:** Auth (unauthenticated): public home redirect, register happy path, register validation, login happy path, login validation/errors, logout.
  - **Section 2:** End-user — Estate plans: list, create happy path, create validation, view detail, update, delete.
  - **Section 3:** End-user — Beneficiaries: add happy path, allocation validation, edit and delete.
  - **Section 4:** End-user — Timelock policies: add happy path, edit and delete.
  - **Section 5:** End-user — Account: profile (name/email), change password, export data, delete account.
  - **Section 6:** Admin: non-admin cannot access admin, list users, edit user (role/active), audit log.
  - **Section 7:** Critical: session/invalid cookie, cross-user isolation, rate limiting (auth), static/legal pages.
  - **Section 8:** Test result interpretation (root cause checklist).
  - **Section 9:** Notes on running with Playwright MCP.

- **Workflows (logical order and step-by-step processes):**  
  `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/docs/WORKFLOWS.md`  
  Use this for the intended order of flows: Auth → Estate plans → Beneficiaries → Timelock policies → Account → Admin → Other critical. Each workflow has goals, steps, and outcomes.

- **How to get the app running and use Playwright MCP:**  
  `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/docs/AI_FRONTEND_TESTING.md`  
  Use this for: starting Postgres, API, and frontend; verifying health and frontend URL; and any Playwright MCP troubleshooting (e.g. reload Cursor, single .cursor config).

- **Playwright MCP setup and troubleshooting (reproducible):**  
  `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/docs/PLAYWRIGHT_MCP_AGENT_SETUP_GUIDE.md`

- **Short Playwright MCP usage summary:**  
  `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/docs/PLAYWRIGHT_MCP_FRONTEND_TESTING.md`

---

### 3. What you must do

1. **Read** (in full or in relevant sections) the E2E test plan and workflows from the paths above so you know every scenario and the expected outcomes.
2. **Confirm** the app is reachable: open **http://localhost:3000** and **http://localhost:8000/health** via the browser. If either fails, stop and tell the user to start the app (or run the app-manager script) and try again.
3. **Execute** the test scenarios in the **order** given in the E2E test plan and WORKFLOWS.md:
   - First: **Auth** (1.1–1.6 in E2E_TEST_PLAN: public redirect, register happy path, register validation, login happy path, login validation, logout).
   - Then: **End-user — Estate plans** (2.1–2.6: list, create, validation, view detail, update, delete). Use the registered end-user (e.g. `e2e@test.local`) for these.
   - Then: **End-user — Beneficiaries** (3.1–3.3) and **Timelock policies** (4.1–4.2) on an estate plan you created.
   - Then: **End-user — Account** (5.1–5.4: profile, change password, export data; skip delete account if it would remove the user you need for later runs, or do it last).
   - Then: **Admin** (6.1–6.4): log in as `admin@localhost` / `admin`, list users, edit a user (role/active), view audit log. Also verify non-admin cannot access `/admin` and `/admin/audit`.
   - Then: **Critical** (7.1–7.4): session/cookie, cross-user isolation (if feasible), rate limit note, static pages (e.g. `/privacy`, `/terms`, `/contact`, `/data`).
4. For **each** scenario (or sub-scenario in the plan), use the browser to perform the **actions** in the table (navigate, click, type, fill form, etc.) and check the **expected outcome**. Record:
   - **Scenario ID** (e.g. "1.2 Register — happy path", "2.2 Create estate plan — happy path", "6.2 Admin — list users").
   - **Pass or Fail.**
   - If fail: **step number** (if applicable) and a short **root cause** or **what to check**, using the "If it fails — root cause / check" column in E2E_TEST_PLAN.md and Section 8 (Test result interpretation) of that file.
5. **Deliver** a single **test report** at the end with:
   - **Summary:** total scenarios run, passed, failed.
   - **Per-scenario table:** Scenario ID | Pass/Fail | Notes (and root cause / check if failed).
   - **List of any bugs or issues** suggested by the failures and root-cause hints.

---

### 4. Important constraints

- Use **only** the Playwright MCP browser tools (or Cursor’s built-in browser MCP if that is what is available). Do not invent steps that are not in the E2E test plan or workflows.
- Base **expected outcomes** strictly on the text in `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/docs/E2E_TEST_PLAN.md` and `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/docs/WORKFLOWS.md`. If the UI text differs slightly (e.g. "Sign in" vs "Log in"), still treat the scenario as passed if the behavior matches (e.g. redirect to home after login).
- **Frontend base URL:** http://localhost:3000  
- **API base URL:** http://localhost:8000  
- **Admin credentials:** `admin@localhost` / `admin`  
- **End-user:** Register once (e.g. `e2e@test.local` / password ≥ 8 chars) and reuse for all end-user estate plan, beneficiary, timelock, and account flows.

---

### 5. Other referenced files (for context or troubleshooting only)

- Workspace root MCP config: `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/.cursor/mcp.json`
- Workspace root MCP readme: `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/.cursor/README.md`
- App manager script (start/stop app): `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/scripts/app-manager.sh`  
  or from workspace root: `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/scripts/app-manager.sh`
- API integration tests (Rust, not browser): `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/tests/api_integration.rs`
- Smoke script: `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/scripts/smoke.sh`
- Legacy Vault README: `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/README.md`

---

### 6. One-sentence mission reminder

Test the **complete** Legacy Vault frontend using the scenarios and workflows in `E2E_TEST_PLAN.md` and `WORKFLOWS.md` (full paths above), via Playwright MCP, in the order given; record pass/fail and root-cause hints per scenario; then produce a summary report and a list of suggested bugs or issues.
