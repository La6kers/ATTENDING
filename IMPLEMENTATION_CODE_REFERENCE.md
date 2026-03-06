# Implementation Code Reference Guide

Quick lookup guide for the implemented enhancements with code snippets.

---

## Enhancement #1: Core Clinical Loop - API Endpoints

### 1. Patient Assessment Submission
**File:** `apps/patient-portal/pages/api/assessments/submit.ts`

**Endpoint:** `POST /api/assessments/submit`

**Request Body:**
```typescript
interface SubmitPayload {
  sessionId: string;
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
  chiefComplaint?: string;
  hpi?: HPIData;
  reviewOfSystems?: Record<string, string[]>;
  medications?: string[];
  allergies?: string[];
  medicalHistory?: string[];
  surgicalHistory?: string[];
  socialHistory?: Record<string, string>;
  familyHistory?: string[];
  redFlags?: string[];
  urgencyLevel?: string;
  urgencyScore?: number;
  conversationHistory?: Array<{ role: string; content: string; timestamp?: string }>;
}
```

**Response (201):**
```json
{
  "success": true,
  "assessmentId": "uuid-string",
  "queuePosition": 1,
  "estimatedReviewTime": "Immediate|30 minutes|2-4 hours",
  "urgentAlert": true,
  "message": "Your assessment has been submitted..."
}
```

**Key Code Path:**
```typescript
// 1. Try .NET backend first
const proxied = await proxyToBackend(req, res, '/api/v1/assessments/submit', {
  transformRequest: (body: SubmitPayload) => ({...})
});
if (proxied) return;

// 2. Fallback to Prisma
const assessment = await prisma.patientAssessment.create({
  data: {
    sessionId,
    chiefComplaint,
    hpiNarrative,
    symptoms,
    triageLevel, // EMERGENCY|URGENT|ROUTINE
    redFlagsDetected,
    completedAt: new Date(),
  },
});

// 3. Create emergency event if red flags
if (hasRedFlags) {
  await prisma.emergencyEvent.create({...});
}

// 4. Notify providers
await prisma.notification.createMany({
  data: activeProviders.map(p => ({
    userId: p.id,
    type: hasRedFlags ? 'URGENT_ASSESSMENT' : 'NEW_ASSESSMENT',
    priority: hasRedFlags ? 'URGENT' : 'NORMAL',
    actionUrl: `/previsit/${assessment.id}`,
  }))
});

// 5. Dispatch webhooks (fire-and-forget)
dispatchWebhooks('assessment.completed', webhookPayload, ...)
  .catch(err => console.error('[WEBHOOK] Error:', err));
```

---

### 2. Provider Assessment List
**File:** `apps/provider-portal/pages/api/assessments/index.ts`

**Endpoint:** `GET /api/assessments`

**Query Parameters:**
```
?status=COMPLETED          # Filter by status
?triageLevel=URGENT        # Filter by triage level
?unassigned=true           # Only unassigned assessments
?providerId=user-id        # Assessments assigned to provider
?page=1                    # Page number (1-indexed)
?pageSize=50               # Items per page (max 100)
```

**Response (200):**
```json
{
  "assessments": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "patientId": "uuid",
      "patientName": "John Doe",
      "patientMRN": "MRN123",
      "chiefComplaint": "Chest pain",
      "triageLevel": "URGENT",
      "redFlags": ["chest_pain", "dyspnea"],
      "status": "COMPLETED",
      "assignedProviderId": null,
      "completedAt": "2026-03-06T10:30:00Z",
      "createdAt": "2026-03-06T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 50,
  "hasMore": true
}
```

**Key Code Path:**
```typescript
// Build filter
const where: Record<string, unknown> = {};
if (status) where.status = status.toUpperCase();
if (triageLevel) where.triageLevel = triageLevel.toUpperCase();
if (unassigned === 'true') {
  where.assignedProviderId = null;
  where.status = where.status || 'COMPLETED';
}

// Pagination
const skip = (page - 1) * pageSize;

// Query with patient and provider context
const assessments = await prisma.patientAssessment.findMany({
  where,
  include: {
    patient: { select: { firstName, lastName, mrn, dateOfBirth, gender } },
    assignedProvider: { select: { id, name } }
  },
  orderBy: [{ completedAt: 'desc' }],
  skip,
  take: pageSize
});
```

---

### 3. Provider Assessment Detail
**File:** `apps/provider-portal/pages/api/assessments/[id].ts`

**Endpoint:** `GET /api/assessments/[id]`

