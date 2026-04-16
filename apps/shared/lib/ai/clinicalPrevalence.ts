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

import { normalizeSymptomText } from './symptomSynonyms';

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
  // TRAUMA / FALL / INJURY
  // Routed BEFORE specific body-part patterns so a patient who fell and
  // has hip pain lands on the trauma category (splenic injury, fracture,
  // hemorrhage) rather than the generic hip-pain category.
  // ================================================================
  {
    complaint: 'trauma',
    triggerPatterns: [
      /\b(fell|fall|falling|fallen|slipped|tripped)\b(?!\s*(asleep|ill|sick|behind|apart|short|in\s*love|into\s*place))(?!.*(again|lot|multiple|frequent|keep|balance|unsteady|three|four|five|\d+\s*time))/i,
      /motor\s*vehicle|\bmva\b|car\s*accident|struck|hit by/i,
      /\btrauma|injur(ed|y)|blunt|penetrating/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Fracture',
        baseRate: 0.30,
        ageModifiers: [
          { range: [0, 12], multiplier: 0.9 },
          { range: [13, 40], multiplier: 0.7 },
          { range: [65, 100], multiplier: 2.0 },
        ],
        genderModifier: { male: 1.0, female: 1.1 },
      },
      {
        diagnosis: 'Hip Fracture',
        baseRate: 0.18,
        ageModifiers: [
          { range: [0, 40], multiplier: 0.05 },
          { range: [65, 80], multiplier: 3.0 },
          { range: [81, 100], multiplier: 5.0 },
        ],
        genderModifier: { male: 0.6, female: 1.6 },
      },
      {
        diagnosis: 'Traumatic Brain Injury',
        baseRate: 0.08,
        ageModifiers: [{ range: [65, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.3, female: 0.9 },
      },
      {
        diagnosis: 'Splenic Injury',
        baseRate: 0.06,
        ageModifiers: [],
        genderModifier: { male: 1.4, female: 0.8 },
      },
      {
        diagnosis: 'Liver Laceration',
        baseRate: 0.04,
        ageModifiers: [],
        genderModifier: { male: 1.3, female: 0.9 },
      },
      {
        diagnosis: 'Rib Fracture',
        baseRate: 0.10,
        ageModifiers: [{ range: [65, 100], multiplier: 1.5 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Pneumothorax',
        baseRate: 0.03,
        ageModifiers: [],
        genderModifier: { male: 1.3, female: 0.8 },
      },
      {
        diagnosis: 'Soft Tissue Injury',
        baseRate: 0.20,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Concussion',
        baseRate: 0.08,
        ageModifiers: [{ range: [0, 30], multiplier: 1.5 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Internal Hemorrhage',
        baseRate: 0.04,
        ageModifiers: [{ range: [65, 100], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // HIP PAIN
  // ================================================================
  {
    complaint: 'hip pain',
    triggerPatterns: [/\bhip\b/i],
    diagnoses: [
      {
        diagnosis: 'Hip Fracture',
        baseRate: 0.20,
        ageModifiers: [
          { range: [0, 40], multiplier: 0.02 },
          { range: [65, 80], multiplier: 3.0 },
          { range: [81, 100], multiplier: 5.0 },
        ],
        genderModifier: { male: 0.7, female: 1.5 },
      },
      {
        diagnosis: 'Hip Osteoarthritis',
        baseRate: 0.25,
        ageModifiers: [
          { range: [0, 40], multiplier: 0.1 },
          { range: [50, 100], multiplier: 2.0 },
        ],
        genderModifier: { male: 0.9, female: 1.2 },
      },
      {
        diagnosis: 'Trochanteric Bursitis',
        baseRate: 0.20,
        ageModifiers: [{ range: [40, 70], multiplier: 1.3 }],
        genderModifier: { male: 0.7, female: 1.5 },
      },
      {
        diagnosis: 'Labral Tear',
        baseRate: 0.08,
        ageModifiers: [{ range: [18, 45], multiplier: 1.5 }],
        genderModifier: { male: 1.1, female: 1.0 },
      },
      {
        diagnosis: 'Avascular Necrosis',
        baseRate: 0.03,
        ageModifiers: [{ range: [30, 60], multiplier: 1.5 }],
        genderModifier: { male: 1.5, female: 0.7 },
      },
      {
        diagnosis: 'Septic Arthritis',
        baseRate: 0.02,
        ageModifiers: [{ range: [65, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // FLANK PAIN / KIDNEY STONE
  // ================================================================
  {
    // Narrow trigger: only route to stone/flank category when the presentation
    // is dominated by colicky/wave/radiation-to-groin signals. A dysuria-
    // dominant case with flank pain should route to 'urinary' instead
    // (pyelonephritis/UTI). Without this guard, "burning with urination and
    // right-sided flank pain with fever" was matching here first and
    // pyelonephritis/UTI lost their age- and gender-appropriate priors.
    complaint: 'flank pain',
    triggerPatterns: [
      /flank.*(wave|groin|colick|stone|pain)/i,
      /(wave|groin|colick|stone).*flank/i,
      /renal\s*colic/i,
      /kidney\s*stone/i,
      /\bstone\b.*(pain|flank|side)/i,
      /side.*(wave|groin|ball|nut|radiating)/i,
      /(wave|groin|ball|nut).*side/i,
      /side\s*pain.*(wave|groin)/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Kidney Stone',
        baseRate: 0.45,
        ageModifiers: [
          { range: [20, 60], multiplier: 1.3 },
        ],
        genderModifier: { male: 1.5, female: 0.8 },
      },
      {
        diagnosis: 'Pyelonephritis',
        baseRate: 0.20,
        ageModifiers: [],
        genderModifier: { male: 0.5, female: 1.8 },
      },
      {
        diagnosis: 'UTI',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 0.3, female: 2.0 },
      },
      {
        diagnosis: 'Musculoskeletal Strain',
        baseRate: 0.10,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Abdominal Aortic Aneurysm',
        baseRate: 0.03,
        ageModifiers: [{ range: [60, 100], multiplier: 3.0 }],
        genderModifier: { male: 3.0, female: 0.4 },
      },
      {
        diagnosis: 'Renal Infarct',
        baseRate: 0.01,
        ageModifiers: [{ range: [50, 100], multiplier: 1.5 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
    ],
  },

  // ================================================================
  // VAGINAL BLEEDING
  // ================================================================
  {
    complaint: 'vaginal bleeding',
    triggerPatterns: [
      /vaginal\s*bleed|bleeding\s*vaginal/i,
      /postmenopausal\s*bleed|bleeding.*menopaus|menopaus.*bleed/i,
      /menorrhag|metrorrhag|spotting.*period/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Endometrial Cancer',
        baseRate: 0.12,
        ageModifiers: [
          { range: [0, 45], multiplier: 0.1 },
          { range: [55, 100], multiplier: 3.0 },
        ],
        genderModifier: { male: 0, female: 1.0 },
      },
      {
        diagnosis: 'Endometrial Hyperplasia',
        baseRate: 0.15,
        ageModifiers: [{ range: [45, 80], multiplier: 1.5 }],
        genderModifier: { male: 0, female: 1.0 },
      },
      {
        diagnosis: 'Atrophic Vaginitis',
        baseRate: 0.20,
        ageModifiers: [{ range: [50, 100], multiplier: 2.0 }],
        genderModifier: { male: 0, female: 1.0 },
      },
      {
        diagnosis: 'Uterine Fibroids',
        baseRate: 0.18,
        ageModifiers: [{ range: [30, 55], multiplier: 1.5 }],
        genderModifier: { male: 0, female: 1.0 },
      },
      {
        diagnosis: 'Cervical Cancer',
        baseRate: 0.03,
        ageModifiers: [{ range: [30, 60], multiplier: 1.5 }],
        genderModifier: { male: 0, female: 1.0 },
      },
      {
        diagnosis: 'Dysfunctional Uterine Bleeding',
        baseRate: 0.15,
        ageModifiers: [{ range: [18, 45], multiplier: 1.5 }],
        genderModifier: { male: 0, female: 1.0 },
      },
      {
        diagnosis: 'Ectopic Pregnancy',
        baseRate: 0.05,
        ageModifiers: [{ range: [18, 40], multiplier: 2.0 }],
        genderModifier: { male: 0, female: 1.0 },
      },
      {
        diagnosis: 'Miscarriage',
        baseRate: 0.08,
        ageModifiers: [{ range: [18, 40], multiplier: 1.8 }],
        genderModifier: { male: 0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // PALPITATIONS
  // ================================================================
  {
    complaint: 'palpitations',
    triggerPatterns: [/palpit|racing\s*heart|heart\s*racing|fluttering.*chest|irregular\s*heartbeat|pounding.*heart/i],
    diagnoses: [
      {
        diagnosis: 'Supraventricular Tachycardia',
        baseRate: 0.15,
        ageModifiers: [{ range: [18, 50], multiplier: 1.5 }],
        genderModifier: { male: 0.9, female: 1.2 },
      },
      {
        diagnosis: 'Atrial Fibrillation',
        baseRate: 0.18,
        ageModifiers: [
          { range: [0, 45], multiplier: 0.2 },
          { range: [65, 100], multiplier: 2.5 },
        ],
        genderModifier: { male: 1.3, female: 0.9 },
      },
      {
        diagnosis: 'Cardiac Arrhythmia',
        baseRate: 0.15,
        ageModifiers: [{ range: [50, 100], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Anxiety',
        baseRate: 0.25,
        ageModifiers: [{ range: [18, 45], multiplier: 1.3 }],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Panic Disorder',
        baseRate: 0.10,
        ageModifiers: [{ range: [18, 40], multiplier: 1.5 }],
        genderModifier: { male: 0.6, female: 1.5 },
      },
      {
        diagnosis: 'Hyperthyroidism',
        baseRate: 0.05,
        ageModifiers: [{ range: [20, 50], multiplier: 1.3 }],
        genderModifier: { male: 0.3, female: 1.8 },
      },
      {
        diagnosis: 'Caffeine/Stimulant Effect',
        baseRate: 0.08,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Anemia',
        baseRate: 0.04,
        ageModifiers: [],
        genderModifier: { male: 0.7, female: 1.4 },
      },
      {
        diagnosis: 'Acute Coronary Syndrome',
        baseRate: 0.04,
        ageModifiers: [{ range: [55, 100], multiplier: 2.5 }],
        genderModifier: { male: 1.3, female: 0.8 },
      },
    ],
  },

  // ================================================================
  // ACUTE VISION LOSS
  // ================================================================
  {
    complaint: 'vision loss',
    triggerPatterns: [/vision\s*loss|lost.*vision|can.*see|blind|blurred\s*vision|visual\s*change/i],
    diagnoses: [
      {
        diagnosis: 'Central Retinal Artery Occlusion',
        baseRate: 0.12,
        ageModifiers: [{ range: [55, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Retinal Detachment',
        baseRate: 0.10,
        ageModifiers: [{ range: [40, 80], multiplier: 1.5 }],
        genderModifier: { male: 1.1, female: 1.0 },
      },
      {
        diagnosis: 'Stroke',
        baseRate: 0.10,
        ageModifiers: [{ range: [55, 100], multiplier: 2.5 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Temporal Arteritis',
        baseRate: 0.06,
        ageModifiers: [{ range: [50, 100], multiplier: 3.0 }],
        genderModifier: { male: 0.5, female: 1.8 },
      },
      {
        diagnosis: 'Optic Neuritis',
        baseRate: 0.04,
        ageModifiers: [{ range: [20, 45], multiplier: 2.0 }],
        genderModifier: { male: 0.5, female: 1.8 },
      },
      {
        diagnosis: 'Acute Glaucoma',
        baseRate: 0.06,
        ageModifiers: [{ range: [50, 100], multiplier: 1.5 }],
        genderModifier: { male: 0.9, female: 1.2 },
      },
      {
        diagnosis: 'Amaurosis Fugax',
        baseRate: 0.08,
        ageModifiers: [{ range: [55, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Vitreous Hemorrhage',
        baseRate: 0.05,
        ageModifiers: [],
        genderModifier: { male: 1.1, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // HYPERGLYCEMIA / DKA TRIAD (thirst + urination + nausea + fruity breath)
  // ================================================================
  {
    complaint: 'hyperglycemia',
    triggerPatterns: [
      /fruity\s*breath/i,
      /polyuria|urinating\s*a\s*lot|drinking\s*a\s*lot|polydipsia/i,
      /high\s*blood\s*sugar|diabet.*vomit|diabetic.*emerg/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Diabetic Ketoacidosis',
        baseRate: 0.50,
        ageModifiers: [
          { range: [5, 35], multiplier: 1.5 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Hyperosmolar Hyperglycemic State',
        baseRate: 0.25,
        ageModifiers: [{ range: [50, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'New-onset Diabetes Mellitus',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Sepsis',
        baseRate: 0.05,
        ageModifiers: [{ range: [65, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Pancreatitis',
        baseRate: 0.03,
        ageModifiers: [],
        genderModifier: { male: 1.2, female: 0.9 },
      },
    ],
  },

  // ================================================================
  // TESTICULAR PAIN
  // ================================================================
  {
    complaint: 'testicular pain',
    triggerPatterns: [/testic|scrotal|groin\s*pain|\bnut\b.*\b(hurt|pain|swell|ache)|\bnuts\b.*\b(hurt|pain|swell)|\bballs?\b.*\b(hurt|pain|swell|ache)|testicular\s*pain/i],
    diagnoses: [
      {
        diagnosis: 'Testicular Torsion',
        baseRate: 0.25,
        ageModifiers: [
          { range: [10, 25], multiplier: 3.0 },
          { range: [26, 50], multiplier: 0.8 },
        ],
        genderModifier: { male: 1.0, female: 0 },
      },
      {
        diagnosis: 'Epididymitis',
        baseRate: 0.30,
        ageModifiers: [{ range: [18, 40], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 0 },
      },
      {
        diagnosis: 'Orchitis',
        baseRate: 0.10,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 0 },
      },
      {
        diagnosis: 'Inguinal Hernia',
        baseRate: 0.15,
        ageModifiers: [{ range: [40, 100], multiplier: 1.3 }],
        genderModifier: { male: 1.0, female: 0 },
      },
      {
        diagnosis: 'Testicular Cancer',
        baseRate: 0.05,
        ageModifiers: [{ range: [18, 35], multiplier: 2.5 }],
        genderModifier: { male: 1.0, female: 0 },
      },
      {
        diagnosis: 'Varicocele',
        baseRate: 0.08,
        ageModifiers: [{ range: [15, 40], multiplier: 1.3 }],
        genderModifier: { male: 1.0, female: 0 },
      },
    ],
  },

  // ================================================================
  // RAYNAUD PHENOMENON — color change in fingers/toes
  // ================================================================
  {
    complaint: 'raynaud',
    triggerPatterns: [
      /fingers?.*(turn|go).*(white|blue|red)/i,
      /(white|blue|red).*(fingers?|toes?).*(cold|stress)/i,
      /raynaud/i,
      /cold\s*hand.*color|color.*change.*cold/i,
    ],
    diagnoses: [
      { diagnosis: 'Raynaud Phenomenon', baseRate: 0.55, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 0.3, female: 2.0 } },
      { diagnosis: 'Systemic Sclerosis', baseRate: 0.10, ageModifiers: [{ range: [30, 60], multiplier: 1.5 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Systemic Lupus Erythematosus', baseRate: 0.10, ageModifiers: [{ range: [15, 45], multiplier: 1.5 }], genderModifier: { male: 0.2, female: 2.0 } },
      { diagnosis: 'Mixed Connective Tissue Disease', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Cryoglobulinemia', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Peripheral Arterial Disease', baseRate: 0.08, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Buerger Disease', baseRate: 0.03, ageModifiers: [{ range: [20, 50], multiplier: 1.5 }], genderModifier: { male: 3.0, female: 0.3 } },
    ],
  },

  // ================================================================
  // WIDESPREAD BODY ACHES — fibromyalgia, PMR, viral
  // ================================================================
  {
    complaint: 'widespread pain',
    triggerPatterns: [
      /widespread.*(pain|ache)|all\s*over.*(pain|ache)|whole\s*body.*(pain|ache)/i,
      /fibromyalg/i,
      /multiple\s*tender\s*points|trigger\s*points/i,
      /chronic.*fatigue.*aches|aches.*chronic\s*fatigue/i,
    ],
    diagnoses: [
      { diagnosis: 'Fibromyalgia', baseRate: 0.30, ageModifiers: [{ range: [25, 60], multiplier: 1.5 }], genderModifier: { male: 0.3, female: 2.0 } },
      { diagnosis: 'Polymyalgia Rheumatica', baseRate: 0.15, ageModifiers: [{ range: [60, 100], multiplier: 3.0 }, { range: [0, 50], multiplier: 0.05 }], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Chronic Fatigue Syndrome', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 0.5, female: 1.5 } },
      { diagnosis: 'Hypothyroidism', baseRate: 0.08, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Viral Illness', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Depression', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Rheumatoid Arthritis', baseRate: 0.05, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 0.5, female: 1.8 } },
      { diagnosis: 'Sleep Apnea', baseRate: 0.05, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
    ],
  },

  // ================================================================
  // GASTROPARESIS / DIABETIC GI — delayed gastric emptying
  // ================================================================
  {
    complaint: 'gastroparesis',
    triggerPatterns: [
      /early\s*satiety|early\s*full/i,
      /undigested\s*food.*vomit|vomit.*undigested/i,
      /gastropares/i,
      /diabet.*chronic.*nausea|chronic.*nausea.*diabet/i,
    ],
    diagnoses: [
      { diagnosis: 'Gastroparesis', baseRate: 0.40, ageModifiers: [], genderModifier: { male: 0.6, female: 1.5 } },
      { diagnosis: 'Functional Dyspepsia', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 0.9, female: 1.2 } },
      { diagnosis: 'Gastric Outlet Obstruction', baseRate: 0.08, ageModifiers: [{ range: [40, 100], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Gastric Cancer', baseRate: 0.05, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Peptic Ulcer Disease', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'GERD', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Chronic Pancreatitis', baseRate: 0.05, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
    ],
  },

  // ================================================================
  // KAWASAKI / PROLONGED PEDIATRIC FEVER — can't-miss pediatric
  // ================================================================
  {
    complaint: 'kawasaki',
    triggerPatterns: [
      /fever.*(5|four|five|six|seven)\s*days.*(?:child|kid|year\s*old|son|daughter)/i,
      /(child|kid|year\s*old|son|daughter).*fever.*(5|four|five|six|seven)\s*days/i,
      /red.*lips.*cracked|strawberry\s*tongue/i,
      /swollen.*hands.*feet.*fever/i,
      /kawasaki/i,
    ],
    diagnoses: [
      { diagnosis: 'Kawasaki Disease', baseRate: 0.35, ageModifiers: [{ range: [0, 5], multiplier: 2.0 }, { range: [6, 12], multiplier: 1.0 }, { range: [18, 100], multiplier: 0.02 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Multisystem Inflammatory Syndrome in Children', baseRate: 0.10, ageModifiers: [{ range: [0, 18], multiplier: 1.5 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Scarlet Fever', baseRate: 0.12, ageModifiers: [{ range: [4, 10], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Viral Exanthem', baseRate: 0.20, ageModifiers: [{ range: [0, 12], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Drug Reaction', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Staphylococcal Toxic Shock', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Measles', baseRate: 0.04, ageModifiers: [{ range: [0, 15], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Sepsis', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // CHRONIC COUGH — TB, ACEi cough, cough-variant asthma, lung cancer
  // ================================================================
  {
    complaint: 'chronic cough',
    triggerPatterns: [
      /cough.*(?:weeks|months)|(?:weeks|months).*cough/i,
      /chronic\s*cough|persistent\s*cough|cough\s*for\s*a\s*while/i,
      /night\s*sweats.*cough|cough.*night\s*sweats/i,
      /\bhemoptysis\b|coughing\s*blood|blood.*sputum/i,
    ],
    diagnoses: [
      { diagnosis: 'Post-Infectious Cough', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Post-Nasal Drip', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cough-Variant Asthma', baseRate: 0.12, ageModifiers: [], genderModifier: { male: 1.0, female: 1.1 } },
      { diagnosis: 'GERD', baseRate: 0.12, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'ACE Inhibitor Cough', baseRate: 0.08, ageModifiers: [{ range: [45, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Tuberculosis', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Lung Cancer', baseRate: 0.06, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.5, female: 0.8 } },
      { diagnosis: 'Bronchiectasis', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Sarcoidosis', baseRate: 0.04, ageModifiers: [{ range: [25, 55], multiplier: 1.5 }], genderModifier: { male: 0.9, female: 1.1 } },
      { diagnosis: 'Pertussis', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // SORE THROAT — MUST come before dysphagia so "cant swallow" + "throat"
  // routes here instead of to esophageal conditions
  // ================================================================
  {
    complaint: 'sore throat',
    triggerPatterns: [
      /sore\s*throat|throat\s*(pain|hurt|kill|burn|on\s*fire|scratch|swell)|pharyngitis|tonsilitis|odynophagia|(hurt|kill|pain|burn|scratch|swell).*throat|swollen\s*tonsil|tonsil.*swollen|strep/i,
      /drool.*throat|throat.*drool|cant\s*swallow.*throat|throat.*cant\s*swallow|hot\s*potato/i,
      /white\s*spots?.*throat|throat.*white\s*spots?|glands?\s*swollen/i,
    ],
    diagnoses: [
      { diagnosis: 'Viral Pharyngitis', baseRate: 0.50, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Strep Pharyngitis', baseRate: 0.20, ageModifiers: [{ range: [5, 15], multiplier: 1.8 }, { range: [16, 40], multiplier: 1.0 }, { range: [45, 100], multiplier: 0.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Infectious Mononucleosis', baseRate: 0.05, ageModifiers: [{ range: [15, 25], multiplier: 3.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Peritonsillar Abscess', baseRate: 0.04, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'GERD', baseRate: 0.05, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Epiglottitis', baseRate: 0.01, ageModifiers: [{ range: [2, 7], multiplier: 3.0 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // DYSPHAGIA / FOOD GETS STUCK — EoE, achalasia, strictures, cancer
  // (narrowed trigger — "can't swallow" removed; caught by sore throat when throat present)
  // ================================================================
  {
    complaint: 'dysphagia',
    triggerPatterns: [
      /dysphag|difficulty\s*swallow|hard\s*to\s*swallow|food.*stuck|food.*catch|trouble\s*swallowing/i,
    ],
    diagnoses: [
      { diagnosis: 'Eosinophilic Esophagitis', baseRate: 0.15, ageModifiers: [{ range: [15, 50], multiplier: 1.8 }], genderModifier: { male: 2.0, female: 0.8 } },
      { diagnosis: 'Achalasia', baseRate: 0.10, ageModifiers: [{ range: [25, 60], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Esophageal Stricture', baseRate: 0.20, ageModifiers: [{ range: [50, 100], multiplier: 1.3 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Esophageal Cancer', baseRate: 0.12, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 2.5, female: 0.5 } },
      { diagnosis: 'GERD', baseRate: 0.25, ageModifiers: [], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Peptic Stricture', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Esophageal Spasm', baseRate: 0.05, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.2 } },
      { diagnosis: 'Zenker Diverticulum', baseRate: 0.03, ageModifiers: [{ range: [60, 100], multiplier: 2.0 }], genderModifier: { male: 1.5, female: 0.7 } },
    ],
  },

  // ================================================================
  // LATERAL THIGH NUMBNESS — meralgia paresthetica + differentials
  // ================================================================
  {
    complaint: 'lateral thigh',
    triggerPatterns: [
      /numb.*(outer|lateral|side).*(thigh|leg)|(outer|lateral|side).*(thigh|leg).*numb/i,
      /meralgia|burning.*outer.*thigh|tingling.*outer.*thigh/i,
      /pants.*hurt|belt.*numb/i,
    ],
    diagnoses: [
      { diagnosis: 'Meralgia Paresthetica', baseRate: 0.45, ageModifiers: [{ range: [30, 65], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 1.0 } },
      { diagnosis: 'L2-L3 Radiculopathy', baseRate: 0.15, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Diabetic Neuropathy', baseRate: 0.12, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Lumbar Plexopathy', baseRate: 0.06, ageModifiers: [{ range: [40, 80], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Trochanteric Bursitis', baseRate: 0.10, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 0.7, female: 1.5 } },
      { diagnosis: 'Peripheral Neuropathy', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // POSTURAL TACHYCARDIA / STANDING-INDUCED SYMPTOMS
  // ================================================================
  {
    complaint: 'postural tachycardia',
    triggerPatterns: [
      /dizzy.*stand|stand.*dizzy|lightheaded.*stand|stand.*lightheaded/i,
      /heart.*rac.*stand|stand.*heart.*rac|pots\b/i,
      /pass.*out.*stand|stand.*faint/i,
    ],
    diagnoses: [
      { diagnosis: 'Postural Orthostatic Tachycardia Syndrome', baseRate: 0.20, ageModifiers: [{ range: [13, 45], multiplier: 1.8 }], genderModifier: { male: 0.3, female: 2.0 } },
      { diagnosis: 'Orthostatic Hypotension', baseRate: 0.25, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Dehydration', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Vasovagal Syncope', baseRate: 0.15, ageModifiers: [{ range: [15, 35], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Anemia', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Adrenal Insufficiency', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Autonomic Dysfunction', baseRate: 0.06, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cardiac Arrhythmia', baseRate: 0.07, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // MULTI-SYSTEM AUTOIMMUNE — SLE and mimics
  // ================================================================
  {
    complaint: 'multisystem autoimmune',
    triggerPatterns: [
      /joint\s*pain.*rash|rash.*joint\s*pain/i,
      /\blupus\b|\bsle\b/i,
      /malar\s*rash|butterfly\s*rash|photosensitiv.*rash|mouth\s*ulcer.*joint/i,
      /multiple\s*joint|many\s*joints|symmetric.*joint|polyarthrit/i,
      /raynaud/i,
    ],
    diagnoses: [
      { diagnosis: 'Systemic Lupus Erythematosus', baseRate: 0.25, ageModifiers: [{ range: [15, 45], multiplier: 1.8 }], genderModifier: { male: 0.15, female: 2.5 } },
      { diagnosis: 'Rheumatoid Arthritis', baseRate: 0.20, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 0.5, female: 1.8 } },
      { diagnosis: 'Mixed Connective Tissue Disease', baseRate: 0.08, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Sjogren Syndrome', baseRate: 0.08, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 0.2, female: 2.0 } },
      { diagnosis: 'Systemic Sclerosis', baseRate: 0.05, ageModifiers: [{ range: [35, 65], multiplier: 1.5 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Dermatomyositis', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 0.5, female: 1.5 } },
      { diagnosis: 'Polymyalgia Rheumatica', baseRate: 0.08, ageModifiers: [{ range: [60, 100], multiplier: 3.0 }, { range: [0, 50], multiplier: 0.05 }], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Fibromyalgia', baseRate: 0.10, ageModifiers: [{ range: [25, 60], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 2.0 } },
      { diagnosis: 'Reactive Arthritis', baseRate: 0.05, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Viral Arthritis', baseRate: 0.07, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // MYASTHENIA / FATIGABLE WEAKNESS — ptosis/diplopia/fatigability
  // ================================================================
  {
    complaint: 'fatigable weakness',
    triggerPatterns: [
      /ptosis|drooping\s*eyelid/i,
      /double\s*vision.*(?:day|evening|rest|fatigu)/i,
      /(?:weakness|symptoms).*(?:worse.*end.*day|worse.*evening|better.*rest)/i,
      /fatigab/i,
      /\bmyasth/i,
      /trouble.*chew.*swallow|chew.*swallow.*trouble|jaw.*tired.*chew/i,
    ],
    diagnoses: [
      { diagnosis: 'Myasthenia Gravis', baseRate: 0.35, ageModifiers: [{ range: [20, 45], multiplier: 1.3 }, { range: [60, 100], multiplier: 1.3 }], genderModifier: { male: 0.9, female: 1.2 } },
      { diagnosis: 'Lambert-Eaton Myasthenic Syndrome', baseRate: 0.05, ageModifiers: [{ range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Third Nerve Palsy', baseRate: 0.10, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Multiple Sclerosis', baseRate: 0.08, ageModifiers: [{ range: [20, 40], multiplier: 1.8 }], genderModifier: { male: 0.4, female: 1.8 } },
      { diagnosis: 'Horner Syndrome', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Thyroid Eye Disease', baseRate: 0.06, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Botulism', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Stroke', baseRate: 0.08, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.1, female: 0.9 } },
    ],
  },

  // ================================================================
  // PAROXYSMAL HYPERTENSION — pheochromocytoma et al
  // ================================================================
  {
    complaint: 'paroxysmal hypertension',
    triggerPatterns: [
      /episod.*(?:headache|sweat|palpit|high\s*blood\s*pressure|bp)/i,
      /paroxysmal.*(?:hypertension|headache|palpit)/i,
      /spikes.*(?:bp|blood\s*pressure|hypertens)/i,
      /pheochromo|pheo\b/i,
      /(?:headache|sweat|palpit).*spike.*(?:bp|blood\s*pressure)/i,
      /bp.*(?:200|190|180|220).*(?:headache|sweat|palpit|episode)/i,
    ],
    diagnoses: [
      { diagnosis: 'Pheochromocytoma', baseRate: 0.20, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Paroxysmal Atrial Fibrillation', baseRate: 0.15, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Panic Disorder', baseRate: 0.20, ageModifiers: [{ range: [18, 45], multiplier: 1.3 }], genderModifier: { male: 0.6, female: 1.5 } },
      { diagnosis: 'Hyperthyroidism', baseRate: 0.10, ageModifiers: [{ range: [20, 60], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Essential Hypertension', baseRate: 0.15, ageModifiers: [{ range: [40, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cocaine/Stimulant Use', baseRate: 0.05, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Carcinoid Syndrome', baseRate: 0.03, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Withdrawal Syndrome', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
    ],
  },

  // ================================================================
  // ADRENAL INSUFFICIENCY — hyperpigmentation + salt craving + hypotension
  // ================================================================
  {
    complaint: 'adrenal insufficiency',
    triggerPatterns: [
      /hyperpigment|skin.*dark.*crease|palm.*crease.*dark|darkening.*skin/i,
      /salt\s*crav|crav.*salt/i,
      /addison/i,
      /(?:weight\s*loss.*hyperpigment|hyperpigment.*weight\s*loss)/i,
      /adrenal\s*(?:insuffic|crisis)/i,
    ],
    diagnoses: [
      { diagnosis: 'Adrenal Insufficiency', baseRate: 0.40, ageModifiers: [], genderModifier: { male: 0.8, female: 1.2 } },
      { diagnosis: 'Addison Disease', baseRate: 0.25, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.8, female: 1.2 } },
      { diagnosis: 'Adrenal Hemorrhage', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Hemochromatosis', baseRate: 0.04, ageModifiers: [{ range: [40, 65], multiplier: 1.3 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Secondary Adrenal Insufficiency', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Autoimmune Polyendocrine Syndrome', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 0.5, female: 1.5 } },
      { diagnosis: 'Tuberculosis Adrenalitis', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Metastatic Cancer to Adrenal', baseRate: 0.03, ageModifiers: [{ range: [55, 100], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
    ],
  },

  // ================================================================
  // CARCINOID SYNDROME — flushing + diarrhea + wheezing triad
  // ================================================================
  {
    complaint: 'carcinoid',
    triggerPatterns: [
      /flushing.*diarrh|diarrh.*flushing/i,
      /facial\s*flush.*(?:wheez|diarrh)|wheez.*(?:flush|diarrh)/i,
      /carcinoid/i,
      /flushing.*(?:alcohol|cheese).*trigger/i,
    ],
    diagnoses: [
      { diagnosis: 'Carcinoid Syndrome', baseRate: 0.35, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Neuroendocrine Tumor', baseRate: 0.15, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Mastocytosis', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'VIPoma', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Medullary Thyroid Cancer', baseRate: 0.04, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Rosacea / Menopause flush', baseRate: 0.15, ageModifiers: [{ range: [40, 65], multiplier: 1.5 }], genderModifier: { male: 0.4, female: 1.8 } },
      { diagnosis: 'Systemic Mastocytosis', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // GUILLAIN-BARRÉ SYNDROME — ascending weakness after illness
  // ================================================================
  {
    complaint: 'ascending weakness',
    triggerPatterns: [
      /ascending.*weak|weak.*ascending/i,
      /weakness.*(?:spreading|progressing).*(?:up|arm|both)/i,
      /weakness.*(?:after|following).*(?:diarrhea|illness|stomach|infection)/i,
      /both.*legs.*weak.*arms|legs.*to.*arms.*weak/i,
      /guillain|\bgbs\b/i,
      /areflexia|loss.*reflexes/i,
    ],
    diagnoses: [
      { diagnosis: 'Guillain-Barre Syndrome', baseRate: 0.45, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Transverse Myelitis', baseRate: 0.10, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Acute Disseminated Encephalomyelitis', baseRate: 0.04, ageModifiers: [{ range: [0, 20], multiplier: 1.8 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Chronic Inflammatory Demyelinating Polyneuropathy', baseRate: 0.05, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Spinal Cord Compression', baseRate: 0.08, ageModifiers: [{ range: [50, 100], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Poliomyelitis', baseRate: 0.01, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Tick Paralysis', baseRate: 0.01, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Myasthenia Gravis', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.1 } },
    ],
  },

  // ================================================================
  // PRIMARY SPONTANEOUS PNEUMOTHORAX — tall thin young adult
  // ================================================================
  {
    complaint: 'spontaneous pneumothorax',
    triggerPatterns: [
      /(?:tall|thin|skinny|lanky).*(?:chest\s*pain|shortness\s*of\s*breath|sob)/i,
      /sudden.*sharp.*(?:left|right).*chest.*(?:breath|sob)/i,
      /(?:pneumothorax|collapsed\s*lung|decreased\s*breath\s*sounds)/i,
      /(?:chest\s*pain|sob).*(?:decreased|absent).*breath\s*sounds/i,
    ],
    diagnoses: [
      { diagnosis: 'Primary Spontaneous Pneumothorax', baseRate: 0.30, ageModifiers: [{ range: [15, 35], multiplier: 2.0 }], genderModifier: { male: 5.0, female: 0.2 } },
      { diagnosis: 'Pulmonary Embolism', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Pneumonia', baseRate: 0.12, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Pleuritis', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Musculoskeletal Chest Pain', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Costochondritis', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Pericarditis', baseRate: 0.05, ageModifiers: [{ range: [20, 40], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
    ],
  },

  // ================================================================
  // PREECLAMPSIA / HELLP — pregnancy-associated hypertension
  // ================================================================
  {
    complaint: 'preeclampsia',
    triggerPatterns: [
      /pregnant.*(?:headache|vision|swell|bp|blood\s*pressure|ruq|upper.*abdomin)/i,
      /(?:headache|vision|swell|bp|ruq).*pregnant/i,
      /third\s*trimester.*(?:headache|vision|swell|bp)/i,
      /preeclam|eclam|hellp/i,
      /(?:\d+\s*weeks\s*pregnant).*(?:headache|vision|swell|blood\s*pressure)/i,
    ],
    diagnoses: [
      { diagnosis: 'Preeclampsia', baseRate: 0.40, ageModifiers: [{ range: [18, 40], multiplier: 1.3 }], genderModifier: { male: 0, female: 1.0 } },
      { diagnosis: 'HELLP Syndrome', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 0, female: 1.0 } },
      { diagnosis: 'Eclampsia', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 0, female: 1.0 } },
      { diagnosis: 'Gestational Hypertension', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 0, female: 1.0 } },
      { diagnosis: 'Migraine of Pregnancy', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 0, female: 1.0 } },
      { diagnosis: 'Acute Fatty Liver of Pregnancy', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 0, female: 1.0 } },
      { diagnosis: 'Posterior Reversible Encephalopathy', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 0, female: 1.0 } },
      { diagnosis: 'Cerebral Venous Sinus Thrombosis', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 0, female: 1.0 } },
    ],
  },

  // ================================================================
  // IPF / INTERSTITIAL LUNG DISEASE
  // ================================================================
  {
    complaint: 'interstitial lung',
    triggerPatterns: [
      /(?:chronic|progressive).*dry\s*cough.*(?:clubbing|crackles|velcro)/i,
      /(?:clubbing|velcro\s*crackles).*(?:cough|dyspnea|breath)/i,
      /pulmonary\s*fibrosis|\bipf\b|interstitial\s*lung/i,
      /progressive\s*(?:shortness|dyspnea).*(?:dry\s*cough|months|years)/i,
    ],
    diagnoses: [
      { diagnosis: 'Idiopathic Pulmonary Fibrosis', baseRate: 0.30, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }, { range: [0, 40], multiplier: 0.05 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Hypersensitivity Pneumonitis', baseRate: 0.12, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Sarcoidosis', baseRate: 0.10, ageModifiers: [{ range: [25, 55], multiplier: 1.5 }], genderModifier: { male: 0.9, female: 1.1 } },
      { diagnosis: 'Nonspecific Interstitial Pneumonia', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Connective Tissue ILD', baseRate: 0.08, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 0.5, female: 1.5 } },
      { diagnosis: 'Lung Cancer', baseRate: 0.08, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.5, female: 0.8 } },
      { diagnosis: 'Pneumoconiosis', baseRate: 0.04, ageModifiers: [{ range: [45, 80], multiplier: 1.5 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Chronic Heart Failure', baseRate: 0.10, ageModifiers: [{ range: [55, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // CLUSTER HEADACHE — retro-orbital + autonomic (expanded)
  // ================================================================
  {
    complaint: 'cluster headache',
    triggerPatterns: [
      /(?:behind|around).*eye.*(?:pain|ache).*(?:tear|runny|nose|red)/i,
      /(?:tear|runny).*(?:eye|nose).*(?:behind|around).*eye/i,
      /retro.?orbital/i,
      /cluster\s*headache|suicide\s*headache/i,
      /excruciating.*(?:eye|temple).*same\s*time/i,
    ],
    diagnoses: [
      { diagnosis: 'Cluster Headache', baseRate: 0.45, ageModifiers: [{ range: [20, 50], multiplier: 1.5 }], genderModifier: { male: 3.0, female: 0.4 } },
      { diagnosis: 'Migraine', baseRate: 0.18, ageModifiers: [], genderModifier: { male: 0.6, female: 1.6 } },
      { diagnosis: 'Trigeminal Autonomic Cephalalgia', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Sinusitis', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Acute Glaucoma', baseRate: 0.05, ageModifiers: [{ range: [55, 100], multiplier: 1.5 }], genderModifier: { male: 0.9, female: 1.2 } },
      { diagnosis: 'Paroxysmal Hemicrania', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.2 } },
      { diagnosis: 'Hemicrania Continua', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Trigeminal Neuralgia', baseRate: 0.05, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 0.7, female: 1.3 } },
    ],
  },

  // ================================================================
  // FACIAL NEUROLOGICAL — Bell's palsy, trigeminal neuralgia
  // ================================================================
  {
    complaint: 'facial neurological',
    triggerPatterns: [
      /face.*droop|facial\s*droop|facial\s*weakness/i,
      /(face|facial|cheek|forehead|jaw).*(shock|electric|stab|shooting|lightning)/i,
      /(shock|electric|stab|shooting|lightning).*(face|facial|cheek|forehead|jaw)/i,
      /trigemin|bell.*palsy/i,
      /half\s*my\s*face|one\s*side.*face/i,
      /cannot\s*close.*eye|cannot\s*smile/i,
    ],
    diagnoses: [
      { diagnosis: 'Bell Palsy', baseRate: 0.30, ageModifiers: [{ range: [20, 55], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Stroke', baseRate: 0.20, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Trigeminal Neuralgia', baseRate: 0.18, ageModifiers: [{ range: [50, 100], multiplier: 1.8 }], genderModifier: { male: 0.6, female: 1.5 } },
      { diagnosis: 'Herpes Zoster (Ramsay Hunt)', baseRate: 0.08, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Lyme Disease', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Multiple Sclerosis', baseRate: 0.06, ageModifiers: [{ range: [20, 40], multiplier: 2.0 }], genderModifier: { male: 0.4, female: 1.8 } },
      { diagnosis: 'Acoustic Neuroma', baseRate: 0.02, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cluster Headache', baseRate: 0.05, ageModifiers: [{ range: [20, 50], multiplier: 1.5 }], genderModifier: { male: 3.0, female: 0.4 } },
    ],
  },

  // ================================================================
  // LEG SWELLING / CALF PAIN — DVT, cellulitis, compartment syndrome
  // ================================================================
  {
    complaint: 'leg swelling',
    triggerPatterns: [
      /calf.*pain|calf.*swell|calf.*swollen/i,
      /leg.*swell|leg.*swollen|swollen.*leg/i,
      /unilateral.*leg|one.*leg.*swell/i,
      /\bdvt\b|deep\s*vein/i,
    ],
    diagnoses: [
      { diagnosis: 'DVT', baseRate: 0.30, ageModifiers: [{ range: [40, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cellulitis', baseRate: 0.25, ageModifiers: [{ range: [50, 100], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Musculoskeletal Strain', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Venous Insufficiency', baseRate: 0.10, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: "Baker's Cyst Rupture", baseRate: 0.05, ageModifiers: [{ range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Compartment Syndrome', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Lymphedema', baseRate: 0.05, ageModifiers: [{ range: [40, 100], multiplier: 1.3 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Muscle Hematoma', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
    ],
  },

  // ================================================================
  // MONOARTICULAR JOINT — gout, pseudogout, septic arthritis
  // ================================================================
  {
    complaint: 'monoarticular joint',
    triggerPatterns: [
      /big\s*toe.*(swol|red|pain|hot)|(swol|red|pain|hot).*big\s*toe/i,
      /\bgout\b|\bpodagra\b/i,
      /single\s*joint|one\s*joint.*swol|one\s*joint.*red|hot\s*joint/i,
      /\bjoint\b.*(red|warm|hot|swol).*(red|warm|hot|swol)/i,
    ],
    diagnoses: [
      { diagnosis: 'Gout', baseRate: 0.40, ageModifiers: [{ range: [35, 70], multiplier: 1.5 }, { range: [0, 20], multiplier: 0.1 }], genderModifier: { male: 2.5, female: 0.5 } },
      { diagnosis: 'Pseudogout', baseRate: 0.12, ageModifiers: [{ range: [60, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Septic Arthritis', baseRate: 0.08, ageModifiers: [{ range: [55, 100], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Trauma', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Cellulitis', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Bursitis', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Reactive Arthritis', baseRate: 0.05, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
    ],
  },

  // ================================================================
  // JAUNDICE / YELLOW SKIN — hepatobiliary pathway
  // ================================================================
  {
    complaint: 'jaundice',
    triggerPatterns: [
      /yellow.*(skin|eye)|jaundice|icterus/i,
      /pale\s*stool|clay.*stool|dark\s*urine.*yellow/i,
    ],
    diagnoses: [
      { diagnosis: 'Pancreatic Cancer', baseRate: 0.12, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Choledocholithiasis', baseRate: 0.20, ageModifiers: [{ range: [40, 80], multiplier: 1.3 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Viral Hepatitis', baseRate: 0.18, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Alcoholic Hepatitis', baseRate: 0.12, ageModifiers: [{ range: [30, 60], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Cirrhosis', baseRate: 0.15, ageModifiers: [{ range: [45, 80], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Cholangitis', baseRate: 0.08, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Autoimmune Hepatitis', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 0.3, female: 2.0 } },
      { diagnosis: 'Primary Biliary Cholangitis', baseRate: 0.03, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 0.1, female: 2.5 } },
      { diagnosis: 'Gilbert Syndrome', baseRate: 0.05, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Drug-Induced Liver Injury', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // SICK INFANT / NON-SPECIFIC PEDIATRIC
  // Any infant with lethargy / not eating / limp / floppy lands here.
  // Tight trigger on actually-concerning symptoms — "fussy" alone was
  // too broad and scooped up ear-pain and pediatric-respiratory cases.
  // Specific pediatric complaints (otitis, croup, pediatric abdominal,
  // seizure) are ordered before this in the list so first-match returns
  // them; this sick-infant block is a fallback for non-specific lethargy.
  // ================================================================
  {
    complaint: 'sick infant',
    triggerPatterns: [
      /\b(infant|baby|newborn|neonat|month\s*old)\b.*(lethargic|not\s*eating|not\s*feeding|not\s*acting\s*right|limp|floppy|poor\s*feed|fewer\s*wet|dehydrat|unresponsive|sleepy\s*but)/i,
      /(lethargic|limp|floppy|poor\s*feed|unresponsive).*\b(infant|baby|newborn|neonat|month\s*old)\b/i,
      /\b(infant|baby|newborn).*(very\s*sick|really\s*sick|unwell|floppy|limp)/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Sepsis',
        baseRate: 0.30,
        ageModifiers: [{ range: [0, 3], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Viral Illness',
        baseRate: 0.30,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Dehydration',
        baseRate: 0.20,
        ageModifiers: [{ range: [0, 5], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Meningitis',
        baseRate: 0.08,
        ageModifiers: [{ range: [0, 3], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'UTI',
        baseRate: 0.12,
        ageModifiers: [{ range: [0, 2], multiplier: 1.5 }],
        genderModifier: { male: 0.5, female: 1.8 },
      },
      {
        diagnosis: 'Intussusception',
        baseRate: 0.05,
        ageModifiers: [{ range: [0, 3], multiplier: 2.0 }],
        genderModifier: { male: 1.5, female: 0.7 },
      },
      {
        diagnosis: 'Hypoglycemia',
        baseRate: 0.05,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Non-accidental Trauma',
        baseRate: 0.02,
        ageModifiers: [{ range: [0, 4], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // OTITIS MEDIA / EAR PAIN — pediatric #1 primary care complaint
  // ================================================================
  {
    complaint: 'ear pain',
    triggerPatterns: [
      /\bear\s*(pain|pull|tugg|ach|infec|ring|pressure|block|full|drain|discharg|hurt)|otitis|earache|tinnitus|ear\s*feels?\s*full/i,
      /pulling.*ear|tugging.*ear|muffled\s*hear|clogged\s*ear|cant\s*hear|grab.*ear|hold.*ear|screaming.*ear|ear.*screaming/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Acute Otitis Media',
        baseRate: 0.50,
        ageModifiers: [
          { range: [0, 3], multiplier: 2.0 },
          { range: [4, 10], multiplier: 1.2 },
          { range: [18, 100], multiplier: 0.15 },
        ],
        genderModifier: { male: 1.1, female: 1.0 },
      },
      {
        diagnosis: 'Otitis Externa',
        baseRate: 0.15,
        ageModifiers: [{ range: [5, 30], multiplier: 1.3 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Eustachian Tube Dysfunction',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Viral URI',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Mastoiditis',
        baseRate: 0.02,
        ageModifiers: [{ range: [0, 10], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Tympanic Membrane Perforation',
        baseRate: 0.03,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // NASAL / SINUS
  // ================================================================
  {
    complaint: 'nasal/sinus',
    triggerPatterns: [
      /\b(stuffy|stuff|block|clog).*nose|nasal\s*(congest|block|obstruct)|congestion/i,
      /nose\s*(bleed|running|drip|drain)|nosebleed|epistaxis|rhinorrhea/i,
      /sinus\s*(pain|pressure|infect|headache)|sinusitis/i,
      /runny\s*nose|snot|booger|cant\s*breathe\s*through\s*(my\s*)?nose/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Viral URI',
        baseRate: 0.45,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Allergic Rhinitis',
        baseRate: 0.25,
        ageModifiers: [{ range: [5, 40], multiplier: 1.3 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Acute Sinusitis',
        baseRate: 0.15,
        ageModifiers: [{ range: [18, 65], multiplier: 1.2 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Nasal Foreign Body',
        baseRate: 0.05,
        ageModifiers: [{ range: [1, 5], multiplier: 4.0 }],
        genderModifier: { male: 1.2, female: 1.0 },
      },
      {
        diagnosis: 'Epistaxis',
        baseRate: 0.05,
        ageModifiers: [
          { range: [0, 10], multiplier: 1.5 },
          { range: [60, 100], multiplier: 1.5 },
        ],
        genderModifier: { male: 1.2, female: 1.0 },
      },
      {
        diagnosis: 'Nasal Polyps',
        baseRate: 0.03,
        ageModifiers: [{ range: [30, 60], multiplier: 1.5 }],
        genderModifier: { male: 1.3, female: 1.0 },
      },
      {
        diagnosis: 'Deviated Septum',
        baseRate: 0.02,
        ageModifiers: [{ range: [15, 50], multiplier: 1.2 }],
        genderModifier: { male: 1.2, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // FOOT / TOE PAIN — Gout, Plantar Fasciitis, Fracture
  // ================================================================
  {
    complaint: 'foot/toe pain',
    triggerPatterns: [
      /\b(toe|foot|heel|feet|ankle).*(pain|hurt|swell|throb|kill|red|hot|stab|swollen)/i,
      /\b(pain|hurt|swell|throb|kill|stab|swollen).*(toe|foot|heel|feet|ankle)/i,
      /gout|podagra|plantar\s*fasci/i,
      /big\s*toe.*(swollen|red|hot|hurt|kill|cant)/i,
    ],
    diagnoses: [
      { diagnosis: 'Gout', baseRate: 0.25, ageModifiers: [{ range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 3.0, female: 0.5 } },
      { diagnosis: 'Plantar Fasciitis', baseRate: 0.25, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.2 } },
      { diagnosis: 'Stress Fracture', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.3 } },
      { diagnosis: 'Ankle Sprain', baseRate: 0.15, ageModifiers: [{ range: [15, 40], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Morton Neuroma', baseRate: 0.05, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 0.5, female: 2.0 } },
      { diagnosis: 'Peripheral Neuropathy', baseRate: 0.05, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Septic Arthritis', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // EYE PAIN — Corneal Abrasion, Conjunctivitis, Glaucoma
  // ================================================================
  {
    complaint: 'eye pain',
    triggerPatterns: [
      /eye.*(pain|hurt|poke|scratch|stuck|water|tear|sting|burn|red|swol)/i,
      /(pain|hurt|poke|scratch|stuck|something).*(in\s*my\s*)?eye/i,
      /corneal|conjunctiv|red\s*eye/i,
      /cant\s*open.*eye|eye.*wont\s*open|eye.*tearing/i,
    ],
    diagnoses: [
      { diagnosis: 'Corneal Abrasion', baseRate: 0.25, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Conjunctivitis', baseRate: 0.25, ageModifiers: [{ range: [0, 10], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Foreign Body', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Acute Angle Closure Glaucoma', baseRate: 0.05, ageModifiers: [{ range: [50, 80], multiplier: 2.0 }], genderModifier: { male: 0.7, female: 1.5 } },
      { diagnosis: 'Uveitis', baseRate: 0.05, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Orbital Cellulitis', baseRate: 0.03, ageModifiers: [{ range: [0, 10], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // TINGLING / NUMBNESS — Neuropathy, Carpal Tunnel, Radiculopathy
  // ================================================================
  {
    complaint: 'tingling/numbness',
    triggerPatterns: [
      /tingl|numb|pins\s*and\s*needles|paresthes/i,
      /cant\s*feel|losing\s*feeling|dead.*hand|dead.*foot|dead.*fingers/i,
      /hand.*numb|numb.*hand|fingers?\s*numb|numb.*fingers?|feet?\s*numb|numb.*feet?|toes?\s*numb/i,
    ],
    diagnoses: [
      { diagnosis: 'Peripheral Neuropathy', baseRate: 0.30, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Carpal Tunnel Syndrome', baseRate: 0.25, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 0.6, female: 1.5 } },
      { diagnosis: 'Cervical Radiculopathy', baseRate: 0.10, ageModifiers: [{ range: [40, 60], multiplier: 1.3 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Stroke', baseRate: 0.05, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Multiple Sclerosis', baseRate: 0.03, ageModifiers: [{ range: [20, 50], multiplier: 2.0 }], genderModifier: { male: 0.5, female: 2.0 } },
      { diagnosis: 'Vitamin B12 Deficiency', baseRate: 0.05, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // EXTREMITY IMMOBILITY — Nursemaid Elbow, Fracture
  // ================================================================
  {
    complaint: 'extremity immobility',
    triggerPatterns: [
      /wont\s*use.*(arm|hand|leg)|arm.*still|cant\s*move.*(arm|hand|wrist|elbow)/i,
      /holding.*(arm|hand).*still|cries.*move.*arm|pulled.*hand|yanked/i,
      /arm.*limp|wont\s*lift.*(arm|hand)|refuse.*use.*(arm|hand)/i,
    ],
    diagnoses: [
      { diagnosis: 'Nursemaid Elbow', baseRate: 0.40, ageModifiers: [{ range: [1, 5], multiplier: 2.0 }, { range: [6, 100], multiplier: 0.1 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Fracture', baseRate: 0.25, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Soft Tissue Injury', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Joint Dislocation', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Septic Arthritis', baseRate: 0.03, ageModifiers: [{ range: [0, 5], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // SEIZURE — needs its own category so it doesn't fall to "Needs in-person"
  // ================================================================
  {
    complaint: 'seizure',
    triggerPatterns: [
      /\bseizure|convuls|shaking.*episode|shook.*uncontroll|\bfit\b|epileps/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Seizure',
        baseRate: 0.40,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Febrile Seizure',
        baseRate: 0.20,
        ageModifiers: [
          { range: [0, 6], multiplier: 3.0 },
          { range: [7, 17], multiplier: 0.3 },
          { range: [18, 100], multiplier: 0 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'New-Onset Epilepsy',
        baseRate: 0.15,
        ageModifiers: [
          { range: [0, 20], multiplier: 1.5 },
          { range: [60, 100], multiplier: 1.3 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Syncope',
        baseRate: 0.10,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Alcohol Withdrawal Seizure',
        baseRate: 0.08,
        ageModifiers: [{ range: [25, 65], multiplier: 1.5 }],
        genderModifier: { male: 1.5, female: 0.6 },
      },
      {
        diagnosis: 'Hypoglycemia',
        baseRate: 0.05,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Stroke',
        baseRate: 0.05,
        ageModifiers: [{ range: [55, 100], multiplier: 2.0 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Meningitis',
        baseRate: 0.03,
        ageModifiers: [{ range: [0, 5], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // PEDIATRIC ABDOMINAL PAIN — intussusception, FB ingestion, etc.
  // ================================================================
  {
    complaint: 'pediatric abdominal',
    triggerPatterns: [
      /(my|the)\s*(baby|infant|toddler|child|son|daughter|kid|\d+\s*(year|month|yr|mo)).*(belly|stomach|abdomin|vomit|throw.*up|tummy)/i,
      /currant\s*jelly|pulling.*legs.*belly|intussuscept/i,
      /swallow.*(magnet|battery|coin|button|foreign)/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Gastroenteritis',
        baseRate: 0.45,
        ageModifiers: [{ range: [0, 12], multiplier: 1.3 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Intussusception',
        baseRate: 0.10,
        ageModifiers: [
          { range: [0, 3], multiplier: 3.0 },
          { range: [4, 7], multiplier: 1.0 },
          { range: [18, 100], multiplier: 0.05 },
        ],
        genderModifier: { male: 1.5, female: 0.7 },
      },
      {
        diagnosis: 'Appendicitis',
        baseRate: 0.12,
        ageModifiers: [
          { range: [5, 18], multiplier: 1.5 },
          { range: [0, 4], multiplier: 0.3 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Foreign Body Ingestion',
        baseRate: 0.08,
        ageModifiers: [
          { range: [1, 6], multiplier: 2.5 },
          { range: [18, 100], multiplier: 0.1 },
        ],
        genderModifier: { male: 1.3, female: 0.8 },
      },
      {
        diagnosis: 'Constipation',
        baseRate: 0.15,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Mesenteric Adenitis',
        baseRate: 0.08,
        ageModifiers: [{ range: [5, 15], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Pyloric Stenosis',
        baseRate: 0.04,
        ageModifiers: [
          { range: [0, 1], multiplier: 3.0 },
          { range: [2, 100], multiplier: 0 },
        ],
        genderModifier: { male: 3.0, female: 0.3 },
      },
      {
        diagnosis: 'UTI',
        baseRate: 0.06,
        ageModifiers: [],
        genderModifier: { male: 0.5, female: 1.8 },
      },
    ],
  },

  // ================================================================
  // PEDIATRIC RESPIRATORY (stridor, barky cough, wheeze in age < 12)
  // ================================================================
  {
    complaint: 'pediatric respiratory',
    triggerPatterns: [
      /barky.*cough|bark.*cough|seal.*cough|cough.*bark|cough.*seal/i,
      /\bstridor\b|\bcroup\b/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Croup',
        baseRate: 0.55,
        ageModifiers: [
          { range: [0, 6], multiplier: 2.0 },
          { range: [7, 12], multiplier: 1.0 },
          { range: [18, 100], multiplier: 0.02 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'Viral URI',
        baseRate: 0.20,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Bronchiolitis',
        baseRate: 0.10,
        ageModifiers: [
          { range: [0, 2], multiplier: 3.0 },
          { range: [3, 12], multiplier: 0.3 },
          { range: [18, 100], multiplier: 0 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Epiglottitis',
        baseRate: 0.03,
        ageModifiers: [{ range: [2, 7], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Foreign Body Aspiration',
        baseRate: 0.05,
        ageModifiers: [{ range: [1, 4], multiplier: 2.0 }],
        genderModifier: { male: 1.3, female: 0.9 },
      },
    ],
  },

  // ================================================================
  // KNEE PAIN
  // ================================================================
  {
    complaint: 'knee pain',
    triggerPatterns: [
      /\bknee\b(?!s?\s*to\s*(?:chest|stomach|belly)).*(?:pain|hurt|swell|ache|pop|lock|buckl|gave\s*out|stiff|injur|twist|torn)/i,
      /(?:pain|hurt|swell|ache|pop|lock|buckl|stiff|injur|twist|torn).*\bknee\b(?!s?\s*to\s*(?:chest|stomach|belly))/i,
      /\bknee\b\s*(?:replacement|surgery|swollen|red|warm|hot|clicking)/i,
    ],
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
    triggerPatterns: [
      /chest\s*(pain|pressure|tightness|heaviness|discomfort|hurt|ache|crush|squeez)/i,
      /(pain|hurt|ache|pressure|tight|crush|squeez|heavy).*chest/i,
      /chest.*(elephant|sitting|weight|band|grip|vise)/i,
    ],
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
    triggerPatterns: [
      /abdomen|abdominal|stomach\s*(pain|hurt|ache|kill)|belly\s*(pain|hurt|ache|kill)|tummy\s*(pain|hurt|ache)|stomach\s*is\s*killing|belly\s*is\s*killing|epigastri|upper\s*(middle\s*)?abdomen|periumbili|suprapubic|lower\s*abdomen|abdominal\s*pain/i,
      /stomach.*(mess|cramp|upset|churning)|runnin.*to.*toilet|toilet.*every|pukin.*diarrhea|diarrhea.*pukin|throwing.*up.*diarrhea/i,
      /belly.*(bloat|hard|distend|huge)|nauseous.*belly|belly.*nauseous|gut.*(hurt|pain|kill|cramp)/i,
    ],
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

  // (sore throat moved before dysphagia — see line ~679)

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
    triggerPatterns: [/urin|burn.*pee|pee.*burn|painful.*urinat|uti|bladder|dysuria|frequency|urgency.*urin|constant.*pee|gotta\s*pee|cant\s*stop\s*pee|burns.*every.*time|urge\s*to\s*pee|peeing.*lot|pee.*every|hurts\s*to\s*pee/i],
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
    triggerPatterns: [/dizz|vertigo|lightheaded|room\s*spinning|everything.*spinn|spinnin|turn.*head.*spin|roll.*over.*spin|rooms?\s*go.*around|go.*around.*around|world.*spinning|off\s*balance/i],
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
  // SKIN INFECTION / REDNESS — must come before fever so "skin red warm + fever" routes here
  // ================================================================
  {
    complaint: 'skin infection/redness',
    triggerPatterns: [
      /skin.*(red|warm|tender|infect|swollen|spread)|cellulitis|abscess|redness.*(spread|getting\s*bigger)/i,
      /red.*hot.*swollen|warm.*tender|bug\s*bite.*red|cut.*(infect|red|swol)/i,
      /eye.*(swollen|puffy|bulg).*fever|fever.*eye.*(swollen|puffy|bulg)|eye.*swollen\s*shut/i,
    ],
    diagnoses: [
      { diagnosis: 'Cellulitis', baseRate: 0.40, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Abscess', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Contact Dermatitis', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Orbital Cellulitis', baseRate: 0.05, ageModifiers: [{ range: [0, 10], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Erysipelas', baseRate: 0.05, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'DVT', baseRate: 0.03, ageModifiers: [{ range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.2 } },
    ],
  },

  // ================================================================
  // FEVER — expanded with conditions that commonly present with fever as lead symptom
  // ================================================================
  {
    complaint: 'fever',
    triggerPatterns: [/fever|febrile|chills|temperature/i],
    diagnoses: [
      {
        diagnosis: 'Viral infection',
        baseRate: 0.35,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'UTI',
        baseRate: 0.08,
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
        diagnosis: 'Gastroenteritis',
        baseRate: 0.08,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Bacterial infection',
        baseRate: 0.06,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Acute Otitis Media',
        baseRate: 0.05,
        ageModifiers: [{ range: [0, 5], multiplier: 3.0 }],
        genderModifier: { male: 1.1, female: 1.0 },
      },
      {
        diagnosis: 'Sepsis',
        baseRate: 0.03,
        ageModifiers: [{ range: [65, 100], multiplier: 2.5 }],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Cellulitis',
        baseRate: 0.03,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Hand Foot and Mouth Disease',
        baseRate: 0.02,
        ageModifiers: [{ range: [0, 7], multiplier: 4.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
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
  // ALTERED MENTAL STATUS / CONFUSION — encephalopathies, DTs, intoxication, metabolic
  // ================================================================
  {
    complaint: 'altered mental status',
    triggerPatterns: [
      /confus|altered\s*mental|disoriented|not\s*making\s*sense|acting\s*(weird|strange|funny|crazy|different)/i,
      /seeing\s*things|hallucin|deliri|out\s*of\s*it|barely\s*conscious|wont\s*wake/i,
      /cant\s*think\s*straight|brain\s*fog|foggy|incoherent|garbled|rambling/i,
    ],
    diagnoses: [
      { diagnosis: 'Delirium Tremens', baseRate: 0.08, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Hepatic Encephalopathy', baseRate: 0.06, ageModifiers: [{ range: [45, 80], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Wernicke Encephalopathy', baseRate: 0.04, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Hypertensive Encephalopathy', baseRate: 0.04, ageModifiers: [{ range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 1.1, female: 1.0 } },
      { diagnosis: 'Toxic/Metabolic Encephalopathy', baseRate: 0.10, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Substance Intoxication', baseRate: 0.12, ageModifiers: [{ range: [15, 50], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Sepsis', baseRate: 0.06, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Stroke', baseRate: 0.05, ageModifiers: [{ range: [55, 100], multiplier: 2.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Hypoglycemia', baseRate: 0.06, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'UTI', baseRate: 0.05, ageModifiers: [{ range: [70, 100], multiplier: 3.0 }], genderModifier: { male: 0.4, female: 1.8 } },
      { diagnosis: 'Meningitis', baseRate: 0.03, ageModifiers: [{ range: [0, 5], multiplier: 2.0 }, { range: [15, 25], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // MANIA / AGITATION — bipolar mania, psychosis, stimulant intoxication
  // ================================================================
  {
    complaint: 'mania/agitation',
    triggerPatterns: [
      /manic|mania|racing\s*thoughts|cant\s*stop\s*talking|not\s*sleeping\s*for\s*days|havent\s*slept\s*in\s*days/i,
      /grandiose|thinks?\s*(hes?|shes?)\s*(god|invincible|special)|spending\s*spree|reckless/i,
      /psychos|psychotic|hearing\s*voices|voices\s*in\s*my\s*head|paranoi|delusional/i,
      /agitat|combative|violent|out\s*of\s*control|climbing\s*the\s*walls|wired/i,
    ],
    diagnoses: [
      { diagnosis: 'Bipolar Disorder — Manic Episode', baseRate: 0.25, ageModifiers: [{ range: [18, 35], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Psychotic Disorder', baseRate: 0.15, ageModifiers: [{ range: [18, 30], multiplier: 2.0 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Stimulant Intoxication', baseRate: 0.15, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Delirium Tremens', baseRate: 0.08, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Serotonin Syndrome', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Thyroid Storm', baseRate: 0.03, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Hyperthyroidism', baseRate: 0.05, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Anti-NMDA Receptor Encephalitis', baseRate: 0.02, ageModifiers: [{ range: [15, 35], multiplier: 2.0 }], genderModifier: { male: 0.3, female: 2.0 } },
    ],
  },

  // ================================================================
  // SUBSTANCE INTOXICATION / OVERDOSE
  // ================================================================
  {
    complaint: 'substance intoxication/overdose',
    triggerPatterns: [
      /overdos|od'd|took\s*too\s*(many|much)|swallowed\s*(pills|bottle)|pill\s*bottle/i,
      /found\s*(him|her|them)\s*(unresponsive|passed\s*out|on\s*the\s*floor)/i,
      /pinpoint\s*pupils|track\s*marks|needle\s*marks|foaming.*mouth|blue\s*lips/i,
      /drunk|wasted|high\s*on|smoked\s*(meth|crack|fentanyl)|snorted|injected|shot\s*up/i,
      /narcan|naloxone|drug\s*use|substance\s*(abuse|use)|intoxicat/i,
    ],
    diagnoses: [
      { diagnosis: 'Opioid Overdose', baseRate: 0.25, ageModifiers: [{ range: [18, 55], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Alcohol Intoxication', baseRate: 0.20, ageModifiers: [{ range: [18, 65], multiplier: 1.0 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Stimulant Intoxication', baseRate: 0.12, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Benzodiazepine Overdose', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.2 } },
      { diagnosis: 'Polypharmacy/Mixed Overdose', baseRate: 0.10, ageModifiers: [{ range: [15, 30], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Acetaminophen Overdose', baseRate: 0.08, ageModifiers: [{ range: [15, 30], multiplier: 1.5 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Serotonin Syndrome', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Neuroleptic Malignant Syndrome', baseRate: 0.02, ageModifiers: [{ range: [20, 60], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
    ],
  },

  // ================================================================
  // WITHDRAWAL SYNDROMES — alcohol, benzo, opioid withdrawal
  // ================================================================
  {
    complaint: 'withdrawal',
    triggerPatterns: [
      /withdraw|detox|quit\s*(drinking|alcohol|drugs|pills|opioid|heroin)/i,
      /dts|delirium\s*tremens|the\s*shakes|shaking.*quit.*drink|tremor.*alcohol/i,
      /havent\s*(had\s*a\s*)?drink\s*in|stopped\s*drinking|last\s*drink/i,
      /dope\s*sick|kicking|cold\s*turkey|ran\s*out\s*of.*(pills|meds|suboxone|methadone)/i,
      /sweating.*shaking.*drinking|seeing\s*things.*quit/i,
    ],
    diagnoses: [
      { diagnosis: 'Alcohol Withdrawal', baseRate: 0.30, ageModifiers: [{ range: [25, 65], multiplier: 1.3 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Delirium Tremens', baseRate: 0.10, ageModifiers: [{ range: [30, 65], multiplier: 1.3 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Opioid Withdrawal', baseRate: 0.20, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Benzodiazepine Withdrawal', baseRate: 0.10, ageModifiers: [{ range: [25, 70], multiplier: 1.2 }], genderModifier: { male: 1.0, female: 1.1 } },
      { diagnosis: 'Stimulant Withdrawal', baseRate: 0.05, ageModifiers: [{ range: [18, 50], multiplier: 1.3 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Wernicke Encephalopathy', baseRate: 0.04, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Withdrawal Seizure', baseRate: 0.06, ageModifiers: [{ range: [25, 60], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
    ],
  },

  // ================================================================
  // CYCLIC VOMITING / CANNABINOID HYPEREMESIS
  // ================================================================
  {
    complaint: 'cyclic vomiting',
    triggerPatterns: [
      /cannabinoid\s*hyperemesis|chs\b|cannabis.*vomit|weed.*vomit|marijuana.*vomit|pot.*throw/i,
      /hot\s*(shower|bath).*help.*(nausea|vomit)|vomit.*hot\s*(shower|bath)/i,
      /cyclic\s*vomit|episodes?\s*of\s*vomit.*come\s*and\s*go|vomit.*every\s*few\s*(weeks|months)/i,
      /smoke.*(weed|marijuana|pot|cannabis).*sick|daily\s*(smoker|weed|marijuana)/i,
    ],
    diagnoses: [
      { diagnosis: 'Cannabinoid Hyperemesis Syndrome', baseRate: 0.35, ageModifiers: [{ range: [18, 45], multiplier: 2.0 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Cyclic Vomiting Syndrome', baseRate: 0.25, ageModifiers: [{ range: [5, 35], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Gastroparesis', baseRate: 0.10, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.6, female: 1.5 } },
      { diagnosis: 'Gastroenteritis', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Pancreatitis', baseRate: 0.05, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Superior Mesenteric Artery Syndrome', baseRate: 0.02, ageModifiers: [{ range: [15, 30], multiplier: 2.0 }], genderModifier: { male: 0.7, female: 1.5 } },
    ],
  },

  // ================================================================
  // DENTAL / ORAL PAIN
  // ================================================================
  {
    complaint: 'dental/oral pain',
    triggerPatterns: [
      /tooth\s*(pain|hurt|ache|kill|broke|crack|abscess)|toothache/i,
      /dental|jaw\s*(pain|hurt|ache|swell|lock|click|pop)|tmj/i,
      /face.*swollen.*tooth|tooth.*face.*swollen|gum.*(swell|bleed|hurt|abscess|boil)/i,
      /mouth\s*(pain|hurt|sore)|bad\s*tooth|cavity/i,
    ],
    diagnoses: [
      { diagnosis: 'Dental Abscess', baseRate: 0.30, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Dental Caries', baseRate: 0.25, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'TMJ Disorder', baseRate: 0.15, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.6, female: 1.5 } },
      { diagnosis: 'Periapical Abscess', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Ludwig Angina', baseRate: 0.02, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Trigeminal Neuralgia', baseRate: 0.03, ageModifiers: [{ range: [50, 80], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Salivary Gland Stone', baseRate: 0.03, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.3, female: 0.8 } },
    ],
  },

  // ================================================================
  // SYNCOPE / FAINTING
  // ================================================================
  {
    complaint: 'syncope',
    triggerPatterns: [
      /faint|passed\s*out|blacked\s*out|lost\s*consciousness|syncop/i,
      /almost\s*(passed\s*out|fainted|blacked)|near\s*faint|nearly\s*passed/i,
      /fell\s*out|dropped|collapsed|went\s*down|hit\s*the\s*floor|woke\s*up\s*on\s*the\s*(floor|ground)/i,
    ],
    diagnoses: [
      { diagnosis: 'Vasovagal Syncope', baseRate: 0.35, ageModifiers: [{ range: [15, 35], multiplier: 1.3 }], genderModifier: { male: 0.8, female: 1.2 } },
      { diagnosis: 'Orthostatic Hypotension', baseRate: 0.15, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cardiac Arrhythmia', baseRate: 0.12, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Aortic Stenosis', baseRate: 0.03, ageModifiers: [{ range: [60, 100], multiplier: 2.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Pulmonary Embolism', baseRate: 0.03, ageModifiers: [{ range: [30, 80], multiplier: 1.2 }], genderModifier: { male: 1.0, female: 1.2 } },
      { diagnosis: 'Seizure', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Hypoglycemia', baseRate: 0.05, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Dehydration', baseRate: 0.05, ageModifiers: [{ range: [0, 5], multiplier: 1.5 }, { range: [70, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // ALLERGIC REACTION (non-anaphylaxis) — hives, angioedema, drug reaction
  // ================================================================
  {
    complaint: 'allergic reaction',
    triggerPatterns: [
      /hives|urticaria|welts|broke\s*out|covered\s*in\s*(bumps|spots|welts)/i,
      /allergic\s*reaction|allergy.*react|react.*allergy|swelling.*(lip|face|tongue|eye)/i,
      /angioedema|lips?\s*(swollen|puffy|swelling)|face\s*(swollen|puffy)/i,
      /rash\s*after.*(med|medicine|pill|drug|antibiotic|food)|took.*and.*rash/i,
    ],
    diagnoses: [
      { diagnosis: 'Urticaria', baseRate: 0.35, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Angioedema', baseRate: 0.15, ageModifiers: [{ range: [30, 60], multiplier: 1.2 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Drug Reaction', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Contact Dermatitis', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Anaphylaxis', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Serum Sickness', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'ACE Inhibitor Angioedema', baseRate: 0.04, ageModifiers: [{ range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // LACERATION / WOUND
  // ================================================================
  {
    complaint: 'laceration/wound',
    triggerPatterns: [
      /cut\s*(my|his|her)?|lacer|gash|slash|sliced|wound/i,
      /bleeding.*(wont|wont|cant)\s*stop|deep\s*cut|stitches|staples/i,
      /glass\s*cut|knife\s*cut|stepped\s*on\s*(nail|glass)|puncture\s*wound/i,
    ],
    diagnoses: [
      { diagnosis: 'Simple Laceration', baseRate: 0.50, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Deep Laceration (tendon/nerve risk)', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Puncture Wound', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Foreign Body Retention', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Wound Infection', baseRate: 0.08, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Tetanus Risk', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // FATIGUE (standalone) — thyroid, anemia, depression, CFS
  // ================================================================
  {
    complaint: 'fatigue',
    triggerPatterns: [
      /exhaust|fatigue|tired\s*all\s*the\s*time|no\s*energy|always\s*tired|wiped\s*out/i,
      /draggin|sluggish|run\s*down|worn\s*out|cant\s*get\s*out\s*of\s*bed|so\s*tired/i,
      /low\s*energy|zero\s*energy|no\s*motivation.*tired/i,
    ],
    diagnoses: [
      { diagnosis: 'Iron Deficiency Anemia', baseRate: 0.15, ageModifiers: [{ range: [15, 45], multiplier: 1.3 }], genderModifier: { male: 0.4, female: 1.8 } },
      { diagnosis: 'Hypothyroidism', baseRate: 0.12, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 0.4, female: 1.8 } },
      { diagnosis: 'Major Depressive Disorder', baseRate: 0.20, ageModifiers: [{ range: [18, 50], multiplier: 1.2 }], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Sleep Apnea', baseRate: 0.10, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.8, female: 0.5 } },
      { diagnosis: 'Diabetes Mellitus', baseRate: 0.06, ageModifiers: [{ range: [40, 100], multiplier: 1.5 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Chronic Fatigue Syndrome', baseRate: 0.05, ageModifiers: [{ range: [20, 50], multiplier: 1.5 }], genderModifier: { male: 0.4, female: 1.8 } },
      { diagnosis: 'Vitamin B12 Deficiency', baseRate: 0.04, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Malignancy', baseRate: 0.03, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.1, female: 1.0 } },
    ],
  },

  // ================================================================
  // STI / SEXUAL HEALTH — discharge, genital lesions, pelvic pain
  // ================================================================
  {
    complaint: 'STI/sexual health',
    triggerPatterns: [
      /discharg.*(penis|vagina|down\s*there)|genital.*(sore|lesion|wart|bump|blister)/i,
      /std|sti|sexually\s*transmitted|burning.*(penis|vagina)|drip/i,
      /sore.*(privates|genitals|down\s*there)|painful\s*urination.*discharg/i,
    ],
    diagnoses: [
      { diagnosis: 'Chlamydia', baseRate: 0.25, ageModifiers: [{ range: [15, 30], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Gonorrhea', baseRate: 0.15, ageModifiers: [{ range: [15, 30], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Genital Herpes', baseRate: 0.15, ageModifiers: [{ range: [18, 40], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Trichomoniasis', baseRate: 0.08, ageModifiers: [{ range: [18, 45], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Bacterial Vaginosis', baseRate: 0.10, ageModifiers: [{ range: [18, 45], multiplier: 1.3 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Syphilis', baseRate: 0.05, ageModifiers: [{ range: [20, 45], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Pelvic Inflammatory Disease', baseRate: 0.05, ageModifiers: [{ range: [18, 35], multiplier: 2.0 }], genderModifier: { male: 0.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // SCROTAL / GROIN (non-torsion) — hernia, epididymitis, hydrocele
  // ================================================================
  {
    complaint: 'scrotal/groin',
    triggerPatterns: [
      /scrot.*(swell|pain|lump|heavy)|epididy|hydrocele/i,
      /groin.*(bulge|lump|hernia|pain|swell)|hernia|inguinal/i,
      /testic.*(swell|lump|heavy).*gradual|gradual.*testic.*(swell|lump)/i,
    ],
    diagnoses: [
      { diagnosis: 'Inguinal Hernia', baseRate: 0.30, ageModifiers: [{ range: [40, 80], multiplier: 1.3 }], genderModifier: { male: 4.0, female: 0.3 } },
      { diagnosis: 'Epididymitis', baseRate: 0.25, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 0.0 } },
      { diagnosis: 'Hydrocele', baseRate: 0.10, ageModifiers: [{ range: [0, 2], multiplier: 2.0 }, { range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 0.0 } },
      { diagnosis: 'Varicocele', baseRate: 0.08, ageModifiers: [{ range: [15, 35], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 0.0 } },
      { diagnosis: 'Testicular Torsion', baseRate: 0.05, ageModifiers: [{ range: [10, 25], multiplier: 3.0 }], genderModifier: { male: 1.0, female: 0.0 } },
      { diagnosis: 'Testicular Cancer', baseRate: 0.02, ageModifiers: [{ range: [15, 35], multiplier: 3.0 }], genderModifier: { male: 1.0, female: 0.0 } },
    ],
  },

  // ================================================================
  // BURNS
  // ================================================================
  {
    complaint: 'burn',
    triggerPatterns: [
      /burn.*(hand|arm|leg|face|foot|skin)|burned\s*(my|his|her)|thermal\s*burn/i,
      /scald|boiling\s*water|hot\s*(water|oil|grease)|steam\s*burn/i,
      /chemical\s*burn|sunburn|sun\s*burn|blister.*(burn|sun)|drain\s*cleaner|acid\s*burn/i,
    ],
    diagnoses: [
      { diagnosis: 'First Degree Burn', baseRate: 0.40, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Second Degree Burn', baseRate: 0.30, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Third Degree Burn', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Chemical Burn', baseRate: 0.05, ageModifiers: [{ range: [18, 65], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Sunburn', baseRate: 0.15, ageModifiers: [{ range: [10, 30], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // BITE / STING / ENVENOMATION
  // ================================================================
  {
    complaint: 'bite/sting',
    triggerPatterns: [
      /\b(bit|bite|bitten)\b|dog\s*bite|cat\s*bite|snake\s*bite|animal\s*bite/i,
      /spider\s*bite|tick\s*bite|tick\s*on\s*me|insect\s*(bite|sting)|bee\s*sting|wasp\s*sting/i,
      /bullseye\s*rash|erythema\s*migrans|red\s*ring.*bite|bite.*red\s*ring/i,
      /stung\s*by|bit\s*by\s*a|animal\s*bite|human\s*bite/i,
    ],
    diagnoses: [
      { diagnosis: 'Insect Bite/Sting', baseRate: 0.35, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Dog/Cat Bite', baseRate: 0.20, ageModifiers: [{ range: [0, 10], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Cellulitis (bite-related)', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Snake Envenomation', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Allergic Reaction to Sting', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Rabies Exposure', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Tick-Borne Illness', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // FOREIGN BODY
  // ================================================================
  {
    complaint: 'foreign body',
    triggerPatterns: [
      /swallow.*(coin|battery|toy|button|marble|magnet|object)/i,
      /stuck.*(in\s*(nose|ear|throat))|something\s*in\s*(nose|ear|throat)/i,
      /ate\s*something|chok.*(on|ing)|fish\s*bone|bone\s*stuck/i,
      /inhaled|aspirat|went\s*down\s*the\s*wrong/i,
    ],
    diagnoses: [
      { diagnosis: 'Esophageal Foreign Body', baseRate: 0.25, ageModifiers: [{ range: [1, 5], multiplier: 3.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Nasal Foreign Body', baseRate: 0.20, ageModifiers: [{ range: [1, 5], multiplier: 4.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Ear Canal Foreign Body', baseRate: 0.15, ageModifiers: [{ range: [1, 8], multiplier: 3.0 }], genderModifier: { male: 1.1, female: 1.0 } },
      { diagnosis: 'Aspirated Foreign Body', baseRate: 0.10, ageModifiers: [{ range: [1, 4], multiplier: 4.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'GI Foreign Body (passing)', baseRate: 0.15, ageModifiers: [{ range: [1, 5], multiplier: 3.0 }], genderModifier: { male: 1.1, female: 1.0 } },
      { diagnosis: 'Button Battery Ingestion', baseRate: 0.03, ageModifiers: [{ range: [1, 5], multiplier: 5.0 }], genderModifier: { male: 1.1, female: 1.0 } },
    ],
  },

  // ================================================================
  // URINARY RETENTION — can't pee
  // ================================================================
  {
    complaint: 'urinary retention',
    triggerPatterns: [
      /cant\s*(pee|urinate|go)|unable\s*to\s*(pee|urinate|void)/i,
      /bladder.*(full|distend|wont\s*empty)|no\s*urine|nothing\s*comes?\s*out/i,
      /havent\s*peed|retent|cathet/i,
    ],
    diagnoses: [
      { diagnosis: 'Benign Prostatic Hyperplasia', baseRate: 0.35, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 0.0 } },
      { diagnosis: 'Acute Urinary Retention', baseRate: 0.20, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Medication-Induced Retention', baseRate: 0.10, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Urethral Stricture', baseRate: 0.05, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 2.0, female: 0.3 } },
      { diagnosis: 'Neurogenic Bladder', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cauda Equina Syndrome', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // TRANSGENDER / GENDER-AFFIRMING CARE — HRT complications, binding injuries
  // ================================================================
  {
    complaint: 'gender-affirming care',
    triggerPatterns: [
      /\b(hrt|hormone\s*(therapy|replacement|treatment)|estrogen|testosterone|spironolactone|lupron)\b.*\b(side\s*effect|problem|issue|concern|complication|pain|swelling|mood|bleed|acne|hair|clot|headache|nausea|weight|tired|angry|emotional)/i,
      /\b(testosterone\s*(shot|injection|gel|patch)|my\s*t\s*shots?|estrogen\s*(pill|patch|injection))\b/i,
      /\b(transition|transitioning|trans\s*(woman|man|female|male|masculine|feminine))\b.*\b(pain|problem|issue|concern|complication|side\s*effect)/i,
      /chest\s*bind.*(pain|hurt|cant\s*breathe|rib|bruise|skin)|bind.*(too\s*tight|rib|breathing)/i,
      /gender\s*dysphori|dysphoria/i,
      /\b(neo\s*vagina|phalloplast|metoidioplast|top\s*surgery|bottom\s*surgery)\b.*(pain|bleed|infect|complicat|problem)/i,
      /\b(my\s*t\s*shots?|testosterone\s*(injection|shot|gel|patch))\b.*(problem|issue|side|pain|mood|acne|hair)/i,
    ],
    diagnoses: [
      { diagnosis: 'HRT Side Effect — Venous Thromboembolism Risk', baseRate: 0.08, ageModifiers: [{ range: [35, 60], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'HRT Side Effect — Mood/Psychiatric', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'HRT Side Effect — Hepatic', baseRate: 0.05, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Testosterone-Induced Polycythemia', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Binding-Related Rib/Chest Pain', baseRate: 0.10, ageModifiers: [{ range: [14, 30], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Binding-Related Skin Breakdown', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Post-Surgical Complication', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Gender Dysphoria (primary presentation)', baseRate: 0.15, ageModifiers: [{ range: [12, 25], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Injection Site Reaction', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // ABUSE / VIOLENCE / TRAUMA SCREENING
  // ================================================================
  {
    complaint: 'abuse/violence',
    triggerPatterns: [
      /\b(hit|punch|kick|choke|strangle|slap|shove|push|beat|threw)\b.*\b(me|him|her|partner|husband|wife|boyfriend|girlfriend|parent|child)/i,
      /\b(partner|husband|wife|boyfriend|girlfriend|spouse)\b.*\b(hit|hurt|abuse|violent|angry|scared|afraid|threat)/i,
      /domestic\s*(violen|abuse)|intimate\s*partner|batter|safe\s*at\s*home|afraid\s*(of|at)\s*home/i,
      /sexual\s*(assault|abuse|attack)|rape|molest|forced\s*(sex|me|him|her)|non\s*consensual/i,
      /child\s*(abuse|neglect)|elder\s*(abuse|neglect)|non\s*accidental\s*trauma|\bNAT\b/i,
      /traffick|exploit|captive|held\s*against/i,
      /bruise.*(different|various|multiple)\s*stage|injury.*doesn'?t\s*match|story\s*doesn'?t\s*(match|add\s*up)/i,
    ],
    diagnoses: [
      { diagnosis: 'Intimate Partner Violence', baseRate: 0.30, ageModifiers: [{ range: [18, 50], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Physical Abuse', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Sexual Assault', baseRate: 0.10, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 0.2, female: 1.8 } },
      { diagnosis: 'Child Abuse / Non-Accidental Trauma', baseRate: 0.10, ageModifiers: [{ range: [0, 5], multiplier: 3.0 }, { range: [6, 17], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Elder Abuse/Neglect', baseRate: 0.08, ageModifiers: [{ range: [65, 100], multiplier: 3.0 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Strangulation Injury', baseRate: 0.05, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Human Trafficking', baseRate: 0.02, ageModifiers: [{ range: [14, 30], multiplier: 2.0 }], genderModifier: { male: 0.4, female: 1.8 } },
    ],
  },

  // ================================================================
  // SEXUAL DYSFUNCTION — ED, dyspareunia, libido, ejaculatory disorders
  // ================================================================
  {
    complaint: 'sexual dysfunction',
    triggerPatterns: [
      /erectile\s*(dysfunction|problem)|cant\s*(get|keep)\s*(it\s+up|an?\s*erect)|impoten/i,
      /pain.*(during|with)\s*(sex|intercourse)|sex\s*(hurt|pain)|dyspareunia|vaginismus/i,
      /low\s*(libido|sex\s*drive|desire)|no\s*(libido|sex\s*drive|desire|interest\s*in\s*sex)/i,
      /premature\s*ejaculat|come\s*too\s*(fast|quick|soon)|vaginal\s*(dry|atrophy)/i,
      /cant\s*perform\s*(in\s*bed|sex|during)|performance\s*anxiety.*sex|problem.*(in\s*the\s*)?bedroom/i,
    ],
    diagnoses: [
      { diagnosis: 'Erectile Dysfunction', baseRate: 0.30, ageModifiers: [{ range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 0.0 } },
      { diagnosis: 'Female Sexual Arousal Disorder', baseRate: 0.10, ageModifiers: [{ range: [30, 60], multiplier: 1.2 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Dyspareunia', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 0.2, female: 1.8 } },
      { diagnosis: 'Vaginismus', baseRate: 0.05, ageModifiers: [{ range: [18, 40], multiplier: 1.5 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Medication-Induced Sexual Dysfunction', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Hypogonadism', baseRate: 0.08, ageModifiers: [{ range: [40, 80], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.5 } },
      { diagnosis: 'Premature Ejaculation', baseRate: 0.08, ageModifiers: [{ range: [18, 40], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 0.0 } },
      { diagnosis: 'Atrophic Vaginitis', baseRate: 0.06, ageModifiers: [{ range: [45, 80], multiplier: 2.0 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Peyronie Disease', baseRate: 0.03, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 0.0 } },
    ],
  },

  // ================================================================
  // ANAL / RECTAL COMPLAINTS — proctitis, condyloma, fissure, abscess
  // ================================================================
  {
    complaint: 'anal/rectal',
    triggerPatterns: [
      /anal\s*(pain|itch|bleed|lump|sore|discharge|wart|fissure|abscess)|rectal\s*(pain|bleed|itch|lump|mass)/i,
      /butt\s*(pain|hurt|itch|lump|bleed)|pain\s*in\s*my\s*(butt|rear|bottom|rectum)/i,
      /something\s*(hanging|sticking)\s*out.*(butt|rear|bottom|rectum)|hemorrhoid|pile/i,
      /proctitis|perianal|perirectal|condyloma/i,
    ],
    diagnoses: [
      { diagnosis: 'Hemorrhoids', baseRate: 0.30, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Anal Fissure', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Perianal/Perirectal Abscess', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Proctitis', baseRate: 0.08, ageModifiers: [{ range: [18, 45], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Condyloma Acuminata', baseRate: 0.05, ageModifiers: [{ range: [18, 40], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Rectal Prolapse', baseRate: 0.04, ageModifiers: [{ range: [60, 100], multiplier: 2.0 }], genderModifier: { male: 0.5, female: 1.5 } },
      { diagnosis: 'Pilonidal Cyst', baseRate: 0.05, ageModifiers: [{ range: [15, 35], multiplier: 2.0 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Colorectal Cancer', baseRate: 0.02, ageModifiers: [{ range: [50, 100], multiplier: 2.5 }], genderModifier: { male: 1.2, female: 0.9 } },
    ],
  },

  // ================================================================
  // PREGNANCY COMPLAINTS (non-emergency) — morning sickness, threatened miscarriage, routine
  // ================================================================
  {
    complaint: 'pregnancy complaints',
    triggerPatterns: [
      /pregnant.*(sick|nausea|vomit|throw|morning|cramp|spotting|pain|tired|swollen)/i,
      /(nausea|vomit|sick|throw|cramp|spotting|bleed).*(pregnant|pregnancy|weeks\s*along)/i,
      /morning\s*sickness|hyperemesis|cant\s*keep\s*(anything|food|water)\s*down.*pregnant/i,
      /think\s*i.*(might|could)\s*be\s*pregnant|missed\s*(my\s*)?period.*cramp/i,
    ],
    diagnoses: [
      { diagnosis: 'Morning Sickness (NVP)', baseRate: 0.35, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Hyperemesis Gravidarum', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Threatened Miscarriage', baseRate: 0.10, ageModifiers: [{ range: [35, 45], multiplier: 1.5 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Ectopic Pregnancy', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Round Ligament Pain', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Gestational Diabetes', baseRate: 0.05, ageModifiers: [{ range: [30, 45], multiplier: 1.5 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Urinary Tract Infection', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Preeclampsia', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // POSTPARTUM — hemorrhage, infection, depression, mastitis, breastfeeding
  // ================================================================
  {
    complaint: 'postpartum',
    triggerPatterns: [
      /postpartum|post\s*partum|after\s*(the\s*)?(baby|birth|deliver|c\s*section)/i,
      /just\s*had\s*(a|my)\s*(baby|c\s*section)/i,
      /had\s*(a|my)\s*baby\s*(and|last|week|month|days?\s*ago)/i,
      /breastfeed.*(pain|hurt|red|lump|fever|hard|clog)|mastitis|breast\s*(infect|abscess|engorg)/i,
      /nursing.*(fever|red|lump|hurt|pain)|breast.*(red|hot|hard).*baby/i,
      /baby\s*blues|cant\s*bond|dont\s*feel\s*connected\s*to\s*(my\s*)?baby/i,
    ],
    diagnoses: [
      { diagnosis: 'Postpartum Depression', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Lactation Mastitis', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Postpartum Endometritis', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Postpartum Hemorrhage', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Wound Infection (C-section)', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Postpartum Preeclampsia', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'DVT/PE (postpartum)', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Breast Abscess', baseRate: 0.04, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Postpartum Psychosis', baseRate: 0.01, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // BREAST COMPLAINTS
  // ================================================================
  {
    complaint: 'breast complaints',
    triggerPatterns: [
      /breast\s*(pain|lump|mass|swell|tender|discharg|red|hot|hard)/i,
      /lump\s*in\s*(my\s*)?breast|found\s*a\s*lump|nipple\s*(discharg|bleed|invert|retract)/i,
      /(pain|hurt|sore)\s*in\s*(my\s*)?breast|breast\s*(is\s*)?(killing|hurting|aching)/i,
    ],
    diagnoses: [
      { diagnosis: 'Fibrocystic Breast Changes', baseRate: 0.30, ageModifiers: [{ range: [25, 50], multiplier: 1.3 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Breast Cyst', baseRate: 0.15, ageModifiers: [{ range: [30, 55], multiplier: 1.3 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Mastitis', baseRate: 0.10, ageModifiers: [{ range: [18, 40], multiplier: 1.5 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Fibroadenoma', baseRate: 0.10, ageModifiers: [{ range: [15, 35], multiplier: 2.0 }], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Breast Cancer', baseRate: 0.05, ageModifiers: [{ range: [45, 100], multiplier: 2.0 }], genderModifier: { male: 0.02, female: 1.0 } },
      { diagnosis: 'Breast Abscess', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 0.0, female: 1.0 } },
      { diagnosis: 'Gynecomastia', baseRate: 0.05, ageModifiers: [{ range: [12, 18], multiplier: 2.0 }, { range: [50, 80], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 0.0 } },
    ],
  },

  // ================================================================
  // PEDIATRIC — COLIC / INCONSOLABLE CRYING INFANT
  // ================================================================
  {
    complaint: 'crying infant',
    triggerPatterns: [
      /baby\s*(wont\s*stop|keeps?)\s*(cry|screaming|fussy)|inconsolable|colic/i,
      /infant\s*(cry|scream|fuss).*hours|hours?\s*of\s*(cry|scream)/i,
      /newborn\s*(cry|scream|fussy)|cant\s*(console|calm|soothe)/i,
    ],
    diagnoses: [
      { diagnosis: 'Colic', baseRate: 0.30, ageModifiers: [{ range: [0, 0.5], multiplier: 3.0 }], genderModifier: { male: 1.1, female: 1.0 } },
      { diagnosis: 'Acute Otitis Media', baseRate: 0.15, ageModifiers: [{ range: [0, 3], multiplier: 2.0 }], genderModifier: { male: 1.1, female: 1.0 } },
      { diagnosis: 'Corneal Abrasion (occult)', baseRate: 0.05, ageModifiers: [{ range: [0, 2], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Hair Tourniquet', baseRate: 0.03, ageModifiers: [{ range: [0, 1], multiplier: 5.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Intussusception', baseRate: 0.03, ageModifiers: [{ range: [0, 3], multiplier: 3.0 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Testicular Torsion (neonatal)', baseRate: 0.02, ageModifiers: [{ range: [0, 1], multiplier: 5.0 }], genderModifier: { male: 1.0, female: 0.0 } },
      { diagnosis: 'Non-Accidental Trauma', baseRate: 0.02, ageModifiers: [{ range: [0, 2], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'GERD', baseRate: 0.10, ageModifiers: [{ range: [0, 1], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Milk Protein Allergy', baseRate: 0.05, ageModifiers: [{ range: [0, 1], multiplier: 3.0 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // PEDIATRIC — DIAPER RASH / PERINEAL SKIN
  // ================================================================
  {
    complaint: 'diaper rash',
    triggerPatterns: [
      /diaper\s*rash|diaper\s*area.*(red|raw|sore|bleed|blister)/i,
      /butt\s*(is\s*)?(red|raw|rash|sore).*baby|baby.*(butt|bottom).*(red|raw|rash)/i,
      /yeast.*(diaper|baby|rash)|candida.*diaper/i,
    ],
    diagnoses: [
      { diagnosis: 'Irritant Contact Diaper Dermatitis', baseRate: 0.50, ageModifiers: [{ range: [0, 2], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Candidal Diaper Dermatitis', baseRate: 0.25, ageModifiers: [{ range: [0, 2], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Bacterial Superinfection', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Perianal Strep', baseRate: 0.03, ageModifiers: [{ range: [0, 5], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Psoriasis (inverse)', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // GERIATRIC — FALLS / RECURRENT FALLS
  // ================================================================
  {
    complaint: 'falls',
    triggerPatterns: [
      /keep\s*(fall|tripp)|fall.*(again|lot|multiple|frequent)|recurrent\s*fall/i,
      /\b(fell|fall)\b.*(dizz|weak|black|trip|unsteady|balance)/i,
      /unsteady.*(feet|gait|walk)|gait\s*(problem|instab|unsteady)|balance\s*problem/i,
      /afraid\s*of\s*falling|fear\s*of\s*fall/i,
    ],
    diagnoses: [
      { diagnosis: 'Polypharmacy/Medication Effect', baseRate: 0.20, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Orthostatic Hypotension', baseRate: 0.15, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Peripheral Neuropathy', baseRate: 0.10, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cardiac Arrhythmia', baseRate: 0.08, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Vision Impairment', baseRate: 0.05, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Vestibular Disorder', baseRate: 0.08, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.2 } },
      { diagnosis: 'Deconditioning/Sarcopenia', baseRate: 0.10, ageModifiers: [{ range: [70, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Normal Pressure Hydrocephalus', baseRate: 0.02, ageModifiers: [{ range: [60, 85], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // ENVIRONMENTAL EXPOSURE — heat, cold, altitude
  // ================================================================
  {
    complaint: 'environmental exposure',
    triggerPatterns: [
      /heat\s*(stroke|exhaust|illness|sick)|been\s*(out\s*)?in\s*the\s*(heat|sun)\s*(all\s*day|too\s*long)/i,
      /hypother|frostbit|frozen|found.*(outside|cold|snow)|exposure\s*to\s*(cold|heat)/i,
      /sun\s*(stroke|poison)|overheated|dehydrat.*heat|hot.*passed\s*out/i,
    ],
    diagnoses: [
      { diagnosis: 'Heat Exhaustion', baseRate: 0.30, ageModifiers: [{ range: [65, 100], multiplier: 1.5 }, { range: [0, 5], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Heat Stroke', baseRate: 0.10, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Hypothermia', baseRate: 0.15, ageModifiers: [{ range: [65, 100], multiplier: 2.0 }, { range: [0, 3], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Frostbite', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Dehydration', baseRate: 0.15, ageModifiers: [{ range: [0, 5], multiplier: 2.0 }, { range: [65, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Rhabdomyolysis (exertional)', baseRate: 0.03, ageModifiers: [{ range: [18, 40], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
    ],
  },

  // ================================================================
  // OCCUPATIONAL INJURY
  // ================================================================
  {
    complaint: 'occupational injury',
    triggerPatterns: [
      /hurt\s*at\s*work|work\s*(injury|accident|comp)|on\s*the\s*job\s*(injury|accident)/i,
      /machine.*(caught|crush|cut|injur)|caught\s*in\s*(a\s*)?machine/i,
      /fell\s*(off|from)\s*(a\s*)?(ladder|scaffold|roof)|construction\s*(accident|injury)/i,
      /farm\s*(injury|accident)|tractor|pto|grain\s*(bin|auger)/i,
      /chemical\s*(splash|expos|burn).*work|work.*chemical/i,
    ],
    diagnoses: [
      { diagnosis: 'Laceration/Crush Injury', baseRate: 0.25, ageModifiers: [], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Fracture', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Soft Tissue Injury/Strain', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Amputation/Degloving', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Chemical Exposure', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Traumatic Brain Injury', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Compartment Syndrome', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Spinal Injury', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // WEIGHT LOSS / APPETITE LOSS — cancer screening, thyroid, eating disorders
  // ================================================================
  {
    complaint: 'weight loss/appetite loss',
    triggerPatterns: [
      /lost\s*\d+\s*(pound|lb|kg).*without\s*(try|diet)|unintentional\s*weight\s*loss/i,
      /losing\s*weight.*not\s*trying|weight\s*keeps?\s*(dropping|falling|going\s*down)/i,
      /no\s*appetite|not\s*hungry|cant\s*eat|wont\s*eat.*\d+\s*(days|weeks|months)/i,
      /clothes?\s*(are|getting)\s*(loose|baggy|big)|skin\s*and\s*bones/i,
    ],
    diagnoses: [
      { diagnosis: 'Malignancy', baseRate: 0.15, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.1, female: 1.0 } },
      { diagnosis: 'Hyperthyroidism', baseRate: 0.10, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Major Depressive Disorder', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Diabetes Mellitus', baseRate: 0.08, ageModifiers: [{ range: [30, 80], multiplier: 1.3 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Eating Disorder', baseRate: 0.08, ageModifiers: [{ range: [12, 30], multiplier: 2.5 }], genderModifier: { male: 0.2, female: 1.8 } },
      { diagnosis: 'Celiac Disease', baseRate: 0.03, ageModifiers: [{ range: [15, 45], multiplier: 1.5 }], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'HIV/AIDS', baseRate: 0.03, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Tuberculosis', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Addison Disease', baseRate: 0.02, ageModifiers: [{ range: [30, 50], multiplier: 1.3 }], genderModifier: { male: 0.8, female: 1.3 } },
    ],
  },

  // ================================================================
  // INSOMNIA / SLEEP COMPLAINTS
  // ================================================================
  {
    complaint: 'insomnia/sleep',
    triggerPatterns: [
      /cant\s*sleep|insomnia|trouble\s*sleeping|not\s*sleeping|havent\s*slept/i,
      /wake\s*up\s*(at\s*night|multiple\s*times|gasping|choking)|waking\s*up\s*a\s*lot/i,
      /snoring.*(loud|terrible|stop.*breath)|stop\s*breathing.*sleep|sleep\s*apnea/i,
    ],
    diagnoses: [
      { diagnosis: 'Insomnia Disorder', baseRate: 0.30, ageModifiers: [{ range: [40, 80], multiplier: 1.3 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Obstructive Sleep Apnea', baseRate: 0.20, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Anxiety Disorder', baseRate: 0.15, ageModifiers: [{ range: [18, 50], multiplier: 1.3 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Major Depressive Disorder', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Restless Leg Syndrome', baseRate: 0.05, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Medication Side Effect', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Hyperthyroidism', baseRate: 0.03, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
    ],
  },

  // ================================================================
  // DEPRESSION / ANXIETY
  // ================================================================
  {
    complaint: 'depression',
    triggerPatterns: [/depress|feeling\s*sad|hopeless|\bmood\b|feeling\s*down|mental\s*health|dont\s*want\s*to\s*live|no\s*reason\s*to\s*live|empty\s*inside/i],
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

  // ================================================================
  // DERMATOLOGIC / RASH — pediatric and adult
  // ================================================================
  {
    complaint: 'rash / skin lesion',
    triggerPatterns: [
      /rash|hive|blister|sore.*mouth|mouth.*sore|honey.*crust|crusty.*sore|itchy.*bump|bump.*itch/i,
      /conjunctivitis|pinkeye|pink\s*eye|eye.*red.*gunk|eye.*discharge|stuck\s*shut/i,
      /chickenpox|chicken\s*pox|varicella|itchy.*blister.*all\s*over/i,
      /impetigo|honey.*sore|golden.*crust/i,
      /hand.*foot.*mouth|sores.*mouth.*blister.*hand|blisters.*palm.*feet/i,
      /shingles|zoster|dermatomal|stripe.*blister|blister.*stripe|one\s*side.*rash/i,
      /cellulitis|skin.*infect|red.*hot.*swollen.*skin|spreading.*redness/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Contact Dermatitis',
        baseRate: 0.25,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Viral Exanthem',
        baseRate: 0.20,
        ageModifiers: [{ range: [0, 10], multiplier: 2.0 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Hand Foot and Mouth Disease',
        baseRate: 0.08,
        ageModifiers: [
          { range: [0, 5], multiplier: 3.0 },
          { range: [6, 12], multiplier: 1.5 },
          { range: [18, 100], multiplier: 0.2 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Varicella (Chickenpox)',
        baseRate: 0.06,
        ageModifiers: [
          { range: [0, 12], multiplier: 2.5 },
          { range: [13, 18], multiplier: 1.5 },
          { range: [19, 100], multiplier: 0.3 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Conjunctivitis',
        baseRate: 0.10,
        ageModifiers: [
          { range: [0, 10], multiplier: 2.0 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Impetigo',
        baseRate: 0.06,
        ageModifiers: [
          { range: [0, 10], multiplier: 3.0 },
          { range: [11, 18], multiplier: 1.0 },
          { range: [19, 100], multiplier: 0.3 },
        ],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Herpes Zoster (Shingles)',
        baseRate: 0.05,
        ageModifiers: [
          { range: [0, 40], multiplier: 0.3 },
          { range: [50, 70], multiplier: 1.5 },
          { range: [70, 100], multiplier: 2.5 },
        ],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Cellulitis',
        baseRate: 0.08,
        ageModifiers: [
          { range: [40, 100], multiplier: 1.3 },
        ],
        genderModifier: { male: 1.2, female: 0.8 },
      },
      {
        diagnosis: 'Allergic Reaction',
        baseRate: 0.10,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'Scabies',
        baseRate: 0.04,
        ageModifiers: [],
        genderModifier: { male: 1.0, female: 1.0 },
      },
    ],
  },

  // ================================================================
  // CONGESTIVE HEART FAILURE — orthopnea / PND / bilateral edema
  // ================================================================
  {
    complaint: 'heart failure symptoms',
    triggerPatterns: [
      /orthopnea|lay.*flat.*breath|cant.*lay.*flat|cant.*lie.*flat|sleep.*flat/i,
      /wake.*gasp|gasp.*night|paroxysmal.*nocturnal/i,
      /legs?\s*swollen.*breath|swollen.*legs?.*breath|edema.*dyspnea/i,
      /legs?\s*swollen.*cant.*lay|swollen.*ankle.*breath/i,
    ],
    diagnoses: [
      {
        diagnosis: 'Congestive Heart Failure',
        baseRate: 0.35,
        ageModifiers: [
          { range: [0, 40], multiplier: 0.2 },
          { range: [50, 70], multiplier: 1.3 },
          { range: [70, 100], multiplier: 2.0 },
        ],
        genderModifier: { male: 1.2, female: 0.9 },
      },
      {
        diagnosis: 'COPD Exacerbation',
        baseRate: 0.15,
        ageModifiers: [
          { range: [50, 100], multiplier: 1.5 },
        ],
        genderModifier: { male: 1.1, female: 0.9 },
      },
      {
        diagnosis: 'Pulmonary Embolism',
        baseRate: 0.08,
        ageModifiers: [{ range: [40, 100], multiplier: 1.3 }],
        genderModifier: { male: 0.9, female: 1.2 },
      },
      {
        diagnosis: 'Pneumonia',
        baseRate: 0.10,
        ageModifiers: [{ range: [60, 100], multiplier: 1.5 }],
        genderModifier: { male: 1.0, female: 1.0 },
      },
      {
        diagnosis: 'DVT',
        baseRate: 0.06,
        ageModifiers: [{ range: [40, 100], multiplier: 1.3 }],
        genderModifier: { male: 0.9, female: 1.2 },
      },
    ],
  },

  // ================================================================
  // NAUSEA / VOMITING — standalone (not part of abdominal pain)
  // ================================================================
  {
    complaint: 'nausea/vomiting',
    triggerPatterns: [
      /nausea|nauseous|queasy|sick\s*to\s*(my|his|her)\s*stomach|feel.*like.*throw/i,
      /vomit|puking|throwing\s*up|cant\s*keep.*down|keep.*throwing\s*up/i,
      /dry\s*heav|retching|gagging/i,
      /projectile\s*vomit|baby.*spit.*up.*forcef|infant.*projectile/i,
    ],
    diagnoses: [
      { diagnosis: 'Gastroenteritis', baseRate: 0.30, ageModifiers: [{ range: [0, 10], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Food Poisoning', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Gastroparesis', baseRate: 0.05, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 0.6, female: 1.5 } },
      { diagnosis: 'Cyclic Vomiting Syndrome', baseRate: 0.03, ageModifiers: [{ range: [5, 15], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Pyloric Stenosis', baseRate: 0.04, ageModifiers: [{ range: [0, 0.5], multiplier: 10.0 }, { range: [1, 100], multiplier: 0.01 }], genderModifier: { male: 4.0, female: 0.3 } },
      { diagnosis: 'Bowel Obstruction', baseRate: 0.05, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Pregnancy (early)', baseRate: 0.05, ageModifiers: [{ range: [15, 45], multiplier: 2.0 }], genderModifier: { male: 0.0, female: 2.0 } },
      { diagnosis: 'Medication Side Effect', baseRate: 0.08, ageModifiers: [{ range: [40, 100], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Intracranial Pathology', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Diabetic Ketoacidosis', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // DIARRHEA — standalone
  // ================================================================
  {
    complaint: 'diarrhea',
    triggerPatterns: [
      /diarrh|loose\s*stool|watery\s*stool|runny\s*stool|liquid\s*poop/i,
      /cant\s*stop\s*(poop|going)|going\s*(to\s*the\s*)?(bathroom|toilet)\s*(a\s*lot|constantly|every)/i,
      /bloody\s*diarrh|mucus.*stool|stool.*mucus/i,
    ],
    diagnoses: [
      { diagnosis: 'Gastroenteritis', baseRate: 0.35, ageModifiers: [{ range: [0, 10], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Food Poisoning', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'C. difficile Infection', baseRate: 0.05, ageModifiers: [{ range: [60, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Inflammatory Bowel Disease', baseRate: 0.05, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Irritable Bowel Syndrome', baseRate: 0.10, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.6, female: 1.4 } },
      { diagnosis: 'Medication Side Effect', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Celiac Disease', baseRate: 0.03, ageModifiers: [{ range: [15, 45], multiplier: 1.5 }], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Traveler\'s Diarrhea', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // CONSTIPATION
  // ================================================================
  {
    complaint: 'constipation',
    triggerPatterns: [
      /constipat|havent\s*(poop|had\s*a\s*bowel)|no\s*bowel\s*movement|cant\s*(go|poop)/i,
      /backed\s*up|impacted|straining\s*to\s*(go|poop)|hard\s*stool/i,
      /bloated.*no.*(poop|bowel)|havent\s*gone.*days/i,
    ],
    diagnoses: [
      { diagnosis: 'Functional Constipation', baseRate: 0.40, ageModifiers: [{ range: [0, 5], multiplier: 1.3 }, { range: [65, 100], multiplier: 1.5 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Medication-Induced Constipation', baseRate: 0.15, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Irritable Bowel Syndrome', baseRate: 0.10, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.6, female: 1.4 } },
      { diagnosis: 'Bowel Obstruction', baseRate: 0.05, ageModifiers: [{ range: [60, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Hypothyroidism', baseRate: 0.05, ageModifiers: [{ range: [40, 70], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Colon Cancer', baseRate: 0.03, ageModifiers: [{ range: [50, 100], multiplier: 2.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Hirschsprung Disease', baseRate: 0.02, ageModifiers: [{ range: [0, 1], multiplier: 10.0 }, { range: [2, 100], multiplier: 0.05 }], genderModifier: { male: 3.0, female: 0.5 } },
    ],
  },

  // ================================================================
  // POISONING / INGESTION — chemical, pediatric, intentional
  // ================================================================
  {
    complaint: 'poisoning/ingestion',
    triggerPatterns: [
      /swallow.*(poison|bleach|cleaner|detergent|battery|coin|magnet|chemical)/i,
      /drank.*(bleach|cleaner|antifreeze|chemical|poison)|ate.*(poison|paint|medication)/i,
      /poison|ingestion|ingest.*toxic|toxic\s*exposure|accidental\s*ingest/i,
      /drain\s*cleaner|lye|acid.*burn.*(mouth|throat|esophag)|caustic/i,
      /child.*got\s*into|kid.*ate|toddler.*swallow|baby.*put.*in.*mouth/i,
      /overdose|took\s*too\s*(many|much)|intentional.*ingest/i,
    ],
    diagnoses: [
      { diagnosis: 'Caustic Ingestion', baseRate: 0.20, ageModifiers: [{ range: [0, 5], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Foreign Body Ingestion', baseRate: 0.15, ageModifiers: [{ range: [0, 5], multiplier: 3.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Medication Overdose', baseRate: 0.20, ageModifiers: [{ range: [15, 30], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Toxic Alcohol Ingestion', baseRate: 0.08, ageModifiers: [{ range: [20, 60], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Plant/Mushroom Poisoning', baseRate: 0.05, ageModifiers: [{ range: [0, 5], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Chemical Exposure', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Esophageal Perforation', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // TB / INFECTIOUS DISEASE — infection control screening
  // ================================================================
  {
    complaint: 'TB/infectious disease',
    triggerPatterns: [
      /tuberc|tb\s*test|tb\s*exposure|tb\s*contact|ppd|quantiferon/i,
      /cough.*(blood|hemoptysis|months|weeks).*(?:weight|sweat|fever)|hemoptysis/i,
      /night\s*sweat.*(?:weight|cough|fever|month)|weight\s*loss.*(?:night\s*sweat|cough|fever)/i,
      /expos.*(tb|tuberc|measles|meningit|hepatit)|contact.*(tb|tuberc)/i,
      /travel.*(africa|asia|india|china|south\s*america|develop).*(?:cough|fever|sick)/i,
      /immigra.*(?:cough|fever|screen)|refugee.*(?:screen|cough|fever)/i,
      /jail|prison|incarcerat|homeless|shelter.*(?:cough|fever|sick|screen)/i,
    ],
    diagnoses: [
      { diagnosis: 'Pulmonary Tuberculosis', baseRate: 0.20, ageModifiers: [{ range: [18, 50], multiplier: 1.3 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Latent TB Infection', baseRate: 0.25, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Community-Acquired Pneumonia', baseRate: 0.15, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'HIV/AIDS', baseRate: 0.05, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Non-Tuberculous Mycobacterial Infection', baseRate: 0.05, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.3 } },
      { diagnosis: 'Lung Malignancy', baseRate: 0.08, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Sarcoidosis', baseRate: 0.05, ageModifiers: [{ range: [20, 40], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.2 } },
    ],
  },

  // ================================================================
  // CANCER SYMPTOMS — lump, mass, unexplained bleeding, B symptoms
  // ================================================================
  {
    complaint: 'cancer symptoms',
    triggerPatterns: [
      /lump.*(?:grow|hard|firm|pain|weeks|months|bigger|neck|armpit|groin|breast)/i,
      /mass.*(?:grow|hard|firm|found|feel|notice|neck|abdomen)/i,
      /swollen\s*(?:gland|lymph|node).*(?:weeks|months|hard|firm|multiple)/i,
      /cancer.*(?:screen|check|worried|concern|family|history|run\s*in)/i,
      /blood.*(?:stool|urine|spit|cough).*(?:weight|sweat|month|losing)/i,
      /(?:unexplain|unintentional).*(?:weight\s*loss|bleed|bruis)/i,
    ],
    diagnoses: [
      { diagnosis: 'Benign Lymphadenopathy', baseRate: 0.25, ageModifiers: [{ range: [0, 20], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Lymphoma', baseRate: 0.08, ageModifiers: [{ range: [15, 35], multiplier: 1.5 }, { range: [55, 80], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Metastatic Carcinoma', baseRate: 0.10, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.1, female: 1.0 } },
      { diagnosis: 'Breast Cancer', baseRate: 0.08, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 0.01, female: 2.0 } },
      { diagnosis: 'Reactive Lymphadenopathy (infectious)', baseRate: 0.15, ageModifiers: [{ range: [0, 30], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Lipoma', baseRate: 0.10, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Thyroid Nodule/Cancer', baseRate: 0.05, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 0.4, female: 1.7 } },
      { diagnosis: 'Leukemia', baseRate: 0.03, ageModifiers: [{ range: [0, 15], multiplier: 2.0 }, { range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Sarcoma', baseRate: 0.02, ageModifiers: [{ range: [10, 30], multiplier: 1.5 }], genderModifier: { male: 1.1, female: 0.9 } },
    ],
  },

  // ================================================================
  // MEDICATION SIDE EFFECTS — drug reactions, adverse effects
  // ================================================================
  {
    complaint: 'medication side effects',
    triggerPatterns: [
      /(?:medicine|medication|pill|drug|rx).*(?:side\s*effect|react|problem|making\s*me|causing|since\s*start)/i,
      /(?:since\s*start|after\s*start|started\s*taking).*(?:medicine|medication|pill|drug|new\s*med)/i,
      /(?:allergic|reaction|broke\s*out|rash|hives|swell|itch).*(?:medicine|medication|pill|drug|antibiotic)/i,
      /(?:statin|metformin|lisinopril|amlodipine|losartan|omeprazole|gabapentin|prednisone).*(?:side|react|problem|caus)/i,
      /drug\s*(?:allergy|reaction|rash|side)|adverse\s*(?:drug|medication)\s*(?:reaction|event|effect)/i,
    ],
    diagnoses: [
      { diagnosis: 'Adverse Drug Reaction', baseRate: 0.30, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 0.9, female: 1.2 } },
      { diagnosis: 'Drug Allergy/Hypersensitivity', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Drug-Induced Rash', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Stevens-Johnson Syndrome/TEN', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Drug-Induced Liver Injury', baseRate: 0.05, ageModifiers: [{ range: [40, 80], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Serotonin Syndrome', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Medication Non-Adherence Effects', baseRate: 0.10, ageModifiers: [{ range: [60, 100], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Drug-Induced QT Prolongation', baseRate: 0.03, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 0.8, female: 1.3 } },
    ],
  },

  // ================================================================
  // JOINT PAIN — general (not already covered by knee/hip/foot)
  // ================================================================
  {
    complaint: 'joint pain (general)',
    triggerPatterns: [
      /(?:joint|joints)\s*(?:hurt|pain|ache|swell|stiff|swollen)|arthritis|arthralgias?/i,
      /(?:wrist|elbow|shoulder|ankle)\s*(?:pain|hurt|swell|swollen|stiff)/i,
      /(?:pain|hurt|swell).*(?:wrist|elbow|shoulder|ankle)/i,
      /multiple.*joint|polyarthr|all\s*my\s*joints/i,
    ],
    diagnoses: [
      { diagnosis: 'Osteoarthritis', baseRate: 0.25, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 0.9, female: 1.2 } },
      { diagnosis: 'Rheumatoid Arthritis', baseRate: 0.08, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 0.4, female: 1.7 } },
      { diagnosis: 'Gout', baseRate: 0.10, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 2.0, female: 0.4 } },
      { diagnosis: 'Tendinitis/Bursitis', baseRate: 0.15, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Reactive Arthritis', baseRate: 0.03, ageModifiers: [{ range: [20, 40], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Septic Arthritis', baseRate: 0.03, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Systemic Lupus Erythematosus', baseRate: 0.03, ageModifiers: [{ range: [15, 45], multiplier: 1.5 }], genderModifier: { male: 0.1, female: 2.0 } },
      { diagnosis: 'Viral Arthritis', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Fibromyalgia', baseRate: 0.05, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Lyme Disease', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // EPISTAXIS / NOSEBLEED
  // ================================================================
  {
    complaint: 'epistaxis',
    triggerPatterns: [
      /nose\s*bleed|nosebleed|bleeding\s*from\s*(my\s*)?(nose|nostril)|epistaxis/i,
      /blood.*(?:nose|nostril)|(?:nose|nostril).*blood|cant\s*stop.*nose.*bleed/i,
    ],
    diagnoses: [
      { diagnosis: 'Anterior Epistaxis (Kiesselbach)', baseRate: 0.60, ageModifiers: [{ range: [0, 15], multiplier: 1.3 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Posterior Epistaxis', baseRate: 0.10, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Hypertension-Related Epistaxis', baseRate: 0.10, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Coagulopathy/Anticoagulant Effect', baseRate: 0.05, ageModifiers: [{ range: [60, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Nasal Foreign Body', baseRate: 0.05, ageModifiers: [{ range: [0, 6], multiplier: 5.0 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Hereditary Hemorrhagic Telangiectasia', baseRate: 0.01, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // SWOLLEN LYMPH NODES
  // ================================================================
  {
    complaint: 'swollen lymph nodes',
    triggerPatterns: [
      /swollen\s*(?:gland|lymph|node)|lymph\s*node|(?:gland|node).*(?:swoll|swell|enlarg|big|lump)/i,
      /lump.*(?:neck|armpit|groin|jaw)|(?:neck|armpit|groin|jaw).*lump/i,
      /(?:hard|firm|tender).*(?:lump|node|gland).*(?:neck|armpit|groin)/i,
    ],
    diagnoses: [
      { diagnosis: 'Reactive Lymphadenopathy (viral)', baseRate: 0.40, ageModifiers: [{ range: [0, 20], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Bacterial Lymphadenitis', baseRate: 0.15, ageModifiers: [{ range: [0, 15], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Mononucleosis (EBV)', baseRate: 0.08, ageModifiers: [{ range: [12, 25], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Lymphoma', baseRate: 0.05, ageModifiers: [{ range: [15, 35], multiplier: 1.5 }, { range: [55, 80], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'HIV/AIDS', baseRate: 0.03, ageModifiers: [{ range: [18, 50], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Tuberculosis (extrapulmonary)', baseRate: 0.03, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Cat Scratch Disease', baseRate: 0.03, ageModifiers: [{ range: [0, 18], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Metastatic Cancer', baseRate: 0.05, ageModifiers: [{ range: [50, 100], multiplier: 2.5 }], genderModifier: { male: 1.1, female: 1.0 } },
    ],
  },

  // ================================================================
  // RECTAL BLEEDING — distinct from anal/rectal pain
  // ================================================================
  {
    complaint: 'rectal bleeding',
    triggerPatterns: [
      /blood.*(?:toilet|paper|wip|stool|poop|bowel)|(?:stool|poop).*blood/i,
      /rectal\s*bleed|bleeding\s*from\s*(?:my\s*)?(?:butt|rectum|bottom|behind|anus)/i,
      /bright\s*red\s*blood.*(?:stool|poop|wip|toilet)|melena|black.*tarry/i,
    ],
    diagnoses: [
      { diagnosis: 'Hemorrhoids', baseRate: 0.40, ageModifiers: [{ range: [30, 70], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Anal Fissure', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Diverticular Bleeding', baseRate: 0.08, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Colorectal Cancer', baseRate: 0.05, ageModifiers: [{ range: [50, 100], multiplier: 2.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Inflammatory Bowel Disease', baseRate: 0.05, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Gastrointestinal Bleeding (upper)', baseRate: 0.05, ageModifiers: [{ range: [50, 100], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Rectal Polyp', baseRate: 0.05, ageModifiers: [{ range: [40, 100], multiplier: 1.5 }], genderModifier: { male: 1.1, female: 0.9 } },
    ],
  },

  // ================================================================
  // HEMATURIA — blood in urine
  // ================================================================
  {
    complaint: 'hematuria',
    triggerPatterns: [
      /blood.*(?:urine|pee|piss)|(?:urine|pee|piss).*blood/i,
      /hematuria|pink\s*(?:urine|pee)|red\s*(?:urine|pee)|peeing\s*blood/i,
    ],
    diagnoses: [
      { diagnosis: 'Urinary Tract Infection', baseRate: 0.30, ageModifiers: [], genderModifier: { male: 0.5, female: 1.6 } },
      { diagnosis: 'Kidney Stone', baseRate: 0.20, ageModifiers: [{ range: [20, 60], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Bladder Cancer', baseRate: 0.05, ageModifiers: [{ range: [55, 100], multiplier: 2.5 }], genderModifier: { male: 2.0, female: 0.5 } },
      { diagnosis: 'Kidney Cancer', baseRate: 0.03, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Prostate Pathology (BPH/Cancer)', baseRate: 0.08, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 2.0, female: 0.0 } },
      { diagnosis: 'Glomerulonephritis', baseRate: 0.05, ageModifiers: [{ range: [5, 30], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Exercise-Induced Hematuria', baseRate: 0.05, ageModifiers: [{ range: [15, 40], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Anticoagulant Effect', baseRate: 0.03, ageModifiers: [{ range: [60, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // SKIN ALLERGY / ECZEMA — itching, hives, allergic skin reactions
  // ================================================================
  {
    complaint: 'skin allergy/eczema',
    triggerPatterns: [
      /eczema|dermatitis|itchy\s*skin|skin\s*itch|itching\s*all\s*over/i,
      /broke\s*out|breaking\s*out|allergic.*skin|skin.*allergic/i,
      /dry.*(?:itchy|flak|crack|patch).*skin|skin.*(?:dry|flak|crack|patch)/i,
      /(?:itch|scratch).*(?:cant\s*stop|all\s*night|crazy|driving\s*me|unbearable)/i,
    ],
    diagnoses: [
      { diagnosis: 'Atopic Dermatitis (Eczema)', baseRate: 0.30, ageModifiers: [{ range: [0, 10], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Contact Dermatitis', baseRate: 0.20, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Urticaria (Hives)', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 0.8, female: 1.2 } },
      { diagnosis: 'Drug Eruption', baseRate: 0.08, ageModifiers: [{ range: [40, 100], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Scabies', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Psoriasis', baseRate: 0.05, ageModifiers: [{ range: [15, 40], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Fungal Infection (tinea)', baseRate: 0.08, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Xerosis (dry skin)', baseRate: 0.08, ageModifiers: [{ range: [65, 100], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // SEASONAL / ENVIRONMENTAL ALLERGIES — hay fever, rhinitis
  // ================================================================
  {
    complaint: 'seasonal/environmental allergies',
    triggerPatterns: [
      /allerg.*(?:season|spring|fall|pollen|dust|mold|cat|dog|pet|trigger)/i,
      /hay\s*fever|allergic\s*rhinitis|sinus.*allerg/i,
      /(?:sneez|runny\s*nose|itchy\s*eye|water.*eye).*(?:every\s*year|season|allerg|pollen)/i,
      /(?:allerg).*(?:sneez|runny|itch|water|congested)/i,
    ],
    diagnoses: [
      { diagnosis: 'Allergic Rhinitis', baseRate: 0.45, ageModifiers: [{ range: [5, 30], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Allergic Conjunctivitis', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Sinusitis', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Asthma', baseRate: 0.08, ageModifiers: [{ range: [5, 25], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Vasomotor Rhinitis', baseRate: 0.05, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Nasal Polyps', baseRate: 0.03, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.3, female: 0.8 } },
    ],
  },

  // ================================================================
  // HAND/WRIST INJURY — specific extremity (common work/sports)
  // ================================================================
  {
    complaint: 'hand/wrist injury',
    triggerPatterns: [
      /(?:hand|wrist|finger|thumb).*(?:hurt|pain|swell|swoll|broke|broken|jammed|crush|smash|caught|cut|lacerat)/i,
      /(?:hurt|pain|swell|broke|jammed|crush|smash|caught|cut).*(?:hand|wrist|finger|thumb)/i,
      /(?:cant|cannot).*(?:move|bend|grip|make\s*a\s*fist).*(?:hand|wrist|finger)/i,
    ],
    diagnoses: [
      { diagnosis: 'Fracture (hand/wrist)', baseRate: 0.20, ageModifiers: [{ range: [50, 100], multiplier: 1.3 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Sprain/Strain', baseRate: 0.25, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Tendon Injury', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Laceration', baseRate: 0.15, ageModifiers: [], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Crush Injury', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Carpal Tunnel Syndrome', baseRate: 0.05, ageModifiers: [{ range: [30, 60], multiplier: 1.5 }], genderModifier: { male: 0.5, female: 1.6 } },
      { diagnosis: 'De Quervain Tenosynovitis', baseRate: 0.03, ageModifiers: [{ range: [25, 50], multiplier: 1.3 }], genderModifier: { male: 0.4, female: 1.7 } },
      { diagnosis: 'Compartment Syndrome', baseRate: 0.02, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // NECK PAIN / STIFF NECK
  // ================================================================
  {
    complaint: 'neck pain',
    triggerPatterns: [
      /neck\s*(?:pain|hurt|ache|stiff|sore|cramp|spasm)|stiff\s*neck/i,
      /(?:pain|hurt|ache|sore).*neck|(?:cant|cannot).*(?:turn|move).*(?:neck|head)/i,
      /whiplash|neck\s*injury|wreck.*neck|accident.*neck/i,
    ],
    diagnoses: [
      { diagnosis: 'Cervical Strain/Sprain', baseRate: 0.35, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cervical Disc Disease', baseRate: 0.15, ageModifiers: [{ range: [35, 60], multiplier: 1.5 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Tension Headache', baseRate: 0.10, ageModifiers: [{ range: [20, 50], multiplier: 1.3 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Meningitis', baseRate: 0.03, ageModifiers: [{ range: [0, 5], multiplier: 2.0 }, { range: [15, 25], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cervical Radiculopathy', baseRate: 0.08, ageModifiers: [{ range: [40, 60], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Torticollis', baseRate: 0.05, ageModifiers: [{ range: [0, 10], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Retropharyngeal Abscess', baseRate: 0.02, ageModifiers: [{ range: [0, 5], multiplier: 3.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Cervical Fracture', baseRate: 0.03, ageModifiers: [{ range: [70, 100], multiplier: 1.5 }], genderModifier: { male: 1.3, female: 0.8 } },
    ],
  },

  // ================================================================
  // SHOULDER PAIN
  // ================================================================
  {
    complaint: 'shoulder pain',
    triggerPatterns: [
      /shoulder\s*(?:pain|hurt|ache|sore|stiff|froze|frozen|pop|click|dislocat)/i,
      /(?:pain|hurt|ache).*shoulder|(?:cant|cannot).*(?:lift|raise|move).*(?:arm|shoulder)/i,
      /rotator\s*cuff|torn.*shoulder|shoulder.*torn/i,
    ],
    diagnoses: [
      { diagnosis: 'Rotator Cuff Injury', baseRate: 0.25, ageModifiers: [{ range: [40, 70], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Shoulder Impingement', baseRate: 0.20, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.1, female: 0.9 } },
      { diagnosis: 'Adhesive Capsulitis (Frozen Shoulder)', baseRate: 0.10, ageModifiers: [{ range: [40, 60], multiplier: 1.5 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Shoulder Dislocation/Subluxation', baseRate: 0.08, ageModifiers: [{ range: [15, 30], multiplier: 1.5 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'AC Joint Injury', baseRate: 0.08, ageModifiers: [{ range: [18, 40], multiplier: 1.3 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Biceps Tendinitis', baseRate: 0.05, ageModifiers: [{ range: [30, 60], multiplier: 1.3 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Fracture (clavicle/humerus)', baseRate: 0.05, ageModifiers: [{ range: [0, 15], multiplier: 1.3 }, { range: [70, 100], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Referred Cardiac Pain', baseRate: 0.03, ageModifiers: [{ range: [50, 100], multiplier: 2.0 }], genderModifier: { male: 1.3, female: 0.8 } },
    ],
  },

  // ================================================================
  // PEDIATRIC FEVER (distinct from adult fever — different priorities)
  // ================================================================
  {
    complaint: 'pediatric fever',
    triggerPatterns: [
      /(?:baby|infant|newborn|child|kid|toddler|son|daughter|my\s*\d+\s*(?:year|month|week)\s*old).*(?:fever|hot|temp|burn\s*up)/i,
      /(?:fever|hot|temp).*(?:baby|infant|newborn|child|kid|toddler|my\s*\d+\s*(?:year|month|week))/i,
    ],
    diagnoses: [
      { diagnosis: 'Viral Upper Respiratory Infection', baseRate: 0.35, ageModifiers: [{ range: [0, 10], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Otitis Media', baseRate: 0.15, ageModifiers: [{ range: [0, 6], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Urinary Tract Infection', baseRate: 0.08, ageModifiers: [{ range: [0, 2], multiplier: 2.0 }], genderModifier: { male: 0.5, female: 1.6 } },
      { diagnosis: 'Pneumonia', baseRate: 0.05, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Meningitis', baseRate: 0.03, ageModifiers: [{ range: [0, 0.25], multiplier: 5.0 }, { range: [0, 2], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Bacteremia/Sepsis', baseRate: 0.03, ageModifiers: [{ range: [0, 0.25], multiplier: 5.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Kawasaki Disease', baseRate: 0.02, ageModifiers: [{ range: [0, 5], multiplier: 3.0 }], genderModifier: { male: 1.3, female: 0.8 } },
      { diagnosis: 'Roseola', baseRate: 0.05, ageModifiers: [{ range: [0, 2], multiplier: 3.0 }], genderModifier: { male: 1.0, female: 1.0 } },
    ],
  },

  // ================================================================
  // GERIATRIC DECONDITIONING / FUNCTIONAL DECLINE
  // ================================================================
  {
    complaint: 'geriatric decline',
    triggerPatterns: [
      /(?:grandm|grandp|elderly|older|senior|aged|nursing\s*home|assisted\s*living).*(?:weak|declin|cant\s*walk|not\s*eating|confused|fall)/i,
      /(?:weak|declin|cant\s*walk|not\s*eating|confused|fail\s*to\s*thrive).*(?:grandm|grandp|elderly|aged|nursing\s*home)/i,
      /(?:getting\s*worse|going\s*downhill|not\s*herself|not\s*himself|failure\s*to\s*thrive)/i,
    ],
    diagnoses: [
      { diagnosis: 'Deconditioning/Frailty', baseRate: 0.20, ageModifiers: [{ range: [70, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Urinary Tract Infection', baseRate: 0.15, ageModifiers: [{ range: [70, 100], multiplier: 1.5 }], genderModifier: { male: 0.7, female: 1.4 } },
      { diagnosis: 'Delirium', baseRate: 0.10, ageModifiers: [{ range: [70, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Medication Adverse Effect/Polypharmacy', baseRate: 0.10, ageModifiers: [{ range: [70, 100], multiplier: 2.0 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Depression', baseRate: 0.08, ageModifiers: [{ range: [70, 100], multiplier: 1.3 }], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Malignancy', baseRate: 0.05, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 1.1, female: 1.0 } },
      { diagnosis: 'Hypothyroidism', baseRate: 0.05, ageModifiers: [{ range: [60, 100], multiplier: 1.5 }], genderModifier: { male: 0.3, female: 1.8 } },
      { diagnosis: 'Heart Failure', baseRate: 0.05, ageModifiers: [{ range: [70, 100], multiplier: 2.0 }], genderModifier: { male: 1.2, female: 0.9 } },
      { diagnosis: 'Subdural Hematoma', baseRate: 0.03, ageModifiers: [{ range: [70, 100], multiplier: 3.0 }], genderModifier: { male: 1.3, female: 0.8 } },
    ],
  },

  // ================================================================
  // SUICIDAL IDEATION / SELF-HARM
  // ================================================================
  {
    complaint: 'suicidal ideation',
    triggerPatterns: [
      /suicid|kill\s*myself|want\s*to\s*die|better\s*off\s*dead|end\s*(my|it\s*all)/i,
      /self\s*harm|cutting\s*myself|hurt\s*myself|overdose.*purpose|took\s*pills\s*to/i,
      /no\s*reason\s*to\s*live|worthless|dont\s*want\s*to\s*(?:be\s*here|wake\s*up|live)/i,
    ],
    diagnoses: [
      { diagnosis: 'Major Depressive Disorder with Suicidal Ideation', baseRate: 0.35, ageModifiers: [{ range: [15, 30], multiplier: 1.3 }], genderModifier: { male: 0.7, female: 1.3 } },
      { diagnosis: 'Bipolar Disorder — Depressive Episode', baseRate: 0.08, ageModifiers: [{ range: [18, 35], multiplier: 1.5 }], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Borderline Personality Disorder', baseRate: 0.08, ageModifiers: [{ range: [18, 35], multiplier: 1.5 }], genderModifier: { male: 0.4, female: 1.7 } },
      { diagnosis: 'PTSD', baseRate: 0.10, ageModifiers: [{ range: [18, 50], multiplier: 1.3 }], genderModifier: { male: 0.8, female: 1.2 } },
      { diagnosis: 'Substance Use Disorder', baseRate: 0.10, ageModifiers: [{ range: [18, 50], multiplier: 1.3 }], genderModifier: { male: 1.5, female: 0.7 } },
      { diagnosis: 'Adjustment Disorder', baseRate: 0.10, ageModifiers: [], genderModifier: { male: 1.0, female: 1.0 } },
      { diagnosis: 'Psychotic Disorder', baseRate: 0.05, ageModifiers: [{ range: [18, 35], multiplier: 1.5 }], genderModifier: { male: 1.2, female: 0.9 } },
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
/**
 * Adult-only diagnoses that are clinically implausible in pediatric patients
 * (age < 18). Hard-excluded from the posterior map so they can't accidentally
 * rank at the top for a child presenting with a complaint. This is a blunt
 * filter intentionally — ageModifiers alone weren't strong enough to prevent
 * e.g. "ACE inhibitor cough" or "COPD exacerbation" from surfacing for a
 * 6-year-old. Keep this list narrow to diagnoses that are either physiologic-
 * ally incompatible with children or virtually never seen.
 */
const ADULT_ONLY_DIAGNOSES: RegExp = new RegExp(
  [
    'COPD',
    'Emphysema',
    'Chronic Bronchitis',
    'ACE inhibitor cough',
    'Statin',
    'Metformin',
    'Cholesterol',
    'Atrial Fibrillation',
    'Endometrial',
    'Cervical Cancer',
    'Atrophic',
    'Hip Osteoarthritis',
    'Trochanteric Bursitis',
    'Osteoarthritis',
    'Colon Cancer',
    'Lung Cancer',
    'Pancreatic Cancer',
    'Prostate',
    'Temporal Arteritis',
    'Polymyalgia Rheumatica',
    'Peptic Ulcer Disease',
    'Abdominal Aortic Aneurysm',
    'Aortic Dissection',
    'Aortic Stenosis',
    'Heart Failure',
    'Hypertensive',
    'Diabetic Nephropathy',
    'Gout',
    'Erectile',
    'Menopausal',
    'Postmenopausal',
    'Hyperosmolar Hyperglycemic',
  ].join('|'),
  'i'
);

/**
 * Pediatric-weighted diagnoses that should be boosted for children (age < 12).
 * A gentle multiplier on top of existing ageModifiers to ensure these rank
 * above adult causes when a child presents with a matching complaint.
 */
const PEDIATRIC_BOOSTED: RegExp = new RegExp(
  ['Croup', 'Bronchiolitis', 'Viral URI', 'Viral Pharyngitis', 'Otitis Media',
   'Gastroenteritis', 'Foreign Body', 'Intussusception', 'Pyloric Stenosis',
   'Febrile Seizure', 'Kawasaki', 'Epiglottitis'].join('|'),
  'i'
);

export function getPreTestProbabilities(
  chiefComplaint: string,
  age: number,
  gender: string
): Map<string, number> {
  const result = new Map<string, number>();
  // Normalize lay language → append medical synonyms so categorizers
  // can match on either the patient's words or the canonical term.
  const cc = normalizeSymptomText(chiefComplaint).toLowerCase();

  // Find matching complaint category
  const matched = PREVALENCE_DATA.find(cp =>
    cp.triggerPatterns.some(p => p.test(cc))
  );

  if (!matched) return result;

  const genderKey = gender?.toLowerCase() === 'female' ? 'female' : 'male';
  const isPediatric = age < 18;

  for (const dx of matched.diagnoses) {
    // Pediatric hard-exclusion for adult-only diagnoses
    if (isPediatric && ADULT_ONLY_DIAGNOSES.test(dx.diagnosis)) continue;

    let prob = dx.baseRate;

    // Apply age modifier (interpolated)
    const ageMul = interpolateAgeMultiplier(age, dx.ageModifiers);
    prob *= ageMul;

    // Apply gender modifier
    const genderMul = dx.genderModifier[genderKey];
    prob *= genderMul;

    // Pediatric boost for age-appropriate diagnoses
    if (isPediatric && PEDIATRIC_BOOSTED.test(dx.diagnosis)) {
      prob *= 1.5;
    }

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
  const cc = normalizeSymptomText(chiefComplaint).toLowerCase();
  return PREVALENCE_DATA.some(cp =>
    cp.triggerPatterns.some(p => p.test(cc))
  );
}
