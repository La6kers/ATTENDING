/**
 * E/M Level Determination Rules (2021 CMS MDM Framework)
 *
 * Implements the Medical Decision Making (MDM) complexity scoring
 * used to assign Evaluation & Management service levels.
 *
 * CMS 2021 MDM framework: E/M level is determined by the highest
 * 2 of 3 MDM elements. This replaced the 1995/1997 documentation
 * guidelines that counted history and exam bullets.
 *
 * @see https://www.ama-assn.org/practice-management/cpt/cpt-evaluation-and-management
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MDMComplexity =
  | 'STRAIGHTFORWARD'
  | 'LOW'
  | 'MODERATE'
  | 'HIGH';

export type EMLevel =
  | '99211' // Minimal (nurse visit)
  | '99212' // Straightforward
  | '99213' // Low
  | '99214' // Moderate
  | '99215'; // High

export type EMCategory =
  | 'OFFICE_OUTPATIENT'        // 99202-99215
  | 'INITIAL_HOSPITAL'         // 99221-99223
  | 'SUBSEQUENT_HOSPITAL'      // 99231-99233
  | 'OBSERVATION'              // 99218-99220
  | 'SNF_INITIAL'              // 99304-99306 (SNF-specific!)
  | 'SNF_SUBSEQUENT'           // 99307-99310
  | 'EMERGENCY_DEPARTMENT';    // 99281-99285

export interface MDMElement1_Problems {
  level: MDMComplexity;
  score: number; // Internal scoring for tie-breaking
  problems: ProblemEntry[];
}

export interface ProblemEntry {
  description: string;
  icd10Code?: string;
  problemType: ProblemType;
  status: ProblemStatus;
}

export type ProblemType =
  | 'SELF_LIMITED'             // Minor, self-resolving
  | 'ACUTE_UNCOMPLICATED'      // New problem, low risk
  | 'CHRONIC_STABLE'           // Chronic, at goal
  | 'CHRONIC_EXACERBATION'     // Chronic, worsening
  | 'ACUTE_ILLNESS_UNDIAGNOSED' // New, uncertain diagnosis
  | 'ACUTE_INJURY'             // Trauma
  | 'CHRONIC_INADEQUATELY_CONTROLLED' // Chronic, not at goal
  | 'LIFE_THREATENING';        // Threat to life or function

export type ProblemStatus =
  | 'STABLE'
  | 'WORSENING'
  | 'NEW'
  | 'EXACERBATION';

export interface MDMElement2_Data {
  level: MDMComplexity;
  score: number;
  dataPoints: DataPoint[];
}

export interface DataPoint {
  type: DataPointType;
  description: string;
  category: DataCategory;
}

export type DataPointType =
  | 'LABS_ORDERED'
  | 'LABS_REVIEWED'
  | 'IMAGING_ORDERED'
  | 'IMAGING_REVIEWED'
  | 'EXTERNAL_RECORDS_REVIEWED'  // SNF records count here!
  | 'EXTERNAL_RECORDS_ORDERED'
  | 'INDEPENDENT_INTERPRETATION'  // e.g., reading own ECG
  | 'DISCUSSION_EXTERNAL_PROVIDER' // e.g., called SNF
  | 'MEDICINE_TABLE_REVIEWED';    // MAR review!

export type DataCategory = 'TESTS' | 'EXTERNAL' | 'INDEPENDENT';

export interface MDMElement3_Risk {
  level: MDMComplexity;
  score: number;
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  type: RiskFactorType;
  description: string;
}

export type RiskFactorType =
  | 'PRESCRIPTION_DRUG_MANAGEMENT'
  | 'OTC_DRUG_MANAGEMENT'
  | 'MINOR_SURGERY'
  | 'ELECTIVE_MAJOR_SURGERY'
  | 'EMERGENCY_MAJOR_SURGERY'
  | 'HOSPITALIZATION'
  | 'DRUG_THERAPY_REQUIRING_MONITORING' // Warfarin, insulin, etc.
  | 'DECISION_REGARDING_SURGERY'
  | 'DECISION_RE_HOSPITALIZATION'
  | 'PARENTERAL_CONTROLLED_SUBSTANCE'
  | 'SOCIAL_DETERMINANTS_AFFECTING_CARE'
  | 'DIAGNOSIS_WITH_THREAT_TO_LIFE';

// ---------------------------------------------------------------------------
// Full MDM Assessment
// ---------------------------------------------------------------------------

export interface MDMAssessment {
  element1: MDMElement1_Problems;
  element2: MDMElement2_Data;
  element3: MDMElement3_Risk;
  overallMDM: MDMComplexity;
  emLevel: EMLevel;
  emCategory: EMCategory;
  cptCode: string;
  rationale: string;
  documentationGaps: string[];
  specificityUpgrades: string[];
}

// ---------------------------------------------------------------------------
// Determination Rules
// ---------------------------------------------------------------------------

/**
 * Element 1: Number and Complexity of Problems Addressed
 */
