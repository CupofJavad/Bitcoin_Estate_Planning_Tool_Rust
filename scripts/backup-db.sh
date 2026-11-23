#!/usr/bin/env bash
# Automated compressed PostgreSQL backup with SHA-256 integrity seal and retention pruning.
# Usage: ./scripts/backup-db.sh [BACKUP_DIR] [COMPOSE_FILE]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${1:-${REPO_ROOT}/backups}"
COMPOSE_FILE="${2:-${REPO_ROOT}/deploy/docker-compose.prod.yml}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
PG_USER="${POSTGRES_USER:-legacyvault}"
PG_DB="${POSTGRES_DB:-estate_planning_rust}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR}/legacy-vault-${STAMP}.sql.gz"

echo "Creating compressed backup from compose service 'postgres' -> ${OUT_FILE}"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$PG_USER" -d "$PG_DB" --clean --if-exists --no-owner --no-privileges \
  | gzip -9 > "$OUT_FILE"

sha256sum "$OUT_FILE" > "${OUT_FILE}.sha256"
SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "Backup complete: ${OUT_FILE} (${SIZE})"
cat "${OUT_FILE}.sha256"

# Prune backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "legacy-vault-*.sql.gz*" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
