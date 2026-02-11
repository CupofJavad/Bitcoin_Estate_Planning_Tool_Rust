# Legacy Vault — E2E Test Plan (Playwright)

Comprehensive end-to-end test scenarios for the **completed/full/functioning** Legacy Vault system. Each scenario has detailed expected outcomes and guidance for deducing **root cause(s), issue(s), and bug(s)** when a test fails.

**How to run:** Use Cursor’s Playwright MCP to drive the browser, or automate with `@playwright/test` using these scenarios. Ensure API (port 8000) and frontend (port 3000) are running; see [AI_FRONTEND_TESTING.md](AI_FRONTEND_TESTING.md).

**Default test accounts:** Admin: `admin@localhost` / `admin`. For end-user flows, register a new user or use a pre-created one.

---

## 1. Auth (unauthenticated)

### 1.1 Public home redirect

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Open `http://localhost:3000` | Redirect to `/login` or show login form (if unauthenticated). | CORS, API down, or auth context not redirecting; check `NEXT_PUBLIC_API_URL`, `/api/v1/me` response. |
| 2 | Snapshot | Page shows "Sign in", email/password fields, "Register" link. | Frontend build or routing; check console and network. |

### 1.2 Register — happy path

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Click "Register" (or go to `/register`). | Register page with email, password, optional name. | Link broken or route missing. |
| 2 | Enter email (e.g. `e2e@test.local`), password **8+ chars**, name. Submit. | Success toast; redirect to home (`/`); estate plans list or empty state. | **401/400:** API auth rate limit, validation (password length), or duplicate email. **Failed to fetch:** API not running or wrong `NEXT_PUBLIC_API_URL`. **CORS:** API CORS config. |
| 3 | Snapshot home | User email/name visible (header); "Create Estate Plan" or similar. | Session cookie not set or `GET /api/v1/me` failing; check cookie name, API response. |

### 1.3 Register — validation

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Submit with empty email. | Toast: "Please enter your email" or equivalent; no redirect. | Client-side validation missing or message wrong. |
| 2 | Submit with password &lt; 8 chars. | Toast: "password must be at least 8 characters" (or API 400); no redirect. | Validation logic or API error message. |
| 3 | Submit with existing email. | Toast: "Email already registered" (or API 400); no redirect. | API unique constraint; check DB and error mapping. |

### 1.4 Login — happy path

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Go to `/login`. Enter valid email and password. Submit. | Redirect to `/`; home shows user and estate plans. | Wrong credentials → 401; API down → "Failed to fetch"; cookie not set → check Set-Cookie and `SECURE_COOKIE`. |
| 2 | Snapshot home | Header shows user email; no "Sign in" on same page. | Auth context or `/api/v1/me` not returning user. |

### 1.5 Login — validation and errors

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Submit with empty email or password. | Toast: "Please enter email and password"; no redirect. | Client validation. |
| 2 | Submit with wrong password. | Toast: "Login failed" or "Unauthorized"; stay on login. | API returns 401; check password hash and verify logic. |
| 3 | Submit with non-existent email. | Same as wrong password (no leak of "user not found"). | API should return 401, not 404. |

### 1.6 Logout

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | From home, click logout (or "Sign out"). | Session cleared; redirect to `/login`. | `POST /auth/logout` not called or cookie not cleared; check network and cookie removal. |
| 2 | Navigate to `/`. | Redirect to login (no access to home). | Session still present or redirect logic. |

---

## 2. End-user — Estate plans

### 2.1 List estate plans

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Log in as owner. Go to `/`. | List of estate plans (or empty state "No estate plans"). | **403:** User not authenticated or session invalid. **Empty when data exists:** `user_id` filter on API or wrong user. |
| 2 | Snapshot | "Create Estate Plan" (or similar) visible; no crash. | API `GET /api/v1/estate-plans` or frontend list component. |

### 2.2 Create estate plan — happy path

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Click "Create Estate Plan" (or open create modal). | Modal/form with name, description, optional BTC/XMR/STX addresses, active. | Modal state or routing. |
| 2 | Fill name (required), description, optional addresses. Submit. | Success toast; new plan in list; modal closes. | **400:** Validation (e.g. name empty). **500:** DB or server error; check API logs. |
| 3 | Snapshot list | New plan appears with given name and details. | `POST /api/v1/estate-plans` response or list refresh. |

### 2.3 Create estate plan — validation

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Submit with empty name. | Toast or inline error; plan not created. | Client or API validation. |
| 2 | Submit with invalid address format (if validated). | Appropriate error message. | Address validation rules (if any). |

