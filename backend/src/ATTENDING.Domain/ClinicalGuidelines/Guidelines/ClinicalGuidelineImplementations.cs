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

/// <summary>
/// Ottawa Knee Rules — clinical decision rule for knee radiography.
///
/// Determines whether knee X-rays are needed after acute knee injury.
/// Nearly 100% sensitivity for fractures when applied correctly.
///
/// Source: Stiell IG et al. JAMA. 1996;275(8):611-615.
/// </summary>
public class OttawaKneeRules : IClinicalGuideline
{
    public string GuidelineName => "Ottawa Knee Rules";
    public string Version => "Ottawa Knee Rules, 1996";
    public string SourceCitation => "Stiell IG et al. JAMA. 1996;275(8):611-615";
    public string[] ApplicableComplaints => new[]
    {
        "knee pain", "knee injury", "knee swelling", "fell on knee",
        "twisted knee", "knee trauma", "knee sprain"
    };

    public bool IsApplicable(GuidelineInput input)
    {
        return input.PresentationContains(ApplicableComplaints);
    }

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        decimal score = 0;

        // 1. Age >= 55
        var ageOver55 = input.PatientAge >= 55;
        criteria.Add(new("Age >= 55 years", ageOver55, 1, input.PatientAge > 0 ? $"Age: {input.PatientAge}" : null));
        if (ageOver55) score += 1;

        // 2. Isolated tenderness of patella (no other bony tenderness)
        var patellaTender = input.PresentationContains("patella tender", "patellar tender",
            "kneecap tender", "patella pain");
        criteria.Add(new("Isolated tenderness of patella", patellaTender, 1, null));
        if (patellaTender) score += 1;

        // 3. Tenderness at head of fibula
        var fibulaTender = input.PresentationContains("fibula tender", "fibular head",
            "lateral knee tender");
        criteria.Add(new("Tenderness at head of fibula", fibulaTender, 1, null));
        if (fibulaTender) score += 1;

        // 4. Inability to flex to 90 degrees
        var cantFlex = input.PresentationContains("cannot flex", "can't flex", "unable to flex",
            "can't bend knee", "cannot bend knee", "limited flexion");
        criteria.Add(new("Inability to flex to 90 degrees", cantFlex, 1, null));
        if (cantFlex) score += 1;

        // 5. Inability to bear weight (4 steps immediately and in ED)
        var cantBearWeight = input.PresentationContains("cannot walk", "can't walk",
            "unable to walk", "non-weight bearing", "cannot bear weight", "can't bear weight",
            "limping");
        criteria.Add(new("Inability to bear weight (4 steps)", cantBearWeight, 1, null));
        if (cantBearWeight) score += 1;

        var xrayNeeded = score >= 1;
        var (risk, probability) = xrayNeeded
            ? ("Positive", 0.07m)  // ~7% fracture rate when rules positive
            : ("Negative", 0.001m); // <0.1% fracture rate when rules negative

        var recommendation = xrayNeeded
            ? $"Ottawa Knee Rules POSITIVE ({score} criteria). Knee radiography indicated to rule out fracture."
            : "Ottawa Knee Rules NEGATIVE. Knee radiography not indicated. " +
              "Safe discharge with weight-bearing as tolerated, ice, and follow-up if symptoms worsen.";

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 5,
            risk, probability, recommendation, criteria);
    }
}

/// <summary>
/// PECARN Head Injury Prediction Rule — pediatric head CT decision rule.
///
/// Identifies children at very low risk of clinically-important traumatic
/// brain injury (ciTBI) who do NOT need head CT. Two age-stratified algorithms.
///
/// Source: Kuppermann N et al. Lancet. 2009;374(9696):1160-1170.
/// </summary>
public class PecarnHeadInjury : IClinicalGuideline
{
    public string GuidelineName => "PECARN Head Injury Prediction Rule";
    public string Version => "PECARN, 2009";
    public string SourceCitation => "Kuppermann N et al. Lancet. 2009;374(9696):1160-1170";
    public string[] ApplicableComplaints => new[]
    {
        "head injury", "head trauma", "fell hit head", "concussion",
        "hit head", "head laceration", "bump on head", "loss of consciousness"
    };

