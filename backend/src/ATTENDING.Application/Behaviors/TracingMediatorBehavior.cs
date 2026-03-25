using System.Diagnostics;
using MediatR;

namespace ATTENDING.Application.Behaviors;

/// <summary>
/// MediatR pipeline behavior that wraps every command and query handler
/// in an OpenTelemetry Activity (span).
///
/// Each span captures:
///   - Request type name (e.g., "CreateLabOrderCommand")
///   - Request category: "command" or "query"
///   - Whether the handler succeeded or threw
///   - Handler execution duration
///
/// PHI safety: the request object itself is NOT serialized into the span.
/// Only the type name is used. If you need to add specific attributes
/// (e.g., order ID after creation), do so explicitly in the handler.
///
/// The spans appear as children of the inbound HTTP span, giving a full
/// trace from HTTP entry → MediatR dispatch → handler → DB query.
///
/// ActivitySource: "ATTENDING.Application" — must be registered in
/// OpenTelemetryExtensions.AddSource() to appear in traces.
/// </summary>
public class TracingMediatorBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private static readonly ActivitySource _activitySource =
        new("ATTENDING.Application", "1.0.0");

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var isCommand   = IsCommand(requestName);
        var spanName    = $"{(isCommand ? "command" : "query")}/{requestName}";

        // Start a child span under the current activity (HTTP request span)
        using var activity = _activitySource.StartActivity(
            spanName,
            ActivityKind.Internal);

        if (activity == null)
        {
            // No active trace context (OTel not configured or sampled out)
            return await next();
        }

        activity.SetTag("mediator.request_type", requestName);
        activity.SetTag("mediator.category",     isCommand ? "command" : "query");

        try
        {
            var response = await next();

            activity.SetStatus(ActivityStatusCode.Ok);
            return response;
        }
        catch (Exception ex)
        {
            // Mark span as failed and record the exception
            activity.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity.AddEvent(new ActivityEvent("exception", tags: new ActivityTagsCollection
            {
                { "exception.type", ex.GetType().FullName },
                { "exception.message", ex.Message },
            }));
            throw;
        }
    }

    /// <summary>
    /// Classifies the request as a command or query by naming convention.
    /// Commands end in "Command"; everything else is treated as a query.
    /// </summary>
    private static bool IsCommand(string requestName) =>
        requestName.EndsWith("Command", StringComparison.OrdinalIgnoreCase);
}
