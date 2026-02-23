using FluentAssertions;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Services;
using Xunit;

namespace ATTENDING.Integration.Tests.Domain;

public class PatientAssessmentTests
{
    [Fact]
    public void Create_WithValidInput_ShouldCreateAssessment()
    {
        var patientId = Guid.NewGuid();
        var assessment = PatientAssessment.Create(patientId, "Severe headache");

        assessment.Id.Should().NotBeEmpty();
        assessment.PatientId.Should().Be(patientId);
        assessment.ChiefComplaint.Should().Be("Severe headache");
        assessment.CurrentPhase.Should().Be(AssessmentPhase.ChiefComplaint);
        assessment.AssessmentNumber.Should().StartWith("ASM-");
        assessment.HasRedFlags.Should().BeFalse();
        assessment.IsEmergency.Should().BeFalse();
    }

    [Fact]
    public void Create_WithRedFlags_ShouldSetEmergency()
    {
        var evaluator = new RedFlagEvaluator();
        var eval = evaluator.Evaluate("crushing chest pain radiating to arm", null, null);

        var assessment = PatientAssessment.Create(Guid.NewGuid(), "crushing chest pain radiating to arm", eval);

        assessment.HasRedFlags.Should().BeTrue();
        assessment.IsEmergency.Should().BeTrue();
        assessment.CurrentPhase.Should().Be(AssessmentPhase.Emergency);
        assessment.EmergencyReason.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void AdvancePhase_ShouldUpdateCurrentPhase()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Knee pain");
        assessment.AdvanceToPhase(AssessmentPhase.HpiOnset);
        assessment.CurrentPhase.Should().Be(AssessmentPhase.HpiOnset);
    }

    [Fact]
    public void SetPainSeverity_InvalidValue_ShouldThrow()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Back pain");
        var act = () => assessment.SetPainSeverity(11);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetPainSeverity_ValidValue_ShouldSet()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Back pain");
        assessment.SetPainSeverity(7);
        assessment.PainSeverity.Should().Be(7);
    }

    [Fact]
    public void Complete_ShouldSetTriageAndPhase()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Mild cough");
        assessment.Complete(TriageLevel.NonUrgent);

        assessment.CurrentPhase.Should().Be(AssessmentPhase.Completed);
        assessment.TriageLevel.Should().Be(TriageLevel.NonUrgent);
        assessment.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public void MarkAsReviewed_ShouldSetProvider()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Sore throat");
        assessment.Complete(TriageLevel.LessUrgent);
        var providerId = Guid.NewGuid();

        assessment.MarkAsReviewed(providerId);

        assessment.ReviewedByProviderId.Should().Be(providerId);
        assessment.ReviewedAt.Should().NotBeNull();
    }

    [Fact]
    public void AddResponse_WithRedFlags_ShouldTriggerEmergency()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Feeling unwell");
        var evaluator = new RedFlagEvaluator();
        var eval = evaluator.Evaluate("Feeling unwell I want to kill myself", null, null);

        assessment.AddResponse("How are you feeling?", "I want to kill myself", eval);

        assessment.HasRedFlags.Should().BeTrue();
        assessment.IsEmergency.Should().BeTrue();
        assessment.Responses.Should().HaveCount(1);
    }

    [Fact]
    public void SetHpiData_ShouldPopulateFields()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Headache");
        assessment.SetHpiData(onset: "2 hours ago", location: "Frontal", severity: "7/10");

        assessment.HpiOnset.Should().Be("2 hours ago");
        assessment.HpiLocation.Should().Be("Frontal");
        assessment.HpiSeverity.Should().Be("7/10");
    }

    [Fact]
    public void DomainEvents_ShouldBeRaised()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Fever");
        assessment.DomainEvents.Should().HaveCount(1);
        assessment.DomainEvents.First().Should().BeOfType<AssessmentStartedEvent>();
    }
}
