# Agent 2 → Agent 3 handoff: Legacy Vault live on website

**Date:** 2025-02-07  
**Agent 2 completed:** 2.1–2.3. Server-side step (2.4) and 8081 verification (2.5) require the user to run sudo on the server.

---

## 1. Homepage deploy and portfolio server-side step

| Step | Status | Notes |
|------|--------|--------|
| **2.1 Prerequisites** | Done | `.env` in Server_Management_Lunaverse has `LUNAVERSE_HOST=192.168.8.2`, `LUNAVERSE_SSH_USER=luna`, `LUNAVERSE_SSH_PORT=22`. |
| **2.2 Homepage and lab** | Done (fallback) | `deploy-thegeeksnextdoor-homepage.sh` failed on remote `chown`. Fallback used: `scp` of `index.html` and `lab.html` to `luna@192.168.8.2:/var/www/thegeeksnextdoor/`. Both files verified on server. |
| **2.3 Portfolio to server (staging)** | Done | `deploy-portfolio-to-server.sh` ran successfully. `~/portfolio_deploy/index.html` and `~/portfolio_deploy/legacy-vault.html` exist on the server. |
| **2.4 Server-side copy to web root** | **Pending (user)** | Agent 2 cannot run `sudo` on the server. User must run on server: `sudo mkdir -p /var/www/portfolio`, `sudo cp -r ~/portfolio_deploy/* /var/www/portfolio/`, `sudo chown -R www-data:www-data /var/www/portfolio`, `sudo chmod -R 755 /var/www/portfolio`. |
| **2.5 Verify 8081** | **Pending (after 2.4)** | From server: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/` returned 200; `.../legacy-vault.html` returned 404 (portfolio not yet copied to `/var/www/portfolio`). After user runs 2.4, both must return 200. |
| **2.6 Optional subdomain** | Skipped | Not requested. |

---

## 2. Exact URLs to verify (Agent 3)

| URL | Expected |
|-----|----------|
| **https://thegeeksnextdoor.com/** | 200; page contains "Legacy Vault" and link to `/portfolio/legacy-vault.html` ("View project"). |
| **https://thegeeksnextdoor.com/portfolio** or **/portfolio/** | 200; contains link to `legacy-vault.html` or "Legacy Vault". |
| **https://thegeeksnextdoor.com/portfolio/legacy-vault.html** | 200; contains "Legacy Vault", "Open via Lab" (or "Try the app") → `/lab`, and GitHub repo link. |
| **https://thegeeksnextdoor.com/lab** | 200 (after auth if configured); contains link to Legacy Vault / Bitcoin Estate app (e.g. http://192.168.8.2:3000). |

**Note:** `/portfolio/legacy-vault.html` will return 404 until the user runs the server-side step (2.4) and files are in `/var/www/portfolio`.

---

## 3. 8081 checks

- **Before server-side copy:** `http://127.0.0.1:8081/` → 200; `http://127.0.0.1:8081/legacy-vault.html` → 404.
- **After server-side copy:** Both should return 200. Document root for the service on 8081 is `/var/www/portfolio` (per nginx-thegeeksnextdoor.conf and setup-portfolio.sh).

---

## 4. Optional subdomain

Not added. No estate.thegeeksnextdoor.com URL or caveats.

---

## 5. What Agent 3 should do

1. **If the user has not yet run the server-side step (2.4):** In the handoff or LIVE_SITE_AND_PORTFOLIO.md, state that the portfolio page will 404 until the user runs the four `sudo` commands on the server (see LIVE_SITE_AND_PORTFOLIO.md “One-time (or after each portfolio deploy): server-side step”).
2. **Verify public URLs** (3.1) once the site is reachable — homepage, /portfolio, /portfolio/legacy-vault.html, /lab.
3. **Optionally clarify Lab link text** (3.2) — e.g. “Legacy Vault (Bitcoin Estate)” if needed.
4. **Update LIVE_SITE_AND_PORTFOLIO.md** (3.3–3.5): checklist results, “Last verified” date, and any failed item with one-line description.
