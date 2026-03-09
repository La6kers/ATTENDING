using MediatR;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Queries.Patients;

public class GetPatientByIdHandler : IRequestHandler<GetPatientByIdQuery, Patient?>
{
    private readonly IPatientRepository _repo;
    public GetPatientByIdHandler(IPatientRepository repo) => _repo = repo;

    public async Task<Patient?> Handle(GetPatientByIdQuery request, CancellationToken ct)
        => await _repo.GetByIdAsync(request.PatientId, ct);
}

public class GetPatientByMrnHandler : IRequestHandler<GetPatientByMrnQuery, Patient?>
{
    private readonly IPatientRepository _repo;
    public GetPatientByMrnHandler(IPatientRepository repo) => _repo = repo;

    public async Task<Patient?> Handle(GetPatientByMrnQuery request, CancellationToken ct)
        => await _repo.GetByMrnAsync(request.MRN, ct);
}

public class GetPatientWithFullHistoryHandler : IRequestHandler<GetPatientWithFullHistoryQuery, Patient?>
{
    private readonly IPatientRepository _repo;
    public GetPatientWithFullHistoryHandler(IPatientRepository repo) => _repo = repo;

    public async Task<Patient?> Handle(GetPatientWithFullHistoryQuery request, CancellationToken ct)
        => await _repo.GetWithFullHistoryAsync(request.PatientId, ct);
}

public class SearchPatientsHandler : IRequestHandler<SearchPatientsQuery, (IReadOnlyList<Patient> Patients, int TotalCount)>
{
    private readonly IPatientRepository _repo;
    public SearchPatientsHandler(IPatientRepository repo) => _repo = repo;

    public async Task<(IReadOnlyList<Patient> Patients, int TotalCount)> Handle(SearchPatientsQuery request, CancellationToken ct)
    {
        var skip = (request.Page - 1) * request.PageSize;
        var patients = await _repo.SearchAsync(request.SearchTerm, skip, request.PageSize, ct);
        var totalCount = await _repo.SearchCountAsync(request.SearchTerm, ct);
        return (patients, totalCount);
    }
}
