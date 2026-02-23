using MediatR;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Commands.LabOrders;

public record CreateLabOrderCommand(
    Guid PatientId,
    Guid EncounterId,
    Guid OrderingProviderId,
    string TestCode,
    string TestName,
    string CptCode,
    string? CptDescription,
    decimal? CptBasePrice,
    string LoincCode,
    string Category,
    OrderPriority Priority,
    string ClinicalIndication,
    string DiagnosisCode,
    string? DiagnosisDescription,
    bool RequiresFasting,
    int? PainSeverity = null
) : IRequest<Result<LabOrderCreated>>;

public record LabOrderCreated(
    Guid LabOrderId,
    string OrderNumber,
    bool WasUpgradedToStat,
    string? RedFlagReason);

public record UpdateLabOrderPriorityCommand(
    Guid LabOrderId,
    OrderPriority NewPriority,
    Guid ModifiedBy
) : IRequest<Result<PriorityUpdated>>;

public record PriorityUpdated(OrderPriority PreviousPriority);

public record CancelLabOrderCommand(
    Guid LabOrderId,
    Guid CancelledBy,
    string Reason
) : IRequest<Result<Unit>>;

public record MarkLabOrderCollectedCommand(
    Guid LabOrderId,
    DateTime CollectedAt
) : IRequest<Result<Unit>>;

public record AddLabResultCommand(
    Guid LabOrderId,
    string Value,
    string? Unit,
    decimal? ReferenceRangeLow,
    decimal? ReferenceRangeHigh,
    string? ReferenceRangeText,
    string? Interpretation,
    bool IsCritical,
    string? PerformingLab,
    string? ResultedBy,
    string? Comments
) : IRequest<Result<LabResultAdded>>;

public record LabResultAdded(Guid ResultId, bool IsCritical);
