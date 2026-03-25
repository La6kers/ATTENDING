using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Interfaces;

/// <summary>
/// Tests FHIR connectivity for an EHR connector configuration.
/// </summary>
public interface IFhirConnectionTester
{
    Task<FhirConnectionTestResult> TestConnectionAsync(
        EhrConnectorConfig connector, CancellationToken cancellationToken = default);
}

public record FhirConnectionTestResult(
    bool Success,
    string? ServerVersion,
    string[] SupportedResources,
    string? ErrorMessage);

/// <summary>
/// Seeds synthetic clinical data for Demo mode.
/// Idempotent — safe to call multiple times.
/// </summary>
public interface ISyntheticDataSeeder
{
    Task<SeedResult> SeedAsync(
        Guid organizationId, bool includeDemoPatients,
        bool includeReferenceData, CancellationToken cancellationToken = default);
}

public record SeedResult(int PatientCount, int EncounterCount, int LabOrderCount, int ReferenceDataItems);

/// <summary>
/// Resolves DataMode for the current tenant.
/// </summary>
public interface IDataModeResolver
{
    Task<DataMode> ResolveAsync(CancellationToken cancellationToken = default);
    Task<DataMode> ResolveForOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Factory for creating configured FHIR clients per-organization.
/// </summary>
public interface IFhirClientFactory
{
    Task<IConfiguredFhirClient?> CreateForOrganizationAsync(
        Guid organizationId, CancellationToken cancellationToken = default);
}

/// <summary>
/// A fully configured FHIR client backed by EhrVendorProfile.
/// Replaces per-vendor IFhirClient implementations.
/// </summary>
public interface IConfiguredFhirClient
{
    EhrVendor Vendor { get; }
    bool IsConnected { get; }

    Task<FhirPatientResult?> GetPatientAsync(string patientId, CancellationToken ct = default);
    Task<FhirPatientResult?> SearchPatientByMrnAsync(string mrn, CancellationToken ct = default);
    Task<List<FhirObservationResult>> GetVitalsAsync(string patientId, CancellationToken ct = default);
    Task<List<FhirObservationResult>> GetLabResultsAsync(string patientId, CancellationToken ct = default);
    Task<List<FhirConditionResult>> GetConditionsAsync(string patientId, CancellationToken ct = default);
    Task<List<FhirMedicationResult>> GetActiveMedicationsAsync(string patientId, CancellationToken ct = default);
    Task<List<FhirAllergyResult>> GetAllergiesAsync(string patientId, CancellationToken ct = default);
    Task<bool> PingAsync(CancellationToken ct = default);
}

// Vendor-agnostic FHIR result DTOs
public record FhirPatientResult(string FhirId, string? Mrn, string FirstName, string LastName,
    DateTime? DateOfBirth, string? Sex, string? Phone, string? Email);
public record FhirObservationResult(string Code, string? CodeSystem, string Display,
    string? Value, string? Unit, DateTime? EffectiveDate, string? ReferenceRange);
public record FhirConditionResult(string Code, string Display, string? Status, DateTime? OnsetDate);
public record FhirMedicationResult(string Name, string? Dosage, string? Route,
    string? Frequency, string? Status, DateTime? AuthoredOn);
public record FhirAllergyResult(string Substance, string? Severity, string? Reaction, string? Status);
