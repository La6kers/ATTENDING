using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Repositories;

public class AiFeedbackRepository : IAiFeedbackRepository
{
    private readonly AttendingDbContext _context;

    public AiFeedbackRepository(AttendingDbContext context) => _context = context;

    public async Task<AiFeedback?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _context.Set<AiFeedback>().FindAsync(new object[] { id }, ct);

    public async Task AddAsync(AiFeedback feedback, CancellationToken ct = default)
        => await _context.Set<AiFeedback>().AddAsync(feedback, ct);

    public async Task<IReadOnlyList<AiFeedback>> GetByProviderAsync(Guid providerId, CancellationToken ct = default)
        => await _context.Set<AiFeedback>()
            .Where(f => f.ProviderId == providerId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<AiFeedback>> GetByRequestIdAsync(string requestId, CancellationToken ct = default)
        => await _context.Set<AiFeedback>()
            .Where(f => f.RequestId == requestId)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<AiFeedback>> GetByTypeAsync(string type, int skip = 0, int take = 50, CancellationToken ct = default)
        => await _context.Set<AiFeedback>()
            .Where(f => f.RecommendationType == type)
            .OrderByDescending(f => f.CreatedAt)
            .Skip(skip).Take(take)
            .ToListAsync(ct);

    public async Task<(int totalCount, int helpfulCount, double avgAccuracy)> GetStatsAsync(
        string? type = null, CancellationToken ct = default)
    {
        var query = _context.Set<AiFeedback>().AsQueryable();
        if (type != null) query = query.Where(f => f.RecommendationType == type);

        var total = await query.CountAsync(ct);
        var helpful = await query.CountAsync(f => f.Rating == "Helpful", ct);
        var avgAcc = total > 0
            ? await query.Where(f => f.AccuracyScore != null).AverageAsync(f => (double)f.AccuracyScore!, ct)
            : 0;

        return (total, helpful, avgAcc);
    }
}
