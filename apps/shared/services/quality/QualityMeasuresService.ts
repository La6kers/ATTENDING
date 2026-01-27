// =============================================================================
// ATTENDING AI - Quality Measures & MIPS Service
// apps/shared/services/quality/QualityMeasuresService.ts
//
// Real-time tracking of quality measures with AI-driven gap closure
// MIPS scoring, care gap identification, and automated outreach
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type MeasureCategory = 
  | 'quality'
  | 'promoting_interoperability'
  | 'improvement_activities'
  | 'cost';

export type MeasureStatus = 'met' | 'not_met' | 'pending' | 'excluded' | 'not_applicable';
export type GapPriority = 'low' | 'medium' | 'high' | 'critical';
export type OutreachStatus = 'pending' | 'sent' | 'scheduled' | 'completed' | 'declined';

export interface QualityMeasure {
  id: string;
  measureId: string;           // CMS measure ID (e.g., CMS122v11)
  name: string;
  description: string;
  category: MeasureCategory;
  domain?: string;             // e.g., "Effective Clinical Care"
  
  // Measure specifications
  numerator: string;
  denominator: string;
  exclusions?: string[];
  
  // Scoring
  benchmark?: number;          // National benchmark
  decile?: number;             // Performance decile
  points: number;              // Points available
  weight: number;              // Weight in category
  
  // Time period
  measurementPeriod: {
    start: Date;
    end: Date;
  };
  
  // Applicable specialties
  specialties?: string[];
  
  // High priority flag
  highPriority: boolean;
}

export interface PatientMeasure {
  id: string;
  patientId: string;
  measureId: string;
  providerId: string;
  
  // Status
  status: MeasureStatus;
  inDenominator: boolean;
  inNumerator: boolean;
  isExcluded: boolean;
  exclusionReason?: string;
  
  // Evidence
  lastAssessedAt?: Date;
  dueDate?: Date;
  completedDate?: Date;
  evidence?: MeasureEvidence[];
  
  // Gap information
  gapIdentified: boolean;
  gapReason?: string;
  gapPriority?: GapPriority;
  
  // Outreach
  outreachStatus?: OutreachStatus;
  outreachAttempts: OutreachAttempt[];
}

export interface MeasureEvidence {
  type: 'lab' | 'procedure' | 'medication' | 'diagnosis' | 'vital' | 'documentation';
  code?: string;
  codeSystem?: string;
  value?: string;
  date: Date;
  source: string;
}

export interface OutreachAttempt {
  id: string;
  method: 'phone' | 'sms' | 'email' | 'letter' | 'portal';
  sentAt: Date;
  status: 'sent' | 'delivered' | 'opened' | 'responded' | 'bounced';
  response?: string;
  scheduledAppointment?: Date;
}

export interface CareGap {
  id: string;
  patientId: string;
  patientName: string;
  measureId: string;
  measureName: string;
  priority: GapPriority;
  dueDate?: Date;
  daysPastDue?: number;
  lastAttemptedDate?: Date;
  recommendedAction: string;
  estimatedImpact: number;     // Points impact if closed
  outreachStatus: OutreachStatus;
}

export interface ProviderMIPSScore {
  providerId: string;
  providerName: string;
  reportingYear: number;
  
  // Overall
  finalScore: number;
  projectedAdjustment: number; // Payment adjustment %
  
  // Category scores
  qualityScore: number;
  qualityWeight: number;
  piScore: number;             // Promoting Interoperability
  piWeight: number;
  iaScore: number;             // Improvement Activities
  iaWeight: number;
  costScore: number;
  costWeight: number;
  
  // Details
  measuresReported: number;
  measuresMet: number;
  patientsEligible: number;
  patientsCompliant: number;
  
  // Trends
  previousYearScore?: number;
  scoreChange?: number;
  
  // Projections
  projectedFinalScore: number;
  potentialImprovement: number;
  
  // Last updated
  calculatedAt: Date;
}

export interface MIPSDashboard {
  providerId: string;
  providerName: string;
  reportingYear: number;
  
  // Scores
  currentScore: ProviderMIPSScore;
  
  // Category details
  qualityMeasures: QualityMeasurePerformance[];
  piMeasures: PIMeasurePerformance[];
  iaActivities: IAActivityStatus[];
  
  // Gaps
  totalGaps: number;
  criticalGaps: number;
  careGaps: CareGap[];
  
