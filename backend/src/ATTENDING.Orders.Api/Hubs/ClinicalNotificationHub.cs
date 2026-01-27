using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace ATTENDING.Orders.Api.Hubs;

/// <summary>
/// SignalR hub for real-time clinical notifications
/// </summary>
[Authorize]
public class ClinicalNotificationHub : Hub
{
    private readonly ILogger<ClinicalNotificationHub> _logger;
    
    // Track connected providers by their user ID
    private static readonly ConcurrentDictionary<string, HashSet<string>> _providerConnections = new();
    
    // Track which providers are watching which patients
    private static readonly ConcurrentDictionary<string, HashSet<string>> _patientWatchers = new();

    public ClinicalNotificationHub(ILogger<ClinicalNotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier ?? Context.ConnectionId;
        var connectionId = Context.ConnectionId;
        
        // Add to provider connections
        _providerConnections.AddOrUpdate(
            userId,
            _ => new HashSet<string> { connectionId },
            (_, connections) => { connections.Add(connectionId); return connections; });
        
        // Add to providers group
        await Groups.AddToGroupAsync(connectionId, "Providers");
        
        _logger.LogInformation("Provider {UserId} connected with connection {ConnectionId}", userId, connectionId);
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier ?? Context.ConnectionId;
        var connectionId = Context.ConnectionId;
        
        // Remove from provider connections
        if (_providerConnections.TryGetValue(userId, out var connections))
        {
            connections.Remove(connectionId);
            if (connections.Count == 0)
            {
                _providerConnections.TryRemove(userId, out _);
            }
        }
        
        // Remove from all patient watch lists
        foreach (var kvp in _patientWatchers)
        {
            kvp.Value.Remove(connectionId);
        }
        
        await Groups.RemoveFromGroupAsync(connectionId, "Providers");
        
        _logger.LogInformation("Provider {UserId} disconnected", userId);
        
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Subscribe to notifications for a specific patient
    /// </summary>
    public async Task WatchPatient(string patientId)
    {
        var connectionId = Context.ConnectionId;
        
        _patientWatchers.AddOrUpdate(
            patientId,
            _ => new HashSet<string> { connectionId },
            (_, watchers) => { watchers.Add(connectionId); return watchers; });
        
        await Groups.AddToGroupAsync(connectionId, $"Patient_{patientId}");
        
        _logger.LogDebug("Connection {ConnectionId} now watching Patient {PatientId}", connectionId, patientId);
    }

    /// <summary>
    /// Unsubscribe from patient notifications
    /// </summary>
    public async Task UnwatchPatient(string patientId)
    {
        var connectionId = Context.ConnectionId;
        
        if (_patientWatchers.TryGetValue(patientId, out var watchers))
        {
            watchers.Remove(connectionId);
        }
        
        await Groups.RemoveFromGroupAsync(connectionId, $"Patient_{patientId}");
        
        _logger.LogDebug("Connection {ConnectionId} stopped watching Patient {PatientId}", connectionId, patientId);
    }

    /// <summary>
    /// Join the emergency alerts group
    /// </summary>
    public async Task JoinEmergencyAlerts()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "EmergencyAlerts");
    }

    /// <summary>
    /// Leave the emergency alerts group
    /// </summary>
    public async Task LeaveEmergencyAlerts()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "EmergencyAlerts");
    }
}

/// <summary>
/// Service for sending notifications through SignalR
/// </summary>
public interface IClinicalNotificationService
{
    Task NotifyCriticalResultAsync(CriticalResultNotification notification);
    Task NotifyEmergencyAssessmentAsync(EmergencyAssessmentNotification notification);
    Task NotifyOrderStatusChangeAsync(OrderStatusNotification notification);
    Task NotifyNewAssessmentAsync(NewAssessmentNotification notification);
    Task NotifyRedFlagDetectedAsync(RedFlagNotification notification);
}

public class ClinicalNotificationService : IClinicalNotificationService
{
    private readonly IHubContext<ClinicalNotificationHub> _hubContext;
    private readonly ILogger<ClinicalNotificationService> _logger;

