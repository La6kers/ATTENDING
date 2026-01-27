using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// HIPAA-compliant audit logging service
/// </summary>
public class AuditService : IAuditService
{
    private readonly AttendingDbContext _context;
    private readonly ILogger<AuditService> _logger;

    public AuditService(AttendingDbContext context, ILogger<AuditService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogAsync(AuditEntry entry, CancellationToken cancellationToken = default)
    {
        try
        {
            var auditLog = AuditLog.Create(
                userId: Guid.TryParse(entry.UserId, out var uid) ? uid : Guid.Empty,
                userEmail: entry.UserId, // Will be replaced with actual email in middleware
                userRole: "Unknown", // Will be set from claims
                action: entry.Action,
                entityType: entry.EntityType,
                entityId: entry.EntityId,
                patientId: entry.PatientId != null && Guid.TryParse(entry.PatientId, out var pid) ? pid : null,
                ipAddress: entry.IpAddress,
                userAgent: entry.UserAgent,
                details: entry.Details != null ? JsonSerializer.Serialize(entry.Details) : null,
                oldValues: entry.OldValues != null ? JsonSerializer.Serialize(entry.OldValues) : null,
                newValues: entry.NewValues != null ? JsonSerializer.Serialize(entry.NewValues) : null
            );

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit logging failures should not break the application
            // but we should log them for investigation
            _logger.LogError(ex, "Failed to write audit log: {Action} on {EntityType}/{EntityId}",
                entry.Action, entry.EntityType, entry.EntityId);
        }
    }

    public async Task LogPhiAccessAsync(
        Guid userId,
        Guid patientId,
        string action,
        string resourceType,
        Guid? resourceId = null,
        string? details = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get user info for audit
            var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
            
            var auditLog = AuditLog.Create(
                userId: userId,
                userEmail: user?.Email ?? "unknown",
                userRole: user?.Role.ToString() ?? "Unknown",
                action: $"PHI_ACCESS:{action}",
                entityType: resourceType,
                entityId: resourceId?.ToString() ?? patientId.ToString(),
                patientId: patientId,
                details: details
            );

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "PHI Access: User {UserId} accessed {ResourceType} for Patient {PatientId}",
                userId, resourceType, patientId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Failed to log PHI access: User {UserId} accessing {ResourceType} for Patient {PatientId}",
                userId, resourceType, patientId);
        }
    }

    public async Task<IReadOnlyList<AuditLog>> GetByPatientIdAsync(
        Guid patientId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs
            .Where(a => a.PatientId == patientId);

        if (startDate.HasValue)
            query = query.Where(a => a.Timestamp >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(a => a.Timestamp <= endDate.Value);

        return await query
            .OrderByDescending(a => a.Timestamp)
            .Take(1000) // Limit for performance
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLog>> GetByUserIdAsync(
        Guid userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs
            .Where(a => a.UserId == userId);

        if (startDate.HasValue)
            query = query.Where(a => a.Timestamp >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(a => a.Timestamp <= endDate.Value);

        return await query
            .OrderByDescending(a => a.Timestamp)
            .Take(1000) // Limit for performance
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Extension methods for audit context
/// </summary>
public static class AuditContextExtensions
{
    /// <summary>
    /// Creates an audit entry from HTTP context (to be called from middleware)
    /// </summary>
    public static AuditEntry CreateFromContext(
        string userId,
        string action,
        string entityType,
        string entityId,
        string? patientId = null,
        string? ipAddress = null,
        string? userAgent = null)
    {
        return new AuditEntry
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            PatientId = patientId,
            IpAddress = ipAddress,
            UserAgent = userAgent
        };
    }
}
