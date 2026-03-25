namespace ATTENDING.Contracts.Requests;

public record DifferentialDiagnosisRequest(
    Guid PatientId,
    Guid? EncounterId = null,
    Guid? AssessmentId = null,
    string? ChiefComplaint = null,
    string? HpiSummary = null);

public record TriageAssessmentRequest(
    string ChiefComplaint,
    string Symptoms,
    Guid? PatientId = null,
    Guid? AssessmentId = null,
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

/// <summary>
/// Request for the Tiered Clinical Intelligence pipeline.
/// </summary>
public record ClinicalIntelligenceRequest(
    Guid PatientId,
    Guid? EncounterId = null,
    Guid? AssessmentId = null);

/// <summary>
/// Request for calibrated diagnostic reasoning.
/// </summary>
public record CalibratedDiagnosticRequest(
    Guid PatientId,
    Guid? EncounterId = null,
    Guid? AssessmentId = null);
