using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Services;

/// <summary>
/// Preventive Care Gap Rule Engine — implements USPSTF Grade A and B
/// recommendations (2024 edition).
///
/// <para>
/// Each rule is a pure function: (patient demographics + medical history) → gap.
/// </para>
///
/// <para><b>Design principles:</b></para>
/// <list type="bullet">
///   <item>Pure domain logic — no I/O, no DI, fully unit-testable</item>
///   <item>Rules are additive — add a new static method to extend coverage</item>
///   <item>Exclusions are explicit — always documented with clinical rationale</item>
///   <item>Output is deterministic — same inputs always produce the same gap</item>
/// </list>
///
/// <para><b>Covered measures</b> (expand as USPSTF updates):</para>
/// <list type="table">
///   <item><term>BREAST_CANCER</term><description>Mammography — Women 40-74, biennial</description></item>
///   <item><term>CERVICAL_CANCER</term><description>Pap smear / hrHPV — Women 21-65</description></item>
///   <item><term>COLORECTAL_CANCER</term><description>Colonoscopy / FIT — Adults 45-75</description></item>
///   <item><term>LUNG_CANCER</term><description>Low-dose CT — Smokers 50-80, 20+ pack-years</description></item>
///   <item><term>BLOOD_PRESSURE</term><description>BP check — Adults 18+, annual</description></item>
///   <item><term>DIABETES</term><description>HbA1c — Overweight adults 35-70</description></item>
///   <item><term>STATIN_USE</term><description>Statin counseling — CVD risk adults 40-75</description></item>
///   <item><term>DEPRESSION</term><description>PHQ-2 screen — Adults 18+</description></item>
///   <item><term>OBESITY</term><description>BMI + counseling — Adults 18+</description></item>
///   <item><term>HIV</term><description>HIV screen — Adults 15-65, once</description></item>
///   <item><term>HEPATITIS_C</term><description>HCV antibody — Adults 18-79, once</description></item>
///   <item><term>OSTEOPOROSIS</term><description>DEXA scan — Women 65+, or &lt;65 high risk</description></item>
/// </list>
/// </summary>
//   ABDOMINAL_AORTA     Abdominal US         Men 65-75 ever smokers, once
// ═══════════════════════════════════════════════════════════════════════════

public class CareGapRuleEngine
{
    /// <summary>
    /// Evaluate all applicable preventive care gaps for a patient.
    /// Returns gaps that are either due or overdue. Upcoming gaps (>30 days out)
    /// are included so the provider can order them proactively.
    /// </summary>
    public IReadOnlyList<CareGapCandidate> EvaluateAll(PatientCareGapInput input)
    {
        var gaps = new List<CareGapCandidate>();

        // Run each rule — each returns null if the patient is excluded
        AddIfNotNull(gaps, BreastCancerScreening(input));
        AddIfNotNull(gaps, CervicalCancerScreening(input));
        AddIfNotNull(gaps, ColorectalCancerScreening(input));
        AddIfNotNull(gaps, LungCancerScreening(input));
        AddIfNotNull(gaps, BloodPressureCheck(input));
        AddIfNotNull(gaps, DiabetesScreening(input));
        AddIfNotNull(gaps, DepressionScreening(input));
        AddIfNotNull(gaps, HivScreening(input));
        AddIfNotNull(gaps, HepatitisCScreening(input));
        AddIfNotNull(gaps, OsteoporosisScreening(input));
        AddIfNotNull(gaps, AbdominalAorticAneurysmScreening(input));
        AddIfNotNull(gaps, ObesityCounseling(input));

        return gaps.AsReadOnly();
    }

    // ── Individual rules ──────────────────────────────────────────────────

