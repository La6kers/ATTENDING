using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Commands.Encounters;

public class CreateEncounterHandler : IRequestHandler<CreateEncounterCommand, Result<EncounterCreated>>
{
    private readonly IEncounterRepository _repo;
    private readonly IPatientRepository _patientRepo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<CreateEncounterHandler> _logger;

    public CreateEncounterHandler(
        IEncounterRepository repo, IPatientRepository patientRepo,
        IUnitOfWork uow, ILogger<CreateEncounterHandler> logger)
    {
        _repo = repo;
        _patientRepo = patientRepo;
        _uow = uow;
        _logger = logger;
    }

    public async Task<Result<EncounterCreated>> Handle(CreateEncounterCommand cmd, CancellationToken ct)
    {
        var patient = await _patientRepo.GetByIdAsync(cmd.PatientId, ct);
        if (patient == null)
            return Result.Failure<EncounterCreated>(DomainErrors.Patient.NotFound(cmd.PatientId));

        var encounter = Encounter.Create(cmd.PatientId, cmd.ProviderId, cmd.Type, cmd.ScheduledAt);
        if (cmd.ChiefComplaint != null)
            encounter.Start(cmd.ChiefComplaint);

        await _repo.AddAsync(encounter, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Encounter created: {Number} for Patient {PatientId}",
            encounter.EncounterNumber, cmd.PatientId);
        return new EncounterCreated(encounter.Id, encounter.EncounterNumber);
    }
}

public class CheckInEncounterHandler : IRequestHandler<CheckInEncounterCommand, Result<Unit>>
{
    private readonly IEncounterRepository _repo;
    private readonly IUnitOfWork _uow;

    public CheckInEncounterHandler(IEncounterRepository repo, IUnitOfWork uow)
    { _repo = repo; _uow = uow; }

    public async Task<Result<Unit>> Handle(CheckInEncounterCommand cmd, CancellationToken ct)
    {
        var encounter = await _repo.GetByIdAsync(cmd.EncounterId, ct);
        if (encounter == null)
            return Result.Failure<Unit>(DomainErrors.Encounter.NotFound(cmd.EncounterId));

        if (encounter.Status != Domain.Enums.EncounterStatus.Scheduled)
            return Result.Failure<Unit>(DomainErrors.Encounter.InvalidTransition(encounter.Status.ToString(), "CheckedIn"));

        encounter.CheckIn();
        _repo.Update(encounter);
        await _uow.SaveChangesAsync(ct);
        return Result.Success(Unit.Value);
    }
}

public class StartEncounterHandler : IRequestHandler<StartEncounterCommand, Result<Unit>>
{
    private readonly IEncounterRepository _repo;
    private readonly IUnitOfWork _uow;

    public StartEncounterHandler(IEncounterRepository repo, IUnitOfWork uow)
    { _repo = repo; _uow = uow; }

    public async Task<Result<Unit>> Handle(StartEncounterCommand cmd, CancellationToken ct)
    {
        var encounter = await _repo.GetByIdAsync(cmd.EncounterId, ct);
        if (encounter == null)
            return Result.Failure<Unit>(DomainErrors.Encounter.NotFound(cmd.EncounterId));

        if (encounter.Status != Domain.Enums.EncounterStatus.CheckedIn &&
            encounter.Status != Domain.Enums.EncounterStatus.Scheduled)
            return Result.Failure<Unit>(DomainErrors.Encounter.InvalidTransition(encounter.Status.ToString(), "InProgress"));

        encounter.Start(cmd.ChiefComplaint);
        _repo.Update(encounter);
        await _uow.SaveChangesAsync(ct);
        return Result.Success(Unit.Value);
    }
}

public class CompleteEncounterHandler : IRequestHandler<CompleteEncounterCommand, Result<Unit>>
{
    private readonly IEncounterRepository _repo;
    private readonly IUnitOfWork _uow;

    public CompleteEncounterHandler(IEncounterRepository repo, IUnitOfWork uow)
    { _repo = repo; _uow = uow; }

    public async Task<Result<Unit>> Handle(CompleteEncounterCommand cmd, CancellationToken ct)
    {
        var encounter = await _repo.GetByIdAsync(cmd.EncounterId, ct);
        if (encounter == null)
            return Result.Failure<Unit>(DomainErrors.Encounter.NotFound(cmd.EncounterId));

        if (encounter.Status == Domain.Enums.EncounterStatus.Completed)
            return Result.Failure<Unit>(DomainErrors.Encounter.AlreadyCompleted);
        if (encounter.Status != Domain.Enums.EncounterStatus.InProgress)
            return Result.Failure<Unit>(DomainErrors.Encounter.InvalidTransition(encounter.Status.ToString(), "Completed"));

        encounter.Complete();
        _repo.Update(encounter);
        await _uow.SaveChangesAsync(ct);
        return Result.Success(Unit.Value);
    }
}
