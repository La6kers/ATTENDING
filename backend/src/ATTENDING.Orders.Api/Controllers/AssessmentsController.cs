using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// API controller for patient assessment operations (COMPASS chatbot backend)
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
public class AssessmentsController : ControllerBase
{
    private readonly IAssessmentRepository _repository;
    private readonly IPatientRepository _patientRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IRedFlagEvaluator _redFlagEvaluator;
    private readonly IAuditService _auditService;
    private readonly ILogger<AssessmentsController> _logger;

    public AssessmentsController(
        IAssessmentRepository repository,
        IPatientRepository patientRepository,
        IUnitOfWork unitOfWork,
        IRedFlagEvaluator redFlagEvaluator,
        IAuditService auditService,
        ILogger<AssessmentsController> logger)
    {
        _repository = repository;
        _patientRepository = patientRepository;
        _unitOfWork = unitOfWork;
        _redFlagEvaluator = redFlagEvaluator;
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Get an assessment by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AssessmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AssessmentResponse>> GetById(Guid id)
    {
        var assessment = await _repository.GetWithSymptomsAsync(id);
        
        if (assessment == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Assessment not found",
                Detail = $"No assessment found with ID {id}",
                Status = StatusCodes.Status404NotFound
            });
        }

        return Ok(MapToResponse(assessment));
    }

    /// <summary>
    /// Get assessments for a patient
    /// </summary>
    [HttpGet("patient/{patientId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<AssessmentSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AssessmentSummaryResponse>>> GetByPatient(Guid patientId)
    {
        var assessments = await _repository.GetByPatientIdAsync(patientId);
        return Ok(assessments.Select(MapToSummary));
    }

    /// <summary>
    /// Get assessments pending provider review
    /// </summary>
    [HttpGet("pending-review")]
    [ProducesResponseType(typeof(IEnumerable<AssessmentSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AssessmentSummaryResponse>>> GetPendingReview()
    {
        var assessments = await _repository.GetPendingReviewAsync();
        return Ok(assessments.Select(MapToSummary));
    }

    /// <summary>
    /// Get assessments with red flags (emergency queue)
    /// </summary>
    [HttpGet("red-flags")]
    [ProducesResponseType(typeof(IEnumerable<AssessmentSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AssessmentSummaryResponse>>> GetWithRedFlags()
    {
        var assessments = await _repository.GetWithRedFlagsAsync();
        return Ok(assessments.Select(MapToSummary));
    }

    /// <summary>
    /// Start a new patient assessment
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AssessmentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AssessmentResponse>> StartAssessment([FromBody] StartAssessmentRequest request)
    {
        // Validate patient exists
        var patient = await _patientRepository.GetByIdAsync(request.PatientId);
        if (patient == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Patient not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        // Check for red flags in chief complaint immediately
        var redFlagEvaluation = _redFlagEvaluator.Evaluate(request.ChiefComplaint, null, null);

        var assessment = Domain.Entities.PatientAssessment.Create(
            patientId: request.PatientId,
            chiefComplaint: request.ChiefComplaint,
            redFlagEvaluation: redFlagEvaluation);

        await _repository.AddAsync(assessment);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogPhiAccessAsync(
            userId: request.PatientId, // Self-initiated by patient
            patientId: request.PatientId,
            action: "START_ASSESSMENT",
            resourceType: "PatientAssessment",
            resourceId: assessment.Id,
            details: $"Started assessment: {request.ChiefComplaint}");

        _logger.LogInformation(
            "Assessment started: {AssessmentNumber} for Patient {PatientId}, RedFlags: {HasRedFlags}, Emergency: {IsEmergency}",
            assessment.AssessmentNumber, request.PatientId, assessment.HasRedFlags, assessment.IsEmergency);

        // Return immediately if emergency detected
        if (assessment.IsEmergency)
        {
            _logger.LogWarning(
                "EMERGENCY DETECTED in assessment {AssessmentNumber}: {Reason}",
                assessment.AssessmentNumber, assessment.EmergencyReason);
        }

        return CreatedAtAction(nameof(GetById), new { id = assessment.Id }, MapToResponse(assessment));
    }

    /// <summary>
    /// Submit a response to current assessment question
    /// </summary>
    [HttpPost("{id:guid}/responses")]
    [ProducesResponseType(typeof(AssessmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AssessmentResponse>> SubmitResponse(
        Guid id,
        [FromBody] SubmitAssessmentResponseRequest request)
    {
        var assessment = await _repository.GetWithSymptomsAsync(id);
        if (assessment == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Assessment not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        // Re-evaluate for red flags with new response
        var combinedText = $"{assessment.ChiefComplaint} {request.Response}";
        var redFlagEvaluation = _redFlagEvaluator.Evaluate(combinedText, null, assessment.PainSeverity);

        assessment.AddResponse(request.Question, request.Response, redFlagEvaluation);

        _repository.Update(assessment);
        await _unitOfWork.SaveChangesAsync();

        // Log if new red flags detected
        if (redFlagEvaluation.HasRedFlags)
        {
            _logger.LogWarning(
                "Red flags detected in assessment {AssessmentNumber} response: {Categories}",
                assessment.AssessmentNumber,
                string.Join(", ", redFlagEvaluation.RedFlags.Select(f => f.Category)));

            // Check if it became emergency
            if (redFlagEvaluation.IsEmergency)
            {
                _logger.LogCritical(
                    "EMERGENCY ESCALATION in assessment {AssessmentNumber}: {Reason}",
                    assessment.AssessmentNumber, assessment.EmergencyReason);
            }
        }

        return Ok(MapToResponse(assessment));
    }

    /// <summary>
    /// Advance assessment to next phase
    /// </summary>
    [HttpPost("{id:guid}/advance")]
    [ProducesResponseType(typeof(AssessmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AssessmentResponse>> AdvancePhase(
        Guid id,
        [FromBody] AdvanceAssessmentRequest request)
    {
        var assessment = await _repository.GetWithSymptomsAsync(id);
        if (assessment == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Assessment not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        if (!Enum.TryParse<AssessmentPhase>(request.NewPhase, out var newPhase))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid phase",
                Detail = $"'{request.NewPhase}' is not a valid assessment phase",
                Status = StatusCodes.Status400BadRequest
            });
        }

        assessment.AdvanceToPhase(newPhase);
        _repository.Update(assessment);
        await _unitOfWork.SaveChangesAsync();

        return Ok(MapToResponse(assessment));
    }

    /// <summary>
    /// Complete the assessment
    /// </summary>
    [HttpPost("{id:guid}/complete")]
    [ProducesResponseType(typeof(AssessmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AssessmentResponse>> CompleteAssessment(
        Guid id,
        [FromBody] CompleteAssessmentRequest request)
    {
        var assessment = await _repository.GetWithSymptomsAsync(id);
        if (assessment == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Assessment not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        if (!Enum.TryParse<TriageLevel>(request.TriageLevel, out var triageLevel))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid triage level",
                Status = StatusCodes.Status400BadRequest
            });
        }

        assessment.Complete(triageLevel, request.Summary);
        _repository.Update(assessment);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Assessment completed: {AssessmentNumber}, Triage: {TriageLevel}, RedFlags: {HasRedFlags}",
            assessment.AssessmentNumber, triageLevel, assessment.HasRedFlags);

        return Ok(MapToResponse(assessment));
    }

    /// <summary>
    /// Provider review of assessment
    /// </summary>
    [HttpPost("{id:guid}/review")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReviewAssessment(Guid id, [FromBody] ReviewAssessmentRequest request)
    {
        var providerId = GetCurrentUserId();
        var assessment = await _repository.GetByIdAsync(id);
        
        if (assessment == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Assessment not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        assessment.MarkAsReviewed(providerId, request.Notes);
        _repository.Update(assessment);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogPhiAccessAsync(
            userId: providerId,
            patientId: assessment.PatientId,
            action: "REVIEW_ASSESSMENT",
            resourceType: "PatientAssessment",
            resourceId: assessment.Id,
            details: "Provider reviewed patient assessment");

        return NoContent();
    }

    #region Private Helpers

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("oid")?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private static AssessmentResponse MapToResponse(Domain.Entities.PatientAssessment assessment)
    {
        return new AssessmentResponse(
            Id: assessment.Id,
            AssessmentNumber: assessment.AssessmentNumber,
            PatientId: assessment.PatientId,
            Patient: assessment.Patient != null ? new PatientSummaryResponse(
                assessment.Patient.Id, assessment.Patient.MRN, assessment.Patient.FullName,
                assessment.Patient.Age, assessment.Patient.Sex) : null,
            ChiefComplaint: assessment.ChiefComplaint,
            CurrentPhase: assessment.CurrentPhase.ToString(),
            TriageLevel: assessment.TriageLevel?.ToString(),
            PainSeverity: assessment.PainSeverity,
            Hpi: assessment.HpiOnset != null ? new HpiResponse(
                assessment.HpiOnset, assessment.HpiLocation, assessment.HpiDuration,
                assessment.HpiCharacter, assessment.HpiAggravating, assessment.HpiRelieving,
                assessment.HpiTiming, assessment.HpiSeverity, assessment.HpiContext,
                assessment.HpiAssociatedSymptoms) : null,
            HasRedFlags: assessment.HasRedFlags,
            RedFlags: assessment.RedFlagsJson != null 
                ? System.Text.Json.JsonSerializer.Deserialize<List<RedFlagResponse>>(assessment.RedFlagsJson) 
                : null,
            IsEmergency: assessment.IsEmergency,
            EmergencyReason: assessment.EmergencyReason,
            StartedAt: assessment.StartedAt,
            CompletedAt: assessment.CompletedAt,
            ReviewedAt: assessment.ReviewedAt);
    }

    private static AssessmentSummaryResponse MapToSummary(Domain.Entities.PatientAssessment assessment)
    {
        return new AssessmentSummaryResponse(
            Id: assessment.Id,
            AssessmentNumber: assessment.AssessmentNumber,
            Patient: assessment.Patient != null ? new PatientSummaryResponse(
                assessment.Patient.Id, assessment.Patient.MRN, assessment.Patient.FullName,
                assessment.Patient.Age, assessment.Patient.Sex) : null,
            ChiefComplaint: assessment.ChiefComplaint,
            CurrentPhase: assessment.CurrentPhase.ToString(),
            TriageLevel: assessment.TriageLevel?.ToString(),
            HasRedFlags: assessment.HasRedFlags,
            IsEmergency: assessment.IsEmergency,
            StartedAt: assessment.StartedAt,
            CompletedAt: assessment.CompletedAt);
    }

    #endregion
}

/// <summary>
/// Request to complete assessment
/// </summary>
public record CompleteAssessmentRequest(string TriageLevel, string? Summary);

/// <summary>
/// Request for provider review
/// </summary>
public record ReviewAssessmentRequest(string? Notes);
