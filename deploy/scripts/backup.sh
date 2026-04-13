#!/usr/bin/env bash
# =============================================================================
#  BackMellow Analytics — Database Backup Script
#  Dumps the Umami PostgreSQL database to a compressed .sql.gz file.
#
#  USAGE:
#    chmod +x backup.sh
#    ./backup.sh
#
#  CRON (daily at 2 AM):
#    0 2 * * * /opt/backmellow-analytics/scripts/backup.sh >> /var/log/bm-backup.log 2>&1
#
#  Backups are stored in BACKUP_DIR.
#  Files older than RETAIN_DAYS days are automatically removed.
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
COMPOSE_DIR="${COMPOSE_DIR:-/opt/backmellow-analytics}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backmellow-analytics/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"

# Load .env so we have DB credentials without hardcoding them here
ENV_FILE="${COMPOSE_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -o allexport; source "${ENV_FILE}"; set +o allexport
fi

POSTGRES_DB="${POSTGRES_DB:-umami}"
POSTGRES_USER="${POSTGRES_USER:-umami_user}"
CONTAINER="${CONTAINER:-bm_postgres}"

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/umami_${TIMESTAMP}.sql.gz"

echo "──────────────────────────────────────────"
echo "BackMellow Analytics Backup"
echo "  Time:      $(date)"
echo "  Target:    ${BACKUP_FILE}"
echo "  Retaining: last ${RETAIN_DAYS} days"
echo "──────────────────────────────────────────"

# ── Dump ──────────────────────────────────────────────────────────────────────
echo "Starting pg_dump..."
docker exec "${CONTAINER}" \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
  | gzip > "${BACKUP_FILE}"

SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup complete: ${BACKUP_FILE} (${SIZE})"

# ── Prune old backups ─────────────────────────────────────────────────────────
echo "Removing backups older than ${RETAIN_DAYS} days..."
find "${BACKUP_DIR}" -name "umami_*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
echo "Pruning done."

echo "──────────────────────────────────────────"
echo "Backup finished successfully."
echo "──────────────────────────────────────────"
