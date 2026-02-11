#!/usr/bin/env bash
# Run on the SERVER to start the Legacy Vault Next.js frontend on port 3000.
# Called by deploy-frontend-to-lunaverse.sh after upload, or run manually after SSH.
# Expects: ~/legacy-vault-frontend/ with unpacked standalone (server.js, .next, public).

set -e
FRONTEND_DIR="${LEGACY_VAULT_FRONTEND_DIR:-$HOME/legacy-vault-frontend}"
PORT="${PORT:-3000}"
cd "$FRONTEND_DIR"

if [ ! -f server.js ]; then
  echo "Missing server.js in $FRONTEND_DIR. Run deploy-frontend-to-lunaverse.sh first." >&2
  exit 1
fi

# Stop existing process if we have a PID file
if [ -f .frontend.pid ]; then
  OLD_PID=$(cat .frontend.pid)
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stopping existing frontend (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
  fi
  rm -f .frontend.pid
fi

# Or kill any process listening on PORT (optional, in case PID file was lost)
if command -v lsof >/dev/null 2>&1; then
  EXISTING=$(lsof -ti ":$PORT" 2>/dev/null) || true
  if [ -n "$EXISTING" ]; then
    echo "Stopping process on port $PORT (PID $EXISTING)..."
    kill $EXISTING 2>/dev/null || true
    sleep 2
  fi
fi

echo "Starting Legacy Vault frontend on port $PORT..."
nohup node server.js > frontend.log 2>&1 &
echo $! > .frontend.pid
echo "PID $(cat .frontend.pid). Log: $FRONTEND_DIR/frontend.log"
echo "Verify: curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/"