**Response (200):**
```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "status": "COMPLETED",
  "phase": "COMPLETE",
  
  "patient": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "mrn": "MRN123",
    "dateOfBirth": "1985-03-15",
    "age": 40,
    "gender": "M",
    "phone": "555-1234",
    "email": "john@example.com"
  },
  
  "chiefComplaint": "Chest pain",
  "hpiNarrative": "Acute onset substernal chest pain...",
  "symptoms": ["chest_pain", "dyspnea", "diaphoresis"],
  "triageLevel": "URGENT",
  "redFlags": ["chest_pain", "dyspnea"],
  
  "patientRecord": {
    "allergies": [
      { "id": "uuid", "allergen": "Penicillin", "reaction": "Rash", "severity": "moderate" }
    ],
    "medications": [
      { "id": "uuid", "name": "Atorvastatin", "dose": "20mg", "frequency": "daily", "status": "active" }
    ],
    "recentVitals": {
      "heartRate": 105,
      "bloodPressureSystolic": 145,
      "bloodPressureDiastolic": 92,
      "temperature": 98.6,
      "oxygenSaturation": 96,
      "recordedAt": "2026-03-06T09:45:00Z"
    }
  },
  
  "emergencyEvents": [
    {
      "id": "uuid",
      "eventType": "RED_FLAG",
      "severity": "HIGH",
      "description": "Detected 2 red flags",
      "createdAt": "2026-03-06T10:00:00Z",
      "acknowledgedAt": null,
      "resolvedAt": null
    }
  ],
  
  "assignedProvider": {
    "id": "uuid",
    "name": "Dr. Smith",
    "specialty": "Cardiology"
  },
  
  "completedAt": "2026-03-06T10:30:00Z",
  "createdAt": "2026-03-06T10:00:00Z"
}
```

**PATCH - Update Assessment**
**Endpoint:** `PATCH /api/assessments/[id]`

**Request Body:**
```json
{
  "status": "REVIEWED",
  "assignedProviderId": "provider-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "assessment": {
    "id": "uuid",
    "status": "REVIEWED",
    "assignedProvider": {
      "id": "provider-uuid",
      "name": "Dr. Smith"
    },
    "updatedAt": "2026-03-06T11:00:00Z"
  }
}
```

**Status Transitions (Valid):**
```
CREATED     → IN_PROGRESS
IN_PROGRESS → COMPLETED
COMPLETED   → REVIEWED
REVIEWED    → (terminal state - no transitions allowed)
```

**Key Code Path:**
```typescript
// Validate transition
const currentStatus = existing.status as AssessmentStatus;
const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
if (!allowed.includes(normalized as AssessmentStatus)) {
  return res.status(409).json({
    error: `Cannot transition from '${currentStatus}' to '${normalized}'.`
  });
}

// Update with provider verification
if (assignedProviderId) {
  const provider = await prisma.user.findUnique({ where: { id: assignedProviderId } });
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
}

// Audit log changes
await prisma.auditLog.create({
  data: {
    action: 'ASSESSMENT_UPDATED',
    entityType: 'PatientAssessment',
    entityId: id,
    changes: JSON.stringify({ before, after: updateData }),
    success: true
  }
});
```

---

### 4. Lab Order Creation
**File:** `apps/provider-portal/pages/api/lab-orders/index.ts`

**Endpoint:** `POST /api/lab-orders`

**Request Body:**
```json
{
  "encounterId": "uuid",
  "patientId": "uuid",
  "testCode": "CBC",
  "testName": "Complete Blood Count",
  "priority": "ROUTINE|STAT|ASAP",
  "clinicalIndication": "Evaluate for infection",
  "notes": "Fasting preferred"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "encounterId": "uuid",
  "patientId": "uuid",
  "testCode": "CBC",
  "testName": "Complete Blood Count",
  "status": "PENDING",
  "orderingProviderId": "provider-uuid",
  "orderNumber": "LAB-2026-0315-001",
  "message": "Lab order created successfully",
  "correlationId": "correlation-uuid"
}
```

**GET - List Lab Orders**
**Endpoint:** `GET /api/lab-orders`

**Query Parameters:**
```
?patientId=uuid          # Filter by patient
?encounterId=uuid        # Filter by encounter
?status=PENDING|RESULTED # Filter by status
?page=1                  # Pagination
?pageSize=50
```

**Response (200):**
```json
{
  "labOrders": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "testCode": "CBC",
      "testName": "Complete Blood Count",
      "status": "PENDING",
      "orderNumber": "LAB-2026-0315-001",
      "createdAt": "2026-03-06T10:30:00Z",
      "resultedAt": null
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 50,
  "hasMore": false
}
```

---

## Enhancement #6: Event Bus Configuration

### Configuration in appsettings.json

**Development (InProcess):**
```json
{
  "EventBus": {
    "Transport": "InProcess"
  }
}
```

**Testing (InMemory):**
```json
{
  "EventBus": {
    "Transport": "InMemory"
  }
}
```

