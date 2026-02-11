# Agent Prompt: E2E Test → Fix → Re-run Until All Pass

**Purpose:** Give this prompt to an AI agent so it runs the scripted Playwright E2E suite, diagnoses every failure, applies fixes (to the application or to the tests), re-runs the suite, and repeats until **all 7 tests pass with no errors**. Playwright is already installed; the agent must not suggest "run npx playwright install" as the fix for test failures.

**How to use:** Copy the entire section **"Prompt to give to the agent"** below into a new Cursor chat. The agent should follow it exactly and iterate until the final run reports 7 passed.

**Quick copy (short version):** If you prefer a one-paragraph handoff, paste this into a new chat:

```
You are the E2E fix agent for Legacy Vault. Read and follow the full instructions in Estate_Planning_Rust/docs/AGENT_PROMPT_E2E_FIX_LOOP.md. Your job: run npm run e2e from Estate_Planning_Rust/frontend; for every failure, determine root cause (E2E_TEST_PLAN.md §8, auth.spec.ts, login/register pages, toast, CORS); fix the app or the test; re-run; repeat until all 7 tests pass, then report what you changed. Prerequisites: Postgres, API (cargo run) on 8000, frontend (npm run dev) on 3000, frontend/.env.local with NEXT_PUBLIC_API_URL=http://localhost:8000.
```

---

## Prompt to give to the agent

You are an E2E testing and fix agent for **Legacy Vault**, a multi-chain estate planning web app. Your mission is to run the **scripted Playwright E2E suite**, fix every failure (by changing the application code or the test code as appropriate), and **re-run the suite until all 7 tests pass with zero errors**. Do not stop after one fix; repeat the cycle (run → analyze → fix → run) until the final run shows **7 passed**.

---

### Part A — Prerequisites (verify or start before first run)

1. **Workspace and paths**
   - Repo root: `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust`
   - App root: `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust`
   - Frontend: `/Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/frontend`
   - E2E tests: `Estate_Planning_Rust/frontend/tests/e2e/auth.spec.ts`
   - Playwright config: `Estate_Planning_Rust/frontend/playwright.config.ts`

2. **Services that must be running**
   - **PostgreSQL:** Docker or local. From repo root:
     ```bash
     docker compose -f Estate_Planning_Rust/infra/docker-compose.yml up -d
     ```
     Or use local Postgres; ensure `Estate_Planning_Rust/.env` has a valid `DATABASE_URL` (e.g. `postgres://postgres:postgres@localhost:5432/estate_planning_rust`).
   - **API (Rust):** From `Estate_Planning_Rust` run `cargo run`. Must listen on **http://localhost:8000**. Verify with `curl -s http://localhost:8000/health` → should return `OK`. If the API panics on startup (e.g. CORS "Cannot combine Allow-Credentials with Allow-Headers: *"), fix the CORS configuration in `Estate_Planning_Rust/src/main.rs`: use an explicit list of allowed headers (e.g. `AllowHeaders::list([CONTENT_TYPE, ACCEPT, AUTHORIZATION, ORIGIN, ...])`) instead of `Any` when `allow_credentials(true)`.
   - **Frontend (Next.js):** From `Estate_Planning_Rust/frontend` run `npm run dev`. Must serve **http://localhost:3000**.

3. **Environment**
   - `Estate_Planning_Rust/frontend/.env.local` must contain: `NEXT_PUBLIC_API_URL=http://localhost:8000`. If missing, create or update the file. The Playwright config derives `baseURL` from this (replacing `:8000` with `:3000`) or from `PLAYWRIGHT_BASE_URL`; default is `http://localhost:3000`.

4. **Playwright**
   - Playwright is already installed. Do **not** treat "Executable doesn't exist" or "run npx playwright install" as the primary fix for failing tests; if browsers are missing, the user will install them. Your job is to fix **test logic or application behavior** so that when the suite runs, all 7 tests pass.

---

### Part B — The cycle: Run → Analyze → Fix → Re-run (repeat until 7 passed)

Perform the following loop. Do not exit the loop until a full run reports **7 passed** (or you have applied all fixes you can and you report clearly what remains for the user).

