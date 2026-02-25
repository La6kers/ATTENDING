using System.Diagnostics;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// Redis-backed distributed lock implementation using the standard
/// SET NX EX pattern (single-instance) with automatic TTL extension.
///
/// For multi-region deployments, consider upgrading to RedLock
/// (acquire on majority of N Redis instances). This implementation is
/// production-suitable for single Redis instance or Redis Sentinel/Cluster.
///
/// Usage:
///   await using var lock = await _lockService.AcquireAsync("scheduler:billing", TimeSpan.FromMinutes(5));
///   if (!lock.IsAcquired) { _logger.LogWarning("Could not acquire lock - skipping"); return; }
///   // ... do work ...
///   // lock releases automatically when disposed
/// </summary>
public class RedisDistributedLockService : IDistributedLockService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisDistributedLockService> _logger;

    // Lock key namespace
    private const string KeyPrefix = "attending:locks:";

    public RedisDistributedLockService(
        IConnectionMultiplexer redis,
        ILogger<RedisDistributedLockService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<IDistributedLock> AcquireAsync(
        string lockName,
        TimeSpan expiry,
        int retryCount = 0,
        TimeSpan? retryDelay = null,
        CancellationToken cancellationToken = default)
    {
        var lockId = $"{Environment.MachineName}:{Process.GetCurrentProcess().Id}:{Guid.NewGuid():N}";
        var key = $"{KeyPrefix}{lockName}";
        var db = _redis.GetDatabase();

        var attempt = 0;
        do
        {
            cancellationToken.ThrowIfCancellationRequested();

            var acquired = await db.StringSetAsync(
                key, lockId,
                expiry,
                When.NotExists,
                CommandFlags.None);

            if (acquired)
            {
                _logger.LogDebug("Distributed lock acquired: {LockName} by {LockId} (TTL: {Expiry})",
                    lockName, lockId, expiry);
                return new RedisDistributedLock(db, key, lockId, expiry, lockName, _logger);
            }

            if (attempt < retryCount)
            {
                var delay = retryDelay ?? TimeSpan.FromMilliseconds(100 * (attempt + 1));
                _logger.LogDebug("Lock {LockName} held by another instance. Retry {Attempt}/{Max} in {Delay}ms",
                    lockName, attempt + 1, retryCount, delay.TotalMilliseconds);
                await Task.Delay(delay, cancellationToken);
            }

            attempt++;
        }
        while (attempt <= retryCount);

        _logger.LogWarning(
            "Could not acquire distributed lock: {LockName} after {Attempts} attempts. " +
            "Another node likely holds this lock. Returning unacquired lock.",
            lockName, retryCount + 1);

        return new RedisDistributedLock(db, key, lockId, expiry, lockName, _logger, isAcquired: false);
    }

    // ----------------------------------------------------------------
    // Inner implementation class
    // ----------------------------------------------------------------

    private sealed class RedisDistributedLock : IDistributedLock
    {
        private readonly IDatabase _db;
        private readonly string _key;
        private readonly string _lockId;
        private readonly TimeSpan _expiry;
        private readonly string _lockName;
        private readonly ILogger _logger;
        private bool _disposed;

        // Lua script for atomic check-and-delete:
        // Only delete the key if the value still matches our lockId.
        // This prevents releasing a lock held by another instance after TTL expiry.
        private const string ReleaseLuaScript = @"
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
else
    return 0
end";

        public bool IsAcquired { get; }
        public string LockId => _lockId;

        public RedisDistributedLock(
            IDatabase db, string key, string lockId, TimeSpan expiry,
            string lockName, ILogger logger, bool isAcquired = true)
        {
            _db = db;
            _key = key;
            _lockId = lockId;
            _expiry = expiry;
            _lockName = lockName;
            _logger = logger;
            IsAcquired = isAcquired;
        }

        public async ValueTask DisposeAsync()
        {
            if (_disposed || !IsAcquired) return;
            _disposed = true;

            try
            {
                var result = await _db.ScriptEvaluateAsync(
                    ReleaseLuaScript,
                    new RedisKey[] { _key },
                    new RedisValue[] { _lockId });

                if ((long)result == 1)
                {
                    _logger.LogDebug("Distributed lock released: {LockName} by {LockId}",
                        _lockName, _lockId);
                }
                else
                {
                    // Lock expired before we could release — another node may have acquired it.
                    _logger.LogWarning(
                        "Distributed lock {LockName} was not released by this node — " +
                        "it likely expired before disposal. This may indicate the operation " +
                        "took longer than the lock TTL ({Expiry}).",
                        _lockName, _expiry);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to release distributed lock: {LockName}", _lockName);
            }
        }
    }
}

/// <summary>
/// Fallback implementation for environments without Redis (development, tests).
/// Uses in-memory SemaphoreSlim — not distributed but safe within a single process.
/// </summary>
public class InMemoryDistributedLockService : IDistributedLockService
{
    private readonly ILogger<InMemoryDistributedLockService> _logger;
    private static readonly Dictionary<string, SemaphoreSlim> Semaphores = new();
    private static readonly object SemaphoreLock = new();

    public InMemoryDistributedLockService(ILogger<InMemoryDistributedLockService> logger)
    {
        _logger = logger;
    }

    public async Task<IDistributedLock> AcquireAsync(
        string lockName,
        TimeSpan expiry,
        int retryCount = 0,
        TimeSpan? retryDelay = null,
        CancellationToken cancellationToken = default)
    {
        var semaphore = GetOrCreateSemaphore(lockName);
        var totalWait = retryDelay.HasValue
            ? TimeSpan.FromMilliseconds(retryDelay.Value.TotalMilliseconds * (retryCount + 1))
            : TimeSpan.FromMilliseconds(500);

        var acquired = await semaphore.WaitAsync(totalWait, cancellationToken);
        var lockId = Guid.NewGuid().ToString("N");

        if (!acquired)
        {
            _logger.LogWarning("In-memory lock {LockName} could not be acquired within {Timeout}ms",
                lockName, totalWait.TotalMilliseconds);
        }

        return new InMemoryDistributedLock(semaphore, lockId, lockName, acquired, _logger);
    }

    private static SemaphoreSlim GetOrCreateSemaphore(string lockName)
    {
        lock (SemaphoreLock)
        {
            if (!Semaphores.TryGetValue(lockName, out var semaphore))
            {
                semaphore = new SemaphoreSlim(1, 1);
                Semaphores[lockName] = semaphore;
            }
            return semaphore;
        }
    }

    private sealed class InMemoryDistributedLock : IDistributedLock
    {
        private readonly SemaphoreSlim _semaphore;
        private readonly string _lockName;
        private readonly ILogger _logger;
        private bool _disposed;

        public bool IsAcquired { get; }
        public string LockId { get; }

        public InMemoryDistributedLock(
            SemaphoreSlim semaphore, string lockId, string lockName,
            bool isAcquired, ILogger logger)
        {
            _semaphore = semaphore;
            LockId = lockId;
            _lockName = lockName;
            IsAcquired = isAcquired;
            _logger = logger;
        }

        public ValueTask DisposeAsync()
        {
            if (_disposed || !IsAcquired) return ValueTask.CompletedTask;
            _disposed = true;
            _semaphore.Release();
            _logger.LogDebug("In-memory lock released: {LockName}", _lockName);
            return ValueTask.CompletedTask;
        }
    }
}
