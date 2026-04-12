// =============================================================================
// ATTENDING AI - Predictive Clinical Intelligence
// apps/shared/services/predictive/PredictiveModels.ts
//
// AI-powered predictions for clinical deterioration, sepsis, readmission risk
// Early warning system for adverse events
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type AlertPriority = 'routine' | 'elevated' | 'urgent' | 'emergent';

export interface PredictionResult {
  id: string;
  patientId: string;
  encounterId?: string;
  modelName: string;
  modelVersion: string;
  predictedAt: Date;
  
  // Core prediction
  riskScore: number;        // 0-100
  riskLevel: RiskLevel;
  probability: number;      // 0-1
  confidence: number;       // 0-1
  
  // Time-based prediction
  timeframe?: string;       // e.g., "24 hours", "30 days"
  predictedOnset?: Date;
  
  // Explanation
  topFactors: RiskFactor[];
  protectiveFactors: RiskFactor[];
  clinicalContext: string;
  
  // Actions
  recommendedActions: RecommendedAction[];
  alertGenerated: boolean;
  alertPriority?: AlertPriority;
}

export interface RiskFactor {
  name: string;
  value: string | number;
  contribution: number;     // How much this factor contributes to risk (-1 to 1)
  trend?: 'improving' | 'stable' | 'worsening';
  reference?: string;       // Normal range or reference
}

export interface RecommendedAction {
  action: string;
  category: 'monitoring' | 'diagnostic' | 'therapeutic' | 'consultation' | 'escalation';
  priority: AlertPriority;
  rationale: string;
  orderSuggestion?: {
    type: 'lab' | 'imaging' | 'medication' | 'consult';
    code?: string;
    name: string;
  };
}

export interface PatientVitals {
  timestamp: Date;
  heartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  mentalStatus?: 'alert' | 'confused' | 'drowsy' | 'unresponsive';
}

export interface PatientLabs {
  timestamp: Date;
  wbc?: number;
  hemoglobin?: number;
  platelets?: number;
  creatinine?: number;
  bun?: number;
  lactate?: number;
  procalcitonin?: number;
  glucose?: number;
  sodium?: number;
  potassium?: number;
  bilirubin?: number;
  inr?: number;
  troponin?: number;
  bnp?: number;
}

export interface PatientContext {
  patientId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  
  // Vitals history (most recent first)
  vitals: PatientVitals[];
  
  // Labs history (most recent first)
  labs: PatientLabs[];
  
  // Conditions
  conditions: string[];
  
  // Medications
  medications: string[];
  
  // Recent events
  recentSurgery?: boolean;
  surgeryDate?: Date;
  recentAdmission?: boolean;
  admissionDate?: Date;
  icuStay?: boolean;
  ventilated?: boolean;
  centralLine?: boolean;
  foleyPresent?: boolean;
  
  // Demographics
  comorbidities: string[];
  allergyCount: number;
  medicationCount: number;
}

// =============================================================================
// SEPSIS PREDICTION MODEL (qSOFA + Enhanced)
// =============================================================================

export class SepsisPredictionModel {
  readonly modelName = 'ATTENDING-Sepsis-v2';
  readonly modelVersion = '2.0.0';

