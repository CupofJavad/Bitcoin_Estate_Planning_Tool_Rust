# Product Roadmap: MVP → Finished Product

When and how we factor in login, roles, admin, wallet, account details, and the rest of a “finished” product.

---

## Where we are now (MVP)

| Area | Current state |
|------|----------------|
| **Web pages** | Core flows only: home (estate plans list), estate plan detail (beneficiaries + timelock policies). No dashboard, no account page, no admin. |
| **Login / auth** | None. API and frontend assume a single implicit user (e.g. `user_id = 0`). |
| **User types + roles** | None. No distinction between end-user, admin, executor, etc. |
| **User configurations** | None. No preferences, notifications, or per-user settings. |
| **Admin menus/panels/features** | None. No user management, moderation, or system config. |
| **Wallet functions** | None. Addresses for BTC, XMR, and STX are stored and displayed (see [MULTI_NETWORK_EXPLORATION.md](MULTI_NETWORK_EXPLORATION.md)); no key handling, no signing, no wallet connection yet. |
| **Account details** | None. No profile, email, 2FA, or account management. |

So today the app is a **single-user, unauthenticated MVP**: you can create and manage estate plans, beneficiaries, and timelock policies, with no login, no roles, and no wallet integration.

---

## When does “finished product” stuff get factored in?

It gets **designed and scheduled in phases**, then **built** when you start each phase. Below is a suggested sequence. You can adjust order or combine phases.

| Phase | What gets factored in | When it starts |
|-------|------------------------|----------------|
| **0. Harden & deploy (current)** | Run on server, TLS, env config, checklists | Now (see [VERSION_STATE_AND_NEXT_STEPS.md](VERSION_STATE_AND_NEXT_STEPS.md)) |
| **A. Auth & identity** | Login (e.g. email/password or OAuth), sessions or JWT, “current user” in API and UI | When you decide to move from single-user to multi-user and need a “who is this?” boundary |
| **B. User types + roles** | Roles (e.g. owner, beneficiary, executor, admin), permission checks, role-based menus | After or with Phase A; needed before admin and before restricting who can edit what |
| **C. User config & account** | Account/profile page, user preferences, notification settings, account details (email, 2FA if desired) | After Phase A (you need a logged-in user to attach config to) |
| **D. Admin** | Admin area (separate routes or app), user management, moderation, system config, audit views | After Phase B (you need an “admin” role and permissions) |
| **E. Wallet & Bitcoin** | Wallet connection (read-only or signing), address derivation, key policies, timelock execution (if applicable). Multi-network address support (BTC, XMR, STX) can be added before or in this phase—see [MULTI_NETWORK_EXPLORATION.md](MULTI_NETWORK_EXPLORATION.md). | When product requirements specify real Bitcoin flows; often after core app is stable |

So:

- **Design / “factor in”**: You factor these in **when you write the roadmap and acceptance criteria** for each phase (this doc is the start of that).
- **Build**: You **build** each area when you start that phase (e.g. “we start Phase A” = we design auth and then implement login, sessions, and “current user”).

Nothing here is built yet except the MVP; the table above is the plan for when each piece gets built.

---

## How to factor them in (concrete steps)

1. **Before starting a phase**  
   - **Design:** Who can do what (roles), which endpoints and pages, which data (e.g. `users`, `sessions`, `roles`).  
   - **Checklists:** Use [CHECKLISTS_INDEX.md](checklists/CHECKLISTS_INDEX.md) and the shared [DEVELOPER_CHECKLISTS_UNIVERSAL](../../Estate_Management/docs/checklists/DEVELOPER_CHECKLISTS_UNIVERSAL.md). For auth and security, use the security and API security checklists when you add login and roles.  
   - **Schema:** Add migrations (e.g. `users`, `sessions`, `user_roles`, `user_settings`) at the start of the phase so the rest of the phase is consistent.

2. **During the phase**  
   - **Backend:** New or changed API routes (e.g. `/auth/login`, `/api/v1/me`, `/api/v1/admin/users`), all scoped by current user and role.  
   - **Frontend:** New pages (login, account, admin panels), role-based menus, and wallet UI when you reach Phase E.  
   - **Tests:** Integration tests for new flows; keep using the same error logging and test patterns we use now.

3. **After a phase**  
   - Update this roadmap (e.g. “Phase A done”), update [VERSION_STATE_AND_NEXT_STEPS.md](VERSION_STATE_AND_NEXT_STEPS.md), and run the relevant checklists before calling that phase “production-ready.”

---

## Suggested order (recap)

1. **Now:** Harden & deploy MVP (server, env, checklists).  
2. **Phase A:** Login, sessions/JWT, “current user” everywhere.  
3. **Phase B:** User types + roles, permissions, role-based menus.  
4. **Phase C:** User configurations + account details (profile, preferences).  
5. **Phase D:** Admin menus/panels/features (user management, system config).  
6. **Phase E:** Wallet functions and any Bitcoin-specific flows.

You can merge or reorder (e.g. minimal “account details” in Phase A, or wallet before full admin) depending on product priorities. The important part is: **each of these is explicitly a phase**, and we only build it when we start that phase and have the design + schema + checklists in place.

---

## Where this lives

- **This file:** [docs/PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) – when and how finished-product aspects get factored in and built.  
- **Current state and next steps:** [docs/VERSION_STATE_AND_NEXT_STEPS.md](VERSION_STATE_AND_NEXT_STEPS.md).  
- **Checklists (auth, security, production):** [docs/checklists/CHECKLISTS_INDEX.md](checklists/CHECKLISTS_INDEX.md) and the shared developer checklists.

When you’re ready to start Phase A (or another phase), we can break that phase into tasks (schema, API, frontend, tests) and implement step by step.

---

## MVP vs GTM (go-to-market)

**MVP (what we have now):** Core flows work: create and manage estate plans, beneficiaries, and timelock policies; multi-network address storage and display (BTC, XMR, STX); no auth, no roles, no admin, no wallet integration. Suitable for demos, internal use, or a single trusted user.

**GTM (go-to-market) version** typically adds everything that makes the product safe and usable for real users and paying customers: login and identity (Phase A), roles and permissions (Phase B), user/account settings (Phase C), admin tooling (Phase D), and optionally wallet/balance features (Phase E). It also implies running on a real server, TLS, and going through the checklists (security, production, launch).

**Recommendation:** You can **call the current scope “MVP complete”** (core + multi-network) and **start on the GTM version** by kicking off Phase A (auth) and “run on server” in parallel. The MVP is done in the sense that the promised feature set (estate plans, beneficiaries, timelock policies, BTC/XMR/STX addresses) is implemented and tested; GTM is the next phase of work, not a different product.

**Full GTM plan (branding, phases, checklists, industry standards):** [docs/GTM_PLAN.md](GTM_PLAN.md) – name/slogan/logo/theme, Phase 0–E breakdown, cross-cutting checklists, risk and rollback, and definition of done.
