namespace ATTENDING.Contracts.Requests;

#region Lab Orders

/// <summary>
/// Request to create a new lab order
/// </summary>
public record CreateLabOrderRequest(
    Guid PatientId,
    Guid EncounterId,
    string TestCode,
    string TestName,
    string CptCode,
    string? CptDescription,
    decimal? CptBasePrice,
    string LoincCode,
    string Category,
    string Priority,
    string ClinicalIndication,
    string DiagnosisCode,
    string? DiagnosisDescription,
    bool RequiresFasting,
    int? PainSeverity = null);

/// <summary>
/// Request to update order priority
/// </summary>
public record UpdatePriorityRequest(string NewPriority);

/// <summary>
/// Request to cancel an order
/// </summary>
public record CancelOrderRequest(string Reason);

/// <summary>
/// Request to mark order as collected
/// </summary>
public record MarkCollectedRequest(DateTime CollectedAt);

/// <summary>
/// Request to add a lab result
/// </summary>
public record AddLabResultRequest(
    string Value,
    string? Unit,
    decimal? ReferenceRangeLow,
    decimal? ReferenceRangeHigh,
    string? ReferenceRangeText,
    string? Interpretation,
    bool IsCritical,
    string? PerformingLab,
    string? ResultedBy,
    string? Comments);

#endregion

#region Imaging Orders

/// <summary>
/// Request to create a new imaging order
/// </summary>
public record CreateImagingOrderRequest(
    Guid PatientId,
    Guid EncounterId,
    string StudyCode,
    string StudyName,
    string Modality,
    string BodyPart,
    string? Laterality,
    bool WithContrast,
    string CptCode,
    string Priority,
    string ClinicalIndication,
    string DiagnosisCode,
    decimal? EstimatedRadiationDose = null);

#endregion

#region Medication Orders

/// <summary>
/// Request to create a new medication order
/// </summary>
public record CreateMedicationOrderRequest(
    Guid PatientId,
    Guid EncounterId,
    string MedicationCode,
    string MedicationName,
    string GenericName,
    string Strength,
    string Form,
    string Route,
    string Frequency,
    string Dosage,
    int Quantity,
    int Refills,
    string? Instructions,
    string ClinicalIndication,
    string DiagnosisCode,
    bool IsControlledSubstance = false,
    string? DeaSchedule = null,
    string? PrescriberDeaNumber = null,
    bool? DispenseAsWritten = null,
    string? PharmacyId = null,
    string? PharmacyName = null);

#endregion

#region Referrals

/// <summary>
/// Request to create a new referral
/// </summary>
public record CreateReferralRequest(
    Guid PatientId,
    Guid EncounterId,
    string Specialty,
    string Urgency,
    string ClinicalQuestion,
    string DiagnosisCode,
    string? ReasonForReferral,
    string? ReferredToProviderId,
    string? ReferredToProviderName,
    string? ReferredToFacility);

#endregion

#region Assessments

/// <summary>
/// Request to start a new assessment
/// </summary>
public record StartAssessmentRequest(
    Guid PatientId,
    string ChiefComplaint);

/// <summary>
/// Request to advance assessment phase
/// </summary>
public record AdvanceAssessmentRequest(
    string NewPhase,
    Dictionary<string, string>? Data = null);

/// <summary>
/// Request to submit assessment response
/// </summary>
public record SubmitAssessmentResponseRequest(
    string Question,
    string Response);

#endregion

#region Common

/// <summary>
/// Pagination request parameters
/// </summary>
public record PaginationRequest(
    int Skip = 0,
    int Take = 20);

/// <summary>
/// Date range filter
/// </summary>
public record DateRangeFilter(
    DateTime? StartDate,
    DateTime? EndDate);

#endregion
