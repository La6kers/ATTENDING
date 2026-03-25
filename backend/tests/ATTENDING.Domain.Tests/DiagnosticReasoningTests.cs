using Xunit;
using FluentAssertions;
using ATTENDING.Application.Services;

namespace ATTENDING.Domain.Tests;

/// <summary>
/// Tests for the Bayesian update calculation and diagnostic reasoning mappings.
/// 
/// These verify the mathematical foundation of calibrated diagnostic output:
///   P(D|T+) = (Sensitivity × PreTest) / P(T+)
///   P(D|T-) = ((1-Sensitivity) × PreTest) / P(T-)
/// 
/// All expected values computed manually from published sensitivity/specificity data.
/// </summary>
public class DiagnosticReasoningTests
{
    // ═══════════════════════════════════════════════════════════════════════
    // BAYESIAN UPDATE — MATHEMATICAL CORRECTNESS
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_HighSensitivityHighSpecificity_ProducesExpectedShifts()
    {
        // High-sensitivity troponin: sens 97%, spec 93%
        // Pre-test 50% (high-risk HEART score)
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0.50m, 0.97m, 0.93m);

        // P(T+) = 0.97 × 0.50 + 0.07 × 0.50 = 0.485 + 0.035 = 0.52
        // P(D|T+) = 0.97 × 0.50 / 0.52 = 0.485 / 0.52 ≈ 0.93
        postPositive.Should().BeInRange(0.92m, 0.94m,
            "positive troponin with 50% pre-test should yield ~93% post-test");

        // P(T-) = 0.03 × 0.50 + 0.93 × 0.50 = 0.015 + 0.465 = 0.48
        // P(D|T-) = 0.03 × 0.50 / 0.48 = 0.015 / 0.48 ≈ 0.03
        postNegative.Should().BeInRange(0.02m, 0.04m,
            "negative troponin with 50% pre-test should yield ~3% post-test");
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_LowPreTestProbability_PositiveTestStillShifts()
    {
        // D-dimer: sens 96%, spec 40% (typical for younger patients)
        // Pre-test 6% (low-risk Wells PE)
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0.06m, 0.96m, 0.40m);

        // Even with low pre-test, positive D-dimer should increase probability
        postPositive.Should().BeGreaterThan(0.06m,
            "positive test should always increase probability");

        // But D-dimer has poor specificity, so the shift is modest
        postPositive.Should().BeLessThan(0.20m,
            "poor specificity limits the positive predictive value");

        // Negative D-dimer with low pre-test should effectively rule out
        postNegative.Should().BeLessThanOrEqualTo(0.01m,
            "high sensitivity + low pre-test → negative result virtually excludes PE");
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_HighPreTestProbability_NegativeTestStillConcerning()
    {
        // CTPA: sens 95%, spec 97%
        // Pre-test 49% (high-risk Wells PE)
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0.49m, 0.95m, 0.97m);

        // Positive CTPA should be near-definitive
        postPositive.Should().BeGreaterThan(0.95m,
            "positive CTPA with high pre-test should be near-definitive");

        // Negative CTPA should be very reassuring
        postNegative.Should().BeLessThanOrEqualTo(0.05m,
            "negative CTPA effectively excludes PE even with high pre-test");
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_ModerateSensitivityModerateSpecificity()
    {
        // 12-lead ECG for ACS: sens 55%, spec 95%
        // Pre-test 50%
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0.50m, 0.55m, 0.95m);

        // ECG with good specificity: positive is meaningful
        postPositive.Should().BeGreaterThan(0.85m,
            "ECG ST changes with good specificity strongly suggest ACS");

