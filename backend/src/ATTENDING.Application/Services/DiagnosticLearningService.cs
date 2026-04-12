using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Services;

// ═══════════════════════════════════════════════════════════════════════════
// ML DIAGNOSTIC LEARNING ENGINE — Application Service  (d5)
//
// Processes DiagnosticOutcome records into LearningSignals, computes
// rolling accuracy snapshots, and surfaces calibration adjustments that
// nudge the DiagnosticReasoningService's pre-test probabilities toward
// this organization's real-world disease prevalence.
//
// Integration with d3 (DiagnosticReasoningService):
//   Call GetCalibrationAdjustmentAsync(guidelineName) before applying
//   pre-test probability, then multiply:
//     adjustedPreTest = literaturePreTest * factor
//
// Scheduled execution:
//   ClinicalSchedulerService runs ProcessUnprocessedOutcomesAsync() nightly
//   and RefreshAccuracySnapshotsAsync() weekly.
// ═══════════════════════════════════════════════════════════════════════════

public class DiagnosticLearningService
{
    private readonly IDiagnosticLearningRepository _repo;
    private readonly IAiFeedbackRepository _feedbackRepo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<DiagnosticLearningService> _logger;

    /// <summary>
    /// Supported recommendation types — matches AiFeedback.RecommendationType values.
    /// </summary>
    public static readonly IReadOnlyList<string> SupportedTypes = new[]
    {
        "Differential", "LabRecommendation", "ImagingRecommendation",
        "TreatmentRecommendation", "Triage", "SOAPNote"
    };

    public DiagnosticLearningService(
        IDiagnosticLearningRepository repo,
        IAiFeedbackRepository feedbackRepo,
        IUnitOfWork uow,
        ILogger<DiagnosticLearningService> logger)
    {
        _repo = repo;
        _feedbackRepo = feedbackRepo;
        _uow = uow;
        _logger = logger;
    }

    // ── 1. Outcome processing ──────────────────────────────────────────────

    /// <summary>
    /// Process a batch of unprocessed DiagnosticOutcome records into LearningSignals.
    /// Called nightly by the scheduler.
    /// </summary>
    public async Task<int> ProcessUnprocessedOutcomesAsync(CancellationToken ct = default)
    {
        var outcomes = await _repo.GetUnprocessedOutcomesAsync(batchSize: 100, ct);
        if (outcomes.Count == 0) return 0;

        int processed = 0;

        foreach (var outcome in outcomes)
        {
            try
            {
                // Enrich with provider accuracy score from AiFeedback if available
                int? providerScore = null;
                if (outcome.AiFeedbackId.HasValue)
                {
                    var feedback = await _feedbackRepo.GetByIdAsync(outcome.AiFeedbackId.Value, ct);
                    providerScore = feedback?.AccuracyScore;
                }

                var signal = LearningSignal.CreateFromOutcome(outcome, outcome.OrganizationId, providerScore);
                await _repo.AddSignalAsync(signal, ct);

                outcome.MarkProcessed();
                await _uow.SaveChangesAsync(ct);

                processed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to process DiagnosticOutcome {OutcomeId} into LearningSignal",
                    outcome.Id);
                // Continue processing remaining outcomes
            }
        }

        _logger.LogInformation(
            "Diagnostic learning: processed {Count}/{Total} outcomes into learning signals",
            processed, outcomes.Count);

