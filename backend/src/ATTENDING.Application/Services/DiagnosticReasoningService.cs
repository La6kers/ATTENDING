using ATTENDING.Application.DTOs;
using ATTENDING.Application.Interfaces;
using ATTENDING.Application.Services;
using ATTENDING.Domain.ClinicalGuidelines;
using ATTENDING.Domain.Services;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace ATTENDING.Application.Services;

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC REASONING SERVICE — d3 Calibrated Probabilistic Output
//
// Converts guideline scores + clinical context into calibrated diagnoses
// with post-test probability updates. This is the piece that gives the
// remote provider a diagnostic ROADMAP, not just a suggestion list.
//
// Pipeline:
//   1. Assemble clinical context (ClinicalContextAssembler)
//   2. Run guidelines (GuidelineEvaluator — Tier 0)
//   3. Run red flags (RedFlagEvaluator — Tier 0)
//   4. Map guideline results → calibrated diagnoses with post-test updates
//   5. Optionally enhance with AI differentials (Tier 2)
//   6. Validate AI output against guideline constraints
//   7. Return unified CalibratedDiagnosticResult
//
// When AI is unavailable, steps 1-4 still produce actionable output.
// A rural provider with no connectivity still gets:
//   "Wells PE: 6.0 (High, 49%) — order CTPA. If positive → 95%."
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Result of the calibrated diagnostic reasoning pipeline.
/// </summary>
public class CalibratedDiagnosticResult
{
    public required EnrichedClinicalContext Context { get; init; }
    public IReadOnlyList<GuidelineResult> GuidelineResults { get; init; } = Array.Empty<GuidelineResult>();
    public IReadOnlyList<CalibratedDiagnosis> Diagnoses { get; init; } = Array.Empty<CalibratedDiagnosis>();
    public IReadOnlyList<string> RedFlags { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> DrugInteractions { get; init; } = Array.Empty<string>();
    public required string IntelligenceSource { get; init; }
    public DateTime EvaluatedAt { get; init; } = DateTime.UtcNow;
    public TimeSpan Duration { get; init; }
}

/// <summary>
/// A single calibrated diagnosis (Application-layer type, mapped to contract for API).
/// </summary>
public class CalibratedDiagnosis
{
    public string? Icd10Code { get; init; }
    public string DiagnosisName { get; init; } = string.Empty;
    public decimal PreTestProbability { get; init; }
    public string RiskCategory { get; init; } = string.Empty;
    public string ClinicalReasoning { get; init; } = string.Empty;
    public IReadOnlyList<PostTestDiscriminator> KeyDiscriminators { get; init; } = Array.Empty<PostTestDiscriminator>();
    public IReadOnlyList<string> SupportingFeatures { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> AgainstFeatures { get; init; } = Array.Empty<string>();
    public string? GuidelineSource { get; init; }
    public string Source { get; init; } = "guideline"; // "guideline" or "ai"
}

/// <summary>
/// A test that would shift diagnosis probability (Application-layer type).
/// </summary>
public class PostTestDiscriminator
{
    public string TestName { get; init; } = string.Empty;
    public string? LoincCode { get; init; }
    public decimal IfPositiveProbability { get; init; }
    public string IfPositiveDescription { get; init; } = string.Empty;
    public decimal IfNegativeProbability { get; init; }
    public string IfNegativeDescription { get; init; } = string.Empty;
    public string Priority { get; init; } = "Routine";
    public string? CptCode { get; init; }
}

/// <summary>
/// Orchestrates the full calibrated diagnostic reasoning pipeline.
/// </summary>
public class DiagnosticReasoningService
{
    private readonly IClinicalContextAssembler _contextAssembler;
    private readonly GuidelineEvaluator _guidelineEvaluator;
    private readonly IRedFlagEvaluator _redFlagEvaluator;
    private readonly IDrugInteractionService _drugInteractionService;
    private readonly ILogger<DiagnosticReasoningService> _logger;

