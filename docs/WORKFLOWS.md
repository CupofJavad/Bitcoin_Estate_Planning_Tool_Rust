# Legacy Vault — Workflows and Processes

End-to-end workflows and processes for the **completed/full/functioning** Legacy Vault system. Covers end-user, admin, and other critical flows in a logical sequence.

**Audience:** QA, support, and developers running manual or automated (e.g. Playwright) tests. See [E2E_TEST_PLAN.md](E2E_TEST_PLAN.md) for detailed test scenarios and root-cause guidance.

---

## Logical sequence overview

1. **Auth** — Register, login, logout (required for all other workflows).
2. **End-user — Estate plans** — Create, view, edit, delete plans (core product).
3. **End-user — Beneficiaries** — Add, edit, delete beneficiaries within a plan; allocation rules.
4. **End-user — Timelock policies** — Add, edit, delete timelock policies per plan.
5. **End-user — Account** — Profile, change password, export data, delete account.
6. **Admin** — User management and audit (admin role only).
7. **Other critical** — Security, isolation, static/legal pages.

---

## 1. Auth workflows

### 1.1 Registration (new user)

**Goal:** Create an account to use Legacy Vault.

**Steps:**

1. Open app (e.g. `http://localhost:3000`). If unauthenticated, login page is shown.
2. Click **Register** (or go to `/register`).
3. Enter **email** (unique), **password** (minimum 8 characters), optional **name**. Submit.
4. On success: redirect to home (`/`); session cookie set; user can see estate plans (empty or existing).

**Outcome:** User is logged in; can access all end-user flows.

**Notes:** Duplicate email returns error. Password is hashed (Argon2) and never stored plain.

---

### 1.2 Login (existing user)

**Goal:** Sign in with existing credentials.

**Steps:**

1. Open app or go to `/login`.
2. Enter **email** and **password**. Submit.
3. On success: redirect to home; session cookie set.

**Outcome:** User is logged in.

**Notes:** Invalid credentials return generic "Login failed" (no user enumeration). Inactive users (admin-deactivated) cannot log in.

---

### 1.3 Logout

**Goal:** End session and return to public state.

**Steps:**

1. From any authenticated page, click **Sign out** / **Log out** (e.g. in header).
2. Backend clears session; frontend clears cookie and redirects to `/login`.

**Outcome:** User is unauthenticated; visiting `/` redirects to login.

---

## 2. End-user — Estate plans

### 2.1 List estate plans

**Goal:** See all estate plans owned by the current user.

**Steps:**

1. Log in. Home (`/`) loads.
2. Frontend calls `GET /api/v1/estate-plans` (with session cookie).
3. List displays: plan name, description, optional addresses, active state; actions: View, Edit, Delete.

**Outcome:** User sees only their plans; empty state if none.

---

### 2.2 Create estate plan

**Goal:** Add a new estate plan.

**Steps:**

1. From home, click **Create Estate Plan** (or equivalent).
2. Fill **name** (required), **description**, optional **Bitcoin / Monero / Stacks** addresses, **active** (default true). Submit.
3. API: `POST /api/v1/estate-plans`; plan stored with `user_id` of current user.
4. UI: success toast; new plan appears in list; modal closes.

**Outcome:** New plan is created and visible in list.

---

### 2.3 View estate plan detail

**Goal:** Open a single plan with its beneficiaries and timelock policies.

**Steps:**

1. From list, click a plan (or link to `/estate-plans/[id]`).
2. Frontend: `GET /api/v1/estate-plans/:id` (must be owner).
3. Detail page shows: plan fields; **beneficiaries** section (list + add/edit/delete); **timelock policies** section (list + add/edit/delete); optional allocation chart.

**Outcome:** Full plan detail; user can manage beneficiaries and policies.

---

### 2.4 Update estate plan

**Goal:** Change name, description, addresses, or active state.

**Steps:**

1. From list or detail, click **Edit** for the plan.
2. Modify fields in modal/form. Submit.
3. API: `PATCH /api/v1/estate-plans/:id` (owner only).
4. UI: success toast; list/detail refreshes with new data.

**Outcome:** Plan updated.

---

### 2.5 Delete estate plan

