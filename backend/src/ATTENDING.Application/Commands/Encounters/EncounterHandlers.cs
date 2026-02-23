using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Commands.Encounters;

public class CreateEncounterHandler : IRequestHandler<CreateEncounterCommand, CreateEncounterResult>
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

    public async Task<CreateEncounterResult> Handle(CreateEncounterCommand cmd, CancellationToken ct)
    {
        var patient = await _patientRepo.GetByIdAsync(cmd.PatientId, ct);
        if (patient == null)
            return new CreateEncounterResult(false, Error: "Patient not found");

        var encounter = Encounter.Create(cmd.PatientId, cmd.ProviderId, cmd.Type, cmd.ScheduledAt);
        if (cmd.ChiefComplaint != null)
            encounter.Start(cmd.ChiefComplaint);

        await _repo.AddAsync(encounter, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Encounter created: {Number} for Patient {PatientId}",
            encounter.EncounterNumber, cmd.PatientId);
        return new CreateEncounterResult(true, encounter.Id, encounter.EncounterNumber);
    }
}

public class CheckInEncounterHandler : IRequestHandler<CheckInEncounterCommand, EncounterActionResult>
{
    private readonly IEncounterRepository _repo;
    private readonly IUnitOfWork _uow;

    public CheckInEncounterHandler(IEncounterRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<EncounterActionResult> Handle(CheckInEncounterCommand cmd, CancellationToken ct)
    {
        var encounter = await _repo.GetByIdAsync(cmd.EncounterId, ct);
        if (encounter == null) return new EncounterActionResult(false, "Encounter not found");

        encounter.CheckIn();
        _repo.Update(encounter);
        await _uow.SaveChangesAsync(ct);
        return new EncounterActionResult(true);
    }
}

public class StartEncounterHandler : IRequestHandler<StartEncounterCommand, EncounterActionResult>
{
    private readonly IEncounterRepository _repo;
    private readonly IUnitOfWork _uow;

    public StartEncounterHandler(IEncounterRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<EncounterActionResult> Handle(StartEncounterCommand cmd, CancellationToken ct)
    {
        var encounter = await _repo.GetByIdAsync(cmd.EncounterId, ct);
        if (encounter == null) return new EncounterActionResult(false, "Encounter not found");

        encounter.Start(cmd.ChiefComplaint);
        _repo.Update(encounter);
        await _uow.SaveChangesAsync(ct);
        return new EncounterActionResult(true);
    }
}

public class CompleteEncounterHandler : IRequestHandler<CompleteEncounterCommand, EncounterActionResult>
{
    private readonly IEncounterRepository _repo;
    private readonly IUnitOfWork _uow;

    public CompleteEncounterHandler(IEncounterRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<EncounterActionResult> Handle(CompleteEncounterCommand cmd, CancellationToken ct)
    {
        var encounter = await _repo.GetByIdAsync(cmd.EncounterId, ct);
        if (encounter == null) return new EncounterActionResult(false, "Encounter not found");

        encounter.Complete();
        _repo.Update(encounter);
        await _uow.SaveChangesAsync(ct);
        return new EncounterActionResult(true);
    }
}
