# Playwright MCP — Frontend Testing (Legacy Vault)

Playwright MCP is set up for this workspace so Cursor’s AI agent can drive a browser and test the Legacy Vault frontend.

---

## Setup status

- **Config:** Workspace root `.cursor/mcp.json` registers the Playwright MCP server (`npx -y @playwright/mcp@latest`).
- **No local install needed:** `npx` fetches and runs the package; no project `package.json` is required for MCP.
- **First run:** Playwright may download browser binaries (e.g. Chromium) once; ensure network access.

---

## Requirements

- **Node.js 18+** and **npx** (usually with Node).
- **Cursor** with this workspace open. After changing `.cursor/mcp.json`, **reload the window** (Command Palette → “Developer: Reload Window”).
- In **Chat/Agent**, ensure **Playwright** (or “playwright”) is **enabled** in the MCP tools list.

---

## What to test (Legacy Vault)

- **Frontend:** Next.js app in `Estate_Planning_Rust/frontend`. Start with `npm run dev` → **http://localhost:3000**
- **API:** Rust API in `Estate_Planning_Rust`. Start with `cargo run` → **http://localhost:8000** (and Postgres; see below)

Get the app running first: [AI_FRONTEND_TESTING.md](AI_FRONTEND_TESTING.md) (Docker/Postgres, API, frontend).

---

## Example prompts (Chat/Agent)

- *“Use the browser to open http://localhost:3000 and take a snapshot.”*
- *“Open http://localhost:3000, go to the login page, and describe what you see.”*
- *“Use the browser to test the Legacy Vault flow: register a user, then create an estate plan.”*
- *“Generate a Playwright test for the Legacy Vault login page and save it under Estate_Planning_Rust/frontend/tests/e2e/.”*

The agent will use Playwright MCP tools (navigate, click, snapshot, type, etc.) to drive the browser and can generate or run Playwright tests if you ask.

---

## If Playwright doesn’t appear or tools fail

- Follow **[PLAYWRIGHT_MCP_AGENT_SETUP_GUIDE.md](PLAYWRIGHT_MCP_AGENT_SETUP_GUIDE.md)** for step-by-step setup and troubleshooting.
- Ensure **only one** `.cursor` directory exists (at the workspace root). Remove any `.cursor` in subfolders to avoid routing conflicts.
- See also **[../../.cursor/README.md](../../.cursor/README.md)** for workspace MCP notes.
