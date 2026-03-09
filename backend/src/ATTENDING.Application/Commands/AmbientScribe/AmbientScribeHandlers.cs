using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Commands.AmbientScribe;

// ═══════════════════════════════════════════════════════════════════════════
// AMBIENT SCRIBE — Command Handlers
// ═══════════════════════════════════════════════════════════════════════════

public class StartRecordingSessionHandler
    : IRequestHandler<StartRecordingSessionCommand, Result<StartRecordingSessionResult>>
{
    private readonly IEncounterRecordingRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<StartRecordingSessionHandler> _logger;

    public StartRecordingSessionHandler(
        IEncounterRecordingRepository repo,
        IUnitOfWork uow,
        ILogger<StartRecordingSessionHandler> logger)
    {
        _repo = repo;
        _uow = uow;
        _logger = logger;
    }

    public async Task<Result<StartRecordingSessionResult>> Handle(
        StartRecordingSessionCommand cmd, CancellationToken ct)
    {
        // Prevent duplicate sessions for the same encounter
        var existing = await _repo.GetByEncounterIdAsync(cmd.EncounterId, ct);
        if (existing != null)
            return Result.Failure<StartRecordingSessionResult>(
                Error.Custom("Recording.AlreadyExists",
                    "A recording session already exists for this encounter."));

        var session = EncounterRecording.Create(
            cmd.EncounterId,
            cmd.PatientId,
            cmd.ProviderId,
            cmd.OrganizationId);

        await _repo.AddAsync(session, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Ambient scribe session created for Encounter {EncounterId}, Recording {RecordingId}",
            cmd.EncounterId, session.Id);

        return Result.Success(
            new StartRecordingSessionResult(session.Id, session.AudioBlobContainer!));
    }
}

public class RecordConsentHandler : IRequestHandler<RecordConsentCommand, Result<Unit>>
{
    private readonly IEncounterRecordingRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<RecordConsentHandler> _logger;

    public RecordConsentHandler(
        IEncounterRecordingRepository repo,
        IUnitOfWork uow,
        ILogger<RecordConsentHandler> logger)
    {
        _repo = repo;
        _uow = uow;
        _logger = logger;
    }

    public async Task<Result<Unit>> Handle(RecordConsentCommand cmd, CancellationToken ct)
    {
        var session = await _repo.GetByIdAsync(cmd.RecordingId, ct);
        if (session == null)
            return Result.Failure<Unit>(Error.NotFound);

        try
        {
            if (cmd.ConsentGiven)
                session.RecordConsent(cmd.CapturedBy);
            else
                session.DeclineConsent(cmd.CapturedBy);

            _repo.Update(session);
            await _uow.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Consent {Decision} for Recording {RecordingId} by {CapturedBy}",
                cmd.ConsentGiven ? "given" : "declined", cmd.RecordingId, cmd.CapturedBy);

            return Result.Success(Unit.Value);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<Unit>(Error.Custom("Recording.InvalidState", ex.Message));
        }
    }
}

public class AddTranscriptSegmentHandler : IRequestHandler<AddTranscriptSegmentCommand, Result<Guid>>
{
    private readonly IEncounterRecordingRepository _repo;
    private readonly IUnitOfWork _uow;

    public AddTranscriptSegmentHandler(IEncounterRecordingRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<Result<Guid>> Handle(AddTranscriptSegmentCommand cmd, CancellationToken ct)
    {
        // Enforce consent state machine: segments only accepted after consent is given.
        // HIPAA / state wiretapping law — audio cannot be processed without patient consent.
        var session = await _repo.GetByIdAsync(cmd.RecordingId, ct);
        if (session == null)
            return Result.Failure<Guid>(Error.NotFound);

        if (session.Status is not (RecordingStatus.ConsentGiven or RecordingStatus.Recording))
            return Result.Failure<Guid>(Error.Custom(
                "Recording.ConsentRequired",
                $"Transcript segments cannot be added in state '{session.Status}'. " +
                "Patient consent must be recorded first."));

        var segment = TranscriptSegment.Create(
            cmd.RecordingId,
            cmd.OrganizationId,
            cmd.Speaker,
            cmd.OffsetMs,
            cmd.DurationMs,
            cmd.Text,
            cmd.Confidence);

        await _repo.AddSegmentAsync(segment, ct);
        await _uow.SaveChangesAsync(ct);

        return Result.Success(segment.Id);
    }
}

public class StopRecordingHandler : IRequestHandler<StopRecordingCommand, Result<Unit>>
{
    private readonly IEncounterRecordingRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly IAmbientScribeService _scribeService;
    private readonly IPatientRepository _patientRepo;
    private readonly IClinicalNotificationService _notifications;
    private readonly ILogger<StopRecordingHandler> _logger;

