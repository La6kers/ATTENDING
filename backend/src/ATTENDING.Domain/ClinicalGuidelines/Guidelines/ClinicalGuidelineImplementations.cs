namespace ATTENDING.Domain.ClinicalGuidelines.Guidelines;

/// <summary>
/// Modified Wells Criteria for Pulmonary Embolism.
/// 
/// Seven criteria, each with point values, producing a pre-test probability
/// that directly determines the recommended workup.
/// 
/// This is the reference guideline implementation — demonstrates the pattern
/// for all subsequent guidelines.
/// 
/// Source: Wells PS et al. Thromb Haemost. 2000;83(3):416-420.
/// Updated per 2023 ACEP Clinical Policy.
/// </summary>
public class WellsPECriteria : IClinicalGuideline
{
    public string GuidelineName => "Wells Criteria for Pulmonary Embolism";
    public string Version => "Modified Wells, 2023";
    public string SourceCitation => "Wells PS et al. Thromb Haemost. 2000;83(3):416-420";
    public string[] ApplicableComplaints => new[]
    {
        "chest pain", "shortness of breath", "dyspnea", "leg swelling",
        "hemoptysis", "pleuritic", "calf pain", "cough with blood",
        "difficulty breathing", "tachycardia", "syncope"
    };

    public bool IsApplicable(GuidelineInput input)
    {
        // Wells is applicable when the presentation could be PE
        return input.PresentationContains(ApplicableComplaints);
    }

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        decimal score = 0;

        // 1. Clinical signs/symptoms of DVT (3.0 points)
        var hasDvtSigns = input.PresentationContains("leg swelling", "calf pain", "calf swelling",
            "unilateral leg", "leg tender") ||
            input.OldcartsContains("location", "leg") ||
            input.OldcartsContains("location", "calf");
        criteria.Add(new("Clinical signs/symptoms of DVT", hasDvtSigns, 3.0m, null));
        if (hasDvtSigns) score += 3.0m;

        // 2. PE is #1 diagnosis or equally likely (3.0 points)
        // Conservative: only if chief complaint strongly suggests PE
        var peIsLikely = input.PresentationContains("pulmonary embolism", "pe",
            "pleuritic chest pain", "sudden shortness of breath", "sudden dyspnea");
        criteria.Add(new("PE is #1 diagnosis or equally likely", peIsLikely, 3.0m, null));
        if (peIsLikely) score += 3.0m;

        // 3. Heart rate > 100 (1.5 points)
        var tachycardic = input.Vitals?.IsTachycardic ?? false;
        criteria.Add(new("Heart rate > 100", tachycardic, 1.5m,
            input.Vitals?.HeartRate != null ? $"HR: {input.Vitals.HeartRate}" : null));
        if (tachycardic) score += 1.5m;

        // 4. Immobilization >= 3 days or surgery in prior 4 weeks (1.5 points)
        var immobilized = input.PresentationContains("immobilized", "bed rest", "bedridden",
            "recent surgery", "post-operative", "post-op", "cast", "hip replacement",
            "knee replacement");
        criteria.Add(new("Immobilization >= 3d or surgery in 4 wk", immobilized, 1.5m, null));
        if (immobilized) score += 1.5m;

        // 5. Previous PE or DVT (1.5 points)
        var previousPeDvt = input.HasCondition("pulmonary embolism", "deep vein thrombosis",
            "DVT", "PE", "venous thromboembolism", "VTE");
        criteria.Add(new("Previous PE or DVT", previousPeDvt, 1.5m, null));
        if (previousPeDvt) score += 1.5m;

        // 6. Hemoptysis (1.0 point)
        var hemoptysis = input.PresentationContains("hemoptysis", "coughing blood",
            "blood in sputum", "cough blood");
        criteria.Add(new("Hemoptysis", hemoptysis, 1.0m, null));
        if (hemoptysis) score += 1.0m;

        // 7. Malignancy (1.0 point)
        var malignancy = input.HasCondition("cancer", "malignancy", "carcinoma",
            "lymphoma", "leukemia", "melanoma", "sarcoma", "tumor");
        criteria.Add(new("Malignancy (treatment within 6 mo or palliative)", malignancy, 1.0m, null));
        if (malignancy) score += 1.0m;

