using ATTENDING.Domain.Common;
using ATTENDING.Domain.Events;

namespace ATTENDING.Domain.Entities;

/// <summary>
/// Emergency access profile configured by the patient.
/// Opt-in only — patient must explicitly enable emergency medical access.
/// 
/// When enabled, the system monitors for high-G-force events (via DeviceMotionEvent API)
/// and allows first responders to access a read-only facesheet after identity verification.
/// 
/// Data cached to IndexedDB on the patient's device for offline access.
/// </summary>
public class EmergencyAccessProfile : BaseEntity, IHasDomainEvents
{
    public Guid Id { get; private set; }

    /// <summary>Patient who owns this profile</summary>
    public Guid PatientId { get; private set; }
    public Patient? Patient { get; private set; }

    /// <summary>Whether emergency access is enabled (patient opt-in required)</summary>
    public bool IsEnabled { get; private set; }

    /// <summary>G-force threshold to trigger emergency protocol (default: 4.0G)</summary>
    public decimal GForceThreshold { get; private set; } = 4.0m;

    /// <summary>Seconds before auto-granting access if patient doesn't cancel (default: 30s)</summary>
    public int AutoGrantTimeoutSeconds { get; private set; } = 30;

    /// <summary>Minutes the facesheet remains accessible per access session (default: 10)</summary>
    public int AccessWindowMinutes { get; private set; } = 10;

    /// <summary>Whether to show DNR status prominently (default: true)</summary>
    public bool ShowDnrStatus { get; private set; } = true;

    /// <summary>Whether to show medication list</summary>
    public bool ShowMedications { get; private set; } = true;

    /// <summary>Whether to show allergy list</summary>
    public bool ShowAllergies { get; private set; } = true;

    /// <summary>Whether to show active diagnoses</summary>
    public bool ShowDiagnoses { get; private set; } = true;

    /// <summary>Whether to show emergency contacts</summary>
    public bool ShowEmergencyContacts { get; private set; } = true;

    /// <summary>Whether to show implanted devices</summary>
    public bool ShowImplantedDevices { get; private set; } = true;

    /// <summary>When the patient last confirmed/reviewed their emergency profile</summary>
    public DateTime? LastReviewedAt { get; private set; }

    /// <summary>When emergency data was last cached to the patient's device</summary>
    public DateTime? LastCachedAt { get; private set; }

    // Domain events
    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    public void ClearDomainEvents() => _domainEvents.Clear();

    private EmergencyAccessProfile() { }

    public static EmergencyAccessProfile Create(Guid organizationId, Guid patientId)
    {
        return new EmergencyAccessProfile
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            PatientId = patientId,
            IsEnabled = false, // Must be explicitly opted in
        };
    }

    public void Enable()
    {
        IsEnabled = true;
        _domainEvents.Add(new EmergencyAccessEnabledEvent(Id, PatientId));
    }

    public void Disable()
    {
        IsEnabled = false;
        _domainEvents.Add(new EmergencyAccessDisabledEvent(Id, PatientId));
    }

    public void UpdateSettings(
        decimal? gForceThreshold = null,
        int? autoGrantTimeoutSeconds = null,
        int? accessWindowMinutes = null,
        bool? showDnr = null,
        bool? showMeds = null,
        bool? showAllergies = null,
        bool? showDiagnoses = null,
        bool? showContacts = null,
        bool? showImplants = null)
    {
        if (gForceThreshold.HasValue)
        {
            if (gForceThreshold.Value < 2.0m || gForceThreshold.Value > 20.0m)
                throw new DomainException("G-force threshold must be between 2.0 and 20.0");
            GForceThreshold = gForceThreshold.Value;
        }

        if (autoGrantTimeoutSeconds.HasValue)
        {
            if (autoGrantTimeoutSeconds.Value < 10 || autoGrantTimeoutSeconds.Value > 120)
                throw new DomainException("Auto-grant timeout must be between 10 and 120 seconds");
            AutoGrantTimeoutSeconds = autoGrantTimeoutSeconds.Value;
        }

        if (accessWindowMinutes.HasValue)
        {
            if (accessWindowMinutes.Value < 5 || accessWindowMinutes.Value > 30)
                throw new DomainException("Access window must be between 5 and 30 minutes");
            AccessWindowMinutes = accessWindowMinutes.Value;
        }

        if (showDnr.HasValue) ShowDnrStatus = showDnr.Value;
        if (showMeds.HasValue) ShowMedications = showMeds.Value;
        if (showAllergies.HasValue) ShowAllergies = showAllergies.Value;
        if (showDiagnoses.HasValue) ShowDiagnoses = showDiagnoses.Value;
        if (showContacts.HasValue) ShowEmergencyContacts = showContacts.Value;
        if (showImplants.HasValue) ShowImplantedDevices = showImplants.Value;
    }

    public void MarkReviewed() => LastReviewedAt = DateTime.UtcNow;

    public void MarkCached() => LastCachedAt = DateTime.UtcNow;
}

