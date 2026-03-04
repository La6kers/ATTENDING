using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Repositories;

/// <summary>
/// Repository for EmergencyAccessProfile and EmergencyAccessLog entities.
/// Emergency access operates outside normal auth flow — profiles are
/// accessed by first responders, not authenticated users.
/// </summary>
public class EmergencyAccessRepository : IEmergencyAccessRepository
{
    private readonly AttendingDbContext _context;

    public EmergencyAccessRepository(AttendingDbContext context) => _context = context;

    public async Task<EmergencyAccessProfile?> GetProfileByPatientIdAsync(
        Guid patientId, CancellationToken ct)
        => await _context.Set<EmergencyAccessProfile>()
            .FirstOrDefaultAsync(p => p.PatientId == patientId, ct);

    public async Task<Patient?> GetPatientAsync(Guid patientId, CancellationToken ct)
        => await _context.Set<Patient>()
            .FindAsync(new object[] { patientId }, ct);

    public async Task AddProfileAsync(EmergencyAccessProfile profile, CancellationToken ct)
        => await _context.Set<EmergencyAccessProfile>().AddAsync(profile, ct);

    public async Task<EmergencyAccessLog?> GetAccessLogAsync(Guid accessLogId, CancellationToken ct)
        => await _context.Set<EmergencyAccessLog>()
            .FindAsync(new object[] { accessLogId }, ct);

    public async Task AddAccessLogAsync(EmergencyAccessLog log, CancellationToken ct)
        => await _context.Set<EmergencyAccessLog>().AddAsync(log, ct);

    public async Task<(IReadOnlyList<EmergencyAccessLog> Logs, int TotalCount)> GetAccessLogsAsync(
        Guid patientId, int page, int pageSize, CancellationToken ct)
    {
        var query = _context.Set<EmergencyAccessLog>()
            .Where(l => l.PatientId == patientId)
            .OrderByDescending(l => l.AccessGrantedAt);

        var totalCount = await query.CountAsync(ct);
        var logs = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (logs, totalCount);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
        => await _context.SaveChangesAsync(ct);
}
