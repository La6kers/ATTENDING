// ============================================================
// ATTENDING AI — Medication-Diagnosis Interaction Rules
// Likelihood ratios for drug-condition associations
// Used to boost/identify drug-related diagnoses
// ============================================================

export interface MedicationRule {
  /** Regex pattern matching medication name or class */
  pattern: RegExp;
  /** Diagnosis to boost when this medication is present */
  diagnosis: string;
  /** Likelihood ratio — how much more likely this diagnosis is given the medication */
  lr: number;
  /** Evidence text for supportingFindings */
  evidence: string;
}

export const MEDICATION_RULES: MedicationRule[] = [
  // ACE Inhibitors → Cough
  { pattern: /ace\s*inhib|lisinopril|enalapril|ramipril|captopril|benazepril|fosinopril|quinapril|blood\s*pressure\s*med/i,
    diagnosis: 'ACE inhibitor cough', lr: 4.0, evidence: 'Patient on ACE inhibitor — drug-induced cough (LR 4.0)' },
  { pattern: /ace\s*inhib|lisinopril|enalapril|ramipril|captopril|benazepril/i,
    diagnosis: 'Angioedema', lr: 3.0, evidence: 'ACE inhibitor use — risk of angioedema (LR 3.0)' },

  // Statins → Myalgia
  { pattern: /statin|atorvastatin|rosuvastatin|simvastatin|pravastatin|lovastatin|cholesterol\s*med/i,
    diagnosis: 'Statin myopathy', lr: 2.5, evidence: 'Statin use — drug-induced myalgia (LR 2.5)' },
  { pattern: /statin|atorvastatin|rosuvastatin|simvastatin|pravastatin|lovastatin|cholesterol\s*med/i,
    diagnosis: 'Musculoskeletal strain', lr: 1.3, evidence: 'Statin use — consider drug-related muscle pain' },

  // NSAIDs → GI Bleeding / Ulcers
  { pattern: /nsaid|ibuprofen|naproxen|aspirin|meloxicam|diclofenac|celecoxib|pain\s*med.*nsaid/i,
    diagnosis: 'Peptic Ulcer', lr: 3.0, evidence: 'NSAID use — gastropathy risk (LR 3.0)' },
  { pattern: /nsaid|ibuprofen|naproxen|aspirin|meloxicam|diclofenac|celecoxib|pain\s*med.*nsaid/i,
    diagnosis: 'GI bleeding', lr: 2.5, evidence: 'NSAID use — GI bleed risk (LR 2.5)' },
  { pattern: /nsaid|ibuprofen|naproxen|aspirin|meloxicam|diclofenac/i,
    diagnosis: 'Kidney Stone', lr: 1.3, evidence: 'NSAID use — renal effects' },

  // Anticoagulants → Bleeding
  { pattern: /warfarin|coumadin|eliquis|apixaban|xarelto|rivaroxaban|pradaxa|dabigatran|blood\s*thinner|anticoag/i,
    diagnosis: 'GI bleeding', lr: 3.0, evidence: 'Anticoagulant use — bleeding risk (LR 3.0)' },
  { pattern: /warfarin|coumadin|eliquis|apixaban|xarelto|rivaroxaban|pradaxa|dabigatran|blood\s*thinner|anticoag/i,
    diagnosis: 'Intracranial hemorrhage', lr: 2.0, evidence: 'Anticoagulant use — intracranial bleed risk' },

  // Diabetes medications → Hypoglycemia / Lactic acidosis
  { pattern: /metformin|diabetes\s*med/i,
    diagnosis: 'Lactic acidosis', lr: 1.5, evidence: 'Metformin use — rare lactic acidosis risk' },
  { pattern: /insulin|glipizide|glyburide|glimepiride|diabetes\s*med/i,
    diagnosis: 'Hypoglycemia', lr: 2.5, evidence: 'Diabetes medication — hypoglycemia risk (LR 2.5)' },

  // Thyroid medications → Confirms known condition
  { pattern: /levothyroxine|synthroid|thyroid\s*med/i,
    diagnosis: 'Hypothyroidism', lr: 2.0, evidence: 'On thyroid replacement — known hypothyroidism' },

  // Antidepressants → Various
  { pattern: /antidepressant|sertraline|fluoxetine|escitalopram|citalopram|paroxetine|venlafaxine|duloxetine|bupropion|ssri|snri/i,
    diagnosis: 'Major Depressive Disorder', lr: 1.8, evidence: 'On antidepressant — known depression/anxiety history' },
  { pattern: /antidepressant|sertraline|fluoxetine|escitalopram|venlafaxine|duloxetine/i,
    diagnosis: 'Serotonin syndrome', lr: 1.3, evidence: 'SSRI/SNRI use — serotonin syndrome risk if combined' },

  // Opioids → Constipation / Dependence
  { pattern: /opioid|hydrocodone|oxycodone|tramadol|morphine|codeine|fentanyl/i,
    diagnosis: 'Opioid-induced constipation', lr: 3.0, evidence: 'Opioid use — constipation (LR 3.0)' },
  { pattern: /opioid|hydrocodone|oxycodone|tramadol|morphine|codeine|fentanyl/i,
    diagnosis: 'Substance Use Disorder', lr: 1.5, evidence: 'Opioid use — screen for dependence' },

  // Beta blockers → Bradycardia / Fatigue
  { pattern: /beta\s*blocker|metoprolol|atenolol|propranolol|carvedilol|bisoprolol|blood\s*pressure\s*med/i,
    diagnosis: 'Medication side effect', lr: 1.8, evidence: 'Beta blocker — fatigue, bradycardia, dizziness' },
  { pattern: /beta\s*blocker|metoprolol|atenolol|propranolol|carvedilol/i,
    diagnosis: 'Orthostatic hypotension', lr: 1.5, evidence: 'Beta blocker — orthostatic risk' },

  // Diuretics → Electrolyte abnormalities
  { pattern: /diuretic|furosemide|lasix|hydrochlorothiazide|hctz|spironolactone|blood\s*pressure\s*med/i,
    diagnosis: 'Electrolyte abnormality', lr: 2.0, evidence: 'Diuretic use — hypokalemia/hyponatremia risk (LR 2.0)' },
  { pattern: /diuretic|furosemide|lasix|hydrochlorothiazide|hctz/i,
    diagnosis: 'Orthostatic hypotension', lr: 1.5, evidence: 'Diuretic — volume depletion risk' },
  { pattern: /diuretic|furosemide|lasix|hydrochlorothiazide|hctz/i,
    diagnosis: 'Gout', lr: 1.5, evidence: 'Diuretic use — hyperuricemia risk' },

  // PPIs → Infections / Deficiencies
  { pattern: /omeprazole|pantoprazole|lansoprazole|esomeprazole|ppi|proton\s*pump/i,
    diagnosis: 'Vitamin B12 Deficiency', lr: 1.3, evidence: 'Long-term PPI — B12 malabsorption risk' },

  // Corticosteroids → Multiple
  { pattern: /prednisone|prednisolone|dexamethasone|methylprednisolone|steroid/i,
    diagnosis: 'Hyperglycemia', lr: 2.0, evidence: 'Steroid use — glucose elevation' },
  { pattern: /prednisone|prednisolone|dexamethasone|methylprednisolone|steroid/i,
    diagnosis: 'Osteoarthritis', lr: 1.3, evidence: 'Steroid use — osteoporosis/AVN risk' },
];

// ============================================================
// Apply Medication LRs to Bayesian Odds Map
// ============================================================

/**
 * Applies medication-diagnosis likelihood ratios to a Bayesian odds map.
 * Each medication the patient takes can boost specific diagnoses.
 *
 * @param medications - array of medication names/classes from patient
 * @param odds - mutable Map of diagnosis → odds
 * @returns evidence map: diagnosis → evidence strings
 */
export function applyMedicationLikelihoodRatios(
  medications: string[],
  odds: Map<string, number>
): Map<string, string[]> {
  const evidenceMap = new Map<string, string[]>();

  if (!medications || medications.length === 0) return evidenceMap;

  const medText = medications.join(' ');

  for (const rule of MEDICATION_RULES) {
    if (rule.pattern.test(medText)) {
      const currentOdds = odds.get(rule.diagnosis) || 0.01;
      odds.set(rule.diagnosis, currentOdds * rule.lr);

      const evidence = evidenceMap.get(rule.diagnosis) || [];
      evidence.push(rule.evidence);
      evidenceMap.set(rule.diagnosis, evidence);
    }
  }

  return evidenceMap;
}
