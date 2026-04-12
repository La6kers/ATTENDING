using MediatR;
using Microsoft.Extensions.Logging;
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
    private readonly ILogger<MediatRDomainEventDispatcher> _logger;

    public MediatRDomainEventDispatcher(IMediator mediator, ILogger<MediatRDomainEventDispatcher> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public async Task DispatchEventsAsync(IEnumerable<DomainEvent> domainEvents, CancellationToken cancellationToken = default)
    {
        foreach (var domainEvent in domainEvents)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                // Create DomainEventNotification<T> dynamically
                var notificationType = typeof(DomainEventNotification<>).MakeGenericType(domainEvent.GetType());
                var notification = Activator.CreateInstance(notificationType, domainEvent) as INotification;

                if (notification != null)
                {
                    await _mediator.Publish(notification, cancellationToken);
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch domain event {EventType}", domainEvent.GetType().Name);
                // Continue dispatching remaining events
            }
        }
    }
}
