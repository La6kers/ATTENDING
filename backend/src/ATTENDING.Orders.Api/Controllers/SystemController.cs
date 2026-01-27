using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// System health and status endpoints
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[AllowAnonymous]
public class SystemController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SystemController> _logger;

    public SystemController(IConfiguration configuration, ILogger<SystemController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Get system version information
    /// </summary>
    [HttpGet("version")]
    [ProducesResponseType(typeof(VersionInfo), StatusCodes.Status200OK)]
    public ActionResult<VersionInfo> GetVersion()
    {
        var assembly = typeof(SystemController).Assembly;
        var version = assembly.GetName().Version?.ToString() ?? "1.0.0";
        
        return Ok(new VersionInfo(
            Version: version,
            ApiVersion: "v1",
            Environment: Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            BuildDate: File.GetLastWriteTimeUtc(assembly.Location).ToString("O")
        ));
    }

    /// <summary>
    /// Ping endpoint for basic connectivity check
    /// </summary>
    [HttpGet("ping")]
    [ProducesResponseType(typeof(PingResponse), StatusCodes.Status200OK)]
    public ActionResult<PingResponse> Ping()
    {
        return Ok(new PingResponse("pong", DateTime.UtcNow));
    }

    /// <summary>
    /// Get list of available clinical specialties
    /// </summary>
    [HttpGet("specialties")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<string>> GetSpecialties()
    {
        return Ok(ClinicalConstants.Specialties);
    }

    /// <summary>
    /// Get list of lab test categories
    /// </summary>
    [HttpGet("lab-categories")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<string>> GetLabCategories()
    {
        return Ok(ClinicalConstants.LabCategories);
    }

    /// <summary>
    /// Get list of imaging modalities
    /// </summary>
    [HttpGet("imaging-modalities")]
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
    string Environment,
    string BuildDate);

/// <summary>
/// Ping response
/// </summary>
public record PingResponse(string Status, DateTime Timestamp);

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
