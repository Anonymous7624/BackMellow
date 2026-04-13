#!/usr/bin/env bash
# =============================================================================
#  BackMellow Analytics — Update Script
#  Pulls the latest Umami image, runs a backup, then restarts containers.
#
#  USAGE:
#    chmod +x update.sh
#    ./update.sh
#
#  The script:
#    1. Takes a pre-update database backup
#    2. Pulls the latest Umami Docker image
#    3. Restarts the stack (zero-downtime DB since it doesn't restart)
#    4. Waits for the health check to pass
# =============================================================================

set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/opt/backmellow-analytics}"
SCRIPTS_DIR="${COMPOSE_DIR}/scripts"

echo "════════════════════════════════════════════"
echo "  BackMellow Analytics — Update"
echo "  $(date)"
echo "════════════════════════════════════════════"

cd "${COMPOSE_DIR}"

# ── Step 1: Pre-update backup ─────────────────────────────────────────────────
echo ""
echo "Step 1/4  Pre-update backup..."
if [[ -x "${SCRIPTS_DIR}/backup.sh" ]]; then
  bash "${SCRIPTS_DIR}/backup.sh"
else
  echo "  backup.sh not found — skipping. (Consider adding it.)"
fi

# ── Step 2: Pull latest images ────────────────────────────────────────────────
echo ""
echo "Step 2/4  Pulling latest images..."
docker compose pull umami

# ── Step 3: Recreate Umami container ─────────────────────────────────────────
# We only restart umami, not db, to preserve database connections gracefully.
echo ""
echo "Step 3/4  Restarting Umami..."
docker compose up -d --no-deps umami

# ── Step 4: Health check ──────────────────────────────────────────────────────
echo ""
echo "Step 4/4  Waiting for Umami to become healthy..."
MAX_WAIT=60
ELAPSED=0
until docker compose exec -T umami wget -qO- http://localhost:3000/api/heartbeat >/dev/null 2>&1; do
  if [[ "${ELAPSED}" -ge "${MAX_WAIT}" ]]; then
    echo "ERROR: Umami did not become healthy after ${MAX_WAIT}s."
    echo "Check logs with:  docker compose logs umami"
    exit 1
  fi
  echo "  Waiting... (${ELAPSED}s)"
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

echo ""
echo "════════════════════════════════════════════"
echo "  Update complete! Umami is healthy."
echo "  Check https://stats.backmellow.com"
echo "════════════════════════════════════════════"
