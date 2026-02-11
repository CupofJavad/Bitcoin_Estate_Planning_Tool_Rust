#!/usr/bin/env bash
# Smoke test for Legacy Vault API (and optionally frontend).
# Usage: ./scripts/smoke.sh [BASE_URL]
# Example: ./scripts/smoke.sh https://estate.example.com
# Default: http://localhost:8000 (API only; set NEXT_PUBLIC_API_URL for frontend to match)

set -e
BASE_URL="${1:-http://localhost:8000}"

echo "Smoke test: $BASE_URL"
echo "---"

# Health
echo -n "GET /health ... "
resp=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$resp" = "200" ]; then
  echo "OK ($resp)"
else
  echo "FAIL ($resp)"
  exit 1
fi

# Version (JSON)
echo -n "GET /version ... "
resp=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/version")
if [ "$resp" = "200" ]; then
  echo "OK ($resp)"
  curl -sS "$BASE_URL/version" | head -c 120
  echo "..."
else
  echo "FAIL ($resp)"
  exit 1
fi

echo "---"
echo "Smoke passed. Next: verify frontend loads and login works (manual or E2E)."
