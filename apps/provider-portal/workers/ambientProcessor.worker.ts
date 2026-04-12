/**
 * ambientProcessor.worker.ts
 * Path: apps/provider-portal/workers/ambientProcessor.worker.ts
 *
 * Web Worker script that processes ambient listening terms in a background thread.
 * Performs pattern matching and probability adjustments off the main thread to
 * keep the UI responsive during real-time ambient listening.
 */

// ---------------------------------------------------------------------------
// Types (duplicated here since workers cannot import from the main thread)
// ---------------------------------------------------------------------------

interface Diagnosis {
  id: string;
  name: string;
  probability: number;
}

interface DiagnosisAssociation {
  diagnosisName: string;
  weight: number;
}

interface Adjustment {
  diagnosisId: string;
  delta: number;
  matchedTerm: string;
}

interface NewDiagnosis {
  name: string;
  probability: number;
  matchedTerm: string;
}

interface ProcessBatchPayload {
  terms: string[];
  complaintCategory: string;
  currentDiagnoses: Diagnosis[];
}

interface BatchResultPayload {
  adjustments: Adjustment[];
  newDiagnoses: NewDiagnosis[];
  processingTimeMs: number;
  method: 'worker';
}

// ---------------------------------------------------------------------------
// Ambient Term Pattern Map
// ---------------------------------------------------------------------------

