// ============================================================
// ATTENDING AI — Choosing Wisely Filters
// AAFP "Do Not Order" rules for cost-conscious, evidence-based care
// Source: AAFP Choosing Wisely Campaign (choosingwisely.org)
// ============================================================
//
// TODO(SECURITY): These clinical ordering rules are currently bundled into
// the frontend. Move to the backend workup pipeline so the rule set and
// logic are not visible in the browser bundle.
// ============================================================

import type { PatientPresentation } from './differentialDiagnosis';

export interface ChoosingWiselyAlert {
  id: string;
  description: string;
  testFlagged: string;
  alternative: string;
  source: string;
}

interface ChoosingWiselyRule {
  id: string;
  description: string;
  appliesWhen: (presentation: PatientPresentation, testName: string) => boolean;
  testPattern: RegExp;
  // Regex that must match at least one of the top differential diagnosis
  // names for this rule to fire. Without this gate, generic test names like
  // "Blood cultures x2 (before antibiotics)" in a sepsis workup were matching
  // the URI antibiotic rule and firing a URI recommendation on a UTI case.
  // Rules that should fire regardless of differential can use a wide pattern.
  relevantDiagnoses: RegExp;
  alternative: string;
  source: string;
}

const CHOOSING_WISELY_RULES: ChoosingWiselyRule[] = [
  {
    id: 'cw_back_imaging',
    description: "Don't image for low back pain within the first 6 weeks unless red flags are present",
    appliesWhen: (p, test) =>
      /back\s*pain|lower\s*back|lumbar/i.test(p.chiefComplaint) &&
      /x-ray.*lumbar|mri.*lumbar|ct.*lumbar|lumbar.*x-ray|lumbar.*mri|lumbar.*ct/i.test(test) &&
      p.demographics.age < 50 &&
      !/cancer|fracture|infection|neurolog|cauda|bladder|bowel|weakness|foot\s*drop/i.test(
        [p.chiefComplaint, ...p.symptoms.map(s => s.name), ...(p.redFlags || [])].join(' ')
      ),
    testPattern: /x-ray.*lumbar|mri.*lumbar|ct.*lumbar|lumbar.*spine/i,
    relevantDiagnoses: /back|lumbar|strain|disc|spondylosis/i,
    alternative: 'Conservative management for 4-6 weeks. NSAIDs, physical therapy, activity modification.',
    source: 'AAFP Choosing Wisely, 2012',
  },
  {
    id: 'cw_sinusitis_abx',
    description: "Don't prescribe antibiotics for acute sinusitis unless symptoms persist >7 days or worsen after initial improvement",
    appliesWhen: (p) =>
      /sinusit|sinus|nasal.*congest/i.test(p.chiefComplaint) &&
      !/7\s*day|week|worsen|fever.*high/i.test(p.symptoms.map(s => s.name).join(' ')),
    testPattern: /antibiotic|amoxicillin|augmentin|azithromycin/i,
    relevantDiagnoses: /sinusitis|rhinosinusitis|uri/i,
    alternative: 'Supportive care: saline irrigation, analgesics, decongestants. Reassess in 7-10 days.',
    source: 'AAFP Choosing Wisely, 2012',
  },
  {
    id: 'cw_ekg_screening',
    description: "Don't order EKGs for low-risk asymptomatic patients",
    appliesWhen: (p, test) =>
      /ecg|ekg|electrocardiogram/i.test(test) &&
      !/chest|pain|palpit|dizz|syncope|shortness|dyspnea|heart/i.test(p.chiefComplaint) &&
      p.demographics.age < 40,
    testPattern: /ecg|ekg|electrocardiogram/i,
    // Only fire when the assessment didn't land on a cardiac diagnosis — if
    // ACS/arrhythmia/PE is ranked at all, an EKG isn't screening.
    relevantDiagnoses: /anxiety|adjustment|somatic|stress|viral|muscul/i,
    alternative: 'No cardiac testing indicated without cardiac symptoms or risk factors.',
    source: 'AAFP Choosing Wisely, 2012',
  },
  {
    id: 'cw_headache_ct',
    description: "Don't order CT/MRI for headache without red flags (thunderclap, worst-ever, focal neuro, papilledema)",
    appliesWhen: (p, test) =>
      /headache|head\s*pain|migraine/i.test(p.chiefComplaint) &&
      /ct.*head|mri.*brain|head.*ct|brain.*mri/i.test(test) &&
      !/worst|thunderclap|sudden.*severe|focal|weakness|vision|seizure|confusion|fever.*stiff/i.test(
        [p.chiefComplaint, ...p.symptoms.map(s => s.name), ...(p.redFlags || [])].join(' ')
      ),
    testPattern: /ct.*head|mri.*brain/i,
    relevantDiagnoses: /headache|migraine|tension|cluster/i,
    alternative: 'Clinical diagnosis of primary headache. Neuroimaging only if red flags present.',
    source: 'AAFP/AAN Choosing Wisely, 2013',
  },
  {
    id: 'cw_uri_antibiotics',
    description: "Don't prescribe antibiotics for upper respiratory infections (common cold)",
    appliesWhen: (p) =>
      /cold|uri|upper\s*respiratory|runny\s*nose|nasal\s*congest/i.test(p.chiefComplaint) &&
      !/strep|high\s*fever|10\s*day/i.test(p.symptoms.map(s => s.name).join(' ')),
    // Gate on a URI diagnosis — prevents matching "Blood cultures x2 (before
    // antibiotics)" in a Sepsis workup for a UTI or pneumonia presentation.
    testPattern: /\bantibiotic|amoxicillin|azithromycin|z-pack/i,
    relevantDiagnoses: /viral uri|common cold|upper respiratory/i,
    alternative: 'Supportive care: rest, fluids, symptomatic treatment. Antibiotics ineffective for viral URI.',
    source: 'AAFP Choosing Wisely, 2012',
  },
  {
    id: 'cw_knee_mri_early',
    description: "Don't order MRI for acute knee pain before trial of conservative management unless mechanical symptoms, instability, or exam findings warrant it",
    appliesWhen: (p, test) =>
      /knee/i.test(p.chiefComplaint) &&
      /mri.*knee|knee.*mri/i.test(test) &&
      !/lock|catch|give.*way|buckl|unable.*weight|instability|effusion/i.test(
        [...p.symptoms.map(s => s.name), ...(Object.values(p.symptomSpecificAnswers || {}))].join(' ')
      ),
    testPattern: /mri.*knee|knee.*mri/i,
    relevantDiagnoses: /knee|meniscus|patellofemoral|osteoarthritis|it band|baker/i,
    alternative: 'Conservative management: RICE, NSAIDs, physical therapy for 4-6 weeks. MRI if not improving.',
    source: 'ACR Appropriateness Criteria; AAOS Choosing Wisely',
  },
  {
    id: 'cw_xray_ankle',
    description: "Don't X-ray ankle injuries unless Ottawa Ankle Rules criteria are met",
    appliesWhen: (p, test) =>
      /ankle/i.test(p.chiefComplaint) &&
      /x-ray.*ankle|ankle.*x-ray/i.test(test) &&
      !/unable.*walk|bone.*tender|posterior.*malleol|navicular|base.*5th/i.test(
        p.symptoms.map(s => s.name).join(' ')
      ),
    testPattern: /x-ray.*ankle|ankle.*x-ray/i,
    relevantDiagnoses: /ankle|sprain|strain/i,
    alternative: 'Ottawa Ankle Rules negative — radiography not indicated. RICE protocol.',
    source: 'Stiell et al. JAMA 1994; AAFP Choosing Wisely',
  },
  {
    id: 'cw_ddimer_high_prob',
    description: "Don't use D-dimer to exclude PE when clinical probability is high (Wells >4)",
    appliesWhen: (p, test) =>
      /d-dimer/i.test(test) &&
      /chest.*pain.*sudden|calf.*pain.*chest|hemoptysis.*dyspnea/i.test(
        p.symptoms.map(s => s.name).join(' ')
      ),
    testPattern: /d-dimer/i,
    relevantDiagnoses: /pulmonary embolism|dvt/i,
    alternative: 'High clinical probability for PE — proceed directly to CT Pulmonary Angiogram.',
    source: 'Wells et al. Ann Intern Med 2001; ACEP Choosing Wisely',
  },
  {
    id: 'cw_preop_routine',
    description: "Don't order routine preoperative labs (CBC, BMP, coags) in healthy patients undergoing low-risk surgery",
    appliesWhen: (p, test) =>
      /preop|pre-op|before\s*surgery/i.test(p.chiefComplaint) &&
      /cbc|bmp|pt.*inr|coag/i.test(test) &&
      p.demographics.age < 40,
    testPattern: /cbc|bmp|pt.*inr|coagulation/i,
    relevantDiagnoses: /preoperative|healthy/i,
    alternative: 'Healthy patients <40 undergoing low-risk procedures do not require routine preoperative labs.',
    source: 'ASA/AAFP Choosing Wisely, 2013',
  },
  {
    id: 'cw_vitd_screening',
    description: "Don't screen for Vitamin D deficiency in asymptomatic patients without risk factors",
    appliesWhen: (p, test) =>
      /vitamin\s*d|25.*hydroxy/i.test(test) &&
      !/fatigue|weakness|bone\s*pain|fracture|osteoporosis|dark\s*skin|malabsorption/i.test(
        p.chiefComplaint + ' ' + p.symptoms.map(s => s.name).join(' ')
      ),
    testPattern: /vitamin\s*d/i,
    // Only fire when the primary differentials are actually things that
    // warrant a Vit D workup (asymptomatic or general wellness) — prevents
    // the recommendation from appearing on GERD, headache, and chest pain.
    relevantDiagnoses: /fatigue|wellness|screening|bone pain/i,
    alternative: 'Empiric Vitamin D supplementation (1000-2000 IU/day) may be more cost-effective than screening.',
    source: 'AAFP Choosing Wisely, 2014',
  },
  {
    id: 'cw_psa_elderly',
    description: "Don't screen with PSA in men >70 or men with <10 year life expectancy",
    appliesWhen: (p, test) =>
      /psa/i.test(test) && p.demographics.gender === 'male' && p.demographics.age > 70,
    testPattern: /\bpsa\b/i,
    relevantDiagnoses: /prostate|screening/i,
    alternative: 'Shared decision-making. USPSTF recommends against routine PSA screening in men >70.',
    source: 'USPSTF Grade D; AAFP Choosing Wisely',
  },
  {
    id: 'cw_carotid_screening',
    description: "Don't screen for carotid artery stenosis in asymptomatic patients",
    appliesWhen: (p, test) =>
      /carotid.*ultrasound|carotid.*doppler/i.test(test) &&
      !/stroke|tia|focal.*neuro|weakness.*one\s*side/i.test(
        p.chiefComplaint + ' ' + p.symptoms.map(s => s.name).join(' ')
      ),
    testPattern: /carotid.*ultrasound|carotid.*doppler/i,
    relevantDiagnoses: /screening|asymptomatic/i,
    alternative: 'Risk factor management (BP, lipids, smoking cessation) more effective than screening.',
    source: 'AAFP/USPSTF Choosing Wisely',
  },
];

