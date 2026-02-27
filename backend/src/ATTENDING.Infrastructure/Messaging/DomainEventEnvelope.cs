using ATTENDING.Domain.Events;

namespace ATTENDING.Infrastructure.Messaging;

/// <summary>
/// Wraps a domain event for MassTransit transport.
///
/// MassTransit routes messages by their .NET type. Without an envelope,
/// publishing a DomainEvent subclass directly would require MassTransit to
/// know all concrete event types at configuration time. The envelope pattern
/// lets us publish any DomainEvent generically and route to a single
/// consumer type that re-dispatches through MediatR.
///
/// Topic name on Azure Service Bus: domain-events-{TEvent.Name} (MassTransit default)
/// </summary>
/// <param name="DomainEvent">The domain event payload.</param>
public sealed record DomainEventEnvelope<TEvent>(TEvent DomainEvent)
    where TEvent : DomainEvent;
