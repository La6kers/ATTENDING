using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ATTENDING.Application.Commands.Assessments;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

/// <summary>
/// Extended assessment handler tests covering SubmitResponse,
/// AdvancePhase, and ReviewAssessment workflows.
/// </summary>
public class AssessmentHandlerFullTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public AssessmentHandlerFullTests(DatabaseFixture fixture) => _fixture = fixture;

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    private StartAssessmentHandler BuildStartHandler() =>
        new(_fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<StartAssessmentHandler>>());

    private SubmitAssessmentResponseHandler BuildSubmitResponseHandler() =>
        new(_fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            Mock.Of<ILogger<SubmitAssessmentResponseHandler>>());

    private AdvanceAssessmentPhaseHandler BuildAdvancePhaseHandler() =>
        new(_fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>());

    private CompleteAssessmentHandler BuildCompleteHandler() =>
        new(_fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            Mock.Of<ILogger<CompleteAssessmentHandler>>());

    private ReviewAssessmentHandler BuildReviewHandler() =>
        new(_fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IAuditService>());

    private async Task<AssessmentStarted> StartAssessmentAsync(Guid patientId, string complaint = "Mild cough")
    {
        var result = await BuildStartHandler().Handle(
            new StartAssessmentCommand(patientId, complaint), CancellationToken.None);
        result.IsSuccess.Should().BeTrue();
        return result.Value;
    }

    // ================================================================
    // SubmitAssessmentResponse
    // ================================================================

    [Fact]
    public async Task SubmitResponse_ValidInput_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("RESP-001");
        var started = await StartAssessmentAsync(patient.Id, "Headache");

        var result = await BuildSubmitResponseHandler().Handle(
            new SubmitAssessmentResponseCommand(started.AssessmentId,
                "How long have you had this headache?",
                "About 2 days"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.HasNewRedFlags.Should().BeFalse();
        result.Value.IsEmergency.Should().BeFalse();
    }

    [Fact]
    public async Task SubmitResponse_WithRedFlagAnswer_ShouldFlagEmergency()
    {
        var patient = await _fixture.SeedPatientAsync("RESP-002");
        var started = await StartAssessmentAsync(patient.Id, "Severe headache");

        var result = await BuildSubmitResponseHandler().Handle(
            new SubmitAssessmentResponseCommand(started.AssessmentId,
                "Are you experiencing any suicidal thoughts?",
                "Yes, I want to kill myself"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.HasNewRedFlags.Should().BeTrue();
        result.Value.IsEmergency.Should().BeTrue();
    }

    [Fact]
    public async Task SubmitResponse_NotFound_ShouldFail()
    {
        var result = await BuildSubmitResponseHandler().Handle(
            new SubmitAssessmentResponseCommand(Guid.NewGuid(), "Question?", "Answer"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Contain("Assessment");
    }

    [Fact]
    public async Task SubmitResponse_OnCompletedAssessment_ShouldFail()
    {
        var patient = await _fixture.SeedPatientAsync("RESP-003");
        var started = await StartAssessmentAsync(patient.Id, "Sore throat");

        // Complete it first
        await BuildCompleteHandler().Handle(
            new CompleteAssessmentCommand(started.AssessmentId, TriageLevel.NonUrgent, "Mild URI"),
            CancellationToken.None);

        // Try to submit response to completed assessment
        var result = await BuildSubmitResponseHandler().Handle(
            new SubmitAssessmentResponseCommand(started.AssessmentId, "Q?", "A"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Contain("Completed");
    }

    // ================================================================
    // AdvanceAssessmentPhase
    // ================================================================

    [Fact]
    public async Task AdvancePhase_ValidTransition_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("PHASE-001");
        var started = await StartAssessmentAsync(patient.Id, "Back pain");

        var result = await BuildAdvancePhaseHandler().Handle(
            new AdvanceAssessmentPhaseCommand(started.AssessmentId, AssessmentPhase.ChiefComplaint),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task AdvancePhase_NotFound_ShouldFail()
    {
        var result = await BuildAdvancePhaseHandler().Handle(
            new AdvanceAssessmentPhaseCommand(Guid.NewGuid(), AssessmentPhase.ChiefComplaint),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public async Task AdvancePhase_OnCompletedAssessment_ShouldFail()
    {
        var patient = await _fixture.SeedPatientAsync("PHASE-002");
        var started = await StartAssessmentAsync(patient.Id, "Fatigue");

        await BuildCompleteHandler().Handle(
            new CompleteAssessmentCommand(started.AssessmentId, TriageLevel.NonUrgent),
            CancellationToken.None);

        var result = await BuildAdvancePhaseHandler().Handle(
            new AdvanceAssessmentPhaseCommand(started.AssessmentId, AssessmentPhase.ChiefComplaint),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Contain("Completed");
    }

    // ================================================================
    // ReviewAssessment
    // ================================================================

    [Fact]
    public async Task Review_CompletedAssessment_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("REV-001");
        var provider = await _fixture.SeedProviderAsync("review.dr1@test.com");
        var started = await StartAssessmentAsync(patient.Id, "Stomach pain");

        await BuildCompleteHandler().Handle(
            new CompleteAssessmentCommand(started.AssessmentId, TriageLevel.Urgent, "GI complaint"),
            CancellationToken.None);

        var result = await BuildReviewHandler().Handle(
            new ReviewAssessmentCommand(started.AssessmentId, provider.Id, "Reviewed - recommend imaging"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Review_NotFound_ShouldFail()
    {
        var result = await BuildReviewHandler().Handle(
            new ReviewAssessmentCommand(Guid.NewGuid(), Guid.NewGuid(), null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public async Task Review_ShouldLogPhiAccess()
    {
        var patient = await _fixture.SeedPatientAsync("REV-002");
        var provider = await _fixture.SeedProviderAsync("review.dr2@test.com");
        var started = await StartAssessmentAsync(patient.Id, "Chest tightness");

        await BuildCompleteHandler().Handle(
            new CompleteAssessmentCommand(started.AssessmentId, TriageLevel.Resuscitation),
            CancellationToken.None);

        var auditService = (StubAuditService)_fixture.Services.GetRequiredService<IAuditService>();

        await BuildReviewHandler().Handle(
            new ReviewAssessmentCommand(started.AssessmentId, provider.Id, "Urgent review"),
            CancellationToken.None);

        auditService.PhiAccessLog.Should().Contain(e =>
            e.Action == "REVIEW_ASSESSMENT" && e.PatientId == patient.Id);
    }

    // ================================================================
    // Full workflow: start → respond → advance → complete → review
    // ================================================================

    [Fact]
    public async Task FullAssessmentWorkflow_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("FULL-ASM-001");
        var provider = await _fixture.SeedProviderAsync("full.workflow.dr@test.com");

        // Start
        var started = await StartAssessmentAsync(patient.Id, "Persistent cough and fever");
        started.IsEmergency.Should().BeFalse();

        // Submit symptoms response
        var resp1 = await BuildSubmitResponseHandler().Handle(
            new SubmitAssessmentResponseCommand(started.AssessmentId,
                "Duration?", "3 days"), CancellationToken.None);
        resp1.IsSuccess.Should().BeTrue();

        // Advance phase
        var advance = await BuildAdvancePhaseHandler().Handle(
            new AdvanceAssessmentPhaseCommand(started.AssessmentId, AssessmentPhase.MedicalHistory),
            CancellationToken.None);
        advance.IsSuccess.Should().BeTrue();

        // Complete
        var complete = await BuildCompleteHandler().Handle(
            new CompleteAssessmentCommand(started.AssessmentId, TriageLevel.Urgent, "Likely pneumonia"),
            CancellationToken.None);
        complete.IsSuccess.Should().BeTrue();

        // Review
        var review = await BuildReviewHandler().Handle(
            new ReviewAssessmentCommand(started.AssessmentId, provider.Id, "Agreed — order CXR"),
            CancellationToken.None);
        review.IsSuccess.Should().BeTrue();
    }
}
