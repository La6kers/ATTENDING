using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// API controller for referral operations
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
[EnableRateLimiting("tenant-api")]
public class ReferralsController : ControllerBase
{
    private readonly IReferralRepository _repository;
    private readonly IPatientRepository _patientRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly ILogger<ReferralsController> _logger;

    // Supported specialties
    private static readonly string[] Specialties = new[]
    {
        "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology",
        "Hematology", "Infectious Disease", "Nephrology", "Neurology",
        "Oncology", "Ophthalmology", "Orthopedics", "Otolaryngology",
        "Pulmonology", "Rheumatology", "Urology", "Psychiatry", "General Surgery"
    };

    public ReferralsController(
        IReferralRepository repository,
        IPatientRepository patientRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        ILogger<ReferralsController> logger)
    {
        _repository = repository;
        _patientRepository = patientRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Get list of available specialties
    /// </summary>
    [HttpGet("specialties")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<string>> GetSpecialties()
    {
        return Ok(Specialties);
    }

    /// <summary>
    /// Get a referral by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ReferralResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReferralResponse>> GetById(Guid id)
    {
        var referral = await _repository.GetByIdAsync(id);
        
        if (referral == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Referral not found",
                Detail = $"No referral found with ID {id}",
                Status = StatusCodes.Status404NotFound
            });
        }

        return Ok(MapToResponse(referral));
    }

