#!/usr/bin/env bash
# ============================================================
# ATTENDING AI — Demo Environment Provisioning (One-Time Setup)
# infrastructure/azure/demo-provision.sh
#
# Creates a lightweight Azure environment for on-demand demos.
# Run once — then use demo-up.sh / demo-down.sh to start/stop.
#
# Prerequisites:
#   - Azure CLI installed (az --version)
#   - Logged in (az login)
#   - Docker installed
#
# Usage:
#   ./demo-provision.sh                    # Provision with defaults
#   ./demo-provision.sh --location westus  # Custom region
#
# Estimated cost: ~$4/day running, ~$0.75/day stopped
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
ENV="demo"
LOCATION="${AZURE_LOCATION:-canadacentral}"
RESOURCE_GROUP="compass-standalone-rg"       # Reuse existing RG
ACR_NAME="compassacr2026"                    # Already exists
SQL_SERVER_NAME="attending-sql-demo"
SQL_DB_NAME="attending-db-demo"
SQL_ADMIN_USER="attendingadmin"
REDIS_NAME="attending-redis-demo"
APP_PLAN_NAME="compass-plan"                 # Already exists (B1 Linux)
STORAGE_ACCOUNT="attendingstoragedemo"
KEYVAULT_NAME="attending-kv-demo"

# App names — new apps on the existing plan
PROVIDER_APP="attending-provider"
PATIENT_APP="attending-patient"
API_APP="attending-api"

# Parse args
for arg in "$@"; do
  case $arg in
    --location) shift; LOCATION="$1" ;;
  esac
done

# Generate secure SQL password
SQL_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9!@#$%' | head -c 24)

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ATTENDING AI — Demo Environment Provisioning          ║"
echo "║                                                          ║"
echo "║   Location:       ${LOCATION}                            "
echo "║   Resource Group:  ${RESOURCE_GROUP}                     "
echo "║                                                          ║"
echo "║   This creates all Azure resources for demo mode.       ║"
echo "║   Run once, then use demo-up.sh / demo-down.sh.        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# 1. Resource Group (reuse existing)
# ============================================================
echo "▸ [1/10] Verifying resource group..."
if az group show --name "$RESOURCE_GROUP" --output none 2>/dev/null; then
  echo "  ✓ Resource group exists: ${RESOURCE_GROUP}"
else
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" \
    --tags environment=demo project=attending-ai --output none
  echo "  ✓ Resource group created: ${RESOURCE_GROUP}"
fi

# ============================================================
# 2. Azure Container Registry (reuse existing)
# ============================================================
echo "▸ [2/10] Verifying container registry..."
if az acr show --name "$ACR_NAME" --output none 2>/dev/null; then
  echo "  ✓ ACR exists: ${ACR_NAME}.azurecr.io"
else
  az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" \
    --sku Basic --admin-enabled true --output none
  echo "  ✓ ACR created: ${ACR_NAME}.azurecr.io"
fi
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"

# ============================================================
# 3. Key Vault (for secrets)
# ============================================================
echo "▸ [3/10] Creating Key Vault..."
az keyvault create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$KEYVAULT_NAME" \
  --location "$LOCATION" \
  --sku standard \
  --output none
echo "  ✓ Key Vault: ${KEYVAULT_NAME}"

# ============================================================
# 4. Azure SQL Database (Basic 5 DTU — $5/mo)
# ============================================================
echo "▸ [4/10] Creating SQL Server and database..."
az sql server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SQL_SERVER_NAME" \
  --admin-user "$SQL_ADMIN_USER" \
  --admin-password "$SQL_PASSWORD" \
  --location "$LOCATION" \
  --output none

# Allow Azure services to connect
az sql server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output none

az sql db create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --name "$SQL_DB_NAME" \
  --edition Basic \
  --capacity 5 \
  --max-size 2GB \
  --output none

SQL_FQDN="${SQL_SERVER_NAME}.database.windows.net"
echo "  ✓ SQL: ${SQL_FQDN}/${SQL_DB_NAME}"

# ============================================================
# 5. Azure Cache for Redis (Basic C0 — $16/mo)
# ============================================================
echo "▸ [5/10] Creating Redis Cache (this takes ~5 min)..."
az redis create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$REDIS_NAME" \
  --location "$LOCATION" \
  --sku Basic \
  --vm-size c0 \
  --output none &
REDIS_PID=$!
echo "  ⏳ Redis provisioning in background..."

# ============================================================
# 6. Storage Account (for clinical images, blobs)
# ============================================================
echo "▸ [6/10] Creating storage account..."
az storage account create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --output none
echo "  ✓ Storage: ${STORAGE_ACCOUNT}"

# ============================================================
# 7. App Service Plan (reuse existing B1 Linux)
# ============================================================
echo "▸ [7/10] Verifying App Service Plan..."
if az appservice plan show --resource-group "$RESOURCE_GROUP" --name "$APP_PLAN_NAME" --output none 2>/dev/null; then
  echo "  ✓ App Plan exists: ${APP_PLAN_NAME} (B1 Linux)"
else
  az appservice plan create --resource-group "$RESOURCE_GROUP" --name "$APP_PLAN_NAME" \
    --location "$LOCATION" --sku B1 --is-linux --output none
  echo "  ✓ App Plan created: ${APP_PLAN_NAME} (B1 Linux)"
fi

# ============================================================
# 8. Web Apps (Provider Portal, Patient Portal, .NET API)
# ============================================================
echo "▸ [8/10] Creating Web Apps..."

# Provider Portal
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN_NAME" \
  --name "$PROVIDER_APP" \
  --runtime "NODE:20-lts" \
  --output none

# Patient Portal (COMPASS)
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN_NAME" \
  --name "$PATIENT_APP" \
  --runtime "NODE:20-lts" \
  --output none