        // Risk stratification
        var (risk, probability) = score switch
        {
            <= 1m => ("Low", 0.06m),
            <= 4m => ("Moderate", 0.23m),
            _ => ("High", 0.49m),
        };

        var recommendation = risk switch
        {
            "Low" => "D-dimer indicated. If negative (<500 ng/mL), PE effectively excluded. If positive, proceed to CTPA.",
            "Moderate" => "D-dimer or CTPA. Age-adjusted D-dimer cutoff (age x 10 for patients >50) improves specificity.",
            "High" => "CT pulmonary angiography indicated. Do NOT rely on D-dimer alone to exclude PE.",
            _ => ""
        };

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 12.5m,
            risk, probability, recommendation, criteria);
    }
}

/// <summary>
/// HEART Score for Major Adverse Cardiac Events (MACE).
/// 
/// Five criteria scored 0-2 each. Stratifies chest pain patients
/// into low/moderate/high risk for ACS within 6 weeks.
/// 
/// Source: Six AJ et al. Neth Heart J. 2008;16(6):191-196.
/// Validated: Backus BE et al. Int J Cardiol. 2013;168(3):2153-2158.
/// </summary>
public class HeartScore : IClinicalGuideline
{
    public string GuidelineName => "HEART Score for MACE";
    public string Version => "HEART Score, 2013 validation";
    public string SourceCitation => "Six AJ et al. Neth Heart J. 2008;16(6):191-196";
    public string[] ApplicableComplaints => new[]
    {
        "chest pain", "chest pressure", "chest tightness", "angina",
        "substernal", "jaw pain", "left arm pain", "epigastric pain",
        "diaphoresis", "nausea with chest"
    };

    public bool IsApplicable(GuidelineInput input) =>
        input.PresentationContains(ApplicableComplaints);

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        decimal score = 0;

        // H - History (0-2)
        int historyScore;
        if (input.PresentationContains("crushing", "pressure", "radiating to arm",
            "radiating to jaw", "diaphoresis", "exertional"))
        {
            historyScore = 2; // Highly suspicious
        }
        else if (input.PresentationContains("sharp", "pleuritic", "positional",
            "reproducible", "musculoskeletal"))
        {
            historyScore = 0; // Slightly suspicious
        }
        else
        {
            historyScore = 1; // Moderately suspicious
        }
        criteria.Add(new("History", true, historyScore, $"Score: {historyScore}/2"));
        score += historyScore;

        // E - ECG (0-2) — requires data we may not have, default to 1
        // In production, this would come from ECG integration
        int ecgScore = 1; // Assume non-specific changes (safe middle ground)
        criteria.Add(new("ECG", true, ecgScore, "Non-specific (default - no ECG data)"));
        score += ecgScore;

        // A - Age (0-2)
        int ageScore = input.PatientAge switch
        {
            < 45 => 0,
            <= 64 => 1,
            _ => 2
        };
        criteria.Add(new("Age", true, ageScore, $"Age: {input.PatientAge}"));
        score += ageScore;

        // R - Risk factors (0-2)
        var riskFactors = new List<string>();
        if (input.HasCondition("hypertension", "HTN")) riskFactors.Add("HTN");
        if (input.HasCondition("diabetes", "DM")) riskFactors.Add("DM");
        if (input.HasCondition("hyperlipidemia", "hypercholesterolemia")) riskFactors.Add("HLD");
        if (input.IsOnMedication("statin")) riskFactors.Add("on statin");
        if (input.HasCondition("obesity") || (input.Vitals?.Bmi > 30)) riskFactors.Add("obesity");
        if (input.HasCondition("coronary artery disease", "CAD", "MI", "myocardial infarction", "stent", "CABG"))
            riskFactors.Add("known CAD");

        int riskScore;
        if (input.HasCondition("coronary artery disease", "CAD", "MI", "stent", "CABG"))
            riskScore = 2; // Known atherosclerotic disease
        else if (riskFactors.Count >= 3)
            riskScore = 2;
        else if (riskFactors.Count >= 1)
            riskScore = 1;
        else
            riskScore = 0;

