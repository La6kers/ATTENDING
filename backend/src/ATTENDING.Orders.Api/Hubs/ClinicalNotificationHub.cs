using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Orders.Api.Hubs;

/// <summary>
/// SignalR hub for real-time clinical notifications
/// </summary>
[Authorize]
public class ClinicalNotificationHub : Hub
{
    private readonly ILogger<ClinicalNotificationHub> _logger;
    private readonly IPatientRepository _patientRepository;
    private readonly ICurrentUserService _currentUser;

    // Track connected providers by their user ID
    private static readonly ConcurrentDictionary<string, HashSet<string>> _providerConnections = new();
    private static readonly object _providerConnectionsLock = new();

    // Track which providers are watching which patients
    private static readonly ConcurrentDictionary<string, HashSet<string>> _patientWatchers = new();
    private static readonly object _patientWatchersLock = new();

    public ClinicalNotificationHub(
        ILogger<ClinicalNotificationHub> logger,
        IPatientRepository patientRepository,
        ICurrentUserService currentUser)
    {
        _logger = logger;
        _patientRepository = patientRepository;
        _currentUser = currentUser;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier
            ?? throw new HubException("User identity is required for clinical notifications.");
        var connectionId = Context.ConnectionId;

        _providerConnections.AddOrUpdate(
            userId,
            _ => new HashSet<string> { connectionId },
            (_, connections) => { lock (_providerConnectionsLock) { connections.Add(connectionId); } return connections; });

        await Groups.AddToGroupAsync(connectionId, "Providers");

        _logger.LogInformation("Provider {UserId} connected with connection {ConnectionId}", userId, connectionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier
            ?? throw new HubException("User identity is required for clinical notifications.");
        var connectionId = Context.ConnectionId;

        if (_providerConnections.TryGetValue(userId, out var connections))
        {
            lock (_providerConnectionsLock)
            {
                connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    _providerConnections.TryRemove(userId, out _);
                }
            }
        }

        foreach (var kvp in _patientWatchers)
        {
            lock (_patientWatchersLock)
            {
                kvp.Value.Remove(connectionId);
            }
        }
        
        await Groups.RemoveFromGroupAsync(connectionId, "Providers");
        
        _logger.LogInformation("Provider {UserId} disconnected", userId);
        
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Subscribe to notifications for a specific patient.
    /// Tenant-scoped: group name includes tenant ID to prevent cross-tenant data leakage.
    /// </summary>
    public async Task WatchPatient(string patientId)
    {
        if (!Guid.TryParse(patientId, out var patientGuid))
            throw new HubException("Patient not found");

        var patient = await _patientRepository.GetByIdAsync(patientGuid);
        if (patient is null)
            throw new HubException("Patient not found");

        if (patient.OrganizationId != _currentUser.TenantId)
        {
            await Clients.Caller.SendAsync("Error", "Access denied.");
            return;
        }

        var connectionId = Context.ConnectionId;
        var tenantId = Context.User?.FindFirst("oid")?.Value
                    ?? Context.User?.FindFirst("sub")?.Value
                    ?? "unknown";

        var groupName = $"Patient_{tenantId}|{patientId}";

        _patientWatchers.AddOrUpdate(
            groupName,
            _ => new HashSet<string> { connectionId },
            (_, watchers) => { lock (_patientWatchersLock) { watchers.Add(connectionId); } return watchers; });

        await Groups.AddToGroupAsync(connectionId, groupName);

        _logger.LogDebug("Connection {ConnectionId} (Tenant {TenantId}) now watching Patient {PatientId}",
            connectionId, tenantId, patientId);
    }

    /// <summary>
    /// Unsubscribe from patient notifications.
    /// </summary>
    public async Task UnwatchPatient(string patientId)
    {
        var connectionId = Context.ConnectionId;
        var tenantId = Context.User?.FindFirst("oid")?.Value
                    ?? Context.User?.FindFirst("sub")?.Value
                    ?? "unknown";

        var groupName = $"Patient_{tenantId}|{patientId}";

        if (_patientWatchers.TryGetValue(groupName, out var watchers))
        {
            lock (_patientWatchersLock)
            {
                watchers.Remove(connectionId);
            }
        }

        await Groups.RemoveFromGroupAsync(connectionId, groupName);

        _logger.LogDebug("Connection {ConnectionId} (Tenant {TenantId}) stopped watching Patient {PatientId}",
            connectionId, tenantId, patientId);
    }

    /// <summary>
    /// Join the emergency alerts group
    /// </summary>
    public async Task JoinEmergencyAlerts()
    {
        var tenantId = _currentUser.TenantId;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"EmergencyAlerts|{tenantId}");
    }

    /// <summary>
    /// Leave the emergency alerts group
    /// </summary>
    public async Task LeaveEmergencyAlerts()
    {
        var tenantId = _currentUser.TenantId;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"EmergencyAlerts|{tenantId}");
    }
}

/// <summary>
/// SignalR implementation of IClinicalNotificationService.
/// Pushes domain events as real-time notifications to connected providers.
/// </summary>
public class SignalRClinicalNotificationService : IClinicalNotificationService
{
    private readonly IHubContext<ClinicalNotificationHub> _hubContext;
    private readonly ILogger<SignalRClinicalNotificationService> _logger;