    private static CareGapCandidate? BreastCancerScreening(PatientCareGapInput p)
    {
        // USPSTF Grade B: Biennial mammography, women 40-74
        if (p.BiologicalSex != BiologicalSex.Female) return null;
        if (p.Age < 40 || p.Age > 74) return null;
        if (p.HasCondition("Z85.3") || p.HasCondition("mastectomy")) return null; // history of breast cancer

        var intervalMonths = p.Age >= 50 ? 24 : 12; // annual 40-49, biennial 50-74
        var dueDate = p.LastScreening("mammogram") is { } last
            ? last.AddMonths(intervalMonths)
            : DateTime.UtcNow.AddDays(-1); // never done → overdue now

        var lastDone = p.LastScreening("mammogram");
        var rationale = lastDone.HasValue
            ? $"{p.Age}-year-old female. Last mammogram: {lastDone.Value:MMM yyyy} ({MonthsAgo(lastDone.Value)} months ago). Due every {intervalMonths} months."
            : $"{p.Age}-year-old female. No mammogram on record. USPSTF recommends biennial screening starting at age 40.";

        return new CareGapCandidate(
            MeasureCode: "BREAST_CANCER",
            MeasureName: "Breast Cancer Screening (Mammography)",
            UspstfGrade: p.Age >= 50 ? "B" : "B",
            DueDate: dueDate,
            RecommendedIntervalMonths: intervalMonths,
            ClinicalRationale: rationale,
            SuggestedAction: "Order screening mammogram. Refer to radiology if not available in clinic.",
            LastCompletedAt: lastDone,
            PreventiveServiceCode: "Z12.31",
            CptCode: "77067");
    }

    private static CareGapCandidate? CervicalCancerScreening(PatientCareGapInput p)
    {
        // USPSTF Grade A (21-29: Pap q3yr) / Grade A (30-65: Pap+HPV q5yr or Pap q3yr)
        if (p.BiologicalSex != BiologicalSex.Female) return null;
        if (p.Age < 21 || p.Age > 65) return null;
        if (p.HasCondition("hysterectomy")) return null;
        if (p.HasCondition("cervical cancer") || p.HasCondition("Z85.41")) return null;

        var intervalMonths = p.Age >= 30 ? 60 : 36; // co-testing q5yr for 30-65
        var lastDone = p.LastScreening("pap") ?? p.LastScreening("cervical");

        var dueDate = lastDone.HasValue
            ? lastDone.Value.AddMonths(intervalMonths)
            : DateTime.UtcNow.AddDays(-1);

        var rationale = lastDone.HasValue
            ? $"{p.Age}-year-old female. Last cervical screening: {lastDone.Value:MMM yyyy}. Recommended every {intervalMonths / 12} years."
            : $"{p.Age}-year-old female. No cervical cancer screening on record. USPSTF Grade A recommendation.";

        return new CareGapCandidate(
            MeasureCode: "CERVICAL_CANCER",
            MeasureName: "Cervical Cancer Screening (Pap / hrHPV)",
            UspstfGrade: "A",
            DueDate: dueDate,
            RecommendedIntervalMonths: intervalMonths,
            ClinicalRationale: rationale,
            SuggestedAction: p.Age >= 30
                ? "Order Pap smear with hrHPV co-testing (preferred) or Pap smear alone."
                : "Order Pap smear alone. HPV co-testing not recommended before age 30.",
            LastCompletedAt: lastDone,
            PreventiveServiceCode: "Z01.419",
            CptCode: p.Age >= 30 ? "88141" : "88150");
    }

    private static CareGapCandidate? ColorectalCancerScreening(PatientCareGapInput p)
    {
        // USPSTF Grade B: Adults 45-75, multiple acceptable modalities
        if (p.Age < 45 || p.Age > 75) return null;
        if (p.HasCondition("colorectal cancer") || p.HasCondition("Z85.038")) return null;
        if (p.HasCondition("colostomy") || p.HasCondition("total colectomy")) return null;

        // Colonoscopy preferred: 10 years; FIT annual; sigmoidoscopy 5 years
        var lastColonoscopy = p.LastScreening("colonoscopy");
        var lastFit = p.LastScreening("FIT") ?? p.LastScreening("FOBT");
        var lastSig = p.LastScreening("sigmoidoscopy");

        // Find the most recently completed screening
        var mostRecent = new[] { lastColonoscopy, lastFit, lastSig }
            .Where(d => d.HasValue).Select(d => d!.Value)
            .OrderByDescending(d => d).FirstOrDefault();

        int intervalMonths;
        DateTime dueDate;

        if (lastColonoscopy.HasValue)
        {
            intervalMonths = 120; // 10 years
            dueDate = lastColonoscopy.Value.AddMonths(intervalMonths);
        }
        else if (lastFit.HasValue)
        {
            intervalMonths = 12; // annual
            dueDate = lastFit.Value.AddMonths(intervalMonths);
        }
        else
        {
            intervalMonths = 120;
            dueDate = DateTime.UtcNow.AddDays(-1); // never done → overdue
        }

        var lastDoneDisplay = mostRecent == default ? "Never" : mostRecent.ToString("MMM yyyy");
        var rationale = mostRecent == default
            ? $"{p.Age}-year-old. No colorectal cancer screening on record. USPSTF Grade B — screening begins at 45."
            : $"{p.Age}-year-old. Last colorectal screening: {lastDoneDisplay}.";

        return new CareGapCandidate(
            MeasureCode: "COLORECTAL_CANCER",
            MeasureName: "Colorectal Cancer Screening",
            UspstfGrade: "B",
            DueDate: dueDate,
            RecommendedIntervalMonths: intervalMonths,
            ClinicalRationale: rationale,
            SuggestedAction: "Colonoscopy (q10yr), annual FIT, or flexible sigmoidoscopy (q5yr). " +
                             "Discuss options and patient preference.",
            LastCompletedAt: mostRecent == default ? null : mostRecent,
            PreventiveServiceCode: "Z12.11",
            CptCode: "45378");
    }