        criteria.Add(new("Risk factors", true, riskScore, 
            riskFactors.Count > 0 ? string.Join(", ", riskFactors) : "None identified"));
        score += riskScore;

        // T - Troponin (0-2)
        int tropScore;
        var trop = input.RecentLabs?.TroponinI ?? input.RecentLabs?.TroponinT;
        if (trop != null)
        {
            tropScore = trop.Value switch
            {
                <= 0.04m => 0,  // Normal
                <= 0.12m => 1,  // 1-3x normal
                _ => 2          // >3x normal
            };
            criteria.Add(new("Troponin", true, tropScore, $"Troponin: {trop.Value} {trop.Unit}"));
        }
        else
        {
            tropScore = 1; // Unknown — conservative middle
            criteria.Add(new("Troponin", true, tropScore, "Not yet available"));
        }
        score += tropScore;

        // Risk stratification
        var (risk, probability, recommendation) = score switch
        {
            <= 3 => ("Low", 0.02m,
                "Low risk (1.7% MACE at 6 wk). Consider early discharge with outpatient follow-up if troponin negative x2."),
            <= 6 => ("Moderate", 0.13m,
                "Moderate risk (12-17% MACE). Observation, serial troponins, and cardiology consultation recommended."),
            _ => ("High", 0.50m,
                "High risk (50%+ MACE). Admit. Cardiology consult. Consider early invasive strategy.")
        };

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 10m,
            risk, probability, recommendation, criteria);
    }
}

/// <summary>
/// qSOFA (Quick Sequential Organ Failure Assessment) for sepsis screening.
/// 
/// Three bedside criteria — no lab values required.
/// 2+ criteria = high risk of poor outcomes from infection.
/// 
/// Source: Seymour CW et al. JAMA. 2016;315(8):762-774.
/// Surviving Sepsis Campaign 2021 update.
/// </summary>
public class QSofaScore : IClinicalGuideline
{
    public string GuidelineName => "qSOFA (Quick SOFA) for Sepsis Screening";
    public string Version => "Sepsis-3, 2016 / SSC 2021 update";
    public string SourceCitation => "Seymour CW et al. JAMA. 2016;315(8):762-774";
    public string[] ApplicableComplaints => new[]
    {
        "fever", "infection", "sepsis", "chills", "rigors",
        "confusion", "altered mental status", "urinary tract infection",
        "pneumonia", "cellulitis", "abscess", "wound infection",
        "bacteremia", "meningitis"
    };

    public bool IsApplicable(GuidelineInput input)
    {
        // qSOFA applies when infection is suspected
        // Also triggered by SIRS criteria in vitals
        return input.PresentationContains(ApplicableComplaints) ||
               (input.Vitals?.IsFebrile == true) ||
               (input.Vitals?.SirsCriteriaCount >= 2);
    }

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        decimal score = 0;

        // 1. Respiratory rate >= 22/min (1 point)
        var highRr = input.Vitals?.RespiratoryRate >= 22;
        criteria.Add(new("Respiratory rate >= 22/min", highRr,
            1.0m, input.Vitals?.RespiratoryRate != null ? $"RR: {input.Vitals.RespiratoryRate}" : null));
        if (highRr) score += 1;

        // 2. Altered mentation (1 point)
        var alteredMentation = input.PresentationContains("confusion", "altered mental status",
            "disoriented", "lethargic", "obtunded", "combative", "agitated",
            "somnolent", "ams", "gcs");
        criteria.Add(new("Altered mentation (GCS < 15)", alteredMentation, 1.0m, null));
        if (alteredMentation) score += 1;

        // 3. Systolic blood pressure <= 100 mmHg (1 point)
        var lowSbp = input.Vitals?.SystolicBp <= 100;
        criteria.Add(new("Systolic BP <= 100 mmHg", lowSbp,
            1.0m, input.Vitals?.SystolicBp != null ? $"SBP: {input.Vitals.SystolicBp}" : null));
        if (lowSbp) score += 1;

