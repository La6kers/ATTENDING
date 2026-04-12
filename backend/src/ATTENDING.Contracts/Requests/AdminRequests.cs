namespace ATTENDING.Contracts.Requests;

public record SetFeatureFlagRequest(
    string FeatureKey,
    bool Value,
    string? OrganizationId = null);

public record AcknowledgeAlertRequest(Guid AlertId);

public record SetRateLimitOverrideRequest(
    string ApiKeyId,
    int MaxRequests,
    int? WindowSeconds = null,
    string? Reason = null);
