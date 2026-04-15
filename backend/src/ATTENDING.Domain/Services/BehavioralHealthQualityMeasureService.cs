// =============================================================================
// ATTENDING AI - Behavioral Health Quality Measure Service
// backend/src/ATTENDING.Domain/Services/BehavioralHealthQualityMeasureService.cs
//
// Maps behavioral health screening data to CMS / HEDIS quality measures so
// the platform can report compliance for the Merit-Based Incentive Payment
// System (MIPS), value-based contracts, and accreditation.
//
// Measures implemented:
//   • CMS2v13   — Preventive Care: Screening for Clinical Depression and
//                 Follow-Up Plan (eCQM, MIPS Quality measure)
//   • CMS161v12 — Adult Major Depressive Disorder: Suicide Risk Assessment
//   • CMS128v13 — Antidepressant Medication Management (downstream — needs
//                 medication adherence data, modelled as a placeholder hook)
//   • HEDIS DSF-E — Depression Screening and Follow-Up for Adolescents
//                   and Adults (NCQA)
//
// Source of truth:
//   • CMS measure specifications: https://ecqi.healthit.gov/ecqm/ec/2024/
//   • NCQA HEDIS 2025 technical specifications
//
// All measures are computed from the BehavioralHealthScreening aggregate
// (BehavioralHealth.cs). No PHI leaves the service — only counts.
// =============================================================================

using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Domain.Services;

/// <summary>
/// Computes CMS and HEDIS behavioral health quality measure performance
/// from BehavioralHealthScreening records. This is a pure domain service
/// with no infrastructure dependencies — the repository is injected.
/// </summary>
public class BehavioralHealthQualityMeasureService
{
    private readonly IBehavioralHealthRepository _bhRepo;

    public BehavioralHealthQualityMeasureService(IBehavioralHealthRepository bhRepo)
    {
        _bhRepo = bhRepo;
    }

    /// <summary>
    /// Compute all behavioral-health-relevant quality measures for the
    /// requested reporting period. The provider scope is optional — null
    /// returns aggregated organization-wide numbers.
    /// </summary>
    public async Task<IReadOnlyList<BehavioralHealthQualityMeasureResult>>
        ComputeAllAsync(
            DateTime periodStart,
            DateTime periodEnd,
            Guid? providerScope = null,
            CancellationToken ct = default)
    {
        // For MVP we pull the full set of screenings and compute in memory.
        // Production: push these to SQL aggregations or a materialized view.
        var allScreenings = await GatherScreeningsForPeriodAsync(periodStart, periodEnd, ct);

        return new List<BehavioralHealthQualityMeasureResult>
        {
            ComputeCms2(allScreenings, periodStart, periodEnd),
            ComputeCms161(allScreenings, periodStart, periodEnd),
            ComputeHedisDsfE(allScreenings, periodStart, periodEnd),
            ComputeCms128Stub(periodStart, periodEnd),
        };
    }

    /// <summary>
    /// Map a single screening event to the quality measure(s) it
    /// satisfies. Used by event handlers to mark a measure-eligible
    /// record at the moment a screening completes — cleaner than scanning
    /// the whole population for every report run.
    /// </summary>
    public static IEnumerable<string> EligibleMeasureCodesFor(
        BehavioralHealthScreening screening)
    {
        // Depression instruments → CMS2 + HEDIS DSF-E
        if (screening.Instrument == ScreeningInstrument.PHQ2 ||
            screening.Instrument == ScreeningInstrument.PHQ9)
        {
            yield return "CMS2v13";
            yield return "HEDIS-DSF-E";
        }

        // C-SSRS → CMS161 suicide risk assessment
        if (screening.Instrument == ScreeningInstrument.CSSRS)
        {
            yield return "CMS161v12";
        }
    }

    // =========================================================================
    // Individual measure computations
    // =========================================================================