        // Add supplementary SIRS criteria info (not scored, but clinically relevant)
        if (input.Vitals != null && input.Vitals.SirsCriteriaCount > 0)
        {
            criteria.Add(new($"SIRS criteria met: {input.Vitals.SirsCriteriaCount}/3",
                false, 0, "Supplementary — not scored in qSOFA"));
        }

        // Add lactate if available (not scored, but changes management)
        var lactate = input.RecentLabs?.Lactate;
        if (lactate != null)
        {
            criteria.Add(new($"Lactate: {lactate.Value} mmol/L",
                lactate.Value > 2.0m, 0,
                lactate.Value > 4.0m ? "ELEVATED >4 — septic shock criteria" :
                lactate.Value > 2.0m ? "Elevated — consider sepsis" : "Normal"));
        }

        var (risk, probability, recommendation) = score switch
        {
            0 => ("Low", 0.03m,
                "Low qSOFA. If infection suspected, continue monitoring. Consider full SOFA score if clinical concern persists."),
            1 => ("Moderate", 0.10m,
                "Single qSOFA criterion met. Higher vigilance. Serial vitals q2h. Blood cultures and lactate if infection suspected."),
            _ => ("High", 0.24m,
                "qSOFA >= 2: HIGH RISK of poor outcome. Blood cultures x2, serum lactate STAT, " +
                "broad-spectrum antibiotics within 1 hour, 30 mL/kg crystalloid if hypotensive. " +
                "Consider ICU consultation.")
        };

        // Lactate overrides risk category
        if (lactate?.Value > 4.0m && score >= 2)
        {
            risk = "Critical";
            probability = 0.40m;
            recommendation = "SEPTIC SHOCK CRITERIA MET (qSOFA >= 2 + lactate > 4). " +
                "Immediate ICU. Vasopressors if MAP < 65 after fluid resuscitation.";
        }

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 3m,
            risk, probability, recommendation, criteria);
    }
}

/// <summary>
/// Ottawa Ankle Rules — imaging decision support for ankle/foot injuries.
/// 
/// Validated sensitivity 98-100% for fractures. Reduces unnecessary X-rays by 30-40%.
/// 
/// Source: Stiell IG et al. JAMA. 1994;271(11):827-832.
/// </summary>
public class OttawaAnkleRules : IClinicalGuideline
{
    public string GuidelineName => "Ottawa Ankle Rules";
    public string Version => "Ottawa Ankle Rules, 1994";
    public string SourceCitation => "Stiell IG et al. JAMA. 1994;271(11):827-832";
    public string[] ApplicableComplaints => new[]
    {
        "ankle pain", "ankle injury", "ankle sprain", "twisted ankle",
        "foot pain", "foot injury", "ankle swelling", "rolled ankle"
    };

    public bool IsApplicable(GuidelineInput input) =>
        input.PresentationContains(ApplicableComplaints) && input.PatientAge >= 2;

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        bool needsXray = false;

        // Ankle series indicated if:
        var bonyTendernessPostMalleolus = input.PresentationContains(
            "posterior malleolus", "medial malleolus tender", "lateral malleolus tender",
            "bony tenderness malleolus");
        criteria.Add(new("Bone tenderness at posterior edge of distal 6cm of malleolus",
            bonyTendernessPostMalleolus, 1, null));
        if (bonyTendernessPostMalleolus) needsXray = true;

        var unableToWeightBear = input.PresentationContains(
            "unable to walk", "cannot bear weight", "can't walk", "non-weight bearing",
            "unable to take 4 steps");
        criteria.Add(new("Unable to bear weight (4 steps) immediately and in ED",
            unableToWeightBear, 1, null));
        if (unableToWeightBear) needsXray = true;

        // Foot series indicated if:
        var navicularTenderness = input.PresentationContains(
            "navicular", "midfoot tenderness", "base of 5th metatarsal");
        criteria.Add(new("Tenderness at navicular or base of 5th metatarsal",
            navicularTenderness, 1, null));
        if (navicularTenderness) needsXray = true;

        string recommendation;
        string risk;
        decimal probability;

