using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.External.DrugInteraction;

// ── OpenFDA ──────────────────────────────────────────────────────────────

/// <summary>
/// Configuration for OpenFDA Adverse Event API.
/// </summary>
public class OpenFdaOptions
{
    public string BaseUrl { get; set; } = "https://api.fda.gov/drug/event.json";
    public string? ApiKey { get; set; }
    public int TimeoutSeconds { get; set; } = 10;
}

/// <summary>
/// OpenFDA Adverse Event Signal client.
/// Queries post-market adverse event reports for co-prescribed drugs.
/// Returns null on failure — the composite will fall back to local rules.
/// </summary>
public class OpenFdaAdverseEventClient : IExternalDrugInteractionApi
{
    private readonly HttpClient _httpClient;
    private readonly OpenFdaOptions _options;
    private readonly ILogger<OpenFdaAdverseEventClient> _logger;

    public OpenFdaAdverseEventClient(
        HttpClient httpClient,
        OpenFdaOptions options,
        ILogger<OpenFdaAdverseEventClient> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
        _httpClient.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds);
    }

    public async Task<ExternalDrugInteractionResult?> CheckInteractionsAsync(
        string newMedication, IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Query OpenFDA for adverse events involving the new medication + any current medication
            var currentList = currentMedications.ToList();
            if (currentList.Count == 0)
                return new ExternalDrugInteractionResult([], false, false, false, "OpenFDA");

            var interactions = new List<ExternalInteraction>();

            foreach (var current in currentList.Take(5)) // Limit API calls
            {
                var query = $"patient.drug.openfda.generic_name:\"{newMedication}\"+AND+" +
                            $"patient.drug.openfda.generic_name:\"{current}\"";
                var url = $"{_options.BaseUrl}?search={Uri.EscapeDataString(query)}&limit=5";

                if (!string.IsNullOrEmpty(_options.ApiKey))
                    url += $"&api_key={_options.ApiKey}";

                var response = await _httpClient.GetAsync(url, cancellationToken);
                if (!response.IsSuccessStatusCode) continue;

                var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
                if (json.TryGetProperty("meta", out var meta) &&
                    meta.TryGetProperty("results", out var results) &&
                    results.TryGetProperty("total", out var total) &&
                    total.GetInt32() > 10)
                {
                    interactions.Add(new ExternalInteraction(
                        Drug1: newMedication,
                        Drug2: current,
                        Severity: total.GetInt32() > 100 ? "Major" : "Moderate",
                        Description: $"{total.GetInt32()} adverse event reports involving both {newMedication} and {current}.",
                        InteractionType: "Adverse Event Signal",
                        SourceReference: "OpenFDA-FAERS"));
                }
            }

            return new ExternalDrugInteractionResult(
                interactions, interactions.Count > 0,
                false, interactions.Any(i => i.Severity == "Major"), "OpenFDA");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "OpenFDA adverse event API call failed.");
            return null;
        }
    }

    public Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication, IEnumerable<string> allergies,
        CancellationToken cancellationToken = default)
        => Task.FromResult<ExternalDrugInteractionResult?>(null);

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"{_options.BaseUrl}?search=patient.drug.openfda.generic_name:\"aspirin\"&limit=1",
                cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch { return false; }
    }
}

// ── Multi-Source Aggregator ──────────────────────────────────────────────

/// <summary>
/// Runs multiple IExternalDrugInteractionApi sources in parallel
/// and merges the results. Any source that fails is silently skipped.
/// </summary>
public class MultiSourceDrugInteractionClient : IExternalDrugInteractionApi
{
    private readonly IExternalDrugInteractionApi[] _sources;
    private readonly ILogger<MultiSourceDrugInteractionClient> _logger;

    public MultiSourceDrugInteractionClient(
        IExternalDrugInteractionApi[] sources,
        ILogger<MultiSourceDrugInteractionClient> logger)
    {
        _sources = sources;
        _logger = logger;
    }

    public async Task<ExternalDrugInteractionResult?> CheckInteractionsAsync(
        string newMedication, IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default)
    {
        var currentList = currentMedications.ToList();
        var tasks = _sources.Select(s =>
            s.CheckInteractionsAsync(newMedication, currentList, cancellationToken));

        var results = await Task.WhenAll(tasks);
        return MergeResults(results);
    }

