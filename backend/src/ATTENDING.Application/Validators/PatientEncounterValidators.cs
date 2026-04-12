using FluentValidation;
using ATTENDING.Application.Commands.Patients;
using ATTENDING.Application.Commands.Encounters;

namespace ATTENDING.Application.Validators;

public class CreatePatientValidator : AbstractValidator<CreatePatientCommand>
{
    public CreatePatientValidator()
    {
        RuleFor(x => x.MRN).NotEmpty().MaximumLength(20);
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DateOfBirth).NotEmpty().LessThan(DateTime.UtcNow);
        RuleFor(x => x.Sex).NotEmpty().Must(s => s is "Male" or "Female" or "Other" or "Unknown")
            .WithMessage("Sex must be Male, Female, Other, or Unknown");
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
        RuleFor(x => x.ZipCode).Matches(@"^\d{5}(-\d{4})?$").When(x => !string.IsNullOrEmpty(x.ZipCode))
            .WithMessage("Invalid ZIP code format");
    }
}

public class AddAllergyValidator : AbstractValidator<AddAllergyCommand>
{
    public AddAllergyValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty();
        RuleFor(x => x.Allergen).NotEmpty().MaximumLength(200);
    }
}

public class AddConditionValidator : AbstractValidator<AddConditionCommand>
{
    public AddConditionValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(500);
    }
}

public class CreateEncounterValidator : AbstractValidator<CreateEncounterCommand>
{
    public CreateEncounterValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty();
        RuleFor(x => x.ProviderId).NotEmpty();
        RuleFor(x => x.Type).NotEmpty().MaximumLength(50);
    }
}