    private static CareGapCandidate? LungCancerScreening(PatientCareGapInput p)
    {
        // USPSTF Grade B: Annual low-dose CT, adults 50-80, 20+ pack-year history, current or
        // quit within 15 years
        if (p.Age < 50 || p.Age > 80) return null;
        if (p.PackYearHistory < 20) return null;
        if (p.YearsSinceQuittingSmoking > 15) return null;
        if (p.HasCondition("lung cancer") || p.HasCondition("Z85.118")) return null;

        var lastLdct = p.LastScreening("LDCT") ?? p.LastScreening("lung CT");
        var dueDate = lastLdct.HasValue
            ? lastLdct.Value.AddMonths(12)
            : DateTime.UtcNow.AddDays(-1);

        var smokingStatus = p.YearsSinceQuittingSmoking == 0
            ? "current smoker"
            : $"quit {p.YearsSinceQuittingSmoking} years ago";

        return new CareGapCandidate(
            MeasureCode: "LUNG_CANCER",
            MeasureName: "Lung Cancer Screening (Low-Dose CT)",
            UspstfGrade: "B",
            DueDate: dueDate,
            RecommendedIntervalMonths: 12,
            ClinicalRationale: $"{p.Age}-year-old, {smokingStatus}, {p.PackYearHistory} pack-years. " +
                               $"Annual LDCT indicated. Last done: {(lastLdct.HasValue ? lastLdct.Value.ToString("MMM yyyy") : "never")}.",
            SuggestedAction: "Order annual low-dose chest CT (without contrast). Counsel on smoking cessation.",
            LastCompletedAt: lastLdct,
            PreventiveServiceCode: "Z12.89",
            CptCode: "71250");
    }

    private static CareGapCandidate? BloodPressureCheck(PatientCareGapInput p)
    {
        // USPSTF Grade A: All adults 18+, annual BP check if not hypertensive
        // (hypertensive patients should already be getting more frequent checks)
        if (p.Age < 18) return null;
        if (p.HasCondition("hypertension") || p.HasCondition("I10")) return null; // already managed

        var lastBp = p.LastScreening("blood pressure") ?? p.LastScreening("BP");
        var dueDate = lastBp.HasValue
            ? lastBp.Value.AddMonths(12)
            : DateTime.UtcNow.AddDays(-1);

        if (dueDate > DateTime.UtcNow.AddDays(60)) return null; // not due yet

        return new CareGapCandidate(
            MeasureCode: "BLOOD_PRESSURE",
            MeasureName: "Blood Pressure Screening",
            UspstfGrade: "A",
            DueDate: dueDate,
            RecommendedIntervalMonths: 12,
            ClinicalRationale: $"{p.Age}-year-old without known hypertension. " +
                               $"Last BP: {(lastBp.HasValue ? lastBp.Value.ToString("MMM yyyy") : "not on record")}.",
            SuggestedAction: "Measure blood pressure today. Document in vitals.",
            LastCompletedAt: lastBp,
            PreventiveServiceCode: "Z01.30",
            CptCode: "99473");
    }

