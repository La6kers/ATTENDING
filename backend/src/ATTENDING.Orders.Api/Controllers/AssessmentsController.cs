using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Application.Commands.Assessments;
using ATTENDING.Application.Queries.Assessments;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Orders.Api.Extensions;
using ATTENDING.Application.Interfaces;

namespace ATTENDING.Orders.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
[EnableRateLimiting("tenant-api")]
public class AssessmentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IClinicalNotificationService _notifications;
    private readonly ILogger<AssessmentsController> _logger;

    public AssessmentsController(
        IMediator mediator, IClinicalNotificationService notifications,
        ILogger<AssessmentsController> logger)
    {
        _mediator = mediator;
        _notifications = notifications;
        _logger = logger;
    }

    /// <summary>
    /// List assessments with optional filters (status, triage, red flags).
    /// Used by the provider dashboard to show the assessment queue.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AssessmentSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AssessmentSummaryResponse>>> GetAll(
        [FromQuery] string? status = null,
        [FromQuery] string? triageLevel = null,
        [FromQuery] bool? hasRedFlags = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var (items, total) = await _mediator.Send(
            new GetAssessmentsListQuery(status, triageLevel, hasRedFlags, page, pageSize));

        return Ok(new PagedResult<AssessmentSummaryResponse>(
            items.Select(MapToSummary).ToList(),
            total, page, pageSize));
    }

    /// <summary>
    /// One-shot COMPASS assessment submission from the patient portal.
    /// Creates patient + completed assessment in a single request.
    /// Fires domain events for SignalR provider notifications.
    /// </summary>
    [HttpPost("submit")]
    [EnableRateLimiting("clinical-ops")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitCompassAssessment(
        [FromBody] SubmitCompassAssessmentCommand command)
    {
        var result = await _mediator.Send(command);

        if (result.IsFailure)
            return BadRequest(new ProblemDetails
            {
                Title = result.Error.Code,
                Detail = result.Error.Message,
                Status = 400
            });

        var val = result.Value;

        // Fire SignalR notifications (best-effort -- failure must not block the response)
        var submittedAssessment = await _mediator.Send(new GetAssessmentByIdQuery(val.AssessmentId));
        if (submittedAssessment != null)
            await FireAssessmentNotificationsAsync(
                submittedAssessment, submittedAssessment.IsEmergency, submittedAssessment.EmergencyReason);

        return Created($"/api/v1/assessments/{val.AssessmentId}", new
        {
            success = true,
            assessmentId = val.AssessmentId,
            queuePosition = val.QueuePosition,
            estimatedReviewTime = val.EstimatedReviewTime,
            urgentAlert = val.UrgentAlert,
            message = val.UrgentAlert
                ? "Your assessment has been flagged as urgent and will be reviewed immediately."
                : "Your assessment has been submitted. A provider will review it shortly."
        });
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AssessmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AssessmentResponse>> GetById(Guid id)
    {
        var assessment = await _mediator.Send(new GetAssessmentByIdQuery(id));
        if (assessment == null)
            return NotFound(new ProblemDetails { Title = "Assessment not found", Status = 404 });
        return Ok(MapToResponse(assessment));
    }

    [HttpGet("patient/{patientId:guid}")]
    public async Task<ActionResult<IEnumerable<AssessmentSummaryResponse>>> GetByPatient(Guid patientId)
    {
        var assessments = await _mediator.Send(new GetAssessmentsByPatientQuery(patientId));
        return Ok(assessments.Select(MapToSummary));
    }

    [HttpGet("pending-review")]
    public async Task<ActionResult<PagedResult<AssessmentSummaryResponse>>> GetPendingReview(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var assessments = await _mediator.Send(new GetPendingReviewAssessmentsQuery());
        return Ok(assessments.Select(MapToSummary).ToPagedResult(page, pageSize));
    }

    [HttpGet("red-flags")]
    public async Task<ActionResult<PagedResult<AssessmentSummaryResponse>>> GetWithRedFlags(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var assessments = await _mediator.Send(new GetRedFlagAssessmentsQuery());
        return Ok(assessments.Select(MapToSummary).ToPagedResult(page, pageSize));
    }

    [HttpPost]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(AssessmentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AssessmentResponse>> StartAssessment([FromBody] StartAssessmentRequest request)
    {
        var result = await _mediator.Send(new StartAssessmentCommand(request.PatientId, request.ChiefComplaint));

        if (result.IsFailure)
            return BadRequest(new ProblemDetails { Title = result.Error.Code, Detail = result.Error.Message, Status = 400 });

        var val = result.Value;

        var startedAssessment = await _mediator.Send(new GetAssessmentByIdQuery(val.AssessmentId));
        if (startedAssessment != null)
        {
            await FireAssessmentNotificationsAsync(
                startedAssessment, val.IsEmergency, val.EmergencyReason);
            return CreatedAtAction(nameof(GetById), new { id = startedAssessment.Id }, MapToResponse(startedAssessment));
        }
        return CreatedAtAction(nameof(GetById), new { id = val.AssessmentId },
            new { id = val.AssessmentId, assessmentNumber = val.AssessmentNumber });
    }

    [HttpPost("{id:guid}/responses")]
    [EnableRateLimiting("clinical-ops")]
    public async Task<ActionResult<AssessmentResponse>> SubmitResponse(Guid id, [FromBody] SubmitAssessmentResponseRequest request)
    {
        var result = await _mediator.Send(new SubmitAssessmentResponseCommand(id, request.Question, request.Response));

        if (result.IsFailure)
            return BadRequest(new ProblemDetails { Title = result.Error.Code, Detail = result.Error.Message, Status = 400 });

        var val = result.Value;
        if (val.HasNewRedFlags && val.IsEmergency)
        {
            var updatedForNotify = await _mediator.Send(new GetAssessmentByIdQuery(id));
            if (updatedForNotify != null)
                await FireAssessmentNotificationsAsync(updatedForNotify, true, val.EmergencyReason);
        }

        var updated = await _mediator.Send(new GetAssessmentByIdQuery(id));
        return updated != null ? Ok(MapToResponse(updated)) : NotFound();
    }

    [HttpPost("{id:guid}/advance")]
    [EnableRateLimiting("clinical-ops")]
    public async Task<ActionResult<AssessmentResponse>> AdvancePhase(Guid id, [FromBody] AdvanceAssessmentRequest request)
    {
        if (!Enum.TryParse<AssessmentPhase>(request.NewPhase, out var newPhase))
            return BadRequest(new ProblemDetails { Title = "Invalid phase", Status = 400 });

        var result = await _mediator.Send(new AdvanceAssessmentPhaseCommand(id, newPhase, request.Data));

        if (result.IsFailure)
            return BadRequest(new ProblemDetails { Title = result.Error.Code, Detail = result.Error.Message, Status = 400 });

        var assessment = await _mediator.Send(new GetAssessmentByIdQuery(id));
        return assessment != null ? Ok(MapToResponse(assessment)) : NotFound();
    }

    [HttpPost("{id:guid}/complete")]
    [EnableRateLimiting("clinical-ops")]
    public async Task<ActionResult<AssessmentResponse>> CompleteAssessment(Guid id, [FromBody] CompleteAssessmentRequest request)
    {
        if (!Enum.TryParse<TriageLevel>(request.TriageLevel, out var triageLevel))
            return BadRequest(new ProblemDetails { Title = "Invalid triage level", Status = 400 });

        var result = await _mediator.Send(new CompleteAssessmentCommand(id, triageLevel, request.Summary));

        if (result.IsFailure)
            return BadRequest(new ProblemDetails { Title = result.Error.Code, Detail = result.Error.Message, Status = 400 });

        var assessment = await _mediator.Send(new GetAssessmentByIdQuery(id));
        return assessment != null ? Ok(MapToResponse(assessment)) : NotFound();
    }

    [HttpPost("{id:guid}/review")]
    [EnableRateLimiting("clinical-ops")]
    public async Task<IActionResult> ReviewAssessment(Guid id, [FromBody] ReviewAssessmentRequest request)
    {
        var providerId = GetCurrentUserId();
        var result = await _mediator.Send(new ReviewAssessmentCommand(id, providerId, request.Notes));
        return result.ToNoContent();
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst("sub")?.Value ?? User.FindFirst("oid")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    /// <summary>
    /// Fires SignalR notifications for a newly created or updated assessment.
    /// Extracted from three separate action methods to eliminate the repeated
    /// 30-line notification block that existed in SubmitCompassAssessment,
    /// StartAssessment, and SubmitResponse.
    ///
    /// Failures are caught and logged as warnings -- notification delivery is
    /// best-effort and must never prevent the clinical response from being returned.
    /// </summary>
    private async Task FireAssessmentNotificationsAsync(
        Domain.Entities.PatientAssessment assessment,
        bool isEmergency,
        string? emergencyReason)
    {
        try
        {
            await _notifications.NotifyNewAssessmentAsync(new NewAssessmentNotification(
                AssessmentId:    assessment.Id,
                AssessmentNumber: assessment.AssessmentNumber,
                PatientId:       assessment.PatientId,
                PatientName:     assessment.Patient?.FullName ?? "Unknown",
                PatientMrn:      assessment.Patient?.MRN ?? "",
                PatientAge:      assessment.Patient?.Age ?? 0,
                ChiefComplaint:  assessment.ChiefComplaint,
                TriageLevel:     assessment.TriageLevel?.ToString(),
                HasRedFlags:     assessment.HasRedFlags,
                StartedAt:       assessment.StartedAt));

            if (isEmergency)
            {
                await _notifications.NotifyEmergencyAssessmentAsync(new EmergencyAssessmentNotification(
                    AssessmentId:      assessment.Id,
                    AssessmentNumber:  assessment.AssessmentNumber,
                    PatientId:         assessment.PatientId,
                    PatientName:       assessment.Patient?.FullName ?? "Unknown",
                    PatientMrn:        assessment.Patient?.MRN ?? "",
                    ChiefComplaint:    assessment.ChiefComplaint,
                    EmergencyReason:   emergencyReason ?? "Red flags detected",
                    RedFlagCategories: new List<string>(),
                    DetectedAt:        DateTime.UtcNow));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to send SignalR notifications for assessment {Id}", assessment.Id);
        }
    }

    private static AssessmentResponse MapToResponse(Domain.Entities.PatientAssessment a)
    {
        return new AssessmentResponse(
            Id: a.Id, AssessmentNumber: a.AssessmentNumber, PatientId: a.PatientId,
            Patient: a.Patient != null ? new PatientSummaryResponse(
                a.Patient.Id, a.Patient.MRN, a.Patient.FullName, a.Patient.Age, a.Patient.Sex.ToString()) : null,
            ChiefComplaint: a.ChiefComplaint, CurrentPhase: a.CurrentPhase.ToString(),
            TriageLevel: a.TriageLevel?.ToString(), PainSeverity: a.PainSeverity,
            Hpi: a.HpiOnset != null ? new HpiResponse(
                a.HpiOnset, a.HpiLocation, a.HpiDuration, a.HpiCharacter,
                a.HpiAggravating, a.HpiRelieving, a.HpiTiming, a.HpiSeverity,
                a.HpiContext, a.HpiAssociatedSymptoms) : null,
            HasRedFlags: a.HasRedFlags,
            RedFlags: a.RedFlagsJson != null
                ? System.Text.Json.JsonSerializer.Deserialize<List<RedFlagResponse>>(a.RedFlagsJson) : null,
            IsEmergency: a.IsEmergency, EmergencyReason: a.EmergencyReason,
            StartedAt: a.StartedAt, CompletedAt: a.CompletedAt, ReviewedAt: a.ReviewedAt);
    }

    private static AssessmentSummaryResponse MapToSummary(Domain.Entities.PatientAssessment a)
    {
        return new AssessmentSummaryResponse(
            Id: a.Id, AssessmentNumber: a.AssessmentNumber,
            Patient: a.Patient != null ? new PatientSummaryResponse(
                a.Patient.Id, a.Patient.MRN, a.Patient.FullName, a.Patient.Age, a.Patient.Sex.ToString()) : null,
            ChiefComplaint: a.ChiefComplaint, CurrentPhase: a.CurrentPhase.ToString(),
            TriageLevel: a.TriageLevel?.ToString(), HasRedFlags: a.HasRedFlags,
            IsEmergency: a.IsEmergency, StartedAt: a.StartedAt, CompletedAt: a.CompletedAt);
    }
}

public record CompleteAssessmentRequest(string TriageLevel, string? Summary);
public record ReviewAssessmentRequest(string? Notes);
