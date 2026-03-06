# ADR-0004: Event-Driven Architecture with MassTransit

**Status:** Accepted  
**Date:** 2026-02-24  
**Decision Makers:** Engineering Team

## Context

ATTENDING AI orchestrates real-world clinical workflows that require:

1. **Real-Time Notifications**: When a provider schedules an appointment, patients receive SMS/email immediately
2. **Async Operations**: Creating an order may trigger:
   - Sending referral requests to external EHRs (Epic, Cerner)
   - Updating insurance eligibility in third-party systems
   - Generating clinical documentation
   - Notifying multiple stakeholders (patient, provider, care coordinator)
3. **Decoupling**: Orders shouldn't know about notifications; notifications shouldn't know about orders
4. **Resilience**: If email service is temporarily down, orders should still be created (async retry)
5. **Audit Trail**: All domain events are logged for HIPAA compliance

Tightly-coupling domain logic to service integrations (calling `_emailService.SendAsync()` directly in handlers) would violate clean architecture and create tight coupling.

## Decision

Implement **event-driven architecture** using **domain events** and **MassTransit** message bus:

### Domain Events (Immutable, In-Process)

```csharp
namespace ATTENDING.Orders.Domain.Events;

public abstract record DomainEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    public Guid TenantId { get; init; }
}

public record OrderCreatedEvent(
    Guid OrderId,
    Guid PatientId,
    Guid ProviderId,
    string OrderReason,
    Guid TenantId
) : DomainEvent;

public record AppointmentScheduledEvent(
    Guid AppointmentId,
    Guid OrderId,
    DateTime ScheduledFor,
    Guid PatientId,
    Guid TenantId
) : DomainEvent;

public record PatientNotificationRequiredEvent(
    Guid PatientId,
    string Message,
    NotificationType Type, // Email, SMS, InApp
    Guid TenantId
) : DomainEvent;
```

### Aggregate Publishing Events

```csharp
public class Order : AggregateRoot
{
    private List<DomainEvent> _domainEvents = new();

    public static Order Create(Guid patientId, string orderReason, Guid providerId)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            OrderReason = orderReason,
            ProviderId = providerId,
            Status = OrderStatus.Pending
        };

        // Publish domain event
        order._domainEvents.Add(new OrderCreatedEvent(
            OrderId: order.Id,
            PatientId: patientId,
            ProviderId: providerId,
            OrderReason: orderReason,
            TenantId: order.TenantId
        ));

        return order;
    }

    public IReadOnlyList<DomainEvent> GetDomainEvents() => _domainEvents.AsReadOnly();
    public void ClearDomainEvents() => _domainEvents.Clear();
}
```

### Publishing Events in SaveChangesAsync

```csharp
public class AttendingDbContext : DbContext
{
    private readonly IPublishEndpoint _publishEndpoint;

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // 1. Save changes to database in transaction
        var result = await base.SaveChangesAsync(ct);

        // 2. Get all aggregates with domain events
        var aggregates = ChangeTracker
            .Entries<AggregateRoot>()
            .Where(e => e.Entity.GetDomainEvents().Any())
            .Select(e => e.Entity)
            .ToList();

        // 3. Publish events to message bus (within same transaction scope)
        var events = aggregates.SelectMany(a => a.GetDomainEvents()).ToList();
        foreach (var @event in events)
        {
            await _publishEndpoint.Publish(@event, ct);
        }

        // 4. Clear events after publishing
        aggregates.ForEach(a => a.ClearDomainEvents());

        return result;
    }
}
```

### Event Consumers (MassTransit Handlers)

```csharp
public class SendAppointmentConfirmationConsumer : IConsumer<AppointmentScheduledEvent>
{
    private readonly IEmailService _emailService;
    private readonly IPatientRepository _patientRepository;

    public async Task Consume(ConsumeContext<AppointmentScheduledEvent> context)
    {
        var @event = context.Message;
        var patient = await _patientRepository.GetByIdAsync(@event.PatientId);

        // Send email to patient
        await _emailService.SendAppointmentConfirmationAsync(
            patient.Email,
            @event.ScheduledFor,
            context.CancellationToken
        );

        // Log event consumed (for HIPAA audit)
        _logger.LogInformation(
            "Sent appointment confirmation for {AppointmentId} to {PatientEmail}",
            @event.AppointmentId,
            patient.Email
        );
    }
}
```

