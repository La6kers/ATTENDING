using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Application.Commands.BehavioralHealth;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Orders.Api.Extensions;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// Behavioral health screening endpoints.
///
/// Covers: PHQ-9, GAD-7, C-SSRS, AUDIT-C, PC-PTSD-5.
///
/// 42 CFR Part 2 enforcement:
///   Responses to GET endpoints that return a screening marked IsPartTwoProtected
///   will include the PartTwoConsentGiven field. Callers MUST check this before
///   disclosing SUD-related data to third parties (insurance, other providers outside
///   a formal treatment relationship). This controller does NOT auto-redact; that
///   responsibility sits with the consuming application layer and the data-sharing
///   consent workflow.
///
/// Safety pipeline:
///   C-SSRS with IdeationLevel >= ActiveIdeationWithPlan fires SuicideRiskDetectedEvent
///   which routes through the same emergency notification hub as RedFlagDetectedEvent.
///   Provider dashboard receives a real-time SignalR alert regardless of page state.
/// </summary>
[ApiController]
[Route("api/v1/behavioral-health")]
[Authorize]
[Produces("application/json")]
[EnableRateLimiting("tenant-api")]
public class BehavioralHealthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IBehavioralHealthRepository _repo;
    private readonly ILogger<BehavioralHealthController> _logger;

    public BehavioralHealthController(
        IMediator mediator,
        IBehavioralHealthRepository repo,
        ILogger<BehavioralHealthController> logger)
    {
        _mediator = mediator;
        _repo = repo;
        _logger = logger;
    }

    // ── Screening lifecycle ───────────────────────────────────────────────

    /// <summary>
    /// Start a new behavioral health screening session.
    /// Called by the provider when initiating a validated instrument (e.g., PHQ-9).
    /// Optionally links to an existing encounter or COMPASS assessment session.
    /// </summary>
    [HttpPost("screenings")]
    [ProducesResponseType(typeof(ScreeningStarted), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> StartScreening(
        [FromBody] StartScreeningRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new StartScreeningCommand(
            request.PatientId,
            request.ProviderId,
            request.Instrument,
            request.EncounterId,
            request.AssessmentId), ct);

        return result.ToCreatedAtAction(nameof(GetScreening), new { id = result.Value?.ScreeningId });
    }

    /// <summary>
    /// Record a single item response for an in-progress screening.
    /// Call once per instrument item as the patient answers.
    /// </summary>
    [HttpPost("screenings/{id:guid}/responses")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> AddResponse(
        Guid id,
        [FromBody] AddScreeningResponseRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new AddScreeningResponseCommand(
            id,
            request.ItemNumber,
            request.QuestionText,
            request.ResponseValue,
            request.ResponseText), ct);

        return result.ToNoContent();
    }

    /// <summary>
    /// Score a completed screening.
    ///
    /// For PHQ-9, GAD-7, AUDIT-C, PC-PTSD-5: provide ItemScores array.
    /// For C-SSRS: provide CssrsIdeationLevel and CssrsBehaviorType enums
    ///   (clinician-rated, not item-score-summed).
    ///
    /// Returns the score, interpretation, recommended action, and safety flags.
    /// If HasSuicideRisk is true, a real-time provider alert has already fired.
    /// If IsPartTwoProtected is true, 42 CFR Part 2 consent workflow is required
    /// before disclosing this record to third parties.
    /// </summary>
    [HttpPost("screenings/{id:guid}/score")]
    [ProducesResponseType(typeof(ScreeningScored), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ScreeningScored>> ScoreScreening(
        Guid id,
        [FromBody] ScoreScreeningRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new ScoreScreeningCommand(
            id,
            request.ItemScores ?? Array.Empty<int>(),
            request.CssrsIdeationLevel,
            request.CssrsBehaviorType,
            request.IsFemaleOrPregnant), ct);

        return result.ToOk();
    }

    /// <summary>
    /// Provider documents the clinical action taken after reviewing a completed screening.
    /// Required for quality reporting and care gap closure.
    /// For C-SSRS high-risk: SafetyPlanJson should contain the Stanley-Brown Safety Plan.
    /// </summary>
    [HttpPost("screenings/{id:guid}/review")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ReviewScreening(
        Guid id,
        [FromBody] ReviewScreeningRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new ReviewScreeningCommand(
            id,
            request.ProviderId,
            request.ActionTaken,
            request.Notes,
            request.SafetyPlanJson), ct);

        return result.ToNoContent();
    }

    /// <summary>
    /// Record 42 CFR Part 2 consent decision for a substance-use-related screening.
    /// Must be called before a Part 2 record can be disclosed to third parties.
    /// </summary>
    [HttpPost("screenings/{id:guid}/part2-consent")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> RecordPartTwoConsent(
        Guid id,
        [FromBody] RecordPartTwoConsentRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new RecordPartTwoConsentCommand(
            id,
            request.ConsentGiven,
            request.CapturedBy), ct);

        return result.ToNoContent();
    }

    // ── Queries ───────────────────────────────────────────────────────────

    /// <summary>
    /// Get a screening by ID (with item responses).
    /// </summary>
    [HttpGet("screenings/{id:guid}")]
    [ProducesResponseType(typeof(ScreeningDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetScreening(Guid id, CancellationToken ct)
    {
        var screening = await _repo.GetWithResponsesAsync(id, ct);
        if (screening is null) return NotFound();
        return Ok(MapToDetail(screening));
    }

    /// <summary>
    /// Get all screenings for a patient, newest first.
    /// </summary>
    [HttpGet("patients/{patientId:guid}/screenings")]
    [ProducesResponseType(typeof(IReadOnlyList<ScreeningDetailResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPatientScreenings(
        Guid patientId, [FromQuery] int skip = 0, [FromQuery] int take = 20, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        var screenings = await _repo.GetByPatientIdAsync(patientId, ct);
        return Ok(screenings.Skip(skip).Take(take).Select(MapToDetail).ToList());
    }

    /// <summary>
    /// Get all screenings for an encounter.
    /// </summary>
    [HttpGet("encounters/{encounterId:guid}/screenings")]
    [ProducesResponseType(typeof(IReadOnlyList<ScreeningDetailResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEncounterScreenings(Guid encounterId, CancellationToken ct)
    {
        var screenings = await _repo.GetByEncounterIdAsync(encounterId, ct);
        return Ok(screenings.Select(MapToDetail).ToList());
    }

    /// <summary>
    /// Get all completed screenings pending provider review.
    /// Used by the provider dashboard action queue.
    /// </summary>
    [HttpGet("screenings/pending-review")]
    [ProducesResponseType(typeof(IReadOnlyList<ScreeningDetailResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingReview(CancellationToken ct)
    {
        var screenings = await _repo.GetPendingReviewAsync(ct);
        return Ok(screenings.Select(MapToDetail).ToList());
    }

    /// <summary>
    /// Get all unreviewed screenings with active suicide risk.
    /// SAFETY CRITICAL — used by the provider dashboard emergency alerts panel.
    /// Returns ALL such records regardless of 42 CFR Part 2 status
    /// (safety overrides restricted disclosure per 42 CFR 2.51).
    /// </summary>
    [HttpGet("screenings/active-suicide-risk")]
    [Authorize(Roles = "Provider,EmergencyResponder")]
    [ProducesResponseType(typeof(IReadOnlyList<ScreeningDetailResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActiveSuicideRisk(CancellationToken ct)
    {
        var screenings = await _repo.GetActiveSuicideRiskAsync(ct);

        if (screenings.Any())
        {
            _logger.LogWarning(
                "Active suicide risk query returned {Count} unreviewed screening(s)",
                screenings.Count);
        }

        return Ok(screenings.Select(MapToDetail).ToList());
    }

    // ── Mapping ───────────────────────────────────────────────────────────

    private static ScreeningDetailResponse MapToDetail(Domain.Entities.BehavioralHealthScreening s) =>
        new(
            s.Id,
            s.PatientId,
            s.EncounterId,
            s.AssessmentId,
            s.Instrument,
            s.Status,
            s.TotalScore,
            s.ScoreInterpretation,
            s.DepressionSeverity,
            s.AnxietySeverity,
            s.SuicideIdeationLevel,
            s.SuicideBehaviorType,
            s.AlcoholRiskLevel,
            s.PtsdScreenResult,
            s.HasSuicideRisk,
            s.IsPartTwoProtected,
            s.PartTwoConsentGiven,
            s.RecommendedAction,
            s.ActionTaken,
            s.StartedAt,
            s.CompletedAt,
            s.ReviewedAt,
            s.NextScreeningDue,
            s.Responses.Select(r => new ScreeningResponseDto(
                r.ItemNumber, r.QuestionText, r.ResponseValue, r.ResponseText)).ToList()
        );
}

// ── Request / Response DTOs ───────────────────────────────────────────────

public record StartScreeningRequest(
    Guid PatientId,
    Guid ProviderId,
    ScreeningInstrument Instrument,
    Guid? EncounterId,
    Guid? AssessmentId);

public record AddScreeningResponseRequest(
    int ItemNumber,
    string QuestionText,
    int ResponseValue,
    string ResponseText);

public record ScoreScreeningRequest(
    int[]? ItemScores,
    SuicideIdeationLevel? CssrsIdeationLevel,
    SuicideBehaviorType? CssrsBehaviorType,
    bool IsFemaleOrPregnant = false);

public record ReviewScreeningRequest(
    Guid ProviderId,
    BehavioralHealthAction ActionTaken,
    string? Notes,
    string? SafetyPlanJson);

public record RecordPartTwoConsentRequest(
    bool ConsentGiven,
    string CapturedBy);

public record ScreeningDetailResponse(
    Guid Id,
    Guid PatientId,
    Guid? EncounterId,
    Guid? AssessmentId,
    ScreeningInstrument Instrument,
    ScreeningStatus Status,
    int? TotalScore,
    string? ScoreInterpretation,
    DepressionSeverity? DepressionSeverity,
    AnxietySeverity? AnxietySeverity,
    SuicideIdeationLevel? SuicideIdeationLevel,
    SuicideBehaviorType? SuicideBehaviorType,
    AlcoholRiskLevel? AlcoholRiskLevel,
    PtsdScreenResult? PtsdScreenResult,
    bool HasSuicideRisk,
    bool IsPartTwoProtected,
    bool? PartTwoConsentGiven,
    BehavioralHealthAction RecommendedAction,
    BehavioralHealthAction? ActionTaken,
    DateTime StartedAt,
    DateTime? CompletedAt,
    DateTime? ReviewedAt,
    DateTime? NextScreeningDue,
    IReadOnlyList<ScreeningResponseDto> Responses);

public record ScreeningResponseDto(
    int ItemNumber,
    string QuestionText,
    int ResponseValue,
    string ResponseText);
