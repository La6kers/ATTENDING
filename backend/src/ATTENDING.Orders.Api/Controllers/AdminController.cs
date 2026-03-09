using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Application.Interfaces;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// Platform administration: dashboard, feature flags, alerts, rate limits
/// </summary>
[ApiController]
[Route("api/v1/admin")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(IAdminService adminService, ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    /// <summary>
    /// Platform dashboard: system info, request stats, integration health
    /// </summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AdminDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminDashboardResponse>> GetDashboard()
        => Ok(await _adminService.GetDashboardAsync());

    /// <summary>
    /// List feature flags for an organization
    /// </summary>
    [HttpGet("features")]
    [ProducesResponseType(typeof(FeatureFlagListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<FeatureFlagListResponse>> GetFeatures(
        [FromQuery] string? organizationId = null)
    {
        var orgId = organizationId ?? GetOrganizationId();
        return Ok(await _adminService.GetFeaturesAsync(orgId));
    }

    /// <summary>
    /// Set a feature flag override, scoped to the current tenant (organizationId).
    /// The override always applies to a specific organization — never globally.
    /// </summary>
    [HttpPost("features")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetFeatureOverride([FromBody] SetFeatureFlagRequest request)
    {
        var orgId = request.OrganizationId ?? GetOrganizationId();
        if (string.IsNullOrEmpty(orgId) || orgId == "default")
            return BadRequest(new ProblemDetails
            {
                Title = "Organization ID required",
                Detail = "Feature overrides must be scoped to a specific organization. Provide an organizationId or ensure your token includes an 'org' claim.",
                Status = 400
            });

        await _adminService.SetFeatureOverrideAsync(orgId, request.FeatureKey, request.Value);
        _logger.LogInformation("Feature {Key} set to {Value} for org {Org}", request.FeatureKey, request.Value, orgId);
        return NoContent();
    }

    /// <summary>
    /// Get active alerts and history
    /// </summary>
    [HttpGet("alerts")]
    [ProducesResponseType(typeof(AlertListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AlertListResponse>> GetAlerts([FromQuery] int limit = 50)
        => Ok(await _adminService.GetAlertsAsync(limit));

    /// <summary>
    /// Acknowledge an alert
    /// </summary>
    [HttpPost("alerts/acknowledge")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AcknowledgeAlert([FromBody] AcknowledgeAlertRequest request)
    {
        var userId = User.FindFirst("sub")?.Value ?? "unknown";
        var result = await _adminService.AcknowledgeAlertAsync(request.AlertId, userId);
        return result ? NoContent() : NotFound();
    }

    /// <summary>
    /// Rate limit dashboard: tiers, live usage
    /// </summary>
    [HttpGet("rate-limits")]
    [ProducesResponseType(typeof(RateLimitDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RateLimitDashboardResponse>> GetRateLimits()
        => Ok(await _adminService.GetRateLimitsAsync());

    private string GetOrganizationId()
    {
        var orgId = User.FindFirst("tid")?.Value ?? User.FindFirst("tenantId")?.Value;
        if (string.IsNullOrEmpty(orgId))
            throw new UnauthorizedAccessException("Organization identity is required.");
        return orgId;
    }
}
