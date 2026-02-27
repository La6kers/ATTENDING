using FluentAssertions;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Commands.Encounters;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using Moq;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

public class EncounterHandlerTests
{
    private readonly Mock<IEncounterRepository> _encounterRepo = new();
    private readonly Mock<IPatientRepository> _patientRepo = new();
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ILogger<CreateEncounterHandler>> _logger = new();

    [Fact]
    public async Task CreateEncounter_ValidInput_ShouldSucceed()
    {
        var patient = Patient.Create(new Guid("00000000-0000-0000-0000-000000000001"), "MRN-001", "Test", "Patient", DateTime.Today.AddYears(-30), BiologicalSex.Male);
        _patientRepo.Setup(r => r.GetByIdAsync(patient.Id, default)).ReturnsAsync(patient);

        var handler = new CreateEncounterHandler(_encounterRepo.Object, _patientRepo.Object, _uow.Object, _logger.Object);
        var result = await handler.Handle(new CreateEncounterCommand(
            patient.Id, Guid.NewGuid(), "Office Visit", DateTime.UtcNow.AddHours(2), null), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.EncounterNumber.Should().StartWith("ENC-");
    }

    [Fact]
    public async Task CreateEncounter_PatientNotFound_ShouldFail()
    {
        _patientRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Patient?)null);
        var handler = new CreateEncounterHandler(_encounterRepo.Object, _patientRepo.Object, _uow.Object, _logger.Object);

        var result = await handler.Handle(new CreateEncounterCommand(
            Guid.NewGuid(), Guid.NewGuid(), "Office Visit", null, null), default);

        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public async Task CheckIn_ValidEncounter_ShouldSucceed()
    {
        var encounter = Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit", DateTime.UtcNow);
        _encounterRepo.Setup(r => r.GetByIdAsync(encounter.Id, default)).ReturnsAsync(encounter);

        var handler = new CheckInEncounterHandler(_encounterRepo.Object, _uow.Object);
        var result = await handler.Handle(new CheckInEncounterCommand(encounter.Id), default);

        result.IsSuccess.Should().BeTrue();
        encounter.CheckedInAt.Should().NotBeNull();
    }

    [Fact]
    public async Task StartEncounter_WithChiefComplaint_ShouldSet()
    {
        var encounter = Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit");
        encounter.CheckIn();
        _encounterRepo.Setup(r => r.GetByIdAsync(encounter.Id, default)).ReturnsAsync(encounter);

        var handler = new StartEncounterHandler(_encounterRepo.Object, _uow.Object);
        var result = await handler.Handle(new StartEncounterCommand(encounter.Id, "Chest pain"), default);

        result.IsSuccess.Should().BeTrue();
        encounter.ChiefComplaint.Should().Be("Chest pain");
    }

    [Fact]
    public async Task CompleteEncounter_ShouldSetCompleted()
    {
        var encounter = Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit");
        encounter.CheckIn();
        encounter.Start("Follow-up");
        _encounterRepo.Setup(r => r.GetByIdAsync(encounter.Id, default)).ReturnsAsync(encounter);

        var handler = new CompleteEncounterHandler(_encounterRepo.Object, _uow.Object);
        var result = await handler.Handle(new CompleteEncounterCommand(encounter.Id), default);

        result.IsSuccess.Should().BeTrue();
        encounter.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CheckIn_NotFound_ShouldFail()
    {
        _encounterRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Encounter?)null);
        var handler = new CheckInEncounterHandler(_encounterRepo.Object, _uow.Object);

        var result = await handler.Handle(new CheckInEncounterCommand(Guid.NewGuid()), default);

        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public async Task CheckIn_AlreadyCheckedIn_ShouldFail()
    {
        var encounter = Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit");
        encounter.CheckIn();
        _encounterRepo.Setup(r => r.GetByIdAsync(encounter.Id, default)).ReturnsAsync(encounter);

        var handler = new CheckInEncounterHandler(_encounterRepo.Object, _uow.Object);
        var result = await handler.Handle(new CheckInEncounterCommand(encounter.Id), default);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Encounter.InvalidTransition");
    }

    [Fact]
    public async Task Complete_AlreadyCompleted_ShouldFail()
    {
        var encounter = Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit");
        encounter.CheckIn();
        encounter.Start("Test");
        encounter.Complete();
        _encounterRepo.Setup(r => r.GetByIdAsync(encounter.Id, default)).ReturnsAsync(encounter);

        var handler = new CompleteEncounterHandler(_encounterRepo.Object, _uow.Object);
        var result = await handler.Handle(new CompleteEncounterCommand(encounter.Id), default);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Encounter.AlreadyCompleted");
    }

    [Fact]
    public async Task Complete_FromScheduled_ShouldFail()
    {
        var encounter = Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit");
        _encounterRepo.Setup(r => r.GetByIdAsync(encounter.Id, default)).ReturnsAsync(encounter);

        var handler = new CompleteEncounterHandler(_encounterRepo.Object, _uow.Object);
        var result = await handler.Handle(new CompleteEncounterCommand(encounter.Id), default);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Encounter.InvalidTransition");
    }
}
