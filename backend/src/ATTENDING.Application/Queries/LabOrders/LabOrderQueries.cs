using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.DTOs;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Queries.LabOrders;

#region Query Definitions

/// <summary>
/// Query to get a lab order by ID
/// </summary>
public record GetLabOrderByIdQuery(Guid LabOrderId) : IRequest<LabOrderDto?>;

/// <summary>
/// Query to get a lab order by order number
/// </summary>
public record GetLabOrderByNumberQuery(string OrderNumber) : IRequest<LabOrderDto?>;

/// <summary>
/// Query to get lab orders by patient ID
/// </summary>
public record GetLabOrdersByPatientQuery(
    Guid PatientId,
    LabOrderStatus? Status = null,
    int Skip = 0,
    int Take = 20
) : IRequest<IReadOnlyList<LabOrderSummaryDto>>;

/// <summary>
/// Query to get lab orders by encounter ID
/// </summary>
public record GetLabOrdersByEncounterQuery(Guid EncounterId) : IRequest<IReadOnlyList<LabOrderSummaryDto>>;

/// <summary>
/// Query to get pending lab orders
/// </summary>
public record GetPendingLabOrdersQuery() : IRequest<IReadOnlyList<LabOrderDto>>;

/// <summary>
/// Query to get critical lab results
/// </summary>
public record GetCriticalLabResultsQuery() : IRequest<IReadOnlyList<LabOrderDto>>;

#endregion

#region Query Handlers

/// <summary>
/// Handler for GetLabOrderByIdQuery
/// </summary>
public class GetLabOrderByIdHandler : IRequestHandler<GetLabOrderByIdQuery, LabOrderDto?>
{
    private readonly ILabOrderRepository _repository;
    private readonly ILogger<GetLabOrderByIdHandler> _logger;

    public GetLabOrderByIdHandler(ILabOrderRepository repository, ILogger<GetLabOrderByIdHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<LabOrderDto?> Handle(GetLabOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var order = await _repository.GetWithResultAsync(request.LabOrderId, cancellationToken);
        if (order == null) return null;

        return MapToDto(order);
    }

    private static LabOrderDto MapToDto(Domain.Entities.LabOrder order)
    {
        return new LabOrderDto(
            Id: order.Id,
            OrderNumber: order.OrderNumber,
            PatientId: order.PatientId,
            Patient: order.Patient != null ? new PatientSummaryDto(
                order.Patient.Id,
                order.Patient.MRN,
                order.Patient.FullName,
                order.Patient.Age,
                order.Patient.Sex.ToString()) : null,
            EncounterId: order.EncounterId,
            OrderingProviderId: order.OrderingProviderId,
            OrderingProvider: order.OrderingProvider != null ? new ProviderDto(
                order.OrderingProvider.Id,
                order.OrderingProvider.FullName,
                order.OrderingProvider.NPI,
                order.OrderingProvider.Specialty) : null,
            TestCode: order.TestCode,
            TestName: order.TestName,
            CptCode: order.CptCode,
            CptDescription: order.CptDescription,
            LoincCode: order.LoincCode,
            Category: order.Category,
            Priority: order.Priority,
            ClinicalIndication: order.ClinicalIndication,
            DiagnosisCode: order.DiagnosisCode,
            DiagnosisDescription: order.DiagnosisDescription,
            RequiresFasting: order.RequiresFasting,
            IsStatFromRedFlag: order.IsStatFromRedFlag,
            RedFlagReason: order.RedFlagReason,
            Status: order.Status,
            OrderedAt: order.OrderedAt,
            CollectedAt: order.CollectedAt,
            ResultedAt: order.ResultedAt,
            Result: order.Result != null ? new LabResultDto(
                order.Result.Id,
                order.Result.Value,
                order.Result.Unit,
                order.Result.ReferenceRangeLow,
                order.Result.ReferenceRangeHigh,
                order.Result.ReferenceRangeText,
                order.Result.Interpretation,
                order.Result.IsCritical,
                order.Result.CriticalNotifiedAt,
                order.Result.PerformingLab,
                order.Result.ResultedAt,
                order.Result.Comments) : null);
    }
}

/// <summary>
/// Handler for GetLabOrderByNumberQuery
/// </summary>
public class GetLabOrderByNumberHandler : IRequestHandler<GetLabOrderByNumberQuery, LabOrderDto?>
{
    private readonly ILabOrderRepository _repository;

