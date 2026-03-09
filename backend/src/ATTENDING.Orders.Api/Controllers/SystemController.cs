using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// System health and status endpoints
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class SystemController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SystemController> _logger;
    private readonly IClinicalCacheService _cacheService;

    public SystemController(
        IConfiguration configuration,
        ILogger<SystemController> logger,
        IClinicalCacheService cacheService)
    {
        _configuration = configuration;
        _logger = logger;
        _cacheService = cacheService;
    }

    /// <summary>
    /// Get system version information
    /// </summary>
    [HttpGet("version")]
    [Authorize]
    [ProducesResponseType(typeof(VersionInfo), StatusCodes.Status200OK)]
    public ActionResult<VersionInfo> GetVersion()
    {
        var assembly = typeof(SystemController).Assembly;
        var version = assembly.GetName().Version?.ToString() ?? "1.0.0";

        return Ok(new VersionInfo(
            Version: version,
            ApiVersion: "v1",
            BuildDate: System.IO.File.GetLastWriteTimeUtc(assembly.Location).ToString("O")
        ));
    }

    /// <summary>
    /// Ping endpoint for basic connectivity check
    /// </summary>
    [AllowAnonymous]
    [HttpGet("ping")]
    [ProducesResponseType(typeof(PingResponse), StatusCodes.Status200OK)]
    public ActionResult<PingResponse> Ping()
    {
        return Ok(new PingResponse("pong", DateTime.UtcNow));
    }

    /// <summary>
    /// Get cache statistics (hit rate, savings estimates)
    /// </summary>
    [HttpGet("cache/stats")]
    [Authorize]
    [ProducesResponseType(typeof(CacheStatsResponse), StatusCodes.Status200OK)]
    public ActionResult<CacheStatsResponse> GetCacheStats()
    {
        var stats = _cacheService.GetStatistics();
        var hasRedis = !string.IsNullOrWhiteSpace(_configuration.GetConnectionString("Redis"));

        return Ok(new CacheStatsResponse(
            Hits: stats.Hits,
            Misses: stats.Misses,
            HitRatePercent: Math.Round(stats.HitRate, 2),
            TotalQueries: stats.TotalQueries,
            EstimatedSavingsUsd: stats.EstimatedSavingsUsd,
            Backend: hasRedis ? "redis" : "memory"
        ));
    }

    /// <summary>
    /// Reset cache statistics counters
    /// </summary>
    [HttpPost("cache/stats/reset")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult ResetCacheStats()
    {
        _cacheService.ResetStatistics();
        return NoContent();
    }

    /// <summary>
    /// Invalidate cache entries by category
    /// </summary>
    [HttpPost("cache/invalidate/{category}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> InvalidateCache(string category)
    {
        var validCategories = new[] { "diff", "drug", "labs", "all" };
        if (!validCategories.Contains(category, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid cache category",
                Detail = $"Valid categories: {string.Join(", ", validCategories)}",
                Status = StatusCodes.Status400BadRequest
            });
        }

        if (category.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            await _cacheService.RemoveByPrefixAsync("diff");
            await _cacheService.RemoveByPrefixAsync("drug");
            await _cacheService.RemoveByPrefixAsync("labs");
        }
        else
        {
            await _cacheService.RemoveByPrefixAsync(category.ToLowerInvariant());
        }

        _logger.LogInformation("Cache invalidated for category: {Category}", category);
        return NoContent();
    }

    /// <summary>
    /// Get list of available clinical specialties
    /// </summary>
    [AllowAnonymous]
    [HttpGet("specialties")]
    [EnableRateLimiting("tenant-api")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<string>> GetSpecialties()
    {
        return Ok(ClinicalConstants.Specialties);
    }

    /// <summary>
    /// Get list of lab test categories
    /// </summary>
    [AllowAnonymous]
    [HttpGet("lab-categories")]
    [EnableRateLimiting("tenant-api")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<string>> GetLabCategories()
    {
        return Ok(ClinicalConstants.LabCategories);
    }

    /// <summary>
    /// Get list of imaging modalities
    /// </summary>
    [AllowAnonymous]
    [HttpGet("imaging-modalities")]
    [EnableRateLimiting("tenant-api")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<string>> GetImagingModalities()
    {
        return Ok(ClinicalConstants.ImagingModalities);
    }
}

/// <summary>
/// Version information response
/// </summary>
public record VersionInfo(
    string Version,
    string ApiVersion,
    string BuildDate);

/// <summary>
/// Ping response
/// </summary>
public record PingResponse(string Status, DateTime Timestamp);

/// <summary>
/// Cache statistics response
/// </summary>
public record CacheStatsResponse(
    long Hits,
    long Misses,
    double HitRatePercent,
    long TotalQueries,
    decimal EstimatedSavingsUsd,
    string Backend);

/// <summary>
/// Clinical constants for reference data
/// </summary>
public static class ClinicalConstants
{
    public static readonly string[] Specialties = new[]
    {
        "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology",
        "Hematology", "Infectious Disease", "Nephrology", "Neurology",
        "Oncology", "Ophthalmology", "Orthopedics", "Otolaryngology",
        "Pulmonology", "Rheumatology", "Urology", "Psychiatry", "General Surgery"
    };

    public static readonly string[] LabCategories = new[]
    {
        "Chemistry", "Hematology", "Coagulation", "Urinalysis",
        "Microbiology", "Immunology", "Toxicology", "Endocrine",
        "Cardiac Markers", "Tumor Markers", "Therapeutic Drug Monitoring"
    };

    public static readonly string[] ImagingModalities = new[]
    {
        "X-Ray", "CT", "MRI", "Ultrasound", "Nuclear Medicine",
        "PET", "Mammography", "Fluoroscopy", "DEXA"
    };

    public static readonly string[] UrgencyLevels = new[]
    {
        "Routine", "Urgent", "Emergent"
    };

    public static readonly string[] OrderPriorities = new[]
    {
        "Routine", "Urgent", "Asap", "Stat"
    };

    public static readonly string[] TriageLevels = new[]
    {
        "Level1_Resuscitation", "Level2_Emergent", "Level3_Urgent",
        "Level4_LessUrgent", "Level5_NonUrgent"
    };
}
