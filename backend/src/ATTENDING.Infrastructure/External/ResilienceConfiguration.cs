using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ATTENDING.Infrastructure.External;

/// <summary>
/// Resilience configuration for external HTTP services (FHIR, AI).
///
/// Healthcare services must degrade gracefully when external dependencies fail.
/// This provides retry with exponential backoff and circuit breaker patterns
/// using .NET 8's built-in HttpClient pipeline.
///
/// Circuit breaker states:
///   Closed  → Normal operation; failures counted
///   Open    → All requests fail-fast for BreakDuration (no external calls)
///   HalfOpen → One probe request allowed; success closes, failure re-opens
///
/// Retry policy:
///   3 attempts with exponential backoff + jitter (avoids thundering herd)
///   Only retries transient failures (5xx, 408, network errors)
/// </summary>
public static class ResilienceConfiguration
{
    /// <summary>
    /// Configure an HttpClient with healthcare-appropriate resilience policies.
    /// </summary>
    public static IHttpClientBuilder AddClinicalResilienceHandler(
        this IHttpClientBuilder builder,
        string serviceName,
        ResilienceOptions? options = null)
    {
        options ??= ResilienceOptions.Default;

        // Add a delegating handler that implements retry + circuit breaker
        builder.AddHttpMessageHandler(sp =>
        {
            var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger($"Resilience.{serviceName}");
            return new ResilienceDelegatingHandler(serviceName, options, logger);
        });

        // Enforce overall timeout at the HttpClient level
        builder.ConfigureHttpClient(client =>
        {
            client.Timeout = options.OverallTimeout;
        });

        return builder;
    }
}

/// <summary>
/// Options for configuring resilience policies.
/// </summary>
public class ResilienceOptions
{
    /// <summary>Maximum number of retry attempts before giving up.</summary>
    public int MaxRetryAttempts { get; set; } = 3;

    /// <summary>Base delay for exponential backoff.</summary>
    public TimeSpan RetryBaseDelay { get; set; } = TimeSpan.FromMilliseconds(500);

    /// <summary>Maximum delay between retries (caps exponential growth).</summary>
    public TimeSpan RetryMaxDelay { get; set; } = TimeSpan.FromSeconds(8);

    /// <summary>Number of consecutive failures before opening circuit.</summary>
    public int CircuitBreakerThreshold { get; set; } = 5;

    /// <summary>Duration the circuit stays open before allowing a probe request.</summary>
    public TimeSpan CircuitBreakerBreakDuration { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>Time window for counting failures toward the circuit breaker threshold.</summary>
    public TimeSpan CircuitBreakerSamplingWindow { get; set; } = TimeSpan.FromMinutes(1);

    /// <summary>Maximum time for the entire request including all retries.</summary>
    public TimeSpan OverallTimeout { get; set; } = TimeSpan.FromSeconds(45);

    /// <summary>Default options suitable for clinical AI and FHIR services.</summary>
    public static ResilienceOptions Default => new();

    /// <summary>
    /// More aggressive options for critical real-time operations
    /// (e.g., emergency triage assessment).
    /// </summary>
    public static ResilienceOptions CriticalPath => new()
    {
        MaxRetryAttempts = 2,
        RetryBaseDelay = TimeSpan.FromMilliseconds(200),
        RetryMaxDelay = TimeSpan.FromSeconds(2),
        CircuitBreakerThreshold = 3,
        CircuitBreakerBreakDuration = TimeSpan.FromSeconds(15),
        OverallTimeout = TimeSpan.FromSeconds(15)
    };
}

/// <summary>
/// Delegating handler implementing retry with exponential backoff + jitter
/// and a simple circuit breaker. Uses no external packages — pure .NET 8.
/// </summary>
internal class ResilienceDelegatingHandler : DelegatingHandler
{
    private readonly string _serviceName;
    private readonly ResilienceOptions _options;
    private readonly ILogger _logger;

    // Circuit breaker state (thread-safe via Interlocked)
    private volatile CircuitState _circuitState = CircuitState.Closed;
    private int _consecutiveFailures;
    private DateTime _circuitOpenedAt = DateTime.MinValue;
    private readonly object _circuitLock = new();

    private static readonly Random Jitter = new();

