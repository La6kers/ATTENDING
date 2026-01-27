using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Application.Commands.LabOrders;

/// <summary>
/// Handler for CreateLabOrderCommand
/// </summary>
public class CreateLabOrderHandler : IRequestHandler<CreateLabOrderCommand, CreateLabOrderResult>
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

    public async Task<CreateLabOrderResult> Handle(
        CreateLabOrderCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            // Validate patient exists
            var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken);
            if (patient == null)
            {
                return new CreateLabOrderResult(
                    Success: false,
                    LabOrderId: null,
                    OrderNumber: null,
                    WasUpgradedToStat: false,
                    RedFlagReason: null,
                    Error: $"Patient not found: {request.PatientId}");
            }

            // Evaluate for red flags
            var redFlagEvaluation = _redFlagEvaluator.Evaluate(
                request.ClinicalIndication,
                request.ClinicalIndication,
                request.PainSeverity);

            // Create the lab order
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
                diagnosisDescription: request.DiagnosisDescription);

            await _labOrderRepository.AddAsync(labOrder, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Audit log
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
                labOrder.OrderNumber,
                request.PatientId,
                request.TestName,
                labOrder.Priority,
                labOrder.IsStatFromRedFlag);

            return new CreateLabOrderResult(
                Success: true,
                LabOrderId: labOrder.Id,
                OrderNumber: labOrder.OrderNumber,
                WasUpgradedToStat: labOrder.IsStatFromRedFlag,
                RedFlagReason: labOrder.RedFlagReason,
                Error: null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create lab order for Patient {PatientId}", request.PatientId);
            return new CreateLabOrderResult(
                Success: false,
                LabOrderId: null,
                OrderNumber: null,
                WasUpgradedToStat: false,
                RedFlagReason: null,
                Error: $"Failed to create lab order: {ex.Message}");
        }
    }
}

/// <summary>
/// Handler for UpdateLabOrderPriorityCommand
/// </summary>
public class UpdateLabOrderPriorityHandler : IRequestHandler<UpdateLabOrderPriorityCommand, UpdateLabOrderPriorityResult>
{
    private readonly ILabOrderRepository _labOrderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly ILogger<UpdateLabOrderPriorityHandler> _logger;

    public UpdateLabOrderPriorityHandler(
        ILabOrderRepository labOrderRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        ILogger<UpdateLabOrderPriorityHandler> logger)
    {
        _labOrderRepository = labOrderRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<UpdateLabOrderPriorityResult> Handle(
        UpdateLabOrderPriorityCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var labOrder = await _labOrderRepository.GetByIdAsync(request.LabOrderId, cancellationToken);
            if (labOrder == null)
            {
                return new UpdateLabOrderPriorityResult(false, null, "Lab order not found");
            }

            var previousPriority = labOrder.Priority;
            labOrder.UpdatePriority(request.NewPriority, request.ModifiedBy);

            _labOrderRepository.Update(labOrder);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await _auditService.LogPhiAccessAsync(
                userId: request.ModifiedBy,
                patientId: labOrder.PatientId,
                action: "UPDATE_LAB_ORDER_PRIORITY",
                resourceType: "LabOrder",
                resourceId: labOrder.Id,
                details: $"Changed priority from {previousPriority} to {request.NewPriority}",
                cancellationToken: cancellationToken);

            return new UpdateLabOrderPriorityResult(true, previousPriority, null);
        }
        catch (InvalidOperationException ex)
        {
            return new UpdateLabOrderPriorityResult(false, null, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update lab order priority {LabOrderId}", request.LabOrderId);
            return new UpdateLabOrderPriorityResult(false, null, $"Failed: {ex.Message}");
        }
    }
}

/// <summary>
/// Handler for CancelLabOrderCommand
/// </summary>
public class CancelLabOrderHandler : IRequestHandler<CancelLabOrderCommand, CancelLabOrderResult>
{
    private readonly ILabOrderRepository _labOrderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly ILogger<CancelLabOrderHandler> _logger;