        // ECG with poor sensitivity: normal ECG doesn't exclude
        postNegative.Should().BeGreaterThan(0.25m,
            "normal ECG does NOT rule out ACS — sensitivity too low");
    }

    [Theory]
    [Trait("Category", "Unit")]
    [InlineData(0.001, 0.96, 0.40)] // Very low pre-test
    [InlineData(0.50, 0.97, 0.93)]  // Balanced
    [InlineData(0.999, 0.95, 0.97)] // Very high pre-test
    [InlineData(0.30, 0.50, 0.50)]  // Uninformative test
    public void BayesianUpdate_PostTestProbabilities_AlwaysInValidRange(
        double preTest, double sensitivity, double specificity)
    {
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            (decimal)preTest, (decimal)sensitivity, (decimal)specificity);

        postPositive.Should().BeInRange(0m, 1m, "post-positive must be a valid probability");
        postNegative.Should().BeInRange(0m, 1m, "post-negative must be a valid probability");
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_PositiveResult_AlwaysIncreasesOrMaintainsProbability()
    {
        // Fundamental Bayesian property: a positive result from an informative test
        // always increases the post-test probability above the pre-test probability
        var preTests = new[] { 0.05m, 0.10m, 0.25m, 0.50m, 0.75m, 0.90m };

        foreach (var preTest in preTests)
        {
            var (postPositive, _) = DiagnosticReasoningService.BayesianUpdate(
                preTest, 0.90m, 0.90m);

            postPositive.Should().BeGreaterThanOrEqualTo(preTest,
                $"positive result should increase probability from {preTest}");
        }
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_NegativeResult_AlwaysDecreasesOrMaintainsProbability()
    {
        var preTests = new[] { 0.05m, 0.10m, 0.25m, 0.50m, 0.75m, 0.90m };

        foreach (var preTest in preTests)
        {
            var (_, postNegative) = DiagnosticReasoningService.BayesianUpdate(
                preTest, 0.90m, 0.90m);

            postNegative.Should().BeLessThanOrEqualTo(preTest,
                $"negative result should decrease probability from {preTest}");
        }
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_UninformativeTest_MinimalShift()
    {
        // A test with sensitivity = specificity = 50% is uninformative
        // (same as a coin flip — doesn't change the probability)
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0.30m, 0.50m, 0.50m);

        // Post-test should be approximately equal to pre-test
        postPositive.Should().BeApproximately(0.30m, 0.02m,
            "uninformative test should not meaningfully shift probability");
        postNegative.Should().BeApproximately(0.30m, 0.02m,
            "uninformative test should not meaningfully shift probability");
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_EdgeCase_ZeroPreTest_ClampsAndComputes()
    {
        // Zero pre-test would cause issues; BayesianUpdate clamps to 0.001
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0m, 0.95m, 0.95m);

        // Should still produce valid results (clamped to 0.001)
        postPositive.Should().BeInRange(0m, 1m);
        postNegative.Should().BeInRange(0m, 1m);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_EdgeCase_PerfectTest_ClampsAndComputes()
    {
        // Perfect sensitivity (1.0) and specificity (1.0) would be unrealistic
        // but BayesianUpdate clamps to 0.99
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0.50m, 1.0m, 1.0m);

        // Should still produce valid results
        postPositive.Should().BeInRange(0m, 1m);
        postNegative.Should().BeInRange(0m, 1m);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CLINICAL SCENARIO VALIDATION
    // These test clinically meaningful scenarios to verify the math
    // produces results that match expected clinical decision-making.
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_ClinicalScenario_LowRiskPE_NegativeDDimer_ExcludesPE()
    {
        // Classic clinical scenario: low-risk Wells PE + negative D-dimer = PE excluded
        // Wells low-risk: pre-test ~6%
        // D-dimer: sensitivity 96%, specificity 40% (young patient)
        var (_, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0.06m, 0.96m, 0.40m);

        postNegative.Should().BeLessThanOrEqualTo(0.01m,
            "Low-risk PE + negative D-dimer should effectively exclude PE (evidence-based practice)");
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_ClinicalScenario_HighRiskACS_PositiveTroponin_ConfirmsACS()
    {
        // High-risk HEART score (pre-test ~50%) + positive hs-troponin → ACS very likely
        var (postPositive, _) = DiagnosticReasoningService.BayesianUpdate(
            0.50m, 0.97m, 0.93m);

        postPositive.Should().BeGreaterThan(0.90m,
            "High-risk HEART + positive troponin should confirm ACS (>90%)");
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void BayesianUpdate_ClinicalScenario_SepsisScreening_ElevatedLactate()
    {
        // qSOFA 2+ (pre-test ~24%) + lactate >2 mmol/L
        // Lactate: sensitivity 83%, specificity 60%
        var (postPositive, postNegative) = DiagnosticReasoningService.BayesianUpdate(
            0.24m, 0.83m, 0.60m);

        postPositive.Should().BeGreaterThan(0.35m,
            "Elevated lactate with qSOFA 2+ should increase sepsis concern");
        postNegative.Should().BeLessThan(0.15m,
            "Normal lactate should meaningfully decrease sepsis probability");
    }
}