    public SignalRClinicalNotificationService(
        IHubContext<ClinicalNotificationHub> hubContext,
        ILogger<SignalRClinicalNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyCriticalResultAsync(CriticalResultNotification notification, CancellationToken cancellationToken)
    {
        // PHI-safe: log only IDs and test metadata — never PatientName, MRN, or result values
        _logger.LogWarning(
            "CRITICAL RESULT: {TestName} for Patient {PatientId} (order {LabOrderId})",
            notification.TestName, notification.PatientId, notification.LabOrderId);

        // Tenant-scoped patient group — matches ClinicalNotificationHub.WatchPatient grouping
        var patientGroup = $"Patient_{notification.TenantId}|{notification.PatientId}";

        // Notify all providers watching this patient
        await _hubContext.Clients.Group(patientGroup)
            .SendAsync("CriticalResult", notification, cancellationToken);

        // Also notify all providers (critical results are broadcast)
        await _hubContext.Clients.Group("Providers")
            .SendAsync("CriticalResult", notification, cancellationToken);

        // Play alert sound on client
        await _hubContext.Clients.Group(patientGroup)
            .SendAsync("PlayAlert", new { Type = "critical", Repeat = 3 }, cancellationToken);
    }

    public async Task NotifyEmergencyAssessmentAsync(EmergencyAssessmentNotification notification, CancellationToken cancellationToken)
    {
        // PHI-safe: log only IDs and emergency category — never PatientName, MRN, or chief complaint free text
        _logger.LogCritical(
            "EMERGENCY ASSESSMENT: Assessment {AssessmentId} for Patient {PatientId}, Reason: {EmergencyReason}",
            notification.AssessmentId, notification.PatientId, notification.EmergencyReason);

        await _hubContext.Clients.Group($"EmergencyAlerts|{notification.TenantId}")
            .SendAsync("EmergencyAssessment", notification, cancellationToken);
        
        await _hubContext.Clients.Group("Providers")
            .SendAsync("EmergencyAssessment", notification, cancellationToken);
        
        // Emergency alert with repeated audio
        await _hubContext.Clients.Group("Providers")
            .SendAsync("PlayAlert", new { Type = "emergency", Repeat = 5 }, cancellationToken);
    }

    public async Task NotifyOrderStatusChangeAsync(OrderStatusNotification notification, CancellationToken cancellationToken)
    {
        // PHI-safe: order metadata only — PatientName intentionally excluded
        _logger.LogInformation(
            "Order status change: {OrderType} {OrderId} for Patient {PatientId} -> {NewStatus}",
            notification.OrderType, notification.OrderId, notification.PatientId, notification.NewStatus);

        var patientGroup = $"Patient_{notification.TenantId}|{notification.PatientId}";
        await _hubContext.Clients.Group(patientGroup)
            .SendAsync("OrderStatusChange", notification, cancellationToken);
    }

    public async Task NotifyNewAssessmentAsync(NewAssessmentNotification notification, CancellationToken cancellationToken)
    {
        // PHI-safe: log only IDs and clinical risk flags — ChiefComplaint is free text and may contain PHI
        _logger.LogInformation(
            "New assessment: {AssessmentId} for Patient {PatientId}, HasRedFlags: {HasRedFlags}, Triage: {TriageLevel}",
            notification.AssessmentId, notification.PatientId, notification.HasRedFlags, notification.TriageLevel);

        await _hubContext.Clients.Group("Providers")
            .SendAsync("NewAssessment", notification, cancellationToken);
        
        if (notification.HasRedFlags)
        {
            await _hubContext.Clients.Group("Providers")
                .SendAsync("PlayAlert", new { Type = "urgent", Repeat = 2 }, cancellationToken);
        }
    }

    public async Task NotifyRedFlagDetectedAsync(RedFlagNotification notification, CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "Red flag detected: {Category} for Assessment {AssessmentId}",
            notification.Category, notification.AssessmentId);

        var patientGroup = $"Patient_{notification.TenantId}|{notification.PatientId}";
        await _hubContext.Clients.Group(patientGroup)
            .SendAsync("RedFlagDetected", notification, cancellationToken);

        await _hubContext.Clients.Group("Providers")
            .SendAsync("RedFlagDetected", notification, cancellationToken);
    }

    public async Task NotifyDrugInteractionAsync(DrugInteractionNotification notification, CancellationToken cancellationToken)
    {
        // PHI-safe: drug names and severity are clinical metadata, not patient PHI
        _logger.LogWarning(
            "Drug interaction: {Drug1} <-> {Drug2} ({Severity}) for Patient {PatientId} (order {MedicationOrderId})",
            notification.Drug1, notification.Drug2, notification.Severity, notification.PatientId, notification.MedicationOrderId);

        var patientGroup = $"Patient_{notification.TenantId}|{notification.PatientId}";
        await _hubContext.Clients.Group(patientGroup)
            .SendAsync("DrugInteraction", notification, cancellationToken);

        // Severe interactions broadcast to all providers
        if (notification.Severity.Equals("Severe", StringComparison.OrdinalIgnoreCase) ||
            notification.Severity.Equals("Critical", StringComparison.OrdinalIgnoreCase))
        {
            await _hubContext.Clients.Group("Providers")
                .SendAsync("DrugInteraction", notification, cancellationToken);

            await _hubContext.Clients.Group(patientGroup)
                .SendAsync("PlayAlert", new { Type = "warning", Repeat = 2 }, cancellationToken);
        }
    }

    public async Task NotifyAmbientNoteReadyAsync(
        Guid providerId,
        Guid encounterId,
        Guid noteId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Ambient note ready: Note {NoteId} for Encounter {EncounterId}",
            noteId, encounterId);

        // Push directly to the specific provider who owns this encounter
        await _hubContext.Clients.User(providerId.ToString())
            .SendAsync("AmbientNoteReady",
                new { EncounterId = encounterId, NoteId = noteId, ReadyAt = DateTime.UtcNow },
                cancellationToken);
    }
}
