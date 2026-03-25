using FluentAssertions;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Commands.BehavioralHealth;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using Moq;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

/// <summary>
/// Unit tests for behavioral health screening handlers.
///
/// Tests cover the full command pipeline:
///   StartScreening → AddResponse → ScoreScreening → ReviewScreening
///
/// Safety-critical paths tested explicitly:
///   - PHQ-9 item 9 positive → HasSuicideRisk + SafetyPlanRequired action
///   - C-SSRS IdeationLevel >= ActiveIdeationWithPlan → ImmediateSafetyIntervention
///   - AUDIT-C high risk → IsPartTwoProtected (42 CFR Part 2)
///
/// Domain events (SuicideRiskDetectedEvent, PartTwoRecordCreatedEvent) are
/// raised by the aggregate but tested here indirectly via result properties.
/// Direct event dispatch tests belong in DomainEventDispatchTests.cs.
/// </summary>
public class BehavioralHealthHandlerTests
{
    private static readonly Guid TestTenantId = new("00000000-0000-0000-0000-000000000001");
    private static readonly Guid TestPatientId = Guid.NewGuid();
    private static readonly Guid TestProviderId = Guid.NewGuid();

    private readonly Mock<IBehavioralHealthRepository> _repoMock = new();
    private readonly Mock<IUnitOfWork> _uowMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<StartScreeningHandler>> _loggerMock = new();
    private readonly Mock<ILogger<ScoreScreeningHandler>> _scoreLoggerMock = new();
    private readonly BehavioralHealthScoringService _scorer = new();

    public BehavioralHealthHandlerTests()
    {
        _currentUserMock.Setup(s => s.TenantId).Returns(TestTenantId);
        _currentUserMock.Setup(s => s.IsAuthenticated).Returns(true);
    }

    // ── StartScreening ────────────────────────────────────────────────────

