using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Entities;

/// <summary>
/// Per-organization EHR connection credentials and state.
/// Owned by Organization aggregate root.
/// ClientSecret encrypted at rest via EF ValueConverter.
/// </summary>
public class EhrConnectorConfig
{
    public Guid Id { get; private set; }
    public Guid OrganizationId { get; private set; }
    public string Label { get; private set; } = "Primary EHR";

    public EhrVendor Vendor { get; private set; }
    public string ClientId { get; private set; } = string.Empty;
    public string? ClientSecret { get; private set; }
    public string? FhirBaseUrl { get; private set; }
    public string? EhrTenantId { get; private set; }
    public string? RedirectUri { get; private set; }

    public bool IsVerified { get; private set; }
    public string? VerificationDetails { get; private set; }
    public DateTime? LastVerifiedAt { get; private set; }
    public string? LastError { get; private set; }
    public bool IsEnabled { get; private set; } = true;

    public DateTime CreatedAt { get; private set; }
    public DateTime? ModifiedAt { get; private set; }
    public bool IsDeleted { get; private set; }

    private EhrConnectorConfig() { }

    public static EhrConnectorConfig Create(
        Guid organizationId, EhrVendor vendor, string clientId,
        string? clientSecret = null, string? fhirBaseUrl = null,
        string? ehrTenantId = null, string label = "Primary EHR")
    {
        if (organizationId == Guid.Empty)
            throw new ArgumentException("OrganizationId is required.", nameof(organizationId));
        if (string.IsNullOrWhiteSpace(clientId))
            throw new ArgumentException("Client ID is required.", nameof(clientId));
        if (vendor == EhrVendor.GenericFhirR4 && string.IsNullOrWhiteSpace(fhirBaseUrl))
            throw new ArgumentException("FHIR base URL required for generic FHIR R4.", nameof(fhirBaseUrl));

        return new EhrConnectorConfig
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            Vendor = vendor,
            ClientId = clientId.Trim(),
            ClientSecret = clientSecret?.Trim(),
            FhirBaseUrl = fhirBaseUrl?.Trim(),
            EhrTenantId = ehrTenantId?.Trim(),
            Label = label.Trim(),
            IsVerified = false,
            IsEnabled = true,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void MarkVerified(string verificationDetails)
    {
        IsVerified = true;
        VerificationDetails = verificationDetails;
        LastVerifiedAt = DateTime.UtcNow;
        LastError = null;
        ModifiedAt = DateTime.UtcNow;
    }

    public void MarkFailed(string errorMessage)
    {
        IsVerified = false;
        LastError = errorMessage;
        ModifiedAt = DateTime.UtcNow;
    }

    public void UpdateCredentials(string clientId, string? clientSecret, string? fhirBaseUrl, string? ehrTenantId)
    {
        ClientId = clientId.Trim();
        ClientSecret = clientSecret?.Trim();
        FhirBaseUrl = fhirBaseUrl?.Trim();
        EhrTenantId = ehrTenantId?.Trim();
        IsVerified = false;
        ModifiedAt = DateTime.UtcNow;
    }

    public void Disable() { IsEnabled = false; ModifiedAt = DateTime.UtcNow; }
    public void Enable() { IsEnabled = true; ModifiedAt = DateTime.UtcNow; }
}
