#!/usr/bin/env bash
# ============================================================
# ATTENDING AI — Azure Deployment Script
# infrastructure/azure/deploy.sh
#
# Prerequisites:
#   - Azure CLI installed (az --version)
#   - Logged in (az login)
#   - Docker installed
#
# Usage:
#   ./deploy.sh              # Deploy everything
#   ./deploy.sh --skip-db    # Skip database creation
#   ./deploy.sh --env staging # Deploy to staging
# ============================================================

set -euo pipefail

# ============================================================
# Configuration — override via environment or .env file
# ============================================================

ENV="${AZURE_ENV:-production}"
RESOURCE_GROUP="${AZURE_RG:-attending-${ENV}-rg}"
LOCATION="${AZURE_LOCATION:-eastus}"
ACR_NAME="${AZURE_ACR:-attendingacr}"
SQL_SERVER_NAME="${AZURE_SQL_SERVER:-attending-sql-${ENV}}"
SQL_DB_NAME="${AZURE_SQL_DB:-attending-db-${ENV}}"
SQL_ADMIN_USER="${AZURE_SQL_ADMIN:-attendingadmin}"
REDIS_NAME="${AZURE_REDIS:-attending-redis-${ENV}}"
APP_PLAN_NAME="${AZURE_PLAN:-attending-plan-${ENV}}"
PORTAL_APP_NAME="${AZURE_PORTAL_APP:-attending-portal-${ENV}}"
API_APP_NAME="${AZURE_API_APP:-attending-api-${ENV}}"
STORAGE_ACCOUNT="${AZURE_STORAGE:-attendingstorage${ENV}}"
KEYVAULT_NAME="${AZURE_KV:-attending-kv-${ENV}}"

SKIP_DB=false
for arg in "$@"; do
  case $arg in
    --skip-db) SKIP_DB=true ;;
    --env) shift; ENV="$1" ;;
  esac
done

echo "========================================"
echo "  ATTENDING AI — Azure Deployment"
echo "  Environment: ${ENV}"
echo "  Resource Group: ${RESOURCE_GROUP}"
echo "  Location: ${LOCATION}"
echo "========================================"

# ============================================================
# Step 1: Resource Group
# ============================================================

echo ""
echo ">>> Step 1: Creating Resource Group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags project=attending-ai environment="$ENV" hipaa=compliant \
  --output none

echo "    ✓ Resource group: $RESOURCE_GROUP"

# ============================================================
# Step 2: Azure Container Registry
# ============================================================

echo ""
echo ">>> Step 2: Creating Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none 2>/dev/null || echo "    (ACR already exists)"

az acr login --name "$ACR_NAME" --output none
echo "    ✓ ACR: ${ACR_NAME}.azurecr.io"

# ============================================================
# Step 3: Azure Key Vault (for secrets)
# ============================================================

echo ""
echo ">>> Step 3: Creating Key Vault..."
az keyvault create \
  --name "$KEYVAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --enable-soft-delete true \
  --retention-days 90 \
  --output none 2>/dev/null || echo "    (Key Vault already exists)"

echo "    ✓ Key Vault: $KEYVAULT_NAME"

# ============================================================
# Step 4: Azure SQL Database
# ============================================================

if [ "$SKIP_DB" = false ]; then
  echo ""
  echo ">>> Step 4: Creating SQL Server and Database..."

  # Generate a strong password
  SQL_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')

  az sql server create \
    --name "$SQL_SERVER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --admin-user "$SQL_ADMIN_USER" \
    --admin-password "$SQL_PASSWORD" \
    --output none 2>/dev/null || echo "    (SQL Server already exists)"

  az sql db create \
    --resource-group "$RESOURCE_GROUP" \
    --server "$SQL_SERVER_NAME" \
    --name "$SQL_DB_NAME" \
    --service-objective S1 \
    --zone-redundant false \
    --output none 2>/dev/null || echo "    (Database already exists)"

  # Allow Azure services
  az sql server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" \
    --server "$SQL_SERVER_NAME" \
    --name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0 \
    --output none 2>/dev/null || true

  # Store password in Key Vault
  az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name sql-admin-password \
    --value "$SQL_PASSWORD" \
    --output none

  SQL_FQDN="${SQL_SERVER_NAME}.database.windows.net"
  DATABASE_URL="sqlserver://${SQL_FQDN}:1433;database=${SQL_DB_NAME};user=${SQL_ADMIN_USER};password=${SQL_PASSWORD};encrypt=true;trustServerCertificate=false"

  echo "    ✓ SQL Server: $SQL_FQDN"
  echo "    ✓ Database: $SQL_DB_NAME"
  echo "    ✓ Password stored in Key Vault"
