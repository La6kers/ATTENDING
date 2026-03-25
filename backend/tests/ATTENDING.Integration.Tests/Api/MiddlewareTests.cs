using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// Middleware integration tests.
///
/// Verifies the middleware pipeline produces the correct response headers
/// and behaves correctly for various request scenarios. Tests run against
/// the in-memory test application via AttendingWebApplicationFactory.
/// </summary>
public class MiddlewareTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;

    public MiddlewareTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    [Fact]
    public async Task Requests_ShouldHaveCorrelationIdHeader()
    {
        var response = await _client.GetAsync("/health");

        response.Headers.Should().ContainKey("X-Correlation-Id");
        var correlationId = response.Headers.GetValues("X-Correlation-Id").First();
        correlationId.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Requests_WithCorrelationId_ShouldEchoItBack()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("X-Correlation-Id", "test-correlation-123");

        var response = await _client.SendAsync(request);

        var correlationId = response.Headers.GetValues("X-Correlation-Id").First();
        correlationId.Should().Be("test-correlation-123");
    }

    [Fact]
    public async Task Requests_ShouldHaveApiVersionHeader()
    {
        var response = await _client.GetAsync("/health");

        response.Headers.Should().ContainKey("X-Api-Version");
        response.Headers.GetValues("X-Api-Version").First().Should().Be("1.0");
    }

    [Fact]
    public async Task Requests_ShouldHaveSecurityHeaders()
    {
        var response = await _client.GetAsync("/health");

        response.Headers.Should().ContainKey("X-Content-Type-Options");
        response.Headers.Should().ContainKey("X-Frame-Options");
    }

    [Fact]
    public async Task Swagger_InTestingEnv_ShouldReturn200()
    {
        var response = await _client.GetAsync("/swagger/v1/swagger.json");
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
    }

    [Fact]
    public async Task NotFoundRoute_ShouldNotReturn500()
    {
        var response = await _client.GetAsync("/api/v1/nonexistent-endpoint");

        var statusCode = (int)response.StatusCode;
        statusCode.Should().NotBe(500);
    }

    [Fact]
    public async Task AuthenticatedEndpoint_WithTestAuth_ShouldReturn200()
    {
        // With TestAuthHandler installed, all requests are auto-authenticated
        // so protected endpoints should be accessible in the test environment
        var response = await _client.GetAsync("/api/v1/patients/search?q=test");
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
    }

    [Fact]
    public async Task SecurityHeaders_XFrameOptions_ShouldBeDeny()
    {
        var response = await _client.GetAsync("/health");
        response.Headers.GetValues("X-Frame-Options").First().Should().Be("DENY");
    }

    [Fact]
    public async Task SecurityHeaders_XContentTypeOptions_ShouldBeNoSniff()
    {
        var response = await _client.GetAsync("/health");
        response.Headers.GetValues("X-Content-Type-Options").First().Should().Be("nosniff");
    }

    [Fact]
    public async Task CorrelationId_WhenNotProvided_ShouldBeGenerated()
    {
        // Send request without providing a Correlation-Id
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        var response = await _client.SendAsync(request);

        response.Headers.Should().ContainKey("X-Correlation-Id");
        var correlationId = response.Headers.GetValues("X-Correlation-Id").First();

        // Should be a non-empty generated ID, not a reflection of a header we sent
        correlationId.Should().NotBeNullOrWhiteSpace();
        correlationId.Length.Should().BeGreaterThan(4,
            because: "auto-generated correlation IDs should be substantial identifiers, not trivial strings");
    }
}
