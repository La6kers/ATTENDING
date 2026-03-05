using FluentValidation;
using ATTENDING.Application.Commands.Assessments;

namespace ATTENDING.Application.Validators;

/// <summary>
/// Validates the anonymous COMPASS intake form submission.
///
/// This is the ONLY unauthenticated write endpoint in the API surface, so input
/// boundary enforcement here is critical. Without this validator a caller can:
///   - POST an empty ChiefComplaint (breaks domain invariants downstream)
///   - Supply lists with thousands of items (unbounded memory / DB writes)
///   - Send multi-megabyte strings that bypass the global 2000-char convention
///     because JSON columns are nvarchar(max) with no DB-side length guard.
/// </summary>
public class SubmitCompassAssessmentValidator : AbstractValidator<SubmitCompassAssessmentCommand>
{
    // Maximum items allowed in any patient-reported list (medications, allergies, etc.)
    // A real patient will never have more than 50 active medications; 200 is generous.
    private const int MaxListItems = 200;

    // Maximum length for free-text fields that map to nvarchar(max) JSON columns.
    // Intentionally longer than the global 2000-char convention because clinical
    // narratives (HPI, review of systems) can be legitimately verbose.
    private const int MaxFreeTextLength = 5000;

    public SubmitCompassAssessmentValidator()
    {
        // ── Organization context ──────────────────────────────────────
        RuleFor(x => x.ClinicSlug)
            .MaximumLength(100)
            .WithMessage("ClinicSlug must not exceed 100 characters.")
            .When(x => x.ClinicSlug != null);

        // ── Chief complaint — required, bounded ───────────────────────
        RuleFor(x => x.ChiefComplaint)
            .NotEmpty()
            .WithMessage("Chief complaint is required.")
            .MaximumLength(MaxFreeTextLength)
            .WithMessage($"Chief complaint must not exceed {MaxFreeTextLength} characters.");

        // ── Demographics ──────────────────────────────────────────────
        RuleFor(x => x.PatientName)
            .MaximumLength(200)
            .WithMessage("Patient name must not exceed 200 characters.")
            .When(x => x.PatientName != null);

        RuleFor(x => x.DateOfBirth)
            .MaximumLength(30)
            .WithMessage("DateOfBirth must not exceed 30 characters.")
            .When(x => x.DateOfBirth != null);

        RuleFor(x => x.Gender)
            .MaximumLength(20)
            .WithMessage("Gender must not exceed 20 characters.")
            .When(x => x.Gender != null);

        // ── HPI ───────────────────────────────────────────────────────
        When(x => x.Hpi != null, () =>
        {
            RuleFor(x => x.Hpi!.Onset).MaximumLength(500).When(x => x.Hpi!.Onset != null);
            RuleFor(x => x.Hpi!.Location).MaximumLength(500).When(x => x.Hpi!.Location != null);
            RuleFor(x => x.Hpi!.Duration).MaximumLength(500).When(x => x.Hpi!.Duration != null);
            RuleFor(x => x.Hpi!.Character).MaximumLength(500).When(x => x.Hpi!.Character != null);
            RuleFor(x => x.Hpi!.Timing).MaximumLength(500).When(x => x.Hpi!.Timing != null);
            RuleFor(x => x.Hpi!.Severity)
                .InclusiveBetween(0, 10)
                .WithMessage("Pain severity must be between 0 and 10.")
                .When(x => x.Hpi!.Severity.HasValue);
            RuleFor(x => x.Hpi!.Aggravating)
                .Must(l => l!.Count <= MaxListItems)
                .WithMessage($"Aggravating factors list must not exceed {MaxListItems} items.")
                .When(x => x.Hpi!.Aggravating != null);
            RuleFor(x => x.Hpi!.Relieving)
                .Must(l => l!.Count <= MaxListItems)
                .WithMessage($"Relieving factors list must not exceed {MaxListItems} items.")
                .When(x => x.Hpi!.Relieving != null);
            RuleFor(x => x.Hpi!.Associated)
                .Must(l => l!.Count <= MaxListItems)
                .WithMessage($"Associated symptoms list must not exceed {MaxListItems} items.")
                .When(x => x.Hpi!.Associated != null);
        });

        // ── Clinical history lists — item count caps ──────────────────
        RuleFor(x => x.Medications)
            .Must(l => l!.Count <= MaxListItems)
            .WithMessage($"Medications list must not exceed {MaxListItems} items.")
            .When(x => x.Medications != null);

        RuleFor(x => x.Allergies)
            .Must(l => l!.Count <= MaxListItems)
            .WithMessage($"Allergies list must not exceed {MaxListItems} items.")
            .When(x => x.Allergies != null);

        RuleFor(x => x.MedicalHistory)
            .Must(l => l!.Count <= MaxListItems)
            .WithMessage($"Medical history list must not exceed {MaxListItems} items.")
            .When(x => x.MedicalHistory != null);

        RuleFor(x => x.SurgicalHistory)
            .Must(l => l!.Count <= MaxListItems)
            .WithMessage($"Surgical history list must not exceed {MaxListItems} items.")
            .When(x => x.SurgicalHistory != null);

        RuleFor(x => x.FamilyHistory)
            .Must(l => l!.Count <= MaxListItems)
            .WithMessage($"Family history list must not exceed {MaxListItems} items.")
            .When(x => x.FamilyHistory != null);

        RuleFor(x => x.RedFlags)
            .Must(l => l!.Count <= MaxListItems)
            .WithMessage($"Red flags list must not exceed {MaxListItems} items.")
            .When(x => x.RedFlags != null);

        RuleFor(x => x.ReviewOfSystems)
            .Must(d => d!.Count <= 30)
            .WithMessage("Review of systems must not exceed 30 body systems.")
            .When(x => x.ReviewOfSystems != null);

        RuleFor(x => x.SocialHistory)
            .Must(d => d!.Count <= 30)
            .WithMessage("Social history must not exceed 30 entries.")
            .When(x => x.SocialHistory != null);

        // ── Urgency ───────────────────────────────────────────────────
        RuleFor(x => x.UrgencyLevel)
            .Must(u => u == null || u is "emergency" or "high" or "moderate" or "low")
            .WithMessage("UrgencyLevel must be one of: emergency, high, moderate, low.");

        RuleFor(x => x.UrgencyScore)
            .InclusiveBetween(0, 100)
            .WithMessage("UrgencyScore must be between 0 and 100.")
            .When(x => x.UrgencyScore.HasValue);
    }
}

