using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

public class MiddlewareTests : IClassFixture<Fixtures.AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;

    public MiddlewareTests(Fixtures.AttendingWebApplicationFactory factory)
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
    public async Task ProtectedEndpoint_WithoutAuth_ShouldReturn401()
    {
        var response = await _client.GetAsync("/api/v1/patients/search");
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }
}
