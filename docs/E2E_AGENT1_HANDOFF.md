# Agent 1 → Agent 4 handoff (scripted E2E)

**Purpose:** Agent 4 uses this for the “Scripted verification” subsection and “verifies A/B/C” sentences in E2E_TEST_REPORT.

---

## New/edited files (Agent 1)

| File | Change |
|------|--------|
| `Estate_Planning_Rust/frontend/package.json` | Added devDependency `@playwright/test`, script `e2e` (`playwright test`) |
| `Estate_Planning_Rust/frontend/playwright.config.ts` | New: baseURL from `PLAYWRIGHT_BASE_URL` or `http://localhost:3000`, testDir `./tests/e2e` |
| `Estate_Planning_Rust/frontend/tests/e2e/auth.spec.ts` | New: tests for E2E_TEST_PLAN 1.1–1.6 (redirect, register happy/validation, login happy/validation, logout) |
| `Estate_Planning_Rust/docs/AI_FRONTEND_TESTING.md` | Added “Scripted E2E suite” subsection with prerequisites and `npm run e2e` |

---

## Command to run the scripted suite

From **`Estate_Planning_Rust/frontend`** (with Postgres, API, and frontend already running, and `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`):

```bash
npm run e2e
```

(Or `npx playwright test`.)

---

## How this suite verifies Solutions A, B, and C (for the report)

- **Solution A (CORS/credentials):** The register and login happy-path tests (1.2, 1.4) only pass if the session cookie is set and accepted by the API after login/register; otherwise the app would not redirect to home or show the user. So a passing suite confirms that CORS and credentials are correctly configured for the browser to store and send the cookie.

- **Solution B (viewport):** The scripted tests use form fill and button click (or submit) without relying on viewport size. They do not require the Register/Sign in button to be visible in a specific viewport; Playwright can scroll or focus as needed. So the suite does not re-validate the viewport fix directly, but it confirms that auth flows complete successfully regardless of viewport.

- **Solution C (toast accessibility):** The register and login validation tests (1.3, 1.5) assert on the **text inside the toast** (e.g. “Please enter your email”, “at least 8 characters”, “Login failed”) via `getByRole('alert')`. That only works if the toast has `role="alert"` and the message is in the accessibility tree. So a passing suite confirms that error toasts are exposed for assertions (Solution C).

---

*Agent 4: Please add a “Scripted verification (follow-up)” subsection to E2E_TEST_REPORT with the date, command run, pass/fail count, and the three sentences above; and add a “Follow-up summary” paragraph that references this handoff.*
