// ============================================================
// ATTENDING AI - Clinical Pathway Engine
// apps/shared/services/clinical-pathways/engine.ts
//
// Core engine for matching, executing, and tracking clinical pathways
// ============================================================

import {
  ClinicalPathway,
  PathwayTrigger,
  PathwayExecution,
  PathwayStep,
  CompletedStep,
  PathwayDeviation,
  DeviationReason,
  PathwayAnalytics,
} from './types';
import { clinicalPathways, getPathwayById } from './pathways';

// ============================================================
// TYPES
// ============================================================

export interface PatientContext {
  patientId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  chiefComplaint: string;
  symptoms: string[];
  vitals?: {
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    painScale?: number;
  };
  labs?: Record<string, number>;
  diagnoses?: string[];
  riskFactors?: string[];
  medications?: string[];
  allergies?: string[];
}

export interface PathwayMatch {
  pathway: ClinicalPathway;
  confidence: number;
  matchedTriggers: string[];
  missingTriggers: string[];
}

export interface PathwayRecommendation {
  pathwayId: string;
  pathwayName: string;
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  immediateActions: string[];
}

// ============================================================
// PATHWAY MATCHING ENGINE
// ============================================================

export class PathwayEngine {
  private pathways: ClinicalPathway[];
  private activeExecutions: Map<string, PathwayExecution>;

  constructor(pathways: ClinicalPathway[] = clinicalPathways) {
    this.pathways = pathways.filter(p => p.enabled);
    this.activeExecutions = new Map();
  }

