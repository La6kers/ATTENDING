# Dual ORM Strategy: EF Core + Prisma

## Overview

ATTENDING AI uses two ORMs against the same MS SQL Server database:

- **Entity Framework Core** (.NET backend) — Schema owner, migrations, domain logic
- **Prisma** (Next.js frontends) — Read-heavy API routes, patient portal queries

## Rules

### EF Core is the Schema Owner

1. **All schema changes** (new tables, columns, indexes) MUST originate as EF Core migrations
2. Run `dotnet ef migrations add <Name>` from the Infrastructure project
3. Migrations live in `backend/src/ATTENDING.Infrastructure/Migrations/` (single directory)
4. `DatabaseInitializer.InitializeAsync()` applies pending migrations on startup

### Prisma Follows (db pull mode)

1. After EF Core migrations are applied to the dev database, run:
   ```bash
   npx prisma db pull --schema=prisma/schema.prisma
   ```
2. This regenerates the Prisma schema from the actual database
3. Then regenerate the client:
   ```bash
   npx prisma generate
   ```
4. **Never run `prisma migrate`** — this would create conflicting migrations

### Why Two ORMs?

| Concern | EF Core | Prisma |
|---------|---------|--------|
| Domain events & aggregates | Yes | No |
| Global query filters (tenant, soft-delete) | Yes | Manual middleware |
| Concurrency tokens (RowVersion) | Yes | No |
| Next.js API routes (getServerSideProps) | Awkward | Native |
| Type-safe frontend queries | N/A | Yes |

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Schema drift | CI job: `prisma db pull --schema=prisma/schema.prisma && git diff --exit-code prisma/schema.prisma` |
| Prisma bypasses tenant filters | `withTenantScope` middleware in `@attending/shared/lib/multiTenant.ts` |
| Prisma bypasses soft-delete | Prisma middleware in `@attending/shared/lib/prisma.ts` adds `isDeleted: false` |
| PHI in Prisma direct queries | All PHI fields are encrypted at rest via SQL Server TDE; field-level encryption for SSN/DOB via application layer |

### Migration Workflow

```
1. Modify EF Core entity / configuration
2. dotnet ef migrations add DescriptiveName
3. dotnet ef database update (or let startup apply)
4. npx prisma db pull
5. npx prisma generate
6. Commit both the EF migration AND updated prisma/schema.prisma
```
