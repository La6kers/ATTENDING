using FluentValidation;
using ATTENDING.Contracts.Requests;

namespace ATTENDING.Application.Validators;

/// <summary>
/// Validator for CreateMedicationOrderRequest.
/// Includes controlled substance rules required by DEA regulations.
/// </summary>
public class CreateMedicationOrderValidator : AbstractValidator<CreateMedicationOrderRequest>
{
    private static readonly string[] ValidDeaSchedules = { "CI", "CII", "CIII", "CIV", "CV" };

    public CreateMedicationOrderValidator()
    {
        RuleFor(x => x.PatientId)
            .NotEmpty()
            .WithMessage("Patient ID is required");

        RuleFor(x => x.EncounterId)
            .NotEmpty()
            .WithMessage("Encounter ID is required");

        RuleFor(x => x.MedicationCode)
            .NotEmpty()
            .WithMessage("Medication code is required");

        RuleFor(x => x.MedicationName)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Medication name is required and must be <= 200 characters");

        RuleFor(x => x.Dosage)
            .NotEmpty()
            .WithMessage("Dosage is required");

        RuleFor(x => x.Route)
            .NotEmpty()
            .WithMessage("Route is required");

        RuleFor(x => x.Frequency)
            .NotEmpty()
            .WithMessage("Frequency is required");

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantity must be greater than 0");

        RuleFor(x => x.Refills)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Refills must be 0 or greater");

        RuleFor(x => x.ClinicalIndication)
            .NotEmpty()
            .WithMessage("Clinical indication is required");

        RuleFor(x => x.DiagnosisCode)
            .NotEmpty()
            .IsValidIcd10Code();

        // --------------------------------------------------------
        // Controlled substance validation (DEA regulations)
        // --------------------------------------------------------

        RuleFor(x => x.DeaSchedule)
            .Must(schedule => ValidDeaSchedules.Contains(schedule))
            .When(x => x.IsControlledSubstance)
            .WithMessage("Controlled substances must have a valid DEA schedule (CI, CII, CIII, CIV, CV)");

        RuleFor(x => x.PrescriberDeaNumber)
            .NotEmpty()
            .When(x => x.IsControlledSubstance)
            .WithMessage("Prescriber DEA number is required for controlled substances");

        RuleFor(x => x.DispenseAsWritten)
            .NotNull()
            .When(x => x.IsControlledSubstance && x.DeaSchedule == "CII")
            .WithMessage("Dispense As Written must be explicitly set for Schedule II controlled substances");
    }
}