  predict(context: PatientContext): PredictionResult {
    const latestVitals = context.vitals[0];
    const latestLabs = context.labs[0];
    
    // Calculate qSOFA score
    const qsofaScore = this.calculateQSOFA(latestVitals, context);
    
    // Calculate SIRS criteria
    const sirsScore = this.calculateSIRS(latestVitals, latestLabs);
    
    // Enhanced risk factors
    const riskFactors: RiskFactor[] = [];
    const protectiveFactors: RiskFactor[] = [];
    let enhancedRiskScore = 0;

    // Vital signs risk factors
    if (latestVitals) {
      if (latestVitals.systolicBP && latestVitals.systolicBP < 100) {
        riskFactors.push({
          name: 'Low Blood Pressure',
          value: latestVitals.systolicBP,
          contribution: 0.25,
          reference: '≥100 mmHg',
        });
        enhancedRiskScore += 15;
      }

      if (latestVitals.respiratoryRate && latestVitals.respiratoryRate >= 22) {
        riskFactors.push({
          name: 'Elevated Respiratory Rate',
          value: latestVitals.respiratoryRate,
          contribution: 0.2,
          reference: '<22/min',
        });
        enhancedRiskScore += 12;
      }

      if (latestVitals.heartRate && latestVitals.heartRate > 90) {
        riskFactors.push({
          name: 'Tachycardia',
          value: latestVitals.heartRate,
          contribution: 0.15,
          reference: '60-90 bpm',
        });
        enhancedRiskScore += 8;
      }

      if (latestVitals.temperature) {
        if (latestVitals.temperature > 100.4 || latestVitals.temperature < 96.8) {
          riskFactors.push({
            name: 'Abnormal Temperature',
            value: `${latestVitals.temperature}°F`,
            contribution: 0.2,
            reference: '96.8-100.4°F',
          });
          enhancedRiskScore += 10;
        }
      }

      if (latestVitals.mentalStatus && latestVitals.mentalStatus !== 'alert') {
        riskFactors.push({
          name: 'Altered Mental Status',
          value: latestVitals.mentalStatus,
          contribution: 0.3,
          reference: 'Alert',
        });
        enhancedRiskScore += 20;
      }
    }

    // Lab risk factors
    if (latestLabs) {
      if (latestLabs.wbc && (latestLabs.wbc > 12 || latestLabs.wbc < 4)) {
        riskFactors.push({
          name: 'Abnormal WBC',
          value: latestLabs.wbc,
          contribution: 0.2,
          reference: '4-12 K/uL',
        });
        enhancedRiskScore += 10;
      }

      if (latestLabs.lactate && latestLabs.lactate > 2) {
        riskFactors.push({
          name: 'Elevated Lactate',
          value: `${latestLabs.lactate} mmol/L`,
          contribution: 0.35,
          reference: '<2 mmol/L',
        });
        enhancedRiskScore += latestLabs.lactate > 4 ? 25 : 15;
      }

      if (latestLabs.procalcitonin && latestLabs.procalcitonin > 0.5) {
        riskFactors.push({
          name: 'Elevated Procalcitonin',
          value: `${latestLabs.procalcitonin} ng/mL`,
          contribution: 0.3,
          reference: '<0.5 ng/mL',
        });
        enhancedRiskScore += 18;
      }

      if (latestLabs.creatinine && latestLabs.creatinine > 2) {
        riskFactors.push({
          name: 'Elevated Creatinine',
          value: `${latestLabs.creatinine} mg/dL`,
          contribution: 0.15,
          reference: '0.7-1.3 mg/dL',
        });
        enhancedRiskScore += 10;
      }
    }

    // Infection risk factors
    if (context.centralLine) {
      riskFactors.push({
        name: 'Central Line Present',
        value: 'Yes',
        contribution: 0.1,
      });
      enhancedRiskScore += 5;
    }

    if (context.foleyPresent) {
      riskFactors.push({
        name: 'Foley Catheter Present',
        value: 'Yes',
        contribution: 0.08,
      });
      enhancedRiskScore += 4;
    }

    if (context.recentSurgery) {
      riskFactors.push({
        name: 'Recent Surgery',
        value: 'Yes',
        contribution: 0.1,
      });
      enhancedRiskScore += 5;
    }

    // Calculate final score
    const qsofaContribution = qsofaScore * 15;
    const sirsContribution = sirsScore * 8;
    const baseScore = qsofaContribution + sirsContribution + enhancedRiskScore;
    const finalScore = Math.min(Math.round(baseScore), 100);

    // Determine risk level
    let riskLevel: RiskLevel;
    let alertPriority: AlertPriority | undefined;
    
    if (finalScore >= 70) {
      riskLevel = 'critical';
      alertPriority = 'emergent';
    } else if (finalScore >= 50) {
      riskLevel = 'high';
      alertPriority = 'urgent';
    } else if (finalScore >= 30) {
      riskLevel = 'moderate';
      alertPriority = 'elevated';
    } else {
      riskLevel = 'low';
    }

    // Generate recommendations
    const actions = this.generateRecommendations(riskLevel, riskFactors, latestLabs);

    return {
      id: `sepsis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId: context.patientId,
      modelName: this.modelName,
      modelVersion: this.modelVersion,
      predictedAt: new Date(),
      riskScore: finalScore,
      riskLevel,
      probability: finalScore / 100,
      confidence: this.calculateConfidence(context),
      timeframe: '24 hours',
      topFactors: riskFactors.sort((a, b) => b.contribution - a.contribution).slice(0, 5),
      protectiveFactors,
      clinicalContext: this.generateClinicalContext(riskLevel, riskFactors),
      recommendedActions: actions,
      alertGenerated: riskLevel === 'high' || riskLevel === 'critical',
      alertPriority,
    };
  }

  private calculateQSOFA(vitals: PatientVitals | undefined, context: PatientContext): number {
    if (!vitals) return 0;
    
    let score = 0;
    
    // Respiratory rate ≥22
    if (vitals.respiratoryRate && vitals.respiratoryRate >= 22) score++;
    
    // Altered mental status
    if (vitals.mentalStatus && vitals.mentalStatus !== 'alert') score++;
    
    // Systolic BP ≤100
    if (vitals.systolicBP && vitals.systolicBP <= 100) score++;
    
    return score;
  }

  private calculateSIRS(vitals: PatientVitals | undefined, labs: PatientLabs | undefined): number {
    let criteria = 0;
    
    if (vitals) {
      // Temperature >38°C (100.4°F) or <36°C (96.8°F)
      if (vitals.temperature && (vitals.temperature > 100.4 || vitals.temperature < 96.8)) criteria++;
      
      // Heart rate >90
      if (vitals.heartRate && vitals.heartRate > 90) criteria++;
      
      // Respiratory rate >20
      if (vitals.respiratoryRate && vitals.respiratoryRate > 20) criteria++;
    }
    
    if (labs) {
      // WBC >12,000 or <4,000
      if (labs.wbc && (labs.wbc > 12 || labs.wbc < 4)) criteria++;
    }
    
    return criteria;
  }

  private calculateConfidence(context: PatientContext): number {
    let dataPoints = 0;
    let maxPoints = 10;
    
    if (context.vitals.length > 0) dataPoints += 3;
    if (context.vitals.length > 3) dataPoints += 1;
    if (context.labs.length > 0) dataPoints += 3;
    if (context.conditions.length > 0) dataPoints += 1;
    if (context.age > 0) dataPoints += 1;
    if (context.comorbidities.length > 0) dataPoints += 1;
    
    return Math.round((dataPoints / maxPoints) * 100) / 100;
  }

  private generateClinicalContext(riskLevel: RiskLevel, factors: RiskFactor[]): string {
    const topFactor = factors[0];
    
    if (riskLevel === 'critical') {
      return `CRITICAL: High probability of sepsis. Multiple concerning findings including ${topFactor?.name.toLowerCase() || 'clinical deterioration'}. Immediate evaluation and sepsis bundle initiation recommended.`;
    }
    
    if (riskLevel === 'high') {
      return `HIGH RISK: Elevated sepsis risk. Key concerns: ${factors.slice(0, 3).map(f => f.name.toLowerCase()).join(', ')}. Close monitoring and early intervention recommended.`;
    }
    
    if (riskLevel === 'moderate') {
      return `MODERATE RISK: Some concerning findings that warrant close observation. Continue monitoring vitals and consider lactate level if not recently checked.`;
    }
    
    return `LOW RISK: Current findings do not suggest imminent sepsis. Continue routine monitoring.`;
  }

  private generateRecommendations(
    riskLevel: RiskLevel,
    factors: RiskFactor[],
    labs: PatientLabs | undefined
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      actions.push({
        action: 'Initiate Sepsis Bundle (SEP-1)',
        category: 'therapeutic',
        priority: 'emergent',
        rationale: 'High sepsis risk warrants immediate intervention per sepsis guidelines',
      });

      if (!labs?.lactate) {
        actions.push({
          action: 'Order STAT Lactate',
          category: 'diagnostic',
          priority: 'emergent',
          rationale: 'Lactate is essential for sepsis risk stratification',
          orderSuggestion: { type: 'lab', code: '14118-4', name: 'Lactate' },
        });
      }

      actions.push({
        action: 'Blood Cultures x2 before antibiotics',
        category: 'diagnostic',
        priority: 'urgent',
        rationale: 'Identify causative organism for targeted therapy',
        orderSuggestion: { type: 'lab', name: 'Blood Culture' },
      });

      actions.push({
        action: 'Consider broad-spectrum antibiotics',
        category: 'therapeutic',
        priority: 'urgent',
        rationale: 'Early antibiotics improve sepsis outcomes',
      });

      actions.push({
        action: 'IV fluid resuscitation if hypotensive',
        category: 'therapeutic',
        priority: 'urgent',
        rationale: '30 mL/kg crystalloid for lactate >2 or hypotension',
      });
    }

    if (riskLevel === 'moderate') {
      actions.push({
        action: 'Increase vital sign monitoring to q2h',
        category: 'monitoring',
        priority: 'elevated',
        rationale: 'Early detection of deterioration',
      });

      if (!labs?.lactate) {
        actions.push({
          action: 'Consider Lactate level',
          category: 'diagnostic',
          priority: 'elevated',
          rationale: 'Helpful for risk stratification',
          orderSuggestion: { type: 'lab', code: '14118-4', name: 'Lactate' },
        });
      }

      actions.push({
        action: 'Review for source of infection',
        category: 'diagnostic',
        priority: 'elevated',
        rationale: 'Identify and control infection source',
      });
    }

    if (riskLevel === 'low') {
      actions.push({
        action: 'Continue routine monitoring',
        category: 'monitoring',
        priority: 'routine',
        rationale: 'Current risk is low, maintain standard care',
      });
    }

    return actions;
  }
}

// =============================================================================
// READMISSION RISK MODEL
// =============================================================================

export class ReadmissionRiskModel {
  readonly modelName = 'ATTENDING-Readmit-v1';
  readonly modelVersion = '1.0.0';

  predict(context: PatientContext): PredictionResult {
    const riskFactors: RiskFactor[] = [];
    const protectiveFactors: RiskFactor[] = [];
    let riskScore = 0;

    // Age factor
    if (context.age >= 65) {
      riskFactors.push({
        name: 'Age ≥65',
        value: context.age,
        contribution: 0.15,
      });
      riskScore += 10;
    }
    if (context.age >= 80) {
      riskScore += 5;
    }

    // Comorbidity burden (Charlson-like)
    const highRiskConditions = [
      'heart failure', 'chf', 'copd', 'diabetes', 'ckd', 'chronic kidney',
      'cancer', 'cirrhosis', 'dementia', 'stroke', 'cva', 'mi', 'myocardial infarction'
    ];

    let comorbidityCount = 0;
    for (const condition of context.conditions) {
      const lower = condition.toLowerCase();
      if (highRiskConditions.some(hrc => lower.includes(hrc))) {
        comorbidityCount++;
      }
    }

    if (comorbidityCount >= 3) {
      riskFactors.push({
        name: 'Multiple High-Risk Comorbidities',
        value: comorbidityCount,
        contribution: 0.25,
      });
      riskScore += 20;
    } else if (comorbidityCount >= 1) {
      riskFactors.push({
        name: 'High-Risk Comorbidities Present',
        value: comorbidityCount,
        contribution: 0.15,
      });
      riskScore += 10;
    }

    // Medication count (polypharmacy)
    if (context.medicationCount >= 10) {
      riskFactors.push({
        name: 'Polypharmacy (≥10 medications)',
        value: context.medicationCount,
        contribution: 0.12,
      });
      riskScore += 10;
    } else if (context.medicationCount >= 5) {
      riskFactors.push({
        name: 'Multiple Medications',
        value: context.medicationCount,
        contribution: 0.08,
      });
      riskScore += 5;
    }

    // Recent hospitalization
    if (context.recentAdmission) {
      riskFactors.push({
        name: 'Recent Prior Admission',
        value: 'Yes',
        contribution: 0.2,
      });
      riskScore += 15;
    }

    // ICU stay during current admission
    if (context.icuStay) {
      riskFactors.push({
        name: 'ICU Stay',
        value: 'Yes',
        contribution: 0.15,
      });
      riskScore += 12;
    }

    // Lab abnormalities
    const latestLabs = context.labs[0];
    if (latestLabs) {
      if (latestLabs.hemoglobin && latestLabs.hemoglobin < 10) {
        riskFactors.push({
          name: 'Anemia',
          value: `Hgb ${latestLabs.hemoglobin}`,
          contribution: 0.1,
        });
        riskScore += 8;
      }

      if (latestLabs.sodium && (latestLabs.sodium < 135 || latestLabs.sodium > 145)) {
        riskFactors.push({
          name: 'Electrolyte Abnormality',
          value: `Na ${latestLabs.sodium}`,
          contribution: 0.08,
        });
        riskScore += 5;
      }

      if (latestLabs.creatinine && latestLabs.creatinine > 1.5) {
        riskFactors.push({
          name: 'Renal Impairment',
          value: `Cr ${latestLabs.creatinine}`,
          contribution: 0.12,
        });
        riskScore += 10;
      }
    }

    // Vital sign instability
    const latestVitals = context.vitals[0];
    if (latestVitals) {
      if (latestVitals.oxygenSaturation && latestVitals.oxygenSaturation < 92) {
        riskFactors.push({
          name: 'Hypoxia',
          value: `SpO2 ${latestVitals.oxygenSaturation}%`,
          contribution: 0.1,
        });
        riskScore += 8;
      }
    }

    // Cap at 100
    const finalScore = Math.min(Math.round(riskScore), 100);

    // Determine risk level
    let riskLevel: RiskLevel;
    if (finalScore >= 60) {
      riskLevel = 'high';
    } else if (finalScore >= 35) {
      riskLevel = 'moderate';
    } else {
      riskLevel = 'low';
    }

    // Generate recommendations
    const actions = this.generateRecommendations(riskLevel, riskFactors);

    return {
      id: `readmit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId: context.patientId,
      modelName: this.modelName,
      modelVersion: this.modelVersion,
      predictedAt: new Date(),
      riskScore: finalScore,
      riskLevel,
      probability: finalScore / 100,
      confidence: 0.75,
      timeframe: '30 days',
      topFactors: riskFactors.sort((a, b) => b.contribution - a.contribution).slice(0, 5),
      protectiveFactors,
      clinicalContext: this.generateClinicalContext(riskLevel, finalScore),
      recommendedActions: actions,
      alertGenerated: riskLevel === 'high',
      alertPriority: riskLevel === 'high' ? 'elevated' : undefined,
    };
  }

