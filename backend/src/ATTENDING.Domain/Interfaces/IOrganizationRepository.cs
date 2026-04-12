using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Interfaces;

/// <summary>
/// Repository for Organization aggregate.
/// NOT tenant-filtered — operates across tenants for admin/provisioning.
/// </summary>
public interface IOrganizationRepository
{
    Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Organization?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Organization>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Organization>> GetByStatusAsync(OnboardingStatus status, CancellationToken cancellationToken = default);
    Task AddAsync(Organization organization, CancellationToken cancellationToken = default);
    void Update(Organization organization);
}

/// <summary>
/// Repository for EHR connector configurations.
/// </summary>
public interface IEhrConnectorRepository
{
    Task<EhrConnectorConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EhrConnectorConfig>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<EhrConnectorConfig?> GetPrimaryForOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
}
