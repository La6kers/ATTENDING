namespace ATTENDING.Contracts.Responses;

// ---------------------------------------------------------------
// Clinical Outcomes / Analytics
// ---------------------------------------------------------------

public record ClinicalOutcomesResponse(
    string Period,
    OutcomeSummary Summary,
    IReadOnlyList<DiagnosisOutcome> TopDiagnoses,
    IReadOnlyList<ProviderMetric> ProviderMetrics);

public record OutcomeSummary(
    int TotalEncounters,
    int CompletedEncounters,
    double AvgEncounterMinutes,
    int AiRecommendationsGenerated,
    double AiAcceptanceRate,
    int RedFlagsDetected,
    int CriticalLabResults);

public record DiagnosisOutcome(
    string Icd10Code,
    string Name,
    int Count,
    double AvgTimeToTreatmentMinutes);

public record ProviderMetric(
    Guid ProviderId,
    string ProviderName,
    int EncounterCount,
    double AvgEncounterMinutes,
    double PatientSatisfaction);

// ---------------------------------------------------------------
// Quality Measures / MIPS
// ---------------------------------------------------------------

public record QualityDashboardResponse(
    double CompositeScore,
    IReadOnlyList<QualityCategoryScore> Categories,
    IReadOnlyList<CareGapResponse> CareGaps,
    int TotalMeasures,
    int MeasuresMet);

public record QualityCategoryScore(
    string Category,
    double Score,
    double Weight,
    double WeightedScore,
    int MeasureCount);

public record CareGapResponse(
    Guid PatientId,
    string PatientName,
    string MeasureCode,
    string MeasureName,
    string GapDescription,
    string Priority,
    DateTime? DueDate);

public record QualityMeasureResponse(
    string Code,
    string Name,
    string Category,
    string Description,
    double PerformanceRate,
    int Numerator,
    int Denominator,
    double Benchmark,
    string Status);
