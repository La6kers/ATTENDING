# ATTENDING AI — Zero-Downtime Migration Strategy

**Last Updated:** March 2026
**Purpose:** Procedures for database and application migrations with zero downtime.

---

## Principles

1. **Never break the running application** — migrations must be backward-compatible
2. **Expand-and-contract pattern** — add new columns/tables first, remove old ones later
3. **Feature flags** — gate new behavior behind toggles during transition
4. **Rollback plan** — every migration has a documented rollback procedure

---

## Database Migration Workflow

### Phase 1: Expand (Deploy migration, keep old code running)

```
Step 1: Add new column(s) as NULLABLE (or with default values)
Step 2: Deploy migration to production
Step 3: Verify migration succeeded
Step 4: Old application version continues working (ignores new columns)
```

### Phase 2: Migrate (Deploy new code that writes to both old and new)

```
Step 5: Deploy application code that writes to BOTH old and new columns
Step 6: Run backfill script to populate new columns from existing data
Step 7: Verify all rows have valid data in new columns
```

### Phase 3: Contract (Remove old columns once all code uses new ones)

```
Step 8: Deploy code that only reads from new columns
Step 9: Monitor for errors (1-2 weeks)
Step 10: Drop old columns in a cleanup migration
```

---

## EF Core Migration Commands

```bash
# Create a new migration
cd backend/src/ATTENDING.Infrastructure
dotnet ef migrations add <MigrationName> \
  --startup-project ../ATTENDING.Orders.Api \
  --context AttendingDbContext

# Generate SQL script (for review before production)
dotnet ef migrations script \
  --startup-project ../ATTENDING.Orders.Api \
  --context AttendingDbContext \
  --idempotent \
  --output ./migration.sql

# Apply migration
dotnet ef database update \
  --startup-project ../ATTENDING.Orders.Api \
  --context AttendingDbContext
```

---

## Pre-Migration Checklist

- [ ] Migration SQL reviewed by second engineer
- [ ] Backward compatibility verified (old code works with new schema)
- [ ] Rollback script prepared and tested
- [ ] Database backup taken
- [ ] Off-peak deployment window selected
- [ ] Monitoring dashboards open (Prometheus, Application Insights)
- [ ] Health check endpoints verified: `GET /health/ready`
- [ ] Blue-green deployment slots configured

---

## Rollback Procedures

### Application Rollback (Instant)

```bash
# Swap back to previous slot
az webapp deployment slot swap \
  --resource-group attending-rg \
  --name attending-api \
  --slot staging \
  --target-slot production
```

### Database Rollback (Requires script)

```bash
# Generate rollback script
dotnet ef migrations script <CurrentMigration> <PreviousMigration> \
  --startup-project ../ATTENDING.Orders.Api \
  --context AttendingDbContext \
  --idempotent \
  --output ./rollback.sql

# Review and execute
sqlcmd -S <server> -d <database> -i rollback.sql
```

---

## Example: Adding a New Field

### Scenario: Add `preferredLanguage` to Patient

**Expand migration:**
```csharp
migrationBuilder.AddColumn<string>(
    name: "PreferredLanguage",
    table: "Patients",
    type: "nvarchar(10)",
    nullable: true,       // MUST be nullable initially
    defaultValue: null);
```

**New code (writes both):**
```csharp
patient.PreferredLanguage = request.PreferredLanguage ?? "en";
```

**Backfill:**
```sql
UPDATE Patients SET PreferredLanguage = 'en' WHERE PreferredLanguage IS NULL;
```

**Contract migration (after verification):**
```csharp
migrationBuilder.AlterColumn<string>(
    name: "PreferredLanguage",
    table: "Patients",
    type: "nvarchar(10)",
    nullable: false,      // Now safe to make non-nullable
    defaultValue: "en");
```

---

## Soft Delete Considerations

ATTENDING uses soft-delete for all PHI data. Migrations must:
- Never hard-delete rows (use `DeletedAt` timestamp)
- Maintain global query filters during migrations
- Preserve audit trail integrity
- Respect HIPAA retention requirements (minimum 6 years)

---

## Multi-Tenant Migration Safety

All migrations must be tenant-safe:
- New tables MUST include `TenantId` column
- Global query filters must be applied to new entities
- Seed data must be scoped to a specific tenant
- Cross-tenant data leakage must be tested post-migration
