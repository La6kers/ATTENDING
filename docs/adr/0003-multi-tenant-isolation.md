# ADR-0003: Row-Level Multi-Tenant Isolation

**Status:** Accepted  
**Date:** 2026-02-24  
**Decision Makers:** Engineering Team

## Context

ATTENDING AI is a SaaS platform serving multiple healthcare organizations (health systems, private practices, clinics). Each organization's data must be strictly isolated:

1. **HIPAA Business Associate Agreement (BAA)**: Contractual requirement to prevent cross-organization PHI leakage
2. **Data Residency**: Some organizations require data to stay within specific regions
3. **Cost Efficiency**: Single database shared across tenants is more cost-effective than dedicated infrastructure per customer
4. **Operational Simplicity**: One deployment pipeline, one monitoring stack, one backup strategy

The challenge is preventing accidental queries that fetch data from other organizations (e.g., a bug where TenantId filter is forgotten).

## Decision

Implement **row-level multi-tenant isolation** using:

1. **TenantId on All Entities**: Every entity has a `Guid TenantId` field
2. **EF Core Global Query Filters**: Automatically append `WHERE TenantId = @CurrentTenantId` to all queries
3. **Tenant Resolution**: Extract TenantId from JWT claim, subdomain, or header
4. **Database Constraints**: Foreign key relationships enforce TenantId consistency

### Entity Design

```csharp
public abstract class TenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; } // REQUIRED on every row
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
}

public class Order : TenantEntity
{
    public Guid PatientId { get; set; }
    public string OrderReason { get; set; }
    public OrderStatus Status { get; set; }
    public Patient Patient { get; set; } // Navigation
}

public class Patient : TenantEntity
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public ICollection<Order> Orders { get; set; }
}
```

### EF Core Global Query Filter

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    var tenantId = _tenantContext.CurrentTenantId; // From HttpContext
    
    // Apply filter to all TenantEntity-derived types
    var tenantEntityTypes = modelBuilder.Model.GetEntityTypes()
        .Where(t => typeof(TenantEntity).IsAssignableFrom(t.ClrType));
    
    foreach (var entityType in tenantEntityTypes)
    {
        var parameter = Expression.Parameter(entityType.ClrType);
        var tenantProperty = Expression.Property(parameter, "TenantId");
        var tenantConstant = Expression.Constant(tenantId);
        var equality = Expression.Equal(tenantProperty, tenantConstant);
        var lambda = Expression.Lambda(equality, parameter);
        
        modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
    }
}
```

### Tenant Resolution Middleware

```csharp
public class TenantResolutionMiddleware
{
    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        var tenantId = ExtractTenantId(context);
        if (tenantId == Guid.Empty)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { error = "Missing or invalid Tenant-Id header" });
            return;
        }
        
        tenantContext.SetCurrentTenant(tenantId);
        await _next(context);
    }
    
    private Guid ExtractTenantId(HttpContext context)
    {
        // Priority: JWT claim > Header > Subdomain
        var jwtClaim = context.User.FindFirst("tenantId");
        if (jwtClaim != null && Guid.TryParse(jwtClaim.Value, out var tenantIdFromJwt))
            return tenantIdFromJwt;
        
        if (context.Request.Headers.TryGetValue("Tenant-Id", out var headerValue)
            && Guid.TryParse(headerValue, out var tenantIdFromHeader))
            return tenantIdFromHeader;
        
        return ExtractTenantFromSubdomain(context.Request.Host.Host);
    }
}
```

### Repository Filter Prevention

```csharp
public class GenericRepository<TEntity> where TEntity : TenantEntity
{
    public IQueryable<TEntity> GetAllQuery()
    {
        // Global query filter automatically applied by EF Core
        return _dbContext.Set<TEntity>();
    }
    
    public async Task<TEntity> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        // Safe: EF Core adds WHERE TenantId = @currentTenantId automatically
        return await _dbContext.Set<TEntity>()
            .FirstOrDefaultAsync(e => e.Id == id, ct);
    }
}
```

## Consequences

### Positive
- **Automatic Protection**: Forgetting TenantId filter won't cause data leakage; EF Core enforces it
- **HIPAA-Safe Queries**: All queries scoped to current tenant by default
- **Simple Data Model**: Single table per entity type; no duplicated schema
- **Cost Efficient**: Shared database/infrastructure; pay for scale
- **Easy Debugging**: Queries are simple; no N+1 penalty for multi-tenancy
- **Audit Friendly**: Clear TenantId on all rows for forensic analysis

### Negative
- **Query Performance**: Adding TenantId to every WHERE clause adds minimal overhead but still measurable
- **Backup Complexity**: Tenant-specific backups require custom logic (separate SQL jobs)
- **Cross-Tenant Queries**: Rare reports that span organizations require disabling filter + manual validation
- **Schema Migrations**: Altering tenant-aware tables affects entire system (not per-organization)

### Risks
- **EF Core Version Drift**: Major EF Core upgrades may change how global query filters work
- **Manual SQL Bypass**: If developers write raw SQL queries, global filter is bypassed
- **Foreign Key Violations**: Bugs in DML code could create orphaned rows with wrong TenantId
- **Reporting**: Cross-tenant analytics queries must be explicitly designed to bypass isolation

## Alternatives Considered

1. **Separate Schema Per Tenant** (`Schema_OrgA`, `Schema_OrgB`)
   - Higher isolation (schema is a security boundary in SQL Server)
   - Complex deployment: every schema change requires N migrations
   - Scaling limit: SQL Server supports ~32,000 objects per database
   - Not suitable for 1000+ tenants

2. **Separate Database Per Tenant** (Database-per-Tenant Pattern)
   - Highest isolation (different database files)
   - Operational overhead: backup, restore, maintenance multiplied by tenant count
   - Scaling cost: storage, licenses for large organizations
   - Good for high-compliance regulated industries (e.g., financial services)

3. **Hybrid: Row-Level + Schema Separation**
   - Combines benefits of both approaches
   - Over-engineered for current scale
   - Can migrate to this if HIPAA risks escalate

## Implementation Notes

- Always call `AsNoTracking()` for read-only queries to reduce change-tracking overhead
- Unit tests must set TenantId in test data; queries filtered by default
- Avoid querying across TenantIds in single request: call multiple queries or use `IgnoreQueryFilters()`
- Document all `IgnoreQueryFilters()` usages: these are security-critical
- Add database constraints: `UNIQUE (TenantId, Code)` on logical keys to prevent duplicates across tenants
