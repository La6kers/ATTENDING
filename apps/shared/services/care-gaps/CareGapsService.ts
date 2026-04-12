// =============================================================================
// ATTENDING AI - Longitudinal Care Gaps Dashboard Service
// apps/shared/services/care-gaps/CareGapsService.ts
//
// Comprehensive care gap tracking including:
// - Preventive care due/overdue
// - Chronic disease metrics trending
// - Medication adherence patterns
// - Social determinants timeline
// - Life events affecting health
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface CareGap {
  id: string;
  patientId: string;
  category: CareGapCategory;
  type: string;
  name: string;
  description: string;
  status: 'due' | 'overdue' | 'upcoming' | 'completed' | 'declined' | 'not-applicable';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate?: Date;
  lastCompletedDate?: Date;
  nextDueDate?: Date;
  daysOverdue?: number;
  frequencyMonths?: number;
  evidenceGuideline?: string;
  qualityMeasure?: string;
  estimatedTime?: number; // minutes
  orderTemplate?: string;
  educationMaterial?: string;
  patientFacingDescription?: string;
  barriers?: string[];
  interventions?: CareGapIntervention[];
}

export type CareGapCategory =
  | 'preventive-screening'
  | 'immunization'
  | 'chronic-disease-management'
  | 'medication-monitoring'
  | 'follow-up-care'
  | 'wellness'
  | 'safety';

export interface CareGapIntervention {
  date: Date;
  type: 'outreach' | 'reminder' | 'education' | 'barrier-resolution' | 'scheduling';
  method: 'phone' | 'text' | 'email' | 'portal' | 'in-person' | 'mail';
  outcome: 'scheduled' | 'completed' | 'declined' | 'no-response' | 'barrier-identified';
  notes?: string;
  performedBy?: string;
}

export interface ChronicDiseaseMetric {
  patientId: string;
  condition: string;
  metric: string;
  unit: string;
  targetRange: { min?: number; max?: number };
  values: MetricValue[];
  trend: 'improving' | 'stable' | 'worsening' | 'insufficient-data';
  lastValue?: number;
  lastDate?: Date;
  atGoal: boolean;
  nextCheckDue?: Date;
  recommendations?: string[];
}

export interface MetricValue {
  date: Date;
  value: number;
  source: 'lab' | 'vital' | 'device' | 'self-reported';
  notes?: string;
}

export interface MedicationAdherence {
  patientId: string;
  medicationId: string;
  medicationName: string;
  adherenceRate: number; // 0-100
  refillHistory: RefillRecord[];
  gapsIdentified: MedicationGap[];
  estimatedDaysSupply: number;
  lastRefillDate?: Date;
  nextRefillDue?: Date;
  barriers?: string[];
  interventions?: string[];
}

export interface RefillRecord {
  date: Date;
  daysSupply: number;
  pharmacy?: string;
  copay?: number;
}

export interface MedicationGap {
  startDate: Date;
  endDate?: Date;
  daysWithoutMedication: number;
  possibleReason?: string;
  addressed: boolean;
}

export interface LifeEvent {
  patientId: string;
  date: Date;
  eventType: LifeEventType;
  description: string;
  healthImpact: 'positive' | 'negative' | 'neutral' | 'unknown';
  clinicalConsiderations?: string[];
  followUpNeeded?: boolean;
  followUpType?: string;
  documented: boolean;
}

export type LifeEventType =
  | 'employment-change'
  | 'insurance-change'
  | 'relocation'
  | 'marriage'
  | 'divorce'
  | 'bereavement'
  | 'new-baby'
  | 'retirement'
  | 'caregiver-role'
  | 'hospitalization'
  | 'accident'
  | 'diagnosis'
  | 'surgery'
  | 'other';

export interface SDOHTimeline {
  patientId: string;
  domain: string;
  assessments: SDOHAssessment[];
  currentStatus: 'no-risk' | 'low-risk' | 'moderate-risk' | 'high-risk';
  trend: 'improving' | 'stable' | 'worsening';
  interventions?: string[];
  resources?: string[];
}

export interface SDOHAssessment {
  date: Date;
  riskLevel: 'no-risk' | 'low-risk' | 'moderate-risk' | 'high-risk';
  screeningTool?: string;
  notes?: string;
}

