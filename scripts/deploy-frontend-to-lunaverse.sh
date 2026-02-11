#!/usr/bin/env bash
# Deploy Legacy Vault frontend (Next.js) to Lunaverse so it runs at estate.thegeeksnextdoor.com.
# Builds with NEXT_PUBLIC_API_URL for estate-api subdomain, uploads standalone, starts on server port 3000.
#
# Usage: source .env then run:
#   ./Estate_Planning_Rust/scripts/deploy-frontend-to-lunaverse.sh
#
# Env: LUNAVERSE_HOST, LUNAVERSE_SSH_USER (required); LUNAVERSE_SSH_PORT, LUNAVERSE_SSH_PASSWORD (optional).
# Optional: NEXT_PUBLIC_API_URL (default https://estate-api.thegeeksnextdoor.com).
# Optional: SKIP_BUILD=1 to only upload and restart (reuse existing build).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
# Default to server-side path so SSH commands work when run from a different machine (e.g. Mac)
REMOTE_DIR="${LEGACY_VAULT_FRONTEND_DIR:-/home/${LUNAVERSE_SSH_USER:-luna}/legacy-vault-frontend}"
TAR_NAME="legacy-vault-frontend.tar.gz"

# Load .env
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

for v in LUNAVERSE_HOST LUNAVERSE_SSH_USER; do
  if [ -z "${!v}" ]; then
    echo "Missing required env: $v (set in .env or ENV_FILE=...)" >&2
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

API_URL="${NEXT_PUBLIC_API_URL:-https://estate-api.thegeeksnextdoor.com}"

if [ -z "${SKIP_BUILD}" ]; then
  echo "Building Next.js frontend (NEXT_PUBLIC_API_URL=$API_URL)..."
  (cd "$FRONTEND_DIR" && NEXT_PUBLIC_API_URL="$API_URL" npm run build)
  STANDALONE_ROOT="$FRONTEND_DIR/.next/standalone"
  SERVER_JS=$(find "$STANDALONE_ROOT" -name server.js -type f 2>/dev/null | head -1)
  if [ -z "$SERVER_JS" ]; then
    echo "Standalone server.js not found under .next/standalone. Ensure next.config.js has output: 'standalone'." >&2
    exit 1
  fi
  STANDALONE_DIR=$(dirname "$SERVER_JS")
  echo "Copying .next/static and public into standalone ($STANDALONE_DIR)..."
  mkdir -p "$STANDALONE_DIR/.next"
  cp -r "$FRONTEND_DIR/.next/static" "$STANDALONE_DIR/.next/"
  if [ -d "$FRONTEND_DIR/public" ]; then
    cp -r "$FRONTEND_DIR/public" "$STANDALONE_DIR/"
  fi
  echo "Creating tarball..."
  (cd "$STANDALONE_DIR" && tar czf "$REPO_ROOT/$TAR_NAME" .)
else
  if [ ! -f "$REPO_ROOT/$TAR_NAME" ]; then
    echo "SKIP_BUILD=1 but $TAR_NAME not found. Run without SKIP_BUILD first." >&2
    exit 1
  fi
fi

echo "Uploading to server..."
run_scp "$REPO_ROOT/$TAR_NAME" "~/$TAR_NAME"
[ -z "${SKIP_BUILD}" ] && rm -f "$REPO_ROOT/$TAR_NAME"

echo "Unpacking and starting on server..."
run_ssh "mkdir -p $REMOTE_DIR && tar xzf ~/$TAR_NAME -C $REMOTE_DIR && rm -f ~/$TAR_NAME"

# Push and run start script
run_scp "$SCRIPT_DIR/start-frontend-on-server.sh" "$REMOTE_DIR/start-frontend-on-server.sh"
run_ssh "chmod +x $REMOTE_DIR/start-frontend-on-server.sh && LEGACY_VAULT_FRONTEND_DIR=$REMOTE_DIR PORT=3000 $REMOTE_DIR/start-frontend-on-server.sh"

echo "Frontend deploy done. App should be at http://${LUNAVERSE_HOST}:3000 and https://estate.thegeeksnextdoor.com (if nginx and DNS are set)."
echo "To restart later: ssh $SSH_TARGET 'LEGACY_VAULT_FRONTEND_DIR=$REMOTE_DIR PORT=3000 $REMOTE_DIR/start-frontend-on-server.sh'"
