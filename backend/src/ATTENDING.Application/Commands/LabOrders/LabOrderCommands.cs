using MediatR;
using ATTENDING.Application.DTOs;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Commands.LabOrders;

/// <summary>
/// Command to create a new lab order
/// </summary>
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
) : IRequest<CreateLabOrderResult>;

public record CreateLabOrderResult(
    bool Success,
    Guid? LabOrderId,
    string? OrderNumber,
    bool WasUpgradedToStat,
    string? RedFlagReason,
    string? Error);

/// <summary>
/// Command to update lab order priority
/// </summary>
public record UpdateLabOrderPriorityCommand(
    Guid LabOrderId,
    OrderPriority NewPriority,
    Guid ModifiedBy
) : IRequest<UpdateLabOrderPriorityResult>;

public record UpdateLabOrderPriorityResult(
    bool Success,
    OrderPriority? PreviousPriority,
    string? Error);

/// <summary>
/// Command to cancel a lab order
/// </summary>
public record CancelLabOrderCommand(
    Guid LabOrderId,
    Guid CancelledBy,
    string Reason
) : IRequest<CancelLabOrderResult>;

public record CancelLabOrderResult(
    bool Success,
    string? Error);

/// <summary>
/// Command to mark lab order as collected
/// </summary>
public record MarkLabOrderCollectedCommand(
    Guid LabOrderId,
    DateTime CollectedAt
) : IRequest<MarkLabOrderCollectedResult>;

public record MarkLabOrderCollectedResult(
    bool Success,
    string? Error);

/// <summary>
/// Command to add result to lab order
/// </summary>
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
) : IRequest<AddLabResultResult>;

public record AddLabResultResult(
    bool Success,
    Guid? ResultId,
    bool IsCritical,
    string? Error);
