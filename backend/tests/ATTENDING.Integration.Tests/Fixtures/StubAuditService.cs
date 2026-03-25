using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Integration.Tests.Fixtures;

/// <summary>
/// In-memory audit service stub for integration tests.
///
/// - Records all audit entries so tests can inspect them
/// - Thread-safe via lock (tests may run async)
/// - No database dependency (doesn't touch DbContext)
///
/// Usage in tests:
///   var factory = new AttendingWebApplicationFactory();
///   // ... make HTTP calls ...
///   var stub = factory.Services.GetRequiredService&lt;IAuditService&gt;() as StubAuditService;
///   Assert.Contains(stub!.Entries, e => e.Action.Contains("POST"));
/// </summary>
public class StubAuditService : IAuditService
{
    private readonly List<AuditEntry> _entries = new();
    private readonly List<PhiAccessRecord> _phiAccessRecords = new();
    private readonly object _lock = new();

    /// <summary>
    /// All audit entries logged during the test.
    /// </summary>
    public IReadOnlyList<AuditEntry> Entries
    {
        get { lock (_lock) return _entries.ToList().AsReadOnly(); }
    }

    /// <summary>
    /// All PHI access records logged during the test.
    /// </summary>
    public IReadOnlyList<PhiAccessRecord> PhiAccessRecords
    {
        get { lock (_lock) return _phiAccessRecords.ToList().AsReadOnly(); }
    }

    /// <summary>
    /// Alias for PhiAccessRecords — used by some test files.
    /// </summary>
    public IReadOnlyList<PhiAccessRecord> PhiAccessLog => PhiAccessRecords;

    /// <summary>
    /// Clear all recorded entries (useful for test isolation within a single factory instance).
    /// </summary>
    public void Clear()
    {
        lock (_lock)
        {
            _entries.Clear();
            _phiAccessRecords.Clear();
        }
    }

    public Task LogAsync(AuditEntry entry, CancellationToken cancellationToken = default)
    {
        lock (_lock) _entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task LogPhiAccessAsync(
        Guid userId,
        Guid patientId,
        string action,
        string resourceType,
        Guid? resourceId = null,
        string? details = null,
        CancellationToken cancellationToken = default)
    {
        lock (_lock)
        {
            _phiAccessRecords.Add(new PhiAccessRecord(
                userId, patientId, action, resourceType, resourceId, details, DateTime.UtcNow));
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AuditLog>> GetByPatientIdAsync(
        Guid patientId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        // Return empty — tests that need query results should use the real AuditService via Docker tests
        return Task.FromResult<IReadOnlyList<AuditLog>>(Array.Empty<AuditLog>());
    }

    public Task<IReadOnlyList<AuditLog>> GetByUserIdAsync(
        Guid userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<AuditLog>>(Array.Empty<AuditLog>());
    }

    /// <summary>
    /// Record of a PHI access event for test assertions.
    /// </summary>
    public record PhiAccessRecord(
        Guid UserId,
        Guid PatientId,
        string Action,
        string ResourceType,
        Guid? ResourceId,
        string? Details,
        DateTime Timestamp);
}
