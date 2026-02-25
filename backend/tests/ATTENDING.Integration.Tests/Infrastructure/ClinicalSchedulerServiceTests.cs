using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using ATTENDING.Infrastructure.Services;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Infrastructure;

/// <summary>
/// Tests for the ClinicalSchedulerService — verifies distributed lock
/// acquisition patterns, single-execution guarantee, and graceful cancellation.
/// </summary>
public class ClinicalSchedulerServiceTests
{
    // ================================================================
    // Scheduler lock acquisition — uses in-memory lock for isolation
    // ================================================================

    [Fact]
    public async Task SchedulerJob_AcquiresLock_AndExecutesOnce()
    {
        // Arrange: two "nodes" sharing the same in-memory lock service
        var lockService = new InMemoryDistributedLockService(
            NullLogger<InMemoryDistributedLockService>.Instance);

        var executionCount = 0;

        // Act: simulate 3 concurrent nodes attempting to run the same scheduler job
        var tasks = Enumerable.Range(0, 3).Select(_ => Task.Run(async () =>
        {
            await using var lk = await lockService.AcquireAsync(
                "scheduler:test-job", TimeSpan.FromSeconds(10), retryCount: 0);

            if (!lk.IsAcquired) return;

            // Simulate job work
            Interlocked.Increment(ref executionCount);
            await Task.Delay(50);
        }));

        await Task.WhenAll(tasks);

        // Assert: only one node should have executed the job
        executionCount.Should().Be(1,
            because: "distributed lock must ensure exactly-once job execution across nodes");
    }

    [Fact]
    public async Task SchedulerJob_LockExpires_NextCycleCanReacquire()
    {
        var lockService = new InMemoryDistributedLockService(
            NullLogger<InMemoryDistributedLockService>.Instance);

        // First cycle: acquire and release
        await using (var lk1 = await lockService.AcquireAsync("scheduler:cycle-test", TimeSpan.FromSeconds(5)))
        {
            lk1.IsAcquired.Should().BeTrue();
        } // released here

        // Second cycle: should be able to reacquire
        await using var lk2 = await lockService.AcquireAsync("scheduler:cycle-test", TimeSpan.FromSeconds(5));
        lk2.IsAcquired.Should().BeTrue();
    }

    [Fact]
    public async Task SchedulerService_Cancellation_StopsGracefully()
    {
        // Arrange
        var services = new ServiceCollection();
        services.AddLogging();
        var fixture = new DatabaseFixture();
        var lockService = new InMemoryDistributedLockService(
            NullLogger<InMemoryDistributedLockService>.Instance);

        var scheduler = new ClinicalSchedulerService(
            fixture.Services,
            lockService,
            NullLogger<ClinicalSchedulerService>.Instance);

        var cts = new CancellationTokenSource();

        // Act: start scheduler then cancel it quickly
        var runTask = scheduler.StartAsync(cts.Token);
        await Task.Delay(200); // let it initialize
        cts.Cancel();

        // The scheduler should stop without throwing
        var act = async () =>
        {
            await runTask;
            await scheduler.StopAsync(CancellationToken.None);
        };

        await act.Should().NotThrowAsync(
            because: "ClinicalSchedulerService should handle cancellation gracefully");
    }

    [Fact]
    public async Task DistributedLock_Contention_DoesNotThrow()
    {
        // Arrange: many concurrent requests for the same lock
        var lockService = new InMemoryDistributedLockService(
            NullLogger<InMemoryDistributedLockService>.Instance);

        var exceptions = new System.Collections.Concurrent.ConcurrentBag<Exception>();

        // Act: 10 concurrent attempts, each with 0 retries
        var tasks = Enumerable.Range(0, 10).Select(_ => Task.Run(async () =>
        {
            try
            {
                await using var lk = await lockService.AcquireAsync(
                    "scheduler:contention-test", TimeSpan.FromSeconds(5), retryCount: 0);
                // Nothing to do — just test that acquire doesn't throw
            }
            catch (Exception ex)
            {
                exceptions.Add(ex);
            }
        }));

        await Task.WhenAll(tasks);

        // Assert: no exceptions from contention
        exceptions.Should().BeEmpty(
            because: "lock contention must be handled gracefully without exceptions");
    }

    [Fact]
    public async Task DistributedLock_UnacquiredLock_DisposeIsIdempotent()
    {
        var lockService = new InMemoryDistributedLockService(
            NullLogger<InMemoryDistributedLockService>.Instance);

        // Hold the lock
        await using var held = await lockService.AcquireAsync("scheduler:dispose-test", TimeSpan.FromSeconds(30));
        held.IsAcquired.Should().BeTrue();

        // Try to get same lock (will fail)
        var failed = await lockService.AcquireAsync(
            "scheduler:dispose-test", TimeSpan.FromSeconds(30), retryCount: 0);
        failed.IsAcquired.Should().BeFalse();

        // Disposing an unacquired lock should be a no-op
        var act = async () =>
        {
            await failed.DisposeAsync();
            await failed.DisposeAsync(); // double-dispose should also be safe
        };

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task MultipleSchedulerJobs_RunIndependently_WithSeparateLocks()
    {
        var lockService = new InMemoryDistributedLockService(
            NullLogger<InMemoryDistributedLockService>.Instance);

        // Different job locks should never interfere with each other
        await using var lock1 = await lockService.AcquireAsync("scheduler:job-a", TimeSpan.FromSeconds(30));
        await using var lock2 = await lockService.AcquireAsync("scheduler:job-b", TimeSpan.FromSeconds(30));
        await using var lock3 = await lockService.AcquireAsync("scheduler:job-c", TimeSpan.FromSeconds(30));

        lock1.IsAcquired.Should().BeTrue();
        lock2.IsAcquired.Should().BeTrue();
        lock3.IsAcquired.Should().BeTrue();

        lock1.LockId.Should().NotBe(lock2.LockId);
        lock2.LockId.Should().NotBe(lock3.LockId);
    }
}
