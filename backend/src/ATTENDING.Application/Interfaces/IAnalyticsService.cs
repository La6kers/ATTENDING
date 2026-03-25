using ATTENDING.Contracts.Responses;

namespace ATTENDING.Application.Interfaces;

/// <summary>
/// Clinical analytics and quality measures service
/// </summary>
public interface IAnalyticsService
{
    Task<ClinicalOutcomesResponse> GetOutcomesAsync(string period, Guid? providerId = null, CancellationToken ct = default);
    Task<QualityDashboardResponse> GetQualityDashboardAsync(Guid providerId, CancellationToken ct = default);
    Task<IReadOnlyList<CareGapResponse>> GetCareGapsAsync(Guid providerId, CancellationToken ct = default);
    Task<IReadOnlyList<QualityMeasureResponse>> GetQualityMeasuresAsync(string? specialty = null, CancellationToken ct = default);
}
