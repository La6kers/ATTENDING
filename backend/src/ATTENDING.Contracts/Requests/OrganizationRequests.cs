namespace ATTENDING.Contracts.Requests;

public record ProvisionOrganizationRequest(
    string Name, string PrimaryContactName, string PrimaryContactEmail,
    string? NPI = null, int MaxProviderSeats = 10,
    string? Address = null, string? City = null, string? State = null,
    string? ZipCode = null, string? TimeZone = null);

public record ConfigureEhrConnectorRequest(
    string Vendor, string ClientId,
    string? ClientSecret = null, string? FhirBaseUrl = null,
    string? EhrTenantId = null, string Label = "Primary EHR");

public record TestEhrConnectionRequest(Guid ConnectorId);

public record SeedOrganizationDataRequest(
    bool IncludeDemoPatients = true, bool IncludeReferenceData = true);

public record ActivateOrganizationRequest();

public record SetDataModeRequest(string Mode);