  // Population stats
  population: {
    totalPatients: number;
    eligiblePatients: number;
    compliantPatients: number;
    gapsIdentified: number;
    gapsClosed: number;
  };
  
  // Recommendations
  recommendations: MIPSRecommendation[];
  
  // Timeline
  reportingDeadline: Date;
  daysRemaining: number;
}

export interface QualityMeasurePerformance {
  measure: QualityMeasure;
  performance: number;         // 0-100%
  denominator: number;
  numerator: number;
  exclusions: number;
  benchmark?: number;
  decileRank?: number;
  pointsEarned: number;
  pointsPossible: number;
  trend: 'improving' | 'stable' | 'declining';
  gapCount: number;
}

export interface PIMeasurePerformance {
  measureId: string;
  measureName: string;
  required: boolean;
  status: 'met' | 'not_met' | 'partial';
  score: number;
  maxScore: number;
  notes?: string;
}

export interface IAActivityStatus {
  activityId: string;
  activityName: string;
  category: 'high' | 'medium';
  weight: number;
  status: 'completed' | 'in_progress' | 'not_started';
  completedDate?: Date;
  documentation?: string;
}

export interface MIPSRecommendation {
  id: string;
  priority: GapPriority;
  category: MeasureCategory;
  title: string;
  description: string;
  potentialPoints: number;
  effort: 'low' | 'medium' | 'high';
  deadline?: Date;
  actionItems: string[];
}

// =============================================================================
// QUALITY MEASURES DEFINITIONS
// =============================================================================

const QUALITY_MEASURES: QualityMeasure[] = [
  // Diabetes measures
  {
    id: 'cms122',
    measureId: 'CMS122v11',
    name: 'Diabetes: Hemoglobin A1c (HbA1c) Poor Control (>9%)',
    description: 'Percentage of patients 18-75 years of age with diabetes who had hemoglobin A1c > 9.0%',
    category: 'quality',
    domain: 'Effective Clinical Care',
    numerator: 'Patients with most recent HbA1c > 9.0%, or no HbA1c during measurement period',
    denominator: 'Patients 18-75 with diabetes',
    exclusions: ['Hospice', 'Palliative care'],
    benchmark: 15,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine', 'Endocrinology'],
    highPriority: true,
  },
  {
    id: 'cms131',
    measureId: 'CMS131v11',
    name: 'Diabetes: Eye Exam',
    description: 'Percentage of patients 18-75 years of age with diabetes who had a retinal or dilated eye exam',
    category: 'quality',
    domain: 'Effective Clinical Care',
    numerator: 'Patients with eye exam during measurement period or prior year',
    denominator: 'Patients 18-75 with diabetes',
    exclusions: ['Hospice', 'Palliative care'],
    benchmark: 60,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine', 'Endocrinology'],
    highPriority: true,
  },
  
  // Hypertension
  {
    id: 'cms165',
    measureId: 'CMS165v11',
    name: 'Controlling High Blood Pressure',
    description: 'Percentage of patients 18-85 years of age who had a diagnosis of hypertension and whose blood pressure was adequately controlled',
    category: 'quality',
    domain: 'Effective Clinical Care',
    numerator: 'Patients with BP < 140/90 mmHg',
    denominator: 'Patients 18-85 with hypertension',
    exclusions: ['ESRD', 'Hospice', 'Pregnancy'],
    benchmark: 70,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine', 'Cardiology'],
    highPriority: true,
  },
  
  // Preventive care
  {
    id: 'cms130',
    measureId: 'CMS130v11',
    name: 'Colorectal Cancer Screening',
    description: 'Percentage of adults 45-75 years of age who had appropriate screening for colorectal cancer',
    category: 'quality',
    domain: 'Community/Population Health',
    numerator: 'Patients with appropriate CRC screening',
    denominator: 'Patients 45-75 years of age',
    exclusions: ['Colorectal cancer history', 'Total colectomy', 'Hospice'],
    benchmark: 65,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine', 'Gastroenterology'],
    highPriority: true,
  },
  {
    id: 'cms125',
    measureId: 'CMS125v11',
    name: 'Breast Cancer Screening',
    description: 'Percentage of women 50-74 years of age who had a mammogram to screen for breast cancer',
    category: 'quality',
    domain: 'Community/Population Health',
    numerator: 'Women with mammogram during 27 months prior to end of measurement period',
    denominator: 'Women 50-74 years of age',
    exclusions: ['Bilateral mastectomy', 'Hospice'],
    benchmark: 75,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine', 'OB/GYN'],
    highPriority: true,
  },
  
  // Depression
  {
    id: 'cms2',
    measureId: 'CMS2v12',
    name: 'Preventive Care and Screening: Screening for Depression and Follow-Up Plan',
    description: 'Percentage of patients aged 12 years and older screened for depression and if positive, follow-up plan documented',
    category: 'quality',
    domain: 'Community/Population Health',
    numerator: 'Patients screened for depression with documented follow-up if positive',
    denominator: 'Patients 12 years and older',
    exclusions: ['Depression diagnosis', 'Bipolar disorder'],
    benchmark: 70,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine', 'Psychiatry'],
    highPriority: false,
  },
  
  // Tobacco
  {
    id: 'cms138',
    measureId: 'CMS138v11',
    name: 'Preventive Care and Screening: Tobacco Use',
    description: 'Percentage of patients aged 18 years and older who were screened for tobacco use and received cessation intervention if positive',
    category: 'quality',
    domain: 'Community/Population Health',
    numerator: 'Patients screened for tobacco use with intervention if user',
    denominator: 'Patients 18 years and older',
    benchmark: 85,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine'],
    highPriority: false,
  },
  
  // Statin therapy
  {
    id: 'cms347',
    measureId: 'CMS347v6',
    name: 'Statin Therapy for the Prevention and Treatment of Cardiovascular Disease',
    description: 'Percentage of patients at high cardiovascular risk who were prescribed or already on statin therapy',
    category: 'quality',
    domain: 'Effective Clinical Care',
    numerator: 'Patients prescribed statin therapy',
    denominator: 'Patients at high cardiovascular risk',
    exclusions: ['Statin adverse effect', 'ESRD', 'Cirrhosis', 'Pregnancy'],
    benchmark: 75,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine', 'Cardiology'],
    highPriority: false,
  },
  
  // Falls prevention
  {
    id: 'cms139',
    measureId: 'CMS139v11',
    name: 'Falls: Screening for Future Fall Risk',
    description: 'Percentage of patients 65 years of age and older who were screened for future fall risk',
    category: 'quality',
    domain: 'Patient Safety',
    numerator: 'Patients with fall risk screening documented',
    denominator: 'Patients 65 years and older',
    benchmark: 75,
    points: 10,
    weight: 1,
    measurementPeriod: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
    specialties: ['Internal Medicine', 'Family Medicine', 'Geriatrics'],
    highPriority: false,
  },
];