    public DiagnosticReasoningService(
        IClinicalContextAssembler contextAssembler,
        GuidelineEvaluator guidelineEvaluator,
        IRedFlagEvaluator redFlagEvaluator,
        IDrugInteractionService drugInteractionService,
        ILogger<DiagnosticReasoningService> logger)
    {
        _contextAssembler = contextAssembler;
        _guidelineEvaluator = guidelineEvaluator;
        _redFlagEvaluator = redFlagEvaluator;
        _drugInteractionService = drugInteractionService;
        _logger = logger;
    }

    /// <summary>
    /// Run the full calibrated diagnostic pipeline.
    /// </summary>
    public async Task<CalibratedDiagnosticResult> EvaluateAsync(
        Guid patientId,
        Guid? encounterId = null,
        Guid? assessmentId = null,
        CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();

        // ── Step 1: Assemble clinical context ─────────────────────────────
        var context = await _contextAssembler.AssembleAsync(
            patientId, encounterId, assessmentId, ct);

        // ── Step 2: Run guidelines (Tier 0) ───────────────────────────────
        var guidelineInput = _contextAssembler.ToGuidelineInput(context);
        var guidelineResults = _guidelineEvaluator.EvaluateAll(guidelineInput);

        // ── Step 3: Run red flags (Tier 0) ────────────────────────────────
        var redFlags = EvaluateRedFlags(context);

        // ── Step 4: Check drug interactions (Tier 0) ──────────────────────
        var drugInteractions = CheckDrugInteractions(context);

        // ── Step 5: Map guidelines → calibrated diagnoses ─────────────────
        var diagnoses = guidelineResults
            .Select(g => MapGuidelineToCalibratedDiagnosis(g, context))
            .ToList();

        _logger.LogInformation(
            "Calibrated diagnostic reasoning complete for Patient {PatientId}: " +
            "{DiagnosisCount} diagnoses from {GuidelineCount} guidelines in {ElapsedMs}ms",
            patientId, diagnoses.Count, guidelineResults.Count, stopwatch.ElapsedMilliseconds);

        stopwatch.Stop();

        return new CalibratedDiagnosticResult
        {
            Context = context,
            GuidelineResults = guidelineResults,
            Diagnoses = diagnoses,
            RedFlags = redFlags,
            DrugInteractions = drugInteractions,
            IntelligenceSource = "Tier0_PureDomain",
            Duration = stopwatch.Elapsed,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GUIDELINE → CALIBRATED DIAGNOSIS MAPPING
    //
    // This is the core of d3: converting a guideline score into a
    // calibrated diagnosis with post-test probability updates.
    //
    // Each guideline type has specific discriminating tests with known
    // sensitivity/specificity from published literature. The post-test
    // probabilities are computed using approximate Bayesian updating:
    //   P(D|T+) = (Sensitivity × PreTest) / P(T+)
    //   P(D|T-) = ((1-Sensitivity) × PreTest) / P(T-)
    // ═══════════════════════════════════════════════════════════════════════

    private CalibratedDiagnosis MapGuidelineToCalibratedDiagnosis(
        GuidelineResult guideline, EnrichedClinicalContext context)
    {
        var discriminators = GetPostTestDiscriminators(guideline, context);
        var supporting = guideline.Criteria.Where(c => c.Met).Select(c => c.Name).ToList();
        var against = guideline.Criteria.Where(c => !c.Met).Select(c => c.Name).ToList();

        var reasoning = BuildClinicalReasoning(guideline, context);

        return new CalibratedDiagnosis
        {
            Icd10Code = MapGuidelineToIcd10(guideline),
            DiagnosisName = MapGuidelineToDiagnosisName(guideline),
            PreTestProbability = guideline.PreTestProbability,
            RiskCategory = guideline.RiskCategory,
            ClinicalReasoning = reasoning,
            KeyDiscriminators = discriminators,
            SupportingFeatures = supporting,
            AgainstFeatures = against,
            GuidelineSource = guideline.SourceCitation,
            Source = "guideline",
        };
    }

    /// <summary>
    /// Get the discriminating tests for a guideline result.
    /// 
    /// Each guideline maps to specific tests with known sensitivity/specificity
    /// from published validation studies. The post-test probabilities tell
    /// the provider exactly how the result would change the picture.
    /// </summary>
    private IReadOnlyList<PostTestDiscriminator> GetPostTestDiscriminators(
        GuidelineResult guideline, EnrichedClinicalContext context)
    {
        var preTest = guideline.PreTestProbability;
        var discriminators = new List<PostTestDiscriminator>();

        // Match guideline name → specific discriminating tests
        if (guideline.GuidelineName.Contains("Wells") && guideline.GuidelineName.Contains("PE"))
        {
            discriminators.AddRange(GetPeDiscriminators(preTest, context));
        }
        else if (guideline.GuidelineName.Contains("HEART"))
        {
            discriminators.AddRange(GetAcsDiscriminators(preTest, context));
        }
        else if (guideline.GuidelineName.Contains("qSOFA") || guideline.GuidelineName.Contains("SOFA"))
        {
            discriminators.AddRange(GetSepsisDiscriminators(preTest, context));
        }
        else if (guideline.GuidelineName.Contains("CURB-65"))
        {
            discriminators.AddRange(GetPneumoniaDiscriminators(preTest, context));
        }
        else if (guideline.GuidelineName.Contains("Ottawa"))
        {
            discriminators.AddRange(GetAnkleDiscriminators(preTest));
        }

        return discriminators;
    }

    // ── PE discriminators (Wells PE → D-dimer / CTPA) ─────────────────────

    private static IEnumerable<PostTestDiscriminator> GetPeDiscriminators(
        decimal preTest, EnrichedClinicalContext context)
    {
        // D-dimer: sensitivity ~96%, specificity ~40% for PE
        // Age-adjusted: specificity improves to ~60% for patients >50
        var dDimerSpecificity = context.PatientAge > 50 ? 0.60m : 0.40m;
        const decimal dDimerSensitivity = 0.96m;

        var (dDimerPos, dDimerNeg) = BayesianUpdate(preTest, dDimerSensitivity, dDimerSpecificity);

        yield return new PostTestDiscriminator
        {
            TestName = "D-dimer",
            LoincCode = "48066-5",
            IfPositiveProbability = dDimerPos,
            IfPositiveDescription = $"Probability increases to ~{dDimerPos:P0}",
            IfNegativeProbability = dDimerNeg,
            IfNegativeDescription = preTest <= 0.23m
                ? $"PE effectively excluded (~{dDimerNeg:P0})"
                : $"Probability decreases to ~{dDimerNeg:P0} — CTPA may still be needed",
            Priority = preTest >= 0.49m ? "STAT" : "Urgent",
            CptCode = "85379",
        };

        // CTPA: sensitivity ~95%, specificity ~97%
        var (ctpaPos, ctpaNeg) = BayesianUpdate(preTest, 0.95m, 0.97m);

        yield return new PostTestDiscriminator
        {
            TestName = "CT Pulmonary Angiography (CTPA)",
            LoincCode = "36813-4",
            IfPositiveProbability = ctpaPos,
            IfPositiveDescription = $"PE confirmed (~{ctpaPos:P0})",
            IfNegativeProbability = ctpaNeg,
            IfNegativeDescription = $"PE effectively excluded (~{ctpaNeg:P0})",
            Priority = preTest >= 0.49m ? "STAT" : "Urgent",
            CptCode = "71275",
        };
    }

    // ── ACS discriminators (HEART Score → troponin / ECG) ─────────────────

    private static IEnumerable<PostTestDiscriminator> GetAcsDiscriminators(
        decimal preTest, EnrichedClinicalContext context)
    {
        // High-sensitivity Troponin I: sensitivity ~97%, specificity ~93% for MI
        var (tropPos, tropNeg) = BayesianUpdate(preTest, 0.97m, 0.93m);

        yield return new PostTestDiscriminator
        {
            TestName = "High-sensitivity Troponin I",
            LoincCode = "89579-7",
            IfPositiveProbability = tropPos,
            IfPositiveDescription = $"ACS probability increases to ~{tropPos:P0}",
            IfNegativeProbability = tropNeg,
            IfNegativeDescription = tropNeg < 0.02m
                ? $"MI effectively excluded (~{tropNeg:P0}) — serial troponin recommended"
                : $"Probability decreases to ~{tropNeg:P0} — consider serial troponin at 3h",
            Priority = "STAT",
            CptCode = "84484",
        };

        // Serial troponin at 3 hours (for patients where first is negative)
        if (preTest >= 0.10m)
        {
            yield return new PostTestDiscriminator
            {
                TestName = "Serial Troponin (3-hour repeat)",
                LoincCode = "89579-7",
                IfPositiveProbability = Math.Round(preTest * 0.85m / (preTest * 0.85m + (1 - preTest) * 0.02m), 2),
                IfPositiveDescription = "Dynamic rise confirms acute myocardial injury",
                IfNegativeProbability = Math.Round(preTest * 0.03m, 2),
                IfNegativeDescription = "No dynamic change — ACS very unlikely",
                Priority = "Urgent",
                CptCode = "84484",
            };
        }

        // 12-lead ECG
        var (ecgPos, ecgNeg) = BayesianUpdate(preTest, 0.55m, 0.95m);

        yield return new PostTestDiscriminator
        {
            TestName = "12-lead ECG (ST changes)",
            LoincCode = "11524-6",
            IfPositiveProbability = ecgPos,
            IfPositiveDescription = $"ST changes increase ACS probability to ~{ecgPos:P0}",
            IfNegativeProbability = ecgNeg,
            IfNegativeDescription = $"Normal ECG reduces but does not exclude (~{ecgNeg:P0})",
            Priority = "STAT",
            CptCode = "93000",
        };
    }

    // ── Sepsis discriminators (qSOFA → lactate / blood cultures) ──────────

    private static IEnumerable<PostTestDiscriminator> GetSepsisDiscriminators(
        decimal preTest, EnrichedClinicalContext context)
    {
        // Serum lactate: elevated (>2 mmol/L) has sensitivity ~83%, specificity ~60%
        var (lactatePos, lactateNeg) = BayesianUpdate(preTest, 0.83m, 0.60m);

        yield return new PostTestDiscriminator
        {
            TestName = "Serum Lactate",
            LoincCode = "2524-7",
            IfPositiveProbability = lactatePos,
            IfPositiveDescription = preTest >= 0.24m
                ? $"Lactate >2.0 supports sepsis (~{lactatePos:P0}). >4.0 = septic shock criteria."
                : $"Probability increases to ~{lactatePos:P0}",
            IfNegativeProbability = lactateNeg,
            IfNegativeDescription = $"Normal lactate decreases probability to ~{lactateNeg:P0}",
            Priority = "STAT",
            CptCode = "83605",
        };

        // Procalcitonin: sensitivity ~77%, specificity ~79% for bacterial infection
        var (pctPos, pctNeg) = BayesianUpdate(preTest, 0.77m, 0.79m);

        yield return new PostTestDiscriminator
        {
            TestName = "Procalcitonin",
            LoincCode = "75241-0",
            IfPositiveProbability = pctPos,
            IfPositiveDescription = $"Supports bacterial etiology (~{pctPos:P0})",
            IfNegativeProbability = pctNeg,
            IfNegativeDescription = $"Bacterial infection less likely (~{pctNeg:P0}). Consider viral etiology.",
            Priority = "STAT",
            CptCode = "84145",
        };

        yield return new PostTestDiscriminator
        {
            TestName = "Blood Cultures x2",
            LoincCode = "600-7",
            IfPositiveProbability = Math.Min(preTest + 0.30m, 0.95m),
            IfPositiveDescription = "Organism isolation confirms bacteremia — guides targeted therapy",
            IfNegativeProbability = preTest * 0.70m,
            IfNegativeDescription = "Negative cultures do not exclude sepsis (30-50% sensitivity)",
            Priority = "STAT",
            CptCode = "87040",
        };
    }

    // ── Pneumonia discriminators (CURB-65 → CXR / procalcitonin) ──────────

    private static IEnumerable<PostTestDiscriminator> GetPneumoniaDiscriminators(
        decimal preTest, EnrichedClinicalContext context)
    {
        // Chest X-ray: sensitivity ~75%, specificity ~90% for pneumonia
        var (cxrPos, cxrNeg) = BayesianUpdate(preTest, 0.75m, 0.90m);

        yield return new PostTestDiscriminator
        {
            TestName = "Chest X-ray (PA/Lateral)",
            LoincCode = "36643-5",
            IfPositiveProbability = cxrPos,
            IfPositiveDescription = $"Infiltrate confirms pneumonia (~{cxrPos:P0})",
            IfNegativeProbability = cxrNeg,
            IfNegativeDescription = $"No infiltrate reduces probability (~{cxrNeg:P0}) — consider CT if high suspicion",
            Priority = preTest >= 0.15m ? "Urgent" : "Routine",
            CptCode = "71046",
        };

        // Procalcitonin for bacterial vs viral
        var (pctPos, pctNeg) = BayesianUpdate(preTest, 0.77m, 0.79m);

        yield return new PostTestDiscriminator
        {
            TestName = "Procalcitonin",
            LoincCode = "75241-0",
            IfPositiveProbability = pctPos,
            IfPositiveDescription = $"Supports bacterial pneumonia (~{pctPos:P0}) — antibiotics indicated",
            IfNegativeProbability = pctNeg,
            IfNegativeDescription = $"Viral etiology more likely (~{pctNeg:P0}) — consider withholding antibiotics",
            Priority = "Urgent",
            CptCode = "84145",
        };

        // Sputum culture for high-severity
        if (preTest >= 0.09m)
        {
            yield return new PostTestDiscriminator
            {
                TestName = "Sputum Culture & Gram Stain",
                LoincCode = "635-3",
                IfPositiveProbability = Math.Min(preTest + 0.25m, 0.95m),
                IfPositiveDescription = "Organism ID guides targeted antibiotic therapy",
                IfNegativeProbability = preTest,
                IfNegativeDescription = "Negative sputum does not exclude pneumonia",
                Priority = "Urgent",
                CptCode = "87070",
            };
        }
    }

    // ── Ankle fracture discriminators (Ottawa Rules → X-ray) ──────────────

    private static IEnumerable<PostTestDiscriminator> GetAnkleDiscriminators(decimal preTest)
    {
        // Ankle X-ray: sensitivity ~93%, specificity ~88% for fractures
        var (xrayPos, xrayNeg) = BayesianUpdate(preTest, 0.93m, 0.88m);

        yield return new PostTestDiscriminator
        {
            TestName = "Ankle X-ray (3-view)",
            LoincCode = "37555-0",
            IfPositiveProbability = xrayPos,
            IfPositiveDescription = $"Fracture identified (~{xrayPos:P0})",
            IfNegativeProbability = xrayNeg,
            IfNegativeDescription = $"No fracture on X-ray (~{xrayNeg:P0}). Treat as soft tissue. " +
                "Return if unable to bear weight in 5-7 days.",
            Priority = "Routine",
            CptCode = "73600",
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BAYESIAN UPDATE
    //
    // Computes post-test probabilities using Bayes' theorem.
    // Input: pre-test probability, test sensitivity, test specificity
    // Output: (P(disease|test+), P(disease|test-))
    //
    // This is the mathematical foundation of evidence-based diagnostics.
    // The same math that clinicians learn but rarely compute in their heads.
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Bayesian update: given pre-test probability, sensitivity, and specificity,
    /// compute the post-test probabilities for positive and negative results.
    /// </summary>
    public static (decimal postPositive, decimal postNegative) BayesianUpdate(
        decimal preTestProbability, decimal sensitivity, decimal specificity)
    {
        // Guard against division by zero and edge cases
        preTestProbability = Math.Clamp(preTestProbability, 0.001m, 0.999m);
        sensitivity = Math.Clamp(sensitivity, 0.01m, 0.99m);
        specificity = Math.Clamp(specificity, 0.01m, 0.99m);

        // P(T+) = Sensitivity × PreTest + (1 - Specificity) × (1 - PreTest)
        var pTestPositive = sensitivity * preTestProbability +
                           (1 - specificity) * (1 - preTestProbability);

        // P(T-) = (1 - Sensitivity) × PreTest + Specificity × (1 - PreTest)
        var pTestNegative = (1 - sensitivity) * preTestProbability +
                           specificity * (1 - preTestProbability);

        // P(D|T+) = Sensitivity × PreTest / P(T+)
        var postPositive = pTestPositive > 0
            ? Math.Round(sensitivity * preTestProbability / pTestPositive, 2)
            : preTestProbability;

        // P(D|T-) = (1-Sensitivity) × PreTest / P(T-)
        var postNegative = pTestNegative > 0
            ? Math.Round((1 - sensitivity) * preTestProbability / pTestNegative, 2)
            : preTestProbability;

        return (postPositive, postNegative);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private string BuildClinicalReasoning(
        GuidelineResult guideline, EnrichedClinicalContext context)
    {
        var metCriteria = guideline.Criteria
            .Where(c => c.Met)
            .Select(c => c.PatientValue != null ? $"{c.Name} ({c.PatientValue})" : c.Name);

        var reasoning = $"{guideline.GuidelineName}: Score {guideline.Score}/{guideline.MaxScore} " +
                       $"({guideline.RiskCategory} risk, {guideline.PreTestProbability:P0} pre-test probability). ";

        var metList = metCriteria.ToList();
        if (metList.Count > 0)
            reasoning += $"Criteria met: {string.Join(", ", metList)}. ";

        // Add vital sign flags if relevant
        if (context.Vitals?.IsHemodynamicallyUnstable == true)
            reasoning += "HEMODYNAMICALLY UNSTABLE. ";
        if (context.Vitals?.IsHypoxic == true)
            reasoning += $"Hypoxic (SpO2: {context.Vitals.SpO2}%). ";

        return reasoning.TrimEnd();
    }

    private static string MapGuidelineToIcd10(GuidelineResult guideline)
    {
        return guideline.GuidelineName switch
        {
            var n when n.Contains("Wells") && n.Contains("PE") => "I26.99",
            var n when n.Contains("HEART") => "I21.9",
            var n when n.Contains("qSOFA") || n.Contains("SOFA") => "A41.9",
            var n when n.Contains("CURB-65") => "J18.9",
            var n when n.Contains("Ottawa") => "S82.899A",
            _ => string.Empty,
        };
    }

    private static string MapGuidelineToDiagnosisName(GuidelineResult guideline)
    {
        return guideline.GuidelineName switch
        {
            var n when n.Contains("Wells") && n.Contains("PE") => "Pulmonary Embolism",
            var n when n.Contains("HEART") => "Acute Coronary Syndrome",
            var n when n.Contains("qSOFA") || n.Contains("SOFA") => "Sepsis",
            var n when n.Contains("CURB-65") => "Community-Acquired Pneumonia",
            var n when n.Contains("Ottawa") => "Ankle/Foot Fracture",
            _ => guideline.GuidelineName.Replace("Criteria for ", "").Replace("Score for ", ""),
        };
    }

    private List<string> EvaluateRedFlags(EnrichedClinicalContext context)
    {
        var redFlags = new List<string>();
        try
        {
            var result = _redFlagEvaluator.Evaluate(
                context.ChiefComplaint, context.HpiNarrative, context.PainSeverity);
            if (result.HasRedFlags)
            {
                redFlags.AddRange(result.RedFlags.Select(f =>
                    $"[{f.Severity}] {f.Category}: {f.ClinicalReason}"));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Red flag evaluation failed — continuing without");
        }
        return redFlags;
    }

    private List<string> CheckDrugInteractions(EnrichedClinicalContext context)
    {
        var interactions = new List<string>();
        try
        {
            var medNames = context.GetMedicationNamesForInteractionCheck().ToList();
            if (medNames.Count < 2) return interactions;

            var seen = new HashSet<string>();
            for (int i = 0; i < medNames.Count; i++)
            {
                var others = medNames.Where((_, idx) => idx != i).ToList();
                var result = _drugInteractionService.CheckInteractions(medNames[i], others);
                foreach (var ix in result.Interactions)
                {
                    var key = string.Compare(ix.Drug1, ix.Drug2, StringComparison.OrdinalIgnoreCase) < 0
                        ? $"{ix.Drug1}|{ix.Drug2}" : $"{ix.Drug2}|{ix.Drug1}";
                    if (seen.Add(key))
                        interactions.Add($"{ix.Drug1} + {ix.Drug2}: {ix.Severity} — {ix.Description}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Drug interaction check failed — continuing without");
        }
        return interactions;
    }
}