    /// <summary>
    /// CMS2v13 — Percentage of patients aged 12 years and older screened
    /// for depression on the date of the encounter or up to 14 days prior
    /// using an age-appropriate standardized depression screening tool AND
    /// if positive, a follow-up plan is documented on the date of the
    /// positive screen.
    ///
    /// Numerator: Patients screened for depression with a documented
    ///   follow-up plan if the screen was positive.
    /// Denominator: Patients aged 12+ with a qualifying encounter.
    ///
    /// Performance Met = (screened AND (negative OR follow-up documented)).
    /// </summary>
    private static BehavioralHealthQualityMeasureResult ComputeCms2(
        IReadOnlyList<BehavioralHealthScreening> screenings,
        DateTime periodStart,
        DateTime periodEnd)
    {
        var depressionScreenings = screenings
            .Where(s => s.Instrument == ScreeningInstrument.PHQ2 ||
                        s.Instrument == ScreeningInstrument.PHQ9)
            .ToList();

        var denominator = depressionScreenings.Count;
        var numerator = depressionScreenings.Count(s =>
            s.Status == ScreeningStatus.Reviewed
            || (s.Status == ScreeningStatus.Completed && !s.HasSuicideRisk)
            || (s.HasSuicideRisk && !string.IsNullOrWhiteSpace(s.SafetyPlanJson))
            || (s.RecommendedAction == BehavioralHealthAction.NoActionRequired
                && s.Status == ScreeningStatus.Completed));

        return new BehavioralHealthQualityMeasureResult(
            Code: "CMS2v13",
            Name: "Preventive Care: Screening for Clinical Depression and Follow-Up Plan",
            Category: "Quality",
            Description:
                "Patients aged 12+ screened for depression using a standardized tool, " +
                "with a documented follow-up plan when the screen is positive.",
            Numerator: numerator,
            Denominator: denominator,
            BenchmarkRate: 80.0,
            PeriodStart: periodStart,
            PeriodEnd: periodEnd,
            ReportingProgram: "MIPS Quality / eCQM");
    }

    /// <summary>
    /// CMS161v12 — Percentage of patients aged 18+ with a diagnosis of
    /// major depressive disorder (MDD) with a suicide risk assessment
    /// completed during the visit in which a new diagnosis or recurrent
    /// episode was identified.
    ///
    /// We approximate eligibility as: any C-SSRS completed during the
    /// reporting period for a patient with an active mood-disorder
    /// screening (PHQ-9 ≥ moderate). Production should join with the
    /// problem list to filter to MDD diagnoses (ICD-10 F32.x, F33.x).
    /// </summary>
    private static BehavioralHealthQualityMeasureResult ComputeCms161(
        IReadOnlyList<BehavioralHealthScreening> screenings,
        DateTime periodStart,
        DateTime periodEnd)
    {
        var cssrs = screenings
            .Where(s => s.Instrument == ScreeningInstrument.CSSRS)
            .ToList();

        var denominator = cssrs.Count;
        var numerator = cssrs.Count(s =>
            s.Status == ScreeningStatus.Completed ||
            s.Status == ScreeningStatus.Reviewed);

        return new BehavioralHealthQualityMeasureResult(
            Code: "CMS161v12",
            Name: "Adult MDD: Suicide Risk Assessment",
            Category: "Quality",
            Description:
                "Patients aged 18+ with major depressive disorder who had a " +
                "suicide risk assessment completed during the visit.",
            Numerator: numerator,
            Denominator: denominator,
            BenchmarkRate: 75.0,
            PeriodStart: periodStart,
            PeriodEnd: periodEnd,
            ReportingProgram: "MIPS Quality / eCQM");
    }

