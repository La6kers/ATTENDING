using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ATTENDING.Application.Events;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Events;

namespace ATTENDING.Infrastructure.Messaging;

/// <summary>
/// Extension methods for registering the event bus in DI.
///
/// Called from Infrastructure/DependencyInjection.cs.
///
/// Transport selection (EventBus:Transport in appsettings):
///
///   InProcess       — No MassTransit; uses existing InProcessEventBus (default).
///                     Best for single-pod dev/test.
///
///   InMemory        — MassTransit with in-memory transport. Useful for
///                     integration tests or single-host deployments that want
///                     the MassTransit pipeline (retry, dead-letter) without a broker.
///
///   AzureServiceBus — MassTransit with Azure Service Bus. Requires
///                     EventBus:ConnectionString in configuration (or managed identity
///                     via EventBus:FullyQualifiedNamespace).
///                     Required for multi-pod production deployments.
/// </summary>
public static class EventBusExtensions
{
    /// <summary>
    /// Domain event types that need a MassTransit consumer registered.
    /// Add new domain events here as they are created.
    /// </summary>
    private static readonly Type[] DomainEventTypes =
    {
        typeof(EmergencyProtocolTriggeredEvent),
        typeof(RedFlagDetectedEvent),
        typeof(LabOrderResultedEvent),
        typeof(DrugInteractionDetectedEvent),
        typeof(AssessmentCompletedEvent),
    };

    public static IServiceCollection AddEventBus(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Feature flag: when EventBus:Enabled is false (or absent), fall through to InProcess.
        // This prevents startup failures when EventBus:Transport is set to AzureServiceBus
        // but ConnectionString is not yet provisioned (e.g., fresh production deployment).
        var enabled = configuration.GetValue<bool?>("EventBus:Enabled") ?? true;
        var transport = configuration.GetValue<string>("EventBus:Transport") ?? "InProcess";

        if (!enabled)
            transport = "InProcess";

        switch (transport.Trim().ToUpperInvariant())
        {
            case "AZURESERVICEBUS":
                AddMassTransitAzureServiceBus(services, configuration);
                break;

            case "INMEMORY":
                AddMassTransitInMemory(services);
                break;

            default:
                // InProcess — already registered in Application/DependencyInjection.cs
                // No additional registration needed.
                break;
        }

        return services;
    }

    // ─── Azure Service Bus ───────────────────────────────────────────────────

    private static void AddMassTransitAzureServiceBus(
        IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddMassTransit(cfg =>
        {
            RegisterConsumers(cfg);

            cfg.UsingAzureServiceBus((ctx, sb) =>
            {
                // Prefer connection string; fall back to managed identity namespace
                var connStr    = configuration["EventBus:ConnectionString"];
                var @namespace = configuration["EventBus:FullyQualifiedNamespace"];

                if (!string.IsNullOrWhiteSpace(connStr))
                    sb.Host(connStr);
                else if (!string.IsNullOrWhiteSpace(@namespace))
                    sb.Host(new Uri($"sb://{@namespace}/"), h =>
                        h.TokenCredential = new Azure.Identity.DefaultAzureCredential());
                else
                    throw new InvalidOperationException(
                        "EventBus:Transport is AzureServiceBus but neither " +
                        "EventBus:ConnectionString nor EventBus:FullyQualifiedNamespace is configured.");

                // Retry policy — clinical operations should retry transiently
                sb.UseMessageRetry(r =>
                    r.Exponential(3,
                        TimeSpan.FromSeconds(1),
                        TimeSpan.FromSeconds(30),
                        TimeSpan.FromSeconds(2)));

                sb.ConfigureEndpoints(ctx);
            });
        });

        // Override the in-process IEventBus with MassTransit-backed implementation
        services.AddScoped<IEventBus, MassTransitEventBus>();
    }

    // ─── In-Memory (MassTransit in-process broker) ───────────────────────────

    private static void AddMassTransitInMemory(IServiceCollection services)
    {
        services.AddMassTransit(cfg =>
        {
            RegisterConsumers(cfg);
            cfg.UsingInMemory((ctx, inMem) => inMem.ConfigureEndpoints(ctx));
        });

        // Override the in-process IEventBus with MassTransit-backed implementation
        services.AddScoped<IEventBus, MassTransitEventBus>();
    }

    // ─── Consumer registration ────────────────────────────────────────────────

    private static void RegisterConsumers(IBusRegistrationConfigurator cfg)
    {
        // Register one consumer per domain event type via reflection.
        // Each consumer wraps IDomainEventDispatcher (MediatR) — handlers unchanged.
        foreach (var eventType in DomainEventTypes)
        {
            var consumerType = typeof(DomainEventConsumer<>).MakeGenericType(eventType);
            cfg.AddConsumer(consumerType);
        }
    }
}