    private static CareGapCandidate? DiabetesScreening(PatientCareGapInput p)
    {
        // USPSTF Grade B: Overweight/obese adults 35-70 without known diabetes
        if (p.Age < 35 || p.Age > 70) return null;
        if (p.Bmi < 25.0m) return null; // normal weight — not indicated
        if (p.HasCondition("diabetes") || p.HasCondition("E11") || p.HasCondition("E13")) return null;
        if (p.HasCondition("prediabetes")) return null; // already in management

        var lastA1c = p.LastScreening("HbA1c") ?? p.LastScreening("A1c") ?? p.LastScreening("diabetes screen");
        var dueDate = lastA1c.HasValue
            ? lastA1c.Value.AddMonths(36) // every 3 years per USPSTF
            : DateTime.UtcNow.AddDays(-1);

        return new CareGapCandidate(
            MeasureCode: "DIABETES",
            MeasureName: "Prediabetes / Type 2 Diabetes Screening",
            UspstfGrade: "B",
            DueDate: dueDate,
            RecommendedIntervalMonths: 36,
            ClinicalRationale: $"{p.Age}-year-old, BMI {p.Bmi:F1}. " +
                               $"Overweight/obese — diabetes screening recommended every 3 years. " +
                               $"Last screened: {(lastA1c.HasValue ? lastA1c.Value.ToString("MMM yyyy") : "never")}.",
            SuggestedAction: "Order fasting glucose or HbA1c. Consider referral to diabetes prevention program if prediabetes identified.",
            LastCompletedAt: lastA1c,
            PreventiveServiceCode: "Z13.1",
            CptCode: "83036");
    }

    private static CareGapCandidate? DepressionScreening(PatientCareGapInput p)
    {
        // USPSTF Grade B: All adults 18+, annual PHQ-2/PHQ-9 screening
        if (p.Age < 18) return null;
        if (p.HasCondition("major depression") || p.HasCondition("F32") || p.HasCondition("F33")) return null;

        var lastScreen = p.LastScreening("PHQ") ?? p.LastScreening("depression screen");
        var dueDate = lastScreen.HasValue
            ? lastScreen.Value.AddMonths(12)
            : DateTime.UtcNow.AddDays(-1);

        if (dueDate > DateTime.UtcNow.AddDays(60)) return null;

        return new CareGapCandidate(
            MeasureCode: "DEPRESSION",
            MeasureName: "Depression Screening (PHQ-2 / PHQ-9)",
            UspstfGrade: "B",
            DueDate: dueDate,
            RecommendedIntervalMonths: 12,
            ClinicalRationale: $"{p.Age}-year-old. No depression diagnosis on record. " +
                               $"Annual screening recommended. Last PHQ: {(lastScreen.HasValue ? lastScreen.Value.ToString("MMM yyyy") : "not on record")}.",
            SuggestedAction: "Administer PHQ-2. If positive (score ≥3), follow with PHQ-9.",
            LastCompletedAt: lastScreen,
            PreventiveServiceCode: "Z13.89",
            CptCode: "96127");
    }

    private static CareGapCandidate? HivScreening(PatientCareGapInput p)
    {
        // USPSTF Grade A: Ages 15-65, at least once; more often for high-risk
        if (p.Age < 15 || p.Age > 65) return null;
        if (p.HasCondition("HIV") || p.HasCondition("B20") || p.HasCondition("Z21")) return null;

        var lastHiv = p.LastScreening("HIV");
        if (lastHiv.HasValue && !p.IsHighRiskForHiv) return null; // one-time screen done

        var dueDate = p.IsHighRiskForHiv && lastHiv.HasValue
            ? lastHiv.Value.AddMonths(12)
            : (lastHiv.HasValue ? lastHiv.Value.AddYears(100) : DateTime.UtcNow.AddDays(-1));

        return new CareGapCandidate(
            MeasureCode: "HIV",
            MeasureName: "HIV Screening",
            UspstfGrade: "A",
            DueDate: dueDate,
            RecommendedIntervalMonths: p.IsHighRiskForHiv ? 12 : 0,
            ClinicalRationale: $"{p.Age}-year-old. " + (lastHiv.HasValue
                ? "HIV test on record. Offering repeat screening per risk profile."
                : "No HIV test on record. USPSTF recommends at-least-once screening ages 15-65."),
            SuggestedAction: "Order HIV-1/2 Ag/Ab combination immunoassay (4th generation preferred).",
            LastCompletedAt: lastHiv,
            PreventiveServiceCode: "Z11.4",
            CptCode: "86703");
    }

