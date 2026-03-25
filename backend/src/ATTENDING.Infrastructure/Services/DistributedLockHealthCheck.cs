using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// Health check that verifies the distributed lock service is operational.
/// Attempts to acquire and release a test lock to confirm Redis connectivity
/// and lock semantics are working correctly.
///
/// This health check ensures that the ClinicalSchedulerService can reliably
/// acquire locks in multi-instance deployments. If this check fails, the
/// scheduler may not run at all (if using Redis) or may allow concurrent
/// execution on multiple nodes (causing duplicate notifications, double-billing,
/// etc.). In production, this health check should trigger an alert.
/// </summary>
public class DistributedLockHealthCheck : IHealthCheck
{
    private readonly IDistributedLockService _lockService;
    private readonly ILogger<DistributedLockHealthCheck> _logger;
    private const string TestLockKey = "health-check-lock";
    private const int LockTimeoutSeconds = 5;

    public DistributedLockHealthCheck(
        IDistributedLockService lockService,
        ILogger<DistributedLockHealthCheck> logger)
    {
        _lockService = lockService;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Attempt to acquire a test lock with short TTL
            await using var distributedLock = await _lockService.AcquireAsync(
                lockName: TestLockKey,
                expiry: TimeSpan.FromSeconds(LockTimeoutSeconds),
                retryCount: 0,          // no retry — we just want to know if we can acquire *right now*
                cancellationToken: cancellationToken);

            if (distributedLock.IsAcquired)
            {
                _logger.LogDebug(
                    "DistributedLockHealthCheck: Successfully acquired and released test lock (LockId: {LockId})",
                    distributedLock.LockId);

                return HealthCheckResult.Healthy(
                    "Distributed lock service is operational");
            }

            // Lock is held by another instance — still means the service is working.
            // This is not unusual in a multi-instance deployment; it just means
            // another node is running the same health check at the same time.
            _logger.LogInformation(
                "DistributedLockHealthCheck: Test lock held by another instance (expected in multi-node deployments)");

            return HealthCheckResult.Healthy(
                "Distributed lock service is operational (test lock held by another instance)");
        }
        catch (OperationCanceledException)
        {
            // Cancellation during lock acquisition — likely a timeout
            _logger.LogWarning(
                "DistributedLockHealthCheck: Lock acquisition was cancelled (possible timeout or shutdown)");

            return HealthCheckResult.Degraded(
                "Distributed lock service is slow or unresponsive");
        }
        catch (Exception ex)
        {
            // Redis unreachable, connection error, or other failure
            _logger.LogError(ex,
                "DistributedLockHealthCheck: Lock acquisition failed — distributed lock service may be unavailable");

            return HealthCheckResult.Unhealthy(
                "Distributed lock service is not operational",
                ex);
        }
    }
}