export interface PatientCareTimeline {
  patientId: string;
  careGaps: CareGap[];
  chronicMetrics: ChronicDiseaseMetric[];
  medicationAdherence: MedicationAdherence[];
  lifeEvents: LifeEvent[];
  sdohTimelines: SDOHTimeline[];
  overallRiskScore: number;
  prioritizedActions: PrioritizedAction[];
}

export interface PrioritizedAction {
  rank: number;
  careGapId?: string;
  actionType: 'close-gap' | 'address-metric' | 'medication-adherence' | 'sdoh-intervention' | 'follow-up';
  description: string;
  rationale: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

// =============================================================================
// Preventive Care Guidelines Database
// =============================================================================

interface PreventiveGuideline {
  name: string;
  category: CareGapCategory;
  ageMin?: number;
  ageMax?: number;
  sex?: 'male' | 'female' | 'all';
  frequencyMonths: number;
  conditions?: string[];
  excludeConditions?: string[];
  evidenceGuideline: string;
  qualityMeasure?: string;
  orderTemplate?: string;
  patientDescription: string;
}

const PREVENTIVE_GUIDELINES: PreventiveGuideline[] = [
  // Cancer Screenings
  {
    name: 'Colorectal Cancer Screening',
    category: 'preventive-screening',
    ageMin: 45,
    ageMax: 75,
    sex: 'all',
    frequencyMonths: 120, // 10 years for colonoscopy
    evidenceGuideline: 'USPSTF Grade A',
    qualityMeasure: 'HEDIS COL',
    orderTemplate: 'colonoscopy-screening',
    patientDescription: 'Colon cancer screening is recommended starting at age 45. This test can find cancer early when it\'s most treatable.',
  },
  {
    name: 'Breast Cancer Screening (Mammogram)',
    category: 'preventive-screening',
    ageMin: 40,
    ageMax: 74,
    sex: 'female',
    frequencyMonths: 24,
    evidenceGuideline: 'USPSTF Grade B',
    qualityMeasure: 'HEDIS BCS',
    orderTemplate: 'mammogram-screening',
    patientDescription: 'Mammograms help find breast cancer early. Women 40 and older should discuss screening with their doctor.',
  },
  {
    name: 'Cervical Cancer Screening (Pap)',
    category: 'preventive-screening',
    ageMin: 21,
    ageMax: 65,
    sex: 'female',
    frequencyMonths: 36,
    evidenceGuideline: 'USPSTF Grade A',
    qualityMeasure: 'HEDIS CCS',
    orderTemplate: 'pap-smear',
    patientDescription: 'Pap tests help find cervical cancer early. Women 21-65 should be screened every 3 years.',
  },
  {
    name: 'Lung Cancer Screening (LDCT)',
    category: 'preventive-screening',
    ageMin: 50,
    ageMax: 80,
    sex: 'all',
    frequencyMonths: 12,
    conditions: ['smoking-history-20-pack-years'],
    evidenceGuideline: 'USPSTF Grade B',
    orderTemplate: 'ldct-lung-screening',
    patientDescription: 'Low-dose CT scans can find lung cancer early in people with a history of heavy smoking.',
  },
  {
    name: 'Prostate Cancer Discussion',
    category: 'preventive-screening',
    ageMin: 55,
    ageMax: 69,
    sex: 'male',
    frequencyMonths: 12,
    evidenceGuideline: 'USPSTF Grade C',
    patientDescription: 'Men 55-69 should discuss the benefits and harms of PSA testing with their doctor.',
  },

  // Cardiovascular
  {
    name: 'Blood Pressure Screening',
    category: 'preventive-screening',
    ageMin: 18,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'USPSTF Grade A',
    patientDescription: 'Regular blood pressure checks help find high blood pressure early.',
  },
  {
    name: 'Cholesterol Screening',
    category: 'preventive-screening',
    ageMin: 40,
    ageMax: 75,
    sex: 'all',
    frequencyMonths: 60,
    evidenceGuideline: 'USPSTF Grade B',
    qualityMeasure: 'HEDIS',
    orderTemplate: 'lipid-panel',
    patientDescription: 'Cholesterol tests help assess your risk for heart disease.',
  },
  {
    name: 'Abdominal Aortic Aneurysm Screening',
    category: 'preventive-screening',
    ageMin: 65,
    ageMax: 75,
    sex: 'male',
    frequencyMonths: 0, // One-time
    conditions: ['smoking-history'],
    evidenceGuideline: 'USPSTF Grade B',
    orderTemplate: 'aaa-ultrasound',
    patientDescription: 'One-time ultrasound screening for men 65-75 who have ever smoked.',
  },

  // Metabolic
  {
    name: 'Diabetes Screening',
    category: 'preventive-screening',
    ageMin: 35,
    ageMax: 70,
    sex: 'all',
    frequencyMonths: 36,
    conditions: ['overweight-obese'],
    evidenceGuideline: 'USPSTF Grade B',
    qualityMeasure: 'HEDIS',
    orderTemplate: 'hba1c',
    patientDescription: 'Diabetes screening is recommended for adults 35-70 who are overweight.',
  },

  // Bone Health
  {
    name: 'Osteoporosis Screening',
    category: 'preventive-screening',
    ageMin: 65,
    sex: 'female',
    frequencyMonths: 24,
    evidenceGuideline: 'USPSTF Grade B',
    orderTemplate: 'dexa-scan',
    patientDescription: 'Bone density testing helps find osteoporosis before you break a bone.',
  },

  // Immunizations
  {
    name: 'Influenza Vaccine',
    category: 'immunization',
    ageMin: 6,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'CDC/ACIP',
    qualityMeasure: 'HEDIS FVA',
    orderTemplate: 'flu-vaccine',
    patientDescription: 'Yearly flu shots help protect you and others from the flu.',
  },
  {
    name: 'Pneumococcal Vaccine (PCV)',
    category: 'immunization',
    ageMin: 65,
    sex: 'all',
    frequencyMonths: 0, // Once
    evidenceGuideline: 'CDC/ACIP',
    qualityMeasure: 'HEDIS PNU',
    orderTemplate: 'pneumonia-vaccine',
    patientDescription: 'Pneumonia vaccine helps protect adults 65+ from serious lung infections.',
  },
  {
    name: 'Shingles Vaccine (RZV)',
    category: 'immunization',
    ageMin: 50,
    sex: 'all',
    frequencyMonths: 0, // Two-dose series
    evidenceGuideline: 'CDC/ACIP',
    orderTemplate: 'shingrix-vaccine',
    patientDescription: 'Shingles vaccine is recommended for adults 50+ to prevent painful shingles.',
  },
  {
    name: 'Tdap/Td Vaccine',
    category: 'immunization',
    ageMin: 18,
    sex: 'all',
    frequencyMonths: 120, // 10 years
    evidenceGuideline: 'CDC/ACIP',
    orderTemplate: 'tdap-vaccine',
    patientDescription: 'Tetanus booster every 10 years protects against tetanus, diphtheria, and whooping cough.',
  },
  {
    name: 'COVID-19 Vaccine',
    category: 'immunization',
    ageMin: 6,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'CDC/ACIP',
    orderTemplate: 'covid-vaccine',
    patientDescription: 'COVID-19 vaccination helps protect against severe illness.',
  },
  {
    name: 'RSV Vaccine',
    category: 'immunization',
    ageMin: 60,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'CDC/ACIP',
    orderTemplate: 'rsv-vaccine',
    patientDescription: 'RSV vaccine helps protect adults 60+ from respiratory illness.',
  },

  // Mental Health
  {
    name: 'Depression Screening',
    category: 'preventive-screening',
    ageMin: 12,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'USPSTF Grade B',
    qualityMeasure: 'HEDIS',
    patientDescription: 'Screening for depression helps identify people who may benefit from treatment.',
  },
  {
    name: 'Anxiety Screening',
    category: 'preventive-screening',
    ageMin: 18,
    ageMax: 64,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'USPSTF Grade B',
    patientDescription: 'Anxiety screening helps identify people who may benefit from treatment.',
  },

  // Substance Use
  {
    name: 'Alcohol Misuse Screening',
    category: 'preventive-screening',
    ageMin: 18,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'USPSTF Grade B',
    patientDescription: 'Screening helps identify unhealthy alcohol use early.',
  },
  {
    name: 'Tobacco Use Screening & Cessation',
    category: 'wellness',
    ageMin: 18,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'USPSTF Grade A',
    qualityMeasure: 'HEDIS',
    patientDescription: 'We can help you quit smoking with proven treatments.',
  },

  // Other
  {
    name: 'Falls Risk Assessment',
    category: 'safety',
    ageMin: 65,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'USPSTF Grade B',
    patientDescription: 'Fall risk assessment helps prevent injuries from falls.',
  },
  {
    name: 'Annual Wellness Visit',
    category: 'wellness',
    ageMin: 65,
    sex: 'all',
    frequencyMonths: 12,
    evidenceGuideline: 'Medicare',
    qualityMeasure: 'HEDIS AWC',
    patientDescription: 'Annual wellness visits help keep you healthy by reviewing your health and creating a prevention plan.',
  },
];

// =============================================================================
// Chronic Disease Monitoring Guidelines
// =============================================================================

interface ChronicDiseaseGuideline {
  condition: string;
  metrics: ChronicMetricGuideline[];
}

interface ChronicMetricGuideline {
  metric: string;
  unit: string;
  targetRange: { min?: number; max?: number };
  frequencyMonths: number;
  evidenceGuideline: string;
  criticalThresholds?: { low?: number; high?: number };
}

const CHRONIC_DISEASE_GUIDELINES: ChronicDiseaseGuideline[] = [
  {
    condition: 'Type 2 Diabetes',
    metrics: [
      {
        metric: 'HbA1c',
        unit: '%',
        targetRange: { max: 7.0 },
        frequencyMonths: 3,
        evidenceGuideline: 'ADA Standards of Care',
        criticalThresholds: { high: 9.0 },
      },
      {
        metric: 'Fasting Glucose',
        unit: 'mg/dL',
        targetRange: { min: 80, max: 130 },
        frequencyMonths: 3,
        evidenceGuideline: 'ADA Standards of Care',
      },
      {
        metric: 'LDL Cholesterol',
        unit: 'mg/dL',
        targetRange: { max: 100 },
        frequencyMonths: 12,
        evidenceGuideline: 'ADA Standards of Care',
      },
      {
        metric: 'Blood Pressure',
        unit: 'mmHg',
        targetRange: { max: 130 }, // Systolic
        frequencyMonths: 3,
        evidenceGuideline: 'ADA Standards of Care',
      },
      {
        metric: 'eGFR',
        unit: 'mL/min/1.73m²',
        targetRange: { min: 60 },
        frequencyMonths: 12,
        evidenceGuideline: 'ADA Standards of Care',
        criticalThresholds: { low: 30 },
      },
      {
        metric: 'Urine Albumin/Creatinine Ratio',
        unit: 'mg/g',
        targetRange: { max: 30 },
        frequencyMonths: 12,
        evidenceGuideline: 'ADA Standards of Care',
      },
    ],
  },
  {
    condition: 'Hypertension',
    metrics: [
      {
        metric: 'Systolic Blood Pressure',
        unit: 'mmHg',
        targetRange: { max: 130 },
        frequencyMonths: 3,
        evidenceGuideline: 'ACC/AHA Guidelines',
        criticalThresholds: { high: 180 },
      },
      {
        metric: 'Diastolic Blood Pressure',
        unit: 'mmHg',
        targetRange: { max: 80 },
        frequencyMonths: 3,
        evidenceGuideline: 'ACC/AHA Guidelines',
        criticalThresholds: { high: 120 },
      },
    ],
  },
  {
    condition: 'Chronic Kidney Disease',
    metrics: [
      {
        metric: 'eGFR',
        unit: 'mL/min/1.73m²',
        targetRange: { min: 60 },
        frequencyMonths: 6,
        evidenceGuideline: 'KDIGO Guidelines',
        criticalThresholds: { low: 15 },
      },
      {
        metric: 'Urine Albumin/Creatinine Ratio',
        unit: 'mg/g',
        targetRange: { max: 30 },
        frequencyMonths: 12,
        evidenceGuideline: 'KDIGO Guidelines',
      },
      {
        metric: 'Potassium',
        unit: 'mEq/L',
        targetRange: { min: 3.5, max: 5.0 },
        frequencyMonths: 6,
        evidenceGuideline: 'KDIGO Guidelines',
        criticalThresholds: { low: 3.0, high: 6.0 },
      },
    ],
  },
  {
    condition: 'Heart Failure',
    metrics: [
      {
        metric: 'BNP',
        unit: 'pg/mL',
        targetRange: { max: 100 },
        frequencyMonths: 6,
        evidenceGuideline: 'ACC/AHA Guidelines',
      },
      {
        metric: 'Weight',
        unit: 'lbs',
        targetRange: {},
        frequencyMonths: 1,
        evidenceGuideline: 'ACC/AHA Guidelines',
      },
      {
        metric: 'Ejection Fraction',
        unit: '%',
        targetRange: { min: 50 },
        frequencyMonths: 12,
        evidenceGuideline: 'ACC/AHA Guidelines',
      },
    ],
  },
  {
    condition: 'COPD',
    metrics: [
      {
        metric: 'FEV1',
        unit: '% predicted',
        targetRange: { min: 80 },
        frequencyMonths: 12,
        evidenceGuideline: 'GOLD Guidelines',
      },
      {
        metric: 'CAT Score',
        unit: 'points',
        targetRange: { max: 10 },
        frequencyMonths: 3,
        evidenceGuideline: 'GOLD Guidelines',
      },
      {
        metric: 'Exacerbations/Year',
        unit: 'count',
        targetRange: { max: 1 },
        frequencyMonths: 12,
        evidenceGuideline: 'GOLD Guidelines',
      },
    ],
  },
  {
    condition: 'Hyperlipidemia',
    metrics: [
      {
        metric: 'LDL Cholesterol',
        unit: 'mg/dL',
        targetRange: { max: 100 },
        frequencyMonths: 12,
        evidenceGuideline: 'ACC/AHA Guidelines',
      },
      {
        metric: 'Total Cholesterol',
        unit: 'mg/dL',
        targetRange: { max: 200 },
        frequencyMonths: 12,
        evidenceGuideline: 'ACC/AHA Guidelines',
      },
      {
        metric: 'Triglycerides',
        unit: 'mg/dL',
        targetRange: { max: 150 },
        frequencyMonths: 12,
        evidenceGuideline: 'ACC/AHA Guidelines',
      },
    ],
  },
];

// =============================================================================
// Care Gaps Service Class
// =============================================================================

export class CareGapsService extends EventEmitter {
  private patientGaps: Map<string, CareGap[]> = new Map();
  private patientMetrics: Map<string, ChronicDiseaseMetric[]> = new Map();
  private patientAdherence: Map<string, MedicationAdherence[]> = new Map();
  private patientEvents: Map<string, LifeEvent[]> = new Map();
  private patientSDOH: Map<string, SDOHTimeline[]> = new Map();

