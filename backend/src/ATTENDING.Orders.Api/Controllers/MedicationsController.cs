using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Orders.Api.Controllers;

/// <summary>
/// API controller for medication order operations
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
[EnableRateLimiting("tenant-api")]
public class MedicationsController : ControllerBase
{
    private readonly IMedicationOrderRepository _repository;
    private readonly IPatientRepository _patientRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDrugInteractionService _drugInteractionService;
    private readonly IAuditService _auditService;
    private readonly ILogger<MedicationsController> _logger;

    public MedicationsController(
        IMedicationOrderRepository repository,
        IPatientRepository patientRepository,
        IUnitOfWork unitOfWork,
        IDrugInteractionService drugInteractionService,
        IAuditService auditService,
        ILogger<MedicationsController> logger)
    {
        _repository = repository;
        _patientRepository = patientRepository;
        _unitOfWork = unitOfWork;
        _drugInteractionService = drugInteractionService;
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Get a medication order by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(MedicationOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MedicationOrderResponse>> GetById(Guid id)
    {
        var order = await _repository.GetByIdAsync(id);
        
        if (order == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Medication order not found",
                Detail = $"No medication order found with ID {id}",
                Status = StatusCodes.Status404NotFound
            });
        }

        return Ok(MapToResponse(order, null));
    }

