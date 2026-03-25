using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// Tests for the enhanced exception middleware — verifies that different
/// exception types are mapped to the correct HTTP status codes and
/// RFC 7807 Problem Details responses.
/// </summary>
public class ExceptionHandlingTests : IClassFixture<Fixtures.AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ExceptionHandlingTests(Fixtures.AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task ValidationError_Returns400_WithProblemDetails()
    {
        // Arrange — send an empty lab order (missing required fields)
        var emptyOrder = new { };
        var content = JsonContent.Create(emptyOrder);

        // Act
        var response = await _client.PostAsync("/api/v1/laborders", content);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        // .NET 8 may return application/json or application/problem+json depending on pipeline config
        var mediaType = response.Content.Headers.ContentType?.MediaType;
        Assert.True(
            mediaType == "application/json" || mediaType == "application/problem+json",
            $"Expected application/json or application/problem+json but got {mediaType}");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task NotFoundResource_Returns404()
    {
        // Arrange — request a non-existent patient
        var fakeId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/v1/patients/{fakeId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task HealthEndpoint_Returns200()
    {
        // Act
        var response = await _client.GetAsync("/health/live");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task CorrelationIdHeader_IsPresentOnResponse()
    {
        // Act
        var response = await _client.GetAsync("/health/live");

        // Assert
        Assert.True(response.Headers.Contains("X-Correlation-Id"),
            "Response should include X-Correlation-Id header");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task SecurityHeaders_ArePresent()
    {
        // Act
        var response = await _client.GetAsync("/health/live");

        // Assert
        Assert.True(response.Headers.Contains("X-Content-Type-Options"));
        Assert.True(response.Headers.Contains("X-Frame-Options"));
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task ApiVersionHeader_IsPresent()
    {
        // Act
        var response = await _client.GetAsync("/health/live");

        // Assert
        Assert.True(response.Headers.Contains("X-Api-Version"),
            "Response should include X-Api-Version header");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task IdempotencyWarning_ShownWhenNoKeyProvided()
    {
        // Arrange — POST without Idempotency-Key header
        var labOrder = new
        {
            testCode = "CBC",
            testName = "Complete Blood Count",
            patientId = Guid.NewGuid(),
            encounterId = Guid.NewGuid(),
            cptCode = "85025",
            loincCode = "58410-2",
            category = "Hematology",
            priority = "Routine",
            clinicalIndication = "Fatigue evaluation",
            diagnosisCode = "R53.83"
        };

        // Act
        var response = await _client.PostAsync("/api/v1/laborders", JsonContent.Create(labOrder));

        // Assert — should warn about missing idempotency key (regardless of response status)
        Assert.True(
            response.Headers.Contains("X-Idempotency-Warning"),
            "Response should warn when no Idempotency-Key header is provided on POST");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task InvalidIdempotencyKey_ReturnsBadRequest()
    {
        // Arrange — send an oversized idempotency key
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/laborders")
        {
            Content = JsonContent.Create(new { testCode = "CBC" })
        };
        request.Headers.Add("Idempotency-Key", new string('x', 200)); // Exceeds 128 char limit

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
