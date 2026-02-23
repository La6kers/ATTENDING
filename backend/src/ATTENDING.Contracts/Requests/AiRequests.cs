namespace ATTENDING.Contracts.Requests;

public record DifferentialDiagnosisRequest(
    Guid PatientId,
    Guid? EncounterId = null,
    string? ChiefComplaint = null,
    string? HpiSummary = null);

public record TriageAssessmentRequest(
    string ChiefComplaint,
    string Symptoms,
    int? PainLevel = null);

public record SubmitAiFeedbackRequest(
    string RecommendationType,
    string RequestId,
    string Rating,
    int? AccuracyScore = null,
    string? SelectedDiagnosis = null,
    string? Comment = null,
    string? ModelVersion = null,
    Guid? PatientId = null,
    Guid? EncounterId = null);