        return processed;
    }

    // ── 2. Accuracy snapshot computation ──────────────────────────────────

    /// <summary>
    /// Refresh accuracy snapshots for all supported recommendation types.
    /// Uses a rolling 90-day window. Called weekly by the scheduler.
    /// </summary>
    public async Task RefreshAccuracySnapshotsAsync(int windowDays = 90, CancellationToken ct = default)
    {
        var windowEnd = DateTime.UtcNow;
        var windowStart = windowEnd.AddDays(-windowDays);

        // Get all unique guideline names from recent signals
        var guidelineTypes = GetGuidelineTypes();

        foreach (var (recType, guidelineName) in guidelineTypes)
        {
            try
            {
                var signals = await _repo.GetSignalsAsync(
                    recType, guidelineName, windowStart, windowEnd, ct);

                if (signals.Count == 0) continue;

                var snapshot = DiagnosticAccuracySnapshot.Compute(
                    organizationId: signals.First().OrganizationId,
                    recommendationType: recType,
                    guidelineName: guidelineName,
                    windowStart: windowStart,
                    windowEnd: windowEnd,
                    signals: signals);

                await _repo.AddSnapshotAsync(snapshot, ct);
                await _uow.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Accuracy snapshot computed: {RecType}/{Guideline} — " +
                    "n={N}, Sensitivity={Sensitivity:P0}, Calibration={Factor}",
                    recType, guidelineName ?? "all",
                    snapshot.TotalCases, snapshot.Sensitivity,
                    snapshot.CalibrationAdjustmentFactor?.ToString("F3") ?? "n/a (< 30 cases)");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to compute accuracy snapshot for {RecType}/{Guideline}",
                    recType, guidelineName);
            }
        }
    }

    // ── 3. Calibration adjustment (feeds back into DiagnosticReasoningService) ──

    /// <summary>
    /// Get the calibration adjustment factor for a specific guideline.
    /// Returns null if no reliable data (n < 30), meaning use literature values.
    ///
    /// DiagnosticReasoningService should call this and multiply:
    ///   adjustedPreTest = literaturePreTest * factor
    /// </summary>
    public async Task<decimal?> GetCalibrationAdjustmentAsync(
        string guidelineName, CancellationToken ct = default)
    {
        return await _repo.GetCalibrationAdjustmentAsync(guidelineName, ct);
    }

    /// <summary>
    /// Get a full accuracy report for the provider dashboard.
    /// Returns the latest snapshot for every tracked recommendation type.
    /// </summary>
    public async Task<AccuracyReport> GetAccuracyReportAsync(CancellationToken ct = default)
    {
        var snapshots = await _repo.GetAllLatestSnapshotsAsync(ct);

        var items = snapshots.Select(s => new AccuracyReportItem
        {
            RecommendationType = s.RecommendationType,
            GuidelineName = s.GuidelineName,
            TotalCases = s.TotalCases,
            Sensitivity = s.Sensitivity,
            Precision = s.Precision,
            AcceptanceRate = s.AcceptanceRate,
            AveragePredictedProbability = s.AveragePredictedProbability,
            ActualOutcomeRate = s.ActualOutcomeRate,
            CalibrationAdjustmentFactor = s.CalibrationAdjustmentFactor,
            IsReliable = s.IsReliable,
            WindowStart = s.WindowStart,
            WindowEnd = s.WindowEnd,
            CalibrationStatus = GetCalibrationStatus(s),
        }).ToList();

        return new AccuracyReport
        {
            GeneratedAt = DateTime.UtcNow,
            Items = items,
            OverallAcceptanceRate = items.Count > 0
                ? Math.Round(items.Average(i => i.AcceptanceRate), 3)
                : 0m,
            WellCalibratedCount = items.Count(i => i.CalibrationStatus == CalibrationStatus.WellCalibrated),
            OverestimatingCount = items.Count(i => i.CalibrationStatus == CalibrationStatus.Overestimating),
            UnderestimatingCount = items.Count(i => i.CalibrationStatus == CalibrationStatus.Underestimating),
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static CalibrationStatus GetCalibrationStatus(DiagnosticAccuracySnapshot s)
    {
        if (!s.IsReliable || !s.CalibrationAdjustmentFactor.HasValue)
            return CalibrationStatus.InsufficientData;

        var factor = s.CalibrationAdjustmentFactor.Value;
        return factor switch
        {
            >= 0.85m and <= 1.15m => CalibrationStatus.WellCalibrated,  // within 15%
            > 1.15m => CalibrationStatus.Underestimating,               // AI underestimates risk
            _ => CalibrationStatus.Overestimating,                      // AI overestimates risk
        };
    }

    /// <summary>
    /// All (recommendationType, guidelineName) pairs to compute snapshots for.
    /// Guideline-specific snapshots are the most actionable.
    /// </summary>
    private static IReadOnlyList<(string RecType, string? GuidelineName)> GetGuidelineTypes() =>
        new (string, string?)[]
        {
            // Guideline-specific
            ("Differential", "Wells PE"),
            ("Differential", "HEART Score"),
            ("Differential", "qSOFA"),
            ("Differential", "CURB-65"),
            ("Differential", "Ottawa Ankle Rules"),
            // Rollup by type
            ("Differential", null),
            ("LabRecommendation", null),
            ("ImagingRecommendation", null),
            ("Triage", null),
            ("SOAPNote", null),
        };
}

// ── Result types ──────────────────────────────────────────────────────────

public class AccuracyReport
{
    public DateTime GeneratedAt { get; init; }
    public IReadOnlyList<AccuracyReportItem> Items { get; init; } = Array.Empty<AccuracyReportItem>();
    public decimal OverallAcceptanceRate { get; init; }
    public int WellCalibratedCount { get; init; }
    public int OverestimatingCount { get; init; }
    public int UnderestimatingCount { get; init; }
}

public class AccuracyReportItem
{
    public string RecommendationType { get; init; } = string.Empty;
    public string? GuidelineName { get; init; }
    public int TotalCases { get; init; }
    public decimal Sensitivity { get; init; }
    public decimal Precision { get; init; }
    public decimal AcceptanceRate { get; init; }
    public decimal AveragePredictedProbability { get; init; }
    public decimal ActualOutcomeRate { get; init; }
    public decimal? CalibrationAdjustmentFactor { get; init; }
    public bool IsReliable { get; init; }
    public DateTime WindowStart { get; init; }
    public DateTime WindowEnd { get; init; }
    public CalibrationStatus CalibrationStatus { get; init; }
}

public enum CalibrationStatus
{
    InsufficientData,
    WellCalibrated,
    Overestimating,
    Underestimating
}
