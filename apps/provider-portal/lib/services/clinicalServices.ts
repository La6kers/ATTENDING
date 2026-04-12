// Clinical Services - Red Flag Evaluator, Differential Diagnosis Engine, Lab Recommender
// apps/provider-portal/lib/services/clinicalServices.ts

// =============================================================================
// TYPES
// =============================================================================

export interface RedFlagResult {
  id: string;
  name: string;
  severity: 'warning' | 'critical' | 'life-threatening';
  description: string;
  recommendation: string;
  autoOrders?: string[];
  requiresEmergency?: boolean;
  triggeredBy: string[];
}

export interface DifferentialDiagnosis {
  name: string;
  icd10: string;
  probability: number;
  supportingEvidence: string[];
  refutingEvidence: string[];
  workup: string[];
  clinicalPearls: string[];
  urgency: 'routine' | 'urgent' | 'emergent';
}

export interface LabRecommendation {
  code: string;
  name: string;
  category: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  rationale: string;
  conditions: string[];
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  mechanism: string;
  management: string;
}

// =============================================================================
// RED FLAG EVALUATOR
// =============================================================================

interface RedFlagRule {
  id: string;
  name: string;
  severity: 'warning' | 'critical' | 'life-threatening';
  description: string;
  recommendation: string;
  autoOrders?: string[];
  requiresEmergency?: boolean;
  conditions: {
    chiefComplaint?: RegExp[];
    symptoms?: string[];
    vitalSigns?: {
      systolic?: { min?: number; max?: number };
      diastolic?: { min?: number; max?: number };
      heartRate?: { min?: number; max?: number };
      respiratoryRate?: { min?: number; max?: number };
      oxygenSaturation?: { min?: number; max?: number };
      temperature?: { min?: number; max?: number };
    };
    age?: { min?: number; max?: number };
    riskFactors?: string[];
  };
}

