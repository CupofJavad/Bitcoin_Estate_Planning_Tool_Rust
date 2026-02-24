# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Legacy Vault is a multi-chain cryptocurrency estate planning tool (BTC, XMR, STX). It consists of:

- **Rust API** (Axum + SQLx + PostgreSQL) — port 8000
- **Next.js frontend** (React 18, Tailwind) — port 3000
- **PostgreSQL 15** — port 5432, via Docker (`infra/docker-compose.yml`)

### Starting services

1. Start Docker daemon: `sudo dockerd &>/tmp/dockerd.log &` (wait ~3s)
2. Start PostgreSQL: `sudo docker compose -f infra/docker-compose.yml up -d`
3. Start API: `cd /workspace && cargo run &` (auto-runs migrations, seeds admin user)
4. Start frontend: `cd /workspace/frontend && npm run dev &`

### Default admin login

- Email: `admin@localhost`, Password: `admin`

### Key dev commands

See `README.md` for full details. Quick reference:

| Task | Command |
|------|---------|
| Rust build | `cargo build` |
| Rust lint (lib/bins) | `cargo clippy --lib --bins -- -D warnings` |
| Rust format check | `cargo fmt --all -- --check` |
| Rust tests | `RATE_LIMIT_MAX=1000 cargo test` |
| Frontend lint | `cd frontend && npx next lint` |
| Frontend type-check | `cd frontend && npx tsc --noEmit` |
| Frontend dev | `cd frontend && npm run dev` |

### Gotchas

- **Rust toolchain**: Must use `stable` (not the pinned 1.83.0 that may ship with the VM). Run `rustup default stable` if `cargo build` fails on `edition2024`.
- **OpenSSL**: `libssl-dev` is required for `cargo test` / `cargo clippy --all-targets` (the `reqwest` dev-dependency pulls in `openssl-sys`). Install with `sudo apt-get install -y libssl-dev`.
- **Docker in nested container**: Requires `fuse-overlayfs` storage driver and `iptables-legacy`. These are configured in `/etc/docker/daemon.json` and via `update-alternatives`.
- **`cargo fmt` check**: The codebase has pre-existing formatting diffs. `cargo fmt --all -- --check` exits non-zero on current `main`.
- **`cargo clippy --all-targets`**: There is a pre-existing clippy error in `tests/api_integration.rs` (identical if/else blocks). Use `cargo clippy --lib --bins -- -D warnings` to lint only the main crate cleanly.
- **RATE_LIMIT_MAX**: Set `RATE_LIMIT_MAX=1000` when running `cargo test` to avoid auth rate-limit failures during integration tests.
- **Environment files**: Backend needs `.env` (copy from `.env.example`). Frontend needs `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.
