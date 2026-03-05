using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Application.Commands.LabOrders;

public class CreateLabOrderHandler : IRequestHandler<CreateLabOrderCommand, Result<LabOrderCreated>>
{
    private readonly ILabOrderRepository _labOrderRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IRedFlagEvaluator _redFlagEvaluator;
    private readonly IAuditService _auditService;
    private readonly ILogger<CreateLabOrderHandler> _logger;

    public CreateLabOrderHandler(
        ILabOrderRepository labOrderRepository,
        IPatientRepository patientRepository,
        IUnitOfWork unitOfWork,
        IRedFlagEvaluator redFlagEvaluator,
        IAuditService auditService,
        ILogger<CreateLabOrderHandler> logger)
    {
        _labOrderRepository = labOrderRepository;
        _patientRepository = patientRepository;
        _unitOfWork = unitOfWork;
        _redFlagEvaluator = redFlagEvaluator;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<Result<LabOrderCreated>> Handle(
        CreateLabOrderCommand request, CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken);
        if (patient == null)
            return Result.Failure<LabOrderCreated>(DomainErrors.Patient.NotFound(request.PatientId));

        var redFlagEvaluation = _redFlagEvaluator.Evaluate(
            request.ClinicalIndication, request.ClinicalIndication, request.PainSeverity);

        var labOrder = LabOrder.Create(
            patientId: request.PatientId,
            encounterId: request.EncounterId,
            orderingProviderId: request.OrderingProviderId,
            testCode: request.TestCode,
            testName: request.TestName,
            cptCode: request.CptCode,
            loincCode: request.LoincCode,
            category: request.Category,
            priority: request.Priority,
            clinicalIndication: request.ClinicalIndication,
            diagnosisCode: request.DiagnosisCode,
            requiresFasting: request.RequiresFasting,
            redFlagEvaluation: redFlagEvaluation,
            cptDescription: request.CptDescription,
            cptBasePrice: request.CptBasePrice,
            diagnosisDescription: request.DiagnosisDescription,
            organizationId: patient.OrganizationId);

        await _labOrderRepository.AddAsync(labOrder, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogPhiAccessAsync(
            userId: request.OrderingProviderId,
            patientId: request.PatientId,
            action: "CREATE_LAB_ORDER",
            resourceType: "LabOrder",
            resourceId: labOrder.Id,
            details: $"Created lab order {labOrder.OrderNumber} for {request.TestName}",
            cancellationToken: cancellationToken);

        _logger.LogInformation(
            "Lab order created: {OrderNumber} for Patient {PatientId}, Test: {TestName}, Priority: {Priority}, RedFlag: {IsRedFlag}",
            labOrder.OrderNumber, request.PatientId, request.TestName, labOrder.Priority, labOrder.IsStatFromRedFlag);

        return new LabOrderCreated(labOrder.Id, labOrder.OrderNumber,
            labOrder.IsStatFromRedFlag, labOrder.RedFlagReason);
    }
}

public class UpdateLabOrderPriorityHandler : IRequestHandler<UpdateLabOrderPriorityCommand, Result<PriorityUpdated>>
{
    private readonly ILabOrderRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _auditService;
    private readonly ILogger<UpdateLabOrderPriorityHandler> _logger;

    public UpdateLabOrderPriorityHandler(
        ILabOrderRepository repo, IUnitOfWork uow,
        IAuditService auditService, ILogger<UpdateLabOrderPriorityHandler> logger)
    { _repo = repo; _uow = uow; _auditService = auditService; _logger = logger; }

    public async Task<Result<PriorityUpdated>> Handle(
        UpdateLabOrderPriorityCommand request, CancellationToken ct)
    {
        var labOrder = await _repo.GetByIdAsync(request.LabOrderId, ct);
        if (labOrder == null)
            return Result.Failure<PriorityUpdated>(DomainErrors.LabOrder.NotFound(request.LabOrderId));

        if (labOrder.Status != Domain.Enums.LabOrderStatus.Pending)
            return Result.Failure<PriorityUpdated>(DomainErrors.LabOrder.CannotUpdatePriority(labOrder.Status.ToString()));

        var previousPriority = labOrder.Priority;
        labOrder.UpdatePriority(request.NewPriority, request.ModifiedBy);
        await _uow.SaveChangesAsync(ct);

        await _auditService.LogPhiAccessAsync(
            userId: request.ModifiedBy, patientId: labOrder.PatientId,
            action: "UPDATE_LAB_ORDER_PRIORITY", resourceType: "LabOrder",
            resourceId: labOrder.Id,
            details: $"Changed priority from {previousPriority} to {request.NewPriority}",
            cancellationToken: ct);

        return new PriorityUpdated(previousPriority);
    }
}

public class CancelLabOrderHandler : IRequestHandler<CancelLabOrderCommand, Result<Unit>>
{
    private readonly ILabOrderRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _auditService;
    private readonly ILogger<CancelLabOrderHandler> _logger;

