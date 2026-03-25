using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Repositories;

public class EncounterRecordingRepository : IEncounterRecordingRepository
{
    private readonly AttendingDbContext _context;

    public EncounterRecordingRepository(AttendingDbContext context) => _context = context;

    // ── IRepository<EncounterRecording> ───────────────────────────────────

    public async Task<EncounterRecording?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _context.EncounterRecordings.FindAsync(new object[] { id }, ct);

    public async Task<IReadOnlyList<EncounterRecording>> GetAllAsync(CancellationToken ct = default)
        => await _context.EncounterRecordings.ToListAsync(ct);

    public async Task AddAsync(EncounterRecording entity, CancellationToken ct = default)
        => await _context.EncounterRecordings.AddAsync(entity, ct);

    public void Update(EncounterRecording entity)
        => _context.EncounterRecordings.Update(entity);

    public void Remove(EncounterRecording entity)
        => entity.SoftDelete(); // never hard-delete PHI

    // ── IEncounterRecordingRepository ─────────────────────────────────────

    public async Task<EncounterRecording?> GetByEncounterIdAsync(Guid encounterId, CancellationToken ct = default)
        => await _context.EncounterRecordings
            .FirstOrDefaultAsync(r => r.EncounterId == encounterId, ct);

    public async Task<EncounterRecording?> GetWithSegmentsAsync(Guid recordingId, CancellationToken ct = default)
        => await _context.EncounterRecordings
            .Include(r => r.Segments)
            .FirstOrDefaultAsync(r => r.Id == recordingId, ct);

    public async Task<EncounterRecording?> GetWithNoteAsync(Guid recordingId, CancellationToken ct = default)
        => await _context.EncounterRecordings
            .Include(r => r.GeneratedNote)
            .FirstOrDefaultAsync(r => r.Id == recordingId, ct);

    public async Task<AmbientNote?> GetNoteByEncounterIdAsync(Guid encounterId, CancellationToken ct = default)
        => await _context.AmbientNotes
            .FirstOrDefaultAsync(n => n.EncounterId == encounterId, ct);

    public async Task<AmbientNote?> GetNoteByIdAsync(Guid noteId, CancellationToken ct = default)
        => await _context.AmbientNotes.FindAsync(new object[] { noteId }, ct);

    public async Task AddNoteAsync(AmbientNote note, CancellationToken ct = default)
        => await _context.AmbientNotes.AddAsync(note, ct);

    public async Task AddSegmentAsync(TranscriptSegment segment, CancellationToken ct = default)
        => await _context.TranscriptSegments.AddAsync(segment, ct);

    public async Task<IReadOnlyList<TranscriptSegment>> GetSegmentsAsync(Guid recordingId, CancellationToken ct = default)
        => await _context.TranscriptSegments
            .Where(s => s.RecordingId == recordingId)
            .OrderBy(s => s.OffsetMs)
            .ToListAsync(ct);
}
