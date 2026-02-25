using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.Data;

/// <summary>
/// EF Core interceptor that auto-populates audit fields and tenant isolation on SaveChanges.
/// Handles CreatedBy, ModifiedBy, DeletedBy, OrganizationId, and soft-delete interception.
/// </summary>
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserService _currentUser;

    public AuditSaveChangesInterceptor(ICurrentUserService currentUser)
    {
        _currentUser = currentUser;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        ApplyAuditFields(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditFields(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAuditFields(DbContext? context)
    {
        if (context == null) return;

        var userId = _currentUser.UserId ?? "system";
        var tenantId = _currentUser.TenantId;

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.SetCreatedBy(userId);
                    
                    // Auto-set tenant on new entities — ensures every record
                    // is bound to the authenticated user's organization.
                    // Only set if not already assigned (allows explicit assignment in seeds/tests).
                    if (entry.Entity.OrganizationId == Guid.Empty && tenantId.HasValue)
                    {
                        entry.Entity.SetOrganization(tenantId.Value);
                    }
                    break;

                case EntityState.Modified:
                    entry.Entity.SetModified(userId);
                    break;

                case EntityState.Deleted:
                    // Intercept hard deletes and convert to soft deletes
                    entry.State = EntityState.Modified;
                    entry.Entity.SoftDelete(userId);
                    break;
            }
        }
    }
}
