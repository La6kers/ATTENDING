namespace ATTENDING.Contracts.Responses;

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATED DIAGNOSTIC OUTPUT — d3 of Diagnostic Intelligence Track
//
// The provider sees quantitative probabilities with explicit reasoning
// about what evidence would shift the probability up or down.
// Each diagnosis includes a "diagnostic roadmap" — order THIS to
// differentiate — not just a suggestion list.
//
// Example output:
//  ┌──────────────────────────────────────────────────────────────┐
//  │ Acute Coronary Syndrome (I21.9)                  49% ████▌  │
//  │ HEART Score 7/10, High risk + crushing chest pain + age 62  │
//  │                                                              │
//  │ Order troponin (STAT):                                       │
//  │   If positive → 94%  ████████████████████████▌               │
//  │   If negative →  8%  ██                                      │
//  │                                                              │
//  │ Source: HEART Score (Six AJ et al. 2008)                     │
//  └──────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Full response from the calibrated diagnostic reasoning pipeline.
/// Always includes Tier 0 (guideline-derived) diagnoses.
/// Optionally includes Tier 2 (AI-enhanced) diagnoses when available.
/// </summary>
public record CalibratedDiagnosticResponse(
    bool Success,
    string? Error,

    /// <summary>Calibrated differential diagnoses ordered by probability</summary>
    IReadOnlyList<CalibratedDiagnosisItem> Diagnoses,

    /// <summary>Source: "Tier0_PureDomain" or "Tier0_PureDomain+Tier2_CloudAi"</summary>
    string IntelligenceSource,

    /// <summary>Guideline evaluations that anchored the probabilities</summary>
    IReadOnlyList<GuidelineResultItem> GuidelineAnchors,

    /// <summary>Red flags detected in the presentation</summary>
    IReadOnlyList<string> RedFlags,

    /// <summary>Drug interactions for current medications</summary>
    IReadOnlyList<string> DrugInteractions,

    /// <summary>Pipeline latency</summary>
    string Latency,

    /// <summary>When this evaluation was performed (UTC)</summary>
    DateTime EvaluatedAt);

/// <summary>
/// A single calibrated diagnosis with pre-test probability,
/// key discriminating tests with post-test probability shifts,
/// and supporting/against evidence from the clinical context.
/// </summary>
public record CalibratedDiagnosisItem(
    /// <summary>ICD-10 code (e.g., "I21.9")</summary>
    string? Icd10Code,

    /// <summary>Diagnosis name (e.g., "Acute Coronary Syndrome")</summary>
    string DiagnosisName,

    /// <summary>Pre-test probability as decimal (0.49 = 49%)</summary>
    decimal PreTestProbability,

    /// <summary>Human-readable risk category ("Low", "Moderate", "High", "Critical")</summary>
    string RiskCategory,

    /// <summary>
    /// Clinical reasoning chain: WHY this probability.
    /// "HEART Score 7/10 (High risk) + crushing substernal chest pain radiating to left arm + age 62"
    /// </summary>
    string ClinicalReasoning,

    /// <summary>
    /// Key tests that would shift the probability up or down.
    /// These are the provider's "diagnostic roadmap."
    /// </summary>
    IReadOnlyList<PostTestUpdate> KeyDiscriminators,

    /// <summary>Clinical features supporting this diagnosis</summary>
    IReadOnlyList<string> SupportingFeatures,

    /// <summary>Clinical features arguing against this diagnosis</summary>
    IReadOnlyList<string> AgainstFeatures,

    /// <summary>Which guideline anchored this probability (null if AI-generated)</summary>
    string? GuidelineSource,

    /// <summary>"guideline" or "ai" — tracks provenance</summary>
    string Source);

/// <summary>
/// A specific test that would shift the diagnostic probability.
/// This is Bayesian reasoning made actionable:
///   "Order troponin STAT → if positive, ACS probability goes from 49% to 94%"
/// </summary>
public record PostTestUpdate(
    /// <summary>Test name (e.g., "Troponin I")</summary>
    string TestName,

    /// <summary>LOINC code if available</summary>
    string? LoincCode,

    /// <summary>Probability if test is positive (e.g., 0.94)</summary>
    decimal IfPositiveProbability,

    /// <summary>Human-readable (e.g., "Probability increases to ~94%")</summary>
    string IfPositiveDescription,

    /// <summary>Probability if test is negative (e.g., 0.08)</summary>
    decimal IfNegativeProbability,

    /// <summary>Human-readable (e.g., "Probability decreases to ~8%")</summary>
    string IfNegativeDescription,

    /// <summary>Priority: "STAT", "Urgent", "Routine"</summary>
    string Priority,

    /// <summary>CPT code for the test if available</summary>
    string? CptCode);

/// <summary>
/// Request for calibrated diagnostic reasoning.
/// PatientId required. EncounterId and AssessmentId scope the clinical context.
/// </summary>
public record CalibratedDiagnosticRequest(
    Guid PatientId,
    Guid? EncounterId = null,
    Guid? AssessmentId = null);

/// <summary>
/// Guideline evaluation result for API output.
/// Shows the provider exactly which guideline was evaluated, what scored,
/// and why — the audit trail from recommendation back to published evidence.
/// </summary>
public record GuidelineResultItem(
    string GuidelineName,
    string SourceCitation,
    decimal Score,
    string RiskCategory,
    decimal PreTestProbability,
    string Recommendation,
    IReadOnlyList<ScoredCriterionItem> Criteria);

/// <summary>
/// A single scored criterion within a guideline evaluation.
/// Shows the provider which criteria were met and which were not.
/// </summary>
public record ScoredCriterionItem(
    string Name,
    bool Met,
    decimal Points,
    string? PatientValue);
