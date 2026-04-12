using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Repositories;

/// <summary>
/// Organization repository — operates cross-tenant (admin context).
/// Organization IS the tenant, so it cannot filter by tenant.
/// Uses IgnoreQueryFilters for Organization since it has no OrganizationId FK.
/// </summary>
public class OrganizationRepository : IOrganizationRepository
{
    private readonly AttendingDbContext _context;

    public OrganizationRepository(AttendingDbContext context) => _context = context;

    public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Organizations
            .Include(o => o.EhrConnectors)
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
    }

    public async Task<Organization?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        return await _context.Organizations
            .Include(o => o.EhrConnectors)
            .FirstOrDefaultAsync(o => o.Slug == slug, cancellationToken);
    }

    public async Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default)
    {
        return await _context.Organizations
            .AnyAsync(o => o.Slug == slug, cancellationToken);
    }

    public async Task<IReadOnlyList<Organization>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Organizations
            .Include(o => o.EhrConnectors)
            .OrderBy(o => o.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Organization>> GetByStatusAsync(
        OnboardingStatus status, CancellationToken cancellationToken = default)
    {
        return await _context.Organizations
            .Include(o => o.EhrConnectors)
            .Where(o => o.OnboardingStatus == status)
            .OrderBy(o => o.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Organization organization, CancellationToken cancellationToken = default)
    {
        await _context.Organizations.AddAsync(organization, cancellationToken);
    }

    public void Update(Organization organization)
    {
        _context.Organizations.Update(organization);
    }
}

/// <summary>
/// EHR connector repository — reads connector configs across tenants.
/// </summary>
public class EhrConnectorRepository : IEhrConnectorRepository
{
    private readonly AttendingDbContext _context;

    public EhrConnectorRepository(AttendingDbContext context) => _context = context;

    public async Task<EhrConnectorConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.EhrConnectors
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<EhrConnectorConfig>> GetByOrganizationAsync(
        Guid organizationId, CancellationToken cancellationToken = default)
    {
        return await _context.EhrConnectors
            .Where(c => c.OrganizationId == organizationId)
            .ToListAsync(cancellationToken);
    }

    public async Task<EhrConnectorConfig?> GetPrimaryForOrganizationAsync(
        Guid organizationId, CancellationToken cancellationToken = default)
    {
        return await _context.EhrConnectors
            .Where(c => c.OrganizationId == organizationId && c.IsEnabled)
            .OrderByDescending(c => c.IsVerified)
            .ThenBy(c => c.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
