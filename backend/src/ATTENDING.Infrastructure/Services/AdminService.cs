using System.Diagnostics;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using ATTENDING.Contracts.Responses;
using ATTENDING.Application.Interfaces;

namespace ATTENDING.Infrastructure.Services;

public class AdminService : IAdminService
{
    private static readonly DateTime _startTime = DateTime.UtcNow;
    private readonly IDistributedCache _cache;
    private readonly ILogger<AdminService> _logger;

    public AdminService(IDistributedCache cache, ILogger<AdminService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public Task<AdminDashboardResponse> GetDashboardAsync(CancellationToken ct = default)
    {
        var process = Process.GetCurrentProcess();
        var system = new SystemInfoResponse(
            Environment: Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            Runtime: $".NET {Environment.Version}",
            MemoryUsedMb: process.WorkingSet64 / 1024 / 1024,
            MemoryTotalMb: GC.GetGCMemoryInfo().TotalAvailableMemoryBytes / 1024 / 1024,
            Uptime: DateTime.UtcNow - _startTime,
            StartedAt: _startTime);

        // MVP: stats would come from metrics middleware in production
        var stats = new RequestStatsResponse(0, 0, 0, 0, 0, 0);

        var integrations = new List<IntegrationHealthResponse>
        {
            new("Database", "Healthy", DateTime.UtcNow, null),
            new("Cache", "Healthy", DateTime.UtcNow, null),
            new("BioMistral AI", "Healthy", DateTime.UtcNow, null)
        };

        return Task.FromResult(new AdminDashboardResponse(system, stats, integrations));
    }

    public Task<FeatureFlagListResponse> GetFeaturesAsync(string organizationId, CancellationToken ct = default)
    {
        // MVP: In-memory feature flags; production would use database/LaunchDarkly
        var features = new List<FeatureFlagResponse>
        {
            new("ambient_scribe", "AI ambient scribe for encounter documentation", true, null, null),
            new("differential_diagnosis", "AI-powered differential diagnosis", true, null, null),
            new("drug_interactions", "Automated drug interaction checking", true, null, null),
            new("patient_portal", "Patient-facing portal access", false, null, null),
            new("rpm_monitoring", "Remote patient monitoring", false, null, null),
            new("fhir_r4_export", "FHIR R4 bulk data export", true, null, null),
            new("predictive_analytics", "AI predictive patient analytics", false, null, null),
        };

        var enabled = features.Count(f => f.Enabled);
        return Task.FromResult(new FeatureFlagListResponse(organizationId, features, features.Count, enabled));
    }

    public Task SetFeatureOverrideAsync(string organizationId, string featureKey, bool value, CancellationToken ct = default)
    {
        _logger.LogInformation("Feature flag {Key} set to {Value} for org {OrgId}", featureKey, value, organizationId);
        // MVP: log only; production persists to database
        return Task.CompletedTask;
    }

    public Task<AlertListResponse> GetAlertsAsync(int historyLimit = 50, CancellationToken ct = default)
    {
        // MVP: empty alerts; production wires to alerting engine
        var active = new List<AlertResponse>();
        var history = new List<AlertResponse>();
        return Task.FromResult(new AlertListResponse(active, 0, 0, history));
    }

    public Task<bool> AcknowledgeAlertAsync(Guid alertId, string acknowledgedBy, CancellationToken ct = default)
    {
        _logger.LogInformation("Alert {AlertId} acknowledged by {User}", alertId, acknowledgedBy);
        return Task.FromResult(true);
    }

    public Task<RateLimitDashboardResponse> GetRateLimitsAsync(CancellationToken ct = default)
    {
        var tiers = new List<RateLimitTierResponse>
        {
            new("standard", 60, 100, "1min"),
            new("ai", 60, 20, "1min"),
            new("bulk", 3600, 50, "1h"),
            new("webhook", 60, 30, "1min"),
        };

        // MVP: no live usage; production reads from Redis
        return Task.FromResult(new RateLimitDashboardResponse(tiers, new List<RateLimitUsageResponse>(), 0));
    }
}
