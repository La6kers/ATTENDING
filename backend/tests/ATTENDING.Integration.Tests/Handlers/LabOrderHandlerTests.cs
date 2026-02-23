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

public class LabOrderHandlerTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public LabOrderHandlerTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateLabOrder_ValidInput_ShouldSucceed()
    {
        var patient = await _fixture.SeedPatientAsync("LO-001");
        var provider = await _fixture.SeedProviderAsync("lab.dr@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var handler = new CreateLabOrderHandler(
            _fixture.Services.GetRequiredService<ILabOrderRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<CreateLabOrderHandler>>());

        var command = new CreateLabOrderCommand(
            PatientId: patient.Id, EncounterId: encounter.Id,
            OrderingProviderId: provider.Id, TestCode: "CBC",
            TestName: "Complete Blood Count", CptCode: "85025",
            CptDescription: null, CptBasePrice: null,
            LoincCode: "58410-2", Category: "Hematology",
            Priority: OrderPriority.Routine,
            ClinicalIndication: "Annual physical",
            DiagnosisCode: "Z00.00", DiagnosisDescription: null,
            RequiresFasting: false);

        var result = await handler.Handle(command, CancellationToken.None);

        result.Success.Should().BeTrue();
        result.LabOrderId.Should().NotBeNull();
        result.OrderNumber.Should().StartWith("LAB-");
        result.WasUpgradedToStat.Should().BeFalse();
    }

    [Fact]
    public async Task CreateLabOrder_NonExistentPatient_ShouldFail()
    {
        var handler = new CreateLabOrderHandler(
            _fixture.Services.GetRequiredService<ILabOrderRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<CreateLabOrderHandler>>());

        var command = new CreateLabOrderCommand(
            PatientId: Guid.NewGuid(), EncounterId: Guid.NewGuid(),
            OrderingProviderId: Guid.NewGuid(), TestCode: "CBC",
            TestName: "Complete Blood Count", CptCode: "85025",
            CptDescription: null, CptBasePrice: null,
            LoincCode: "58410-2", Category: "Hematology",
            Priority: OrderPriority.Routine,
            ClinicalIndication: "Test", DiagnosisCode: "Z00.00",
            DiagnosisDescription: null, RequiresFasting: false);

        var result = await handler.Handle(command, CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Patient not found");
    }

    [Fact]
    public async Task CreateLabOrder_WithChestPain_ShouldUpgradeToStat()
    {
        var patient = await _fixture.SeedPatientAsync("LO-002");
        var provider = await _fixture.SeedProviderAsync("lab2.dr@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var handler = new CreateLabOrderHandler(
            _fixture.Services.GetRequiredService<ILabOrderRepository>(),
            _fixture.Services.GetRequiredService<IPatientRepository>(),
            _fixture.Services.GetRequiredService<IUnitOfWork>(),
            _fixture.Services.GetRequiredService<IRedFlagEvaluator>(),
            _fixture.Services.GetRequiredService<IAuditService>(),
            Mock.Of<ILogger<CreateLabOrderHandler>>());

        var command = new CreateLabOrderCommand(
            PatientId: patient.Id, EncounterId: encounter.Id,
            OrderingProviderId: provider.Id, TestCode: "TROP",
            TestName: "Troponin", CptCode: "84484",
            CptDescription: null, CptBasePrice: null,
            LoincCode: "6598-7", Category: "Chemistry",
            Priority: OrderPriority.Routine,
            ClinicalIndication: "crushing chest pain radiating to arm",
            DiagnosisCode: "R07.9", DiagnosisDescription: null,
            RequiresFasting: false);

        var result = await handler.Handle(command, CancellationToken.None);

        result.Success.Should().BeTrue();
        result.WasUpgradedToStat.Should().BeTrue();
        result.RedFlagReason.Should().NotBeNullOrWhiteSpace();
    }
}