### MassTransit Configuration

```csharp
services.AddMassTransit(x =>
{
    // Register all consumers in assembly
    x.AddConsumers(typeof(SendAppointmentConfirmationConsumer).Assembly);

    // Configure transport: InProcess → InMemory → Azure Service Bus (configurable)
    if (environment.IsProduction())
    {
        x.UsingAzureServiceBus((context, cfg) =>
        {
            cfg.Host(configuration["AzureServiceBus:ConnectionString"]);
            cfg.ConfigureEndpoints(context);
        });
    }
    else if (environment.IsTesting())
    {
        x.UsingInMemory((context, cfg) =>
        {
            cfg.ConfigureEndpoints(context);
        });
    }
    else
    {
        x.UsingInProcess();
    }
});
```

### Transport Strategy

| Environment | Transport | Use Case |
|---|---|---|
| **Development** | InProcess | Fast feedback; synchronous event handling |
| **Integration Tests** | InMemory | Isolated; no external dependencies |
| **Staging** | Azure Service Bus | Production-like; message durability |
| **Production** | Azure Service Bus | Reliable delivery; dead-letter handling |

## Consequences

### Positive
- **Decoupling**: Order domain knows nothing about notifications, emails, or EHR integrations
- **Scalability**: Consumers can run in separate process/container; scale independently
- **Resilience**: If consumer fails, message is retried (configurable backoff: 3s, 10s, 1min, 5min...)
- **Audit Trail**: Every domain event is captured and logged (HIPAA requirement)
- **Real-Time Notifications**: Async consumers send notifications immediately without blocking domain logic
- **Transport Agnostic**: Swap InMemory → Azure Service Bus without changing domain code
- **HIPAA Compliance**: Event sourcing provides immutable record of all state changes

### Negative
- **Debugging Complexity**: Async message flow is harder to trace than synchronous calls
- **Eventual Consistency**: Consumers may run after initial transaction completes; temporary inconsistency
- **Message Ordering**: Some events may process out-of-order (mitigated by MassTransit ordering)
- **Operational Overhead**: Message broker (Service Bus) adds infrastructure to manage

### Risks
- **Orphaned Events**: If consumer code has bugs, events pile up in dead-letter queue
- **Duplicate Events**: Network failures may cause same event to be published twice; consumers must be idempotent
- **Slow Consumers**: Backing up messages slows query responsiveness; requires monitoring

## Alternatives Considered

1. **Direct Service Calls** (Synchronous)
   ```csharp
   var order = Order.Create(...);
   await _emailService.SendOrderConfirmationAsync(order);
   await _ehrClient.SendReferralAsync(order);
   ```
   - Simple to understand initially
   - Tight coupling; hard to test
   - If email service is down, order creation fails (bad UX)
   - No resilience or retries

2. **Webhook-Only Pattern**
   - External webhooks trigger consumer actions
   - Requires external infrastructure for every action
   - Not suitable for internal orchestration

3. **Outbox Pattern** (Event Sourcing)
   - All events stored in `EventStore` table first
   - Separate job reads outbox, publishes to message bus
   - Better reliability at cost of complexity
   - Can add later if event replay becomes critical

## Implementation Notes

- Domain events are **immutable records** with `init` properties only
- Events include `TenantId` for scoped processing in multi-tenant scenarios
- Consumers should be **idempotent**: processing same event twice = same outcome
- Use correlation IDs to track event chain across systems (order → appointment → notification)
- Implement Saga pattern for long-running workflows: `OrderReferralSaga` with multiple state transitions
- Log event publish/consume for HIPAA audit trail
