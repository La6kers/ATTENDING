using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using ATTENDING.Infrastructure.Services;
using Xunit;

namespace ATTENDING.Integration.Tests.Services;

public class AnalyticsServiceTests
{
    private readonly AnalyticsService _sut;

    public AnalyticsServiceTests()
    {
        var encounterRepo = new Mock<IEncounterRepository>();
        var feedbackRepo = new Mock<IAiFeedbackRepository>();
        feedbackRepo.Setup(r => r.GetStatsAsync(null, default))
            .ReturnsAsync((100, 75, 4.2));
        var logger = new Mock<ILogger<AnalyticsService>>();
        var bhQualityMeasures = BuildBehavioralHealthQualityMeasureService();
        _sut = new AnalyticsService(encounterRepo.Object, feedbackRepo.Object, bhQualityMeasures, logger.Object);
    }

    private static BehavioralHealthQualityMeasureService BuildBehavioralHealthQualityMeasureService()
    {
        var bhRepo = new Mock<IBehavioralHealthRepository>();
        bhRepo.Setup(r => r.GetPendingReviewAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BehavioralHealthScreening>());
        bhRepo.Setup(r => r.GetActiveSuicideRiskAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BehavioralHealthScreening>());
        return new BehavioralHealthQualityMeasureService(bhRepo.Object);
    }

    [Fact]
    public async Task GetOutcomes_ShouldReturnSummaryWithAiStats()
    {
        var result = await _sut.GetOutcomesAsync("quarter");

        result.Period.Should().Be("quarter");
        result.Summary.AiRecommendationsGenerated.Should().Be(100);
        result.Summary.AiAcceptanceRate.Should().Be(75.0);
    }

    [Fact]
    public async Task GetQualityDashboard_ShouldReturnMipsScores()
    {
        var result = await _sut.GetQualityDashboardAsync(Guid.NewGuid());

        result.CompositeScore.Should().BeGreaterThan(0);
        result.Categories.Should().HaveCount(4);
        result.Categories.Should().Contain(c => c.Category == "Quality");
        result.Categories.Should().Contain(c => c.Category == "Cost");
        result.TotalMeasures.Should().Be(15);
        result.MeasuresMet.Should().Be(12);
    }

    [Fact]
    public async Task GetQualityMeasures_ShouldReturnMeasureList()
    {
        var result = await _sut.GetQualityMeasuresAsync();

        result.Should().HaveCountGreaterThan(0);
        result.Should().Contain(m => m.Code == "CMS122v12");
        result.Should().Contain(m => m.Status == "Met");
        result.Should().Contain(m => m.Status == "Not Met");
    }

    [Fact]
    public async Task GetCareGaps_ShouldReturnEmptyList()
    {
        var result = await _sut.GetCareGapsAsync(Guid.NewGuid());
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetOutcomes_WithZeroFeedback_ShouldNotDivideByZero()
    {
        var encounterRepo = new Mock<IEncounterRepository>();
        var feedbackRepo = new Mock<IAiFeedbackRepository>();
        feedbackRepo.Setup(r => r.GetStatsAsync(null, default))
            .ReturnsAsync((0, 0, 0.0));
        var logger = new Mock<ILogger<AnalyticsService>>();
        var bhQualityMeasures = BuildBehavioralHealthQualityMeasureService();
        var sut = new AnalyticsService(encounterRepo.Object, feedbackRepo.Object, bhQualityMeasures, logger.Object);

        var result = await sut.GetOutcomesAsync("month");

        result.Summary.AiAcceptanceRate.Should().Be(0);
    }
}
