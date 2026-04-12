using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Application.Commands.BehavioralHealth;

// ════════════════════════════════════════════════════════════════════════════
// START SCREENING HANDLER
// ════════════════════════════════════════════════════════════════════════════

public class StartScreeningHandler
    : IRequestHandler<StartScreeningCommand, Result<ScreeningStarted>>
{
    private readonly IBehavioralHealthRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<StartScreeningHandler> _logger;

    public StartScreeningHandler(
        IBehavioralHealthRepository repo,
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        ILogger<StartScreeningHandler> logger)
    {
        _repo = repo; _uow = uow; _currentUser = currentUser; _logger = logger;
    }

    public async Task<Result<ScreeningStarted>> Handle(
        StartScreeningCommand cmd, CancellationToken ct)
    {
        var orgId = _currentUser.TenantId ?? Guid.Empty;

        var screening = BehavioralHealthScreening.Create(
            cmd.PatientId,
            cmd.ProviderId,
            cmd.Instrument,
            orgId,
            cmd.EncounterId,
            cmd.AssessmentId);

        await _repo.AddAsync(screening, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Behavioral health screening started: {Instrument} for patient {PatientId}",
            cmd.Instrument, cmd.PatientId);

        return new ScreeningStarted(screening.Id, screening.Instrument);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// ADD RESPONSE HANDLER
// ════════════════════════════════════════════════════════════════════════════

public class AddScreeningResponseHandler
    : IRequestHandler<AddScreeningResponseCommand, Result<Unit>>
{
    private readonly IBehavioralHealthRepository _repo;
    private readonly IUnitOfWork _uow;

    public AddScreeningResponseHandler(IBehavioralHealthRepository repo, IUnitOfWork uow)
    {
        _repo = repo; _uow = uow;
    }

    public async Task<Result<Unit>> Handle(
        AddScreeningResponseCommand cmd, CancellationToken ct)
    {
        var screening = await _repo.GetByIdAsync(cmd.ScreeningId, ct);
        if (screening is null)
            return Result.Failure<Unit>(DomainErrors.BehavioralHealth.ScreeningNotFound(cmd.ScreeningId));

        screening.AddResponse(cmd.ItemNumber, cmd.QuestionText, cmd.ResponseValue, cmd.ResponseText);
        _repo.Update(screening);
        await _uow.SaveChangesAsync(ct);

        return Result.Success(Unit.Value);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// SCORE SCREENING HANDLER
// Validates instrument-specific item counts and delegates to scoring service.
// ════════════════════════════════════════════════════════════════════════════

public class ScoreScreeningHandler
    : IRequestHandler<ScoreScreeningCommand, Result<ScreeningScored>>
{
    private readonly IBehavioralHealthRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly BehavioralHealthScoringService _scorer;
    private readonly ILogger<ScoreScreeningHandler> _logger;

    public ScoreScreeningHandler(
        IBehavioralHealthRepository repo,
        IUnitOfWork uow,
        BehavioralHealthScoringService scorer,
        ILogger<ScoreScreeningHandler> logger)
    {
        _repo = repo; _uow = uow; _scorer = scorer; _logger = logger;
    }

    public async Task<Result<ScreeningScored>> Handle(
        ScoreScreeningCommand cmd, CancellationToken ct)
    {
        var screening = await _repo.GetWithResponsesAsync(cmd.ScreeningId, ct);
        if (screening is null)
            return Result.Failure<ScreeningScored>(
                DomainErrors.BehavioralHealth.ScreeningNotFound(cmd.ScreeningId));

        if (screening.Status == ScreeningStatus.Completed || screening.Status == ScreeningStatus.Reviewed)
            return Result.Failure<ScreeningScored>(
                DomainErrors.BehavioralHealth.AlreadyScored(cmd.ScreeningId));

        try
        {
            switch (screening.Instrument)
            {
                case ScreeningInstrument.PHQ9:
                    _scorer.ScorePhq9(screening, cmd.ItemScores);
                    break;
                case ScreeningInstrument.GAD7:
                    _scorer.ScoreGad7(screening, cmd.ItemScores);
                    break;
                case ScreeningInstrument.CSSRS:
                    if (!cmd.CssrsIdeationLevel.HasValue || !cmd.CssrsBehaviorType.HasValue)
                        return Result.Failure<ScreeningScored>(
                            DomainErrors.BehavioralHealth.CssrsRequiresEnumInputs());
                    _scorer.ScoreCssrs(screening, cmd.CssrsIdeationLevel.Value, cmd.CssrsBehaviorType.Value);
                    break;
                case ScreeningInstrument.AUDITC:
                    _scorer.ScoreAuditC(screening, cmd.ItemScores, cmd.IsFemaleOrPregnant);
                    break;
                case ScreeningInstrument.PCPTSD5:
                    _scorer.ScorePcPtsd5(screening, cmd.ItemScores);
                    break;
                default:
                    return Result.Failure<ScreeningScored>(
                        DomainErrors.BehavioralHealth.UnsupportedInstrument(screening.Instrument));
            }
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<ScreeningScored>(Error.Custom("BehavioralHealth.InvalidInput", ex.Message));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("safety plan", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<ScreeningScored>(Error.Custom("BehavioralHealth.SafetyPlanRequired", ex.Message));
        }

        if (screening.SafetyPlanJson is null
            && screening.RecommendedAction >= BehavioralHealthAction.SafetyPlanRequired)
        {
            _logger.LogWarning(
                "Screening {ScreeningId} scored with RecommendedAction={Action} — safety plan required",
                screening.Id, screening.RecommendedAction);
        }

        _repo.Update(screening);
        await _uow.SaveChangesAsync(ct);

        return new ScreeningScored(
            screening.Id,
            screening.TotalScore ?? 0,
            screening.ScoreInterpretation ?? string.Empty,
            screening.RecommendedAction,
            screening.HasSuicideRisk,
            screening.IsPartTwoProtected);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// REVIEW SCREENING HANDLER
// ════════════════════════════════════════════════════════════════════════════

public class ReviewScreeningHandler
    : IRequestHandler<ReviewScreeningCommand, Result<Unit>>
{
    private readonly IBehavioralHealthRepository _repo;
    private readonly IUnitOfWork _uow;

    public ReviewScreeningHandler(IBehavioralHealthRepository repo, IUnitOfWork uow)
    {
        _repo = repo; _uow = uow;
    }

    public async Task<Result<Unit>> Handle(ReviewScreeningCommand cmd, CancellationToken ct)
    {
        var screening = await _repo.GetByIdAsync(cmd.ScreeningId, ct);
        if (screening is null)
            return Result.Failure<Unit>(DomainErrors.BehavioralHealth.ScreeningNotFound(cmd.ScreeningId));

        if (!string.IsNullOrWhiteSpace(cmd.SafetyPlanJson))
            screening.RecordSafetyPlan(cmd.SafetyPlanJson, cmd.ProviderId.ToString());

        screening.MarkReviewed(cmd.ProviderId, cmd.ActionTaken, cmd.Notes);
        _repo.Update(screening);
        await _uow.SaveChangesAsync(ct);

        return Result.Success(Unit.Value);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// 42 CFR PART 2 CONSENT HANDLER
// ════════════════════════════════════════════════════════════════════════════

public class RecordPartTwoConsentHandler
    : IRequestHandler<RecordPartTwoConsentCommand, Result<Unit>>
{
    private readonly IBehavioralHealthRepository _repo;
    private readonly IUnitOfWork _uow;

    public RecordPartTwoConsentHandler(IBehavioralHealthRepository repo, IUnitOfWork uow)
    {
        _repo = repo; _uow = uow;
    }

    public async Task<Result<Unit>> Handle(RecordPartTwoConsentCommand cmd, CancellationToken ct)
    {
        var screening = await _repo.GetByIdAsync(cmd.ScreeningId, ct);
        if (screening is null)
            return Result.Failure<Unit>(DomainErrors.BehavioralHealth.ScreeningNotFound(cmd.ScreeningId));

        screening.RecordPartTwoConsent(cmd.ConsentGiven, cmd.CapturedBy);
        _repo.Update(screening);
        await _uow.SaveChangesAsync(ct);

        return Result.Success(Unit.Value);
    }
}
