# Playwright MCP Setup — Complete Agent-Focused Guide

This document is a **reproducible, step-by-step guide** for an AI agent (or human) setting up the Playwright MCP server in a Cursor environment so that agents can test the Legacy Vault frontend. It records exactly what was done, where, and how to fix common issues.

---

## 1. Objective

- **Goal:** Enable Cursor’s AI agent to control a browser (navigate, click, snapshot, etc.) to test the Legacy Vault app (and optionally generate/run Playwright tests).
- **Mechanism:** Cursor runs the **Playwright MCP server** as a subprocess (via `npx`) and communicates with it over stdio. The agent then sees Playwright in its available MCP tools and can call them.

---

## 2. Prerequisites (Must Be True Before Setup)

| Requirement | How to check | Notes |
|-------------|--------------|--------|
| **Node.js 18+** | `node -v` | Playwright MCP requires Node 18 or newer. |
| **npx available** | `npx --version` or `which npx` | Usually ships with Node. |
| **Cursor** | N/A | This setup is for Cursor’s MCP integration. |
| **Project root** | Workspace root: `Bitcoin_Estate_Planning_Tool_Rust` | MCP config lives at `<workspace_root>/.cursor/mcp.json`. |

If `node` or `npx` is missing, install Node.js 18+ (e.g. from nodejs.org or via `nvm`/`fnm`) and retry.

---

## 3. Configuration Locations (Cursor MCP)

Cursor reads MCP config from **one or both** of:

| Scope | Path | When it’s used |
|-------|------|----------------|
| **Project / workspace** | `<workspace_root>/.cursor/mcp.json` | When this workspace is open in Cursor. |
| **Global (user)** | `~/.cursor/mcp.json` | For all Cursor workspaces. |

- **Workspace config** is what this project uses. Path: `Bitcoin_Estate_Planning_Tool_Rust/.cursor/mcp.json`.
- **Only one `.cursor`** should exist at the workspace root; do not create a second `.cursor` in subfolders (e.g. `bitcoin-estate-planning/`) or Cursor may route tools incorrectly.

---

## 4. Exact Steps Performed (What to Do)

### Step 4.1 — Create the `.cursor` directory (if it does not exist)

- **Location:** `<workspace_root>/.cursor` (e.g. `Bitcoin_Estate_Planning_Tool_Rust/.cursor`)
- **Action:** `mkdir -p .cursor`

### Step 4.2 — Create or overwrite `mcp.json` under `.cursor`

- **Full path:** `<workspace_root>/.cursor/mcp.json`
- **Exact content (valid JSON; no trailing commas, no comments):**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

- **Meaning:** `npx` runs `@playwright/mcp@latest`; `-y` avoids interactive install prompts.

### Step 4.3 — No project package.json required

- No npm `package.json` is required in the project for MCP to work; `npx` fetches and runs the package.
- The Legacy Vault frontend lives in `Estate_Planning_Rust/frontend` and has its own `package.json` for the app; that is separate from MCP.

### Step 4.4 — Optional: documentation

- This guide: `Estate_Planning_Rust/docs/PLAYWRIGHT_MCP_AGENT_SETUP_GUIDE.md`
- Usage: `Estate_Planning_Rust/docs/AI_FRONTEND_TESTING.md` (and optionally `PLAYWRIGHT_MCP_FRONTEND_TESTING.md`)

---

## 5. Files and Paths Summary

| Item | Path | Purpose |
|------|------|---------|
| MCP config (required) | `.cursor/mcp.json` (workspace root) | Tells Cursor to start Playwright MCP with `npx -y @playwright/mcp@latest`. |
| App frontend | `Estate_Planning_Rust/frontend/` | Next.js app; run with `npm run dev` → http://localhost:3000 |
| API | `Estate_Planning_Rust/` | Rust API; run with `cargo run` → http://localhost:8000 |
| Testing doc | `Estate_Planning_Rust/docs/AI_FRONTEND_TESTING.md` | How to get the app running and use the AI browser tool. |

---

## 6. How Cursor Uses This Config