    public StopRecordingHandler(
        IEncounterRecordingRepository repo,
        IUnitOfWork uow,
        IAmbientScribeService scribeService,
        IPatientRepository patientRepo,
        IClinicalNotificationService notifications,
        ILogger<StopRecordingHandler> logger)
    {
        _repo = repo;
        _uow = uow;
        _scribeService = scribeService;
        _patientRepo = patientRepo;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<Result<Unit>> Handle(StopRecordingCommand cmd, CancellationToken ct)
    {
        var session = await _repo.GetWithSegmentsAsync(cmd.RecordingId, ct);
        if (session == null)
            return Result.Failure<Unit>(Error.NotFound);

        try
        {
            session.StopRecording(); // → Processing
            _repo.Update(session);
            await _uow.SaveChangesAsync(ct);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<Unit>(Error.Custom("Recording.InvalidState", ex.Message));
        }

        // Generate the SOAP note — this is the core clinical value
        // Run with a fresh token: the HTTP request token is cancelled when
        // the response returns, but note generation must continue to completion.
        _ = Task.Run(async () =>
        {
            try
            {
                await GenerateNoteAsync(session, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background SOAP note generation failed for recording {RecordingId}", session.Id);
            }
        });

        return Result.Success(Unit.Value);
    }

    private async Task GenerateNoteAsync(EncounterRecording session, CancellationToken ct)
    {
        try
        {
            var segments = await _repo.GetSegmentsAsync(session.Id, ct);

            // Build clinical context from the patient record to improve note quality
            var patient = await _patientRepo.GetWithFullHistoryAsync(session.PatientId, ct);
            var context = new SoapNoteContext(
                ChiefComplaint: null, // extracted from transcript itself
                PatientAge: patient?.Age,
                PatientSex: patient?.Sex.ToString(),
                ActiveConditions: patient?.Conditions
                    .Where(c => c.IsActive)
                    .Select(c => c.Name)
                    .ToList() ?? [],
                CurrentMedications: [],
                Allergies: patient?.Allergies
                    .Where(a => a.IsActive)
                    .Select(a => a.Allergen)
                    .ToList() ?? [],
                EncounterType: null);

            var generated = await _scribeService.GenerateSoapNoteAsync(segments, context, ct);

            if (generated == null)
            {
                session.MarkFailed("AI service unavailable during note generation.");
                _repo.Update(session);
                await _uow.SaveChangesAsync(ct);
                _logger.LogWarning("Note generation failed (AI unavailable) for Recording {Id}", session.Id);
                return;
            }

            var note = AmbientNote.Create(
                session.Id,
                session.EncounterId,
                session.OrganizationId,
                generated.Subjective,
                generated.Objective,
                generated.Assessment,
                generated.Plan,
                generated.ModelVersion,
                generated.PromptTokens,
                generated.ExtractedDiagnosisCodes,
                generated.ExtractedMedications,
                generated.FollowUpInstructions);

            await _repo.AddNoteAsync(note, ct);
            session.MarkNoteGenerated();
            _repo.Update(session);
            await _uow.SaveChangesAsync(ct);

            // Push SignalR notification so provider dashboard updates live
            await _notifications.NotifyAmbientNoteReadyAsync(
                session.ProviderId,
                session.EncounterId,
                note.Id,
                ct);

            _logger.LogInformation(
                "Ambient SOAP note generated for Encounter {EncounterId}: " +
                "{Tokens} tokens, {EditCount} pre-sign edits",
                session.EncounterId, generated.PromptTokens, note.EditCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Note generation pipeline failed for Recording {Id}", session.Id);
            try
            {
                var freshSession = await _repo.GetByIdAsync(session.Id, ct);
                if (freshSession != null)
                {
                    freshSession.MarkFailed(ex.Message[..Math.Min(ex.Message.Length, 500)]);
                    _repo.Update(freshSession);
                    await _uow.SaveChangesAsync(ct);
                }
            }
            catch { /* best-effort failure mark */ }
        }
    }
}

public class EditAmbientNoteHandler : IRequestHandler<EditAmbientNoteCommand, Result<Unit>>
{
    private readonly IEncounterRecordingRepository _repo;
    private readonly IUnitOfWork _uow;

    public EditAmbientNoteHandler(IEncounterRecordingRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<Result<Unit>> Handle(EditAmbientNoteCommand cmd, CancellationToken ct)
    {
        var note = await _repo.GetNoteByIdAsync(cmd.NoteId, ct);
        if (note == null)
            return Result.Failure<Unit>(Error.NotFound);

        try
        {
            note.Edit(cmd.Subjective, cmd.Objective, cmd.Assessment, cmd.Plan,
                cmd.ProviderId.ToString());
            await _uow.SaveChangesAsync(ct);
            return Result.Success(Unit.Value);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<Unit>(Error.Custom("Note.InvalidState", ex.Message));
        }
    }
}

public class SignAmbientNoteHandler : IRequestHandler<SignAmbientNoteCommand, Result<Unit>>
{
    private readonly IEncounterRecordingRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<SignAmbientNoteHandler> _logger;

    public SignAmbientNoteHandler(
        IEncounterRecordingRepository repo,
        IUnitOfWork uow,
        ILogger<SignAmbientNoteHandler> logger)
    {
        _repo = repo;
        _uow = uow;
        _logger = logger;
    }

    public async Task<Result<Unit>> Handle(SignAmbientNoteCommand cmd, CancellationToken ct)
    {
        var note = await _repo.GetNoteByIdAsync(cmd.NoteId, ct);
        if (note == null)
            return Result.Failure<Unit>(Error.NotFound);

        try
        {
            note.Sign(cmd.ProviderId);
            await _uow.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Ambient note {NoteId} signed by Provider {ProviderId} " +
                "after {EditCount} edits",
                cmd.NoteId, cmd.ProviderId, note.EditCount);

            return Result.Success(Unit.Value);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<Unit>(Error.Custom("Note.InvalidState", ex.Message));
        }
    }
}
