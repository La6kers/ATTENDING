# ATTENDING AI — Terraform Infrastructure

## Architecture

```
Azure Resource Group (rg-attending-{env})
├── Azure SQL Server + Database (attending_db)
│   ├── TDE encryption at rest (HIPAA)
│   ├── 6-year long-term retention (HIPAA)
│   └── Geo-redundant backup
├── App Service Plan (Frontend) — P2v3 / B2
│   ├── Provider Portal (Next.js)
│   └── Patient Portal (Next.js)
├── App Service Plan (Backend) — P1v3 / B1
│   └── Orders API (.NET 8)
├── Redis Cache — Sessions, rate limiting
├── Key Vault — Secrets (DB creds, auth secrets)
├── Storage Account — PHI audit log archival
│   └── Lifecycle: Hot→Cool(90d)→Archive(1y)→Delete(6y)
└── Managed Identities → Key Vault access
```

## Quick Start

```bash
# Initialize
cd infrastructure/terraform
terraform init

# Plan staging
terraform plan -var-file=staging.tfvars \
  -var="sql_admin_password=YourSecurePassword"

# Apply staging
terraform apply -var-file=staging.tfvars \
  -var="sql_admin_password=YourSecurePassword"

# Push database schema
DATABASE_URL="sqlserver://sql-attending-staging..." npx prisma db push
```

## Environments

| Setting | Staging | Production |
|---------|---------|------------|
| SQL SKU | S1 (20 DTU) | S3 (100 DTU) |
| App Plan | B2 | P2v3 (reserved) |
| Redis | Basic C0 | Standard C1 |
| Zone redundant | No | Yes |
| Read replica | No | Yes |

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON for `azure/login` |
| `DATABASE_URL` | Prisma connection string for migrations |

## HIPAA Compliance

- **164.312(a)(2)(iv)** — TDE on Azure SQL, Key Vault for secrets
- **164.530(j)** — 6-year audit log retention via lifecycle policy
- **164.312(d)** — Managed identity auth, no credentials in code
