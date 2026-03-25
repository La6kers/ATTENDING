#!/bin/bash
# ============================================================
# ATTENDING AI - Azure Resource Setup Script
#
# Run this ONCE to create all Azure resources needed for deployment.
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Subscription selected (az account set --subscription <id>)
#
# Usage: bash azure-setup.sh [staging|production]
# ============================================================

set -euo pipefail

ENV="${1:-staging}"
RESOURCE_GROUP="attending-rg"
LOCATION="centralus"  # Central US — close to Missouri (RHTP target)
APP_NAME="attending-ai"
ACR_NAME="attendingacr"
SQL_SERVER="attending-sql-${ENV}"
SQL_DB="attending-${ENV}"
SQL_ADMIN="attendingadmin"
KEY_VAULT="attending-kv-${ENV}"

echo "============================================"
echo "ATTENDING AI - Azure Setup (${ENV})"
echo "============================================"

# --- Resource Group ---
echo "Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags project=attending environment="$ENV"

# --- Container Registry ---
echo "Creating container registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials for GitHub secrets
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)
echo "ACR_USERNAME: $ACR_USERNAME"
echo "ACR_PASSWORD: $ACR_PASSWORD"
echo "(Save these as GitHub secrets: ACR_USERNAME, ACR_PASSWORD)"

# --- App Service Plan ---
echo "Creating App Service plan..."
az appservice plan create \
  --resource-group "$RESOURCE_GROUP" \
  --name "${APP_NAME}-plan" \
  --sku B1 \
  --is-linux

# --- App Service (main) ---
echo "Creating App Service..."
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "${APP_NAME}-plan" \
  --name "$APP_NAME" \
  --deployment-container-image-name "${ACR_NAME}.azurecr.io/attending-ai/app:latest"

# Enable WebSocket support
az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --web-sockets-enabled true

# Set container port
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings \
    WEBSITES_PORT=8080 \
    PORT=8080 \
    NODE_ENV=production \
    DOCKER_ENABLE_CI=true

# --- Staging Slot ---
echo "Creating staging deployment slot..."
az webapp deployment slot create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --slot staging

# --- ACR webhook for continuous deployment ---
az acr webhook create \
  --registry "$ACR_NAME" \
  --name "appServiceDeploy" \
  --actions push \
  --uri "$(az webapp deployment container config --enable-cd true \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --query CI_CD_URL -o tsv)"

# --- Key Vault ---
echo "Creating Key Vault..."
az keyvault create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$KEY_VAULT" \
  --location "$LOCATION" \
  --sku standard

# Grant App Service access to Key Vault
APP_IDENTITY=$(az webapp identity assign \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --query principalId -o tsv)

az keyvault set-policy \
  --name "$KEY_VAULT" \
  --object-id "$APP_IDENTITY" \
  --secret-permissions get list

# --- Azure SQL (optional — skip if using SQLite for demo) ---
if [ "$ENV" = "production" ]; then
  echo "Creating Azure SQL Server..."
  SQL_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')

  az sql server create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$SQL_SERVER" \
    --admin-user "$SQL_ADMIN" \
    --admin-password "$SQL_PASSWORD" \
    --location "$LOCATION"

  az sql db create \
    --resource-group "$RESOURCE_GROUP" \
    --server "$SQL_SERVER" \
    --name "$SQL_DB" \
    --service-objective S0 \
    --zone-redundant false

  # Enable TDE (default on Azure SQL, but explicit)
  az sql db tde set \
    --resource-group "$RESOURCE_GROUP" \
    --server "$SQL_SERVER" \
    --database "$SQL_DB" \
    --status Enabled

  # Allow Azure services
  az sql server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" \
    --server "$SQL_SERVER" \
    --name "AllowAzureServices" \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0

  # Store connection string in Key Vault
  CONN_STRING="sqlserver://${SQL_SERVER}.database.windows.net:1433;database=${SQL_DB};user=${SQL_ADMIN};password=${SQL_PASSWORD};encrypt=true"
  az keyvault secret set \
    --vault-name "$KEY_VAULT" \
    --name "database-url" \
    --value "$CONN_STRING"

  echo "SQL Password saved to Key Vault. DO NOT store elsewhere."
fi

# --- Application Insights ---
echo "Creating Application Insights..."
az monitor app-insights component create \
  --resource-group "$RESOURCE_GROUP" \
  --app "${APP_NAME}-insights" \
  --location "$LOCATION" \
  --kind web

APPINSIGHTS_KEY=$(az monitor app-insights component show \
  --resource-group "$RESOURCE_GROUP" \
  --app "${APP_NAME}-insights" \
  --query instrumentationKey -o tsv)

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=${APPINSIGHTS_KEY}"

# --- GitHub Actions Service Principal ---
echo ""
echo "============================================"
echo "SETUP COMPLETE"
echo "============================================"
echo ""
echo "Add these GitHub repository secrets:"
echo "  ACR_USERNAME: $ACR_USERNAME"
echo "  ACR_PASSWORD: $ACR_PASSWORD"
echo "  AZURE_RESOURCE_GROUP: $RESOURCE_GROUP"
echo ""
echo "For AZURE_CREDENTIALS, run:"
echo "  az ad sp create-for-rbac --name attending-github-deploy \\"
echo "    --role contributor \\"
echo "    --scopes /subscriptions/\$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP \\"
echo "    --json-auth"
echo ""
echo "Then paste the full JSON output as the AZURE_CREDENTIALS secret."
echo ""
echo "Estimated monthly cost (B1 plan + S0 SQL):"
echo "  App Service B1:  ~\$13/mo"
echo "  SQL Database S0: ~\$15/mo"
echo "  ACR Basic:       ~\$5/mo"
echo "  Key Vault:       ~\$0.03/10K ops"
echo "  App Insights:    Free tier (5GB/mo)"
echo "  Total:           ~\$35-40/mo"
