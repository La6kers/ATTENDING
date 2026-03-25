# ATTENDING AI — Domain Event Dispatch Architecture

**Last Updated:** March 5, 2026

---

## Current Implementation: In-Process Dispatch

Domain events in ATTENDING AI are dispatched **in-process** via `IDomainEventDispatcher`, invoked during `SaveChangesAsync()` in `AttendingDbContext`. When an entity raises a domain event (via `IHasDomainEvents`), the DbContext collects all pending events from tracked entities, clears them from the entities, and dispatches them through the registered handlers **within the same process and transaction boundary**.

### How It Works

```
Entity raises event → SaveChangesAsync() collects events → IDomainEventDispatcher dispatches → Handlers execute in-process
```

Handlers are registered in the Application layer (`DomainEventHandlers.cs`) and include:
- `EmergencyEventHandler` — triggers emergency protocols for critical symptoms
- `RedFlagEventHandler` — flags high-risk clinical findings
- `CriticalLabResultHandler` — sends SignalR notifications for critical lab values
- `DrugInteractionDetectedHandler` — alerts providers to drug interactions
- `AssessmentCompletedHandler` — notifies providers when COMPASS assessments complete

### Advantages

- **Transactional consistency**: Events are dispatched within the same `SaveChangesAsync` call, so if persistence fails, no events fire.
- **Simplicity**: No external infrastructure (message broker) required for development or single-instance deployment.
- **Low latency**: Events are handled immediately without network hops.

---

## Known Limitation: Multi-Pod Deployment

**In a multi-pod Kubernetes deployment, in-process domain events are only visible to the pod that originated the database write.** This means:

1. **SignalR notifications** (e.g., critical lab alerts) will only reach clients connected to the originating pod's SignalR hub. Clients connected to other pods will not receive real-time notifications until they poll or reconnect.

2. **Event handlers** that trigger side effects (e.g., sending external notifications, updating caches) will only execute on one pod. If a handler fails, there is no retry mechanism across pods.

3. **Eventual consistency** between pods relies on clients polling the API or reconnecting to SignalR, not on event propagation.

### Impact Assessment

| Scenario | Impact | Severity |
|----------|--------|----------|
| Single pod (dev/staging) | No impact — all events are local | None |
| Multi-pod with sticky sessions | Minimal — most users stay on same pod | Low |
| Multi-pod without sticky sessions | SignalR notifications may be missed | Medium |
| Blue-green deployment (slot swap) | Events in-flight during swap may be lost | Low |

### Current Mitigations

- **Azure App Service sticky sessions** (ARR Affinity) are enabled by default, which routes a user's requests to the same instance for the session duration.
- **Provider portal polling**: The dashboard polls for updates on a configurable interval as a fallback to SignalR.
- **Database as source of truth**: All state changes persist to SQL Server regardless of event delivery. Missed notifications are recoverable via API queries.

---

## Future: Distributed Event Bus (MassTransit + RabbitMQ)

When scaling beyond 2-3 pods or when event delivery guarantees become critical for production clinical workflows, the architecture should migrate to a distributed event bus:

### Recommended Approach

1. **MassTransit** with **RabbitMQ** (or Azure Service Bus) as the transport.
2. Domain events are published to the bus after `SaveChangesAsync` succeeds.
3. All pods subscribe to the relevant event queues.
4. SignalR backplane (Redis) ensures notifications reach all connected clients regardless of pod affinity.

### Migration Path

The current `IDomainEventDispatcher` interface is already abstracted, so the migration requires:

1. Implement a `MassTransitDomainEventDispatcher` that publishes to the bus instead of dispatching in-process.
2. Register MassTransit consumers that mirror the existing handler logic.
3. Add a Redis backplane for SignalR (`Microsoft.AspNetCore.SignalR.StackExchangeRedis`).
4. Update `DependencyInjection.cs` to register the distributed dispatcher in production and keep the in-process dispatcher for development/testing.

### Prerequisites

- RabbitMQ instance (or Azure Service Bus namespace)
- Redis instance for SignalR backplane (already partially configured for distributed locking)
- Outbox pattern implementation to prevent event loss if the broker is temporarily unavailable

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12 | Use in-process dispatch | Single-pod deployment, no broker infrastructure needed |
| 2026-02 | Keep in-process for MVP | Sticky sessions + polling mitigate multi-pod risks |
| 2026-03 | Document limitation | Ensure team awareness before scaling beyond 2 pods |