public class StartAssessmentValidator : AbstractValidator<StartAssessmentCommand>
{
    public StartAssessmentValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty().WithMessage("Patient ID is required");
        RuleFor(x => x.ChiefComplaint)
            .NotEmpty().WithMessage("Chief complaint is required")
            .MaximumLength(500).WithMessage("Chief complaint must not exceed 500 characters");
    }
}

public class SubmitAssessmentResponseValidator : AbstractValidator<SubmitAssessmentResponseCommand>
{
    public SubmitAssessmentResponseValidator()
    {
        RuleFor(x => x.AssessmentId).NotEmpty();
        RuleFor(x => x.Question).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Response).NotEmpty();
    }
}

public class CompleteAssessmentValidator : AbstractValidator<CompleteAssessmentCommand>
{
    public CompleteAssessmentValidator()
    {
        RuleFor(x => x.AssessmentId).NotEmpty();
        RuleFor(x => x.TriageLevel).IsInEnum().WithMessage("Invalid triage level");
    }
}

public class ReviewAssessmentValidator : AbstractValidator<ReviewAssessmentCommand>
{
    public ReviewAssessmentValidator()
    {
        RuleFor(x => x.AssessmentId).NotEmpty();
        RuleFor(x => x.ProviderId).NotEmpty();
    }
}