const RED_FLAG_RULES: RedFlagRule[] = [
  // Neurological Emergencies
  {
    id: 'thunderclap_headache',
    name: 'Thunderclap Headache - Possible SAH',
    severity: 'life-threatening',
    description: 'Sudden severe headache reaching maximum intensity within seconds suggests subarachnoid hemorrhage',
    recommendation: 'Immediate CT head without contrast. If negative and high suspicion, LP for xanthochromia. Neurosurgery consult.',
    autoOrders: ['CT_HEAD_WO', 'CBC', 'BMP', 'PT_INR', 'PTT'],
    requiresEmergency: true,
    conditions: {
      chiefComplaint: [/worst.+headache/i, /thunderclap/i, /sudden.+severe.+headache/i],
    },
  },
  {
    id: 'stroke_symptoms',
    name: 'Acute Stroke Symptoms',
    severity: 'life-threatening',
    description: 'Focal neurological deficits suggesting stroke. Time is brain.',
    recommendation: 'Activate stroke protocol. STAT CT head, glucose, establish IV access. Consider tPA if within window.',
    autoOrders: ['CT_HEAD_WO', 'GLUCOSE', 'CBC', 'BMP', 'PT_INR', 'TROPONIN'],
    requiresEmergency: true,
    conditions: {
      symptoms: ['facial droop', 'arm weakness', 'speech difficulty', 'sudden numbness', 'vision loss', 'severe dizziness'],
    },
  },
  {
    id: 'meningitis_triad',
    name: 'Suspected Meningitis',
    severity: 'life-threatening',
    description: 'Classic triad of fever, headache, and neck stiffness suggests meningitis',
    recommendation: 'Blood cultures x2, LP (if no contraindication), empiric antibiotics within 1 hour. Do NOT delay antibiotics for LP.',
    autoOrders: ['BLOOD_CULTURE', 'CBC', 'BMP', 'LACTATE', 'CRP', 'PROCALCITONIN'],
    requiresEmergency: true,
    conditions: {
      symptoms: ['fever', 'headache', 'neck stiffness', 'photophobia', 'altered mental status'],
    },
  },
  
  // Cardiac Emergencies
  {
    id: 'acs_symptoms',
    name: 'Acute Coronary Syndrome',
    severity: 'life-threatening',
    description: 'Chest pain with concerning features suggesting myocardial ischemia',
    recommendation: 'Activate chest pain protocol. Serial ECGs, troponins. ASA 325mg if not contraindicated. Cardiology consult.',
    autoOrders: ['ECG', 'TROPONIN', 'BNP', 'CBC', 'BMP', 'CXR'],
    requiresEmergency: true,
    conditions: {
      chiefComplaint: [/chest.+pain/i, /chest.+pressure/i, /crushing/i],
      symptoms: ['diaphoresis', 'nausea', 'dyspnea', 'arm pain', 'jaw pain'],
      riskFactors: ['diabetes', 'hypertension', 'hyperlipidemia', 'smoking', 'family history CAD'],
    },
  },
  {
    id: 'aortic_dissection',
    name: 'Possible Aortic Dissection',
    severity: 'life-threatening',
    description: 'Sudden tearing chest/back pain with blood pressure differential suggests aortic dissection',
    recommendation: 'STAT CT angiogram chest/abdomen/pelvis. BP control. Vascular surgery consult. Type and screen.',
    autoOrders: ['CTA_CHEST', 'CBC', 'BMP', 'PT_INR', 'TYPE_SCREEN', 'LACTATE'],
    requiresEmergency: true,
    conditions: {
      chiefComplaint: [/tearing.+pain/i, /ripping.+pain/i, /chest.+back.+pain/i],
      symptoms: ['hypertension', 'pulse deficit', 'blood pressure differential'],
    },
  },
  
  // Respiratory Emergencies
  {
    id: 'pe_symptoms',
    name: 'Pulmonary Embolism Risk',
    severity: 'critical',
    description: 'Sudden dyspnea, pleuritic chest pain, and hypoxia suggest PE',
    recommendation: 'Calculate Wells score. D-dimer if low probability. CTPA if intermediate/high probability or elevated D-dimer.',
    autoOrders: ['D_DIMER', 'BNP', 'TROPONIN', 'ABG'],
    requiresEmergency: false,
    conditions: {
      symptoms: ['sudden dyspnea', 'pleuritic chest pain', 'hemoptysis', 'leg swelling'],
      riskFactors: ['recent surgery', 'immobilization', 'malignancy', 'DVT history', 'oral contraceptives'],
      vitalSigns: {
        oxygenSaturation: { max: 92 },
        heartRate: { min: 100 },
      },
    },
  },
  {
    id: 'severe_hypoxia',
    name: 'Severe Hypoxia',
    severity: 'life-threatening',
    description: 'Critical oxygen saturation requiring immediate intervention',
    recommendation: 'Supplemental O2, ABG, CXR. Consider BiPAP/intubation. Identify cause urgently.',
    autoOrders: ['ABG', 'CXR', 'CBC', 'BMP', 'BNP', 'PROCALCITONIN'],
    requiresEmergency: true,
    conditions: {
      vitalSigns: {
        oxygenSaturation: { max: 88 },
      },
    },
  },
  {
    id: 'anaphylaxis',
    name: 'Anaphylaxis',
    severity: 'life-threatening',
    description: 'Multi-system allergic reaction with airway/cardiovascular compromise',
    recommendation: 'IM epinephrine 0.3-0.5mg immediately. IV access, fluids, steroids, antihistamines. Observe 4-6 hours.',
    autoOrders: ['TRYPTASE'],
    requiresEmergency: true,
    conditions: {
      symptoms: ['hives', 'angioedema', 'wheezing', 'stridor', 'hypotension', 'difficulty breathing'],
    },
  },
  
  // Sepsis
  {
    id: 'sepsis_criteria',
    name: 'Sepsis - qSOFA Positive',
    severity: 'critical',
    description: 'Meeting sepsis criteria with suspected infection',
    recommendation: 'Hour-1 bundle: lactate, blood cultures, broad-spectrum antibiotics, 30ml/kg crystalloid if hypotensive or lactate ≥4',
    autoOrders: ['LACTATE', 'BLOOD_CULTURE', 'CBC', 'BMP', 'PROCALCITONIN', 'UA', 'CXR'],
    requiresEmergency: true,
    conditions: {
      symptoms: ['fever', 'chills', 'infection'],
      vitalSigns: {
        systolic: { max: 100 },
        respiratoryRate: { min: 22 },
      },
    },
  },
  
  // Abdominal Emergencies  
  {
    id: 'acute_abdomen',
    name: 'Acute Surgical Abdomen',
    severity: 'critical',
    description: 'Peritoneal signs suggesting surgical emergency',
    recommendation: 'NPO, IV fluids, surgical consult. CT abdomen/pelvis with contrast if stable.',
    autoOrders: ['CBC', 'BMP', 'LIPASE', 'LFT', 'LACTATE', 'UA', 'TYPE_SCREEN'],
    requiresEmergency: true,
    conditions: {
      symptoms: ['rebound tenderness', 'guarding', 'rigid abdomen', 'absent bowel sounds'],
    },
  },
  {
    id: 'gi_bleed',
    name: 'Acute GI Hemorrhage',
    severity: 'critical',
    description: 'Active gastrointestinal bleeding with hemodynamic compromise',
    recommendation: 'Large bore IV access x2, type and crossmatch, GI consult, PPI drip. Consider intubation for airway protection.',
    autoOrders: ['CBC', 'BMP', 'TYPE_CROSSMATCH', 'PT_INR', 'LFT'],
    requiresEmergency: true,
    conditions: {
      symptoms: ['hematemesis', 'melena', 'hematochezia', 'coffee ground emesis'],
      vitalSigns: {
        systolic: { max: 90 },
        heartRate: { min: 110 },
      },
    },
  },
  
  // Hypertensive Emergency
  {
    id: 'hypertensive_emergency',
    name: 'Hypertensive Emergency',
    severity: 'critical',
    description: 'Severely elevated BP with end-organ damage',
    recommendation: 'IV antihypertensive (nicardipine, labetalol). Target 25% reduction in first hour. Evaluate for end-organ damage.',
    autoOrders: ['BMP', 'TROPONIN', 'UA', 'CXR', 'ECG'],
    requiresEmergency: true,
    conditions: {
      vitalSigns: {
        systolic: { min: 180 },
        diastolic: { min: 120 },
      },
      symptoms: ['headache', 'vision changes', 'chest pain', 'dyspnea', 'neurological symptoms'],
    },
  },
  
  // Other Critical Conditions
  {
    id: 'dka_hhns',
    name: 'Diabetic Emergency (DKA/HHS)',
    severity: 'critical',
    description: 'Hyperglycemic crisis requiring ICU-level care',
    recommendation: 'IV fluids (NS 1L/hr initially), insulin drip, frequent BMP, close monitoring. ICU admission.',
    autoOrders: ['BMP', 'CBC', 'VBG', 'UA', 'BETA_HB', 'SERUM_OSMO'],
    requiresEmergency: true,
    conditions: {
      symptoms: ['polyuria', 'polydipsia', 'nausea', 'vomiting', 'abdominal pain', 'altered mental status'],
      riskFactors: ['diabetes'],
    },
  },
  
  // Warning Level
  {
    id: 'severe_pain',
    name: 'Severe Pain',
    severity: 'warning',
    description: 'Pain severity 8-10/10 requiring urgent evaluation',
    recommendation: 'Evaluate for serious underlying cause. Consider analgesia after assessment.',
    conditions: {
      symptoms: ['severe pain', '10/10 pain', '9/10 pain', '8/10 pain'],
    },
  },
  {
    id: 'fever_immunocompromised',
    name: 'Fever in Immunocompromised Patient',
    severity: 'critical',
    description: 'Febrile neutropenia or fever in immunosuppressed patient',
    recommendation: 'Blood cultures, broad-spectrum antibiotics within 1 hour. Do not wait for culture results.',
    autoOrders: ['CBC', 'BMP', 'BLOOD_CULTURE', 'UA', 'CXR', 'LACTATE'],
    requiresEmergency: false,
    conditions: {
      symptoms: ['fever'],
      riskFactors: ['chemotherapy', 'transplant', 'HIV', 'immunosuppression', 'neutropenia'],
    },
  },
];

