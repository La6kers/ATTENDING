using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Application.Commands.AmbientScribe;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
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
    private readonly ILogger<AmbientScribeController> _logger;

    public AmbientScribeController(
        IMediator mediator,
        IEncounterRecordingRepository repo,
        ILogger<AmbientScribeController> logger)
    {
        _mediator = mediator;
        _repo = repo;
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
    /// </summary>
    [HttpPost("notes/{noteId:guid}/sign")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SignNote(
        Guid noteId,
        CancellationToken ct)
    {
        var providerId = GetCurrentUserId();

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