  constructor() {
    super();
  }

  // ===========================================================================
  // Care Gap Assessment
  // ===========================================================================

  assessCareGaps(
    patientId: string,
    demographics: { age: number; sex: 'male' | 'female' },
    conditions: string[],
    completedScreenings: { name: string; date: Date }[]
  ): CareGap[] {
    const gaps: CareGap[] = [];
    const today = new Date();

    for (const guideline of PREVENTIVE_GUIDELINES) {
      // Check age eligibility
      if (guideline.ageMin && demographics.age < guideline.ageMin) continue;
      if (guideline.ageMax && demographics.age > guideline.ageMax) continue;

      // Check sex eligibility
      if (guideline.sex && guideline.sex !== 'all' && guideline.sex !== demographics.sex) continue;

      // Check condition requirements
      if (guideline.conditions) {
        const hasRequiredCondition = guideline.conditions.some(c =>
          conditions.some(pc => pc.toLowerCase().includes(c.toLowerCase()))
        );
        if (!hasRequiredCondition) continue;
      }

      // Check exclusions
      if (guideline.excludeConditions) {
        const hasExclusion = guideline.excludeConditions.some(c =>
          conditions.some(pc => pc.toLowerCase().includes(c.toLowerCase()))
        );
        if (hasExclusion) continue;
      }

      // Find last completion
      const lastCompletion = completedScreenings.find(s =>
        s.name.toLowerCase() === guideline.name.toLowerCase()
      );

      // Calculate status
      let status: CareGap['status'] = 'due';
      let nextDueDate: Date | undefined;
      let daysOverdue: number | undefined;

      if (lastCompletion) {
        if (guideline.frequencyMonths === 0) {
          // One-time screening, already done
          status = 'completed';
        } else {
          const monthsSinceCompletion = this.monthsBetween(lastCompletion.date, today);
          if (monthsSinceCompletion < guideline.frequencyMonths) {
            status = 'completed';
            nextDueDate = new Date(lastCompletion.date);
            nextDueDate.setMonth(nextDueDate.getMonth() + guideline.frequencyMonths);
          } else {
            status = 'overdue';
            daysOverdue = Math.floor((monthsSinceCompletion - guideline.frequencyMonths) * 30);
          }
        }
      }

      // Determine priority
      let priority: CareGap['priority'] = 'medium';
      if (status === 'overdue' && daysOverdue && daysOverdue > 180) {
        priority = 'high';
      }
      if (guideline.category === 'preventive-screening' &&
          guideline.name.toLowerCase().includes('cancer')) {
        priority = status === 'overdue' ? 'high' : 'medium';
      }

      const gap: CareGap = {
        id: `gap_${patientId}_${guideline.name.replace(/\s+/g, '-').toLowerCase()}`,
        patientId,
        category: guideline.category,
        type: guideline.name,
        name: guideline.name,
        description: guideline.patientDescription,
        status,
        priority,
        dueDate: status === 'due' || status === 'overdue' ? today : undefined,
        lastCompletedDate: lastCompletion?.date,
        nextDueDate,
        daysOverdue,
        frequencyMonths: guideline.frequencyMonths,
        evidenceGuideline: guideline.evidenceGuideline,
        qualityMeasure: guideline.qualityMeasure,
        orderTemplate: guideline.orderTemplate,
        patientFacingDescription: guideline.patientDescription,
      };

      gaps.push(gap);
    }

    this.patientGaps.set(patientId, gaps);
    return gaps;
  }