**Production (AzureServiceBus):**
```json
{
  "EventBus": {
    "Transport": "AzureServiceBus",
    "ConnectionString": "Endpoint=sb://attending.servicebus.windows.net/;..."
  }
}
```

OR with Managed Identity:
```json
{
  "EventBus": {
    "Transport": "AzureServiceBus",
    "FullyQualifiedNamespace": "attending.servicebus.windows.net"
  }
}
```

### Dependency Injection Registration

**File:** `backend/src/ATTENDING.Infrastructure/DependencyInjection.cs`

```csharp
// In AddInfrastructure method:
services.AddEventBus(configuration);

// Result:
// - InProcess: No MassTransit, uses existing InProcessEventBus
// - InMemory: MassTransit with in-memory transport
// - AzureServiceBus: MassTransit with Azure Service Bus
```

### Publishing Domain Events

**From Application Code:**
```csharp
public class CreateAssessmentCommandHandler : IRequestHandler<CreateAssessmentCommand>
{
    private readonly IEventBus _eventBus;
    
    public async Task Handle(CreateAssessmentCommand request, CancellationToken ct)
    {
        // Create assessment...
        var assessment = new Assessment(...);
        
        // Publish domain events
        assessment.AddDomainEvent(new AssessmentCompletedEvent(
            assessmentId: assessment.Id,
            patientId: assessment.PatientId,
            triageLevel: assessment.TriageLevel
        ));
        
        // Events are published by UnitOfWork.SaveChangesAsync()
    }
}
```

### Consuming Domain Events

**Handler (MediatR INotificationHandler):**
```csharp
public class AssessmentCompletedNotificationHandler 
    : INotificationHandler<AssessmentCompletedEvent>
{
    private readonly IHubContext<NotificationHub> _hub;
    private readonly ILogger<AssessmentCompletedNotificationHandler> _logger;
    
    public async Task Handle(AssessmentCompletedEvent @event, CancellationToken ct)
    {
        _logger.LogInformation("Assessment {AssessmentId} completed", @event.AssessmentId);
        
        // Send SignalR notification
        await _hub.Clients
            .Group($"provider-{@event.PatientId}")
            .SendAsync("AssessmentCompleted", new {
                assessmentId = @event.AssessmentId,
                triageLevel = @event.TriageLevel
            }, ct);
    }
}
```

**This handler works identically with all transport modes (InProcess, InMemory, AzureServiceBus)**

### Event Types Published

**File:** `backend/src/ATTENDING.Infrastructure/Messaging/EventBusExtensions.cs` - lines 18-27

```csharp
private static readonly Type[] DomainEventTypes =
{
    typeof(EmergencyProtocolTriggeredEvent),
    typeof(RedFlagDetectedEvent),
    typeof(LabOrderResultedEvent),
    typeof(DrugInteractionDetectedEvent),
    typeof(AssessmentCompletedEvent),
};
```

---

## Enhancement #8: Distributed Lock Health Check

### Health Check File

**File:** `backend/src/ATTENDING.Infrastructure/Services/DistributedLockHealthCheck.cs`

```csharp
public class DistributedLockHealthCheck : IHealthCheck
{
    private readonly IDistributedLockService _lockService;
    private const string TestLockKey = "health-check-lock";
    private const int LockTimeoutSeconds = 5;
    
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var distributedLock = await _lockService.AcquireAsync(
                lockName: TestLockKey,
                expiry: TimeSpan.FromSeconds(LockTimeoutSeconds),
                retryCount: 0,
                cancellationToken: cancellationToken);
            
            if (distributedLock.IsAcquired)
            {
                return HealthCheckResult.Healthy(
                    "Distributed lock service is operational");
            }
            
            return HealthCheckResult.Healthy(
                "Distributed lock service is operational (held by another instance)");
        }
        catch (OperationCanceledException)
        {
            return HealthCheckResult.Degraded(
                "Distributed lock service is slow or unresponsive");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy(
                "Distributed lock service is not operational", ex);
        }
    }
}
```

### Health Check Registration

**File:** `backend/src/ATTENDING.Infrastructure/DependencyInjection.cs`

```csharp
public static IServiceCollection AddInfrastructureHealthChecks(
    this IServiceCollection services,
    IConfiguration configuration)
{
    var healthChecks = services.AddHealthChecks()
        .AddDbContextCheck<AttendingDbContext>("database")
        .AddSqlServer(...)
        .AddRedis(...)
        .AddCheck<DistributedLockHealthCheck>(
            "distributed-lock",
            tags: new[] { "distributed", "lock", "scheduler" });
    
    return services;
}
```

### Health Check Endpoint

**HTTP Endpoint:** `GET /health`

