using MediatR;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Queries.Encounters;

public record GetEncounterByIdQuery(Guid EncounterId) : IRequest<Encounter?>;
public record GetEncountersByPatientQuery(Guid PatientId) : IRequest<IReadOnlyList<Encounter>>;
public record GetEncountersByProviderQuery(Guid ProviderId) : IRequest<IReadOnlyList<Encounter>>;
public record GetTodaysScheduleQuery(Guid ProviderId) : IRequest<IReadOnlyList<Encounter>>;
public record GetEncountersByStatusQuery(EncounterStatus Status) : IRequest<IReadOnlyList<Encounter>>;
