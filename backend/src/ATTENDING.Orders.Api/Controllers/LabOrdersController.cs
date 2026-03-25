using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Application.Commands.LabOrders;
using ATTENDING.Application.DTOs;
using ATTENDING.Application.Queries.LabOrders;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Orders.Api.Extensions;

namespace ATTENDING.Orders.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
[EnableRateLimiting("tenant-api")]
public class LabOrdersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<LabOrdersController> _logger;

    public LabOrdersController(
        IMediator mediator,
        ILogger<LabOrdersController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(LabOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LabOrderResponse>> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetLabOrderByIdQuery(id));
        if (result == null)
            return NotFound(new ProblemDetails { Title = "Lab order not found", Status = 404 });
        return Ok(MapToResponse(result));
    }

    [HttpGet("by-number/{orderNumber}")]
    [ProducesResponseType(typeof(LabOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LabOrderResponse>> GetByOrderNumber(string orderNumber)
    {
        var result = await _mediator.Send(new GetLabOrderByNumberQuery(orderNumber));
        if (result == null)
            return NotFound(new ProblemDetails { Title = "Lab order not found", Status = 404 });
        return Ok(MapToResponse(result));
    }

    [HttpGet("patient/{patientId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<LabOrderSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LabOrderSummaryResponse>>> GetByPatient(
        Guid patientId, [FromQuery] LabOrderStatus? status = null,
        [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        take = Math.Clamp(take, 1, 100);
        skip = Math.Clamp(skip, 0, 10000);
        var result = await _mediator.Send(new GetLabOrdersByPatientQuery(patientId, status, skip, take));
        return Ok(result.Select(o => new LabOrderSummaryResponse(
            o.Id, o.OrderNumber, o.TestName, o.Priority.ToString(),
            o.Status.ToString(), o.OrderedAt, o.HasResult)));
    }

    [HttpGet("encounter/{encounterId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<LabOrderSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LabOrderSummaryResponse>>> GetByEncounter(
        Guid encounterId, [FromQuery] int skip = 0, [FromQuery] int take = 50)
    {
        take = Math.Clamp(take, 1, 100);
        skip = Math.Clamp(skip, 0, 10000);
        var result = await _mediator.Send(new GetLabOrdersByEncounterQuery(encounterId));
        return Ok(result.Skip(skip).Take(take).Select(o => new LabOrderSummaryResponse(
            o.Id, o.OrderNumber, o.TestName, o.Priority.ToString(),
            o.Status.ToString(), o.OrderedAt, o.HasResult)));
    }

    [HttpGet("pending")]
    [ProducesResponseType(typeof(PagedResult<LabOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<LabOrderResponse>>> GetPending(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetPendingLabOrdersQuery());
        return Ok(result.Select(MapToResponse).ToPagedResult(page, pageSize));
    }

    [HttpGet("critical")]
    [ProducesResponseType(typeof(PagedResult<LabOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<LabOrderResponse>>> GetCritical(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetCriticalLabResultsQuery());
        return Ok(result.Select(MapToResponse).ToPagedResult(page, pageSize));
    }

    [HttpPost]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(CreateLabOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create([FromBody] CreateLabOrderRequest request)
    {
        if (!Enum.TryParse<OrderPriority>(request.Priority, true, out var priority))
            return BadRequest(new ProblemDetails { Title = "Invalid priority value", Status = 400 });

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
            Priority: priority,
            ClinicalIndication: request.ClinicalIndication,
            DiagnosisCode: request.DiagnosisCode,
            DiagnosisDescription: request.DiagnosisDescription,
            RequiresFasting: request.RequiresFasting,
            PainSeverity: request.PainSeverity);

        var result = await _mediator.Send(command);

        if (result.IsFailure)
            return result.ToCreated(string.Empty); // delegates to error mapping

        var val = result.Value;
        var response = new CreateLabOrderResponse(val.LabOrderId, val.OrderNumber,
            val.WasUpgradedToStat, val.RedFlagReason);

        return CreatedAtAction(nameof(GetById), new { id = val.LabOrderId }, response);
    }

    [HttpPatch("{id:guid}/priority")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(UpdatePriorityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePriority(Guid id, [FromBody] UpdatePriorityRequest request)
    {
        var userId = GetCurrentUserId();
        if (!Enum.TryParse<OrderPriority>(request.NewPriority, true, out var priority))
            return BadRequest(new ProblemDetails { Title = "Invalid priority value", Status = 400 });

        var result = await _mediator.Send(new UpdateLabOrderPriorityCommand(id, priority, userId));

        if (result.IsFailure)
            return result.ToNoContent(); // delegates to error mapping

        return Ok(new UpdatePriorityResponse(result.Value.PreviousPriority.ToString(), request.NewPriority));
    }

    [HttpPost("{id:guid}/cancel")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelOrderRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _mediator.Send(new CancelLabOrderCommand(id, userId, request.Reason));
        return result.ToNoContent();
    }

    [HttpPost("{id:guid}/collect")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkCollected(Guid id, [FromBody] MarkCollectedRequest request)
    {
        var existing = await _mediator.Send(new GetLabOrderByIdQuery(id));
        if (existing != null && existing.Status == LabOrderStatus.Collected)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Lab order is already collected",
                Status = StatusCodes.Status409Conflict
            });
        }

        var result = await _mediator.Send(new MarkLabOrderCollectedCommand(id, request.CollectedAt));
        return result.ToNoContent();
    }

    [HttpPost("{id:guid}/result")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(AddResultResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddResult(Guid id, [FromBody] AddLabResultRequest request)
    {
        var command = new AddLabResultCommand(
            LabOrderId: id, Value: request.Value, Unit: request.Unit,
            ReferenceRangeLow: request.ReferenceRangeLow,
            ReferenceRangeHigh: request.ReferenceRangeHigh,
            ReferenceRangeText: request.ReferenceRangeText,
            Interpretation: request.Interpretation,
            IsCritical: request.IsCritical,
            PerformingLab: request.PerformingLab,
            ResultedBy: request.ResultedBy,
            Comments: request.Comments);

        var result = await _mediator.Send(command);

        if (result.IsFailure)
            return result.ToNoContent(); // delegates to error mapping

        var val = result.Value;
        var response = new AddResultResponse(val.ResultId, val.IsCritical);

        // Critical result notification is handled exclusively by CriticalLabResultHandler
        // via the domain event pipeline. Do NOT fire it here — that causes duplicate alerts.

        return Created($"/api/v1/laborders/{id}", response);
    }

    #region Helpers

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("oid")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId) || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Valid user identity is required.");
        }
        return userId;
    }

    private static LabOrderResponse MapToResponse(LabOrderDto dto)
    {
        return new LabOrderResponse(
            Id: dto.Id, OrderNumber: dto.OrderNumber, PatientId: dto.PatientId,
            Patient: dto.Patient != null ? new PatientSummaryResponse(
                dto.Patient.Id, dto.Patient.MRN, dto.Patient.FullName,
                dto.Patient.Age, dto.Patient.Sex) : null,
            EncounterId: dto.EncounterId, OrderingProviderId: dto.OrderingProviderId,
            OrderingProvider: dto.OrderingProvider != null ? new ProviderSummaryResponse(
                dto.OrderingProvider.Id, dto.OrderingProvider.FullName,
                dto.OrderingProvider.NPI, dto.OrderingProvider.Specialty) : null,
            TestCode: dto.TestCode, TestName: dto.TestName,
            CptCode: dto.CptCode, CptDescription: dto.CptDescription,
            LoincCode: dto.LoincCode, Category: dto.Category,
            Priority: dto.Priority.ToString(),
            ClinicalIndication: dto.ClinicalIndication,
            DiagnosisCode: dto.DiagnosisCode, DiagnosisDescription: dto.DiagnosisDescription,
            RequiresFasting: dto.RequiresFasting,
            IsStatFromRedFlag: dto.IsStatFromRedFlag, RedFlagReason: dto.RedFlagReason,
            Status: dto.Status.ToString(),
            OrderedAt: dto.OrderedAt, CollectedAt: dto.CollectedAt, ResultedAt: dto.ResultedAt,
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
