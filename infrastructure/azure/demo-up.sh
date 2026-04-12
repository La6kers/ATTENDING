#!/usr/bin/env bash
# ============================================================
# ATTENDING AI — Start Demo Environment
# infrastructure/azure/demo-up.sh
#
# Starts all stopped App Services. Takes ~1-2 minutes.
# Run before a demo, then demo-down.sh when finished.
#
# Usage:
#   ./demo-up.sh           # Start everything
#   ./demo-up.sh --wait    # Start and wait for health checks
# ============================================================

set -euo pipefail

RESOURCE_GROUP="compass-standalone-rg"
PROVIDER_APP="attending-provider"
PATIENT_APP="attending-patient"
API_APP="attending-api"

WAIT_FOR_HEALTH=false
[[ "${1:-}" == "--wait" ]] && WAIT_FOR_HEALTH=true

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   🟢 ATTENDING AI — Starting Demo...      ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Start all apps in parallel
echo "▸ Starting API backend..."
az webapp start -g "$RESOURCE_GROUP" -n "$API_APP" --output none &
PID_API=$!

echo "▸ Starting Provider Portal..."
az webapp start -g "$RESOURCE_GROUP" -n "$PROVIDER_APP" --output none &
PID_PROVIDER=$!

echo "▸ Starting Patient Portal (COMPASS)..."
az webapp start -g "$RESOURCE_GROUP" -n "$PATIENT_APP" --output none &
PID_PATIENT=$!

# Wait for all starts to complete
wait $PID_API $PID_PROVIDER $PID_PATIENT

echo ""
echo "  ✓ All services started"
echo ""

# Optional: wait for health checks
if [ "$WAIT_FOR_HEALTH" = true ]; then
  echo "▸ Waiting for services to become healthy..."

  check_health() {
    local name=$1
    local url=$2
    local attempts=0
    local max_attempts=30

    while [ $attempts -lt $max_attempts ]; do
      status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
      if [ "$status" = "200" ] || [ "$status" = "301" ] || [ "$status" = "302" ]; then
        echo "  ✓ ${name}: healthy (HTTP ${status})"
        return 0
      fi
      attempts=$((attempts + 1))
      sleep 5
    done
    echo "  ⚠ ${name}: not responding after ${max_attempts} attempts"
    return 1
  }

  check_health "API"      "https://${API_APP}.azurewebsites.net/health/live"
  check_health "Provider" "https://${PROVIDER_APP}.azurewebsites.net"
  check_health "COMPASS"  "https://${PATIENT_APP}.azurewebsites.net"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ Demo Environment is LIVE                             ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║   Provider Portal (physician view):                       ║"
echo "║   → https://${PROVIDER_APP}.azurewebsites.net              "
echo "║                                                           ║"
echo "║   Patient Portal (COMPASS assessment):                    ║"
echo "║   → https://${PATIENT_APP}.azurewebsites.net               "
echo "║                                                           ║"
echo "║   API Backend:                                            ║"
echo "║   → https://${API_APP}.azurewebsites.net                   "
echo "║                                                           ║"
echo "║   When done: ./demo-down.sh                               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
