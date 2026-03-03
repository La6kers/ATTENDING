using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;

namespace ATTENDING.Domain.Entities;

/// <summary>
/// Aggregate root for tenant/organization management.
/// Models the full onboarding lifecycle as a state machine.
/// Organization.Id IS the OrganizationId/TenantId used in global query filters.
/// </summary>
public class Organization : IAggregateRoot, IHasDomainEvents
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string? NPI { get; private set; }
    public string? TaxId { get; private set; }

    public string PrimaryContactName { get; private set; } = string.Empty;
    public string PrimaryContactEmail { get; private set; } = string.Empty;
    public string? PrimaryContactPhone { get; private set; }
    public string? Address { get; private set; }
    public string? City { get; private set; }
    public string? State { get; private set; }
    public string? ZipCode { get; private set; }

    public OnboardingStatus OnboardingStatus { get; private set; } = OnboardingStatus.Created;
    public DataMode DataMode { get; private set; } = DataMode.Demo;
    public int MaxProviderSeats { get; private set; } = 10;
    public string FeatureFlagsJson { get; private set; } = "{}";
    public string TimeZone { get; private set; } = "America/New_York";

    // Navigation
    public IReadOnlyCollection<EhrConnectorConfig> EhrConnectors => _ehrConnectors.AsReadOnly();
    private readonly List<EhrConnectorConfig> _ehrConnectors = new();

    // Audit
    public DateTime CreatedAt { get; private set; }
    public string? CreatedBy { get; private set; }
    public DateTime? ModifiedAt { get; private set; }
    public string? ModifiedBy { get; private set; }
    public bool IsDeleted { get; private set; }
    public DateTime? DeletedAt { get; private set; }
    public string? DeletedBy { get; private set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    // Domain Events
    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    public void ClearDomainEvents() => _domainEvents.Clear();

    private Organization() { } // EF Core

    public static Organization Create(
        string name,
        string slug,
        string primaryContactName,
        string primaryContactEmail,
        string? npi = null,
        int maxProviderSeats = 10)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Organization name is required.", nameof(name));
        if (string.IsNullOrWhiteSpace(slug))
            throw new ArgumentException("Organization slug is required.", nameof(slug));
        if (string.IsNullOrWhiteSpace(primaryContactEmail))
            throw new ArgumentException("Primary contact email is required.", nameof(primaryContactEmail));

        var org = new Organization
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Slug = slug.Trim().ToLowerInvariant(),
            PrimaryContactName = primaryContactName.Trim(),
            PrimaryContactEmail = primaryContactEmail.Trim().ToLowerInvariant(),
            NPI = npi?.Trim(),
            MaxProviderSeats = maxProviderSeats,
            OnboardingStatus = OnboardingStatus.Created,
            DataMode = DataMode.Demo,
            CreatedAt = DateTime.UtcNow,
        };

        org._domainEvents.Add(new OrganizationCreatedEvent(org.Id, org.Name, org.Slug));
        return org;
    }

    // ── State Machine ────────────────────────────────────────────────

    private static readonly Dictionary<OnboardingStatus, OnboardingStatus[]> ValidTransitions = new()
    {
        [OnboardingStatus.Created] = new[] { OnboardingStatus.EhrConfigured, OnboardingStatus.DataSeeded },
        [OnboardingStatus.EhrConfigured] = new[] { OnboardingStatus.ConnectionVerified, OnboardingStatus.Created },
        [OnboardingStatus.ConnectionVerified] = new[] { OnboardingStatus.DataSeeded, OnboardingStatus.EhrConfigured },
        [OnboardingStatus.DataSeeded] = new[] { OnboardingStatus.Active, OnboardingStatus.ConnectionVerified },
        [OnboardingStatus.Active] = new[] { OnboardingStatus.Suspended },
        [OnboardingStatus.Suspended] = new[] { OnboardingStatus.Active },
    };

    public bool CanTransitionTo(OnboardingStatus target) =>
        ValidTransitions.TryGetValue(OnboardingStatus, out var valid) && valid.Contains(target);

    public void TransitionTo(OnboardingStatus target)
    {
        if (!CanTransitionTo(target))
            throw new InvalidOperationException(
                $"Cannot transition from {OnboardingStatus} to {target}.");

        var previous = OnboardingStatus;
        OnboardingStatus = target;
        ModifiedAt = DateTime.UtcNow;
        _domainEvents.Add(new OrganizationStatusChangedEvent(Id, previous, target));
    }

    // ── EHR Connector Management ─────────────────────────────────────

    public EhrConnectorConfig AddEhrConnector(
        EhrVendor vendor, string clientId, string? clientSecret,
        string? fhirBaseUrl, string? ehrTenantId, string label = "Primary EHR")
    {
        var connector = EhrConnectorConfig.Create(
            organizationId: Id, vendor: vendor, clientId: clientId,
            clientSecret: clientSecret, fhirBaseUrl: fhirBaseUrl,
            ehrTenantId: ehrTenantId, label: label);

        _ehrConnectors.Add(connector);

        if (OnboardingStatus == OnboardingStatus.Created)
            TransitionTo(OnboardingStatus.EhrConfigured);

        _domainEvents.Add(new EhrConnectorAddedEvent(Id, connector.Id, vendor));
        return connector;
    }

    public void MarkConnectionVerified(Guid connectorId, string verificationDetails)
    {
        var connector = _ehrConnectors.FirstOrDefault(c => c.Id == connectorId)
            ?? throw new InvalidOperationException($"Connector {connectorId} not found.");

        connector.MarkVerified(verificationDetails);

        if (OnboardingStatus == OnboardingStatus.EhrConfigured)
            TransitionTo(OnboardingStatus.ConnectionVerified);
    }

    // ── Data Mode ────────────────────────────────────────────────────

    public void SetDataMode(DataMode mode)
    {
        if (mode == DataMode.Production)
        {
            if (OnboardingStatus != OnboardingStatus.Active)
                throw new InvalidOperationException("Organization must be Active for Production mode.");
            if (!_ehrConnectors.Any(c => c.IsVerified))
                throw new InvalidOperationException("Verified EHR connector required for Production mode.");
        }

        DataMode = mode;
        ModifiedAt = DateTime.UtcNow;
        _domainEvents.Add(new DataModeChangedEvent(Id, mode));
    }

    public void MarkDataSeeded()
    {
        if (CanTransitionTo(OnboardingStatus.DataSeeded))
            TransitionTo(OnboardingStatus.DataSeeded);
    }

    public void Activate()
    {
        if (OnboardingStatus == OnboardingStatus.DataSeeded)
            TransitionTo(OnboardingStatus.Active);
        else
            throw new InvalidOperationException(
                $"Cannot activate from {OnboardingStatus}. Must be DataSeeded.");
    }

    public void UpdateFeatureFlags(string featureFlagsJson)
    {
        FeatureFlagsJson = featureFlagsJson ?? "{}";
        ModifiedAt = DateTime.UtcNow;
    }

    public void UpdateProfile(
        string? name = null, string? address = null, string? city = null,
        string? state = null, string? zipCode = null, string? phone = null,
        string? npi = null, string? taxId = null, string? timeZone = null)
    {
        if (name != null) Name = name.Trim();
        if (address != null) Address = address.Trim();
        if (city != null) City = city.Trim();
        if (state != null) State = state.Trim();
        if (zipCode != null) ZipCode = zipCode.Trim();
        if (phone != null) PrimaryContactPhone = phone.Trim();
        if (npi != null) NPI = npi.Trim();
        if (taxId != null) TaxId = taxId.Trim();
        if (timeZone != null) TimeZone = timeZone.Trim();
        ModifiedAt = DateTime.UtcNow;
    }

    public void SoftDelete(string? userId = null)
    {
        IsDeleted = true;
        DeletedAt = DateTime.UtcNow;
        DeletedBy = userId;
    }
}
