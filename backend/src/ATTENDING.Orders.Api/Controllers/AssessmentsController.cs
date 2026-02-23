using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Application.Commands.Assessments;
using ATTENDING.Application.Queries.Assessments;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Orders.Api.Extensions;
using ATTENDING.Orders.Api.Hubs;

namespace ATTENDING.Orders.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
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
    [ProducesResponseType(typeof(AssessmentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AssessmentResponse>> StartAssessment([FromBody] StartAssessmentRequest request)
    {
        var result = await _mediator.Send(new StartAssessmentCommand(request.PatientId, request.ChiefComplaint));

        if (result.IsFailure)
            return BadRequest(new ProblemDetails { Title = result.Error.Code, Detail = result.Error.Message, Status = 400 });

        var val = result.Value;

        try
        {
            var assessment = await _mediator.Send(new GetAssessmentByIdQuery(val.AssessmentId));
            if (assessment != null)
            {
                await _notifications.NotifyNewAssessmentAsync(new NewAssessmentNotification(
                    AssessmentId: assessment.Id, AssessmentNumber: assessment.AssessmentNumber,
                    PatientId: assessment.PatientId, PatientName: assessment.Patient?.FullName ?? "Unknown",
                    PatientMrn: assessment.Patient?.MRN ?? "", PatientAge: assessment.Patient?.Age ?? 0,
                    ChiefComplaint: assessment.ChiefComplaint, TriageLevel: assessment.TriageLevel?.ToString(),
                    HasRedFlags: assessment.HasRedFlags, StartedAt: assessment.StartedAt));

                if (val.IsEmergency)
                {
                    await _notifications.NotifyEmergencyAssessmentAsync(new EmergencyAssessmentNotification(
                        AssessmentId: assessment.Id, AssessmentNumber: assessment.AssessmentNumber,
                        PatientId: assessment.PatientId, PatientName: assessment.Patient?.FullName ?? "Unknown",
                        PatientMrn: assessment.Patient?.MRN ?? "", ChiefComplaint: assessment.ChiefComplaint,
                        EmergencyReason: val.EmergencyReason ?? "Red flags detected",
                        RedFlagCategories: new List<string>(), DetectedAt: DateTime.UtcNow));
                }
                return CreatedAtAction(nameof(GetById), new { id = assessment.Id }, MapToResponse(assessment));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send notifications for {Num}", val.AssessmentNumber);
        }
        return CreatedAtAction(nameof(GetById), new { id = val.AssessmentId },
            new { id = val.AssessmentId, assessmentNumber = val.AssessmentNumber });
    }

    [HttpPost("{id:guid}/responses")]
    public async Task<ActionResult<AssessmentResponse>> SubmitResponse(Guid id, [FromBody] SubmitAssessmentResponseRequest request)
    {
        var result = await _mediator.Send(new SubmitAssessmentResponseCommand(id, request.Question, request.Response));

        if (result.IsFailure)
            return BadRequest(new ProblemDetails { Title = result.Error.Code, Detail = result.Error.Message, Status = 400 });

        var val = result.Value;
        if (val.HasNewRedFlags && val.IsEmergency)
        {
            try
            {
                var a = await _mediator.Send(new GetAssessmentByIdQuery(id));
                if (a != null)
                    await _notifications.NotifyEmergencyAssessmentAsync(new EmergencyAssessmentNotification(
                        a.Id, a.AssessmentNumber, a.PatientId, a.Patient?.FullName ?? "Unknown",
                        a.Patient?.MRN ?? "", a.ChiefComplaint, val.EmergencyReason ?? "Red flags detected",
                        new List<string>(), DateTime.UtcNow));
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Notification failed for {Id}", id); }
        }

        var updated = await _mediator.Send(new GetAssessmentByIdQuery(id));
        return updated != null ? Ok(MapToResponse(updated)) : NotFound();
    }

    [HttpPost("{id:guid}/advance")]
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

    private static AssessmentResponse MapToResponse(Domain.Entities.PatientAssessment a)
    {
        return new AssessmentResponse(
            Id: a.Id, AssessmentNumber: a.AssessmentNumber, PatientId: a.PatientId,
            Patient: a.Patient != null ? new PatientSummaryResponse(
                a.Patient.Id, a.Patient.MRN, a.Patient.FullName, a.Patient.Age, a.Patient.Sex) : null,
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
                a.Patient.Id, a.Patient.MRN, a.Patient.FullName, a.Patient.Age, a.Patient.Sex) : null,
            ChiefComplaint: a.ChiefComplaint, CurrentPhase: a.CurrentPhase.ToString(),
            TriageLevel: a.TriageLevel?.ToString(), HasRedFlags: a.HasRedFlags,
            IsEmergency: a.IsEmergency, StartedAt: a.StartedAt, CompletedAt: a.CompletedAt);
    }
}

public record CompleteAssessmentRequest(string TriageLevel, string? Summary);
public record ReviewAssessmentRequest(string? Notes);
