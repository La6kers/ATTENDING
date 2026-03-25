using System.Net;
using System.Net.Http.Json;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using ATTENDING.Integration.Tests.Fixtures;
using FluentAssertions;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// Tests for the Tiered Clinical Intelligence endpoint (POST /api/v1/ai/intelligence).
/// Validates the full Tier 0 pipeline: context assembly → guidelines → red flags → drug interactions.
/// </summary>
public class ClinicalIntelligenceEndpointTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ClinicalIntelligenceEndpointTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Intelligence_WithValidPatient_ReturnsTier0Results()
    {
        // Arrange — create a patient via the API first
        var createPatientRequest = new
        {
            Mrn = $"INT-{Guid.NewGuid():N}"[..12],
            FirstName = "Intelligence",
            LastName = "TestPatient",
            DateOfBirth = new DateTime(1960, 3, 15),
            Sex = "Male"
        };

        var createResponse = await _client.PostAsJsonAsync("/api/v1/patients", createPatientRequest);
        createResponse.EnsureSuccessStatusCode();
        var patientId = ExtractIdFromLocation(createResponse.Headers.Location?.ToString());

        // Act — call the intelligence endpoint
        var request = new ClinicalIntelligenceRequest(patientId);
        var response = await _client.PostAsJsonAsync("/api/v1/ai/intelligence", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ClinicalIntelligenceResponse>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.TiersExecuted.Should().Contain("Tier0_PureDomain");
        result.TotalLatency.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Intelligence_WithNonExistentPatient_Returns404()
    {
        var request = new ClinicalIntelligenceRequest(Guid.NewGuid());
        var response = await _client.PostAsJsonAsync("/api/v1/ai/intelligence", request);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Intelligence_GuidelineResults_ContainStructuredData()
    {
        // Arrange — create patient
        var createRequest = new
        {
            Mrn = $"GDL-{Guid.NewGuid():N}"[..12],
            FirstName = "Guideline",
            LastName = "TestPatient",
            DateOfBirth = new DateTime(1975, 8, 20),
            Sex = "Female"
        };

        var createResponse = await _client.PostAsJsonAsync("/api/v1/patients", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var patientId = ExtractIdFromLocation(createResponse.Headers.Location?.ToString());

        // Act
        var request = new ClinicalIntelligenceRequest(patientId);
        var response = await _client.PostAsJsonAsync("/api/v1/ai/intelligence", request);

        // Assert — response is structured correctly
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<ClinicalIntelligenceResponse>();
        result.Should().NotBeNull();

        // Guideline results should be a list (may be empty if no chief complaint matches)
        result!.GuidelineResults.Should().NotBeNull();
        result.RedFlags.Should().NotBeNull();
        result.DrugInteractions.Should().NotBeNull();

        // Context should be populated
        result.Context.Should().NotBeNull();
        result.Context.ActiveConditionCount.Should().BeGreaterThanOrEqualTo(0);
        result.Context.ActiveMedicationCount.Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task Intelligence_ResponseShape_MatchesContract()
    {
        // Arrange
        var createRequest = new
        {
            Mrn = $"SHP-{Guid.NewGuid():N}"[..12],
            FirstName = "Shape",
            LastName = "Validator",
            DateOfBirth = new DateTime(1985, 1, 1),
            Sex = "Male"
        };

        var createResponse = await _client.PostAsJsonAsync("/api/v1/patients", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var patientId = ExtractIdFromLocation(createResponse.Headers.Location?.ToString());

        // Act
        var request = new ClinicalIntelligenceRequest(patientId);
        var response = await _client.PostAsJsonAsync("/api/v1/ai/intelligence", request);

        // Assert full contract shape via JSON property names
        var json = await response.Content.ReadAsStringAsync();
        json.Should().Contain("\"success\"");
        json.Should().Contain("\"context\"");
        json.Should().Contain("\"guidelineResults\"");
        json.Should().Contain("\"redFlags\"");
        json.Should().Contain("\"drugInteractions\"");
        json.Should().Contain("\"tiersExecuted\"");
        json.Should().Contain("\"totalLatency\"");
    }

    private static Guid ExtractIdFromLocation(string? location)
    {
        if (string.IsNullOrEmpty(location)) return Guid.Empty;
        var parts = location.TrimEnd('/').Split('/');
        return Guid.TryParse(parts[^1], out var id) ? id : Guid.Empty;
    }
}
