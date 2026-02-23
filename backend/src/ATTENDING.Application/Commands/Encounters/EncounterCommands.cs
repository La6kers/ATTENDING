using MediatR;
using ATTENDING.Domain.Common;

namespace ATTENDING.Application.Commands.Encounters;

public record CreateEncounterCommand(
    Guid PatientId,
    Guid ProviderId,
    string Type,
    DateTime? ScheduledAt,
    string? ChiefComplaint) : IRequest<Result<EncounterCreated>>;

public record EncounterCreated(Guid EncounterId, string EncounterNumber);

public record CheckInEncounterCommand(Guid EncounterId) : IRequest<Result<Unit>>;
public record StartEncounterCommand(Guid EncounterId, string? ChiefComplaint) : IRequest<Result<Unit>>;
public record CompleteEncounterCommand(Guid EncounterId) : IRequest<Result<Unit>>;
