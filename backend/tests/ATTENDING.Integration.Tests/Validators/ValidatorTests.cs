using FluentAssertions;
using ATTENDING.Application.Commands.Assessments;
using ATTENDING.Application.Commands.LabOrders;
using ATTENDING.Application.Validators;
using ATTENDING.Domain.Enums;
using Xunit;

namespace ATTENDING.Integration.Tests.Validators;

public class ValidatorTests
{
    [Fact]
    public void StartAssessment_EmptyComplaint_ShouldFail()
    {
        var validator = new StartAssessmentValidator();
        var result = validator.Validate(new StartAssessmentCommand(Guid.NewGuid(), ""));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "ChiefComplaint");
    }

    [Fact]
    public void StartAssessment_EmptyPatientId_ShouldFail()
    {
        var validator = new StartAssessmentValidator();
        var result = validator.Validate(new StartAssessmentCommand(Guid.Empty, "Headache"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "PatientId");
    }

    [Fact]
    public void StartAssessment_Valid_ShouldPass()
    {
        var validator = new StartAssessmentValidator();
        var result = validator.Validate(new StartAssessmentCommand(Guid.NewGuid(), "Headache"));
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void StartAssessment_LongComplaint_ShouldFail()
    {
        var validator = new StartAssessmentValidator();
        var result = validator.Validate(
            new StartAssessmentCommand(Guid.NewGuid(), new string('x', 501)));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreateLabOrder_Valid_ShouldPass()
    {
        var validator = new CreateLabOrderValidator();
        var command = new CreateLabOrderCommand(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "CBC", "Complete Blood Count", "85025", null, null,
            "58410-2", "Hematology", OrderPriority.Routine,
            "Annual physical exam", "Z00.00", null, false);
        var result = validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CompleteAssessment_EmptyId_ShouldFail()
    {
        var validator = new CompleteAssessmentValidator();
        var result = validator.Validate(
            new CompleteAssessmentCommand(Guid.Empty, TriageLevel.NonUrgent));
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void ReviewAssessment_Valid_ShouldPass()
    {
        var validator = new ReviewAssessmentValidator();
        var result = validator.Validate(
            new ReviewAssessmentCommand(Guid.NewGuid(), Guid.NewGuid()));
        result.IsValid.Should().BeTrue();
    }
}