#### Step 1: Run the E2E suite

From the **frontend** directory run:

```bash
cd /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/frontend
npm run e2e
```

This runs Playwright with config in `playwright.config.ts` (testDir: `./tests/e2e`, baseURL from env, one worker, list reporter). The suite contains **7 tests** in `tests/e2e/auth.spec.ts`:

| # | Test name (describe + test title) | What it does |
|---|-----------------------------------|--------------|
| 1 | 1.1 Public home redirect | `goto('/')` → expect URL `/login`, heading "Sign in", `login-email`, `login-password`, link "Register" visible |
| 2 | 1.3 Register — validation: empty email | `goto('/register')` → click submit → expect toast "Please enter your email", URL stays `/register` |
| 3 | 1.3 Register — validation: password too short | Fill email + password "short" → submit → expect toast "at least 8 characters", URL `/register` |
| 4 | 1.5 Login — validation: empty email and password | `goto('/login')` → click submit → expect toast "Please enter email and password", URL `/login` |
| 5 | 1.5 Login — validation: wrong password shows toast | Fill admin@localhost + wrong password → submit → expect toast "Login failed", URL `/login` |
| 6 | 1.2 Register — happy path | Register with unique email, name, password123 → expect redirect to `/`, text "Create Estate Plan" or "estate plan" or "Legacy Vault" visible |
| 7 | 1.4 Login — happy path (admin) | Login admin@localhost / admin → expect redirect to `/`, text "admin@localhost" or "Create Estate Plan" or "estate plan" or "Legacy Vault" visible |

Capture the full terminal output. Note every **failed** test name and the **exact error message** (e.g. timeout, selector not found, URL mismatch, text mismatch).

#### Step 2: Analyze each failure (root cause)

For each failed test, determine the **root cause** using:

- **Test file:** `Estate_Planning_Rust/frontend/tests/e2e/auth.spec.ts` — check the selectors and expectations (e.g. `getByTestId('login-email')`, `getByTestId('toast-message')`, `toHaveText(/.../)`, `toHaveURL(...)`).
- **E2E test plan and interpretation:**
  - Scenarios and expected outcomes: `Estate_Planning_Rust/docs/E2E_TEST_PLAN.md` (sections 1.1–1.5 and 1.2/1.4 happy path).
  - Root-cause checklist: **Section 8** of the same file (symptoms: "Failed to fetch", 401, validation errors, toast not shown, redirect wrong, etc.).
- **Troubleshooting:** `Estate_Planning_Rust/docs/AI_FRONTEND_TESTING.md` — table and "Login/register not redirecting": CORS, `NEXT_PUBLIC_API_URL`, cookie, API not running.
- **Application code to consider:**
  - **Login page:** `Estate_Planning_Rust/frontend/app/login/page.tsx` — form fields, submit handler, toast on error, redirect on success. Ensure elements have `data-testid="login-email"`, `data-testid="login-password"`, `data-testid="login-submit"` if the tests use them.
  - **Register page:** `Estate_Planning_Rust/frontend/app/register/page.tsx` — `data-testid="register-email"`, `register-password`, `register-name`, `register-submit`; validation messages and toasts.
  - **Toasts:** Tests expect a toast container/message with `data-testid="toast-message"` (or equivalent) and text matching the expectations. Find the toast component and where it’s rendered (e.g. `GlobalToasts` or layout) and ensure the test IDs and message content align.
  - **Auth redirect:** Unauthenticated visit to `/` should redirect to `/login`. This is usually in a layout, `AuthGate`, or middleware; ensure the redirect target is `/login` and the login page shows "Sign in" (or the test’s expected heading).
  - **API CORS:** If register/login succeed in the UI but tests fail on redirect or cookie, or you see CORS errors in the run, fix `Estate_Planning_Rust/src/main.rs`: allow credentials and explicit headers (no `Any` for headers when credentials are true).

