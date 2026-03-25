using FluentValidation;
using ATTENDING.Application.Commands.LabOrders;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Validators;

/// <summary>
/// Validator for CreateLabOrderCommand
/// </summary>
public class CreateLabOrderValidator : AbstractValidator<CreateLabOrderCommand>
{
    public CreateLabOrderValidator()
    {
        RuleFor(x => x.PatientId)
            .NotEmpty()
            .WithMessage("Patient ID is required");

        RuleFor(x => x.EncounterId)
            .NotEmpty()
            .WithMessage("Encounter ID is required");

        RuleFor(x => x.OrderingProviderId)
            .NotEmpty()
            .WithMessage("Ordering provider ID is required");

        RuleFor(x => x.TestCode)
            .NotEmpty()
            .MaximumLength(20)
            .WithMessage("Test code is required and must be <= 20 characters");

        RuleFor(x => x.TestName)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Test name is required and must be <= 200 characters");

        RuleFor(x => x.CptCode)
            .NotEmpty()
            .Matches(@"^\d{5}(-\d{2})?$")
            .WithMessage("CPT code must be 5 digits, optionally followed by a 2-digit modifier (e.g., 80048 or 80048-90)");

        RuleFor(x => x.LoincCode)
            .NotEmpty()
            .Matches(@"^\d{1,5}-\d$")
            .WithMessage("LOINC code format is invalid (e.g., 12345-6)");

        RuleFor(x => x.Category)
            .NotEmpty()
            .MaximumLength(50)
            .WithMessage("Category is required");

        RuleFor(x => x.Priority)
            .IsInEnum()
            .WithMessage("Priority must be a valid value (Routine, Urgent, Asap, Stat)");

        RuleFor(x => x.ClinicalIndication)
            .NotEmpty()
            .MinimumLength(10)
            .MaximumLength(1000)
            .WithMessage("Clinical indication must be between 10 and 1000 characters");

        RuleFor(x => x.DiagnosisCode)
            .NotEmpty()
            .Matches(@"^[A-Z]\d{2}(\.\d{1,2})?$")
            .WithMessage("Diagnosis code must be a valid ICD-10 format (e.g., A01 or A01.1)");

        RuleFor(x => x.PainSeverity)
            .InclusiveBetween(0, 10)
            .When(x => x.PainSeverity.HasValue)
            .WithMessage("Pain severity must be between 0 and 10");
    }
}

/// <summary>
/// Validator for CancelLabOrderCommand
/// </summary>
public class CancelLabOrderValidator : AbstractValidator<CancelLabOrderCommand>
{
    public CancelLabOrderValidator()
    {
        RuleFor(x => x.LabOrderId)
            .NotEmpty()
            .WithMessage("Lab order ID is required");

        RuleFor(x => x.CancelledBy)
            .NotEmpty()
            .WithMessage("Cancelled by user ID is required");

        RuleFor(x => x.Reason)
            .NotEmpty()
            .MinimumLength(5)
            .MaximumLength(500)
            .WithMessage("Cancellation reason must be between 5 and 500 characters");
    }
}

/// <summary>
/// Validator for AddLabResultCommand
/// </summary>
public class AddLabResultValidator : AbstractValidator<AddLabResultCommand>
{
    public AddLabResultValidator()
    {
        RuleFor(x => x.LabOrderId)
            .NotEmpty()
            .WithMessage("Lab order ID is required");

        RuleFor(x => x.Value)
            .NotEmpty()
            .MaximumLength(100)
            .WithMessage("Result value is required and must be <= 100 characters");

        RuleFor(x => x.Unit)
            .MaximumLength(50)
            .When(x => !string.IsNullOrEmpty(x.Unit))
            .WithMessage("Unit must be <= 50 characters");

        RuleFor(x => x.ReferenceRangeLow)
            .LessThan(x => x.ReferenceRangeHigh)
            .When(x => x.ReferenceRangeLow.HasValue && x.ReferenceRangeHigh.HasValue)
            .WithMessage("Reference range low must be less than high");

        RuleFor(x => x.Interpretation)
            .MaximumLength(20)
            .When(x => !string.IsNullOrEmpty(x.Interpretation))
            .WithMessage("Interpretation must be <= 20 characters (e.g., 'Normal', 'High', 'Low', 'Critical')");
    }
}

/// <summary>
/// Extension method for common clinical validations
/// </summary>
public static class ClinicalValidationExtensions
{
    /// <summary>
    /// Validates that a string is a valid ICD-10 code
    /// </summary>
    public static IRuleBuilderOptions<T, string> IsValidIcd10Code<T>(this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Matches(@"^[A-Z]\d{2}(\.\d{1,2})?$")
            .WithMessage("Must be a valid ICD-10 code format");
    }

    /// <summary>
    /// Validates that a string is a valid CPT code
    /// </summary>
    public static IRuleBuilderOptions<T, string> IsValidCptCode<T>(this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Matches(@"^\d{5}(-\d{2})?$")
            .WithMessage("Must be a valid CPT code format");
    }

    /// <summary>
    /// Validates that a string is a valid LOINC code
    /// </summary>
    public static IRuleBuilderOptions<T, string> IsValidLoincCode<T>(this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Matches(@"^\d{1,5}-\d$")
            .WithMessage("Must be a valid LOINC code format");
    }

    /// <summary>
    /// Validates that a string is a valid NPI
    /// </summary>
    public static IRuleBuilderOptions<T, string> IsValidNpi<T>(this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Matches(@"^\d{10}$")
            .WithMessage("Must be a valid 10-digit NPI");
    }
}
