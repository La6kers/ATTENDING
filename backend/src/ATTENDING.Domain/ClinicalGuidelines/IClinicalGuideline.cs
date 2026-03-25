using ATTENDING.Domain.ValueObjects;

namespace ATTENDING.Domain.ClinicalGuidelines;

/// <summary>
/// Interface for evidence-based clinical decision rules.
/// 
/// Each guideline is a PURE DOMAIN OBJECT:
///   - Zero dependencies (no I/O, no network, no database)
///   - Takes typed clinical data, returns scored result
///   - Includes source citation for audit trail
///   - Runs at Tier 0 — always available, even offline
/// 
/// This is what makes ATTENDING fundamentally different from
/// "ask the AI what it thinks." The AI interprets scored guidelines;
/// it doesn't replace them. When AI is unavailable (Tier 2 down,
/// hospital server offline), guidelines still give the provider
/// actionable, evidence-based decision support.
/// 
/// Implementation pattern:
///   1. IsApplicable() checks if the guideline is relevant to this presentation
///   2. Evaluate() scores the criteria and returns a result
///   3. The result includes pre-test probability and specific recommendations
///   4. Source citation creates an auditable chain from recommendation to evidence
/// </summary>
public interface IClinicalGuideline
{
    /// <summary>Full name of the guideline (e.g., "Wells Criteria for PE")</summary>
    string GuidelineName { get; }

    /// <summary>Version/year (e.g., "Modified Wells, 2023")</summary>
    string Version { get; }

    /// <summary>Published source (DOI, journal citation, or guideline URL)</summary>
    string SourceCitation { get; }

    /// <summary>
    /// Chief complaints that trigger this guideline.
    /// Used by GuidelineEvaluator to determine which guidelines to run.
    /// </summary>
    string[] ApplicableComplaints { get; }

    /// <summary>
    /// Whether this guideline applies to the given clinical context.
    /// May check complaint, vitals, age, sex, etc.
    /// </summary>
    bool IsApplicable(GuidelineInput input);

    /// <summary>
    /// Score the clinical data against the guideline criteria.
    /// Returns structured result with score, risk category, and recommendation.
    /// </summary>
    GuidelineResult Evaluate(GuidelineInput input);
}

/// <summary>
/// Standardized input for all clinical guidelines.
/// Mapped from EnrichedClinicalContext in the Application layer.
/// Lives in Domain so guidelines have no Application dependency.
/// </summary>
public class GuidelineInput
{
    public int PatientAge { get; init; }
    public string PatientSex { get; init; } = string.Empty;
    public string ChiefComplaint { get; init; } = string.Empty;
    public string HpiNarrative { get; init; } = string.Empty;
    public Dictionary<string, string> OldcartsData { get; init; } = new();
    public int? PainSeverity { get; init; }
    public VitalSigns? Vitals { get; init; }
    public LabPanel? RecentLabs { get; init; }
    public IReadOnlyList<string> ActiveConditions { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> CurrentMedications { get; init; } = Array.Empty<string>();
    public bool? IsPregnant { get; init; }
    public bool? IsImmunocompromised { get; init; }
    public string? RecentTravel { get; init; }

    /// <summary>Check if chief complaint or HPI contains any of the given terms.</summary>
    public bool PresentationContains(params string[] terms)
    {
        var text = $"{ChiefComplaint} {HpiNarrative}".ToLowerInvariant();
        return terms.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>Check if OLDCARTS data for a given phase contains a term.</summary>
    public bool OldcartsContains(string phase, string term)
    {
        return OldcartsData.TryGetValue(phase, out var value) &&
               value.Contains(term, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Check if patient has a specific condition.</summary>
    public bool HasCondition(params string[] terms) =>
        ActiveConditions.Any(c => terms.Any(t => c.Contains(t, StringComparison.OrdinalIgnoreCase)));

    /// <summary>Check if patient is on a specific medication.</summary>
    public bool IsOnMedication(params string[] terms) =>
        CurrentMedications.Any(m => terms.Any(t => m.Contains(t, StringComparison.OrdinalIgnoreCase)));
}

/// <summary>
/// Result of evaluating a clinical guideline against patient data.
/// Every field is designed for both provider display and AI consumption.
/// </summary>
public record GuidelineResult(
    string GuidelineName,
    string SourceCitation,
    decimal Score,
    decimal MaxScore,
    string RiskCategory,
    decimal PreTestProbability,
    string Recommendation,
    IReadOnlyList<ScoredCriterion> Criteria)
{
    /// <summary>
    /// Format for inclusion in AI prompts.
    /// The AI sees this as structured context, not raw data to interpret.
    /// </summary>
    public string ToAiContext()
    {
        var metCriteria = Criteria.Where(c => c.Met).Select(c => c.Name);
        var unmetCriteria = Criteria.Where(c => !c.Met).Select(c => c.Name);

        return $"GUIDELINE: {GuidelineName} ({SourceCitation})\n" +
               $"  Score: {Score}/{MaxScore} -> {RiskCategory} risk\n" +
               $"  Pre-test probability: {PreTestProbability:P0}\n" +
               $"  Recommendation: {Recommendation}\n" +
               $"  Criteria met: {string.Join(", ", metCriteria)}\n" +
               $"  Criteria NOT met: {string.Join(", ", unmetCriteria)}";
    }
}

/// <summary>
/// A single scored criterion within a guideline evaluation.
/// </summary>
public record ScoredCriterion(
    string Name,
    bool Met,
    decimal Points,
    string? PatientValue);