  private monthsBetween(date1: Date, date2: Date): number {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12 +
                   (date2.getMonth() - date1.getMonth());
    return months;
  }

  // ===========================================================================
  // Chronic Disease Metrics
  // ===========================================================================

  assessChronicMetrics(
    patientId: string,
    conditions: string[],
    labResults: { name: string; value: number; date: Date; unit: string }[]
  ): ChronicDiseaseMetric[] {
    const metrics: ChronicDiseaseMetric[] = [];

    for (const diseaseGuideline of CHRONIC_DISEASE_GUIDELINES) {
      // Check if patient has this condition
      const hasCondition = conditions.some(c =>
        c.toLowerCase().includes(diseaseGuideline.condition.toLowerCase())
      );
      if (!hasCondition) continue;

      for (const metricGuideline of diseaseGuideline.metrics) {
        // Find matching lab results
        const matchingResults = labResults
          .filter(r => r.name.toLowerCase().includes(metricGuideline.metric.toLowerCase()))
          .sort((a, b) => b.date.getTime() - a.date.getTime());

        const values: MetricValue[] = matchingResults.map(r => ({
          date: r.date,
          value: r.value,
          source: 'lab' as const,
        }));

        const lastValue = values[0]?.value;
        const lastDate = values[0]?.date;

        // Determine if at goal
        let atGoal = true;
        if (lastValue !== undefined) {
          if (metricGuideline.targetRange.min !== undefined && lastValue < metricGuideline.targetRange.min) {
            atGoal = false;
          }
          if (metricGuideline.targetRange.max !== undefined && lastValue > metricGuideline.targetRange.max) {
            atGoal = false;
          }
        }

        // Calculate trend
        const trend = this.calculateTrend(values);

        // Calculate next check due
        const nextCheckDue = lastDate ? new Date(lastDate) : new Date();
        nextCheckDue.setMonth(nextCheckDue.getMonth() + metricGuideline.frequencyMonths);

        const metric: ChronicDiseaseMetric = {
          patientId,
          condition: diseaseGuideline.condition,
          metric: metricGuideline.metric,
          unit: metricGuideline.unit,
          targetRange: metricGuideline.targetRange,
          values,
          trend,
          lastValue,
          lastDate,
          atGoal,
          nextCheckDue,
          recommendations: this.getMetricRecommendations(metricGuideline, lastValue, atGoal),
        };

        metrics.push(metric);
      }
    }

    this.patientMetrics.set(patientId, metrics);
    return metrics;
  }

