namespace ATTENDING.Contracts.Requests;

#region Patient Requests

public record CreatePatientRequest(
    string MRN,
    string FirstName,
    string LastName,
    DateTime DateOfBirth,
    string Sex,
    string? Phone = null,
    string? Email = null,
    string? AddressLine1 = null,
    string? City = null,
    string? State = null,
    string? ZipCode = null,
    string PrimaryLanguage = "English");

public record UpdatePatientRequest(
    string? Phone,
    string? Email,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? ZipCode,
    string? PrimaryLanguage);

public record AddAllergyRequest(
    string Allergen,
    string Severity,
    string? Reaction = null);

public record AddConditionRequest(
    string Code,
    string Name,
    DateTime? OnsetDate = null);

#endregion

#region Encounter Requests

public record CreateEncounterRequest(
    Guid PatientId,
    string Type,
    DateTime? ScheduledAt = null,
    string? ChiefComplaint = null);

public record StartEncounterRequest(
    string? ChiefComplaint = null);

#endregion