**Response (Healthy):**
```json
{
  "status": "Healthy",
  "checks": {
    "database": { "status": "Healthy", "description": "... healthy ..." },
    "redis": { "status": "Healthy", "description": "... healthy ..." },
    "distributed-lock": { "status": "Healthy", "description": "... operational ..." }
  },
  "totalDuration": "00:00:00.1234567"
}
```

**Response (Unhealthy):**
```json
{
  "status": "Unhealthy",
  "checks": {
    "distributed-lock": {
      "status": "Unhealthy",
      "description": "Distributed lock service is not operational",
      "exception": "StackExchange.Redis.RedisConnectionException: ..."
    }
  }
}
```

### Scheduler Lock Usage

**File:** `backend/src/ATTENDING.Infrastructure/Services/ClinicalSchedulerService.cs`

```csharp
private async Task RunJobLoopAsync(
    string jobName,
    string lockKey,
    TimeSpan lockTtl,
    TimeSpan interval,
    Func<IServiceScope, CancellationToken, Task> jobAction,
    CancellationToken stoppingToken)
{
    while (!stoppingToken.IsCancellationRequested)
    {
        try
        {
            // Try to acquire distributed lock
            await using var distributedLock = await _lockService.AcquireAsync(
                lockName: lockKey,
                expiry: lockTtl,
                retryCount: 0,  // no retry - skip if held by another node
                cancellationToken: stoppingToken);
            
            if (!distributedLock.IsAcquired)
            {
                _logger.LogDebug(
                    "Scheduler job {JobName} skipped — lock held by another node",
                    jobName);
            }
            else
            {
                // Lock acquired - run job
                using var scope = _services.CreateScope();
                await jobAction(scope, stoppingToken);
                
                _logger.LogInformation(
                    "Scheduler job {JobName} completed",
                    jobName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Scheduler job {JobName} failed", jobName);
        }
        
        // Wait for next cycle
        await Task.Delay(interval, stoppingToken);
    }
}
```

### Lock Key Namespace

```
scheduler:critical-lab-sweep              # 2 min interval, 4 min TTL
scheduler:stale-encounter-sweep           # 10 min interval, 15 min TTL
scheduler:diagnostic-learning-processing  # 24 hr interval, 2 hr TTL
scheduler:accuracy-snapshot-refresh       # 7 day interval, 4 hr TTL
```

---

## Quick Debugging Guide

### Verify Core Clinical Loop

**Check Assessment Submission:**
```bash
curl -X POST http://localhost:3000/api/assessments/submit \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "chiefComplaint": "Chest pain",
    "patientName": "John Doe"
  }'
```

**Check Provider Queue:**
```bash
curl http://localhost:3000/api/assessments?unassigned=true
```

### Verify Event Bus

**Check Event Bus Transport (in logs):**
```
EventBusExtensions: Starting event bus with transport: InProcess|InMemory|AzureServiceBus
```

**Check Consumer Registration (in logs):**
```
MassTransit: Configuring consumers for transport...
```

### Verify Distributed Lock

**Health Check Status:**
```bash
curl http://localhost:5000/health
# Look for: "distributed-lock": { "status": "Healthy" }
```

**Lock Acquisition Logs:**
```
Distributed lock acquired: scheduler:critical-lab-sweep by node-1:12345:abc...
Scheduler job CriticalLabResultSweep starting (lockId: node-1:12345:abc...)
Scheduler job CriticalLabResultSweep completed in 234.5ms
```

---

## Performance Tuning

### Assessment Submission
- Default timeout: 5 seconds (configurable)
- Fallback to Prisma on backend timeout
- Webhook fire-and-forget (async, never blocks)

### Event Bus Performance
- InProcess: ~microseconds per event
- InMemory: ~1-5ms per event (MassTransit pipeline)
- AzureServiceBus: ~10-50ms per event (network latency)

### Distributed Lock Performance
- Redis: ~1-2ms lock acquisition
- In-memory: ~microseconds lock acquisition
- Health check timeout: 5 seconds (returns Degraded if slow)

---

## Troubleshooting

### Assessment Not Appearing in Provider Queue
1. Check assessment status = 'COMPLETED'
2. Verify patient exists in database
3. Check provider notifications table
4. Review audit logs for errors

### Event Bus Not Delivering Events
1. Verify transport mode in appsettings
2. Check MassTransit consumer registration logs
3. Look for dead-letter messages in AzureServiceBus
4. Verify IDistributedLockService is injectable

### Scheduler Jobs Running on Multiple Nodes
1. Verify Redis connection string is configured
2. Check lock acquisition logs
3. Verify distributed-lock health check returns Healthy
4. Review job execution timing (should be sequential, not parallel)

---

This reference guide provides quick lookup for all implemented code with production-ready examples.
