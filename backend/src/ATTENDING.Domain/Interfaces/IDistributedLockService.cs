namespace ATTENDING.Domain.Interfaces;

/// <summary>
/// Represents a distributed lock that can be acquired and released
/// across multiple instances of the application.
/// </summary>
public interface IDistributedLock : IAsyncDisposable
{
    /// <summary>
    /// Whether this lock instance currently holds the distributed lock.
    /// </summary>
    bool IsAcquired { get; }

    /// <summary>
    /// Unique identifier of this lock holder (for observability/debugging).
    /// </summary>
    string LockId { get; }
}

/// <summary>
/// Service for acquiring distributed locks across multiple application nodes.
/// Essential for preventing duplicate execution of scheduled jobs (billing,
/// notification dispatch, etc.) in multi-instance deployments.
/// </summary>
public interface IDistributedLockService
{
    /// <summary>
    /// Attempts to acquire a named distributed lock.
    /// </summary>
    /// <param name="lockName">Unique name identifying this lock (e.g., "scheduler:billing-jobs").</param>
    /// <param name="expiry">How long to hold the lock before auto-release (prevents dead-locks).</param>
    /// <param name="retryCount">Number of acquisition retries before giving up.</param>
    /// <param name="retryDelay">Delay between acquisition retries.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// An <see cref="IDistributedLock"/> instance.
    /// Check <see cref="IDistributedLock.IsAcquired"/> to confirm the lock was obtained.
    /// Always dispose the returned instance (use await using).
    /// </returns>
    Task<IDistributedLock> AcquireAsync(
        string lockName,
        TimeSpan expiry,
        int retryCount = 0,
        TimeSpan? retryDelay = null,
        CancellationToken cancellationToken = default);
}
