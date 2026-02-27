using ATTENDING.Domain.ClinicalGuidelines;
using ATTENDING.Domain.ClinicalGuidelines.Guidelines;
using ATTENDING.Domain.ValueObjects;
using ATTENDING.Application.Services;

namespace ATTENDING.Domain.Tests;

/// <summary>
/// Tests for clinical guidelines engine — Tier 0 intelligence.
/// Every test here runs without network, database, or AI.
/// These are the evidence-based decision rules that work offline.
/// </summary>
public class ClinicalGuidelineTests
{
    // ── Wells PE Criteria ─────────────────────────────────────────────────

    [Fact]
    public void WellsPE_ChestPainWithTachycardia_ModerateRisk()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "chest pain and shortness of breath",
            Vitals = VitalSigns.Create(heartRate: 110, systolicBp: 130),
        };

        var guideline = new WellsPECriteria();
        Assert.True(guideline.IsApplicable(input));

        var result = guideline.Evaluate(input);
        Assert.True(result.Score >= 1.5m); // At least HR >100
        Assert.NotEmpty(result.Recommendation);
        Assert.Contains(result.Criteria, c => c.Name.Contains("Heart rate") && c.Met);
    }

    [Fact]
    public void WellsPE_HighRisk_RecommendsCTPA()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "chest pain",
            Vitals = VitalSigns.Create(heartRate: 110),
            OldcartsData = new() { { "location", "right leg swelling and chest" } },
            ActiveConditions = new List<string> { "deep vein thrombosis" },
        };

        var result = new WellsPECriteria().Evaluate(input);
        Assert.Equal("High", result.RiskCategory);
        Assert.Contains("CT pulmonary angiography", result.Recommendation);
    }

    [Fact]
    public void WellsPE_NotApplicable_HeadacheComplaint()
    {
        var input = new GuidelineInput { ChiefComplaint = "headache" };
        Assert.False(new WellsPECriteria().IsApplicable(input));
    }

    // ── HEART Score ───────────────────────────────────────────────────────

    [Fact]
    public void HeartScore_YoungLowRisk_ReturnsLow()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "chest pain",
            PatientAge = 35,
            RecentLabs = new LabPanel { Results = Array.Empty<RecentLabResult>() },
        };

        var result = new HeartScore().Evaluate(input);
        Assert.True(result.Score <= 3);
        Assert.Equal("Low", result.RiskCategory);
    }

    [Fact]
    public void HeartScore_ElderlyWithTroponin_ReturnsHigh()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "chest pain radiating to left arm",
            PatientAge = 70,
            Vitals = VitalSigns.Create(heartRate: 100),
            ActiveConditions = new List<string> { "diabetes", "hypertension" },
            RecentLabs = new LabPanel
            {
                Results = new[]
                {
                    new RecentLabResult
                    {
                        LoincCode = "10839-9", TestName = "Troponin I",
                        Value = 0.5m, Unit = "ng/mL",
                        ReferenceRangeHigh = 0.04m,
                        ResultedAt = DateTime.UtcNow
                    }
                }
            },
        };

        var result = new HeartScore().Evaluate(input);
        Assert.True(result.Score >= 7);
        Assert.Equal("High", result.RiskCategory);
        Assert.True(result.PreTestProbability >= 0.40m);
    }

    [Fact]
    public void HeartScore_NotApplicable_AnkleInjury()
    {
        var input = new GuidelineInput { ChiefComplaint = "twisted my ankle" };
        Assert.False(new HeartScore().IsApplicable(input));
    }

    // ── qSOFA ─────────────────────────────────────────────────────────────

    [Fact]
    public void QSofa_NormalVitals_LowRisk()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "fever and cough",
            Vitals = VitalSigns.Create(
                systolicBp: 120, heartRate: 85,
                respiratoryRate: 16, temperatureCelsius: 38.5m),
        };

        var result = new QSofaScore().Evaluate(input);
        Assert.Equal(0m, result.Score);
        Assert.Equal("Low", result.RiskCategory);
    }

    [Fact]
    public void QSofa_SepsisPresentation_HighRisk()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "fever and confusion",
            HpiNarrative = "Patient is confused and disoriented, altered mental status",
            Vitals = VitalSigns.Create(
                systolicBp: 85, heartRate: 120,
                respiratoryRate: 24, temperatureCelsius: 39.5m),
            RecentLabs = new LabPanel
            {
                Results = new[]
                {
                    new RecentLabResult
                    {
                        LoincCode = "2524-7", TestName = "Lactate",
                        Value = 4.5m, Unit = "mmol/L",
                        ReferenceRangeHigh = 2.0m,
                        ResultedAt = DateTime.UtcNow
                    }
                }
            },
        };

        var result = new QSofaScore().Evaluate(input);
        Assert.True(result.Score >= 2);
        Assert.Equal("High", result.RiskCategory);
        Assert.Contains("septic shock", result.Recommendation, StringComparison.OrdinalIgnoreCase);
    }

    // ── Ottawa Ankle Rules ────────────────────────────────────────────────

    [Fact]
    public void OttawaAnkle_WeightBearing_NoImaging()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "ankle injury",
            OldcartsData = new() { { "context", "walking normally" } },
        };

        var result = new OttawaAnkleRules().Evaluate(input);
        Assert.Equal("Low", result.RiskCategory);
        Assert.Contains("not indicated", result.Recommendation, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void OttawaAnkle_BonyTenderness_RecommendsXray()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "ankle injury, can't walk",
            HpiNarrative = "Tenderness over the malleolus bone, unable to bear weight after fall",
            OldcartsData = new() { { "location", "ankle bone lateral malleolus" } },
        };

        var result = new OttawaAnkleRules().Evaluate(input);
        Assert.True(result.Score >= 1);
        Assert.Contains("X-ray", result.Recommendation);
    }

    [Fact]
    public void OttawaAnkle_NotApplicable_ChestPain()
    {
        var input = new GuidelineInput { ChiefComplaint = "chest pain" };
        Assert.False(new OttawaAnkleRules().IsApplicable(input));
    }

    // ── CURB-65 ───────────────────────────────────────────────────────────

    [Fact]
    public void Curb65_YoungMildPneumonia_LowRisk()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "cough and fever, pneumonia",
            PatientAge = 40,
            Vitals = VitalSigns.Create(
                systolicBp: 130, respiratoryRate: 18),
            RecentLabs = new LabPanel
            {
                Results = new[]
                {
                    new RecentLabResult
                    {
                        LoincCode = "3094-0", TestName = "BUN",
                        Value = 15m, Unit = "mg/dL",
                        ReferenceRangeHigh = 20m,
                        ResultedAt = DateTime.UtcNow
                    }
                }
            },
        };

        var result = new Curb65Score().Evaluate(input);
        Assert.Equal(0m, result.Score);
        Assert.Equal("Low", result.RiskCategory);
        Assert.Contains("outpatient", result.Recommendation, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Curb65_ElderlyConfusedHypotensive_HighRisk()
    {
        var input = new GuidelineInput
        {
            ChiefComplaint = "pneumonia",
            PatientAge = 72,
            HpiNarrative = "confused, disoriented",
            Vitals = VitalSigns.Create(
                systolicBp: 85, diastolicBp: 55, respiratoryRate: 32),
            RecentLabs = new LabPanel
            {
                Results = new[]
                {
                    new RecentLabResult
                    {
                        LoincCode = "3094-0", TestName = "BUN",
                        Value = 25m, Unit = "mg/dL",
                        ReferenceRangeHigh = 20m,
                        ResultedAt = DateTime.UtcNow
                    }
                }
            },
        };

        var result = new Curb65Score().Evaluate(input);
        Assert.True(result.Score >= 4);
        Assert.Equal("High", result.RiskCategory);
        Assert.Contains("ICU", result.Recommendation);
    }

    // ── GuidelineEvaluator orchestration ──────────────────────────────────

    [Fact]
    public void GuidelineEvaluator_ChestPain_RunsWellsAndHeart()
    {
        var guidelines = new IClinicalGuideline[]
        {
            new WellsPECriteria(),
            new HeartScore(),
            new QSofaScore(),
            new OttawaAnkleRules(),
            new Curb65Score(),
        };
        var evaluator = new GuidelineEvaluator(guidelines);

        var input = new GuidelineInput
        {
            ChiefComplaint = "chest pain",
            PatientAge = 55,
            Vitals = VitalSigns.Create(heartRate: 95, systolicBp: 130),
        };

        var results = evaluator.EvaluateAll(input);

        // Should run Wells PE and HEART, but not Ottawa or CURB-65
        Assert.True(results.Count >= 2);
        Assert.Contains(results, r => r.GuidelineName.Contains("Wells"));
        Assert.Contains(results, r => r.GuidelineName.Contains("HEART"));
        Assert.DoesNotContain(results, r => r.GuidelineName.Contains("Ottawa"));
        Assert.DoesNotContain(results, r => r.GuidelineName.Contains("CURB"));
    }

    [Fact]
    public void GuidelineEvaluator_AnkleInjury_RunsOttawaOnly()
    {
        var guidelines = new IClinicalGuideline[]
        {
            new WellsPECriteria(),
            new HeartScore(),
            new OttawaAnkleRules(),
        };
        var evaluator = new GuidelineEvaluator(guidelines);

        var input = new GuidelineInput { ChiefComplaint = "ankle injury" };
        var results = evaluator.EvaluateAll(input);

        Assert.Single(results);
        Assert.Contains("Ottawa", results[0].GuidelineName);
    }

    [Fact]
    public void GuidelineEvaluator_NoApplicableGuidelines_ReturnsEmpty()
    {
        var evaluator = new GuidelineEvaluator(new IClinicalGuideline[]
        {
            new WellsPECriteria(),
            new OttawaAnkleRules(),
        });

        var input = new GuidelineInput { ChiefComplaint = "rash on forearm" };
        var results = evaluator.EvaluateAll(input);

        Assert.Empty(results);
    }

    [Fact]
    public void GuidelineEvaluator_ResultsOrderedByRisk()
    {
        var evaluator = new GuidelineEvaluator(new IClinicalGuideline[]
        {
            new WellsPECriteria(),
            new HeartScore(),
        });

        var input = new GuidelineInput
        {
            ChiefComplaint = "chest pain",
            PatientAge = 70,
            Vitals = VitalSigns.Create(heartRate: 110),
            ActiveConditions = new List<string> { "previous DVT" },
        };

        var results = evaluator.EvaluateAll(input);
        Assert.True(results.Count >= 2);

        // Results should be ordered by pre-test probability descending
        for (int i = 0; i < results.Count - 1; i++)
        {
            Assert.True(results[i].PreTestProbability >= results[i + 1].PreTestProbability);
        }
    }

    [Fact]
    public void GuidelineEvaluator_FormatForAiPrompt_IncludesStructuredData()
    {
        var results = new List<GuidelineResult>
        {
            new("Wells PE", "Wells 2000", 6.0m, 12.5m, "High", 0.49m,
                "CTPA indicated", new List<ScoredCriterion>
                {
                    new("HR > 100", true, 1.5m, "HR: 112"),
                }),
        };

        var prompt = GuidelineEvaluator.FormatForAiPrompt(results);

        Assert.Contains("Wells PE", prompt);
        Assert.Contains("CTPA", prompt);
        Assert.Contains("anchoring data", prompt);
    }

    [Fact]
    public void GuidelineEvaluator_EmptyResults_ReturnsNoGuidelinesMessage()
    {
        var prompt = GuidelineEvaluator.FormatForAiPrompt(Array.Empty<GuidelineResult>());
        Assert.Contains("No clinical guidelines applicable", prompt);
    }

    // ── GuidelineResult audit trail ───────────────────────────────────────

    [Fact]
    public void GuidelineResult_ToAiContext_IncludesSourceCitation()
    {
        var result = new WellsPECriteria().Evaluate(new GuidelineInput
        {
            ChiefComplaint = "chest pain",
            Vitals = VitalSigns.Create(heartRate: 110),
        });

        var aiContext = result.ToAiContext();

        Assert.Contains("Wells", aiContext);
        Assert.Contains("Thromb Haemost", aiContext); // Source citation
    }
}
