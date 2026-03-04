using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.External.DrugInteraction;

/// <summary>
/// Aggregates results from multiple external drug interaction APIs.
/// 
/// Strategy:
///   1. Call all configured APIs in parallel (NIH RxNorm + OpenFDA, etc.)
///   2. Merge results, deduplicating by drug pair
///   3. For the same drug pair from multiple sources, keep the higher severity
///   4. If any API fails, others still contribute results
///
/// This gives the CompositeDrugInteractionService a single IExternalDrugInteractionApi
/// that transparently aggregates multiple data sources.
/// </summary>
public class MultiSourceDrugInteractionClient : IExternalDrugInteractionApi
{
    private readonly IReadOnlyList<IExternalDrugInteractionApi> _sources;
    private readonly ILogger<MultiSourceDrugInteractionClient> _logger;

    public MultiSourceDrugInteractionClient(
        IEnumerable<IExternalDrugInteractionApi> sources,
        ILogger<MultiSourceDrugInteractionClient> logger)
    {
        _sources = sources.ToList();
        _logger = logger;
    }

    public async Task<ExternalDrugInteractionResult?> CheckInteractionsAsync(
        string newMedication,
        IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default)
    {
        if (_sources.Count == 0)
            return null;

        var medList = currentMedications.ToList();

        // Call all sources in parallel
        var tasks = _sources.Select(source =>
            SafeCallAsync(source, s =>
                s.CheckInteractionsAsync(newMedication, medList, cancellationToken),
                cancellationToken));

        var results = await Task.WhenAll(tasks);
        var successfulResults = results.Where(r => r != null).ToList();

        if (successfulResults.Count == 0)
        {
            _logger.LogDebug("All {Count} drug interaction sources returned null for {Drug}",
                _sources.Count, newMedication);
            return null;
        }

        return MergeMultiSourceResults(successfulResults!);
    }

    public async Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication,
        IEnumerable<string> allergies,
        CancellationToken cancellationToken = default)
    {
        if (_sources.Count == 0)
            return null;

        var allergyList = allergies.ToList();

        var tasks = _sources.Select(source =>
            SafeCallAsync(source, s =>
                s.CheckAllergyConflictsAsync(medication, allergyList, cancellationToken),
                cancellationToken));

        var results = await Task.WhenAll(tasks);
        var successfulResults = results.Where(r => r != null).ToList();

        if (successfulResults.Count == 0)
            return null;

        return MergeMultiSourceResults(successfulResults!);
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        // Available if any source is available
        var tasks = _sources.Select(s => SafeAvailableCheck(s, cancellationToken));
        var results = await Task.WhenAll(tasks);
        return results.Any(r => r);
    }

    private async Task<ExternalDrugInteractionResult?> SafeCallAsync(
        IExternalDrugInteractionApi source,
        Func<IExternalDrugInteractionApi, Task<ExternalDrugInteractionResult?>> call,
        CancellationToken ct)
    {
        try
        {
            return await call(source);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Drug interaction source {Source} failed. Continuing with other sources.",
                source.GetType().Name);
            return null;
        }
    }

    private async Task<bool> SafeAvailableCheck(IExternalDrugInteractionApi source, CancellationToken ct)
    {
        try
        {
            return await source.IsAvailableAsync(ct);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Merge results from multiple sources, deduplicating by normalized drug pair.
    /// Higher severity wins when the same pair appears in multiple sources.
    /// </summary>
    private static ExternalDrugInteractionResult MergeMultiSourceResults(
        IReadOnlyList<ExternalDrugInteractionResult> results)
    {
        var mergedInteractions = new Dictionary<string, ExternalInteraction>(StringComparer.OrdinalIgnoreCase);
        var allSources = new List<string>();

        foreach (var result in results)
        {
            allSources.Add(result.SourceApi);

            foreach (var interaction in result.Interactions)
            {
                var pairKey = NormalizePairKey(interaction.Drug1, interaction.Drug2);

                if (mergedInteractions.TryGetValue(pairKey, out var existing))
                {
                    // Keep the higher severity
                    if (SeverityRank(interaction.Severity) > SeverityRank(existing.Severity))
                    {
                        mergedInteractions[pairKey] = interaction with
                        {
                            Description = $"{interaction.Description} [Also flagged by {existing.SourceReference}]"
                        };
                    }
                }
                else
                {
                    mergedInteractions[pairKey] = interaction;
                }
            }
        }

        var merged = mergedInteractions.Values.ToList();
        var sourceLabel = string.Join("+", allSources.Distinct());

        return new ExternalDrugInteractionResult(
            merged,
            merged.Count > 0,
            merged.Any(i => i.Severity == "Contraindicated"),
            merged.Any(i => i.Severity == "Major"),
            sourceLabel);
    }

    private static string NormalizePairKey(string drug1, string drug2)
    {
        var a = drug1.ToLowerInvariant();
        var b = drug2.ToLowerInvariant();
        return string.Compare(a, b, StringComparison.Ordinal) <= 0
            ? $"{a}|{b}" : $"{b}|{a}";
    }

    private static int SeverityRank(string severity) => severity switch
    {
        "Contraindicated" => 4,
        "Major" => 3,
        "Moderate" => 2,
        "Minor" => 1,
        _ => 0
    };
}
