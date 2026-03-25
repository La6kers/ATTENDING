namespace ATTENDING.Domain.Interfaces;

/// <summary>
/// Clinical response caching service interface.
/// Caches AI inference responses (differential diagnoses, drug interactions, etc.)
/// to reduce latency and inference costs.
/// 
/// HIPAA Note: Cached responses contain NO PHI. Only clinical
/// pattern → result mappings are cached. Patient-specific
/// data is never stored in the cache layer.
/// </summary>
public interface IClinicalCacheService
{
    /// <summary>
    /// Get a cached value by key
    /// </summary>
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Set a cached value with optional TTL
    /// </summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Remove a cached value
    /// </summary>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove all cached values matching a prefix
    /// </summary>
    Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cached differential diagnosis for a symptom pattern
    /// </summary>
    Task<T?> GetDifferentialAsync<T>(string chiefComplaint, IEnumerable<string> symptoms, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Cache a differential diagnosis result
    /// </summary>
    Task SetDifferentialAsync<T>(string chiefComplaint, IEnumerable<string> symptoms, T result, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Get cached drug interaction result
    /// </summary>
    Task<T?> GetDrugInteractionAsync<T>(string medication, IEnumerable<string> currentMedications, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Cache a drug interaction result
    /// </summary>
    Task SetDrugInteractionAsync<T>(string medication, IEnumerable<string> currentMedications, T result, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Get cached lab recommendation
    /// </summary>
    Task<T?> GetLabRecommendationAsync<T>(string diagnosis, IEnumerable<string> symptoms, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Cache a lab recommendation result
    /// </summary>
    Task SetLabRecommendationAsync<T>(string diagnosis, IEnumerable<string> symptoms, T result, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Get cache statistics
    /// </summary>
    CacheStatistics GetStatistics();

    /// <summary>
    /// Reset cache statistics counters
    /// </summary>
    void ResetStatistics();
}

/// <summary>
/// Cache hit/miss statistics
/// </summary>
public class CacheStatistics
{
    public long Hits { get; set; }
    public long Misses { get; set; }
    public double HitRate => TotalQueries > 0 ? (double)Hits / TotalQueries * 100 : 0;
    public long TotalQueries => Hits + Misses;
    public decimal EstimatedSavingsUsd { get; set; }
}