    private static CareGapCandidate? HepatitisCScreening(PatientCareGapInput p)
    {
        // USPSTF Grade B: Adults 18-79, once (higher frequency for risk factors)
        if (p.Age < 18 || p.Age > 79) return null;
        if (p.HasCondition("hepatitis C") || p.HasCondition("B17.1") || p.HasCondition("B18.2")) return null;

        var lastHcv = p.LastScreening("HCV") ?? p.LastScreening("hepatitis C");
        if (lastHcv.HasValue && !p.IsHighRiskForHcv) return null; // one-time done

        var dueDate = lastHcv.HasValue ? lastHcv.Value.AddYears(100) : DateTime.UtcNow.AddDays(-1);

        return new CareGapCandidate(
            MeasureCode: "HEPATITIS_C",
            MeasureName: "Hepatitis C Screening (HCV Antibody)",
            UspstfGrade: "B",
            DueDate: dueDate,
            RecommendedIntervalMonths: 0, // one-time
            ClinicalRationale: $"{p.Age}-year-old. " + (lastHcv.HasValue
                ? "HCV antibody test on record."
                : "No HCV antibody test on record. USPSTF recommends one-time screening for adults 18-79."),
            SuggestedAction: "Order HCV antibody test. If reactive, reflex to HCV RNA for confirmation.",
            LastCompletedAt: lastHcv,
            PreventiveServiceCode: "Z11.59",
            CptCode: "86803");
    }

    private static CareGapCandidate? OsteoporosisScreening(PatientCareGapInput p)
    {
        // USPSTF Grade B: Women 65+, or postmenopausal <65 with high risk
        if (p.BiologicalSex != BiologicalSex.Female) return null;
        if (p.Age < 65 && !p.IsHighRiskForOsteoporosis) return null;
        if (p.HasCondition("osteoporosis") || p.HasCondition("M81")) return null;

        var lastDexa = p.LastScreening("DEXA") ?? p.LastScreening("bone density");
        var dueDate = lastDexa.HasValue
            ? lastDexa.Value.AddMonths(24) // rescreen every 2 years if normal
            : DateTime.UtcNow.AddDays(-1);

        return new CareGapCandidate(
            MeasureCode: "OSTEOPOROSIS",
            MeasureName: "Osteoporosis Screening (DEXA Scan)",
            UspstfGrade: "B",
            DueDate: dueDate,
            RecommendedIntervalMonths: 24,
            ClinicalRationale: $"{p.Age}-year-old female. " +
                               $"Last DEXA: {(lastDexa.HasValue ? lastDexa.Value.ToString("MMM yyyy") : "not on record")}.",
            SuggestedAction: "Order DEXA bone density scan. Evaluate calcium/vitamin D intake.",
            LastCompletedAt: lastDexa,
            PreventiveServiceCode: "Z82.61",
            CptCode: "77080");
    }

    private static CareGapCandidate? AbdominalAorticAneurysmScreening(PatientCareGapInput p)
    {
        // USPSTF Grade B: Men 65-75, ever-smokers, one-time abdominal ultrasound
        if (p.BiologicalSex != BiologicalSex.Male) return null;
        if (p.Age < 65 || p.Age > 75) return null;
        if (!p.EverSmoker) return null;
        if (p.HasCondition("AAA") || p.HasCondition("I71.4")) return null;

        var lastUs = p.LastScreening("abdominal ultrasound") ?? p.LastScreening("AAA screen");
        if (lastUs.HasValue) return null; // one-time only

        return new CareGapCandidate(
            MeasureCode: "ABDOMINAL_AORTA",
            MeasureName: "Abdominal Aortic Aneurysm Screening",
            UspstfGrade: "B",
            DueDate: DateTime.UtcNow.AddDays(-1),
            RecommendedIntervalMonths: 0, // one-time
            ClinicalRationale: $"{p.Age}-year-old male, ever-smoker. One-time AAA screening recommended. Never done.",
            SuggestedAction: "Order abdominal ultrasound. Refer to vascular surgery if aorta ≥3.0 cm.",
            LastCompletedAt: null,
            PreventiveServiceCode: "Z13.6",
            CptCode: "76706");
    }