// =============================================================================
// PROMOTING INTEROPERABILITY MEASURES
// =============================================================================

const PI_MEASURES: PIMeasurePerformance[] = [
  { measureId: 'e-Prescribing', measureName: 'e-Prescribing', required: true, status: 'not_met', score: 0, maxScore: 10 },
  { measureId: 'PDMP', measureName: 'Query of PDMP', required: false, status: 'not_met', score: 0, maxScore: 10 },
  { measureId: 'HIE-Send', measureName: 'Health Information Exchange - Sending', required: true, status: 'not_met', score: 0, maxScore: 15 },
  { measureId: 'HIE-Receive', measureName: 'Health Information Exchange - Receiving', required: true, status: 'not_met', score: 0, maxScore: 15 },
  { measureId: 'ProvideAccess', measureName: 'Provide Patients Electronic Access', required: true, status: 'not_met', score: 0, maxScore: 25 },
  { measureId: 'SecurityRisk', measureName: 'Security Risk Analysis', required: true, status: 'not_met', score: 0, maxScore: 0, notes: 'Yes/No requirement' },
];

// =============================================================================
// IMPROVEMENT ACTIVITIES
// =============================================================================

const IMPROVEMENT_ACTIVITIES: IAActivityStatus[] = [
  { activityId: 'IA_EPA_1', activityName: 'Provide 24/7 Access to MIPS Eligible Clinicians', category: 'high', weight: 20, status: 'not_started' },
  { activityId: 'IA_BE_4', activityName: 'Engagement of Patients through Implementation of Improvements in Patient Portal', category: 'medium', weight: 10, status: 'not_started' },
  { activityId: 'IA_CC_1', activityName: 'Implementation of Use of Specialist Reports Back to Referring Clinician', category: 'medium', weight: 10, status: 'not_started' },
  { activityId: 'IA_CC_13', activityName: 'Practice Improvements for Bilateral Exchange of Patient Information', category: 'medium', weight: 10, status: 'not_started' },
  { activityId: 'IA_PSPA_1', activityName: 'Participation in AHRQ Safety Program', category: 'high', weight: 20, status: 'not_started' },
  { activityId: 'IA_PSPA_7', activityName: 'Use of QCDR Data for Quality Improvement', category: 'medium', weight: 10, status: 'not_started' },
  { activityId: 'IA_AHE_3', activityName: 'Promote Use of Patient-Reported Outcome Tools', category: 'medium', weight: 10, status: 'not_started' },
  { activityId: 'IA_PM_13', activityName: 'Chronic Care Management Practice Improvements', category: 'medium', weight: 10, status: 'not_started' },
];

