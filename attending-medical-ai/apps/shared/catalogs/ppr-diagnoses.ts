/**
 * CMS Potentially Preventable Readmission (PPR) Diagnosis Catalog
 *
 * ICD-10-CM codes and categories that CMS uses to evaluate potentially
 * preventable readmissions from skilled nursing facilities.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 8
 * @see CMS SNF Quality Reporting Program
 */

export interface PPRDiagnosisCategory {
  code: string;
  description: string;
  icd10Codes: string[];
  keywords?: string[];
  matchedDiagnosis?: string;
}

/**
 * CMS PPR diagnosis categories with associated ICD-10 code prefixes.
 * A transfer matching any of these categories within 30 days of SNF admission
 * or most recent hospital discharge triggers a PPR quality flag.
 */
export const PPR_DIAGNOSIS_CATEGORIES: PPRDiagnosisCategory[] = [
  // --- Infections ---
  {
    code: 'PPR_PNEUMONIA',
    description: 'Pneumonia',
    icd10Codes: [
      'J12', 'J13', 'J14', 'J15', 'J16', 'J17', 'J18', // Pneumonia
      'J69',  // Pneumonitis due to aspiration
    ],
    keywords: ['pneumonia', 'aspiration pneumonia', 'lung infection'],
  },
  {
    code: 'PPR_UTI',
    description: 'Urinary Tract Infection',
    icd10Codes: [
      'N39.0', // Urinary tract infection, site not specified
      'N30',   // Cystitis
      'N10',   // Acute pyelonephritis
      'N11',   // Chronic pyelonephritis
      'N34',   // Urethritis
    ],
    keywords: ['urinary tract infection', 'uti', 'urosepsis', 'pyelonephritis'],
  },
  {
    code: 'PPR_SEPSIS',
    description: 'Sepsis (urinary or respiratory source)',
    icd10Codes: [
      'A40',   // Streptococcal sepsis
      'A41',   // Other sepsis
      'R65.2', // Severe sepsis
      'R78.81', // Bacteremia
    ],
    keywords: ['sepsis', 'septicemia', 'bacteremia', 'urosepsis'],
  },
  {
    code: 'PPR_WOUND_INFECTION',
    description: 'Wound Infection',
    icd10Codes: [
      'L03',   // Cellulitis and acute lymphangitis
      'L08',   // Other local infections of skin and subcutaneous tissue
      'T81.4', // Infection following a procedure
      'L89',   // Pressure ulcer (with infection)
    ],
    keywords: ['wound infection', 'cellulitis', 'infected wound', 'infected pressure ulcer'],
  },
  {
    code: 'PPR_CDIFF',
    description: 'Clostridioides difficile Infection',
    icd10Codes: [
      'A04.7', // Enterocolitis due to C. difficile
      'A04.71', // Recurrent C. difficile
      'A04.72', // Not specified as recurrent
    ],
    keywords: ['c. difficile', 'c diff', 'cdiff', 'clostridium difficile'],
  },

  // --- Cardiac ---
  {
    code: 'PPR_CHF',
    description: 'Congestive Heart Failure Exacerbation',
    icd10Codes: [
      'I50',   // Heart failure
      'I50.1', // Left ventricular failure
      'I50.2', // Systolic heart failure
      'I50.3', // Diastolic heart failure
      'I50.4', // Combined systolic and diastolic
      'I50.9', // Heart failure, unspecified
      'I11.0', // Hypertensive heart disease with heart failure
      'I13.0', // Hypertensive heart and CKD with heart failure
    ],
    keywords: ['heart failure', 'chf', 'congestive heart failure', 'fluid overload', 'pulmonary edema'],
  },

  // --- Respiratory ---
  {
    code: 'PPR_COPD',
    description: 'COPD Exacerbation',
    icd10Codes: [
      'J44.0', // COPD with acute lower respiratory infection
      'J44.1', // COPD with acute exacerbation
      'J96.0', // Acute respiratory failure
      'J96.9', // Respiratory failure, unspecified
    ],
    keywords: ['copd exacerbation', 'chronic obstructive', 'respiratory failure', 'respiratory distress'],
  },

  // --- Metabolic ---
  {
    code: 'PPR_DEHYDRATION',
    description: 'Dehydration',
    icd10Codes: [
      'E86.0', // Dehydration
      'E86.1', // Hypovolemia
      'E86.9', // Volume depletion, unspecified
    ],
    keywords: ['dehydration', 'volume depletion', 'hypovolemia'],
  },
  {
    code: 'PPR_ELECTROLYTE',
    description: 'Electrolyte Imbalance',
    icd10Codes: [
      'E87.0', // Hyperosmolality and hypernatremia
      'E87.1', // Hypo-osmolality and hyponatremia
      'E87.2', // Acidosis
      'E87.3', // Alkalosis
      'E87.4', // Mixed acid-base disorder
      'E87.5', // Hyperkalemia
      'E87.6', // Hypokalemia
      'E87.7', // Fluid overload
      'E87.8', // Other electrolyte disorders
      'E83.5', // Calcium disorders
    ],
    keywords: ['electrolyte', 'hyponatremia', 'hyperkalemia', 'hypokalemia', 'hypercalcemia'],
  },
  {
    code: 'PPR_HYPOGLYCEMIA',
    description: 'Hypoglycemia',
    icd10Codes: [
      'E16.0', // Drug-induced hypoglycemia
      'E16.1', // Other hypoglycemia
      'E16.2', // Hypoglycemia, unspecified
      'E11.64', // Type 2 diabetes with hypoglycemia
      'E10.64', // Type 1 diabetes with hypoglycemia
    ],
    keywords: ['hypoglycemia', 'low blood sugar', 'insulin reaction'],
  },

  // --- Falls and Injuries ---
  {
    code: 'PPR_FALL',
    description: 'Fall with Injury',
    icd10Codes: [
      'W01', // Fall on same level from slipping/tripping
      'W06', // Fall from bed
      'W07', // Fall from chair
      'W08', // Fall from other furniture
      'W10', // Fall on and from stairs
      'W18', // Other slipping, tripping and stumbling
      'W19', // Unspecified fall
      'S72', // Fracture of femur (hip fracture)
      'S32', // Fracture of lumbar spine/pelvis
      'S42', // Fracture of shoulder and upper arm
    ],
    keywords: ['fall', 'hip fracture', 'femur fracture', 'fell', 'found on floor'],
  },

  // --- Gastrointestinal ---
  {
    code: 'PPR_GI_BLEED',
    description: 'Gastrointestinal Bleeding',
    icd10Codes: [
      'K92.0', // Hematemesis
      'K92.1', // Melena
      'K92.2', // GI hemorrhage, unspecified
      'K25.0', // Acute gastric ulcer with hemorrhage
      'K26.0', // Acute duodenal ulcer with hemorrhage
      'K57.1', // Diverticular disease with perforation/abscess
    ],
    keywords: ['gi bleed', 'gastrointestinal bleeding', 'hematemesis', 'melena', 'rectal bleeding'],
  },

  // --- Medication-Related ---
  {
    code: 'PPR_ADVERSE_DRUG',
    description: 'Adverse Drug Event',
    icd10Codes: [
      'T36', 'T37', 'T38', 'T39', 'T40', 'T41', 'T42', 'T43',
      'T44', 'T45', 'T46', 'T47', 'T48', 'T49', 'T50', // Poisoning by drugs
      'T88.7', // Unspecified adverse effect of drug or medicament
    ],
    keywords: ['adverse drug', 'medication reaction', 'drug toxicity', 'overmedication', 'drug overdose'],
  },

  // --- Skin ---
  {
    code: 'PPR_PRESSURE_INJURY_DETERIORATION',
    description: 'Pressure Injury Deterioration',
    icd10Codes: [
      'L89.1', // Pressure ulcer of back (stage progression)
      'L89.2', // Pressure ulcer of hip
      'L89.3', // Pressure ulcer of buttock
      'L89.5', // Pressure ulcer of ankle
      'L89.6', // Pressure ulcer of heel
    ],
    keywords: ['pressure injury', 'pressure ulcer', 'decubitus', 'wound deterioration', 'stage progression'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function findMatchingCategory(icdCode: string): PPRDiagnosisCategory | null {
  const normalized = icdCode.toUpperCase().replace(/\./g, '');

  for (const category of PPR_DIAGNOSIS_CATEGORIES) {
    for (const code of category.icd10Codes) {
      const normalizedPpr = code.toUpperCase().replace(/\./g, '');
      if (normalized === normalizedPpr || normalized.startsWith(normalizedPpr)) {
        return category;
      }
    }
  }

  return null;
}

export function findMatchingCategoryByKeyword(text: string): PPRDiagnosisCategory[] {
  const lower = text.toLowerCase();
  return PPR_DIAGNOSIS_CATEGORIES.filter((cat) =>
    cat.keywords?.some((kw) => lower.includes(kw.toLowerCase()))
  );
}

export function getAllPprIcdCodes(): string[] {
  return PPR_DIAGNOSIS_CATEGORIES.flatMap((cat) => cat.icd10Codes);
}

export function getCategoryCount(): number {
  return PPR_DIAGNOSIS_CATEGORIES.length;
}
