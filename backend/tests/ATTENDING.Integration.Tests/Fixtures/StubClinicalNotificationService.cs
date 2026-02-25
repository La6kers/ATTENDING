using ATTENDING.Application.Interfaces;

namespace ATTENDING.Integration.Tests.Fixtures;

/// <summary>
/// In-memory notification service stub for integration tests.
/// Records all notifications so tests can inspect what was sent.
/// Thread-safe via lock.
/// </summary>
public class StubClinicalNotificationService : IClinicalNotificationService
{
    private readonly object _lock = new();

    public List<CriticalResultNotification> CriticalResults { get; } = new();
    public List<EmergencyAssessmentNotification> EmergencyAssessments { get; } = new();
    public List<OrderStatusNotification> OrderStatusChanges { get; } = new();
    public List<NewAssessmentNotification> NewAssessments { get; } = new();
    public List<RedFlagNotification> RedFlags { get; } = new();
    public List<DrugInteractionNotification> DrugInteractions { get; } = new();

    public Task NotifyCriticalResultAsync(CriticalResultNotification notification, CancellationToken cancellationToken = default)
    {
        lock (_lock) CriticalResults.Add(notification);
        return Task.CompletedTask;
    }

    public Task NotifyEmergencyAssessmentAsync(EmergencyAssessmentNotification notification, CancellationToken cancellationToken = default)
    {
        lock (_lock) EmergencyAssessments.Add(notification);
        return Task.CompletedTask;
    }

    public Task NotifyOrderStatusChangeAsync(OrderStatusNotification notification, CancellationToken cancellationToken = default)
    {
        lock (_lock) OrderStatusChanges.Add(notification);
        return Task.CompletedTask;
    }

    public Task NotifyNewAssessmentAsync(NewAssessmentNotification notification, CancellationToken cancellationToken = default)
    {
        lock (_lock) NewAssessments.Add(notification);
        return Task.CompletedTask;
    }

    public Task NotifyRedFlagDetectedAsync(RedFlagNotification notification, CancellationToken cancellationToken = default)
    {
        lock (_lock) RedFlags.Add(notification);
        return Task.CompletedTask;
    }

    public Task NotifyDrugInteractionAsync(DrugInteractionNotification notification, CancellationToken cancellationToken = default)
    {
        lock (_lock) DrugInteractions.Add(notification);
        return Task.CompletedTask;
    }

    public void Clear()
    {
        lock (_lock)
        {
            CriticalResults.Clear();
            EmergencyAssessments.Clear();
            OrderStatusChanges.Clear();
            NewAssessments.Clear();
            RedFlags.Clear();
            DrugInteractions.Clear();
        }
    }
}