        if (needsXray)
        {
            risk = "Imaging indicated";
            probability = 0.15m; // ~15% fracture rate when rules positive
            recommendation = "Ottawa Ankle Rules POSITIVE. Ankle/foot X-ray indicated. " +
                "Sensitivity 98-100% for clinically significant fractures.";
        }
        else
        {
            risk = "Imaging not indicated";
            probability = 0.002m; // <1% fracture rate when rules negative
            recommendation = "Ottawa Ankle Rules NEGATIVE. X-ray not indicated. " +
                "Safe to treat as soft tissue injury. RICE protocol. " +
                "Return if unable to bear weight in 5-7 days.";
        }

        return new GuidelineResult(
            GuidelineName, SourceCitation, needsXray ? 1 : 0, 1,
            risk, probability, recommendation, criteria);
    }
}

/// <summary>
/// CURB-65 Score for Pneumonia Severity.
/// 
/// Determines whether pneumonia can be treated outpatient vs. needs admission.
/// Five criteria scored 0-1 each.
/// 
/// Source: Lim WS et al. Thorax. 2003;58(5):377-382.
/// </summary>
public class Curb65Score : IClinicalGuideline
{
    public string GuidelineName => "CURB-65 Pneumonia Severity";
    public string Version => "CURB-65, 2003";
    public string SourceCitation => "Lim WS et al. Thorax. 2003;58(5):377-382";
    public string[] ApplicableComplaints => new[]
    {
        "pneumonia", "cough", "fever and cough", "productive cough",
        "pleuritic", "lung infection", "lower respiratory"
    };

    public bool IsApplicable(GuidelineInput input) =>
        input.PresentationContains(ApplicableComplaints);

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        decimal score = 0;

        // C - Confusion
        var confused = input.PresentationContains("confusion", "altered mental status",
            "disoriented", "ams");
        criteria.Add(new("Confusion (new onset)", confused, 1, null));
        if (confused) score += 1;

        // U - Urea/BUN > 19 mg/dL (7 mmol/L)
        var highBun = input.RecentLabs?.Bun?.Value > 19;
        criteria.Add(new("BUN > 19 mg/dL", highBun,
            1, input.RecentLabs?.Bun != null ? $"BUN: {input.RecentLabs.Bun.Value}" : "Not available"));
        if (highBun) score += 1;

        // R - Respiratory rate >= 30
        var highRr = input.Vitals?.RespiratoryRate >= 30;
        criteria.Add(new("Respiratory rate >= 30/min", highRr,
            1, input.Vitals?.RespiratoryRate != null ? $"RR: {input.Vitals.RespiratoryRate}" : null));
        if (highRr) score += 1;

        // B - Blood pressure (SBP < 90 or DBP <= 60)
        var lowBp = input.Vitals?.SystolicBp < 90 || input.Vitals?.DiastolicBp <= 60;
        criteria.Add(new("BP: SBP < 90 or DBP <= 60", lowBp,
            1, input.Vitals?.SystolicBp != null ? $"BP: {input.Vitals.SystolicBp}/{input.Vitals.DiastolicBp}" : null));
        if (lowBp) score += 1;

        // 65 - Age >= 65
        var age65 = input.PatientAge >= 65;
        criteria.Add(new("Age >= 65", age65, 1, $"Age: {input.PatientAge}"));
        if (age65) score += 1;

        var (risk, probability, recommendation) = score switch
        {
            0 or 1 => ("Low", 0.015m,
                "CURB-65 0-1: Low mortality risk (~1.5%). Consider outpatient treatment with oral antibiotics. " +
                "Follow-up in 48-72 hours."),
            2 => ("Moderate", 0.09m,
                "CURB-65 2: Moderate risk (~9% mortality). Consider short inpatient stay or closely supervised outpatient. " +
                "IV antibiotics may be warranted."),
            _ => ("High", 0.22m,
                "CURB-65 >= 3: HIGH mortality risk (22%+). Hospital admission required. " +
                "Consider ICU if score >= 4. IV antibiotics, blood cultures, pneumonia pathway.")
        };

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 5,
            risk, probability, recommendation, criteria);
    }
}
