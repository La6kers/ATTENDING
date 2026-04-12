namespace ATTENDING.Contracts.Requests;

public record AnalyticsQueryRequest(
    string Period = "quarter",
    Guid? ProviderId = null);
