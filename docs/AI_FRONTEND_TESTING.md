# AI Frontend Testing (Playwright MCP)

Use Cursor’s AI with the **Playwright MCP** to drive the Legacy Vault app in a real browser and test login, register, estate plans, and beneficiaries.

**Note:** If you restarted Cursor, any servers you started in Cursor’s terminal will have stopped. You must start the API and frontend again (see below) before using the AI frontend tool.

**Browser MCP not working?** The workspace has a single MCP config at the repo root (`.cursor/mcp.json`). If the AI can’t access or navigate the browser, see **[../../.cursor/README.md](../../.cursor/README.md)** for duplicate-config cleanup and reload steps, or **[PLAYWRIGHT_MCP_AGENT_SETUP_GUIDE.md](PLAYWRIGHT_MCP_AGENT_SETUP_GUIDE.md)** for a full reproducible setup and troubleshooting. See **[PLAYWRIGHT_MCP_FRONTEND_TESTING.md](PLAYWRIGHT_MCP_FRONTEND_TESTING.md)** for a short usage summary.

---

## Get the app up and running (do this first)

You need **two** processes: the Rust API and the Next.js frontend. Use two terminals (e.g. two tabs in Cursor’s integrated terminal).

### Terminal 1 — PostgreSQL (required for the API)

The API needs a running PostgreSQL.

**If you use Docker:** Start **Docker Desktop** first (open the app and wait until it’s ready). Then:

```bash
cd /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust
docker compose -f infra/docker-compose.yml up -d
```

Leave this running in the background. If you get **“Cannot connect to the Docker daemon”**, Docker isn’t running — open Docker Desktop and try again.

**If you don’t use Docker:** Use a local PostgreSQL (e.g. Homebrew or Postgres.app). Create the database: `psql -U postgres -c "CREATE DATABASE estate_planning_rust;"` (or the equivalent for your install). Set `DATABASE_URL` in `Estate_Planning_Rust/.env` to point at that instance (e.g. `postgres://USER:PASSWORD@localhost:5432/estate_planning_rust`).

If you see **`Error: PoolTimedOut`** when starting the API, Postgres wasn’t running or `DATABASE_URL` is wrong — fix the above, then start the API again.

### Terminal 2 — API

