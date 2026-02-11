# Prompt for Server_Management_Lunaverse Agent — Legacy Vault Site Setup

**Copy the entire section below ("Handoff prompt") and paste it into your other Cursor project/window where the agent manages the Server_Management_Lunaverse workspace. That agent will have everything needed to set up Legacy Vault on the server without interfering with other projects.**

---

## Handoff prompt (copy from here)

You manage the **Server_Management_Lunaverse** workspace and website deployments for **thegeeksnextdoor.com**. Another project (**Bitcoin_Estate_Planning_Tool_Rust**) has an app called **Legacy Vault** that must be exposed via your site. Your job is to ensure the site is set up on the server correctly and that Legacy Vault uses only its designated ports and paths so it does not interfere with other projects.

### Context and source of truth

- **App name:** Legacy Vault (multi-chain estate planning; frontend + Rust API + PostgreSQL).
- **Upstream repo:** Bitcoin_Estate_Planning_Tool_Rust (Estate_Planning_Rust). You do **not** need to open that repo; all deploy and nginx details that touch your server are described below or live in **your** workspace (Server_Management_Lunaverse).
- **Single reference doc (in the other repo):** `Estate_Planning_Rust/docs/LIVE_SITE_AND_PORTFOLIO.md` — it records public URLs, deploy steps, and server-side paths. If you need to align with what the other project expects, that file is the source of truth. Your workspace holds the **actual** site files and deploy scripts.

### Objective

1. Ensure **homepage**, **lab**, and **portfolio** (including Legacy Vault’s dedicated page) are deployed and served so that:
   - **https://thegeeksnextdoor.com/** shows a Legacy Vault card linking to `/portfolio/legacy-vault.html`.
   - **https://thegeeksnextdoor.com/portfolio** and **https://thegeeksnextdoor.com/portfolio/legacy-vault.html** load (200).
   - **https://thegeeksnextdoor.com/lab** loads and contains a clear link to the Legacy Vault app (frontend). That link should open the app (login/register page).
2. Use **only** the ports and paths assigned to Legacy Vault and the portfolio so **other projects on the same server are not affected**.

### Ports and paths (do not conflict with other apps)

| Purpose | Port or path | Notes |
|--------|----------------|--------|
| **Main site (homepage, lab)** | `/var/www/thegeeksnextdoor/` | Served by your main nginx (e.g. port 80/443). Files: `index.html`, `lab.html`. |
| **Portfolio (static)** | **Port 8081**, document root **`/var/www/portfolio`** | Nginx proxies `thegeeksnextdoor.com/portfolio` → `http://127.0.0.1:8081/`. The service on 8081 must serve from `/var/www/portfolio` (must contain `index.html`, `legacy-vault.html`, etc.). **Do not use 8081 for any other project.** |
| **Legacy Vault frontend** | **Port 3000** | The app’s Next.js frontend. Lab links to it (e.g. `http://192.168.8.2:3000`). **Do not use 3000 for another app.** |
| **Legacy Vault API** | **Port 8001** | The app’s Rust API. Frontend calls it via `NEXT_PUBLIC_API_URL`. **Do not use 8001 for another app.** |

If your server already uses 3000 or 8001 for something else, you must either move the other service or coordinate with the Legacy Vault project to use different ports; document the final choice in your `SERVER_APPS_AND_SERVICES_TABLE.md`.

### File locations in your workspace (Server_Management_Lunaverse)

| What | Path in your repo |
|------|--------------------|
| Homepage | `thegeeksnextdoor-homepage/index.html` |
| Lab (links to Legacy Vault and other apps) | `thegeeksnextdoor-homepage/lab.html` |
| Portfolio index | `portfolio/index.html` |
| Legacy Vault project page | `portfolio/legacy-vault.html` |
| Deploy homepage + lab | `scripts/deploy-thegeeksnextdoor-homepage.sh` |
| Deploy portfolio to server (staging) | `scripts/deploy-portfolio-to-server.sh` |
| Nginx config (reference) | `scripts/server/nginx-thegeeksnextdoor.conf` |
| Server apps / services table | `docs/SERVER_APPS_AND_SERVICES_TABLE.md` |
| Domain / setup notes | `docs/DOMAIN_SETUP_INSTRUCTIONS.md` |

### Required steps (in order)

1. **Prerequisites**  
   In Server_Management_Lunaverse, ensure `.env` exists with at least: `LUNAVERSE_HOST`, `LUNAVERSE_SSH_USER`, `LUNAVERSE_SSH_PORT` (default 22). If deploy scripts use `LUNAVERSE_SSH_PASSWORD`, set it.  
   Check: `source .env 2>/dev/null; echo "HOST=$LUNAVERSE_HOST USER=$LUNAVERSE_SSH_USER PORT=$LUNAVERSE_SSH_PORT"` — all non-empty.

