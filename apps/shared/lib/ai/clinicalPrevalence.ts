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
  // TRAUMA / FALL / INJURY
  // Routed BEFORE specific body-part patterns so a patient who fell and
  // has hip pain lands on the trauma category (splenic injury, fracture,
  // hemorrhage) rather than the generic hip-pain category.
  // ================================================================
  {
    complaint: 'trauma',
    triggerPatterns: [
      /\b(fell|fall|falling|fallen|slipped|tripped)\b/i,
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
      /flank.*(wave|groin|colick|stone)/i,
      /(wave|groin|colick|stone).*flank/i,
      /renal\s*colic/i,
      /kidney\s*stone/i,
      /\bstone\b.*(pain|flank|side)/i,
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
    triggerPatterns: [/testic|scrotal|groin\s*pain/i],
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
  // DYSPHAGIA / FOOD GETS STUCK — EoE, achalasia, strictures, cancer
  // ================================================================
  {
    complaint: 'dysphagia',
    triggerPatterns: [
      /dysphag|difficulty\s*swallow|hard\s*to\s*swallow|food.*stuck|food.*catch|can'?t\s*swallow|trouble\s*swallowing/i,
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
      /\bear\s*(pain|pull|tugg|ach|infec)|otitis|earache/i,
      /pulling.*ear|tugging.*ear/i,
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
    triggerPatterns: [/abdomen|abdominal|stomach\s*pain|belly\s*pain|tummy|epigastri|upper\s*(middle\s*)?abdomen|periumbili|suprapubic|lower\s*abdomen/i],
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
  const cc = chiefComplaint.toLowerCase();

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
  const cc = chiefComplaint.toLowerCase();
  return PREVALENCE_DATA.some(cp =>
    cp.triggerPatterns.some(p => p.test(cc))
  );
}