  /**
   * Find all matching pathways for a patient context
   */
  findMatchingPathways(context: PatientContext): PathwayMatch[] {
    const matches: PathwayMatch[] = [];

    for (const pathway of this.pathways) {
      const match = this.evaluateTrigger(pathway, context);
      if (match.confidence >= (pathway.trigger.minConfidence || 0.5)) {
        matches.push(match);
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get prioritized recommendations for a patient
   */
  getRecommendations(context: PatientContext): PathwayRecommendation[] {
    const matches = this.findMatchingPathways(context);
    
    return matches.map(match => ({
      pathwayId: match.pathway.id,
      pathwayName: match.pathway.name,
      confidence: Math.round(match.confidence * 100),
      priority: this.calculatePriority(match),
      reason: this.generateReason(match),
      immediateActions: this.getImmediateActions(match.pathway),
    }));
  }

  /**
   * Evaluate if a pathway's triggers match the patient context
   */
  private evaluateTrigger(pathway: ClinicalPathway, context: PatientContext): PathwayMatch {
    const trigger = pathway.trigger;
    const matchedTriggers: string[] = [];
    const missingTriggers: string[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    // Check symptom triggers
    if (trigger.symptoms) {
      for (const symptomTrigger of trigger.symptoms) {
        const weight = symptomTrigger.required ? 2 : 1;
        totalWeight += weight;

        const hasSymptom = this.matchSymptom(symptomTrigger.symptom, symptomTrigger.synonyms || [], context.symptoms);
        
        if (hasSymptom) {
          matchedWeight += weight;
          matchedTriggers.push(`Symptom: ${symptomTrigger.symptom}`);
        } else if (symptomTrigger.required) {
          missingTriggers.push(`Required symptom: ${symptomTrigger.symptom}`);
        }
      }
    }

    // Check vital sign triggers
    if (trigger.vitals && context.vitals) {
      for (const vitalTrigger of trigger.vitals) {
        totalWeight += 1;
        const vitalValue = this.getVitalValue(vitalTrigger.vital, context.vitals);
        
        if (vitalValue !== undefined && this.evaluateVitalCondition(vitalValue, vitalTrigger)) {
          matchedWeight += 1;
          matchedTriggers.push(`Vital: ${vitalTrigger.vital} ${vitalTrigger.operator} ${vitalTrigger.value}`);
        }
      }
    }

    // Check demographic triggers
    if (trigger.demographics) {
      const demo = trigger.demographics;
      
      if (demo.minAge && context.age >= demo.minAge) {
        matchedTriggers.push(`Age ≥ ${demo.minAge}`);
      }
      if (demo.maxAge && context.age <= demo.maxAge) {
        matchedTriggers.push(`Age ≤ ${demo.maxAge}`);
      }
      
      // Check risk factors
      if (demo.riskFactors && context.riskFactors) {
        const matchedRiskFactors = demo.riskFactors.filter(rf => 
          context.riskFactors!.some(prf => prf.toLowerCase().includes(rf.toLowerCase()))
        );
        if (matchedRiskFactors.length > 0) {
          totalWeight += 1;
          matchedWeight += Math.min(matchedRiskFactors.length / 2, 1);
          matchedTriggers.push(`Risk factors: ${matchedRiskFactors.join(', ')}`);
        }
      }
    }

    // Calculate confidence
    const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;

    return {
      pathway,
      confidence,
      matchedTriggers,
      missingTriggers,
    };
  }

  /**
   * Match a symptom against patient symptoms including synonyms
   */
  private matchSymptom(symptom: string, synonyms: string[], patientSymptoms: string[]): boolean {
    const allTerms = [symptom, ...synonyms].map(s => s.toLowerCase());
    return patientSymptoms.some(ps => 
      allTerms.some(term => ps.toLowerCase().includes(term) || term.includes(ps.toLowerCase()))
    );
  }

  /**
   * Get vital value from context
   */
  private getVitalValue(vital: string, vitals: PatientContext['vitals']): number | undefined {
    if (!vitals) return undefined;
    
    const vitalMap: Record<string, keyof NonNullable<PatientContext['vitals']>> = {
      'heart_rate': 'heartRate',
      'blood_pressure_systolic': 'bloodPressureSystolic',
      'blood_pressure_diastolic': 'bloodPressureDiastolic',
      'respiratory_rate': 'respiratoryRate',
      'temperature': 'temperature',
      'oxygen_saturation': 'oxygenSaturation',
      'pain_scale': 'painScale',
    };
    
    const key = vitalMap[vital];
    return key ? vitals[key] : undefined;
  }

  /**
   * Evaluate a vital sign condition
   */
  private evaluateVitalCondition(value: number, trigger: { operator: string; value: number; valueEnd?: number }): boolean {
    switch (trigger.operator) {
      case '>': return value > trigger.value;
      case '>=': return value >= trigger.value;
      case '<': return value < trigger.value;
      case '<=': return value <= trigger.value;
      case '==': return value === trigger.value;
      case 'between': return trigger.valueEnd !== undefined && value >= trigger.value && value <= trigger.valueEnd;
      default: return false;
    }
  }

  /**
   * Calculate priority based on pathway category and match confidence
   */
  private calculatePriority(match: PathwayMatch): PathwayRecommendation['priority'] {
    const { pathway, confidence } = match;
    
    // Emergency pathways are always high priority
    if (pathway.category === 'emergency') return 'critical';
    if (pathway.category === 'cardiovascular' && confidence > 0.7) return 'critical';
    if (pathway.category === 'neurological' && confidence > 0.7) return 'critical';
    
    if (confidence > 0.8) return 'high';
    if (confidence > 0.6) return 'medium';
    return 'low';
  }

  /**
   * Generate a human-readable reason for the match
   */
  private generateReason(match: PathwayMatch): string {
    const { pathway, matchedTriggers } = match;
    
    if (matchedTriggers.length === 0) {
      return `Consider ${pathway.shortName} pathway based on presentation`;
    }
    
    const triggers = matchedTriggers.slice(0, 3).join(', ');
    return `${pathway.shortName} pathway triggered by: ${triggers}`;
  }

  /**
   * Get immediate actions from the first steps of a pathway
   */
  private getImmediateActions(pathway: ClinicalPathway): string[] {
    const immediateSteps = pathway.steps
      .filter(step => step.timing.critical && step.timing.target <= 30)
      .slice(0, 3);
    
    return immediateSteps.map(step => step.name);
  }

  // ============================================================
  // PATHWAY EXECUTION
  // ============================================================

  /**
   * Start executing a pathway for a patient
   */
  startPathway(
    pathwayId: string,
    patientId: string,
    providerId: string,
    encounterId: string
  ): PathwayExecution | null {
    const pathway = getPathwayById(pathwayId);
    if (!pathway) return null;

    const execution: PathwayExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pathwayId,
      patientId,
      providerId,
      encounterId,
      status: 'active',
      startedAt: new Date(),
      currentStepId: pathway.steps[0]?.id || '',
      completedSteps: [],
      deviations: [],
      outcomes: [],
    };

    this.activeExecutions.set(execution.id, execution);
    return execution;
  }

  /**
   * Complete a step in the pathway
   */
  completeStep(
    executionId: string,
    stepId: string,
    completedBy: string,
    orders?: string[],
    notes?: string
  ): PathwayExecution | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return null;

    const pathway = getPathwayById(execution.pathwayId);
    if (!pathway) return null;

    const step = pathway.steps.find(s => s.id === stepId);
    if (!step) return null;

    // Calculate duration
    const previousStep = execution.completedSteps[execution.completedSteps.length - 1];
    const startTime = previousStep?.completedAt || execution.startedAt;
    const duration = Math.round((Date.now() - startTime.getTime()) / 60000); // minutes

    const completedStep: CompletedStep = {
      stepId,
      completedAt: new Date(),
      completedBy,
      duration,
      orders,
      notes,
    };

    execution.completedSteps.push(completedStep);

    // Find next step
    const currentIndex = pathway.steps.findIndex(s => s.id === stepId);
    if (currentIndex < pathway.steps.length - 1) {
      execution.currentStepId = pathway.steps[currentIndex + 1].id;
    } else {
      execution.status = 'completed';
      execution.completedAt = new Date();
    }

    return execution;
  }

  /**
   * Record a deviation from the pathway
   */
  recordDeviation(
    executionId: string,
    stepId: string,
    reason: DeviationReason,
    description: string,
    approvedBy?: string
  ): PathwayExecution | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return null;

    const deviation: PathwayDeviation = {
      stepId,
      timestamp: new Date(),
      reason,
      description,
      approvedBy,
    };

    execution.deviations.push(deviation);
    
    if (execution.deviations.length >= 3) {
      execution.status = 'deviated';
    }

    return execution;
  }

  /**
   * Get current pathway execution status
   */
  getExecution(executionId: string): PathwayExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Get all active executions for a patient
   */
  getPatientExecutions(patientId: string): PathwayExecution[] {
    return Array.from(this.activeExecutions.values())
      .filter(e => e.patientId === patientId && e.status === 'active');
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  /**
   * Generate analytics for a pathway
   */
  generateAnalytics(pathwayId: string, period: string = '30d'): PathwayAnalytics {
    const executions = Array.from(this.activeExecutions.values())
      .filter(e => e.pathwayId === pathwayId);

    const completed = executions.filter(e => e.status === 'completed');
    const totalTime = completed.reduce((sum, e) => {
      if (e.completedAt) {
        return sum + (e.completedAt.getTime() - e.startedAt.getTime()) / 60000;
      }
      return sum;
    }, 0);

    const pathway = getPathwayById(pathwayId);
    
    return {
      pathwayId,
      period,
      totalExecutions: executions.length,
      completedExecutions: completed.length,
      completionRate: executions.length > 0 ? (completed.length / executions.length) * 100 : 0,
      avgTimeToCompletion: completed.length > 0 ? totalTime / completed.length : 0,
      medianTimeToCompletion: 0, // Would need full calculation
      stepMetrics: pathway?.steps.map(step => ({
        stepId: step.id,
        stepName: step.name,
        completionRate: 0,
        avgDuration: 0,
        targetMet: 0,
      })) || [],
      outcomeMetrics: pathway?.outcomes.map(outcome => ({
        outcomeId: outcome.id,
        outcomeName: outcome.name,
        avgValue: 0,
        targetMetRate: 0,
        trend: 'stable' as const,
      })) || [],
      deviationRate: executions.length > 0 
        ? (executions.filter(e => e.deviations.length > 0).length / executions.length) * 100 
        : 0,
      topDeviationReasons: [],
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let engineInstance: PathwayEngine | null = null;

export function getPathwayEngine(): PathwayEngine {
  if (!engineInstance) {
    engineInstance = new PathwayEngine();
  }
  return engineInstance;
}

export default PathwayEngine;
