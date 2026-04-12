using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ATTENDING.Application.Commands.DiagnosticLearning;
using ATTENDING.Application.Services;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Repositories;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

/// <summary>
/// Integration tests for the ML Diagnostic Learning Engine (d5).
///
/// Validates the complete feedback loop:
///   Confirmed diagnosis (DiagnosticOutcome)
///   → Nightly job → de-identified LearningSignal
///   → Weekly job  → DiagnosticAccuracySnapshot + calibration factor
///   → Calibration fed back into DiagnosticReasoningService
///
/// Single-step tests use InMemory EF.
/// Pipeline tests that cross SaveChanges boundaries use Docker (SQL Server).
/// </summary>
public class DiagnosticLearningHandlerTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _db;

    public DiagnosticLearningHandlerTests(DatabaseFixture db) => _db = db;

    private RecordDiagnosticOutcomeHandler OutcomeHandler() =>
        new(_db.Services.GetRequiredService<IDiagnosticLearningRepository>(),
            _db.Services.GetRequiredService<IUnitOfWork>(),
            Mock.Of<ILogger<RecordDiagnosticOutcomeHandler>>());

    // ================================================================
    // RecordDiagnosticOutcome
    // ================================================================

    [Fact]
    public async Task RecordOutcome_ValidInput_ShouldPersistAndReturnId()
    {
        var patient   = await _db.SeedPatientAsync("DL-001");
        var provider  = await _db.SeedProviderAsync("learning.dr1@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);

        var result = await OutcomeHandler().Handle(
            new RecordDiagnosticOutcomeCommand(
                EncounterId:          encounter.Id,
                PatientId:            patient.Id,
                ProviderId:           provider.Id,
                OrganizationId:       DatabaseFixture.DefaultTenantId,
                RecommendationType:   "Differential",
                ConfirmedDiagnosis:   "Pulmonary Embolism",
                ConfirmedIcd10Code:   "I26.99",
                AiSuggestedDiagnosis: "Pulmonary Embolism",
                AiPreTestProbability: 0.49m,
                GuidelineName:        "Wells PE",
                AiWasCorrect:         true,
                ProviderOverrode:     false,
                ConfirmingTestResult: "CTPA positive for bilateral PE",
                ConfirmingTestLoincCode: "36813-4"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeEmpty();
    }

    [Fact]
    public async Task RecordOutcome_DuplicateEncounterAndType_ShouldBeIdempotent()
    {
        var patient   = await _db.SeedPatientAsync("DL-002");
        var provider  = await _db.SeedProviderAsync("learning.dr2@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);

        var cmd = new RecordDiagnosticOutcomeCommand(
            encounter.Id, patient.Id, provider.Id, DatabaseFixture.DefaultTenantId,
            "Differential", "Sepsis", "A41.9", "Sepsis", 0.30m, "qSOFA",
            AiWasCorrect: true, ProviderOverrode: false);

        var first  = await OutcomeHandler().Handle(cmd, CancellationToken.None);
        var second = await OutcomeHandler().Handle(cmd, CancellationToken.None);

        first.IsSuccess.Should().BeTrue();
        second.IsSuccess.Should().BeTrue();
        second.Value.Should().Be(first.Value, "same encounter+type should return existing outcome ID");
    }

    [Fact]
    public async Task RecordOutcome_ProviderOverrode_ShouldRecord()
    {
        var patient   = await _db.SeedPatientAsync("DL-003");
        var provider  = await _db.SeedProviderAsync("learning.dr3@test.com");
        var encounter = await _db.SeedEncounterAsync(patient.Id, provider.Id);

        // AI suggested PE, provider confirmed ACS instead
        var result = await OutcomeHandler().Handle(
            new RecordDiagnosticOutcomeCommand(
                encounter.Id, patient.Id, provider.Id, DatabaseFixture.DefaultTenantId,
                "Differential",
                ConfirmedDiagnosis:   "Acute Coronary Syndrome",
                ConfirmedIcd10Code:   "I21.9",
                AiSuggestedDiagnosis: "Pulmonary Embolism",
                AiPreTestProbability: 0.49m,
                GuidelineName:        "Wells PE",
                AiWasCorrect:         false,
                ProviderOverrode:     true,
                ConfirmingTestResult: "Troponin positive, ST elevation on ECG",
                ConfirmingTestLoincCode: "89579-7"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    // ================================================================
    // DiagnosticAccuracySnapshot — pure domain math (no DB needed)
    // ================================================================

    [Fact]
    public void Snapshot_SufficientSample_ShouldComputeCalibrationFactor()
    {
        var orgId = DatabaseFixture.DefaultTenantId;

        // 40 signals: 30 TP, 10 FP
        var signals = Enumerable.Range(0, 40)
            .Select(i =>
            {
                var outcome = DiagnosticOutcome.Create(
                    Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), orgId,
                    "Differential",
                    confirmedDiagnosis:   i < 30 ? "Pulmonary Embolism" : "Musculoskeletal Pain",
                    confirmedIcd10Code:   i < 30 ? "I26.99" : "M79.3",
                    aiSuggestedDiagnosis: "Pulmonary Embolism",
                    aiPreTestProbability: 0.49m,
                    guidelineName:        "Wells PE",
                    aiWasCorrect:         i < 30,
                    providerOverrode:     i >= 30);
                return LearningSignal.CreateFromOutcome(outcome, orgId);
            }).ToList();

        var windowEnd = DateTime.UtcNow;
        var snapshot  = DiagnosticAccuracySnapshot.Compute(
            orgId, "Differential", "Wells PE",
            windowEnd.AddDays(-90), windowEnd, signals);

        snapshot.TotalCases.Should().Be(40);
        snapshot.TruePositives.Should().Be(30);
        snapshot.FalsePositives.Should().Be(10);
        snapshot.IsReliable.Should().BeTrue("40 >= 30 minimum");

        // Actual rate = 30/40 = 0.75; literature pre-test = 0.49 → factor > 1.0
        snapshot.ActualOutcomeRate.Should().Be(0.75m);
        snapshot.CalibrationAdjustmentFactor.Should().NotBeNull();
        snapshot.CalibrationAdjustmentFactor!.Value.Should().BeGreaterThan(1.0m,
            "actual PE rate (75%) exceeds literature pre-test (49%) → AI under-estimates");
        snapshot.CalibrationAdjustmentFactor.Value.Should().BeLessThanOrEqualTo(2.0m,
            "calibration factor is clamped at 2.0");
    }

    [Fact]
    public void Snapshot_InsufficientSample_ShouldNotComputeCalibration()
    {
        var orgId = DatabaseFixture.DefaultTenantId;

        // Only 15 signals — below the 30-case floor
        var signals = Enumerable.Range(0, 15)
            .Select(i =>
            {
                var outcome = DiagnosticOutcome.Create(
                    Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), orgId,
                    "Differential", "Pulmonary Embolism", "I26.99",
                    "Pulmonary Embolism", 0.49m, "Wells PE",
                    aiWasCorrect: true, providerOverrode: false);
                return LearningSignal.CreateFromOutcome(outcome, orgId);
            }).ToList();

        var windowEnd = DateTime.UtcNow;
        var snapshot  = DiagnosticAccuracySnapshot.Compute(
            orgId, "Differential", "Wells PE",
            windowEnd.AddDays(-90), windowEnd, signals);

        snapshot.IsReliable.Should().BeFalse("15 < 30 minimum sample size");
        snapshot.CalibrationAdjustmentFactor.Should().BeNull(
            "calibration must not be computed with insufficient data");
    }

    // ================================================================
    // BayesianUpdate — mathematical correctness
    // ================================================================

    [Fact]
    public void BayesianUpdate_DDimerForPE_ShouldLowerProbabilityWhenNegative()
    {
        // Wells High Risk: pre-test 0.49
        // D-dimer: sensitivity 0.96, specificity 0.40
        var (postPos, postNeg) = DiagnosticReasoningService.BayesianUpdate(0.49m, 0.96m, 0.40m);

        postPos.Should().BeGreaterThan(0.49m, "positive D-dimer raises PE probability");
        postPos.Should().BeLessThan(1.0m);
        postNeg.Should().BeLessThan(0.49m, "negative D-dimer lowers PE probability");
        postNeg.Should().BeLessThan(0.10m,
            "high-sensitivity negative D-dimer in high pre-test is near rule-out territory");
    }

    [Fact]
    public void BayesianUpdate_HighSensitivityTroponin_ShouldNearlyConfirmOrExclude()
    {
        // HEART High Risk: pre-test 0.50
        // High-sensitivity Troponin I: sensitivity 0.97, specificity 0.93
        var (postPos, postNeg) = DiagnosticReasoningService.BayesianUpdate(0.50m, 0.97m, 0.93m);

        postPos.Should().BeGreaterThan(0.90m,
            "positive troponin in high pre-test is nearly diagnostic for ACS");
        postNeg.Should().BeLessThan(0.05m,
            "negative troponin in moderate pre-test nearly excludes MI");
    }

    [Fact]
    public void BayesianUpdate_NeutralPrior_ShouldPreserveLikelihoodRatio()
    {
        // Pre-test 0.50 (coin flip) — posterior is determined entirely by test accuracy
        var (postPos, postNeg) = DiagnosticReasoningService.BayesianUpdate(0.50m, 0.80m, 0.80m);

        // At 50/50 prior, LR+ = sens / (1-spec) = 0.80/0.20 = 4.0
        // PPV = 4 / (4+1) = 0.80 — should match postPos
        postPos.Should().BeApproximately(0.80m, 0.02m);

        // LR- = (1-sens) / spec = 0.20/0.80 = 0.25
        // post-neg = 0.25 / (0.25+1) = 0.20
        postNeg.Should().BeApproximately(0.20m, 0.02m);
    }
}

// ================================================================
// Docker-backed: full pipeline tests requiring SQL Server
// ================================================================

[Collection("Docker")]
public class DockerDiagnosticLearningTests : IClassFixture<SqlServerFixture>
{
    private readonly SqlServerFixture _sql;

    public DockerDiagnosticLearningTests(SqlServerFixture sql) => _sql = sql;

    private DiagnosticLearningService BuildService(AttendingDbContext ctx) =>
        new(new DiagnosticLearningRepository(ctx),
            new AiFeedbackRepository(ctx),
            ctx,
            Mock.Of<ILogger<DiagnosticLearningService>>());

    [Fact]
    [Trait("Category", "Docker")]
    public async Task FullLearningPipeline_OutcomeToCalibrationFactor_ShouldSucceed()
    {
        await using var ctx = _sql.CreateContext();
        ctx.EnableAdminContext();

        var patient  = await _sql.SeedPatientAsync(ctx, mrn: "DOCKER-DL-001");
        var provider = await _sql.SeedProviderAsync(ctx, email: "docker.learning@test.com");
        var orgId    = SqlServerFixture.DefaultTenantId;
        var service  = BuildService(ctx);

        // Step 1: seed 35 DiagnosticOutcome records (> 30 minimum for calibration)
        // 28 true positives (Wells PE correct), 7 false positives
        for (int i = 0; i < 35; i++)
        {
            var encounter = await _sql.SeedEncounterAsync(ctx, patient.Id, provider.Id);
            var isCorrect = i < 28;

            var outcome = DiagnosticOutcome.Create(
                encounter.Id, patient.Id, provider.Id, orgId,
                "Differential",
                confirmedDiagnosis:   isCorrect ? "Pulmonary Embolism" : "Musculoskeletal Pain",
                confirmedIcd10Code:   isCorrect ? "I26.99" : "M79.3",
                aiSuggestedDiagnosis: "Pulmonary Embolism",
                aiPreTestProbability: 0.49m,
                guidelineName:        "Wells PE",
                aiWasCorrect:         isCorrect,
                providerOverrode:     !isCorrect,
                confirmingTestResult: isCorrect ? "CTPA positive" : "CTPA negative",
                confirmingTestLoincCode: "36813-4");

            ctx.DiagnosticOutcomes.Add(outcome);
        }
        await ctx.SaveChangesAsync();

        // Step 2: nightly job — process outcomes → learning signals
        var processed = await service.ProcessUnprocessedOutcomesAsync(CancellationToken.None);
        processed.Should().Be(35, "all 35 outcomes should be processed");

        // Verify signal counts
        var repo    = new DiagnosticLearningRepository(ctx);
        var signals = await repo.GetSignalsAsync(
            "Differential", "Wells PE",
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1));

        signals.Count.Should().Be(35);
        signals.Count(s => s.TruePositive).Should().Be(28);
        signals.Count(s => s.FalsePositive).Should().Be(7);
        signals.Count(s => s.ProviderOverrode).Should().Be(7);

        // Verify all outcomes marked processed
        var unprocessed = await repo.GetUnprocessedOutcomesAsync(batchSize: 100);
        unprocessed.Count.Should().Be(0, "processed outcomes must not appear again");

        // Step 3: weekly job — compute accuracy snapshots
        await service.RefreshAccuracySnapshotsAsync(windowDays: 90);

        // Step 4: calibration factor available
        var calibration = await service.GetCalibrationAdjustmentAsync("Wells PE");
        calibration.Should().NotBeNull("35 cases > 30 minimum");

        // Actual PE rate = 28/35 = 0.80; literature = 0.49 → factor ≈ 1.63
        calibration!.Value.Should().BeGreaterThan(1.0m,
            "this org's PE rate (80%) exceeds literature pre-test (49%) → AI under-estimates");
        calibration.Value.Should().BeLessThanOrEqualTo(2.0m, "clamped at 2.0");

        // Step 5: accuracy report reflects calibration status
        var report = await service.GetAccuracyReportAsync();
        report.Items.Should().NotBeEmpty();

        var wpe = report.Items.FirstOrDefault(i => i.GuidelineName == "Wells PE");
        wpe.Should().NotBeNull();
        wpe!.TotalCases.Should().Be(35);
        wpe.IsReliable.Should().BeTrue();
        wpe.CalibrationStatus.Should().Be(CalibrationStatus.Underestimating,
            "AI under-estimates since actual rate > literature pre-test");
    }

    [Fact]
    [Trait("Category", "Docker")]
    public async Task ProcessOutcomes_WithLinkedAiFeedback_ShouldEnrichSignalAccuracyScore()
    {
        await using var ctx = _sql.CreateContext();
        ctx.EnableAdminContext();

        var patient   = await _sql.SeedPatientAsync(ctx, mrn: "DOCKER-DL-002");
        var provider  = await _sql.SeedProviderAsync(ctx, email: "docker.feedback@test.com");
        var encounter = await _sql.SeedEncounterAsync(ctx, patient.Id, provider.Id);
        var orgId     = SqlServerFixture.DefaultTenantId;

        // Create AiFeedback record with accuracy score 5
        var feedback = AiFeedback.Create(
            providerId:           provider.Id,
            recommendationType:   "Differential",
            requestId:            Guid.NewGuid().ToString(),
            rating:               "Helpful",
            accuracyScore:        5,
            selectedDiagnosis:    "Pulmonary Embolism",
            comment:              "AI nailed it — CTPA confirmed PE",
            modelVersion:         "claude-3-5-haiku-test",
            patientId:            patient.Id,
            encounterId:          encounter.Id);

        ctx.AiFeedback.Add(feedback);
        await ctx.SaveChangesAsync();

        // Create linked DiagnosticOutcome referencing the AiFeedback
        var outcome = DiagnosticOutcome.Create(
            encounter.Id, patient.Id, provider.Id, orgId,
            "Differential", "Pulmonary Embolism", "I26.99",
            "Pulmonary Embolism", 0.49m, "Wells PE",
            aiWasCorrect: true, providerOverrode: false,
            confirmingTestResult: "CTPA bilateral PE",
            aiFeedbackId: feedback.Id);

        ctx.DiagnosticOutcomes.Add(outcome);
        await ctx.SaveChangesAsync();

        var service   = BuildService(ctx);
        var processed = await service.ProcessUnprocessedOutcomesAsync();
        processed.Should().Be(1);

        var signals = await new DiagnosticLearningRepository(ctx)
            .GetSignalsAsync("Differential", "Wells PE",
                DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1));

        signals.Should().HaveCount(1);
        signals[0].TruePositive.Should().BeTrue();
        signals[0].ProviderAccuracyScore.Should().Be(5,
            "accuracy score from linked AiFeedback must be carried into the learning signal");
    }

    [Fact]
    [Trait("Category", "Docker")]
    public async Task ProcessOutcomes_RunTwice_ShouldNotDoubleProcess()
    {
        await using var ctx = _sql.CreateContext();
        ctx.EnableAdminContext();

        var patient   = await _sql.SeedPatientAsync(ctx, mrn: "DOCKER-DL-003");
        var provider  = await _sql.SeedProviderAsync(ctx, email: "docker.idempotent@test.com");
        var encounter = await _sql.SeedEncounterAsync(ctx, patient.Id, provider.Id);
        var orgId     = SqlServerFixture.DefaultTenantId;

        ctx.DiagnosticOutcomes.Add(DiagnosticOutcome.Create(
            encounter.Id, patient.Id, provider.Id, orgId,
            "Triage", "ESI-2 Emergent", null,
            "ESI-2 Emergent", 0.85m, null,
            aiWasCorrect: true, providerOverrode: false));

        await ctx.SaveChangesAsync();

        var service = BuildService(ctx);

        var firstRun  = await service.ProcessUnprocessedOutcomesAsync();
        var secondRun = await service.ProcessUnprocessedOutcomesAsync();

        firstRun.Should().Be(1, "first run should process the one outcome");
        secondRun.Should().Be(0, "second run must find nothing — no double-processing");

        var signals = await new DiagnosticLearningRepository(ctx)
            .GetSignalsAsync("Triage", null,
                DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1));

        signals.Count.Should().Be(1, "exactly one signal per outcome — no duplicates");
    }

    [Fact]
    [Trait("Category", "Docker")]
    public async Task SchedulerDistributedLock_SimulatedConcurrentRuns_ShouldNotDuplicate()
    {
        // Validates the lock-prevents-double-processing guarantee.
        // We simulate two "nodes" by running ProcessUnprocessedOutcomesAsync
        // concurrently on the same context. The IsProcessed flag acts as the
        // database-level idempotency guard (the distributed lock prevents even
        // reaching this state in production).

        await using var ctx = _sql.CreateContext();
        ctx.EnableAdminContext();

        var patient  = await _sql.SeedPatientAsync(ctx, mrn: "DOCKER-DL-LOCK");
        var provider = await _sql.SeedProviderAsync(ctx, email: "docker.lock@test.com");
        var orgId    = SqlServerFixture.DefaultTenantId;

        // Seed 5 unprocessed outcomes
        for (int i = 0; i < 5; i++)
        {
            var enc = await _sql.SeedEncounterAsync(ctx, patient.Id, provider.Id);
            ctx.DiagnosticOutcomes.Add(DiagnosticOutcome.Create(
                enc.Id, patient.Id, provider.Id, orgId,
                "Differential", "PE", "I26.99", "PE", 0.49m, "Wells PE",
                aiWasCorrect: true, providerOverrode: false));
        }
        await ctx.SaveChangesAsync();

        // Run two concurrent processing passes
        var service = BuildService(ctx);
        var t1 = service.ProcessUnprocessedOutcomesAsync();
        var t2 = service.ProcessUnprocessedOutcomesAsync();
        var results = await Task.WhenAll(t1, t2);

        var totalProcessed = results.Sum();

        // Combined total must be exactly 5 — the idempotency guard prevents double-processing
        totalProcessed.Should().Be(5,
            "combined runs must process each outcome exactly once");

        var allSignals = await new DiagnosticLearningRepository(ctx)
            .GetSignalsAsync("Differential", "Wells PE",
                DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1));

        allSignals.Count.Should().Be(5, "exactly 5 signals — one per outcome");
    }
}
