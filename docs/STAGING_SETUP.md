# ATTENDING AI — Staging Deployment Setup

**Purpose:** One-time manual steps to stand up the Azure staging environment. Once complete, every merge to `main` deploys automatically with zero-downtime blue-green swaps.

**Estimated time:** 3–4 hours (most of it is waiting for Azure provisioning).

---

## Prerequisites

- Azure CLI installed (`az --version`)
- Terraform ≥ 1.5 installed (`terraform --version`)
- Docker Desktop running
- Access to the ATTENDING GitHub repository with Admin permissions
- An Azure subscription with Contributor role

---

## Step 1 — Create the Terraform state storage

This is needed before `terraform init` can work. Run once per subscription.

```bash
az login
az account set --subscription "<your-subscription-id>"

# Create resource group for state storage
az group create \
  --name attending-terraform-state \
  --location westus2

# Create storage account (name must be globally unique)
az storage account create \
  --name attendingtfstate \
  --resource-group attending-terraform-state \
  --location westus2 \
  --sku Standard_LRS \
  --allow-blob-public-access false

# Create the state container
az storage container create \
  --name tfstate \
  --account-name attendingtfstate
```

---

## Step 2 — Provision Azure infrastructure (Terraform)

```bash
cd infrastructure/terraform

terraform init

# Preview what will be created (no changes yet)
terraform plan \
  -var-file=staging.tfvars \
  -var="sql_admin_password=<CHOOSE-STRONG-PASSWORD>" \
  -out=staging.plan

# Review the plan, then apply
terraform apply staging.plan
```

This creates (~8 minutes):
- Resource group: `rg-attending-staging`
- Azure SQL Server + Database
- App Service Plan + 3 App Services (provider portal, patient portal, orders API)
- **Staging slots** for all 3 App Services (blue-green ready)
- Redis Cache (Basic C0)
- Key Vault
- Storage account for PHI audit log archival

**Save the outputs** — you'll need them for the next steps:

```bash
terraform output
```

---

## Step 3 — Populate Key Vault secrets

The Terraform creates the Key Vault and App Service managed identities, but you must set the actual secret values.

```bash
KV_NAME="kv-attending-staging"

# SQL Server connection string (Prisma / Next.js format)
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "database-url" \
  --value "sqlserver://<sql-fqdn>:1433;database=attending_db;user=attendingadmin;password=<SQL-PASSWORD>;encrypt=true;trustServerCertificate=false"

# SQL Server connection string (.NET / EF Core format)
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "database-url-dotnet" \
  --value "Server=tcp:<sql-fqdn>,1433;Initial Catalog=attending_db;User ID=attendingadmin;Password=<SQL-PASSWORD>;Encrypt=True;TrustServerCertificate=False;"

# NextAuth secret (generate a strong one)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "nextauth-secret" \
  --value "$NEXTAUTH_SECRET"

echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
# Save this somewhere secure — you'll need it for Azure B2C config
```

---

## Step 4 — Update appsettings.Staging.json with real values

Open `backend/src/ATTENDING.Orders.Api/appsettings.Staging.json` and fill in:

| Field | Value |
|-------|-------|
| `AzureAdB2C.ClientId` | From Azure AD B2C app registration (Step 5) |
| `AzureKeyVault.Uri` | From `terraform output key_vault_uri` |
| `Serilog.WriteTo[Seq].serverUrl` | Your Seq instance URL (or remove the Seq sink) |

The `ConnectionStrings` entries stay empty — they're pulled from Key Vault via the `@Microsoft.KeyVault(...)` app setting references that Terraform already configured.

---

## Step 5 — Configure Azure AD B2C (authentication)

> Skip this step for initial staging with DevBypass. B2C is required before real users can log in.

1. In the Azure Portal, navigate to your Azure AD B2C tenant (or create one at `portal.azure.com` → Create resource → Azure Active Directory B2C)
2. Create user flows:
   - Sign-up / sign-in: `B2C_1_signupsignin1`
   - Password reset: `B2C_1_passwordreset`
3. Register the API app:
   - Name: `ATTENDING Orders API`
   - Expose API → Add scope: `access_as_user`
   - Copy the **Application (client) ID** → update `AzureAdB2C.ClientId` in appsettings.Staging.json
4. Register the portal app:
   - Name: `ATTENDING Provider Portal`
   - Redirect URIs: `https://app-attending-staging-provider.azurewebsites.net/api/auth/callback/azure-ad-b2c`
   - Copy the **Client ID** and **Client Secret** → add to GitHub Environment secrets (step 6)

