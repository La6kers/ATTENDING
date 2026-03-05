using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;

namespace ATTENDING.Domain.Entities;

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL HEALTH SCREENING — Domain Entities
//
// Implements the four evidence-based screening instruments used in primary care
// settings, with special handling for:
//
//  1. C-SSRS suicide risk — emergency protocol triggers at IdeationLevel ≥ 4
//  2. 42 CFR Part 2 — substance use disorder (SUD) findings get a restricted-
//     disclosure flag. AUDIT-C/CAGE positives are NOT automatically shared with
//     other providers without explicit patient consent — more restrictive than HIPAA.
//  3. Integration with COMPASS — a PatientAssessment can spawn a screening session
//     (e.g., PHQ-2 positive during demographic phase → auto-start PHQ-9).
//
// Design: BehavioralHealthScreening is the aggregate root.
//         ScreeningResponse items are owned child entities (no separate repo).
//         Scoring is done by BehavioralHealthScoringService (pure domain logic).
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// One administration of a validated behavioral health screening instrument.
/// Aggregate root — owns the ScreeningResponse items and the computed score.
///
/// State machine:
///   Initiated → InProgress → Completed → Reviewed
///                          → Abandoned
/// </summary>
public class BehavioralHealthScreening : BaseEntity, IAggregateRoot, IHasDomainEvents
{
    public Guid Id { get; private set; }

    // ── Relationships ──────────────────────────────────────────────────────
    public Guid PatientId { get; private set; }
    public Guid? EncounterId { get; private set; }
    public Guid? AssessmentId { get; private set; }   // link back to COMPASS session
    public Guid AdministeredByProviderId { get; private set; }
    public Guid? ReviewedByProviderId { get; private set; }

    // ── Instrument ────────────────────────────────────────────────────────
    public ScreeningInstrument Instrument { get; private set; }
    public ScreeningStatus Status { get; private set; }

    // ── Scoring ───────────────────────────────────────────────────────────
    /// <summary>Raw numeric score (null until Completed)</summary>
    public int? TotalScore { get; private set; }

    /// <summary>Interpretation band (e.g., "Moderate" for PHQ-9 = 12)</summary>
    public string? ScoreInterpretation { get; private set; }

    // PHQ-9 specific
    public DepressionSeverity? DepressionSeverity { get; private set; }

    // GAD-7 specific
    public AnxietySeverity? AnxietySeverity { get; private set; }

    // C-SSRS specific — safety-critical fields
    public SuicideIdeationLevel? SuicideIdeationLevel { get; private set; }
    public SuicideBehaviorType? SuicideBehaviorType { get; private set; }

    /// <summary>
    /// True when PHQ-9 item 9 score > 0 OR C-SSRS IdeationLevel >= ActiveIdeationNoIntent.
    /// Used by provider dashboard to surface safety alerts.
    /// </summary>
    public bool HasSuicideRisk { get; private set; }

    // AUDIT-C specific
    public AlcoholRiskLevel? AlcoholRiskLevel { get; private set; }

    // PC-PTSD-5 specific
    public PtsdScreenResult? PtsdScreenResult { get; private set; }

    // ── 42 CFR Part 2 ──────────────────────────────────────────────────────
    /// <summary>
    /// True when this record constitutes a substance use disorder record under
    /// 42 CFR Part 2. Applies to any AUDIT-C/CAGE/DAST-10 result that confirms
    /// or suggests SUD. This flag triggers the restricted-access disclosure layer.
    /// </summary>
    public bool IsPartTwoProtected { get; private set; }

    /// <summary>
    /// Patient has given explicit written consent for disclosure of this
    /// 42 CFR Part 2 record. Null = consent not yet obtained.
    /// </summary>
    public bool? PartTwoConsentGiven { get; private set; }
    public DateTime? PartTwoConsentTimestamp { get; private set; }
    public string? PartTwoConsentCapturedBy { get; private set; }

    // ── Recommended Action ────────────────────────────────────────────────
    public BehavioralHealthAction RecommendedAction { get; private set; }