### 2.4 View estate plan detail

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | From list, click a plan (or "View" / link to `/estate-plans/[id]`). | Detail page: plan name, description, addresses, beneficiaries section, timelock policies section. | **404:** Wrong ID or `user_id` mismatch. **Blank page:** API or frontend error; check console. |
| 2 | Snapshot | Beneficiaries list (or empty); timelock list (or empty); Edit / Add beneficiary / Add policy actions. | Data not loaded or wrong API response shape. |

### 2.5 Update estate plan

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | On detail or list, open "Edit" for a plan. | Modal or form pre-filled with current values. | Wrong plan ID or GET by id failing. |
| 2 | Change name/description/addresses. Submit. | Success toast; list/detail shows updated values. | **403/404:** Not owner. **400:** Validation. **500:** DB. |
| 3 | Snapshot | Updated fields visible. | PATCH response or UI refresh. |

### 2.6 Delete estate plan

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | From list or detail, delete a plan. Confirm in dialog. | Success toast; plan removed from list; if on detail, redirect to list or 404. | **403/404:** Not owner. **500:** DB or cascade. |
| 2 | Try to open same plan by ID. | 404 or "not found". | Cascade delete (beneficiaries, timelock) and cache. |

---

## 3. End-user — Beneficiaries

### 3.1 Add beneficiary — happy path

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | On estate plan detail, click "Add beneficiary". | Modal/form: name, email, allocation %, optional addresses. | Modal state or route. |
| 2 | Fill name, allocation % (e.g. 50). Submit. | Success toast; beneficiary appears in list; allocation sum shown. | **400:** Sum &gt; 100% or validation. **403:** Not plan owner. |
| 3 | Snapshot | New row/card with name and allocation. | POST response or list refresh. |

### 3.2 Add beneficiary — allocation validation

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Add beneficiaries so total &gt; 100%. | Toast or API error: allocation cannot exceed 100%. | API or client validation. |
| 2 | Add beneficiary with negative allocation. | Validation error. | Min/max checks. |

### 3.3 Edit and delete beneficiary

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Edit beneficiary (name, allocation). Submit. | Success; list updates. | PATCH and ownership. |
| 2 | Delete beneficiary. Confirm. | Removed from list; allocation sum updates. | DELETE and cascade; audit event if implemented. |

---

## 4. End-user — Timelock policies

### 4.1 Add timelock policy — happy path

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | On estate plan detail, click "Add timelock policy" (or equivalent). | Form: name, description, timelock_blocks, trigger_condition, is_active. | Modal/API schema. |
| 2 | Fill and submit. | Success; policy appears in list. | **400:** Validation. **403:** Not owner. |
| 3 | Snapshot | Policy card/row visible. | POST and list refresh. |

### 4.2 Edit and delete timelock policy

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Edit policy. Submit. | Success; list updates. | PATCH and ownership. |
| 2 | Delete policy. Confirm. | Removed from list. | DELETE and audit. |

---

## 5. End-user — Account

### 5.1 Profile (update name/email)

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Go to `/account`. | Account page: profile form, change password, export, delete. | Route or auth guard. |
| 2 | Change name and/or email. Save. | Success toast; header/profile shows new values. | **400:** Duplicate email or validation. **PATCH /api/v1/me**. |
| 3 | Snapshot | Updated name/email displayed. | Refresh user in auth context. |

### 5.2 Change password

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Enter current password, new password (8+ chars), confirm. Submit. | Success toast; can log in with new password. | **401:** Current password wrong. **400:** New password too short or mismatch. |
| 2 | Log out; log in with new password. | Login succeeds. | Hash update and session. |
| 3 | Log in with old password. | Login fails. | Old hash no longer valid. |

### 5.3 Export data

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Click "Export my data". | JSON file downloads (estate plans, beneficiaries, timelock policies, exported_at). | **GET /api/v1/me/export**; blob download and filename. |
| 2 | Open file. | Valid JSON; contains user's plans and related data. | API export shape and encoding. |

### 5.4 Delete account

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Enter password and type "DELETE". Submit. | Success toast; redirect to `/login`; session gone. | **401:** Wrong password. **400:** Confirm text. |
| 2 | Try to log in with same email. | Login fails (user deleted). | Cascade: sessions, estate_plans, beneficiaries, timelock_policies, audit_events, user. |
| 3 | Try to access `/` without logging in. | Redirect to login. | Session cleared. |

---

## 6. Admin — Users (admin role only)