    public ClinicalNotificationService(
        IHubContext<ClinicalNotificationHub> hubContext,
        ILogger<ClinicalNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Notify providers about a critical lab result
    /// </summary>
    public async Task NotifyCriticalResultAsync(CriticalResultNotification notification)
    {
        _logger.LogWarning(
            "CRITICAL RESULT: {TestName} = {Value} for Patient {PatientId}",
            notification.TestName, notification.Value, notification.PatientId);

        // Notify all providers watching this patient
        await _hubContext.Clients.Group($"Patient_{notification.PatientId}")
            .SendAsync("CriticalResult", notification);
        
        // Also notify all providers (critical results are important)
        await _hubContext.Clients.Group("Providers")
            .SendAsync("CriticalResult", notification);
        
        // Play alert sound on client
        await _hubContext.Clients.Group($"Patient_{notification.PatientId}")
            .SendAsync("PlayAlert", new { Type = "critical", Repeat = 3 });
    }

    /// <summary>
    /// Notify providers about an emergency assessment (red flags detected)
    /// </summary>
    public async Task NotifyEmergencyAssessmentAsync(EmergencyAssessmentNotification notification)
    {
        _logger.LogCritical(
            "EMERGENCY ASSESSMENT: {PatientName} - {ChiefComplaint}, Reason: {EmergencyReason}",
            notification.PatientName, notification.ChiefComplaint, notification.EmergencyReason);

        // Notify emergency alerts group
        await _hubContext.Clients.Group("EmergencyAlerts")
            .SendAsync("EmergencyAssessment", notification);
        
        // Notify all providers
        await _hubContext.Clients.Group("Providers")
            .SendAsync("EmergencyAssessment", notification);
        
        // Play emergency alert
        await _hubContext.Clients.Group("Providers")
            .SendAsync("PlayAlert", new { Type = "emergency", Repeat = 5 });
    }

    /// <summary>
    /// Notify about order status changes
    /// </summary>
    public async Task NotifyOrderStatusChangeAsync(OrderStatusNotification notification)
    {
        _logger.LogInformation(
            "Order status change: {OrderType} {OrderId} -> {NewStatus}",
            notification.OrderType, notification.OrderId, notification.NewStatus);

        await _hubContext.Clients.Group($"Patient_{notification.PatientId}")
            .SendAsync("OrderStatusChange", notification);
    }

    /// <summary>
    /// Notify about new assessment in queue
    /// </summary>
    public async Task NotifyNewAssessmentAsync(NewAssessmentNotification notification)
    {
        _logger.LogInformation(
            "New assessment: {AssessmentId} for Patient {PatientId} - {ChiefComplaint}",
            notification.AssessmentId, notification.PatientId, notification.ChiefComplaint);

        await _hubContext.Clients.Group("Providers")
            .SendAsync("NewAssessment", notification);
        
        // If has red flags, send urgent notification
        if (notification.HasRedFlags)
        {
            await _hubContext.Clients.Group("Providers")
                .SendAsync("PlayAlert", new { Type = "urgent", Repeat = 2 });
        }
    }

    /// <summary>
    /// Notify about red flag detection during assessment
    /// </summary>
    public async Task NotifyRedFlagDetectedAsync(RedFlagNotification notification)
    {
        _logger.LogWarning(
            "Red flag detected: {Category} for Assessment {AssessmentId}",
            notification.Category, notification.AssessmentId);

        await _hubContext.Clients.Group($"Patient_{notification.PatientId}")
            .SendAsync("RedFlagDetected", notification);
        
        await _hubContext.Clients.Group("Providers")
            .SendAsync("RedFlagDetected", notification);
    }
}

#region Notification Models

public record CriticalResultNotification(
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
    Guid OrderId,
    string OrderNumber,
    string OrderType, // Lab, Imaging, Medication, Referral
    Guid PatientId,
    string PatientName,
    string OldStatus,
    string NewStatus,
    DateTime ChangedAt);

public record NewAssessmentNotification(
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
    Guid AssessmentId,
    Guid PatientId,
    string PatientName,
    string Category,
    string MatchedKeyword,
    string Severity,
    string ClinicalReason,
    DateTime DetectedAt);

#endregion
