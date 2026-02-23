using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Commands.Patients;

public class CreatePatientHandler : IRequestHandler<CreatePatientCommand, CreatePatientResult>
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

    public async Task<CreatePatientResult> Handle(CreatePatientCommand cmd, CancellationToken ct)
    {
        var existing = await _repo.GetByMrnAsync(cmd.MRN, ct);
        if (existing != null)
            return new CreatePatientResult(false, Error: $"Patient with MRN {cmd.MRN} already exists");

        var patient = Patient.Create(cmd.MRN, cmd.FirstName, cmd.LastName, cmd.DateOfBirth, cmd.Sex);
        await _repo.AddAsync(patient, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Patient created: {MRN} {Name}", patient.MRN, patient.FullName);
        return new CreatePatientResult(true, patient.Id, patient.MRN);
    }
}

public class AddAllergyHandler : IRequestHandler<AddAllergyCommand, AddAllergyResult>
{
    private readonly IPatientRepository _repo;
    private readonly IUnitOfWork _uow;

    public AddAllergyHandler(IPatientRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<AddAllergyResult> Handle(AddAllergyCommand cmd, CancellationToken ct)
    {
        var patient = await _repo.GetWithAllergiesAsync(cmd.PatientId, ct);
        if (patient == null)
            return new AddAllergyResult(false, Error: "Patient not found");

        var allergy = Allergy.Create(cmd.PatientId, cmd.Allergen, cmd.Severity, cmd.Reaction);
        patient.Allergies.Add(allergy);
        await _uow.SaveChangesAsync(ct);

        return new AddAllergyResult(true, allergy.Id);
    }
}

public class AddConditionHandler : IRequestHandler<AddConditionCommand, AddConditionResult>
{
    private readonly IPatientRepository _repo;
    private readonly IUnitOfWork _uow;

    public AddConditionHandler(IPatientRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<AddConditionResult> Handle(AddConditionCommand cmd, CancellationToken ct)
    {
        var patient = await _repo.GetWithConditionsAsync(cmd.PatientId, ct);
        if (patient == null)
            return new AddConditionResult(false, Error: "Patient not found");

        var condition = MedicalCondition.Create(cmd.PatientId, cmd.Code, cmd.Name, cmd.OnsetDate);
        patient.Conditions.Add(condition);
        await _uow.SaveChangesAsync(ct);

        return new AddConditionResult(true, condition.Id);
    }
}
