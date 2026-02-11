# Phase 0 checklist run — Legacy Vault

**Date:** 2026-02-07  
**Scope:** going_to_production_serverside, going_to_production_spa, docker_secure_deployment, awesome_security_checklist (see [DEPLOY.md §10](../DEPLOY.md)).

**Stack:** Rust/Axum API, Next.js frontend, PostgreSQL, Docker (optional), single region, nginx for TLS.

---

## 1. going_to_production_serverside

| Area | Status | Notes |
|------|--------|--------|
| Legal (licences, crypto, org) | Done | Standard Rust/JS deps; no crypto policy violation; org N/A. |
| Resiliency / Load balancing / HA | Deferred | Single node for Phase 0; multi-node and LB out of scope. |
| Transparent deployment (rolling, no session loss) | Deferred | Single node. |
| Supervising | Done | `--restart unless-stopped` in DEPLOY §2; app survives restart. |
| Logging | Done / Gap | Errors and request IDs logged; audit events. **Gap:** Log rotation (e.g. logrotate) not in repo — document on server. |
| Monitoring | Done / Gap | Health checks (`/health`, `/version`) in place. **Gap:** Alerts (error rate, 500s, resources) — configure on server or monitoring stack. |
| Backuping | Done / Gap | Restore steps in DEPLOY §6. **Gap:** Automate daily backups and run restore test (see §6 BCDR owner). |
| Security | Done / Gap | TLS and headers in DEPLOY §5; nginx terminates TLS. **Gap:** OWASP Top 10 audit — run before public launch; document in GTM_PROGRESS. |

---

## 2. going_to_production_spa

| Area | Status | Notes |
|------|--------|--------|
| Legal (licences, crypto, org) | Done | Standard deps; org N/A. |
| Accessibility | Gap | Not formally audited; consider a11y pass before launch. |
| Deployment | Done | Static export; nginx can serve with cache headers and gzip. |
| Versioning | Done | Next.js build produces hashed assets. |
| Assets | Done / Gap | 404: Next.js default. **Gap:** Maintenance page — add if needed for planned outages. |
| Security | Gap | OWASP / Observatory / securityheaders.io — run after TLS live. |

---

## 3. docker_secure_deployment

| Area | Status | Notes |
|------|--------|--------|
| Images from trusted repos | Done | We build from Dockerfile (Alpine/Rust); no untrusted base. |
| No --insecure-registry | Done | Not used. |
| Docker API not exposed over TCP | Done | Default; if exposed, use TLS and restrict access. |
| Logging (docker logs / archive) | Done | Use `docker logs`; document retention on host. |
| No --privileged | Done | DEPLOY §2 run does not use --privileged. |
| Non-root in container | Gap | Dockerfile may run as root; consider `USER` and `-u` in run (see checklist). |
| Resource limits (CPU, memory) | Gap | Add e.g. `-m 512m` and `--cpus` when running in production; document in DEPLOY. |
| Capabilities (cap-drop) | Gap | Consider `--cap-drop` setuid/setgid in production run. |
| SELinux/AppArmor | Deferred | Host-level; document if required by org. |

---

## 4. awesome_security_checklist

| Area | Status | Notes |
|------|--------|--------|
| HTTPS only, HTTP→HTTPS redirect | Done | DEPLOY §5; nginx. |
| HSTS | Done | DEPLOY §5. |
| TLS 1.2+ / ciphers / cert bits | Gap | Verify with SSLLabs after go-live; doc in §5. |
| X-Frame-Options, X-Content-Type-Options | Done | DEPLOY §5. |
| Passwords hashed (no cleartext) | Done | Argon2 in backend. |
| Entropy / strength at sign-up | Done | Length ≥ 8; consider stronger rules later. |
| Login throttling | Done | Rate limiting in API. |
| Session cookie Secure, HttpOnly | Done | SECURE_COOKIE in prod; cookie flags set. |
| CSRF | Done | Same-site cookie; API stateless with cookie auth. |
| Secrets not in repo | Done | Env-based config. |
| Authorization (user A cannot see B) | Done | Integration tests; scoped by user_id. |

---

## Summary and actions

- **Done:** Health/version, TLS design, security headers, session cookie, passwords hashed, rate limit, backups/restore documented, Docker run without privileged, logging and audit.
- **Gaps to fix or document before/after first prod deploy:**
  1. **Server:** Log rotation for app logs; monitoring/alerts; automate Postgres backups; run restore test (BCDR §6).
  2. **SPA:** Optional maintenance page; a11y and security scan (Observatory/securityheaders.io) after TLS.
  3. **Docker:** Add resource limits (`-m`, `--cpus`) and consider `--cap-drop` and non-root user in DEPLOY §2.
  4. **TLS:** Run SSLLabs after go-live; fix critical issues.

See [DEPLOY.md](../DEPLOY.md) §5 (TLS), §6 (BCDR), §10 (this run). Update this file when gaps are closed.