  private calculateTrend(values: MetricValue[]): ChronicDiseaseMetric['trend'] {
    if (values.length < 3) return 'insufficient-data';

    const recent = values.slice(0, 3).map(v => v.value);
    const avgChange = (recent[0] - recent[2]) / 2;

    if (Math.abs(avgChange) < 0.05 * recent[0]) return 'stable';
    
    // For most metrics, lower is better (except things like eGFR)
    // This is simplified - would need metric-specific logic
    if (avgChange < 0) return 'improving';
    return 'worsening';
  }

  private getMetricRecommendations(
    guideline: ChronicMetricGuideline,
    value: number | undefined,
    atGoal: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!atGoal && value !== undefined) {
      if (guideline.metric === 'HbA1c') {
        if (value > 9) {
          recommendations.push('Consider intensifying diabetes therapy');
          recommendations.push('Evaluate for barriers to medication adherence');
        } else if (value > 7) {
          recommendations.push('Review lifestyle modifications');
          recommendations.push('Consider medication adjustment');
        }
      }

      if (guideline.metric.includes('Blood Pressure')) {
        recommendations.push('Verify home blood pressure readings');
        recommendations.push('Review sodium intake and lifestyle factors');
      }

      if (guideline.metric === 'LDL Cholesterol') {
        recommendations.push('Assess statin adherence');
        recommendations.push('Consider statin intensity adjustment');
      }
    }

