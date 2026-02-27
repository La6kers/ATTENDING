using Microsoft.Extensions.Logging;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Events;

/// <summary>
/// In-process event bus backed by the MediatR domain event dispatcher.
///
/// This implementation satisfies IEventBus for single-pod or development
/// deployments where all processing happens in the same process. It wraps
/// IDomainEventDispatcher so there is exactly one code path for event
/// dispatch, regardless of whether the call comes from:
///   (a) AttendingDbContext after SaveChangesAsync (aggregate-root events), or
///   (b) Application code calling IEventBus.PublishAsync directly.
///
/// To switch to MassTransit:
///   1. Add ATTENDING.Infrastructure.Messaging/MassTransitEventBus.cs
///      implementing IEventBus using IPublishEndpoint.
///   2. Change the DI registration in Application/DependencyInjection.cs:
///         services.AddScoped&lt;IEventBus, MassTransitEventBus&gt;();
///   3. No changes needed in handlers or publishers.
/// </summary>
public sealed class InProcessEventBus : IEventBus
{
    private readonly IDomainEventDispatcher _dispatcher;
    private readonly ILogger<InProcessEventBus> _logger;

    public InProcessEventBus(IDomainEventDispatcher dispatcher, ILogger<InProcessEventBus> logger)
    {
        _dispatcher = dispatcher;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default)
        where TEvent : DomainEvent
    {
        _logger.LogDebug(
            "Publishing domain event {EventType} ({EventId}) via in-process bus",
            domainEvent.EventType, domainEvent.Id);

        await _dispatcher.DispatchEventsAsync(new[] { domainEvent }, cancellationToken);
    }

    /// <inheritdoc/>
    public async Task PublishBatchAsync(IEnumerable<DomainEvent> domainEvents, CancellationToken cancellationToken = default)
    {
        var events = domainEvents.ToList();

        if (events.Count == 0)
            return;

        _logger.LogDebug(
            "Publishing batch of {Count} domain event(s) via in-process bus",
            events.Count);

        await _dispatcher.DispatchEventsAsync(events, cancellationToken);
    }
}