export function assessProblems(problems: ProblemEntry[]): MDMElement1_Problems {
  if (problems.length === 0) {
    return { level: 'STRAIGHTFORWARD', score: 0, problems };
  }

  const hasLifeThreatening = problems.some((p) => p.problemType === 'LIFE_THREATENING');
  const hasAcuteUndiagnosed = problems.some((p) => p.problemType === 'ACUTE_ILLNESS_UNDIAGNOSED');
  const hasChronicExacerbation = problems.some((p) =>
    p.problemType === 'CHRONIC_EXACERBATION' || p.problemType === 'CHRONIC_INADEQUATELY_CONTROLLED'
  );
  const hasAcuteUncomplicated = problems.some((p) => p.problemType === 'ACUTE_UNCOMPLICATED');
  const chronicStableCount = problems.filter((p) => p.problemType === 'CHRONIC_STABLE').length;

  // HIGH: Life-threatening or acute illness with threat to bodily function
  if (hasLifeThreatening) {
    return { level: 'HIGH', score: 4, problems };
  }

  // HIGH: Acute illness with threat to life/function OR acute undiagnosed new problem with uncertain prognosis
  if (hasAcuteUndiagnosed && problems.length >= 2) {
    return { level: 'HIGH', score: 4, problems };
  }

  // MODERATE: One or more chronic with exacerbation, OR acute undiagnosed, OR 2+ chronic stable
  if (hasChronicExacerbation || hasAcuteUndiagnosed || chronicStableCount >= 2) {
    return { level: 'MODERATE', score: 3, problems };
  }

  // LOW: 2+ self-limited, OR 1 chronic stable, OR 1 acute uncomplicated
  if (hasAcuteUncomplicated || chronicStableCount >= 1 || problems.length >= 2) {
    return { level: 'LOW', score: 2, problems };
  }

  // STRAIGHTFORWARD: 1 self-limited/minor problem
  return { level: 'STRAIGHTFORWARD', score: 1, problems };
}

/**
 * Element 2: Amount and/or Complexity of Data Reviewed
 */
export function assessData(dataPoints: DataPoint[]): MDMElement2_Data {
  if (dataPoints.length === 0) {
    return { level: 'STRAIGHTFORWARD', score: 0, dataPoints };
  }

  const testPoints = dataPoints.filter((d) => d.category === 'TESTS');
  const externalPoints = dataPoints.filter((d) => d.category === 'EXTERNAL');
  const independentPoints = dataPoints.filter((d) => d.category === 'INDEPENDENT');

  const hasIndependentInterpretation = dataPoints.some((d) => d.type === 'INDEPENDENT_INTERPRETATION');
  const hasExternalDiscussion = dataPoints.some((d) => d.type === 'DISCUSSION_EXTERNAL_PROVIDER');
  const hasExternalRecords = dataPoints.some((d) =>
    d.type === 'EXTERNAL_RECORDS_REVIEWED' || d.type === 'EXTERNAL_RECORDS_ORDERED'
  );

  // HIGH: Independent interpretation of test + external records/discussion
  if (hasIndependentInterpretation && (hasExternalRecords || hasExternalDiscussion)) {
    return { level: 'HIGH', score: 4, dataPoints };
  }

  // MODERATE: 3+ categories of data, OR independent interpretation, OR external records
  const categoryCount = [testPoints.length > 0, externalPoints.length > 0, independentPoints.length > 0]
    .filter(Boolean).length;

  if (categoryCount >= 2 || hasIndependentInterpretation || (hasExternalRecords && hasExternalDiscussion)) {
    return { level: 'MODERATE', score: 3, dataPoints };
  }

  // LOW: Order or review of tests/records
  if (testPoints.length > 0 || externalPoints.length > 0) {
    return { level: 'LOW', score: 2, dataPoints };
  }

  return { level: 'STRAIGHTFORWARD', score: 1, dataPoints };
}

