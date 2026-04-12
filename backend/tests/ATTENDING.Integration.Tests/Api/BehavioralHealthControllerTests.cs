using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ATTENDING.Domain.Enums;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// HTTP-level integration tests for the BehavioralHealth controller (9 endpoints).
///
/// Tests exercise the full request pipeline: routing → auth → handler → repository.
/// Each test class instance gets its own isolated InMemory database via
/// AttendingWebApplicationFactory.
///
/// Coverage:
///   POST  /api/v1/behavioral-health/screenings                        (StartScreening)
///   POST  /api/v1/behavioral-health/screenings/{id}/responses         (AddResponse)
///   POST  /api/v1/behavioral-health/screenings/{id}/score             (ScoreScreening)
///   POST  /api/v1/behavioral-health/screenings/{id}/review            (ReviewScreening)
///   POST  /api/v1/behavioral-health/screenings/{id}/part2-consent     (Part2Consent)
///   GET   /api/v1/behavioral-health/screenings/{id}                   (GetScreening)
///   GET   /api/v1/behavioral-health/patients/{id}/screenings          (GetPatientScreenings)
///   GET   /api/v1/behavioral-health/encounters/{id}/screenings        (GetEncounterScreenings)
///   GET   /api/v1/behavioral-health/screenings/pending-review         (GetPendingReview)
///   GET   /api/v1/behavioral-health/screenings/active-suicide-risk    (GetActiveSuicideRisk)
/// </summary>
public class BehavioralHealthControllerTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    // Stable GUIDs used across tests in this class
    private static readonly Guid PatientId   = Guid.NewGuid();
    private static readonly Guid ProviderId  = Guid.NewGuid();
    private static readonly Guid EncounterId = Guid.NewGuid();

    private const string Base = "/api/v1/behavioral-health";

    public BehavioralHealthControllerTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── StartScreening ────────────────────────────────────────────────────

    [Fact]
    public async Task StartScreening_ValidRequest_Returns201WithLocation()
    {
        var response = await _client.PostAsJsonAsync($"{Base}/screenings", new
        {
            patientId   = PatientId,
            providerId  = ProviderId,
            instrument  = (int)ScreeningInstrument.PHQ9,
            encounterId = EncounterId
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Contain("/screenings/");
    }

    [Fact]
    public async Task StartScreening_Returns_ScreeningId_In_Body()
    {
        // Verifies the response body contains the new screening ID
        var response = await _client.PostAsJsonAsync($"{Base}/screenings", new
        {
            patientId  = Guid.NewGuid(),
            providerId = ProviderId,
            instrument = (int)ScreeningInstrument.GAD7
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("screeningId").GetGuid().Should().NotBe(Guid.Empty);
    }

    // ── AddResponse ───────────────────────────────────────────────────────

    [Fact]
    public async Task AddResponse_ValidScreening_Returns200()
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.PHQ9);

        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/responses", new
        {
            itemNumber    = 1,
            questionText  = "Little interest or pleasure in doing things?",
            responseValue = 2,
            responseText  = "More than half the days"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task AddResponse_NonExistentScreening_Returns404()
    {
        var response = await _client.PostAsJsonAsync(
            $"{Base}/screenings/{Guid.NewGuid()}/responses", new
            {
                itemNumber    = 1,
                questionText  = "Test",
                responseValue = 1,
                responseText  = "Several days"
            });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── ScoreScreening ────────────────────────────────────────────────────

    [Fact]
    public async Task ScorePhq9_MildDepression_Returns200WithInterpretation()
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.PHQ9);

        // Total 7 = Mild; item 9 = 0 (no suicidal ideation)
        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/score", new
        {
            itemScores = new[] { 1, 1, 1, 1, 1, 1, 1, 0, 0 }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("totalScore").GetInt32().Should().Be(7);
        // scoreInterpretation contains the severity band as a string
        body.GetProperty("scoreInterpretation").GetString().Should().Contain("Mild");
        body.GetProperty("hasSuicideRisk").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task ScorePhq9_Item9Positive_SetsHasSuicideRisk()
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.PHQ9);

        // Item 9 (index 8) = 2 → suicide risk flag
        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/score", new
        {
            itemScores = new[] { 1, 1, 1, 1, 1, 1, 1, 0, 2 }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("hasSuicideRisk").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task ScoreGad7_ModerateAnxiety_Returns200WithInterpretation()
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.GAD7);

        // Total 11 = Moderate anxiety
        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/score", new
        {
            itemScores = new[] { 2, 1, 2, 1, 2, 1, 2 }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("totalScore").GetInt32().Should().Be(11);
        // scoreInterpretation encodes severity band (e.g., "GAD-7: 11/21 — Moderate")
        body.GetProperty("scoreInterpretation").GetString().Should().Contain("Moderate");
    }

    [Fact]
    public async Task ScoreAuditC_HighRisk_SetsPartTwoProtected()
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.AUDITC);

        // Male, high risk: 4+4+4 = 12 ≥ 8 → HighRisk + 42 CFR Part 2
        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/score", new
        {
            itemScores = new[] { 4, 4, 4 },
            isFemaleOrPregnant = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("isPartTwoProtected").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task ScoreScreening_NonExistentId_Returns404()
    {
        var response = await _client.PostAsJsonAsync(
            $"{Base}/screenings/{Guid.NewGuid()}/score", new
            {
                itemScores = new[] { 1, 1, 1, 1, 1, 1, 1, 1, 1 }
            });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ScoreScreening_WrongItemCount_Returns422()
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.PHQ9);

        // PHQ-9 expects 9 items — send 5
        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/score", new
        {
            itemScores = new[] { 1, 1, 1, 1, 1 }
        });

        ((int)response.StatusCode).Should().BeOneOf(400, 422);
    }

    // ── ReviewScreening ───────────────────────────────────────────────────

    [Fact]
    public async Task ReviewScreening_AfterScoring_Returns204()
    {
        var id = await CreateScoredPhq9Async(mildSeverity: true);

        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/review", new
        {
            providerId  = ProviderId,
            // BehavioralHealthAction enum is serialized as integer by STJ
            actionTaken = (int)BehavioralHealthAction.WatchfulWaiting,
            notes       = "Patient counseled on lifestyle modifications. Follow-up in 4 weeks."
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ReviewScreening_WithSafetyPlan_Returns204()
    {
        var id = await CreateScoredPhq9Async(mildSeverity: false); // severe → safety plan

        var safetyPlan = """{"warningSignals":["feeling hopeless"],"copingStrategies":["call crisis line"]}""";

        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/review", new
        {
            providerId     = ProviderId,
            actionTaken    = (int)BehavioralHealthAction.SafetyPlanRequired,
            notes          = "Safety plan completed with patient.",
            safetyPlanJson = safetyPlan
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ── Part 2 Consent ────────────────────────────────────────────────────

    [Fact]
    public async Task RecordPartTwoConsent_ValidRequest_Returns204()
    {
        // Domain guard: RecordPartTwoConsent throws if IsPartTwoProtected == false.
        // Must create AND score AUDIT-C to HighRisk first to set IsPartTwoProtected = true.
        var id = await CreateScreeningAsync(ScreeningInstrument.AUDITC);

        // Score to HighRisk — sets IsPartTwoProtected = true
        var score = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/score", new
        {
            itemScores = new[] { 4, 4, 4 },
            isFemaleOrPregnant = false
        });
        score.EnsureSuccessStatusCode();

        var response = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/part2-consent", new
        {
            consentGiven = true,
            capturedBy   = "Test Provider"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ── GetScreening ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetScreening_ExistingId_Returns200WithDetail()
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.PHQ9);

        var response = await _client.GetAsync($"{Base}/screenings/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("id").GetGuid().Should().Be(id);
        // instrument is serialized as int (STJ default for enums)
        body.GetProperty("instrument").GetInt32().Should().Be((int)ScreeningInstrument.PHQ9);
        body.GetProperty("status").GetInt32().Should().Be((int)ScreeningStatus.Initiated);
        body.TryGetProperty("responses", out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetScreening_NonExistentId_Returns404()
    {
        var response = await _client.GetAsync($"{Base}/screenings/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── GetPatientScreenings ──────────────────────────────────────────────

    [Fact]
    public async Task GetPatientScreenings_ReturnsAllForPatient()
    {
        var localPatientId = Guid.NewGuid();
        await CreateScreeningForPatientAsync(localPatientId, ScreeningInstrument.PHQ9);
        await CreateScreeningForPatientAsync(localPatientId, ScreeningInstrument.GAD7);

        var response = await _client.GetAsync($"{Base}/patients/{localPatientId}/screenings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task GetPatientScreenings_UnknownPatient_ReturnsEmptyArray()
    {
        var response = await _client.GetAsync($"{Base}/patients/{Guid.NewGuid()}/screenings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetArrayLength().Should().Be(0);
    }

    // ── GetEncounterScreenings ────────────────────────────────────────────

    [Fact]
    public async Task GetEncounterScreenings_ReturnsAllForEncounter()
    {
        var localEncounterId = Guid.NewGuid();
        await CreateScreeningForEncounterAsync(localEncounterId, ScreeningInstrument.PHQ9);

        var response = await _client.GetAsync($"{Base}/encounters/{localEncounterId}/screenings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetArrayLength().Should().Be(1);
    }

    // ── GetPendingReview ──────────────────────────────────────────────────

    [Fact]
    public async Task GetPendingReview_Returns200WithArray()
    {
        var response = await _client.GetAsync($"{Base}/screenings/pending-review");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    // ── GetActiveSuicideRisk ──────────────────────────────────────────────

    [Fact]
    public async Task GetActiveSuicideRisk_Returns200WithArray()
    {
        var response = await _client.GetAsync($"{Base}/screenings/active-suicide-risk");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetActiveSuicideRisk_AfterSuicideRiskFlagged_IncludesScreening()
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.PHQ9);

        // Item 9 = 3 → HasSuicideRisk = true; total 24 → Severe → SafetyPlanRequired
        var scoreResp = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/score", new
        {
            itemScores = new[] { 3, 3, 3, 2, 2, 2, 2, 1, 3 }
        });
        scoreResp.EnsureSuccessStatusCode();

        var response = await _client.GetAsync($"{Base}/screenings/active-suicide-risk");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var ids = Enumerable.Range(0, list.GetArrayLength())
            .Select(i => list[i].GetProperty("id").GetGuid())
            .ToList();

        ids.Should().Contain(id, "PHQ-9 with item 9 = 3 must appear in the active suicide risk feed");
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private async Task<Guid> CreateScreeningAsync(
        ScreeningInstrument instrument,
        Guid? patientId   = null,
        Guid? encounterId = null)
    {
        var response = await _client.PostAsJsonAsync($"{Base}/screenings", new
        {
            patientId   = patientId ?? PatientId,
            providerId  = ProviderId,
            instrument  = (int)instrument,
            encounterId = encounterId ?? EncounterId
        });

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return body.GetProperty("screeningId").GetGuid();
    }

    private Task<Guid> CreateScreeningForPatientAsync(Guid patientId, ScreeningInstrument instrument)
        => CreateScreeningAsync(instrument, patientId: patientId);

    private Task<Guid> CreateScreeningForEncounterAsync(Guid encounterId, ScreeningInstrument instrument)
        => CreateScreeningAsync(instrument, encounterId: encounterId);

    /// <summary>
    /// Create and score a PHQ-9, putting it in Completed state
    /// (prerequisite for ReviewScreening and pending-review queue).
    /// </summary>
    private async Task<Guid> CreateScoredPhq9Async(bool mildSeverity)
    {
        var id = await CreateScreeningAsync(ScreeningInstrument.PHQ9);

        // Mild: total 7, no item-9 risk; Severe: total 24, item 9 = 3
        var scores = mildSeverity
            ? new[] { 1, 1, 1, 1, 1, 1, 1, 0, 0 }
            : new[] { 3, 3, 3, 3, 3, 3, 3, 0, 3 };

        var scoreResp = await _client.PostAsJsonAsync($"{Base}/screenings/{id}/score", new
        {
            itemScores = scores
        });
        scoreResp.EnsureSuccessStatusCode();
        return id;
    }
}
