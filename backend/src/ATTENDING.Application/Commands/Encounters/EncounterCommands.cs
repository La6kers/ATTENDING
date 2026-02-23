using MediatR;

namespace ATTENDING.Application.Commands.Encounters;

public record CreateEncounterCommand(
    Guid PatientId,
    Guid ProviderId,
    string Type,
    DateTime? ScheduledAt,
    string? ChiefComplaint) : IRequest<CreateEncounterResult>;

public record CreateEncounterResult(
    bool Success,
    Guid? EncounterId = null,
    string? EncounterNumber = null,
    string? Error = null);

public record CheckInEncounterCommand(Guid EncounterId) : IRequest<EncounterActionResult>;
public record StartEncounterCommand(Guid EncounterId, string? ChiefComplaint) : IRequest<EncounterActionResult>;
public record CompleteEncounterCommand(Guid EncounterId) : IRequest<EncounterActionResult>;

public record EncounterActionResult(bool Success, string? Error = null);
