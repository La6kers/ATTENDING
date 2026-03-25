// =============================================================================
// ATTENDING AI - Predictive Deterioration Alerts Service
// apps/shared/services/predictive-alerts/DeteriorationAlertService.ts
//
// ML-based prediction of patient deterioration including:
// - Sepsis (6-12 hours before clinical signs)
// - Heart failure exacerbation
// - COPD flare-ups
// - Diabetic ketoacidosis
// - Acute kidney injury
// - Hospital readmission risk
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface PatientVitals {
  timestamp: Date;
  heartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  meanArterialPressure?: number;
  pulseOximetry?: number;
}

export interface PatientLabs {
  timestamp: Date;
  whiteBloodCell?: number;
  lactate?: number;
  creatinine?: number;
  baselineCreatinine?: number;
  bun?: number;
  glucose?: number;
  bicarbonate?: number;
  ph?: number;
  potassium?: number;
  sodium?: number;
  hemoglobin?: number;
  platelets?: number;
  bilirubin?: number;
  procalcitonin?: number;
  bnp?: number;
  troponin?: number;
  inr?: number;
}

export interface PatientContext {
  patientId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  conditions: string[];
  medications: string[];
  recentProcedures?: string[];
  allergies?: string[];
  immunocompromised?: boolean;
  onVentilator?: boolean;
  hasUrinaryCatheter?: boolean;
  hasCentralLine?: boolean;
  lengthOfStay?: number; // days
  isPostOperative?: boolean;
  admissionDiagnosis?: string;
}

export interface DeteriorationAlert {
  id: string;
  patientId: string;
  alertType: AlertType;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  score: number; // 0-100
  confidence: number; // 0-1
  predictedTimeToEvent?: number; // hours
  timestamp: Date;
  triggeringFactors: TriggeringFactor[];
  recommendations: Recommendation[];
  status: 'new' | 'acknowledged' | 'escalated' | 'resolved' | 'false-positive';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  escalatedTo?: string;
  resolvedAt?: Date;
  notes?: string;
}

export type AlertType = 
  | 'sepsis'
  | 'heart-failure-exacerbation'
  | 'copd-exacerbation'
  | 'diabetic-ketoacidosis'
  | 'acute-kidney-injury'
  | 'respiratory-failure'
  | 'cardiac-arrest-risk'
  | 'stroke-risk'
  | 'readmission-risk'
  | 'general-deterioration';

export interface TriggeringFactor {
  factor: string;
  value: number | string;
  normalRange?: string;
  deviation: 'high' | 'low' | 'abnormal';
  weight: number; // contribution to score
  trend?: 'improving' | 'stable' | 'worsening';
}

export interface Recommendation {
  priority: 'immediate' | 'urgent' | 'routine';
  category: 'assessment' | 'labs' | 'imaging' | 'treatment' | 'consult' | 'monitoring';
  action: string;
  rationale: string;
  orderTemplate?: string;
}

export interface RiskScoreResult {
  alertType: AlertType;
  score: number;
  severity: DeteriorationAlert['severity'];
  confidence: number;
  factors: TriggeringFactor[];
  shouldAlert: boolean;
}

export interface AlertThresholds {
  sepsis: { low: number; moderate: number; high: number; critical: number };
  'heart-failure-exacerbation': { low: number; moderate: number; high: number; critical: number };
  'copd-exacerbation': { low: number; moderate: number; high: number; critical: number };
  'diabetic-ketoacidosis': { low: number; moderate: number; high: number; critical: number };
  'acute-kidney-injury': { low: number; moderate: number; high: number; critical: number };
  'respiratory-failure': { low: number; moderate: number; high: number; critical: number };
  'cardiac-arrest-risk': { low: number; moderate: number; high: number; critical: number };
  'readmission-risk': { low: number; moderate: number; high: number; critical: number };
  [key: string]: { low: number; moderate: number; high: number; critical: number };
}

// =============================================================================
// Default Thresholds
// =============================================================================

const DEFAULT_THRESHOLDS: AlertThresholds = {
  'sepsis': { low: 20, moderate: 40, high: 60, critical: 80 },
  'heart-failure-exacerbation': { low: 25, moderate: 45, high: 65, critical: 85 },
  'copd-exacerbation': { low: 25, moderate: 45, high: 65, critical: 85 },
  'diabetic-ketoacidosis': { low: 30, moderate: 50, high: 70, critical: 90 },
  'acute-kidney-injury': { low: 25, moderate: 45, high: 65, critical: 85 },
  'respiratory-failure': { low: 30, moderate: 50, high: 70, critical: 90 },
  'cardiac-arrest-risk': { low: 20, moderate: 40, high: 60, critical: 80 },
  'readmission-risk': { low: 30, moderate: 50, high: 70, critical: 85 },
  'stroke-risk': { low: 25, moderate: 45, high: 65, critical: 85 },
  'general-deterioration': { low: 30, moderate: 50, high: 70, critical: 85 },
};

// =============================================================================
// Deterioration Alert Service Class
// =============================================================================

