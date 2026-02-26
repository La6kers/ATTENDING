using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ATTENDING.Contracts.Requests;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// HTTP-level controller integration tests.
/// Tests the full request pipeline: routing, auth, validation, response serialisation.
/// These tests run against an in-memory database via AttendingWebApplicationFactory.
/// </summary>
public class ControllerIntegrationTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public ControllerIntegrationTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ----------------------------------------------------------------
    // Health & System
    // ----------------------------------------------------------------

    [Fact]
    public async Task Health_Live_ShouldReturn200()
    {
        var response = await _client.GetAsync("/health/live");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Health_Ready_ShouldRespond()
    {
        var response = await _client.GetAsync("/health/ready");
        ((int)response.StatusCode).Should().BeOneOf(200, 503);
    }

    [Fact]
    public async Task SystemVersion_ShouldReturnVersionInfo()
    {
        var response = await _client.GetAsync("/api/v1/system/version");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("apiVersion");
    }

    [Fact]
    public async Task SystemPing_ShouldReturnPong()
    {
        var response = await _client.GetAsync("/api/v1/system/ping");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("status").GetString().Should().Be("pong");
    }

    [Fact]
    public async Task CacheStats_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/system/cache/stats");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ----------------------------------------------------------------
    // Patients Controller
    // ----------------------------------------------------------------

    [Fact]
    public async Task Patients_Create_ValidRequest_ShouldReturn201()
    {
        var request = new CreatePatientRequest(
            MRN: $"INT-{Guid.NewGuid():N}"[..12],
            FirstName: "Integration",
            LastName: "Test",
            DateOfBirth: new DateTime(1990, 1, 1),
            Sex: "Male",
            Phone: "555-0100",
            Email: "int.test@example.com",
            AddressLine1: null,
            City: null,
            State: null,
            ZipCode: null,
            PrimaryLanguage: "English");

        var response = await _client.PostAsJsonAsync("/api/v1/patients", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
    }

    [Fact]
    public async Task Patients_Create_DuplicateMRN_ShouldReturn409()
    {
        var mrn = $"DUP-{Guid.NewGuid():N}"[..12];
        var request = new CreatePatientRequest(
            MRN: mrn, FirstName: "First", LastName: "Patient",
            DateOfBirth: new DateTime(1985, 6, 15), Sex: "Female",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English");

        // Create first time
        var first = await _client.PostAsJsonAsync("/api/v1/patients", request);
        first.StatusCode.Should().Be(HttpStatusCode.Created);

        // Attempt duplicate
        var second = await _client.PostAsJsonAsync("/api/v1/patients", request);
        ((int)second.StatusCode).Should().BeOneOf(400, 409);
    }

    [Fact]
    public async Task Patients_GetById_NotFound_ShouldReturn404()
    {
        var response = await _client.GetAsync($"/api/v1/patients/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Patients_Search_ShouldReturn200WithPagedResult()
    {
        var response = await _client.GetAsync("/api/v1/patients/search?q=Test&page=1&pageSize=10");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("items");
    }

    [Fact]
    public async Task Patients_Search_EmptyQuery_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/patients/search");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Patients_Create_ThenGetByMrn_ShouldSucceed()
    {
        var mrn = $"MRN-{Guid.NewGuid():N}"[..12];
        var createReq = new CreatePatientRequest(
            MRN: mrn, FirstName: "Fetch", LastName: "Test",
            DateOfBirth: new DateTime(1975, 3, 22), Sex: "Male",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English");

        var created = await _client.PostAsJsonAsync("/api/v1/patients", createReq);
        created.StatusCode.Should().Be(HttpStatusCode.Created);

        var fetched = await _client.GetAsync($"/api/v1/patients/mrn/{mrn}");
        fetched.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await fetched.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("mrn").GetString().Should().Be(mrn);
    }

    [Fact]
    [Trait("Category", "Docker")] // InMemory provider can't handle Update pattern for adding allergies
    public async Task Patients_AddAllergy_ValidRequest_ShouldReturn201()
    {
        // Create patient first
        var mrn = $"ALC-{Guid.NewGuid():N}"[..12];
        var createReq = new CreatePatientRequest(
            MRN: mrn, FirstName: "Allergy", LastName: "Patient",
            DateOfBirth: new DateTime(1980, 8, 10), Sex: "Female",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English");

        var created = await _client.PostAsJsonAsync("/api/v1/patients", createReq);
        var location = created.Headers.Location!.ToString();
        var patientId = location.Split('/').Last();

        // Add allergy
        var allergyReq = new AddAllergyRequest("Penicillin", "Severe", "Anaphylaxis");
        var response = await _client.PostAsJsonAsync($"/api/v1/patients/{patientId}/allergies", allergyReq);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Patients_AddAllergy_InvalidSeverity_ShouldReturn400()
    {
        var response = await _client.PostAsJsonAsync(
            $"/api/v1/patients/{Guid.NewGuid()}/allergies",
            new { allergen = "Aspirin", severity = "INVALID_SEVERITY", reaction = "Rash" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ----------------------------------------------------------------
    // Encounters Controller
    // ----------------------------------------------------------------

    [Fact]
    public async Task Encounters_TodaysSchedule_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/encounters/schedule/today");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Encounters_GetById_NotFound_ShouldReturn404()
    {
        var response = await _client.GetAsync($"/api/v1/encounters/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Encounters_Create_ValidRequest_ShouldReturn201()
    {
        // Create patient first
        var mrn = $"ENC-{Guid.NewGuid():N}"[..12];
        var patientReq = new CreatePatientRequest(
            MRN: mrn, FirstName: "Enc", LastName: "Patient",
            DateOfBirth: new DateTime(1990, 5, 5), Sex: "Male",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English");

        var patientResp = await _client.PostAsJsonAsync("/api/v1/patients", patientReq);
        patientResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var patientLoc = patientResp.Headers.Location!.ToString();
        var patientId = Guid.Parse(patientLoc.Split('/').Last());

        // Create encounter
        var encounterReq = new CreateEncounterRequest(patientId, "Office Visit", DateTime.UtcNow.AddHours(1), null);
        var response = await _client.PostAsJsonAsync("/api/v1/encounters", encounterReq);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
    }

    [Fact]
    public async Task Encounters_Create_NonExistentPatient_ShouldReturn404()
    {
        var request = new CreateEncounterRequest(Guid.NewGuid(), "Office Visit", null, null);
        var response = await _client.PostAsJsonAsync("/api/v1/encounters", request);

        ((int)response.StatusCode).Should().BeOneOf(400, 404);
    }

    [Fact]
    [Trait("Category", "Docker")] // InMemory provider loses entity tracking after state transitions
    public async Task Encounters_Workflow_CheckIn_Start_Complete()
    {
        // Create patient
        var mrn = $"WF-{Guid.NewGuid():N}"[..12];
        var patientResp = await _client.PostAsJsonAsync("/api/v1/patients", new CreatePatientRequest(
            MRN: mrn, FirstName: "Workflow", LastName: "Test",
            DateOfBirth: new DateTime(1985, 1, 1), Sex: "Male",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English"));
        var patientId = Guid.Parse(patientResp.Headers.Location!.ToString().Split('/').Last());

        // Create encounter
        var encResp = await _client.PostAsJsonAsync("/api/v1/encounters",
            new CreateEncounterRequest(patientId, "Office Visit", null, null));
        encResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var encId = Guid.Parse(encResp.Headers.Location!.ToString().Split('/').Last());

        // Check in
        var checkIn = await _client.PostAsync($"/api/v1/encounters/{encId}/check-in", null);
        checkIn.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Start
        var start = await _client.PostAsJsonAsync($"/api/v1/encounters/{encId}/start",
            new { chiefComplaint = "Routine checkup" });
        start.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Complete
        var complete = await _client.PostAsync($"/api/v1/encounters/{encId}/complete", null);
        complete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify final state
        var fetched = await _client.GetAsync($"/api/v1/encounters/{encId}");
        fetched.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await fetched.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("status").GetString().Should().Be("Completed");
    }

    // ----------------------------------------------------------------
    // Lab Orders Controller
    // ----------------------------------------------------------------

    [Fact]
    public async Task LabOrders_Pending_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/laborders/pending");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task LabOrders_CriticalResults_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/laborders/critical");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task LabOrders_GetById_NotFound_ShouldReturn404()
    {
        var response = await _client.GetAsync($"/api/v1/laborders/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ----------------------------------------------------------------
    // Assessments Controller
    // ----------------------------------------------------------------

    [Fact]
    public async Task Assessments_PendingReview_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/assessments/pending-review");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Assessments_RedFlags_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/assessments/red-flags");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ----------------------------------------------------------------
    // Admin & Analytics
    // ----------------------------------------------------------------

    [Fact]
    public async Task Admin_Dashboard_ShouldReturn403ForProviderRole()
    {
        // AdminController requires [Authorize(Roles = "Admin")].
        // TestAuthHandler authenticates as Provider, so this correctly returns 403.
        var response = await _client.GetAsync("/api/v1/admin/dashboard");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Analytics_Outcomes_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/analytics/outcomes");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Analytics_QualityDashboard_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/analytics/quality/dashboard");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ----------------------------------------------------------------
    // Response Headers / Security
    // ----------------------------------------------------------------

    [Fact]
    public async Task AllResponses_ShouldHaveSecurityHeaders()
    {
        var response = await _client.GetAsync("/api/v1/system/ping");

        response.Headers.Should().ContainKey("X-Content-Type-Options");
        response.Headers.Should().ContainKey("X-Frame-Options");
        response.Headers.GetValues("X-Content-Type-Options").First().Should().Be("nosniff");
        response.Headers.GetValues("X-Frame-Options").First().Should().Be("DENY");
    }

    [Fact]
    public async Task AllResponses_ShouldHaveCorrelationId()
    {
        var response = await _client.GetAsync("/api/v1/system/ping");
        response.Headers.Should().ContainKey("X-Correlation-Id");
    }

    [Fact]
    public async Task AllResponses_ShouldHaveApiVersionHeader()
    {
        var response = await _client.GetAsync("/api/v1/system/ping");
        response.Headers.Should().ContainKey("X-Api-Version");
    }

    [Fact]
    public async Task CorrelationId_WhenProvided_ShouldBeEchoed()
    {
        var correlationId = Guid.NewGuid().ToString("N");
        _client.DefaultRequestHeaders.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        var response = await _client.GetAsync("/api/v1/system/ping");

        response.Headers.GetValues("X-Correlation-Id").First().Should().Be(correlationId);

        _client.DefaultRequestHeaders.Remove("X-Correlation-Id");
    }

    // ----------------------------------------------------------------
    // Content Type Negotiation
    // ----------------------------------------------------------------

    [Fact]
    public async Task Endpoints_ShouldReturnJsonContentType()
    {
        var response = await _client.GetAsync("/api/v1/system/ping");
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }

    [Fact]
    public async Task InvalidRoute_ShouldReturn404()
    {
        var response = await _client.GetAsync("/api/v1/doesnotexist");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