// =============================================================================
// QUALITY MEASURES SERVICE
// =============================================================================

export class QualityMeasuresService extends EventEmitter {
  private patientMeasures: Map<string, PatientMeasure[]> = new Map();
  private providerScores: Map<string, ProviderMIPSScore> = new Map();

  constructor() {
    super();
  }

  // =========================================================================
  // MEASURE DEFINITIONS
  // =========================================================================

  getQualityMeasures(specialty?: string): QualityMeasure[] {
    if (specialty) {
      return QUALITY_MEASURES.filter(m => 
        !m.specialties || m.specialties.includes(specialty)
      );
    }
    return [...QUALITY_MEASURES];
  }

  getMeasureById(measureId: string): QualityMeasure | undefined {
    return QUALITY_MEASURES.find(m => m.id === measureId || m.measureId === measureId);
  }

  // =========================================================================
  // PATIENT MEASURE TRACKING
  // =========================================================================

  async evaluatePatientMeasures(
    patientId: string,
    providerId: string,
    patientData: {
      age: number;
      gender: 'male' | 'female' | 'other';
      conditions: string[];
      medications: string[];
      labs: Array<{ code: string; value: string; date: Date }>;
      procedures: Array<{ code: string; date: Date }>;
      vitals: Array<{ type: string; value: number; date: Date }>;
    }
  ): Promise<PatientMeasure[]> {
    const measures: PatientMeasure[] = [];

    for (const measure of QUALITY_MEASURES) {
      const patientMeasure = this.evaluateSingleMeasure(
        patientId,
        providerId,
        measure,
        patientData
      );
      measures.push(patientMeasure);
    }

    // Store
    this.patientMeasures.set(patientId, measures);
    this.emit('measuresEvaluated', { patientId, measures });

    return measures;
  }

