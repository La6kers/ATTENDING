using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Integration.Tests.Fixtures;

/// <summary>
/// Extended factory that exposes captured audit entries for test inspection.
///
/// Usage:
///   var factory = new AuditCapturingWebApplicationFactory();
///   var client = factory.CreateClient();
///   await client.PostAsync("/api/v1/laborders", ...);
///   Assert.Contains(factory.CapturedAuditEntries, e => e.Action.Contains("POST"));
/// </summary>
public class AuditCapturingWebApplicationFactory : AttendingWebApplicationFactory
{
    /// <summary>
    /// All audit entries captured during requests to this factory's test server.
    /// </summary>
    public List<AuditEntry> CapturedAuditEntries { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureServices(services =>
        {
            // Replace the StubAuditService registered by the base factory
            // with a singleton capturing version so entries survive across scopes.
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IAuditService));
            if (descriptor != null)
                services.Remove(descriptor);

            services.AddSingleton<IAuditService>(
                new CapturingAuditService(CapturedAuditEntries));
        });
    }
}

/// <summary>
/// Audit service that captures all entries into an externally-owned list for test assertions.
/// </summary>
internal class CapturingAuditService : IAuditService
{
    private readonly List<AuditEntry> _entries;

    public CapturingAuditService(List<AuditEntry> entries) => _entries = entries;

    public Task LogAsync(AuditEntry entry, CancellationToken cancellationToken = default)
    {
        lock (_entries) { _entries.Add(entry); }
        return Task.CompletedTask;
    }

    public Task LogPhiAccessAsync(
        Guid userId, Guid patientId, string action, string resourceType,
        Guid? resourceId = null, string? details = null,
        CancellationToken cancellationToken = default)
    {
        lock (_entries)
        {
            _entries.Add(new AuditEntry
            {
                UserId = userId.ToString(),
                Action = $"PHI_ACCESS:{action}",
                EntityType = resourceType,
                EntityId = resourceId?.ToString() ?? patientId.ToString(),
                PatientId = patientId.ToString()
            });
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ATTENDING.Domain.Entities.AuditLog>> GetByPatientIdAsync(
        Guid patientId, DateTime? startDate = null, DateTime? endDate = null,
        CancellationToken cancellationToken = default)
        => Task.FromResult<IReadOnlyList<ATTENDING.Domain.Entities.AuditLog>>(Array.Empty<ATTENDING.Domain.Entities.AuditLog>());

    public Task<IReadOnlyList<ATTENDING.Domain.Entities.AuditLog>> GetByUserIdAsync(
        Guid userId, DateTime? startDate = null, DateTime? endDate = null,
        CancellationToken cancellationToken = default)
        => Task.FromResult<IReadOnlyList<ATTENDING.Domain.Entities.AuditLog>>(Array.Empty<ATTENDING.Domain.Entities.AuditLog>());
}
