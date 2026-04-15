using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Application.Commands.AmbientScribe;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// Ambient AI Scribe — real-time encounter recording and SOAP note generation.
///
/// Flow:
///   POST /sessions                → create session (AwaitingConsent)
///   POST /sessions/{id}/consent   → record patient consent
///   POST /sessions/{id}/segments  → stream transcript segments during encounter
///   POST /sessions/{id}/stop      → stop recording, trigger async AI generation
///   GET  /sessions/{id}/status    → poll for note ready (or receive SignalR push)
///   GET  /notes/{encounterId}     → get generated SOAP note
///   PUT  /notes/{noteId}          → provider edits note
///   POST /notes/{noteId}/sign     → provider signs note → permanent record
///
/// The provider never has to open a separate documentation tool.
/// The note is ready and waiting by the time the encounter ends.
/// </summary>
[ApiController]
[Route("api/v1/scribe")]
[Authorize]
[Produces("application/json")]
public class AmbientScribeController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IEncounterRecordingRepository _repo;
    private readonly IBehavioralHealthRepository _bhRepo;
    private readonly ILogger<AmbientScribeController> _logger;

    public AmbientScribeController(
        IMediator mediator,
        IEncounterRecordingRepository repo,
        IBehavioralHealthRepository bhRepo,
        ILogger<AmbientScribeController> logger)
    {
        _mediator = mediator;
        _repo = repo;
        _bhRepo = bhRepo;
        _logger = logger;
    }

    // ── Session lifecycle ─────────────────────────────────────────────────

    /// <summary>
    /// Create a new recording session for an encounter.
    /// Returns the session ID and blob container name for direct audio upload.
    /// </summary>
    [HttpPost("sessions")]
    [ProducesResponseType(typeof(StartRecordingResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StartRecordingResponse>> StartSession(
        [FromBody] StartRecordingRequest request,
        CancellationToken ct)
    {
        var providerId = GetCurrentUserId();
        var orgId = GetCurrentTenantId();

        // Verify the encounter belongs to the current provider
        var existingSession = await _repo.GetByEncounterIdAsync(request.EncounterId, ct);
        if (existingSession != null && existingSession.ProviderId != providerId && !User.IsInRole("Admin"))
            return Forbid();

        var result = await _mediator.Send(
            new StartRecordingSessionCommand(
                request.EncounterId,
                request.PatientId,
                providerId,
                orgId), ct);

        if (result.IsFailure)
            return Conflict(new ProblemDetails
            {
                Title = "Cannot start recording session",
                Detail = result.Error.Message,
                Status = 409
            });

        var response = new StartRecordingResponse(
            result.Value.RecordingId,
            result.Value.AudioBlobContainer,
            "AwaitingConsent");

        return CreatedAtAction(
            nameof(GetStatus),
            new { recordingId = result.Value.RecordingId },
            response);
    }

    /// <summary>
    /// Record patient consent or decline to recording.
    /// Must be called before audio capture can start.
    /// </summary>
    [HttpPost("sessions/{recordingId:guid}/consent")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordConsent(
        Guid recordingId,
        [FromBody] RecordConsentRequest request,
        CancellationToken ct)
    {
        // Ownership check: only the provider who owns this session can record consent
        var session = await _repo.GetByIdAsync(recordingId, ct);
        if (session == null)
            return NotFound(new ProblemDetails { Title = "Recording session not found", Status = 404 });
        if (session.ProviderId != GetCurrentUserId() && !User.IsInRole("Admin"))
            return Forbid();

        var result = await _mediator.Send(
            new RecordConsentCommand(recordingId, request.ConsentGiven, request.CapturedBy), ct);

        return result.IsSuccess
            ? NoContent()
            : BadRequest(new ProblemDetails
            {
                Title = "Cannot record consent",
                Detail = result.Error.Message,
                Status = 400
            });
    }

    /// <summary>
    /// Add a real-time transcript segment from the Azure Speech SDK stream.
    /// Call this endpoint for each recognized phrase during the encounter.
    /// Returns the segment ID for confirmation.
    /// </summary>
    [HttpPost("sessions/{recordingId:guid}/segments")]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddSegment(
        Guid recordingId,
        [FromBody] AddTranscriptSegmentRequest request,
        CancellationToken ct)
    {
        // Ownership check: only the provider who owns this session can add segments
        var session = await _repo.GetByIdAsync(recordingId, ct);
        if (session == null)
            return NotFound(new ProblemDetails { Title = "Recording session not found", Status = 404 });
        if (session.ProviderId != GetCurrentUserId() && !User.IsInRole("Admin"))
            return Forbid();

        var orgId = GetCurrentTenantId();

        var speaker = Enum.TryParse<Domain.Enums.SpeakerRole>(request.Speaker, ignoreCase: true, out var parsed)
            ? parsed
            : Domain.Enums.SpeakerRole.Unknown;

        var result = await _mediator.Send(
            new AddTranscriptSegmentCommand(
                recordingId,
                orgId,
                speaker,
                request.OffsetMs,
                request.DurationMs,
                request.Text,
                request.Confidence), ct);

        if (result.IsFailure)
            return BadRequest(new ProblemDetails
            {
                Title = "Cannot add segment",
                Detail = result.Error.Message,
                Status = 400
            });

        return Created(string.Empty, new { SegmentId = result.Value });
    }

    /// <summary>
    /// Stop audio capture and trigger async AI SOAP note generation.
    /// Returns immediately — the provider receives a SignalR push when the
    /// note is ready, or can poll GET /sessions/{id}/status.
    /// </summary>
    [HttpPost("sessions/{recordingId:guid}/stop")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> StopRecording(
        Guid recordingId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new StopRecordingCommand(recordingId), ct);

        return result.IsSuccess
            ? Accepted(new { Message = "Note generation started. You will be notified when ready." })
            : BadRequest(new ProblemDetails
            {
                Title = "Cannot stop recording",
                Detail = result.Error.Message,
                Status = 400
            });
    }

    /// <summary>
    /// Poll recording status and note availability.
    /// The SignalR event AmbientNoteReady is the preferred notification path,
    /// but this endpoint supports polling as a fallback.
    /// </summary>
    [HttpGet("sessions/{recordingId:guid}/status")]
    [ProducesResponseType(typeof(RecordingStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecordingStatusResponse>> GetStatus(
        Guid recordingId,
        CancellationToken ct)
    {
        var session = await _repo.GetWithNoteAsync(recordingId, ct);
        if (session == null)
            return NotFound(new ProblemDetails { Title = "Recording session not found", Status = 404 });

        // Ownership check: only the provider who created this session can view its status
        if (session.ProviderId != GetCurrentUserId() && !User.IsInRole("Admin"))
            return Forbid();

        return Ok(new RecordingStatusResponse(
            session.Id,
            session.EncounterId,
            session.Status.ToString(),
            session.ConsentGiven,
            session.RecordingStartedAt,
            session.RecordingEndedAt,
            session.TotalAudioSeconds,
            session.GeneratedNote != null,
            session.GeneratedNote?.Id));
    }

    // ── Note lifecycle ────────────────────────────────────────────────────

    /// <summary>
    /// Get the AI-generated SOAP note for a given encounter.
    /// Returns the full note content ready for provider review and editing.
    /// </summary>
    [HttpGet("notes/encounter/{encounterId:guid}")]
    [ProducesResponseType(typeof(AmbientNoteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AmbientNoteResponse>> GetNoteByEncounter(
        Guid encounterId,
        CancellationToken ct)
    {
        var note = await _repo.GetNoteByEncounterIdAsync(encounterId, ct);
        if (note == null)
            return NotFound(new ProblemDetails
            {
                Title = "No note found for this encounter",
                Detail = "The note may still be generating. Check session status.",
                Status = 404
            });

        // Ownership check: verify the encounter's recording belongs to the current provider
        var session = await _repo.GetByIdAsync(note.RecordingId, ct);
        if (session != null && session.ProviderId != GetCurrentUserId() && !User.IsInRole("Admin"))
            return Forbid();

        return Ok(MapNoteToResponse(note));
    }

    /// <summary>
    /// Provider edits sections of the AI-generated note before signing.
    /// All edits are tracked — EditCount increments for audit purposes.
    /// </summary>
    [HttpPut("notes/{noteId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EditNote(
        Guid noteId,
        [FromBody] EditNoteRequest request,
        CancellationToken ct)
    {
        var providerId = GetCurrentUserId();

        // Ownership check: verify the note belongs to the current provider
        var note = await _repo.GetNoteByIdAsync(noteId, ct);
        if (note == null)
            return NotFound(new ProblemDetails { Title = "Note not found", Status = 404 });
        var session = await _repo.GetByIdAsync(note.RecordingId, ct);
        if (session != null && session.ProviderId != providerId && !User.IsInRole("Admin"))
            return Forbid();

        var result = await _mediator.Send(
            new EditAmbientNoteCommand(
                noteId,
                providerId,
                request.Subjective,
                request.Objective,
                request.Assessment,
                request.Plan), ct);

        return result.IsSuccess
            ? NoContent()
            : BadRequest(new ProblemDetails
            {
                Title = "Cannot edit note",
                Detail = result.Error.Message,
                Status = 400
            });
    }

    /// <summary>
    /// Provider signs the reviewed note.
    /// Signed notes become part of the permanent medical record.
    /// Cannot be edited after signing — an addendum would be a new note.
    ///
    /// SAFETY GATE: Notes cannot be signed when the linked encounter has an
    /// open behavioral health screening with a positive result that requires
    /// a safety plan (PHQ-9 item 9 ≥ 1, C-SSRS ideation level ≥ 2, or any
    /// active suicide risk). The provider must complete the safety plan
    /// review FIRST. This enforces CMS quality measure CMS161 (suicide risk
    /// assessment for MDD) and CMS2 (depression screening with follow-up).
    /// </summary>
    [HttpPost("notes/{noteId:guid}/sign")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SignNote(
        Guid noteId,
        CancellationToken ct)
    {
        var providerId = GetCurrentUserId();

        // Validate all SOAP sections are populated before signing
        var note = await _repo.GetNoteByIdAsync(noteId, ct);
        if (note == null)
            return NotFound(new ProblemDetails { Title = "Note not found", Status = 404 });

        // Ownership check: verify the note belongs to the current provider
        var session = await _repo.GetByIdAsync(note.RecordingId, ct);
        if (session != null && session.ProviderId != providerId && !User.IsInRole("Admin"))
            return Forbid();

        if (string.IsNullOrWhiteSpace(note.Subjective) ||
            string.IsNullOrWhiteSpace(note.Objective) ||
            string.IsNullOrWhiteSpace(note.Assessment) ||
            string.IsNullOrWhiteSpace(note.Plan))
        {
            return BadRequest("Cannot sign note: all SOAP sections must be populated");
        }

        // ── SAFETY PLAN GATE ──────────────────────────────────────────────
        // Block signing if any behavioral health screening on this encounter
        // has a positive result that requires safety plan documentation and
        // the provider has not yet completed the review.
        var blockingScreenings = await GetBlockingBehavioralHealthScreeningsAsync(
            note.EncounterId, ct);

        if (blockingScreenings.Count > 0)
        {
            _logger.LogWarning(
                "[SafetyGate] Note {NoteId} sign blocked — {Count} positive BH screening(s) require safety plan",
                noteId, blockingScreenings.Count);

            var detail = BuildSafetyGateMessage(blockingScreenings);
            return Conflict(new ProblemDetails
            {
                Type = "https://attendingai.health/errors/safety-plan-required",
                Title = "Safety plan required before signing note",
                Detail = detail,
                Status = StatusCodes.Status409Conflict,
                Extensions =
                {
                    ["screeningIds"] = blockingScreenings.Select(s => s.Id).ToArray(),
                    ["recommendedActions"] = blockingScreenings
                        .Select(s => s.RecommendedAction.ToString())
                        .ToArray(),
                    ["cmsMeasures"] = new[] { "CMS2", "CMS161" },
                }
            });
        }

        var result = await _mediator.Send(
            new SignAmbientNoteCommand(noteId, providerId), ct);

        return result.IsSuccess
            ? NoContent()
            : BadRequest(new ProblemDetails
            {
                Title = "Cannot sign note",
                Detail = result.Error.Message,
                Status = 400
            });
    }

    /// <summary>
    /// Returns the list of behavioral health screenings on an encounter that
    /// would block note signing because they have a positive result requiring
    /// a safety plan AND the safety plan has not yet been documented.
    ///
    /// A screening blocks signing when ALL of these are true:
    ///   1. RecommendedAction is SafetyPlanRequired or ImmediateSafetyIntervention
    ///      (i.e. the patient screened positive for SI/active risk)
    ///   2. Status is NOT Reviewed/Completed (review not yet done)
    ///   3. SafetyPlanJson is null/empty (no safety plan documented)
    /// </summary>
    private async Task<IReadOnlyList<BehavioralHealthScreening>>
        GetBlockingBehavioralHealthScreeningsAsync(Guid encounterId, CancellationToken ct)
    {
        var screenings = await _bhRepo.GetByEncounterIdAsync(encounterId, ct);
        return screenings
            .Where(s =>
                (s.RecommendedAction == BehavioralHealthAction.SafetyPlanRequired
                 || s.RecommendedAction == BehavioralHealthAction.ImmediateSafetyIntervention)
                && s.Status != ScreeningStatus.Reviewed
                && s.Status != ScreeningStatus.Completed
                && string.IsNullOrWhiteSpace(s.SafetyPlanJson))
            .ToList();
    }

    private static string BuildSafetyGateMessage(
        IReadOnlyList<BehavioralHealthScreening> blockingScreenings)
    {
        var lines = blockingScreenings.Select(s =>
            $"  • {s.Instrument} (completed {s.CompletedAt?.ToString("yyyy-MM-dd") ?? "n/a"}) — " +
            $"{s.RecommendedAction}; HasSuicideRisk={s.HasSuicideRisk}");
        return
            "This encounter has one or more positive behavioral health screening(s) that " +
            "require a safety plan before the note can be signed.\n\n" +
            string.Join("\n", lines) + "\n\n" +
            "Document a safety plan via POST /api/v1/behavioral-health/screenings/{id}/review " +
            "(include safetyPlanJson) and then retry signing.\n\n" +
            "Required for compliance with CMS2 (depression screening + follow-up plan) " +
            "and CMS161 (adult MDD suicide risk assessment).";
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static AmbientNoteResponse MapNoteToResponse(Domain.Entities.AmbientNote note) =>
        new(
            note.Id,
            note.EncounterId,
            note.Status.ToString(),
            note.Subjective,
            note.Objective,
            note.Assessment,
            note.Plan,
            note.ExtractedDiagnosisCodes,
            note.ExtractedMedications,
            note.FollowUpInstructions,
            note.ModelVersion,
            note.EditCount,
            note.GeneratedAt,
            note.SignedAt,
            note.SignedByProviderId);

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst("sub")?.Value ?? User.FindFirst("oid")?.Value;
        if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out var id) || id == Guid.Empty)
            throw new UnauthorizedAccessException("Valid user identity is required.");
        return id;
    }

    private Guid GetCurrentTenantId()
    {
        var claim = User.FindFirst("tid")?.Value ?? User.FindFirst("tenantId")?.Value;
        if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out var id) || id == Guid.Empty)
            throw new UnauthorizedAccessException("Valid tenant identity is required.");
        return id;
    }
}
