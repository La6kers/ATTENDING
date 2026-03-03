namespace ATTENDING.Contracts.Responses;

public record AiDifferentialResponse(
    bool Success,
    string? Error,
    IReadOnlyList<AiDiagnosisItem>? Diagnoses,
    IReadOnlyList<string>? UrgentConsiderations);

public record AiDiagnosisItem(
    string? Icd10Code,
    string Name,
    string? Probability,
    string? Reasoning,
    IReadOnlyList<string>? RedFlags,
    IReadOnlyList<string>? RecommendedWorkup);

public record AiTriageResponse(
    bool Success,
    string? Error,
    string TriageLevel,
    string? Reasoning,
    IReadOnlyList<string>? RedFlags,
    string? TimeToProvider);

public record AiFeedbackResponse(
    Guid Id,
    string RecommendationType,
    string RequestId,
    string Rating,
    int? AccuracyScore,
    string? SelectedDiagnosis,
    string? Comment,
    DateTime CreatedAt);

public record AiFeedbackStatsResponse(
    int TotalFeedback,
    int HelpfulCount,
    double HelpfulPercentage,
    double AverageAccuracy);

// ── Clinical Intelligence Response ──────────────────────────────────────

public record GuidelineResultItem(
    string GuidelineName,
    string SourceCitation,
    decimal Score,
    string RiskCategory,
    decimal PreTestProbability,
    string Recommendation,
    IReadOnlyList<ScoredCriterionItem> Criteria);

public record ScoredCriterionItem(
    string Name,
    bool Met,
    decimal Points,
    string? PatientValue);

public record ClinicalIntelligenceResponse(
    bool Success,
    string? Error,
    ClinicalIntelligenceResponse.ContextSummary Context,
    IReadOnlyList<GuidelineResultItem> GuidelineResults,
    IReadOnlyList<string> RedFlags,
    IReadOnlyList<string> DrugInteractions,
    IReadOnlyList<string> TiersExecuted,
    string TotalLatency)
{
    public record ContextSummary(
        string ChiefComplaint,
        string? VitalsSummary,
        string? RenalFunction,
        string? HepaticFunction,
        int? PainSeverity,
        int ActiveMedicationCount,
        int RecentLabCount,
        int ActiveConditionCount);
}

// ── Calibrated Diagnostic Response ──────────────────────────────────────

public record PostTestUpdate(
    string TestName,
    string? LoincCode,
    decimal IfPositiveProbability,
    string IfPositiveDescription,
    decimal IfNegativeProbability,
    string IfNegativeDescription,
    string Priority,
    string? CptCode);

public record CalibratedDiagnosisItem(
    string? Icd10Code,
    string DiagnosisName,
    decimal PreTestProbability,
    string RiskCategory,
    string ClinicalReasoning,
    IReadOnlyList<PostTestUpdate> KeyDiscriminators,
    IReadOnlyList<string> SupportingFeatures,
    IReadOnlyList<string> AgainstFeatures,
    string? GuidelineSource,
    string Source);

public record CalibratedDiagnosticResponse(
    bool Success,
    string? Error,
    IReadOnlyList<CalibratedDiagnosisItem> Diagnoses,
    string IntelligenceSource,
    IReadOnlyList<GuidelineResultItem> GuidelineAnchors,
    IReadOnlyList<string> RedFlags,
    IReadOnlyList<string> DrugInteractions,
    string Latency,
    DateTime EvaluatedAt);
