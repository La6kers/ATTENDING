using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Events;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Events;

namespace ATTENDING.Application.Events.Handlers;

/// <summary>
/// Handles emergency protocol events — pushes SignalR alert to all providers
/// </summary>
public class EmergencyProtocolHandler : INotificationHandler<DomainEventNotification<EmergencyProtocolTriggeredEvent>>
{
    private readonly IClinicalNotificationService _notifications;
    private readonly ILogger<EmergencyProtocolHandler> _logger;

    public EmergencyProtocolHandler(
        IClinicalNotificationService notifications,
        ILogger<EmergencyProtocolHandler> logger)
    {
        _notifications = notifications;
        _logger = logger;
    }

    public async Task Handle(DomainEventNotification<EmergencyProtocolTriggeredEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        _logger.LogCritical(
            "EMERGENCY PROTOCOL: Assessment {AssessmentId} for Patient {PatientId} — {Reason}. Action: {Action}",
            evt.AssessmentId, evt.PatientId, evt.Reason, evt.RecommendedAction);

        try
        {
            await _notifications.NotifyEmergencyAssessmentAsync(new EmergencyAssessmentNotification(
                AssessmentId: evt.AssessmentId,
                AssessmentNumber: $"ASM-{evt.AssessmentId.ToString()[..8].ToUpperInvariant()}",
                PatientId: evt.PatientId,
                PatientName: "Patient", // Resolved by notification service from DB if needed
                PatientMrn: "",
                ChiefComplaint: evt.Reason,
                EmergencyReason: evt.RecommendedAction,
                RedFlagCategories: new List<string> { "Emergency" },
                DetectedAt: evt.OccurredAt
            ), cancellationToken);
        }
        catch (Exception ex)
        {
            // Notification failure must never block clinical workflow
            _logger.LogError(ex, "Failed to send emergency SignalR notification for Assessment {AssessmentId}", evt.AssessmentId);
        }
    }
}

/// <summary>
/// Handles red flag detection — pushes SignalR warning to providers watching the patient
/// </summary>
public class RedFlagDetectedHandler : INotificationHandler<DomainEventNotification<RedFlagDetectedEvent>>
{
    private readonly IClinicalNotificationService _notifications;
    private readonly ILogger<RedFlagDetectedHandler> _logger;

    public RedFlagDetectedHandler(
        IClinicalNotificationService notifications,
        ILogger<RedFlagDetectedHandler> logger)
    {
        _notifications = notifications;
        _logger = logger;
    }

    public async Task Handle(DomainEventNotification<RedFlagDetectedEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        _logger.LogWarning(
            "RED FLAG: Assessment {AssessmentId}, Patient {PatientId} — Category: {Category}, Severity: {Severity}",
            evt.AssessmentId, evt.PatientId, evt.Category, evt.Severity);

        try
        {
            await _notifications.NotifyRedFlagDetectedAsync(new RedFlagNotification(
                AssessmentId: evt.AssessmentId,
                PatientId: evt.PatientId,
                PatientName: "Patient",
                Category: evt.Category,
                MatchedKeyword: evt.Category,
                Severity: evt.Severity.ToString(),
                ClinicalReason: evt.Reason,
                DetectedAt: evt.OccurredAt
            ), cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send red flag SignalR notification for Assessment {AssessmentId}", evt.AssessmentId);
        }
    }
}

/// <summary>
/// Handles critical lab results — pushes SignalR critical alert with audio trigger
/// </summary>
public class CriticalLabResultHandler : INotificationHandler<DomainEventNotification<LabOrderResultedEvent>>
{
    private readonly IClinicalNotificationService _notifications;
    private readonly ILogger<CriticalLabResultHandler> _logger;

    public CriticalLabResultHandler(
        IClinicalNotificationService notifications,
        ILogger<CriticalLabResultHandler> logger)
    {
        _notifications = notifications;
        _logger = logger;
    }