    return recommendations;
  }

  // ===========================================================================
  // Medication Adherence
  // ===========================================================================

  assessMedicationAdherence(
    patientId: string,
    medications: { id: string; name: string; daysSupply: number }[],
    refillHistory: { medicationId: string; date: Date; daysSupply: number }[]
  ): MedicationAdherence[] {
    const adherence: MedicationAdherence[] = [];

    for (const med of medications) {
      const medRefills = refillHistory
        .filter(r => r.medicationId === med.id)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      // Calculate adherence rate (PDC - Proportion of Days Covered)
      const pdc = this.calculatePDC(medRefills, 365);

      // Identify gaps
      const gaps = this.identifyMedicationGaps(medRefills, med.daysSupply);

      const medAdherence: MedicationAdherence = {
        patientId,
        medicationId: med.id,
        medicationName: med.name,
        adherenceRate: Math.round(pdc * 100),
        refillHistory: medRefills.map(r => ({
          date: r.date,
          daysSupply: r.daysSupply,
        })),
        gapsIdentified: gaps,
        estimatedDaysSupply: med.daysSupply,
        lastRefillDate: medRefills[0]?.date,
        nextRefillDue: medRefills[0] ? 
          new Date(medRefills[0].date.getTime() + (med.daysSupply - 7) * 24 * 60 * 60 * 1000) : 
          undefined,
      };

      adherence.push(medAdherence);
    }

    this.patientAdherence.set(patientId, adherence);
    return adherence;
  }