---

## Step 6 — Add GitHub Environment secrets

In your repository: **Settings → Environments → staging → Add secret**

| Secret name | Value |
|-------------|-------|
| `AZURE_CREDENTIALS` | Service principal JSON (see below) |
| `AZURE_RESOURCE_GROUP` | `rg-attending-staging` |
| `ATTENDING_DB_CONNECTION` | Same .NET connection string as Key Vault secret |
| `DATABASE_URL` | Same Prisma connection string as Key Vault secret |
| `SMOKE_API_TOKEN` | Bearer token for a read-only staging service account |

**Generate `AZURE_CREDENTIALS`:**

```bash
az ad sp create-for-rbac \
  --name "attending-github-actions-staging" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/rg-attending-staging \
  --json-auth
```

Copy the entire JSON output as the `AZURE_CREDENTIALS` secret value.

**Generate `SMOKE_API_TOKEN`:**

Once the API is running, create a service account user via the Admin API and extract a JWT. For now, use the DevBypass header workaround if available, or deploy without the smoke step temporarily.

---

## Step 7 — First manual deploy (bootstrap)

The CI pipeline deploys to a staging slot then swaps. On the very first deploy, the staging slot doesn't have the app yet — the App Service will return 404. That's fine; the swap step handles it.

Trigger the first deploy:

```bash
# From your local machine, push to develop
git push origin develop

# Or trigger manually from the GitHub Actions UI:
# Actions → Deploy to Azure → Run workflow → staging
```

Watch the pipeline in GitHub Actions. Expected duration: ~12 minutes.

---

## Step 8 — Run EF Core migrations manually (first time only)

The CI `migrate` job handles this going forward, but the first run needs the connection string in your local environment:

```bash
cd backend

export ATTENDING_DB_CONNECTION="Server=tcp:<sql-fqdn>,1433;Initial Catalog=attending_db;User ID=attendingadmin;Password=<SQL-PASSWORD>;Encrypt=True;TrustServerCertificate=False;"

dotnet ef database update \
  --project src/ATTENDING.Infrastructure \
  --startup-project src/ATTENDING.Orders.Api \
  --connection "$ATTENDING_DB_CONNECTION"
```

---

## Step 9 — Verify the staging environment

```bash
# Check all health endpoints
curl https://app-attending-staging-api.azurewebsites.net/health/ready
curl https://app-attending-staging-provider.azurewebsites.net/api/health
curl https://app-attending-staging-patient.azurewebsites.net/api/health

# Run the smoke test manually against staging
k6 run \
  -e BASE_URL=https://app-attending-staging-api.azurewebsites.net \
  -e API_TOKEN=<SMOKE_API_TOKEN> \
  infrastructure/load-testing/smoke.js
```

Expected output: all three health checks return 200, smoke test shows `✅ PASSED`.

---

## What's automated after this

Once setup is complete, every merge to `main` or `develop` automatically:

1. Builds Docker images for all 3 services
2. Runs EF Core + Prisma migrations
3. Deploys to the staging slot (production traffic unaffected)
4. Runs the k6 smoke test against the staging slot
5. Swaps staging → production only if smoke passes
6. Health-checks production and writes a summary to the Actions log

**Manual rollback** (if needed after a bad swap):

```bash
az webapp deployment slot swap \
  --resource-group rg-attending-staging \
  --name app-attending-staging-api \
  --slot staging \
  --target-slot production
# Repeat for -provider and -patient
```

---

## Estimated monthly cost (staging)

| Resource | SKU | Est. monthly |
|---------|-----|-------------|
| App Service Plan (frontend) | B2 Linux | ~$75 |
| App Service Plan (backend) | B1 Linux | ~$13 |
| Azure SQL Database | S1 (20 DTU) | ~$30 |
| Redis Cache | Basic C0 | ~$17 |
| Key Vault | Standard | ~$5 |
| Storage (audit logs) | Standard LRS | <$1 |
| **Total** | | **~$141/mo** |

Staging can be shut down outside business hours to reduce costs:

```bash
az webapp stop --resource-group rg-attending-staging --name app-attending-staging-api
az webapp stop --resource-group rg-attending-staging --name app-attending-staging-provider
az webapp stop --resource-group rg-attending-staging --name app-attending-staging-patient
```