    public async Task Handle(DomainEventNotification<LabOrderResultedEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        
        if (!evt.IsCritical)
            return; // Non-critical results don't need real-time push

        _logger.LogCritical(
            "CRITICAL LAB RESULT: Lab Order {LabOrderId} — requires immediate provider notification",
            evt.LabOrderId);

        try
        {
            await _notifications.NotifyCriticalResultAsync(new CriticalResultNotification(
                PatientId: Guid.Empty, // Resolved by notification service enrichment
                PatientName: "Patient",
                PatientMrn: "",
                LabOrderId: evt.LabOrderId,
                OrderNumber: $"LAB-{evt.LabOrderId.ToString()[..8].ToUpperInvariant()}",
                TestName: "Lab Test",
                Value: "Critical",
                Unit: null,
                ReferenceRange: null,
                ResultedAt: evt.OccurredAt,
                OrderingProviderName: null
            ), cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send critical result SignalR notification for LabOrder {LabOrderId}", evt.LabOrderId);
        }
    }
}

/// <summary>
/// Handles drug interaction detection — pushes SignalR safety alert
/// </summary>
public class DrugInteractionHandler : INotificationHandler<DomainEventNotification<DrugInteractionDetectedEvent>>
{
    private readonly IClinicalNotificationService _notifications;
    private readonly ILogger<DrugInteractionHandler> _logger;

    public DrugInteractionHandler(
        IClinicalNotificationService notifications,
        ILogger<DrugInteractionHandler> logger)
    {
        _notifications = notifications;
        _logger = logger;
    }

    public async Task Handle(DomainEventNotification<DrugInteractionDetectedEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        _logger.LogWarning(
            "DRUG INTERACTION: {Drug1} <-> {Drug2} ({Severity}) for Patient {PatientId} — {Description}",
            evt.Drug1, evt.Drug2, evt.Severity, evt.PatientId, evt.Description);

        try
        {
            await _notifications.NotifyDrugInteractionAsync(new DrugInteractionNotification(
                MedicationOrderId: evt.MedicationOrderId,
                PatientId: evt.PatientId,
                PatientName: "Patient",
                Drug1: evt.Drug1,
                Drug2: evt.Drug2,
                Severity: evt.Severity,
                Description: evt.Description,
                DetectedAt: evt.OccurredAt
            ), cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send drug interaction SignalR notification for Patient {PatientId}", evt.PatientId);
        }
    }
}

/// <summary>
/// Handles assessment completion — notifies providers of new assessment ready for review
/// </summary>
public class AssessmentCompletedHandler : INotificationHandler<DomainEventNotification<AssessmentCompletedEvent>>
{
    private readonly IClinicalNotificationService _notifications;
    private readonly ILogger<AssessmentCompletedHandler> _logger;

    public AssessmentCompletedHandler(
        IClinicalNotificationService notifications,
        ILogger<AssessmentCompletedHandler> logger)
    {
        _notifications = notifications;
        _logger = logger;
    }

    public async Task Handle(DomainEventNotification<AssessmentCompletedEvent> notification, CancellationToken cancellationToken)
    {
        var evt = notification.DomainEvent;
        _logger.LogInformation(
            "Assessment completed: {AssessmentId} for Patient {PatientId}, Triage: {TriageLevel}, RedFlags: {HasRedFlags}",
            evt.AssessmentId, evt.PatientId, evt.TriageLevel, evt.HasRedFlags);

        try
        {
            await _notifications.NotifyNewAssessmentAsync(new NewAssessmentNotification(
                AssessmentId: evt.AssessmentId,
                AssessmentNumber: $"ASM-{evt.AssessmentId.ToString()[..8].ToUpperInvariant()}",
                PatientId: evt.PatientId,
                PatientName: "Patient",
                PatientMrn: "",
                PatientAge: 0,
                ChiefComplaint: "",
                TriageLevel: evt.TriageLevel.ToString(),
                HasRedFlags: evt.HasRedFlags,
                StartedAt: evt.OccurredAt
            ), cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send assessment completed notification for Assessment {AssessmentId}", evt.AssessmentId);
        }
    }
}
