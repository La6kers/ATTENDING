using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Repositories;

public class DiagnosticLearningRepository : IDiagnosticLearningRepository
{
    private readonly AttendingDbContext _ctx;

    public DiagnosticLearningRepository(AttendingDbContext ctx) => _ctx = ctx;

    // ── DiagnosticOutcome ─────────────────────────────────────────────────

    public async Task<DiagnosticOutcome?> GetOutcomeByIdAsync(Guid id, CancellationToken ct = default)
        => await _ctx.DiagnosticOutcomes.FindAsync(new object[] { id }, ct);

    public async Task<DiagnosticOutcome?> GetOutcomeByEncounterAsync(
        Guid encounterId, string recommendationType, CancellationToken ct = default)
        => await _ctx.DiagnosticOutcomes
            .FirstOrDefaultAsync(x =>
                x.EncounterId == encounterId &&
                x.RecommendationType == recommendationType, ct);

    public async Task AddOutcomeAsync(DiagnosticOutcome outcome, CancellationToken ct = default)
        => await _ctx.DiagnosticOutcomes.AddAsync(outcome, ct);

    public async Task<IReadOnlyList<DiagnosticOutcome>> GetUnprocessedOutcomesAsync(
        int batchSize = 50, CancellationToken ct = default)
        => await _ctx.DiagnosticOutcomes
            .Where(x => !x.IsProcessed)
            .OrderBy(x => x.CreatedAt)
            .Take(batchSize)
            .ToListAsync(ct);

    // ── LearningSignal ────────────────────────────────────────────────────

    public async Task AddSignalAsync(LearningSignal signal, CancellationToken ct = default)
        => await _ctx.LearningSignals.AddAsync(signal, ct);

    public async Task<IReadOnlyList<LearningSignal>> GetSignalsAsync(
        string recommendationType,
        string? guidelineName,
        DateTime windowStart,
        DateTime windowEnd,
        CancellationToken ct = default)
    {
        var q = _ctx.LearningSignals
            .Where(x =>
                x.RecommendationType == recommendationType &&
                x.CreatedAt >= windowStart &&
                x.CreatedAt <= windowEnd);

        if (guidelineName != null)
            q = q.Where(x => x.GuidelineName == guidelineName);

        return await q.ToListAsync(ct);
    }

    public async Task<int> GetSignalCountAsync(
        string recommendationType, string? guidelineName, CancellationToken ct = default)
    {
        var q = _ctx.LearningSignals.Where(x => x.RecommendationType == recommendationType);
        if (guidelineName != null) q = q.Where(x => x.GuidelineName == guidelineName);
        return await q.CountAsync(ct);
    }

    // ── DiagnosticAccuracySnapshot ────────────────────────────────────────

    public async Task AddSnapshotAsync(DiagnosticAccuracySnapshot snapshot, CancellationToken ct = default)
        => await _ctx.DiagnosticAccuracySnapshots.AddAsync(snapshot, ct);

    public async Task<DiagnosticAccuracySnapshot?> GetLatestSnapshotAsync(
        string recommendationType, string? guidelineName, CancellationToken ct = default)
    {
        var q = _ctx.DiagnosticAccuracySnapshots
            .Where(x => x.RecommendationType == recommendationType);

        q = guidelineName != null
            ? q.Where(x => x.GuidelineName == guidelineName)
            : q.Where(x => x.GuidelineName == null);

        return await q.OrderByDescending(x => x.WindowEnd).FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<DiagnosticAccuracySnapshot>> GetSnapshotHistoryAsync(
        string recommendationType, string? guidelineName, int limit = 12, CancellationToken ct = default)
    {
        var q = _ctx.DiagnosticAccuracySnapshots
            .Where(x => x.RecommendationType == recommendationType);

        q = guidelineName != null
            ? q.Where(x => x.GuidelineName == guidelineName)
            : q.Where(x => x.GuidelineName == null);

        return await q
            .OrderByDescending(x => x.WindowEnd)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<DiagnosticAccuracySnapshot>> GetAllLatestSnapshotsAsync(
        CancellationToken ct = default)
    {
        // Subquery: max WindowEnd per (RecommendationType, GuidelineName)
        var latestDates = await _ctx.DiagnosticAccuracySnapshots
            .GroupBy(x => new { x.RecommendationType, x.GuidelineName })
            .Select(g => new
            {
                g.Key.RecommendationType,
                g.Key.GuidelineName,
                MaxWindowEnd = g.Max(x => x.WindowEnd)
            })
            .ToListAsync(ct);

        var results = new List<DiagnosticAccuracySnapshot>();
        foreach (var item in latestDates)
        {
            var snapshot = await _ctx.DiagnosticAccuracySnapshots
                .Where(x =>
                    x.RecommendationType == item.RecommendationType &&
                    x.GuidelineName == item.GuidelineName &&
                    x.WindowEnd == item.MaxWindowEnd)
                .FirstOrDefaultAsync(ct);

            if (snapshot != null) results.Add(snapshot);
        }
        return results;
    }

    // ── Calibration ───────────────────────────────────────────────────────

    public async Task<decimal?> GetCalibrationAdjustmentAsync(
        string guidelineName, CancellationToken ct = default)
    {
        var latest = await _ctx.DiagnosticAccuracySnapshots
            .Where(x => x.GuidelineName == guidelineName && x.IsReliable)
            .OrderByDescending(x => x.WindowEnd)
            .FirstOrDefaultAsync(ct);

        return latest?.CalibrationAdjustmentFactor;
    }
}