    private static CareGapCandidate? ObesityCounseling(PatientCareGapInput p)
    {
        // USPSTF Grade B: Obese adults (BMI ≥30), refer to intensive behavioral intervention
        if (p.Age < 18) return null;
        if (p.Bmi < 30.0m) return null;
        if (p.HasCondition("weight management program")) return null;

        var lastCounseling = p.LastScreening("obesity counseling") ?? p.LastScreening("weight counseling");
        var dueDate = lastCounseling.HasValue
            ? lastCounseling.Value.AddMonths(12)
            : DateTime.UtcNow.AddDays(-1);

        return new CareGapCandidate(
            MeasureCode: "OBESITY",
            MeasureName: "Obesity: Behavioral Counseling Referral",
            UspstfGrade: "B",
            DueDate: dueDate,
            RecommendedIntervalMonths: 12,
            ClinicalRationale: $"{p.Age}-year-old, BMI {p.Bmi:F1}. Intensive behavioral intervention recommended.",
            SuggestedAction: "Refer to intensive multicomponent behavioral intervention (≥12 sessions/year). " +
                             "Discuss weight loss medications if appropriate.",
            LastCompletedAt: lastCounseling,
            PreventiveServiceCode: "Z71.3",
            CptCode: "99401");
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static void AddIfNotNull(List<CareGapCandidate> list, CareGapCandidate? candidate)
    {
        if (candidate != null) list.Add(candidate);
    }

    private static int MonthsAgo(DateTime date) =>
        (int)((DateTime.UtcNow - date).TotalDays / 30.44);
}

/// <summary>
/// All patient data needed to evaluate care gaps.
/// Assembled by the Application layer from the patient's clinical record.
/// Pure value — no navigation properties, no DB concerns.
/// </summary>
public record PatientCareGapInput(
    Guid PatientId,
    int Age,
    BiologicalSex BiologicalSex,
    decimal Bmi,
    int PackYearHistory,
    int YearsSinceQuittingSmoking,
    bool EverSmoker,
    bool IsHighRiskForHiv,
    bool IsHighRiskForHcv,
    bool IsHighRiskForOsteoporosis,
    IReadOnlyList<string> ActiveConditionCodes,
    IReadOnlyList<string> ActiveConditionNames,
    IReadOnlyList<PatientScreeningHistory> ScreeningHistory
)
{
    /// <summary>Check if the patient has a condition by ICD-10 code or name fragment</summary>
    public bool HasCondition(string codeOrNameFragment)
    {
        var fragment = codeOrNameFragment.ToLowerInvariant();
        return ActiveConditionCodes.Any(c => c.StartsWith(fragment, StringComparison.OrdinalIgnoreCase))
            || ActiveConditionNames.Any(n => n.Contains(fragment, StringComparison.OrdinalIgnoreCase));
    }

    // Pre-built index of screening type → most recent date.
    // Built once on first access; avoids O(n*m) repeated scans.
    private Dictionary<string, DateTime>? _screeningIndex;

    /// <summary>
    /// Builds a lookup dictionary mapping each screening type (lowercased)
    /// to its most recent date. Built once per evaluation.
    /// </summary>
    private Dictionary<string, DateTime> ScreeningIndex
    {
        get
        {
            if (_screeningIndex != null) return _screeningIndex;
            _screeningIndex = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in ScreeningHistory)
            {
                var key = entry.ScreeningType;
                if (!_screeningIndex.TryGetValue(key, out var existing) || entry.PerformedAt > existing)
                {
                    _screeningIndex[key] = entry.PerformedAt;
                }
            }
            return _screeningIndex;
        }
    }

    /// <summary>Get the date of the most recent screening of a given type.</summary>
    /// <remarks>
    /// Uses a pre-built dictionary for exact matches (O(1)), falling back
    /// to a linear scan only when the screening type is a substring match
    /// (e.g. "mammogram" matching "screening mammogram bilateral").
    /// </remarks>
    public DateTime? LastScreening(string screeningType)
    {
        // Fast path: exact match from the pre-built index
        if (ScreeningIndex.TryGetValue(screeningType, out var exactDate))
            return exactDate;

        // Slow path: substring match (needed for partial names like "pap" matching "pap smear")
        DateTime? best = null;
        foreach (var entry in ScreeningHistory)
        {
            if (entry.ScreeningType.Contains(screeningType, StringComparison.OrdinalIgnoreCase))
            {
                if (!best.HasValue || entry.PerformedAt > best.Value)
                    best = entry.PerformedAt;
            }
        }
        return best;
    }
}

public record PatientScreeningHistory(string ScreeningType, DateTime PerformedAt);

/// <summary>
/// Output from the rule engine — one candidate per applicable measure.
/// Converted to a CareGap entity by the Application handler.
/// </summary>
public record CareGapCandidate(
    string MeasureCode,
    string MeasureName,
    string UspstfGrade,
    DateTime DueDate,
    int RecommendedIntervalMonths,
    string ClinicalRationale,
    string SuggestedAction,
    DateTime? LastCompletedAt,
    string? PreventiveServiceCode,
    string? CptCode
);
