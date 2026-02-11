#!/usr/bin/env bash
# Start Legacy Vault on the server (run Docker there via SSH). No Docker needed on your Mac.
# Usage: source your .env then run:
#   source .env && ./Estate_Planning_Rust/scripts/start-on-server.sh
#
# Requires: one full deploy first (so the image exists on the server). Same .env as deploy:
#   LUNAVERSE_HOST, LUNAVERSE_SSH_USER, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
# Optional: LUNAVERSE_SSH_PASSWORD, LUNAVERSE_SSH_PORT, SECURE_COOKIE, RATE_LIMIT_MAX

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_DIR="${LEGACY_VAULT_REMOTE_DIR:-/tmp/legacy-vault-deploy}"

# Load .env (same as deploy-to-lunaverse.sh)
ENV_FILE="${ENV_FILE:-}"
if [ -z "$ENV_FILE" ]; then
  for candidate in "$REPO_ROOT/../.env" "$REPO_ROOT/.env" ".env"; do
    if [ -f "$candidate" ]; then ENV_FILE="$candidate"; break; fi
  done
fi
if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "${line// /}" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
    fi
  done < "$ENV_FILE"
fi

for v in LUNAVERSE_HOST LUNAVERSE_SSH_USER POSTGRES_HOST POSTGRES_PORT POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD; do
  if [ -z "${!v}" ]; then
    echo "Missing required env: $v (set in .env or ENV_FILE=...)"
    exit 1
  fi
done

SSH_PORT="${LUNAVERSE_SSH_PORT:-22}"
SSH_TARGET="${LUNAVERSE_SSH_USER}@${LUNAVERSE_HOST}"
SSH_OPTS=(-o "StrictHostKeyChecking=accept-new" -p "$SSH_PORT")
SCP_OPTS=(-o "StrictHostKeyChecking=accept-new" -P "$SSH_PORT")

run_ssh() {
  if [ -n "$LUNAVERSE_SSH_PASSWORD" ] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$LUNAVERSE_SSH_PASSWORD" ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "$@"
  else
    ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "$@"
  fi
}

run_scp() {
  local src="$1"
  local dest="$2"
  if [ -n "$LUNAVERSE_SSH_PASSWORD" ] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$LUNAVERSE_SSH_PASSWORD" scp "${SCP_OPTS[@]}" "$src" "$SSH_TARGET:$dest"
  else
    scp "${SCP_OPTS[@]}" "$src" "$SSH_TARGET:$dest"
  fi
}

echo "Starting Legacy Vault on server (Docker runs on server)..."
run_ssh "mkdir -p $REMOTE_DIR"

# Write server .env and push run-on-server.sh
SUPERUSER_PASS="${POSTGRES_SUPERUSER_PASSWORD:-$LUNAVERSE_SSH_PASSWORD}"
SERVER_ENV="$REPO_ROOT/.deploy-server.env"
{
  echo "POSTGRES_HOST=$POSTGRES_HOST"
  echo "POSTGRES_PORT=$POSTGRES_PORT"
  echo "POSTGRES_DB=$POSTGRES_DB"
  echo "POSTGRES_USER=$POSTGRES_USER"
  echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
  [ -n "$POSTGRES_SUPERUSER" ] && echo "POSTGRES_SUPERUSER=$POSTGRES_SUPERUSER"
  [ -n "$SUPERUSER_PASS" ] && echo "POSTGRES_SUPERUSER_PASSWORD=$SUPERUSER_PASS"
  [ -n "$SECURE_COOKIE" ] && echo "SECURE_COOKIE=$SECURE_COOKIE"
  [ -n "$RATE_LIMIT_MAX" ] && echo "RATE_LIMIT_MAX=$RATE_LIMIT_MAX"
} > "$SERVER_ENV"
run_scp "$SERVER_ENV" "$REMOTE_DIR/.env"
rm -f "$SERVER_ENV"
run_scp "$SCRIPT_DIR/run-on-server.sh" "$REMOTE_DIR/run-on-server.sh"

run_ssh "chmod +x $REMOTE_DIR/run-on-server.sh && LEGACY_VAULT_ENV=$REMOTE_DIR/.env LEGACY_VAULT_PORT=8001 $REMOTE_DIR/run-on-server.sh"

echo "API is running on server: http://${LUNAVERSE_HOST}:8001"
echo "Health: curl http://${LUNAVERSE_HOST}:8001/health"
