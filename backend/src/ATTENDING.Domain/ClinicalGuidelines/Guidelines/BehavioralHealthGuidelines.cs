using ATTENDING.Domain.ClinicalGuidelines;

namespace ATTENDING.Domain.ClinicalGuidelines.Guidelines;

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL HEALTH CLINICAL GUIDELINES
//
// These guidelines integrate with the GuidelineEvaluator and IClinicalGuideline
// framework — the same pattern as WellsPECriteria, HEART Score, etc.
//
// IMPORTANT: These guidelines are *screening* instruments, not diagnostic tools.
// A positive screen = "refer for diagnostic assessment", not "patient has X".
// All result text reflects this distinction explicitly.
//
// Sources:
//   PHQ-9:     Kroenke K et al. JGIM 2001;16:606-613
//   GAD-7:     Spitzer RL et al. Arch Intern Med 2006;166:1092-1097
//   C-SSRS:    Posner K et al. Arch Gen Psychiatry 2011;68(12):1266-1276
//   AUDIT-C:   Bush K et al. Arch Intern Med 1998;158(16):1789-1795
//   PC-PTSD-5: Prins A et al. J Gen Intern Med 2016;31(10):1206-1211
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// PHQ-9 Depression Severity Guideline.
///
/// Applicable when patient presents with depressive symptoms, fatigue,
/// anhedonia, sleep disturbance, or during routine annual wellness visits.
///
/// Scoring: Each of 9 items scored 0-3 ("not at all" to "nearly every day").
/// This guideline fires from chief complaint analysis; actual item-by-item
/// scoring is done by BehavioralHealthScoringService.
/// Here we represent the scoring rubric for AI context injection.
/// </summary>
public class Phq9DepressionGuideline : IClinicalGuideline
{
    public string GuidelineName => "PHQ-9 Patient Health Questionnaire";
    public string Version => "Kroenke & Spitzer, 2001 — USPSTF Grade B (2023)";
    public string SourceCitation => "Kroenke K, Spitzer RL. JGIM 2001;16:606-613";
    public string[] ApplicableComplaints => new[]
    {
        "depressed", "depression", "sad", "hopeless", "worthless", "anhedonia",
        "no interest", "fatigue", "tired all the time", "sleep problems", "insomnia",
        "poor concentration", "weight change", "suicidal", "self harm", "mood",
        "feeling down", "anxious", "anxiety", "mental health", "crying", "tearful"
    };

    public bool IsApplicable(GuidelineInput input)
    {
        // PHQ-9 applies to adults 18+ presenting with mood-related complaints
        // OR as annual preventive screen per USPSTF Grade B recommendation
        return input.PatientAge >= 18 && input.PresentationContains(ApplicableComplaints);
    }

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();

        // These represent the 9 PHQ-9 domains as clinical flag checks
        // (real scoring done by BehavioralHealthScoringService from patient responses)
        var depressedMood = input.PresentationContains("depressed", "sad", "hopeless", "down", "empty");
        criteria.Add(new("Depressed mood or hopelessness reported", depressedMood, 3m,
            depressedMood ? "Patient-reported" : null));

        var anhedonia = input.PresentationContains("no interest", "anhedonia", "nothing enjoyable", "lost interest");
        criteria.Add(new("Anhedonia (loss of interest or pleasure)", anhedonia, 3m,
            anhedonia ? "Patient-reported" : null));

        var sleepDisturbance = input.PresentationContains("insomnia", "sleep", "sleeping too much", "can't sleep");
        criteria.Add(new("Sleep disturbance present", sleepDisturbance, 2m, null));

        var fatigue = input.PresentationContains("fatigue", "tired", "no energy", "exhausted");
        criteria.Add(new("Fatigue or energy loss", fatigue, 2m, null));

        var suicidalIdeation = input.PresentationContains("suicidal", "want to die", "self harm", "end my life");
        criteria.Add(new("Suicidal ideation or self-harm thoughts", suicidalIdeation, 3m,
            suicidalIdeation ? "SAFETY FLAG — administer C-SSRS" : null));

        var duration = input.OldcartsContains("duration", "week") ||
                       input.OldcartsContains("duration", "month");
        criteria.Add(new("Symptoms present ≥ 2 weeks", duration, 1m, null));

