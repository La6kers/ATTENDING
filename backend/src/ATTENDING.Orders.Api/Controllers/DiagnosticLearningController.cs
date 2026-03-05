using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Application.Commands.DiagnosticLearning;
using ATTENDING.Application.Services;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// ML Diagnostic Learning Engine — d5
///
/// Endpoints:
///   POST  /api/v1/learning/outcomes         — provider records confirmed diagnosis
///   GET   /api/v1/learning/accuracy         — accuracy report for dashboard
///   GET   /api/v1/learning/calibration/{g}  — calibration factor for a guideline
///   POST  /api/v1/learning/refresh          — admin: trigger snapshot refresh
/// </summary>
[ApiController]
[Route("api/v1/learning")]
[Authorize]
public class DiagnosticLearningController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<DiagnosticLearningController> _logger;

    public DiagnosticLearningController(IMediator mediator, ILogger<DiagnosticLearningController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Provider records the confirmed diagnosis after an encounter.
    /// This is the ground truth the ML engine learns from.
    ///
    /// POST /api/v1/learning/outcomes
    /// </summary>
    [HttpPost("outcomes")]
    [ProducesResponseType(typeof(RecordOutcomeResponse), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> RecordOutcome(
        [FromBody] RecordOutcomeRequest request,
        CancellationToken ct)
    {
        var providerId = GetCurrentUserId();
        var orgId = GetCurrentTenantId();

        var cmd = new RecordDiagnosticOutcomeCommand(
            EncounterId: request.EncounterId,
            PatientId: request.PatientId,
            ProviderId: providerId,
            OrganizationId: orgId,
            RecommendationType: request.RecommendationType,
            ConfirmedDiagnosis: request.ConfirmedDiagnosis,
            ConfirmedIcd10Code: request.ConfirmedIcd10Code,
            AiSuggestedDiagnosis: request.AiSuggestedDiagnosis,
            AiPreTestProbability: request.AiPreTestProbability,
            GuidelineName: request.GuidelineName,
            AiWasCorrect: request.AiWasCorrect,
            ProviderOverrode: request.ProviderOverrode,
            ConfirmingTestResult: request.ConfirmingTestResult,
            ConfirmingTestLoincCode: request.ConfirmingTestLoincCode,
            AiFeedbackId: request.AiFeedbackId);

        var result = await _mediator.Send(cmd, ct);

        if (result.IsFailure)
            return BadRequest(new { error = result.Error });

        return CreatedAtAction(
            nameof(RecordOutcome),
            new RecordOutcomeResponse(result.Value));
    }

    /// <summary>
    /// Get the accuracy report for the provider dashboard.
    /// Shows sensitivity, precision, acceptance rate, and calibration status
    /// for each recommendation type tracked by this organization.
    ///
    /// GET /api/v1/learning/accuracy
    /// </summary>
    [HttpGet("accuracy")]
    [ProducesResponseType(typeof(AccuracyReport), 200)]
    public async Task<IActionResult> GetAccuracyReport(CancellationToken ct)
    {
        var report = await _mediator.Send(new GetAccuracyReportQuery(), ct);
        return Ok(report);
    }

    /// <summary>
    /// Get the calibration adjustment factor for a specific guideline.
    /// Returns null if fewer than 30 cases (insufficient data).
    ///
    /// Used internally by DiagnosticReasoningService, also exposed for transparency.
    ///
    /// GET /api/v1/learning/calibration/{guidelineName}
    /// </summary>
    [HttpGet("calibration/{guidelineName}")]
    [ProducesResponseType(typeof(CalibrationResponse), 200)]
    public async Task<IActionResult> GetCalibration(
        string guidelineName, CancellationToken ct)
    {
        var factor = await _mediator.Send(
            new GetCalibrationAdjustmentQuery(guidelineName), ct);

        return Ok(new CalibrationResponse(
            GuidelineName: guidelineName,
            AdjustmentFactor: factor,
            IsReliable: factor.HasValue,
            Note: factor.HasValue
                ? $"Pre-test probabilities are adjusted by {factor:F3}x based on this organization's outcomes"
                : "Fewer than 30 cases — using published literature values"));
    }

    /// <summary>
    /// Admin: manually trigger accuracy snapshot refresh.
    /// Normally runs on a weekly schedule. Useful for testing or after bulk imports.
    ///
    /// POST /api/v1/learning/refresh
    /// </summary>
    [HttpPost("refresh")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(RefreshResponse), 200)]
    public async Task<IActionResult> RefreshSnapshots(
        [FromBody] RefreshRequest? request,
        CancellationToken ct)
    {
        var windowDays = request?.WindowDays ?? 90;
        var result = await _mediator.Send(
            new RefreshAccuracySnapshotsCommand(windowDays), ct);

        if (result.IsFailure)
            return BadRequest(new { error = result.Error });

        return Ok(new RefreshResponse(
            ProcessedOutcomes: result.Value,
            WindowDays: windowDays,
            RefreshedAt: DateTime.UtcNow));
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirst("sub")?.Value
                  ?? User.FindFirst("oid")?.Value
                  ?? Guid.Empty.ToString();
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }

    private Guid GetCurrentTenantId()
    {
        var tid = User.FindFirst("tid")?.Value
                  ?? User.FindFirst("tenantId")?.Value
                  ?? Guid.Empty.ToString();
        return Guid.TryParse(tid, out var id) ? id : Guid.Empty;
    }
}

// ── Request / Response DTOs (Contracts layer equivalent, inlined for clarity) ──

public record RecordOutcomeRequest(
    Guid EncounterId,
    Guid PatientId,
    string RecommendationType,
    string ConfirmedDiagnosis,
    string? ConfirmedIcd10Code,
    string? AiSuggestedDiagnosis,
    decimal? AiPreTestProbability,
    string? GuidelineName,
    bool AiWasCorrect,
    bool ProviderOverrode,
    string? ConfirmingTestResult = null,
    string? ConfirmingTestLoincCode = null,
    Guid? AiFeedbackId = null);

public record RecordOutcomeResponse(Guid OutcomeId);

public record CalibrationResponse(
    string GuidelineName,
    decimal? AdjustmentFactor,
    bool IsReliable,
    string Note);

public record RefreshRequest(int WindowDays = 90);

public record RefreshResponse(
    int ProcessedOutcomes,
    int WindowDays,
    DateTime RefreshedAt);
