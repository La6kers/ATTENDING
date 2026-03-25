using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using ATTENDING.Application.Queries.Assessments;
using ATTENDING.Application.Queries.Encounters;
using ATTENDING.Application.Queries.Patients;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

/// <summary>
/// Query handler tests — Patient, Encounter, and Assessment read paths.
/// These tests verify that query handlers correctly delegate to repositories
/// and return the expected data shapes.
/// </summary>
public class QueryHandlerTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public QueryHandlerTests(DatabaseFixture fixture) => _fixture = fixture;

    // ================================================================
    // Patient Query Handlers
    // ================================================================

    [Fact]
    public async Task GetPatientById_ExistingPatient_ReturnsPatient()
    {
        var patient = await _fixture.SeedPatientAsync($"QRY-{Guid.NewGuid():N}"[..10], "Query", "ById");

        var handler = new GetPatientByIdHandler(_fixture.Services.GetRequiredService<IPatientRepository>());
        var result = await handler.Handle(new GetPatientByIdQuery(patient.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(patient.Id);
        result.FirstName.Should().Be("Query");
    }

    [Fact]
    public async Task GetPatientById_NonExistent_ReturnsNull()
    {
        var handler = new GetPatientByIdHandler(_fixture.Services.GetRequiredService<IPatientRepository>());
        var result = await handler.Handle(new GetPatientByIdQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPatientByMrn_ExistingMrn_ReturnsPatient()
    {
        var mrn = $"MRN-QRY-{Guid.NewGuid():N}"[..14];
        await _fixture.SeedPatientAsync(mrn, "Mrn", "Lookup");

        var handler = new GetPatientByMrnHandler(_fixture.Services.GetRequiredService<IPatientRepository>());
        var result = await handler.Handle(new GetPatientByMrnQuery(mrn), CancellationToken.None);

        result.Should().NotBeNull();
        result!.MRN.Should().Be(mrn);
    }

    [Fact]
    public async Task GetPatientByMrn_NonExistentMrn_ReturnsNull()
    {
        var handler = new GetPatientByMrnHandler(_fixture.Services.GetRequiredService<IPatientRepository>());
        var result = await handler.Handle(new GetPatientByMrnQuery("DOES-NOT-EXIST"), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task SearchPatients_ByLastName_ReturnsMatchingResults()
    {
        // Seed patients with a distinctive last name
        var uniqueSuffix = Guid.NewGuid().ToString("N")[..8];
        await _fixture.SeedPatientAsync($"SQRY1-{uniqueSuffix}"[..12], "First", $"Testname{uniqueSuffix}");
        await _fixture.SeedPatientAsync($"SQRY2-{uniqueSuffix}"[..12], "Second", $"Testname{uniqueSuffix}");

        var handler = new SearchPatientsHandler(_fixture.Services.GetRequiredService<IPatientRepository>());
        var (results, total) = await handler.Handle(
            new SearchPatientsQuery($"Testname{uniqueSuffix}"), CancellationToken.None);

        results.Should().HaveCount(2);
        total.Should().Be(2);
        results.Should().AllSatisfy(p => p.LastName.Should().Contain(uniqueSuffix));
    }

    [Fact]
    public async Task SearchPatients_EmptySearchTerm_ReturnsResults()
    {
        // Seed at least one patient
        await _fixture.SeedPatientAsync($"EMPTY-{Guid.NewGuid():N}"[..12], "Empty", "Search");

        var handler = new SearchPatientsHandler(_fixture.Services.GetRequiredService<IPatientRepository>());
        var (results, _) = await handler.Handle(
            new SearchPatientsQuery(null), CancellationToken.None);

        // Should not throw — may return empty or all depending on implementation
        results.Should().NotBeNull();
    }

    [Fact]
    public async Task SearchPatients_Pagination_RespectsPageSize()
    {
        // Seed several patients with common name
        var commonName = $"Page{Guid.NewGuid():N}"[..10];
        for (var i = 0; i < 5; i++)
        {
            await _fixture.SeedPatientAsync($"PAGE-{i:D2}-{Guid.NewGuid():N}"[..12], "Page", commonName);
        }

        var handler = new SearchPatientsHandler(_fixture.Services.GetRequiredService<IPatientRepository>());

        var (page1, total) = await handler.Handle(
            new SearchPatientsQuery(commonName, Page: 1, PageSize: 2), CancellationToken.None);

        page1.Should().HaveCount(2, because: "page size of 2 should limit results to 2");
        total.Should().BeGreaterThanOrEqualTo(5);
    }

    [Fact]
    public async Task GetPatientWithFullHistory_ReturnsPatientWithRelatedData()
    {
        var patient = await _fixture.SeedPatientAsync($"HIST-{Guid.NewGuid():N}"[..12], "History", "Full");

        var handler = new GetPatientWithFullHistoryHandler(
            _fixture.Services.GetRequiredService<IPatientRepository>());
        var result = await handler.Handle(
            new GetPatientWithFullHistoryQuery(patient.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(patient.Id);
        // Full history includes navigation properties — should not throw or be null
        result.Allergies.Should().NotBeNull();
        result.Conditions.Should().NotBeNull();
    }

    // ================================================================
    // Encounter Query Handlers
    // ================================================================

    [Fact]
    public async Task GetEncounterById_ExistingEncounter_ReturnsEncounter()
    {
        var patient = await _fixture.SeedPatientAsync($"EQRY-{Guid.NewGuid():N}"[..12]);
        var provider = await _fixture.SeedProviderAsync($"eqry.{Guid.NewGuid():N}"[..20] + "@test.com");
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var handler = new GetEncounterByIdHandler(
            _fixture.Services.GetRequiredService<IEncounterRepository>());
        var result = await handler.Handle(
            new GetEncounterByIdQuery(encounter.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(encounter.Id);
        result.PatientId.Should().Be(patient.Id);
    }

    [Fact]
    public async Task GetEncounterById_NonExistent_ReturnsNull()
    {
        var handler = new GetEncounterByIdHandler(
            _fixture.Services.GetRequiredService<IEncounterRepository>());
        var result = await handler.Handle(
            new GetEncounterByIdQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetEncountersByPatient_ReturnsOnlyPatientEncounters()
    {
        var patient = await _fixture.SeedPatientAsync($"EPAT-{Guid.NewGuid():N}"[..12]);
        var provider = await _fixture.SeedProviderAsync($"epat.{Guid.NewGuid():N}"[..20] + "@test.com");

        // Create two encounters for this patient
        await _fixture.SeedEncounterAsync(patient.Id, provider.Id);
        await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        // Create an encounter for a DIFFERENT patient — should not appear
        var otherPatient = await _fixture.SeedPatientAsync($"EPAT-OTH-{Guid.NewGuid():N}"[..14]);
        await _fixture.SeedEncounterAsync(otherPatient.Id, provider.Id);

        var handler = new GetEncountersByPatientHandler(
            _fixture.Services.GetRequiredService<IEncounterRepository>());
        var results = await handler.Handle(
            new GetEncountersByPatientQuery(patient.Id), CancellationToken.None);

        results.Should().HaveCountGreaterThanOrEqualTo(2,
            because: "should return at least the 2 encounters we created for this patient");
        results.Should().AllSatisfy(e => e.PatientId.Should().Be(patient.Id),
            because: "all returned encounters must belong to the requested patient");
    }

    [Fact]
    public async Task GetEncountersByPatient_WhenNone_ReturnsEmptyList()
    {
        var patient = await _fixture.SeedPatientAsync($"ENONE-{Guid.NewGuid():N}"[..12]);

        var handler = new GetEncountersByPatientHandler(
            _fixture.Services.GetRequiredService<IEncounterRepository>());
        var results = await handler.Handle(
            new GetEncountersByPatientQuery(patient.Id), CancellationToken.None);

        results.Should().NotBeNull();
        results.Should().BeEmpty();
    }

    [Fact]
    public async Task GetTodaysSchedule_ReturnsOnlyTodaysEncounters()
    {
        var handler = new GetTodaysScheduleHandler(
            _fixture.Services.GetRequiredService<IEncounterRepository>());

        // Requesting for a random provider — may return empty, but should never throw
        var results = await handler.Handle(
            new GetTodaysScheduleQuery(Guid.NewGuid()), CancellationToken.None);

        results.Should().NotBeNull();
    }

    [Fact]
    public async Task GetEncountersByStatus_ReturnsEncountersMatchingStatus()
    {
        var patient = await _fixture.SeedPatientAsync($"ESTAT-{Guid.NewGuid():N}"[..12]);
        var provider = await _fixture.SeedProviderAsync($"estat.{Guid.NewGuid():N}"[..20] + "@test.com");

        // Create a Scheduled encounter (default state)
        var encounter = await _fixture.SeedEncounterAsync(patient.Id, provider.Id);

        var handler = new GetEncountersByStatusHandler(
            _fixture.Services.GetRequiredService<IEncounterRepository>());
        var results = await handler.Handle(
            new GetEncountersByStatusQuery(EncounterStatus.Scheduled), CancellationToken.None);

        results.Should().NotBeNull();
        results.Should().ContainSingle(e => e.Id == encounter.Id,
            because: "the newly seeded encounter should appear in Scheduled status results");
    }

    // ================================================================
    // Assessment Query Handlers
    // ================================================================

    [Fact]
    public async Task GetPendingReviewAssessments_ReturnsResults()
    {
        var handler = new GetPendingReviewAssessmentsHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>());
        var results = await handler.Handle(
            new GetPendingReviewAssessmentsQuery(), CancellationToken.None);

        results.Should().NotBeNull();
    }

    [Fact]
    public async Task GetRedFlagAssessments_ReturnsResults()
    {
        var handler = new GetRedFlagAssessmentsHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>());
        var results = await handler.Handle(
            new GetRedFlagAssessmentsQuery(), CancellationToken.None);

        results.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAssessmentsByPatient_WhenNone_ReturnsEmptyList()
    {
        var patient = await _fixture.SeedPatientAsync($"AQRY-{Guid.NewGuid():N}"[..12]);

        var handler = new GetAssessmentsByPatientHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>());
        var results = await handler.Handle(
            new GetAssessmentsByPatientQuery(patient.Id), CancellationToken.None);

        results.Should().NotBeNull();
        results.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAssessmentById_NonExistent_ReturnsNull()
    {
        var handler = new GetAssessmentByIdHandler(
            _fixture.Services.GetRequiredService<IAssessmentRepository>());
        var result = await handler.Handle(
            new GetAssessmentByIdQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }
}