    public CancelLabOrderHandler(
        ILabOrderRepository labOrderRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        ILogger<CancelLabOrderHandler> logger)
    {
        _labOrderRepository = labOrderRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<CancelLabOrderResult> Handle(
        CancelLabOrderCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var labOrder = await _labOrderRepository.GetByIdAsync(request.LabOrderId, cancellationToken);
            if (labOrder == null)
            {
                return new CancelLabOrderResult(false, "Lab order not found");
            }

            labOrder.Cancel(request.CancelledBy, request.Reason);

            _labOrderRepository.Update(labOrder);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await _auditService.LogPhiAccessAsync(
                userId: request.CancelledBy,
                patientId: labOrder.PatientId,
                action: "CANCEL_LAB_ORDER",
                resourceType: "LabOrder",
                resourceId: labOrder.Id,
                details: $"Cancelled: {request.Reason}",
                cancellationToken: cancellationToken);

            return new CancelLabOrderResult(true, null);
        }
        catch (InvalidOperationException ex)
        {
            return new CancelLabOrderResult(false, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel lab order {LabOrderId}", request.LabOrderId);
            return new CancelLabOrderResult(false, $"Failed: {ex.Message}");
        }
    }
}

/// <summary>
/// Handler for MarkLabOrderCollectedCommand
/// </summary>
public class MarkLabOrderCollectedHandler : IRequestHandler<MarkLabOrderCollectedCommand, MarkLabOrderCollectedResult>
{
    private readonly ILabOrderRepository _labOrderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<MarkLabOrderCollectedHandler> _logger;

    public MarkLabOrderCollectedHandler(
        ILabOrderRepository labOrderRepository,
        IUnitOfWork unitOfWork,
        ILogger<MarkLabOrderCollectedHandler> logger)
    {
        _labOrderRepository = labOrderRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<MarkLabOrderCollectedResult> Handle(
        MarkLabOrderCollectedCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var labOrder = await _labOrderRepository.GetByIdAsync(request.LabOrderId, cancellationToken);
            if (labOrder == null)
            {
                return new MarkLabOrderCollectedResult(false, "Lab order not found");
            }

            labOrder.MarkAsCollected(request.CollectedAt);

            _labOrderRepository.Update(labOrder);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new MarkLabOrderCollectedResult(true, null);
        }
        catch (InvalidOperationException ex)
        {
            return new MarkLabOrderCollectedResult(false, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to mark lab order collected {LabOrderId}", request.LabOrderId);
            return new MarkLabOrderCollectedResult(false, $"Failed: {ex.Message}");
        }
    }
}

/// <summary>
/// Handler for AddLabResultCommand
/// </summary>
public class AddLabResultHandler : IRequestHandler<AddLabResultCommand, AddLabResultResult>
{
    private readonly ILabOrderRepository _labOrderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<AddLabResultHandler> _logger;

    public AddLabResultHandler(
        ILabOrderRepository labOrderRepository,
        IUnitOfWork unitOfWork,
        ILogger<AddLabResultHandler> logger)
    {
        _labOrderRepository = labOrderRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<AddLabResultResult> Handle(
        AddLabResultCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var labOrder = await _labOrderRepository.GetByIdAsync(request.LabOrderId, cancellationToken);
            if (labOrder == null)
            {
                return new AddLabResultResult(false, null, false, "Lab order not found");
            }

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

            labOrder.AddResult(result);

            _labOrderRepository.Update(labOrder);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Lab result added to order {LabOrderId}, Critical: {IsCritical}",
                request.LabOrderId, request.IsCritical);

            return new AddLabResultResult(true, result.Id, result.IsCritical, null);
        }
        catch (InvalidOperationException ex)
        {
            return new AddLabResultResult(false, null, false, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add result to lab order {LabOrderId}", request.LabOrderId);
            return new AddLabResultResult(false, null, false, $"Failed: {ex.Message}");
        }
    }
}
