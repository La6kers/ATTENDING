using FluentAssertions;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Events;
using ATTENDING.Application.Events.Handlers;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Services;
using Xunit;

namespace ATTENDING.Integration.Tests.Events;

public class DomainEventDispatchTests
{
    [Fact]
    public async Task DispatchEvents_EmergencyProtocol_ShouldPublish()
    {
        var services = new ServiceCollection();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<EmergencyProtocolHandler>());
        services.AddLogging(b => b.AddDebug());
        var sp = services.BuildServiceProvider();

        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var evt = new EmergencyProtocolTriggeredEvent(Guid.NewGuid(), Guid.NewGuid(), "Chest pain", "Call 911");

        // Should not throw — handler processes the event
        await dispatcher.Invoking(d => d.DispatchEventsAsync(new[] { evt }))
            .Should().NotThrowAsync();
    }

    [Fact]
    public async Task DispatchEvents_RedFlag_ShouldPublish()
    {
        var services = new ServiceCollection();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<RedFlagDetectedHandler>());
        services.AddLogging(b => b.AddDebug());
        var sp = services.BuildServiceProvider();

        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var evt = new RedFlagDetectedEvent(
            Guid.NewGuid(), Guid.NewGuid(), "Cardiovascular",
            RedFlagSeverity.Critical, "Crushing chest pain");

        await dispatcher.Invoking(d => d.DispatchEventsAsync(new[] { evt }))
            .Should().NotThrowAsync();
    }

    [Fact]
    public async Task DispatchEvents_CriticalLabResult_ShouldPublish()
    {
        var services = new ServiceCollection();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<CriticalLabResultHandler>());
        services.AddLogging(b => b.AddDebug());
        var sp = services.BuildServiceProvider();

        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var evt = new LabOrderResultedEvent(Guid.NewGuid(), true);

        await dispatcher.Invoking(d => d.DispatchEventsAsync(new[] { evt }))
            .Should().NotThrowAsync();
    }

    [Fact]
    public async Task DispatchEvents_MultipleEvents_ShouldPublishAll()
    {
        var services = new ServiceCollection();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<EmergencyProtocolHandler>());
        services.AddLogging(b => b.AddDebug());
        var sp = services.BuildServiceProvider();

        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var events = new DomainEvent[]
        {
            new AssessmentStartedEvent(Guid.NewGuid(), Guid.NewGuid()),
            new RedFlagDetectedEvent(Guid.NewGuid(), Guid.NewGuid(), "Neuro", RedFlagSeverity.Critical, "Stroke symptoms"),
            new EmergencyProtocolTriggeredEvent(Guid.NewGuid(), Guid.NewGuid(), "Stroke", "Activate stroke protocol")
        };

        await dispatcher.Invoking(d => d.DispatchEventsAsync(events))
            .Should().NotThrowAsync();
    }

    [Fact]
    public void Assessment_Create_WithEmergency_ShouldRaiseDomainEvents()
    {
        var evaluator = new RedFlagEvaluator();
        var eval = evaluator.Evaluate("crushing chest pain radiating to arm", null, null);
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "crushing chest pain", eval);

        assessment.DomainEvents.Should().HaveCountGreaterOrEqualTo(2);
        assessment.DomainEvents.Should().ContainItemsAssignableTo<AssessmentStartedEvent>();
    }
}
