using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// API controller for imaging order operations
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
[EnableRateLimiting("tenant-api")]
public class ImagingOrdersController : ControllerBase
{
    private readonly IImagingOrderRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly ILogger<ImagingOrdersController> _logger;

    public ImagingOrdersController(
        IImagingOrderRepository repository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        ILogger<ImagingOrdersController> logger)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Get an imaging order by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ImagingOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImagingOrderResponse>> GetById(Guid id)
    {
        var order = await _repository.GetByIdAsync(id);
        
        if (order == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Imaging order not found",
                Detail = $"No imaging order found with ID {id}",
                Status = StatusCodes.Status404NotFound
            });
        }

        return Ok(MapToResponse(order));
    }

    /// <summary>
    /// Get imaging orders for a patient
    /// </summary>
    [HttpGet("patient/{patientId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<ImagingOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ImagingOrderResponse>>> GetByPatient(
        Guid patientId, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        take = Math.Clamp(take, 1, 100);
        var orders = await _repository.GetByPatientIdAsync(patientId);
        return Ok(orders.Skip(skip).Take(take).Select(MapToResponse));
    }

    /// <summary>
    /// Get imaging orders for an encounter
    /// </summary>
    [HttpGet("encounter/{encounterId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<ImagingOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ImagingOrderResponse>>> GetByEncounter(Guid encounterId)
    {
        var orders = await _repository.GetByEncounterIdAsync(encounterId);
        return Ok(orders.Select(MapToResponse));
    }

    /// <summary>
    /// Get imaging orders by status
    /// </summary>
    [HttpGet("status/{status}")]
    [ProducesResponseType(typeof(IEnumerable<ImagingOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ImagingOrderResponse>>> GetByStatus(ImagingOrderStatus status)
    {
        var orders = await _repository.GetByStatusAsync(status);
        return Ok(orders.Select(MapToResponse));
    }

    /// <summary>
    /// Get patient's cumulative radiation dose
    /// </summary>
    [HttpGet("patient/{patientId:guid}/radiation-dose")]
    [ProducesResponseType(typeof(RadiationDoseResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RadiationDoseResponse>> GetRadiationDose(
        Guid patientId,
        [FromQuery] int monthsBack = 12)
    {
        var totalDose = await _repository.GetPatientRadiationDoseAsync(patientId, monthsBack);
        
        var riskLevel = totalDose switch
        {
            < 1 => "Low",
            < 10 => "Moderate",
            < 50 => "Elevated",
            _ => "High"
        };

        return Ok(new RadiationDoseResponse(patientId, totalDose, monthsBack, riskLevel));
    }

    /// <summary>
    /// Create a new imaging order
    /// </summary>
    [HttpPost]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(ImagingOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ImagingOrderResponse>> Create([FromBody] CreateImagingOrderRequest request)
    {
        if (!Enum.TryParse<OrderPriority>(request.Priority, true, out var priority))
            return BadRequest(new ProblemDetails { Title = "Invalid priority value", Status = 400 });

        var userId = GetCurrentUserId();

        var order = Domain.Entities.ImagingOrder.Create(
            patientId: request.PatientId,
            encounterId: request.EncounterId,
            orderingProviderId: userId,
            studyCode: request.StudyCode,
            studyName: request.StudyName,
            modality: request.Modality,
            bodyPart: request.BodyPart,
            cptCode: request.CptCode,
            priority: priority,
            clinicalIndication: request.ClinicalIndication,
            diagnosisCode: request.DiagnosisCode,
            laterality: request.Laterality,
            withContrast: request.WithContrast,
            estimatedRadiationDose: request.EstimatedRadiationDose);

        await _repository.AddAsync(order);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogPhiAccessAsync(
            userId: userId,
            patientId: request.PatientId,
            action: "CREATE_IMAGING_ORDER",
            resourceType: "ImagingOrder",
            resourceId: order.Id,
            details: $"Created imaging order {order.OrderNumber} for {request.StudyName}");

        _logger.LogInformation(
            "Imaging order created: {OrderNumber} for Patient {PatientId}, Study: {StudyName}",
            order.OrderNumber, request.PatientId, request.StudyName);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapToResponse(order));
    }

    /// <summary>
    /// Schedule an imaging order
    /// </summary>
    [HttpPost("{id:guid}/schedule")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Schedule(Guid id, [FromBody] ScheduleImagingRequest request)
    {
        var order = await _repository.GetByIdAsync(id);
        if (order == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Imaging order not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        if (order.Status == ImagingOrderStatus.Scheduled)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Imaging order is already scheduled",
                Status = StatusCodes.Status409Conflict
            });
        }

        order.Schedule(request.ScheduledAt);
        _repository.Update(order);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Cancel an imaging order
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelOrderRequest request)
    {
        var userId = GetCurrentUserId();
        var order = await _repository.GetByIdAsync(id);
        
        if (order == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Imaging order not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        order.Cancel();
        _repository.Update(order);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogPhiAccessAsync(
            userId: userId,
            patientId: order.PatientId,
            action: "CANCEL_IMAGING_ORDER",
            resourceType: "ImagingOrder",
            resourceId: order.Id,
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

    private static ImagingOrderResponse MapToResponse(Domain.Entities.ImagingOrder order)
    {
        return new ImagingOrderResponse(
            Id: order.Id,
            OrderNumber: order.OrderNumber,
            PatientId: order.PatientId,
            Patient: order.Patient != null ? new PatientSummaryResponse(
                order.Patient.Id, order.Patient.MRN, order.Patient.FullName,
                order.Patient.Age, order.Patient.Sex.ToString()) : null,
            StudyCode: order.StudyCode,
            StudyName: order.StudyName,
            Modality: order.Modality,
            BodyPart: order.BodyPart,
            Laterality: order.Laterality,
            WithContrast: order.WithContrast,
            CptCode: order.CptCode,
            Priority: order.Priority.ToString(),
            ClinicalIndication: order.ClinicalIndication,
            DiagnosisCode: order.DiagnosisCode,
            EstimatedRadiationDose: order.EstimatedRadiationDose,
            Status: order.Status.ToString(),
            OrderedAt: order.OrderedAt,
            ScheduledAt: order.ScheduledAt,
            CompletedAt: order.CompletedAt,
            Result: order.Result != null ? new ImagingResultResponse(
                order.Result.Id, order.Result.Findings, order.Result.Impression,
                order.Result.HasCriticalFindings, order.Result.CriticalFindingsDescription,
                order.Result.ReadingRadiologist, order.Result.ReadAt) : null);
    }

    #endregion
}

/// <summary>
/// Request to schedule imaging
/// </summary>
public record ScheduleImagingRequest(DateTime ScheduledAt, string? Location);