Decide for each failure whether:
- **Application is wrong:** e.g. missing validation message, wrong redirect, missing `data-testid`, API/CORS issue → fix the **application** (frontend or API).
- **Test is wrong:** e.g. selector or expected text doesn’t match the actual UI (wording changed, different structure) → fix the **test** in `auth.spec.ts` so the assertion matches the intended behavior from E2E_TEST_PLAN.md. Do not change the *intent* of the scenario (e.g. "wrong password must show a toast and stay on login"); only adjust selectors or regex so they match the current app.

#### Step 3: Apply fixes

- **One fix at a time or in a small batch:** Prefer applying the minimal set of changes that address the identified root cause(s). If multiple tests fail for the same reason (e.g. toast not found), one fix may resolve several.
- **Application fixes:** Edit the relevant frontend files (login, register, toast, auth gate/layout) or API (`main.rs` for CORS). Preserve existing behavior where it already matches the plan.
- **Test fixes:** Edit `Estate_Planning_Rust/frontend/tests/e2e/auth.spec.ts`. Only change selectors, URLs, or expected strings/regexes so they match the **documented** expected outcome in E2E_TEST_PLAN.md; do not relax assertions (e.g. accept missing validation) unless the plan explicitly says so.
- **Do not:** Remove or skip tests to make the count pass. All 7 tests must remain and pass.

#### Step 4: Re-run the suite

Run again from the frontend directory:

```bash
cd /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/frontend
npm run e2e
```

- If **all 7 passed:** exit the loop and go to **Part C (Final report)**.
- If **any test failed:** go back to **Step 2** with the new output, analyze again, apply further fixes, then **Step 4** again. Repeat until 7 passed or you cannot proceed without user input (e.g. API not running); then report state in Part C.

---

### Part C — Final report (when all pass or you stop)

When the last run shows **7 passed**, produce a short report:

1. **Result:** "All 7 E2E tests passed."
2. **Summary of fixes applied:** List each change (file and brief description), e.g.:
   - `frontend/app/login/page.tsx`: added `data-testid="login-submit"`.
   - `frontend/tests/e2e/auth.spec.ts`: updated toast regex to match current message.
   - `Estate_Planning_Rust/src/main.rs`: CORS allow_headers set to explicit list.
3. **Prerequisites used:** Postgres (Docker/local), API on 8000, frontend on 3000, `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

If you stopped before all passed (e.g. blocked on environment):

1. **Result:** "E2E run stopped with X passed, Y failed."
2. **Failing tests:** Names and last error for each.
3. **Fixes applied so far:** Same as above.
4. **What’s left:** What the user or another agent should do next (e.g. start API, fix a specific selector, or run with a different base URL).

---

### Part D — Reference file list (use when analyzing)

| Document / file | Use for |
|-----------------|--------|
| `Estate_Planning_Rust/docs/E2E_TEST_PLAN.md` | Scenario steps, expected outcomes, **§8 root-cause checklist** |
| `Estate_Planning_Rust/docs/E2E_VERIFICATION_RUNBOOK.md` | Order of execution, "if a scenario fails" pointer |
| `Estate_Planning_Rust/docs/AI_FRONTEND_TESTING.md` | Prerequisites, Troubleshooting table, **Login/register not redirecting**, Scripted E2E command |
| `Estate_Planning_Rust/frontend/tests/e2e/auth.spec.ts` | Exact selectors (`getByTestId`, `getByRole`), expected strings/regexes |
| `Estate_Planning_Rust/frontend/playwright.config.ts` | baseURL, testDir, workers |
| `Estate_Planning_Rust/frontend/app/login/page.tsx` | Login form, test IDs, toasts, redirect |
| `Estate_Planning_Rust/frontend/app/register/page.tsx` | Register form, validation, test IDs |
| Toast component (e.g. layout or `GlobalToasts`) | `data-testid="toast-message"` and where it’s rendered |
| `Estate_Planning_Rust/src/main.rs` | CORS (allow_origin, allow_headers, allow_credentials) |

---

### Part E — One-sentence mission

**Run `npm run e2e` from the frontend directory; for every failing test, determine root cause using E2E_TEST_PLAN.md §8 and the app/test code; fix either the application or the test; re-run; repeat until all 7 tests pass, then report what you changed.**
