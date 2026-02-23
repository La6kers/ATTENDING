using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using ATTENDING.Infrastructure.Services;
using Xunit;

namespace ATTENDING.Integration.Tests.Services;

public class AdminServiceTests
{
    private readonly AdminService _sut;

    public AdminServiceTests()
    {
        var cache = new Mock<IDistributedCache>();
        var logger = new Mock<ILogger<AdminService>>();
        _sut = new AdminService(cache.Object, logger.Object);
    }

    [Fact]
    public async Task GetDashboard_ShouldReturnSystemInfo()
    {
        var result = await _sut.GetDashboardAsync();

        result.Should().NotBeNull();
        result.System.Runtime.Should().Contain(".NET");
        result.System.MemoryUsedMb.Should().BeGreaterThan(0);
        result.System.Uptime.Should().BeCloseTo(TimeSpan.Zero, TimeSpan.FromSeconds(5));
        result.Integrations.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task GetFeatures_ShouldReturnFlagList()
    {
        var result = await _sut.GetFeaturesAsync("test-org");

        result.OrganizationId.Should().Be("test-org");
        result.TotalFeatures.Should().BeGreaterThan(0);
        result.EnabledCount.Should().BeGreaterThan(0);
        result.Features.Should().Contain(f => f.Key == "differential_diagnosis");
    }

    [Fact]
    public async Task GetAlerts_ShouldReturnEmpty()
    {
        var result = await _sut.GetAlertsAsync();

        result.ActiveCount.Should().Be(0);
        result.CriticalCount.Should().Be(0);
    }

    [Fact]
    public async Task AcknowledgeAlert_ShouldReturnTrue()
    {
        var result = await _sut.AcknowledgeAlertAsync(Guid.NewGuid(), "admin-user");
        result.Should().BeTrue();
    }

    [Fact]
    public async Task GetRateLimits_ShouldReturnTiers()
    {
        var result = await _sut.GetRateLimitsAsync();

        result.Tiers.Should().HaveCountGreaterThan(0);
        result.Tiers.Should().Contain(t => t.Name == "ai");
        result.Tiers.Should().Contain(t => t.Name == "standard");
    }
}
