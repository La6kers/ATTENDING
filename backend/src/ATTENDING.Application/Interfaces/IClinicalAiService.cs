namespace ATTENDING.Application.Interfaces;

/// <summary>
/// Abstraction for external clinical AI services (Tier 2).
/// 
/// Implemented in Infrastructure by ClinicalAiService (BioMistral, etc.).
/// The TieredClinicalIntelligenceService depends on this interface,
/// not the concrete implementation — maintaining Clean Architecture boundaries.
/// 
/// When this service is unavailable, Tier 0 (pure domain logic) still provides
/// guideline scores, red flags, and drug interactions. AI enhances but never gates
/// clinical decision support.
/// </summary>
public interface IClinicalAiService
{
    /// <summary>
    /// Get AI-generated differential diagnosis based on clinical context.
    /// The AI receives guideline scores as anchoring context so its output
    /// is grounded in evidence rather than pure prediction.
    /// </summary>
    Task<AiDifferentialResult?> GetDifferentialDiagnosisAsync(
        string clinicalPrompt,
        string? guidelineContext = null,
        CancellationToken ct = default);

    /// <summary>
    /// Get AI-generated clinical recommendations (labs, imaging, treatment).
    /// </summary>
    Task<AiRecommendationResult?> GetRecommendationsAsync(
        string clinicalPrompt,
        string? guidelineContext = null,
        CancellationToken ct = default);

    /// <summary>
    /// Check if the AI service is currently reachable.
    /// Used by the orchestrator to skip Tier 2 quickly when unavailable.
    /// </summary>
    Task<bool> IsAvailableAsync(CancellationToken ct = default);
}

/// <summary>
/// AI differential diagnosis result.
/// Typed to prevent brittle object casts downstream.
/// </summary>
public class AiDifferentialResult
{
    public IReadOnlyList<AiDiagnosis> Diagnoses { get; init; } = Array.Empty<AiDiagnosis>();
    public string? RawResponse { get; init; }
    public string Model { get; init; } = string.Empty;
    public TimeSpan Latency { get; init; }
}

public class AiDiagnosis
{
    public string DiagnosisName { get; init; } = string.Empty;
    public string? Icd10Code { get; init; }
    public string Probability { get; init; } = string.Empty; // "High", "Moderate", "Low"
    public string? Reasoning { get; init; }
}

/// <summary>
/// AI recommendation result.
/// </summary>
public class AiRecommendationResult
{
    public IReadOnlyList<string> RecommendedLabs { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> RecommendedImaging { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> TreatmentSuggestions { get; init; } = Array.Empty<string>();
    public string? RawResponse { get; init; }
    public string Model { get; init; } = string.Empty;
    public TimeSpan Latency { get; init; }
}
