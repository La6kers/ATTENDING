using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Repositories;

/// <summary>
/// Behavioral health screening repository.
///
/// 42 CFR Part 2 access note:
///   GetActiveSuicideRiskAsync and GetPendingReviewAsync return ALL records
///   regardless of Part 2 status — these are provider-safety queries.
///   Any query that discloses Part 2 records to third parties MUST check
///   PartTwoConsentGiven before returning. The API controller enforces this.
/// </summary>
public class BehavioralHealthRepository : IBehavioralHealthRepository
{
    private readonly AttendingDbContext _context;

    public BehavioralHealthRepository(AttendingDbContext context)
    {
        _context = context;
    }

    public async Task<BehavioralHealthScreening?> GetByIdAsync(
        Guid id, CancellationToken ct = default)
    {
        return await _context.Set<BehavioralHealthScreening>()
            .FirstOrDefaultAsync(s => s.Id == id, ct);
    }

    public async Task<BehavioralHealthScreening?> GetWithResponsesAsync(
        Guid id, CancellationToken ct = default)
    {
        return await _context.Set<BehavioralHealthScreening>()
            .Include(s => s.Responses.OrderBy(r => r.ItemNumber))
            .FirstOrDefaultAsync(s => s.Id == id, ct);
    }

    public async Task<IReadOnlyList<BehavioralHealthScreening>> GetByPatientIdAsync(
        Guid patientId, CancellationToken ct = default)
    {
        return await _context.Set<BehavioralHealthScreening>()
            .Where(s => s.PatientId == patientId)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<BehavioralHealthScreening>> GetByEncounterIdAsync(
        Guid encounterId, CancellationToken ct = default)
    {
        return await _context.Set<BehavioralHealthScreening>()
            .Where(s => s.EncounterId == encounterId)
            .Include(s => s.Responses.OrderBy(r => r.ItemNumber))
            .OrderBy(s => s.StartedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<BehavioralHealthScreening>> GetPendingReviewAsync(
        CancellationToken ct = default)
    {
        return await _context.Set<BehavioralHealthScreening>()
            .Where(s => s.Status == ScreeningStatus.Completed)
            .OrderByDescending(s => s.CompletedAt)
            .ToListAsync(ct);
    }

    public async Task<BehavioralHealthScreening?> GetLatestByInstrumentAsync(
        Guid patientId, ScreeningInstrument instrument, CancellationToken ct = default)
    {
        return await _context.Set<BehavioralHealthScreening>()
            .Where(s => s.PatientId == patientId && s.Instrument == instrument)
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync(ct);
    }

    /// <summary>
    /// Returns all completed screenings where HasSuicideRisk = true and
    /// RecommendedAction >= SafetyPlanRequired, that have not yet been reviewed.
    /// Used by the provider dashboard critical alerts panel.
    /// </summary>
    public async Task<IReadOnlyList<BehavioralHealthScreening>> GetActiveSuicideRiskAsync(
        CancellationToken ct = default)
    {
        return await _context.Set<BehavioralHealthScreening>()
            .Where(s => s.HasSuicideRisk
                     && s.Status == ScreeningStatus.Completed
                     && s.RecommendedAction >= BehavioralHealthAction.SafetyPlanRequired)
            .OrderByDescending(s => s.CompletedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(BehavioralHealthScreening screening, CancellationToken ct = default)
    {
        await _context.Set<BehavioralHealthScreening>().AddAsync(screening, ct);
    }

    public void Update(BehavioralHealthScreening screening)
    {
        _context.Set<BehavioralHealthScreening>().Update(screening);
    }
}
