using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Commands.Patients;

public class CreatePatientHandler : IRequestHandler<CreatePatientCommand, Result<PatientCreated>>
{
    private readonly IPatientRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<CreatePatientHandler> _logger;

    public CreatePatientHandler(IPatientRepository repo, IUnitOfWork uow, ILogger<CreatePatientHandler> logger)
    {
        _repo = repo;
        _uow = uow;
        _logger = logger;
    }

    public async Task<Result<PatientCreated>> Handle(CreatePatientCommand cmd, CancellationToken ct)
    {
        var existing = await _repo.GetByMrnAsync(cmd.MRN, ct);
        if (existing != null)
            return Result.Failure<PatientCreated>(DomainErrors.Patient.DuplicateMrn(cmd.MRN));

        var patient = Patient.Create(cmd.MRN, cmd.FirstName, cmd.LastName, cmd.DateOfBirth, cmd.Sex);
        await _repo.AddAsync(patient, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Patient created: {MRN} {Name}", patient.MRN, patient.FullName);
        return new PatientCreated(patient.Id, patient.MRN);
    }
}

public class AddAllergyHandler : IRequestHandler<AddAllergyCommand, Result<AllergyAdded>>
{
    private readonly IPatientRepository _repo;
    private readonly IUnitOfWork _uow;

    public AddAllergyHandler(IPatientRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<Result<AllergyAdded>> Handle(AddAllergyCommand cmd, CancellationToken ct)
    {
        var patient = await _repo.GetWithAllergiesAsync(cmd.PatientId, ct);
        if (patient == null)
            return Result.Failure<AllergyAdded>(DomainErrors.Patient.NotFound(cmd.PatientId));

        var allergy = Allergy.Create(cmd.PatientId, cmd.Allergen, cmd.Severity, cmd.Reaction);
        patient.Allergies.Add(allergy);
        await _uow.SaveChangesAsync(ct);

        return new AllergyAdded(allergy.Id);
    }
}

public class AddConditionHandler : IRequestHandler<AddConditionCommand, Result<ConditionAdded>>
{
    private readonly IPatientRepository _repo;
    private readonly IUnitOfWork _uow;

    public AddConditionHandler(IPatientRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<Result<ConditionAdded>> Handle(AddConditionCommand cmd, CancellationToken ct)
    {
        var patient = await _repo.GetWithConditionsAsync(cmd.PatientId, ct);
        if (patient == null)
            return Result.Failure<ConditionAdded>(DomainErrors.Patient.NotFound(cmd.PatientId));

        var condition = MedicalCondition.Create(cmd.PatientId, cmd.Code, cmd.Name, cmd.OnsetDate);
        patient.Conditions.Add(condition);
        await _uow.SaveChangesAsync(ct);

        return new ConditionAdded(condition.Id);
    }
}
