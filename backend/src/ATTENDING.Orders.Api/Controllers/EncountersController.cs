using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Application.Commands.Encounters;
using ATTENDING.Application.Queries.Encounters;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Orders.Api.Extensions;

namespace ATTENDING.Orders.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
public class EncountersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<EncountersController> _logger;

    public EncountersController(IMediator mediator, ILogger<EncountersController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(EncounterResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EncounterResponse>> GetById(Guid id)
    {
        var encounter = await _mediator.Send(new GetEncounterByIdQuery(id));
        if (encounter == null)
            return NotFound(new ProblemDetails { Title = "Encounter not found", Status = 404 });
        return Ok(MapToResponse(encounter));
    }

    [HttpGet("patient/{patientId:guid}")]
    [ProducesResponseType(typeof(PagedResult<EncounterResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<EncounterResponse>>> GetByPatient(
        Guid patientId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var encounters = await _mediator.Send(new GetEncountersByPatientQuery(patientId));
        return Ok(encounters.Select(MapToResponse).ToPagedResult(page, pageSize));
    }

    [HttpGet("schedule/today")]
    [ProducesResponseType(typeof(ScheduleResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ScheduleResponse>> GetTodaysSchedule([FromQuery] Guid? providerId = null)
    {
        var id = providerId ?? GetCurrentUserId();
        var encounters = await _mediator.Send(new GetTodaysScheduleQuery(id));
        var responses = encounters.Select(MapToResponse).ToList();
        return Ok(new ScheduleResponse(
            responses.AsReadOnly(),
            responses.Count,
            DateTime.UtcNow.ToString("yyyy-MM-dd")));
    }

    [HttpGet("status/{status}")]
    [ProducesResponseType(typeof(PagedResult<EncounterResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<EncounterResponse>>> GetByStatus(
        EncounterStatus status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var encounters = await _mediator.Send(new GetEncountersByStatusQuery(status));
        return Ok(encounters.Select(MapToResponse).ToPagedResult(page, pageSize));
    }

    [HttpPost]
    [ProducesResponseType(typeof(EncounterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EncounterResponse>> Create([FromBody] CreateEncounterRequest request)
    {
        var providerId = GetCurrentUserId();
        var result = await _mediator.Send(new CreateEncounterCommand(
            request.PatientId, providerId, request.Type, request.ScheduledAt, request.ChiefComplaint));

        if (!result.Success)
            return BadRequest(new ProblemDetails { Title = "Failed", Detail = result.Error, Status = 400 });

        var encounter = await _mediator.Send(new GetEncounterByIdQuery(result.EncounterId!.Value));
        return CreatedAtAction(nameof(GetById), new { id = result.EncounterId }, MapToResponse(encounter!));
    }

    [HttpPost("{id:guid}/check-in")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> CheckIn(Guid id)
    {
        var result = await _mediator.Send(new CheckInEncounterCommand(id));
        if (!result.Success)
            return BadRequest(new ProblemDetails { Title = "Failed", Detail = result.Error, Status = 400 });
        return NoContent();
    }

    [HttpPost("{id:guid}/start")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Start(Guid id, [FromBody] StartEncounterRequest? request = null)
    {
        var result = await _mediator.Send(new StartEncounterCommand(id, request?.ChiefComplaint));
        if (!result.Success)
            return BadRequest(new ProblemDetails { Title = "Failed", Detail = result.Error, Status = 400 });
        return NoContent();
    }

    [HttpPost("{id:guid}/complete")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Complete(Guid id)
    {
        var result = await _mediator.Send(new CompleteEncounterCommand(id));
        if (!result.Success)
            return BadRequest(new ProblemDetails { Title = "Failed", Detail = result.Error, Status = 400 });
        return NoContent();
    }

    #region Helpers

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst("sub")?.Value ?? User.FindFirst("oid")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    private static EncounterResponse MapToResponse(Domain.Entities.Encounter e)
    {
        return new EncounterResponse(
            e.Id, e.EncounterNumber, e.PatientId,
            e.Patient != null ? new PatientSummaryResponse(
                e.Patient.Id, e.Patient.MRN, e.Patient.FullName, e.Patient.Age, e.Patient.Sex) : null,
            e.ProviderId,
            e.Provider != null ? new ProviderSummaryResponse(
                e.Provider.Id, e.Provider.FullName, e.Provider.NPI, e.Provider.Specialty) : null,
            e.Type, e.Status.ToString(), e.ChiefComplaint,
            e.ScheduledAt, e.CheckedInAt, e.StartedAt, e.CompletedAt, e.CreatedAt);
    }

    #endregion
}
