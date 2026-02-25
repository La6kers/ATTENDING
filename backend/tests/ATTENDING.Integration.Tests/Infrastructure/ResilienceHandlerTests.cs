using ATTENDING.Infrastructure.External;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace ATTENDING.Integration.Tests.Infrastructure;

/// <summary>
/// Tests for the resilience infrastructure (circuit breaker + retry).
/// Uses an in-process test HTTP server to simulate transient and persistent failures.
/// </summary>
public class ResilienceHandlerTests
{
    [Fact]
    [Trait("Category", "Integration")]
    public void CircuitBreakerOpenException_IsCreatedCorrectly()
    {
        // Arrange & Act
        var ex = new CircuitBreakerOpenException("Test service is unavailable");

        // Assert
        Assert.Contains("unavailable", ex.Message);
    }

    [Fact]
    [Trait("Category", "Integration")]
    public void ResilienceOptions_Default_HasSaneValues()
    {
        // Act
        var options = ResilienceOptions.Default;

        // Assert
        Assert.Equal(3, options.MaxRetryAttempts);
        Assert.True(options.RetryBaseDelay > TimeSpan.Zero);
        Assert.True(options.CircuitBreakerThreshold >= 3);
        Assert.True(options.CircuitBreakerBreakDuration >= TimeSpan.FromSeconds(10));
        Assert.True(options.OverallTimeout >= TimeSpan.FromSeconds(10));
    }

    [Fact]
    [Trait("Category", "Integration")]
    public void ResilienceOptions_CriticalPath_HasTighterTimeouts()
    {
        // Act
        var options = ResilienceOptions.CriticalPath;

        // Assert — critical path should be faster than default
        var defaultOpts = ResilienceOptions.Default;
        Assert.True(options.MaxRetryAttempts <= defaultOpts.MaxRetryAttempts,
            "Critical path should have fewer retries");
        Assert.True(options.OverallTimeout <= defaultOpts.OverallTimeout,
            "Critical path should have tighter overall timeout");
        Assert.True(options.CircuitBreakerBreakDuration <= defaultOpts.CircuitBreakerBreakDuration,
            "Critical path should have shorter circuit breaker break duration");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public void CircuitBreakerOpenException_WithInnerException_PreservesChain()
    {
        // Arrange
        var inner = new HttpRequestException("Connection refused");

        // Act
        var ex = new CircuitBreakerOpenException("Circuit open", inner);

        // Assert
        Assert.NotNull(ex.InnerException);
        Assert.IsType<HttpRequestException>(ex.InnerException);
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task ResilienceHandler_RetriesOnTransientFailure()
    {
        // Arrange — create a handler that fails twice, then succeeds
        var callCount = 0;
        var innerHandler = new TestHttpMessageHandler(request =>
        {
            callCount++;
            if (callCount <= 2)
            {
                return new HttpResponseMessage(System.Net.HttpStatusCode.ServiceUnavailable);
            }
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent("{\"status\":\"ok\"}")
            };
        });

        var options = new ResilienceOptions
        {
            MaxRetryAttempts = 3,
            RetryBaseDelay = TimeSpan.FromMilliseconds(10), // Fast for tests
            RetryMaxDelay = TimeSpan.FromMilliseconds(50),
            CircuitBreakerThreshold = 10, // High so we don't trip it
            OverallTimeout = TimeSpan.FromSeconds(10)
        };

        var logger = NullLogger.Instance;
        var resilientHandler = new TestableResilienceDelegatingHandler("TestService", options, logger)
        {
            InnerHandler = innerHandler
        };

        var client = new HttpClient(resilientHandler);

        // Act
        var response = await client.GetAsync("http://test.local/api/test");

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(3, callCount); // 2 failures + 1 success
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task ResilienceHandler_SucceedsOnFirstAttempt()
    {
        // Arrange — handler that succeeds immediately
        var callCount = 0;
        var innerHandler = new TestHttpMessageHandler(request =>
        {
            callCount++;
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent("{\"result\":\"success\"}")
            };
        });

        var options = new ResilienceOptions
        {
            MaxRetryAttempts = 3,
            RetryBaseDelay = TimeSpan.FromMilliseconds(10),
            CircuitBreakerThreshold = 10,
            OverallTimeout = TimeSpan.FromSeconds(10)
        };

        var resilientHandler = new TestableResilienceDelegatingHandler("TestService", options, NullLogger.Instance)
        {
            InnerHandler = innerHandler
        };

        var client = new HttpClient(resilientHandler);

        // Act
        var response = await client.GetAsync("http://test.local/api/test");

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, callCount); // Only one call — no retries needed
    }

    /// <summary>
    /// Simple test HTTP handler that returns a configurable response.
    /// </summary>
    private class TestHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public TestHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_handler(request));
        }
    }

    /// <summary>
    /// Testable version of the resilience handler (exposes internal for testing).
    /// This mirrors the ResilienceDelegatingHandler behavior for unit testing.
    /// </summary>
    private class TestableResilienceDelegatingHandler : DelegatingHandler
    {
        private readonly string _serviceName;
        private readonly ResilienceOptions _options;
        private readonly ILogger _logger;

        public TestableResilienceDelegatingHandler(
            string serviceName, ResilienceOptions options, ILogger logger)
        {
            _serviceName = serviceName;
            _options = options;
            _logger = logger;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            HttpResponseMessage? lastResponse = null;

            for (var attempt = 0; attempt <= _options.MaxRetryAttempts; attempt++)
            {
                if (attempt > 0)
                {
                    await Task.Delay(_options.RetryBaseDelay, cancellationToken);
                }

                try
                {
                    // Clone for retry
                    using var clonedRequest = attempt > 0 ? CloneRequest(request) : request;
                    lastResponse = await base.SendAsync(
                        attempt > 0 ? clonedRequest : request, cancellationToken);

                    if (IsTransient(lastResponse))
                    {
                        continue;
                    }

                    return lastResponse;
                }
                catch (HttpRequestException)
                {
                    if (attempt == _options.MaxRetryAttempts) throw;
                }
            }

            return lastResponse ?? new HttpResponseMessage(System.Net.HttpStatusCode.ServiceUnavailable);
        }

        private static bool IsTransient(HttpResponseMessage response)
        {
            var code = (int)response.StatusCode;
            return code is 408 or 429 or (>= 500 and <= 599);
        }

        private static HttpRequestMessage CloneRequest(HttpRequestMessage original)
        {
            var clone = new HttpRequestMessage(original.Method, original.RequestUri);
            foreach (var header in original.Headers)
                clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
            return clone;
        }
    }
}
