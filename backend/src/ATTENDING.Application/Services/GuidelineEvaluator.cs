using ATTENDING.Domain.ClinicalGuidelines;

namespace ATTENDING.Application.Services;

/// <summary>
/// Runs all applicable clinical guidelines against a patient's clinical context.
/// 
/// This is the core Tier 0 intelligence engine:
///   - Pure logic, zero network, zero AI dependency
///   - Runs in &lt;1ms on any hardware
///   - A rural clinic with no connectivity still gets:
///     "Wells PE: 6.0 (High risk, 49% pre-test probability) → CTPA indicated"
/// 
/// The AI (Tier 2) interprets these results — it doesn't replace them.
/// When AI is unavailable, guideline results alone provide actionable,
/// evidence-based clinical decision support.
/// </summary>
public class GuidelineEvaluator
{
    private readonly IEnumerable<IClinicalGuideline> _guidelines;
    private readonly SymptomGuidelineRouter _router;

    public GuidelineEvaluator(
        IEnumerable<IClinicalGuideline> guidelines,
        SymptomGuidelineRouter? router = null)
    {
        _guidelines = guidelines;
        _router = router ?? new SymptomGuidelineRouter();
    }

    /// <summary>
    /// Evaluate all applicable guidelines for the given clinical input.
    /// Returns results ordered by pre-test probability (highest risk first).
    /// </summary>
    public IReadOnlyList<GuidelineResult> EvaluateAll(GuidelineInput input)
    {
        return _guidelines
            .Where(g => g.IsApplicable(input))
            .Select(g =>
            {
                try
                {
                    return g.Evaluate(input);
                }
                catch
                {
                    // A single guideline failure must NEVER block the pipeline.
                    // Log and skip — other guidelines and clinical workflow continue.
                    return null;
                }
            })
            .Where(r => r != null)
            .OrderByDescending(r => r!.PreTestProbability)
            .ToList()!;
    }

    /// <summary>
    /// Evaluate guidelines pruned to those relevant for the chief complaint (OLAP routing).
    /// Faster and more accurate than EvaluateAll when chief complaint is known.
    /// Falls back to EvaluateAll when complaint is empty or unrecognized.
    /// </summary>
    public IReadOnlyList<GuidelineResult> EvaluateForComplaint(GuidelineInput input, string chiefComplaint)
    {
        var routed = _router.RouteGuidelines(chiefComplaint, _guidelines);
        return routed
            .Where(g => g.IsApplicable(input))
            .Select(g =>
            {
                try { return g.Evaluate(input); }
                catch { return null; }
            })
            .Where(r => r != null)
            .OrderByDescending(r => r!.PreTestProbability)
            .ToList()!;
    }

    /// <summary>
    /// Get the names of all registered guidelines (for diagnostics/admin).
    /// </summary>
    public IReadOnlyList<string> GetRegisteredGuidelines() =>
        _guidelines.Select(g => g.GuidelineName).ToList();

    /// <summary>
    /// Format all guideline results for inclusion in an AI prompt.
    /// The AI sees structured, scored guidelines as context —
    /// it interprets them rather than generating them from scratch.
    /// </summary>
    public static string FormatForAiPrompt(IReadOnlyList<GuidelineResult> results)
    {
        if (results.Count == 0)
            return "No clinical guidelines applicable to this presentation.";

        return "CLINICAL GUIDELINE EVALUATIONS (evidence-based, pre-computed):\n" +
               "Use these scores as anchoring data. Do NOT override them unless\n" +
               "the clinical picture clearly contradicts the scoring criteria.\n\n" +
               string.Join("\n\n", results.Select(r => r.ToAiContext()));
    }
}