  private calculatePDC(refills: { date: Date; daysSupply: number }[], periodDays: number): number {
    if (refills.length === 0) return 0;

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - periodDays);

    let daysCovered = 0;
    const covered = new Set<string>();

    for (const refill of refills) {
      if (refill.date < startDate) continue;
      
      for (let d = 0; d < refill.daysSupply; d++) {
        const coveredDate = new Date(refill.date);
        coveredDate.setDate(coveredDate.getDate() + d);
        if (coveredDate >= startDate && coveredDate <= endDate) {
          covered.add(coveredDate.toISOString().split('T')[0]);
        }
      }
    }

    return covered.size / periodDays;
  }

  private identifyMedicationGaps(
    refills: { date: Date; daysSupply: number }[],
    expectedDaysSupply: number
  ): MedicationGap[] {
    const gaps: MedicationGap[] = [];
    
    for (let i = 0; i < refills.length - 1; i++) {
      const currentRefill = refills[i];
      const nextRefill = refills[i + 1];
      
      const expectedEndDate = new Date(nextRefill.date);
      expectedEndDate.setDate(expectedEndDate.getDate() + nextRefill.daysSupply);
      
      const daysGap = Math.floor(
        (currentRefill.date.getTime() - expectedEndDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      if (daysGap > 7) { // More than 7 days gap
        gaps.push({
          startDate: expectedEndDate,
          endDate: currentRefill.date,
          daysWithoutMedication: daysGap,
          addressed: false,
        });
      }
    }

    return gaps;
  }

  // ===========================================================================
  // Life Events
  // ===========================================================================

  addLifeEvent(event: Omit<LifeEvent, 'documented'>): LifeEvent {
    const lifeEvent: LifeEvent = {
      ...event,
      documented: true,
    };

    const events = this.patientEvents.get(event.patientId) || [];
    events.push(lifeEvent);
    this.patientEvents.set(event.patientId, events);

    this.emit('lifeEventAdded', lifeEvent);
    return lifeEvent;
  }

  getLifeEvents(patientId: string): LifeEvent[] {
    return this.patientEvents.get(patientId) || [];
  }

  // ===========================================================================
  // Comprehensive Timeline
  // ===========================================================================

  getPatientTimeline(patientId: string): PatientCareTimeline {
    const careGaps = this.patientGaps.get(patientId) || [];
    const chronicMetrics = this.patientMetrics.get(patientId) || [];
    const medicationAdherence = this.patientAdherence.get(patientId) || [];
    const lifeEvents = this.patientEvents.get(patientId) || [];
    const sdohTimelines = this.patientSDOH.get(patientId) || [];

    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRisk(
      careGaps,
      chronicMetrics,
      medicationAdherence
    );

    // Generate prioritized actions
    const prioritizedActions = this.generatePrioritizedActions(
      careGaps,
      chronicMetrics,
      medicationAdherence
    );

    return {
      patientId,
      careGaps,
      chronicMetrics,
      medicationAdherence,
      lifeEvents,
      sdohTimelines,
      overallRiskScore,
      prioritizedActions,
    };
  }

  private calculateOverallRisk(
    gaps: CareGap[],
    metrics: ChronicDiseaseMetric[],
    adherence: MedicationAdherence[]
  ): number {
    let risk = 0;

    // Overdue gaps add risk
    const overdueGaps = gaps.filter(g => g.status === 'overdue');
    risk += overdueGaps.length * 5;
    risk += overdueGaps.filter(g => g.priority === 'high').length * 5;

    // Metrics not at goal add risk
    const notAtGoal = metrics.filter(m => !m.atGoal);
    risk += notAtGoal.length * 3;
    risk += notAtGoal.filter(m => m.trend === 'worsening').length * 5;

    // Poor adherence adds risk
    const poorAdherence = adherence.filter(a => a.adherenceRate < 80);
    risk += poorAdherence.length * 5;

    return Math.min(100, risk);
  }

  private generatePrioritizedActions(
    gaps: CareGap[],
    metrics: ChronicDiseaseMetric[],
    adherence: MedicationAdherence[]
  ): PrioritizedAction[] {
    const actions: PrioritizedAction[] = [];
    let rank = 1;

    // High priority overdue gaps first
    for (const gap of gaps.filter(g => g.status === 'overdue' && g.priority === 'high')) {
      actions.push({
        rank: rank++,
        careGapId: gap.id,
        actionType: 'close-gap',
        description: `Complete ${gap.name}`,
        rationale: `Overdue by ${gap.daysOverdue} days`,
        estimatedImpact: 'high',
        effort: 'medium',
      });
    }

    // Worsening metrics
    for (const metric of metrics.filter(m => m.trend === 'worsening' && !m.atGoal)) {
      actions.push({
        rank: rank++,
        actionType: 'address-metric',
        description: `Address worsening ${metric.metric}`,
        rationale: `Current: ${metric.lastValue} ${metric.unit}, Goal: ${metric.targetRange.max || metric.targetRange.min}`,
        estimatedImpact: 'high',
        effort: 'medium',
      });
    }

    // Poor medication adherence
    for (const med of adherence.filter(a => a.adherenceRate < 80)) {
      actions.push({
        rank: rank++,
        actionType: 'medication-adherence',
        description: `Address ${med.medicationName} adherence (${med.adherenceRate}%)`,
        rationale: 'Adherence below 80% associated with poor outcomes',
        estimatedImpact: 'high',
        effort: 'low',
      });
    }

    // Other overdue gaps
    for (const gap of gaps.filter(g => g.status === 'overdue' && g.priority !== 'high')) {
      if (actions.length >= 10) break;
      actions.push({
        rank: rank++,
        careGapId: gap.id,
        actionType: 'close-gap',
        description: `Complete ${gap.name}`,
        rationale: gap.daysOverdue ? `Overdue by ${gap.daysOverdue} days` : 'Due',
        estimatedImpact: 'medium',
        effort: 'low',
      });
    }

    return actions;
  }

  // ===========================================================================
  // Summary Statistics
  // ===========================================================================

  getCareGapSummary(patientId: string): {
    total: number;
    overdue: number;
    due: number;
    completed: number;
    byCategory: Record<string, number>;
  } {
    const gaps = this.patientGaps.get(patientId) || [];
    
    return {
      total: gaps.length,
      overdue: gaps.filter(g => g.status === 'overdue').length,
      due: gaps.filter(g => g.status === 'due').length,
      completed: gaps.filter(g => g.status === 'completed').length,
      byCategory: gaps.reduce((acc, g) => {
        acc[g.category] = (acc[g.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

// Singleton instance
export const careGapsService = new CareGapsService();
export default careGapsService;