  private evaluateSingleMeasure(
    patientId: string,
    providerId: string,
    measure: QualityMeasure,
    patientData: any
  ): PatientMeasure {
    const result: PatientMeasure = {
      id: `pm_${measure.id}_${patientId}`,
      patientId,
      measureId: measure.id,
      providerId,
      status: 'not_met',
      inDenominator: false,
      inNumerator: false,
      isExcluded: false,
      gapIdentified: false,
      outreachAttempts: [],
    };

    // Evaluate based on measure type
    switch (measure.id) {
      case 'cms122': // Diabetes A1c
        result.inDenominator = this.hasDiabetes(patientData) && 
                               patientData.age >= 18 && 
                               patientData.age <= 75;
        if (result.inDenominator) {
          const a1c = this.getLatestA1c(patientData.labs);
          if (a1c !== null) {
            // This is inverse measure - lower is better
            result.inNumerator = a1c <= 9.0;
            result.evidence = [{
              type: 'lab',
              code: '4548-4',
              codeSystem: 'LOINC',
              value: a1c.toString(),
              date: new Date(),
              source: 'EHR',
            }];
          }
          result.status = result.inNumerator ? 'met' : 'not_met';
          result.gapIdentified = !result.inNumerator;
          if (result.gapIdentified) {
            result.gapReason = a1c === null ? 'No A1c on file' : `A1c > 9% (${a1c}%)`;
            result.gapPriority = a1c !== null && a1c > 10 ? 'critical' : 'high';
          }
        }
        break;

      case 'cms131': // Diabetes Eye Exam
        result.inDenominator = this.hasDiabetes(patientData) && 
                               patientData.age >= 18 && 
                               patientData.age <= 75;
        if (result.inDenominator) {
          const hasEyeExam = this.hasRecentEyeExam(patientData.procedures);
          result.inNumerator = hasEyeExam;
          result.status = result.inNumerator ? 'met' : 'not_met';
          result.gapIdentified = !result.inNumerator;
          if (result.gapIdentified) {
            result.gapReason = 'No diabetic eye exam documented';
            result.gapPriority = 'high';
            result.dueDate = new Date();
          }
        }
        break;

      case 'cms165': // BP Control
        result.inDenominator = this.hasHypertension(patientData) && 
                               patientData.age >= 18 && 
                               patientData.age <= 85;
        if (result.inDenominator) {
          const bp = this.getLatestBP(patientData.vitals);
          if (bp) {
            result.inNumerator = bp.systolic < 140 && bp.diastolic < 90;
            result.evidence = [{
              type: 'vital',
              value: `${bp.systolic}/${bp.diastolic}`,
              date: bp.date,
              source: 'EHR',
            }];
          }
          result.status = result.inNumerator ? 'met' : 'not_met';
          result.gapIdentified = !result.inNumerator;
          if (result.gapIdentified) {
            result.gapReason = bp ? `BP not at goal (${bp.systolic}/${bp.diastolic})` : 'No recent BP';
            result.gapPriority = bp && bp.systolic >= 160 ? 'critical' : 'high';
          }
        }
        break;

      case 'cms130': // Colorectal Cancer Screening
        result.inDenominator = patientData.age >= 45 && patientData.age <= 75;
        if (result.inDenominator) {
          const hasCRCScreening = this.hasCRCScreening(patientData.procedures, patientData.labs);
          result.inNumerator = hasCRCScreening;
          result.status = result.inNumerator ? 'met' : 'not_met';
          result.gapIdentified = !result.inNumerator;
          if (result.gapIdentified) {
            result.gapReason = 'No colorectal cancer screening on file';
            result.gapPriority = patientData.age >= 50 ? 'high' : 'medium';
          }
        }
        break;

      case 'cms125': // Breast Cancer Screening
        result.inDenominator = patientData.gender === 'female' && 
                               patientData.age >= 50 && 
                               patientData.age <= 74;
        if (result.inDenominator) {
          const hasMammogram = this.hasRecentMammogram(patientData.procedures);
          result.inNumerator = hasMammogram;
          result.status = result.inNumerator ? 'met' : 'not_met';
          result.gapIdentified = !result.inNumerator;
          if (result.gapIdentified) {
            result.gapReason = 'No mammogram in past 27 months';
            result.gapPriority = 'high';
          }
        }
        break;

      // Add more measure evaluations...
      default:
        // Generic evaluation
        result.status = 'pending';
    }

    return result;
  }

  // =========================================================================
  // HELPER METHODS FOR MEASURE EVALUATION
  // =========================================================================

  private hasDiabetes(data: any): boolean {
    const diabetesCodes = ['E10', 'E11', 'E13', 'diabetes'];
    return data.conditions.some((c: string) => 
      diabetesCodes.some(code => c.toLowerCase().includes(code.toLowerCase()))
    );
  }

  private hasHypertension(data: any): boolean {
    const htnCodes = ['I10', 'I11', 'I12', 'I13', 'hypertension'];
    return data.conditions.some((c: string) => 
      htnCodes.some(code => c.toLowerCase().includes(code.toLowerCase()))
    );
  }

  private getLatestA1c(labs: any[]): number | null {
    const a1cLabs = labs.filter((l: any) => 
      l.code === '4548-4' || l.code?.toLowerCase().includes('a1c')
    );
    if (a1cLabs.length === 0) return null;
    
    const latest = a1cLabs.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    return parseFloat(latest.value);
  }

  private hasRecentEyeExam(procedures: any[]): boolean {
    const eyeExamCodes = ['92002', '92004', '92012', '92014', '92227', '92228', '2022F', '2024F', '2026F'];
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    return procedures.some((p: any) => 
      eyeExamCodes.includes(p.code) && new Date(p.date) >= twoYearsAgo
    );
  }

  private getLatestBP(vitals: any[]): { systolic: number; diastolic: number; date: Date } | null {
    const bpReadings = vitals.filter((v: any) => 
      v.type === 'blood_pressure' || v.type === 'bp'
    );
    if (bpReadings.length === 0) return null;
    
    const latest = bpReadings.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    // Assuming value is stored as "120/80" or as separate fields
    if (typeof latest.value === 'string' && latest.value.includes('/')) {
      const [sys, dia] = latest.value.split('/').map(Number);
      return { systolic: sys, diastolic: dia, date: latest.date };
    }
    
    return null;
  }

