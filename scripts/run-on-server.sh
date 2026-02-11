#!/usr/bin/env bash
# Run Legacy Vault API container on the server.
# Usage: source deploy env then run this script, or:
#   LEGACY_VAULT_ENV=/path/to/.env ./scripts/run-on-server.sh
# Expects: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
# (no quotes in .env after =)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGE_NAME="${LEGACY_VAULT_IMAGE:-estate-planning-rust:latest}"
CONTAINER_NAME="${LEGACY_VAULT_CONTAINER:-estate-planning-rust}"
API_PORT_HOST="${LEGACY_VAULT_PORT:-8001}"
API_PORT_CONTAINER=8000

if [ -n "${LEGACY_VAULT_ENV}" ] && [ -f "${LEGACY_VAULT_ENV}" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${LEGACY_VAULT_ENV}"
  set +a
fi

for v in POSTGRES_HOST POSTGRES_PORT POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD; do
  if [ -z "${!v}" ]; then
    echo "Missing required env: $v"
    exit 1
  fi
done

# Build DATABASE_URL (no quotes in values when sourced from your .env)
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

echo "Stopping existing container (if any)..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "Starting $CONTAINER_NAME on port $API_PORT_HOST..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${API_PORT_HOST}:${API_PORT_CONTAINER}" \
  -e DATABASE_URL="$DATABASE_URL" \
  -e API_HOST=0.0.0.0 \
  -e API_PORT="$API_PORT_CONTAINER" \
  ${SECURE_COOKIE:+ -e SECURE_COOKIE="$SECURE_COOKIE"} \
  ${RATE_LIMIT_MAX:+ -e RATE_LIMIT_MAX="$RATE_LIMIT_MAX"} \
  --restart unless-stopped \
  --memory=512m \
  --cpus=0.5 \
  --cap-drop=SETUID \
  --cap-drop=SETGID \
  "$IMAGE_NAME"

echo "Waiting for health..."
for i in 1 2 3 4 5; do
  if curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:${API_PORT_HOST}/health" | grep -q 200; then
    echo "Health OK."
    curl -sS "http://127.0.0.1:${API_PORT_HOST}/version" | head -c 200
    echo ""
    exit 0
  fi
  sleep 2
done
echo "Health check did not return 200; check logs: docker logs $CONTAINER_NAME"
exit 1