    public bool IsApplicable(GuidelineInput input)
    {
        return input.PatientAge < 18 && input.PresentationContains(ApplicableComplaints);
    }

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        decimal score = 0;
        var isUnder2 = input.PatientAge < 2;

        // 1. Altered mental status (GCS < 15)
        var alteredMental = input.PresentationContains("altered mental", "confused", "lethargic",
            "drowsy", "irritable", "agitated", "gcs", "not acting normally",
            "unresponsive", "somnolent");
        criteria.Add(new("Altered mental status", alteredMental, 2, null));
        if (alteredMental) score += 2;

        // 2. Palpable skull fracture (< 2y) or signs of basilar skull fracture (>= 2y)
        var skullFracture = isUnder2
            ? input.PresentationContains("skull fracture", "palpable defect", "boggy swelling",
                "fontanelle bulging")
            : input.PresentationContains("skull fracture", "basilar", "battle sign",
                "raccoon eyes", "hemotympanum", "csf otorrhea", "csf rhinorrhea");
        var fractureName = isUnder2 ? "Palpable skull fracture" : "Signs of basilar skull fracture";
        criteria.Add(new(fractureName, skullFracture, 2, null));
        if (skullFracture) score += 2;

        // 3. Loss of consciousness
        var loc = input.PresentationContains("loss of consciousness", "loc", "passed out",
            "blacked out", "knocked out", "unresponsive");
        criteria.Add(new("Loss of consciousness", loc, 1, null));
        if (loc) score += 1;

        // 4. Severe mechanism of injury
        var severeMechanism = input.PresentationContains("motor vehicle", "mva", "mvc",
            "ejected", "pedestrian struck", "bicycle", "fall greater than",
            "fall > 3 feet", "fall > 5 feet", "high impact");
        criteria.Add(new("Severe mechanism of injury", severeMechanism, 1, null));
        if (severeMechanism) score += 1;

        // 5. Vomiting (for >= 2y) or scalp hematoma not frontal (for < 2y)
        if (isUnder2)
        {
            var nonFrontalHematoma = input.PresentationContains("parietal hematoma",
                "occipital hematoma", "temporal hematoma", "non-frontal");
            criteria.Add(new("Scalp hematoma (non-frontal)", nonFrontalHematoma, 1, null));
            if (nonFrontalHematoma) score += 1;
        }
        else
        {
            var vomiting = input.PresentationContains("vomiting", "vomited", "threw up", "emesis");
            criteria.Add(new("Vomiting", vomiting, 1, null));
            if (vomiting) score += 1;
        }

        // 6. Severe or worsening headache (for >= 2y)
        if (!isUnder2)
        {
            var severeHeadache = input.PresentationContains("severe headache", "worst headache",
                "worsening headache", "headache getting worse");
            criteria.Add(new("Severe or worsening headache", severeHeadache, 1, null));
            if (severeHeadache) score += 1;
        }

        var (risk, probability) = score switch
        {
            0 => ("Very Low", 0.001m),    // <0.05% ciTBI risk — CT not recommended
            1 => ("Low", 0.009m),          // ~0.9% — observation vs CT
            _ => ("Not Low", 0.044m),      // ~4.4% — CT recommended
        };

        var recommendation = score switch
        {
            0 => "PECARN VERY LOW RISK. Head CT NOT recommended. " +
                 "Observation with discharge instructions. Return if symptoms worsen.",
            1 => "PECARN LOW RISK. Consider observation (4-6 hours) vs. head CT based on " +
                 "clinical judgment, parental preference, and worsening symptoms.",
            _ => "PECARN criteria positive. Head CT RECOMMENDED to evaluate for " +
                 "clinically-important traumatic brain injury."
        };

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, isUnder2 ? 7m : 8m,
            risk, probability, recommendation, criteria);
    }
}

/// <summary>
/// Centor Score (Modified/McIsaac) — strep pharyngitis decision rule.
///
/// Predicts likelihood of Group A Streptococcal pharyngitis to guide
/// testing and empiric antibiotic decisions.
///
/// Source: McIsaac WJ et al. CMAJ. 2000;163(7):811-815.
/// </summary>
public class CentorScore : IClinicalGuideline
{
    public string GuidelineName => "Modified Centor (McIsaac) Score";
    public string Version => "McIsaac Modified Centor, 2000";
    public string SourceCitation => "McIsaac WJ et al. CMAJ. 2000;163(7):811-815";
    public string[] ApplicableComplaints => new[]
    {
        "sore throat", "pharyngitis", "throat pain", "difficulty swallowing",
        "tonsillitis", "strep", "odynophagia"
    };

