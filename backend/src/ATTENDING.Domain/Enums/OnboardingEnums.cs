namespace ATTENDING.Domain.Enums;

/// <summary>
/// State machine for organization onboarding lifecycle.
/// Each transition fires a domain event and is validated before execution.
/// </summary>
public enum OnboardingStatus
{
    Created = 0,
    EhrConfigured = 1,
    ConnectionVerified = 2,
    DataSeeded = 3,
    Active = 4,
    Suspended = 5
}

/// <summary>
/// Supported EHR vendors. Each maps to an EhrVendorProfile
/// that configures the FHIR client without code changes.
/// </summary>
public enum EhrVendor
{
    None = 0,
    Epic = 1,
    OracleHealth = 2,
    Meditech = 3,
    Allscripts = 4,
    AthenaHealth = 5,
    GenericFhirR4 = 6
}

/// <summary>
/// Controls the data source for an organization.
/// Provider portal renders identically in all modes — only data source changes.
/// </summary>
public enum DataMode
{
    /// <summary>Curated synthetic patients. No PHI. Ships with app.</summary>
    Demo = 0,
    /// <summary>Connected to vendor sandbox (e.g., open.epic.com).</summary>
    Sandbox = 1,
    /// <summary>Live PHI. Requires BAA and full auth.</summary>
    Production = 2
}

/// <summary>
/// OAuth flow type for SMART on FHIR authorization.
/// </summary>
public enum OAuthFlowType
{
    SmartEhrLaunch = 0,
    SmartBackendServices = 1
}
