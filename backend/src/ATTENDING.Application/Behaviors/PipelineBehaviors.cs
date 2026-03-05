using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Common;

namespace ATTENDING.Application.Behaviors;

/// <summary>
/// Pipeline behavior for validation using FluentValidation
/// </summary>
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;
    private readonly ILogger<ValidationBehavior<TRequest, TResponse>> _logger;

    public ValidationBehavior(
        IEnumerable<IValidator<TRequest>> validators,
        ILogger<ValidationBehavior<TRequest, TResponse>> logger)
    {
        _validators = validators;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);

        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .Where(r => r.Errors.Any())
            .SelectMany(r => r.Errors)
            .ToList();

        if (failures.Any())
        {
            var errors = string.Join(", ", failures.Select(f => f.ErrorMessage));
            _logger.LogWarning("Validation failed for {RequestType}: {Errors}", 
                typeof(TRequest).Name, errors);
            throw new ValidationException(failures);
        }

        return await next();
    }
}

/// <summary>
/// Pipeline behavior for logging requests
/// </summary>
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}", requestName);

        var response = await next();

        _logger.LogInformation("Handled {RequestName}", requestName);
        return response;
    }
}

/// <summary>
/// Pipeline behavior for measuring performance
/// </summary>
public class PerformanceBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;

    public PerformanceBehavior(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
        // NOTE: Stopwatch is NOT stored as a field. A field-level Stopwatch shared
        // across concurrent requests produces garbage timing values. It is created
        // inside Handle() so each invocation gets its own independent timer.
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var timer = System.Diagnostics.Stopwatch.StartNew();

        var response = await next();

        timer.Stop();

        if (timer.ElapsedMilliseconds > 500) // Log slow requests
        {
            var requestName = typeof(TRequest).Name;
            _logger.LogWarning(
                "Long running request: {RequestName} ({ElapsedMilliseconds}ms)",
                requestName,
                timer.ElapsedMilliseconds);
        }

        return response;
    }
}

/// <summary>
/// Pipeline behavior for exception handling
/// </summary>
public class UnhandledExceptionBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<UnhandledExceptionBehavior<TRequest, TResponse>> _logger;

    public UnhandledExceptionBehavior(ILogger<UnhandledExceptionBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        try
        {
            return await next();
        }
        catch (Exception ex)
        {
            var requestName = typeof(TRequest).Name;
            _logger.LogError(ex, "Unhandled exception for {RequestName}", requestName);
            throw;
        }
    }
}

/// <summary>
/// Pipeline behavior that catches DbUpdateConcurrencyException and converts to Result.Failure.
/// Only applies to handlers that return Result&lt;T&gt;.
/// </summary>
public class ConcurrencyExceptionBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<ConcurrencyExceptionBehavior<TRequest, TResponse>> _logger;

    public ConcurrencyExceptionBehavior(ILogger<ConcurrencyExceptionBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        try
        {
            return await next();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            var requestName = typeof(TRequest).Name;
            _logger.LogWarning(ex, "Concurrency conflict for {RequestName}", requestName);

            // If TResponse is Result<T>, return a typed failure
            var responseType = typeof(TResponse);
            if (responseType.IsGenericType && responseType.GetGenericTypeDefinition() == typeof(Result<>))
            {
                var innerType = responseType.GetGenericArguments()[0];
                var entityName = requestName.Replace("Command", "").Replace("Handler", "");
                var error = DomainErrors.Concurrency.StaleData(entityName);
                var failureMethod = typeof(Result).GetMethod(nameof(Result.Failure), 1, new[] { typeof(Error) })!;
                var genericFailure = failureMethod.MakeGenericMethod(innerType);
                return (TResponse)genericFailure.Invoke(null, new object[] { error })!;
            }

            // For non-Result responses, rethrow
            throw;
        }
    }
}
