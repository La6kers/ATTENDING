using FluentAssertions;
using ATTENDING.Contracts.Requests;
using Xunit;

namespace ATTENDING.Integration.Tests.Validators;

public class AiRequestValidatorTests
{
    [Fact]
    public void DifferentialRequest_WithPatientId_ShouldBeValid()
    {
        var req = new DifferentialDiagnosisRequest(Guid.NewGuid(), ChiefComplaint: "Chest pain");
        req.PatientId.Should().NotBeEmpty();
        req.ChiefComplaint.Should().Be("Chest pain");
    }

    [Fact]
    public void TriageRequest_ShouldRequireFields()
    {
        var req = new TriageAssessmentRequest("Severe headache", "Worst headache of my life, sudden onset", 9);
        req.ChiefComplaint.Should().NotBeEmpty();
        req.Symptoms.Should().NotBeEmpty();
        req.PainLevel.Should().Be(9);
    }

    [Fact]
    public void FeedbackRequest_ValidRating_ShouldBeAccepted()
    {
        var req = new SubmitAiFeedbackRequest(
            "Differential", "req-123", "Helpful",
            AccuracyScore: 5, SelectedDiagnosis: "J06.9",
            Comment: "Spot on");
        req.Rating.Should().Be("Helpful");
        req.AccuracyScore.Should().Be(5);
    }

    [Fact]
    public void FeedbackRequest_NullOptionals_ShouldBeValid()
    {
        var req = new SubmitAiFeedbackRequest("Triage", "req-456", "NotHelpful");
        req.AccuracyScore.Should().BeNull();
        req.Comment.Should().BeNull();
        req.PatientId.Should().BeNull();
    }
}
