using MediatR;
using ATTENDING.Domain.Entities;

namespace ATTENDING.Application.Queries.Patients;

public record GetPatientByIdQuery(Guid PatientId) : IRequest<Patient?>;
public record GetPatientByMrnQuery(string MRN) : IRequest<Patient?>;
public record GetPatientWithFullHistoryQuery(Guid PatientId) : IRequest<Patient?>;
public record SearchPatientsQuery(string? SearchTerm, int Page = 1, int PageSize = 20)
    : IRequest<(IReadOnlyList<Patient> Patients, int TotalCount)>;