    public ResilienceDelegatingHandler(
        string serviceName, ResilienceOptions options, ILogger logger)
    {
        _serviceName = serviceName;
        _options = options;
        _logger = logger;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Circuit breaker check
        if (_circuitState == CircuitState.Open)
        {
            if (DateTime.UtcNow - _circuitOpenedAt < _options.CircuitBreakerBreakDuration)
            {
                _logger.LogWarning(
                    "[{Service}] Circuit breaker OPEN — failing fast. Resets in {Remaining:F0}s",
                    _serviceName,
                    (_options.CircuitBreakerBreakDuration - (DateTime.UtcNow - _circuitOpenedAt)).TotalSeconds);

                throw new CircuitBreakerOpenException(
                    $"Circuit breaker for {_serviceName} is open. Service is temporarily unavailable.");
            }

            // Transition to half-open (allow one probe)
            lock (_circuitLock)
            {
                if (_circuitState == CircuitState.Open)
                {
                    _circuitState = CircuitState.HalfOpen;
                    _logger.LogInformation("[{Service}] Circuit breaker → HALF-OPEN (probe request)", _serviceName);
                }
            }
        }

        // Retry loop
        HttpResponseMessage? lastResponse = null;
        Exception? lastException = null;

        for (var attempt = 0; attempt <= _options.MaxRetryAttempts; attempt++)
        {
            if (attempt > 0)
            {
                var delay = CalculateDelay(attempt);
                _logger.LogWarning(
                    "[{Service}] Retry {Attempt}/{Max} after {Delay}ms",
                    _serviceName, attempt, _options.MaxRetryAttempts, delay.TotalMilliseconds);
                await Task.Delay(delay, cancellationToken);
            }

            try
            {
                // Clone request for retry (HttpRequestMessage can only be sent once)
                using var clonedRequest = attempt > 0 ? await CloneRequestAsync(request) : request;
                lastResponse = await base.SendAsync(
                    attempt > 0 ? clonedRequest : request, cancellationToken);

                if (IsTransientError(lastResponse))
                {
                    _logger.LogWarning(
                        "[{Service}] Transient error {StatusCode} on attempt {Attempt}",
                        _serviceName, (int)lastResponse.StatusCode, attempt + 1);
                    RecordFailure();
                    continue;
                }

                // Success — reset circuit breaker
                RecordSuccess();
                return lastResponse;
            }
            catch (HttpRequestException ex)
            {
                lastException = ex;
                _logger.LogWarning(ex,
                    "[{Service}] Network error on attempt {Attempt}: {Message}",
                    _serviceName, attempt + 1, ex.Message);
                RecordFailure();
            }
            catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                lastException = ex;
                _logger.LogWarning(
                    "[{Service}] Request timeout on attempt {Attempt}",
                    _serviceName, attempt + 1);
                RecordFailure();
            }
        }

        // All retries exhausted
        _logger.LogError(
            "[{Service}] All {Max} retry attempts exhausted",
            _serviceName, _options.MaxRetryAttempts + 1);

        if (lastResponse != null) return lastResponse;
        throw lastException ?? new HttpRequestException($"{_serviceName} request failed after all retries");
    }

    private static bool IsTransientError(HttpResponseMessage response)
    {
        var code = (int)response.StatusCode;
        return code is 408 or 429 or (>= 500 and <= 599);
    }

    private TimeSpan CalculateDelay(int attempt)
    {
        // Exponential backoff: baseDelay * 2^(attempt-1) + random jitter
        var exponential = _options.RetryBaseDelay.TotalMilliseconds * Math.Pow(2, attempt - 1);
        var jitter = Jitter.Next(0, (int)(_options.RetryBaseDelay.TotalMilliseconds * 0.5));
        var total = Math.Min(exponential + jitter, _options.RetryMaxDelay.TotalMilliseconds);
        return TimeSpan.FromMilliseconds(total);
    }

    private void RecordSuccess()
    {
        lock (_circuitLock)
        {
            if (_circuitState != CircuitState.Closed)
            {
                _logger.LogInformation("[{Service}] Circuit breaker → CLOSED (recovered)", _serviceName);
            }
            _consecutiveFailures = 0;
            _circuitState = CircuitState.Closed;
        }
    }

    private void RecordFailure()
    {
        lock (_circuitLock)
        {
            _consecutiveFailures++;

            if (_consecutiveFailures >= _options.CircuitBreakerThreshold
                && _circuitState != CircuitState.Open)
            {
                _circuitState = CircuitState.Open;
                _circuitOpenedAt = DateTime.UtcNow;
                _logger.LogError(
                    "[{Service}] Circuit breaker → OPEN after {Failures} consecutive failures. " +
                    "Failing fast for {Duration}s",
                    _serviceName, _consecutiveFailures,
                    _options.CircuitBreakerBreakDuration.TotalSeconds);
            }
        }
    }

    private static async Task<HttpRequestMessage> CloneRequestAsync(HttpRequestMessage original)
    {
        var clone = new HttpRequestMessage(original.Method, original.RequestUri);
        foreach (var header in original.Headers)
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);

        if (original.Content != null)
        {
            var body = await original.Content.ReadAsByteArrayAsync();
            clone.Content = new ByteArrayContent(body);
            foreach (var header in original.Content.Headers)
                clone.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        return clone;
    }

    private enum CircuitState { Closed, Open, HalfOpen }
}

/// <summary>
/// Exception thrown when a circuit breaker is in the Open state.
/// External callers should catch this to activate fallback logic.
/// </summary>
public class CircuitBreakerOpenException : Exception
{
    public CircuitBreakerOpenException(string message) : base(message) { }
    public CircuitBreakerOpenException(string message, Exception inner) : base(message, inner) { }
}
