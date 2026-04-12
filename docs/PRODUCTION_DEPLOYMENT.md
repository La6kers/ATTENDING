# ATTENDING AI â€” Production Deployment Guide

## Architecture Overview

```
[Azure AD B2C] â†’ [Next.js Portals] â†’ [.NET Orders API] â†’ [SQL Server]
                                           â†•
                                    [Redis Cache]
                                    [SignalR Hub]
```

## Prerequisites

- Azure subscription with Resource Group `rg-attending-prod`
- Azure SQL Database (S2+ tier recommended)
- Azure Redis Cache (C1+ tier recommended)
- Azure App Service (B2+ tier) or AKS cluster
- Azure Key Vault for secrets
- Azure AD B2C tenant configured

## Environment Variables

### Required (.NET API)

```bash
# Database
ConnectionStrings__AttendingDb="Server=tcp:attending-sql.database.windows.net;Database=AttendingProd;..."

# Redis
ConnectionStrings__Redis="attending-redis.redis.cache.windows.net:6380,password=...,ssl=True"

# Azure AD
AzureAd__Instance="https://login.microsoftonline.com/"
AzureAd__TenantId="<tenant-id>"
AzureAd__ClientId="<client-id>"
AzureAd__Audience="api://attending-orders-api"

# Key Vault
KeyVault__VaultUri="https://attending-kv.vault.azure.net/"

# App Insights
ApplicationInsights__ConnectionString="InstrumentationKey=..."

# CORS
AllowedOrigins__0="https://provider.attendingai.com"
AllowedOrigins__1="https://patient.attendingai.com"
```

### Required (Next.js Portals)

```bash
NEXT_PUBLIC_API_URL=https://api.attendingai.com
NEXTAUTH_URL=https://provider.attendingai.com
NEXTAUTH_SECRET=<generated-secret>
AZURE_AD_B2C_TENANT_NAME=attendingai
AZURE_AD_B2C_CLIENT_ID=<client-id>
AZURE_AD_B2C_CLIENT_SECRET=<client-secret>
```

## Deployment Steps

### 1. Database Migration

```bash
cd backend/src/ATTENDING.Infrastructure
dotnet ef database update --connection "<prod-connection-string>" \
  --startup-project ../ATTENDING.Orders.Api
```

### 2. Build & Publish .NET API

```bash
cd backend/src/ATTENDING.Orders.Api
dotnet publish -c Release -o ./publish
```

### 3. Deploy to Azure App Service

```bash
az webapp deployment source config-zip \
  --resource-group rg-attending-prod \
  --name attending-orders-api \
  --src ./publish.zip
```

### 4. Verify Health Check

```bash
curl https://api.attendingai.com/health
# Expected: {"status":"Healthy","results":{"database":...,"redis":...}}
```

### 5. Deploy Next.js Portals

```bash
# Provider Portal
cd apps/provider-portal
npm run build
# Deploy to Azure Static Web Apps or App Service

# Patient Portal
cd apps/patient-portal
npm run build
```

## Health Checks

The API exposes health checks at `/health`:

| Check | What it validates |
|---|---|
| `database` | SQL Server connectivity + migration state |
| `redis` | Redis cache connectivity |

Detailed health UI available at `/health` with `HealthChecks.UI.Client`.

## Security Checklist

- [ ] Azure AD B2C configured with MFA
- [ ] API requires JWT Bearer authentication on all clinical endpoints
- [ ] CORS restricted to portal domains only
- [ ] HTTPS enforced (HSTS enabled)
- [ ] Key Vault for all secrets (no secrets in appsettings)
- [ ] SQL Server firewall rules â€” App Service IP only
- [ ] Redis SSL-only connections
- [ ] Audit logging enabled for all PHI access
- [ ] Application Insights configured for monitoring
- [ ] Rate limiting configured on API endpoints

## Monitoring & Alerts

### Recommended Azure Monitor Alerts

| Alert | Condition | Severity |
|---|---|---|
| API Error Rate | HTTP 5xx > 1% in 5min | Critical |
| Response Time | P95 > 2000ms | Warning |
| Database DTU | > 80% for 10min | Warning |
| Redis Memory | > 80% | Warning |
| Health Check Fail | Any health check unhealthy | Critical |
| Critical Lab Result | Custom event logged | Info |

### Log Queries (Application Insights / Seq)

```kusto
// Slow requests
requests
| where duration > 2000
| project timestamp, name, duration, resultCode
| order by duration desc

// PHI access audit trail
customEvents
| where name == "PhiAccess"
| project timestamp, customDimensions.UserId, customDimensions.PatientId, customDimensions.Action

// Domain events dispatched
traces
| where message contains "EMERGENCY" or message contains "CRITICAL"
| order by timestamp desc
```

## Rollback Procedure

1. Azure App Service â†’ Deployment Slots â†’ Swap back to previous slot
2. Database: EF Core migrations are forward-only; plan rollback scripts for schema changes
3. Redis: Flush cache if schema changes (`FLUSHDB` â€” safe, data is ephemeral)

## Scaling

| Component | Scale Strategy |
|---|---|
| .NET API | Horizontal (Azure App Service auto-scale on CPU/memory) |
| SQL Server | Vertical (increase DTU tier) or read replicas |
| Redis | Vertical (upgrade cache tier) |
| SignalR | Azure SignalR Service (serverless mode) for >1000 connections |