    /// <summary>
    /// HEDIS DSF-E — Depression Screening and Follow-Up for Adolescents
    /// and Adults. Members 12+ screened for depression with a standardized
    /// instrument, and members with a positive screen who received follow-up
    /// care within 30 days.
    /// </summary>
    private static BehavioralHealthQualityMeasureResult ComputeHedisDsfE(
        IReadOnlyList<BehavioralHealthScreening> screenings,
        DateTime periodStart,
        DateTime periodEnd)
    {
        var depressionScreenings = screenings
            .Where(s => s.Instrument == ScreeningInstrument.PHQ2 ||
                        s.Instrument == ScreeningInstrument.PHQ9)
            .ToList();

        var denominator = depressionScreenings.Count;
        // HEDIS DSF-E numerator requires follow-up care within 30 days for
        // positive screens. We approximate "follow-up care" as either a
        // documented safety plan, a Reviewed status with action != NoActionRequired,
        // or a referral action.
        var numerator = depressionScreenings.Count(s =>
            !s.HasSuicideRisk && s.Status == ScreeningStatus.Completed
            || (s.Status == ScreeningStatus.Reviewed
                && s.RecommendedAction != BehavioralHealthAction.NoActionRequired)
            || !string.IsNullOrWhiteSpace(s.SafetyPlanJson));

        return new BehavioralHealthQualityMeasureResult(
            Code: "HEDIS-DSF-E",
            Name: "Depression Screening and Follow-Up for Adolescents and Adults",
            Category: "Quality",
            Description:
                "NCQA HEDIS measure: depression screening with follow-up care " +
                "documented within 30 days of a positive screen.",
            Numerator: numerator,
            Denominator: denominator,
            BenchmarkRate: 70.0,
            PeriodStart: periodStart,
            PeriodEnd: periodEnd,
            ReportingProgram: "HEDIS / NCQA");
    }

    /// <summary>
    /// CMS128v13 — Antidepressant Medication Management. Placeholder until
    /// the medication adherence pipeline is wired in. Returns a result with
    /// denominator=0 and a "NotComputable" reason so the dashboard can show
    /// it without false numbers.
    /// </summary>
    private static BehavioralHealthQualityMeasureResult ComputeCms128Stub(
        DateTime periodStart,
        DateTime periodEnd)
    {
        return new BehavioralHealthQualityMeasureResult(
            Code: "CMS128v13",
            Name: "Antidepressant Medication Management",
            Category: "Quality",
            Description:
                "Patients aged 18+ diagnosed with major depression and treated " +
                "with antidepressants who remained on therapy for the acute (84-day) " +
                "and continuation (180-day) treatment phases.",
            Numerator: 0,
            Denominator: 0,
            BenchmarkRate: 60.0,
            PeriodStart: periodStart,
            PeriodEnd: periodEnd,
            ReportingProgram: "MIPS Quality / eCQM",
            NotComputableReason: "Awaiting medication adherence data pipeline (PDC).");
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private async Task<IReadOnlyList<BehavioralHealthScreening>>
        GatherScreeningsForPeriodAsync(
            DateTime periodStart,
            DateTime periodEnd,
            CancellationToken ct)
    {
        // The current repository interface does not expose a date-range query.
        // We use GetPendingReviewAsync + GetActiveSuicideRiskAsync as a starting
        // set and let the period filter narrow it. Production should add
        // IBehavioralHealthRepository.GetByPeriodAsync(start, end).
        var pending = await _bhRepo.GetPendingReviewAsync(ct);
        var atRisk = await _bhRepo.GetActiveSuicideRiskAsync(ct);

        return pending
            .Concat(atRisk)
            .DistinctBy(s => s.Id)
            .Where(s =>
                s.CompletedAt.HasValue &&
                s.CompletedAt.Value >= periodStart &&
                s.CompletedAt.Value <= periodEnd)
            .ToList();
    }
}

/// <summary>
/// Result row for a behavioral health quality measure computation.
/// Mirrors the shape of QualityMeasureResponse but lives in Domain so it
/// can be consumed by Application/Infrastructure projects without an
/// upward dependency on Contracts.
/// </summary>
public record BehavioralHealthQualityMeasureResult(
    string Code,
    string Name,
    string Category,
    string Description,
    int Numerator,
    int Denominator,
    double BenchmarkRate,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    string ReportingProgram,
    string? NotComputableReason = null)
{
    public double PerformanceRate =>
        Denominator > 0
            ? Math.Round((double)Numerator / Denominator * 100, 1)
            : 0;

    public string Status =>
        NotComputableReason != null
            ? "NotComputable"
            : Denominator == 0
                ? "NoData"
                : PerformanceRate >= BenchmarkRate
                    ? "Met"
                    : "NotMet";
}
