#!/usr/bin/env bash
# ============================================================
# ATTENDING AI — Remove Demo Resources
# infrastructure/azure/demo-teardown.sh
#
# Removes only demo-specific resources from the shared RG.
# Does NOT touch: attending-compass, compass-plan, compassacr2026,
# attending-openai, oidc-msi-a18c (existing production resources).
#
# Usage:
#   ./demo-teardown.sh
# ============================================================

set -euo pipefail

RESOURCE_GROUP="compass-standalone-rg"

# Only these resources will be deleted
DEMO_APPS=("attending-provider" "attending-patient" "attending-api")
DEMO_SQL_SERVER="attending-sql-demo"
DEMO_REDIS="attending-redis-demo"
DEMO_KV="attending-kv-demo"
DEMO_STORAGE="attendingstoragedemo"

echo ""
echo "========================================================"
echo "   ATTENDING AI — Remove Demo Resources"
echo ""
echo "   This will DELETE only demo-specific resources:"
echo "     - Web Apps: ${DEMO_APPS[*]}"
echo "     - SQL Server: ${DEMO_SQL_SERVER}"
echo "     - Redis: ${DEMO_REDIS}"
echo "     - Key Vault: ${DEMO_KV}"
echo "     - Storage: ${DEMO_STORAGE}"
echo ""
echo "   Existing resources will NOT be touched:"
echo "     - attending-compass (standalone COMPASS)"
echo "     - compass-plan (App Service Plan)"
echo "     - compassacr2026 (Container Registry)"
echo "     - attending-openai (Azure OpenAI)"
echo "========================================================"
echo ""
read -p "Type 'DELETE DEMO' to confirm: " confirmation

if [ "$confirmation" != "DELETE DEMO" ]; then
  echo "Aborted."
  exit 0
fi

echo ""

# Delete web apps
for app in "${DEMO_APPS[@]}"; do
  echo "▸ Deleting web app: ${app}..."
  az webapp delete -g "$RESOURCE_GROUP" -n "$app" --output none 2>/dev/null || echo "  (not found)"
done

# Delete SQL
echo "▸ Deleting SQL Server: ${DEMO_SQL_SERVER}..."
az sql server delete -g "$RESOURCE_GROUP" -n "$DEMO_SQL_SERVER" --yes --output none 2>/dev/null || echo "  (not found)"

# Delete Redis
echo "▸ Deleting Redis: ${DEMO_REDIS}..."
az redis delete -g "$RESOURCE_GROUP" -n "$DEMO_REDIS" --yes --output none 2>/dev/null || echo "  (not found)"

# Delete Key Vault
echo "▸ Deleting Key Vault: ${DEMO_KV}..."
az keyvault delete --name "$DEMO_KV" --output none 2>/dev/null || echo "  (not found)"

# Delete Storage
echo "▸ Deleting Storage: ${DEMO_STORAGE}..."
az storage account delete -g "$RESOURCE_GROUP" -n "$DEMO_STORAGE" --yes --output none 2>/dev/null || echo "  (not found)"

echo ""
echo "Done. Demo resources removed. Existing services untouched."
echo ""
