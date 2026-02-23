using FluentAssertions;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using Xunit;

namespace ATTENDING.Integration.Tests.Validators;

public class AdminContractTests
{
    [Fact]
    public void SetFeatureFlagRequest_ShouldAcceptOptionalOrg()
    {
        var req = new SetFeatureFlagRequest("ambient_scribe", true);
        req.OrganizationId.Should().BeNull();
        req.FeatureKey.Should().Be("ambient_scribe");
    }

    [Fact]
    public void AcknowledgeAlertRequest_ShouldHoldAlertId()
    {
        var id = Guid.NewGuid();
        var req = new AcknowledgeAlertRequest(id);
        req.AlertId.Should().Be(id);
    }

    [Fact]
    public void RateLimitOverrideRequest_ShouldHaveDefaults()
    {
        var req = new SetRateLimitOverrideRequest("key-123", 200);
        req.WindowSeconds.Should().BeNull();
        req.Reason.Should().BeNull();
    }

    [Fact]
    public void QualityDashboardResponse_ShouldCalculateComposite()
    {
        var categories = new List<QualityCategoryScore>
        {
            new("Quality", 80, 0.5, 40, 5),
            new("Cost", 60, 0.5, 30, 3),
        };
        var dashboard = new QualityDashboardResponse(70, categories, new List<CareGapResponse>(), 8, 6);
        dashboard.CompositeScore.Should().Be(70);
        dashboard.MeasuresMet.Should().Be(6);
    }
}