        var flagCount = criteria.Count(c => c.Met);
        var score = (decimal)flagCount;

        // Pre-test probability based on flag count
        var preTest = flagCount switch
        {
            0 => 0.05m,
            1 => 0.15m,
            2 => 0.35m,
            >= 3 => 0.65m,
            _ => 0.05m
        };

        var risk = flagCount switch
        {
            0 => "Low",
            1 => "Low-Moderate",
            2 => "Moderate",
            _ => "High"
        };

        var recommendation = suicidalIdeation
            ? "SAFETY PRIORITY: Administer C-SSRS immediately. Do not leave patient unattended pending safety assessment."
            : flagCount >= 2
                ? "Administer full PHQ-9 now. Score ≥10 = moderate depression — initiate treatment discussion."
                : "Consider PHQ-9 at this visit per USPSTF Grade B preventive care recommendation.";

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 6m, risk, preTest, recommendation, criteria);
    }
}

/// <summary>
/// GAD-7 Generalized Anxiety Disorder Guideline.
/// Often paired with PHQ-9 — ATTENDING administers both when mood symptoms are present.
/// </summary>
public class Gad7AnxietyGuideline : IClinicalGuideline
{
    public string GuidelineName => "GAD-7 Generalized Anxiety Disorder Scale";
    public string Version => "Spitzer et al., 2006";
    public string SourceCitation => "Spitzer RL et al. Arch Intern Med 2006;166:1092-1097";
    public string[] ApplicableComplaints => new[]
    {
        "anxiety", "anxious", "worry", "worried", "nervous", "panic", "panic attack",
        "on edge", "restless", "irritable", "heart racing", "chest tightness",
        "dread", "fear", "phobia", "social anxiety", "generalized anxiety"
    };

    public bool IsApplicable(GuidelineInput input) =>
        input.PatientAge >= 18 && input.PresentationContains(ApplicableComplaints);

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();

        var uncontrollableWorry = input.PresentationContains("worry", "can't stop worrying", "anxious", "anxiousness");
        criteria.Add(new("Uncontrollable worry present", uncontrollableWorry, 3m, null));

        var panic = input.PresentationContains("panic", "panic attack", "sudden fear");
        criteria.Add(new("Panic episodes reported", panic, 3m, null));

        var somatic = input.PresentationContains("heart racing", "chest tight", "shortness of breath", "sweating", "trembling");
        criteria.Add(new("Somatic anxiety symptoms", somatic, 2m, null));

        var avoidance = input.PresentationContains("avoiding", "can't go out", "afraid to", "won't");
        criteria.Add(new("Avoidance behavior", avoidance, 2m, null));

        var duration = input.OldcartsContains("duration", "week") || input.OldcartsContains("duration", "month");
        criteria.Add(new("Symptoms ≥ 2 weeks", duration, 1m, null));

        var flagCount = criteria.Count(c => c.Met);
        var preTest = flagCount switch { 0 => 0.05m, 1 => 0.20m, 2 => 0.40m, _ => 0.60m };
        var risk = flagCount switch { 0 => "Low", 1 => "Low-Moderate", 2 => "Moderate", _ => "High" };

        return new GuidelineResult(
            GuidelineName, SourceCitation, flagCount, 5m, risk, preTest,
            flagCount >= 2
                ? "Administer GAD-7. Score ≥10 = moderate anxiety — initiate treatment or refer."
                : "Consider GAD-7 screening at this visit.",
            criteria);
    }
}

/// <summary>
/// Columbia Suicide Severity Rating Scale — Suicide Risk Guideline.
///
/// SAFETY CRITICAL. This is not a "nice to have" screen — it is mandatory
/// whenever PHQ-9 item 9 > 0 OR patient endorses any suicidal ideation.
///
/// The guideline fires as a CRITICAL recommendation to administer C-SSRS.
/// The actual C-SSRS scoring is clinician-administered and entered via
/// BehavioralHealthScoringService.ScoreCssrs().
/// </summary>
public class CssrsSuicideRiskGuideline : IClinicalGuideline
{
    public string GuidelineName => "Columbia Suicide Severity Rating Scale (C-SSRS)";
    public string Version => "Posner et al., 2011 — FDA recommended instrument";
    public string SourceCitation => "Posner K et al. Arch Gen Psychiatry 2011;68(12):1266-1276";
    public string[] ApplicableComplaints => new[]
    {
        "suicidal", "want to die", "self harm", "self-harm", "end my life",
        "kill myself", "hopeless", "no reason to live", "better off dead",
        "cutting", "overdose", "suicide attempt"
    };