**Goal:** Permanently remove a plan and its beneficiaries and timelock policies.

**Steps:**

1. From list or detail, click **Delete**. Confirm in dialog (e.g. "Are you sure?").
2. API: `DELETE /api/v1/estate-plans/:id` (owner only); DB cascades to beneficiaries and timelock policies.
3. UI: success toast; plan removed from list; if on detail, redirect to list.

**Outcome:** Plan and related data removed; other users’ plans unchanged.

---

## 3. End-user — Beneficiaries

### 3.1 Add beneficiary

**Goal:** Attach a beneficiary to an estate plan with name, optional email/addresses, and allocation %.

**Steps:**

1. On estate plan detail (`/estate-plans/[id]`), click **Add beneficiary**.
2. Fill **name**, optional **email**, **allocation percentage**, optional chain addresses. Submit.
3. API: `POST /api/v1/beneficiaries` with `estate_plan_id`; validation: total allocation for plan ≤ 100%.
4. UI: success toast; beneficiary appears in list; allocation sum updated.

**Outcome:** Beneficiary added; allocation enforced (sum ≤ 100%).

---

### 3.2 Edit beneficiary

**Goal:** Update beneficiary name, email, allocation, or addresses.

**Steps:**

1. On plan detail, click **Edit** on a beneficiary.
2. Change fields. Submit.
3. API: `PATCH /api/v1/beneficiaries/:id` (plan must belong to current user); allocation sum re-validated.
4. UI: success toast; list refreshes.

**Outcome:** Beneficiary updated.

---

### 3.3 Delete beneficiary

**Goal:** Remove a beneficiary from the plan.

**Steps:**

1. On plan detail, click **Delete** on a beneficiary. Confirm.
2. API: `DELETE /api/v1/beneficiaries/:id` (plan owner only).
3. UI: beneficiary removed; allocation sum updated.

**Outcome:** Beneficiary removed.

---

## 4. End-user — Timelock policies

### 4.1 Add timelock policy

**Goal:** Add a timelock policy to an estate plan.

**Steps:**

1. On estate plan detail, click **Add timelock policy** (or equivalent).
2. Fill **name**, **description**, **timelock_blocks**, **trigger_condition**, **is_active**. Submit.
3. API: `POST /api/v1/timelock-policies` with `estate_plan_id` (plan must be owned by user).
4. UI: success toast; policy appears in list.

**Outcome:** Timelock policy created.

---

### 4.2 Edit timelock policy

**Goal:** Update policy fields.

**Steps:**

1. On plan detail, click **Edit** on a policy. Change fields. Submit.
2. API: `PATCH /api/v1/timelock-policies/:id` (plan owner only).
3. UI: success toast; list refreshes.

**Outcome:** Policy updated.

---

### 4.3 Delete timelock policy

**Goal:** Remove a timelock policy.

**Steps:**

1. On plan detail, click **Delete** on a policy. Confirm.
2. API: `DELETE /api/v1/timelock-policies/:id` (plan owner only).
3. UI: policy removed.

**Outcome:** Policy deleted.

---

## 5. End-user — Account

### 5.1 Update profile (name / email)

**Goal:** Change display name or email.

**Steps:**

1. Go to **Account** (`/account`).
2. Edit **name** and/or **email**. Save.
3. API: `PATCH /api/v1/me`; email must remain unique.
4. UI: success toast; header/profile shows new values (auth context refreshed).

**Outcome:** Profile updated.

---

### 5.2 Change password

**Goal:** Set a new password (e.g. after first login or for security).

**Steps:**

1. On Account page, fill **current password**, **new password** (8+ chars), **confirm new password**. Submit.
2. API: `POST /api/v1/me/password`; current password verified; new hash stored.
3. UI: success toast; form cleared. User can log in with new password.

**Outcome:** Password changed; old password no longer valid.

---

### 5.3 Export data

**Goal:** Download all of the user’s data (estate plans, beneficiaries, timelock policies).

**Steps:**

1. On Account page, click **Export my data**.
2. API: `GET /api/v1/me/export` returns JSON (e.g. estate_plans with nested beneficiaries and timelock_policies, exported_at).
3. UI: file download (e.g. `legacy-vault-export-YYYY-MM-DD.json`).

