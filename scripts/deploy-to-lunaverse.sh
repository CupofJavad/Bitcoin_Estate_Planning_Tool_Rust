#!/usr/bin/env bash
# Deploy Legacy Vault API to Lunaverse: build image, copy to server, create DB (optional), run container.
# Usage: from workspace root, source your .env then run:
#   source .env && ./Estate_Planning_Rust/scripts/deploy-to-lunaverse.sh
# Or from Estate_Planning_Rust: source /path/to/.env && ./scripts/deploy-to-lunaverse.sh
#
# Env (no quotes after = in .env): LUNAVERSE_HOST, LUNAVERSE_SSH_USER, LUNAVERSE_SSH_PORT,
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD;
#   optional: LUNAVERSE_SSH_PASSWORD (for sshpass), POSTGRES_SUPERUSER, POSTGRES_SUPERUSER_PASSWORD (for create-db).
# Optional: CREATE_DB=1 to run create-db on server; SKIP_BUILD=1 to skip Docker build; SKIP_UPLOAD=1 to only run on server.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGE_NAME="estate-planning-rust:latest"
TAR_NAME="estate-planning-rust.tar.gz"
REMOTE_DIR="${LEGACY_VAULT_REMOTE_DIR:-/tmp/legacy-vault-deploy}"

# Load .env without sourcing (avoids "command not found" when values contain spaces)
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
    echo "Missing required env: $v (set it or use ENV_FILE=/path/to/.env; values with spaces are OK in .env)"
    exit 1
  fi
done

SSH_PORT="${LUNAVERSE_SSH_PORT:-22}"
SSH_TARGET="${LUNAVERSE_SSH_USER}@${LUNAVERSE_HOST}"
SSH_OPTS=(-o "StrictHostKeyChecking=accept-new" -p "$SSH_PORT")
# scp uses -P for port, not -p
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

if [ -z "${SKIP_BUILD}" ]; then
  echo "Building Docker image (linux/amd64 for server)..."
  (cd "$REPO_ROOT" && docker build --platform linux/amd64 -t "$IMAGE_NAME" .)
fi

if [ -z "${SKIP_UPLOAD}" ]; then
  echo "Saving and uploading image..."
  docker save "$IMAGE_NAME" | gzip > "$REPO_ROOT/$TAR_NAME"
  run_scp "$REPO_ROOT/$TAR_NAME" "~/$TAR_NAME"
  rm -f "$REPO_ROOT/$TAR_NAME"
fi

run_ssh "mkdir -p $REMOTE_DIR"

# Write server .env file (no quotes; same format as your main .env)
# If POSTGRES_SUPERUSER_PASSWORD is empty, use LUNAVERSE_SSH_PASSWORD for create-db when both postgres and SSH use the same password
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

echo "Loading image on server..."
run_ssh "docker load < ~/$TAR_NAME && rm -f ~/$TAR_NAME"

if [ -n "${CREATE_DB}" ]; then
  echo "Creating database on server..."
  run_scp "$SCRIPT_DIR/create-db-on-server.sh" "$REMOTE_DIR/create-db-on-server.sh"
  if ! run_ssh "chmod +x $REMOTE_DIR/create-db-on-server.sh && LEGACY_VAULT_ENV=$REMOTE_DIR/.env $REMOTE_DIR/create-db-on-server.sh"; then
    echo "Warning: create-db failed (wrong POSTGRES_SUPERUSER / POSTGRES_SUPERUSER_PASSWORD or DB exists). Continuing to start container."
    echo "  If DB does not exist, create it on the server (e.g. psql -U postgres -c \"CREATE DATABASE $POSTGRES_DB;\") or set POSTGRES_SUPERUSER_PASSWORD in .env and re-run with CREATE_DB=1."
  fi
fi

echo "Starting container on server..."
run_scp "$SCRIPT_DIR/run-on-server.sh" "$REMOTE_DIR/run-on-server.sh"
run_ssh "chmod +x $REMOTE_DIR/run-on-server.sh && LEGACY_VAULT_ENV=$REMOTE_DIR/.env LEGACY_VAULT_PORT=8001 $REMOTE_DIR/run-on-server.sh"

echo "Deploy done. API should be at http://${LUNAVERSE_HOST}:8001/health"
echo "Smoke: ./scripts/smoke.sh http://${LUNAVERSE_HOST}:8001"
echo ""
echo "If health check failed: on server run 'docker logs estate-planning-rust' (often DB missing or wrong POSTGRES_*). Create DB manually if create-db step failed, then: docker restart estate-planning-rust"
