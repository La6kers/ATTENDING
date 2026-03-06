using ATTENDING.Domain.Entities;

namespace ATTENDING.Domain.Entities;

// ═══════════════════════════════════════════════════════════════════════════
// ML DIAGNOSTIC LEARNING ENGINE — Domain Entities  (d5)
//
// Clinical value: the AI's pre-test probabilities are sourced from published
// literature (e.g., Wells PE High Risk = 49%). But in a rural critical access
// hospital serving an older, sicker population, that real-world rate might be
// 60%. This engine measures the gap and feeds org-specific calibration
// adjustments back into the diagnostic pipeline.
//
// Design principles:
//   • PHI is stripped at the LearningSignal stage — aggregated records contain
//     no patient identifiers, only clinical pattern features
//   • Providers are never penalized for overriding AI — every override is a
//     legitimate training signal, not a compliance flag
//   • Calibration adjustments are suggestions, not overrides — the physician
//     always makes the final call
//   • Minimum sample sizes prevent noisy adjustments (n < 30 → no adjustment)
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Records what actually happened after a diagnostic episode.
///
/// Created by the provider when they close an encounter or sign a note.
/// Links backward to the AiFeedback record that captured their real-time rating,
/// and forward to LearningSignal once processed.
///
/// No PHI after processing — patient and encounter IDs are only here for
/// the enrichment join; they are never written to LearningSignal.
/// </summary>
public class DiagnosticOutcome : BaseEntity
{
    public Guid Id { get; private set; }

    /// <summary>Links to the AiFeedback record from this encounter</summary>
    public Guid? AiFeedbackId { get; private set; }

    /// <summary>Encounter context — used only for enrichment, never aggregated</summary>
    public Guid EncounterId { get; private set; }
    public Guid PatientId { get; private set; }
    public Guid ProviderId { get; private set; }

    /// <summary>Recommendation type this outcome relates to</summary>
    public string RecommendationType { get; private set; } = string.Empty;

    /// <summary>
    /// The AI's top suggested diagnosis (ICD-10 or name).
    /// Copied from the original recommendation at outcome-record time.
    /// </summary>
    public string? AiSuggestedDiagnosis { get; private set; }

    /// <summary>
    /// Pre-test probability the AI assigned (0.0–1.0).
    /// Copied from DiagnosticReasoningService output.
    /// </summary>
    public decimal? AiPreTestProbability { get; private set; }

    /// <summary>The guideline that drove this recommendation (e.g., "Wells PE")</summary>
    public string? GuidelineName { get; private set; }

    /// <summary>The final confirmed diagnosis — what actually happened</summary>
    public string? ConfirmedDiagnosis { get; private set; }

    /// <summary>ICD-10 of the final confirmed diagnosis</summary>
    public string? ConfirmedIcd10Code { get; private set; }

    /// <summary>Did the final diagnosis match the AI's top suggestion?</summary>
    public bool AiWasCorrect { get; private set; }

    /// <summary>
    /// Did the provider override the AI's top suggestion?
    /// True = provider picked a different diagnosis than the AI's #1.
    /// </summary>
    public bool ProviderOverrode { get; private set; }

    /// <summary>
    /// Key discriminating test result that confirmed or excluded the AI suggestion.
    /// E.g., "CTPA positive for PE", "Troponin negative x2"
    /// This is clinical metadata, not PHI.
    /// </summary>
    public string? ConfirmingTestResult { get; private set; }

    /// <summary>LOINC code of the confirming test (for aggregation)</summary>
    public string? ConfirmingTestLoincCode { get; private set; }

    /// <summary>Whether the LearningSignal has been generated from this outcome</summary>
    public bool IsProcessed { get; private set; }

    public DateTime? ProcessedAt { get; private set; }

    private DiagnosticOutcome() { }

    public static DiagnosticOutcome Create(
        Guid encounterId,
        Guid patientId,
        Guid providerId,
        Guid organizationId,
        string recommendationType,
        string confirmedDiagnosis,
        string? confirmedIcd10Code,
        string? aiSuggestedDiagnosis,
        decimal? aiPreTestProbability,
        string? guidelineName,
        bool aiWasCorrect,
        bool providerOverrode,
        string? confirmingTestResult = null,
        string? confirmingTestLoincCode = null,
        Guid? aiFeedbackId = null)
    {
        var outcome = new DiagnosticOutcome
        {
            Id = Guid.NewGuid(),
            EncounterId = encounterId,
            PatientId = patientId,
            ProviderId = providerId,
            RecommendationType = recommendationType,
            ConfirmedDiagnosis = confirmedDiagnosis,
            ConfirmedIcd10Code = confirmedIcd10Code,
            AiSuggestedDiagnosis = aiSuggestedDiagnosis,
            AiPreTestProbability = aiPreTestProbability,
            GuidelineName = guidelineName,
            AiWasCorrect = aiWasCorrect,
            ProviderOverrode = providerOverrode,
            ConfirmingTestResult = confirmingTestResult,
            ConfirmingTestLoincCode = confirmingTestLoincCode,
            AiFeedbackId = aiFeedbackId,
            IsProcessed = false,
        };
        outcome.SetOrganization(organizationId);
        return outcome;
    }

