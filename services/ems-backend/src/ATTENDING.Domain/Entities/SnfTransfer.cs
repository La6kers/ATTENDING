// =============================================================================
// P16: SNF-to-Hospital Transfer Domain Entities
// =============================================================================
//
// Domain entities for structured SNF-to-Hospital transfer documentation.
// Follows Clean Architecture — entities contain domain logic and validation,
// no infrastructure dependencies.
//
// @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md
// @see prisma/p16-schema-additions.prisma
// =============================================================================

using System.Text.Json;

namespace ATTENDING.Domain.Entities;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

public enum TransferUrgency { Emergency, Urgent, Planned }
public enum TransferMode { Emergency, Urgent, Planned }

public enum TransferStatus
{
    Initiated,
    DataCollection,
    MarReconciliation,
    DocumentGeneration,
    ProviderReview,
    Transmitted,
    Acknowledged,
    InTransit,
    Completed,
    Cancelled
}

public enum MedicationStatus { Active, Held, Discontinued, Pending }
public enum MedicationAdminStatus { Given, Held, Refused, Omitted, Late }

public enum DiscrepancyType
{
    MissingFromFormulary,
    DoseMismatch,
    FrequencyMismatch,
    TherapeuticDuplication,
    DrugInteraction,
    AllergyConflict,
    RecentChange,
    ControlledSubstanceVerification,
    HighRiskMedication
}

public enum DiscrepancySeverity { Info, Warning, Critical }
public enum DiscrepancyResolutionType { Pending, Accepted, Substituted, Discontinued, DeferredToProvider }
public enum ReconciliationStatus { Pending, InProgress, PharmacistReview, ProviderReview, Completed, Overridden }

public enum CodeStatus { FullCode, DNR, DNR_DNI, ComfortMeasuresOnly, LimitedInterventions }
public enum AdvanceDirectiveDocType { POLST, MOLST, AdvanceDirective, DNROrder, LivingWill }
public enum TreatmentPreference { Yes, No, TrialPeriod }

public enum PressureInjuryStage { Stage1, Stage2, Stage3, Stage4, Unstageable, DTI }
public enum WoundType { PressureInjury, Surgical, Venous, Arterial, Diabetic, Trauma, Other }
public enum WoundBedType { Granulation, Slough, Eschar, Mixed, Epithelializing }

public enum IsolationPrecautionType { Contact, Droplet, Airborne, ContactPlus, Enteric, NeutropenicReverse }
public enum IsolationStatus { Active, Cleared, PendingClearance }

public enum FunctionalInstrumentType { Barthel, KatzADL, MorseFall, MDS_GG, Braden, Custom }
public enum TransferAssistanceLevel { Independent, Standby, MinAssist, ModAssist, MaxAssist, Dependent }
public enum CognitiveStatusLevel { Intact, MildImpairment, Moderate, Severe }

// ---------------------------------------------------------------------------
// TransferRequest
// ---------------------------------------------------------------------------