1. Open a terminal in Cursor (`` Ctrl+` `` or View → Terminal).
2. Run:

```bash
cd /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust
cargo run
```

3. Leave this running. You should see something like `Listening on 0.0.0.0:8000`. The API will be at http://localhost:8000 (health: http://localhost:8000/health).

### Terminal 3 — Frontend

1. Open a **second** terminal (click the **+** in the terminal panel or split the terminal).
2. Run:

```bash
cd /Users/Javad/Projects/Bitcoin_Estate_Planning_Tool_Rust/Estate_Planning_Rust/frontend
npm run dev
```

3. Leave this running. You should see **Local: http://localhost:3000** and **Network: http://192.168.8.224:3000**.

### Quick check

- In a browser, open http://localhost:3000 — the Legacy Vault page should load.
- Open http://localhost:8000/health — you should see `OK`.

If you see **"Failed to fetch"** when registering, the API is not running or the frontend can’t reach it; ensure Terminal 1 is still running and that `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`.

---

## How to start the AI frontend tool (detailed steps)

1. **Ensure the app is running**  
   Both the API (Terminal 1) and the frontend (Terminal 2) must be running as above. If you restarted Cursor, run those commands again.

2. **Confirm Playwright MCP is enabled**  
   You already enabled it and restarted Cursor. Optionally, in a **new Cursor chat**, ask: *“Do you have Playwright or browser tools?”* — the AI should say yes if the MCP is connected.

3. **Open the Cursor chat** where you want to run the test (e.g. Composer or a new chat).

4. **Paste this prompt** (or the shorter variant below) and send:

```
Open http://localhost:3000 in the browser. Test: (1) register or log in, (2) create an estate plan, (3) add a beneficiary to that plan. Report what worked and what failed.
```

5. **Let the AI run**  
   The AI will use the Playwright MCP to open a browser, navigate to the app, and go through the flows. It will report back what succeeded and what failed.

**To test the network URL** (e.g. from another device or to verify network binding), use this prompt instead:

```
Open http://192.168.8.224:3000 in the browser. Test: (1) register or log in, (2) create an estate plan, (3) add a beneficiary. Report what worked and what failed.
```

---

## Step 1: Start the app (reference)

**API (Rust):** From `Estate_Planning_Rust`:

```bash
cargo run
```

API: http://localhost:8000 (health: http://localhost:8000/health).

**Frontend (Next.js):** From `Estate_Planning_Rust/frontend`:

```bash
npm run dev
```

- **Local:** http://localhost:3000  
- **On network:** http://192.168.8.224:3000  

Both must be running for register/login to work.

---

## Step 2: Enable Playwright MCP in Cursor

- **Project config:** This workspace has **`.cursor/mcp.json`** at the repo root with the Playwright MCP server. Opening the project in Cursor may load it automatically.
- **If you don’t see it:**  
  - **Cursor Settings** (⌘+,) → search for **MCP** → **Add new MCP Server**  
  - **Name:** `playwright`  
  - **Command:** `npx @playwright/mcp@latest`  
  - Save. Restart Cursor or **Reload Window** (Command Palette → “Developer: Reload Window”) if the server doesn’t connect.
- **Check:** In the chat/composer, the AI should have access to browser tools (e.g. navigate, click, snapshot). Ask: “Do you have Playwright or browser tools?” to confirm.

---

## Step 3: Ask the AI to test the app

Use either URL depending on where you’re testing:

- **Local:** http://localhost:3000  
- **Network (e.g. from another device):** http://192.168.8.224:3000  

Example prompt:

```
Use the browser to open http://localhost:3000 and run through these flows:

1. **Register**  
   - Click Register (or the link to register).  
   - Fill email, password (8+ chars), optional name. Submit.  
   - Confirm you end up on the home/dashboard or see a success message.

2. **Login** (if already registered)  
   - Log in with the same credentials.  
   - Confirm you see the estate plans list or home.

3. **Estate plan**  
   - Click "Create Estate Plan".  
   - Fill name, description, optional BTC/XMR/STX addresses.  
   - Submit and confirm the plan appears in the list.

4. **Beneficiary**  
   - Open an estate plan (View Details or the one you created).  
   - Add a beneficiary (name, allocation %, optional email).  
   - Save and confirm the beneficiary appears.

5. **Report**  
   - List what worked and any errors (with page URL and what you clicked).
```

Shorter variant:

```
Open http://localhost:3000 in the browser. Test: (1) register or log in, (2) create an estate plan, (3) add a beneficiary to that plan. Report what worked and what failed.
```

For network testing from another machine, use:

```
Open http://192.168.8.224:3000 in the browser and run the same flows: register/login, create estate plan, add beneficiary. Report results.
```

---

## Troubleshooting

### "Waiting for approval" / browser stuck

When the AI tries to open or control the browser, **Cursor may show an approval prompt** that you must accept. If the agent says it’s "waiting for approval", the tool call is paused until you approve.

**What to do:**

1. **Look for the approval UI**  
   - **In the chat:** Check the message where the AI ran the tool. There is often an **Approve** / **Allow** (or similar) control **inline** in that message or in a small popover.  
   - **Above the input:** Sometimes a bar or button appears above the chat input asking to allow the action.  
   - **Cursor window:** Check for a modal or toast in the main Cursor window (not only the chat panel).

2. **Click Approve / Allow**  
   Once you approve, the browser action should continue. You may need to approve **once per tool call** (e.g. the first navigate or snapshot) or once per conversation, depending on Cursor’s behavior.

3. **If you never see a prompt**  
   - Reload the window (Command Palette → "Developer: Reload Window") and try the same request again.  
   - Ensure no other Cursor dialog or window is stealing focus; approval might be behind another window.  
   - Try a simpler request first (e.g. “Open http://localhost:3000 in the browser and take a snapshot”) so only one tool runs and the approval prompt is easier to spot.

4. **If it used to work**  
   After a Cursor or MCP restart, Cursor sometimes asks for approval again for “sensitive” actions (like launching a browser). Approve when prompted; subsequent runs in the same session may not ask again.

---

| Issue | What to do |
|-------|------------|
| **"Waiting for approval"** / browser stuck | Look for an **Approve** or **Allow** control in the chat message, above the input, or in a Cursor dialog; click it so the tool can run. See section above. |
| **`Error: PoolTimedOut`** when running API | PostgreSQL is not running or unreachable. If using Docker: **start Docker Desktop**, then `docker compose -f infra/docker-compose.yml up -d`. If you see “Cannot connect to the Docker daemon”, Docker isn’t running — open Docker Desktop. Otherwise use a local Postgres and set `DATABASE_URL` in `.env`. Then run `cargo run` again. |
| **"Failed to fetch"** on register/login | API not running or wrong URL. Start API: `cd Estate_Planning_Rust && cargo run` (after Postgres is up). Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`. If frontend is on 192.168.8.224, the API must be reachable from the browser (e.g. run API with `API_HOST=0.0.0.0` and use `NEXT_PUBLIC_API_URL=http://192.168.8.224:8000` from that host). |
| **CORS errors** / **Login or register does not redirect** | API must send `Access-Control-Allow-Credentials: true` and a specific origin (not `*`). See **Troubleshooting → Login/register not redirecting** below. |
| AI says it has no browser tools | Add Playwright MCP in Cursor Settings → MCP, then reload the window. |
| Page doesn’t load | Ensure `npm run dev` is running in `Estate_Planning_Rust/frontend` and use the URL it prints. |
| MCP server fails to start | Ensure Node.js 18+ is installed; run `npx @playwright/mcp@latest` in a terminal to see errors. |

---

### Login/register not redirecting

If the UI shows "Signing in..." or the register form submits but you stay on `/login` or `/register` (no redirect to home):

1. **Check CORS**  
   The API must send `Access-Control-Allow-Credentials: true` and a **specific** origin matching the URL you use to open the app, not `*`. With `credentials: 'include'` in the frontend, the browser will not store the `Set-Cookie` from login/register if the response uses `Access-Control-Allow-Origin: *` or if your app’s origin is not in the allowed list. Ensure `main.rs` uses `.allow_credentials(true)` and allows your frontend origin. The API currently allows `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:3001`, and `http://127.0.0.1:3001`. If you use another port or host, add it to the `allowed_origins` array in `main.rs` and restart the API.

2. **Check `NEXT_PUBLIC_API_URL`**  
   In `frontend/.env.local` set `NEXT_PUBLIC_API_URL=http://localhost:8000` (or the URL the browser uses to reach the API). If the frontend is on a different host (e.g. 192.168.x.x), the API must be reachable from that host and CORS must allow that origin.

3. **Check cookie in DevTools**  
   After clicking Sign in or Register, open DevTools → Application → Cookies (for the API origin, e.g. localhost:8000). Confirm the login/register response has a `Set-Cookie` header and that the next request (e.g. `GET /api/v1/me`) sends that cookie. If the cookie is missing or not sent, CORS or SameSite/domain settings are likely the cause (see above).

---

## How to run E2E (scripted vs MCP)

For repeatable verification without MCP, run the **scripted E2E suite** (see [E2E_TEST_REPORT.md](E2E_TEST_REPORT.md) §5 and the **Scripted E2E** subsection there). The canonical order is: scripted first, then MCP scenarios if snapshot refs are available.

### Scripted E2E suite (`npm run e2e`)

**Prerequisites:** Same as for the app: Postgres running, API running (`cd Estate_Planning_Rust && cargo run`), frontend running (`cd Estate_Planning_Rust/frontend && npm run dev`), and `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

**Command:** From `Estate_Planning_Rust/frontend` run:

```bash
npm run e2e
```

Optional: set `PLAYWRIGHT_BASE_URL` if the app is on a different URL (e.g. `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run e2e`).

**What it runs:** Auth scenarios 1.1–1.6 from [E2E_TEST_PLAN.md](E2E_TEST_PLAN.md) (public redirect, register happy path and validation, login happy path and validation, logout). Tests use `@playwright/test` and live in `frontend/tests/e2e/`.

---

## Optional: Generate Playwright tests

With Playwright MCP enabled, you can ask the AI:

- *“Generate a Playwright test that opens http://localhost:3000, registers or logs in, creates an estate plan, and adds a beneficiary. Save it under `Estate_Planning_Rust/frontend/tests/e2e/`.”*

The AI can use the browser to explore the UI and emit `@playwright/test` code.
