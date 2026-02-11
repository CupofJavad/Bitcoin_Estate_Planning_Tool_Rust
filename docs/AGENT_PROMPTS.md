# Initial prompts for parallel GTM agents

Use these to start two new Cursor chats. When those agents finish, feed their results back to the main GTM agent. The main agent works on Phase 0 and Phase D while these run in parallel.

**Single source of truth for progress:** [GTM_LIVE_CHECKLIST.md](GTM_LIVE_CHECKLIST.md). Each agent updates only their stream’s section (Stream B or C). Do not edit the other stream’s items.

---

## Agent 2 — Branding (Stream B)

**Paste this into a new Cursor chat:**

```
We're building Legacy Vault, a multi-chain estate planning web app (Bitcoin, Monero, Stacks). I need you to own the **branding and assets** stream for our GTM launch.

**Context:**
- Repo: Estate_Planning_Rust (Rust/Axum API + Next.js frontend). Path: `Estate_Planning_Rust/` from the workspace root.
- Brand is defined in `Estate_Planning_Rust/docs/GTM_PLAN.md` Part 1 (Name: Legacy Vault, Slogan: "Secure your crypto for those who come next.", colors in §1.4, logo concept in §1.3).
- There is a **single live checklist** for all agents: `Estate_Planning_Rust/docs/GTM_LIVE_CHECKLIST.md`. You own **Stream B — Branding & assets**. When you complete an item, check it off in that file and only edit the Stream B section.

**Your tasks (in order):**
1. **Favicon and app icons**  
   Add a favicon set (e.g. 16×16, 32×32, 180×180 Apple Touch) and wire it in the Next.js app (layout, metadata). If we don't have a logo yet, use a simple SVG or placeholder (e.g. "LV" or a vault/key motif) so the tab and bookmarks look branded. Prefer the GTM accent color #0ea5e9 or primary #0f172a.

2. **Open Graph / social image**  
   Ensure meta tags are set (layout already has title/description). Add or document og:image (e.g. 1200×630) — can be a simple branded card with "Legacy Vault" and the slogan; placeholder image or generated is fine.

3. **Consistency pass**  
   Scan the frontend (login, register, home, account, terms, privacy, footer) and ensure the GTM color palette and typography from GTM_PLAN §1.4 are applied consistently. Fix any hardcoded colors that don't match (e.g. use #0f172a, #334155, #0ea5e9, #f8fafc, #e2e8f0 as in the plan).

When done, update **Stream B** in `GTM_LIVE_CHECKLIST.md` and leave a short summary of what you did for the main agent.
```

---

## Agent 3 — Legal & compliance (Stream C)

**Paste this into a new Cursor chat:**

```
We're building Legacy Vault, a multi-chain estate planning web app (Bitcoin, Monero, Stacks). I need you to own the **legal and compliance** stream for our GTM launch.

**Context:**
- Repo: Estate_Planning_Rust. Path: `Estate_Planning_Rust/` from the workspace root.
- There are placeholder pages: `frontend/app/terms/page.tsx` (Terms of Service) and `frontend/app/privacy/page.tsx` (Privacy Policy). They're linked in the footer.
- Legal/compliance requirements are in `Estate_Planning_Rust/docs/GTM_PLAN.md` Part 1.5 (RUFADAA disclaimer, GDPR retention and user rights, §1.5.2 retention matrix, §1.5.1 in-app disclaimer).
- There is a **single live checklist** for all agents: `Estate_Planning_Rust/docs/GTM_LIVE_CHECKLIST.md`. You own **Stream C — Legal & compliance**. When you complete an item, check it off in that file and only edit the Stream C section.

**Your tasks (in order):**
1. **Terms of Service**  
   Expand the placeholder at `frontend/app/terms/page.tsx` into production-ready placeholder text. Include: (a) RUFADAA / digital estate disclaimer — "Legacy Vault is a planning and documentation tool only; it does not provide legal or fiduciary advice"; (b) acceptable use; (c) termination and account closure; (d) contact/support. Keep it in plain language; we can have a lawyer review later.

2. **Privacy Policy**  
   Expand the placeholder at `frontend/app/privacy/page.tsx`. Include: (a) controller identity (e.g. "Legacy Vault" / project or company name); (b) what data we collect (account, estate plans, beneficiaries) and for what purposes; (c) retention — align with GTM_PLAN §1.5.2 (account data while active + 30 days after deletion request; audit logs 12 months; sessions until expiry); (d) data subject rights (access, rectification, erasure, portability, complaint to supervisory authority); (e) cookies/analytics if we add them later (mention "we may use …; we will list them here and obtain consent where required"); (f) international transfers if applicable. Replace the current placeholder content.

3. **In-app disclaimer (optional)**  
   If straightforward, add a short "digital estate planning tool, not legal advice" line on first use or in the footer/ToS link. Otherwise document in the checklist that it's recommended for the main agent to add.

When done, update **Stream C** in `GTM_LIVE_CHECKLIST.md` and leave a short summary of what you did for the main agent.
```