    /// <summary>
    /// Get medication orders for a patient
    /// </summary>
    [HttpGet("patient/{patientId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<MedicationOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MedicationOrderResponse>>> GetByPatient(
        Guid patientId, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        take = Math.Clamp(take, 1, 100);
        skip = Math.Clamp(skip, 0, 10000);
        var orders = await _repository.GetByPatientIdAsync(patientId);
        return Ok(orders.Skip(skip).Take(take).Select(o => MapToResponse(o, null)));
    }

    /// <summary>
    /// Get active medications for a patient
    /// </summary>
    [HttpGet("patient/{patientId:guid}/active")]
    [ProducesResponseType(typeof(IEnumerable<MedicationOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MedicationOrderResponse>>> GetActiveByPatient(Guid patientId)
    {
        var orders = await _repository.GetActiveByPatientIdAsync(patientId);
        return Ok(orders.Select(o => MapToResponse(o, null)));
    }

    /// <summary>
    /// Get medication orders for an encounter
    /// </summary>
    [HttpGet("encounter/{encounterId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<MedicationOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MedicationOrderResponse>>> GetByEncounter(Guid encounterId)
    {
        var orders = await _repository.GetByEncounterIdAsync(encounterId);
        return Ok(orders.Select(o => MapToResponse(o, null)));
    }

    /// <summary>
    /// Check for drug interactions
    /// </summary>
    [HttpPost("patient/{patientId:guid}/check-interactions")]
    [ProducesResponseType(typeof(IEnumerable<DrugInteractionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<DrugInteractionResponse>>> CheckInteractions(
        Guid patientId,
        [FromBody] CheckInteractionsRequest request)
    {
        // Get patient's allergies
        var patient = await _patientRepository.GetWithAllergiesAsync(patientId);
        if (patient == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Patient not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        // Get current medications
        var currentMeds = await _repository.GetActiveByPatientIdAsync(patientId);
        var currentMedNames = currentMeds.Select(m => m.MedicationName).ToList();
        var allergies = patient.Allergies.Select(a => a.Allergen).ToList();

        // Check drug-drug interactions for the new medication against current meds
        var drugResult = _drugInteractionService.CheckInteractions(request.NewMedicationName, currentMedNames);
        
        // Check drug-allergy interactions
        var allergyResult = _drugInteractionService.CheckAllergyConflicts(request.NewMedicationName, allergies);

        var interactions = drugResult.Interactions
            .Select(i => new DrugInteractionResponse(
                i.Drug1, i.Drug2, i.Severity.ToString(), 
                i.Description, i.InteractionType))
            .Concat(allergyResult.Interactions
                .Select(i => new DrugInteractionResponse(
                    i.Drug1, i.Drug2, i.Severity.ToString(),
                    i.Description, i.InteractionType)))
            .ToList();

        return Ok(interactions);
    }

    /// <summary>
    /// Create a new medication order
    /// </summary>
    [HttpPost]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(typeof(MedicationOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MedicationOrderResponse>> Create([FromBody] CreateMedicationOrderRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        // Get patient for allergy check
        var patient = await _patientRepository.GetWithAllergiesAsync(request.PatientId);
        if (patient == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Patient not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        // Get current medications and check interactions
        var currentMeds = await _repository.GetActiveByPatientIdAsync(request.PatientId);
        var currentMedNames = currentMeds.Select(m => m.MedicationName).ToList();
        var allergies = patient.Allergies.Select(a => a.Allergen).ToList();

        var drugResult = _drugInteractionService.CheckInteractions(request.MedicationName, currentMedNames);
        var allergyResult = _drugInteractionService.CheckAllergyConflicts(request.MedicationName, allergies);

        // Block if contraindicated interaction found
        if (drugResult.HasContraindications || allergyResult.HasContraindications)
        {
            var contraindicated = drugResult.Interactions
                .Where(i => i.Severity == InteractionSeverity.Contraindicated)
                .Concat(allergyResult.Interactions
                    .Where(i => i.Severity == InteractionSeverity.Contraindicated))
                .Select(i => i.Description);

            return BadRequest(new ProblemDetails
            {
                Title = "Contraindicated medication",
                Detail = $"Cannot prescribe {request.MedicationName} due to contraindicated interaction: " +
                         string.Join(", ", contraindicated),
                Status = StatusCodes.Status400BadRequest
            });
        }

        var hasInteractions = drugResult.HasInteractions || allergyResult.HasInteractions;

        var order = Domain.Entities.MedicationOrder.Create(
            patientId: request.PatientId,
            encounterId: request.EncounterId,
            orderingProviderId: userId,
            medicationCode: request.MedicationCode,
            medicationName: request.MedicationName,
            genericName: request.GenericName,
            strength: request.Strength,
            form: request.Form,
            route: request.Route,
            frequency: request.Frequency,
            dosage: request.Dosage,
            quantity: request.Quantity,
            refills: request.Refills,
            clinicalIndication: request.ClinicalIndication,
            diagnosisCode: request.DiagnosisCode,
            instructions: request.Instructions,
            isControlledSubstance: request.IsControlledSubstance,
            deaSchedule: request.DeaSchedule,
            pharmacyId: request.PharmacyId,
            pharmacyName: request.PharmacyName,
            hasInteractions: hasInteractions);

        await _repository.AddAsync(order, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogPhiAccessAsync(
            userId: userId,
            patientId: request.PatientId,
            action: "CREATE_MEDICATION_ORDER",
            resourceType: "MedicationOrder",
            resourceId: order.Id,
            details: $"Prescribed {request.MedicationName} {request.Strength}");

        _logger.LogInformation(
            "Medication order created: {OrderNumber} for Patient {PatientId}, Med: {MedicationName}, Controlled: {IsControlled}",
            order.OrderNumber, request.PatientId, request.MedicationName, request.IsControlledSubstance);

        // Include interactions in response if any
        var interactions = drugResult.Interactions
            .Select(i => new DrugInteractionResponse(
                i.Drug1, i.Drug2, i.Severity.ToString(),
                i.Description, i.InteractionType))
            .Concat(allergyResult.Interactions
                .Select(i => new DrugInteractionResponse(
                    i.Drug1, i.Drug2, i.Severity.ToString(),
                    i.Description, i.InteractionType)))
            .ToList();

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapToResponse(order, interactions));
    }

    /// <summary>
    /// Discontinue a medication
    /// </summary>
    [HttpPost("{id:guid}/discontinue")]
    [EnableRateLimiting("clinical-ops")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Discontinue(Guid id, [FromBody] DiscontinueMedicationRequest request)
    {
        var userId = GetCurrentUserId();
        var order = await _repository.GetByIdAsync(id);
        
        if (order == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Medication order not found",
                Status = StatusCodes.Status404NotFound
            });
        }

        order.Discontinue(request.Reason, userId);
        _repository.Update(order);
        await _unitOfWork.SaveChangesAsync();

        await _auditService.LogPhiAccessAsync(
            userId: userId,
            patientId: order.PatientId,
            action: "DISCONTINUE_MEDICATION",
            resourceType: "MedicationOrder",
            resourceId: order.Id,
            details: $"Discontinued: {request.Reason}");

        return NoContent();
    }

    #region Private Helpers

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("sub")?.Value
                       ?? User.FindFirst("oid")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Valid user identity is required.");
        return userId;
    }

    private static MedicationOrderResponse MapToResponse(
        Domain.Entities.MedicationOrder order,
        IReadOnlyList<DrugInteractionResponse>? interactions)
    {
        return new MedicationOrderResponse(
            Id: order.Id,
            OrderNumber: order.OrderNumber,
            PatientId: order.PatientId,
            Patient: order.Patient != null ? new PatientSummaryResponse(
                order.Patient.Id, order.Patient.MRN, order.Patient.FullName,
                order.Patient.Age, order.Patient.Sex.ToString()) : null,
            MedicationCode: order.MedicationCode,
            MedicationName: order.MedicationName,
            GenericName: order.GenericName,
            Strength: order.Strength,
            Form: order.Form,
            Route: order.Route,
            Frequency: order.Frequency,
            Dosage: order.Dosage,
            Quantity: order.Quantity,
            Refills: order.Refills,
            Instructions: order.Instructions,
            ClinicalIndication: order.ClinicalIndication,
            DiagnosisCode: order.DiagnosisCode,
            IsControlledSubstance: order.IsControlledSubstance,
            DeaSchedule: order.DeaSchedule,
            HasBlackBoxWarning: order.HasBlackBoxWarning,
            PharmacyName: order.PharmacyName,
            Status: order.Status.ToString(),
            OrderedAt: order.OrderedAt,
            Interactions: interactions);
    }

    #endregion
}

/// <summary>
/// Request to check drug interactions
/// </summary>
public record CheckInteractionsRequest(string NewMedicationName);

/// <summary>
/// Request to discontinue medication
/// </summary>
public record DiscontinueMedicationRequest(string Reason);
