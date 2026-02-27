using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// Background scheduler for recurring clinical platform jobs.
///
/// Uses distributed locks to guarantee that each job runs on exactly one node
/// in a multi-instance deployment — critical for preventing duplicate
/// notifications, double-billing, or redundant PHI access log entries.
///
/// Jobs implemented:
///   - CriticalLabResultSweep: Alerts on un-notified critical lab values (every 2 min)
///   - StaleEncounterSweep: Identifies encounters left open past expected duration (every 10 min)
///
/// Lock pattern:
///   1. Try to acquire a distributed lock (TTL slightly longer than interval)
///   2. Acquired  → run job → lock auto-releases on DisposeAsync
///   3. Not acquired → another node is already running this job → skip cycle
/// </summary>
public class ClinicalSchedulerService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IDistributedLockService _lockService;
    private readonly ILogger<ClinicalSchedulerService> _logger;

    // Job intervals
    private static readonly TimeSpan CriticalLabSweepInterval = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan StaleEncounterSweepInterval = TimeSpan.FromMinutes(10);

    // Lock TTLs — longer than interval so a slow job keeps its lock
    private static readonly TimeSpan CriticalLabLockTtl = TimeSpan.FromMinutes(4);
    private static readonly TimeSpan StaleEncounterLockTtl = TimeSpan.FromMinutes(15);

    // Distributed lock key namespace
    private const string CriticalLabLockKey = "scheduler:critical-lab-sweep";
    private const string StaleEncounterLockKey = "scheduler:stale-encounter-sweep";

    public ClinicalSchedulerService(
        IServiceProvider services,
        IDistributedLockService lockService,
        ILogger<ClinicalSchedulerService> logger)
    {
        _services = services;
        _lockService = lockService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ClinicalSchedulerService starting on node {Node}",
            Environment.MachineName);

        // Run all job loops in parallel on independent timers
        await Task.WhenAll(
            RunJobLoopAsync(
                jobName: "CriticalLabResultSweep",
                lockKey: CriticalLabLockKey,
                lockTtl: CriticalLabLockTtl,
                interval: CriticalLabSweepInterval,
                jobAction: RunCriticalLabResultSweepAsync,
                stoppingToken),

            RunJobLoopAsync(
                jobName: "StaleEncounterSweep",
                lockKey: StaleEncounterLockKey,
                lockTtl: StaleEncounterLockTtl,
                interval: StaleEncounterSweepInterval,
                jobAction: RunStaleEncounterSweepAsync,
                stoppingToken));

        _logger.LogInformation("ClinicalSchedulerService stopped");
    }

    // ----------------------------------------------------------------
    // Generic job loop: wait → try lock → run → repeat
    // ----------------------------------------------------------------

    private async Task RunJobLoopAsync(
        string jobName,
        string lockKey,
        TimeSpan lockTtl,
        TimeSpan interval,
        Func<IServiceScope, CancellationToken, Task> jobAction,
        CancellationToken stoppingToken)
    {
        // Stagger job starts to prevent thundering herd on service startup
        var startDelay = TimeSpan.FromSeconds(Random.Shared.Next(2, 15));
        _logger.LogDebug("Scheduler job {JobName} will start in {Delay}s", jobName, startDelay.TotalSeconds);
        await Task.Delay(startDelay, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var cycleStart = DateTime.UtcNow;

            try
            {
                await using var distributedLock = await _lockService.AcquireAsync(
                    lockName: lockKey,
                    expiry: lockTtl,
                    retryCount: 0,          // no retry — skip if another node holds the lock
                    cancellationToken: stoppingToken);

                if (!distributedLock.IsAcquired)
                {
                    _logger.LogDebug(
                        "Scheduler job {JobName} skipped this cycle — lock held by another node",
                        jobName);
                }
                else
                {
                    _logger.LogDebug(
                        "Scheduler job {JobName} starting (lockId: {LockId})",
                        jobName, distributedLock.LockId);

                    using var scope = _services.CreateScope();
                    // Background jobs have no authenticated user, so no TenantId.
                    // Enable admin context explicitly so repositories can query across tenants.
                    scope.ServiceProvider.GetRequiredService<AttendingDbContext>().EnableAdminContext();
                    await jobAction(scope, stoppingToken);

                    var elapsed = DateTime.UtcNow - cycleStart;
                    _logger.LogInformation(
                        "Scheduler job {JobName} completed in {ElapsedMs:F0}ms",
                        jobName, elapsed.TotalMilliseconds);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful shutdown — exit loop
                break;
            }
            catch (Exception ex)
            {
                // Non-fatal: log and continue — job will retry on next interval
                _logger.LogError(ex,
                    "Scheduler job {JobName} threw an unhandled exception. Will retry next interval.",
                    jobName);
            }

            // Wait out the remainder of the interval before next cycle
            var elapsed2 = DateTime.UtcNow - cycleStart;
            var remaining = interval - elapsed2;
            if (remaining > TimeSpan.Zero)
            {
                await Task.Delay(remaining, stoppingToken);
            }
        }
    }

    // ================================================================
    // Job implementations
    // ================================================================

    /// <summary>
    /// Sweeps for critical lab results and emits alerts.
    /// Critical values (e.g. dangerously low Hgb, critical troponin) require
    /// immediate clinical action and must not be silently dropped.
    ///
    /// Production enhancement: integrate with SignalR notification hub
    /// to push real-time alerts to providers at their workstation.
    /// </summary>
    private async Task RunCriticalLabResultSweepAsync(
        IServiceScope scope, CancellationToken ct)
    {
        var labRepo = scope.ServiceProvider.GetRequiredService<ILabOrderRepository>();

        // Uses the existing GetCriticalResultsAsync — returns orders with critical result values
        var criticalOrders = await labRepo.GetCriticalResultsAsync(ct);

        if (!criticalOrders.Any())
        {
            _logger.LogDebug("CriticalLabResultSweep: no critical results found");
            return;
        }

        // Emit a high-severity log entry for each critical result.
        // In production these logs feed into an alerting pipeline (PagerDuty, OpsGenie, etc.)
        // via structured log shipping.
        foreach (var order in criticalOrders)
        {
            _logger.LogCritical(
                "CRITICAL LAB RESULT — LabOrderId: {LabOrderId} PatientId: {PatientId} " +
                "Test: {TestCode} OrderNumber: {OrderNumber}",
                order.Id,
                order.PatientId,
                order.TestCode,
                order.OrderNumber);
        }

        _logger.LogWarning(
            "CriticalLabResultSweep: swept {Count} critical result(s) requiring provider attention",
            criticalOrders.Count);
    }

    /// <summary>
    /// Identifies encounters that have been left in an active state (checked-in or in-progress)
    /// beyond the expected visit duration. Logs a warning so coordinators can follow up.
    ///
    /// This prevents "stuck" encounters from blocking scheduling capacity
    /// and ensures the encounter record is closed for accurate billing.
    /// </summary>
    private async Task RunStaleEncounterSweepAsync(
        IServiceScope scope, CancellationToken ct)
    {
        var encounterRepo = scope.ServiceProvider.GetRequiredService<IEncounterRepository>();

        // Get all in-progress encounters (checked in or started)
        var inProgress = await encounterRepo.GetByStatusAsync(
            Domain.Enums.EncounterStatus.InProgress, ct);

        var checkedIn = await encounterRepo.GetByStatusAsync(
            Domain.Enums.EncounterStatus.CheckedIn, ct);

        var staleThreshold = TimeSpan.FromHours(4);
        var stale = inProgress
            .Concat(checkedIn)
            .Where(e => e.CheckedInAt.HasValue &&
                        DateTime.UtcNow - e.CheckedInAt.Value > staleThreshold)
            .ToList();

        if (!stale.Any())
        {
            _logger.LogDebug("StaleEncounterSweep: no stale encounters found");
            return;
        }

        foreach (var encounter in stale)
        {
            _logger.LogWarning(
                "STALE ENCOUNTER — EncounterId: {EncounterId} PatientId: {PatientId} " +
                "CheckedInAt: {CheckedInAt} Status: {Status} — may require coordinator follow-up",
                encounter.Id,
                encounter.PatientId,
                encounter.CheckedInAt,
                encounter.Status);
        }

        _logger.LogInformation(
            "StaleEncounterSweep: found {Count} encounter(s) open for more than {Threshold}h",
            stale.Count, staleThreshold.TotalHours);
    }
}
