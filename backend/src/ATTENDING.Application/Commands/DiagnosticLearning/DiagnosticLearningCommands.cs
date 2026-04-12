using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Services;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Commands.DiagnosticLearning;

// ═══════════════════════════════════════════════════════════════════════════
// ML DIAGNOSTIC LEARNING ENGINE — Commands + Queries  (d5)
// ═══════════════════════════════════════════════════════════════════════════

// ── Record Outcome (provider closes the loop) ─────────────────────────────

/// <summary>
/// Provider records the final diagnosis after an encounter.
/// This is the ground truth that the ML engine learns from.
///
/// Called automatically when:
///   • Provider signs an ambient SOAP note (AmbientNote.Sign → triggers this)
///   • Provider manually records outcome via dashboard
/// </summary>
public record RecordDiagnosticOutcomeCommand(
    Guid EncounterId,
    Guid PatientId,
    Guid ProviderId,
    Guid OrganizationId,
    string RecommendationType,
    string ConfirmedDiagnosis,
    string? ConfirmedIcd10Code,
    string? AiSuggestedDiagnosis,
    decimal? AiPreTestProbability,
    string? GuidelineName,
    bool AiWasCorrect,
    bool ProviderOverrode,
    string? ConfirmingTestResult = null,
    string? ConfirmingTestLoincCode = null,
    Guid? AiFeedbackId = null
) : IRequest<Result<Guid>>;

public class RecordDiagnosticOutcomeValidator : AbstractValidator<RecordDiagnosticOutcomeCommand>
{
    public RecordDiagnosticOutcomeValidator()
    {
        RuleFor(x => x.EncounterId).NotEmpty();
        RuleFor(x => x.PatientId).NotEmpty();
        RuleFor(x => x.ProviderId).NotEmpty();
        RuleFor(x => x.RecommendationType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.ConfirmedDiagnosis).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ConfirmedIcd10Code).MaximumLength(20);
        RuleFor(x => x.AiPreTestProbability)
            .InclusiveBetween(0m, 1m).When(x => x.AiPreTestProbability.HasValue);
        RuleFor(x => x.ConfirmingTestResult).MaximumLength(500);
    }
}

public class RecordDiagnosticOutcomeHandler
    : IRequestHandler<RecordDiagnosticOutcomeCommand, Result<Guid>>
{
    private readonly IDiagnosticLearningRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<RecordDiagnosticOutcomeHandler> _logger;

    public RecordDiagnosticOutcomeHandler(
        IDiagnosticLearningRepository repo,
        IUnitOfWork uow,
        ILogger<RecordDiagnosticOutcomeHandler> logger)
    {
        _repo = repo;
        _uow = uow;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(
        RecordDiagnosticOutcomeCommand cmd, CancellationToken ct)
    {
        // Prevent duplicate outcomes for the same encounter + recommendation type
        var existing = await _repo.GetOutcomeByEncounterAsync(
            cmd.EncounterId, cmd.RecommendationType, ct);

        if (existing != null)
            return Result.Success(existing.Id); // idempotent

        var outcome = DiagnosticOutcome.Create(
            cmd.EncounterId,
            cmd.PatientId,
            cmd.ProviderId,
            cmd.OrganizationId,
            cmd.RecommendationType,
            cmd.ConfirmedDiagnosis,
            cmd.ConfirmedIcd10Code,
            cmd.AiSuggestedDiagnosis,
            cmd.AiPreTestProbability,
            cmd.GuidelineName,
            cmd.AiWasCorrect,
            cmd.ProviderOverrode,
            cmd.ConfirmingTestResult,
            cmd.ConfirmingTestLoincCode,
            cmd.AiFeedbackId);

        await _repo.AddOutcomeAsync(outcome, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Diagnostic outcome recorded: Encounter {EncounterId}, Type {Type}, " +
            "AI correct: {Correct}, Override: {Override}",
            cmd.EncounterId, cmd.RecommendationType, cmd.AiWasCorrect, cmd.ProviderOverrode);

        return Result.Success(outcome.Id);
    }
}

// ── Get Accuracy Report (dashboard query) ────────────────────────────────

public record GetAccuracyReportQuery : IRequest<AccuracyReport>;

public class GetAccuracyReportHandler : IRequestHandler<GetAccuracyReportQuery, AccuracyReport>
{
    private readonly DiagnosticLearningService _learningService;

    public GetAccuracyReportHandler(DiagnosticLearningService learningService)
    {
        _learningService = learningService;
    }

    public Task<AccuracyReport> Handle(GetAccuracyReportQuery request, CancellationToken ct)
        => _learningService.GetAccuracyReportAsync(ct);
}

// ── Get Calibration Adjustment (used by DiagnosticReasoningService) ───────

public record GetCalibrationAdjustmentQuery(string GuidelineName)
    : IRequest<decimal?>;

public class GetCalibrationAdjustmentHandler
    : IRequestHandler<GetCalibrationAdjustmentQuery, decimal?>
{
    private readonly DiagnosticLearningService _learningService;

    public GetCalibrationAdjustmentHandler(DiagnosticLearningService learningService)
    {
        _learningService = learningService;
    }

    public Task<decimal?> Handle(GetCalibrationAdjustmentQuery request, CancellationToken ct)
        => _learningService.GetCalibrationAdjustmentAsync(request.GuidelineName, ct);
}

// ── Trigger snapshot refresh manually (admin endpoint) ───────────────────

public record RefreshAccuracySnapshotsCommand(int WindowDays = 90)
    : IRequest<Result<int>>;

public class RefreshAccuracySnapshotsHandler
    : IRequestHandler<RefreshAccuracySnapshotsCommand, Result<int>>
{
    private readonly DiagnosticLearningService _learningService;

    public RefreshAccuracySnapshotsHandler(DiagnosticLearningService learningService)
    {
        _learningService = learningService;
    }

    public async Task<Result<int>> Handle(
        RefreshAccuracySnapshotsCommand cmd, CancellationToken ct)
    {
        await _learningService.RefreshAccuracySnapshotsAsync(cmd.WindowDays, ct);
        var processed = await _learningService.ProcessUnprocessedOutcomesAsync(ct);
        return Result.Success(processed);
    }
}
