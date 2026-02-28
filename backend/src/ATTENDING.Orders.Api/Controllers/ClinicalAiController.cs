using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Application.Interfaces;
using ATTENDING.Application.Services;
using LegacyAi = ATTENDING.Infrastructure.External.AI;
using ATTENDING.Orders.Api.Extensions;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// Clinical AI endpoints: differential diagnosis, triage, recommendations, feedback.
/// Includes Tiered Clinical Intelligence pipeline (Tier 0 + Tier 2).
/// </summary>
[ApiController]
[Route("api/v1/ai")]
[Authorize]
[Produces("application/json")]
public class ClinicalAiController : ControllerBase
{
    private readonly LegacyAi.IClinicalAiService _aiService;
    private readonly ITieredClinicalIntelligence _intelligence;
    private readonly DiagnosticReasoningService _diagnosticReasoning;
    private readonly IPatientRepository _patientRepo;
    private readonly IAiFeedbackRepository _feedbackRepo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ClinicalAiController> _logger;

    public ClinicalAiController(
        LegacyAi.IClinicalAiService aiService,
        ITieredClinicalIntelligence intelligence,
        DiagnosticReasoningService diagnosticReasoning,
        IPatientRepository patientRepo,
        IAiFeedbackRepository feedbackRepo,
        IUnitOfWork uow,
        ILogger<ClinicalAiController> logger)
    {
        _aiService = aiService;
        _intelligence = intelligence;
        _diagnosticReasoning = diagnosticReasoning;
        _patientRepo = patientRepo;
        _feedbackRepo = feedbackRepo;
        _uow = uow;
        _logger = logger;
    }

    /// <summary>
    /// Tiered Clinical Intelligence — runs guidelines, red flags, drug interactions (Tier 0)
    /// plus cloud AI differentials (Tier 2) when available.
    /// Tier 0 always succeeds, even offline. Returns in &lt;200ms typically.
    /// </summary>
    [HttpPost("intelligence")]
    [ProducesResponseType(typeof(ClinicalIntelligenceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClinicalIntelligenceResponse>> GetClinicalIntelligence(
        [FromBody] ClinicalIntelligenceRequest request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepo.GetByIdAsync(request.PatientId, cancellationToken);
        if (patient == null)
            return NotFound(new ProblemDetails { Title = "Patient not found", Status = 404 });

        var result = await _intelligence.EvaluateAsync(
            request.PatientId, request.EncounterId, request.AssessmentId, cancellationToken);

        _logger.LogInformation(
            "Clinical intelligence evaluated for Patient {PatientId}: {GuidelineCount} guidelines, " +
            "{RedFlagCount} red flags, {InteractionCount} drug interactions, Tiers: [{Tiers}]",
            request.PatientId,
            result.GuidelineResults.Count,
            result.RedFlags.Count,
            result.DrugInteractions.Count,
            string.Join(", ", result.TiersExecuted));

        var response = new ClinicalIntelligenceResponse(
            Success: true,
            Error: null,
            Context: new ClinicalIntelligenceResponse.ContextSummary(
                ChiefComplaint: result.Context.ChiefComplaint,
                VitalsSummary: result.Context.Vitals?.ToStructuredSummary(),
                RenalFunction: result.Context.RecentLabs?.RenalFunction.Status,
                HepaticFunction: result.Context.RecentLabs?.HepaticFunction.Status,
                PainSeverity: result.Context.PainSeverity,
                ActiveMedicationCount: result.Context.CurrentMedications.Count,
                RecentLabCount: result.Context.RecentLabs?.Results.Count ?? 0,
                ActiveConditionCount: result.Context.ActiveConditions.Count),
            GuidelineResults: result.GuidelineResults.Select(g => new GuidelineResultItem(
                g.GuidelineName,
                g.SourceCitation,
                g.Score,
                g.RiskCategory,
                g.PreTestProbability,
                g.Recommendation,
                g.Criteria.Select(c => new ScoredCriterionItem(
                    c.Name, c.Met, c.Points, c.PatientValue)).ToList())).ToList(),
            RedFlags: result.RedFlags,
            DrugInteractions: result.DrugInteractions,
            TiersExecuted: result.TiersExecuted.Select(t => t.ToString()).ToList(),
            TotalLatency: result.Duration.TotalMilliseconds.ToString("F0") + "ms");

        return Ok(response);
    }

    /// <summary>
    /// Calibrated Diagnostic Reasoning — converts guideline scores into
    /// quantitative pre/post-test probabilities with specific discriminating tests.
    /// 
    /// Always returns Tier 0 results (guideline-derived, &lt;5ms).
    /// Each diagnosis includes post-test probability updates:
    ///   "If troponin positive → ACS probability increases from 50% to 94%"
    /// 
    /// This is the diagnostic ROADMAP endpoint — the provider sees exactly
    /// which test to order and how the result would change the clinical picture.
    /// </summary>
    [HttpPost("calibrated-diagnosis")]
    [ProducesResponseType(typeof(CalibratedDiagnosticResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CalibratedDiagnosticResponse>> GetCalibratedDiagnosis(
        [FromBody] CalibratedDiagnosticRequest request,
        CancellationToken cancellationToken)
    {
        var patient = await _patientRepo.GetByIdAsync(request.PatientId, cancellationToken);
        if (patient == null)
            return NotFound(new ProblemDetails { Title = "Patient not found", Status = 404 });

        var result = await _diagnosticReasoning.EvaluateAsync(
            request.PatientId, request.EncounterId, request.AssessmentId, cancellationToken);

        _logger.LogInformation(
            "Calibrated diagnosis for Patient {PatientId}: {DiagnosisCount} diagnoses, " +
            "{RedFlagCount} red flags in {Latency}ms",
            request.PatientId, result.Diagnoses.Count, result.RedFlags.Count,
            result.Duration.TotalMilliseconds);

        var response = new CalibratedDiagnosticResponse(
            Success: true,
            Error: null,
            Diagnoses: result.Diagnoses.Select(d => new CalibratedDiagnosisItem(
                d.Icd10Code,
                d.DiagnosisName,
                d.PreTestProbability,
                d.RiskCategory,
                d.ClinicalReasoning,
                d.KeyDiscriminators.Select(k => new PostTestUpdate(
                    k.TestName, k.LoincCode,
                    k.IfPositiveProbability, k.IfPositiveDescription,
                    k.IfNegativeProbability, k.IfNegativeDescription,
                    k.Priority, k.CptCode)).ToList(),
                d.SupportingFeatures,
                d.AgainstFeatures,
                d.GuidelineSource,
                d.Source)).ToList(),
            IntelligenceSource: result.IntelligenceSource,
            GuidelineAnchors: result.GuidelineResults.Select(g => new GuidelineResultItem(
                g.GuidelineName, g.SourceCitation, g.Score, g.RiskCategory,
                g.PreTestProbability, g.Recommendation,
                g.Criteria.Select(c => new ScoredCriterionItem(
                    c.Name, c.Met, c.Points, c.PatientValue)).ToList())).ToList(),
            RedFlags: result.RedFlags,
            DrugInteractions: result.DrugInteractions,
            Latency: result.Duration.TotalMilliseconds.ToString("F0") + "ms",
            EvaluatedAt: result.EvaluatedAt);

        return Ok(response);
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

        var context = new LegacyAi.ClinicalContext
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
