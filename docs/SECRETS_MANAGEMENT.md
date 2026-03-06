# ATTENDING AI — Secrets Management Guide

**Last Updated:** March 2026

---

## Overview

ATTENDING AI uses Azure Key Vault as the canonical secrets store for production environments. Local development uses `appsettings.Development.json` and user-secrets.

---

## Architecture

```
Production:
  Program.cs → AddAzureKeyVault() → Azure Key Vault → Configuration values

Development:
  Program.cs → appsettings.Development.json → User Secrets → Configuration values
```

### Key Vault Integration (Program.cs)

Azure Key Vault is added to the configuration pipeline when `AzureKeyVault:Uri` is set:

```csharp
var keyVaultUri = builder.Configuration["AzureKeyVault:Uri"];
if (!string.IsNullOrWhiteSpace(keyVaultUri))
{
    builder.Configuration.AddAzureKeyVault(
        new Uri(keyVaultUri),
        new Azure.Identity.DefaultAzureCredential());
}
```

Authentication uses `DefaultAzureCredential`, which supports:
- Managed Identity (production — Azure App Service)
- Azure CLI credentials (local development)
- Visual Studio credentials (IDE development)
- Environment variables (CI/CD pipelines)

---

## Secrets Inventory

| Secret | Key Vault Name | Config Path | Used By |
|--------|---------------|-------------|---------|
| SQL Server connection | `ConnectionStrings--AttendingDb` | `ConnectionStrings:AttendingDb` | EF Core |
| Redis connection | `ConnectionStrings--Redis` | `ConnectionStrings:Redis` | Cache, SignalR |
| Azure AD B2C client secret | `AzureAdB2C--ClientSecret` | `AzureAdB2C:ClientSecret` | Authentication |
| Clinical AI API key | `ClinicalAi--ApiKey` | `ClinicalAi:ApiKey` | BioMistral/Ollama |
| Ambient Scribe API key | `AmbientScribe--ApiKey` | `AmbientScribe:ApiKey` | Anthropic API |
| FHIR client secret (Epic) | `Fhir--ClientSecret` | `Fhir:ClientSecret` | Epic EHR |
| FHIR client secret (Cerner) | `FhirCerner--ClientSecret` | `FhirCerner:ClientSecret` | Oracle Health |
| NextAuth secret | `NextAuth--Secret` | `NEXTAUTH_SECRET` | Session encryption |
| Drug interaction API key | `DrugInteractionApi--ApiKey` | `DrugInteractionApi:ApiKey` | NIH/OpenFDA |

### Naming Convention

Azure Key Vault uses `--` as a hierarchy separator (`:` is not allowed in vault secret names):
- Config key: `ConnectionStrings:AttendingDb`
- Vault name: `ConnectionStrings--AttendingDb`

---

## Local Development Setup

### Option 1: User Secrets (Recommended)

```bash
cd backend/src/ATTENDING.Orders.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:AttendingDb" "Server=localhost,1433;..."
dotnet user-secrets set "ClinicalAi:ApiKey" "your-key-here"
```

### Option 2: appsettings.Development.json

Already configured with safe development defaults. Never commit real secrets to this file.

### Option 3: Environment Variables

```bash
export ConnectionStrings__AttendingDb="Server=localhost,1433;..."
export ClinicalAi__ApiKey="your-key-here"
```

---

## Production Deployment

### Azure Key Vault Setup

```bash
# Create Key Vault
az keyvault create \
  --name attending-kv-prod \
  --resource-group attending-rg \
  --location westus2 \
  --sku standard

# Grant access to App Service managed identity
az keyvault set-policy \
  --name attending-kv-prod \
  --object-id <app-service-identity-object-id> \
  --secret-permissions get list

# Add secrets
az keyvault secret set \
  --vault-name attending-kv-prod \
  --name "ConnectionStrings--AttendingDb" \
  --value "Server=tcp:attending-sql.database.windows.net,1433;..."
```

### App Service Configuration

Set the vault name in App Service configuration:
```
AzureKeyVault__Uri=https://attending-kv-prod.vault.azure.net/
```

---

## Secret Rotation

| Secret | Rotation Frequency | Automation |
|--------|-------------------|------------|
| SQL Server password | 90 days | Azure Key Vault rotation policy |
| Redis password | 90 days | Azure Key Vault rotation policy |
| AD B2C client secret | 180 days | Manual (regenerate in Azure portal) |
| API keys | 90 days | Manual |

### Rotation Procedure

1. Generate new secret value
2. Add new version in Key Vault: `az keyvault secret set --vault-name attending-kv-prod --name <secret-name> --value <new-value>`
3. Restart App Service to pick up new configuration
4. Verify health endpoints: `GET /health/ready`
5. Revoke old secret if applicable

---

## Security Best Practices

1. **Never** commit secrets to source control
2. **Always** use managed identity for Key Vault access (no client secrets for the vault itself)
3. **Enable** soft-delete and purge protection on Key Vault
4. **Monitor** Key Vault access via Azure diagnostic logs
5. **Restrict** network access to Key Vault (VNet service endpoints)
6. **Use** separate Key Vaults for each environment (dev, staging, production)
7. **Audit** secret access through Key Vault audit logs and ATTENDING's own audit trail
