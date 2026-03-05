using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ATTENDING.Application.Commands.AmbientScribe;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Repositories;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

/// <summary>
/// Integration tests for the Ambient AI Scribe handler pipeline.
///
/// InMemory EF handles single-step operations.
/// Multi-step workflows that cross handler boundaries are Docker-only
/// (SQL Server via SqlServerFixture) to avoid EF change-tracker gaps.
/// </summary>
public class AmbientScribeHandlerTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _db;

    public AmbientScribeHandlerTests(DatabaseFixture db) => _db = db;

    // ── Handler builders ──────────────────────────────────────────────────

    private StartRecordingSessionHandler StartHandler() =>
        new(_db.Services.GetRequiredService<IEncounterRecordingRepository>(),
            _db.Services.GetRequiredService<IUnitOfWork>(),
            Mock.Of<ILogger<StartRecordingSessionHandler>>());

    private RecordConsentHandler ConsentHandler() =>
        new(_db.Services.GetRequiredService<IEncounterRecordingRepository>(),
            _db.Services.GetRequiredService<IUnitOfWork>(),
            Mock.Of<ILogger<RecordConsentHandler>>());

    private AddTranscriptSegmentHandler SegmentHandler() =>
        new(_db.Services.GetRequiredService<IEncounterRecordingRepository>(),
            _db.Services.GetRequiredService<IUnitOfWork>());

    private EditAmbientNoteHandler EditHandler() =>
        new(_db.Services.GetRequiredService<IEncounterRecordingRepository>(),
            _db.Services.GetRequiredService<IUnitOfWork>());

    private SignAmbientNoteHandler SignHandler() =>
        new(_db.Services.GetRequiredService<IEncounterRecordingRepository>(),
            _db.Services.GetRequiredService<IUnitOfWork>(),
            Mock.Of<ILogger<SignAmbientNoteHandler>>());

    // ── Helper ────────────────────────────────────────────────────────────

    private async Task<Guid> CreateSessionAsync(Guid encounterId, Guid patientId, Guid providerId)
    {
        var r = await StartHandler().Handle(
            new StartRecordingSessionCommand(
                encounterId, patientId, providerId, DatabaseFixture.DefaultTenantId),
            CancellationToken.None);
        r.IsSuccess.Should().BeTrue();
        return r.Value.RecordingId;
    }

    // ================================================================
    // StartRecordingSession
    // ================================================================

    [Fact]
    public async Task StartSession_ValidInput_ShouldReturnRecordingIdAndContainer()
    {
        var patient  = await _db.SeedPatientAsync("AMB-001");
        var provider = await _db.SeedProviderAsync("scribe.dr1@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);

        var result = await StartHandler().Handle(
            new StartRecordingSessionCommand(
                encounter.Id, patient.Id, provider.Id, DatabaseFixture.DefaultTenantId),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.RecordingId.Should().NotBeEmpty();
        result.Value.AudioBlobContainer.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task StartSession_DuplicateEncounter_ShouldFailNotCreateSecond()
    {
        var patient   = await _db.SeedPatientAsync("AMB-002");
        var provider  = await _db.SeedProviderAsync("scribe.dr2@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);

        await CreateSessionAsync(encounter.Id, patient.Id, provider.Id);

        var second = await StartHandler().Handle(
            new StartRecordingSessionCommand(
                encounter.Id, patient.Id, provider.Id, DatabaseFixture.DefaultTenantId),
            CancellationToken.None);

        second.IsFailure.Should().BeTrue("duplicate session for same encounter must be rejected");
    }

    // ================================================================
    // RecordConsent
    // ================================================================

    [Fact]
    public async Task RecordConsent_ConsentGiven_ShouldSucceed()
    {
        var patient   = await _db.SeedPatientAsync("AMB-003");
        var provider  = await _db.SeedProviderAsync("scribe.dr3@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);
        var rid       = await CreateSessionAsync(encounter.Id, patient.Id, provider.Id);

        var result = await ConsentHandler().Handle(
            new RecordConsentCommand(rid, ConsentGiven: true, CapturedBy: "Dr. Provider"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task RecordConsent_ConsentDeclined_ShouldSucceed()
    {
        var patient   = await _db.SeedPatientAsync("AMB-004");
        var provider  = await _db.SeedProviderAsync("scribe.dr4@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);
        var rid       = await CreateSessionAsync(encounter.Id, patient.Id, provider.Id);

        var result = await ConsentHandler().Handle(
            new RecordConsentCommand(rid, ConsentGiven: false, CapturedBy: "Dr. Provider"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task RecordConsent_NotFound_ShouldFail()
    {
        var result = await ConsentHandler().Handle(
            new RecordConsentCommand(Guid.NewGuid(), true, "Dr. Ghost"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
    }

    // ================================================================
    // AddTranscriptSegment — state machine guard
    // ================================================================

    [Fact]
    public async Task AddSegment_BeforeConsent_ShouldFail()
    {
        var patient   = await _db.SeedPatientAsync("AMB-SM-001");
        var provider  = await _db.SeedProviderAsync("scribe.sm1@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);
        var rid       = await CreateSessionAsync(encounter.Id, patient.Id, provider.Id);

        // Attempt to add a segment without recording consent first
        var result = await SegmentHandler().Handle(
            new AddTranscriptSegmentCommand(
                rid, DatabaseFixture.DefaultTenantId,
                SpeakerRole.Provider, 0, 2000, "Hello.", 0.95m),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue(
            "segments cannot be added to a session still awaiting consent");
    }

    [Fact]
    public async Task AddSegment_AfterConsent_ShouldPersistAndReturnSegmentId()
    {
        var patient   = await _db.SeedPatientAsync("AMB-005");
        var provider  = await _db.SeedProviderAsync("scribe.dr5@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);
        var rid       = await CreateSessionAsync(encounter.Id, patient.Id, provider.Id);

        await ConsentHandler().Handle(
            new RecordConsentCommand(rid, true, "Dr. Provider"),
            CancellationToken.None);

        var result = await SegmentHandler().Handle(
            new AddTranscriptSegmentCommand(
                rid, DatabaseFixture.DefaultTenantId,
                SpeakerRole.Provider, 0, 3500,
                "Good morning, how are you feeling today?", 0.97m),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeEmpty();
    }

    [Fact]
    public async Task AddMultipleSegments_InterleavedSpeakers_ShouldAllPersist()
    {
        var patient   = await _db.SeedPatientAsync("AMB-006");
        var provider  = await _db.SeedProviderAsync("scribe.dr6@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);
        var rid       = await CreateSessionAsync(encounter.Id, patient.Id, provider.Id);

        await ConsentHandler().Handle(
            new RecordConsentCommand(rid, true, "Dr. Provider"),
            CancellationToken.None);

        var segments = new[]
        {
            (SpeakerRole.Provider, 0,     3500, "Good morning, how are you feeling today?", 0.97m),
            (SpeakerRole.Patient,  4000,  5000, "I have chest pain since this morning.",    0.94m),
            (SpeakerRole.Provider, 9500,  3000, "Is it sharp or pressure?",                 0.96m),
            (SpeakerRole.Patient,  13000, 4000, "Pressure, radiating to my left arm.",       0.91m),
        };

        foreach (var (speaker, offset, dur, text, conf) in segments)
        {
            var r = await SegmentHandler().Handle(
                new AddTranscriptSegmentCommand(
                    rid, DatabaseFixture.DefaultTenantId,
                    speaker, offset, dur, text, conf),
                CancellationToken.None);

            r.IsSuccess.Should().BeTrue($"segment at {offset}ms should persist");
        }
    }
}

// ================================================================
// Docker-backed: full lifecycle requires SQL Server
// ================================================================

[Collection("Docker")]
public class DockerAmbientScribeTests : IClassFixture<SqlServerFixture>
{
    private readonly SqlServerFixture _sql;

    public DockerAmbientScribeTests(SqlServerFixture sql) => _sql = sql;

    private StartRecordingSessionHandler StartHandler(AttendingDbContext ctx) =>
        new(new EncounterRecordingRepository(ctx), ctx,
            Mock.Of<ILogger<StartRecordingSessionHandler>>());

    private RecordConsentHandler ConsentHandler(AttendingDbContext ctx) =>
        new(new EncounterRecordingRepository(ctx), ctx,
            Mock.Of<ILogger<RecordConsentHandler>>());

    private AddTranscriptSegmentHandler SegmentHandler(AttendingDbContext ctx) =>
        new(new EncounterRecordingRepository(ctx), ctx);

    private EditAmbientNoteHandler EditHandler(AttendingDbContext ctx) =>
        new(new EncounterRecordingRepository(ctx), ctx);

    private SignAmbientNoteHandler SignHandler(AttendingDbContext ctx) =>
        new(new EncounterRecordingRepository(ctx), ctx,
            Mock.Of<ILogger<SignAmbientNoteHandler>>());

    [Fact]
    [Trait("Category", "Docker")]
    public async Task FullScribeLifecycle_ConsentToSignedNote_ShouldSucceed()
    {
        await using var ctx = _sql.CreateContext();
        ctx.EnableAdminContext();

        var patient   = await _sql.SeedPatientAsync(ctx, mrn: "DOCKER-AMB-001");
        var provider  = await _sql.SeedProviderAsync(ctx, email: "docker.scribe@test.com");
        var encounter = await _sql.SeedEncounterAsync(ctx, patient.Id, provider.Id);
        var orgId     = SqlServerFixture.DefaultTenantId;

        // 1. Start
        var startResult = await StartHandler(ctx).Handle(
            new StartRecordingSessionCommand(
                encounter.Id, patient.Id, provider.Id, orgId),
            CancellationToken.None);

        startResult.IsSuccess.Should().BeTrue();
        var rid = startResult.Value.RecordingId;

        // 2. Consent
        (await ConsentHandler(ctx).Handle(
            new RecordConsentCommand(rid, true, "Dr. Docker"),
            CancellationToken.None)).IsSuccess.Should().BeTrue();

        // 3. Transcript — STEMI presentation
        var dialogue = new[]
        {
            (SpeakerRole.Provider, 0,     3200, "Good morning, what brings you in?",                        0.98m),
            (SpeakerRole.Patient,  4000,  5500, "Severe chest pressure, started 2h ago.",                   0.93m),
            (SpeakerRole.Provider, 10000, 2800, "Any radiation to arm or jaw?",                             0.97m),
            (SpeakerRole.Patient,  13200, 3000, "Yes, left arm hurts too.",                                 0.92m),
            (SpeakerRole.Provider, 17000, 2000, "Any diaphoresis or nausea?",                               0.96m),
            (SpeakerRole.Patient,  19500, 2500, "Yes, nauseous since this morning.",                        0.90m),
        };

        foreach (var (spk, off, dur, txt, conf) in dialogue)
        {
            (await SegmentHandler(ctx).Handle(
                new AddTranscriptSegmentCommand(rid, orgId, spk, off, dur, txt, conf),
                CancellationToken.None)).IsSuccess.Should().BeTrue();
        }

        // 4. Inject generated note (simulates async AI pipeline completing)
        var repo = new EncounterRecordingRepository(ctx);

        var note = AmbientNote.Create(
            recordingId:  rid,
            encounterId:  encounter.Id,
            organizationId: orgId,
            subjective:   "Patient presents with severe substernal chest pressure, left arm radiation, diaphoresis × 2h.",
            objective:    "VS: BP 158/94, HR 96, RR 18, O2 98% RA. Alert and oriented.",
            assessment:   "High probability ACS — HEART Score 6 (High Risk).",
            plan:         "STAT ECG, troponin x2, aspirin 325mg, cardiology consult, telemetry.",
            modelVersion: "claude-3-5-haiku-test",
            promptTokens: 1200,
            diagnosisCodes: "I21.9",
            followUp:     "Cardiology follow-up within 48h if troponin negative.");

        await repo.AddNoteAsync(note, CancellationToken.None);

        var recording = await repo.GetByIdAsync(rid);
        recording!.MarkNoteGenerated();   // no-arg — matches entity
        await ctx.SaveChangesAsync();

        // 5. Provider edits the note
        var editResult = await EditHandler(ctx).Handle(
            new EditAmbientNoteCommand(
                NoteId:     note.Id,
                ProviderId: provider.Id,
                Subjective: "64M with severe substernal chest pressure radiating to left arm, onset 2h. Diaphoresis and nausea.",
                Objective:  "VS: BP 158/94, HR 96, RR 18, O2 98% RA. Alert.",
                Assessment: "High probability ACS — HEART Score 6 (High Risk). R/O STEMI.",
                Plan:       "STAT ECG, troponin I 0h/3h, aspirin 325mg, clopidogrel 600mg, cardiology consult, telemetry."),
            CancellationToken.None);

        editResult.IsSuccess.Should().BeTrue("provider should be able to edit a draft note");

        // 6. Sign → permanent record
        var signResult = await SignHandler(ctx).Handle(
            new SignAmbientNoteCommand(note.Id, provider.Id),
            CancellationToken.None);

        signResult.IsSuccess.Should().BeTrue("provider should be able to sign an edited note");

        // 7. Verify final DB state
        var finalNote = await repo.GetNoteByIdAsync(note.Id);
        finalNote.Should().NotBeNull();
        finalNote!.Status.Should().Be(NoteStatus.Signed);
        finalNote.EditCount.Should().Be(1);
        finalNote.SignedByProviderId.Should().Be(provider.Id);
        finalNote.SignedAt.Should().NotBeNull();
        finalNote.Subjective.Should().Contain("substernal chest pressure");
        finalNote.Plan.Should().Contain("clopidogrel");
    }

    [Fact]
    [Trait("Category", "Docker")]
    public async Task SignedNote_CannotBeEdited_ShouldReturnFailure()
    {
        await using var ctx = _sql.CreateContext();
        ctx.EnableAdminContext();

        var patient   = await _sql.SeedPatientAsync(ctx, mrn: "DOCKER-AMB-002");
        var provider  = await _sql.SeedProviderAsync(ctx, email: "docker.sign2@test.com");
        var encounter = await _sql.SeedEncounterAsync(ctx, patient.Id, provider.Id);
        var orgId     = SqlServerFixture.DefaultTenantId;

        var startR = await StartHandler(ctx).Handle(
            new StartRecordingSessionCommand(encounter.Id, patient.Id, provider.Id, orgId),
            CancellationToken.None);
        var rid = startR.Value.RecordingId;

        await ConsentHandler(ctx).Handle(
            new RecordConsentCommand(rid, true, "Dr. Test"), CancellationToken.None);

        var repo = new EncounterRecordingRepository(ctx);
        var note = AmbientNote.Create(rid, encounter.Id, orgId,
            "Subjective", "Objective", "Assessment", "Plan",
            modelVersion: "test-model", promptTokens: 100);

        await repo.AddNoteAsync(note, CancellationToken.None);
        await ctx.SaveChangesAsync();

        // Sign it first
        await SignHandler(ctx).Handle(
            new SignAmbientNoteCommand(note.Id, provider.Id), CancellationToken.None);

        // Attempt edit on signed note — domain throws, handler returns Failure
        var editResult = await EditHandler(ctx).Handle(
            new EditAmbientNoteCommand(
                note.Id, provider.Id,
                "Changed", "Changed", "Changed", "Changed"),
            CancellationToken.None);

        editResult.IsFailure.Should().BeTrue("signed notes are immutable — edit must be rejected");
    }

    [Fact]
    [Trait("Category", "Docker")]
    public async Task TranscriptSegments_OrderedByOffset_ShouldReturnChronological()
    {
        await using var ctx = _sql.CreateContext();
        ctx.EnableAdminContext();

        var patient   = await _sql.SeedPatientAsync(ctx, mrn: "DOCKER-AMB-003");
        var provider  = await _sql.SeedProviderAsync(ctx, email: "docker.order@test.com");
        var encounter = await _sql.SeedEncounterAsync(ctx, patient.Id, provider.Id);
        var orgId     = SqlServerFixture.DefaultTenantId;

        var startR = await StartHandler(ctx).Handle(
            new StartRecordingSessionCommand(encounter.Id, patient.Id, provider.Id, orgId),
            CancellationToken.None);
        var rid = startR.Value.RecordingId;

        await ConsentHandler(ctx).Handle(
            new RecordConsentCommand(rid, true, "Dr. Test"), CancellationToken.None);

        // Insert segments out-of-order to verify repo orders by OffsetMs
        var offsets = new[] { 9000, 0, 13000, 4000 };
        foreach (var offset in offsets)
        {
            await SegmentHandler(ctx).Handle(
                new AddTranscriptSegmentCommand(
                    rid, orgId, SpeakerRole.Provider, offset, 2000, $"Text at {offset}", 0.95m),
                CancellationToken.None);
        }

        var repo     = new EncounterRecordingRepository(ctx);
        var segments = await repo.GetSegmentsAsync(rid);

        segments.Count.Should().Be(4);
        segments.Select(s => s.OffsetMs)
            .Should().BeInAscendingOrder("repo must return segments ordered by OffsetMs");
    }
}
