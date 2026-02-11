# Legacy Vault — Live Site and Portfolio (thegeeksnextdoor.com)

This file records how the Legacy Vault app is exposed on **thegeeksnextdoor.com** and how to keep it accessible. The actual site and portfolio live in the **Server_Management_Lunaverse** project; this doc is the single reference from the Legacy Vault repo.

For the latest deploy handoff (what Agent 2 completed and what remains for verification), see [AGENT2_HANDOFF_LEGACY_VAULT_LIVE.md](AGENT2_HANDOFF_LEGACY_VAULT_LIVE.md).

---

## Public URLs (after deploy)

| Purpose | URL |
|--------|-----|
| **Homepage** | https://thegeeksnextdoor.com |
| **Portfolio index** | https://thegeeksnextdoor.com/portfolio or https://thegeeksnextdoor.com/portfolio/ |
| **Legacy Vault project page** | https://thegeeksnextdoor.com/portfolio/legacy-vault.html |
| **Try the app (Lab)** | https://thegeeksnextdoor.com/lab — then use the **Legacy Vault (Bitcoin Estate)** link to open the app |
| **Legacy Vault app (direct)** | https://estate.thegeeksnextdoor.com — the running app (login/register, estate plans). Requires API + frontend deployed; see **Deploying the Legacy Vault app** below. |
| **Legacy Vault API** | https://estate-api.thegeeksnextdoor.com — used by the frontend; no direct user link. |

Nginx and DNS for **estate** and **estate-api** are configured in Server_Management_Lunaverse. Access is also possible via **Lab** (links to server IP:3000) or LAN.

---

## User flow

1. **Homepage** → “Legacy Vault” card → **View project →** → `/portfolio/legacy-vault.html`
2. **Portfolio project page** → **Try the app** / **Open via Lab** → `/lab` → click Legacy Vault / Bitcoin Estate to open the running app
3. **Portfolio index** (`/portfolio/` or `/portfolio/index.html`) → Legacy Vault card → `legacy-vault.html`

---

## Server-side (reference only)

