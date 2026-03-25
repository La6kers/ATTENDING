using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Application.Commands.Organizations;
using ATTENDING.Application.Queries.Organizations;
using ATTENDING.Contracts.Requests;
using ATTENDING.Domain.Enums;
using ATTENDING.Orders.Api.Extensions;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// Organization provisioning and onboarding lifecycle management.
/// Supports the full plug-and-play flow:
///   Provision → Configure EHR → Test Connection → Seed Data → Activate
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
[EnableRateLimiting("tenant-api")]
public class OrganizationsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<OrganizationsController> _logger;

    public OrganizationsController(IMediator mediator, ILogger<OrganizationsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    // ── Queries ──────────────────────────────────────────────────────

    /// <summary>List all organizations (admin)</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<OrganizationSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<OrganizationSummaryDto>>> GetAll()
    {
        var result = await _mediator.Send(new GetAllOrganizationsQuery());
        return Ok(result);
    }

    /// <summary>Get organization by ID</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(OrganizationDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrganizationDetailDto>> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetOrganizationByIdQuery(id));
        if (result is null)
            return NotFound(new ProblemDetails { Title = "Organization not found", Status = 404 });
        return Ok(result);
    }

    /// <summary>Get organization by slug</summary>
    [HttpGet("by-slug/{slug}")]
    [ProducesResponseType(typeof(OrganizationDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrganizationDetailDto>> GetBySlug(string slug)
    {
        var result = await _mediator.Send(new GetOrganizationBySlugQuery(slug));
        if (result is null)
            return NotFound(new ProblemDetails { Title = "Organization not found", Status = 404 });
        return Ok(result);
    }

    /// <summary>Get the authenticated user's current organization</summary>
    [HttpGet("current")]
    [ProducesResponseType(typeof(OrganizationCurrentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrganizationCurrentDto>> GetCurrent()
    {
        var result = await _mediator.Send(new GetCurrentOrganizationQuery());
        if (result is null)
            return NotFound(new ProblemDetails { Title = "No organization found for current user", Status = 404 });
        return Ok(result);
    }

    // ── Onboarding Lifecycle ─────────────────────────────────────────

    /// <summary>Step 1: Provision a new organization</summary>
    [HttpPost]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(OrganizationProvisionedDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Provision([FromBody] ProvisionOrganizationRequest request)
    {
        var command = new ProvisionOrganizationCommand(
            Name: request.Name,
            PrimaryContactName: request.PrimaryContactName,
            PrimaryContactEmail: request.PrimaryContactEmail,
            NPI: request.NPI,
            MaxProviderSeats: request.MaxProviderSeats,
            Address: request.Address,
            City: request.City,
            State: request.State,
            ZipCode: request.ZipCode,
            TimeZone: request.TimeZone);

        var result = await _mediator.Send(command);
        return result.ToCreatedAtAction(nameof(GetById),
            new { id = result.IsSuccess ? result.Value.OrganizationId : Guid.Empty });
    }

    /// <summary>Step 2: Configure an EHR connector</summary>
    [HttpPost("{id:guid}/ehr-connectors")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(EhrConnectorConfiguredDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConfigureEhr(Guid id, [FromBody] ConfigureEhrConnectorRequest request)
    {
        if (!Enum.TryParse<EhrVendor>(request.Vendor, true, out var vendor))
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid vendor",
                Detail = $"'{request.Vendor}' is not a recognized EHR vendor. " +
                    $"Valid values: {string.Join(", ", Enum.GetNames<EhrVendor>())}",
                Status = 400
            });

        var command = new ConfigureEhrConnectorCommand(
            OrganizationId: id,
            Vendor: vendor,
            ClientId: request.ClientId,
            ClientSecret: request.ClientSecret,
            FhirBaseUrl: request.FhirBaseUrl,
            EhrTenantId: request.EhrTenantId,
            Label: request.Label);

        var result = await _mediator.Send(command);
        return result.ToCreated($"/api/v1/organizations/{id}");
    }

    /// <summary>Step 3: Test EHR FHIR connectivity</summary>
    [HttpPost("{id:guid}/ehr-connectors/{connectorId:guid}/test")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(EhrConnectionTestResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EhrConnectionTestResultDto>> TestEhrConnection(Guid id, Guid connectorId)
    {
        var result = await _mediator.Send(new TestEhrConnectionCommand(id, connectorId));
        return result.ToOk();
    }

    /// <summary>Step 4: Seed synthetic demo data</summary>
    [HttpPost("{id:guid}/seed")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(DataSeedResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DataSeedResultDto>> SeedData(Guid id, [FromBody] SeedOrganizationDataRequest? request = null)
    {
        var command = new SeedOrganizationDataCommand(
            OrganizationId: id,
            IncludeDemoPatients: request?.IncludeDemoPatients ?? true,
            IncludeReferenceData: request?.IncludeReferenceData ?? true);

        var result = await _mediator.Send(command);
        return result.ToOk();
    }

    /// <summary>Step 5: Activate the organization</summary>
    [HttpPost("{id:guid}/activate")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(OrganizationActivatedDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrganizationActivatedDto>> Activate(Guid id)
    {
        var result = await _mediator.Send(new ActivateOrganizationCommand(id));
        return result.ToOk();
    }

    /// <summary>Switch data mode (Demo / Sandbox / Production)</summary>
    [HttpPut("{id:guid}/data-mode")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(DataModeSetDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DataModeSetDto>> SetDataMode(Guid id, [FromBody] SetDataModeRequest request)
    {
        if (!Enum.TryParse<DataMode>(request.Mode, true, out var mode))
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid data mode",
                Detail = $"'{request.Mode}' is not a valid data mode. " +
                    $"Valid values: {string.Join(", ", Enum.GetNames<DataMode>())}",
                Status = 400
            });

        var result = await _mediator.Send(new SetDataModeCommand(id, mode));
        return result.ToOk();
    }
}
