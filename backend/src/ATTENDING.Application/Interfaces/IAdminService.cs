using ATTENDING.Contracts.Responses;

namespace ATTENDING.Application.Interfaces;

/// <summary>
/// Platform administration service - dashboard, features, alerts, rate limits
/// </summary>
public interface IAdminService
{
    Task<AdminDashboardResponse> GetDashboardAsync(CancellationToken ct = default);
    Task<FeatureFlagListResponse> GetFeaturesAsync(string organizationId, CancellationToken ct = default);
    Task SetFeatureOverrideAsync(string organizationId, string featureKey, bool value, CancellationToken ct = default);
    Task<AlertListResponse> GetAlertsAsync(int historyLimit = 50, CancellationToken ct = default);
    Task<bool> AcknowledgeAlertAsync(Guid alertId, string acknowledgedBy, CancellationToken ct = default);
    Task<RateLimitDashboardResponse> GetRateLimitsAsync(CancellationToken ct = default);
}