- **Legacy Vault frontend:** `http://192.168.8.2:3000` (LAN) or **https://estate.thegeeksnextdoor.com** (public, when deployed).
- **Legacy Vault API:** `http://192.168.8.2:8001` (LAN) or **https://estate-api.thegeeksnextdoor.com** (public, when deployed).
- **Portfolio static site:** served by the site’s web server (e.g. nginx on 8081 or the main site port). The **portfolio/** folder (including `legacy-vault.html`) must be deployed to whatever path serves `/portfolio/`.

Port and host come from Server_Management_Lunaverse; see that repo for SERVER_APPS and nginx/site config.

---

## Deploying site changes (run from Server_Management_Lunaverse)

1. **Homepage (and lab)**  
   ```bash
   ./scripts/deploy-thegeeksnextdoor-homepage.sh
   ```

2. **Portfolio (including legacy-vault.html)**  
   From Server_Management_Lunaverse, either:
   - **Option A (script):** `./scripts/deploy-portfolio-to-server.sh` — rsyncs to `~/portfolio_deploy/` on the server, then prints the exact commands to run on the server to copy to `/var/www/portfolio`.
   - **Option B (manual):** `rsync -av portfolio/ USER@LUNAVERSE_HOST:~/portfolio_deploy/`, then SSH to the server and run:
     ```bash
     sudo mkdir -p /var/www/portfolio
     sudo cp -r ~/portfolio_deploy/* /var/www/portfolio/
     sudo chown -R www-data:www-data /var/www/portfolio
     sudo chmod -R 755 /var/www/portfolio
     ```
   If your site serves portfolio from a different path, use that instead of `/var/www/portfolio`.

### One-time (or after each portfolio deploy): server-side step

Because the deploy user cannot write to `/var/www/portfolio`, after running Option A or B you must SSH to the server and run (use `USER@LUNAVERSE_HOST` and port from Server_Management_Lunaverse `.env`):

```bash
ssh -p ${LUNAVERSE_SSH_PORT:-22} ${LUNAVERSE_SSH_USER}@${LUNAVERSE_HOST}   # e.g. luna@192.168.8.2
sudo mkdir -p /var/www/portfolio
sudo cp -r ~/portfolio_deploy/* /var/www/portfolio/
sudo chown -R www-data:www-data /var/www/portfolio
sudo chmod -R 755 /var/www/portfolio
```

If the server uses a different document root for the service on port 8081 (see nginx or Server_Management_Lunaverse docs), use that path instead of `/var/www/portfolio` and document it in LIVE_SITE_AND_PORTFOLIO and in Server_Management_Lunaverse (e.g. `docs/SERVER_APPS_AND_SERVICES_TABLE.md` or `docs/DOMAIN_SETUP_INSTRUCTIONS.md`).

Then nginx (or whatever serves `/portfolio`) will serve the updated files, including **legacy-vault.html**.

---

## Deploying the Legacy Vault app (so it runs at the correct sub-link)

To have the app load at **https://estate.thegeeksnextdoor.com** (and the API at **https://estate-api.thegeeksnextdoor.com**), deploy both the API and the frontend from this repo. Nginx and DNS for those subdomains are already set in Server_Management_Lunaverse.

**Prerequisites:** Same `.env` as in [DEPLOY.md](DEPLOY.md): `LUNAVERSE_HOST`, `LUNAVERSE_SSH_USER`, `POSTGRES_*`; optional `LUNAVERSE_SSH_PASSWORD`, `LUNAVERSE_SSH_PORT`. Node.js is required on the server for the frontend (standalone Node server).

1. **Deploy the API (Rust, port 8001)** — from workspace root or Estate_Planning_Rust:
   ```bash
   source .env
   ./Estate_Planning_Rust/scripts/deploy-to-lunaverse.sh
   ```
   Use `CREATE_DB=1` once if the database does not exist. The API CORS allows `https://estate.thegeeksnextdoor.com` and `http://estate.thegeeksnextdoor.com` so the browser can call the API when the user is on the estate subdomain.

2. **Deploy the frontend (Next.js, port 3000)** — from workspace root or Estate_Planning_Rust:
   ```bash
   source .env
   ./Estate_Planning_Rust/scripts/deploy-frontend-to-lunaverse.sh
   ```
   This builds the frontend with `NEXT_PUBLIC_API_URL=https://estate-api.thegeeksnextdoor.com` (override with env if needed), uploads the standalone build to the server, and starts it on port 3000. The script uses `~/legacy-vault-frontend` on the server by default.

3. **Restart frontend only (after a frontend-only change):**
   ```bash
   ssh -p ${LUNAVERSE_SSH_PORT:-22} ${LUNAVERSE_SSH_USER}@${LUNAVERSE_HOST} \
     'LEGACY_VAULT_FRONTEND_DIR=~/legacy-vault-frontend PORT=3000 ~/legacy-vault-frontend/start-frontend-on-server.sh'
   ```
   Or run the full `deploy-frontend-to-lunaverse.sh` again to redeploy and restart.

4. **After server reboot:** The API container restarts automatically (Docker `--restart unless-stopped`). The frontend does not; run the start script above or add a systemd unit for `~/legacy-vault-frontend/start-frontend-on-server.sh`.

**Verify:** Open https://estate.thegeeksnextdoor.com — you should see the Legacy Vault login/register page. If you see connection refused or CORS errors, ensure (1) API is running on the server (`curl http://127.0.0.1:8001/health`), (2) frontend is running on 3000 (`curl http://127.0.0.1:3000/`), and (3) DNS A records for **estate** and **estate-api** point to the server (see Server_Management_Lunaverse `docs/DOMAIN_SETUP_INSTRUCTIONS.md`).

### Future deploys (quick reference)

- **Homepage/lab:** `cd Server_Management_Lunaverse && ./scripts/deploy-thegeeksnextdoor-homepage.sh`  
  If the script fails on `chown`, use scp (from Server_Management_Lunaverse):  
  `scp -P 22 thegeeksnextdoor-homepage/index.html thegeeksnextdoor-homepage/lab.html luna@192.168.8.2:/var/www/thegeeksnextdoor/`
- **Portfolio:** `cd Server_Management_Lunaverse && ./scripts/deploy-portfolio-to-server.sh`, then run the `sudo` commands above on the server once per deploy.
- **Legacy Vault app (estate.thegeeksnextdoor.com):** `./Estate_Planning_Rust/scripts/deploy-to-lunaverse.sh` (API) and `./Estate_Planning_Rust/scripts/deploy-frontend-to-lunaverse.sh` (frontend). See **Deploying the Legacy Vault app** above.

### Verify service on port 8081 (server-side)

Nginx proxies `thegeeksnextdoor.com/portfolio` to `http://127.0.0.1:8081/`. The service on 8081 must use document root `/var/www/portfolio` (or the path you used in the server-side step). After copying portfolio files:

- On the server run: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/` and `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/legacy-vault.html`. Both must return **200**. If `/` returns 200 but `/legacy-vault.html` returns 404, the document root is missing the copied files — re-run the server-side copy step.

---

## Checklist: app accessible via correct link

Run these checks from a machine that can reach **thegeeksnextdoor.com**. For each item, note pass/fail and one line: what was checked and, if it failed, what failed.

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 1 | **Homepage:** Open https://thegeeksnextdoor.com/. Page must contain "Legacy Vault" and a link to `/portfolio/legacy-vault.html` (e.g. "View project"). | ☐ Pass / ☐ Fail | |
| 2 | **Portfolio index:** Open https://thegeeksnextdoor.com/portfolio (or /portfolio/). Return 200; body must contain link to legacy-vault.html or "Legacy Vault". | ☐ Pass / ☐ Fail | |
| 3 | **Legacy Vault project page:** Open https://thegeeksnextdoor.com/portfolio/legacy-vault.html. Return 200. Page must contain "Legacy Vault", "Open via Lab" linking to /lab, and GitHub link https://github.com/CupofJavad/Bitcoin_Estate_Planning_Tool_Rust. | ☐ Pass / ☐ Fail | |
| 4 | **Lab:** Open https://thegeeksnextdoor.com/lab. Return 200 (after auth if enabled). Page must contain a clear link to the app (e.g. "Legacy Vault (Bitcoin Estate)" → :3000). | ☐ Pass / ☐ Fail | |
| 5 | **App loads:** From Lab, click the Legacy Vault link. App must load (login or register page). If connection refused / CORS: fix `NEXT_PUBLIC_API_URL`, CORS, and ensure frontend and API are running (:3000, :8001). | ☐ Pass / ☐ Fail | |
| 6 | **Direct app URL:** Open https://estate.thegeeksnextdoor.com. Return 200; page must show Legacy Vault login or register. Requires API + frontend deployed (see **Deploying the Legacy Vault app**). | ☐ Pass / ☐ Fail | |

**Example failure note:** "thegeeksnextdoor.com/portfolio/legacy-vault.html returned 404" or "Lab link to app returned connection refused."


---

## Last verified and summary

- **Last verified:** *(Run verification from a machine that can reach thegeeksnextdoor.com, then fill in date.)*
- **One-line result:** Homepage Legacy Vault card → portfolio page → Lab → app: *[all pass / list any failure].*

---

## Public subdomain (estate / estate-api)

The app is exposed at **estate.thegeeksnextdoor.com** and the API at **estate-api.thegeeksnextdoor.com** via nginx server blocks in Server_Management_Lunaverse (proxying to ports 3000 and 8001). DNS A records for **estate** and **estate-api** must point to the server; see Server_Management_Lunaverse `docs/DOMAIN_SETUP_INSTRUCTIONS.md`. Deploy the API and frontend as in **Deploying the Legacy Vault app** above so the app runs at the correct sub-link.