    public bool IsApplicable(GuidelineInput input)
    {
        return input.PresentationContains(ApplicableComplaints);
    }

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        decimal score = 0;

        // 1. Tonsillar exudates or swelling (+1)
        var exudates = input.PresentationContains("exudate", "tonsillar swelling",
            "tonsillar enlargement", "pus on tonsils", "white patches");
        criteria.Add(new("Tonsillar exudates or swelling", exudates, 1, null));
        if (exudates) score += 1;

        // 2. Tender/swollen anterior cervical lymph nodes (+1)
        var lymphNodes = input.PresentationContains("lymph node", "lymphadenopathy",
            "swollen glands", "tender nodes", "anterior cervical", "neck swelling");
        criteria.Add(new("Tender/swollen anterior cervical lymph nodes", lymphNodes, 1, null));
        if (lymphNodes) score += 1;

        // 3. Fever (temperature > 38°C / 100.4°F) (+1)
        var fever = (input.Vitals?.TemperatureCelsius.HasValue == true && input.Vitals.TemperatureCelsius > 38.0m) ||
                    input.PresentationContains("fever", "febrile");
        criteria.Add(new("Fever > 38°C (100.4°F)", fever, 1,
            input.Vitals?.TemperatureCelsius != null ? $"Temp: {input.Vitals.TemperatureCelsius}°C" : null));
        if (fever) score += 1;

        // 4. Absence of cough (+1)
        var noCough = !input.PresentationContains("cough", "coughing");
        criteria.Add(new("Absence of cough", noCough, 1, null));
        if (noCough) score += 1;

        // 5. Age modifier (McIsaac modification)
        // Age 3-14: +1, Age 15-44: 0, Age >= 45: -1
        var ageModifier = input.PatientAge switch
        {
            >= 3 and <= 14 => 1,
            >= 45 => -1,
            _ => 0,
        };
        var ageMet = ageModifier > 0;
        criteria.Add(new("Age 3-14 (+1) or ≥45 (-1)", ageMet, ageModifier,
            $"Age: {input.PatientAge}, modifier: {ageModifier:+#;-#;0}"));
        score += ageModifier;
        if (score < 0) score = 0;

        var (risk, probability) = score switch
        {
            <= 0 => ("Very Low", 0.025m),
            1 => ("Low", 0.07m),
            2 => ("Low-Moderate", 0.15m),
            3 => ("Moderate", 0.30m),
            _ => ("High", 0.50m),
        };

        var recommendation = score switch
        {
            <= 1 => "Centor 0-1: Low probability of GAS. No testing or antibiotics needed. " +
                     "Symptomatic treatment only.",
            2 or 3 => "Centor 2-3: Moderate probability of GAS. Rapid strep test indicated. " +
                       "Treat with antibiotics only if test positive.",
            _ => "Centor 4+: High probability of GAS. Consider empiric antibiotics or " +
                 "rapid strep test. Amoxicillin 500mg TID x 10 days is first-line."
        };

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 5,
            risk, probability, recommendation, criteria);
    }
}

/// <summary>
/// CHA₂DS₂-VASc Score — stroke risk in atrial fibrillation.
///
/// Predicts annual stroke risk in non-valvular atrial fibrillation
/// to guide anticoagulation decisions.
///
/// Source: Lip GY et al. Chest. 2010;137(2):263-272.
/// </summary>
public class Chads2VascScore : IClinicalGuideline
{
    public string GuidelineName => "CHA₂DS₂-VASc Score";
    public string Version => "CHA₂DS₂-VASc, 2010";
    public string SourceCitation => "Lip GY et al. Chest. 2010;137(2):263-272";
    public string[] ApplicableComplaints => new[]
    {
        "atrial fibrillation", "afib", "a-fib", "af", "irregular heartbeat",
        "palpitations", "irregular rhythm", "atrial flutter"
    };