    public async Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication, IEnumerable<string> allergies,
        CancellationToken cancellationToken = default)
    {
        var allergyList = allergies.ToList();
        var tasks = _sources.Select(s =>
            s.CheckAllergyConflictsAsync(medication, allergyList, cancellationToken));

        var results = await Task.WhenAll(tasks);
        return MergeResults(results);
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        var tasks = _sources.Select(s => s.IsAvailableAsync(cancellationToken));
        var results = await Task.WhenAll(tasks);
        return results.Any(r => r);
    }

    private static ExternalDrugInteractionResult? MergeResults(ExternalDrugInteractionResult?[] results)
    {
        var validResults = results.Where(r => r != null).ToList();
        if (validResults.Count == 0) return null;

        var allInteractions = validResults.SelectMany(r => r!.Interactions).ToList();
        var sources = string.Join("+", validResults.Select(r => r!.SourceApi));

        return new ExternalDrugInteractionResult(
            allInteractions,
            allInteractions.Count > 0,
            allInteractions.Any(i => i.Severity == "Contraindicated"),
            allInteractions.Any(i => i.Severity == "Major"),
            sources);
    }
}

// ── Caching Decorator ────────────────────────────────────────────────────

/// <summary>
/// Configuration for the drug interaction distributed cache layer.
/// </summary>
public class DrugInteractionCacheOptions
{
    public int AbsoluteExpirationMinutes { get; set; } = 60;
    public int SlidingExpirationMinutes { get; set; } = 15;
}

/// <summary>
/// Distributed cache decorator for IExternalDrugInteractionApi.
/// Cache key = sorted drug pair hash. Prevents redundant API calls
/// for the same drug combinations across concurrent clinical sessions.
/// </summary>
public class CachedDrugInteractionDecorator : IExternalDrugInteractionApi
{
    private readonly IExternalDrugInteractionApi _inner;
    private readonly IDistributedCache _cache;
    private readonly DrugInteractionCacheOptions _options;
    private readonly ILogger<CachedDrugInteractionDecorator> _logger;

    public CachedDrugInteractionDecorator(
        IExternalDrugInteractionApi inner,
        IDistributedCache cache,
        DrugInteractionCacheOptions options,
        ILogger<CachedDrugInteractionDecorator> logger)
    {
        _inner = inner;
        _cache = cache;
        _options = options;
        _logger = logger;
    }

    public async Task<ExternalDrugInteractionResult?> CheckInteractionsAsync(
        string newMedication, IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default)
    {
        var currentList = currentMedications.ToList();
        var cacheKey = BuildCacheKey("ddi", newMedication, currentList);

        try
        {
            var cached = await _cache.GetStringAsync(cacheKey, cancellationToken);
            if (cached != null)
            {
                _logger.LogDebug("Cache hit for drug interaction check: {Key}", cacheKey);
                return System.Text.Json.JsonSerializer.Deserialize<ExternalDrugInteractionResult>(cached);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache read failed for {Key}", cacheKey);
        }

        var result = await _inner.CheckInteractionsAsync(newMedication, currentList, cancellationToken);

        if (result != null)
        {
            try
            {
                var json = System.Text.Json.JsonSerializer.Serialize(result);
                await _cache.SetStringAsync(cacheKey, json, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_options.AbsoluteExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_options.SlidingExpirationMinutes)
                }, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cache write failed for {Key}", cacheKey);
            }
        }

        return result;
    }

    public Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication, IEnumerable<string> allergies,
        CancellationToken cancellationToken = default)
        => _inner.CheckAllergyConflictsAsync(medication, allergies, cancellationToken);

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
        => _inner.IsAvailableAsync(cancellationToken);

    private static string BuildCacheKey(string prefix, string newMed, List<string> currentMeds)
    {
        var sorted = currentMeds.Append(newMed).OrderBy(m => m, StringComparer.OrdinalIgnoreCase).ToList();
        var hash = string.Join("|", sorted).GetHashCode();
        return $"attending:{prefix}:{hash:X8}";
    }
}