    /// <summary>Mark as processed — LearningSignal has been generated</summary>
    public void MarkProcessed()
    {
        IsProcessed = true;
        ProcessedAt = DateTime.UtcNow;
        SetModified();
    }
}

/// <summary>
/// A de-identified training record derived from DiagnosticOutcome + AiFeedback.
///
/// This is the ML-ready signal: no patient or encounter identifiers, only
/// clinical pattern features that describe the diagnostic episode.
///
/// Used for:
///   1. Accuracy monitoring (TP/FP/FN/TN per guideline per org)
///   2. Probability calibration (actual outcome rate vs AI pre-test probability)
///   3. Fine-tuning data export (JSONL for model training pipelines)
/// </summary>
public class LearningSignal : BaseEntity
{
    public Guid Id { get; private set; }

    /// <summary>Links back for audit — never exposed in aggregated queries</summary>
    public Guid DiagnosticOutcomeId { get; private set; }

    // ── Clinical pattern features (no PHI) ────────────────────────────────

    public string RecommendationType { get; private set; } = string.Empty;
    public string? GuidelineName { get; private set; }
    public string? AiSuggestedDiagnosis { get; private set; }
    public decimal? AiPreTestProbability { get; private set; }
    public string? ConfirmedDiagnosis { get; private set; }
    public string? ConfirmedIcd10Code { get; private set; }

    // ── Outcome signal ─────────────────────────────────────────────────────

    /// <summary>True positive: AI suggested correct diagnosis</summary>
    public bool TruePositive { get; private set; }

    /// <summary>False positive: AI suggested diagnosis not confirmed</summary>
    public bool FalsePositive { get; private set; }

    /// <summary>False negative: correct diagnosis not in AI top suggestions</summary>
    public bool FalseNegative { get; private set; }

    /// <summary>Provider accepted the AI's recommendation without change</summary>
    public bool ProviderAccepted { get; private set; }

    /// <summary>Provider overrode the AI's recommendation</summary>
    public bool ProviderOverrode { get; private set; }

    /// <summary>Provider accuracy rating (1-5, from AiFeedback)</summary>
    public int? ProviderAccuracyScore { get; private set; }

    /// <summary>
    /// Confirming test LOINC code — enables test-specific accuracy analysis.
    /// E.g., "was troponin-confirmed ACS flagged correctly?"
    /// </summary>
    public string? ConfirmingTestLoincCode { get; private set; }

    private LearningSignal() { }

    public static LearningSignal CreateFromOutcome(
        DiagnosticOutcome outcome,
        Guid organizationId,
        int? providerAccuracyScore = null)
    {
        var signal = new LearningSignal
        {
            Id = Guid.NewGuid(),
            DiagnosticOutcomeId = outcome.Id,
            RecommendationType = outcome.RecommendationType,
            GuidelineName = outcome.GuidelineName,
            AiSuggestedDiagnosis = outcome.AiSuggestedDiagnosis,
            AiPreTestProbability = outcome.AiPreTestProbability,
            ConfirmedDiagnosis = outcome.ConfirmedDiagnosis,
            ConfirmedIcd10Code = outcome.ConfirmedIcd10Code,
            TruePositive = outcome.AiWasCorrect && !outcome.ProviderOverrode,
            FalsePositive = !outcome.AiWasCorrect,
            FalseNegative = outcome.ProviderOverrode && !outcome.AiWasCorrect,
            ProviderAccepted = !outcome.ProviderOverrode,
            ProviderOverrode = outcome.ProviderOverrode,
            ProviderAccuracyScore = providerAccuracyScore,
            ConfirmingTestLoincCode = outcome.ConfirmingTestLoincCode,
        };
        signal.SetOrganization(organizationId);
        return signal;
    }
}

/// <summary>
/// Rolling accuracy snapshot for a recommendation type within an organization.
///
/// Computed by DiagnosticLearningService on a scheduled basis (every 7 days).
/// Stored so the provider dashboard can display accuracy trends without
/// re-computing from raw signals every request.
///
/// The CalibrationAdjustmentFactor is the key output:
///   AdjustedPreTest = LiteraturePreTest × CalibrationAdjustmentFactor
///
/// Example: Wells PE High Risk has a literature pre-test of 49% (0.49).
/// If this org's 90-day data shows 39% actual rate, the adjustment factor is
/// 0.39 / 0.49 = 0.796 → adjusted pre-test = 39%.
///
/// Minimum sample size (30) prevents noisy adjustments from small populations.
/// </summary>
public class DiagnosticAccuracySnapshot : BaseEntity
{
    public Guid Id { get; private set; }

    public string RecommendationType { get; private set; } = string.Empty;
    public string? GuidelineName { get; private set; }

