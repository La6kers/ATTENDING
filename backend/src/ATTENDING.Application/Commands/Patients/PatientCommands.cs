using MediatR;

namespace ATTENDING.Application.Commands.Patients;

public record CreatePatientCommand(
    string MRN,
    string FirstName,
    string LastName,
    DateTime DateOfBirth,
    string Sex,
    string? Phone,
    string? Email,
    string? AddressLine1,
    string? City,
    string? State,
    string? ZipCode,
    string PrimaryLanguage) : IRequest<CreatePatientResult>;

public record CreatePatientResult(
    bool Success,
    Guid? PatientId = null,
    string? MRN = null,
    string? Error = null);

public record AddAllergyCommand(
    Guid PatientId,
    string Allergen,
    Domain.Enums.AllergySeverity Severity,
    string? Reaction) : IRequest<AddAllergyResult>;

public record AddAllergyResult(bool Success, Guid? AllergyId = null, string? Error = null);

public record AddConditionCommand(
    Guid PatientId,
    string Code,
    string Name,
    DateTime? OnsetDate) : IRequest<AddConditionResult>;

public record AddConditionResult(bool Success, Guid? ConditionId = null, string? Error = null);
