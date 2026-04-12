#!/usr/bin/env bash
# ============================================================
# ATTENDING AI — Build & Deploy to Demo Environment
# infrastructure/azure/demo-deploy.sh
#
# Builds Docker images and deploys to Azure App Services.
# Run after demo-provision.sh has been run at least once.
#
# Usage:
#   ./demo-deploy.sh              # Build & deploy all
#   ./demo-deploy.sh --api-only   # Only deploy API backend
#   ./demo-deploy.sh --seed       # Deploy + seed database
# ============================================================

set -euo pipefail

RESOURCE_GROUP="compass-standalone-rg"
ACR_NAME="compassacr2026"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"

PROVIDER_APP="attending-provider"
PATIENT_APP="attending-patient"
API_APP="attending-api"

SEED_DB=false
API_ONLY=false

for arg in "$@"; do
  case $arg in
    --seed) SEED_DB=true ;;
    --api-only) API_ONLY=true ;;
  esac
done

echo ""
echo "========================================================"
echo "   ATTENDING AI — Build & Deploy Demo"
echo "========================================================"
echo ""

# Login to ACR
echo "[1/5] Logging into Azure Container Registry..."
az acr login --name "$ACR_NAME" --output none
echo "  Done"

TAG=$(date +%Y%m%d-%H%M%S)

if [ "$API_ONLY" = false ]; then
  # Build Provider Portal
  echo ""
  echo "[2/5] Building Provider Portal..."
  docker build \
    -f apps/provider-portal/Dockerfile \
    -t "${ACR_LOGIN_SERVER}/attending-provider:${TAG}" \
    -t "${ACR_LOGIN_SERVER}/attending-provider:latest" \
    .
  docker push "${ACR_LOGIN_SERVER}/attending-provider:${TAG}"
  docker push "${ACR_LOGIN_SERVER}/attending-provider:latest"
  echo "  Done: attending-provider:${TAG}"

  # Build Patient Portal
  echo ""
  echo "[3/5] Building Patient Portal (COMPASS)..."
  docker build \
    -f apps/patient-portal/Dockerfile \
    -t "${ACR_LOGIN_SERVER}/attending-patient:${TAG}" \
    -t "${ACR_LOGIN_SERVER}/attending-patient:latest" \
    .
  docker push "${ACR_LOGIN_SERVER}/attending-patient:${TAG}"
  docker push "${ACR_LOGIN_SERVER}/attending-patient:latest"
  echo "  Done: attending-patient:${TAG}"
fi

# Build API Backend
echo ""
echo "[4/5] Building API Backend..."
docker build \
  -f backend/Dockerfile \
  -t "${ACR_LOGIN_SERVER}/attending-api:${TAG}" \
  -t "${ACR_LOGIN_SERVER}/attending-api:latest" \
  backend/
docker push "${ACR_LOGIN_SERVER}/attending-api:${TAG}"
docker push "${ACR_LOGIN_SERVER}/attending-api:latest"
echo "  Done: attending-api:${TAG}"

# Deploy to App Services
echo ""
echo "[5/5] Deploying to Azure App Services..."

if [ "$API_ONLY" = false ]; then
  az webapp config container set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PROVIDER_APP" \
    --container-image-name "${ACR_LOGIN_SERVER}/attending-provider:${TAG}" \
    --container-registry-url "https://${ACR_LOGIN_SERVER}" \
    --output none &

  az webapp config container set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PATIENT_APP" \
    --container-image-name "${ACR_LOGIN_SERVER}/attending-patient:${TAG}" \
    --container-registry-url "https://${ACR_LOGIN_SERVER}" \
    --output none &
fi

az webapp config container set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$API_APP" \
  --container-image-name "${ACR_LOGIN_SERVER}/attending-api:${TAG}" \
  --container-registry-url "https://${ACR_LOGIN_SERVER}" \
  --output none &

wait
echo "  Done"

# Seed database if requested
if [ "$SEED_DB" = true ]; then
  echo ""
  echo "[SEED] Running database migrations and seed..."
  # Get connection string from Key Vault
  DB_URL=$(az keyvault secret show \
    --vault-name "attending-kv-demo" \
    --name "sql-connection-string" \
    --query value -o tsv)

  DATABASE_URL="$DB_URL" npx prisma migrate deploy
  DATABASE_URL="$DB_URL" npx ts-node prisma/seed-demo.ts
  echo "  Done: database seeded"
fi

echo ""
echo "========================================================"
echo "   Deploy Complete (tag: ${TAG})"
echo "========================================================"
echo ""
echo "   Provider:  https://${PROVIDER_APP}.azurewebsites.net"
echo "   COMPASS:   https://${PATIENT_APP}.azurewebsites.net"
echo "   API:       https://${API_APP}.azurewebsites.net"
echo ""
echo "   Login:     demo@attending.ai / demo1234"
echo ""
echo "   Stop when done: ./demo-down.sh"
echo "========================================================"
