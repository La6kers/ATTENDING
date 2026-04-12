using FluentValidation;
using ATTENDING.Application.Commands.Organizations;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Validators;

public class ProvisionOrganizationValidator : AbstractValidator<ProvisionOrganizationCommand>
{
    public ProvisionOrganizationValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Organization name is required.")
            .MaximumLength(200);

        RuleFor(x => x.PrimaryContactName)
            .NotEmpty().WithMessage("Primary contact name is required.")
            .MaximumLength(100);

        RuleFor(x => x.PrimaryContactEmail)
            .NotEmpty().WithMessage("Primary contact email is required.")
            .EmailAddress().WithMessage("Valid email address is required.");

        RuleFor(x => x.NPI)
            .Matches(@"^\d{10}$").When(x => !string.IsNullOrEmpty(x.NPI))
            .WithMessage("NPI must be exactly 10 digits.");

        RuleFor(x => x.MaxProviderSeats)
            .InclusiveBetween(1, 500);
    }
}

public class ConfigureEhrConnectorValidator : AbstractValidator<ConfigureEhrConnectorCommand>
{
    public ConfigureEhrConnectorValidator()
    {
        RuleFor(x => x.OrganizationId).NotEmpty();

        RuleFor(x => x.Vendor)
            .IsInEnum()
            .NotEqual(EhrVendor.None).WithMessage("EHR vendor is required.");

        RuleFor(x => x.ClientId)
            .NotEmpty().WithMessage("Client ID is required.")
            .MaximumLength(200);

        RuleFor(x => x.FhirBaseUrl)
            .NotEmpty().When(x => x.Vendor == EhrVendor.GenericFhirR4)
            .WithMessage("FHIR base URL is required for Generic FHIR R4.")
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
            .When(x => !string.IsNullOrEmpty(x.FhirBaseUrl))
            .WithMessage("FHIR base URL must be a valid absolute URL.");

        RuleFor(x => x.EhrTenantId)
            .NotEmpty().When(x => x.Vendor == EhrVendor.OracleHealth)
            .WithMessage("EHR Tenant ID is required for Oracle Health (Cerner).");

        RuleFor(x => x.Label)
            .MaximumLength(100);
    }
}

public class TestEhrConnectionValidator : AbstractValidator<TestEhrConnectionCommand>
{
    public TestEhrConnectionValidator()
    {
        RuleFor(x => x.OrganizationId).NotEmpty();
        RuleFor(x => x.ConnectorId).NotEmpty();
    }
}

public class SeedOrganizationDataValidator : AbstractValidator<SeedOrganizationDataCommand>
{
    public SeedOrganizationDataValidator()
    {
        RuleFor(x => x.OrganizationId).NotEmpty();
    }
}

public class ActivateOrganizationValidator : AbstractValidator<ActivateOrganizationCommand>
{
    public ActivateOrganizationValidator()
    {
        RuleFor(x => x.OrganizationId).NotEmpty();
    }
}

public class SetDataModeValidator : AbstractValidator<SetDataModeCommand>
{
    public SetDataModeValidator()
    {
        RuleFor(x => x.OrganizationId).NotEmpty();
        RuleFor(x => x.Mode).IsInEnum();
    }
}