    public CancelLabOrderHandler(
        ILabOrderRepository repo, IUnitOfWork uow,
        IAuditService auditService, ILogger<CancelLabOrderHandler> logger)
    { _repo = repo; _uow = uow; _auditService = auditService; _logger = logger; }

    public async Task<Result<Unit>> Handle(CancelLabOrderCommand request, CancellationToken ct)
    {
        var labOrder = await _repo.GetByIdAsync(request.LabOrderId, ct);
        if (labOrder == null)
            return Result.Failure<Unit>(DomainErrors.LabOrder.NotFound(request.LabOrderId));

        if (labOrder.Status == Domain.Enums.LabOrderStatus.Collected ||
            labOrder.Status == Domain.Enums.LabOrderStatus.Resulted ||
            labOrder.Status == Domain.Enums.LabOrderStatus.CriticalResult)
            return Result.Failure<Unit>(DomainErrors.LabOrder.CannotCancel(labOrder.Status.ToString()));

        labOrder.Cancel(request.CancelledBy, request.Reason);
        await _uow.SaveChangesAsync(ct);

        await _auditService.LogPhiAccessAsync(
            userId: request.CancelledBy, patientId: labOrder.PatientId,
            action: "CANCEL_LAB_ORDER", resourceType: "LabOrder",
            resourceId: labOrder.Id, details: $"Cancelled: {request.Reason}",
            cancellationToken: ct);

        return Result.Success(Unit.Value);
    }
}

public class MarkLabOrderCollectedHandler : IRequestHandler<MarkLabOrderCollectedCommand, Result<Unit>>
{
    private readonly ILabOrderRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<MarkLabOrderCollectedHandler> _logger;

    public MarkLabOrderCollectedHandler(
        ILabOrderRepository repo, IUnitOfWork uow, ILogger<MarkLabOrderCollectedHandler> logger)
    { _repo = repo; _uow = uow; _logger = logger; }

    public async Task<Result<Unit>> Handle(MarkLabOrderCollectedCommand request, CancellationToken ct)
    {
        var labOrder = await _repo.GetByIdAsync(request.LabOrderId, ct);
        if (labOrder == null)
            return Result.Failure<Unit>(DomainErrors.LabOrder.NotFound(request.LabOrderId));

        if (labOrder.Status != Domain.Enums.LabOrderStatus.Pending)
            return Result.Failure<Unit>(DomainErrors.LabOrder.CannotCollect(labOrder.Status.ToString()));

        labOrder.MarkAsCollected(request.CollectedAt);
        await _uow.SaveChangesAsync(ct);
        return Result.Success(Unit.Value);
    }
}

public class AddLabResultHandler : IRequestHandler<AddLabResultCommand, Result<LabResultAdded>>
{
    private readonly ILabOrderRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<AddLabResultHandler> _logger;

    public AddLabResultHandler(
        ILabOrderRepository repo, IUnitOfWork uow, ILogger<AddLabResultHandler> logger)
    { _repo = repo; _uow = uow; _logger = logger; }

    public async Task<Result<LabResultAdded>> Handle(AddLabResultCommand request, CancellationToken ct)
    {
        var labOrder = await _repo.GetByIdAsync(request.LabOrderId, ct);
        if (labOrder == null)
            return Result.Failure<LabResultAdded>(DomainErrors.LabOrder.NotFound(request.LabOrderId));

        var result = LabResult.Create(
            labOrderId: request.LabOrderId,
            value: request.Value,
            unit: request.Unit,
            refLow: request.ReferenceRangeLow,
            refHigh: request.ReferenceRangeHigh,
            interpretation: request.Interpretation,
            isCritical: request.IsCritical,
            performingLab: request.PerformingLab,
            resultedBy: request.ResultedBy,
            comments: request.Comments);

        if (labOrder.Status != Domain.Enums.LabOrderStatus.Collected &&
            labOrder.Status != Domain.Enums.LabOrderStatus.Processing)
            return Result.Failure<LabResultAdded>(DomainErrors.LabOrder.CannotAddResult(labOrder.Status.ToString()));

        labOrder.AddResult(result);
        // No explicit Update(): labOrder is tracked; new LabResult child stays in Added state.
        // DbSet.Update() would incorrectly mark the new LabResult as Modified, causing
        // DbUpdateConcurrencyException in InMemory ("entity does not exist in store").
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Lab result added to order {LabOrderId}, Critical: {IsCritical}",
            request.LabOrderId, request.IsCritical);

        return new LabResultAdded(result.Id, result.IsCritical);
    }
}