    /// <summary>
    /// Get referrals for a patient
    /// </summary>
    [HttpGet("patient/{patientId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<ReferralResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ReferralResponse>>> GetByPatient(
        Guid patientId, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        take = Math.Clamp(take, 1, 100);
        var referrals = await _repository.GetByPatientIdAsync(patientId);
        return Ok(referrals.Skip(skip).Take(take).Select(MapToResponse));
    }

    /// <summary>
    /// Get pending referrals
    /// </summary>
    [HttpGet("pending")]
    [ProducesResponseType(typeof(IEnumerable<ReferralResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ReferralResponse>>> GetPending()
    {
        var referrals = await _repository.GetByStatusAsync(ReferralStatus.Pending);
        return Ok(referrals.Select(MapToResponse));
    }

    /// <summary>
    /// Get referrals by status
    /// </summary>
    [HttpGet("status/{status}")]
    [ProducesResponseType(typeof(IEnumerable<ReferralResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ReferralResponse>>> GetByStatus(ReferralStatus status)
    {
        var referrals = await _repository.GetByStatusAsync(status);
        return Ok(referrals.Select(MapToResponse));
    }

    /// <summary>
    /// Get pending referrals by specialty
    /// </summary>
    [HttpGet("pending/specialty/{specialty}")]
    [ProducesResponseType(typeof(IEnumerable<ReferralResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ReferralResponse>>> GetPendingBySpecialty(string specialty)
    {
        if (!Specialties.Contains(specialty, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid specialty",
                Detail = $"'{specialty}' is not a valid specialty",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var referrals = await _repository.GetPendingBySpecialtyAsync(specialty);
        return Ok(referrals.Select(MapToResponse));
    }

    /// <summary>
    /// Create a new referral
    /// </summary>
    [HttpPost]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(ReferralResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReferralResponse>> Create([FromBody] CreateReferralRequest request)
    {
        var userId = GetCurrentUserId();

        // Validate patient exists
        var patient = await _patientRepository.GetByIdAsync(request.PatientId);
        if (patient == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Patient not found",
                Detail = $"No patient found with ID {request.PatientId}",
                Status = StatusCodes.Status404NotFound
            });
        }

        if (!Specialties.Contains(request.Specialty, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid specialty",
                Detail = $"'{request.Specialty}' is not a valid specialty",
                Status = StatusCodes.Status400BadRequest
            });
        }

        if (!Enum.TryParse<UrgencyLevel>(request.Urgency, ignoreCase: true, out var urgency))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid urgency level",
                Detail = $"'{request.Urgency}' is not a valid urgency level. Valid values: {string.Join(", ", Enum.GetNames<UrgencyLevel>())}",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var referral = Domain.Entities.Referral.Create(
            patientId: request.PatientId,
            encounterId: request.EncounterId,
            referringProviderId: userId,
            specialty: request.Specialty,
            urgency: urgency,
            clinicalQuestion: request.ClinicalQuestion,
            diagnosisCode: request.DiagnosisCode,
            reasonForReferral: request.ReasonForReferral,
            referredToProviderId: request.ReferredToProviderId,
            referredToProviderName: request.ReferredToProviderName,
            referredToFacility: request.ReferredToFacility);

        await _repository.AddAsync(referral);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogPhiAccessAsync(
            userId: userId,
            patientId: request.PatientId,
            action: "CREATE_REFERRAL",
            resourceType: "Referral",
            resourceId: referral.Id,
            details: $"Created {request.Specialty} referral: {request.ClinicalQuestion}");

        _logger.LogInformation(
            "Referral created: {ReferralNumber} for Patient {PatientId}, Specialty: {Specialty}, Urgency: {Urgency}",
            referral.ReferralNumber, request.PatientId, request.Specialty, request.Urgency);

        return CreatedAtAction(nameof(GetById), new { id = referral.Id }, MapToResponse(referral));
    }

    /// <summary>
    /// Schedule a referral appointment
    /// </summary>
    [HttpPost("{id:guid}/schedule")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Schedule(Guid id, [FromBody] ScheduleReferralRequest request)
    {
        var referral = await _repository.GetByIdAsync(id);
        if (referral == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Referral not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        if (referral.Status == ReferralStatus.Scheduled)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Referral is already scheduled",
                Status = StatusCodes.Status409Conflict
            });
        }

        referral.Schedule(request.ScheduledAt);
        _repository.Update(referral);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Add insurance authorization
    /// </summary>
    [HttpPost("{id:guid}/authorization")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddAuthorization(Guid id, [FromBody] AddAuthorizationRequest request)
    {
        var referral = await _repository.GetByIdAsync(id);
        if (referral == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Referral not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        referral.SetInsuranceAuthorization(request.AuthNumber, request.ExpirationDate);
        _repository.Update(referral);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Complete a referral with consult notes
    /// </summary>
    [HttpPost("{id:guid}/complete")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Complete(Guid id, [FromBody] CompleteReferralRequest request)
    {
        var referral = await _repository.GetByIdAsync(id);
        if (referral == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Referral not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        referral.Complete(request.ConsultNotes);
        _repository.Update(referral);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogPhiAccessAsync(
            userId: GetCurrentUserId(),
            patientId: referral.PatientId,
            action: "COMPLETE_REFERRAL",
            resourceType: "Referral",
            resourceId: referral.Id,
            details: $"Completed {referral.Specialty} referral");

        return NoContent();
    }

    /// <summary>
    /// Cancel a referral
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelOrderRequest request)
    {
        var userId = GetCurrentUserId();
        var referral = await _repository.GetByIdAsync(id);
        
        if (referral == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Referral not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        referral.Cancel();
        _repository.Update(referral);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogPhiAccessAsync(
            userId: userId,
            patientId: referral.PatientId,
            action: "CANCEL_REFERRAL",
            resourceType: "Referral",
            resourceId: referral.Id,
            details: $"Cancelled: {request.Reason}");

        return NoContent();
    }

    #region Private Helpers

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Valid user identity is required.");
        return userId;
    }

    private static ReferralResponse MapToResponse(Domain.Entities.Referral referral)
    {
        return new ReferralResponse(
            Id: referral.Id,
            ReferralNumber: referral.ReferralNumber,
            PatientId: referral.PatientId,
            Patient: referral.Patient != null ? new PatientSummaryResponse(
                referral.Patient.Id, referral.Patient.MRN, referral.Patient.FullName,
                referral.Patient.Age, referral.Patient.Sex.ToString()) : null,
            Specialty: referral.Specialty,
            Urgency: referral.Urgency.ToString(),
            ClinicalQuestion: referral.ClinicalQuestion,
            DiagnosisCode: referral.DiagnosisCode,
            ReasonForReferral: referral.ReasonForReferral,
            ReferredToProviderName: referral.ReferredToProviderName,
            ReferredToFacility: referral.ReferredToFacility,
            InsuranceAuthNumber: referral.InsuranceAuthNumber,
            AuthExpirationDate: referral.AuthExpirationDate,
            Status: referral.Status.ToString(),
            ReferredAt: referral.ReferredAt,
            ScheduledAt: referral.ScheduledAt,
            CompletedAt: referral.CompletedAt,
            ConsultNotes: referral.ConsultNotes);
    }

    #endregion
}

/// <summary>
/// Request to schedule referral
/// </summary>
public record ScheduleReferralRequest(DateTime ScheduledAt);

/// <summary>
/// Request to add insurance authorization
/// </summary>
public record AddAuthorizationRequest(string AuthNumber, DateTime? ExpirationDate);

/// <summary>
/// Request to complete referral
/// </summary>
public record CompleteReferralRequest(string ConsultNotes);
