using MassTransit;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.Messaging;

/// <summary>
/// Generic MassTransit consumer for domain events.
///
/// Receives a DomainEventEnvelope{TEvent} from the bus and re-dispatches
/// the inner domain event through IDomainEventDispatcher (MediatR).
/// This means all existing INotificationHandler implementations continue
/// to work unchanged — they receive the same MediatR notifications they
/// always have, just now delivered via the message bus instead of in-process.
///
/// One consumer type is registered per domain event type in EventBusExtensions.cs.
/// </summary>
public sealed class DomainEventConsumer<TEvent> : IConsumer<DomainEventEnvelope<TEvent>>
    where TEvent : DomainEvent
{
    private readonly IDomainEventDispatcher _dispatcher;
    private readonly ILogger<DomainEventConsumer<TEvent>> _logger;

    public DomainEventConsumer(
        IDomainEventDispatcher dispatcher,
        ILogger<DomainEventConsumer<TEvent>> logger)
    {
        _dispatcher = dispatcher;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<DomainEventEnvelope<TEvent>> context)
    {
        var domainEvent = context.Message.DomainEvent;

        _logger.LogDebug(
            "Consuming domain event {EventType} ({EventId}) from MassTransit",
            domainEvent.EventType, domainEvent.Id);

        await _dispatcher.DispatchEventsAsync(
            new[] { (DomainEvent)domainEvent },
            context.CancellationToken);
    }
}