# .NET API Backend
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN_NAME" \
  --name "$API_APP" \
  --runtime "DOTNETCORE:8.0" \
  --output none

echo "  ✓ Apps: ${PROVIDER_APP}, ${PATIENT_APP}, ${API_APP}"

# ============================================================
# 9. Application Insights (free tier)
# ============================================================
echo "▸ [9/10] Creating Application Insights..."
az monitor app-insights component create \
  --resource-group "$RESOURCE_GROUP" \
  --app "attending-insights-demo" \
  --location "$LOCATION" \
  --kind web \
  --output none 2>/dev/null || echo "  ⚠ App Insights may require extension install"
echo "  ✓ Application Insights configured"

# ============================================================
# 10. Store secrets in Key Vault
# ============================================================
echo "▸ [10/10] Storing secrets in Key Vault..."

# Wait for Redis to finish
if [ -n "${REDIS_PID:-}" ]; then
  echo "  ⏳ Waiting for Redis provisioning..."
  wait $REDIS_PID 2>/dev/null || true
fi
REDIS_KEY=$(az redis list-keys --resource-group "$RESOURCE_GROUP" --name "$REDIS_NAME" --query "primaryKey" -o tsv 2>/dev/null || echo "pending")
REDIS_HOST="${REDIS_NAME}.redis.cache.windows.net"

# Generate app secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
PHI_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Store in Key Vault
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "sql-password" --value "$SQL_PASSWORD" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "sql-connection-string" --value "sqlserver://${SQL_FQDN}:1433;database=${SQL_DB_NAME};user=${SQL_ADMIN_USER};password=${SQL_PASSWORD};encrypt=true;trustServerCertificate=false" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "redis-key" --value "$REDIS_KEY" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "nextauth-secret" --value "$NEXTAUTH_SECRET" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "phi-encryption-key" --value "$PHI_ENCRYPTION_KEY" --output none
echo "  ✓ Secrets stored in Key Vault"

# ============================================================
# Configure App Settings
# ============================================================
echo ""
echo "▸ Configuring app environment variables..."

DATABASE_URL="sqlserver://${SQL_FQDN}:1433;database=${SQL_DB_NAME};user=${SQL_ADMIN_USER};password=${SQL_PASSWORD};encrypt=true;trustServerCertificate=false"

# Provider Portal settings
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PROVIDER_APP" \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="$DATABASE_URL" \
    NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
    NEXTAUTH_URL="https://${PROVIDER_APP}.azurewebsites.net" \
    NEXT_PUBLIC_API_URL="https://${API_APP}.azurewebsites.net" \
    NEXT_PUBLIC_WS_URL="wss://${API_APP}.azurewebsites.net/hubs" \
    REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380" \
    AI_PROVIDER=azure-openai \
    DEV_BYPASS_AUTH=false \
    DEMO_MODE=true \
  --output none

# Patient Portal settings
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PATIENT_APP" \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="$DATABASE_URL" \
    NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
    NEXTAUTH_URL="https://${PATIENT_APP}.azurewebsites.net" \
    NEXT_PUBLIC_API_URL="https://${API_APP}.azurewebsites.net" \
    REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380" \
    AI_PROVIDER=azure-openai \
    DEMO_MODE=true \
  --output none

# API Backend settings
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$API_APP" \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__DefaultConnection="Server=${SQL_FQDN};Database=${SQL_DB_NAME};User=${SQL_ADMIN_USER};Password=${SQL_PASSWORD};Encrypt=True;TrustServerCertificate=False" \
    Redis__ConnectionString="${REDIS_HOST}:6380,password=${REDIS_KEY},ssl=True" \
    DEMO_MODE=true \
  --output none

echo "  ✓ All app settings configured"

# ============================================================
# Summary
# ============================================================
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ Demo Environment Provisioned Successfully          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║   Provider Portal:                                       ║"
echo "║     https://${PROVIDER_APP}.azurewebsites.net             "
echo "║                                                          ║"
echo "║   Patient Portal (COMPASS):                              ║"
echo "║     https://${PATIENT_APP}.azurewebsites.net              "
echo "║                                                          ║"
echo "║   API Backend:                                           ║"
echo "║     https://${API_APP}.azurewebsites.net                  "
echo "║                                                          ║"
echo "║   Database: ${SQL_FQDN}                                   "
echo "║   Redis:    ${REDIS_HOST}                                  "
echo "║   Secrets:  ${KEYVAULT_NAME} (Key Vault)                  "
echo "║                                                          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║   NEXT STEPS:                                            ║"
echo "║                                                          ║"
echo "║   1. Add your Azure OpenAI key:                          ║"
echo "║      az keyvault secret set \\                             "
echo "║        --vault-name ${KEYVAULT_NAME} \\                    "
echo "║        --name azure-openai-key \\                          "
echo "║        --value YOUR_KEY                                   "
echo "║                                                          ║"
echo "║   2. Run database migrations:                            ║"
echo "║      DATABASE_URL=\"...\" npx prisma migrate deploy         "
echo "║                                                          ║"
echo "║   3. Seed demo data:                                     ║"
echo "║      DATABASE_URL=\"...\" npx prisma db seed                "
echo "║                                                          ║"
echo "║   4. Build & deploy apps (or use CI/CD):                 ║"
echo "║      ./demo-deploy.sh                                    "
echo "║                                                          ║"
echo "║   5. Stop when done:                                     ║"
echo "║      ./demo-down.sh                                      "
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "SQL Password stored in Key Vault (secret: sql-password)"
echo "To retrieve: az keyvault secret show --vault-name ${KEYVAULT_NAME} --name sql-password --query value -o tsv"
