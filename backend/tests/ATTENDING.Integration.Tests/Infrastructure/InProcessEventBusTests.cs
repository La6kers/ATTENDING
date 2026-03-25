using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ATTENDING.Application.Events;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Interfaces;
using Xunit;

namespace ATTENDING.Integration.Tests.Infrastructure;

/// <summary>
/// Unit tests for InProcessEventBus.
/// Verifies delegation to IDomainEventDispatcher and batch semantics.
/// </summary>
public class InProcessEventBusTests
{
    private readonly Mock<IDomainEventDispatcher> _dispatcher;
    private readonly InProcessEventBus _bus;

    public InProcessEventBusTests()
    {
        _dispatcher = new Mock<IDomainEventDispatcher>(MockBehavior.Strict);
        _bus = new InProcessEventBus(_dispatcher.Object, NullLogger<InProcessEventBus>.Instance);
    }

    [Fact]
    public async Task PublishAsync_Delegates_Single_Event_To_Dispatcher()
    {
        var evt = new AssessmentStartedEvent(Guid.NewGuid(), Guid.NewGuid());

        _dispatcher
            .Setup(d => d.DispatchEventsAsync(
                It.Is<IEnumerable<DomainEvent>>(events => events.Single() == evt),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Verifiable();

        await _bus.PublishAsync(evt);

        _dispatcher.Verify();
    }

    [Fact]
    public async Task PublishBatchAsync_Delegates_All_Events_In_Order()
    {
        var e1 = new AssessmentStartedEvent(Guid.NewGuid(), Guid.NewGuid());
        var e2 = new AssessmentCompletedEvent(Guid.NewGuid(), Guid.NewGuid(), TriageLevel.Urgent, false);

        IEnumerable<DomainEvent>? capturedEvents = null;
        _dispatcher
            .Setup(d => d.DispatchEventsAsync(It.IsAny<IEnumerable<DomainEvent>>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<DomainEvent>, CancellationToken>((evts, _) => capturedEvents = evts)
            .Returns(Task.CompletedTask);

        await _bus.PublishBatchAsync(new DomainEvent[] { e1, e2 });

        Assert.NotNull(capturedEvents);
        var list = capturedEvents!.ToList();
        Assert.Equal(2, list.Count);
        Assert.Same(e1, list[0]);
        Assert.Same(e2, list[1]);
    }

    [Fact]
    public async Task PublishBatchAsync_Empty_Collection_Does_Not_Call_Dispatcher()
    {
        await _bus.PublishBatchAsync(Enumerable.Empty<DomainEvent>());

        _dispatcher.Verify(
            d => d.DispatchEventsAsync(It.IsAny<IEnumerable<DomainEvent>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PublishAsync_Propagates_CancellationToken()
    {
        using var cts = new CancellationTokenSource();
        var evt = new AssessmentStartedEvent(Guid.NewGuid(), Guid.NewGuid());
        CancellationToken capturedToken = default;

        _dispatcher
            .Setup(d => d.DispatchEventsAsync(It.IsAny<IEnumerable<DomainEvent>>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<DomainEvent>, CancellationToken>((_, ct) => capturedToken = ct)
            .Returns(Task.CompletedTask);

        await _bus.PublishAsync(evt, cts.Token);

        Assert.Equal(cts.Token, capturedToken);
    }
}
