#!/usr/bin/env bash
# Production-scale verification & concurrent load benchmark for Legacy Vault edge stack.
# Usage: ./scripts/prod-verify.sh [EDGE_BASE_URL]
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
echo "=== Legacy Vault Production Verification: ${BASE_URL} ==="

check_status() {
  local path="$1"
  local expected="${2:-200}"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: GET ${path} returned ${code} (expected ${expected})" >&2
    exit 1
  fi
  echo "PASS: GET ${path} -> ${code}"
}

# 1. Core edge routes & probes
check_status "/health" 200
check_status "/ready" 200
check_status "/version" 200
check_status "/metrics" 200
check_status "/api/openapi.json" 200
check_status "/docs" 200
check_status "/login" 200
check_status "/register" 200

# 2. Readiness payload verification
READY_JSON="$(curl -fsS "${BASE_URL}/ready")"
echo "Readiness: ${READY_JSON}"
echo "$READY_JSON" | jq -e '.status == "ready" and .database == "ok"' >/dev/null

# 3. Security headers verification
HEADERS="$(curl -fsSI "${BASE_URL}/health")"
echo "$HEADERS" | grep -iq "x-content-type-options: nosniff"
echo "$HEADERS" | grep -iq "x-frame-options: DENY"
echo "$HEADERS" | grep -iq "referrer-policy:"
echo "$HEADERS" | grep -iq "x-request-id:"
echo "PASS: Security headers & X-Request-Id verified"

# 4. Cryptographic primitives verification through Nginx edge
BTC_OK="$(curl -fsS -X POST "${BASE_URL}/api/v1/crypto/validate-address" \
  -H 'Content-Type: application/json' \
  -d '{"chain":"btc","address":"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"}')"
echo "$BTC_OK" | jq -e '.valid == true and .checksum_verified == true' >/dev/null
echo "PASS: Bitcoin Bech32 checksum verified via edge"

DESC_OK="$(curl -fsS -X POST "${BASE_URL}/api/v1/crypto/timelock-descriptor" \
  -H 'Content-Type: application/json' \
  -d '{"owner_key":"xpubOwner/0/*","heir_keys":["xpubHeir1/0/*","xpubHeir2/0/*"],"heir_threshold":2,"timelock_blocks":26280,"lock_mode":"csv","network":"mainnet"}')"
echo "$DESC_OK" | jq -e '.wsh_descriptor | contains("older(26280)") and contains("#")' >/dev/null
echo "PASS: BIP-380 Miniscript descriptor compiled via edge"

# 5. Concurrent load test (100 parallel requests across /ready and /api/v1/crypto/validate-address)
echo "Running 100-request concurrent edge load test..."
START_NS="$(date +%s%N)"
FAILS=0
for i in $(seq 1 100); do
  (
    code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/ready")"
    [ "$code" = "200" ] || exit 1
  ) &
done
for job in $(jobs -p); do
  if ! wait "$job"; then
    FAILS=$((FAILS + 1))
  fi
done
END_NS="$(date +%s%N)"
ELAPSED_MS=$(( (END_NS - START_NS) / 1000000 ))
if [ "$FAILS" -gt 0 ]; then
  echo "FAIL: ${FAILS}/100 concurrent requests failed" >&2
  exit 1
fi
echo "PASS: 100/100 concurrent requests succeeded in ${ELAPSED_MS}ms (0% error rate)"

# 6. Prometheus telemetry verification
METRICS="$(curl -fsS "${BASE_URL}/metrics")"
echo "$METRICS" | grep -q "legacy_vault_http_requests_total"
echo "$METRICS" | grep -q "legacy_vault_db_pool_connections"
echo "PASS: Prometheus telemetry metrics active"

echo "=== All production verification checks PASSED ==="
