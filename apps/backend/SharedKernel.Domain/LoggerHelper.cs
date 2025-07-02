using FluentResults;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace SharedKernel.Domain;
public static class LoggerHelper
{
    public static void LogException(this ILogger logger, Exception exception) => logger.LogError(exception, "{exceptionMessage}", exception.Message);

    public static void LogReasons(this ILogger logger, IEnumerable<Reason> reasons)
    {
        foreach(var reason in reasons)
            logger.LogReason(reason);
    }

    public static void LogReason(this ILogger logger, Reason reason, ActivitySource? activitySource = null)
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
        logger.Log(logLevel, "{message}", message);

        foreach(var childReason in reason.Reasons)
            logger.LogReason(childReason, activitySource);
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