    [Fact]
    public async Task StartScreening_ValidInput_ShouldSucceed()
    {
        var handler = new StartScreeningHandler(
            _repoMock.Object, _uowMock.Object, _currentUserMock.Object, _loggerMock.Object);

        var result = await handler.Handle(
            new StartScreeningCommand(TestPatientId, TestProviderId,
                ScreeningInstrument.PHQ9, null, null), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.ScreeningId.Should().NotBeEmpty();
        result.Value.Instrument.Should().Be(ScreeningInstrument.PHQ9);
        _repoMock.Verify(r => r.AddAsync(It.IsAny<BehavioralHealthScreening>(), default), Times.Once);
    }

    // ── ScoreScreening — PHQ-9 ────────────────────────────────────────────

    [Theory]
    [InlineData(new[] { 0, 0, 0, 0, 0, 0, 0, 0, 0 }, DepressionSeverity.None,     false)]
    [InlineData(new[] { 1, 1, 1, 1, 1, 0, 0, 0, 0 }, DepressionSeverity.Mild,     false)]
    [InlineData(new[] { 2, 2, 2, 1, 1, 1, 1, 0, 0 }, DepressionSeverity.Moderate, false)]
    [InlineData(new[] { 3, 3, 3, 2, 2, 2, 1, 1, 0 }, DepressionSeverity.ModeratelySevere, false)]
    [InlineData(new[] { 3, 3, 3, 3, 3, 3, 3, 3, 0 }, DepressionSeverity.Severe,   false)]
    public async Task ScorePhq9_ValidScores_ShouldReturnCorrectSeverity(
        int[] scores, DepressionSeverity expectedSeverity, bool expectedSuicideRisk)
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.PHQ9, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        var result = await handler.Handle(
            new ScoreScreeningCommand(screening.Id, scores), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.HasSuicideRisk.Should().Be(expectedSuicideRisk);
        screening.DepressionSeverity.Should().Be(expectedSeverity);
    }

    [Fact]
    public async Task ScorePhq9_Item9Positive_ShouldSetSuicideRiskAndEscalateAction()
    {
        // PHQ-9 item 9 (index 8) = 1 → suicidal ideation present
        var scores = new[] { 1, 1, 1, 1, 1, 1, 1, 1, 1 };
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.PHQ9, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        var result = await handler.Handle(
            new ScoreScreeningCommand(screening.Id, scores), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.HasSuicideRisk.Should().BeTrue();
        ((int)result.Value.RecommendedAction).Should()
            .BeGreaterThanOrEqualTo((int)BehavioralHealthAction.SafetyPlanRequired);
    }

    // ── ScoreScreening — GAD-7 ────────────────────────────────────────────

    [Theory]
    [InlineData(new[] { 0, 0, 0, 0, 0, 0, 0 }, AnxietySeverity.None)]
    [InlineData(new[] { 1, 1, 1, 1, 1, 0, 0 }, AnxietySeverity.Mild)]
    [InlineData(new[] { 2, 2, 2, 2, 1, 1, 0 }, AnxietySeverity.Moderate)]
    [InlineData(new[] { 3, 3, 3, 3, 3, 0, 0 }, AnxietySeverity.Severe)]
    public async Task ScoreGad7_ValidScores_ShouldReturnCorrectSeverity(
        int[] scores, AnxietySeverity expectedSeverity)
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.GAD7, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        var result = await handler.Handle(
            new ScoreScreeningCommand(screening.Id, scores), default);

        result.IsSuccess.Should().BeTrue();
        screening.AnxietySeverity.Should().Be(expectedSeverity);
    }

    // ── ScoreScreening — C-SSRS ───────────────────────────────────────────

    [Fact]
    public async Task ScoreCssrs_NoIdeation_ShouldNotSetSuicideRisk()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.CSSRS, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        var result = await handler.Handle(new ScoreScreeningCommand(
            screening.Id,
            Array.Empty<int>(),
            SuicideIdeationLevel.None,
            SuicideBehaviorType.None), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.HasSuicideRisk.Should().BeFalse();
        result.Value.RecommendedAction.Should().Be(BehavioralHealthAction.NoActionRequired);
    }

    [Fact]
    public async Task ScoreCssrs_ActiveIdeationWithPlan_ShouldTriggerImmediateIntervention()
    {
        // C-SSRS level 4 = has plan AND intent — EMERGENCY
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.CSSRS, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        var result = await handler.Handle(new ScoreScreeningCommand(
            screening.Id,
            Array.Empty<int>(),
            SuicideIdeationLevel.ActiveIdeationWithPlan,
            SuicideBehaviorType.None), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.HasSuicideRisk.Should().BeTrue();
        result.Value.RecommendedAction.Should().Be(BehavioralHealthAction.ImmediateSafetyIntervention);

        // Verify a SuicideRiskDetectedEvent was raised (aggregate raises events on ApplyCssrsScore)
        screening.DomainEvents.Should().ContainSingle(
            e => e is ATTENDING.Domain.Events.SuicideRiskDetectedEvent);
    }

    [Fact]
    public async Task ScoreCssrs_MissingEnumInputs_ShouldFail()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.CSSRS, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        // No enum inputs provided for C-SSRS
        var result = await handler.Handle(
            new ScoreScreeningCommand(screening.Id, Array.Empty<int>()), default);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BehavioralHealth.InvalidInput");
    }

    // ── ScoreScreening — AUDIT-C ──────────────────────────────────────────

    [Fact]
    public async Task ScoreAuditC_HighRisk_ShouldSetPartTwoProtected()
    {
        // AUDIT-C: scores 4+4+4 = 12 → HighRisk for any patient
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.AUDITC, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        var result = await handler.Handle(new ScoreScreeningCommand(
            screening.Id,
            new[] { 4, 4, 4 },
            IsFemaleOrPregnant: false), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.IsPartTwoProtected.Should().BeTrue("AUDIT-C HighRisk triggers 42 CFR Part 2");
        result.Value.RecommendedAction.Should().Be(BehavioralHealthAction.SubstanceUseTreatment);

        screening.DomainEvents.Should().ContainSingle(
            e => e is ATTENDING.Domain.Events.PartTwoRecordCreatedEvent);
    }

    [Fact]
    public async Task ScoreAuditC_LowRisk_ShouldNotSetPartTwoProtected()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.AUDITC, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        var result = await handler.Handle(new ScoreScreeningCommand(
            screening.Id,
            new[] { 0, 1, 0 },
            IsFemaleOrPregnant: false), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.IsPartTwoProtected.Should().BeFalse();
    }

    // ── ScoreScreening — PC-PTSD-5 ────────────────────────────────────────

    [Fact]
    public async Task ScorePcPtsd5_ThreeOrMoreEndorsed_ShouldBePositive()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.PCPTSD5, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        // Item 1 (trauma gateway) must be endorsed; 3 of 5 total = positive
        var result = await handler.Handle(
            new ScoreScreeningCommand(screening.Id, new[] { 1, 1, 1, 0, 0 }), default);

        result.IsSuccess.Should().BeTrue();
        screening.PtsdScreenResult.Should().Be(PtsdScreenResult.Positive);
        result.Value.RecommendedAction.Should().Be(BehavioralHealthAction.ReferToBehavioralHealth);
    }

    [Fact]
    public async Task ScorePcPtsd5_GatewayItemNotEndorsed_ShouldBeNegative()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.PCPTSD5, TestTenantId);

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        // Item 1 = 0 (no trauma) → all other items irrelevant, total forced to 0
        var result = await handler.Handle(
            new ScoreScreeningCommand(screening.Id, new[] { 0, 1, 1, 1, 1 }), default);