**Outcome:** User has a portable copy of their data.

---

### 5.4 Delete account

**Goal:** Permanently remove the user and all associated data.

**Steps:**

1. On Account page, enter **password** and type **DELETE** in confirmation. Submit.
2. API: `POST /api/v1/me/delete` verifies password; cascades: beneficiaries, timelock_policies, estate_plans, audit_events, sessions, then user.
3. UI: success toast; logout; redirect to `/login`.

**Outcome:** Account and all related data removed; login with that email fails.

---

## 6. Admin workflows

**Prerequisite:** User must have role **admin** (e.g. default `admin@localhost` / `admin`). Non-admin users see "You do not have permission" on `/admin` and `/admin/audit`.

### 6.1 List users

**Goal:** See all registered users and their role/status.

**Steps:**

1. Log in as admin. Go to **Admin** (`/admin`) or link "Admin" in nav.
2. Frontend: `GET /api/v1/admin/users`.
3. Table: ID, email, name, role (owner/executor/admin), status (Active/Inactive), Actions (Edit).

**Outcome:** Admin sees full user list.

---

### 6.2 Edit user (role / active)

**Goal:** Change a user’s role or deactivate/activate account.

**Steps:**

1. On Admin users page, click **Edit** for a user.
2. Change **role** (owner, executor, admin) and/or **Active** (toggle). Save.
3. API: `PATCH /api/v1/admin/users/:id` with `role` and/or `is_active`.
4. UI: success toast; table refreshes. If user set to Inactive, that user cannot log in until set Active again.
5. **Constraint:** Admin cannot deactivate their own account (API or UI prevents).

**Outcome:** User role/status updated.

---

### 6.3 View audit log

**Goal:** Inspect audit events (who did what, when).

**Steps:**

1. As admin, go to **Audit** (`/admin/audit`) or link from Admin.
2. Frontend: `GET /api/v1/admin/audit` (optional query: from, to, action, entity_type, limit).
3. List displays: user_id, action (e.g. created/updated/deleted), entity_type, entity_id, timestamp, etc.
4. Optional: filter by date range, action, entity type; export list as JSON.

**Outcome:** Admin can review and export audit trail.

---

## 7. Other critical workflows

### 7.1 Session and security

- **Session lifetime:** Sessions expire after configured days (e.g. 14); expired session → 401 → frontend redirect to login.
- **Cookie:** Session ID in HTTP-only cookie (e.g. `session_id`); Secure in production when `SECURE_COOKIE=true`.
- **Logout:** Clears session server-side and cookie client-side; no access to protected routes until login again.

### 7.2 Cross-user isolation

- **Estate plans, beneficiaries, timelock policies:** All API reads/writes are scoped by `user_id` (plan owner). User A never sees or modifies User B’s data.
- **Direct URL:** Accessing `/estate-plans/[id]` for another user’s plan returns 404 from API; UI shows error or redirect.

### 7.3 Rate limiting

- **Auth endpoints:** Register and login are rate-limited to reduce abuse; over limit returns 429 or friendly message.

### 7.4 Static and legal pages

- **Pages:** `/privacy`, `/terms`, `/contact`, `/data` — informational; no auth required (or optional links when logged in).
- **Links:** Footer/header links to these pages and to Login/Register/Account/Admin as appropriate.

---

## 8. User levels summary

| Level    | Capabilities |
|----------|----------------|
| **Unauthenticated** | View login/register; static pages (privacy, terms, contact, data). |
| **Owner**          | Full CRUD on own estate plans, beneficiaries, timelock policies; account (profile, password, export, delete). |
| **Executor**       | Same as owner in current implementation (role stored; future use for limited permissions). |
| **Admin**          | Everything owner can do; plus Admin users list, edit user role/active, and Audit log. |

---

## 9. References

- **API routes:** `Estate_Planning_Rust/src/api.rs` (router).
- **Frontend routes:** `Estate_Planning_Rust/frontend/app/` (Next.js App Router).
- **E2E test scenarios:** [E2E_TEST_PLAN.md](E2E_TEST_PLAN.md).
- **Playwright MCP usage:** [AI_FRONTEND_TESTING.md](AI_FRONTEND_TESTING.md).
