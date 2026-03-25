# Azure Infrastructure Configuration

## Storage Lifecycle Policy

The lifecycle policy automates blob tiering for PHI audit logs to reduce storage costs by ~70%.

### Tiering Schedule

| Age | Tier | Purpose |
|-----|------|---------|
| 0–90 days | Hot | Active compliance queries |
| 90–365 days | Cool | Infrequent access |
| 365–2190 days | Archive | HIPAA 6-year retention |
| 2190+ days | Delete | Auto-purge |

### Deploy

```bash
# Apply the lifecycle policy
az storage account management-policy create \
  --account-name attendingaistorage \
  --resource-group attending-ai-prod \
  --policy @infrastructure/azure/storage-lifecycle-policy.json

# Verify
az storage account management-policy show \
  --account-name attendingaistorage \
  --resource-group attending-ai-prod
```

### Additional Rules

- **FHIR Exports**: Moved to Cool after 7 days, deleted after 90 days
- **Temp Files**: Deleted after 1 day

### HIPAA Compliance Note

HIPAA requires 6-year retention for audit logs (45 CFR §164.530(j)). The Archive tier maintains data at minimal cost. Deletion occurs only after 2190 days (6 years).