    public GetLabOrderByNumberHandler(ILabOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<LabOrderDto?> Handle(GetLabOrderByNumberQuery request, CancellationToken cancellationToken)
    {
        var order = await _repository.GetByOrderNumberAsync(request.OrderNumber, cancellationToken);
        if (order == null) return null;

        return new LabOrderDto(
            Id: order.Id,
            OrderNumber: order.OrderNumber,
            PatientId: order.PatientId,
            Patient: order.Patient != null ? new PatientSummaryDto(
                order.Patient.Id,
                order.Patient.MRN,
                order.Patient.FullName,
                order.Patient.Age,
                order.Patient.Sex.ToString()) : null,
            EncounterId: order.EncounterId,
            OrderingProviderId: order.OrderingProviderId,
            OrderingProvider: order.OrderingProvider != null ? new ProviderDto(
                order.OrderingProvider.Id,
                order.OrderingProvider.FullName,
                order.OrderingProvider.NPI,
                order.OrderingProvider.Specialty) : null,
            TestCode: order.TestCode,
            TestName: order.TestName,
            CptCode: order.CptCode,
            CptDescription: order.CptDescription,
            LoincCode: order.LoincCode,
            Category: order.Category,
            Priority: order.Priority,
            ClinicalIndication: order.ClinicalIndication,
            DiagnosisCode: order.DiagnosisCode,
            DiagnosisDescription: order.DiagnosisDescription,
            RequiresFasting: order.RequiresFasting,
            IsStatFromRedFlag: order.IsStatFromRedFlag,
            RedFlagReason: order.RedFlagReason,
            Status: order.Status,
            OrderedAt: order.OrderedAt,
            CollectedAt: order.CollectedAt,
            ResultedAt: order.ResultedAt,
            Result: null);
    }
}

/// <summary>
/// Handler for GetLabOrdersByPatientQuery
/// </summary>
public class GetLabOrdersByPatientHandler : IRequestHandler<GetLabOrdersByPatientQuery, IReadOnlyList<LabOrderSummaryDto>>
{
    private readonly ILabOrderRepository _repository;

    public GetLabOrdersByPatientHandler(ILabOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<LabOrderSummaryDto>> Handle(
        GetLabOrdersByPatientQuery request,
        CancellationToken cancellationToken)
    {
        var orders = await _repository.GetByPatientIdAsync(request.PatientId, cancellationToken);

        if (request.Status.HasValue)
        {
            orders = orders.Where(o => o.Status == request.Status.Value).ToList();
        }

        return orders
            .Skip(request.Skip)
            .Take(request.Take)
            .Select(o => new LabOrderSummaryDto(
                o.Id,
                o.OrderNumber,
                o.TestName,
                o.Priority,
                o.Status,
                o.OrderedAt,
                o.Result != null))
            .ToList();
    }
}

/// <summary>
/// Handler for GetLabOrdersByEncounterQuery
/// </summary>
public class GetLabOrdersByEncounterHandler : IRequestHandler<GetLabOrdersByEncounterQuery, IReadOnlyList<LabOrderSummaryDto>>
{
    private readonly ILabOrderRepository _repository;

    public GetLabOrdersByEncounterHandler(ILabOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<LabOrderSummaryDto>> Handle(
        GetLabOrdersByEncounterQuery request,
        CancellationToken cancellationToken)
    {
        var orders = await _repository.GetByEncounterIdAsync(request.EncounterId, cancellationToken);

        return orders.Select(o => new LabOrderSummaryDto(
            o.Id,
            o.OrderNumber,
            o.TestName,
            o.Priority,
            o.Status,
            o.OrderedAt,
            o.Result != null))
            .ToList();
    }
}

/// <summary>
/// Handler for GetPendingLabOrdersQuery
/// </summary>
public class GetPendingLabOrdersHandler : IRequestHandler<GetPendingLabOrdersQuery, IReadOnlyList<LabOrderDto>>
{
    private readonly ILabOrderRepository _repository;