/// <summary>
/// Record of a first responder accessing a patient's emergency medical record.
/// Every field is required for HIPAA compliance.
/// 
/// This is an immutable audit record — once created, it cannot be modified or deleted.
/// </summary>
public class EmergencyAccessLog : BaseEntity, IHasDomainEvents
{
    public Guid Id { get; private set; }

    /// <summary>Patient whose record was accessed</summary>
    public Guid PatientId { get; private set; }

    /// <summary>Emergency profile that authorized this access</summary>
    public Guid EmergencyAccessProfileId { get; private set; }

    // ─── TRIGGER DATA ────────────────────────────────────────────────────

    /// <summary>How the emergency was triggered</summary>
    public string TriggerType { get; private set; } = ""; // "GForce", "Manual", "TimerAutoGrant"

    /// <summary>Peak G-force recorded at trigger (null if manual)</summary>
    public decimal? PeakGForce { get; private set; }

    /// <summary>How consent was obtained</summary>
    public string ConsentMethod { get; private set; } = ""; // "PatientApproved", "AutoGrantTimeout", "ManualOverride"

    /// <summary>Device GPS coordinates at time of trigger (if available)</summary>
    public decimal? TriggerLatitude { get; private set; }
    public decimal? TriggerLongitude { get; private set; }

    // ─── RESPONDER IDENTITY ──────────────────────────────────────────────

    /// <summary>First responder's full name as entered</summary>
    public string ResponderName { get; private set; } = "";

    /// <summary>Badge or ID number</summary>
    public string BadgeNumber { get; private set; } = "";

    /// <summary>Agency or department</summary>
    public string Agency { get; private set; } = "";

    /// <summary>Photo of the responder (stored as reference to blob storage, not inline)</summary>
    public string? ResponderPhotoUri { get; private set; }

    /// <summary>Whether the responder acknowledged the HIPAA notice</summary>
    public bool HipaaAcknowledged { get; private set; }

    // ─── ACCESS SESSION ──────────────────────────────────────────────────

    /// <summary>When access was granted</summary>
    public DateTime AccessGrantedAt { get; private set; }

    /// <summary>When the access window expires</summary>
    public DateTime AccessExpiresAt { get; private set; }

    /// <summary>When the responder actually stopped viewing (null if window expired)</summary>
    public DateTime? AccessEndedAt { get; private set; }

    /// <summary>Which sections were viewed during this access</summary>
    public string SectionsViewed { get; private set; } = ""; // CSV: "DNR,Allergies,Medications,Diagnoses"

    /// <summary>IP address or device identifier of accessing device</summary>
    public string? AccessDeviceInfo { get; private set; }

    // Domain events
    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    public void ClearDomainEvents() => _domainEvents.Clear();

    private EmergencyAccessLog() { }

