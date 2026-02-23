using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Application.Commands.LabOrders;
using ATTENDING.Application.DTOs;
using ATTENDING.Application.Queries.LabOrders;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Orders.Api.Extensions;
using ATTENDING.Orders.Api.Hubs;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// API controller for lab order operations
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
public class LabOrdersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IClinicalNotificationService _notifications;
    private readonly ILogger<LabOrdersController> _logger;

    public LabOrdersController(
        IMediator mediator,
        IClinicalNotificationService notifications,
        ILogger<LabOrdersController> logger)
    {
        _mediator = mediator;
        _notifications = notifications;
        _logger = logger;
    }

    /// <summary>
    /// Get a lab order by ID
    /// </summary>
    /// <param name="id">Lab order ID</param>
    /// <returns>Lab order details</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(LabOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LabOrderResponse>> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetLabOrderByIdQuery(id));
        
        if (result == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Lab order not found",
                Detail = $"No lab order found with ID {id}",
                Status = StatusCodes.Status404NotFound
            });
        }

        return Ok(MapToResponse(result));
    }

    /// <summary>
    /// Get a lab order by order number
    /// </summary>
    /// <param name="orderNumber">Order number (e.g., LAB-20260122-ABC12345)</param>
    /// <returns>Lab order details</returns>
    [HttpGet("by-number/{orderNumber}")]
    [ProducesResponseType(typeof(LabOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LabOrderResponse>> GetByOrderNumber(string orderNumber)
    {
        var result = await _mediator.Send(new GetLabOrderByNumberQuery(orderNumber));
        
        if (result == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Lab order not found",
                Detail = $"No lab order found with order number {orderNumber}",
                Status = StatusCodes.Status404NotFound
            });
        }

        return Ok(MapToResponse(result));
    }

    /// <summary>
    /// Get lab orders for a patient
    /// </summary>
    /// <param name="patientId">Patient ID</param>
    /// <param name="status">Optional status filter</param>
    /// <param name="skip">Number of records to skip (pagination)</param>
    /// <param name="take">Number of records to take (default 20)</param>
    /// <returns>List of lab orders</returns>
    [HttpGet("patient/{patientId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<LabOrderSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LabOrderSummaryResponse>>> GetByPatient(
        Guid patientId,
        [FromQuery] LabOrderStatus? status = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        var result = await _mediator.Send(new GetLabOrdersByPatientQuery(patientId, status, skip, take));
        
        return Ok(result.Select(o => new LabOrderSummaryResponse(
            o.Id, o.OrderNumber, o.TestName, o.Priority.ToString(), 
            o.Status.ToString(), o.OrderedAt, o.HasResult)));
    }

    /// <summary>
    /// Get lab orders for an encounter
    /// </summary>
    /// <param name="encounterId">Encounter ID</param>
    /// <returns>List of lab orders</returns>
    [HttpGet("encounter/{encounterId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<LabOrderSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LabOrderSummaryResponse>>> GetByEncounter(Guid encounterId)
    {
        var result = await _mediator.Send(new GetLabOrdersByEncounterQuery(encounterId));
        
        return Ok(result.Select(o => new LabOrderSummaryResponse(
            o.Id, o.OrderNumber, o.TestName, o.Priority.ToString(),
            o.Status.ToString(), o.OrderedAt, o.HasResult)));
    }

    /// <summary>
    /// Get all pending lab orders
    /// </summary>
    /// <returns>List of pending lab orders</returns>
    [HttpGet("pending")]
    [ProducesResponseType(typeof(PagedResult<LabOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<LabOrderResponse>>> GetPending(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetPendingLabOrdersQuery());
        return Ok(result.Select(MapToResponse).ToPagedResult(page, pageSize));
    }

    /// <summary>
    /// Get lab orders with critical results
    /// </summary>
    /// <returns>List of lab orders with critical results</returns>
    [HttpGet("critical")]
    [ProducesResponseType(typeof(PagedResult<LabOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<LabOrderResponse>>> GetCritical(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetCriticalLabResultsQuery());
        return Ok(result.Select(MapToResponse).ToPagedResult(page, pageSize));
    }

    /// <summary>
    /// Create a new lab order
    /// </summary>
    /// <param name="request">Lab order creation request</param>
    /// <returns>Created lab order</returns>
    [HttpPost]
    [ProducesResponseType(typeof(CreateLabOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateLabOrderResponse>> Create([FromBody] CreateLabOrderRequest request)
    {
        var userId = GetCurrentUserId();
        
        var command = new CreateLabOrderCommand(
            PatientId: request.PatientId,
            EncounterId: request.EncounterId,
            OrderingProviderId: userId,
            TestCode: request.TestCode,
            TestName: request.TestName,
            CptCode: request.CptCode,
            CptDescription: request.CptDescription,
            CptBasePrice: request.CptBasePrice,
            LoincCode: request.LoincCode,
            Category: request.Category,
            Priority: Enum.Parse<OrderPriority>(request.Priority),
            ClinicalIndication: request.ClinicalIndication,
            DiagnosisCode: request.DiagnosisCode,
            DiagnosisDescription: request.DiagnosisDescription,
            RequiresFasting: request.RequiresFasting,
            PainSeverity: request.PainSeverity);

        var result = await _mediator.Send(command);

        if (!result.Success)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Failed to create lab order",
                Detail = result.Error,
                Status = StatusCodes.Status400BadRequest
            });
        }

        var response = new CreateLabOrderResponse(
            result.LabOrderId!.Value,
            result.OrderNumber!,
            result.WasUpgradedToStat,
            result.RedFlagReason);

        return CreatedAtAction(nameof(GetById), new { id = result.LabOrderId }, response);
    }

    /// <summary>
    /// Update lab order priority
    /// </summary>
    /// <param name="id">Lab order ID</param>
    /// <param name="request">Priority update request</param>
    /// <returns>Updated priority information</returns>
    [HttpPatch("{id:guid}/priority")]
    [ProducesResponseType(typeof(UpdatePriorityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UpdatePriorityResponse>> UpdatePriority(
        Guid id,
        [FromBody] UpdatePriorityRequest request)
    {
        var userId = GetCurrentUserId();
        var priority = Enum.Parse<OrderPriority>(request.NewPriority);
        
        var result = await _mediator.Send(new UpdateLabOrderPriorityCommand(id, priority, userId));

        if (!result.Success)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Failed to update priority",
                Detail = result.Error,
                Status = StatusCodes.Status400BadRequest
            });
        }

        return Ok(new UpdatePriorityResponse(
            result.PreviousPriority?.ToString(),
            request.NewPriority));
    }

    /// <summary>
    /// Cancel a lab order
    /// </summary>
    /// <param name="id">Lab order ID</param>
    /// <param name="request">Cancellation request</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelOrderRequest request)
    {
        var userId = GetCurrentUserId();
        
        var result = await _mediator.Send(new CancelLabOrderCommand(id, userId, request.Reason));

        if (!result.Success)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Failed to cancel lab order",
                Detail = result.Error,
                Status = StatusCodes.Status400BadRequest
            });
        }

        return NoContent();
    }

    /// <summary>
    /// Mark a lab order as collected
    /// </summary>
    /// <param name="id">Lab order ID</param>
    /// <param name="request">Collection details</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id:guid}/collect")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkCollected(Guid id, [FromBody] MarkCollectedRequest request)
    {
        var result = await _mediator.Send(new MarkLabOrderCollectedCommand(id, request.CollectedAt));

        if (!result.Success)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Failed to mark as collected",
                Detail = result.Error,
                Status = StatusCodes.Status400BadRequest
            });
        }

        return NoContent();
    }

    /// <summary>
    /// Add result to a lab order
    /// </summary>
    /// <param name="id">Lab order ID</param>
    /// <param name="request">Lab result details</param>
    /// <returns>Result information</returns>
    [HttpPost("{id:guid}/result")]
    [ProducesResponseType(typeof(AddResultResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AddResultResponse>> AddResult(Guid id, [FromBody] AddLabResultRequest request)
    {
        var command = new AddLabResultCommand(
            LabOrderId: id,
            Value: request.Value,
            Unit: request.Unit,
            ReferenceRangeLow: request.ReferenceRangeLow,
            ReferenceRangeHigh: request.ReferenceRangeHigh,
            ReferenceRangeText: request.ReferenceRangeText,
            Interpretation: request.Interpretation,
            IsCritical: request.IsCritical,
            PerformingLab: request.PerformingLab,
            ResultedBy: request.ResultedBy,
            Comments: request.Comments);

        var result = await _mediator.Send(command);

        if (!result.Success)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Failed to add result",
                Detail = result.Error,
                Status = StatusCodes.Status400BadRequest
            });
        }

        var response = new AddResultResponse(result.ResultId!.Value, result.IsCritical);

        // Fire real-time notification for critical results
        if (result.IsCritical)
        {
            try
            {
                var order = await _mediator.Send(new GetLabOrderByIdQuery(id));
                if (order != null)
                {
                    await _notifications.NotifyCriticalResultAsync(new CriticalResultNotification(
                        PatientId: order.PatientId,
                        PatientName: order.Patient?.FullName ?? "Unknown",
                        PatientMrn: order.Patient?.MRN ?? "",
                        LabOrderId: id,
                        OrderNumber: order.OrderNumber,
                        TestName: order.TestName,
                        Value: request.Value,
                        Unit: request.Unit,
                        ReferenceRange: request.ReferenceRangeText,
                        ResultedAt: DateTime.UtcNow,
                        OrderingProviderName: order.OrderingProvider?.FullName));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send critical result notification for order {OrderId}", id);
            }
        }

        return Created($"/api/v1/laborders/{id}", response);
    }

    #region Private Helpers

    private Guid GetCurrentUserId()
    {
        // In real implementation, extract from JWT claims
        var userIdClaim = User.FindFirst("sub")?.Value 
            ?? User.FindFirst("oid")?.Value; // Azure AD uses 'oid'
        
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private static LabOrderResponse MapToResponse(LabOrderDto dto)
    {
        return new LabOrderResponse(
            Id: dto.Id,
            OrderNumber: dto.OrderNumber,
            PatientId: dto.PatientId,
            Patient: dto.Patient != null ? new PatientSummaryResponse(
                dto.Patient.Id, dto.Patient.MRN, dto.Patient.FullName, 
                dto.Patient.Age, dto.Patient.Sex) : null,
            EncounterId: dto.EncounterId,
            OrderingProviderId: dto.OrderingProviderId,
            OrderingProvider: dto.OrderingProvider != null ? new ProviderSummaryResponse(
                dto.OrderingProvider.Id, dto.OrderingProvider.FullName,
                dto.OrderingProvider.NPI, dto.OrderingProvider.Specialty) : null,
            TestCode: dto.TestCode,
            TestName: dto.TestName,
            CptCode: dto.CptCode,
            CptDescription: dto.CptDescription,
            LoincCode: dto.LoincCode,
            Category: dto.Category,
            Priority: dto.Priority.ToString(),
            ClinicalIndication: dto.ClinicalIndication,
            DiagnosisCode: dto.DiagnosisCode,
            DiagnosisDescription: dto.DiagnosisDescription,
            RequiresFasting: dto.RequiresFasting,
            IsStatFromRedFlag: dto.IsStatFromRedFlag,
            RedFlagReason: dto.RedFlagReason,
            Status: dto.Status.ToString(),
            OrderedAt: dto.OrderedAt,
            CollectedAt: dto.CollectedAt,
            ResultedAt: dto.ResultedAt,
            Result: dto.Result != null ? new LabResultResponse(
                dto.Result.Id, dto.Result.Value, dto.Result.Unit,
                dto.Result.ReferenceRangeLow, dto.Result.ReferenceRangeHigh,
                dto.Result.ReferenceRangeText, dto.Result.Interpretation,
                dto.Result.IsCritical, dto.Result.CriticalNotifiedAt,
                dto.Result.PerformingLab, dto.Result.ResultedAt, 
                dto.Result.Comments) : null);
    }

    #endregion
}