    public GetPendingLabOrdersHandler(ILabOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<LabOrderDto>> Handle(
        GetPendingLabOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var orders = await _repository.GetPendingOrdersAsync(cancellationToken);

        return orders.Select(o => new LabOrderDto(
            Id: o.Id,
            OrderNumber: o.OrderNumber,
            PatientId: o.PatientId,
            Patient: o.Patient != null ? new PatientSummaryDto(
                o.Patient.Id,
                o.Patient.MRN,
                o.Patient.FullName,
                o.Patient.Age,
                o.Patient.Sex.ToString()) : null,
            EncounterId: o.EncounterId,
            OrderingProviderId: o.OrderingProviderId,
            OrderingProvider: null,
            TestCode: o.TestCode,
            TestName: o.TestName,
            CptCode: o.CptCode,
            CptDescription: o.CptDescription,
            LoincCode: o.LoincCode,
            Category: o.Category,
            Priority: o.Priority,
            ClinicalIndication: o.ClinicalIndication,
            DiagnosisCode: o.DiagnosisCode,
            DiagnosisDescription: o.DiagnosisDescription,
            RequiresFasting: o.RequiresFasting,
            IsStatFromRedFlag: o.IsStatFromRedFlag,
            RedFlagReason: o.RedFlagReason,
            Status: o.Status,
            OrderedAt: o.OrderedAt,
            CollectedAt: o.CollectedAt,
            ResultedAt: o.ResultedAt,
            Result: null))
            .ToList();
    }
}

/// <summary>
/// Handler for GetCriticalLabResultsQuery
/// </summary>
public class GetCriticalLabResultsHandler : IRequestHandler<GetCriticalLabResultsQuery, IReadOnlyList<LabOrderDto>>
{
    private readonly ILabOrderRepository _repository;

    public GetCriticalLabResultsHandler(ILabOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<LabOrderDto>> Handle(
        GetCriticalLabResultsQuery request,
        CancellationToken cancellationToken)
    {
        var orders = await _repository.GetCriticalResultsAsync(cancellationToken);

        return orders.Select(o => new LabOrderDto(
            Id: o.Id,
            OrderNumber: o.OrderNumber,
            PatientId: o.PatientId,
            Patient: o.Patient != null ? new PatientSummaryDto(
                o.Patient.Id,
                o.Patient.MRN,
                o.Patient.FullName,
                o.Patient.Age,
                o.Patient.Sex.ToString()) : null,
            EncounterId: o.EncounterId,
            OrderingProviderId: o.OrderingProviderId,
            OrderingProvider: o.OrderingProvider != null ? new ProviderDto(
                o.OrderingProvider.Id,
                o.OrderingProvider.FullName,
                o.OrderingProvider.NPI,
                o.OrderingProvider.Specialty) : null,
            TestCode: o.TestCode,
            TestName: o.TestName,
            CptCode: o.CptCode,
            CptDescription: o.CptDescription,
            LoincCode: o.LoincCode,
            Category: o.Category,
            Priority: o.Priority,
            ClinicalIndication: o.ClinicalIndication,
            DiagnosisCode: o.DiagnosisCode,
            DiagnosisDescription: o.DiagnosisDescription,
            RequiresFasting: o.RequiresFasting,
            IsStatFromRedFlag: o.IsStatFromRedFlag,
            RedFlagReason: o.RedFlagReason,
            Status: o.Status,
            OrderedAt: o.OrderedAt,
            CollectedAt: o.CollectedAt,
            ResultedAt: o.ResultedAt,
            Result: o.Result != null ? new LabResultDto(
                o.Result.Id,
                o.Result.Value,
                o.Result.Unit,
                o.Result.ReferenceRangeLow,
                o.Result.ReferenceRangeHigh,
                o.Result.ReferenceRangeText,
                o.Result.Interpretation,
                o.Result.IsCritical,
                o.Result.CriticalNotifiedAt,
                o.Result.PerformingLab,
                o.Result.ResultedAt,
                o.Result.Comments) : null))
            .ToList();
    }
}

#endregion