export class RedFlagEvaluator {
  evaluate(assessment: {
    chiefComplaint: string;
    symptoms?: string[];
    vitalSigns?: {
      systolic?: number;
      diastolic?: number;
      heartRate?: number;
      respiratoryRate?: number;
      oxygenSaturation?: number;
      temperature?: number;
    };
    age?: number;
    riskFactors?: string[];
  }): RedFlagResult[] {
    const results: RedFlagResult[] = [];
    const triggeredIds = new Set<string>();

    for (const rule of RED_FLAG_RULES) {
      const triggered: string[] = [];

      // Check chief complaint patterns
      if (rule.conditions.chiefComplaint) {
        for (const pattern of rule.conditions.chiefComplaint) {
          if (pattern.test(assessment.chiefComplaint)) {
            triggered.push(`Chief complaint matches: "${assessment.chiefComplaint}"`);
          }
        }
      }

      // Check symptoms
      if (rule.conditions.symptoms && assessment.symptoms) {
        const matchedSymptoms = rule.conditions.symptoms.filter((s) =>
          assessment.symptoms!.some((as) => as.toLowerCase().includes(s.toLowerCase()))
        );
        if (matchedSymptoms.length > 0) {
          triggered.push(`Symptoms: ${matchedSymptoms.join(', ')}`);
        }
      }

      // Check vital signs
      if (rule.conditions.vitalSigns && assessment.vitalSigns) {
        const vs = rule.conditions.vitalSigns;
        const avs = assessment.vitalSigns;

        if (vs.systolic) {
          if (vs.systolic.min && avs.systolic && avs.systolic >= vs.systolic.min) {
            triggered.push(`Systolic BP ${avs.systolic} ≥ ${vs.systolic.min}`);
          }
          if (vs.systolic.max && avs.systolic && avs.systolic <= vs.systolic.max) {
            triggered.push(`Systolic BP ${avs.systolic} ≤ ${vs.systolic.max}`);
          }
        }

        if (vs.diastolic) {
          if (vs.diastolic.min && avs.diastolic && avs.diastolic >= vs.diastolic.min) {
            triggered.push(`Diastolic BP ${avs.diastolic} ≥ ${vs.diastolic.min}`);
          }
          if (vs.diastolic.max && avs.diastolic && avs.diastolic <= vs.diastolic.max) {
            triggered.push(`Diastolic BP ${avs.diastolic} ≤ ${vs.diastolic.max}`);
          }
        }

        if (vs.heartRate) {
          if (vs.heartRate.min && avs.heartRate && avs.heartRate >= vs.heartRate.min) {
            triggered.push(`Heart rate ${avs.heartRate} ≥ ${vs.heartRate.min}`);
          }
          if (vs.heartRate.max && avs.heartRate && avs.heartRate <= vs.heartRate.max) {
            triggered.push(`Heart rate ${avs.heartRate} ≤ ${vs.heartRate.max}`);
          }
        }

        if (vs.oxygenSaturation?.max && avs.oxygenSaturation && avs.oxygenSaturation <= vs.oxygenSaturation.max) {
          triggered.push(`SpO2 ${avs.oxygenSaturation}% ≤ ${vs.oxygenSaturation.max}%`);
        }

        if (vs.respiratoryRate?.min && avs.respiratoryRate && avs.respiratoryRate >= vs.respiratoryRate.min) {
          triggered.push(`RR ${avs.respiratoryRate} ≥ ${vs.respiratoryRate.min}`);
        }

        if (vs.temperature) {
          if (vs.temperature.min && avs.temperature && avs.temperature >= vs.temperature.min) {
            triggered.push(`Temp ${avs.temperature}°F ≥ ${vs.temperature.min}°F`);
          }
        }
      }

      // Check risk factors
      if (rule.conditions.riskFactors && assessment.riskFactors) {
        const matchedRF = rule.conditions.riskFactors.filter((rf) =>
          assessment.riskFactors!.some((arf) => arf.toLowerCase().includes(rf.toLowerCase()))
        );
        if (matchedRF.length > 0) {
          triggered.push(`Risk factors: ${matchedRF.join(', ')}`);
        }
      }

      // If any conditions triggered, add to results
      if (triggered.length > 0 && !triggeredIds.has(rule.id)) {
        triggeredIds.add(rule.id);
        results.push({
          id: rule.id,
          name: rule.name,
          severity: rule.severity,
          description: rule.description,
          recommendation: rule.recommendation,
          autoOrders: rule.autoOrders,
          requiresEmergency: rule.requiresEmergency,
          triggeredBy: triggered,
        });
      }
    }

    // Sort by severity
    const severityOrder = { 'life-threatening': 0, critical: 1, warning: 2 };
    return results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
}

// =============================================================================
// DIFFERENTIAL DIAGNOSIS ENGINE
// =============================================================================

interface DiagnosisRule {
  name: string;
  icd10: string;
  chiefComplaints: RegExp[];
  supportingSymptoms: string[];
  refutingSymptoms: string[];
  riskFactors: string[];
  workup: string[];
  clinicalPearls: string[];
  baselineProbability: number;
  urgency: 'routine' | 'urgent' | 'emergent';
}

const DIAGNOSIS_RULES: DiagnosisRule[] = [
  // Headache Differentials
  {
    name: 'Migraine',
    icd10: 'G43.909',
    chiefComplaints: [/headache/i, /migraine/i],
    supportingSymptoms: ['photophobia', 'phonophobia', 'nausea', 'aura', 'unilateral', 'throbbing', 'pulsating'],
    refutingSymptoms: ['fever', 'neck stiffness', 'worst headache', 'thunderclap', 'focal deficit'],
    riskFactors: ['family history migraine', 'female', 'hormonal', 'stress'],
    workup: [],
    clinicalPearls: [
      'Classic migraine has aura; common migraine does not',
      'Consider medication overuse headache if using analgesics >10 days/month',
      'Triptans most effective when taken early in attack',
    ],
    baselineProbability: 0.3,
    urgency: 'routine',
  },
  {
    name: 'Tension Headache',
    icd10: 'G44.209',
    chiefComplaints: [/headache/i],
    supportingSymptoms: ['bilateral', 'band-like', 'pressure', 'mild to moderate', 'stress'],
    refutingSymptoms: ['nausea', 'vomiting', 'photophobia', 'aura', 'throbbing'],
    riskFactors: ['stress', 'poor posture', 'screen time'],
    workup: [],
    clinicalPearls: [
      'Most common primary headache disorder',
      'Usually responds to OTC analgesics',
      'Consider chronic tension headache if >15 days/month',
    ],
    baselineProbability: 0.35,
    urgency: 'routine',
  },
  {
    name: 'Subarachnoid Hemorrhage',
    icd10: 'I60.9',
    chiefComplaints: [/worst.+headache/i, /thunderclap/i, /sudden.+headache/i],
    supportingSymptoms: ['sudden onset', 'thunderclap', 'neck stiffness', 'loss of consciousness', 'vomiting'],
    refutingSymptoms: [],
    riskFactors: ['hypertension', 'smoking', 'family history aneurysm', 'polycystic kidney disease'],
    workup: ['CT_HEAD_WO', 'LP', 'CTA_HEAD'],
    clinicalPearls: [
      'CT sensitivity ~98% in first 6 hours, decreases after',
      'LP required if CT negative but high clinical suspicion',
      'Look for xanthochromia (requires >12 hours from onset)',
    ],
    baselineProbability: 0.02,
    urgency: 'emergent',
  },

  // Chest Pain Differentials
  {
    name: 'Acute Coronary Syndrome',
    icd10: 'I21.9',
    chiefComplaints: [/chest.+pain/i, /chest.+pressure/i],
    supportingSymptoms: ['diaphoresis', 'dyspnea', 'nausea', 'arm pain', 'jaw pain', 'exertional'],
    refutingSymptoms: ['pleuritic', 'reproducible on palpation', 'positional'],
    riskFactors: ['diabetes', 'hypertension', 'hyperlipidemia', 'smoking', 'family history CAD', 'male', 'age >50'],
    workup: ['ECG', 'TROPONIN', 'CBC', 'BMP', 'CXR'],
    clinicalPearls: [
      'Women and diabetics may have atypical presentations',
      'Serial troponins recommended (0, 3, 6 hours)',
      'HEART score helps risk stratify chest pain',
    ],
    baselineProbability: 0.15,
    urgency: 'emergent',
  },
  {
    name: 'Pulmonary Embolism',
    icd10: 'I26.99',
    chiefComplaints: [/chest.+pain/i, /dyspnea/i, /shortness.+breath/i],
    supportingSymptoms: ['pleuritic', 'dyspnea', 'tachycardia', 'hemoptysis', 'leg swelling'],
    refutingSymptoms: [],
    riskFactors: ['recent surgery', 'immobilization', 'malignancy', 'DVT history', 'oral contraceptives', 'pregnancy'],
    workup: ['D_DIMER', 'CTPA', 'VQ_SCAN', 'LOWER_EXT_DOPPLER'],
    clinicalPearls: [
      'Use Wells criteria to determine pre-test probability',
      'D-dimer useful only in low probability patients',
      'Age-adjusted D-dimer cutoff = age × 10 for age >50',
    ],
    baselineProbability: 0.05,
    urgency: 'emergent',
  },
  {
    name: 'GERD / Esophageal Spasm',
    icd10: 'K21.0',
    chiefComplaints: [/chest.+pain/i, /heartburn/i, /burning/i],
    supportingSymptoms: ['burning', 'postprandial', 'relieved by antacids', 'regurgitation', 'dysphagia'],
    refutingSymptoms: ['exertional', 'diaphoresis', 'radiation to arm'],
    riskFactors: ['obesity', 'hiatal hernia', 'pregnancy', 'smoking'],
    workup: [],
    clinicalPearls: [
      'Can mimic cardiac chest pain - must rule out ACS first',
      'Trial of PPI can be diagnostic and therapeutic',
      'Esophageal spasm may respond to nitrates (like angina)',
    ],
    baselineProbability: 0.25,
    urgency: 'routine',
  },
  {
    name: 'Costochondritis',
    icd10: 'M94.0',
    chiefComplaints: [/chest.+pain/i],
    supportingSymptoms: ['reproducible on palpation', 'localized', 'sharp', 'worse with movement'],
    refutingSymptoms: ['exertional', 'diaphoresis', 'dyspnea'],
    riskFactors: ['recent physical activity', 'coughing', 'trauma'],
    workup: [],
    clinicalPearls: [
      'Diagnosis of exclusion - rule out cardiac causes first',
      'Usually self-limited, responds to NSAIDs',
      'Point tenderness at costochondral junction is classic',
    ],
    baselineProbability: 0.2,
    urgency: 'routine',
  },

  // Abdominal Pain
  {
    name: 'Appendicitis',
    icd10: 'K35.80',
    chiefComplaints: [/abdominal.+pain/i, /stomach.+pain/i, /belly.+pain/i],
    supportingSymptoms: ['RLQ pain', 'migration from umbilical', 'anorexia', 'nausea', 'fever', 'rebound'],
    refutingSymptoms: ['diarrhea', 'dysuria'],
    riskFactors: ['age 10-30', 'male'],
    workup: ['CBC', 'BMP', 'LIPASE', 'UA', 'CT_ABDOMEN'],
    clinicalPearls: [
      'Classic migration: periumbilical → RLQ over 12-24 hours',
      'Rovsing sign, psoas sign, obturator sign support diagnosis',
      'CT sensitivity >95% in adults; US preferred in children/pregnancy',
    ],
    baselineProbability: 0.1,
    urgency: 'urgent',
  },
  {
    name: 'Cholecystitis',
    icd10: 'K81.9',
    chiefComplaints: [/abdominal.+pain/i, /RUQ.+pain/i],
    supportingSymptoms: ['RUQ pain', 'postprandial', 'fatty food intolerance', 'nausea', 'vomiting', 'fever', 'Murphy sign'],
    refutingSymptoms: [],
    riskFactors: ['female', 'age >40', 'obesity', 'rapid weight loss', 'pregnancy'],
    workup: ['CBC', 'LFT', 'LIPASE', 'RUQ_US'],
    clinicalPearls: [
      'Remember 4 Fs: Female, Forty, Fertile, Fat',
      'Murphy sign: inspiratory arrest during RUQ palpation',
      'Sonographic Murphy sign more specific than clinical',
    ],
    baselineProbability: 0.08,
    urgency: 'urgent',
  },
];

export class DifferentialDiagnosisEngine {
  generate(assessment: {
    chiefComplaint: string;
    symptoms: string[];
    riskFactors: string[];
    age?: number;
    gender?: string;
  }): DifferentialDiagnosis[] {
    const results: DifferentialDiagnosis[] = [];

    for (const rule of DIAGNOSIS_RULES) {
      let probability = rule.baselineProbability;
      const supportingEvidence: string[] = [];
      const refutingEvidence: string[] = [];

      // Check if chief complaint matches
      const ccMatch = rule.chiefComplaints.some((pattern) => pattern.test(assessment.chiefComplaint));
      if (!ccMatch) continue;

      supportingEvidence.push(`Chief complaint: "${assessment.chiefComplaint}"`);

      // Evaluate supporting symptoms
      for (const symptom of rule.supportingSymptoms) {
        if (assessment.symptoms.some((s) => s.toLowerCase().includes(symptom.toLowerCase()))) {
          probability += 0.1;
          supportingEvidence.push(symptom);
        }
      }

      // Evaluate refuting symptoms
      for (const symptom of rule.refutingSymptoms) {
        if (assessment.symptoms.some((s) => s.toLowerCase().includes(symptom.toLowerCase()))) {
          probability -= 0.15;
          refutingEvidence.push(symptom);
        }
      }

      // Evaluate risk factors
      for (const rf of rule.riskFactors) {
        if (assessment.riskFactors.some((arf) => arf.toLowerCase().includes(rf.toLowerCase()))) {
          probability += 0.05;
          supportingEvidence.push(`Risk factor: ${rf}`);
        }
      }

      // Clamp probability
      probability = Math.max(0.01, Math.min(0.95, probability));

      results.push({
        name: rule.name,
        icd10: rule.icd10,
        probability,
        supportingEvidence,
        refutingEvidence,
        workup: rule.workup,
        clinicalPearls: rule.clinicalPearls,
        urgency: rule.urgency,
      });
    }

    // Sort by probability
    return results.sort((a, b) => b.probability - a.probability).slice(0, 5);
  }
}

// =============================================================================
// LAB RECOMMENDER
// =============================================================================

interface LabRule {
  code: string;
  name: string;
  category: string;
  conditions: string[];
  symptoms: string[];
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  rationale: string;
}

const LAB_RULES: LabRule[] = [
  { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', conditions: ['anemia', 'infection', 'bleeding'], symptoms: ['fatigue', 'fever', 'bruising', 'pallor'], priority: 'ROUTINE', rationale: 'Evaluate blood cell counts, detect infection or anemia' },
  { code: 'BMP', name: 'Basic Metabolic Panel', category: 'Chemistry', conditions: ['diabetes', 'kidney disease', 'dehydration'], symptoms: ['weakness', 'confusion', 'nausea'], priority: 'ROUTINE', rationale: 'Assess electrolytes and kidney function' },
  { code: 'CMP', name: 'Comprehensive Metabolic Panel', category: 'Chemistry', conditions: ['liver disease', 'malnutrition'], symptoms: ['jaundice', 'abdominal pain', 'fatigue'], priority: 'ROUTINE', rationale: 'Complete metabolic assessment including liver function' },
  { code: 'TROPONIN', name: 'Troponin I/T', category: 'Cardiac', conditions: ['chest pain', 'ACS'], symptoms: ['chest pain', 'dyspnea', 'diaphoresis'], priority: 'STAT', rationale: 'Detect myocardial injury' },
  { code: 'BNP', name: 'BNP/NT-proBNP', category: 'Cardiac', conditions: ['heart failure', 'dyspnea'], symptoms: ['dyspnea', 'edema', 'orthopnea'], priority: 'URGENT', rationale: 'Assess for heart failure' },
  { code: 'PT_INR', name: 'PT/INR', category: 'Coagulation', conditions: ['anticoagulation', 'liver disease', 'bleeding'], symptoms: ['bruising', 'bleeding'], priority: 'ROUTINE', rationale: 'Assess coagulation status' },
  { code: 'D_DIMER', name: 'D-Dimer', category: 'Coagulation', conditions: ['PE', 'DVT'], symptoms: ['dyspnea', 'leg swelling', 'chest pain'], priority: 'URGENT', rationale: 'Screen for thromboembolic disease' },
  { code: 'PROCALCITONIN', name: 'Procalcitonin', category: 'Infection', conditions: ['sepsis', 'pneumonia'], symptoms: ['fever', 'chills', 'hypotension'], priority: 'URGENT', rationale: 'Differentiate bacterial from viral infection' },
  { code: 'LACTATE', name: 'Lactate', category: 'Critical Care', conditions: ['sepsis', 'shock'], symptoms: ['hypotension', 'tachycardia', 'altered mental status'], priority: 'STAT', rationale: 'Assess tissue perfusion, sepsis severity' },
  { code: 'BLOOD_CULTURE', name: 'Blood Culture x2', category: 'Microbiology', conditions: ['sepsis', 'endocarditis', 'fever unknown'], symptoms: ['fever', 'chills', 'rigors'], priority: 'STAT', rationale: 'Identify bloodstream infection' },
  { code: 'TSH', name: 'TSH', category: 'Endocrine', conditions: ['hypothyroid', 'hyperthyroid'], symptoms: ['fatigue', 'weight changes', 'palpitations', 'heat/cold intolerance'], priority: 'ROUTINE', rationale: 'Screen thyroid function' },
  { code: 'LIPASE', name: 'Lipase', category: 'GI', conditions: ['pancreatitis'], symptoms: ['epigastric pain', 'nausea', 'vomiting'], priority: 'URGENT', rationale: 'Diagnose pancreatitis' },
  { code: 'LFT', name: 'Liver Function Tests', category: 'GI', conditions: ['liver disease', 'hepatitis'], symptoms: ['jaundice', 'RUQ pain', 'fatigue'], priority: 'ROUTINE', rationale: 'Assess liver function and damage' },
  { code: 'UA', name: 'Urinalysis', category: 'Urology', conditions: ['UTI', 'kidney stone'], symptoms: ['dysuria', 'frequency', 'hematuria', 'flank pain'], priority: 'ROUTINE', rationale: 'Evaluate for infection or hematuria' },
  { code: 'HCG', name: 'Beta-hCG', category: 'OB/GYN', conditions: ['pregnancy'], symptoms: ['amenorrhea', 'nausea', 'abdominal pain'], priority: 'URGENT', rationale: 'Pregnancy test - required before imaging in reproductive-age females' },
];

export class LabRecommender {
  recommend(assessment: {
    chiefComplaint: string;
    symptoms: string[];
    conditions?: string[];
    suspectedDiagnoses?: string[];
  }): LabRecommendation[] {
    const recommendations: LabRecommendation[] = [];
    const addedCodes = new Set<string>();

    const allTerms = [
      assessment.chiefComplaint.toLowerCase(),
      ...assessment.symptoms.map((s) => s.toLowerCase()),
      ...(assessment.conditions || []).map((c) => c.toLowerCase()),
      ...(assessment.suspectedDiagnoses || []).map((d) => d.toLowerCase()),
    ].join(' ');

    for (const rule of LAB_RULES) {
      const conditionMatch = rule.conditions.some((c) => allTerms.includes(c.toLowerCase()));
      const symptomMatch = rule.symptoms.some((s) => allTerms.includes(s.toLowerCase()));

      if ((conditionMatch || symptomMatch) && !addedCodes.has(rule.code)) {
        addedCodes.add(rule.code);
        recommendations.push({
          code: rule.code,
          name: rule.name,
          category: rule.category,
          priority: rule.priority,
          rationale: rule.rationale,
          conditions: rule.conditions.filter((c) => allTerms.includes(c.toLowerCase())),
        });
      }
    }

    const priorityOrder = { STAT: 0, URGENT: 1, ROUTINE: 2 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }
}

// =============================================================================
// DRUG INTERACTION CHECKER
// =============================================================================

interface InteractionRule {
  drug1: string[];
  drug2: string[];
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  mechanism: string;
  management: string;
}

const INTERACTION_RULES: InteractionRule[] = [
  {
    drug1: ['warfarin', 'coumadin'],
    drug2: ['aspirin', 'ibuprofen', 'naproxen', 'nsaid'],
    severity: 'major',
    description: 'Increased risk of bleeding',
    mechanism: 'Additive anticoagulant/antiplatelet effects and NSAID-induced GI erosion',
    management: 'Avoid combination if possible. If necessary, use lowest dose for shortest duration. Monitor for bleeding.',
  },
  {
    drug1: ['ssri', 'fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram'],
    drug2: ['maoi', 'phenelzine', 'tranylcypromine', 'selegiline'],
    severity: 'contraindicated',
    description: 'Risk of serotonin syndrome - potentially fatal',
    mechanism: 'Excessive serotonergic activity',
    management: 'Do NOT combine. Requires 14-day washout between agents.',
  },
  {
    drug1: ['metformin'],
    drug2: ['contrast', 'iodinated contrast'],
    severity: 'moderate',
    description: 'Risk of lactic acidosis with contrast-induced nephropathy',
    mechanism: 'Contrast may cause AKI, impairing metformin clearance',
    management: 'Hold metformin 48 hours before and after contrast. Check renal function before restarting.',
  },
  {
    drug1: ['ace inhibitor', 'lisinopril', 'enalapril', 'ramipril'],
    drug2: ['potassium', 'spironolactone', 'k-dur'],
    severity: 'moderate',
    description: 'Risk of hyperkalemia',
    mechanism: 'Both agents increase serum potassium',
    management: 'Monitor potassium levels closely. Consider dose reduction or alternative agents.',
  },
  {
    drug1: ['simvastatin', 'lovastatin', 'atorvastatin'],
    drug2: ['clarithromycin', 'erythromycin', 'ketoconazole', 'itraconazole'],
    severity: 'major',
    description: 'Increased risk of myopathy and rhabdomyolysis',
    mechanism: 'CYP3A4 inhibition increases statin levels',
    management: 'Use alternative statin (pravastatin, rosuvastatin) or alternative antibiotic/antifungal.',
  },
  {
    drug1: ['digoxin'],
    drug2: ['amiodarone'],
    severity: 'major',
    description: 'Increased digoxin levels and toxicity risk',
    mechanism: 'Amiodarone inhibits P-glycoprotein and reduces digoxin clearance',
    management: 'Reduce digoxin dose by 50% when starting amiodarone. Monitor levels and for toxicity.',
  },
  {
    drug1: ['fluoroquinolone', 'ciprofloxacin', 'levofloxacin'],
    drug2: ['nsaid', 'ibuprofen', 'naproxen'],
    severity: 'moderate',
    description: 'Increased risk of CNS stimulation and seizures',
    mechanism: 'Both agents lower seizure threshold',
    management: 'Use with caution, especially in patients with seizure history. Consider alternative antibiotic.',
  },
  {
    drug1: ['methotrexate'],
    drug2: ['nsaid', 'ibuprofen', 'naproxen', 'trimethoprim'],
    severity: 'major',
    description: 'Increased methotrexate toxicity',
    mechanism: 'Reduced renal clearance of methotrexate',
    management: 'Avoid NSAIDs with high-dose MTX. With low-dose MTX, use with caution and monitor.',
  },
  {
    drug1: ['lithium'],
    drug2: ['nsaid', 'ace inhibitor', 'diuretic', 'thiazide'],
    severity: 'major',
    description: 'Increased lithium levels and toxicity risk',
    mechanism: 'Reduced lithium clearance',
    management: 'Monitor lithium levels more frequently. May need dose reduction.',
  },
  {
    drug1: ['clopidogrel', 'plavix'],
    drug2: ['omeprazole', 'esomeprazole'],
    severity: 'moderate',
    description: 'Reduced antiplatelet effect of clopidogrel',
    mechanism: 'CYP2C19 inhibition reduces conversion to active metabolite',
    management: 'Use pantoprazole or H2 blocker instead if PPI needed.',
  },
];

export class DrugInteractionChecker {
  check(medications: string[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    const normalizedMeds = medications.map((m) => m.toLowerCase());

    for (let i = 0; i < normalizedMeds.length; i++) {
      for (let j = i + 1; j < normalizedMeds.length; j++) {
        const med1 = normalizedMeds[i];
        const med2 = normalizedMeds[j];

        for (const rule of INTERACTION_RULES) {
          const match1to2 =
            rule.drug1.some((d) => med1.includes(d) || d.includes(med1)) &&
            rule.drug2.some((d) => med2.includes(d) || d.includes(med2));

          const match2to1 =
            rule.drug1.some((d) => med2.includes(d) || d.includes(med2)) &&
            rule.drug2.some((d) => med1.includes(d) || d.includes(med1));

          if (match1to2 || match2to1) {
            interactions.push({
              drug1: medications[i],
              drug2: medications[j],
              severity: rule.severity,
              description: rule.description,
              mechanism: rule.mechanism,
              management: rule.management,
            });
          }
        }
      }
    }

    const severityOrder = { contraindicated: 0, major: 1, moderate: 2, minor: 3 };
    return interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
}

// =============================================================================
// EXPORT SINGLETON INSTANCES
// =============================================================================

export const redFlagEvaluator = new RedFlagEvaluator();
export const differentialDiagnosisEngine = new DifferentialDiagnosisEngine();
export const labRecommender = new LabRecommender();
export const drugInteractionChecker = new DrugInteractionChecker();
