using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.External.AI;
using ATTENDING.Orders.Api.Extensions;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// Clinical AI endpoints: differential diagnosis, triage, recommendations, feedback
/// </summary>
[ApiController]
[Route("api/v1/ai")]
[Authorize]
[Produces("application/json")]
public class ClinicalAiController : ControllerBase
{
    private readonly IClinicalAiService _aiService;
    private readonly IPatientRepository _patientRepo;
    private readonly IAiFeedbackRepository _feedbackRepo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ClinicalAiController> _logger;

    public ClinicalAiController(
        IClinicalAiService aiService,
        IPatientRepository patientRepo,
        IAiFeedbackRepository feedbackRepo,
        IUnitOfWork uow,
        ILogger<ClinicalAiController> logger)
    {
        _aiService = aiService;
        _patientRepo = patientRepo;
        _feedbackRepo = feedbackRepo;
        _uow = uow;
        _logger = logger;
    }

    /// <summary>
    /// Generate AI differential diagnosis from patient context
    /// </summary>
    [HttpPost("differential")]
    [ProducesResponseType(typeof(AiDifferentialResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AiDifferentialResponse>> GetDifferentialDiagnosis(
        [FromBody] DifferentialDiagnosisRequest request)
    {
        var patient = await _patientRepo.GetWithFullHistoryAsync(request.PatientId);
        if (patient == null)
            return NotFound(new ProblemDetails { Title = "Patient not found", Status = 404 });

        var context = new ClinicalContext
        {
            ChiefComplaint = request.ChiefComplaint ?? "Not specified",
            HpiSummary = request.HpiSummary ?? "",
            PatientAge = patient.Age,
            PatientSex = patient.Sex.ToString(),
            MedicalHistory = patient.Conditions?.Select(c => c.Name).ToList() ?? new(),
            Allergies = patient.Allergies?.Select(a => a.Allergen).ToList() ?? new(),
        };

        var result = await _aiService.GetDifferentialDiagnosisAsync(context);

        _logger.LogInformation("Differential diagnosis generated for Patient {PatientId}: {Count} diagnoses",
            request.PatientId, result.Diagnoses.Count);

        return Ok(new AiDifferentialResponse(
            result.Success,
            result.ErrorMessage,
            result.Diagnoses.Select(d => new AiDiagnosisItem(
                d.Icd10Code, d.Name, d.Probability, d.Reasoning,
                d.RedFlags.AsReadOnly(), d.RecommendedWorkup.AsReadOnly())).ToList(),
            result.UrgentConsiderations.AsReadOnly()));
    }

    /// <summary>
    /// AI triage assessment from symptoms
    /// </summary>
    [HttpPost("triage")]
    [ProducesResponseType(typeof(AiTriageResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AiTriageResponse>> AssessTriage(
        [FromBody] TriageAssessmentRequest request)
    {
        var result = await _aiService.AssessTriageLevelAsync(
            request.ChiefComplaint, request.Symptoms, request.PainLevel);

        return Ok(new AiTriageResponse(
            result.Success, result.ErrorMessage, result.TriageLevel,
            result.Reasoning, result.RedFlags?.AsReadOnly(), result.TimeToProvider));
    }

    /// <summary>
    /// Submit feedback on an AI recommendation
    /// </summary>
    [HttpPost("feedback")]
    [ProducesResponseType(typeof(AiFeedbackResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AiFeedbackResponse>> SubmitFeedback(
        [FromBody] SubmitAiFeedbackRequest request)
    {
        var validRatings = new[] { "Helpful", "NotHelpful", "PartiallyHelpful" };
        if (!validRatings.Contains(request.Rating))
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid rating",
                Detail = "Rating must be Helpful, NotHelpful, or PartiallyHelpful",
                Status = 400
            });

        if (request.AccuracyScore.HasValue && (request.AccuracyScore < 1 || request.AccuracyScore > 5))
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid accuracy score",
                Detail = "AccuracyScore must be between 1 and 5",
                Status = 400
            });

        var providerId = GetCurrentUserId();
        var feedback = AiFeedback.Create(
            providerId, request.RecommendationType, request.RequestId,
            request.Rating, request.AccuracyScore, request.SelectedDiagnosis,
            request.Comment, request.ModelVersion, request.PatientId, request.EncounterId);

        await _feedbackRepo.AddAsync(feedback);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("AI feedback submitted: {Type} {Rating} by Provider {ProviderId}",
            request.RecommendationType, request.Rating, providerId);

        return CreatedAtAction(nameof(GetFeedbackStats), null,
            new AiFeedbackResponse(feedback.Id, feedback.RecommendationType,
                feedback.RequestId, feedback.Rating, feedback.AccuracyScore,
                feedback.SelectedDiagnosis, feedback.Comment, feedback.CreatedAt));
    }

    /// <summary>
    /// Get aggregated AI feedback statistics
    /// </summary>
    [HttpGet("feedback/stats")]
    [ProducesResponseType(typeof(AiFeedbackStatsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AiFeedbackStatsResponse>> GetFeedbackStats(
        [FromQuery] string? type = null)
    {
        var (total, helpful, avgAcc) = await _feedbackRepo.GetStatsAsync(type);
        var pct = total > 0 ? (double)helpful / total * 100 : 0;

        return Ok(new AiFeedbackStatsResponse(total, helpful, Math.Round(pct, 1), Math.Round(avgAcc, 2)));
    }

    /// <summary>
    /// Get feedback history for a provider
    /// </summary>
    [HttpGet("feedback/history")]
    [ProducesResponseType(typeof(PagedResult<AiFeedbackResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AiFeedbackResponse>>> GetFeedbackHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var providerId = GetCurrentUserId();
        var items = await _feedbackRepo.GetByProviderAsync(providerId);
        var mapped = items.Select(f => new AiFeedbackResponse(
            f.Id, f.RecommendationType, f.RequestId, f.Rating,
            f.AccuracyScore, f.SelectedDiagnosis, f.Comment, f.CreatedAt));
        return Ok(mapped.ToPagedResult(page, pageSize));
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst("sub")?.Value ?? User.FindFirst("oid")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }
}
