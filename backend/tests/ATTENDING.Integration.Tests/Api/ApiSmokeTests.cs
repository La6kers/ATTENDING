using System.Net;
using FluentAssertions;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// Smoke tests to verify the API boots and critical endpoints respond
/// </summary>
public class ApiSmokeTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ApiSmokeTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthCheck_ShouldReturnOk()
    {
        var response = await _client.GetAsync("/health");
        // Health check may return 200 or 503 depending on dependencies,
        // but the endpoint should exist and respond
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.ServiceUnavailable);
    }

    [Theory]
    [InlineData("/api/v1/laborders/pending")]
    [InlineData("/api/v1/laborders/critical")]
    [InlineData("/api/v1/assessments/pending-review")]
    [InlineData("/api/v1/assessments/red-flags")]
    [InlineData("/api/v1/patients/search")]
    [InlineData("/api/v1/encounters/schedule/today")]
    [InlineData("/api/v1/ai/feedback/stats")]
    [InlineData("/api/v1/admin/dashboard")]
    [InlineData("/api/v1/admin/features")]
    [InlineData("/api/v1/admin/alerts")]
    [InlineData("/api/v1/admin/rate-limits")]
    [InlineData("/api/v1/analytics/outcomes")]
    [InlineData("/api/v1/analytics/quality/dashboard")]
    [InlineData("/api/v1/analytics/quality/care-gaps")]
    [InlineData("/api/v1/analytics/quality/measures")]
    [InlineData("/api/v1/ai/feedback/history")]
    public async Task ListEndpoints_ShouldNotReturn500(string endpoint)
    {
        var response = await _client.GetAsync(endpoint);
        // With dev auth bypass, these should return 200 with empty arrays
        // Without auth, they return 401. Either way, not 500.
        ((int)response.StatusCode).Should().BeLessThan(500);
    }

    [Fact]
    public async Task SwaggerEndpoint_ShouldRespond()
    {
        var response = await _client.GetAsync("/swagger/v1/swagger.json");
        ((int)response.StatusCode).Should().BeLessThan(500);
    }
}