/**
 * Element 3: Risk of Complications, Morbidity, or Mortality
 */
export function assessRisk(riskFactors: RiskFactor[]): MDMElement3_Risk {
  if (riskFactors.length === 0) {
    return { level: 'STRAIGHTFORWARD', score: 0, riskFactors };
  }

  const hasLifeThreat = riskFactors.some((r) => r.type === 'DIAGNOSIS_WITH_THREAT_TO_LIFE');
  const hasEmergencySurgery = riskFactors.some((r) => r.type === 'EMERGENCY_MAJOR_SURGERY');
  const hasParenteralControlled = riskFactors.some((r) => r.type === 'PARENTERAL_CONTROLLED_SUBSTANCE');

  // HIGH
  if (hasLifeThreat || hasEmergencySurgery || hasParenteralControlled) {
    return { level: 'HIGH', score: 4, riskFactors };
  }

  const hasHospitalization = riskFactors.some((r) =>
    r.type === 'HOSPITALIZATION' || r.type === 'DECISION_RE_HOSPITALIZATION'
  );
  const hasDrugMonitoring = riskFactors.some((r) => r.type === 'DRUG_THERAPY_REQUIRING_MONITORING');
  const hasSurgeryDecision = riskFactors.some((r) =>
    r.type === 'DECISION_REGARDING_SURGERY' || r.type === 'ELECTIVE_MAJOR_SURGERY'
  );

  // MODERATE
  if (hasHospitalization || hasDrugMonitoring || hasSurgeryDecision) {
    return { level: 'MODERATE', score: 3, riskFactors };
  }

  const hasRxManagement = riskFactors.some((r) => r.type === 'PRESCRIPTION_DRUG_MANAGEMENT');
  const hasMinorSurgery = riskFactors.some((r) => r.type === 'MINOR_SURGERY');

  // LOW
  if (hasRxManagement || hasMinorSurgery) {
    return { level: 'LOW', score: 2, riskFactors };
  }

  return { level: 'STRAIGHTFORWARD', score: 1, riskFactors };
}

/**
 * Overall MDM: Highest 2 of 3 elements determines the level
 */
export function determineOverallMDM(
  e1: MDMElement1_Problems,
  e2: MDMElement2_Data,
  e3: MDMElement3_Risk
): MDMComplexity {
  const levels: MDMComplexity[] = [e1.level, e2.level, e3.level];
  const scores = [e1.score, e2.score, e3.score].sort((a, b) => b - a);

  // Take the second-highest score (highest 2 of 3)
  const secondHighest = scores[1];

  if (secondHighest >= 4) return 'HIGH';
  if (secondHighest >= 3) return 'MODERATE';
  if (secondHighest >= 2) return 'LOW';
  return 'STRAIGHTFORWARD';
}

// ---------------------------------------------------------------------------
// E/M Code Mapping
// ---------------------------------------------------------------------------

const EM_CODE_MAP: Record<EMCategory, Record<MDMComplexity, string>> = {
  OFFICE_OUTPATIENT: {
    STRAIGHTFORWARD: '99212',
    LOW: '99213',
    MODERATE: '99214',
    HIGH: '99215',
  },
  INITIAL_HOSPITAL: {
    STRAIGHTFORWARD: '99221',
    LOW: '99221',
    MODERATE: '99222',
    HIGH: '99223',
  },
  SUBSEQUENT_HOSPITAL: {
    STRAIGHTFORWARD: '99231',
    LOW: '99231',
    MODERATE: '99232',
    HIGH: '99233',
  },
  OBSERVATION: {
    STRAIGHTFORWARD: '99218',
    LOW: '99218',
    MODERATE: '99219',
    HIGH: '99220',
  },
  SNF_INITIAL: {
    STRAIGHTFORWARD: '99304',
    LOW: '99304',
    MODERATE: '99305',
    HIGH: '99306',
  },
  SNF_SUBSEQUENT: {
    STRAIGHTFORWARD: '99307',
    LOW: '99308',
    MODERATE: '99309',
    HIGH: '99310',
  },
  EMERGENCY_DEPARTMENT: {
    STRAIGHTFORWARD: '99282',
    LOW: '99283',
    MODERATE: '99284',
    HIGH: '99285',
  },
};

