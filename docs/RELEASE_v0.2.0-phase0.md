# Release v0.2.0-phase0 — Phase 0 prep

**Date:** 2026-02-07  
**Scope:** DevOps prep for first production deploy. No new user-facing features in this tag.

## Highlights

- **Phase 0 checklists run:** [checklists/PHASE0_CHECKLIST_RUN.md](checklists/PHASE0_CHECKLIST_RUN.md) — going_to_production_serverside, going_to_production_spa, docker_secure_deployment, awesome_security_checklist; gaps documented.
- **Smoke script:** `scripts/smoke.sh [BASE_URL]` for post-deploy API check (health, version). See DEPLOY §11.
- **Deploy runbook:** DEPLOY §2 — Docker run with resource limits (`--memory=512m`, `--cpus=0.5`); optional `--cap-drop`; §11 smoke steps.
- **BCDR:** DEPLOY §6 — Owner placeholder and backup/restore test schedule added.

## Already in place (prior work)

- Auth (Phase A), Account (Phase C), user rights (delete account, data export), Phase D admin/audit.
- Stream B (branding): logo concept, favicon, OG, GTM consistency. Stream C (legal): ToS, Privacy, /data, /contact.
- CI with RATE_LIMIT_MAX=1000 for integration tests.

## After this tag

1. Deploy to server (DEPLOY §1–5); TLS (§5); set SECURE_COOKIE=true.
2. Run smoke: `./scripts/smoke.sh https://your-domain`; verify frontend and login.
3. Assign BCDR owner and schedule backup/restore test (DEPLOY §6).
4. Replace support email placeholder (DEPLOY §8) before public launch.

## Tag

```bash
# After committing Phase 0 prep changes:
git tag v0.2.0-phase0 -m "Phase 0 prep; see docs/RELEASE_v0.2.0-phase0.md"
git push origin v0.2.0-phase0   # when ready
```
