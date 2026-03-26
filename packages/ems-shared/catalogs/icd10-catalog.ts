/**
 * ICD-10-CM Diagnosis Code Catalog
 *
 * SNF-relevant ICD-10 codes organized by clinical domain with specificity
 * guidance, documentation requirements, and CMS quality measure linkage.
 *
 * This catalog powers the DiagnosisCodingEngine's Tier 0 rule-based matching.
 * Codes are organized to support "code to highest specificity" — a core
 * CMS compliance requirement that drives reimbursement.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ICD10Entry {
  code: string;
  description: string;
  shortDescription: string;
  category: DiagnosisCategory;
  specificity: 'BILLABLE' | 'NON_BILLABLE_HEADER';
  moreSpecificCodes?: string[]; // Child codes when this is a header
  documentationRequirements?: string[];
  hccCategory?: string; // Hierarchical Condition Category for risk adjustment
  qualityMeasures?: string[]; // CMS quality measures this code triggers
  commonCombinations?: string[]; // Codes frequently coded together
  keywords: string[]; // For text-based matching
  clinicalIndicators?: string[]; // Signs/symptoms/labs that support this code
}

export type DiagnosisCategory =
  | 'CARDIOVASCULAR'
  | 'RESPIRATORY'
  | 'ENDOCRINE'
  | 'INFECTIOUS'
  | 'NEUROLOGICAL'
  | 'MUSCULOSKELETAL'
  | 'GENITOURINARY'
  | 'SKIN_WOUND'
  | 'GASTROINTESTINAL'
  | 'MENTAL_BEHAVIORAL'
  | 'HEMATOLOGICAL'
  | 'METABOLIC'
  | 'INJURY'
  | 'SIGNS_SYMPTOMS'
  | 'PREVENTIVE';

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const ICD10_CATALOG: ICD10Entry[] = [
  // =========================================================================
  // CARDIOVASCULAR
  // =========================================================================
  {
    code: 'I50.20',
    description: 'Unspecified systolic (congestive) heart failure',
    shortDescription: 'Systolic CHF, unspecified',
    category: 'CARDIOVASCULAR',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['I50.21', 'I50.22', 'I50.23'],
    documentationRequirements: [
      'Document systolic vs diastolic vs combined',
      'Document acuity: acute, chronic, or acute-on-chronic',
      'Document EF if known',
      'Document NYHA class if assessed',
    ],
    hccCategory: 'HCC 85',
    qualityMeasures: ['CMS MIPS: Heart Failure'],
    commonCombinations: ['I10', 'I48.91', 'E11.9'],
    keywords: ['heart failure', 'chf', 'congestive', 'systolic', 'reduced ef'],
    clinicalIndicators: ['dyspnea', 'orthopnea', 'edema', 'weight gain', 'elevated BNP', 'reduced EF'],
  },
  {
    code: 'I50.21',
    description: 'Acute systolic (congestive) heart failure',
    shortDescription: 'Acute systolic CHF',
    category: 'CARDIOVASCULAR',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document acute exacerbation', 'Document precipitating cause if known'],
    hccCategory: 'HCC 85',
    keywords: ['acute heart failure', 'acute chf', 'decompensated', 'acute systolic'],
    clinicalIndicators: ['acute dyspnea', 'new edema', 'weight gain', 'elevated BNP', 'pulmonary edema'],
  },
  {
    code: 'I50.22',
    description: 'Chronic systolic (congestive) heart failure',
    shortDescription: 'Chronic systolic CHF',
    category: 'CARDIOVASCULAR',
    specificity: 'BILLABLE',
    hccCategory: 'HCC 85',
    keywords: ['chronic heart failure', 'chronic chf', 'chronic systolic'],
    clinicalIndicators: ['known CHF', 'baseline dyspnea', 'chronic edema management'],
  },
  {
    code: 'I50.23',
    description: 'Acute on chronic systolic (congestive) heart failure',
    shortDescription: 'Acute on chronic systolic CHF',
    category: 'CARDIOVASCULAR',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document both acute exacerbation AND chronic baseline'],
    hccCategory: 'HCC 85',
    keywords: ['acute on chronic', 'chf exacerbation', 'decompensated chronic'],
    clinicalIndicators: ['known CHF with acute worsening', 'increased edema', 'weight gain over baseline'],
  },
  {
    code: 'I50.30',
    description: 'Unspecified diastolic (congestive) heart failure',
    shortDescription: 'Diastolic CHF, unspecified',
    category: 'CARDIOVASCULAR',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['I50.31', 'I50.32', 'I50.33'],
    documentationRequirements: ['Document preserved EF', 'Document acuity'],
    hccCategory: 'HCC 85',
    keywords: ['diastolic heart failure', 'hfpef', 'preserved ejection fraction'],
    clinicalIndicators: ['preserved EF', 'diastolic dysfunction', 'elevated filling pressures'],
  },
  {
    code: 'I10',
    description: 'Essential (primary) hypertension',
    shortDescription: 'Hypertension',
    category: 'CARDIOVASCULAR',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document if controlled or uncontrolled', 'Document current medications'],
    qualityMeasures: ['CMS MIPS: Controlling High Blood Pressure'],
    keywords: ['hypertension', 'high blood pressure', 'htn', 'elevated bp'],
    clinicalIndicators: ['SBP > 130', 'DBP > 80', 'on antihypertensives'],
  },
  {
    code: 'I48.91',
    description: 'Unspecified atrial fibrillation',
    shortDescription: 'Atrial fibrillation',
    category: 'CARDIOVASCULAR',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['I48.0', 'I48.1', 'I48.2', 'I48.11', 'I48.19', 'I48.20', 'I48.21'],
    documentationRequirements: [
      'Document type: paroxysmal, persistent, or permanent',
      'Document anticoagulation status',
      'Document CHA2DS2-VASc score if assessed',
    ],
    hccCategory: 'HCC 96',
    keywords: ['atrial fibrillation', 'afib', 'a-fib', 'irregular rhythm'],
    clinicalIndicators: ['irregular rhythm', 'palpitations', 'on anticoagulation'],
  },

  // =========================================================================
  // ENDOCRINE / DIABETES
  // =========================================================================
  {
    code: 'E11.9',
    description: 'Type 2 diabetes mellitus without complications',
    shortDescription: 'Type 2 DM, uncomplicated',
    category: 'ENDOCRINE',
    specificity: 'BILLABLE',
    documentationRequirements: [
      'ALWAYS code complications if present — E11.9 means NO complications documented',
      'Document A1c result and date',
      'Document current DM medications',
    ],
    hccCategory: 'HCC 19',
    qualityMeasures: ['CMS MIPS: Diabetes HbA1c Control', 'CMS MIPS: Diabetes Eye Exam'],
    keywords: ['diabetes', 'type 2', 'dm2', 't2dm', 'diabetes mellitus'],
    clinicalIndicators: ['elevated glucose', 'elevated A1c', 'on metformin', 'on insulin'],
  },
  {
    code: 'E11.65',
    description: 'Type 2 diabetes mellitus with hyperglycemia',
    shortDescription: 'Type 2 DM with hyperglycemia',
    category: 'ENDOCRINE',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document glucose level or A1c supporting hyperglycemia'],
    hccCategory: 'HCC 18',
    keywords: ['uncontrolled diabetes', 'hyperglycemia', 'high blood sugar', 'elevated glucose'],
    clinicalIndicators: ['glucose > 200', 'A1c > 9%', 'symptoms of hyperglycemia'],
  },
  {
    code: 'E11.42',
    description: 'Type 2 diabetes mellitus with diabetic polyneuropathy',
    shortDescription: 'Type 2 DM with neuropathy',
    category: 'ENDOCRINE',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document neuropathy symptoms', 'Document monofilament or NCS results'],
    hccCategory: 'HCC 18',
    keywords: ['diabetic neuropathy', 'diabetic polyneuropathy', 'tingling feet', 'numbness feet'],
    clinicalIndicators: ['decreased monofilament', 'tingling', 'numbness', 'burning feet'],
  },
  {
    code: 'E11.22',
    description: 'Type 2 diabetes mellitus with diabetic chronic kidney disease',
    shortDescription: 'Type 2 DM with CKD',
    category: 'ENDOCRINE',
    specificity: 'BILLABLE',
    documentationRequirements: ['Also code CKD stage (N18.1-N18.6)', 'Document eGFR and urine albumin'],
    hccCategory: 'HCC 18',
    commonCombinations: ['N18.3', 'N18.4', 'N18.5'],
    keywords: ['diabetic kidney', 'diabetic nephropathy', 'ckd diabetes'],
    clinicalIndicators: ['elevated creatinine', 'decreased eGFR', 'proteinuria', 'microalbuminuria'],
  },

  // =========================================================================
  // RESPIRATORY
  // =========================================================================
  {
    code: 'J44.1',
    description: 'Chronic obstructive pulmonary disease with (acute) exacerbation',
    shortDescription: 'COPD exacerbation',
    category: 'RESPIRATORY',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document acute vs chronic exacerbation', 'Document baseline O2 status'],
    hccCategory: 'HCC 111',
    keywords: ['copd exacerbation', 'copd flare', 'acute copd'],
    clinicalIndicators: ['increased dyspnea', 'increased sputum', 'wheezing', 'decreased O2 sat'],
  },
  {
    code: 'J18.9',
    description: 'Pneumonia, unspecified organism',
    shortDescription: 'Pneumonia NOS',
    category: 'RESPIRATORY',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['J13', 'J14', 'J15.0', 'J15.1', 'J15.9'],
    documentationRequirements: [
      'Code to organism if culture results available',
      'Document aspiration if applicable (J69.0)',
      'Document bilateral vs unilateral if known',
    ],
    keywords: ['pneumonia', 'lung infection', 'respiratory infection'],
    clinicalIndicators: ['fever', 'cough', 'infiltrate on CXR', 'elevated WBC', 'hypoxemia'],
  },
  {
    code: 'J69.0',
    description: 'Pneumonitis due to inhalation of food and vomit',
    shortDescription: 'Aspiration pneumonia',
    category: 'RESPIRATORY',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document aspiration event or risk factors', 'Document swallowing status'],
    keywords: ['aspiration', 'aspiration pneumonia', 'aspiration pneumonitis'],
    clinicalIndicators: ['dysphagia', 'witnessed aspiration', 'recurrent pneumonia', 'dementia patient'],
  },

  // =========================================================================
  // INFECTIOUS
  // =========================================================================
  {
    code: 'N39.0',
    description: 'Urinary tract infection, site not specified',
    shortDescription: 'UTI',
    category: 'GENITOURINARY',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document if catheter-associated (T83.511A)', 'Document organism if known'],
    keywords: ['uti', 'urinary tract infection', 'urinary infection', 'bladder infection'],
    clinicalIndicators: ['dysuria', 'frequency', 'urgency', 'positive UA', 'positive culture'],
  },
  {
    code: 'A41.9',
    description: 'Sepsis, unspecified organism',
    shortDescription: 'Sepsis NOS',
    category: 'INFECTIOUS',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['A41.01', 'A41.02', 'A41.1', 'A41.51', 'A41.52'],
    documentationRequirements: [
      'Code to organism if known',
      'Code severity: sepsis vs severe sepsis (R65.20) vs septic shock (R65.21)',
      'Document source: urinary, respiratory, wound, etc.',
    ],
    hccCategory: 'HCC 2',
    keywords: ['sepsis', 'septicemia', 'systemic infection', 'blood infection'],
    clinicalIndicators: ['fever', 'tachycardia', 'hypotension', 'elevated WBC', 'elevated lactate', 'positive blood culture'],
  },
  {
    code: 'R65.20',
    description: 'Severe sepsis without septic shock',
    shortDescription: 'Severe sepsis',
    category: 'INFECTIOUS',
    specificity: 'BILLABLE',
    documentationRequirements: ['Code underlying infection first', 'Document organ dysfunction'],
    commonCombinations: ['A41.9', 'N17.9'],
    keywords: ['severe sepsis', 'organ dysfunction', 'sepsis with organ failure'],
    clinicalIndicators: ['organ dysfunction', 'AKI', 'elevated lactate', 'altered mental status'],
  },
  {
    code: 'A04.72',
    description: 'Clostridioides difficile colitis, not specified as recurrent',
    shortDescription: 'C. diff colitis',
    category: 'INFECTIOUS',
    specificity: 'BILLABLE',
    keywords: ['c diff', 'c difficile', 'cdiff', 'clostridioides'],
    clinicalIndicators: ['diarrhea', 'positive C diff toxin', 'recent antibiotic use'],
  },

  // =========================================================================
  // NEUROLOGICAL / COGNITIVE
  // =========================================================================
  {
    code: 'F03.90',
    description: 'Unspecified dementia without behavioral disturbance',
    shortDescription: 'Dementia NOS',
    category: 'MENTAL_BEHAVIORAL',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['G30.9', 'F01.50', 'G31.83'],
    documentationRequirements: [
      'Specify type if known: Alzheimer, vascular, Lewy body, etc.',
      'Document severity: mild, moderate, severe',
      'Document behavioral disturbances if present',
    ],
    hccCategory: 'HCC 52',
    keywords: ['dementia', 'cognitive decline', 'memory loss', 'confusion'],
    clinicalIndicators: ['cognitive impairment', 'MMSE < 24', 'MoCA < 26', 'functional decline'],
  },
  {
    code: 'G30.9',
    description: "Alzheimer's disease, unspecified",
    shortDescription: "Alzheimer's disease",
    category: 'NEUROLOGICAL',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['G30.0', 'G30.1', 'G30.8'],
    documentationRequirements: [
      'Document onset: early (G30.0) vs late (G30.1)',
      'Also code dementia due to Alzheimer (F02.80 or F02.81)',
    ],
    hccCategory: 'HCC 51',
    commonCombinations: ['F02.80', 'F02.81'],
    keywords: ['alzheimers', "alzheimer's", 'alzheimer disease'],
    clinicalIndicators: ['progressive cognitive decline', 'memory loss', 'functional impairment'],
  },
  {
    code: 'R41.82',
    description: 'Altered mental status, unspecified',
    shortDescription: 'Altered mental status',
    category: 'SIGNS_SYMPTOMS',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document baseline mental status for comparison', 'Investigate underlying cause'],
    keywords: ['altered mental status', 'ams', 'confusion', 'change in mental status', 'delirium'],
    clinicalIndicators: ['acute confusion', 'disorientation', 'change from baseline', 'lethargy'],
  },

  // =========================================================================
  // SKIN / WOUND
  // =========================================================================
  {
    code: 'L89.153',
    description: 'Pressure ulcer of sacral region, stage 3',
    shortDescription: 'Sacral pressure ulcer, Stage 3',
    category: 'SKIN_WOUND',
    specificity: 'BILLABLE',
    documentationRequirements: [
      'Document exact location',
      'Document stage per NPIAP criteria',
      'Document dimensions (L x W x D)',
      'Document wound bed description',
      'Document treatment plan',
    ],
    hccCategory: 'HCC 157',
    keywords: ['pressure ulcer', 'pressure injury', 'decubitus', 'sacral wound', 'bedsore'],
    clinicalIndicators: ['full thickness skin loss', 'subcutaneous tissue visible', 'sacrum'],
  },
  {
    code: 'L89.154',
    description: 'Pressure ulcer of sacral region, stage 4',
    shortDescription: 'Sacral pressure ulcer, Stage 4',
    category: 'SKIN_WOUND',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document exposed bone/tendon/muscle', 'Document dimensions and undermining'],
    hccCategory: 'HCC 157',
    keywords: ['stage 4 pressure ulcer', 'deep pressure injury', 'sacral stage 4'],
    clinicalIndicators: ['exposed bone', 'exposed tendon', 'exposed muscle', 'deep tissue destruction'],
  },
  {
    code: 'L89.159',
    description: 'Pressure ulcer of sacral region, unspecified stage',
    shortDescription: 'Sacral pressure ulcer, unspecified',
    category: 'SKIN_WOUND',
    specificity: 'BILLABLE',
    documentationRequirements: ['ALWAYS specify stage if possible — unspecified reduces reimbursement'],
    keywords: ['sacral pressure ulcer', 'sacral wound'],
    clinicalIndicators: ['sacral pressure injury'],
  },
  {
    code: 'L03.311',
    description: 'Cellulitis of abdominal wall',
    shortDescription: 'Cellulitis, abdominal',
    category: 'SKIN_WOUND',
    specificity: 'BILLABLE',
    keywords: ['cellulitis', 'skin infection', 'wound infection'],
    clinicalIndicators: ['erythema', 'warmth', 'swelling', 'tenderness', 'fever'],
  },

  // =========================================================================
  // METABOLIC
  // =========================================================================
  {
    code: 'E86.0',
    description: 'Dehydration',
    shortDescription: 'Dehydration',
    category: 'METABOLIC',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document severity', 'Document clinical signs', 'Document fluid intake'],
    keywords: ['dehydration', 'volume depletion', 'dry', 'poor intake'],
    clinicalIndicators: ['dry mucous membranes', 'poor skin turgor', 'elevated BUN/Cr ratio', 'concentrated urine'],
  },
  {
    code: 'E87.1',
    description: 'Hypo-osmolality and hyponatremia',
    shortDescription: 'Hyponatremia',
    category: 'METABOLIC',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document sodium level', 'Document if symptomatic'],
    keywords: ['hyponatremia', 'low sodium', 'low na'],
    clinicalIndicators: ['sodium < 135', 'confusion', 'nausea', 'headache'],
  },
  {
    code: 'E87.6',
    description: 'Hypokalemia',
    shortDescription: 'Hypokalemia',
    category: 'METABOLIC',
    specificity: 'BILLABLE',
    keywords: ['hypokalemia', 'low potassium', 'low k'],
    clinicalIndicators: ['potassium < 3.5', 'weakness', 'cramping', 'arrhythmia risk'],
  },
  {
    code: 'N18.3',
    description: 'Chronic kidney disease, stage 3 (moderate)',
    shortDescription: 'CKD Stage 3',
    category: 'GENITOURINARY',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['N18.30', 'N18.31', 'N18.32'],
    documentationRequirements: ['Document eGFR value', 'Document 3a vs 3b if known'],
    hccCategory: 'HCC 138',
    keywords: ['ckd', 'chronic kidney disease', 'renal insufficiency', 'stage 3'],
    clinicalIndicators: ['eGFR 30-59', 'elevated creatinine'],
  },

  // =========================================================================
  // MUSCULOSKELETAL
  // =========================================================================
  {
    code: 'M54.5',
    description: 'Low back pain',
    shortDescription: 'Low back pain',
    category: 'MUSCULOSKELETAL',
    specificity: 'BILLABLE',
    keywords: ['low back pain', 'lbp', 'lumbar pain', 'back pain'],
    clinicalIndicators: ['lumbar tenderness', 'pain with movement', 'limited ROM'],
  },
  {
    code: 'M54.16',
    description: 'Radiculopathy, lumbar region',
    shortDescription: 'Lumbar radiculopathy',
    category: 'MUSCULOSKELETAL',
    specificity: 'BILLABLE',
    keywords: ['radiculopathy', 'sciatica', 'leg pain', 'nerve pain', 'radiating pain'],
    clinicalIndicators: ['positive SLR', 'dermatomal numbness', 'radiating pain below knee'],
  },
  {
    code: 'S72.001A',
    description: 'Fracture of unspecified part of neck of right femur, initial encounter',
    shortDescription: 'Right hip fracture, initial',
    category: 'INJURY',
    specificity: 'BILLABLE',
    documentationRequirements: ['Document laterality', 'Document fracture type if known', 'Document 7th character for encounter type'],
    keywords: ['hip fracture', 'femur fracture', 'broken hip', 'neck of femur'],
    clinicalIndicators: ['unable to bear weight', 'shortened externally rotated leg', 'hip pain after fall'],
  },

  // =========================================================================
  // SIGNS & SYMPTOMS (use when definitive diagnosis not established)
  // =========================================================================
  {
    code: 'R07.9',
    description: 'Chest pain, unspecified',
    shortDescription: 'Chest pain NOS',
    category: 'SIGNS_SYMPTOMS',
    specificity: 'BILLABLE',
    moreSpecificCodes: ['R07.1', 'R07.2', 'R07.89'],
    documentationRequirements: ['Specify type if possible: pleuritic, precordial, etc.'],
    keywords: ['chest pain', 'chest pressure', 'substernal pain'],
    clinicalIndicators: ['chest discomfort', 'substernal pressure'],
  },
  {
    code: 'R09.02',
    description: 'Hypoxemia',
    shortDescription: 'Hypoxemia',
    category: 'SIGNS_SYMPTOMS',
    specificity: 'BILLABLE',
    keywords: ['hypoxemia', 'low oxygen', 'low o2', 'desaturation'],
    clinicalIndicators: ['O2 sat < 90%', 'PaO2 < 60', 'supplemental oxygen needed'],
  },
  {
    code: 'R50.9',
    description: 'Fever, unspecified',
    shortDescription: 'Fever',
    category: 'SIGNS_SYMPTOMS',
    specificity: 'BILLABLE',
    keywords: ['fever', 'febrile', 'elevated temperature'],
    clinicalIndicators: ['temp > 100.4F', 'temp > 38C'],
  },
  {
    code: 'R56.9',
    description: 'Unspecified convulsions',
    shortDescription: 'Seizure NOS',
    category: 'SIGNS_SYMPTOMS',
    specificity: 'BILLABLE',
    keywords: ['seizure', 'convulsion', 'fitting'],
    clinicalIndicators: ['witnessed seizure', 'post-ictal state', 'tongue bite'],
  },

  // =========================================================================
  // PREVENTIVE / WELLNESS
  // =========================================================================
  {
    code: 'Z00.00',
    description: 'Encounter for general adult medical examination without abnormal findings',
    shortDescription: 'Annual physical, normal',
    category: 'PREVENTIVE',
    specificity: 'BILLABLE',
    keywords: ['annual physical', 'wellness visit', 'preventive', 'check up', 'establish care'],
    clinicalIndicators: ['no acute complaints', 'routine exam'],
  },
  {
    code: 'Z00.01',
    description: 'Encounter for general adult medical examination with abnormal findings',
    shortDescription: 'Annual physical, abnormal findings',
    category: 'PREVENTIVE',
    specificity: 'BILLABLE',
    documentationRequirements: ['Also code the abnormal findings'],
    keywords: ['annual physical', 'wellness visit', 'abnormal findings'],
    clinicalIndicators: ['routine exam with new findings'],
  },
];

// ---------------------------------------------------------------------------
// Specificity Upgrade Rules
// ---------------------------------------------------------------------------

export interface SpecificityUpgrade {
  fromCode: string;
  toCode: string;
  condition: string;
  documentationNeeded: string;
}

export const SPECIFICITY_UPGRADES: SpecificityUpgrade[] = [
  {
    fromCode: 'E11.9',
    toCode: 'E11.65',
    condition: 'Glucose > 200 or A1c > 9%',
    documentationNeeded: 'Document elevated glucose or A1c value',
  },
  {
    fromCode: 'E11.9',
    toCode: 'E11.42',
    condition: 'Patient has neuropathy symptoms',
    documentationNeeded: 'Document neuropathy findings (monofilament, symptoms)',
  },
  {
    fromCode: 'E11.9',
    toCode: 'E11.22',
    condition: 'eGFR < 60 or proteinuria present',
    documentationNeeded: 'Document eGFR and urine albumin; also code CKD stage',
  },
  {
    fromCode: 'I50.20',
    toCode: 'I50.23',
    condition: 'Known chronic CHF with acute worsening',
    documentationNeeded: 'Document both chronic baseline AND acute exacerbation',
  },
  {
    fromCode: 'I50.20',
    toCode: 'I50.21',
    condition: 'New onset or acute episode only',
    documentationNeeded: 'Document acute presentation without prior CHF history',
  },
  {
    fromCode: 'I48.91',
    toCode: 'I48.0',
    condition: 'AFib is paroxysmal (self-terminating episodes)',
    documentationNeeded: 'Document episodic nature, self-termination',
  },
  {
    fromCode: 'I48.91',
    toCode: 'I48.1',
    condition: 'AFib is persistent (sustained > 7 days)',
    documentationNeeded: 'Document duration > 7 days or requiring cardioversion',
  },
  {
    fromCode: 'J18.9',
    toCode: 'J69.0',
    condition: 'Aspiration event documented or dysphagia present',
    documentationNeeded: 'Document aspiration event, dysphagia, or aspiration risk factors',
  },
  {
    fromCode: 'A41.9',
    toCode: 'R65.20',
    condition: 'Organ dysfunction present (AKI, altered mental status, etc.)',
    documentationNeeded: 'Document specific organ dysfunction; code underlying infection first',
  },
  {
    fromCode: 'L89.159',
    toCode: 'L89.153',
    condition: 'Wound assessment documents Stage 3 criteria',
    documentationNeeded: 'Document full thickness skin loss per NPIAP staging',
  },
  {
    fromCode: 'F03.90',
    toCode: 'G30.9',
    condition: "Alzheimer's disease documented",
    documentationNeeded: "Document Alzheimer's diagnosis; also code F02.80/F02.81",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function findByCode(code: string): ICD10Entry | undefined {
  return ICD10_CATALOG.find((e) => e.code === code);
}

export function searchByKeyword(keyword: string): ICD10Entry[] {
  const lower = keyword.toLowerCase();
  return ICD10_CATALOG.filter((e) =>
    e.keywords.some((k) => k.includes(lower)) ||
    e.description.toLowerCase().includes(lower)
  );
}

export function searchByClinicalIndicator(indicator: string): ICD10Entry[] {
  const lower = indicator.toLowerCase();
  return ICD10_CATALOG.filter((e) =>
    e.clinicalIndicators?.some((ci) => ci.toLowerCase().includes(lower))
  );
}

export function findByCategory(category: DiagnosisCategory): ICD10Entry[] {
  return ICD10_CATALOG.filter((e) => e.category === category);
}

export function getSpecificityUpgrades(code: string): SpecificityUpgrade[] {
  return SPECIFICITY_UPGRADES.filter((u) => u.fromCode === code);
}

export function getHCCCodes(): ICD10Entry[] {
  return ICD10_CATALOG.filter((e) => e.hccCategory !== undefined);
}

export function getQualityMeasureCodes(): ICD10Entry[] {
  return ICD10_CATALOG.filter((e) => e.qualityMeasures && e.qualityMeasures.length > 0);
}
