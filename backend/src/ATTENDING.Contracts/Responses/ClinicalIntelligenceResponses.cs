namespace ATTENDING.Contracts.Responses;

/// <summary>
/// Response from the Tiered Clinical Intelligence pipeline.
/// Tier 0 (guidelines, red flags, drug interactions) always runs.
/// Tier 2 (cloud AI) runs when available and adds richer differentials.
/// </summary>
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

// GuidelineResultItem and ScoredCriterionItem are defined in
// CalibratedDiagnosisResponses.cs — shared across both endpoints.
