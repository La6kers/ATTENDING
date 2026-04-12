using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.DTOs;

#region Patient DTOs

public record PatientDto(
    Guid Id,
    string MRN,
    string FirstName,
    string LastName,
    DateTime DateOfBirth,
    int Age,
    string Sex,
    string? Phone,
    string? Email,
    string? FullAddress,
    string PrimaryLanguage,
    bool IsActive);

public record PatientSummaryDto(
    Guid Id,
    string MRN,
    string FullName,
    int Age,
    string Sex);

public record PatientWithHistoryDto(
    Guid Id,
    string MRN,
    string FirstName,
    string LastName,
    DateTime DateOfBirth,
    int Age,
    string Sex,
    IReadOnlyList<AllergyDto> Allergies,
    IReadOnlyList<ConditionDto> Conditions);

public record AllergyDto(
    Guid Id,
    string Allergen,
    string? Reaction,
    string Severity,
    bool IsActive);

public record ConditionDto(
    Guid Id,
    string Code,
    string Name,
    DateTime? OnsetDate,
    bool IsActive);

#endregion

#region User DTOs

public record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    UserRole Role,
    string? NPI,
    string? Specialty,
    bool IsActive);

public record ProviderDto(
    Guid Id,
    string FullName,
    string? NPI,
    string? Specialty);

#endregion

#region Encounter DTOs

public record EncounterDto(
    Guid Id,
    string EncounterNumber,
    Guid PatientId,
    PatientSummaryDto? Patient,
    Guid ProviderId,
    ProviderDto? Provider,
    string Type,
    EncounterStatus Status,
    string? ChiefComplaint,
    DateTime? ScheduledAt,
    DateTime? CheckedInAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime CreatedAt);

#endregion

#region Lab Order DTOs

public record LabOrderDto(
    Guid Id,
    string OrderNumber,
    Guid PatientId,
    PatientSummaryDto? Patient,
    Guid EncounterId,
    Guid OrderingProviderId,
    ProviderDto? OrderingProvider,
    string TestCode,
    string TestName,
    string CptCode,
    string? CptDescription,
    string LoincCode,
    string Category,
    OrderPriority Priority,
    string ClinicalIndication,
    string DiagnosisCode,
    string? DiagnosisDescription,
    bool RequiresFasting,
    bool IsStatFromRedFlag,
    string? RedFlagReason,
    LabOrderStatus Status,
    DateTime OrderedAt,
    DateTime? CollectedAt,
    DateTime? ResultedAt,
    LabResultDto? Result);

public record LabOrderSummaryDto(
    Guid Id,
    string OrderNumber,
    string TestName,
    OrderPriority Priority,
    LabOrderStatus Status,
    DateTime OrderedAt,
    bool HasResult);

public record LabResultDto(
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

#endregion

#region Imaging Order DTOs

public record ImagingOrderDto(
    Guid Id,
    string OrderNumber,
    Guid PatientId,
    PatientSummaryDto? Patient,
    string StudyCode,
    string StudyName,
    string Modality,
    string BodyPart,
    string? Laterality,
    bool WithContrast,
    string CptCode,
    OrderPriority Priority,
    string ClinicalIndication,
    string DiagnosisCode,
    decimal? EstimatedRadiationDose,
    ImagingOrderStatus Status,
    DateTime OrderedAt,
    DateTime? ScheduledAt,
    DateTime? CompletedAt,
    ImagingResultDto? Result);

public record ImagingResultDto(
    Guid Id,
    string Findings,
    string Impression,
    bool HasCriticalFindings,
    string? CriticalFindingsDescription,
    string? ReadingRadiologist,
    DateTime ReadAt);

#endregion

#region Medication Order DTOs

public record MedicationOrderDto(
    Guid Id,
    string OrderNumber,
    Guid PatientId,
    PatientSummaryDto? Patient,
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
    MedicationOrderStatus Status,
    DateTime OrderedAt);

#endregion

#region Referral DTOs

public record ReferralDto(
    Guid Id,
    string ReferralNumber,
    Guid PatientId,
    PatientSummaryDto? Patient,
    string Specialty,
    UrgencyLevel Urgency,
    string ClinicalQuestion,
    string DiagnosisCode,
    string? ReasonForReferral,
    string? ReferredToProviderName,
    string? ReferredToFacility,
    string? InsuranceAuthNumber,
    DateTime? AuthExpirationDate,
    ReferralStatus Status,
    DateTime ReferredAt,
    DateTime? ScheduledAt,
    DateTime? CompletedAt,
    string? ConsultNotes);

#endregion

#region Assessment DTOs

public record AssessmentDto(
    Guid Id,
    string AssessmentNumber,
    Guid PatientId,
    PatientSummaryDto? Patient,
    string ChiefComplaint,
    AssessmentPhase CurrentPhase,
    TriageLevel? TriageLevel,
    int? PainSeverity,
    HpiDto? Hpi,
    bool HasRedFlags,
    IReadOnlyList<RedFlagDto>? RedFlags,
    bool IsEmergency,
    string? EmergencyReason,
    DateTime StartedAt,
    DateTime? CompletedAt,
    DateTime? ReviewedAt,
    Guid? ReviewedByProviderId);

public record HpiDto(
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

public record RedFlagDto(
    string Category,
    string MatchedKeyword,
    string Severity,
    string ClinicalReason);

public record AssessmentSummaryDto(
    Guid Id,
    string AssessmentNumber,
    PatientSummaryDto? Patient,
    string ChiefComplaint,
    AssessmentPhase CurrentPhase,
    TriageLevel? TriageLevel,
    bool HasRedFlags,
    bool IsEmergency,
    DateTime StartedAt,
    DateTime? CompletedAt);

#endregion

#region AI Recommendation DTOs

public record AiRecommendationDto(
    string RecommendationType,
    string Title,
    string Description,
    string? ClinicalRationale,
    string ConfidenceLevel,
    IReadOnlyList<RecommendedItemDto> RecommendedItems);

public record RecommendedItemDto(
    string Code,
    string Name,
    string? Description,
    OrderPriority SuggestedPriority,
    string? ClinicalRationale);

public record DrugInteractionDto(
    string Drug1,
    string Drug2,
    string Severity,
    string Description,
    string InteractionType);

#endregion
