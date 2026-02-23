namespace ATTENDING.Contracts.Responses;

public record AiDifferentialResponse(
    bool Success,
    string? Error,
    IReadOnlyList<AiDiagnosisItem>? Diagnoses,
    IReadOnlyList<string>? UrgentConsiderations);

public record AiDiagnosisItem(
    string? Icd10Code,
    string Name,
    string? Probability,
    string? Reasoning,
    IReadOnlyList<string>? RedFlags,
    IReadOnlyList<string>? RecommendedWorkup);

public record AiTriageResponse(
    bool Success,
    string? Error,
    string TriageLevel,
    string? Reasoning,
    IReadOnlyList<string>? RedFlags,
    string? TimeToProvider);

public record AiFeedbackResponse(
    Guid Id,
    string RecommendationType,
    string RequestId,
    string Rating,
    int? AccuracyScore,
    string? SelectedDiagnosis,
    string? Comment,
    DateTime CreatedAt);

public record AiFeedbackStatsResponse(
    int TotalFeedback,
    int HelpfulCount,
    double HelpfulPercentage,
    double AverageAccuracy);
