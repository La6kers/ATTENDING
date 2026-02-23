using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.Caching;

/// <summary>
/// Redis-backed clinical response cache service.
/// 
/// Mirrors the TypeScript ClinicalCacheService from apps/shared/lib/redis/cacheService.ts.
/// Uses IDistributedCache so it works with both Redis (production) and in-memory (development).
///
/// Cache TTLs:
///   - Differential diagnosis: 24 hours (clinical patterns are stable)
///   - Drug interactions: 7 days (interaction databases change rarely)
///   - Lab recommendations: 24 hours
///   - Treatment recommendations: 24 hours
///   - Default: 1 hour
///
/// HIPAA Note: Only clinical pattern → result mappings are cached.
/// No PHI (patient names, MRNs, DOBs, etc.) is ever stored in cache keys or values.
/// </summary>
public class RedisClinicalCacheService : IClinicalCacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisClinicalCacheService> _logger;

    // Cache key namespace (matches TS: "attending:cache")
    private const string Namespace = "attending:cache";

    // TTL configuration
    private static readonly TimeSpan DifferentialTtl = TimeSpan.FromHours(24);
    private static readonly TimeSpan DrugInteractionTtl = TimeSpan.FromDays(7);
    private static readonly TimeSpan LabRecommendationTtl = TimeSpan.FromHours(24);
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromHours(1);

    // Estimated cost per AI inference call (for savings tracking)
    private const decimal CostPerInferenceUsd = 0.008m;

    // Thread-safe stats
    private long _hits;
    private long _misses;
    private decimal _estimatedSavings;

    // Track keys by prefix for prefix-based invalidation
    // In production with real Redis, use SCAN instead
    private readonly ConcurrentDictionary<string, byte> _keyRegistry = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public RedisClinicalCacheService(
        IDistributedCache cache,
        ILogger<RedisClinicalCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    // ========================================================
    // Generic Operations
    // ========================================================

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class
    {
        try
        {
            var data = await _cache.GetStringAsync(key, cancellationToken);
            if (data == null)
            {
                Interlocked.Increment(ref _misses);
                return null;
            }

            Interlocked.Increment(ref _hits);
            return JsonSerializer.Deserialize<T>(data, JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache GET failed for key {Key}", key);
            Interlocked.Increment(ref _misses);
            return null;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class
    {
        try
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration ?? DefaultTtl
            };

            var json = JsonSerializer.Serialize(value, JsonOptions);
            await _cache.SetStringAsync(key, json, options, cancellationToken);
            _keyRegistry.TryAdd(key, 0);
        }
        catch (Exception ex)
        {
            // Cache failures should never break the application
            _logger.LogWarning(ex, "Cache SET failed for key {Key}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await _cache.RemoveAsync(key, cancellationToken);
            _keyRegistry.TryRemove(key, out _);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache REMOVE failed for key {Key}", key);
        }
    }

    public async Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        try
        {
            var fullPrefix = $"{Namespace}:{prefix}";
            var keysToRemove = _keyRegistry.Keys
                .Where(k => k.StartsWith(fullPrefix, StringComparison.OrdinalIgnoreCase))
                .ToList();

            foreach (var key in keysToRemove)
            {
                await _cache.RemoveAsync(key, cancellationToken);
                _keyRegistry.TryRemove(key, out _);
            }

            _logger.LogInformation("Cache INVALIDATE: Removed {Count} entries matching '{Prefix}*'",
                keysToRemove.Count, fullPrefix);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache INVALIDATE failed for prefix {Prefix}", prefix);
        }
    }

    // ========================================================
    // Differential Diagnosis Cache
    // ========================================================

    public async Task<T?> GetDifferentialAsync<T>(
        string chiefComplaint,
        IEnumerable<string> symptoms,
        CancellationToken cancellationToken = default) where T : class
    {
        var key = BuildDifferentialKey(chiefComplaint, symptoms);
        var result = await GetAsync<T>(key, cancellationToken);

        if (result != null)
        {
            AddSavings();
            _logger.LogDebug("CACHE HIT: Differential for '{Complaint}' ({Count} symptoms)",
                chiefComplaint, symptoms.Count());
        }
        else
        {
            _logger.LogDebug("CACHE MISS: Differential for '{Complaint}' ({Count} symptoms)",
                chiefComplaint, symptoms.Count());
        }

        return result;
    }

    public Task SetDifferentialAsync<T>(
        string chiefComplaint,
        IEnumerable<string> symptoms,
        T result,
        CancellationToken cancellationToken = default) where T : class
    {
        var key = BuildDifferentialKey(chiefComplaint, symptoms);
        _logger.LogDebug("CACHE SET: Differential for '{Complaint}' (TTL: {Ttl})",
            chiefComplaint, DifferentialTtl);
        return SetAsync(key, result, DifferentialTtl, cancellationToken);
    }

    // ========================================================
    // Drug Interaction Cache
    // ========================================================

    public async Task<T?> GetDrugInteractionAsync<T>(
        string medication,
        IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default) where T : class
    {
        var key = BuildDrugInteractionKey(medication, currentMedications);
        var result = await GetAsync<T>(key, cancellationToken);

        if (result != null)
            AddSavings();

        return result;
    }

    public Task SetDrugInteractionAsync<T>(
        string medication,
        IEnumerable<string> currentMedications,
        T result,
        CancellationToken cancellationToken = default) where T : class
    {
        var key = BuildDrugInteractionKey(medication, currentMedications);
        return SetAsync(key, result, DrugInteractionTtl, cancellationToken);
    }

    // ========================================================
    // Lab Recommendation Cache
    // ========================================================

    public async Task<T?> GetLabRecommendationAsync<T>(
        string diagnosis,
        IEnumerable<string> symptoms,
        CancellationToken cancellationToken = default) where T : class
    {
        var key = BuildLabRecommendationKey(diagnosis, symptoms);
        var result = await GetAsync<T>(key, cancellationToken);

        if (result != null)
            AddSavings();

        return result;
    }

    public Task SetLabRecommendationAsync<T>(
        string diagnosis,
        IEnumerable<string> symptoms,
        T result,
        CancellationToken cancellationToken = default) where T : class
    {
        var key = BuildLabRecommendationKey(diagnosis, symptoms);
        return SetAsync(key, result, LabRecommendationTtl, cancellationToken);
    }

    // ========================================================
    // Statistics
    // ========================================================

    public CacheStatistics GetStatistics()
    {
        return new CacheStatistics
        {
            Hits = Interlocked.Read(ref _hits),
            Misses = Interlocked.Read(ref _misses),
            EstimatedSavingsUsd = _estimatedSavings
        };
    }

    public void ResetStatistics()
    {
        Interlocked.Exchange(ref _hits, 0);
        Interlocked.Exchange(ref _misses, 0);
        _estimatedSavings = 0;
    }

    // ========================================================
    // Key Builders — match TypeScript ClinicalCacheService keys
    // ========================================================

    private static string BuildDifferentialKey(string chiefComplaint, IEnumerable<string> symptoms)
    {
        var normalizedComplaint = NormalizeForKey(chiefComplaint);
        var normalizedSymptoms = string.Join("|", symptoms
            .Select(s => s.ToLowerInvariant().Trim())
            .Where(s => s.Length > 0)
            .OrderBy(s => s));

        return $"{Namespace}:diff:{normalizedComplaint}:{HashString(normalizedSymptoms)}";
    }

    private static string BuildDrugInteractionKey(string medication, IEnumerable<string> currentMedications)
    {
        var allDrugs = currentMedications
            .Append(medication)
            .Select(d => d.ToLowerInvariant().Trim())
            .OrderBy(d => d);

        return $"{Namespace}:drug:{HashString(string.Join("|", allDrugs))}";
    }

    private static string BuildLabRecommendationKey(string diagnosis, IEnumerable<string> symptoms)
    {
        var normalized = $"{diagnosis.ToLowerInvariant().Trim()}:{string.Join("|", symptoms.OrderBy(s => s))}";
        return $"{Namespace}:labs:{HashString(normalized)}";
    }

    /// <summary>
    /// Normalize a string for use in cache keys.
    /// Matches the TypeScript implementation.
    /// </summary>
    private static string NormalizeForKey(string value)
    {
        var sb = new StringBuilder(value.Length);
        foreach (var c in value.ToLowerInvariant().Trim())
        {
            if (char.IsLetterOrDigit(c))
                sb.Append(c);
            else if (char.IsWhiteSpace(c))
                sb.Append('_');
            // Skip other characters
        }
        return sb.ToString();
    }

    /// <summary>
    /// Simple hash for cache key generation.
    /// Uses SHA256 truncated to 12 chars for compact, collision-resistant keys.
    /// </summary>
    private static string HashString(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..12].ToLowerInvariant();
    }

    private void AddSavings()
    {
        // Thread-safe approximate addition
        _estimatedSavings += CostPerInferenceUsd;
    }
}
