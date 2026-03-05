using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Services;

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL HEALTH SCORING SERVICE
//
// Pure domain logic — no I/O, no DI, fully unit-testable.
// Each method validates inputs, computes the validated score, and calls the
// appropriate Apply*Score method on the aggregate.
//
// Sources:
//   PHQ-9:     Kroenke K, Spitzer RL, Williams JBW. JGIM 2001;16:606-613.
//   GAD-7:     Spitzer RL et al. Arch Intern Med 2006;166:1092-1097.
//   C-SSRS:    Posner K et al. Arch Gen Psychiatry 2011;68(12):1266-1276.
//   AUDIT-C:   Bush K et al. Arch Intern Med 1998;158(16):1789-1795.
//   PC-PTSD-5: Prins A et al. J Gen Intern Med 2016;31(10):1206-1211.
// ═══════════════════════════════════════════════════════════════════════════

public class BehavioralHealthScoringService
{
    // ── PHQ-9 ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Score a completed PHQ-9.
    /// Expects 9 item responses (indices 0-8), each valued 0-3.
    /// Item index 8 (item 9 on the form) is the suicidal ideation item.
    /// </summary>
    public void ScorePhq9(BehavioralHealthScreening screening, int[] itemScores)
    {
        if (itemScores.Length != 9)
            throw new ArgumentException("PHQ-9 requires exactly 9 item responses.");
        if (itemScores.Any(s => s < 0 || s > 3))
            throw new ArgumentException("PHQ-9 item scores must be 0-3.");

        var total = itemScores.Sum();
        var severity = total switch
        {
            <= 4  => DepressionSeverity.None,
            <= 9  => DepressionSeverity.Mild,
            <= 14 => DepressionSeverity.Moderate,
            <= 19 => DepressionSeverity.ModeratelySevere,
            _     => DepressionSeverity.Severe,
        };
        bool item9Positive = itemScores[8] > 0;   // PHQ-9 item 9 = index 8
        screening.ApplyPhq9Score(total, severity, item9Positive);
    }

    // ── GAD-7 ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Score a completed GAD-7.
    /// Expects 7 item responses, each valued 0-3.
    /// </summary>
    public void ScoreGad7(BehavioralHealthScreening screening, int[] itemScores)
    {
        if (itemScores.Length != 7)
            throw new ArgumentException("GAD-7 requires exactly 7 item responses.");
        if (itemScores.Any(s => s < 0 || s > 3))
            throw new ArgumentException("GAD-7 item scores must be 0-3.");

        var total = itemScores.Sum();
        var severity = total switch
        {
            <= 4  => AnxietySeverity.None,
            <= 9  => AnxietySeverity.Mild,
            <= 14 => AnxietySeverity.Moderate,
            _     => AnxietySeverity.Severe,
        };
        screening.ApplyGad7Score(total, severity);
    }

    // ── C-SSRS ────────────────────────────────────────────────────────────

    /// <summary>
    /// Score C-SSRS from clinician-rated ideation level and behavior type.
    /// In primary care, the 6-question "Since Last Visit" screener maps directly
    /// to these two enums — the clinician selects the highest applicable level.
    /// </summary>
    public void ScoreCssrs(
        BehavioralHealthScreening screening,
        SuicideIdeationLevel ideationLevel,
        SuicideBehaviorType behaviorType)
    {
        screening.ApplyCssrsScore(ideationLevel, behaviorType);
    }

    // ── AUDIT-C ───────────────────────────────────────────────────────────

    /// <summary>
    /// Score AUDIT-C.
    /// 3 items:
    ///   Q1 (frequency): 0, 1, 2, 3, 4
    ///   Q2 (drinks/day): 0, 1, 2, 3, 4
    ///   Q3 (binge frequency): 0, 1, 2, 3, 4
    /// Positive screen: ≥4 for men, ≥3 for women/pregnant.
    /// </summary>
    public void ScoreAuditC(
        BehavioralHealthScreening screening,
        int[] itemScores,
        bool isFemaleOrPregnant)
    {
        if (itemScores.Length != 3)
            throw new ArgumentException("AUDIT-C requires exactly 3 item responses.");

        var total = itemScores.Sum();
        var threshold = isFemaleOrPregnant ? 3 : 4;

        AlcoholRiskLevel risk;
        if (total < threshold)
            risk = AlcoholRiskLevel.LowRisk;
        else if (total <= threshold + 2)
            risk = AlcoholRiskLevel.ModerateRisk;
        else
            risk = AlcoholRiskLevel.HighRisk;

        screening.ApplyAuditCScore(total, risk, isFemaleOrPregnant);
    }

    // ── PC-PTSD-5 ─────────────────────────────────────────────────────────

    /// <summary>
    /// Score PC-PTSD-5.
    /// 5 yes/no items (1 = yes, 0 = no). Positive screen = ≥3 endorsed.
    /// Item 1 (trauma exposure gateway) must be endorsed for items 2-5 to count.
    /// </summary>
    public void ScorePcPtsd5(BehavioralHealthScreening screening, int[] itemScores)
    {
        if (itemScores.Length != 5)
            throw new ArgumentException("PC-PTSD-5 requires exactly 5 item responses.");
        if (itemScores.Any(s => s < 0 || s > 1))
            throw new ArgumentException("PC-PTSD-5 items are 0 (no) or 1 (yes).");

        // Item 1 is the trauma exposure gateway — if no trauma, score is 0
        var total = itemScores[0] == 0 ? 0 : itemScores.Sum();
        var result = total >= 3 ? PtsdScreenResult.Positive : PtsdScreenResult.Negative;
        screening.ApplyPcPtsd5Score(total, result);
    }
}