---

## After the other agents report back

- Merge any file changes (terms, privacy, favicon, layout, etc.).
- Update [GTM_PROGRESS.md](GTM_PROGRESS.md) and [VERSION_STATE_AND_NEXT_STEPS.md](VERSION_STATE_AND_NEXT_STEPS.md) if needed.
- Re-run tests and a quick manual check of the app.

---

## Follow-up assignments (optional — after initial Stream B/C done)

Use these to give **Agent 2** or **Agent 3** a second round of work. Progress: [GTM_LIVE_CHECKLIST.md](GTM_LIVE_CHECKLIST.md).

### Agent 2 — Branding (optional follow-up)

```
Legacy Vault GTM: optional follow-up for **Stream B**.

**Context:** Stream B is largely complete (favicon, OG image, GTM palette, README/marketing copy). Single checklist: `Estate_Planning_Rust/docs/GTM_LIVE_CHECKLIST.md` — update only **Stream B**.

**Optional tasks (pick what’s useful):**
1. **Logo concept** — Per GTM_PLAN.md §1.3, produce a logo concept: symbol + wordmark "Legacy Vault". Can be a design brief, SVG sketch, or reference; no requirement to replace current favicon unless we adopt it.
2. **Consistency pass** — Quick scan: ensure README, frontend README, and any marketing copy use "Legacy Vault" and slogan "Secure your crypto for those who come next." everywhere. Fix any stray references.

When done, update Stream B in GTM_LIVE_CHECKLIST.md and leave a one-line summary for the main agent.
```

### Agent 3 — Legal (optional follow-up)

```
Legacy Vault GTM: optional follow-up for **Stream C**.

**Context:** Stream C is complete (ToS, Privacy, /data, /contact, footer disclaimer, DEPLOY §8, account deletion and data export implemented). Single checklist: `Estate_Planning_Rust/docs/GTM_LIVE_CHECKLIST.md` — update only **Stream C**.

**Optional tasks (pick what’s useful):**
1. **Review /data and /contact** — Check that /data (how we handle your data) and /contact (support channel) align with Privacy Policy and GTM_PLAN §1.5.3 / §8.3. Add any missing GDPR or support references (copy-only; no API changes).
2. **Customer support** — If DEPLOY.md §8 or the Contact page still use a placeholder support email, add a note that it must be replaced before launch; no code change required unless you add the real address.

When done, update Stream C in GTM_LIVE_CHECKLIST.md if you change anything, and leave a one-line summary for the main agent.
```

### DevOps / deploy agent (if used)

```
Legacy Vault Phase 0 deploy. Repo: Estate_Planning_Rust.

**Docs:** DEPLOY.md (TLS §5, BCDR §6, checklists §10), GTM_LIVE_CHECKLIST.md (Stream A — Smoke, Deploy, Run checklists).

**Tasks:** (1) Server setup and env (DB, DATABASE_URL, API, frontend URL). (2) TLS (e.g. Let’s Encrypt + nginx per DEPLOY §5). (3) Run checklists in DEPLOY §10 (production server, SPA, Docker, security); fix or document gaps. (4) Post-deploy smoke: /health, /version, frontend load, login. (5) Assign BCDR owner and document in DEPLOY §6. (6) Tag release (e.g. v0.2.0-phase0) and update VERSION_STATE_AND_NEXT_STEPS.md.

Do not change Terms/Privacy or branding; coordinate with main agent for any code changes.
```
