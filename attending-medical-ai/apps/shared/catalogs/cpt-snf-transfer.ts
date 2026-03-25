/**
 * CPT Code Catalog for SNF Transfer Encounters
 *
 * Evaluation & Management codes and common procedure codes
 * relevant to SNF-to-Hospital transfers and initial hospital encounters.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CPTEntry {
  code: string;
  description: string;
  shortDescription: string;
  category: CPTCategory;
  relativeValueUnit?: number; // wRVU for reimbursement context
  typicalTime?: string; // CMS typical time
  documentationRequirements: string[];
  commonlyBilledWith?: string[];
}

export type CPTCategory =
  | 'EM_OFFICE'
  | 'EM_HOSPITAL_INITIAL'
  | 'EM_HOSPITAL_SUBSEQUENT'
  | 'EM_ED'
  | 'EM_SNF'
  | 'EM_OBSERVATION'
  | 'PROCEDURE'
  | 'DIAGNOSTIC'
  | 'PREVENTIVE';

// ---------------------------------------------------------------------------
// E/M Codes
// ---------------------------------------------------------------------------

export const CPT_CATALOG: CPTEntry[] = [
  // ===== Office/Outpatient E/M =====
  {
    code: '99211',
    description: 'Office or other outpatient visit, minimal complexity',
    shortDescription: 'Office visit, minimal',
    category: 'EM_OFFICE',
    relativeValueUnit: 0.18,
    typicalTime: '5 minutes',
    documentationRequirements: ['May not require physician presence'],
  },
  {
    code: '99212',
    description: 'Office or other outpatient visit, straightforward MDM',
    shortDescription: 'Office visit, straightforward',
    category: 'EM_OFFICE',
    relativeValueUnit: 0.70,
    typicalTime: '10-19 minutes',
    documentationRequirements: ['Straightforward MDM', 'Or 10-19 minutes total time'],
  },
  {
    code: '99213',
    description: 'Office or other outpatient visit, low complexity MDM',
    shortDescription: 'Office visit, low complexity',
    category: 'EM_OFFICE',
    relativeValueUnit: 1.30,
    typicalTime: '20-29 minutes',
    documentationRequirements: ['Low complexity MDM', 'Or 20-29 minutes total time'],
  },
  {
    code: '99214',
    description: 'Office or other outpatient visit, moderate complexity MDM',
    shortDescription: 'Office visit, moderate complexity',
    category: 'EM_OFFICE',
    relativeValueUnit: 1.92,
    typicalTime: '30-39 minutes',
    documentationRequirements: ['Moderate complexity MDM', 'Or 30-39 minutes total time'],
  },
  {
    code: '99215',
    description: 'Office or other outpatient visit, high complexity MDM',
    shortDescription: 'Office visit, high complexity',
    category: 'EM_OFFICE',
    relativeValueUnit: 2.80,
    typicalTime: '40-54 minutes',
    documentationRequirements: ['High complexity MDM', 'Or 40-54 minutes total time'],
  },

  // ===== Initial Hospital Care (most common for SNF transfers) =====
  {
    code: '99221',
    description: 'Initial hospital care, straightforward or low complexity MDM',
    shortDescription: 'Hospital admit, low',
    category: 'EM_HOSPITAL_INITIAL',
    relativeValueUnit: 2.00,
    typicalTime: '40 minutes',
    documentationRequirements: [
      'Detailed history and exam',
      'Straightforward or low complexity MDM',
      'Or 40 minutes total time on date of encounter',
    ],
  },
  {
    code: '99222',
    description: 'Initial hospital care, moderate complexity MDM',
    shortDescription: 'Hospital admit, moderate',
    category: 'EM_HOSPITAL_INITIAL',
    relativeValueUnit: 2.61,
    typicalTime: '55 minutes',
    documentationRequirements: [
      'Comprehensive history and exam',
      'Moderate complexity MDM',
      'Or 55 minutes total time on date of encounter',
    ],
    commonlyBilledWith: ['93000', '71046'],
  },
  {
    code: '99223',
    description: 'Initial hospital care, high complexity MDM',
    shortDescription: 'Hospital admit, high',
    category: 'EM_HOSPITAL_INITIAL',
    relativeValueUnit: 3.86,
    typicalTime: '75 minutes',
    documentationRequirements: [
      'Comprehensive history and exam',
      'High complexity MDM',
      'Or 75 minutes total time on date of encounter',
    ],
    commonlyBilledWith: ['93000', '71046', '36415'],
  },

  // ===== SNF E/M (Initial) =====
  {
    code: '99304',
    description: 'Initial nursing facility care, straightforward or low MDM',
    shortDescription: 'SNF admit, low',
    category: 'EM_SNF',
    relativeValueUnit: 1.50,
    typicalTime: '25 minutes',
    documentationRequirements: ['Initial SNF assessment', 'Low complexity MDM'],
  },
  {
    code: '99305',
    description: 'Initial nursing facility care, moderate MDM',
    shortDescription: 'SNF admit, moderate',
    category: 'EM_SNF',
    relativeValueUnit: 2.50,
    typicalTime: '35 minutes',
    documentationRequirements: ['Initial SNF assessment', 'Moderate complexity MDM'],
  },
  {
    code: '99306',
    description: 'Initial nursing facility care, high MDM',
    shortDescription: 'SNF admit, high',
    category: 'EM_SNF',
    relativeValueUnit: 3.50,
    typicalTime: '45 minutes',
    documentationRequirements: ['Initial SNF assessment', 'High complexity MDM'],
  },

  // ===== SNF E/M (Subsequent) =====
  {
    code: '99307',
    description: 'Subsequent nursing facility care, straightforward MDM',
    shortDescription: 'SNF follow-up, straightforward',
    category: 'EM_SNF',
    relativeValueUnit: 0.75,
    typicalTime: '10 minutes',
    documentationRequirements: ['Straightforward MDM'],
  },
  {
    code: '99308',
    description: 'Subsequent nursing facility care, low MDM',
    shortDescription: 'SNF follow-up, low',
    category: 'EM_SNF',
    relativeValueUnit: 1.30,
    typicalTime: '15 minutes',
    documentationRequirements: ['Low complexity MDM'],
  },
  {
    code: '99309',
    description: 'Subsequent nursing facility care, moderate MDM',
    shortDescription: 'SNF follow-up, moderate',
    category: 'EM_SNF',
    relativeValueUnit: 1.80,
    typicalTime: '25 minutes',
    documentationRequirements: ['Moderate complexity MDM'],
  },
  {
    code: '99310',
    description: 'Subsequent nursing facility care, high MDM',
    shortDescription: 'SNF follow-up, high',
    category: 'EM_SNF',
    relativeValueUnit: 2.50,
    typicalTime: '35 minutes',
    documentationRequirements: ['High complexity MDM'],
  },

  // ===== Emergency Department =====
  {
    code: '99281',
    description: 'Emergency department visit, self-limited or minor problem',
    shortDescription: 'ED visit, minimal',
    category: 'EM_ED',
    relativeValueUnit: 0.45,
    documentationRequirements: ['Self-limited or minor problem'],
  },
  {
    code: '99282',
    description: 'Emergency department visit, low to moderate severity',
    shortDescription: 'ED visit, low',
    category: 'EM_ED',
    relativeValueUnit: 0.93,
    documentationRequirements: ['Low to moderate severity', 'Straightforward MDM'],
  },
  {
    code: '99283',
    description: 'Emergency department visit, moderate severity',
    shortDescription: 'ED visit, moderate',
    category: 'EM_ED',
    relativeValueUnit: 1.60,
    documentationRequirements: ['Moderate severity', 'Low complexity MDM'],
  },
  {
    code: '99284',
    description: 'Emergency department visit, high severity',
    shortDescription: 'ED visit, high',
    category: 'EM_ED',
    relativeValueUnit: 2.56,
    documentationRequirements: ['High severity, urgent evaluation needed', 'Moderate complexity MDM'],
    commonlyBilledWith: ['93000', '71046'],
  },
  {
    code: '99285',
    description: 'Emergency department visit, life-threatening condition',
    shortDescription: 'ED visit, critical',
    category: 'EM_ED',
    relativeValueUnit: 3.80,
    documentationRequirements: ['Life-threatening condition', 'High complexity MDM'],
    commonlyBilledWith: ['93000', '71046', '36415', '36600'],
  },

  // ===== Common Procedures billed with E/M =====
  {
    code: '93000',
    description: 'Electrocardiogram, routine ECG with interpretation and report',
    shortDescription: 'ECG with interpretation',
    category: 'DIAGNOSTIC',
    relativeValueUnit: 0.17,
    documentationRequirements: ['ECG tracing', 'Physician interpretation documented in note'],
  },
  {
    code: '71046',
    description: 'Chest X-ray, 2 views',
    shortDescription: 'CXR 2-view',
    category: 'DIAGNOSTIC',
    relativeValueUnit: 0.22,
    documentationRequirements: ['Order documented', 'Clinical indication'],
  },
  {
    code: '36415',
    description: 'Collection of venous blood by venipuncture',
    shortDescription: 'Venipuncture',
    category: 'PROCEDURE',
    relativeValueUnit: 0.03,
    documentationRequirements: ['Lab order documented'],
  },
  {
    code: '99497',
    description: 'Advance care planning, first 30 minutes',
    shortDescription: 'Advance care planning',
    category: 'PROCEDURE',
    relativeValueUnit: 1.50,
    typicalTime: '30 minutes',
    documentationRequirements: [
      'Face-to-face with patient/surrogate',
      'Explanation and discussion of advance directives',
      'Document voluntary nature of discussion',
      'Document who was present',
    ],
  },
  {
    code: '99490',
    description: 'Chronic care management services, 20+ minutes per month',
    shortDescription: 'Chronic care management',
    category: 'PROCEDURE',
    relativeValueUnit: 1.00,
    typicalTime: '20 minutes clinical staff per month',
    documentationRequirements: [
      'Patient consent obtained',
      '2+ chronic conditions expected to last 12+ months',
      'Comprehensive care plan established',
      'Electronic care plan accessible to all providers',
    ],
  },

  // ===== Preventive =====
  {
    code: '99385',
    description: 'Initial comprehensive preventive visit, 18-39 years',
    shortDescription: 'New patient preventive, 18-39',
    category: 'PREVENTIVE',
    relativeValueUnit: 2.43,
    documentationRequirements: ['Age-appropriate history', 'Comprehensive exam', 'Counseling/anticipatory guidance'],
  },
  {
    code: '99396',
    description: 'Periodic comprehensive preventive visit, 40-64 years',
    shortDescription: 'Established patient preventive, 40-64',
    category: 'PREVENTIVE',
    relativeValueUnit: 2.43,
    documentationRequirements: ['Age-appropriate history', 'Comprehensive exam', 'Counseling/anticipatory guidance'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function findCPTByCode(code: string): CPTEntry | undefined {
  return CPT_CATALOG.find((e) => e.code === code);
}

export function findCPTByCategory(category: CPTCategory): CPTEntry[] {
  return CPT_CATALOG.filter((e) => e.category === category);
}

export function getSNFTransferCPTCodes(): CPTEntry[] {
  return CPT_CATALOG.filter((e) =>
    e.category === 'EM_HOSPITAL_INITIAL' ||
    e.category === 'EM_ED' ||
    e.category === 'EM_SNF'
  );
}

export function getCommonAddOnCodes(emCode: string): CPTEntry[] {
  const entry = findCPTByCode(emCode);
  if (!entry?.commonlyBilledWith) return [];
  return entry.commonlyBilledWith
    .map(findCPTByCode)
    .filter((e): e is CPTEntry => e !== undefined);
}
