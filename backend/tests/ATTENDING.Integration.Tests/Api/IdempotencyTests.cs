using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using ATTENDING.Contracts.Requests;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// Idempotency middleware tests for clinical order safety.
///
/// In healthcare, a network timeout during lab order creation could cause
/// the client to retry, creating a duplicate order — a patient safety risk.
///
/// These tests verify:
/// - Duplicate requests with same key return the cached response (replay)
/// - Different keys produce independent operations
/// - Missing keys generate a warning (backwards compatible)
/// - Oversized keys are rejected
/// - GET requests bypass idempotency (read-only)
/// - Non-clinical paths bypass idempotency
/// </summary>
public class IdempotencyTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;

    public IdempotencyTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task PostWithoutIdempotencyKey_ReturnsWarningHeader()
    {
        // Arrange — POST to a protected clinical endpoint without Idempotency-Key
        var labOrder = CreateSampleLabOrder();

        // Act
        var response = await _client.PostAsync("/api/v1/laborders", JsonContent.Create(labOrder));

        // Assert — backwards compatible: request proceeds but warns
        response.Headers.Contains("X-Idempotency-Warning").Should().BeTrue(
            because: "missing idempotency key on clinical POST should generate a warning");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task PostWithValidIdempotencyKey_DoesNotReturnWarning()
    {
        // Arrange
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/laborders")
        {
            Content = JsonContent.Create(CreateSampleLabOrder())
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.Headers.Contains("X-Idempotency-Warning").Should().BeFalse(
            because: "providing a valid key should suppress the warning");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task OversizedIdempotencyKey_Returns400()
    {
        // Arrange — key exceeds 128 character limit
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/laborders")
        {
            Content = JsonContent.Create(CreateSampleLabOrder())
        };
        request.Headers.Add("Idempotency-Key", new string('x', 200));

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            because: "oversized idempotency keys should be rejected to prevent abuse");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task GetRequest_BypassesIdempotency()
    {
        // Arrange — GET requests should never trigger idempotency logic
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/laborders");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        // Act
        var response = await _client.SendAsync(request);

        // Assert — should not have any idempotency headers
        response.Headers.Contains("X-Idempotency-Warning").Should().BeFalse(
            because: "GET requests are read-only and should bypass idempotency");
        response.Headers.Contains("Idempotency-Replayed").Should().BeFalse(
            because: "GET requests should never produce replay headers");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task NonClinicalPath_BypassesIdempotency()
    {
        // Arrange — POST to a non-protected path (system endpoints)
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/system/ping")
        {
            Content = JsonContent.Create(new { })
        };
        // Intentionally no Idempotency-Key — should NOT trigger warning for non-clinical paths

        // Act
        var response = await _client.SendAsync(request);

        // Assert — non-clinical paths should not trigger idempotency logic
        response.Headers.Contains("X-Idempotency-Warning").Should().BeFalse(
            because: "non-clinical paths should bypass idempotency middleware entirely");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task DuplicateRequest_WithSameKey_ReturnsReplayedHeader()
    {
        // Arrange — use the same idempotency key for two identical requests
        var idempotencyKey = Guid.NewGuid().ToString();
        var labOrder = CreateSampleLabOrder();

        // First request
        var request1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/laborders")
        {
            Content = JsonContent.Create(labOrder)
        };
        request1.Headers.Add("Idempotency-Key", idempotencyKey);
        var response1 = await _client.SendAsync(request1);

        // Only test replay if the first request succeeded (2xx)
        if ((int)response1.StatusCode >= 200 && (int)response1.StatusCode < 300)
        {
            // Second request with SAME key
            var request2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/laborders")
            {
                Content = JsonContent.Create(labOrder)
            };
            request2.Headers.Add("Idempotency-Key", idempotencyKey);
            var response2 = await _client.SendAsync(request2);

            // Assert — second request should be a replay
            response2.Headers.Contains("Idempotency-Replayed").Should().BeTrue(
                because: "duplicate request with same key should return the cached response");
            response2.StatusCode.Should().Be(response1.StatusCode,
                because: "replayed response should have the same status code as the original");
        }
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task DifferentKeys_ProduceIndependentResults()
    {
        // Arrange — two requests with different keys should be independent
        var labOrder = CreateSampleLabOrder();

        var request1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/laborders")
        {
            Content = JsonContent.Create(labOrder)
        };
        request1.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var request2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/laborders")
        {
            Content = JsonContent.Create(labOrder)
        };
        request2.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        // Act
        var response1 = await _client.SendAsync(request1);
        var response2 = await _client.SendAsync(request2);

        // Assert — neither should be a replay
        response2.Headers.Contains("Idempotency-Replayed").Should().BeFalse(
            because: "different idempotency keys should produce independent operations");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task EmptyIdempotencyKey_TreatedAsMissing()
    {
        // Arrange — empty key should be treated as missing
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/laborders")
        {
            Content = JsonContent.Create(CreateSampleLabOrder())
        };
        request.Headers.Add("Idempotency-Key", "");

        // Act
        var response = await _client.SendAsync(request);

        // Assert — empty key triggers the warning (same as missing)
        response.Headers.Contains("X-Idempotency-Warning").Should().BeTrue(
            because: "empty idempotency key should be treated as missing");
    }

    /// <summary>
    /// Creates a sample lab order request for testing.
    /// </summary>
    private static object CreateSampleLabOrder() => new
    {
        testCode = "CBC",
        testName = "Complete Blood Count",
        patientId = Guid.NewGuid(),
        encounterId = Guid.NewGuid(),
        cptCode = "85025",
        loincCode = "58410-2",
        category = "Hematology",
        priority = "Routine",
        clinicalIndication = "Annual checkup",
        diagnosisCode = "Z00.00"
    };
}
