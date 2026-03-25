namespace ATTENDING.Domain.Enums;

/// <summary>
/// User roles in the ATTENDING system
/// </summary>
public enum UserRole
{
    Admin = 1,
    Provider = 2,
    Nurse = 3,
    Staff = 4,
    Patient = 5
}

/// <summary>
/// Order priority levels
/// </summary>
public enum OrderPriority
{
    Routine = 1,
    Urgent = 2,
    Asap = 3,
    Stat = 4
}

/// <summary>
/// Lab order status
/// </summary>
public enum LabOrderStatus
{
    Pending = 1,
    Collected = 2,
    Processing = 3,
    Resulted = 4,
    CriticalResult = 5,
    Cancelled = 6,
    Rejected = 7
}

/// <summary>
/// Imaging order status
/// </summary>
public enum ImagingOrderStatus
{
    Pending = 1,
    Scheduled = 2,
    InProgress = 3,
    Completed = 4,
    Preliminary = 5,
    Final = 6,
    Cancelled = 7
}

/// <summary>
/// Medication order status
/// </summary>
public enum MedicationOrderStatus
{
    Pending = 1,
    Active = 2,
    OnHold = 3,
    Completed = 4,
    Discontinued = 5,
    Cancelled = 6
}

/// <summary>
/// Referral order status
/// </summary>
public enum ReferralStatus
{
    Pending = 1,
    Sent = 2,
    Scheduled = 3,
    Completed = 4,
    Cancelled = 5,
    Declined = 6
}

/// <summary>
/// Encounter status
/// </summary>
public enum EncounterStatus
{
    Scheduled = 1,
    CheckedIn = 2,
    Roomed = 3,
    InProgress = 4,
    PendingResults = 5,
    PendingReview = 6,
    Completed = 7,
    Cancelled = 8,
    NoShow = 9
}

/// <summary>
/// Urgency level for clinical items
/// </summary>
public enum UrgencyLevel
{
    Standard = 1,
    Moderate = 2,
    High = 3,
    Emergency = 4
}

/// <summary>
/// Allergy severity
/// </summary>
public enum AllergySeverity
{
    Mild = 1,
    Moderate = 2,
    Severe = 3,
    LifeThreatening = 4
}

/// <summary>
/// Red flag severity for emergency detection
/// </summary>
public enum RedFlagSeverity
{
    Emergent = 1,
    Critical = 2
}

/// <summary>
/// Biological sex — strongly typed to enforce HL7/FHIR compatibility.
/// Stored as string in the database via EF HasConversion&lt;string&gt;().
/// The API layer (CreatePatientRequest) still accepts strings and parses
/// them to this enum in the command handler.
/// </summary>
public enum BiologicalSex
{
    Unknown = 0,
    Male = 1,
    Female = 2,
    Other = 3,
    PreferNotToSay = 4
}

/// <summary>
/// ESI Triage levels
/// </summary>
public enum TriageLevel
{
    Resuscitation = 1,  // ESI-1: Immediate life-saving intervention
    Emergent = 2,       // ESI-2: High risk, confused, severe pain
    Urgent = 3,         // ESI-3: Two or more resources needed
    LessUrgent = 4,     // ESI-4: One resource needed
    NonUrgent = 5       // ESI-5: No resources needed
}

// ── Care Gap enums ─────────────────────────────────────────────────────

public enum GapStatus
{
    Due = 1,         // Coming up (within screening window)
    Overdue = 2,     // Past due date
    Acknowledged = 3, // Provider addressed it this visit
    Closed = 4,      // Screening completed
    Excluded = 5     // Patient meets exclusion criteria (e.g., hospice)
}

public enum GapSeverity
{
    Upcoming = 0,  // Not yet due
    Low = 1,       // <90 days overdue
    Moderate = 2,  // 90–365 days overdue
    High = 3,      // 1–2 years overdue
    Critical = 4   // 2+ years overdue
}

// ── Ambient Scribe enums ─────────────────────────────────────────────────

/// <summary>
/// State machine for an ambient recording session
/// </summary>
public enum RecordingStatus
{
    AwaitingConsent = 1,
    ConsentGiven = 2,
    ConsentDeclined = 3,
    Recording = 4,
    Processing = 5,
    Completed = 6,
    Failed = 7
}

/// <summary>
/// Speaker role identified by Azure diarization
/// </summary>
public enum SpeakerRole
{
    Unknown = 0,
    Provider = 1,
    Patient = 2,
    Other = 3
}

/// <summary>
/// Status of an AI-generated SOAP note
/// </summary>
public enum NoteStatus
{
    Draft = 1,     // AI-generated, not yet reviewed
    Edited = 2,    // Provider has made edits
    Signed = 3,    // Provider signed — becomes part of medical record
    Rejected = 4   // Provider discarded the AI note
}

/// <summary>
/// Assessment phase in COMPASS flow
/// </summary>
public enum AssessmentPhase
{
    Idle = 0,
    Welcome = 1,
    Demographics = 2,
    ChiefComplaint = 3,
    HpiOnset = 4,
    HpiLocation = 5,
    HpiDuration = 6,
    HpiCharacter = 7,
    HpiSeverity = 8,
    HpiTiming = 9,
    HpiContext = 10,
    HpiModifying = 11,
    ReviewOfSystems = 12,
    MedicalHistory = 13,
    Medications = 14,
    Allergies = 15,
    SocialHistory = 16,
    RiskAssessment = 17,
    Summary = 18,
    ProviderHandoff = 19,
    Emergency = 99,
    Completed = 100
}
