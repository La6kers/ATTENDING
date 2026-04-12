// ============================================================
// ATTENDING AI — Clinical Prevalence Tables
// Pre-test probabilities for 14 chief complaint categories
// Adjusted by age and gender using continuous interpolation
//
// Base rates derived from primary care literature:
// - CDC NAMCS (National Ambulatory Medical Care Survey)
// - Symptom-to-Diagnosis (Stern, Cifu, Altkorn)
// - UpToDate prevalence estimates for primary care setting
// ============================================================

// ============================================================
// Types
// ============================================================

export interface DiagnosisPrevalence {
  diagnosis: string;
  /** Base probability in primary care for this chief complaint (0-1) */
  baseRate: number;
  /** Age-range multipliers — interpolated, not hard cutoffs */
  ageModifiers: { range: [number, number]; multiplier: number }[];
  /** Gender multipliers (1.0 = no change) */
  genderModifier: { male: number; female: number };
}

export interface ComplaintPrevalence {
  complaint: string;
  triggerPatterns: RegExp[];
  diagnoses: DiagnosisPrevalence[];
}

// ============================================================
// Age Interpolation
// ============================================================

function interpolateAgeMultiplier(
  age: number,
  modifiers: { range: [number, number]; multiplier: number }[]
): number {
  if (modifiers.length === 0) return 1.0;

  // Find the best matching range
  let bestMultiplier = 1.0;
  let bestDistance = Infinity;

  for (const mod of modifiers) {
    const [lo, hi] = mod.range;
    if (age >= lo && age <= hi) {
      // Directly in range
      return mod.multiplier;
    }
    // Distance from nearest edge
    const dist = age < lo ? lo - age : age - hi;
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMultiplier = mod.multiplier;
    }
  }

  // Smooth interpolation: blend toward 1.0 as distance increases
  // Within 10 years of a range edge, partially apply the modifier
  if (bestDistance <= 10) {
    const blend = 1 - bestDistance / 10;
    return 1.0 + (bestMultiplier - 1.0) * blend;
  }

  return 1.0;
}

// ============================================================
// Prevalence Data — 14 Chief Complaint Categories
// ============================================================