2. **Deploy homepage and lab**  
   Run: `./scripts/deploy-thegeeksnextdoor-homepage.sh`.  
   If it fails on remote `chown`, use fallback:  
   `scp -P ${LUNAVERSE_SSH_PORT:-22} thegeeksnextdoor-homepage/index.html thegeeksnextdoor-homepage/lab.html ${LUNAVERSE_SSH_USER}@${LUNAVERSE_HOST}:/var/www/thegeeksnextdoor/`  
   Verify on server: `ls -la /var/www/thegeeksnextdoor/index.html /var/www/thegeeksnextdoor/lab.html`.

3. **Deploy portfolio to server (staging)**  
   Run: `./scripts/deploy-portfolio-to-server.sh`.  
   Script rsyncs `portfolio/` to `~/portfolio_deploy/` on the server and prints server-side commands. Verify on server: `ls -la ~/portfolio_deploy/index.html ~/portfolio_deploy/legacy-vault.html`.

4. **Server-side step: copy portfolio to web root**  
   **You must run this on the server** (SSH as deploy user; sudo required). If your nginx serves `/portfolio` from a different path than `/var/www/portfolio`, use that path instead and document it.  
   ```bash
   sudo mkdir -p /var/www/portfolio
   sudo cp -r ~/portfolio_deploy/* /var/www/portfolio/
   sudo chown -R www-data:www-data /var/www/portfolio
   sudo chmod -R 755 /var/www/portfolio
   ```  
   Verify: `ls -la /var/www/portfolio/` must show `index.html` and `legacy-vault.html`.

5. **Verify service on port 8081**  
   Nginx should proxy `thegeeksnextdoor.com/portfolio` to `http://127.0.0.1:8081/`. The process listening on 8081 must use document root `/var/www/portfolio` (or the path you used above).  
   On the server run:  
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/` → must be **200**  
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/legacy-vault.html` → must be **200**  
   If 8081 is not listening or document root is wrong, fix the nginx/server config for **port 8081 only** (e.g. `scripts/server/nginx-thegeeksnextdoor.conf` or `scripts/server/setup-portfolio.sh`). Do not change server blocks for other projects.

6. **Document in your repo**  
   - If the portfolio document root is **not** `/var/www/portfolio`, add a short note in `docs/SERVER_APPS_AND_SERVICES_TABLE.md` or `docs/DOMAIN_SETUP_INSTRUCTIONS.md` with the actual path and that port 8081 serves the portfolio.  
   - Ensure Legacy Vault is listed in `SERVER_APPS_AND_SERVICES_TABLE.md`: frontend port **3000**, API port **8001**, and that access is via Lab (or document a direct subdomain if you add one later).

### Avoiding interference with other projects

- Use **only** ports **3000**, **8001**, and **8081** for Legacy Vault and portfolio as above. Do not reassign these to other apps.
- The **portfolio** is served only by the service on **8081** with root `/var/www/portfolio`. Do not put other projects’ files in `/var/www/portfolio`.
- Homepage and lab live in `/var/www/thegeeksnextdoor/`; do not overwrite or mix in files from other projects there.
- When editing nginx configs, change only the server block or location that handles `thegeeksnextdoor.com` and `/portfolio` (and, if you add it, `estate.thegeeksnextdoor.com`). Leave other server blocks and ports unchanged.

### Optional (only if requested)

- **Direct public URL for Legacy Vault (e.g. estate.thegeeksnextdoor.com):** Add a new nginx server block that proxies to `http://127.0.0.1:3000` (and ensure the API on 8001 is reachable if the frontend calls it by host). Add DNS A record. Document in `SERVER_APPS_AND_SERVICES_TABLE.md` and in the other project’s `Estate_Planning_Rust/docs/LIVE_SITE_AND_PORTFOLIO.md`.

### Success criteria

- Homepage at thegeeksnextdoor.com shows a Legacy Vault card linking to `/portfolio/legacy-vault.html`.
- thegeeksnextdoor.com/portfolio and thegeeksnextdoor.com/portfolio/legacy-vault.html return 200.
- thegeeksnextdoor.com/lab returns 200 (after auth if configured) and contains a clear link to the Legacy Vault app (e.g. “Legacy Vault (Bitcoin Estate)” → :3000).
- From Lab, clicking that link opens the app (login or register page); frontend and API (3000 and 8001) are running and CORS/API URL are configured for the environment.
- Your docs (`SERVER_APPS_AND_SERVICES_TABLE.md` and, if needed, `DOMAIN_SETUP_INSTRUCTIONS.md`) state the portfolio deploy path and Legacy Vault ports so future deploys and other agents do not conflict with this or other projects.

---

## End of handoff prompt

After the Server_Management_Lunaverse agent completes the steps, the other project (Bitcoin_Estate_Planning_Tool_Rust) can run the verification checklist in `Estate_Planning_Rust/docs/LIVE_SITE_AND_PORTFOLIO.md` to confirm Homepage → portfolio → Lab → app all work.
