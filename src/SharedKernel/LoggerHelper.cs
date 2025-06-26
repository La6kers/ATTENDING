using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace SharedKernel;
public static class LoggerHelper
{
    public static IServiceCollection AddLoggingBehaviors(this IServiceCollection services)
    {
        services.AddScoped(typeof(IRequestBehavior<,>), typeof(LoggingBehavior<,>));
        services.AddScoped(typeof(ICommandRequestBehavior<>), typeof(LoggingCommandBehavior<>));

        return services;
    }

    private class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
        : IRequestBehavior<TRequest, TResponse>
        where TRequest : IRequest<TResponse>
    {
        private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger = logger;

        public async Task<Result<TResponse>> Handle(TRequest request, Func<Task<Result<TResponse>>> next, CancellationToken cancellationToken)
        {
            var requestType = typeof(TRequest).Name;
            var requestId = Guid.NewGuid().ToString();

            _logger.LogInformation("Handling request {RequestType} with ID {RequestId}", requestType, requestId);

            var stopwatch = Stopwatch.StartNew();
            try
            {
                var result = await next();
                stopwatch.Stop();

                // Log reasons if present
                if(result.Reasons.Count > 0)
                    _logger.logReasons(result.Reasons);

                _logger.LogInformation("Request {RequestType} with ID {RequestId} completed successfully in {ElapsedMilliseconds}ms",
                    requestType, requestId, stopwatch.ElapsedMilliseconds);

                return result;
            }
            catch(Exception ex)
            {
                stopwatch.Stop();
                _logger.logException(ex);
                _logger.LogError("Request {RequestType} with ID {RequestId} failed after {ElapsedMilliseconds}ms",
                    requestType, requestId, stopwatch.ElapsedMilliseconds);

                throw;
            }
        }
    }

    private class LoggingCommandBehavior<TRequest>(ILogger<LoggingCommandBehavior<TRequest>> logger)
        : ICommandRequestBehavior<TRequest>
        where TRequest : ICommandRequest
    {
        private readonly ILogger<LoggingCommandBehavior<TRequest>> _logger = logger;

        public async Task<Result> Handle(TRequest request, Func<Task<Result>> next, CancellationToken cancellationToken)
        {
            var requestType = typeof(TRequest).Name;
            var requestId = Guid.NewGuid().ToString();

            _logger.LogInformation("Handling command {RequestType} with ID {RequestId}", requestType, requestId);

            var stopwatch = Stopwatch.StartNew();
            try
            {
                var result = await next();
                stopwatch.Stop();

                // Log reasons if present
                if(result.Reasons.Count > 0)
                {
                    _logger.logReasons(result.Reasons);
                }

                _logger.LogInformation("Command {RequestType} with ID {RequestId} completed successfully in {ElapsedMilliseconds}ms",
                    requestType, requestId, stopwatch.ElapsedMilliseconds);

                return result;
            }
            catch(Exception ex)
            {
                stopwatch.Stop();
                _logger.logException(ex);
                _logger.LogError("Command {RequestType} with ID {RequestId} failed after {ElapsedMilliseconds}ms",
                    requestType, requestId, stopwatch.ElapsedMilliseconds);

                throw;
            }
        }
    }

    private static void logException(this ILogger logger, Exception exception) => logger.LogError(exception, "{Message}", exception.Message);

    private static void logReasons(this ILogger logger, IEnumerable<IReason> reasons)
    {
        foreach(var reason in reasons)
            logger.logReason(reason);
    }

    private static void logReason(this ILogger logger, IReason reason, ActivitySource? activitySource = null)
    {
        ArgumentNullException.ThrowIfNull(reason, nameof(reason));

        // begin trace or span
        if(reason is ITrace traceReason)
        {
            activitySource ??= new ActivitySource(Process.GetCurrentProcess().ProcessName);
            using var activity = activitySource.StartActivity(traceReason.ActivityName, ActivityKind.Internal);

            foreach(var metaData in reason.Metadata)
                activity?.SetTag(metaData.Key, metaData.Value?.ToString() ?? string.Empty);
        }

        // begin logging scope
        using var logScope = logger.BeginScope(reason.Metadata);

        // get log level and message
        LogLevel logLevel = getLogLevel(reason);
        string message;
        if(logger.hasTraceLoggingEnabled() && reason.hasSensitiveMetaData())
            message = reason.toMessageWithClearTextMetaData();
        else
            message = reason.toMessage(removeSensitiveData: true);

        // log the reason
        logger.Log(logLevel, "{Message}", message);

        if(reason is Reason extendedReason)
            logger.logReason(reason, activitySource);
    }

    private static LogLevel getLogLevel(IReason reason) => reason switch
    {
        IExceptionalError => LogLevel.Critical,
        IError => LogLevel.Error,
        IWarning => LogLevel.Warning,
        ISuccess => LogLevel.Information,
        ITrace => LogLevel.Trace,
        IDebug => LogLevel.Debug,
        _ => LogLevel.Information
    };
    private static bool hasTraceLoggingEnabled(this ILogger logger) => logger.IsEnabled(LogLevel.Trace);
    private static bool hasSensitiveMetaData(this IReason reason) => reason.Metadata.Any(metaData => metaData.Value is SensitiveMetaData);
    private static string toMessageWithClearTextMetaData(this IReason reason)
    {
        ArgumentNullException.ThrowIfNull(reason, nameof(reason));

        Dictionary<string, object> metaData = reason.Metadata.withClearTextSensitiveMetaData();
        return new ReasonStringBuilder()
            .WithReasonType(reason.GetType())
            .WithInfo(nameof(reason.Message), reason.Message)
            .WithInfo(nameof(reason.Metadata), string.Join("; ", metaData))
            .Build();
    }
    private static string toMessage(this IReason reason, bool removeSensitiveData)
    {
        ArgumentNullException.ThrowIfNull(reason, nameof(reason));

        Dictionary<string, object> metaData;
        if(removeSensitiveData)
            metaData = reason.Metadata.withoutSensitiveMetaData();
        else
            metaData = reason.Metadata;

        return new ReasonStringBuilder()
            .WithReasonType(reason.GetType())
            .WithInfo(nameof(reason.Message), reason.Message)
            .WithInfo(nameof(reason.Metadata), string.Join("; ", metaData))
            .Build();
    }
    private static Dictionary<string, object> withClearTextSensitiveMetaData(this Dictionary<string, object> metaData)
    {
        ArgumentNullException.ThrowIfNull(metaData, nameof(metaData));

        Dictionary<string, object> result = [];
        foreach(KeyValuePair<string, object> currentMetaData in metaData)
        {
            if(currentMetaData.Value is SensitiveMetaData sensitiveMetaData)
                result.Add(currentMetaData.Key, sensitiveMetaData.ToString());
            else
                result.Add(currentMetaData.Key, currentMetaData.Value);
        }

        return result;
    }
    private static Dictionary<string, object> withoutSensitiveMetaData(this Dictionary<string, object> metaData)
    {
        ArgumentNullException.ThrowIfNull(metaData, nameof(metaData));

        return metaData.Where(metaData => metaData.Value is not SensitiveMetaData).ToDictionary(metaData => metaData.Key, metaData => metaData.Value);
    }
}