using FluentAssertions;
using ATTENDING.Domain.Entities;
using Xunit;

namespace ATTENDING.Integration.Tests.Domain;

public class AiFeedbackTests
{
    [Fact]
    public void Create_ShouldSetAllFields()
    {
        var providerId = Guid.NewGuid();
        var feedback = AiFeedback.Create(
            providerId, "Differential", "req-123", "Helpful",
            accuracyScore: 4, selectedDiagnosis: "J06.9 URI",
            comment: "Accurate for this presentation", modelVersion: "biomistral-v1");

        feedback.Id.Should().NotBeEmpty();
        feedback.ProviderId.Should().Be(providerId);
        feedback.RecommendationType.Should().Be("Differential");
        feedback.RequestId.Should().Be("req-123");
        feedback.Rating.Should().Be("Helpful");
        feedback.AccuracyScore.Should().Be(4);
        feedback.SelectedDiagnosis.Should().Be("J06.9 URI");
        feedback.Comment.Should().Be("Accurate for this presentation");
        feedback.ModelVersion.Should().Be("biomistral-v1");
    }

    [Fact]
    public void Create_ShouldTruncateComment()
    {
        var longComment = new string('x', 600);
        var feedback = AiFeedback.Create(
            Guid.NewGuid(), "Triage", "req-456", "NotHelpful",
            comment: longComment);

        feedback.Comment!.Length.Should().Be(500);
    }

    [Fact]
    public void Create_MinimalFields_ShouldWork()
    {
        var feedback = AiFeedback.Create(
            Guid.NewGuid(), "LabRecommendation", "req-789", "PartiallyHelpful");

        feedback.AccuracyScore.Should().BeNull();
        feedback.SelectedDiagnosis.Should().BeNull();
        feedback.Comment.Should().BeNull();
        feedback.PatientId.Should().BeNull();
        feedback.EncounterId.Should().BeNull();
    }

    [Fact]
    public void Create_WithPatientAndEncounter_ShouldSet()
    {
        var patientId = Guid.NewGuid();
        var encounterId = Guid.NewGuid();

        var feedback = AiFeedback.Create(
            Guid.NewGuid(), "ImagingRecommendation", "req-abc", "Helpful",
            patientId: patientId, encounterId: encounterId);

        feedback.PatientId.Should().Be(patientId);
        feedback.EncounterId.Should().Be(encounterId);
    }
}
