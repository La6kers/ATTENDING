using ATTENDING.Domain.Events;

namespace ATTENDING.Application.Interfaces;

/// <summary>
/// Abstraction for publishing domain events to a message transport.
///
/// Current transport: in-process via MediatR (InProcessEventBus).
/// Future transport:  MassTransit + Azure Service Bus (MassTransitEventBus).
///
/// Switching transports requires only a new implementation and a DI
/// registration change — all publishers and handlers stay the same.
///
/// Usage (from a command handler or application service):
///
///   await _eventBus.PublishAsync(new CriticalLabResultDomainEvent(...), ct);
///
/// Compare with IDomainEventDispatcher, which is used internally by
/// AttendingDbContext to dispatch events collected on aggregate roots
/// after SaveChangesAsync. IEventBus is for cases where you need to
/// raise an event imperatively outside the aggregate root pattern.
/// </summary>
public interface IEventBus
{
    /// <summary>
    /// Publish a single domain event.
    /// </summary>
    Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default)
        where TEvent : DomainEvent;

    /// <summary>
    /// Publish a batch of domain events in order.
    /// Equivalent to calling PublishAsync for each event individually.
    /// </summary>
    Task PublishBatchAsync(IEnumerable<DomainEvent> domainEvents, CancellationToken cancellationToken = default);
}
