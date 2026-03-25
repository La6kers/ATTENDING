namespace ATTENDING.Contracts.Responses;

#region Common

/// <summary>
/// Patient summary for nested responses
/// </summary>
public record PatientSummaryResponse(
    Guid Id,
    string MRN,
    string FullName,
    int Age,
    string Sex);

/// <summary>
/// Provider summary for nested responses
/// </summary>
public record ProviderSummaryResponse(
    Guid Id,
    string FullName,
    string? NPI,
    string? Specialty);

#endregion

#region Lab Orders

/// <summary>
/// Full lab order response
/// </summary>
public record LabOrderResponse(
    Guid Id,
    string OrderNumber,
    Guid PatientId,
    PatientSummaryResponse? Patient,
    Guid EncounterId,
    Guid OrderingProviderId,
    ProviderSummaryResponse? OrderingProvider,
    string TestCode,
    string TestName,
    string CptCode,
    string? CptDescription,
    string LoincCode,
    string Category,
    string Priority,
    string ClinicalIndication,
    string DiagnosisCode,
    string? DiagnosisDescription,
    bool RequiresFasting,
    bool IsStatFromRedFlag,
    string? RedFlagReason,
    string Status,
    DateTime OrderedAt,
    DateTime? CollectedAt,
    DateTime? ResultedAt,
    LabResultResponse? Result);

/// <summary>
/// Lab order summary response
/// </summary>
public record LabOrderSummaryResponse(
    Guid Id,
    string OrderNumber,
    string TestName,
    string Priority,
    string Status,
    DateTime OrderedAt,
    bool HasResult);

/// <summary>
/// Lab result response
/// </summary>
public record LabResultResponse(
    Guid Id,
    string Value,
    string? Unit,
    decimal? ReferenceRangeLow,
    decimal? ReferenceRangeHigh,
    string? ReferenceRangeText,
    string? Interpretation,
    bool IsCritical,
    DateTime? CriticalNotifiedAt,
    string? PerformingLab,
    DateTime ResultedAt,
    string? Comments);

/// <summary>
/// Response for lab order creation
/// </summary>
public record CreateLabOrderResponse(
    Guid LabOrderId,
    string OrderNumber,
    bool WasUpgradedToStat,
    string? RedFlagReason);

/// <summary>
/// Response for priority update
/// </summary>
public record UpdatePriorityResponse(
    string? PreviousPriority,
    string NewPriority);

/// <summary>
/// Response for adding result
/// </summary>
public record AddResultResponse(
    Guid ResultId,
    bool IsCritical);

#endregion

#region Imaging Orders

/// <summary>
/// Full imaging order response
/// </summary>
public record ImagingOrderResponse(
    Guid Id,
    string OrderNumber,
    Guid PatientId,
    PatientSummaryResponse? Patient,
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
    decimal? EstimatedRadiationDose,
    string Status,
    DateTime OrderedAt,
    DateTime? ScheduledAt,
    DateTime? CompletedAt,
    ImagingResultResponse? Result);

/// <summary>
/// Imaging result response
/// </summary>
public record ImagingResultResponse(
    Guid Id,
    string Findings,
    string Impression,
    bool HasCriticalFindings,
    string? CriticalFindingsDescription,
    string? ReadingRadiologist,
    DateTime ReadAt);

/// <summary>
/// Patient radiation dose summary
/// </summary>
public record RadiationDoseResponse(
    Guid PatientId,
    decimal TotalDoseMsv,
    int MonthsIncluded,
    string RiskLevel);

#endregion

#region Medication Orders

/// <summary>
/// Full medication order response
/// </summary>
public record MedicationOrderResponse(
    Guid Id,
    string OrderNumber,
    Guid PatientId,
    PatientSummaryResponse? Patient,
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
    bool IsControlledSubstance,
    string? DeaSchedule,
    bool HasBlackBoxWarning,
    string? PharmacyName,
    string Status,
    DateTime OrderedAt,
    IReadOnlyList<DrugInteractionResponse>? Interactions);

/// <summary>
/// Drug interaction response
/// </summary>
public record DrugInteractionResponse(
    string Drug1,
    string Drug2,
    string Severity,
    string Description,
    string InteractionType);

#endregion

#region Referrals

/// <summary>
/// Full referral response
/// </summary>
public record ReferralResponse(
    Guid Id,
    string ReferralNumber,
    Guid PatientId,
    PatientSummaryResponse? Patient,
    string Specialty,
    string Urgency,
    string ClinicalQuestion,
    string DiagnosisCode,
    string? ReasonForReferral,
    string? ReferredToProviderName,
    string? ReferredToFacility,
    string? InsuranceAuthNumber,
    DateTime? AuthExpirationDate,
    string Status,
    DateTime ReferredAt,
    DateTime? ScheduledAt,
    DateTime? CompletedAt,
    string? ConsultNotes);

#endregion

#region Assessments

/// <summary>
/// Full assessment response
/// </summary>
public record AssessmentResponse(
    Guid Id,
    string AssessmentNumber,
    Guid PatientId,
    PatientSummaryResponse? Patient,
    string ChiefComplaint,
    string CurrentPhase,
    string? TriageLevel,
    int? PainSeverity,
    HpiResponse? Hpi,
    bool HasRedFlags,
    IReadOnlyList<RedFlagResponse>? RedFlags,
    bool IsEmergency,
    string? EmergencyReason,
    DateTime StartedAt,
    DateTime? CompletedAt,
    DateTime? ReviewedAt);

/// <summary>
/// HPI (History of Present Illness) response
/// </summary>
public record HpiResponse(
    string? Onset,
    string? Location,
    string? Duration,
    string? Character,
    string? Aggravating,
    string? Relieving,
    string? Timing,
    string? Severity,
    string? Context,
    string? AssociatedSymptoms);

/// <summary>
/// Red flag response
/// </summary>
public record RedFlagResponse(
    string Category,
    string MatchedKeyword,
    string Severity,
    string ClinicalReason);

/// <summary>
/// Assessment summary for queue
/// </summary>
public record AssessmentSummaryResponse(
    Guid Id,
    string AssessmentNumber,
    PatientSummaryResponse? Patient,
    string ChiefComplaint,
    string CurrentPhase,
    string? TriageLevel,
    bool HasRedFlags,
    bool IsEmergency,
    DateTime StartedAt,
    DateTime? CompletedAt);

#endregion

#region AI Recommendations

/// <summary>
/// AI recommendation response
/// </summary>
public record AiRecommendationResponse(
    string RecommendationType,
    string Title,
    string Description,
    string? ClinicalRationale,
    string ConfidenceLevel,
    IReadOnlyList<RecommendedItemResponse> RecommendedItems);

/// <summary>
/// Recommended item response
/// </summary>
public record RecommendedItemResponse(
    string Code,
    string Name,
    string? Description,
    string SuggestedPriority,
    string? ClinicalRationale);

#endregion

#region Error Responses

/// <summary>
/// Validation error response
/// </summary>
public record ValidationErrorResponse(
    string Title,
    int Status,
    IDictionary<string, string[]> Errors);

#endregion
