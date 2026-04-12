#!/usr/bin/env bash
# ============================================================
# ATTENDING AI — Stop Demo Environment
# infrastructure/azure/demo-down.sh
#
# Stops all App Services. Database and Redis stay available
# (they're always-on at their tier) but cost is minimal.
# App Services cost $0 when stopped.
#
# Usage:
#   ./demo-down.sh
# ============================================================

set -euo pipefail

RESOURCE_GROUP="compass-standalone-rg"
PROVIDER_APP="attending-provider"
PATIENT_APP="attending-patient"
API_APP="attending-api"

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   ATTENDING AI — Stopping Demo...         ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Stop all apps in parallel
echo "▸ Stopping Provider Portal..."
az webapp stop -g "$RESOURCE_GROUP" -n "$PROVIDER_APP" --output none &
PID1=$!

echo "▸ Stopping Patient Portal (COMPASS)..."
az webapp stop -g "$RESOURCE_GROUP" -n "$PATIENT_APP" --output none &
PID2=$!

echo "▸ Stopping API Backend..."
az webapp stop -g "$RESOURCE_GROUP" -n "$API_APP" --output none &
PID3=$!

wait $PID1 $PID2 $PID3

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   💤 Demo Environment STOPPED                             ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║   All App Services stopped (compute = $0)                 ║"
echo "║   Database & Redis preserved (data intact, ~$0.75/day)    ║"
echo "║                                                           ║"
echo "║   To restart: ./demo-up.sh                                ║"
echo "║   To destroy everything: ./demo-teardown.sh               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