    public bool IsApplicable(GuidelineInput input) =>
        input.PatientAge >= 12 && input.PresentationContains(ApplicableComplaints);

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();

        var activeSuicidalStatement = input.PresentationContains(
            "want to die", "kill myself", "end my life", "suicidal");
        criteria.Add(new("Active suicidal ideation statement", activeSuicidalStatement, 5m,
            activeSuicidalStatement ? "IMMEDIATE — patient verbalized suicidal ideation" : null));

        var passiveIdeation = input.PresentationContains(
            "better off dead", "wish I were dead", "no reason to live", "hopeless");
        criteria.Add(new("Passive death wish / hopelessness", passiveIdeation, 3m, null));

        var priorAttempt = input.HasCondition("suicide attempt", "prior overdose", "self-harm history");
        criteria.Add(new("Prior suicide attempt or self-harm history", priorAttempt, 4m,
            priorAttempt ? "RISK MULTIPLIER — prior attempts increase risk 30-40x" : null));

        var meansAccess = input.PresentationContains("gun", "firearm", "pills", "stockpiling", "rope");
        criteria.Add(new("Access to lethal means identified", meansAccess, 4m,
            meansAccess ? "MEANS RESTRICTION counseling required" : null));

        var isImmediate = activeSuicidalStatement || (passiveIdeation && priorAttempt);
        var score = criteria.Where(c => c.Met).Sum(c => c.Points);
        var risk = isImmediate ? "CRITICAL" : passiveIdeation ? "High" : "Moderate";
        var preTest = isImmediate ? 0.85m : passiveIdeation ? 0.50m : 0.25m;

        var recommendation = isImmediate
            ? "EMERGENCY: Administer C-SSRS immediately. Do not leave patient alone. "
              + "Safety plan required. Consider emergency psychiatric evaluation."
            : "Administer C-SSRS at this visit. Document safety plan. "
              + "Restrict access to lethal means. Follow-up within 48 hours.";

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 16m, risk, preTest, recommendation, criteria);
    }
}

/// <summary>
/// AUDIT-C Alcohol Use Screening Guideline.
///
/// 42 CFR Part 2 note: Positive screens suggesting AUD will be flagged as
/// Part 2 protected records. This is enforced at the entity layer
/// (BehavioralHealthScreening.IsPartTwoProtected) and signaled by
/// PartTwoRecordCreatedEvent.
/// </summary>
public class AuditCAlcoholGuideline : IClinicalGuideline
{
    public string GuidelineName => "AUDIT-C Alcohol Use Disorders Identification Test";
    public string Version => "Bush et al., 1998 — USPSTF Grade B";
    public string SourceCitation => "Bush K et al. Arch Intern Med 1998;158(16):1789-1795";
    public string[] ApplicableComplaints => new[]
    {
        "alcohol", "drinking", "drink too much", "blackout", "drunk",
        "hangover", "liver", "can't stop drinking", "substance", "substance use",
        "beer", "wine", "spirits", "withdrawal", "tremors after stopping"
    };

    public bool IsApplicable(GuidelineInput input) =>
        input.PatientAge >= 18 && input.PresentationContains(ApplicableComplaints);

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();

        var heavyUse = input.PresentationContains("drink every day", "daily drinking", "drink most days");
        criteria.Add(new("Frequent drinking pattern reported", heavyUse, 3m, null));

        var binge = input.PresentationContains("blackout", "binge", "drink a lot at once", "6 or more");
        criteria.Add(new("Binge drinking episodes", binge, 3m, null));

        var withdrawal = input.PresentationContains("withdrawal", "shakes", "tremors", "seizure", "DTs");
        criteria.Add(new("Withdrawal symptoms (suggests physiologic dependence)", withdrawal, 4m,
            withdrawal ? "CLINICAL PRIORITY — assess for alcohol withdrawal syndrome" : null));

