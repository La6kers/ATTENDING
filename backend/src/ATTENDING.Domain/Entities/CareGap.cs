using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;

namespace ATTENDING.Domain.Entities;

// ═══════════════════════════════════════════════════════════════════════════
// PREVENTIVE CARE GAP DETECTION
//
// Clinical value: In rural settings, patients may see their provider only once
// per year. Missing a screening opportunity at that visit means a 12-month gap
// at minimum. This engine proactively surfaces every overdue USPSTF-recommended
// screening at the point of care — closing gaps that would otherwise slip through.
//
// Differentiation vs. EHRs: Legacy EHRs (Epic, Cerner) track measures but
// surface them in a quality dashboard, not at the point of care. ATTENDING
// fires a real-time alert during the encounter: "This patient is 14 months
// overdue for colorectal cancer screening."
//
// Rule basis: USPSTF Grade A and B recommendations (2024 edition).
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// A detected care gap for a specific patient and screening measure.
/// One record per patient per measure — upserted on each detection pass.
///
/// The gap is closed when the screening is completed and a result is recorded.
/// </summary>
public class CareGap : BaseEntity, IAggregateRoot, IHasDomainEvents
{
    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }

    /// <summary>Measure identifier — maps to a USPSTF recommendation</summary>
    public string MeasureCode { get; private set; } = string.Empty;

    /// <summary>Human-readable measure name</summary>
    public string MeasureName { get; private set; } = string.Empty;

    /// <summary>USPSTF grade: A, B, C, D, I</summary>
    public string UspstfGrade { get; private set; } = string.Empty;

    /// <summary>How far overdue this gap is</summary>
    public GapSeverity Severity { get; private set; }

    /// <summary>When the last screening was performed (null if never)</summary>
    public DateTime? LastCompletedAt { get; private set; }

    /// <summary>When the next screening is/was due</summary>
    public DateTime DueDate { get; private set; }

    /// <summary>How many days overdue (negative = still upcoming)</summary>
    public int DaysOverdue { get; private set; }

    /// <summary>
    /// Recommended interval in months (from USPSTF guidelines).
    /// Stored for display — actual interval is computed by the rule engine.
    /// </summary>
    public int RecommendedIntervalMonths { get; private set; }

    /// <summary>
    /// Brief clinical rationale to show the provider at point of care.
    /// E.g., "64-year-old female, not screened for colorectal cancer in 24 months."
    /// </summary>
    public string ClinicalRationale { get; private set; } = string.Empty;

    /// <summary>Suggested next action for the provider to take today</summary>
    public string SuggestedAction { get; private set; } = string.Empty;

    /// <summary>ICD-10 code for the preventive service (for billing)</summary>
    public string? PreventiveServiceCode { get; private set; }

    /// <summary>CPT code for the recommended screening</summary>
    public string? CptCode { get; private set; }

    /// <summary>Whether this gap was surfaced during the current encounter</summary>
    public bool SurfacedDuringEncounter { get; private set; }

    /// <summary>Encounter during which this gap was last surfaced</summary>
    public Guid? SurfacedInEncounterId { get; private set; }

    /// <summary>Whether the provider acknowledged/dismissed this gap</summary>
    public bool ProviderAcknowledged { get; private set; }

    /// <summary>Provider note when acknowledging (e.g., "Patient declined")</summary>
    public string? AcknowledgmentNote { get; private set; }

    public GapStatus Status { get; private set; }

    private readonly List<Domain.Events.DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<Domain.Events.DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    public void ClearDomainEvents() => _domainEvents.Clear();

    private CareGap() { }

    public static CareGap Create(
        Guid patientId,
        Guid organizationId,
        string measureCode,
        string measureName,
        string uspstfGrade,
        DateTime dueDate,
        int recommendedIntervalMonths,
        string clinicalRationale,
        string suggestedAction,
        DateTime? lastCompletedAt = null,
        string? preventiveServiceCode = null,
        string? cptCode = null)
    {
        var daysOverdue = (int)(DateTime.UtcNow.Date - dueDate.Date).TotalDays;

        var gap = new CareGap
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            MeasureCode = measureCode,
            MeasureName = measureName,
            UspstfGrade = uspstfGrade,
            DueDate = dueDate,
            DaysOverdue = daysOverdue,
            RecommendedIntervalMonths = recommendedIntervalMonths,
            ClinicalRationale = clinicalRationale,
            SuggestedAction = suggestedAction,
            LastCompletedAt = lastCompletedAt,
            PreventiveServiceCode = preventiveServiceCode,
            CptCode = cptCode,
            Status = daysOverdue > 0 ? GapStatus.Overdue : GapStatus.Due,
            Severity = CalculateSeverity(daysOverdue, uspstfGrade)
        };
        gap.SetOrganization(organizationId);
        return gap;
    }

    /// <summary>Update the gap with fresh calculation data on each detection pass</summary>
    public void Refresh(DateTime dueDate, DateTime? lastCompletedAt)
    {
        DueDate = dueDate;
        LastCompletedAt = lastCompletedAt;
        DaysOverdue = (int)(DateTime.UtcNow.Date - dueDate.Date).TotalDays;
        Status = DaysOverdue > 0 ? GapStatus.Overdue : GapStatus.Due;
        Severity = CalculateSeverity(DaysOverdue, UspstfGrade);
        SetModified();
    }

    /// <summary>Surface this gap during a provider encounter — triggers SignalR push</summary>
    public void SurfaceDuringEncounter(Guid encounterId)
    {
        SurfacedDuringEncounter = true;
        SurfacedInEncounterId = encounterId;
        _domainEvents.Add(new CareGapSurfacedEvent(Id, PatientId, encounterId, MeasureCode, MeasureName, Severity));
        SetModified();
    }

    /// <summary>Provider acknowledges this gap (addressed, declined by patient, etc.)</summary>
    public void Acknowledge(string? note = null)
    {
        ProviderAcknowledged = true;
        AcknowledgmentNote = note;
        Status = GapStatus.Acknowledged;
        SetModified();
    }

    /// <summary>Mark the gap as closed — screening was completed</summary>
    public void Close(DateTime completedAt)
    {
        LastCompletedAt = completedAt;
        Status = GapStatus.Closed;
        DaysOverdue = 0;
        SetModified();
        _domainEvents.Add(new CareGapClosedEvent(Id, PatientId, MeasureCode));
    }

    private static GapSeverity CalculateSeverity(int daysOverdue, string uspstfGrade)
    {
        if (daysOverdue <= 0) return GapSeverity.Upcoming;

        // Grade A recommendations are higher severity than Grade B
        var gradeMultiplier = uspstfGrade == "A" ? 1.2 : 1.0;
        var adjustedDays = daysOverdue * gradeMultiplier;

        return adjustedDays switch
        {
            < 90 => GapSeverity.Low,
            < 365 => GapSeverity.Moderate,
            < 730 => GapSeverity.High,
            _ => GapSeverity.Critical // 2+ years overdue
        };
    }
}
