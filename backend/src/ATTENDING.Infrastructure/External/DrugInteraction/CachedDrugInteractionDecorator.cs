using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Interfaces;
using System.Text.Json;

namespace ATTENDING.Infrastructure.External.DrugInteraction;

/// <summary>
/// Configuration for drug interaction caching.
/// </summary>
public class DrugInteractionCacheOptions
{
    /// <summary>How long to cache interaction results (default: 7 days)</summary>
    public TimeSpan CacheDuration { get; set; } = TimeSpan.FromDays(7);

    /// <summary>How long to cache "no interactions found" results (shorter — data may update)</summary>
    public TimeSpan NegativeCacheDuration { get; set; } = TimeSpan.FromDays(1);

    /// <summary>Whether caching is enabled</summary>
    public bool Enabled { get; set; } = true;
}

/// <summary>
/// Caching decorator for IExternalDrugInteractionApi.
/// 
/// Strategy:
///   1. Check distributed cache (Redis or in-memory) for cached results
///   2. If cache hit → return immediately (zero API latency)
///   3. If cache miss → call inner API, cache the result, return
///   4. If inner API fails → check cache for stale results (serve stale > serve nothing)
///
/// Drug interaction data changes infrequently (weekly at most), so aggressive caching
/// is safe and dramatically reduces API call volume. The 7-day default means most
/// drug pair lookups never hit the external API after the first check.
/// 
/// This also serves as the offline resilience layer — when the external API is down,
/// previously-cached results are still available.
/// </summary>
public class CachedDrugInteractionDecorator : IExternalDrugInteractionApi
{
    private readonly IExternalDrugInteractionApi _inner;
    private readonly IDistributedCache _cache;
    private readonly DrugInteractionCacheOptions _options;
    private readonly ILogger<CachedDrugInteractionDecorator> _logger;

    private const string CacheKeyPrefix = "drug-interaction:";

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
        string newMedication,
        IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
            return await _inner.CheckInteractionsAsync(newMedication, currentMedications, cancellationToken);

        var medList = currentMedications.ToList();
        var cacheKey = BuildCacheKey("interactions", newMedication, medList);

        // 1. Try cache first
        var cached = await GetFromCacheAsync<ExternalDrugInteractionResult>(cacheKey, cancellationToken);
        if (cached != null)
        {
            _logger.LogDebug("Drug interaction cache HIT for {Drug} ({Count} current meds)",
                newMedication, medList.Count);
            return cached;
        }

        // 2. Cache miss — call inner API
        try
        {
            var result = await _inner.CheckInteractionsAsync(newMedication, medList, cancellationToken);

            if (result != null)
            {
                var duration = result.HasInteractions
                    ? _options.CacheDuration
                    : _options.NegativeCacheDuration;

                await SetCacheAsync(cacheKey, result, duration, cancellationToken);

                _logger.LogDebug("Drug interaction cache SET for {Drug}: {Count} interactions, TTL {Duration}",
                    newMedication, result.Interactions.Count, duration);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "External drug API failed. Checking stale cache for {Drug}.", newMedication);

            // 3. API failed — try stale cache (cache key with longer TTL marker)
            var staleKey = BuildCacheKey("interactions-stale", newMedication, medList);
            var stale = await GetFromCacheAsync<ExternalDrugInteractionResult>(staleKey, cancellationToken);
            if (stale != null)
            {
                _logger.LogInformation("Serving stale drug interaction cache for {Drug}", newMedication);
                return stale;
            }

            return null; // No cache, no API — caller falls back to local rules
        }
    }

    public async Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication,
        IEnumerable<string> allergies,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
            return await _inner.CheckAllergyConflictsAsync(medication, allergies, cancellationToken);

        var allergyList = allergies.ToList();
        var cacheKey = BuildCacheKey("allergy", medication, allergyList);

        var cached = await GetFromCacheAsync<ExternalDrugInteractionResult>(cacheKey, cancellationToken);
        if (cached != null)
            return cached;

        var result = await _inner.CheckAllergyConflictsAsync(medication, allergyList, cancellationToken);

        if (result != null)
        {
            await SetCacheAsync(cacheKey, result, _options.CacheDuration, cancellationToken);
        }

        return result;
    }

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
        => _inner.IsAvailableAsync(cancellationToken);

    /// <summary>
    /// Pre-warm the cache for a patient's active medication list.
    /// Called during patient context assembly to ensure drug checks are fast
    /// when the provider orders a new medication.
    /// </summary>
    public async Task PrewarmCacheAsync(
        IReadOnlyList<string> activeMedications,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled || activeMedications.Count < 2)
            return;

        // Check all pairwise combinations
        for (var i = 0; i < activeMedications.Count; i++)
        {
            var otherMeds = activeMedications
                .Where((_, idx) => idx != i)
                .ToList();

            var cacheKey = BuildCacheKey("interactions", activeMedications[i], otherMeds);
            var existing = await GetFromCacheAsync<ExternalDrugInteractionResult>(cacheKey, cancellationToken);

            if (existing == null)
            {
                // Not cached — fetch and cache
                try
                {
                    var result = await _inner.CheckInteractionsAsync(
                        activeMedications[i], otherMeds, cancellationToken);

                    if (result != null)
                    {
                        await SetCacheAsync(cacheKey, result, _options.CacheDuration, cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Cache prewarm failed for {Drug}. Will retry on next access.",
                        activeMedications[i]);
                    // Non-fatal — prewarm is best-effort
                }
            }
        }

        _logger.LogDebug("Drug interaction cache prewarmed for {Count} medications",
            activeMedications.Count);
    }

    #region Cache Helpers

    private static string BuildCacheKey(string prefix, string drug, IReadOnlyList<string> otherDrugs)
    {
        var normalized = otherDrugs
            .Select(d => d.ToLowerInvariant().Trim())
            .OrderBy(d => d)
            .ToList();
        var drugKey = drug.ToLowerInvariant().Trim();
        var othersKey = string.Join("|", normalized);
        return $"{CacheKeyPrefix}{prefix}:{drugKey}:{othersKey}";
    }

    private async Task<T?> GetFromCacheAsync<T>(string key, CancellationToken ct) where T : class
    {
        try
        {
            var bytes = await _cache.GetAsync(key, ct);
            if (bytes == null || bytes.Length == 0)
                return null;

            return JsonSerializer.Deserialize<T>(bytes);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Cache read failed for key {Key}", key);
            return null;
        }
    }

    private async Task SetCacheAsync<T>(string key, T value, TimeSpan duration, CancellationToken ct)
    {
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = duration
            };

            await _cache.SetAsync(key, bytes, options, ct);

            // Also set a stale copy with 3x TTL for fallback
            var staleKey = key.Replace($"{CacheKeyPrefix}interactions:", $"{CacheKeyPrefix}interactions-stale:");
            var staleOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = duration * 3
            };
            await _cache.SetAsync(staleKey, bytes, staleOptions, ct);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Cache write failed for key {Key}", key);
            // Non-fatal — cache miss will just refetch
        }
    }

    #endregion
}