### 6.1 Non-admin cannot access admin

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Log in as **owner** (not admin). Navigate to `/admin`. | "You do not have permission" (or 403); no user list. | Frontend role check and/or API 403 on `/api/v1/admin/users`. |
| 2 | Navigate to `/admin/audit`. | Same; no audit data. | Role check and API 403. |

### 6.2 Admin — list users

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Log in as `admin@localhost` / `admin`. Go to `/admin`. | Table: ID, email, name, role, status (Active/Inactive), Actions. | **403:** User role not "admin". **Empty:** API or DB. |
| 2 | Snapshot | At least admin user and any other users. | `GET /api/v1/admin/users`. |

### 6.3 Admin — edit user (role / active)

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Click Edit on a user. | Modal or form: role (owner/executor/admin), is_active. | UI or API schema. |
| 2 | Change role to "executor". Save. | Success; table shows new role. | **PATCH /api/v1/admin/users/:id**; validation of role enum. |
| 3 | Set user to Inactive. Save. | Status shows Inactive; that user cannot log in. | `is_active` and login check. |
| 4 | As admin, try to deactivate self. | Error: cannot deactivate own account. | API or UI guard. |

### 6.4 Admin — audit log

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Go to `/admin/audit` (or "Audit" from admin). | List of audit events (user_id, action, entity_type, entity_id, etc.). | **403:** Not admin. **Empty:** No events or filters. |
| 2 | Apply filters (date range, action, entity type). | List updates. | Query params and API. |
| 3 | Export audit. | JSON file downloads. | Client-side export of current list. |

---

## 7. Critical — Security and edge cases

### 7.1 Session expiry / invalid cookie

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Log in; delete or corrupt session cookie (DevTools). Reload or call protected API. | Redirect to login or 401 on API. | API session validation and frontend redirect on 401. |
| 2 | Use expired session. | Treated as unauthenticated. | Expiry check in API. |

### 7.2 Cross-user isolation

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | User A creates estate plan. Log out; log in as User B. | User B does not see User A's plan. | All estate-plan/beneficiary/timelock queries filtered by `user_id`. |
| 2 | User B tries to open User A's plan by ID (e.g. `/estate-plans/1`). | 404 or "not found". | API `user_id` check on GET/PATCH/DELETE. |

### 7.3 Rate limiting (auth)

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Send many register/login requests (e.g. script or rapid clicks). | After limit: 429 or friendly message. | `rate_limit` middleware and config. |

### 7.4 Static and legal pages

| Step | Action | Expected outcome | If it fails — root cause / check |
|------|--------|------------------|-----------------------------------|
| 1 | Open `/privacy`, `/terms`, `/contact`, `/data`. | Pages load; no crash. | Routes and content. |
| 2 | Links from footer/header work. | Correct navigation. | Routing and links. |

---

## 8. Test result interpretation (root cause checklist)

When a scenario fails, use this checklist to narrow down cause:

| Symptom | Likely area | Checks |
|---------|-------------|--------|
| "Failed to fetch" / network error | API unreachable | API process; `NEXT_PUBLIC_API_URL`; CORS; firewall. |
| 401 on protected route | Auth | Cookie (name, domain, path, Secure); session in DB; logout clearing cookie. |
| 403 on admin page | Authorization | User `role === 'admin'`; API admin routes return 403 for non-admin. |
| 404 on estate plan by ID | Ownership | API filters by `user_id`; frontend not using wrong ID. |
| Validation error (400) | Input | Required fields; length (password 8+); allocation sum ≤ 100%; enum (role). |
| Empty list when data exists | Data / filter | API query `user_id`; frontend not overwriting state; API response shape. |
| Modal doesn't open / wrong data | Frontend state | Edit ID; refresh after create/update/delete. |
| Toast not shown | Frontend | Error handling; success path; toast component. |
| Redirect loop or wrong page | Auth context | Redirect after login/logout; protected route guard. |

---

## 9. Running with Playwright MCP (Cursor)

Example prompts to run the above with the AI + Playwright MCP:

- *"Open http://localhost:3000. Run E2E: register a new user, create an estate plan, add a beneficiary. Report pass/fail and any errors (with step number from E2E_TEST_PLAN)."*
- *"Log in as admin@localhost / admin. Go to /admin, then /admin/audit. Confirm user list and audit list load. Report results."*
- *"As a logged-in owner, go to /account. Change display name and save. Then export my data. Report pass/fail."*

For automated Playwright tests, convert each section into `test()` blocks with `expect()` on URL, visible text, and toasts; run with `npx playwright test` (see [AI_FRONTEND_TESTING.md](AI_FRONTEND_TESTING.md) for generating tests).