    /// <summary>Window this snapshot covers</summary>
    public DateTime WindowStart { get; private set; }
    public DateTime WindowEnd { get; private set; }
    public int WindowDays { get; private set; }

    // ── Confusion matrix ──────────────────────────────────────────────────
    public int TotalCases { get; private set; }
    public int TruePositives { get; private set; }
    public int FalsePositives { get; private set; }
    public int FalseNegatives { get; private set; }
    public int ProviderAcceptances { get; private set; }
    public int ProviderOverrides { get; private set; }

    // ── Derived metrics ───────────────────────────────────────────────────

    /// <summary>Sensitivity = TP / (TP + FN) — fraction of true cases caught</summary>
    public decimal Sensitivity { get; private set; }

    /// <summary>Precision = TP / (TP + FP) — fraction of positive calls that are correct</summary>
    public decimal Precision { get; private set; }

    /// <summary>Provider acceptance rate — proxy for clinical utility</summary>
    public decimal AcceptanceRate { get; private set; }

    /// <summary>Average AI pre-test probability across all cases</summary>
    public decimal AveragePredictedProbability { get; private set; }

    /// <summary>Actual outcome rate in this org over this window</summary>
    public decimal ActualOutcomeRate { get; private set; }

    /// <summary>
    /// Calibration adjustment factor for this org + guideline combination.
    /// 1.0 = well-calibrated. >1.0 = AI is underestimating. <1.0 = overestimating.
    /// Null if TotalCases < MinimumSampleSize (no reliable adjustment).
    /// </summary>
    public decimal? CalibrationAdjustmentFactor { get; private set; }

    /// <summary>Is the adjustment statistically reliable? (n >= 30)</summary>
    public bool IsReliable { get; private set; }

    public const int MinimumSampleSize = 30;

    private DiagnosticAccuracySnapshot() { }

    public static DiagnosticAccuracySnapshot Compute(
        Guid organizationId,
        string recommendationType,
        string? guidelineName,
        DateTime windowStart,
        DateTime windowEnd,
        IReadOnlyList<LearningSignal> signals)
    {
        var total = signals.Count;
        var tp = signals.Count(s => s.TruePositive);
        var fp = signals.Count(s => s.FalsePositive);
        var fn = signals.Count(s => s.FalseNegative);
        var accepted = signals.Count(s => s.ProviderAccepted);
        var overridden = signals.Count(s => s.ProviderOverrode);

        var sensitivity = (tp + fn) > 0
            ? Math.Round((decimal)tp / (tp + fn), 3)
            : 0m;

        var precision = (tp + fp) > 0
            ? Math.Round((decimal)tp / (tp + fp), 3)
            : 0m;

        var acceptanceRate = total > 0
            ? Math.Round((decimal)accepted / total, 3)
            : 0m;

        var avgPredicted = signals
            .Where(s => s.AiPreTestProbability.HasValue)
            .Select(s => s.AiPreTestProbability!.Value)
            .DefaultIfEmpty(0m)
            .Average();

        var actualRate = total > 0
            ? Math.Round((decimal)tp / total, 3)
            : 0m;

        // Calibration adjustment: actual / predicted — only if reliable sample
        decimal? calibrationFactor = null;
        var isReliable = total >= MinimumSampleSize;
        if (isReliable && avgPredicted > 0)
        {
            var rawFactor = Math.Round(actualRate / avgPredicted, 3);
            calibrationFactor = Math.Clamp(rawFactor, 0.50m, 2.00m);

            // Log when clamping changes the raw value — this indicates the
            // organization's population deviates significantly from literature
            // baselines, which may warrant a manual guideline review.
            if (rawFactor != calibrationFactor.Value)
            {
                System.Diagnostics.Trace.TraceWarning(
                    "[DiagnosticLearning] Calibration factor clamped for " +
                    "{0}/{1}: raw={2:F3}, clamped={3:F3} (n={4}). " +
                    "Consider reviewing guideline baselines for this organization.",
                    recommendationType,
                    guidelineName ?? "(no guideline)",
                    rawFactor,
                    calibrationFactor.Value,
                    total);
            }
        }

        var snapshot = new DiagnosticAccuracySnapshot
        {
            Id = Guid.NewGuid(),
            RecommendationType = recommendationType,
            GuidelineName = guidelineName,
            WindowStart = windowStart,
            WindowEnd = windowEnd,
            WindowDays = (int)(windowEnd - windowStart).TotalDays,
            TotalCases = total,
            TruePositives = tp,
            FalsePositives = fp,
            FalseNegatives = fn,
            ProviderAcceptances = accepted,
            ProviderOverrides = overridden,
            Sensitivity = sensitivity,
            Precision = precision,
            AcceptanceRate = acceptanceRate,
            AveragePredictedProbability = Math.Round(avgPredicted, 3),
            ActualOutcomeRate = actualRate,
            CalibrationAdjustmentFactor = calibrationFactor,
            IsReliable = isReliable,
        };
        snapshot.SetOrganization(organizationId);
        return snapshot;
    }
}
