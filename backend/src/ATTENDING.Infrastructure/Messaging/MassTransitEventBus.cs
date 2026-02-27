using MassTransit;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Events;

namespace ATTENDING.Infrastructure.Messaging;

/// <summary>
/// IEventBus implementation backed by MassTransit.
///
/// Active when EventBus:Transport is "AzureServiceBus" or "InMemory" in configuration.
/// In multi-pod deployments, MassTransit routes domain events through Azure Service Bus
/// so all pods receive every event — unlike InProcessEventBus which only delivers to the
/// pod that raised the event.
///
/// Message flow:
///   Application code → MassTransitEventBus.PublishAsync
///     → IPublishEndpoint.Publish (MassTransit)
///       → Azure Service Bus topic / in-memory exchange
///         → DomainEventConsumer{T} on every subscribed pod
///           → IDomainEventDispatcher (MediatR)
///             → INotificationHandler{T} (existing SignalR handlers — unchanged)
///
/// No changes are needed to any existing handler. The entire delivery
/// path changes only at the IEventBus registration point.
/// </summary>
public sealed class MassTransitEventBus : IEventBus
{
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<MassTransitEventBus> _logger;

    public MassTransitEventBus(IPublishEndpoint publishEndpoint, ILogger<MassTransitEventBus> logger)
    {
        _publishEndpoint = publishEndpoint;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default)
        where TEvent : DomainEvent
    {
        _logger.LogDebug(
            "Publishing domain event {EventType} ({EventId}) via MassTransit",
            domainEvent.EventType, domainEvent.Id);

        // Wrap in the envelope so MassTransit can route to the typed consumer
        await _publishEndpoint.Publish(
            new DomainEventEnvelope<TEvent>(domainEvent),
            cancellationToken);
    }

    /// <inheritdoc/>
    public async Task PublishBatchAsync(
        IEnumerable<DomainEvent> domainEvents,
        CancellationToken cancellationToken = default)
    {
        var events = domainEvents.ToList();

        if (events.Count == 0)
            return;

        _logger.LogDebug(
            "Publishing batch of {Count} domain event(s) via MassTransit",
            events.Count);

        // Publish each event individually; MassTransit handles ordering within
        // a single topic/partition. For strict ordering guarantees, use a FIFO
        // Azure Service Bus topic (configure in EventBus:FifoOrdering = true).
        foreach (var domainEvent in events)
        {
            // Use reflection to invoke the generic overload with the concrete type
            await (Task)GetType()
                .GetMethod(nameof(PublishAsync))!
                .MakeGenericMethod(domainEvent.GetType())
                .Invoke(this, new object[] { domainEvent, cancellationToken })!;
        }
    }
}