        result.IsSuccess.Should().BeTrue();
        screening.PtsdScreenResult.Should().Be(PtsdScreenResult.Negative);
    }

    // ── ScoreScreening — error cases ──────────────────────────────────────

    [Fact]
    public async Task ScoreScreening_NotFound_ShouldFail()
    {
        _repoMock.Setup(r => r.GetWithResponsesAsync(It.IsAny<Guid>(), default))
            .ReturnsAsync((BehavioralHealthScreening?)null);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        var result = await handler.Handle(
            new ScoreScreeningCommand(Guid.NewGuid(), new[] { 1, 2, 3 }), default);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BehavioralHealth.NotFound");
    }

    [Fact]
    public async Task ScoreScreening_AlreadyScored_ShouldFail()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.PHQ9, TestTenantId);

        // Score it once
        _scorer.ScorePhq9(screening, new[] { 0, 0, 0, 0, 0, 0, 0, 0, 0 });

        _repoMock.Setup(r => r.GetWithResponsesAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ScoreScreeningHandler(
            _repoMock.Object, _uowMock.Object, _scorer, _scoreLoggerMock.Object);

        // Score it again
        var result = await handler.Handle(
            new ScoreScreeningCommand(screening.Id, new[] { 1, 1, 1, 1, 1, 1, 1, 1, 1 }), default);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BehavioralHealth.AlreadyScored");
    }

    // ── ReviewScreening ───────────────────────────────────────────────────

    [Fact]
    public async Task ReviewScreening_WithSafetyPlan_ShouldSucceed()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.CSSRS, TestTenantId);

        // Score to Completed state first
        _scorer.ScoreCssrs(screening,
            SuicideIdeationLevel.ActiveIdeationNoIntent,
            SuicideBehaviorType.None);

        _repoMock.Setup(r => r.GetByIdAsync(screening.Id, default))
            .ReturnsAsync(screening);

        var handler = new ReviewScreeningHandler(_repoMock.Object, _uowMock.Object);

        var safetyPlan = """{"crisisContacts":["Dr. Smith: 555-1234"],"copingStrategies":["Call 988"]}""";
        var result = await handler.Handle(new ReviewScreeningCommand(
            screening.Id,
            TestProviderId,
            BehavioralHealthAction.SafetyPlanRequired,
            "Safety plan documented. Follow-up scheduled 48 hours.",
            safetyPlan), default);

        result.IsSuccess.Should().BeTrue();
        screening.Status.Should().Be(ScreeningStatus.Reviewed);
        screening.SafetyPlanJson.Should().Be(safetyPlan);
    }

    // ── BehavioralHealthScoringService direct unit tests ──────────────────

    [Fact]
    public void ScoringService_Phq9_WrongItemCount_ShouldThrow()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.PHQ9, TestTenantId);

        var act = () => _scorer.ScorePhq9(screening, new[] { 1, 2, 3 }); // 3 items, needs 9
        act.Should().Throw<ArgumentException>().WithMessage("*9*");
    }

    [Fact]
    public void ScoringService_Gad7_InvalidItemValue_ShouldThrow()
    {
        var screening = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.GAD7, TestTenantId);

        var act = () => _scorer.ScoreGad7(screening, new[] { 0, 0, 0, 0, 0, 0, 5 }); // 5 is invalid
        act.Should().Throw<ArgumentException>().WithMessage("*0-3*");
    }

    [Fact]
    public void ScoringService_AuditC_FemaleLowerThreshold_ShouldApply()
    {
        // Female threshold = 3; score of 3 should be ModerateRisk (not LowRisk as for male)
        var screeningFemale = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.AUDITC, TestTenantId);

        _scorer.ScoreAuditC(screeningFemale, new[] { 1, 1, 1 }, isFemaleOrPregnant: true);
        screeningFemale.AlcoholRiskLevel.Should().Be(AlcoholRiskLevel.ModerateRisk,
            "score of 3 meets the female threshold of ≥3");

        var screeningMale = BehavioralHealthScreening.Create(
            TestPatientId, TestProviderId, ScreeningInstrument.AUDITC, TestTenantId);

        _scorer.ScoreAuditC(screeningMale, new[] { 1, 1, 1 }, isFemaleOrPregnant: false);
        screeningMale.AlcoholRiskLevel.Should().Be(AlcoholRiskLevel.LowRisk,
            "score of 3 is below the male threshold of ≥4");
    }
}