  private generateClinicalContext(riskLevel: RiskLevel, score: number): string {
    if (riskLevel === 'high') {
      return `HIGH RISK (${score}%): This patient has multiple risk factors for 30-day readmission. Enhanced discharge planning and close follow-up recommended.`;
    }
    if (riskLevel === 'moderate') {
      return `MODERATE RISK (${score}%): Some risk factors for readmission identified. Ensure discharge planning addresses identified concerns.`;
    }
    return `LOW RISK (${score}%): Standard discharge planning appropriate. Routine follow-up recommended.`;
  }

  private generateRecommendations(riskLevel: RiskLevel, factors: RiskFactor[]): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    if (riskLevel === 'high') {
      actions.push({
        action: 'Schedule follow-up within 7 days of discharge',
        category: 'escalation',
        priority: 'urgent',
        rationale: 'Early follow-up reduces readmission risk',
      });

      actions.push({
        action: 'Enroll in transitional care program',
        category: 'therapeutic',
        priority: 'urgent',
        rationale: 'Transitional care programs reduce readmissions by 20-30%',
      });

      actions.push({
        action: 'Pharmacist medication reconciliation',
        category: 'consultation',
        priority: 'elevated',
        rationale: 'Reduce medication-related readmissions',
      });

      actions.push({
        action: 'Post-discharge phone call within 48 hours',
        category: 'monitoring',
        priority: 'elevated',
        rationale: 'Identify and address issues before they lead to readmission',
      });
    }

