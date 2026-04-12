using MediatR;
using ATTENDING.Domain.Common;

namespace ATTENDING.Application.Commands.Patients;

// ================================================================
// Commands return Result<T> — no more ad-hoc bool+error records
// ================================================================

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
    string PrimaryLanguage) : IRequest<Result<PatientCreated>>;

public record PatientCreated(Guid PatientId, string MRN);

public record AddAllergyCommand(
    Guid PatientId,
    string Allergen,
    Domain.Enums.AllergySeverity Severity,
    string? Reaction) : IRequest<Result<AllergyAdded>>;

public record AllergyAdded(Guid AllergyId);

public record AddConditionCommand(
    Guid PatientId,
    string Code,
    string Name,
    DateTime? OnsetDate) : IRequest<Result<ConditionAdded>>;

public record ConditionAdded(Guid ConditionId);
