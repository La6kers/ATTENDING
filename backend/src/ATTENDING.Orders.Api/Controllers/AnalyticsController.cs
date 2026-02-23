using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Contracts.Responses;
using ATTENDING.Application.Interfaces;
using ATTENDING.Orders.Api.Extensions;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// Clinical analytics and quality measures
/// </summary>
[ApiController]
[Route("api/v1/analytics")]
[Authorize]
[Produces("application/json")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
        => _analyticsService = analyticsService;

    /// <summary>
    /// Clinical outcomes dashboard
    /// </summary>
    [HttpGet("outcomes")]
    [ProducesResponseType(typeof(ClinicalOutcomesResponse), StatusCodes.Status200OK)]
    [ResponseCache(Duration = 300)]
    public async Task<ActionResult<ClinicalOutcomesResponse>> GetOutcomes(
        [FromQuery] string period = "quarter",
        [FromQuery] Guid? providerId = null)
    {
        var validPeriods = new[] { "day", "week", "month", "quarter", "year" };
        if (!validPeriods.Contains(period))
            return BadRequest(new ProblemDetails { Title = "Invalid period", Detail = "Must be day, week, month, quarter, or year" });

        return Ok(await _analyticsService.GetOutcomesAsync(period, providerId));
    }

    /// <summary>
    /// MIPS quality dashboard for current provider
    /// </summary>
    [HttpGet("quality/dashboard")]
    [ProducesResponseType(typeof(QualityDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QualityDashboardResponse>> GetQualityDashboard()
    {
        var providerId = GetCurrentUserId();
        return Ok(await _analyticsService.GetQualityDashboardAsync(providerId));
    }

    /// <summary>
    /// Care gaps for current provider's panel
    /// </summary>
    [HttpGet("quality/care-gaps")]
    [ProducesResponseType(typeof(IReadOnlyList<CareGapResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CareGapResponse>>> GetCareGaps()
    {
        var providerId = GetCurrentUserId();
        return Ok(await _analyticsService.GetCareGapsAsync(providerId));
    }

    /// <summary>
    /// Quality measure definitions with performance rates
    /// </summary>
    [HttpGet("quality/measures")]
    [ProducesResponseType(typeof(IReadOnlyList<QualityMeasureResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<QualityMeasureResponse>>> GetQualityMeasures(
        [FromQuery] string? specialty = null)
        => Ok(await _analyticsService.GetQualityMeasuresAsync(specialty));

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst("sub")?.Value ?? User.FindFirst("oid")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }
}
