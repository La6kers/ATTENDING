namespace ATTENDING.Domain.Enums;

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL HEALTH ENUMS
//
// Covers the validated screening instruments used in primary care:
//   PHQ-9   — Major Depressive Disorder (Kroenke & Spitzer, 2001)
//   GAD-7   — Generalized Anxiety Disorder (Spitzer et al., 2006)
//   C-SSRS  — Columbia Suicide Severity Rating Scale (Posner et al., 2011)
//   AUDIT-C — Alcohol Use Disorders Identification Test, Consumption subscale
//   PC-PTSD-5 — Primary Care PTSD Screen for DSM-5
//
// 42 CFR Part 2 note:
//   Substance use disorder (SUD) records are governed by federal confidentiality
//   regulations stricter than HIPAA. AUDIT-C and CAGE results that confirm or
//   suggest SUD must be flagged, consent-tracked, and access-restricted separately
//   from general medical records. See BehavioralHealthScreening.IsPartTwoProtected.
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Which validated instrument was administered.
/// </summary>
public enum ScreeningInstrument
{
    PHQ2      = 1,   // 2-item depression screen (gateway to PHQ-9)
    PHQ9      = 2,   // 9-item depression severity
    GAD7      = 3,   // 7-item anxiety severity
    CSSRS     = 4,   // Columbia Suicide Severity Rating Scale
    AUDITC    = 5,   // 3-item alcohol consumption screen
    CAGE      = 6,   // 4-item alcohol/substance screen
    PCPTSD5   = 7,   // 5-item PTSD screen for primary care
    DAST10    = 8,   // Drug Abuse Screening Test, 10-item
}

/// <summary>
/// PHQ-9 severity bands per Kroenke et al. scoring rubric.
/// Score 0-4: None; 5-9: Mild; 10-14: Moderate; 15-19: ModeratelySevere; 20-27: Severe.
/// </summary>
public enum DepressionSeverity
{
    None             = 0,   // PHQ-9: 0-4
    Mild             = 1,   // PHQ-9: 5-9
    Moderate         = 2,   // PHQ-9: 10-14
    ModeratelySevere = 3,   // PHQ-9: 15-19
    Severe           = 4,   // PHQ-9: 20-27
}

/// <summary>
/// GAD-7 severity bands per Spitzer et al.
/// Score 0-4: None; 5-9: Mild; 10-14: Moderate; 15-21: Severe.
/// </summary>
public enum AnxietySeverity
{
    None     = 0,   // GAD-7: 0-4
    Mild     = 1,   // GAD-7: 5-9
    Moderate = 2,   // GAD-7: 10-14
    Severe   = 3,   // GAD-7: 15-21
}

/// <summary>
/// Columbia Suicide Severity Rating Scale — ideation level.
/// This is the safety-critical enum. Any value >= ActiveIdeationWithPlan
/// triggers an immediate emergency protocol and provider alert.
/// </summary>
public enum SuicideIdeationLevel
{
    None                        = 0,  // No ideation
    PassiveWishToBeDead         = 1,  // "I wish I were dead" — no intent to act
    ActiveIdeationNoIntent      = 2,  // Thinks of suicide but no plan/intent
    ActiveIdeationWithIntent    = 3,  // Intends to act but no specific plan
    ActiveIdeationWithPlan      = 4,  // Has plan AND intent — EMERGENCY
    ImmediateDanger             = 5,  // Active attempt or imminent danger — EMERGENCY
}

/// <summary>
/// C-SSRS behavior tier — distinct from ideation.
/// </summary>
public enum SuicideBehaviorType
{
    None                    = 0,
    PreparatoryBehavior     = 1,   // Gathering means, giving away possessions
    AbortedAttempt          = 2,   // Started but stopped a self-harm act
    InterruptedAttempt      = 3,   // Stopped by another person
    ActualAttempt           = 4,   // Completed a self-harm act
    NonSuicidalSelfInjury   = 5,   // Self-harm without intent to die
}

/// <summary>
/// AUDIT-C risk stratification.
/// Men: score ≥ 4 = positive screen. Women: score ≥ 3 = positive screen.
/// </summary>
public enum AlcoholRiskLevel
{
    LowRisk       = 0,
    ModerateRisk  = 1,   // Hazardous use
    HighRisk      = 2,   // Harmful use / AUD likely — 42 CFR Part 2 may apply
}

/// <summary>
/// PC-PTSD-5 result.
/// Positive screen = 3 or more items endorsed — refer for diagnostic assessment.
/// </summary>
public enum PtsdScreenResult
{
    Negative = 0,   // 0-2 items endorsed
    Positive = 1,   // ≥ 3 items endorsed — refer for full CAPS-5
}

/// <summary>
/// Workflow state of a behavioral health screening session.
/// Mirrors the pattern used by RecordingStatus and AssessmentPhase.
/// </summary>
public enum ScreeningStatus
{
    Initiated          = 1,   // Session opened, no responses yet
    InProgress         = 2,   // At least one response recorded
    Completed          = 3,   // All items answered, score computed
    Reviewed           = 4,   // Provider has reviewed and documented action
    Abandoned          = 5,   // Patient did not complete
    PendingSafetyPlan  = 6,   // Scored but safety plan required before completion
}

/// <summary>
/// Recommended clinical action after scoring.
/// Populated by the scoring service, surfaced on provider dashboard.
/// </summary>
public enum BehavioralHealthAction
{
    NoActionRequired          = 0,
    WatchfulWaiting           = 1,   // Mild screen — re-screen in 4-6 weeks
    BriefCounseling           = 2,   // Motivational interviewing, psychoeducation
    ReferToBehavioralHealth   = 3,   // Formal referral to psychiatry/psychology
    SafetyPlanRequired        = 4,   // C-SSRS level 2-3 — document safety plan
    ImmediateSafetyIntervention = 5, // C-SSRS level 4-5 — emergency protocol
    SubstanceUseTreatment     = 6,   // AUDIT-C / CAGE high risk — SUD referral
}
