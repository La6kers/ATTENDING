using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Events;
using ATTENDING.Domain.Events;

namespace ATTENDING.Application.Events.Handlers;

/// <summary>
/// Handles emergency protocol events â€” logs critical alert and could push SignalR notification
/// </summary>
public class EmergencyProtocolHandler : INotificationHandler<DomainEventNotification<EmergencyProtocolTriggeredEvent>>
{
    private readonly ILogger<EmergencyProtocolHandler> _logger;

    public EmergencyProtocolHandler(ILogger<EmergencyProtocolHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(DomainEventNotification<EmergencyProtocolTriggeredEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        _logger.LogCritical(
            "ðŸš¨ EMERGENCY PROTOCOL: Assessment {AssessmentId} for Patient {PatientId} â€” {Reason}. Action: {Action}",
            evt.AssessmentId, evt.PatientId, evt.Reason, evt.RecommendedAction);

        // TODO: Push SignalR notification to provider dashboard
        // await _hubContext.Clients.Group("providers").SendAsync("EmergencyAlert", evt, cancellationToken);

        return Task.CompletedTask;
    }
}

/// <summary>
/// Handles red flag detection â€” logs warning for clinical review queue
/// </summary>
public class RedFlagDetectedHandler : INotificationHandler<DomainEventNotification<RedFlagDetectedEvent>>
{
    private readonly ILogger<RedFlagDetectedHandler> _logger;

    public RedFlagDetectedHandler(ILogger<RedFlagDetectedHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(DomainEventNotification<RedFlagDetectedEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        _logger.LogWarning(
            "ðŸ”´ RED FLAG: Assessment {AssessmentId}, Patient {PatientId} â€” Category: {Category}, Severity: {Severity}",
            evt.AssessmentId, evt.PatientId, evt.Category, evt.Severity);

        return Task.CompletedTask;
    }
}

/// <summary>
/// Handles critical lab results â€” logs for immediate provider notification
/// </summary>
public class CriticalLabResultHandler : INotificationHandler<DomainEventNotification<LabOrderResultedEvent>>
{
    private readonly ILogger<CriticalLabResultHandler> _logger;

    public CriticalLabResultHandler(ILogger<CriticalLabResultHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(DomainEventNotification<LabOrderResultedEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        if (evt.IsCritical)
        {
            _logger.LogCritical(
                "ðŸ”¬ CRITICAL LAB RESULT: Lab Order {LabOrderId} â€” requires immediate provider notification",
                evt.LabOrderId);

            // TODO: Push SignalR critical result alert
            // TODO: Send SMS/page to ordering provider
        }

        return Task.CompletedTask;
    }
}

/// <summary>
/// Handles drug interaction detection â€” logs safety alert
/// </summary>
public class DrugInteractionHandler : INotificationHandler<DomainEventNotification<DrugInteractionDetectedEvent>>
{
    private readonly ILogger<DrugInteractionHandler> _logger;

    public DrugInteractionHandler(ILogger<DrugInteractionHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(DomainEventNotification<DrugInteractionDetectedEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        _logger.LogWarning(
            "ðŸ’Š DRUG INTERACTION: {Drug1} â†” {Drug2} ({Severity}) for Patient {PatientId} â€” {Description}",
            evt.Drug1, evt.Drug2, evt.Severity, evt.PatientId, evt.Description);

        return Task.CompletedTask;
    }
}