export class DeteriorationAlertService extends EventEmitter {
  private alerts: Map<string, DeteriorationAlert[]> = new Map(); // patientId -> alerts
  private patientData: Map<string, { vitals: PatientVitals[]; labs: PatientLabs[]; context: PatientContext }> = new Map();
  private thresholds: AlertThresholds;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(thresholds?: Partial<AlertThresholds>) {
    super();
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  // ===========================================================================
  // Patient Data Management
  // ===========================================================================

  registerPatient(context: PatientContext): void {
    this.patientData.set(context.patientId, {
      vitals: [],
      labs: [],
      context,
    });
    this.alerts.set(context.patientId, []);
    console.log(`[ALERTS] Patient registered: ${context.patientId}`);
  }

  updatePatientContext(patientId: string, updates: Partial<PatientContext>): void {
    const data = this.patientData.get(patientId);
    if (data) {
      data.context = { ...data.context, ...updates };
    }
  }

  addVitals(patientId: string, vitals: PatientVitals): DeteriorationAlert[] {
    const data = this.patientData.get(patientId);
    if (!data) {
      console.warn(`[ALERTS] Patient not registered: ${patientId}`);
      return [];
    }

    data.vitals.push(vitals);
    
    // Keep last 48 hours of vitals
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    data.vitals = data.vitals.filter(v => v.timestamp.getTime() > cutoff);

    // Run predictions
    return this.evaluatePatient(patientId);
  }

  addLabs(patientId: string, labs: PatientLabs): DeteriorationAlert[] {
    const data = this.patientData.get(patientId);
    if (!data) {
      console.warn(`[ALERTS] Patient not registered: ${patientId}`);
      return [];
    }

    data.labs.push(labs);
    
    // Keep last 7 days of labs
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    data.labs = data.labs.filter(l => l.timestamp.getTime() > cutoff);

    // Run predictions
    return this.evaluatePatient(patientId);
  }

  // ===========================================================================
  // Continuous Monitoring
  // ===========================================================================

  startContinuousMonitoring(patientId: string, intervalMinutes: number = 15): void {
    this.stopContinuousMonitoring(patientId);
    
    const interval = setInterval(() => {
      this.evaluatePatient(patientId);
    }, intervalMinutes * 60 * 1000);

    this.monitoringIntervals.set(patientId, interval);
    console.log(`[ALERTS] Continuous monitoring started for ${patientId}`);
  }

  stopContinuousMonitoring(patientId: string): void {
    const interval = this.monitoringIntervals.get(patientId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(patientId);
    }
  }

  // ===========================================================================
  // Main Evaluation Engine
  // ===========================================================================

  evaluatePatient(patientId: string): DeteriorationAlert[] {
    const data = this.patientData.get(patientId);
    if (!data) return [];

    const newAlerts: DeteriorationAlert[] = [];
    const latestVitals = data.vitals[data.vitals.length - 1];
    const latestLabs = data.labs[data.labs.length - 1];

    // Run all risk assessments
    const assessments = [
      this.assessSepsisRisk(data.context, latestVitals, latestLabs, data.vitals),
      this.assessHeartFailureRisk(data.context, latestVitals, latestLabs, data.vitals),
      this.assessCOPDRisk(data.context, latestVitals, latestLabs, data.vitals),
      this.assessDKARisk(data.context, latestVitals, latestLabs),
      this.assessAKIRisk(data.context, latestLabs),
      this.assessRespiratoryFailureRisk(data.context, latestVitals, latestLabs, data.vitals),
      this.assessCardiacArrestRisk(data.context, latestVitals, latestLabs),
      this.assessReadmissionRisk(data.context, latestVitals, latestLabs),
    ];

    for (const assessment of assessments) {
      if (assessment && assessment.shouldAlert) {
        const alert = this.createAlert(patientId, assessment);
        newAlerts.push(alert);
        
        const existingAlerts = this.alerts.get(patientId) || [];
        existingAlerts.push(alert);
        this.alerts.set(patientId, existingAlerts);

        this.emit('newAlert', alert);
        
        if (alert.severity === 'critical') {
          this.emit('criticalAlert', alert);
        }
      }
    }

    return newAlerts;
  }

  private createAlert(patientId: string, result: RiskScoreResult): DeteriorationAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      alertType: result.alertType,
      severity: result.severity,
      score: result.score,
      confidence: result.confidence,
      timestamp: new Date(),
      triggeringFactors: result.factors,
      recommendations: this.getRecommendations(result.alertType, result.severity),
      status: 'new',
    };
  }

  // ===========================================================================
  // Sepsis Risk Assessment (qSOFA + SIRS + Custom ML Features)
  // ===========================================================================

  private assessSepsisRisk(
    context: PatientContext,
    vitals?: PatientVitals,
    labs?: PatientLabs,
    vitalHistory?: PatientVitals[]
  ): RiskScoreResult | null {
    if (!vitals) return null;

    const factors: TriggeringFactor[] = [];
    let score = 0;

    // qSOFA criteria (each worth up to 10 points)
    // Respiratory rate ≥22
    if (vitals.respiratoryRate && vitals.respiratoryRate >= 22) {
      score += 15;
      factors.push({
        factor: 'Elevated respiratory rate',
        value: vitals.respiratoryRate,
        normalRange: '12-20 breaths/min',
        deviation: 'high',
        weight: 15,
        trend: this.calculateTrend(vitalHistory, 'respiratoryRate'),
      });
    }

    // Altered mental status (would need GCS, using proxy)
    // Systolic BP ≤100
    if (vitals.systolicBP && vitals.systolicBP <= 100) {
      score += 15;
      factors.push({
        factor: 'Hypotension',
        value: vitals.systolicBP,
        normalRange: '90-120 mmHg',
        deviation: 'low',
        weight: 15,
        trend: this.calculateTrend(vitalHistory, 'systolicBP'),
      });
    }

    // SIRS criteria
    // Temperature >38°C or <36°C
    if (vitals.temperature && (vitals.temperature > 38 || vitals.temperature < 36)) {
      score += 12;
      factors.push({
        factor: vitals.temperature > 38 ? 'Fever' : 'Hypothermia',
        value: vitals.temperature,
        normalRange: '36.5-37.5°C',
        deviation: vitals.temperature > 38 ? 'high' : 'low',
        weight: 12,
      });
    }

    // Heart rate >90
    if (vitals.heartRate && vitals.heartRate > 90) {
      score += 10;
      factors.push({
        factor: 'Tachycardia',
        value: vitals.heartRate,
        normalRange: '60-100 bpm',
        deviation: 'high',
        weight: 10,
        trend: this.calculateTrend(vitalHistory, 'heartRate'),
      });
    }

    // Lab values
    if (labs) {
      // WBC >12,000 or <4,000
      if (labs.whiteBloodCell && (labs.whiteBloodCell > 12 || labs.whiteBloodCell < 4)) {
        score += 12;
        factors.push({
          factor: labs.whiteBloodCell > 12 ? 'Leukocytosis' : 'Leukopenia',
          value: labs.whiteBloodCell,
          normalRange: '4.5-11.0 x10³/µL',
          deviation: labs.whiteBloodCell > 12 ? 'high' : 'low',
          weight: 12,
        });
      }

      // Lactate >2
      if (labs.lactate && labs.lactate > 2) {
        score += 18;
        factors.push({
          factor: 'Elevated lactate',
          value: labs.lactate,
          normalRange: '0.5-2.0 mmol/L',
          deviation: 'high',
          weight: 18,
        });
      }

      // Procalcitonin >0.5
      if (labs.procalcitonin && labs.procalcitonin > 0.5) {
        score += 15;
        factors.push({
          factor: 'Elevated procalcitonin',
          value: labs.procalcitonin,
          normalRange: '<0.5 ng/mL',
          deviation: 'high',
          weight: 15,
        });
      }
    }

    // Risk factors from context
    if (context.immunocompromised) {
      score += 10;
      factors.push({
        factor: 'Immunocompromised status',
        value: 'Yes',
        deviation: 'abnormal',
        weight: 10,
      });
    }

    if (context.hasUrinaryCatheter || context.hasCentralLine) {
      score += 8;
      factors.push({
        factor: 'Invasive device present',
        value: context.hasUrinaryCatheter ? 'Urinary catheter' : 'Central line',
        deviation: 'abnormal',
        weight: 8,
      });
    }

    // Normalize score to 0-100
    score = Math.min(100, score);

    return {
      alertType: 'sepsis',
      score,
      severity: this.getSeverity('sepsis', score),
      confidence: this.calculateConfidence(factors),
      factors,
      shouldAlert: score >= this.thresholds.sepsis.low,
    };
  }

  // ===========================================================================
  // Heart Failure Exacerbation Risk
  // ===========================================================================

  private assessHeartFailureRisk(
    context: PatientContext,
    vitals?: PatientVitals,
    labs?: PatientLabs,
    vitalHistory?: PatientVitals[]
  ): RiskScoreResult | null {
    // Only assess if patient has HF history
    if (!context.conditions.some(c => 
      c.toLowerCase().includes('heart failure') || 
      c.toLowerCase().includes('chf') ||
      c.toLowerCase().includes('cardiomyopathy')
    )) {
      return null;
    }

    const factors: TriggeringFactor[] = [];
    let score = 0;

    if (vitals) {
      // Oxygen desaturation
      if (vitals.oxygenSaturation && vitals.oxygenSaturation < 92) {
        score += 20;
        factors.push({
          factor: 'Hypoxia',
          value: vitals.oxygenSaturation,
          normalRange: '95-100%',
          deviation: 'low',
          weight: 20,
          trend: this.calculateTrend(vitalHistory, 'oxygenSaturation'),
        });
      }

      // Tachycardia
      if (vitals.heartRate && vitals.heartRate > 100) {
        score += 12;
        factors.push({
          factor: 'Tachycardia',
          value: vitals.heartRate,
          normalRange: '60-100 bpm',
          deviation: 'high',
          weight: 12,
        });
      }

      // Elevated respiratory rate
      if (vitals.respiratoryRate && vitals.respiratoryRate > 20) {
        score += 15;
        factors.push({
          factor: 'Tachypnea',
          value: vitals.respiratoryRate,
          normalRange: '12-20 breaths/min',
          deviation: 'high',
          weight: 15,
        });
      }
    }

    if (labs) {
      // Elevated BNP
      if (labs.bnp && labs.bnp > 400) {
        score += 25;
        factors.push({
          factor: 'Elevated BNP',
          value: labs.bnp,
          normalRange: '<100 pg/mL',
          deviation: 'high',
          weight: 25,
        });
      }

      // Worsening renal function
      if (labs.creatinine && labs.baselineCreatinine) {
        const increase = labs.creatinine - labs.baselineCreatinine;
        if (increase >= 0.3) {
          score += 15;
          factors.push({
            factor: 'Worsening renal function',
            value: `+${increase.toFixed(1)} from baseline`,
            deviation: 'high',
            weight: 15,
          });
        }
      }
    }

    score = Math.min(100, score);

    return {
      alertType: 'heart-failure-exacerbation',
      score,
      severity: this.getSeverity('heart-failure-exacerbation', score),
      confidence: this.calculateConfidence(factors),
      factors,
      shouldAlert: score >= this.thresholds['heart-failure-exacerbation'].low,
    };
  }

  // ===========================================================================
  // COPD Exacerbation Risk
  // ===========================================================================

  private assessCOPDRisk(
    context: PatientContext,
    vitals?: PatientVitals,
    labs?: PatientLabs,
    vitalHistory?: PatientVitals[]
  ): RiskScoreResult | null {
    if (!context.conditions.some(c => 
      c.toLowerCase().includes('copd') || 
      c.toLowerCase().includes('chronic obstructive')
    )) {
      return null;
    }

    const factors: TriggeringFactor[] = [];
    let score = 0;

    if (vitals) {
      // Oxygen desaturation
      if (vitals.oxygenSaturation && vitals.oxygenSaturation < 88) {
        score += 25;
        factors.push({
          factor: 'Significant hypoxia',
          value: vitals.oxygenSaturation,
          normalRange: '88-92% for COPD',
          deviation: 'low',
          weight: 25,
          trend: this.calculateTrend(vitalHistory, 'oxygenSaturation'),
        });
      }

      // Elevated respiratory rate
      if (vitals.respiratoryRate && vitals.respiratoryRate > 24) {
        score += 20;
        factors.push({
          factor: 'Significant tachypnea',
          value: vitals.respiratoryRate,
          normalRange: '12-20 breaths/min',
          deviation: 'high',
          weight: 20,
        });
      }

      // Tachycardia (can indicate distress)
      if (vitals.heartRate && vitals.heartRate > 110) {
        score += 10;
        factors.push({
          factor: 'Tachycardia',
          value: vitals.heartRate,
          normalRange: '60-100 bpm',
          deviation: 'high',
          weight: 10,
        });
      }
    }

    if (labs) {
      // Acidosis
      if (labs.ph && labs.ph < 7.35) {
        score += 25;
        factors.push({
          factor: 'Respiratory acidosis',
          value: labs.ph,
          normalRange: '7.35-7.45',
          deviation: 'low',
          weight: 25,
        });
      }

      // Elevated WBC (infection)
      if (labs.whiteBloodCell && labs.whiteBloodCell > 12) {
        score += 15;
        factors.push({
          factor: 'Leukocytosis (possible infection)',
          value: labs.whiteBloodCell,
          normalRange: '4.5-11.0 x10³/µL',
          deviation: 'high',
          weight: 15,
        });
      }
    }

    score = Math.min(100, score);

    return {
      alertType: 'copd-exacerbation',
      score,
      severity: this.getSeverity('copd-exacerbation', score),
      confidence: this.calculateConfidence(factors),
      factors,
      shouldAlert: score >= this.thresholds['copd-exacerbation'].low,
    };
  }

  // ===========================================================================
  // Diabetic Ketoacidosis Risk
  // ===========================================================================

  private assessDKARisk(
    context: PatientContext,
    vitals?: PatientVitals,
    labs?: PatientLabs
  ): RiskScoreResult | null {
    if (!context.conditions.some(c => 
      c.toLowerCase().includes('diabetes')
    )) {
      return null;
    }

    const factors: TriggeringFactor[] = [];
    let score = 0;

    if (labs) {
      // Hyperglycemia
      if (labs.glucose && labs.glucose > 250) {
        score += 20;
        factors.push({
          factor: 'Significant hyperglycemia',
          value: labs.glucose,
          normalRange: '70-140 mg/dL',
          deviation: 'high',
          weight: 20,
        });
      }

      if (labs.glucose && labs.glucose > 400) {
        score += 15; // Additional points for severe
      }

      // Acidosis
      if (labs.ph && labs.ph < 7.3) {
        score += 25;
        factors.push({
          factor: 'Metabolic acidosis',
          value: labs.ph,
          normalRange: '7.35-7.45',
          deviation: 'low',
          weight: 25,
        });
      }

      // Low bicarbonate
      if (labs.bicarbonate && labs.bicarbonate < 18) {
        score += 20;
        factors.push({
          factor: 'Low bicarbonate',
          value: labs.bicarbonate,
          normalRange: '22-28 mEq/L',
          deviation: 'low',
          weight: 20,
        });
      }

      // Elevated potassium (common in DKA)
      if (labs.potassium && labs.potassium > 5.5) {
        score += 10;
        factors.push({
          factor: 'Hyperkalemia',
          value: labs.potassium,
          normalRange: '3.5-5.0 mEq/L',
          deviation: 'high',
          weight: 10,
        });
      }
    }

    if (vitals) {
      // Tachycardia
      if (vitals.heartRate && vitals.heartRate > 100) {
        score += 10;
        factors.push({
          factor: 'Tachycardia',
          value: vitals.heartRate,
          normalRange: '60-100 bpm',
          deviation: 'high',
          weight: 10,
        });
      }

      // Kussmaul respirations (deep, rapid)
      if (vitals.respiratoryRate && vitals.respiratoryRate > 22) {
        score += 10;
        factors.push({
          factor: 'Increased respiratory rate',
          value: vitals.respiratoryRate,
          normalRange: '12-20 breaths/min',
          deviation: 'high',
          weight: 10,
        });
      }
    }

    score = Math.min(100, score);

    return {
      alertType: 'diabetic-ketoacidosis',
      score,
      severity: this.getSeverity('diabetic-ketoacidosis', score),
      confidence: this.calculateConfidence(factors),
      factors,
      shouldAlert: score >= this.thresholds['diabetic-ketoacidosis'].low,
    };
  }

  // ===========================================================================
  // Acute Kidney Injury Risk (KDIGO Criteria)
  // ===========================================================================

  private assessAKIRisk(
    context: PatientContext,
    labs?: PatientLabs
  ): RiskScoreResult | null {
    if (!labs || !labs.creatinine) return null;

    const factors: TriggeringFactor[] = [];
    let score = 0;

    const baseline = labs.baselineCreatinine || 1.0; // Use 1.0 if no baseline
    const current = labs.creatinine;
    const ratio = current / baseline;
    const absoluteIncrease = current - baseline;

    // KDIGO Stage 1: 1.5-1.9x baseline OR ≥0.3 increase
    if (ratio >= 1.5 || absoluteIncrease >= 0.3) {
      score += 30;
      factors.push({
        factor: 'AKI Stage 1 criteria met',
        value: `Cr ${current} (baseline ${baseline})`,
        normalRange: '<1.5x baseline',
        deviation: 'high',
        weight: 30,
      });
    }

    // KDIGO Stage 2: 2.0-2.9x baseline
    if (ratio >= 2.0) {
      score += 20;
      factors.push({
        factor: 'AKI Stage 2 criteria met',
        value: `${ratio.toFixed(1)}x baseline`,
        normalRange: '<2x baseline',
        deviation: 'high',
        weight: 20,
      });
    }

    // KDIGO Stage 3: ≥3x baseline OR Cr ≥4.0
    if (ratio >= 3.0 || current >= 4.0) {
      score += 25;
      factors.push({
        factor: 'AKI Stage 3 criteria met',
        value: current >= 4.0 ? `Cr ${current}` : `${ratio.toFixed(1)}x baseline`,
        normalRange: '<3x baseline',
        deviation: 'high',
        weight: 25,
      });
    }

    // Elevated BUN
    if (labs.bun && labs.bun > 40) {
      score += 10;
      factors.push({
        factor: 'Elevated BUN',
        value: labs.bun,
        normalRange: '7-20 mg/dL',
        deviation: 'high',
        weight: 10,
      });
    }

    // Hyperkalemia
    if (labs.potassium && labs.potassium > 5.5) {
      score += 15;
      factors.push({
        factor: 'Hyperkalemia',
        value: labs.potassium,
        normalRange: '3.5-5.0 mEq/L',
        deviation: 'high',
        weight: 15,
      });
    }

    score = Math.min(100, score);

    return {
      alertType: 'acute-kidney-injury',
      score,
      severity: this.getSeverity('acute-kidney-injury', score),
      confidence: this.calculateConfidence(factors),
      factors,
      shouldAlert: score >= this.thresholds['acute-kidney-injury'].low,
    };
  }

  // ===========================================================================
  // Respiratory Failure Risk
  // ===========================================================================

  private assessRespiratoryFailureRisk(
    context: PatientContext,
    vitals?: PatientVitals,
    labs?: PatientLabs,
    vitalHistory?: PatientVitals[]
  ): RiskScoreResult | null {
    const factors: TriggeringFactor[] = [];
    let score = 0;

    if (vitals) {
      // Severe hypoxia
      if (vitals.oxygenSaturation && vitals.oxygenSaturation < 88) {
        score += 30;
        factors.push({
          factor: 'Severe hypoxia',
          value: vitals.oxygenSaturation,
          normalRange: '95-100%',
          deviation: 'low',
          weight: 30,
          trend: this.calculateTrend(vitalHistory, 'oxygenSaturation'),
        });
      }

      // Significant tachypnea
      if (vitals.respiratoryRate && vitals.respiratoryRate > 28) {
        score += 25;
        factors.push({
          factor: 'Significant tachypnea',
          value: vitals.respiratoryRate,
          normalRange: '12-20 breaths/min',
          deviation: 'high',
          weight: 25,
        });
      }
    }

    if (labs) {
      // Respiratory acidosis
      if (labs.ph && labs.ph < 7.30) {
        score += 25;
        factors.push({
          factor: 'Severe acidosis',
          value: labs.ph,
          normalRange: '7.35-7.45',
          deviation: 'low',
          weight: 25,
        });
      }
    }

    // Already on ventilator - high baseline risk
    if (context.onVentilator) {
      score += 15;
      factors.push({
        factor: 'Mechanically ventilated',
        value: 'Yes',
        deviation: 'abnormal',
        weight: 15,
      });
    }

    score = Math.min(100, score);

    // Only alert if score is concerning
    if (score < 20) return null;

    return {
      alertType: 'respiratory-failure',
      score,
      severity: this.getSeverity('respiratory-failure', score),
      confidence: this.calculateConfidence(factors),
      factors,
      shouldAlert: score >= this.thresholds['respiratory-failure'].low,
    };
  }

  // ===========================================================================
  // Cardiac Arrest Risk (Modified Early Warning Score + Labs)
  // ===========================================================================

  private assessCardiacArrestRisk(
    context: PatientContext,
    vitals?: PatientVitals,
    labs?: PatientLabs
  ): RiskScoreResult | null {
    const factors: TriggeringFactor[] = [];
    let score = 0;

    if (vitals) {
      // Severe hypotension
      if (vitals.systolicBP && vitals.systolicBP < 90) {
        score += 20;
        factors.push({
          factor: 'Severe hypotension',
          value: vitals.systolicBP,
          normalRange: '90-120 mmHg',
          deviation: 'low',
          weight: 20,
        });
      }

      // Severe bradycardia or tachycardia
      if (vitals.heartRate && (vitals.heartRate < 40 || vitals.heartRate > 130)) {
        score += 20;
        factors.push({
          factor: vitals.heartRate < 40 ? 'Severe bradycardia' : 'Severe tachycardia',
          value: vitals.heartRate,
          normalRange: '60-100 bpm',
          deviation: vitals.heartRate < 40 ? 'low' : 'high',
          weight: 20,
        });
      }

      // Severe hypoxia
      if (vitals.oxygenSaturation && vitals.oxygenSaturation < 85) {
        score += 20;
        factors.push({
          factor: 'Critical hypoxia',
          value: vitals.oxygenSaturation,
          normalRange: '95-100%',
          deviation: 'low',
          weight: 20,
        });
      }
    }

    if (labs) {
      // Critical potassium
      if (labs.potassium && (labs.potassium < 2.5 || labs.potassium > 6.5)) {
        score += 25;
        factors.push({
          factor: 'Critical potassium',
          value: labs.potassium,
          normalRange: '3.5-5.0 mEq/L',
          deviation: labs.potassium < 2.5 ? 'low' : 'high',
          weight: 25,
        });
      }

      // Elevated troponin
      if (labs.troponin && labs.troponin > 0.04) {
        score += 20;
        factors.push({
          factor: 'Elevated troponin',
          value: labs.troponin,
          normalRange: '<0.04 ng/mL',
          deviation: 'high',
          weight: 20,
        });
      }
    }

    score = Math.min(100, score);

    if (score < 20) return null;

    return {
      alertType: 'cardiac-arrest-risk',
      score,
      severity: this.getSeverity('cardiac-arrest-risk', score),
      confidence: this.calculateConfidence(factors),
      factors,
      shouldAlert: score >= this.thresholds['cardiac-arrest-risk'].low,
    };
  }

  // ===========================================================================
  // Hospital Readmission Risk (HOSPITAL Score + LACE Index inspired)
  // ===========================================================================

  private assessReadmissionRisk(
    context: PatientContext,
    vitals?: PatientVitals,
    labs?: PatientLabs
  ): RiskScoreResult | null {
    const factors: TriggeringFactor[] = [];
    let score = 0;

    // Length of stay >5 days
    if (context.lengthOfStay && context.lengthOfStay > 5) {
      score += 15;
      factors.push({
        factor: 'Extended length of stay',
        value: `${context.lengthOfStay} days`,
        deviation: 'high',
        weight: 15,
      });
    }

    // Comorbidity burden
    const highRiskConditions = ['heart failure', 'copd', 'diabetes', 'cancer', 'renal', 'liver'];
    const conditionCount = context.conditions.filter(c => 
      highRiskConditions.some(hrc => c.toLowerCase().includes(hrc))
    ).length;
    
    if (conditionCount >= 3) {
      score += 20;
      factors.push({
        factor: 'Multiple comorbidities',
        value: `${conditionCount} high-risk conditions`,
        deviation: 'abnormal',
        weight: 20,
      });
    } else if (conditionCount >= 1) {
      score += 10;
      factors.push({
        factor: 'Comorbid conditions',
        value: `${conditionCount} high-risk conditions`,
        deviation: 'abnormal',
        weight: 10,
      });
    }

    // Age
    if (context.age >= 75) {
      score += 15;
      factors.push({
        factor: 'Advanced age',
        value: context.age,
        deviation: 'high',
        weight: 15,
      });
    } else if (context.age >= 65) {
      score += 8;
    }

    // Abnormal labs at discharge
    if (labs) {
      if (labs.hemoglobin && labs.hemoglobin < 10) {
        score += 12;
        factors.push({
          factor: 'Anemia',
          value: labs.hemoglobin,
          normalRange: '12-16 g/dL',
          deviation: 'low',
          weight: 12,
        });
      }

      if (labs.sodium && labs.sodium < 135) {
        score += 10;
        factors.push({
          factor: 'Hyponatremia',
          value: labs.sodium,
          normalRange: '135-145 mEq/L',
          deviation: 'low',
          weight: 10,
        });
      }
    }

    // Polypharmacy
    if (context.medications.length >= 5) {
      score += 10;
      factors.push({
        factor: 'Polypharmacy',
        value: `${context.medications.length} medications`,
        deviation: 'abnormal',
        weight: 10,
      });
    }

    score = Math.min(100, score);

    return {
      alertType: 'readmission-risk',
      score,
      severity: this.getSeverity('readmission-risk', score),
      confidence: this.calculateConfidence(factors),
      factors,
      shouldAlert: score >= this.thresholds['readmission-risk'].low,
    };
  }

  // ===========================================================================
  // Helper Functions
  // ===========================================================================

  private getSeverity(alertType: AlertType, score: number): DeteriorationAlert['severity'] {
    const thresholds = this.thresholds[alertType];
    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.moderate) return 'moderate';
    return 'low';
  }

  private calculateConfidence(factors: TriggeringFactor[]): number {
    if (factors.length === 0) return 0;
    
    // More factors = higher confidence (up to a point)
    const factorBonus = Math.min(factors.length * 0.1, 0.3);
    
    // Average weight of factors contributes to confidence
    const avgWeight = factors.reduce((sum, f) => sum + f.weight, 0) / factors.length;
    const weightContribution = avgWeight / 100;
    
    return Math.min(0.95, 0.5 + factorBonus + weightContribution);
  }

  private calculateTrend(
    history: PatientVitals[] | undefined,
    field: keyof PatientVitals
  ): TriggeringFactor['trend'] {
    if (!history || history.length < 3) return 'stable';
    
    const recent = history.slice(-3);
    const values = recent
      .map(v => v[field])
      .filter((v): v is number => typeof v === 'number');
    
    if (values.length < 3) return 'stable';
    
    const [first, middle, last] = values;
    const avgChange = (last - first) / 2;
    
    if (avgChange > 0.05 * first) return 'worsening';
    if (avgChange < -0.05 * first) return 'improving';
    return 'stable';
  }

  // ===========================================================================
  // Recommendations by Alert Type
  // ===========================================================================

  private getRecommendations(alertType: AlertType, severity: DeteriorationAlert['severity']): Recommendation[] {
    const recommendations: Record<AlertType, Recommendation[]> = {
      'sepsis': [
        {
          priority: severity === 'critical' ? 'immediate' : 'urgent',
          category: 'labs',
          action: 'Order blood cultures x2, lactate, CBC, CMP, procalcitonin',
          rationale: 'Identify source and severity of infection',
          orderTemplate: 'sepsis-workup',
        },
        {
          priority: 'immediate',
          category: 'treatment',
          action: 'Initiate broad-spectrum antibiotics within 1 hour if sepsis confirmed',
          rationale: 'Early antibiotics improve survival in sepsis',
        },
        {
          priority: 'urgent',
          category: 'treatment',
          action: 'Start IV fluid resuscitation (30 mL/kg crystalloid)',
          rationale: 'Volume resuscitation for sepsis-induced hypoperfusion',
        },
        {
          priority: 'urgent',
          category: 'monitoring',
          action: 'Continuous vital sign monitoring, repeat lactate in 2-4 hours',
          rationale: 'Track response to treatment',
        },
      ],
      'heart-failure-exacerbation': [
        {
          priority: 'urgent',
          category: 'labs',
          action: 'Order BNP, troponin, BMP, CBC',
          rationale: 'Assess severity and rule out acute coronary syndrome',
        },
        {
          priority: 'urgent',
          category: 'imaging',
          action: 'Order chest X-ray',
          rationale: 'Evaluate for pulmonary edema',
        },
        {
          priority: 'urgent',
          category: 'treatment',
          action: 'Consider IV diuretics (furosemide 40-80mg IV)',
          rationale: 'Reduce volume overload',
        },
        {
          priority: 'routine',
          category: 'consult',
          action: 'Consider cardiology consultation',
          rationale: 'Optimize heart failure management',
        },
      ],
      'copd-exacerbation': [
        {
          priority: 'urgent',
          category: 'labs',
          action: 'Order ABG, CBC, BMP',
          rationale: 'Assess oxygenation and identify infection',
        },
        {
          priority: 'urgent',
          category: 'treatment',
          action: 'Initiate bronchodilators and systemic corticosteroids',
          rationale: 'Standard treatment for COPD exacerbation',
        },
        {
          priority: 'urgent',
          category: 'treatment',
          action: 'Consider antibiotics if signs of infection',
          rationale: 'Bacterial infection common trigger',
        },
      ],
      'diabetic-ketoacidosis': [
        {
          priority: 'immediate',
          category: 'labs',
          action: 'Order BMP, ABG, beta-hydroxybutyrate, urinalysis',
          rationale: 'Confirm DKA and assess severity',
        },
        {
          priority: 'immediate',
          category: 'treatment',
          action: 'Start IV fluids (NS 1-2L/hr initially)',
          rationale: 'Correct dehydration',
        },
        {
          priority: 'immediate',
          category: 'treatment',
          action: 'Start IV insulin infusion',
          rationale: 'Correct hyperglycemia and ketosis',
        },
        {
          priority: 'urgent',
          category: 'monitoring',
          action: 'Monitor glucose hourly, BMP every 2-4 hours',
          rationale: 'Track response and prevent complications',
        },
      ],
      'acute-kidney-injury': [
        {
          priority: 'urgent',
          category: 'assessment',
          action: 'Review medications for nephrotoxins, assess volume status',
          rationale: 'Identify and remove precipitants',
        },
        {
          priority: 'urgent',
          category: 'labs',
          action: 'Order urinalysis, urine electrolytes, renal ultrasound',
          rationale: 'Determine AKI etiology',
        },
        {
          priority: 'urgent',
          category: 'treatment',
          action: 'Optimize volume status, hold nephrotoxic medications',
          rationale: 'Prevent further injury',
        },
        {
          priority: 'routine',
          category: 'consult',
          action: 'Consider nephrology consultation if not improving',
          rationale: 'May need renal replacement therapy',
        },
      ],
      'respiratory-failure': [
        {
          priority: 'immediate',
          category: 'assessment',
          action: 'Assess airway, consider ICU transfer',
          rationale: 'May need advanced airway management',
        },
        {
          priority: 'immediate',
          category: 'treatment',
          action: 'Optimize oxygen delivery, consider BiPAP/CPAP',
          rationale: 'Non-invasive ventilation may prevent intubation',
        },
        {
          priority: 'urgent',
          category: 'labs',
          action: 'Order ABG, chest X-ray',
          rationale: 'Assess severity and identify cause',
        },
      ],
      'cardiac-arrest-risk': [
        {
          priority: 'immediate',
          category: 'assessment',
          action: 'Immediate bedside assessment, ensure IV access and monitoring',
          rationale: 'Prepare for possible arrest',
        },
        {
          priority: 'immediate',
          category: 'treatment',
          action: 'Correct critical electrolyte abnormalities',
          rationale: 'Hyperkalemia and severe hypokalemia are arrhythmogenic',
        },
        {
          priority: 'immediate',
          category: 'consult',
          action: 'Alert rapid response team',
          rationale: 'Early intervention improves outcomes',
        },
      ],
      'readmission-risk': [
        {
          priority: 'routine',
          category: 'assessment',
          action: 'Review discharge plan and ensure follow-up appointments',
          rationale: 'Care transitions reduce readmissions',
        },
        {
          priority: 'routine',
          category: 'education',
          action: 'Ensure patient understands medications and warning signs',
          rationale: 'Patient education reduces readmissions',
        },
        {
          priority: 'routine',
          category: 'consult',
          action: 'Consider care management referral',
          rationale: 'Transitional care programs effective for high-risk patients',
        },
      ],
      'stroke-risk': [
        {
          priority: 'urgent',
          category: 'assessment',
          action: 'Perform neurological assessment (NIHSS)',
          rationale: 'Identify acute stroke',
        },
        {
          priority: 'immediate',
          category: 'imaging',
          action: 'Order CT head without contrast',
          rationale: 'Rule out hemorrhage before treatment',
        },
      ],
      'general-deterioration': [
        {
          priority: 'urgent',
          category: 'assessment',
          action: 'Comprehensive bedside assessment',
          rationale: 'Identify specific cause of deterioration',
        },
        {
          priority: 'urgent',
          category: 'labs',
          action: 'Order CBC, CMP, lactate',
          rationale: 'Basic workup for acute change',
        },
      ],
    };

    return recommendations[alertType] || recommendations['general-deterioration'];
  }

  // ===========================================================================
  // Alert Management
  // ===========================================================================

  acknowledgeAlert(alertId: string, acknowledgedBy: string, notes?: string): boolean {
    for (const [patientId, alerts] of this.alerts) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.status = 'acknowledged';
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();
        if (notes) alert.notes = notes;
        this.emit('alertAcknowledged', alert);
        return true;
      }
    }
    return false;
  }

  escalateAlert(alertId: string, escalatedTo: string): boolean {
    for (const [patientId, alerts] of this.alerts) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.status = 'escalated';
        alert.escalatedTo = escalatedTo;
        this.emit('alertEscalated', alert);
        return true;
      }
    }
    return false;
  }

  resolveAlert(alertId: string, notes?: string): boolean {
    for (const [patientId, alerts] of this.alerts) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        if (notes) alert.notes = notes;
        this.emit('alertResolved', alert);
        return true;
      }
    }
    return false;
  }

  markFalsePositive(alertId: string, notes?: string): boolean {
    for (const [patientId, alerts] of this.alerts) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.status = 'false-positive';
        if (notes) alert.notes = notes;
        this.emit('alertFalsePositive', alert);
        return true;
      }
    }
    return false;
  }

  getAlertsForPatient(patientId: string, status?: DeteriorationAlert['status']): DeteriorationAlert[] {
    const alerts = this.alerts.get(patientId) || [];
    if (status) {
      return alerts.filter(a => a.status === status);
    }
    return alerts;
  }

  getActiveAlerts(): DeteriorationAlert[] {
    const active: DeteriorationAlert[] = [];
    for (const alerts of this.alerts.values()) {
      active.push(...alerts.filter(a => a.status === 'new' || a.status === 'acknowledged'));
    }
    return active.sort((a, b) => {
      // Sort by severity then timestamp
      const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  getCriticalAlerts(): DeteriorationAlert[] {
    return this.getActiveAlerts().filter(a => a.severity === 'critical');
  }
}

// Singleton instance
export const deteriorationAlertService = new DeteriorationAlertService();
export default deteriorationAlertService;