export function getEMCode(category: EMCategory, mdm: MDMComplexity): string {
  return EM_CODE_MAP[category]?.[mdm] ?? '99213';
}

export function getEMLevel(cptCode: string): EMLevel | undefined {
  const map: Record<string, EMLevel> = {
    '99211': '99211', '99212': '99212', '99213': '99213',
    '99214': '99214', '99215': '99215',
  };
  return map[cptCode];
}

// ---------------------------------------------------------------------------
// SNF Transfer-Specific Helpers
// ---------------------------------------------------------------------------

/**
 * For SNF transfers, the receiving hospital encounter is typically
 * Initial Hospital Care (99221-99223). The data element automatically
 * includes "external records reviewed" because the INTERACT document
 * IS the external record.
 */
export function buildSNFTransferDataPoints(context: {
  marReconciliationPerformed: boolean;
  medicationCount: number;
  labsOrdered: string[];
  labsReviewed: string[];
  imagingOrdered: string[];
  imagingReviewed: string[];
  externalRecordsReviewed: boolean; // SNF INTERACT document
  providerDiscussion: boolean; // Spoke with SNF provider
  independentInterpretations: string[]; // e.g., read own ECG, CXR
}): DataPoint[] {
  const points: DataPoint[] = [];

  // INTERACT document review = external records
  if (context.externalRecordsReviewed) {
    points.push({
      type: 'EXTERNAL_RECORDS_REVIEWED',
      description: 'SNF INTERACT transfer document reviewed',
      category: 'EXTERNAL',
    });
  }

  // MAR review = external medicine table
  if (context.marReconciliationPerformed) {
    points.push({
      type: 'MEDICINE_TABLE_REVIEWED',
      description: `MAR reconciliation performed (${context.medicationCount} medications)`,
      category: 'EXTERNAL',
    });
  }

  // Labs
  for (const lab of context.labsOrdered) {
    points.push({ type: 'LABS_ORDERED', description: lab, category: 'TESTS' });
  }
  for (const lab of context.labsReviewed) {
    points.push({ type: 'LABS_REVIEWED', description: lab, category: 'TESTS' });
  }

  // Imaging
  for (const img of context.imagingOrdered) {
    points.push({ type: 'IMAGING_ORDERED', description: img, category: 'TESTS' });
  }
  for (const img of context.imagingReviewed) {
    points.push({ type: 'IMAGING_REVIEWED', description: img, category: 'TESTS' });
  }

  // Independent interpretations
  for (const interp of context.independentInterpretations) {
    points.push({ type: 'INDEPENDENT_INTERPRETATION', description: interp, category: 'INDEPENDENT' });
  }

  // Provider discussion
  if (context.providerDiscussion) {
    points.push({
      type: 'DISCUSSION_EXTERNAL_PROVIDER',
      description: 'Discussed patient with SNF provider',
      category: 'EXTERNAL',
    });
  }

  return points;
}

/**
 * Automatically derive risk factors from SNF transfer context
 */
export function buildSNFTransferRiskFactors(context: {
  isHospitalization: boolean;
  medicationCount: number;
  hasHighRiskMeds: boolean; // Warfarin, insulin, opioids, etc.
  hasControlledSubstances: boolean;
  hasCriticalDiscrepancies: boolean;
  acuteDiagnosisSeverity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
}): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (context.isHospitalization) {
    factors.push({
      type: 'DECISION_RE_HOSPITALIZATION',
      description: 'Decision to admit to hospital from SNF',
    });
  }

  if (context.hasHighRiskMeds) {
    factors.push({
      type: 'DRUG_THERAPY_REQUIRING_MONITORING',
      description: 'High-risk medications requiring monitoring (anticoagulants, insulin, opioids)',
    });
  }

  if (context.acuteDiagnosisSeverity === 'LIFE_THREATENING') {
    factors.push({
      type: 'DIAGNOSIS_WITH_THREAT_TO_LIFE',
      description: 'Acute condition with threat to life or bodily function',
    });
  }

  if (context.medicationCount > 5) {
    factors.push({
      type: 'PRESCRIPTION_DRUG_MANAGEMENT',
      description: `Complex medication management (${context.medicationCount} active medications)`,
    });
  }

  return factors;
}