  private hasCRCScreening(procedures: any[], labs: any[]): boolean {
    const colonoscopyCodes = ['45378', '45380', '45381', '45384', '45385'];
    const fitCodes = ['82274'];
    
    // Check for colonoscopy in past 10 years
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    
    const hasColonoscopy = procedures.some((p: any) => 
      colonoscopyCodes.includes(p.code) && new Date(p.date) >= tenYearsAgo
    );
    
    if (hasColonoscopy) return true;
    
    // Check for FIT in past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return labs.some((l: any) => 
      fitCodes.includes(l.code) && new Date(l.date) >= oneYearAgo
    );
  }

  private hasRecentMammogram(procedures: any[]): boolean {
    const mammogramCodes = ['77067', '77066', '77065', 'G0202', 'G0204', 'G0206'];
    const twentySevenMonthsAgo = new Date();
    twentySevenMonthsAgo.setMonth(twentySevenMonthsAgo.getMonth() - 27);
    
    return procedures.some((p: any) => 
      mammogramCodes.includes(p.code) && new Date(p.date) >= twentySevenMonthsAgo
    );
  }

  // =========================================================================
  // MIPS SCORE CALCULATION
  // =========================================================================

  async calculateMIPSScore(providerId: string): Promise<ProviderMIPSScore> {
    // Get all patient measures for this provider
    const allMeasures: PatientMeasure[] = [];
    this.patientMeasures.forEach((measures) => {
      allMeasures.push(...measures.filter(m => m.providerId === providerId));
    });

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(allMeasures);
    
    // Calculate PI score (simplified - would need actual data)
    const piScore = this.calculatePIScore();
    
    // Calculate IA score (simplified)
    const iaScore = this.calculateIAScore();
    
    // Cost score is calculated by CMS, not reportable
    const costScore = 0;

    // Calculate weighted final score
    // Standard weights: Quality 30%, Cost 30%, PI 25%, IA 15%
    const qualityWeight = 0.30;
    const costWeight = 0.30;
    const piWeight = 0.25;
    const iaWeight = 0.15;

    const finalScore = 
      (qualityScore * qualityWeight) +
      (costScore * costWeight) +
      (piScore * piWeight) +
      (iaScore * iaWeight);

    // Calculate payment adjustment
    const projectedAdjustment = this.calculatePaymentAdjustment(finalScore);

    const score: ProviderMIPSScore = {
      providerId,
      providerName: 'Provider', // Would come from database
      reportingYear: new Date().getFullYear(),
      finalScore: Math.round(finalScore * 100) / 100,
      projectedAdjustment,
      qualityScore,
      qualityWeight,
      piScore,
      piWeight,
      iaScore,
      iaWeight,
      costScore,
      costWeight,
      measuresReported: QUALITY_MEASURES.length,
      measuresMet: allMeasures.filter(m => m.status === 'met').length,
      patientsEligible: allMeasures.filter(m => m.inDenominator).length,
      patientsCompliant: allMeasures.filter(m => m.inNumerator).length,
      projectedFinalScore: finalScore,
      potentialImprovement: 100 - finalScore,
      calculatedAt: new Date(),
    };

    this.providerScores.set(providerId, score);
    this.emit('scoreCalculated', score);

    return score;
  }

  private calculateQualityScore(measures: PatientMeasure[]): number {
    // Group by measure
    const measureGroups = new Map<string, PatientMeasure[]>();
    measures.forEach(m => {
      const group = measureGroups.get(m.measureId) || [];
      group.push(m);
      measureGroups.set(m.measureId, group);
    });

    let totalPoints = 0;
    let maxPoints = 0;

    measureGroups.forEach((patientMeasures, measureId) => {
      const measure = this.getMeasureById(measureId);
      if (!measure) return;

      const denominator = patientMeasures.filter(m => m.inDenominator).length;
      const numerator = patientMeasures.filter(m => m.inNumerator).length;

      if (denominator > 0) {
        const performance = (numerator / denominator) * 100;
        const pointsEarned = this.calculateDecilePoints(performance, measure.benchmark);
        totalPoints += pointsEarned;
        maxPoints += measure.points;
      }
    });

    return maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
  }

  private calculateDecilePoints(performance: number, benchmark?: number): number {
    // Simplified decile calculation
    if (!benchmark) return performance >= 70 ? 10 : Math.round(performance / 10);
    
    if (performance >= benchmark * 1.2) return 10;  // Top decile
    if (performance >= benchmark) return 8;
    if (performance >= benchmark * 0.8) return 6;
    if (performance >= benchmark * 0.6) return 4;
    return 2;
  }

  private calculatePIScore(): number {
    // Simplified - would need actual PI data
    return 75; // Placeholder
  }

  private calculateIAScore(): number {
    // Need 40 points for full credit
    // High-weight = 20 points, Medium-weight = 10 points
    const completed = IMPROVEMENT_ACTIVITIES.filter(a => a.status === 'completed');
    const points = completed.reduce((sum, a) => sum + a.weight, 0);
    return Math.min(points / 40 * 100, 100);
  }

  private calculatePaymentAdjustment(score: number): number {
    // 2024 MIPS adjustment formula (simplified)
    if (score >= 89) return 1.68;      // Exceptional performance
    if (score >= 75) return 0;          // Neutral zone  
    if (score < 75) return -9;          // Penalty
    return 0;
  }

  // =========================================================================
  // CARE GAPS
  // =========================================================================

  async getCareGaps(providerId: string): Promise<CareGap[]> {
    const gaps: CareGap[] = [];

    this.patientMeasures.forEach((measures, patientId) => {
      measures
        .filter(m => m.providerId === providerId && m.gapIdentified)
        .forEach(m => {
          const measure = this.getMeasureById(m.measureId);
          gaps.push({
            id: m.id,
            patientId: m.patientId,
            patientName: `Patient ${patientId}`, // Would come from database
            measureId: m.measureId,
            measureName: measure?.name || m.measureId,
            priority: m.gapPriority || 'medium',
            dueDate: m.dueDate,
            daysPastDue: m.dueDate ? Math.floor((Date.now() - m.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : undefined,
            lastAttemptedDate: m.outreachAttempts[0]?.sentAt,
            recommendedAction: this.getRecommendedAction(m.measureId, m.gapReason),
            estimatedImpact: measure?.points || 10,
            outreachStatus: m.outreachStatus || 'pending',
          });
        });
    });

    // Sort by priority
    const priorityOrder: Record<GapPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return gaps;
  }

  private getRecommendedAction(measureId: string, gapReason?: string): string {
    switch (measureId) {
      case 'cms122':
        return 'Order HbA1c lab and schedule follow-up to review results';
      case 'cms131':
        return 'Refer to ophthalmology for diabetic eye exam';
      case 'cms165':
        return 'Schedule BP check visit and review medication adherence';
      case 'cms130':
        return 'Order FIT test or refer for colonoscopy';
      case 'cms125':
        return 'Order screening mammogram';
      default:
        return 'Schedule visit to address care gap';
    }
  }

  // =========================================================================
  // DASHBOARD
  // =========================================================================

  async getMIPSDashboard(providerId: string): Promise<MIPSDashboard> {
    const score = await this.calculateMIPSScore(providerId);
    const careGaps = await this.getCareGaps(providerId);

    // Calculate quality measure performance
    const qualityMeasures: QualityMeasurePerformance[] = QUALITY_MEASURES.map(measure => {
      const patientMeasures: PatientMeasure[] = [];
      this.patientMeasures.forEach((measures) => {
        patientMeasures.push(...measures.filter(m => 
          m.providerId === providerId && m.measureId === measure.id
        ));
      });

      const denominator = patientMeasures.filter(m => m.inDenominator).length;
      const numerator = patientMeasures.filter(m => m.inNumerator).length;
      const exclusions = patientMeasures.filter(m => m.isExcluded).length;
      const performance = denominator > 0 ? (numerator / denominator) * 100 : 0;

      return {
        measure,
        performance: Math.round(performance * 10) / 10,
        denominator,
        numerator,
        exclusions,
        benchmark: measure.benchmark,
        pointsEarned: this.calculateDecilePoints(performance, measure.benchmark),
        pointsPossible: measure.points,
        trend: 'stable' as const,
        gapCount: patientMeasures.filter(m => m.gapIdentified).length,
      };
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(score, careGaps, qualityMeasures);

    // Calculate reporting deadline
    const reportingDeadline = new Date(score.reportingYear + 1, 2, 31); // March 31
    const daysRemaining = Math.floor((reportingDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      providerId,
      providerName: score.providerName,
      reportingYear: score.reportingYear,
      currentScore: score,
      qualityMeasures,
      piMeasures: [...PI_MEASURES],
      iaActivities: [...IMPROVEMENT_ACTIVITIES],
      totalGaps: careGaps.length,
      criticalGaps: careGaps.filter(g => g.priority === 'critical').length,
      careGaps: careGaps.slice(0, 20), // Top 20 gaps
      population: {
        totalPatients: this.patientMeasures.size,
        eligiblePatients: score.patientsEligible,
        compliantPatients: score.patientsCompliant,
        gapsIdentified: careGaps.length,
        gapsClosed: 0, // Would track this
      },
      recommendations,
      reportingDeadline,
      daysRemaining: Math.max(0, daysRemaining),
    };
  }

  private generateRecommendations(
    score: ProviderMIPSScore,
    gaps: CareGap[],
    measures: QualityMeasurePerformance[]
  ): MIPSRecommendation[] {
    const recommendations: MIPSRecommendation[] = [];

    // Find underperforming measures
    const underperforming = measures.filter(m => 
      m.benchmark && m.performance < m.benchmark
    );

    underperforming.forEach(m => {
      recommendations.push({
        id: `rec_${m.measure.id}`,
        priority: m.performance < m.measure.benchmark! * 0.5 ? 'critical' : 'high',
        category: 'quality',
        title: `Improve ${m.measure.name}`,
        description: `Current performance (${m.performance}%) is below benchmark (${m.benchmark}%)`,
        potentialPoints: m.pointsPossible - m.pointsEarned,
        effort: 'medium',
        actionItems: [
          `Close ${m.gapCount} identified care gaps`,
          `Review workflow for ${m.measure.name}`,
          'Implement reminder system for due patients',
        ],
      });
    });

    // PI recommendations
    if (score.piScore < 100) {
      recommendations.push({
        id: 'rec_pi',
        priority: 'high',
        category: 'promoting_interoperability',
        title: 'Complete Promoting Interoperability Requirements',
        description: 'Ensure all required PI measures are met',
        potentialPoints: 25,
        effort: 'low',
        actionItems: [
          'Enable and use e-Prescribing',
          'Set up Health Information Exchange',
          'Complete Security Risk Analysis',
        ],
      });
    }

    // IA recommendations
    if (score.iaScore < 100) {
      recommendations.push({
        id: 'rec_ia',
        priority: 'medium',
        category: 'improvement_activities',
        title: 'Complete Improvement Activities',
        description: 'Achieve 40 points in improvement activities',
        potentialPoints: 15,
        effort: 'medium',
        actionItems: [
          'Select and complete qualifying activities',
          'Document attestations',
          'Implement patient engagement tools',
        ],
      });
    }

    // Sort by potential points
    recommendations.sort((a, b) => b.potentialPoints - a.potentialPoints);

    return recommendations.slice(0, 5);
  }

  // =========================================================================
  // OUTREACH
  // =========================================================================

  async scheduleOutreach(
    gapId: string,
    method: OutreachAttempt['method']
  ): Promise<OutreachAttempt> {
    // Find the patient measure
    let targetMeasure: PatientMeasure | undefined;
    this.patientMeasures.forEach((measures) => {
      const found = measures.find(m => m.id === gapId);
      if (found) targetMeasure = found;
    });

    if (!targetMeasure) {
      throw new Error('Care gap not found');
    }

    const attempt: OutreachAttempt = {
      id: `outreach_${Date.now()}`,
      method,
      sentAt: new Date(),
      status: 'sent',
    };

    targetMeasure.outreachAttempts.push(attempt);
    targetMeasure.outreachStatus = 'sent';

    this.emit('outreachScheduled', { gapId, attempt });
    return attempt;
  }

  async generateOutreachMessage(
    gapId: string,
    method: OutreachAttempt['method']
  ): Promise<string> {
    // Find the gap
    let gap: PatientMeasure | undefined;
    this.patientMeasures.forEach((measures) => {
      const found = measures.find(m => m.id === gapId);
      if (found) gap = found;
    });

    if (!gap) {
      throw new Error('Care gap not found');
    }

    const measure = this.getMeasureById(gap.measureId);
    
    // Generate appropriate message based on method and measure
    if (method === 'sms') {
      return `Hi! This is a reminder from your healthcare provider. You are due for ${measure?.name || 'a preventive health service'}. Please call us to schedule an appointment. Reply STOP to opt out.`;
    }

    if (method === 'email') {
      return `Dear Patient,

This is a friendly reminder that you are due for the following preventive health service:

${measure?.name || 'Preventive Care'}

${measure?.description || ''}

Please contact our office to schedule an appointment at your earliest convenience.

Best regards,
Your Healthcare Team`;
    }

    return `Reminder: Please schedule your ${measure?.name || 'preventive care'} appointment.`;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const qualityMeasuresService = new QualityMeasuresService();
