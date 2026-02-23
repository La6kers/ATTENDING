using MediatR;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Events;

/// <summary>
/// Wraps a domain event as a MediatR notification for dispatch through the pipeline.
/// This allows domain events raised by aggregates to be handled by MediatR notification handlers.
/// </summary>
public class DomainEventNotification<TDomainEvent> : INotification
    where TDomainEvent : DomainEvent
{
    public TDomainEvent DomainEvent { get; }

    public DomainEventNotification(TDomainEvent domainEvent)
    {
        DomainEvent = domainEvent;
    }
}

/// <summary>
/// MediatR-based domain event dispatcher.
/// Publishes each domain event as a DomainEventNotification&lt;T&gt; via IMediator.Publish.
/// </summary>
public class MediatRDomainEventDispatcher : IDomainEventDispatcher
{
    private readonly IMediator _mediator;

    public MediatRDomainEventDispatcher(IMediator mediator)
    {
        _mediator = mediator;
    }

    public async Task DispatchEventsAsync(IEnumerable<DomainEvent> domainEvents, CancellationToken cancellationToken = default)
    {
        foreach (var domainEvent in domainEvents)
        {
            // Create DomainEventNotification<T> dynamically
            var notificationType = typeof(DomainEventNotification<>).MakeGenericType(domainEvent.GetType());
            var notification = Activator.CreateInstance(notificationType, domainEvent) as INotification;
            
            if (notification != null)
            {
                await _mediator.Publish(notification, cancellationToken);
            }
        }
    }
}
