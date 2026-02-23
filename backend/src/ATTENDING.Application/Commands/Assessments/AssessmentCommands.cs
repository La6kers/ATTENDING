using MediatR;
using ATTENDING.Application.DTOs;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Commands.Assessments;

public record StartAssessmentCommand(
    Guid PatientId,
    string ChiefComplaint
) : IRequest<StartAssessmentResult>;

public record StartAssessmentResult(
    bool Success,
    Guid? AssessmentId,
    string? AssessmentNumber,
    bool IsEmergency,
    string? EmergencyReason,
    bool HasRedFlags,
    string? Error);

public record SubmitAssessmentResponseCommand(
    Guid AssessmentId,
    string Question,
    string Response
) : IRequest<SubmitAssessmentResponseResult>;

public record SubmitAssessmentResponseResult(
    bool Success,
    bool HasNewRedFlags,
    bool IsEmergency,
    string? EmergencyReason,
    string? Error);

public record AdvanceAssessmentPhaseCommand(
    Guid AssessmentId,
    AssessmentPhase NewPhase,
    Dictionary<string, string>? Data = null
) : IRequest<AdvanceAssessmentPhaseResult>;

public record AdvanceAssessmentPhaseResult(
    bool Success,
    string? Error);

public record CompleteAssessmentCommand(
    Guid AssessmentId,
    TriageLevel TriageLevel,
    string? Summary = null
) : IRequest<CompleteAssessmentResult>;

public record CompleteAssessmentResult(
    bool Success,
    string? Error);

public record ReviewAssessmentCommand(
    Guid AssessmentId,
    Guid ProviderId,
    string? Notes = null
) : IRequest<ReviewAssessmentResult>;

public record ReviewAssessmentResult(
    bool Success,
    string? Error);