    /// <summary>Clinician-documented action taken (free text + structured enum)</summary>
    public BehavioralHealthAction? ActionTaken { get; private set; }
    public string? ProviderActionNotes { get; private set; }

    // ── Safety plan ───────────────────────────────────────────────────────
    /// <summary>
    /// JSON-serialized Stanley-Brown Safety Planning Intervention.
    /// Required when RecommendedAction == SafetyPlanRequired.
    /// </summary>
    public string? SafetyPlanJson { get; private set; }

    // ── Timing ────────────────────────────────────────────────────────────
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public DateTime? ReviewedAt { get; private set; }

    // ── Next screen due ───────────────────────────────────────────────────
    /// <summary>
    /// When to re-administer this instrument.
    /// Populated by scoring service based on severity and clinical guidelines.
    /// </summary>
    public DateTime? NextScreeningDue { get; private set; }

    // ── Navigation ────────────────────────────────────────────────────────
    public virtual Patient? Patient { get; private set; }
    public virtual Encounter? Encounter { get; private set; }
    public virtual ICollection<ScreeningResponse> Responses { get; private set; }
        = new List<ScreeningResponse>();

    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    public void ClearDomainEvents() => _domainEvents.Clear();

    private BehavioralHealthScreening() { }

    // ── Factory ───────────────────────────────────────────────────────────

