#!/usr/bin/env bash
# Create estate_planning_rust database on the server (run on server or via SSH).
# Expects POSTGRES_* or POSTGRES_SUPERUSER / POSTGRES_SUPERUSER_PASSWORD.
# Usage: source your .env then run, or LEGACY_VAULT_ENV=/path/to/.env ./scripts/create-db-on-server.sh

set -e
DB_NAME="${POSTGRES_DB:-estate_planning_rust}"
# Prefer superuser for CREATE DATABASE; fall back to POSTGRES_USER
PG_USER="${POSTGRES_SUPERUSER:-$POSTGRES_USER}"
PG_PASS="${POSTGRES_SUPERUSER_PASSWORD:-$POSTGRES_PASSWORD}"
PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"

if [ -n "${LEGACY_VAULT_ENV}" ] && [ -f "${LEGACY_VAULT_ENV}" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${LEGACY_VAULT_ENV}"
  set +a
  DB_NAME="${POSTGRES_DB:-estate_planning_rust}"
  PG_USER="${POSTGRES_SUPERUSER:-$POSTGRES_USER}"
  PG_PASS="${POSTGRES_SUPERUSER_PASSWORD:-$POSTGRES_PASSWORD}"
  PG_HOST="${POSTGRES_HOST:-localhost}"
  PG_PORT="${POSTGRES_PORT:-5432}"
fi

if [ -z "$PG_USER" ]; then
  echo "Set POSTGRES_SUPERUSER (or POSTGRES_USER) and POSTGRES_SUPERUSER_PASSWORD (or POSTGRES_PASSWORD)."
  exit 1
fi

export PGPASSWORD="$PG_PASS"
if psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  echo "Database $DB_NAME already exists."
else
  psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -c "CREATE DATABASE $DB_NAME;"
  echo "Created database $DB_NAME."
fi
unset PGPASSWORD