        var impairment = input.PresentationContains("DUI", "lost job", "relationship", "can't function");
        criteria.Add(new("Functional impairment from alcohol use", impairment, 2m, null));

        var liver = input.HasCondition("fatty liver", "cirrhosis", "hepatitis", "elevated ALT", "elevated AST");
        criteria.Add(new("Liver disease — possible alcohol etiology", liver, 2m, null));

        var flagCount = criteria.Count(c => c.Met);
        var risk = flagCount switch { 0 => "Low", 1 => "Moderate", _ => "High" };
        var preTest = flagCount switch { 0 => 0.10m, 1 => 0.30m, _ => 0.65m };

        var recommendation = withdrawal
            ? "URGENT: Assess for alcohol withdrawal syndrome (CIWA-Ar). Hospitalization may be required."
            : flagCount >= 2
                ? "Administer AUDIT-C. Positive screen requires brief intervention (FRAMES model) + SUD referral. "
                  + "NOTE: Positive SUD findings are 42 CFR Part 2 protected — separate consent required for disclosure."
                : "Administer AUDIT-C as USPSTF Grade B preventive screen.";

        return new GuidelineResult(
            GuidelineName, SourceCitation, flagCount, 5m, risk, preTest, recommendation, criteria);
    }
}

/// <summary>
/// PC-PTSD-5 Primary Care PTSD Screen.
/// Applicable when patient discloses trauma, presents with hyperarousal,
/// nightmares, avoidance, or has history of military service, assault, or abuse.
/// </summary>
public class PcPtsd5Guideline : IClinicalGuideline
{
    public string GuidelineName => "PC-PTSD-5 Primary Care PTSD Screen for DSM-5";
    public string Version => "Prins et al., 2016";
    public string SourceCitation => "Prins A et al. J Gen Intern Med 2016;31(10):1206-1211";
    public string[] ApplicableComplaints => new[]
    {
        "trauma", "traumatic", "PTSD", "flashback", "nightmare", "assault",
        "abuse", "combat", "veteran", "military", "accident", "attack",
        "hypervigilance", "startle", "avoiding", "numb", "detached", "estranged"
    };

    public bool IsApplicable(GuidelineInput input) =>
        input.PatientAge >= 18 && input.PresentationContains(ApplicableComplaints);

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();

        var traumaExposure = input.PresentationContains(
            "trauma", "assault", "abuse", "combat", "accident", "attack", "disaster");
        criteria.Add(new("Trauma exposure disclosed (gateway item)", traumaExposure, 1m,
            traumaExposure ? "Patient disclosed traumatic event(s)" : null));

        var nightmares = input.PresentationContains("nightmare", "bad dream", "flashback", "intrusive");
        criteria.Add(new("Nightmares or intrusive re-experiencing", nightmares, 1m, null));

        var avoidance = input.PresentationContains("avoiding", "can't go back", "won't talk about it");
        criteria.Add(new("Avoidance of trauma reminders", avoidance, 1m, null));

        var hyperarousal = input.PresentationContains("startle", "on guard", "hypervigilant", "jumpy", "can't sleep");
        criteria.Add(new("Hyperarousal / hypervigilance", hyperarousal, 1m, null));

        var numbing = input.PresentationContains("numb", "detached", "estranged", "no feelings", "empty");
        criteria.Add(new("Emotional numbing or detachment", numbing, 1m, null));

        var endorsed = criteria.Count(c => c.Met);
        var risk = endorsed switch { 0 => "Low", 1 or 2 => "Moderate", _ => "High" };
        var preTest = endorsed switch { 0 => 0.05m, 1 => 0.15m, 2 => 0.35m, _ => 0.70m };

        return new GuidelineResult(
            GuidelineName, SourceCitation, endorsed, 5m, risk, preTest,
            endorsed >= 3
                ? "Positive PC-PTSD-5 screen (≥3 items). Refer for CAPS-5 diagnostic assessment. "
                  + "Consider trauma-focused CBT or EMDR referral."
                : endorsed >= 1 && traumaExposure
                    ? "Subthreshold screen. Provide psychoeducation, monitor at next visit."
                    : "Screen negative at this time.",
            criteria);
    }
}
