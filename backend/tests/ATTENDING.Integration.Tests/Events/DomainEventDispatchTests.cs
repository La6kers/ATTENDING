using FluentAssertions;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using ATTENDING.Application.Events;
using ATTENDING.Application.Events.Handlers;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Events;

public class DomainEventDispatchTests
{
    /// <summary>
    /// Build a minimal service provider with MediatR, logging, stub notification service,
    /// and null-returning stub repositories (handlers gracefully handle null patient/order lookups).
    /// </summary>
    private static ServiceProvider BuildTestProvider()
    {
        var services = new ServiceCollection();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<EmergencyProtocolHandler>());
        services.AddLogging(b => b.AddDebug());
        services.AddSingleton<IClinicalNotificationService, StubClinicalNotificationService>();
        // Stub repositories -- handlers use null-coalescing fallbacks ("Unknown Patient", "") when
        // patient/order is not found, so returning null here is safe for unit-level event tests.
        services.AddSingleton<IPatientRepository, NullPatientRepository>();
        services.AddSingleton<ILabOrderRepository, NullLabOrderRepository>();
        return services.BuildServiceProvider();
    }

    // -- Minimal stub repositories -------------------------------------------------

    private sealed class NullPatientRepository : IPatientRepository
    {
        public Task<Patient?> GetByIdAsync(Guid id, CancellationToken ct = default) => Task.FromResult<Patient?>(null);
        public Task<Patient?> GetByMrnAsync(string mrn, CancellationToken ct = default) => Task.FromResult<Patient?>(null);
        public Task<IReadOnlyList<Patient>> GetAllAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<Patient>>(Array.Empty<Patient>());
        public Task<IReadOnlyList<Patient>> SearchAsync(string? term, int skip = 0, int take = 20, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<Patient>>(Array.Empty<Patient>());
        public Task<int> SearchCountAsync(string? term, CancellationToken ct = default) => Task.FromResult(0);
        public Task<Patient?> GetWithAllergiesAsync(Guid id, CancellationToken ct = default) => Task.FromResult<Patient?>(null);
        public Task<Patient?> GetWithConditionsAsync(Guid id, CancellationToken ct = default) => Task.FromResult<Patient?>(null);
        public Task<Patient?> GetWithFullHistoryAsync(Guid id, CancellationToken ct = default) => Task.FromResult<Patient?>(null);
        public Task AddAllergyAsync(Allergy allergy, CancellationToken ct = default) => Task.CompletedTask;
        public Task<Patient?> FindByNameAndDobAsync(string firstName, string lastName, DateTime dateOfBirth, Guid organizationId, CancellationToken ct = default) => Task.FromResult<Patient?>(null);
        public Task AddAsync(Patient entity, CancellationToken ct = default) => Task.CompletedTask;
        public void Update(Patient entity) { }
        public void Remove(Patient entity) { }
    }

    private sealed class NullLabOrderRepository : ILabOrderRepository
    {
        public Task<LabOrder?> GetByIdAsync(Guid id, CancellationToken ct = default) => Task.FromResult<LabOrder?>(null);
        public Task<LabOrder?> GetByOrderNumberAsync(string num, CancellationToken ct = default) => Task.FromResult<LabOrder?>(null);
        public Task<LabOrder?> GetWithResultAsync(Guid id, CancellationToken ct = default) => Task.FromResult<LabOrder?>(null);
        public Task<IReadOnlyList<LabOrder>> GetAllAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<LabOrder>>(Array.Empty<LabOrder>());
        public Task<IReadOnlyList<LabOrder>> GetByPatientIdAsync(Guid id, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<LabOrder>>(Array.Empty<LabOrder>());
        public Task<IReadOnlyList<LabOrder>> GetByEncounterIdAsync(Guid id, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<LabOrder>>(Array.Empty<LabOrder>());
        public Task<IReadOnlyList<LabOrder>> GetByStatusAsync(LabOrderStatus status, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<LabOrder>>(Array.Empty<LabOrder>());
        public Task<IReadOnlyList<LabOrder>> GetPendingOrdersAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<LabOrder>>(Array.Empty<LabOrder>());
        public Task<IReadOnlyList<LabOrder>> GetCriticalResultsAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<LabOrder>>(Array.Empty<LabOrder>());
        public Task<IReadOnlyList<LabOrder>> GetByDateRangeAsync(DateTime start, DateTime end, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<LabOrder>>(Array.Empty<LabOrder>());
        public Task AddAsync(LabOrder entity, CancellationToken ct = default) => Task.CompletedTask;
        public void Update(LabOrder entity) { }
        public void Remove(LabOrder entity) { }
    }

    [Fact]
    public async Task DispatchEvents_EmergencyProtocol_ShouldPublish()
    {
        var sp = BuildTestProvider();
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>(), NullLogger<MediatRDomainEventDispatcher>.Instance);

        var evt = new EmergencyProtocolTriggeredEvent(Guid.NewGuid(), Guid.NewGuid(), "Chest pain", "Call 911");

        await dispatcher.Invoking(d => d.DispatchEventsAsync(new[] { evt }))
            .Should().NotThrowAsync();

        var stub = sp.GetRequiredService<IClinicalNotificationService>() as StubClinicalNotificationService;
        stub!.EmergencyAssessments.Should().HaveCount(1);
    }

    [Fact]
    public async Task DispatchEvents_RedFlag_ShouldPublish()
    {
        var sp = BuildTestProvider();
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>(), NullLogger<MediatRDomainEventDispatcher>.Instance);

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
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>(), NullLogger<MediatRDomainEventDispatcher>.Instance);

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
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>(), NullLogger<MediatRDomainEventDispatcher>.Instance);

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
        var dispatcher = new MediatRDomainEventDispatcher(sp.GetRequiredService<IMediator>(), NullLogger<MediatRDomainEventDispatcher>.Instance);

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
