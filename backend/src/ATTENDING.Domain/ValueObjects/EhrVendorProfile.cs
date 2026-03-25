using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.ValueObjects;

/// <summary>
/// Vendor-specific FHIR configuration as a value object.
/// Parameterizes ConfigurableFhirClient so adding a new EHR vendor
/// is a config change, not a new C# class.
/// </summary>
public record EhrVendorProfile
{
    public required string AuthorizeEndpoint { get; init; }
    public required string TokenEndpointTemplate { get; init; }
    public required string Scopes { get; init; }
    public required OAuthFlowType OAuthFlow { get; init; }
    public required string FhirBaseUrlTemplate { get; init; }
    public required string PatientIdentifierSystem { get; init; }
    public Dictionary<string, string> ExtensionMappings { get; init; } = new();
    public HashSet<string> SupportedResourceTypes { get; init; } = new();
    public Dictionary<string, string> RequiredHeaders { get; init; } = new();
    public bool ReturnsOperationOutcome { get; init; } = true;
    public int MaxSearchPageSize { get; init; } = 100;

    public static EhrVendorProfile Epic() => new()
    {
        AuthorizeEndpoint = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
        TokenEndpointTemplate = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
        Scopes = "patient/Patient.read patient/Observation.read patient/Condition.read " +
                 "patient/MedicationRequest.read patient/AllergyIntolerance.read " +
                 "patient/DiagnosticReport.read launch/patient openid fhirUser",
        OAuthFlow = OAuthFlowType.SmartEhrLaunch,
        FhirBaseUrlTemplate = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
        PatientIdentifierSystem = "urn:oid:1.2.840.114350.1.13.0.1.7.5.737384.14",
        ExtensionMappings = new()
        {
            ["race"] = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
            ["ethnicity"] = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
            ["birthSex"] = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
        },
        RequiredHeaders = new() { ["Epic-Client-ID"] = "{clientId}" },
        ReturnsOperationOutcome = true,
        MaxSearchPageSize = 100,
    };

    public static EhrVendorProfile OracleHealth() => new()
    {
        AuthorizeEndpoint = "https://authorization.cerner.com/tenants/{tenant}/protocols/oauth2/profiles/smart-v1/personas/provider/authorize",
        TokenEndpointTemplate = "https://authorization.cerner.com/tenants/{tenant}/protocols/oauth2/profiles/smart-v1/token",
        Scopes = "patient/Patient.read patient/Observation.read patient/Condition.read " +
                 "patient/MedicationRequest.read patient/AllergyIntolerance.read launch/patient openid fhirUser",
        OAuthFlow = OAuthFlowType.SmartEhrLaunch,
        FhirBaseUrlTemplate = "https://fhir-open.cerner.com/{tenant}/r4",
        PatientIdentifierSystem = "https://fhir.cerner.com/{tenant}/patient",
        ExtensionMappings = new()
        {
            ["race"] = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
            ["ethnicity"] = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
        },
        ReturnsOperationOutcome = true,
        MaxSearchPageSize = 500,
    };

    public static EhrVendorProfile AthenaHealth() => new()
    {
        // Global OAuth endpoints — NOT tenant-specific (key difference from Cerner)
        AuthorizeEndpoint = "https://api.platform.athenahealth.com/oauth2/v1/authorize",
        TokenEndpointTemplate = "https://api.platform.athenahealth.com/oauth2/v1/token",
        Scopes = "patient/Patient.read patient/Observation.read patient/Condition.read " +
                 "patient/MedicationRequest.read patient/AllergyIntolerance.read " +
                 "patient/DiagnosticReport.read patient/Appointment.read " +
                 "launch/patient openid fhirUser offline_access",
        OAuthFlow = OAuthFlowType.SmartEhrLaunch,
        // athena FHIR base URL does not include tenant — practice context comes from the token
        FhirBaseUrlTemplate = "https://api.platform.athenahealth.com/fhir/r4",
        // athena MRN uses HL7 v2 identifier type table (type.coding.code == "MR"),
        // not a system URL. Use the type-based lookup in the client mapper.
        PatientIdentifierSystem = "http://terminology.hl7.org/CodeSystem/v2-0203",
        ExtensionMappings = new()
        {
            ["patientPortal"] = "https://fhir.athena.io/extension/patient-portal-status",
        },
        ReturnsOperationOutcome = true,
        MaxSearchPageSize = 100,
    };

    public static EhrVendorProfile GenericFhirR4() => new()
    {
        AuthorizeEndpoint = "",
        TokenEndpointTemplate = "",
        Scopes = "patient/*.read launch/patient openid",
        OAuthFlow = OAuthFlowType.SmartEhrLaunch,
        FhirBaseUrlTemplate = "",
        PatientIdentifierSystem = "",
        ReturnsOperationOutcome = true,
        MaxSearchPageSize = 100,
    };

    public EhrVendorProfile ResolveTemplates(string? tenantSlug, string? clientId)
    {
        string Resolve(string template) => template
            .Replace("{tenant}", tenantSlug ?? "")
            .Replace("{clientId}", clientId ?? "");

        return this with
        {
            AuthorizeEndpoint = Resolve(AuthorizeEndpoint),
            TokenEndpointTemplate = Resolve(TokenEndpointTemplate),
            FhirBaseUrlTemplate = Resolve(FhirBaseUrlTemplate),
            PatientIdentifierSystem = Resolve(PatientIdentifierSystem),
            RequiredHeaders = RequiredHeaders.ToDictionary(
                kvp => kvp.Key, kvp => Resolve(kvp.Value)),
        };
    }
}
