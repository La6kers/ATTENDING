namespace ATTENDING.Contracts.Responses;

// ---------------------------------------------------------------
// Admin Dashboard
// ---------------------------------------------------------------

public record AdminDashboardResponse(
    SystemInfoResponse System,
    RequestStatsResponse RequestStats,
    IReadOnlyList<IntegrationHealthResponse> Integrations);

public record SystemInfoResponse(
    string Environment,
    string Runtime,
    long MemoryUsedMb,
    long MemoryTotalMb,
    TimeSpan Uptime,
    DateTime StartedAt);

public record RequestStatsResponse(
    long TotalRequests,
    long TotalErrors,
    double ErrorRate,
    double AvgLatencyMs,
    double P95LatencyMs,
    double P99LatencyMs);

public record IntegrationHealthResponse(
    string Name,
    string Status,
    DateTime? LastChecked,
    string? ErrorMessage);

// ---------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------

public record FeatureFlagResponse(
    string Key,
    string Description,
    bool Enabled,
    string? OverrideScope,
    DateTime? UpdatedAt);

public record FeatureFlagListResponse(
    string OrganizationId,
    IReadOnlyList<FeatureFlagResponse> Features,
    int TotalFeatures,
    int EnabledCount);

// ---------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------

public record AlertResponse(
    Guid Id,
    string Name,
    string Severity,
    string Message,
    bool IsActive,
    DateTime? TriggeredAt,
    DateTime? AcknowledgedAt,
    string? AcknowledgedBy);

public record AlertListResponse(
    IReadOnlyList<AlertResponse> Active,
    int ActiveCount,
    int CriticalCount,
    IReadOnlyList<AlertResponse> History);

// ---------------------------------------------------------------
// Rate Limits
// ---------------------------------------------------------------

public record RateLimitTierResponse(
    string Name,
    int WindowSeconds,
    int MaxRequests,
    string WindowHuman);

public record RateLimitUsageResponse(
    string Key,
    string Tier,
    int RequestsUsed,
    int TtlSeconds);

public record RateLimitDashboardResponse(
    IReadOnlyList<RateLimitTierResponse> Tiers,
    IReadOnlyList<RateLimitUsageResponse> LiveUsage,
    int TotalTrackedKeys);
