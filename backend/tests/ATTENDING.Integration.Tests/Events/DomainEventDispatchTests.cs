using FluentAssertions;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Events;
using ATTENDING.Application.Events.Handlers;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Services;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Events;

public class DomainEventDispatchTests
{
    /// <summary>
    /// Build a minimal service provider with MediatR, logging, and a stub notification service.
    /// </summary>
    private static ServiceProvider BuildTestProvider()
    {
        var services = new ServiceCollection();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<EmergencyProtocolHandler>());
        services.AddLogging(b => b.AddDebug());
        services.AddSingleton<IClinicalNotificationService, StubClinicalNotificationService>();
        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task DispatchEvents_EmergencyProtocol_ShouldPublish()
    {
        var sp = BuildTestProvider();
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var evt = new EmergencyProtocolTriggeredEvent(Guid.NewGuid(), Guid.NewGuid(), "Chest pain", "Call 911");

        await dispatcher.Invoking(d => d.DispatchEventsAsync(new[] { evt }))
            .Should().NotThrowAsync();

        // Verify the notification was sent via the stub
        var stub = sp.GetRequiredService<IClinicalNotificationService>() as StubClinicalNotificationService;
        stub!.EmergencyAssessments.Should().HaveCount(1);
    }

    [Fact]
    public async Task DispatchEvents_RedFlag_ShouldPublish()
    {
        var sp = BuildTestProvider();
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var evt = new RedFlagDetectedEvent(
            Guid.NewGuid(), Guid.NewGuid(), "Cardiovascular",
            RedFlagSeverity.Critical, "Crushing chest pain");

        await dispatcher.Invoking(d => d.DispatchEventsAsync(new[] { evt }))
            .Should().NotThrowAsync();

        var stub = sp.GetRequiredService<IClinicalNotificationService>() as StubClinicalNotificationService;
        stub!.RedFlags.Should().HaveCount(1);
    }

    [Fact]
    public async Task DispatchEvents_CriticalLabResult_ShouldPublish()
    {
        var sp = BuildTestProvider();
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var evt = new LabOrderResultedEvent(Guid.NewGuid(), true);

        await dispatcher.Invoking(d => d.DispatchEventsAsync(new[] { evt }))
            .Should().NotThrowAsync();

        var stub = sp.GetRequiredService<IClinicalNotificationService>() as StubClinicalNotificationService;
        stub!.CriticalResults.Should().HaveCount(1);
    }

    [Fact]
    public async Task DispatchEvents_NonCriticalLabResult_ShouldNotNotify()
    {
        var sp = BuildTestProvider();
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var evt = new LabOrderResultedEvent(Guid.NewGuid(), isCritical: false);

        await dispatcher.Invoking(d => d.DispatchEventsAsync(new[] { evt }))
            .Should().NotThrowAsync();

        var stub = sp.GetRequiredService<IClinicalNotificationService>() as StubClinicalNotificationService;
        stub!.CriticalResults.Should().BeEmpty("non-critical results should not trigger notifications");
    }

    [Fact]
    public async Task DispatchEvents_MultipleEvents_ShouldPublishAll()
    {
        var sp = BuildTestProvider();
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>());

        var events = new DomainEvent[]
        {
            new AssessmentStartedEvent(Guid.NewGuid(), Guid.NewGuid()),
            new RedFlagDetectedEvent(Guid.NewGuid(), Guid.NewGuid(), "Neuro", RedFlagSeverity.Critical, "Stroke symptoms"),
            new EmergencyProtocolTriggeredEvent(Guid.NewGuid(), Guid.NewGuid(), "Stroke", "Activate stroke protocol")
        };

        await dispatcher.Invoking(d => d.DispatchEventsAsync(events))
            .Should().NotThrowAsync();

        var stub = sp.GetRequiredService<IClinicalNotificationService>() as StubClinicalNotificationService;
        stub!.RedFlags.Should().HaveCount(1);
        stub!.EmergencyAssessments.Should().HaveCount(1);
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
