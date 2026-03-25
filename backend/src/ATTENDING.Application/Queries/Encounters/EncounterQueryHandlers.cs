using MediatR;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Queries.Encounters;

public class GetEncounterByIdHandler : IRequestHandler<GetEncounterByIdQuery, Encounter?>
{
    private readonly IEncounterRepository _repo;
    public GetEncounterByIdHandler(IEncounterRepository repo) => _repo = repo;

    public async Task<Encounter?> Handle(GetEncounterByIdQuery request, CancellationToken ct)
        => await _repo.GetWithOrdersAsync(request.EncounterId, ct);
}

public class GetEncountersByPatientHandler : IRequestHandler<GetEncountersByPatientQuery, IReadOnlyList<Encounter>>
{
    private readonly IEncounterRepository _repo;
    public GetEncountersByPatientHandler(IEncounterRepository repo) => _repo = repo;

    public async Task<IReadOnlyList<Encounter>> Handle(GetEncountersByPatientQuery request, CancellationToken ct)
        => await _repo.GetByPatientIdAsync(request.PatientId, ct);
}

public class GetEncountersByProviderHandler : IRequestHandler<GetEncountersByProviderQuery, IReadOnlyList<Encounter>>
{
    private readonly IEncounterRepository _repo;
    public GetEncountersByProviderHandler(IEncounterRepository repo) => _repo = repo;

    public async Task<IReadOnlyList<Encounter>> Handle(GetEncountersByProviderQuery request, CancellationToken ct)
        => await _repo.GetByProviderIdAsync(request.ProviderId, ct);
}

public class GetTodaysScheduleHandler : IRequestHandler<GetTodaysScheduleQuery, IReadOnlyList<Encounter>>
{
    private readonly IEncounterRepository _repo;
    public GetTodaysScheduleHandler(IEncounterRepository repo) => _repo = repo;

    public async Task<IReadOnlyList<Encounter>> Handle(GetTodaysScheduleQuery request, CancellationToken ct)
        => await _repo.GetTodaysEncountersAsync(request.ProviderId, ct);
}

public class GetEncountersByStatusHandler : IRequestHandler<GetEncountersByStatusQuery, IReadOnlyList<Encounter>>
{
    private readonly IEncounterRepository _repo;
    public GetEncountersByStatusHandler(IEncounterRepository repo) => _repo = repo;

    public async Task<IReadOnlyList<Encounter>> Handle(GetEncountersByStatusQuery request, CancellationToken ct)
        => await _repo.GetByStatusAsync(request.Status, ct);
}
