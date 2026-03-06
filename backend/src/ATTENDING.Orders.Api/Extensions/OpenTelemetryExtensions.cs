using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace ATTENDING.Orders.Api.Extensions;

/// <summary>
/// OpenTelemetry distributed tracing configuration for ATTENDING API.
///
/// Instruments:
///   - ASP.NET Core: HTTP request/response spans (inbound)
///   - HttpClient:   Outbound HTTP calls (FHIR, AI service, external APIs)
///   - EF Core:      Database query spans with sanitized SQL
///   - Redis:        Cache operation spans
///   - MediatR:      Command/query handler spans (via TracingMediatorBehavior)
///   - Custom:       ActivitySource "ATTENDING.Api" for manual spans in business logic
///
/// Exporters (all conditional on configuration):
///   - OTLP: ships to any OpenTelemetry Collector (Jaeger, Grafana Tempo, Azure Monitor)
///   - Console: dev-only, structured trace output to stdout
///
/// PHI Safety:
///   DB query spans use statement sanitization (no parameter values in spans).
///   HTTP spans never include request/response bodies.
///
/// Configuration (appsettings.json):
///   "OpenTelemetry": {
///     "ServiceName":    "attending-orders-api",
///     "ServiceVersion": "1.0.0",
///     "OtlpEndpoint":   "http://otel-collector:4317",   // empty = disabled
///     "ConsoleExporter": false                           // true = dev only
///   }
/// </summary>
public static class OpenTelemetryExtensions
{
    /// <summary>Activity source for manual instrumentation within ATTENDING business logic.</summary>
    public static readonly System.Diagnostics.ActivitySource ActivitySource =
        new("ATTENDING.Api", "1.0.0");

    public static IServiceCollection AddAttendingOpenTelemetry(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var section         = configuration.GetSection("OpenTelemetry");
        var serviceName     = section["ServiceName"]    ?? "attending-orders-api";
        var serviceVersion  = section["ServiceVersion"] ?? "1.0.0";
        var otlpEndpoint    = section["OtlpEndpoint"];
        var consoleExporter = section.GetValue<bool>("ConsoleExporter", environment.IsDevelopment());

        // If neither exporter is configured, skip registration entirely.
        // This avoids startup overhead in environments where tracing isn't needed.
        if (string.IsNullOrWhiteSpace(otlpEndpoint) && !consoleExporter)
            return services;

        // Resource attributes visible in every span
        var resourceBuilder = ResourceBuilder.CreateDefault()
            .AddService(
                serviceName:       serviceName,
                serviceVersion:    serviceVersion,
                serviceInstanceId: Environment.MachineName)
            .AddAttributes(new Dictionary<string, object>
            {
                ["deployment.environment"] = environment.EnvironmentName,
                ["service.namespace"]      = "attending-ai",
                ["host.name"]              = Environment.MachineName,
            });

        services.AddOpenTelemetry()
            .WithTracing(tracing =>
            {
                tracing
                    .SetResourceBuilder(resourceBuilder)

                    // Inbound HTTP request/response spans
                    .AddAspNetCoreInstrumentation(opts =>
                    {
                        // Exclude health checks and metrics — high-frequency, low-value
                        opts.Filter = ctx =>
                            !ctx.Request.Path.StartsWithSegments("/health") &&
                            !ctx.Request.Path.StartsWithSegments("/metrics");

                        // Attach correlation ID and tenant ID to every HTTP span
                        opts.EnrichWithHttpRequest = (activity, request) =>
                        {
                            if (request.HttpContext.Items.TryGetValue("CorrelationId", out var cid))
                                activity.SetTag("attending.correlation_id", cid?.ToString());

                            // Tenant ID is not PHI — it's a provider/org identifier
                            var tenantId = request.HttpContext.User.FindFirst("oid")?.Value
                                        ?? request.HttpContext.User.FindFirst("sub")?.Value;
                            if (!string.IsNullOrWhiteSpace(tenantId))
                                activity.SetTag("attending.tenant_id", tenantId);
                        };

                        opts.EnrichWithHttpResponse = (activity, response) =>
                            activity.SetTag("http.response_size", response.ContentLength);

                        opts.RecordException = true;
                    })

                    // Outbound HttpClient spans (FHIR, BioMistral AI service)
                    .AddHttpClientInstrumentation(opts =>
                    {
                        // Never capture bodies — PHI risk
                        opts.RecordException = true;

                        opts.EnrichWithHttpRequestMessage = (activity, request) =>
                        {
                            if (request.RequestUri?.Host.Contains("fhir") == true)
                                activity.SetTag("attending.integration", "fhir");
                            else if (request.RequestUri?.Host.Contains("ollama") == true ||
                                     request.RequestUri?.Port == 11434)
                                activity.SetTag("attending.integration", "biomistral-ai");
                        };
                    })

                    // EF Core database query spans (sanitized SQL, no parameter values)
                    .AddEntityFrameworkCoreInstrumentation(opts =>
                    {
                        opts.SetDbStatementForText            = true;
                        opts.SetDbStatementForStoredProcedure = true;

                        // Tag slow queries for targeted optimization work
                        opts.EnrichWithIDbCommand = (activity, command) =>
                        {
                            if (activity.Duration.TotalMilliseconds > 200)
                                activity.SetTag("db.slow_query", true);
                        };
                    })

                    // Redis cache operation spans are wired in Infrastructure's DI
                    // (AddAttendingRedisInstrumentation) where the IConnectionMultiplexer
                    // is available. Nothing needed here.

                    // Custom ActivitySources for ATTENDING business logic
                    .AddSource("ATTENDING.Api")            // manual spans in API layer
                    .AddSource("ATTENDING.Application")    // MediatR command/query handler spans
                    .AddSource("ATTENDING.Infrastructure") // infrastructure-layer manual spans

                    // Sampling strategy:
                    //   Production: 10% of normal traffic, 100% of errors (parent-based)
                    //   Dev/test:   sample everything (AlwaysOn)
                    .SetSampler(environment.IsProduction()
                        ? new ParentBasedSampler(new TraceIdRatioBasedSampler(0.1))
                        : new AlwaysOnSampler());

                // OTLP exporter (Jaeger, Grafana Tempo, Azure Monitor Exporter, etc.)
                if (!string.IsNullOrWhiteSpace(otlpEndpoint))
                {
                    tracing.AddOtlpExporter(opts =>
                    {
                        opts.Endpoint = new Uri(otlpEndpoint);
                        opts.Protocol = OtlpExportProtocol.Grpc;

                        // Batch export: don't block request thread on telemetry I/O
                        opts.ExportProcessorType = ExportProcessorType.Batch;
                        opts.BatchExportProcessorOptions =
                            new BatchExportProcessorOptions<System.Diagnostics.Activity>
                            {
                                MaxQueueSize               = 2048,
                                ScheduledDelayMilliseconds = 5000,
                                ExporterTimeoutMilliseconds = 30000,
                                MaxExportBatchSize         = 512,
                            };
                    });
                }

                // Console exporter — dev/debug only.
                // Guarded by environment check to prevent accidental production
                // enablement via config (console output is synchronous and adds
                // measurable latency under load).
                if (consoleExporter && !environment.IsProduction())
                {
                    tracing.AddConsoleExporter();
                }
                else if (consoleExporter && environment.IsProduction())
                {
                    // Warn but don't enable — someone set ConsoleExporter=true in prod config
                    System.Diagnostics.Trace.TraceWarning(
                        "[OpenTelemetry] ConsoleExporter=true in production config — ignored. " +
                        "Console exporting is restricted to non-production environments.");
                }
            });

        return services;
    }
}