    public static BehavioralHealthScreening Create(
        Guid patientId,
        Guid administeredByProviderId,
        ScreeningInstrument instrument,
        Guid organizationId,
        Guid? encounterId = null,
        Guid? assessmentId = null)
    {
        var screening = new BehavioralHealthScreening
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            EncounterId = encounterId,
            AssessmentId = assessmentId,
            AdministeredByProviderId = administeredByProviderId,
            Instrument = instrument,
            Status = ScreeningStatus.Initiated,
            StartedAt = DateTime.UtcNow,
        };
        screening.SetOrganization(organizationId);
        screening._domainEvents.Add(
            new BehavioralHealthScreeningStartedEvent(screening.Id, patientId, instrument));
        return screening;
    }

    // ── Response capture ──────────────────────────────────────────────────

    public void AddResponse(int itemNumber, string questionText, int responseValue, string responseText)
    {
        if (Status == ScreeningStatus.Completed || Status == ScreeningStatus.Abandoned)
            throw new InvalidOperationException($"Cannot add responses to a {Status} screening.");

        var response = ScreeningResponse.Create(Id, itemNumber, questionText, responseValue, responseText);
        Responses.Add(response);
        Status = ScreeningStatus.InProgress;
        SetModified();
    }

    // ── Scoring — called by BehavioralHealthScoringService ────────────────

    /// <summary>
    /// Apply PHQ-9 score. Item 9 (suicidal ideation) is safety-checked separately.
    /// </summary>
    public void ApplyPhq9Score(int totalScore, DepressionSeverity severity, bool item9Positive)
    {
        TotalScore = totalScore;
        DepressionSeverity = severity;
        ScoreInterpretation = $"PHQ-9: {totalScore}/27 — {severity}";
        RecommendedAction = severity switch
        {
            Enums.DepressionSeverity.None             => BehavioralHealthAction.NoActionRequired,
            Enums.DepressionSeverity.Mild             => BehavioralHealthAction.WatchfulWaiting,
            Enums.DepressionSeverity.Moderate         => BehavioralHealthAction.BriefCounseling,
            Enums.DepressionSeverity.ModeratelySevere => BehavioralHealthAction.ReferToBehavioralHealth,
            Enums.DepressionSeverity.Severe           => BehavioralHealthAction.ReferToBehavioralHealth,
            _ => BehavioralHealthAction.WatchfulWaiting
        };
        NextScreeningDue = severity == Enums.DepressionSeverity.None
            ? DateTime.UtcNow.AddMonths(12)
            : DateTime.UtcNow.AddWeeks(4);

        if (item9Positive)
        {
            HasSuicideRisk = true;
            // PHQ-9 item 9 positive escalates to C-SSRS — flag for provider
            if (RecommendedAction < BehavioralHealthAction.SafetyPlanRequired)
                RecommendedAction = BehavioralHealthAction.SafetyPlanRequired;
        }

        Complete();
    }

    /// <summary>
    /// Apply GAD-7 score.
    /// </summary>
    public void ApplyGad7Score(int totalScore, AnxietySeverity severity)
    {
        TotalScore = totalScore;
        AnxietySeverity = severity;
        ScoreInterpretation = $"GAD-7: {totalScore}/21 — {severity}";
        RecommendedAction = severity switch
        {
            Enums.AnxietySeverity.None     => BehavioralHealthAction.NoActionRequired,
            Enums.AnxietySeverity.Mild     => BehavioralHealthAction.WatchfulWaiting,
            Enums.AnxietySeverity.Moderate => BehavioralHealthAction.BriefCounseling,
            Enums.AnxietySeverity.Severe   => BehavioralHealthAction.ReferToBehavioralHealth,
            _ => BehavioralHealthAction.WatchfulWaiting
        };
        NextScreeningDue = severity == Enums.AnxietySeverity.None
            ? DateTime.UtcNow.AddMonths(12)
            : DateTime.UtcNow.AddWeeks(4);
        Complete();
    }

    /// <summary>
    /// Apply C-SSRS score. Safety-critical — any active ideation raises a domain event
    /// that routes through the emergency notification pipeline.
    /// </summary>
    public void ApplyCssrsScore(
        SuicideIdeationLevel ideationLevel,
        SuicideBehaviorType behaviorType)
    {
        SuicideIdeationLevel = ideationLevel;
        SuicideBehaviorType = behaviorType;
        HasSuicideRisk = ideationLevel > Enums.SuicideIdeationLevel.None
                      || behaviorType > Enums.SuicideBehaviorType.None;

        TotalScore = (int)ideationLevel;
        ScoreInterpretation = $"C-SSRS: Ideation={ideationLevel}, Behavior={behaviorType}";

        RecommendedAction = (ideationLevel, behaviorType) switch
        {
            (Enums.SuicideIdeationLevel.None, Enums.SuicideBehaviorType.None)
                => BehavioralHealthAction.NoActionRequired,
            (Enums.SuicideIdeationLevel.PassiveWishToBeDead, _)
                => BehavioralHealthAction.WatchfulWaiting,
            (Enums.SuicideIdeationLevel.ActiveIdeationNoIntent, _)
                => BehavioralHealthAction.SafetyPlanRequired,
            (>= Enums.SuicideIdeationLevel.ActiveIdeationWithIntent, _)
                => BehavioralHealthAction.ImmediateSafetyIntervention,
            (_, >= Enums.SuicideBehaviorType.ActualAttempt)
                => BehavioralHealthAction.ImmediateSafetyIntervention,
            _ => BehavioralHealthAction.SafetyPlanRequired
        };

        if (HasSuicideRisk)
        {
            _domainEvents.Add(new SuicideRiskDetectedEvent(
                Id, PatientId, EncounterId, ideationLevel, behaviorType));
        }

        Complete();
    }

    /// <summary>
    /// Apply AUDIT-C score. Positive screens are evaluated for 42 CFR Part 2 flag.
    /// Men: ≥4 positive; Women: ≥3 positive.
    /// </summary>
    public void ApplyAuditCScore(int totalScore, AlcoholRiskLevel riskLevel, bool isFemaleOrPregnant)
    {
        TotalScore = totalScore;
        AlcoholRiskLevel = riskLevel;
        ScoreInterpretation = $"AUDIT-C: {totalScore}/12 — {riskLevel}";
        RecommendedAction = riskLevel switch
        {
            Enums.AlcoholRiskLevel.LowRisk      => BehavioralHealthAction.NoActionRequired,
            Enums.AlcoholRiskLevel.ModerateRisk => BehavioralHealthAction.BriefCounseling,
            Enums.AlcoholRiskLevel.HighRisk     => BehavioralHealthAction.SubstanceUseTreatment,
            _ => BehavioralHealthAction.NoActionRequired
        };

        // 42 CFR Part 2: high-risk AUDIT-C indicates possible AUD — apply SUD protections
        if (riskLevel == Enums.AlcoholRiskLevel.HighRisk)
        {
            IsPartTwoProtected = true;
            _domainEvents.Add(new PartTwoRecordCreatedEvent(Id, PatientId, Instrument));
        }

        Complete();
    }

    /// <summary>
    /// Apply PC-PTSD-5 result.
    /// </summary>
    public void ApplyPcPtsd5Score(int totalScore, PtsdScreenResult result)
    {
        TotalScore = totalScore;
        PtsdScreenResult = result;
        ScoreInterpretation = $"PC-PTSD-5: {totalScore}/5 — {result}";
        RecommendedAction = result == Enums.PtsdScreenResult.Positive
            ? BehavioralHealthAction.ReferToBehavioralHealth
            : BehavioralHealthAction.NoActionRequired;
        NextScreeningDue = result == Enums.PtsdScreenResult.Negative
            ? DateTime.UtcNow.AddMonths(12)
            : null; // refer, don't re-screen in primary care
        Complete();
    }

    // ── 42 CFR Part 2 consent ─────────────────────────────────────────────

    public void RecordPartTwoConsent(bool consentGiven, string capturedBy)
    {
        if (!IsPartTwoProtected)
            throw new InvalidOperationException("This record is not 42 CFR Part 2 protected.");
        PartTwoConsentGiven = consentGiven;
        PartTwoConsentTimestamp = DateTime.UtcNow;
        PartTwoConsentCapturedBy = capturedBy;
        SetModified(capturedBy);
    }

    // ── Safety plan ───────────────────────────────────────────────────────

    public void RecordSafetyPlan(string safetyPlanJson, string providerId)
    {
        SafetyPlanJson = safetyPlanJson;
        SetModified(providerId);
    }

    // ── Provider review ───────────────────────────────────────────────────

    public void MarkReviewed(
        Guid providerId,
        BehavioralHealthAction actionTaken,
        string? notes = null)
    {
        if (Status != ScreeningStatus.Completed)
            throw new InvalidOperationException("Cannot review an incomplete screening.");

        ReviewedByProviderId = providerId;
        ReviewedAt = DateTime.UtcNow;
        ActionTaken = actionTaken;
        ProviderActionNotes = notes;
        Status = ScreeningStatus.Reviewed;
        SetModified(providerId.ToString());
        _domainEvents.Add(new BehavioralHealthScreeningReviewedEvent(
            Id, PatientId, providerId, actionTaken));
    }

    public void Abandon()
    {
        Status = ScreeningStatus.Abandoned;
        SetModified();
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private void Complete()
    {
        Status = ScreeningStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        SetModified();
        _domainEvents.Add(new BehavioralHealthScreeningCompletedEvent(
            Id, PatientId, Instrument, TotalScore ?? 0, RecommendedAction));
    }
}

