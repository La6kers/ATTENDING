using FluentResults;

namespace SharedKernel;
public interface ITrace : IReason
{
    public string ActivityName { get; }
}
public interface IWarning : IReason;
public interface IDebug : IReason;

public class Reason : IReason
{
    public string Message { get; protected set; }
    public Dictionary<string, object> Metadata { get; } = [];
    public List<Reason> Reasons { get; } = [];

    public Reason(string requestName, string message)
    {
        Message = message;
    }

    public Reason WithMetaData(string key, object value)
    {
        Metadata.Add(key, value);
        return this;
    }

    public Reason AddReason(Reason reason)
    {
        if(reason is not null)
            Reasons.Add(reason);
        return this;
    }

    public Reason AddReasons(IEnumerable<Reason> reasons)
    {
        if(reasons is not null)
            Reasons.AddRange(reasons.Where(reason => reason is not null));
        return this;
    }

    public override string ToString()
    {
        var metadata = Metadata
            .Where(kvp => !(kvp.Value is SensitiveMetaData))
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        var sensitiveMetadata = Metadata
            .Where(kvp => kvp.Value is SensitiveMetaData)
            .ToDictionary(kvp => kvp.Key, kvp => new SensitiveMetaData(null));

        var metaDataString = string.Join("; ", Metadata.Select(kvp => $"{kvp.Key}: {kvp.Value}"));

        return new ReasonStringBuilder()
                .WithReasonType(GetType())
                .WithInfo(nameof(Message), Message)
                .WithInfo(nameof(Metadata), string.Join("; ", Metadata))
                .WithInfo(nameof(Reasons), string.Join("; ", Reasons))
                .Build();
    }
}
public class Trace(string requestName, string message, string activityName) : Reason(requestName, message), ITrace
{
    public string ActivityName { get; } = activityName;
}
public class Warning(string requestName, string message) : Reason(requestName, message), IWarning;
public class Debug(string requestName, string message) : Reason(requestName, message), IDebug;

public class Success(string requestName, string message) : Reason(requestName, message), ISuccess;
public class Error(string requestName, string message) : Reason(requestName, message), IError
{
    List<IError> IError.Reasons => [.. Reasons.OfType<IError>()];
}

public class ExceptionalError(string requestName, Exception exception) : Reason(requestName, exception.Message), IExceptionalError
{
    public Exception Exception { get; } = exception;

    List<IError> IError.Reasons => [.. Reasons.OfType<IError>()];
}

public class SensitiveMetaData(object? value)
{
    public object? Value { get; set; } = value;
    private const string _defaultValue = "";

    public override string ToString() => _defaultValue;
}

public static class ResultExtensions
{
    public static Result WithTrace(this Result result, ITrace trace) => result.WithReason(trace);
    public static Result<TValue> WithTrace<TValue>(this Result<TValue> result, ITrace trace) => result.WithReason(trace);
    public static Result WithTraces(this Result result, IEnumerable<ITrace> traces) => result.WithReasons(traces);
    public static Result<TValue> WithTraces<TValue>(this Result<TValue> result, IEnumerable<ITrace> traces) => result.WithReasons(traces);
    public static Result WithWarning(this Result result, IWarning warning) => result.WithReason(warning);
    public static Result<TValue> WithWarning<TValue>(this Result<TValue> result, IWarning warning) => result.WithReason(warning);
    public static Result WithWarnings(this Result result, IEnumerable<IWarning> warnings) => result.WithReasons(warnings);
    public static Result<TValue> WithWarnings<TValue>(this Result<TValue> result, IEnumerable<IWarning> warnings) => result.WithReasons(warnings);
    public static Result WithDebug(this Result result, IDebug debug) => result.WithReason(debug);
    public static Result<TValue> WithDebug<TValue>(this Result<TValue> result, IDebug debug) => result.WithReason(debug);
    public static Result WithDebugs(this Result result, IEnumerable<IDebug> debugs) => result.WithReasons(debugs);
    public static Result<TValue> WithDebugs<TValue>(this Result<TValue> result, IEnumerable<IDebug> debugs) => result.WithReasons(debugs);
    public static Result WithError(this Result result, IEnumerable<Error> error) => result.WithReasons(error);
    public static Result<TValue> WithError<TValue>(this Result<TValue> result, IEnumerable<Error> error) => result.WithReasons(error);
    public static Result WithErrors(this Result result, IEnumerable<Error> errors) => result.WithReasons(errors);
    public static Result<TValue> WithErrors<TValue>(this Result<TValue> result, IEnumerable<Error> errors) => result.WithReasons(errors);
}