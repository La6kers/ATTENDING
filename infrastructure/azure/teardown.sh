#!/usr/bin/env bash
# ============================================================
# ATTENDING AI — Azure Resource Teardown
# infrastructure/azure/teardown.sh
#
# WARNING: This deletes ALL resources in the resource group!
# Use with caution. Primarily for dev/staging cleanup.
#
# Usage:
#   ./teardown.sh                    # Production (will prompt)
#   ./teardown.sh --env staging      # Staging
#   ./teardown.sh --env staging -y   # Staging, no prompt
# ============================================================

set -euo pipefail

ENV="${AZURE_ENV:-production}"
FORCE=false

for arg in "$@"; do
  case $arg in
    --env) shift; ENV="$1" ;;
    -y|--yes) FORCE=true ;;
  esac
done

RESOURCE_GROUP="attending-${ENV}-rg"

echo "========================================"
echo "  ATTENDING AI — Azure Teardown"
echo "  Environment: ${ENV}"
echo "  Resource Group: ${RESOURCE_GROUP}"
echo "========================================"
echo ""

if [ "$ENV" = "production" ] && [ "$FORCE" = false ]; then
  echo "  ⚠️  You are about to delete PRODUCTION resources!"
  echo "  This action cannot be undone."
  echo ""
  read -p "  Type 'DELETE PRODUCTION' to confirm: " CONFIRM
  if [ "$CONFIRM" != "DELETE PRODUCTION" ]; then
    echo "  Cancelled."
    exit 1
  fi
elif [ "$FORCE" = false ]; then
  read -p "  Delete all resources in ${RESOURCE_GROUP}? [y/N]: " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "  Cancelled."
    exit 1
  fi
fi

echo ""
echo "  Deleting resource group: ${RESOURCE_GROUP}..."
az group delete --name "$RESOURCE_GROUP" --yes --no-wait

echo ""
echo "  ✓ Resource group deletion initiated (runs in background)."
echo "  Use 'az group show --name $RESOURCE_GROUP' to check status."
