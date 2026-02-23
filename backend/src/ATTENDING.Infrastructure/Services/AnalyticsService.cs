using Microsoft.Extensions.Logging;
using ATTENDING.Contracts.Responses;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly IEncounterRepository _encounterRepo;
    private readonly IAiFeedbackRepository _feedbackRepo;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(
        IEncounterRepository encounterRepo,
        IAiFeedbackRepository feedbackRepo,
        ILogger<AnalyticsService> logger)
    {
        _encounterRepo = encounterRepo;
        _feedbackRepo = feedbackRepo;
        _logger = logger;
    }

    public async Task<ClinicalOutcomesResponse> GetOutcomesAsync(
        string period, Guid? providerId = null, CancellationToken ct = default)
    {
        // MVP: Return aggregated stats from repository data
        // Production: dedicated analytics database with pre-computed materialized views
        var (feedbackTotal, feedbackHelpful, feedbackAvgAcc) = await _feedbackRepo.GetStatsAsync(cancellationToken: ct);

        var summary = new OutcomeSummary(
            TotalEncounters: 0,       // TODO: wire to encounter count query
            CompletedEncounters: 0,
            AvgEncounterMinutes: 0,
            AiRecommendationsGenerated: feedbackTotal,
            AiAcceptanceRate: feedbackTotal > 0 ? Math.Round((double)feedbackHelpful / feedbackTotal * 100, 1) : 0,
            RedFlagsDetected: 0,
            CriticalLabResults: 0);

        return new ClinicalOutcomesResponse(
            period, summary,
            new List<DiagnosisOutcome>(),
            new List<ProviderMetric>());
    }

    public Task<QualityDashboardResponse> GetQualityDashboardAsync(Guid providerId, CancellationToken ct = default)
    {
        // MVP: MIPS categories with placeholder scores
        var categories = new List<QualityCategoryScore>
        {
            new("Quality", 82.5, 0.45, 37.1, 6),
            new("Promoting Interoperability", 90.0, 0.25, 22.5, 4),
            new("Improvement Activities", 100.0, 0.15, 15.0, 2),
            new("Cost", 75.0, 0.15, 11.3, 3),
        };

        var composite = categories.Sum(c => c.WeightedScore);

        return Task.FromResult(new QualityDashboardResponse(
            Math.Round(composite, 1), categories,
            new List<CareGapResponse>(),
            TotalMeasures: 15, MeasuresMet: 12));
    }

    public Task<IReadOnlyList<CareGapResponse>> GetCareGapsAsync(Guid providerId, CancellationToken ct = default)
    {
        // MVP: empty; production queries patient registries against measure criteria
        return Task.FromResult<IReadOnlyList<CareGapResponse>>(new List<CareGapResponse>());
    }

    public Task<IReadOnlyList<QualityMeasureResponse>> GetQualityMeasuresAsync(string? specialty = null, CancellationToken ct = default)
    {
        var measures = new List<QualityMeasureResponse>
        {
            new("CMS122v12", "Diabetes: HbA1c Control", "Quality", "Percentage of patients with diabetes with HbA1c > 9%", 85.2, 170, 200, 80.0, "Met"),
            new("CMS165v12", "Controlling High Blood Pressure", "Quality", "Percentage of patients with BP adequately controlled", 78.5, 157, 200, 75.0, "Met"),
            new("CMS69v12", "BMI Screening and Follow-Up", "Quality", "BMI documented with follow-up plan", 92.0, 184, 200, 85.0, "Met"),
            new("CMS50v12", "Closing the Referral Loop", "Quality", "Receipt of specialist report", 65.0, 130, 200, 70.0, "Not Met"),
            new("CMS2v13", "Preventive Care: Screening for Depression", "Quality", "Depression screening with follow-up", 88.0, 176, 200, 80.0, "Met"),
        };

        return Task.FromResult<IReadOnlyList<QualityMeasureResponse>>(measures);
    }
}
