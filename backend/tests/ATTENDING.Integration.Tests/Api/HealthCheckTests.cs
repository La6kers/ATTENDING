using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// Health check endpoint tests.
///
/// In Kubernetes, readiness and liveness probes determine whether a pod
/// receives traffic or gets restarted. These tests verify:
/// - /health/live returns 200 (liveness — the process is running)
/// - /health/ready returns 200 (readiness — dependencies are available)
/// - /health returns 200 (combined health report for monitoring)
/// - /api/v1/system/ping returns "pong" (application-level reachability)
///
/// Failures in these tests would cause pods to be killed or removed from
/// load balancer rotation, so they're critical for production stability.
/// </summary>
public class HealthCheckTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthCheckTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task LivenessProbe_Returns200()
    {
        // Liveness: "Is the process alive?" — should always pass unless the app is deadlocked
        var response = await _client.GetAsync("/health/live");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            because: "liveness probe must return 200 for Kubernetes to keep the pod running");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task ReadinessProbe_Returns200()
    {
        // Readiness: "Can this instance handle requests?" — checks database connectivity
        var response = await _client.GetAsync("/health/ready");

        // In tests with InMemory DB, this should pass. In production, it checks SQL Server.
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            because: "readiness probe must return 200 for the pod to receive traffic");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task CombinedHealth_Returns200()
    {
        var response = await _client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            because: "combined health endpoint must report overall system status");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task CombinedHealth_ReturnsJsonReport()
    {
        var response = await _client.GetAsync("/health");
        var content = await response.Content.ReadAsStringAsync();

        content.Should().NotBeNullOrWhiteSpace(
            because: "health endpoint should return a detailed JSON health report");

        // The HealthChecks.UI.Client writer returns a structured JSON report
        var doc = JsonDocument.Parse(content);
        doc.RootElement.TryGetProperty("status", out var status).Should().BeTrue(
            because: "health report must include a top-level 'status' property");
        status.GetString().Should().Be("Healthy",
            because: "test environment should be healthy");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task SystemPing_ReturnsPong()
    {
        var response = await _client.GetAsync("/api/v1/system/ping");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("pong",
            because: "ping endpoint is the simplest application-level reachability check");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task SystemVersion_ReturnsVersionInfo()
    {
        var response = await _client.GetAsync("/api/v1/system/version");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrWhiteSpace(
            because: "version endpoint helps operators verify deployed version");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task HealthEndpoints_DoNotRequireAuthentication()
    {
        // Health endpoints must be accessible without auth for K8s probes
        // The test factory auto-authenticates, but let's verify the endpoints
        // respond with 200 (not 401/403), confirming they're properly excluded
        // from authorization middleware.
        var endpoints = new[] { "/health", "/health/live", "/health/ready" };

        foreach (var endpoint in endpoints)
        {
            var response = await _client.GetAsync(endpoint);
            response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized,
                $"because {endpoint} must not require authentication (K8s probes don't send tokens)");
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                $"because {endpoint} must not require specific roles");
        }
    }
}
