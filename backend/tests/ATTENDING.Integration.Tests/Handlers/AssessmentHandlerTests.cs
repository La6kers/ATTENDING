using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ATTENDING.Application.Commands.Assessments;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

public class AssessmentHandlerTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public AssessmentHandlerTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task StartAssessment_ValidInput_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("ASM-001");

        var handler = new StartAssessmentHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<StartAssessmentHandler>>());

        var result = await handler.Handle(
            new StartAssessmentCommand(patient.Id, "Sore throat and fever"),
            CancellationToken.None);

        result.Success.Should().BeTrue();
        result.AssessmentId.Should().NotBeNull();
        result.AssessmentNumber.Should().StartWith("ASM-");
        result.IsEmergency.Should().BeFalse();
    }

    [Fact]
    public async Task StartAssessment_EmergencySymptoms_ShouldFlagEmergency()
    {
        var patient = await _fixture.SeedPatientAsync("ASM-002");

        var handler = new StartAssessmentHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<StartAssessmentHandler>>());

        var result = await handler.Handle(
            new StartAssessmentCommand(patient.Id, "I want to kill myself"),
            CancellationToken.None);

        result.Success.Should().BeTrue();
        result.IsEmergency.Should().BeTrue();
        result.HasRedFlags.Should().BeTrue();
    }

    [Fact]
    public async Task StartAssessment_NonExistentPatient_ShouldFail()
    {
        var handler = new StartAssessmentHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<StartAssessmentHandler>>());

        var result = await handler.Handle(
            new StartAssessmentCommand(Guid.NewGuid(), "Headache"),
            CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Patient not found");
    }

    [Fact]
    public async Task CompleteAssessment_ShouldSetTriageLevel()
    {
        var patient = await _fixture.SeedPatientAsync("ASM-003");

        var startHandler = new StartAssessmentHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<StartAssessmentHandler>>());

        var startResult = await startHandler.Handle(
            new StartAssessmentCommand(patient.Id, "Mild cough"),
            CancellationToken.None);

        var completeHandler = new CompleteAssessmentHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            Mock.Of<ILogger<CompleteAssessmentHandler>>());

        var completeResult = await completeHandler.Handle(
            new CompleteAssessmentCommand(startResult.AssessmentId!.Value, TriageLevel.NonUrgent),
            CancellationToken.None);

        completeResult.Success.Should().BeTrue();
    }
}
