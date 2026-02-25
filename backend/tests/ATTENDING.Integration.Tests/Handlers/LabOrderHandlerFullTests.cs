using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ATTENDING.Application.Commands.LabOrders;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

/// <summary>
/// Extended lab order handler tests covering UpdatePriority, Cancel,
/// MarkCollected, and AddLabResult workflows.
/// </summary>
public class LabOrderHandlerFullTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public LabOrderHandlerFullTests(DatabaseFixture fixture) => _fixture = fixture;

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    private CreateLabOrderHandler BuildCreateHandler() =>
        new(_fixture.Services.GetRequiredService<ILabOrderRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<CreateLabOrderHandler>>());

    private UpdateLabOrderPriorityHandler BuildUpdatePriorityHandler() =>
        new(_fixture.Services.GetRequiredService<ILabOrderRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<UpdateLabOrderPriorityHandler>>());

    private CancelLabOrderHandler BuildCancelHandler() =>
        new(_fixture.Services.GetRequiredService<ILabOrderRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<CancelLabOrderHandler>>());

    private MarkLabOrderCollectedHandler BuildCollectHandler() =>
        new(_fixture.Services.GetRequiredService<ILabOrderRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            Mock.Of<ILogger<MarkLabOrderCollectedHandler>>());

    private AddLabResultHandler BuildAddResultHandler() =>
        new(_fixture.Services.GetRequiredService<ILabOrderRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            Mock.Of<ILogger<AddLabResultHandler>>());

    private async Task<LabOrderCreated> CreateLabOrderAsync(Guid patientId, Guid encounterId, Guid providerId,
        string indication = "Annual physical", OrderPriority priority = OrderPriority.Routine)
    {
        var result = await BuildCreateHandler().Handle(new CreateLabOrderCommand(
            PatientId: patientId, EncounterId: encounterId, OrderingProviderId: providerId,
            TestCode: "CBC", TestName: "Complete Blood Count", CptCode: "85025",
            CptDescription: null, CptBasePrice: null, LoincCode: "58410-2",
            Category: "Hematology", Priority: priority,
            ClinicalIndication: indication, DiagnosisCode: "Z00.00",
            DiagnosisDescription: null, RequiresFasting: false), CancellationToken.None);
        result.IsSuccess.Should().BeTrue();
        return result.Value;
    }

    // ================================================================
    // UpdateLabOrderPriority
    // ================================================================

    [Fact]
    public async Task UpdatePriority_PendingOrder_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("UPD-001");
        var provider = await _fixture.SeedProviderAsync("update.dr1@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        var result = await BuildUpdatePriorityHandler().Handle(
            new UpdateLabOrderPriorityCommand(created.LabOrderId, OrderPriority.Stat, provider.Id),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.PreviousPriority.Should().Be(OrderPriority.Routine);
    }

    [Fact]
    public async Task UpdatePriority_NotFound_ShouldFail()
    {
        var result = await BuildUpdatePriorityHandler().Handle(
            new UpdateLabOrderPriorityCommand(Guid.NewGuid(), OrderPriority.Stat, Guid.NewGuid()),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Contain("LabOrder");
    }

    [Fact]
    public async Task UpdatePriority_AlreadyCollected_ShouldFail()
    {
        var patient = await _fixture.SeedPatientAsync("UPD-002");
        var provider = await _fixture.SeedProviderAsync("update.dr2@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        // First collect it
        await BuildCollectHandler().Handle(
            new MarkLabOrderCollectedCommand(created.LabOrderId, DateTime.UtcNow),
            CancellationToken.None);

        // Now try to update priority
        var result = await BuildUpdatePriorityHandler().Handle(
            new UpdateLabOrderPriorityCommand(created.LabOrderId, OrderPriority.Stat, provider.Id),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Contain("Priority");
    }

    // ================================================================
    // CancelLabOrder
    // ================================================================

    [Fact]
    public async Task Cancel_PendingOrder_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("CNCL-001");
        var provider = await _fixture.SeedProviderAsync("cancel.dr1@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        var result = await BuildCancelHandler().Handle(
            new CancelLabOrderCommand(created.LabOrderId, provider.Id, "Patient declined"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Cancel_NotFound_ShouldFail()
    {
        var result = await BuildCancelHandler().Handle(
            new CancelLabOrderCommand(Guid.NewGuid(), Guid.NewGuid(), "reason"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public async Task Cancel_AlreadyCollected_ShouldFail()
    {
        var patient = await _fixture.SeedPatientAsync("CNCL-002");
        var provider = await _fixture.SeedProviderAsync("cancel.dr2@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        // Collect first
        await BuildCollectHandler().Handle(
            new MarkLabOrderCollectedCommand(created.LabOrderId, DateTime.UtcNow),
            CancellationToken.None);

        // Attempt cancel
        var result = await BuildCancelHandler().Handle(
            new CancelLabOrderCommand(created.LabOrderId, provider.Id, "Duplicate"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Contain("Cancel");
    }

    // ================================================================
    // MarkLabOrderCollected
    // ================================================================

    [Fact]
    public async Task MarkCollected_PendingOrder_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("COLL-001");
        var provider = await _fixture.SeedProviderAsync("collect.dr1@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        var result = await BuildCollectHandler().Handle(
            new MarkLabOrderCollectedCommand(created.LabOrderId, DateTime.UtcNow),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task MarkCollected_AlreadyCollected_ShouldFail()
    {
        var patient = await _fixture.SeedPatientAsync("COLL-002");
        var provider = await _fixture.SeedProviderAsync("collect.dr2@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        // First collect
        await BuildCollectHandler().Handle(
            new MarkLabOrderCollectedCommand(created.LabOrderId, DateTime.UtcNow),
            CancellationToken.None);

        // Second collect should fail
        var result = await BuildCollectHandler().Handle(
            new MarkLabOrderCollectedCommand(created.LabOrderId, DateTime.UtcNow),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Contain("Collect");
    }

    [Fact]
    public async Task MarkCollected_NotFound_ShouldFail()
    {
        var result = await BuildCollectHandler().Handle(
            new MarkLabOrderCollectedCommand(Guid.NewGuid(), DateTime.UtcNow),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
    }

    // ================================================================
    // AddLabResult
    // ================================================================

    [Fact]
    public async Task AddLabResult_CollectedOrder_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("RES-001");
        var provider = await _fixture.SeedProviderAsync("result.dr1@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        // Must be collected first
        await BuildCollectHandler().Handle(
            new MarkLabOrderCollectedCommand(created.LabOrderId, DateTime.UtcNow),
            CancellationToken.None);

        var result = await BuildAddResultHandler().Handle(new AddLabResultCommand(
            LabOrderId: created.LabOrderId,
            Value: "12.5",
            Unit: "g/dL",
            ReferenceRangeLow: 11.5m,
            ReferenceRangeHigh: 15.5m,
            ReferenceRangeText: null,
            Interpretation: "Normal",
            IsCritical: false,
            PerformingLab: "Main Lab",
            ResultedBy: "Lab Tech",
            Comments: null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.ResultId.Should().NotBeEmpty();
        result.Value.IsCritical.Should().BeFalse();
    }

    [Fact]
    public async Task AddLabResult_CriticalValue_ShouldMarkCritical()
    {
        var patient = await _fixture.SeedPatientAsync("RES-002");
        var provider = await _fixture.SeedProviderAsync("result.dr2@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        // Collect it first
        await BuildCollectHandler().Handle(
            new MarkLabOrderCollectedCommand(created.LabOrderId, DateTime.UtcNow),
            CancellationToken.None);

        var result = await BuildAddResultHandler().Handle(new AddLabResultCommand(
            LabOrderId: created.LabOrderId,
            Value: "6.2",
            Unit: "g/dL",
            ReferenceRangeLow: 11.5m,
            ReferenceRangeHigh: 15.5m,
            ReferenceRangeText: null,
            Interpretation: "Critically Low",
            IsCritical: true,
            PerformingLab: "Main Lab",
            ResultedBy: "Lab Tech",
            Comments: "Critical value - immediate notification required"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.IsCritical.Should().BeTrue();
    }

    [Fact]
    public async Task AddLabResult_OnPendingOrder_ShouldFail()
    {
        var patient = await _fixture.SeedPatientAsync("RES-003");
        var provider = await _fixture.SeedProviderAsync("result.dr3@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);
        // NOTE: NOT marking as collected

        var result = await BuildAddResultHandler().Handle(new AddLabResultCommand(
            LabOrderId: created.LabOrderId,
            Value: "12.5", Unit: "g/dL",
            ReferenceRangeLow: null, ReferenceRangeHigh: null, ReferenceRangeText: null,
            Interpretation: null, IsCritical: false,
            PerformingLab: null, ResultedBy: null, Comments: null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Contain("Result");
    }

    [Fact]
    public async Task AddLabResult_NotFound_ShouldFail()
    {
        var result = await BuildAddResultHandler().Handle(new AddLabResultCommand(
            LabOrderId: Guid.NewGuid(),
            Value: "12.5", Unit: "g/dL",
            ReferenceRangeLow: null, ReferenceRangeHigh: null, ReferenceRangeText: null,
            Interpretation: null, IsCritical: false,
            PerformingLab: null, ResultedBy: null, Comments: null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
    }

    // ================================================================
    // Audit trail verification
    // ================================================================

    [Fact]
    public async Task CreateLabOrder_ShouldLogPhiAccess()
    {
        var patient = await _fixture.SeedPatientAsync("AUDIT-001");
        var provider = await _fixture.SeedProviderAsync("audit.dr1@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        // Use the typed StubAuditService to verify PHI logging
        var auditService = (StubAuditService)_fixture.Services.GetRequiredService<IAuditService>();
        var previousCount = auditService.PhiAccessLog.Count;

        await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        auditService.PhiAccessLog.Count.Should().BeGreaterThan(previousCount);
        auditService.PhiAccessLog.Last().Action.Should().Be("CREATE_LAB_ORDER");
        auditService.PhiAccessLog.Last().PatientId.Should().Be(patient.Id);
    }

    [Fact]
    public async Task CancelLabOrder_ShouldLogPhiAccess()
    {
        var patient = await _fixture.SeedPatientAsync("AUDIT-002");
        var provider = await _fixture.SeedProviderAsync("audit.dr2@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var created = await CreateLabOrderAsync(patient.Id, encounter.Id, provider.Id);

        var auditService = (StubAuditService)_fixture.Services.GetRequiredService<IAuditService>();

        await BuildCancelHandler().Handle(
            new CancelLabOrderCommand(created.LabOrderId, provider.Id, "No longer needed"),
            CancellationToken.None);

        auditService.PhiAccessLog.Should().Contain(e =>
            e.Action == "CANCEL_LAB_ORDER" && e.PatientId == patient.Id);
    }
}
