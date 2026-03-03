using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Repositories;

/// <summary>
/// Imaging order repository implementation
/// </summary>
public class ImagingOrderRepository : Repository<ImagingOrder>, IImagingOrderRepository
{
    public ImagingOrderRepository(AttendingDbContext context) : base(context) { }

    public async Task<ImagingOrder?> GetByOrderNumberAsync(string orderNumber, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(o => o.Patient)
            .Include(o => o.OrderingProvider)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, cancellationToken);
    }

    public async Task<IReadOnlyList<ImagingOrder>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.PatientId == patientId)
            .OrderByDescending(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ImagingOrder>> GetByEncounterIdAsync(Guid encounterId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.EncounterId == encounterId)
            .OrderByDescending(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ImagingOrder>> GetByStatusAsync(ImagingOrderStatus status, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.Status == status)
            .Include(o => o.Patient)
            .OrderBy(o => o.Priority)
            .ThenBy(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<decimal> GetPatientRadiationDoseAsync(Guid patientId, int monthsBack = 12, CancellationToken cancellationToken = default)
    {
        var startDate = DateTime.UtcNow.AddMonths(-monthsBack);
        
        return await DbSet
            .Where(o => o.PatientId == patientId && 
                        o.OrderedAt >= startDate &&
                        o.EstimatedRadiationDose.HasValue &&
                        o.Status != ImagingOrderStatus.Cancelled)
            .SumAsync(o => o.EstimatedRadiationDose ?? 0, cancellationToken);
    }
}

/// <summary>
/// Medication order repository implementation
/// </summary>
public class MedicationOrderRepository : Repository<MedicationOrder>, IMedicationOrderRepository
{
    public MedicationOrderRepository(AttendingDbContext context) : base(context) { }

    public async Task<IReadOnlyList<MedicationOrder>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.PatientId == patientId)
            .OrderByDescending(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MedicationOrder>> GetActiveByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.PatientId == patientId && o.Status == MedicationOrderStatus.Active)
            .OrderBy(o => o.MedicationName)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MedicationOrder>> GetByEncounterIdAsync(Guid encounterId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.EncounterId == encounterId)
            .OrderByDescending(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Referral repository implementation
/// </summary>
public class ReferralRepository : Repository<Referral>, IReferralRepository
{
    public ReferralRepository(AttendingDbContext context) : base(context) { }

    public async Task<IReadOnlyList<Referral>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.ReferredAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Referral>> GetByStatusAsync(ReferralStatus status, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(r => r.Status == status)
            .Include(r => r.Patient)
            .Include(r => r.ReferringProvider)
            .OrderBy(r => r.Urgency)
            .ThenBy(r => r.ReferredAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Referral>> GetPendingBySpecialtyAsync(string specialty, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(r => r.Specialty == specialty && r.Status == ReferralStatus.Pending)
            .Include(r => r.Patient)
            .OrderBy(r => r.Urgency)
            .ThenBy(r => r.ReferredAt)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Assessment repository implementation
/// </summary>
public class AssessmentRepository : Repository<PatientAssessment>, IAssessmentRepository
{
    public AssessmentRepository(AttendingDbContext context) : base(context) { }

    public async Task<IReadOnlyList<PatientAssessment>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(a => a.PatientId == patientId)
            .OrderByDescending(a => a.StartedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PatientAssessment>> GetPendingReviewAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(a => a.CurrentPhase == AssessmentPhase.Completed && 
                        a.ReviewedByProviderId == null)
            .Include(a => a.Patient)
            .OrderBy(a => a.HasRedFlags ? 0 : 1)  // Red flags first
            .ThenBy(a => a.TriageLevel)
            .ThenBy(a => a.CompletedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PatientAssessment>> GetWithRedFlagsAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(a => a.HasRedFlags)
            .Include(a => a.Patient)
            .OrderByDescending(a => a.IsEmergency)
            .ThenByDescending(a => a.StartedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<PatientAssessment?> GetWithSymptomsAsync(Guid assessmentId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(a => a.Symptoms)
            .Include(a => a.Responses)
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == assessmentId, cancellationToken);
    }

    public async Task<(IReadOnlyList<PatientAssessment> Items, int TotalCount)> GetFilteredAsync(
        string? status = null, string? triageLevel = null, bool? hasRedFlags = null,
        int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        var query = DbSet.Include(a => a.Patient).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<AssessmentPhase>(status, true, out var phase))
            query = query.Where(a => a.CurrentPhase == phase);

        if (!string.IsNullOrWhiteSpace(triageLevel) &&
            Enum.TryParse<TriageLevel>(triageLevel, true, out var triage))
            query = query.Where(a => a.TriageLevel == triage);

        if (hasRedFlags.HasValue)
            query = query.Where(a => a.HasRedFlags == hasRedFlags.Value);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(a => a.IsEmergency)
            .ThenBy(a => a.TriageLevel)
            .ThenByDescending(a => a.StartedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (items, total);
    }
}
