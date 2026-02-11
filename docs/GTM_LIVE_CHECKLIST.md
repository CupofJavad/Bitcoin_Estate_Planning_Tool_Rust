# GTM Live Checklist — Single Source for Multi-Agent Progress

**Purpose:** Single place for all agents (primary dev, branding, legal) to track and update progress. Avoid editing the same line; update only your stream’s section.

**Last updated:** 2026-02-07 (Stream A: DevOps — checklists run, smoke script, DEPLOY §11, BCDR, v0.2.0-phase0)  
**How to use:** When you complete an item, change `[ ]` to `[x]` and add a brief note or leave as-is. Optionally append "— Agent N" or your stream initial when you edit.

---

## Stream A — Primary dev (Phase 0, Phase D, infra)

*Owner: main GTM/backend agent.*

### Phase 0: Harden & Deploy
- [x] Requirements/architecture/security design documented (see GTM_PROGRESS 3.0.1). — DEPLOY §0.
- [x] Work breakdown and risks (3.0.2); tracking in backlog. — DEPLOY §0 (work breakdown, risks, mitigation); GTM_PROGRESS for sign-off.
- [x] Build: env config, Dockerfile, frontend build, branch protection.
- [x] Test: CI (fmt, clippy, test); integration tests pass (set RATE_LIMIT_MAX=1000 for integration tests).
- [ ] Smoke: After deploy, health/version and frontend load.
- [ ] Deploy: Version tag, pre-deploy staging, secrets, TLS (DEPLOY §5), post-deploy smoke. — Tag v0.2.0-phase0 prepared (see docs/RELEASE_v0.2.0-phase0.md); create after commit. Smoke script: scripts/smoke.sh (DEPLOY §11).
- [x] Run production/SPA/Docker checklists; fix or document gaps. — Done: [checklists/PHASE0_CHECKLIST_RUN.md](checklists/PHASE0_CHECKLIST_RUN.md); DEPLOY §10; Docker run §2 updated (limits, cap-drop note); gaps documented.
- [x] BCDR: RTO/RPO in DEPLOY; backups automated; runbook (restore, rollback, contact); owner assigned. — DEPLOY §6 (RTO 4h, RPO 24h; runbook steps; owner placeholder).

### Phase D: Admin UI & Audit
- [x] Backend: GET /api/v1/admin/users (admin only); PATCH /api/v1/admin/users/:id (role, is_active); users.is_active (migration 004).
- [x] Frontend: Admin area layout; Users list (email, name, role, status); User edit modal (role, active/inactive). Cannot deactivate self.
- [x] Frontend: Audit view — list audit events; filter by date/user/action; optional export (audit currently in logs only). — Backend: audit_events table (migration 005), record_audit_event in handlers, GET /api/v1/admin/audit; frontend /admin/audit with filters and Export JSON.
- [ ] Optional: System config (feature flags, maintenance mode) in admin.

### Other (Stream A)
- [ ] OpenAPI/Swagger (utoipa) if added; release notes for next tag.

---

## Stream B — Branding & assets

*Owner: branding agent. Update only this section.*

### Logo & favicon
- [x] Logo concept (symbol + wordmark "Legacy Vault") per GTM_PLAN §1.3. — Design brief in docs/LOGO_CONCEPT.md; reference sketch docs/brand/logo-concept.svg. Current favicon unchanged unless adopted.
- [x] Symbol-only for favicon; favicon set 16×16, 32×32, 180×180 (Apple Touch); optional 192×192, 512×512. — SVG in app/ + public/; Apple Touch uses same SVG via metadata.icons.
- [x] Favicon and app icons wired in frontend (layout, app icons if PWA). — layout.tsx metadata.icons (icon + apple); Next.js serves app/icon.svg; public/icon.svg for explicit /icon.svg.

### Meta & OG
- [x] Meta title and description in layout (Legacy Vault, slogan).
- [x] Open Graph image (1200×630) or equivalent; og:image in layout/marketing pages. — opengraph-image.tsx (ImageResponse) with Legacy Vault + slogan; openGraph in metadata.

### Consistency
- [x] All public pages use GTM color palette and typography (see GTM_PLAN §1.4). — Home, estate plan list/card, beneficiary card/form, loading state: GTM hex (#0f172a, #334155, #0ea5e9, #f8fafc, #e2e8f0, #ef4444).
- [x] README and any marketing copy use "Legacy Vault" and slogan consistently. — Repo README and frontend README updated with name + slogan; frontend lib/api.ts comment aligned. Second pass: GITHUB_SEARCH_QUERIES, DEPLOY title/table updated.

**Stream B summary (for main agent):** Stream B complete. Logo concept added (docs/LOGO_CONCEPT.md + docs/brand/logo-concept.svg); consistency pass fixed stray “Estate Planning Rust” / “Bitcoin Estate Planning” in GITHUB_SEARCH_QUERIES and DEPLOY.

---

## Stream C — Legal & compliance

*Owner: legal/compliance agent. Update only this section.*

### Terms of Service
- [x] Placeholder ToS page at /terms; linked in footer.
- [x] ToS expanded: RUFADAA/digital estate disclaimer (planning tool, not legal advice); acceptable use; termination; contact. Replace placeholder content. — Agent 3

### Privacy Policy
- [x] Placeholder Privacy page at /privacy; linked in footer.
- [x] Privacy expanded: controller identity; purposes and legal bases; retention (align with GTM_PLAN §1.5.2 table); data subject rights (access, erasure, portability, etc.); cookie/analytics if any; international transfers if any. Replace placeholder content. — Agent 3

### User rights (implementation already in progress)
- [x] Account deletion: document cascade (estate_plans/beneficiaries) and implement if not done. — Main agent: DEPLOY §9; POST /api/v1/me/delete (password); Account page "Delete account" with confirm.
- [x] Data export: document or implement "export my plans/beneficiaries as JSON" if not done. — Main agent: GET /api/v1/me/export; Account page "Export my data" download.
- [x] In-app disclaimer: short "digital estate planning tool, not legal advice" line added in footer with link to ToS (GTM §1.5.1). — Agent 3

### Other (Stream C)
- [x] Optional: "How we handle your data" or security summary page; customer support channel documented (GTM §8.3, §1.5.3). — Agent 3: /data page (summary), /contact page (support email placeholder + 48–72h response); DEPLOY.md §8 Customer support; footer links to Data & security, Contact.
- [x] Optional follow-up: /data and /contact reviewed; GDPR complaint right and Contact link added; DEPLOY §8 "before launch" placeholder note strengthened. — Agent 3

---

## Cross-cutting (any agent)

- [x] GTM_PROGRESS.md updated when a phase or section is completed (can be done by the agent who did the work).
- [x] VERSION_STATE_AND_NEXT_STEPS.md updated after significant releases or phase completion. — Updated after Phase 0 design, Phase D audit, user rights.
- [x] Main agent reviewed Stream B and Stream C deliverables (logo concept, consistency, /data, /contact, DEPLOY §8). — No issues or duplicates; DEPLOY §8 placeholder wording normalized to Markdown.

---

## Reference

- Full plan: [GTM_PLAN.md](GTM_PLAN.md)
- Detailed phase checklist: [GTM_PROGRESS.md](GTM_PROGRESS.md)
- Deploy & TLS & BCDR: [DEPLOY.md](DEPLOY.md)
