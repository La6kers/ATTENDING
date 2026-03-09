using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Application.Commands.Patients;
using ATTENDING.Application.Queries.Patients;
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
public class PatientsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<PatientsController> _logger;

    public PatientsController(IMediator mediator, ILogger<PatientsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PatientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientDetailResponse>> GetById(Guid id)
    {
        var patient = await _mediator.Send(new GetPatientWithFullHistoryQuery(id));
        if (patient == null)
            return NotFound(new ProblemDetails { Title = "Patient not found", Status = 404 });
        return Ok(MapToDetail(patient));
    }

    [HttpGet("mrn/{mrn}")]
    [ProducesResponseType(typeof(PatientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientDetailResponse>> GetByMrn(string mrn)
    {
        var patient = await _mediator.Send(new GetPatientByMrnQuery(mrn));
        if (patient == null)
            return NotFound(new ProblemDetails { Title = "Patient not found", Status = 404 });
        return Ok(MapToDetail(patient));
    }

    [HttpGet("search")]
    [ProducesResponseType(typeof(PagedResult<PatientSearchResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PatientSearchResponse>>> Search(
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (patients, totalCount) = await _mediator.Send(new SearchPatientsQuery(q, page, pageSize));
        var items = patients.Select(MapToSearch).ToList().AsReadOnly();
        return Ok(PagedResult<PatientSearchResponse>.Create(items, totalCount, page, pageSize));
    }

    [HttpPost]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(PatientCreated), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreatePatientRequest request)
    {
        var result = await _mediator.Send(new CreatePatientCommand(
            request.MRN, request.FirstName, request.LastName,
            request.DateOfBirth, request.Sex, request.Phone, request.Email,
            request.AddressLine1, request.City, request.State, request.ZipCode,
            request.PrimaryLanguage));

        if (result.IsSuccess && result.Value.PatientId == Guid.Empty)
            return BadRequest(new { error = "Failed to create resource." });

        return result.ToCreatedAtAction(nameof(GetById), new { id = result.IsSuccess ? result.Value.PatientId : Guid.Empty });
    }

    [HttpPost("{id:guid}/allergies")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddAllergy(Guid id, [FromBody] AddAllergyRequest request)
    {
        if (!Enum.TryParse<AllergySeverity>(request.Severity, true, out var severity))
            return BadRequest(new ProblemDetails { Title = "Invalid allergy severity", Status = 400 });

        var result = await _mediator.Send(new AddAllergyCommand(id, request.Allergen, severity, request.Reaction));
        return result.ToCreated($"/api/v1/patients/{id}/allergies");
    }

    [HttpPost("{id:guid}/conditions")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddCondition(Guid id, [FromBody] AddConditionRequest request)
    {
        var result = await _mediator.Send(new AddConditionCommand(id, request.Code, request.Name, request.OnsetDate));
        return result.ToCreated($"/api/v1/patients/{id}/conditions");
    }

    #region Mappers

    private static PatientDetailResponse MapToDetail(Domain.Entities.Patient p)
    {
        return new PatientDetailResponse(
            p.Id, p.MRN, p.FirstName, p.LastName, p.FullName,
            p.DateOfBirth, p.Age, p.Sex.ToString(), p.Phone, p.Email,
            p.AddressLine1, p.AddressLine2, p.City, p.State, p.ZipCode,
            p.PrimaryLanguage, p.IsActive,
            p.Allergies?.Select(a => new AllergyResponse(
                a.Id, a.Allergen, a.Reaction, a.Severity.ToString(), a.IsActive)).ToList(),
            p.Conditions?.Select(c => new MedicalConditionResponse(
                c.Id, c.Code, c.Name, c.OnsetDate, c.IsActive)).ToList(),
            p.Encounters?.Select(e => new EncounterSummaryResponse(
                e.Id, e.EncounterNumber, e.Type, e.Status.ToString(), e.ChiefComplaint,
                e.ScheduledAt, e.Provider != null ? new ProviderSummaryResponse(
                    e.Provider.Id, e.Provider.FullName, e.Provider.NPI, e.Provider.Specialty) : null)).ToList(),
            p.CreatedAt);
    }

    private static PatientSearchResponse MapToSearch(Domain.Entities.Patient p)
    {
        return new PatientSearchResponse(p.Id, p.MRN, p.FullName, p.Age, p.Sex.ToString(), p.Phone, p.Email, p.IsActive);
    }

    #endregion
}
