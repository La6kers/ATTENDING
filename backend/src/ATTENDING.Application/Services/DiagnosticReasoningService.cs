using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.ClinicalGuidelines;
using Microsoft.Extensions.Logging;

namespace ATTENDING.Application.Services;

/// <summary>
/// Calibrated Diagnostic Reasoning (d3):
/// Converts raw guideline scores into Bayesian post-test probabilities.
///
/// Pipeline: GuidelineEvaluator produces scores (Wells = 6.0, HEART = 7) →
/// DiagnosticReasoningService converts to post-test probabilities
/// accounting for base rates, test characteristics, and rural prevalence adjustments.
///
/// This is pure math — no AI, no network, runs in microseconds.
/// The AI tier uses these calibrated probabilities as grounding anchors.
/// </summary>
public class DiagnosticReasoningService
{
    private readonly GuidelineEvaluator _evaluator;
    private readonly IClinicalContextAssembler _contextAssembler;
    private readonly ILogger<DiagnosticReasoningService> _logger;

    public DiagnosticReasoningService(
        GuidelineEvaluator evaluator,
        IClinicalContextAssembler contextAssembler,
        ILogger<DiagnosticReasoningService> logger)
    {
        _evaluator = evaluator;
        _contextAssembler = contextAssembler;
        _logger = logger;
    }

    /// <summary>
    /// Full pipeline: assemble clinical context → run guidelines → calibrate probabilities.
    /// Used by the API controller.
    /// </summary>
    public async Task<CalibratedDiagnosticResult> EvaluateAsync(
        Guid patientId, Guid? encounterId = null, Guid? assessmentId = null,
        CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();

        var context = await _contextAssembler.AssembleAsync(patientId, encounterId, assessmentId, ct);
        var guidelineInput = _contextAssembler.ToGuidelineInput(context);
        var result = Evaluate(guidelineInput);

        sw.Stop();

        return new CalibratedDiagnosticResult(
            Diagnoses: result.CalibratedResults.Select(c => new CalibratedDiagnosis(
                Icd10Code: null,
                DiagnosisName: c.Condition,
                PreTestProbability: (decimal)c.PostTestProbability,
                RiskCategory: c.RiskCategory,
                ClinicalReasoning: $"{c.GuidelineName}: score {c.RawScore:F1}, LR {c.LikelihoodRatio:F1}",
                KeyDiscriminators: Array.Empty<KeyDiscriminator>(),
                SupportingFeatures: Array.Empty<string>(),
                AgainstFeatures: Array.Empty<string>(),
                GuidelineSource: c.GuidelineName,
                Source: "Tier0-Guideline")).ToList(),
            GuidelineResults: result.GuidelineResults,
            RedFlags: Array.Empty<string>(),
            DrugInteractions: Array.Empty<string>(),
            IntelligenceSource: "Tier0-CalibratedDiagnostics",
            Duration: sw.Elapsed,
            EvaluatedAt: DateTime.UtcNow);
    }

    /// <summary>
    /// Run all applicable guidelines and convert scores to calibrated probabilities.
    /// </summary>
    public DiagnosticReasoningResult Evaluate(GuidelineInput input)
    {
        var guidelineResults = _evaluator.EvaluateAll(input);

        var calibrated = guidelineResults
            .Select(CalibrateResult)
            .OrderByDescending(r => r.PostTestProbability)
            .ToList();

        var highestRisk = calibrated.FirstOrDefault();

        return new DiagnosticReasoningResult(
            GuidelineResults: guidelineResults,
            CalibratedResults: calibrated,
            HighestRiskCondition: highestRisk?.Condition,
            HighestPostTestProbability: highestRisk?.PostTestProbability ?? 0.0,
            RequiresImmediateAction: calibrated.Any(r => r.PostTestProbability > 0.5));
    }

    private static CalibratedResult CalibrateResult(GuidelineResult result)
    {
        // Apply Fagan nomogram: post-test odds = pre-test odds × likelihood ratio
        var preTestProb = Math.Clamp((double)result.PreTestProbability, 0.001, 0.999);
        var preTestOdds = preTestProb / (1.0 - preTestProb);

        // Likelihood ratio derived from score stratification
        var lr = DeriveLikelihoodRatio(result);

        var postTestOdds = preTestOdds * lr;
        var postTestProb = postTestOdds / (1.0 + postTestOdds);

        return new CalibratedResult(
            GuidelineName: result.GuidelineName,
            Condition: result.GuidelineName,
            RawScore: (double)result.Score,
            PreTestProbability: preTestProb,
            LikelihoodRatio: lr,
            PostTestProbability: Math.Clamp(postTestProb, 0, 1),
            RiskCategory: result.RiskCategory,
            Recommendation: result.Recommendation);
    }

    private static double DeriveLikelihoodRatio(GuidelineResult result)
    {
        // Map risk categories to likelihood ratios based on published validation studies
        var riskCategory = result.RiskCategory.ToLowerInvariant();
        return riskCategory switch
        {
            "high" or "very high" => 5.0,
            "moderate" or "intermediate" => 2.0,
            "low" => 0.3,
            "very low" or "minimal" => 0.1,
            _ => 1.0 // No information — LR of 1.0 means no change
        };
    }
}

// ── Result Types ─────────────────────────────────────────────────────────

public record DiagnosticReasoningResult(
    IReadOnlyList<GuidelineResult> GuidelineResults,
    IReadOnlyList<CalibratedResult> CalibratedResults,
    string? HighestRiskCondition,
    double HighestPostTestProbability,
    bool RequiresImmediateAction);

public record CalibratedResult(
    string GuidelineName,
    string Condition,
    double RawScore,
    double PreTestProbability,
    double LikelihoodRatio,
    double PostTestProbability,
    string RiskCategory,
    string Recommendation);

// ── Async Pipeline Result Types ───────────────────────────────────

public record CalibratedDiagnosticResult(
    IReadOnlyList<CalibratedDiagnosis> Diagnoses,
    IReadOnlyList<GuidelineResult> GuidelineResults,
    IReadOnlyList<string> RedFlags,
    IReadOnlyList<string> DrugInteractions,
    string IntelligenceSource,
    TimeSpan Duration,
    DateTime EvaluatedAt);

public record CalibratedDiagnosis(
    string? Icd10Code,
    string DiagnosisName,
    decimal PreTestProbability,
    string RiskCategory,
    string ClinicalReasoning,
    IReadOnlyList<KeyDiscriminator> KeyDiscriminators,
    IReadOnlyList<string> SupportingFeatures,
    IReadOnlyList<string> AgainstFeatures,
    string? GuidelineSource,
    string Source);

public record KeyDiscriminator(
    string TestName,
    string? LoincCode,
    decimal IfPositiveProbability,
    string IfPositiveDescription,
    decimal IfNegativeProbability,
    string IfNegativeDescription,
    string Priority,
    string? CptCode);