// ============================================================
// Public API
// ============================================================

/**
 * Check if any workup recommendations should be flagged by Choosing Wisely rules.
 * Returns array of alerts for tests that may be unnecessary.
 *
 * @param topDiagnoses - optional list of top differential names. When provided,
 *   each rule's `relevantDiagnoses` regex must match at least one entry before
 *   the rule can fire. This prevents rules from triggering on tests that
 *   appear in unrelated workups (e.g. "Blood cultures x2 (before antibiotics)"
 *   from Sepsis workup falsely triggering the URI antibiotic rule on a UTI
 *   case). Omit or pass an empty array to disable the gate (legacy behavior).
 */
export function checkChoosingWisely(
  presentation: PatientPresentation,
  tests: string[],
  topDiagnoses: string[] = []
): ChoosingWiselyAlert[] {
  const alerts: ChoosingWiselyAlert[] = [];
  const firedRuleIds = new Set<string>();
  const dxBlob = topDiagnoses.join(' | ').toLowerCase();

  for (const test of tests) {
    for (const rule of CHOOSING_WISELY_RULES) {
      // Deduplicate: only fire each rule once
      if (firedRuleIds.has(rule.id)) continue;
      // Gate on relevance to the actual differential
      if (topDiagnoses.length > 0 && !rule.relevantDiagnoses.test(dxBlob)) continue;
      if (rule.testPattern.test(test) && rule.appliesWhen(presentation, test)) {
        firedRuleIds.add(rule.id);
        alerts.push({
          id: rule.id,
          description: rule.description,
          testFlagged: test,
          alternative: rule.alternative,
          source: rule.source,
        });
      }
    }
  }

  return alerts;
}