const PREVALENCE_DATA: ComplaintPrevalence[] = [
  // ================================================================
  // KNEE PAIN
  // ================================================================
  {
    complaint: 'knee pain',
    triggerPatterns: [/knee/i],
    diagnoses: [
      {
        diagnosis: 'Osteoarthritis',
        baseRate: 0.30,
        ageModifiers: [
          { range: [0, 30], multiplier: 0.1 },
          { range: [31, 50], multiplier: 0.5 },
          { range: [51, 65], multiplier: 1.5 },
          { range: [66, 100], multiplier: 2.0 },
        ],
        genderModifier: { male: 0.9, female: 1.2 },
      },
      {
        diagnosis: 'Meniscal Tear',
        baseRate: 0.12,
        ageModifiers: [
          { range: [20, 50], multiplier: 1.3 },
          { range: [51, 70], multiplier: 1.0 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Patellofemoral Pain Syndrome',
        baseRate: 0.15,
        ageModifiers: [
          { range: [12, 30], multiplier: 2.0 },
          { range: [31, 45], multiplier: 0.8 },
          { range: [46, 100], multiplier: 0.3 },
        ],
        genderModifier: { male: 0.7, female: 1.5 },
      },
      {
        diagnosis: 'ACL Tear',
        baseRate: 0.05,
        ageModifiers: [
          { range: [15, 35], multiplier: 2.0 },
          { range: [36, 55], multiplier: 0.8 },
          { range: [56, 100], multiplier: 0.3 },
        ],
        genderModifier: { male: 0.8, female: 1.3 },
      },
      {
        diagnosis: 'MCL Sprain',
        baseRate: 0.06,
        ageModifiers: [
          { range: [15, 40], multiplier: 1.5 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Gout',
        baseRate: 0.05,
        ageModifiers: [
          { range: [40, 70], multiplier: 1.8 },
          { range: [0, 30], multiplier: 0.2 },
        ],
        genderModifier: { male: 3.0, female: 0.4 },
      },
      {
        diagnosis: 'IT Band Syndrome',
        baseRate: 0.04,
        ageModifiers: [
          { range: [18, 45], multiplier: 1.5 },
        ],
        genderModifier: { male: 0.9, female: 1.2 },
      },
      {
        diagnosis: 'Baker\'s Cyst',
        baseRate: 0.04,
        ageModifiers: [
          { range: [40, 70], multiplier: 1.5 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Medial Meniscus Tear',
        baseRate: 0.08,
        ageModifiers: [
          { range: [20, 55], multiplier: 1.3 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Lateral Meniscus Tear',
        baseRate: 0.04,
        ageModifiers: [
          { range: [15, 40], multiplier: 1.4 },
        ],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Fracture',
        baseRate: 0.03,
        ageModifiers: [
          { range: [65, 100], multiplier: 2.0 },
          { range: [10, 25], multiplier: 1.3 },
        ],
        genderModifier: { male: 1.0, female: 1.2 },
      },
      {
        diagnosis: 'Septic Arthritis',
        baseRate: 0.01,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // CHEST PAIN
  // ================================================================
  {
    complaint: 'chest pain',
    triggerPatterns: [/chest\s*(pain|pressure|tightness|heaviness|discomfort)/i],
    diagnoses: [
      {
        diagnosis: 'Musculoskeletal pain',
        baseRate: 0.36,
        ageModifiers: [
          { range: [18, 40], multiplier: 1.3 },
          { range: [60, 100], multiplier: 0.7 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'GERD',
        baseRate: 0.13,
        ageModifiers: [
          { range: [30, 60], multiplier: 1.2 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Costochondritis',
        baseRate: 0.13,
        ageModifiers: [
          { range: [20, 45], multiplier: 1.3 },
        ],
        genderModifier: { male: 0.8, female: 1.3 },
      },
      {
        diagnosis: 'Acute Coronary Syndrome',
        baseRate: 0.08,
        ageModifiers: [
          { range: [0, 35], multiplier: 0.1 },
          { range: [36, 55], multiplier: 0.8 },
          { range: [56, 70], multiplier: 2.0 },
          { range: [71, 100], multiplier: 2.5 },
        ],
        genderModifier: { male: 1.5, female: 0.8 },
      },
      {
        diagnosis: 'Anxiety',
        baseRate: 0.08,
        ageModifiers: [
          { range: [18, 45], multiplier: 1.5 },
          { range: [60, 100], multiplier: 0.5 },
        ],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Pneumonia',
        baseRate: 0.05,
        ageModifiers: [
          { range: [65, 100], multiplier: 1.8 },
        ],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Pulmonary Embolism',
        baseRate: 0.02,
        ageModifiers: [
          { range: [40, 80], multiplier: 1.5 },
        ],
        genderModifier: { male: 0.9, female: 1.2 },
      },
      {
        diagnosis: 'Pericarditis',
        baseRate: 0.02,
        ageModifiers: [
          { range: [20, 50], multiplier: 1.5 },
        ],
        genderModifier: { male: 1.3, female: 0.8 },
      },
      {
        diagnosis: 'Aortic Dissection',
        baseRate: 0.005,
        ageModifiers: [
          { range: [50, 80], multiplier: 2.0 },
        ],
        genderModifier: { male: 1.5, female: 0.7 },
      },
    ],
  },

  // ================================================================
  // HEADACHE
  // ================================================================
  {
    complaint: 'headache',
    triggerPatterns: [/headache|head\s*pain|migraine|cephalgia/i],
    diagnoses: [
      {
        diagnosis: 'Tension headache',
        baseRate: 0.40,
        ageModifiers: [
          { range: [20, 50], multiplier: 1.2 },
        ],
        genderModifier: { male: 0.8, female: 1.2 },
      },
      {
        diagnosis: 'Migraine',
        baseRate: 0.25,
        ageModifiers: [
          { range: [15, 50], multiplier: 1.3 },
          { range: [55, 100], multiplier: 0.5 },
        ],
        genderModifier: { male: 0.5, female: 1.5 },
      },
      {
        diagnosis: 'Sinusitis',
        baseRate: 0.10,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Medication overuse headache',
        baseRate: 0.05,
        ageModifiers: [
          { range: [30, 60], multiplier: 1.3 },
        ],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Cluster headache',
        baseRate: 0.02,
        ageModifiers: [
          { range: [20, 50], multiplier: 1.5 },
        ],
        genderModifier: { male: 3.0, female: 0.4 },
      },
      {
        diagnosis: 'Temporal arteritis',
        baseRate: 0.01,
        ageModifiers: [
          { range: [50, 100], multiplier: 4.0 },
          { range: [0, 45], multiplier: 0.05 },
        ],
        genderModifier: { male: 0.5, female: 1.5 },
      },
      {
        diagnosis: 'Subarachnoid hemorrhage',
        baseRate: 0.01,
        ageModifiers: [
          { range: [40, 65], multiplier: 1.5 },
        ],
        genderModifier: { male: 0.8, female: 1.2 },
      },
      {
        diagnosis: 'Meningitis',
        baseRate: 0.005,
        ageModifiers: [
          { range: [0, 5], multiplier: 3.0 },
          { range: [15, 25], multiplier: 1.5 },
          { range: [65, 100], multiplier: 1.5 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Brain tumor',
        baseRate: 0.003,
        ageModifiers: [
          { range: [50, 80], multiplier: 2.0 },
        ],
        genderModifier: { male: 1.1, female: 0.9 },
      },
    ],
  },

  // ================================================================
  // ABDOMINAL PAIN
  // ================================================================
  {
    complaint: 'abdominal pain',
    triggerPatterns: [/abdomen|abdominal|stomach\s*pain|belly\s*pain|tummy/i],
    diagnoses: [
      {
        diagnosis: 'Gastroenteritis',
        baseRate: 0.20,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'GERD',
        baseRate: 0.12,
        ageModifiers: [{ range: [30, 70], multiplier: 1.3 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Appendicitis',
        baseRate: 0.08,
        ageModifiers: [
          { range: [10, 30], multiplier: 1.5 },
          { range: [60, 100], multiplier: 0.5 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Cholecystitis',
        baseRate: 0.06,
        ageModifiers: [{ range: [30, 60], multiplier: 1.3 }],
        genderModifier: { male: 0.5, female: 1.8 },
      },
      {
        diagnosis: 'Peptic Ulcer',
        baseRate: 0.05,
        ageModifiers: [{ range: [40, 70], multiplier: 1.4 }],
        genderModifier: { male: 1.3, female: 0.8 },
      },
      {
        diagnosis: 'Diverticulitis',
        baseRate: 0.05,
        ageModifiers: [
          { range: [0, 40], multiplier: 0.2 },
          { range: [50, 80], multiplier: 2.0 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Pancreatitis',
        baseRate: 0.03,
        ageModifiers: [{ range: [35, 65], multiplier: 1.3 }],
        genderModifier: { male: 1.3, female: 0.8 },
      },
      {
        diagnosis: 'Bowel obstruction',
        baseRate: 0.02,
        ageModifiers: [{ range: [60, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Ectopic Pregnancy',
        baseRate: 0.02,
        ageModifiers: [{ range: [18, 45], multiplier: 1.5 }],
        genderModifier: { male: 0.0, female: 2.0 },
      },
      {
        diagnosis: 'Inflammatory Bowel Disease',
        baseRate: 0.02,
        ageModifiers: [{ range: [15, 35], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // SHORTNESS OF BREATH
  // ================================================================
  {
    complaint: 'shortness of breath',
    triggerPatterns: [/shortness\s*of\s*breath|can'?t\s*breathe|difficulty\s*breathing|dyspnea|breathless|SOB/i],
    diagnoses: [
      {
        diagnosis: 'Asthma',
        baseRate: 0.15,
        ageModifiers: [{ range: [10, 40], multiplier: 1.3 }],
        genderModifier: { male: 0.8, female: 1.2 },
      },
      {
        diagnosis: 'COPD exacerbation',
        baseRate: 0.15,
        ageModifiers: [
          { range: [0, 40], multiplier: 0.1 },
          { range: [50, 80], multiplier: 2.0 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Heart Failure',
        baseRate: 0.12,
        ageModifiers: [
          { range: [0, 40], multiplier: 0.1 },
          { range: [60, 100], multiplier: 2.5 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Pneumonia',
        baseRate: 0.10,
        ageModifiers: [{ range: [65, 100], multiplier: 1.8 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Anxiety',
        baseRate: 0.10,
        ageModifiers: [{ range: [18, 45], multiplier: 1.5 }],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Pulmonary Embolism',
        baseRate: 0.04,
        ageModifiers: [{ range: [40, 80], multiplier: 1.5 }],
        genderModifier: { male: 0.9, female: 1.2 },
      },
      {
        diagnosis: 'Anemia',
        baseRate: 0.05,
        ageModifiers: [],
        genderModifier: { male: 0.6, female: 1.5 },
      },
      {
        diagnosis: 'Pneumothorax',
        baseRate: 0.01,
        ageModifiers: [{ range: [18, 35], multiplier: 2.0 }],
        genderModifier: { male: 3.0, female: 0.4 },
      },
    ],
  },

  // ================================================================
  // BACK PAIN
  // ================================================================
  {
    complaint: 'back pain',
    triggerPatterns: [/back\s*pain|lower\s*back|lumbar|lumbago|sciatica/i],
    diagnoses: [
      {
        diagnosis: 'Musculoskeletal strain',
        baseRate: 0.40,
        ageModifiers: [{ range: [20, 50], multiplier: 1.2 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Herniated Disc',
        baseRate: 0.12,
        ageModifiers: [{ range: [30, 55], multiplier: 1.4 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Spinal Stenosis',
        baseRate: 0.08,
        ageModifiers: [
          { range: [0, 45], multiplier: 0.2 },
          { range: [55, 80], multiplier: 2.0 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Compression fracture',
        baseRate: 0.04,
        ageModifiers: [{ range: [65, 100], multiplier: 3.0 }],
        genderModifier: { male: 0.5, female: 1.8 },
      },
      {
        diagnosis: 'Kidney Stone',
        baseRate: 0.05,
        ageModifiers: [{ range: [30, 60], multiplier: 1.3 }],
        genderModifier: { male: 1.5, female: 0.7 },
      },
      {
        diagnosis: 'Pyelonephritis',
        baseRate: 0.03,
        ageModifiers: [],
        genderModifier: { male: 0.5, female: 1.8 },
      },
      {
        diagnosis: 'Cauda Equina Syndrome',
        baseRate: 0.002,
        ageModifiers: [{ range: [30, 60], multiplier: 1.3 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Aortic Aneurysm',
        baseRate: 0.003,
        ageModifiers: [{ range: [60, 100], multiplier: 3.0 }],
        genderModifier: { male: 3.0, female: 0.4 },
      },
    ],
  },

  // ================================================================
  // SORE THROAT
  // ================================================================
  {
    complaint: 'sore throat',
    triggerPatterns: [/sore\s*throat|throat\s*pain|pharyngitis|tonsilitis|odynophagia/i],
    diagnoses: [
      {
        diagnosis: 'Viral Pharyngitis',
        baseRate: 0.50,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Strep Pharyngitis',
        baseRate: 0.20,
        ageModifiers: [
          { range: [5, 15], multiplier: 1.8 },
          { range: [16, 40], multiplier: 1.0 },
          { range: [45, 100], multiplier: 0.5 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Infectious Mononucleosis',
        baseRate: 0.05,
        ageModifiers: [{ range: [15, 25], multiplier: 3.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Peritonsillar Abscess',
        baseRate: 0.02,
        ageModifiers: [{ range: [15, 40], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'GERD',
        baseRate: 0.05,
        ageModifiers: [{ range: [30, 60], multiplier: 1.3 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Epiglottitis',
        baseRate: 0.002,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // COUGH
  // ================================================================
  {
    complaint: 'cough',
    triggerPatterns: [/cough|coughing/i],
    diagnoses: [
      {
        diagnosis: 'Viral URI',
        baseRate: 0.40,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Bronchitis',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Asthma',
        baseRate: 0.10,
        ageModifiers: [{ range: [10, 40], multiplier: 1.3 }],
        genderModifier: { male: 0.8, female: 1.2 },
      },
      {
        diagnosis: 'Pneumonia',
        baseRate: 0.08,
        ageModifiers: [{ range: [65, 100], multiplier: 1.8 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'COPD exacerbation',
        baseRate: 0.05,
        ageModifiers: [{ range: [50, 80], multiplier: 2.0 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'ACE inhibitor cough',
        baseRate: 0.03,
        ageModifiers: [{ range: [40, 80], multiplier: 1.3 }],
        genderModifier: { male: 0.8, female: 1.2 },
      },
      {
        diagnosis: 'Pertussis',
        baseRate: 0.02,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Pulmonary Embolism',
        baseRate: 0.01,
        ageModifiers: [{ range: [40, 80], multiplier: 1.5 }],
        genderModifier: { male: 0.9, female: 1.2 },
      },
    ],
  },

  // ================================================================
  // URINARY SYMPTOMS
  // ================================================================
  {
    complaint: 'urinary',
    triggerPatterns: [/urin|burn.*pee|painful.*urinat|uti|bladder|dysuria|frequency|urgency.*urin/i],
    diagnoses: [
      {
        diagnosis: 'UTI',
        baseRate: 0.45,
        ageModifiers: [],
        genderModifier: { male: 0.3, female: 1.8 },
      },
      {
        diagnosis: 'Pyelonephritis',
        baseRate: 0.08,
        ageModifiers: [],
        genderModifier: { male: 0.5, female: 1.5 },
      },
      {
        diagnosis: 'Kidney Stone',
        baseRate: 0.08,
        ageModifiers: [{ range: [30, 60], multiplier: 1.3 }],
        genderModifier: { male: 1.5, female: 0.7 },
      },
      {
        diagnosis: 'Prostatitis',
        baseRate: 0.05,
        ageModifiers: [{ range: [30, 60], multiplier: 1.3 }],
        genderModifier: { male: 2.0, female: 0.0 },
      },
      {
        diagnosis: 'Interstitial Cystitis',
        baseRate: 0.03,
        ageModifiers: [{ range: [30, 60], multiplier: 1.3 }],
        genderModifier: { male: 0.3, female: 1.8 },
      },
      {
        diagnosis: 'Urethritis',
        baseRate: 0.04,
        ageModifiers: [{ range: [18, 35], multiplier: 1.5 }],
        genderModifier: { male: 1.3, female: 0.8 },
      },
    ],
  },

  // ================================================================
  // DIZZINESS
  // ================================================================
  {
    complaint: 'dizziness',
    triggerPatterns: [/dizz|vertigo|lightheaded|room\s*spinning/i],
    diagnoses: [
      {
        diagnosis: 'BPPV',
        baseRate: 0.25,
        ageModifiers: [{ range: [50, 80], multiplier: 1.5 }],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Vestibular neuritis',
        baseRate: 0.10,
        ageModifiers: [{ range: [30, 60], multiplier: 1.2 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Orthostatic hypotension',
        baseRate: 0.12,
        ageModifiers: [{ range: [65, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Anxiety',
        baseRate: 0.10,
        ageModifiers: [{ range: [18, 45], multiplier: 1.5 }],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Cardiac Arrhythmia',
        baseRate: 0.05,
        ageModifiers: [{ range: [60, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Stroke',
        baseRate: 0.03,
        ageModifiers: [{ range: [55, 100], multiplier: 2.5 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Anemia',
        baseRate: 0.05,
        ageModifiers: [],
        genderModifier: { male: 0.6, female: 1.5 },
      },
      {
        diagnosis: 'Medication side effect',
        baseRate: 0.08,
        ageModifiers: [{ range: [60, 100], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // FEVER
  // ================================================================
  {
    complaint: 'fever',
    triggerPatterns: [/fever|febrile|chills|temperature/i],
    diagnoses: [
      {
        diagnosis: 'Viral infection',
        baseRate: 0.45,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'UTI',
        baseRate: 0.10,
        ageModifiers: [],
        genderModifier: { male: 0.4, female: 1.6 },
      },
      {
        diagnosis: 'Pneumonia',
        baseRate: 0.10,
        ageModifiers: [{ range: [65, 100], multiplier: 1.8 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Bacterial infection',
        baseRate: 0.08,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Sepsis',
        baseRate: 0.02,
        ageModifiers: [{ range: [65, 100], multiplier: 2.5 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Meningitis',
        baseRate: 0.005,
        ageModifiers: [
          { range: [0, 5], multiplier: 3.0 },
          { range: [15, 25], multiplier: 1.5 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Endocarditis',
        baseRate: 0.005,
        ageModifiers: [{ range: [40, 70], multiplier: 1.5 }],
        genderModifier: { male: 1.3, female: 0.8 },
      },
    ],
  },

  // ================================================================
  // WEAKNESS
  // ================================================================
  {
    complaint: 'weakness',
    triggerPatterns: [/weakness|weak|fatigue|tired|exhausted|no\s*energy/i],
    diagnoses: [
      {
        diagnosis: 'Depression',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Anemia',
        baseRate: 0.10,
        ageModifiers: [],
        genderModifier: { male: 0.6, female: 1.5 },
      },
      {
        diagnosis: 'Hypothyroidism',
        baseRate: 0.08,
        ageModifiers: [{ range: [40, 70], multiplier: 1.3 }],
        genderModifier: { male: 0.3, female: 1.8 },
      },
      {
        diagnosis: 'Electrolyte abnormality',
        baseRate: 0.05,
        ageModifiers: [{ range: [65, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Stroke',
        baseRate: 0.03,
        ageModifiers: [{ range: [55, 100], multiplier: 2.5 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Malignancy',
        baseRate: 0.02,
        ageModifiers: [{ range: [50, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // DEPRESSION / ANXIETY
  // ================================================================
  {
    complaint: 'depression',
    triggerPatterns: [/depress|sad|hopeless|mood|down|mental\s*health/i],
    diagnoses: [
      {
        diagnosis: 'Major Depressive Disorder',
        baseRate: 0.40,
        ageModifiers: [],
        genderModifier: { male: 0.7, female: 1.3 },
      },
      {
        diagnosis: 'Adjustment Disorder',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Generalized Anxiety Disorder',
        baseRate: 0.12,
        ageModifiers: [{ range: [18, 45], multiplier: 1.3 }],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Bipolar Disorder',
        baseRate: 0.05,
        ageModifiers: [{ range: [18, 35], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Hypothyroidism',
        baseRate: 0.05,
        ageModifiers: [{ range: [40, 70], multiplier: 1.3 }],
        genderModifier: { male: 0.3, female: 1.8 },
      },
      {
        diagnosis: 'Substance Use Disorder',
        baseRate: 0.05,
        ageModifiers: [{ range: [18, 45], multiplier: 1.3 }],
        genderModifier: { male: 1.5, female: 0.7 },
      },
    ],
  },

  {
    complaint: 'anxiety',
    triggerPatterns: [/anxiety|anxious|panic|worried|nervous/i],
    diagnoses: [
      {
        diagnosis: 'Generalized Anxiety Disorder',
        baseRate: 0.35,
        ageModifiers: [{ range: [18, 45], multiplier: 1.3 }],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Panic Disorder',
        baseRate: 0.15,
        ageModifiers: [{ range: [18, 40], multiplier: 1.5 }],
        genderModifier: { male: 0.6, female: 1.5 },
      },
      {
        diagnosis: 'Major Depressive Disorder',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 0.7, female: 1.3 },
      },
      {
        diagnosis: 'Hyperthyroidism',
        baseRate: 0.04,
        ageModifiers: [{ range: [20, 50], multiplier: 1.3 }],
        genderModifier: { male: 0.3, female: 1.8 },
      },
      {
        diagnosis: 'Cardiac Arrhythmia',
        baseRate: 0.03,
        ageModifiers: [{ range: [50, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Substance Use Disorder',
        baseRate: 0.05,
        ageModifiers: [{ range: [18, 45], multiplier: 1.3 }],
        genderModifier: { male: 1.5, female: 0.7 },
      },
    ],
  },
];

// ============================================================
// Public API
// ============================================================

/**
 * Get pre-test probabilities for all diagnoses matching a chief complaint.
 * Probabilities are adjusted by age and gender using continuous interpolation.
 *
 * @returns Map<diagnosis, probability> where probability is 0-1
 */
export function getPreTestProbabilities(
  chiefComplaint: string,
  age: number,
  gender: string
): Map<string, number> {
  const result = new Map<string, number>();
  const cc = chiefComplaint.toLowerCase();

  // Find matching complaint category
  const matched = PREVALENCE_DATA.find(cp =>
    cp.triggerPatterns.some(p => p.test(cc))
  );

  if (!matched) return result;

  const genderKey = gender?.toLowerCase() === 'female' ? 'female' : 'male';

  for (const dx of matched.diagnoses) {
    let prob = dx.baseRate;

    // Apply age modifier (interpolated)
    const ageMul = interpolateAgeMultiplier(age, dx.ageModifiers);
    prob *= ageMul;

    // Apply gender modifier
    const genderMul = dx.genderModifier[genderKey];
    prob *= genderMul;

    // Clamp to valid probability range
    prob = Math.max(0.001, Math.min(prob, 0.95));

    result.set(dx.diagnosis, prob);
  }

  return result;
}

/**
 * Check if prevalence data exists for a given chief complaint
 */
export function hasPrevalenceData(chiefComplaint: string): boolean {
  const cc = chiefComplaint.toLowerCase();
  return PREVALENCE_DATA.some(cp =>
    cp.triggerPatterns.some(p => p.test(cc))
  );
}
