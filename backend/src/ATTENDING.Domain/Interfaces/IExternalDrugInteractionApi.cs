namespace ATTENDING.Domain.Interfaces;

/// <summary>
/// Contract for external drug interaction checking services (NIH DailyMed, First Databank, Medi-Span, etc.).
/// Implementations live in Infrastructure layer and call external APIs over HTTP.
/// 
/// The existing DrugInteractionService (hardcoded rules) serves as a fallback
/// when the external API is unavailable.
/// </summary>
public interface IExternalDrugInteractionApi
{
    /// <summary>
    /// Check drug-drug interactions via external API.
    /// Returns null if the API is unavailable (caller should fall back to local rules).
    /// </summary>
    Task<ExternalDrugInteractionResult?> CheckInteractionsAsync(
        string newMedication,
        IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check drug-allergy cross-reactivity via external API.
    /// Returns null if the API is unavailable.
    /// </summary>
    Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication,
        IEnumerable<string> allergies,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Whether the external service is currently reachable.
    /// </summary>
    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Interaction result from an external API.
/// Normalized to the same shape as the local DrugInteractionResult.
/// </summary>
public record ExternalDrugInteractionResult(
    IReadOnlyList<ExternalInteraction> Interactions,
    bool HasInteractions,
    bool HasContraindications,
    bool HasMajorInteractions,
    string SourceApi);

public record ExternalInteraction(
    string Drug1,
    string Drug2,
    string Severity,     // "Minor", "Moderate", "Major", "Contraindicated"
    string Description,
    string InteractionType,
    string? SourceReference);   // URL or ID for audit trail
