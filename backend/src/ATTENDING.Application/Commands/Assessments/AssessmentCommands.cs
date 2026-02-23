using MediatR;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Commands.Assessments;

public record StartAssessmentCommand(
    Guid PatientId,
    string ChiefComplaint
) : IRequest<Result<AssessmentStarted>>;

public record AssessmentStarted(
    Guid AssessmentId,
    string AssessmentNumber,
    bool IsEmergency,
    string? EmergencyReason,
    bool HasRedFlags);

public record SubmitAssessmentResponseCommand(
    Guid AssessmentId,
    string Question,
    string Response
) : IRequest<Result<AssessmentResponseSubmitted>>;

public record AssessmentResponseSubmitted(
    bool HasNewRedFlags,
    bool IsEmergency,
    string? EmergencyReason);

public record AdvanceAssessmentPhaseCommand(
    Guid AssessmentId,
    AssessmentPhase NewPhase,
    Dictionary<string, string>? Data = null
) : IRequest<Result<Unit>>;

public record CompleteAssessmentCommand(
    Guid AssessmentId,
    TriageLevel TriageLevel,
    string? Summary = null
) : IRequest<Result<Unit>>;

public record ReviewAssessmentCommand(
    Guid AssessmentId,
    Guid ProviderId,
    string? Notes = null
) : IRequest<Result<Unit>>;
