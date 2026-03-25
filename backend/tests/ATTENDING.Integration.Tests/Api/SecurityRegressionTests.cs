using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using ATTENDING.Contracts.Requests;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// Security regression tests.
/// Verifies that the API correctly handles malicious inputs, SQL injection attempts,
/// oversized payloads, and other adversarial inputs — including clinical-safe
/// SQL injection detection that avoids false positives on medical terminology.
/// </summary>
public class SecurityRegressionTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;

    public SecurityRegressionTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ----------------------------------------------------------------
    // SQL Injection — General
    // ----------------------------------------------------------------

    [Theory]
    [InlineData("'; DROP TABLE Patients; --")]
    [InlineData("1 OR 1=1")]
    [InlineData("\" OR \"\"=\"")]
    [InlineData("1; SELECT * FROM Users")]
    [InlineData("admin'--")]
    public async Task PatientSearch_SqlInjectionAttempts_ShouldNotReturn500(string payload)
    {
        var response = await _client.GetAsync($"/api/v1/patients/search?q={Uri.EscapeDataString(payload)}");

        // Should return 200 (empty results) or 400 (rejected), never 500
        ((int)response.StatusCode).Should().BeLessThan(500,
            because: $"SQL injection payload '{payload}' should be handled safely");
    }

    [Theory]
    [InlineData("'; DROP TABLE LabOrders; --")]
    [InlineData("1 UNION SELECT * FROM AuditLogs")]
    [InlineData("xp_cmdshell('net user')")]
    public async Task LabOrders_SqlInjectionInQueryParams_ShouldNotReturn500(string payload)
    {
        var response = await _client.GetAsync($"/api/v1/laborders/pending?filter={Uri.EscapeDataString(payload)}");
        ((int)response.StatusCode).Should().BeLessThan(500);
    }

    // ----------------------------------------------------------------
    // Clinical-Safe SQL Injection Detection
    // False positives: medical terms should NOT be blocked
    // ----------------------------------------------------------------

    [Theory]
    [InlineData("STAT order")]            // Contains "STAT" — clinical order priority
    [InlineData("Select serotonin")]       // "Select" as medical term
    [InlineData("Drop foot condition")]    // "DROP" as a clinical condition
    [InlineData("patient has union status change")]  // "UNION" in a sentence
    [InlineData("INSERT catheter procedure")]         // "INSERT" clinical procedure
    [InlineData("UPDATE vaccination record")]         // "UPDATE" medical record
    public async Task PatientSearch_ClinicalTermsThatLookLikeSql_ShouldNotBeBlocked(string clinicalTerm)
    {
        var response = await _client.GetAsync($"/api/v1/patients/search?q={Uri.EscapeDataString(clinicalTerm)}");

        // These are legitimate clinical search terms — should never be incorrectly blocked as SQL injection
        // Acceptable: 200 (results found), 200 (empty results)
        // Not acceptable: 400 (false positive block), 500 (crash)
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            because: $"'{clinicalTerm}' is a legitimate clinical term and should not be blocked as SQL injection");
    }

    // ----------------------------------------------------------------
    // XSS Prevention
    // ----------------------------------------------------------------

    [Theory]
    [InlineData("<script>alert('xss')</script>")]
    [InlineData("javascript:alert(1)")]
    [InlineData("<img src=x onerror=alert(1)>")]
    public async Task PatientCreate_XssPayloads_ShouldNotReturn500(string xssPayload)
    {
        var request = new CreatePatientRequest(
            MRN: $"XSS-{Guid.NewGuid():N}"[..12],
            FirstName: xssPayload,
            LastName: "Test",
            DateOfBirth: new DateTime(1990, 1, 1),
            Sex: "Male",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English");

        var response = await _client.PostAsJsonAsync("/api/v1/patients", request);

        // Should handle safely - store escaped or reject, but never 500
        ((int)response.StatusCode).Should().BeLessThan(500,
            because: $"XSS payload should be handled safely");
    }

    // ----------------------------------------------------------------
    // Oversized Payloads
    // ----------------------------------------------------------------

    [Fact]
    public async Task PatientSearch_OversizedQuery_ShouldNotReturn500()
    {
        var oversizedQuery = new string('A', 10_000);
        var response = await _client.GetAsync($"/api/v1/patients/search?q={Uri.EscapeDataString(oversizedQuery)}");
        ((int)response.StatusCode).Should().BeLessThan(500);
    }

    [Fact]
    public async Task PostEndpoints_OversizedBody_ShouldReturn413Or400()
    {
        var oversizedBody = new string('X', 100_000);
        var content = new StringContent($"{{\"data\":\"{oversizedBody}\"}}", System.Text.Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/patients", content);

        // Should reject, not crash
        ((int)response.StatusCode).Should().BeGreaterThanOrEqualTo(400);
    }

    // ----------------------------------------------------------------
    // Path Traversal
    // ----------------------------------------------------------------

    [Theory]
    [InlineData("../../../etc/passwd")]
    [InlineData("..%2F..%2F..%2Fetc%2Fpasswd")]
    [InlineData("%2e%2e%2f%2e%2e%2f")]
    public async Task Endpoints_PathTraversalAttempts_ShouldReturn404(string payload)
    {
        var response = await _client.GetAsync($"/api/v1/patients/mrn/{Uri.EscapeDataString(payload)}");
        ((int)response.StatusCode).Should().BeOneOf(400, 404);
    }

    // ----------------------------------------------------------------
    // GUID Validation
    // ----------------------------------------------------------------

    [Theory]
    [InlineData("not-a-guid")]
    [InlineData("12345")]
    [InlineData("'; DROP TABLE--")]
    [InlineData("00000000000000000000000000000000")] // No hyphens
    public async Task Endpoints_InvalidGuids_ShouldReturn404Or400(string invalidId)
    {
        var response = await _client.GetAsync($"/api/v1/patients/{invalidId}");
        ((int)response.StatusCode).Should().BeOneOf(400, 404);
    }

    // ----------------------------------------------------------------
    // HTTP Method Enforcement
    // ----------------------------------------------------------------

    [Fact]
    public async Task ReadOnlyEndpoints_DeleteMethod_ShouldReturn405()
    {
        var response = await _client.DeleteAsync("/api/v1/system/ping");
        ((int)response.StatusCode).Should().BeOneOf(405, 404);
    }

    [Fact]
    public async Task GetEndpoints_PutMethod_ShouldReturn405()
    {
        var response = await _client.PutAsJsonAsync("/api/v1/system/version", new { });
        ((int)response.StatusCode).Should().BeOneOf(405, 404);
    }

    // ----------------------------------------------------------------
    // Content Type Enforcement
    // ----------------------------------------------------------------

    [Fact]
    public async Task PostEndpoints_WrongContentType_ShouldReturn415()
    {
        var content = new StringContent("<xml>data</xml>", System.Text.Encoding.UTF8, "text/xml");
        var response = await _client.PostAsync("/api/v1/patients", content);
        ((int)response.StatusCode).Should().BeOneOf(400, 415);
    }

    // ----------------------------------------------------------------
    // Rate Limit Headers
    // ----------------------------------------------------------------

    [Fact]
    public async Task Responses_ShouldNotExposeServerInformation()
    {
        var response = await _client.GetAsync("/api/v1/system/ping");

        // Should not expose server details in headers
        response.Headers.Contains("Server").Should().BeFalse(
            because: "Server header exposes infrastructure details");
    }

    // ----------------------------------------------------------------
    // Null / Empty Payloads
    // ----------------------------------------------------------------

    [Fact]
    public async Task PostEndpoints_NullBody_ShouldReturn400()
    {
        var content = new StringContent("null", System.Text.Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/patients", content);
        ((int)response.StatusCode).Should().Be(400);
    }

    [Fact]
    public async Task PostEndpoints_EmptyBody_ShouldReturn400()
    {
        var content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/patients", content);
        ((int)response.StatusCode).Should().Be(400);
    }

    // ----------------------------------------------------------------
    // Request Validation
    // ----------------------------------------------------------------

    [Fact]
    public async Task PatientCreate_MissingRequiredFields_ShouldReturn400WithValidationDetails()
    {
        // Missing MRN, FirstName, LastName (required)
        var content = new StringContent(
            "{\"dateOfBirth\":\"1990-01-01\",\"sex\":\"Male\"}",
            System.Text.Encoding.UTF8, "application/json");

        var response = await _client.PostAsync("/api/v1/patients", content);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ----------------------------------------------------------------
    // Exception Handling — Unhandled Errors Should Not Leak Details
    // ----------------------------------------------------------------

    [Fact]
    public async Task UnhandledErrors_ShouldNotLeakStackTrace()
    {
        // Intentionally invalid GUID in route to trigger error path
        var response = await _client.GetAsync("/api/v1/patients/00000000-0000-0000-0000-000000000000");

        if (response.StatusCode == HttpStatusCode.NotFound ||
            response.StatusCode == HttpStatusCode.OK)
            return; // Fine paths

        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("at ATTENDING", because: "stack traces should not be exposed in production-like responses");
        body.Should().NotContain("System.Exception", because: "exception types should not be exposed");
    }
}