1. When the workspace is opened (or Cursor reloads), it reads `.cursor/mcp.json` at the workspace root.
2. For each entry under `mcpServers`, Cursor spawns: `command` + `args` (e.g. `npx -y @playwright/mcp@latest`).
3. Cursor communicates with that process over **stdio** (MCP protocol).
4. Playwright MCP may download browser binaries (e.g. Chromium) on first run.
5. In Chat/Agent, tools (e.g. `browser_navigate`, `browser_snapshot`, `browser_click`) appear; the agent can be asked to “use the browser” to test the frontend.

---

## 7. Verification

1. **Config exists and is valid JSON**  
   From workspace root:  
   `test -f .cursor/mcp.json && node -e "JSON.parse(require('fs').readFileSync('.cursor/mcp.json','utf8'))"`  
   Exit code 0 = valid.

2. **npx can run the package**  
   `npx -y @playwright/mcp@latest --help`  
   Should print help or start the server.

3. **Cursor shows the server**  
   Reload Cursor (Command Palette → “Developer: Reload Window”) or reopen the project.  
   Cursor Settings → MCP → confirm “playwright” is listed and enabled.

4. **Agent has the tools**  
   In Chat/Agent, ask: “Use the browser to open http://localhost:3000 and take a snapshot.”  
   (Start the app first: see AI_FRONTEND_TESTING.md.)

---

## 8. Troubleshooting

### 8.1 — Playwright does not appear in Cursor

- Confirm you are in the **same workspace** where `.cursor/mcp.json` exists (workspace root).
- Confirm the file is at **`.cursor/mcp.json`** at the root, not inside a subfolder.
- **Reload Cursor:** Command Palette → “Developer: Reload Window”.
- Do not create a second `.cursor` in a subfolder (e.g. `bitcoin-estate-planning/.cursor`); remove it if present so only the root config is used.

### 8.2 — MCP server fails to start / “command not found”

- In a terminal: `node -v`, `npx -y @playwright/mcp@latest --help`. If these fail, fix Node/npx first.
- If you use nvm/fnm, Cursor may not load your shell profile. Use a system Node or set `command` to the full path to `npx` in `mcp.json`.

### 8.3 — Invalid JSON

- Use only valid JSON (no `//` comments, no trailing commas). Validate:  
  `node -e "JSON.parse(require('fs').readFileSync('.cursor/mcp.json','utf8'))"`

### 8.4 — Server starts but agent doesn’t use browser

- In Chat, ensure the Playwright MCP server is **enabled** in the tools list.
- Ask explicitly: “Use the Playwright browser tools to open http://localhost:3000 and take a snapshot.”

### 8.5 — First run hangs / “downloading browsers”

- Wait for the first run to finish. Or run once in terminal: `npx -y @playwright/mcp@latest` (then Ctrl+C) to pre-cache. Ensure network allows npm/Playwright CDN.

### 8.6 — Different Cursor window or new project

- Each workspace needs its own `.cursor/mcp.json` at that workspace’s root (or use global `~/.cursor/mcp.json`). Copy the same JSON into the new workspace’s `.cursor/mcp.json`, then reload Cursor.

### 8.7 — Tools fail at runtime

- Run in terminal: `npx -y @playwright/mcp@latest` and see if it stays running or errors.
- Check Cursor’s MCP logs for the Playwright server.
- Try a simple page first (e.g. https://example.com) to rule out app-specific issues.

---

## 9. Reference

- Playwright MCP: https://github.com/microsoft/playwright-mcp  
- Cursor MCP: https://cursor.com/docs/context/mcp  
- Legacy Vault frontend testing: [AI_FRONTEND_TESTING.md](AI_FRONTEND_TESTING.md)

---

## 10. Minimal Checklist for Another Agent

1. [ ] Node.js 18+ and `npx` available (`node -v`, `npx --version`).
2. [ ] Create `<workspace_root>/.cursor` and `<workspace_root>/.cursor/mcp.json` with:
   ```json
   {"mcpServers":{"playwright":{"command":"npx","args":["-y","@playwright/mcp@latest"]}}}
   ```
3. [ ] Validate JSON; optionally run `npx -y @playwright/mcp@latest --help`.
4. [ ] Reload Cursor; confirm MCP server “playwright” is listed and enabled.
5. [ ] In Chat, ask agent to open http://localhost:3000 (with app running) and take a snapshot to verify.