    if (riskLevel === 'moderate') {
      actions.push({
        action: 'Schedule follow-up within 14 days',
        category: 'escalation',
        priority: 'elevated',
        rationale: 'Timely follow-up for moderate-risk patients',
      });

      actions.push({
        action: 'Provide written discharge instructions',
        category: 'therapeutic',
        priority: 'routine',
        rationale: 'Clear instructions improve adherence',
      });
    }

    actions.push({
      action: 'Ensure patient understands warning signs',
      category: 'therapeutic',
      priority: 'routine',
      rationale: 'Patient education on when to seek care',
    });

    return actions;
  }
}

// =============================================================================
// CLINICAL DETERIORATION MODEL (Early Warning Score Enhanced)
// =============================================================================

export class DeteriorationModel {
  readonly modelName = 'ATTENDING-EWS-v1';
  readonly modelVersion = '1.0.0';

  predict(context: PatientContext): PredictionResult {
    const riskFactors: RiskFactor[] = [];
    const protectiveFactors: RiskFactor[] = [];
    
    // Calculate Modified Early Warning Score (MEWS)
    let mewsScore = 0;
    const latestVitals = context.vitals[0];
    const previousVitals = context.vitals[1];

    if (latestVitals) {
      // Systolic BP
      if (latestVitals.systolicBP) {
        if (latestVitals.systolicBP <= 70) {
          mewsScore += 3;
          riskFactors.push({ name: 'Severe Hypotension', value: latestVitals.systolicBP, contribution: 0.3, reference: '>100 mmHg' });
        } else if (latestVitals.systolicBP <= 80) {
          mewsScore += 2;
          riskFactors.push({ name: 'Hypotension', value: latestVitals.systolicBP, contribution: 0.2, reference: '>100 mmHg' });
        } else if (latestVitals.systolicBP <= 100) {
          mewsScore += 1;
          riskFactors.push({ name: 'Low-Normal BP', value: latestVitals.systolicBP, contribution: 0.1, reference: '>100 mmHg' });
        } else if (latestVitals.systolicBP >= 200) {
          mewsScore += 2;
          riskFactors.push({ name: 'Severe Hypertension', value: latestVitals.systolicBP, contribution: 0.15, reference: '<180 mmHg' });
        }
      }

      // Heart Rate
      if (latestVitals.heartRate) {
        if (latestVitals.heartRate <= 40 || latestVitals.heartRate >= 130) {
          mewsScore += 3;
          riskFactors.push({ name: 'Critical Heart Rate', value: latestVitals.heartRate, contribution: 0.25, reference: '60-100 bpm' });
        } else if (latestVitals.heartRate <= 50 || latestVitals.heartRate >= 110) {
          mewsScore += 2;
          riskFactors.push({ name: 'Abnormal Heart Rate', value: latestVitals.heartRate, contribution: 0.15, reference: '60-100 bpm' });
        } else if (latestVitals.heartRate <= 50 || latestVitals.heartRate >= 100) {
          mewsScore += 1;
        }
      }

      // Respiratory Rate
      if (latestVitals.respiratoryRate) {
        if (latestVitals.respiratoryRate <= 8 || latestVitals.respiratoryRate >= 30) {
          mewsScore += 3;
          riskFactors.push({ name: 'Critical Respiratory Rate', value: latestVitals.respiratoryRate, contribution: 0.3, reference: '12-20/min' });
        } else if (latestVitals.respiratoryRate >= 25) {
          mewsScore += 2;
          riskFactors.push({ name: 'Tachypnea', value: latestVitals.respiratoryRate, contribution: 0.2, reference: '12-20/min' });
        } else if (latestVitals.respiratoryRate >= 21) {
          mewsScore += 1;
        }
      }

      // Temperature
      if (latestVitals.temperature) {
        if (latestVitals.temperature <= 95 || latestVitals.temperature >= 104) {
          mewsScore += 2;
          riskFactors.push({ name: 'Critical Temperature', value: `${latestVitals.temperature}°F`, contribution: 0.2 });
        } else if (latestVitals.temperature <= 96 || latestVitals.temperature >= 101) {
          mewsScore += 1;
        }
      }

      // Mental Status
      if (latestVitals.mentalStatus) {
        if (latestVitals.mentalStatus === 'unresponsive') {
          mewsScore += 3;
          riskFactors.push({ name: 'Unresponsive', value: 'Yes', contribution: 0.35 });
        } else if (latestVitals.mentalStatus === 'drowsy') {
          mewsScore += 2;
          riskFactors.push({ name: 'Decreased Consciousness', value: 'Drowsy', contribution: 0.2 });
        } else if (latestVitals.mentalStatus === 'confused') {
          mewsScore += 1;
          riskFactors.push({ name: 'Confusion', value: 'Yes', contribution: 0.15 });
        }
      }

      // Oxygen Saturation
      if (latestVitals.oxygenSaturation) {
        if (latestVitals.oxygenSaturation < 90) {
          mewsScore += 3;
          riskFactors.push({ name: 'Severe Hypoxia', value: `${latestVitals.oxygenSaturation}%`, contribution: 0.3, reference: '≥94%' });
        } else if (latestVitals.oxygenSaturation < 94) {
          mewsScore += 2;
          riskFactors.push({ name: 'Hypoxia', value: `${latestVitals.oxygenSaturation}%`, contribution: 0.2, reference: '≥94%' });
        }
      }
    }

    // Trend analysis
    if (latestVitals && previousVitals) {
      // BP trend
      if (latestVitals.systolicBP && previousVitals.systolicBP) {
        const bpChange = latestVitals.systolicBP - previousVitals.systolicBP;
        if (bpChange <= -20) {
          riskFactors.push({
            name: 'Declining Blood Pressure',
            value: `↓${Math.abs(bpChange)} mmHg`,
            contribution: 0.15,
            trend: 'worsening',
          });
          mewsScore += 1;
        }
      }

      // HR trend
      if (latestVitals.heartRate && previousVitals.heartRate) {
        const hrChange = latestVitals.heartRate - previousVitals.heartRate;
        if (hrChange >= 20) {
          riskFactors.push({
            name: 'Increasing Heart Rate',
            value: `↑${hrChange} bpm`,
            contribution: 0.12,
            trend: 'worsening',
          });
          mewsScore += 1;
        }
      }
    }

    // Lab deterioration
    const latestLabs = context.labs[0];
    if (latestLabs) {
      if (latestLabs.lactate && latestLabs.lactate > 4) {
        riskFactors.push({
          name: 'Elevated Lactate',
          value: `${latestLabs.lactate} mmol/L`,
          contribution: 0.25,
          reference: '<2 mmol/L',
        });
        mewsScore += 2;
      }

      if (latestLabs.troponin && latestLabs.troponin > 0.04) {
        riskFactors.push({
          name: 'Elevated Troponin',
          value: `${latestLabs.troponin} ng/mL`,
          contribution: 0.2,
        });
        mewsScore += 2;
      }
    }

    // Convert MEWS to risk score (0-100)
    // MEWS 0-1 = Low, 2-3 = Moderate, 4-5 = High, 6+ = Critical
    const normalizedScore = Math.min(Math.round((mewsScore / 15) * 100), 100);

    // Determine risk level
    let riskLevel: RiskLevel;
    let alertPriority: AlertPriority | undefined;

    if (mewsScore >= 6 || normalizedScore >= 70) {
      riskLevel = 'critical';
      alertPriority = 'emergent';
    } else if (mewsScore >= 4 || normalizedScore >= 50) {
      riskLevel = 'high';
      alertPriority = 'urgent';
    } else if (mewsScore >= 2 || normalizedScore >= 30) {
      riskLevel = 'moderate';
      alertPriority = 'elevated';
    } else {
      riskLevel = 'low';
    }

    const actions = this.generateRecommendations(riskLevel, mewsScore, riskFactors);

    return {
      id: `ews_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId: context.patientId,
      modelName: this.modelName,
      modelVersion: this.modelVersion,
      predictedAt: new Date(),
      riskScore: normalizedScore,
      riskLevel,
      probability: normalizedScore / 100,
      confidence: latestVitals ? 0.85 : 0.5,
      timeframe: '24 hours',
      topFactors: riskFactors.sort((a, b) => b.contribution - a.contribution).slice(0, 5),
      protectiveFactors,
      clinicalContext: `Modified Early Warning Score: ${mewsScore}. ${this.generateClinicalContext(riskLevel, mewsScore)}`,
      recommendedActions: actions,
      alertGenerated: riskLevel === 'high' || riskLevel === 'critical',
      alertPriority,
    };
  }

  private generateClinicalContext(riskLevel: RiskLevel, mewsScore: number): string {
    if (riskLevel === 'critical') {
      return `CRITICAL (MEWS ${mewsScore}): Immediate clinical review required. Patient at high risk for rapid deterioration or need for ICU transfer.`;
    }
    if (riskLevel === 'high') {
      return `HIGH RISK (MEWS ${mewsScore}): Urgent clinical assessment recommended. Increase monitoring frequency.`;
    }
    if (riskLevel === 'moderate') {
      return `MODERATE RISK (MEWS ${mewsScore}): Enhanced monitoring advised. Review within 30 minutes.`;
    }
    return `LOW RISK (MEWS ${mewsScore}): Continue routine monitoring. Stable vital signs.`;
  }

  private generateRecommendations(
    riskLevel: RiskLevel,
    mewsScore: number,
    factors: RiskFactor[]
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    if (riskLevel === 'critical') {
      actions.push({
        action: 'IMMEDIATE bedside evaluation by physician',
        category: 'escalation',
        priority: 'emergent',
        rationale: 'Critical early warning score requires immediate assessment',
      });

      actions.push({
        action: 'Consider Rapid Response Team activation',
        category: 'escalation',
        priority: 'emergent',
        rationale: 'Patient may need ICU-level care',
      });

      actions.push({
        action: 'Continuous monitoring',
        category: 'monitoring',
        priority: 'emergent',
        rationale: 'Close observation for further deterioration',
      });

      actions.push({
        action: 'Prepare for potential code situation',
        category: 'therapeutic',
        priority: 'emergent',
        rationale: 'Ensure crash cart and staff readily available',
      });
    }

    if (riskLevel === 'high') {
      actions.push({
        action: 'Urgent physician notification',
        category: 'escalation',
        priority: 'urgent',
        rationale: 'Elevated early warning score requires prompt evaluation',
      });

      actions.push({
        action: 'Increase vital signs to q1h',
        category: 'monitoring',
        priority: 'urgent',
        rationale: 'More frequent monitoring to detect further changes',
      });

      actions.push({
        action: 'Review current orders and treatment plan',
        category: 'therapeutic',
        priority: 'urgent',
        rationale: 'Ensure appropriate interventions are ordered',
      });
    }

    if (riskLevel === 'moderate') {
      actions.push({
        action: 'Notify charge nurse and document',
        category: 'escalation',
        priority: 'elevated',
        rationale: 'Ensure awareness of clinical status change',
      });

      actions.push({
        action: 'Increase vital signs to q2h',
        category: 'monitoring',
        priority: 'elevated',
        rationale: 'Enhanced monitoring for moderate-risk patient',
      });
    }

    return actions;
  }
}

// =============================================================================
// PREDICTIVE SERVICE ORCHESTRATOR
// =============================================================================

export class PredictiveService extends EventEmitter {
  private sepsisModel: SepsisPredictionModel;
  private readmissionModel: ReadmissionRiskModel;
  private deteriorationModel: DeteriorationModel;

  constructor() {
    super();
    this.sepsisModel = new SepsisPredictionModel();
    this.readmissionModel = new ReadmissionRiskModel();
    this.deteriorationModel = new DeteriorationModel();
  }

  async runAllPredictions(context: PatientContext): Promise<{
    sepsis: PredictionResult;
    readmission: PredictionResult;
    deterioration: PredictionResult;
    overallRisk: RiskLevel;
    alerts: PredictionResult[];
  }> {
    const sepsis = this.sepsisModel.predict(context);
    const readmission = this.readmissionModel.predict(context);
    const deterioration = this.deteriorationModel.predict(context);

    // Determine overall risk (highest of all)
    const riskLevels: RiskLevel[] = [sepsis.riskLevel, readmission.riskLevel, deterioration.riskLevel];
    let overallRisk: RiskLevel = 'low';
    
    if (riskLevels.includes('critical')) overallRisk = 'critical';
    else if (riskLevels.includes('high')) overallRisk = 'high';
    else if (riskLevels.includes('moderate')) overallRisk = 'moderate';

    // Collect alerts
    const alerts = [sepsis, readmission, deterioration].filter(p => p.alertGenerated);

    // Emit events for high-risk predictions
    for (const alert of alerts) {
      this.emit('alert', alert);
    }

    return {
      sepsis,
      readmission,
      deterioration,
      overallRisk,
      alerts,
    };
  }

  predictSepsis(context: PatientContext): PredictionResult {
    return this.sepsisModel.predict(context);
  }

  predictReadmission(context: PatientContext): PredictionResult {
    return this.readmissionModel.predict(context);
  }

  predictDeterioration(context: PatientContext): PredictionResult {
    return this.deteriorationModel.predict(context);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const predictiveService = new PredictiveService();
