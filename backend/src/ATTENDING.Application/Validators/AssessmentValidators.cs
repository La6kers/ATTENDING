using FluentValidation;
using ATTENDING.Application.Commands.Assessments;

namespace ATTENDING.Application.Validators;

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
