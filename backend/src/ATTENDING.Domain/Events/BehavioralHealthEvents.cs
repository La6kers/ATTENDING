using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Events;

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL HEALTH DOMAIN EVENTS
//
// Safety-critical events (SuicideRiskDetectedEvent) are treated identically
// to RedFlagDetectedEvent and EmergencyProtocolTriggeredEvent — they wire
// directly into the SignalR notification hub for immediate provider alert.
//
// 42 CFR Part 2: PartTwoRecordCreatedEvent signals the access-control layer
// to apply restricted-disclosure rules to this screening record.
// ═══════════════════════════════════════════════════════════════════════════

#region Behavioral Health Screening Events

/// <summary>
/// Raised when a behavioral health screening session is opened.
/// Allows the provider dashboard to show "screening in progress" indicators.
/// </summary>
public class BehavioralHealthScreeningStartedEvent : DomainEvent
{
    public Guid ScreeningId { get; }
    public Guid PatientId { get; }
    public ScreeningInstrument Instrument { get; }

    public BehavioralHealthScreeningStartedEvent(
        Guid screeningId, Guid patientId, ScreeningInstrument instrument)
    {
        ScreeningId = screeningId;
        PatientId = patientId;
        Instrument = instrument;
    }
}

/// <summary>
/// Raised when a screening is scored and completed.
/// Triggers care gap closure and provider dashboard update.
/// </summary>
public class BehavioralHealthScreeningCompletedEvent : DomainEvent
{
    public Guid ScreeningId { get; }
    public Guid PatientId { get; }
    public ScreeningInstrument Instrument { get; }
    public int TotalScore { get; }
    public BehavioralHealthAction RecommendedAction { get; }

    public BehavioralHealthScreeningCompletedEvent(
        Guid screeningId,
        Guid patientId,
        ScreeningInstrument instrument,
        int totalScore,
        BehavioralHealthAction recommendedAction)
    {
        ScreeningId = screeningId;
        PatientId = patientId;
        Instrument = instrument;
        TotalScore = totalScore;
        RecommendedAction = recommendedAction;
    }
}

/// <summary>
/// Raised when C-SSRS scoring detects any level of active suicidal ideation or behavior.
///
/// SAFETY CRITICAL — this event is handled by the emergency notification pipeline
/// (same path as EmergencyProtocolTriggeredEvent) and fires a real-time SignalR alert
/// to the provider regardless of dashboard state.
///
/// IdeationLevel >= ActiveIdeationWithPlan ALWAYS triggers ImmediateSafetyIntervention.
/// </summary>
public class SuicideRiskDetectedEvent : DomainEvent
{
    public Guid ScreeningId { get; }
    public Guid PatientId { get; }
    public Guid? EncounterId { get; }
    public SuicideIdeationLevel IdeationLevel { get; }
    public SuicideBehaviorType BehaviorType { get; }
    public bool IsImmediate { get; }
    public string RecommendedAction { get; }

    public SuicideRiskDetectedEvent(
        Guid screeningId,
        Guid patientId,
        Guid? encounterId,
        SuicideIdeationLevel ideationLevel,
        SuicideBehaviorType behaviorType)
    {
        ScreeningId = screeningId;
        PatientId = patientId;
        EncounterId = encounterId;
        IdeationLevel = ideationLevel;
        BehaviorType = behaviorType;
        IsImmediate = ideationLevel >= SuicideIdeationLevel.ActiveIdeationWithPlan
                   || behaviorType >= SuicideBehaviorType.ActualAttempt;
        RecommendedAction = IsImmediate
            ? "Immediate safety intervention — do not leave patient unattended. Call 988 or 911."
            : "Document safety plan, restrict means, schedule urgent follow-up within 24-48 hours.";
    }
}

/// <summary>
/// Raised when a screening result is classified as a 42 CFR Part 2 protected record.
/// Triggers the restricted-access layer: this record requires patient-specific consent
/// before it can be disclosed to any third party, including other treating providers
/// outside a formal treatment relationship.
/// </summary>
public class PartTwoRecordCreatedEvent : DomainEvent
{
    public Guid ScreeningId { get; }
    public Guid PatientId { get; }
    public ScreeningInstrument Instrument { get; }

    public PartTwoRecordCreatedEvent(
        Guid screeningId, Guid patientId, ScreeningInstrument instrument)
    {
        ScreeningId = screeningId;
        PatientId = patientId;
        Instrument = instrument;
    }
}

/// <summary>
/// Raised when provider reviews and documents clinical action on a completed screening.
/// Closes the care gap and creates a permanent provider action record.
/// </summary>
public class BehavioralHealthScreeningReviewedEvent : DomainEvent
{
    public Guid ScreeningId { get; }
    public Guid PatientId { get; }
    public Guid ProviderId { get; }
    public BehavioralHealthAction ActionTaken { get; }

    public BehavioralHealthScreeningReviewedEvent(
        Guid screeningId, Guid patientId, Guid providerId, BehavioralHealthAction actionTaken)
    {
        ScreeningId = screeningId;
        PatientId = patientId;
        ProviderId = providerId;
        ActionTaken = actionTaken;
    }
}

#endregion