const AMBIENT_TERM_PATTERNS: Record<string, Record<string, DiagnosisAssociation[]>> = {
  headache: {
    throbbing: [
      { diagnosisName: 'Migraine', weight: 0.15 },
      { diagnosisName: 'Tension Headache', weight: 0.05 },
    ],
    aura: [
      { diagnosisName: 'Migraine with Aura', weight: 0.25 },
      { diagnosisName: 'Migraine', weight: 0.10 },
    ],
    nausea: [
      { diagnosisName: 'Migraine', weight: 0.10 },
      { diagnosisName: 'Intracranial Hypertension', weight: 0.05 },
    ],
    photophobia: [
      { diagnosisName: 'Migraine', weight: 0.12 },
      { diagnosisName: 'Meningitis', weight: 0.08 },
    ],
    'worst headache': [
      { diagnosisName: 'Subarachnoid Hemorrhage', weight: 0.20 },
      { diagnosisName: 'Migraine', weight: 0.05 },
    ],
    stiff_neck: [
      { diagnosisName: 'Meningitis', weight: 0.18 },
      { diagnosisName: 'Tension Headache', weight: 0.08 },
    ],
    bilateral: [
      { diagnosisName: 'Tension Headache', weight: 0.15 },
      { diagnosisName: 'Migraine', weight: -0.05 },
    ],
    unilateral: [
      { diagnosisName: 'Migraine', weight: 0.10 },
      { diagnosisName: 'Cluster Headache', weight: 0.12 },
    ],
    tearing: [
      { diagnosisName: 'Cluster Headache', weight: 0.15 },
    ],
    stress: [
      { diagnosisName: 'Tension Headache', weight: 0.12 },
    ],
  },

  chest_pain: {
    crushing: [
      { diagnosisName: 'Acute Coronary Syndrome', weight: 0.20 },
      { diagnosisName: 'Angina Pectoris', weight: 0.10 },
    ],
    radiating: [
      { diagnosisName: 'Acute Coronary Syndrome', weight: 0.15 },
      { diagnosisName: 'Aortic Dissection', weight: 0.08 },
    ],
    pleuritic: [
      { diagnosisName: 'Pulmonary Embolism', weight: 0.15 },
      { diagnosisName: 'Pleuritis', weight: 0.12 },
    ],
    exertional: [
      { diagnosisName: 'Angina Pectoris', weight: 0.18 },
      { diagnosisName: 'Acute Coronary Syndrome', weight: 0.10 },
    ],
    shortness_of_breath: [
      { diagnosisName: 'Pulmonary Embolism', weight: 0.12 },
      { diagnosisName: 'Heart Failure', weight: 0.10 },
      { diagnosisName: 'Acute Coronary Syndrome', weight: 0.08 },
    ],
    palpitations: [
      { diagnosisName: 'Arrhythmia', weight: 0.15 },
      { diagnosisName: 'Anxiety Disorder', weight: 0.08 },
    ],
    sharp: [
      { diagnosisName: 'Pericarditis', weight: 0.14 },
      { diagnosisName: 'Pleuritis', weight: 0.10 },
      { diagnosisName: 'Acute Coronary Syndrome', weight: -0.05 },
    ],
    positional: [
      { diagnosisName: 'Pericarditis', weight: 0.15 },
      { diagnosisName: 'Musculoskeletal', weight: 0.10 },
    ],
  },

  abdominal: {
    cramping: [
      { diagnosisName: 'Irritable Bowel Syndrome', weight: 0.12 },
      { diagnosisName: 'Gastroenteritis', weight: 0.10 },
    ],
    right_lower: [
      { diagnosisName: 'Appendicitis', weight: 0.20 },
    ],
    right_upper: [
      { diagnosisName: 'Cholecystitis', weight: 0.18 },
      { diagnosisName: 'Hepatitis', weight: 0.08 },
    ],
    epigastric: [
      { diagnosisName: 'Peptic Ulcer Disease', weight: 0.15 },
      { diagnosisName: 'Gastritis', weight: 0.12 },
      { diagnosisName: 'Pancreatitis', weight: 0.08 },
    ],
    bloating: [
      { diagnosisName: 'Irritable Bowel Syndrome', weight: 0.10 },
      { diagnosisName: 'Small Bowel Obstruction', weight: 0.06 },
    ],
    vomiting: [
      { diagnosisName: 'Gastroenteritis', weight: 0.12 },
      { diagnosisName: 'Small Bowel Obstruction', weight: 0.10 },
      { diagnosisName: 'Pancreatitis', weight: 0.08 },
    ],
    diarrhea: [
      { diagnosisName: 'Gastroenteritis', weight: 0.15 },
      { diagnosisName: 'Irritable Bowel Syndrome', weight: 0.08 },
    ],
    fatty_food: [
      { diagnosisName: 'Cholecystitis', weight: 0.14 },
    ],
  },

  respiratory: {
    cough: [
      { diagnosisName: 'Upper Respiratory Infection', weight: 0.10 },
      { diagnosisName: 'Pneumonia', weight: 0.08 },
      { diagnosisName: 'Asthma', weight: 0.06 },
    ],
    wheezing: [
      { diagnosisName: 'Asthma', weight: 0.18 },
      { diagnosisName: 'COPD Exacerbation', weight: 0.12 },
    ],
    fever: [
      { diagnosisName: 'Pneumonia', weight: 0.14 },
      { diagnosisName: 'Upper Respiratory Infection', weight: 0.08 },
    ],
    sputum: [
      { diagnosisName: 'Pneumonia', weight: 0.12 },
      { diagnosisName: 'Bronchitis', weight: 0.10 },
    ],
    hemoptysis: [
      { diagnosisName: 'Pulmonary Embolism', weight: 0.15 },
      { diagnosisName: 'Lung Cancer', weight: 0.10 },
      { diagnosisName: 'Pneumonia', weight: 0.05 },
    ],
    dyspnea: [
      { diagnosisName: 'Asthma', weight: 0.10 },
      { diagnosisName: 'COPD Exacerbation', weight: 0.10 },
      { diagnosisName: 'Heart Failure', weight: 0.08 },
    ],
  },

  back_pain: {
    radiating_leg: [
      { diagnosisName: 'Lumbar Radiculopathy', weight: 0.20 },
      { diagnosisName: 'Herniated Disc', weight: 0.15 },
    ],
    numbness: [
      { diagnosisName: 'Lumbar Radiculopathy', weight: 0.15 },
      { diagnosisName: 'Spinal Stenosis', weight: 0.10 },
    ],
    morning_stiffness: [
      { diagnosisName: 'Ankylosing Spondylitis', weight: 0.15 },
      { diagnosisName: 'Degenerative Disc Disease', weight: 0.08 },
    ],
    trauma: [
      { diagnosisName: 'Vertebral Fracture', weight: 0.18 },
      { diagnosisName: 'Muscle Strain', weight: 0.12 },
    ],
    weakness: [
      { diagnosisName: 'Cauda Equina Syndrome', weight: 0.15 },
      { diagnosisName: 'Lumbar Radiculopathy', weight: 0.10 },
    ],
    chronic: [
      { diagnosisName: 'Degenerative Disc Disease', weight: 0.12 },
      { diagnosisName: 'Spinal Stenosis', weight: 0.08 },
    ],
  },

  mental_health: {
    sadness: [
      { diagnosisName: 'Major Depressive Disorder', weight: 0.15 },
      { diagnosisName: 'Adjustment Disorder', weight: 0.08 },
    ],
    anhedonia: [
      { diagnosisName: 'Major Depressive Disorder', weight: 0.18 },
    ],
    insomnia: [
      { diagnosisName: 'Generalized Anxiety Disorder', weight: 0.10 },
      { diagnosisName: 'Major Depressive Disorder', weight: 0.08 },
      { diagnosisName: 'Insomnia Disorder', weight: 0.12 },
    ],
    worry: [
      { diagnosisName: 'Generalized Anxiety Disorder', weight: 0.15 },
      { diagnosisName: 'Adjustment Disorder', weight: 0.06 },
    ],
    panic: [
      { diagnosisName: 'Panic Disorder', weight: 0.20 },
      { diagnosisName: 'Generalized Anxiety Disorder', weight: 0.08 },
    ],
    suicidal: [
      { diagnosisName: 'Major Depressive Disorder', weight: 0.20 },
      { diagnosisName: 'Bipolar Disorder', weight: 0.10 },
    ],
    mania: [
      { diagnosisName: 'Bipolar Disorder', weight: 0.22 },
    ],
  },

  general: {
    fatigue: [
      { diagnosisName: 'Hypothyroidism', weight: 0.08 },
      { diagnosisName: 'Anemia', weight: 0.08 },
      { diagnosisName: 'Major Depressive Disorder', weight: 0.06 },
    ],
    weight_loss: [
      { diagnosisName: 'Hyperthyroidism', weight: 0.10 },
      { diagnosisName: 'Diabetes Mellitus', weight: 0.08 },
      { diagnosisName: 'Malignancy', weight: 0.06 },
    ],
    weight_gain: [
      { diagnosisName: 'Hypothyroidism', weight: 0.12 },
      { diagnosisName: 'Cushing Syndrome', weight: 0.06 },
    ],
    night_sweats: [
      { diagnosisName: 'Lymphoma', weight: 0.10 },
      { diagnosisName: 'Tuberculosis', weight: 0.08 },
      { diagnosisName: 'Hyperthyroidism', weight: 0.06 },
    ],
    swelling: [
      { diagnosisName: 'Heart Failure', weight: 0.10 },
      { diagnosisName: 'Nephrotic Syndrome', weight: 0.08 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Processing Logic
// ---------------------------------------------------------------------------

function processBatch(
  terms: string[],
  complaintCategory: string,
  currentDiagnoses: Diagnosis[]
): { adjustments: Adjustment[]; newDiagnoses: NewDiagnosis[] } {
  const adjustments: Adjustment[] = [];
  const newDiagnosesMap = new Map<string, NewDiagnosis>();

  // Build a lookup of current diagnoses by name (lowercased) for fast matching
  const diagnosisByName = new Map<string, Diagnosis>();
  for (const dx of currentDiagnoses) {
    diagnosisByName.set(dx.name.toLowerCase(), dx);
  }

  // Determine which pattern categories to search: the specific category + general
  const categoriesToSearch: string[] = ['general'];
  if (complaintCategory && AMBIENT_TERM_PATTERNS[complaintCategory]) {
    categoriesToSearch.unshift(complaintCategory);
  }

  for (const term of terms) {
    const normalizedTerm = term.toLowerCase().trim().replace(/\s+/g, '_');

    for (const category of categoriesToSearch) {
      const patterns = AMBIENT_TERM_PATTERNS[category];
      if (!patterns) continue;

      const associations = patterns[normalizedTerm];
      if (!associations) continue;

      for (const assoc of associations) {
        const existingDx = diagnosisByName.get(assoc.diagnosisName.toLowerCase());

        if (existingDx) {
          // Adjust existing diagnosis probability
          adjustments.push({
            diagnosisId: existingDx.id,
            delta: assoc.weight,
            matchedTerm: term,
          });
        } else {
          // Potentially new diagnosis - track highest probability match
          const key = assoc.diagnosisName.toLowerCase();
          const baseProbability = assoc.weight * 100;
          const existing = newDiagnosesMap.get(key);

          if (!existing || existing.probability < baseProbability) {
            newDiagnosesMap.set(key, {
              name: assoc.diagnosisName,
              probability: Math.min(baseProbability, 50), // Cap new diagnoses at 50%
              matchedTerm: term,
            });
          }
        }
      }
    }
  }

  return {
    adjustments,
    newDiagnoses: Array.from(newDiagnosesMap.values()),
  };
}

// ---------------------------------------------------------------------------
// Worker Message Handler
// ---------------------------------------------------------------------------

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type !== 'PROCESS_BATCH') {
    return;
  }

  try {
    const startTime = performance.now();
    const { terms, complaintCategory, currentDiagnoses } = payload as ProcessBatchPayload;

    const { adjustments, newDiagnoses } = processBatch(
      terms,
      complaintCategory,
      currentDiagnoses
    );

    const processingTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    ctx.postMessage({
      type: 'BATCH_RESULT',
      payload: {
        adjustments,
        newDiagnoses,
        processingTimeMs,
        method: 'worker',
      } satisfies BatchResultPayload,
    });
  } catch (error) {
    ctx.postMessage({
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error in ambient processor worker',
      },
    });
  }
});