    public bool IsApplicable(GuidelineInput input)
    {
        return input.PresentationContains(ApplicableComplaints) ||
               input.HasCondition("atrial fibrillation", "afib", "atrial flutter");
    }

    public GuidelineResult Evaluate(GuidelineInput input)
    {
        var criteria = new List<ScoredCriterion>();
        decimal score = 0;

        // C — Congestive heart failure (+1)
        var chf = input.HasCondition("heart failure", "chf", "hfref", "hfpef",
            "cardiomyopathy", "reduced ejection fraction");
        criteria.Add(new("Congestive heart failure / LV dysfunction", chf, 1, null));
        if (chf) score += 1;

        // H — Hypertension (+1)
        var htn = input.HasCondition("hypertension", "htn", "high blood pressure") ||
                  (input.Vitals?.SystolicBp >= 140);
        criteria.Add(new("Hypertension", htn, 1,
            input.Vitals?.SystolicBp != null ? $"SBP: {input.Vitals.SystolicBp}" : null));
        if (htn) score += 1;

        // A₂ — Age ≥ 75 (+2)
        var age75 = input.PatientAge >= 75;
        criteria.Add(new("Age ≥ 75", age75, 2, $"Age: {input.PatientAge}"));
        if (age75) score += 2;

        // D — Diabetes mellitus (+1)
        var diabetes = input.HasCondition("diabetes", "dm", "type 2", "type 1",
            "a1c", "hyperglycemia");
        criteria.Add(new("Diabetes mellitus", diabetes, 1, null));
        if (diabetes) score += 1;

        // S₂ — Stroke/TIA/thromboembolism (+2)
        var stroke = input.HasCondition("stroke", "cva", "tia", "transient ischemic",
            "cerebrovascular", "thromboembolism");
        criteria.Add(new("Stroke / TIA / thromboembolism history", stroke, 2, null));
        if (stroke) score += 2;

        // V — Vascular disease (prior MI, PAD, aortic plaque) (+1)
        var vascular = input.HasCondition("myocardial infarction", "mi", "pad",
            "peripheral arterial", "aortic plaque", "coronary artery disease", "cad",
            "stent", "cabg", "bypass");
        criteria.Add(new("Vascular disease (MI, PAD, aortic plaque)", vascular, 1, null));
        if (vascular) score += 1;

        // A — Age 65-74 (+1)
        var age65 = input.PatientAge >= 65 && input.PatientAge < 75;
        criteria.Add(new("Age 65-74", age65, 1, $"Age: {input.PatientAge}"));
        if (age65) score += 1;

        // Sc — Sex category (female +1)
        var female = input.PatientSex.Equals("female", StringComparison.OrdinalIgnoreCase) ||
                     input.PatientSex.Equals("f", StringComparison.OrdinalIgnoreCase);
        criteria.Add(new("Sex category (female)", female, 1, $"Sex: {input.PatientSex}"));
        if (female) score += 1;

        var (risk, probability) = score switch
        {
            0 => ("Low", 0.002m),       // 0.2% annual stroke risk
            1 => ("Low-Moderate", 0.013m), // 1.3%
            2 => ("Moderate", 0.022m),    // 2.2%
            3 => ("Moderate-High", 0.032m), // 3.2%
            4 => ("High", 0.040m),        // 4.0%
            5 => ("High", 0.067m),        // 6.7%
            6 => ("Very High", 0.098m),   // 9.8%
            _ => ("Very High", 0.152m),   // 15.2%+
        };

        var recommendation = score switch
        {
            0 => "CHA₂DS₂-VASc 0 (male) or 1 (female): Low risk. " +
                 "No anticoagulation recommended. Reassess annually.",
            1 when !female => "CHA₂DS₂-VASc 1 (male): Consider oral anticoagulation. " +
                 "Discuss risks/benefits with patient. DOACs preferred over warfarin.",
            _ => $"CHA₂DS₂-VASc {score}: Oral anticoagulation RECOMMENDED. " +
                 "DOACs (apixaban, rivaroxaban, dabigatran, edoxaban) preferred over warfarin. " +
                 "Assess bleeding risk (HAS-BLED). Ensure renal function checked before prescribing."
        };

        return new GuidelineResult(
            GuidelineName, SourceCitation, score, 9,
            risk, probability, recommendation, criteria);
    }
}
