using MediatR;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Commands.BehavioralHealth;

// ── Commands ──────────────────────────────────────────────────────────────

public record StartScreeningCommand(
    Guid PatientId,
    Guid ProviderId,
    ScreeningInstrument Instrument,
    Guid? EncounterId,
    Guid? AssessmentId)
    : IRequest<Result<ScreeningStarted>>;

public record AddScreeningResponseCommand(
    Guid ScreeningId,
    int ItemNumber,
    string QuestionText,
    int ResponseValue,
    string ResponseText)
    : IRequest<Result<Unit>>;

public record ScoreScreeningCommand(
    Guid ScreeningId,
    int[] ItemScores,
    SuicideIdeationLevel? CssrsIdeationLevel = null,
    SuicideBehaviorType? CssrsBehaviorType = null,
    bool IsFemaleOrPregnant = false)
    : IRequest<Result<ScreeningScored>>;

public record ReviewScreeningCommand(
    Guid ScreeningId,
    Guid ProviderId,
    BehavioralHealthAction ActionTaken,
    string? Notes,
    string? SafetyPlanJson)
    : IRequest<Result<Unit>>;

public record RecordPartTwoConsentCommand(
    Guid ScreeningId,
    bool ConsentGiven,
    string CapturedBy)
    : IRequest<Result<Unit>>;

// ── Result DTOs ───────────────────────────────────────────────────────────

public record ScreeningStarted(Guid ScreeningId, ScreeningInstrument Instrument);

public record ScreeningScored(
    Guid ScreeningId,
    int TotalScore,
    string ScoreInterpretation,
    BehavioralHealthAction RecommendedAction,
    bool HasSuicideRisk,
    bool IsPartTwoProtected);