    public static EmergencyAccessLog Create(
        Guid organizationId,
        Guid patientId,
        Guid profileId,
        string triggerType,
        decimal? peakGForce,
        string consentMethod,
        string responderName,
        string badgeNumber,
        string agency,
        string? responderPhotoUri,
        bool hipaaAcknowledged,
        int accessWindowMinutes,
        decimal? latitude = null,
        decimal? longitude = null,
        string? deviceInfo = null)
    {
        if (string.IsNullOrWhiteSpace(responderName))
            throw new DomainException("Responder name is required for emergency access");
        if (string.IsNullOrWhiteSpace(badgeNumber))
            throw new DomainException("Badge number is required for emergency access");
        if (string.IsNullOrWhiteSpace(agency))
            throw new DomainException("Agency is required for emergency access");
        if (!hipaaAcknowledged)
            throw new DomainException("HIPAA acknowledgment is required for emergency access");

        var now = DateTime.UtcNow;

        var log = new EmergencyAccessLog
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            PatientId = patientId,
            EmergencyAccessProfileId = profileId,
            TriggerType = triggerType,
            PeakGForce = peakGForce,
            ConsentMethod = consentMethod,
            ResponderName = responderName,
            BadgeNumber = badgeNumber,
            Agency = agency,
            ResponderPhotoUri = responderPhotoUri,
            HipaaAcknowledged = hipaaAcknowledged,
            AccessGrantedAt = now,
            AccessExpiresAt = now.AddMinutes(accessWindowMinutes),
            TriggerLatitude = latitude,
            TriggerLongitude = longitude,
            AccessDeviceInfo = deviceInfo,
        };

        log._domainEvents.Add(new EmergencyRecordAccessedEvent(
            log.Id, patientId, responderName, badgeNumber, agency, peakGForce));

        return log;
    }

    /// <summary>Record which sections the responder viewed</summary>
    public void RecordSectionsViewed(IEnumerable<string> sections)
    {
        SectionsViewed = string.Join(",", sections);
    }

    /// <summary>Mark the session as ended (responder closed the facesheet)</summary>
    public void EndSession()
    {
        if (AccessEndedAt == null)
            AccessEndedAt = DateTime.UtcNow;
    }

    /// <summary>Check if the access window is still valid</summary>
    public bool IsAccessValid() => DateTime.UtcNow < AccessExpiresAt && AccessEndedAt == null;
}

/// <summary>
/// Read-only snapshot of patient data served during emergency access.
/// Assembled from multiple sources and cached on the patient's device.
/// 
/// This is a Value Object — it has no identity of its own.
/// </summary>
public record EmergencyFacesheet(
    // Patient demographics
    string PatientName,
    string DateOfBirth,
    int Age,
    string Sex,
    string? BloodType,
    string? Weight,
    string? Height,
    string? Language,
    string Mrn,

    // Advance directives — most critical
    bool HasDnr,
    string? DnrDocumentedDate,
    string? DnrPhysician,
    bool IsFullCode,
    string? PowerOfAttorney,
    string? PoaPhone,
    bool HasLivingWill,
    bool IsOrganDonor,
    string? AdvanceDirectiveNotes,

    // Clinical data
    IReadOnlyList<EmergencyAllergy> Allergies,
    IReadOnlyList<EmergencyMedication> ActiveMedications,
    IReadOnlyList<EmergencyDiagnosis> ActiveDiagnoses,
    IReadOnlyList<EmergencyContact> EmergencyContacts,
    IReadOnlyList<EmergencyImplant> ImplantedDevices,

    // Metadata
    DateTime AssembledAt,
    string DataSource // "Live" | "Cached" | "Partial"
);

public record EmergencyAllergy(string Allergen, string Reaction, string Severity);
public record EmergencyMedication(string Name, string Dose, string Frequency, string? Purpose);
public record EmergencyDiagnosis(string Icd10Code, string Name, string? Since);
public record EmergencyContact(string Name, string Relation, string Phone, bool IsPrimary);
public record EmergencyImplant(string Device, string? ImplantDate, bool MriConditional);