fi

# ============================================================
# Step 5: Azure Cache for Redis
# ============================================================

echo ""
echo ">>> Step 5: Creating Redis Cache..."
az redis create \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Basic \
  --vm-size c0 \
  --minimum-tls-version 1.2 \
  --output none 2>/dev/null || echo "    (Redis already exists)"

REDIS_KEY=$(az redis list-keys \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query primaryKey -o tsv 2>/dev/null || echo "")

REDIS_HOST="${REDIS_NAME}.redis.cache.windows.net"
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380"

# Store in Key Vault
if [ -n "$REDIS_KEY" ]; then
  az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name redis-connection-string \
    --value "$REDIS_URL" \
    --output none
fi

echo "    ✓ Redis: $REDIS_HOST"

# ============================================================
# Step 6: Azure Blob Storage (audit log archival)
# ============================================================

echo ""
echo ">>> Step 6: Creating Storage Account..."
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --output none 2>/dev/null || echo "    (Storage account already exists)"

# Create audit log container
STORAGE_KEY=$(az storage account keys list \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" \
  --query '[0].value' -o tsv 2>/dev/null || echo "")

if [ -n "$STORAGE_KEY" ]; then
  az storage container create \
    --name audit-logs \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --output none 2>/dev/null || true
fi

echo "    ✓ Storage: $STORAGE_ACCOUNT"

# ============================================================
# Step 7: Build & Push Docker Images
# ============================================================

echo ""
echo ">>> Step 7: Building and Pushing Docker Images..."
cd "$(git rev-parse --show-toplevel)"

# Provider portal (Next.js)
echo "    Building provider-portal..."
docker build \
  -t "${ACR_NAME}.azurecr.io/provider-portal:latest" \
  -f apps/provider-portal/Dockerfile \
  . 2>/dev/null && \
docker push "${ACR_NAME}.azurecr.io/provider-portal:latest" 2>/dev/null || \
echo "    (Skipping Docker build — no Dockerfile found or Docker not running)"

# Backend (.NET)
echo "    Building backend API..."
docker build \
  -t "${ACR_NAME}.azurecr.io/attending-api:latest" \
  -f backend/Dockerfile \
  . 2>/dev/null && \
docker push "${ACR_NAME}.azurecr.io/attending-api:latest" 2>/dev/null || \
echo "    (Skipping Docker build — no Dockerfile found or Docker not running)"

# ============================================================
# Step 8: App Service Plan
# ============================================================

echo ""
echo ">>> Step 8: Creating App Service Plan..."
az appservice plan create \
  --name "$APP_PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --sku B2 \
  --is-linux \
  --output none 2>/dev/null || echo "    (Plan already exists)"

echo "    ✓ App Service Plan: $APP_PLAN_NAME (B2 Linux)"

# ============================================================
# Step 9: Provider Portal Web App
# ============================================================

echo ""
echo ">>> Step 9: Creating Provider Portal Web App..."
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN_NAME" \
  --name "$PORTAL_APP_NAME" \
  --deployment-container-image-name "${ACR_NAME}.azurecr.io/provider-portal:latest" \
  --output none 2>/dev/null || echo "    (Web App already exists)"

# Generate NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PORTAL_APP_NAME" \
  --settings \
    NODE_ENV=production \
    NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
    NEXTAUTH_URL="https://${PORTAL_APP_NAME}.azurewebsites.net" \
    DATABASE_URL="${DATABASE_URL:-placeholder}" \
    REDIS_URL="${REDIS_URL:-placeholder}" \
    AZURE_STORAGE_ACCOUNT="$STORAGE_ACCOUNT" \
    AZURE_STORAGE_CONTAINER=audit-logs \
  --output none

echo "    ✓ Portal: https://${PORTAL_APP_NAME}.azurewebsites.net"

# ============================================================
# Step 10: Backend API Web App
# ============================================================

echo ""
echo ">>> Step 10: Creating Backend API Web App..."
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN_NAME" \
  --name "$API_APP_NAME" \
  --deployment-container-image-name "${ACR_NAME}.azurecr.io/attending-api:latest" \
  --output none 2>/dev/null || echo "    (Web App already exists)"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$API_APP_NAME" \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__DefaultConnection="${DATABASE_URL:-placeholder}" \
    Redis__ConnectionString="${REDIS_URL:-placeholder}" \
  --output none

echo "    ✓ API: https://${API_APP_NAME}.azurewebsites.net"

# ============================================================
# Step 11: Enable Continuous Deployment
# ============================================================

echo ""
echo ">>> Step 11: Configuring Continuous Deployment..."
az webapp deployment container config \
  --enable-cd true \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PORTAL_APP_NAME" \
  --output none 2>/dev/null || true

# ACR webhook for auto-deploy on push
CD_URL=$(az webapp deployment container show-cd-url \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PORTAL_APP_NAME" \
  --query CI_CD_URL -o tsv 2>/dev/null || echo "")

if [ -n "$CD_URL" ]; then
  az acr webhook create \
    --name portalWebhook \
    --registry "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --actions push \
    --uri "$CD_URL" \
    --scope "provider-portal:latest" \
    --output none 2>/dev/null || true
fi

echo "    ✓ Continuous deployment enabled"

# ============================================================
# Step 12: Application Insights (monitoring)
# ============================================================

echo ""
echo ">>> Step 12: Creating Application Insights..."
az monitor app-insights component create \
  --app "attending-insights-${ENV}" \
  --location "$LOCATION" \
  --resource-group "$RESOURCE_GROUP" \
  --application-type web \
  --output none 2>/dev/null || echo "    (App Insights already exists)"

INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app "attending-insights-${ENV}" \
  --resource-group "$RESOURCE_GROUP" \
  --query instrumentationKey -o tsv 2>/dev/null || echo "")

if [ -n "$INSTRUMENTATION_KEY" ]; then
  az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PORTAL_APP_NAME" \
    --settings APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=${INSTRUMENTATION_KEY}" \
    --output none

  az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$API_APP_NAME" \
    --settings APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=${INSTRUMENTATION_KEY}" \
    --output none
fi

echo "    ✓ Application Insights configured"

# ============================================================
# Summary
# ============================================================

echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "  Resources created in: $RESOURCE_GROUP"
echo ""
echo "  Portal:  https://${PORTAL_APP_NAME}.azurewebsites.net"
echo "  API:     https://${API_APP_NAME}.azurewebsites.net"
echo "  ACR:     ${ACR_NAME}.azurecr.io"
echo "  SQL:     ${SQL_SERVER_NAME:-existing}.database.windows.net"
echo "  Redis:   ${REDIS_NAME}.redis.cache.windows.net"
echo "  Storage: ${STORAGE_ACCOUNT}"
echo "  Vault:   ${KEYVAULT_NAME}"
echo ""
echo "  Next steps:"
echo "  1. Run Prisma migration:  az webapp ssh --name $PORTAL_APP_NAME --resource-group $RESOURCE_GROUP"
echo "     Then inside:  npx prisma db push"
echo "  2. Configure custom domain: az webapp config hostname add ..."
echo "  3. Add SSL: az webapp config ssl create ..."
echo "  4. Run smoke test: k6 run infrastructure/load-testing/smoke.js"
echo "  5. Set up WAF (Web Application Firewall) for HIPAA compliance"
echo ""
