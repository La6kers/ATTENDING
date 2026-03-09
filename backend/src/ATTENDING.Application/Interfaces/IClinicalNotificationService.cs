namespace ATTENDING.Application.Interfaces;

/// <summary>
/// Contract for sending real-time clinical notifications to providers.
/// Defined in Application layer; implemented in the API layer via SignalR.
/// </summary>
public interface IClinicalNotificationService
{
    Task NotifyCriticalResultAsync(CriticalResultNotification notification, CancellationToken cancellationToken = default);
    Task NotifyEmergencyAssessmentAsync(EmergencyAssessmentNotification notification, CancellationToken cancellationToken = default);
    Task NotifyOrderStatusChangeAsync(OrderStatusNotification notification, CancellationToken cancellationToken = default);
    Task NotifyNewAssessmentAsync(NewAssessmentNotification notification, CancellationToken cancellationToken = default);
    Task NotifyRedFlagDetectedAsync(RedFlagNotification notification, CancellationToken cancellationToken = default);
    Task NotifyDrugInteractionAsync(DrugInteractionNotification notification, CancellationToken cancellationToken = default);

    /// <summary>
    /// Notifies the provider that their ambient SOAP note is ready for review.
    /// Pushes to the provider's SignalR group so the dashboard updates live.
    /// </summary>
    Task NotifyAmbientNoteReadyAsync(
        Guid providerId,
        Guid encounterId,
        Guid noteId,
        CancellationToken cancellationToken = default);
}

#region Notification Models

public record CriticalResultNotification(
    Guid TenantId,
    Guid PatientId,
    string PatientName,
    string PatientMrn,
    Guid LabOrderId,
    string OrderNumber,
    string TestName,
    string Value,
    string? Unit,
    string? ReferenceRange,
    DateTime ResultedAt,
    string? OrderingProviderName);

public record EmergencyAssessmentNotification(
    Guid TenantId,
    Guid AssessmentId,
    string AssessmentNumber,
    Guid PatientId,
    string PatientName,
    string PatientMrn,
    string ChiefComplaint,
    string EmergencyReason,
    List<string> RedFlagCategories,
    DateTime DetectedAt);

public record OrderStatusNotification(
    Guid TenantId,
    Guid OrderId,
    string OrderNumber,
    string OrderType,
    Guid PatientId,
    string PatientName,
    string OldStatus,
    string NewStatus,
    DateTime ChangedAt);

public record NewAssessmentNotification(
    Guid TenantId,
    Guid AssessmentId,
    string AssessmentNumber,
    Guid PatientId,
    string PatientName,
    string PatientMrn,
    int PatientAge,
    string ChiefComplaint,
    string? TriageLevel,
    bool HasRedFlags,
    DateTime StartedAt);

public record RedFlagNotification(
    Guid TenantId,
    Guid AssessmentId,
    Guid PatientId,
    string PatientName,
    string Category,
    string MatchedKeyword,
    string Severity,
    string ClinicalReason,
    DateTime DetectedAt);

public record DrugInteractionNotification(
    Guid TenantId,
    Guid MedicationOrderId,
    Guid PatientId,
    string PatientName,
    string Drug1,
    string Drug2,
    string Severity,
    string Description,
    DateTime DetectedAt);

#endregion