/// <summary>
/// A single item response within a behavioral health screening.
/// Owned by BehavioralHealthScreening — no independent aggregate root.
/// </summary>
public class ScreeningResponse : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid ScreeningId { get; private set; }

    /// <summary>Item number (1-based) within the instrument</summary>
    public int ItemNumber { get; private set; }

    /// <summary>Full question text as administered</summary>
    public string QuestionText { get; private set; } = string.Empty;

    /// <summary>Numeric value of the response (Likert scale, 0-based)</summary>
    public int ResponseValue { get; private set; }

    /// <summary>Descriptive label of the response (e.g., "More than half the days")</summary>
    public string ResponseText { get; private set; } = string.Empty;

    public DateTime AnsweredAt { get; private set; }

    public virtual BehavioralHealthScreening? Screening { get; private set; }

    private ScreeningResponse() { }

    public static ScreeningResponse Create(
        Guid screeningId,
        int itemNumber,
        string questionText,
        int responseValue,
        string responseText)
    {
        return new ScreeningResponse
        {
            Id = Guid.NewGuid(),
            ScreeningId = screeningId,
            ItemNumber = itemNumber,
            QuestionText = questionText,
            ResponseValue = responseValue,
            ResponseText = responseText,
            AnsweredAt = DateTime.UtcNow,
        };
    }
}