public class TransferRequest
{
    public string Id { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string? EncounterId { get; set; }

    public string SendingFacilityId { get; set; } = string.Empty;
    public string ReceivingFacilityId { get; set; } = string.Empty;
    public string? SendingProviderId { get; set; }
    public string? ReceivingProviderId { get; set; }

    public TransferUrgency UrgencyLevel { get; set; }
    public TransferMode Mode { get; set; }
    public TransferStatus Status { get; set; } = TransferStatus.Initiated;

    public string ReasonForTransfer { get; set; } = string.Empty;
    public List<string> IcdCodes { get; set; } = new();
    public string? PresentingSymptoms { get; set; }

    public bool PprFlagged { get; set; }
    public List<string>? PprDiagnosisCodes { get; set; }
    public DateTime? PprEvaluatedAt { get; set; }

    public string? InteractDocumentId { get; set; }
    public double? InteractComplianceScore { get; set; }

    public DateTime? EstimatedDeparture { get; set; }
    public DateTime? EstimatedArrival { get; set; }
    public DateTime? ActualDeparture { get; set; }
    public DateTime? ActualArrival { get; set; }
    public DateTime? TransmittedAt { get; set; }
    public DateTime? HospitalAcknowledgedAt { get; set; }
    public string? HospitalAcknowledgedBy { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    // Navigation
    public MARReconciliation? MarReconciliation { get; set; }
    public List<WoundAssessment> WoundAssessments { get; set; } = new();
    public List<SNFMedication> SnfMedications { get; set; } = new();

    // Domain methods
    public bool IsActive => Status != TransferStatus.Completed && Status != TransferStatus.Cancelled;
    public bool IsEmergency => Mode == TransferMode.Emergency;

    public void AdvanceStatus(TransferStatus newStatus)
    {
        // Validate transition
        var validTransitions = GetValidTransitions();
        if (!validTransitions.Contains(newStatus))
            throw new InvalidOperationException(
                $"Cannot transition from {Status} to {newStatus}");

        Status = newStatus;
        UpdatedAt = DateTime.UtcNow;
    }

    private HashSet<TransferStatus> GetValidTransitions() => Status switch
    {
        TransferStatus.Initiated => new() { TransferStatus.DataCollection, TransferStatus.Cancelled },
        TransferStatus.DataCollection => new() { TransferStatus.MarReconciliation, TransferStatus.DocumentGeneration, TransferStatus.Cancelled },
        TransferStatus.MarReconciliation => new() { TransferStatus.DocumentGeneration, TransferStatus.Cancelled },
        TransferStatus.DocumentGeneration => new() { TransferStatus.ProviderReview, TransferStatus.Transmitted, TransferStatus.Cancelled },
        TransferStatus.ProviderReview => new() { TransferStatus.Transmitted, TransferStatus.DataCollection, TransferStatus.Cancelled },
        TransferStatus.Transmitted => new() { TransferStatus.Acknowledged, TransferStatus.InTransit, TransferStatus.Cancelled },
        TransferStatus.Acknowledged => new() { TransferStatus.InTransit, TransferStatus.Completed, TransferStatus.Cancelled },
        TransferStatus.InTransit => new() { TransferStatus.Completed, TransferStatus.Cancelled },
        _ => new()
    };
}

// ---------------------------------------------------------------------------
// SNFMedication
// ---------------------------------------------------------------------------

public class SNFMedication
{
    public string Id { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string? TransferRequestId { get; set; }

    public string MedicationName { get; set; } = string.Empty;
    public string? GenericName { get; set; }
    public string? RxnormCode { get; set; }
    public string? NdcCode { get; set; }

    public string Dose { get; set; } = string.Empty;
    public string DoseUnit { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public List<string> ScheduledTimes { get; set; } = new();

    public bool IsPRN { get; set; }
    public string? PrnIndication { get; set; }

    public bool IsControlled { get; set; }
    public string? DeaSchedule { get; set; }

    public string? PrescribedBy { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public MedicationStatus Status { get; set; } = MedicationStatus.Active;

    public DateTime? HoldStartDate { get; set; }
    public DateTime? HoldEndDate { get; set; }
    public string? HoldReason { get; set; }

    public DateTime? LastDoseChange { get; set; }
    public string? PreviousDose { get; set; }
    public string? PreviousFrequency { get; set; }
    public string? ChangeReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public List<SNFMedicationAdministration> Administrations { get; set; } = new();
    public List<MARDiscrepancy> Discrepancies { get; set; } = new();

    // Domain methods
    public bool IsOnHold => Status == MedicationStatus.Held || (HoldStartDate.HasValue && !HoldEndDate.HasValue);
    public bool HasRecentChange(int days = 7) =>
        LastDoseChange.HasValue && LastDoseChange.Value >= DateTime.UtcNow.AddDays(-days);

    public bool IsHighRisk => IsControlled ||
        HighRiskCategories.Any(c =>
            (GenericName ?? MedicationName).Contains(c, StringComparison.OrdinalIgnoreCase));

    private static readonly string[] HighRiskCategories = new[]
    {
        "warfarin", "apixaban", "rivaroxaban", "enoxaparin", "heparin",
        "insulin", "oxycodone", "hydrocodone", "morphine", "fentanyl", "methadone",
        "tacrolimus", "cyclosporine", "mycophenolate",
        "digoxin", "lithium", "phenytoin", "amiodarone"
    };
}

// ---------------------------------------------------------------------------
// SNFMedicationAdministration
// ---------------------------------------------------------------------------

public class SNFMedicationAdministration
{
    public string Id { get; set; } = string.Empty;
    public string SnfMedicationId { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;

    public DateTime ScheduledTime { get; set; }
    public DateTime? AdministeredTime { get; set; }
    public string? AdministeredBy { get; set; }
    public string Dose { get; set; } = string.Empty;
    public string DoseUnit { get; set; } = string.Empty;
    public MedicationAdminStatus Status { get; set; }

    public string? HoldReason { get; set; }
    public string? RefusalReason { get; set; }
    public string? OmissionReason { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public SNFMedication? SnfMedication { get; set; }

    // Domain methods
    public bool WasAdministered => Status == MedicationAdminStatus.Given;
    public bool WasLate => Status == MedicationAdminStatus.Late;

    public TimeSpan? GetLateness() =>
        AdministeredTime.HasValue ? AdministeredTime.Value - ScheduledTime : null;
}

// ---------------------------------------------------------------------------
// HospitalFormularyEntry
// ---------------------------------------------------------------------------

public class HospitalFormularyEntry
{
    public string Id { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;

    public string MedicationName { get; set; } = string.Empty;
    public string GenericName { get; set; } = string.Empty;
    public string? RxnormCode { get; set; }
    public string? NdcCode { get; set; }

    public bool IsOnFormulary { get; set; } = true;
    public string? FormularyTier { get; set; }
    public string? TherapeuticClass { get; set; }
    public string? TherapeuticSubclass { get; set; }

    public string? FormularyAlternative { get; set; }
    public string? FormularyAlternativeRxnorm { get; set; }

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

// ---------------------------------------------------------------------------
// MARReconciliation
// ---------------------------------------------------------------------------

public class MARReconciliation
{
    public string Id { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string TransferRequestId { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;

    public ReconciliationStatus Status { get; set; } = ReconciliationStatus.Pending;

    public string? InitiatedBy { get; set; }
    public string? CompletedBy { get; set; }
    public string? PharmacistReviewBy { get; set; }
    public string? ProviderReviewBy { get; set; }

    public DateTime? InitiatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? PharmacistReviewAt { get; set; }
    public DateTime? ProviderReviewAt { get; set; }

    public int TotalMedications { get; set; }
    public int DiscrepancyCount { get; set; }
    public int CriticalDiscrepancyCount { get; set; }
    public int ResolvedCount { get; set; }

    public string? Notes { get; set; }
    public string? PharmacistNotes { get; set; }
    public string? ProviderNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public TransferRequest? TransferRequest { get; set; }
    public List<MARDiscrepancy> Discrepancies { get; set; } = new();

    // Domain methods
    public bool IsComplete => Status == ReconciliationStatus.Completed;
    public bool HasCriticalDiscrepancies => CriticalDiscrepancyCount > 0;
    public bool NeedsPharmacistReview => Discrepancies.Any(d =>
        d.Severity == DiscrepancySeverity.Critical && d.Resolution == DiscrepancyResolutionType.Pending);
    public double CompletionPercentage => DiscrepancyCount == 0 ? 100.0 :
        Math.Round((double)ResolvedCount / DiscrepancyCount * 100, 1);
}

// ---------------------------------------------------------------------------
// MARDiscrepancy
// ---------------------------------------------------------------------------

public class MARDiscrepancy
{
    public string Id { get; set; } = string.Empty;
    public string ReconciliationId { get; set; } = string.Empty;
    public string SnfMedicationId { get; set; } = string.Empty;

    public DiscrepancyType Type { get; set; }
    public DiscrepancySeverity Severity { get; set; }
    public string Description { get; set; } = string.Empty;

    public string SnfMedicationName { get; set; } = string.Empty;
    public string SnfDose { get; set; } = string.Empty;
    public string SnfFrequency { get; set; } = string.Empty;
    public string? SnfRoute { get; set; }

    public string? HospitalAlternative { get; set; }
    public string? HospitalAlternativeDose { get; set; }
    public string? HospitalAlternativeRxnorm { get; set; }

    public string? InteractingMedication { get; set; }
    public string? InteractionSeverity { get; set; }
    public string? InteractionDescription { get; set; }

    public DiscrepancyResolutionType Resolution { get; set; } = DiscrepancyResolutionType.Pending;
    public string? ResolvedBy { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolutionNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public MARReconciliation? Reconciliation { get; set; }
    public SNFMedication? SnfMedication { get; set; }

    // Domain methods
    public bool IsPending => Resolution == DiscrepancyResolutionType.Pending;
    public bool IsCritical => Severity == DiscrepancySeverity.Critical;

    public void Resolve(DiscrepancyResolutionType resolution, string resolvedBy, string? notes = null)
    {
        Resolution = resolution;
        ResolvedBy = resolvedBy;
        ResolvedAt = DateTime.UtcNow;
        ResolutionNotes = notes;
        UpdatedAt = DateTime.UtcNow;
    }
}

// ---------------------------------------------------------------------------
// AdvanceDirective
// ---------------------------------------------------------------------------

public class AdvanceDirective
{
    public string Id { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;

    public AdvanceDirectiveDocType DocumentType { get; set; }
    public CodeStatus CodeStatus { get; set; }

    public List<string>? TreatmentLimitations { get; set; }
    public TreatmentPreference? IntubationPreference { get; set; }
    public TreatmentPreference? DialysisPreference { get; set; }
    public string? AntibioticsPreference { get; set; }
    public string? NutritionDirective { get; set; }
    public string? HospitalizationPreference { get; set; }

    public DateTime EffectiveDate { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? SignedBy { get; set; }
    public string? WitnessedBy { get; set; }
    public string? PhysicianSignature { get; set; }

    public string? DocumentUrl { get; set; }
    public bool OcrProcessed { get; set; }
    public double? OcrConfidence { get; set; }

    public DateTime? VerifiedAt { get; set; }
    public string? VerifiedBy { get; set; }
    public string? VerificationMethod { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Domain methods
    public bool IsDNR => CodeStatus == Entities.CodeStatus.DNR ||
                         CodeStatus == Entities.CodeStatus.DNR_DNI ||
                         CodeStatus == Entities.CodeStatus.ComfortMeasuresOnly;

    public bool NeedsVerification => !VerifiedAt.HasValue ||
        VerifiedAt.Value < DateTime.UtcNow.AddDays(-90);

    public bool HasScannedDocument => !string.IsNullOrEmpty(DocumentUrl);
}

// ---------------------------------------------------------------------------
// WoundAssessment
// ---------------------------------------------------------------------------

public class WoundAssessment
{
    public string Id { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string? TransferRequestId { get; set; }

    public string Location { get; set; } = string.Empty;
    public WoundType Type { get; set; }
    public string? Etiology { get; set; }
    public PressureInjuryStage? Stage { get; set; }

    public double? Length { get; set; }
    public double? Width { get; set; }
    public double? Depth { get; set; }

    public string? Undermining { get; set; }
    public string? Tunneling { get; set; }
    public WoundBedType? WoundBed { get; set; }

    public string? Exudate { get; set; }
    public string? ExudateAmount { get; set; }
    public string? PeriWoundSkin { get; set; }
    public bool Odor { get; set; }

    public string? CurrentTreatment { get; set; }
    public string? DressingType { get; set; }

    public int? BradenScore { get; set; }
    public string? BradenSubscores { get; set; } // JSON

    public List<string>? PhotographIds { get; set; }
    public string? AiStagingSuggestion { get; set; }
    public double? AiStagingConfidence { get; set; }
    public string? AiNarrative { get; set; }
    public DateTime? AiProcessedAt { get; set; }

    public string? AssessedBy { get; set; }
    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Domain methods
    public bool IsPressureInjury => Type == WoundType.PressureInjury;
    public string DimensionString => $"{Length ?? 0} x {Width ?? 0} x {Depth ?? 0} cm";
    public bool HasAiAssessment => AiStagingSuggestion != null;

    public string GenerateCmsNarrative()
    {
        var parts = new List<string>
        {
            $"{Type} located at {Location}",
        };

        if (IsPressureInjury && Stage.HasValue)
            parts.Add($"Stage {Stage}");

        if (Length.HasValue && Width.HasValue)
        {
            parts.Add($"measuring {Length} x {Width}" +
                (Depth.HasValue ? $" x {Depth}" : "") + " cm");
        }

        if (WoundBed.HasValue)
            parts.Add($"wound bed: {WoundBed}");

        if (!string.IsNullOrEmpty(Exudate))
            parts.Add($"exudate: {Exudate}, {ExudateAmount ?? "unspecified amount"}");

        if (!string.IsNullOrEmpty(PeriWoundSkin))
            parts.Add($"periwound: {PeriWoundSkin}");

        parts.Add(Odor ? "odor present" : "no odor");

        if (!string.IsNullOrEmpty(CurrentTreatment))
            parts.Add($"current treatment: {CurrentTreatment}");

        return string.Join(". ", parts) + ".";
    }
}

// ---------------------------------------------------------------------------
// IsolationPrecaution
// ---------------------------------------------------------------------------

public class IsolationPrecaution
{
    public string Id { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;

    public IsolationPrecautionType PrecautionType { get; set; }
    public string? Organism { get; set; }
    public string? OrganismCode { get; set; }

    public DateTime? CultureDate { get; set; }
    public string? CultureSource { get; set; }
    public string? CultureResult { get; set; }
    public Dictionary<string, string>? Susceptibilities { get; set; }

    public List<string>? PpeRequirements { get; set; }
    public string? RoomRequirements { get; set; }
    public string? SpecialInstructions { get; set; }

    public string? ClearanceCriteria { get; set; }
    public DateTime? ClearanceDate { get; set; }

    public string? PreAssignedRoom { get; set; }

    public IsolationStatus Status { get; set; } = IsolationStatus.Active;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Domain methods
    public bool IsActive => Status == IsolationStatus.Active;
    public bool RequiresNegativePressure => RoomRequirements == "NEGATIVE_PRESSURE";
    public bool IsMDRO => new[] { "MRSA", "VRE", "CRE", "ESBL" }
        .Any(o => Organism?.Contains(o, StringComparison.OrdinalIgnoreCase) == true);
}

// ---------------------------------------------------------------------------
// FunctionalStatusAssessment
// ---------------------------------------------------------------------------

public class FunctionalStatusAssessment
{
    public string Id { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;

    public FunctionalInstrumentType InstrumentType { get; set; }
    public string? InstrumentVersion { get; set; }

    public double TotalScore { get; set; }
    public Dictionary<string, double> Subscores { get; set; } = new();
    public string? InterpretationLevel { get; set; }

    public List<string>? MobilityAids { get; set; }
    public string? WeightBearingStatus { get; set; }
    public TransferAssistanceLevel? TransferAssistance { get; set; }
    public CognitiveStatusLevel? CognitiveStatus { get; set; }
    public string? CommunicationStatus { get; set; }

    public string? AssessedBy { get; set; }
    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Domain methods
    public string GetInterpretation() => InstrumentType switch
    {
        FunctionalInstrumentType.Barthel => TotalScore switch
        {
            <= 20 => "Total Dependence",
            <= 60 => "Severe Dependence",
            <= 90 => "Moderate Dependence",
            <= 99 => "Slight Dependence",
            _ => "Independent"
        },
        FunctionalInstrumentType.MorseFall => TotalScore switch
        {
            <= 24 => "Low Risk",
            <= 44 => "Moderate Risk",
            _ => "High Risk"
        },
        FunctionalInstrumentType.Braden => TotalScore switch
        {
            <= 9 => "Very High Risk",
            <= 12 => "High Risk",
            <= 14 => "Moderate Risk",
            <= 18 => "Mild Risk",
            _ => "No Risk"
        },
        FunctionalInstrumentType.KatzADL => TotalScore switch
        {
            6 => "Full Function",
            4 or 5 => "Moderate Impairment",
            2 or 3 => "Severe Impairment",
            _ => "Very Severe Impairment"
        },
        _ => $"Score: {TotalScore}"
    };

    public bool IsWithinValidRange() => InstrumentType switch
    {
        FunctionalInstrumentType.Barthel => TotalScore is >= 0 and <= 100,
        FunctionalInstrumentType.KatzADL => TotalScore is >= 0 and <= 6,
        FunctionalInstrumentType.MorseFall => TotalScore is >= 0 and <= 125,
        FunctionalInstrumentType.Braden => TotalScore is >= 6 and <= 23,
        _ => true
    };
}
