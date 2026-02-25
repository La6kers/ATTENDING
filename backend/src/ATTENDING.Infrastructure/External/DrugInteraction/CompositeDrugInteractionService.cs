using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Infrastructure.External.DrugInteraction;

/// <summary>
/// Composite drug interaction service that checks an external API first
/// and falls back to the local hardcoded rules if the external API is
/// unavailable or returns no results.
///
/// Strategy:
///   1. Call external API (NIH RxNorm, First Databank, etc.)
///   2. If external returns results → use them (broader, more current database)
///   3. If external returns null/fails → use local DrugInteractionService (always available)
///   4. For allergy checks → always use local (NIH doesn't have allergy cross-reactivity)
///
/// This ensures clinical safety is never degraded by API outages.
/// </summary>
public class CompositeDrugInteractionService : IDrugInteractionService
{
    private readonly DrugInteractionService _localService;
    private readonly IExternalDrugInteractionApi _externalApi;
    private readonly ILogger<CompositeDrugInteractionService> _logger;

    public CompositeDrugInteractionService(
        IExternalDrugInteractionApi externalApi,
        ILogger<CompositeDrugInteractionService> logger)
    {
        _localService = new DrugInteractionService();
        _externalApi = externalApi;
        _logger = logger;
    }

    public DrugInteractionResult CheckInteractions(string newMedication, IEnumerable<string> currentMedications)
    {
        // Try external API asynchronously — but this interface is sync.
        // Use the async wrapper. In production, consider making the interface async.
        ExternalDrugInteractionResult? externalResult = null;
        try
        {
            externalResult = _externalApi.CheckInteractionsAsync(
                newMedication, currentMedications, CancellationToken.None)
                .GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "External drug interaction API failed. Using local rules.");
        }

        // If external API returned results, merge with local for maximum coverage
        if (externalResult is { HasInteractions: true })
        {
            _logger.LogInformation(
                "External API ({Source}) found {Count} interactions for {Drug}",
                externalResult.SourceApi, externalResult.Interactions.Count, newMedication);

            var localResult = _localService.CheckInteractions(newMedication, currentMedications);
            return MergeResults(externalResult, localResult);
        }

        // External unavailable or found nothing — use local rules
        return _localService.CheckInteractions(newMedication, currentMedications);
    }

    public DrugInteractionResult CheckAllergyConflicts(string medication, IEnumerable<string> allergies)
    {
        // Allergy cross-reactivity is handled entirely by local rules
        // (external APIs typically don't cover this well)
        return _localService.CheckAllergyConflicts(medication, allergies);
    }

    /// <summary>
    /// Merge external API results with local rules, deduplicating by drug pair.
    /// External results take precedence for the same drug pair (more current data).
    /// </summary>
    private static DrugInteractionResult MergeResults(
        ExternalDrugInteractionResult external,
        DrugInteractionResult local)
    {
        var merged = new List<FoundInteraction>();
        var seenPairs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Add external results first (higher priority)
        foreach (var ext in external.Interactions)
        {
            var pairKey = NormalizePairKey(ext.Drug1, ext.Drug2);
            if (seenPairs.Add(pairKey))
            {
                merged.Add(new FoundInteraction(
                    ext.Drug1,
                    ext.Drug2,
                    MapSeverity(ext.Severity),
                    ext.Description,
                    $"{ext.InteractionType} [Source: {ext.SourceReference}]"));
            }
        }

        // Add local results that weren't covered by external
        foreach (var loc in local.Interactions)
        {
            var pairKey = NormalizePairKey(loc.Drug1, loc.Drug2);
            if (seenPairs.Add(pairKey))
            {
                merged.Add(loc);
            }
        }

        return new DrugInteractionResult(
            merged,
            merged.Count > 0,
            merged.Any(i => i.Severity == InteractionSeverity.Contraindicated),
            merged.Any(i => i.Severity == InteractionSeverity.Major));
    }

    private static string NormalizePairKey(string drug1, string drug2)
    {
        var a = drug1.ToLowerInvariant();
        var b = drug2.ToLowerInvariant();
        return string.Compare(a, b, StringComparison.Ordinal) <= 0
            ? $"{a}|{b}"
            : $"{b}|{a}";
    }

    private static InteractionSeverity MapSeverity(string severity)
    {
        return severity switch
        {
            "Contraindicated" => InteractionSeverity.Contraindicated,
            "Major" => InteractionSeverity.Major,
            "Moderate" => InteractionSeverity.Moderate,
            "Minor" => InteractionSeverity.Minor,
            _ => InteractionSeverity.Moderate
        };
    }
}
