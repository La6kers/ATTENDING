using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using MediatR;

namespace ATTENDING.Application.Queries.Organizations;

// ── Queries ──────────────────────────────────────────────────────────────

public record GetAllOrganizationsQuery : IRequest<IReadOnlyList<OrganizationSummaryDto>>;

public record GetOrganizationByIdQuery(Guid Id) : IRequest<OrganizationDetailDto?>;

public record GetOrganizationBySlugQuery(string Slug) : IRequest<OrganizationDetailDto?>;

public record GetCurrentOrganizationQuery : IRequest<OrganizationCurrentDto?>;

// ── DTOs ─────────────────────────────────────────────────────────────────

public record OrganizationSummaryDto(
    Guid Id, string Name, string Slug, OnboardingStatus Status,
    DataMode DataMode, int MaxProviderSeats, int ConnectorCount, DateTime CreatedAt);

public record OrganizationDetailDto(
    Guid Id, string Name, string Slug, string? NPI, string? TaxId,
    string PrimaryContactName, string PrimaryContactEmail, string? PrimaryContactPhone,
    string? Address, string? City, string? State, string? ZipCode,
    OnboardingStatus Status, DataMode DataMode, int MaxProviderSeats,
    string FeatureFlagsJson, string TimeZone,
    List<EhrConnectorSummaryDto> Connectors,
    List<OnboardingStatus> AvailableTransitions,
    DateTime CreatedAt, DateTime? ModifiedAt);

public record EhrConnectorSummaryDto(
    Guid Id, EhrVendor Vendor, string Label, bool IsVerified,
    DateTime? LastVerifiedAt, string? LastError, bool IsEnabled);

public record OrganizationCurrentDto(
    Guid Id, string Name, string Slug, OnboardingStatus Status,
    DataMode DataMode, string FeatureFlagsJson, string TimeZone);

// ── Handlers ─────────────────────────────────────────────────────────────

public class GetAllOrganizationsHandler
    : IRequestHandler<GetAllOrganizationsQuery, IReadOnlyList<OrganizationSummaryDto>>
{
    private readonly IOrganizationRepository _repository;

    public GetAllOrganizationsHandler(IOrganizationRepository repository) => _repository = repository;

    public async Task<IReadOnlyList<OrganizationSummaryDto>> Handle(
        GetAllOrganizationsQuery request, CancellationToken ct)
    {
        var orgs = await _repository.GetAllAsync(ct);
        return orgs.Select(o => new OrganizationSummaryDto(
            o.Id, o.Name, o.Slug, o.OnboardingStatus, o.DataMode,
            o.MaxProviderSeats, o.EhrConnectors.Count, o.CreatedAt)).ToList();
    }
}

public class GetOrganizationByIdHandler
    : IRequestHandler<GetOrganizationByIdQuery, OrganizationDetailDto?>
{
    private readonly IOrganizationRepository _repository;

    public GetOrganizationByIdHandler(IOrganizationRepository repository) => _repository = repository;

    public async Task<OrganizationDetailDto?> Handle(
        GetOrganizationByIdQuery request, CancellationToken ct)
    {
        var org = await _repository.GetByIdAsync(request.Id, ct);
        return org is null ? null : MapToDetail(org);
    }

    internal static OrganizationDetailDto MapToDetail(Organization org)
    {
        var transitions = Enum.GetValues<OnboardingStatus>()
            .Where(org.CanTransitionTo).ToList();

        return new OrganizationDetailDto(
            org.Id, org.Name, org.Slug, org.NPI, org.TaxId,
            org.PrimaryContactName, org.PrimaryContactEmail, org.PrimaryContactPhone,
            org.Address, org.City, org.State, org.ZipCode,
            org.OnboardingStatus, org.DataMode, org.MaxProviderSeats,
            org.FeatureFlagsJson, org.TimeZone,
            org.EhrConnectors.Select(c => new EhrConnectorSummaryDto(
                c.Id, c.Vendor, c.Label, c.IsVerified,
                c.LastVerifiedAt, c.LastError, c.IsEnabled)).ToList(),
            transitions,
            org.CreatedAt, org.ModifiedAt);
    }
}

public class GetOrganizationBySlugHandler
    : IRequestHandler<GetOrganizationBySlugQuery, OrganizationDetailDto?>
{
    private readonly IOrganizationRepository _repository;

    public GetOrganizationBySlugHandler(IOrganizationRepository repository) => _repository = repository;

    public async Task<OrganizationDetailDto?> Handle(
        GetOrganizationBySlugQuery request, CancellationToken ct)
    {
        var org = await _repository.GetBySlugAsync(request.Slug, ct);
        return org is null ? null : GetOrganizationByIdHandler.MapToDetail(org);
    }
}

public class GetCurrentOrganizationHandler
    : IRequestHandler<GetCurrentOrganizationQuery, OrganizationCurrentDto?>
{
    private readonly IOrganizationRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public GetCurrentOrganizationHandler(
        IOrganizationRepository repository, ICurrentUserService currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    public async Task<OrganizationCurrentDto?> Handle(
        GetCurrentOrganizationQuery request, CancellationToken ct)
    {
        var tenantId = _currentUser.TenantId;
        if (!tenantId.HasValue) return null;

        var org = await _repository.GetByIdAsync(tenantId.Value, ct);
        if (org is null) return null;

        return new OrganizationCurrentDto(
            org.Id, org.Name, org.Slug, org.OnboardingStatus,
            org.DataMode, org.FeatureFlagsJson, org.TimeZone);
    }
}
