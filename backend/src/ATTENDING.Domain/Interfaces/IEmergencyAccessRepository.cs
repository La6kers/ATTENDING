using ATTENDING.Domain.Entities;

namespace ATTENDING.Domain.Interfaces;

/// <summary>
/// Repository for emergency access profiles and audit logs.
/// Separated from other repositories because emergency access
/// operates outside the normal authentication flow.
/// </summary>
public interface IEmergencyAccessRepository
{
    /// <summary>Get a patient's emergency access profile</summary>
    Task<EmergencyAccessProfile?> GetProfileByPatientIdAsync(Guid patientId, CancellationToken ct);

    /// <summary>Get patient entity (for org ID resolution during profile creation)</summary>
    Task<Patient?> GetPatientAsync(Guid patientId, CancellationToken ct);

    /// <summary>Add a new emergency access profile</summary>
    Task AddProfileAsync(EmergencyAccessProfile profile, CancellationToken ct);

    /// <summary>Get an access log by ID</summary>
    Task<EmergencyAccessLog?> GetAccessLogAsync(Guid accessLogId, CancellationToken ct);

    /// <summary>Create a new access audit log entry</summary>
    Task AddAccessLogAsync(EmergencyAccessLog log, CancellationToken ct);

    /// <summary>Get paginated access logs for a patient</summary>
    Task<(IReadOnlyList<EmergencyAccessLog> Logs, int TotalCount)> GetAccessLogsAsync(
        Guid patientId, int page, int pageSize, CancellationToken ct);

    /// <summary>Persist all changes</summary>
    Task SaveChangesAsync(CancellationToken ct);
}
