using FluentAssertions;
using ATTENDING.Application.Commands.Patients;
using ATTENDING.Application.Commands.Encounters;
using ATTENDING.Application.Validators;
using ATTENDING.Domain.Enums;
using Xunit;

namespace ATTENDING.Integration.Tests.Validators;

public class PatientEncounterValidatorTests
{
    [Fact]
    public void CreatePatient_Valid_ShouldPass()
    {
        var validator = new CreatePatientValidator();
        var result = validator.Validate(new CreatePatientCommand(
            "MRN-001", "John", "Doe", new DateTime(1985, 3, 15), "Male",
            null, null, null, null, null, null, "English"));
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreatePatient_EmptyMRN_ShouldFail()
    {
        var validator = new CreatePatientValidator();
        var result = validator.Validate(new CreatePatientCommand(
            "", "John", "Doe", new DateTime(1985, 3, 15), "Male",
            null, null, null, null, null, null, "English"));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreatePatient_InvalidSex_ShouldFail()
    {
        var validator = new CreatePatientValidator();
        var result = validator.Validate(new CreatePatientCommand(
            "MRN-001", "John", "Doe", new DateTime(1985, 3, 15), "InvalidValue",
            null, null, null, null, null, null, "English"));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreatePatient_FutureDOB_ShouldFail()
    {
        var validator = new CreatePatientValidator();
        var result = validator.Validate(new CreatePatientCommand(
            "MRN-001", "John", "Doe", DateTime.UtcNow.AddDays(1), "Male",
            null, null, null, null, null, null, "English"));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreatePatient_InvalidEmail_ShouldFail()
    {
        var validator = new CreatePatientValidator();
        var result = validator.Validate(new CreatePatientCommand(
            "MRN-001", "John", "Doe", new DateTime(1985, 3, 15), "Male",
            null, "not-an-email", null, null, null, null, "English"));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreatePatient_ValidZip_ShouldPass()
    {
        var validator = new CreatePatientValidator();
        var result = validator.Validate(new CreatePatientCommand(
            "MRN-001", "John", "Doe", new DateTime(1985, 3, 15), "Male",
            null, null, null, null, "CO", "80134", "English"));
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void AddAllergy_EmptyAllergen_ShouldFail()
    {
        var validator = new AddAllergyValidator();
        var result = validator.Validate(new AddAllergyCommand(
            Guid.NewGuid(), "", AllergySeverity.Mild, null));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void AddCondition_EmptyCode_ShouldFail()
    {
        var validator = new AddConditionValidator();
        var result = validator.Validate(new AddConditionCommand(
            Guid.NewGuid(), "", "Diabetes", null));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreateEncounter_Valid_ShouldPass()
    {
        var validator = new CreateEncounterValidator();
        var result = validator.Validate(new CreateEncounterCommand(
            Guid.NewGuid(), Guid.NewGuid(), "Office Visit", DateTime.UtcNow.AddHours(1), null));
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateEncounter_EmptyType_ShouldFail()
    {
        var validator = new CreateEncounterValidator();
        var result = validator.Validate(new CreateEncounterCommand(
            Guid.NewGuid(), Guid.NewGuid(), "", null, null));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreateEncounter_EmptyPatientId_ShouldFail()
    {
        var validator = new CreateEncounterValidator();
        var result = validator.Validate(new CreateEncounterCommand(
            Guid.Empty, Guid.NewGuid(), "Office Visit", null, null));
        result.IsValid.Should().BeFalse();
    }
}
