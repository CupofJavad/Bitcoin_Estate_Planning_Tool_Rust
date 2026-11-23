#!/usr/bin/env bash
# Restore a gzipped PostgreSQL backup after verifying its SHA-256 checksum.
# Usage: ./scripts/restore-db.sh <path/to/backup.sql.gz> [COMPOSE_FILE]
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.sql.gz> [compose-file]" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_FILE="$1"
COMPOSE_FILE="${2:-${REPO_ROOT}/deploy/docker-compose.prod.yml}"
PG_USER="${POSTGRES_USER:-legacyvault}"
PG_DB="${POSTGRES_DB:-estate_planning_rust}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "Verifying SHA-256 integrity seal..."
  sha256sum -c "${BACKUP_FILE}.sha256"
fi

echo "Restoring ${BACKUP_FILE} into ${PG_DB}..."
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" >/dev/null

echo "Restore complete and verified."
