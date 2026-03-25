namespace ATTENDING.Contracts.Responses;

#region Patient

/// <summary>
/// Full patient detail response
/// </summary>
public record PatientDetailResponse(
    Guid Id,
    string MRN,
    string FirstName,
    string LastName,
    string FullName,
    DateTime DateOfBirth,
    int Age,
    string Sex,
    string? Phone,
    string? Email,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? ZipCode,
    string PrimaryLanguage,
    bool IsActive,
    IReadOnlyList<AllergyResponse>? Allergies,
    IReadOnlyList<MedicalConditionResponse>? Conditions,
    IReadOnlyList<EncounterSummaryResponse>? RecentEncounters,
    DateTime CreatedAt);

/// <summary>
/// Patient search result (lighter than full detail)
/// </summary>
public record PatientSearchResponse(
    Guid Id,
    string MRN,
    string FullName,
    int Age,
    string Sex,
    string? Phone,
    string? Email,
    bool IsActive);

/// <summary>
/// Allergy response
/// </summary>
public record AllergyResponse(
    Guid Id,
    string Allergen,
    string? Reaction,
    string Severity,
    bool IsActive);

/// <summary>
/// Medical condition response
/// </summary>
public record MedicalConditionResponse(
    Guid Id,
    string Code,
    string Name,
    DateTime? OnsetDate,
    bool IsActive);

#endregion

#region Encounters

/// <summary>
/// Full encounter response
/// </summary>
public record EncounterResponse(
    Guid Id,
    string EncounterNumber,
    Guid PatientId,
    PatientSummaryResponse? Patient,
    Guid ProviderId,
    ProviderSummaryResponse? Provider,
    string Type,
    string Status,
    string? ChiefComplaint,
    DateTime? ScheduledAt,
    DateTime? CheckedInAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime CreatedAt);

/// <summary>
/// Encounter summary for lists
/// </summary>
public record EncounterSummaryResponse(
    Guid Id,
    string EncounterNumber,
    string Type,
    string Status,
    string? ChiefComplaint,
    DateTime? ScheduledAt,
    ProviderSummaryResponse? Provider);

/// <summary>
/// Dashboard schedule summary
/// </summary>
public record ScheduleResponse(
    IReadOnlyList<EncounterResponse> Encounters,
    int TotalCount,
    string Date);

#endregion
