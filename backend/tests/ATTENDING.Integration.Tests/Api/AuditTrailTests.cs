using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using ATTENDING.Contracts.Requests;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// PHI audit trail integration tests.
/// Verifies that the audit middleware correctly logs PHI access events
/// and that audit logs are complete for HIPAA compliance.
///
/// Uses the AuditCapturingWebApplicationFactory so audit entries can be inspected.
/// </summary>
public class AuditTrailTests : IClassFixture<AuditCapturingWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly AuditCapturingWebApplicationFactory _factory;

    public AuditTrailTests(AuditCapturingWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task PatientCreate_ShouldGenerateAuditEntry()
    {
        _factory.CapturedAuditEntries.Clear();

        var mrn = $"AUD-{Guid.NewGuid():N}"[..12];
        await _client.PostAsJsonAsync("/api/v1/patients", new CreatePatientRequest(
            MRN: mrn, FirstName: "Audit", LastName: "Patient",
            DateOfBirth: new DateTime(1990, 1, 1), Sex: "Male",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English"));

        // Allow async audit write
        await Task.Delay(50);

        _factory.CapturedAuditEntries.Should().NotBeEmpty(
            because: "creating a patient (PHI write) must generate an audit entry");

        var entry = _factory.CapturedAuditEntries.FirstOrDefault(e =>
            e.Action.Contains("POST") && e.EntityType.Contains("patient"));

        entry.Should().NotBeNull(because: "POST to /api/v1/patients should produce an audit entry");
        entry!.UserId.Should().NotBeNullOrWhiteSpace(because: "audit entries must capture the user ID");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task PatientGet_ShouldGenerateAuditEntry()
    {
        // Create a patient first
        var mrn = $"AGTST-{Guid.NewGuid():N}"[..12];
        var created = await _client.PostAsJsonAsync("/api/v1/patients", new CreatePatientRequest(
            MRN: mrn, FirstName: "Get", LastName: "AuditTest",
            DateOfBirth: new DateTime(1985, 5, 15), Sex: "Female",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English"));

        var patientId = created.Headers.Location?.ToString().Split('/').Last();

        _factory.CapturedAuditEntries.Clear();

        await _client.GetAsync($"/api/v1/patients/{patientId}");
        await Task.Delay(50);

        // GET to /api/v1/patients/{id} is a PHI access and must be audited
        _factory.CapturedAuditEntries.Should().NotBeEmpty(
            because: "reading patient data (PHI read) must generate an audit entry");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task AuditEntries_MustContainMandatoryFields()
    {
        _factory.CapturedAuditEntries.Clear();

        var mrn = $"AMND-{Guid.NewGuid():N}"[..12];
        await _client.PostAsJsonAsync("/api/v1/patients", new CreatePatientRequest(
            MRN: mrn, FirstName: "Mandatory", LastName: "Fields",
            DateOfBirth: new DateTime(2000, 1, 1), Sex: "Male",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English"));

        await Task.Delay(50);

        foreach (var entry in _factory.CapturedAuditEntries)
        {
            entry.Action.Should().NotBeNullOrWhiteSpace(because: "action is mandatory for HIPAA audit");
            entry.UserId.Should().NotBeNullOrWhiteSpace(because: "user ID is mandatory for HIPAA audit");
            entry.EntityType.Should().NotBeNullOrWhiteSpace(because: "entity type is mandatory for HIPAA audit");
        }
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task NonAuditableEndpoints_ShouldNotGenerateAuditEntries()
    {
        _factory.CapturedAuditEntries.Clear();

        await _client.GetAsync("/api/v1/system/ping");
        await _client.GetAsync("/api/v1/system/version");

        await Task.Delay(50);

        // System/health endpoints should not generate PHI audit entries
        var phiEntries = _factory.CapturedAuditEntries
            .Where(e => e.EntityType.Contains("patient") || e.EntityType.Contains("encounter"));

        phiEntries.Should().BeEmpty(because: "non-PHI system endpoints should not generate patient data audit entries");
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task StateChangingOperations_ShouldAlwaysBeAudited()
    {
        _factory.CapturedAuditEntries.Clear();

        var mrn = $"SCO-{Guid.NewGuid():N}"[..12];
        await _client.PostAsJsonAsync("/api/v1/patients", new CreatePatientRequest(
            MRN: mrn, FirstName: "State", LastName: "Change",
            DateOfBirth: new DateTime(1970, 6, 1), Sex: "Male",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English"));

        await Task.Delay(50);

        var mutatingEntries = _factory.CapturedAuditEntries
            .Where(e => e.Action.StartsWith("POST") || e.Action.StartsWith("PUT") ||
                        e.Action.StartsWith("PATCH") || e.Action.StartsWith("DELETE"))
            .ToList();

        mutatingEntries.Should().NotBeEmpty(
            because: "all state-changing operations on PHI must be audited per HIPAA requirements");
    }
}
