// =============================================================================
// ATTENDING AI - Clinical AI Tests
// apps/shared/lib/clinical-ai/__tests__/clinical-ai.test.ts
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateRedFlags,
  hasImmediateRedFlags,
  getActionableRedFlags,
  RED_FLAGS,
} from '../redFlagDetection';
import { BioMistralClient } from '../BioMistralClient';
import type {
  PatientContext,
  ClinicalAssessment,
  RedFlagEvaluation,
} from '../types';

// =============================================================================
// Test Fixtures
// =============================================================================

const createBasePatientContext = (): PatientContext => ({
  demographics: {
    age: 55,
    ageUnit: 'years',
    sex: 'male',
  },
});

const createBaseAssessment = (): ClinicalAssessment => ({
  chiefComplaint: {
    complaint: 'Headache',
    duration: '2 days',
    severity: 'moderate',
  },
  symptoms: [
    { name: 'Headache', duration: '2 days', severity: 'moderate' },
  ],
});

// =============================================================================
// Red Flag Detection Tests
// =============================================================================

describe('Red Flag Detection', () => {
  describe('evaluateRedFlags', () => {
    it('returns no red flags for benign presentation', () => {
      const context = createBasePatientContext();
      const assessment = createBaseAssessment();

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(false);
      expect(result.matches).toHaveLength(0);
      expect(result.recommendedDisposition).toBe('routine');
    });

    it('detects chest pain cardiac red flags', () => {
      const context: PatientContext = {
        demographics: { age: 60, ageUnit: 'years', sex: 'male' },
        medicalHistory: { conditions: ['Coronary artery disease', 'Hypertension'] },
      };
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Chest pain', severity: 'severe' },
        symptoms: [
          { name: 'Chest pain', severity: 'severe', quality: 'crushing pressure', radiation: 'left arm' },
          { name: 'Diaphoresis' },
          { name: 'Shortness of breath' },
        ],
      };

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.overallSeverity).toBe('critical');
      expect(result.matches.some(m => m.redFlag.name === 'Acute Coronary Syndrome')).toBe(true);
      expect(result.recommendedDisposition).toBe('emergency');
    });

    it('detects stroke symptoms', () => {
      const context = createBasePatientContext();
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Sudden weakness', severity: 'severe' },
        symptoms: [
          { name: 'Sudden arm weakness', onset: 'sudden' },
          { name: 'Facial droop' },
          { name: 'Slurred speech' },
        ],
      };

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.name === 'Acute Stroke')).toBe(true);
    });

    it('detects sepsis indicators', () => {
      const context: PatientContext = {
        demographics: { age: 70, ageUnit: 'years', sex: 'female' },
        vitals: {
          temperature: 39.5,
          temperatureUnit: 'C',
          heartRate: 130,
          respiratoryRate: 28,
          bloodPressureSystolic: 85,
          bloodPressureDiastolic: 50,
        },
      };
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Fever and confusion', severity: 'severe' },
        symptoms: [
          { name: 'Fever', severity: 'severe' },
          { name: 'Altered mental status' },
          { name: 'Hypotension' },
        ],
      };

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.overallSeverity).toBe('critical');
      expect(result.matches.some(m => m.redFlag.name === 'Sepsis / Septic Shock')).toBe(true);
    });

    it('detects meningitis signs', () => {
      const context = createBasePatientContext();
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Severe headache with fever', severity: 'severe' },
        symptoms: [
          { name: 'Severe headache' },
          { name: 'Fever' },
          { name: 'Neck stiffness' },
          { name: 'Photophobia' },
        ],
      };

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.name === 'Suspected Meningitis')).toBe(true);
    });

    it('detects cauda equina syndrome', () => {
      const context = createBasePatientContext();
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Back pain with leg weakness', severity: 'severe' },
        symptoms: [
          { name: 'Low back pain', severity: 'severe' },
          { name: 'Bilateral leg weakness' },
          { name: 'Urinary retention' },
          { name: 'Saddle anesthesia' },
        ],
      };

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.name === 'Cauda Equina Syndrome')).toBe(true);
    });
  });

  describe('hasImmediateRedFlags', () => {
    it('returns true for critical red flags', () => {
      const evaluation: RedFlagEvaluation = {
        hasRedFlags: true,
        matches: [{
          redFlag: RED_FLAGS.find(rf => rf.name === 'Acute Coronary Syndrome')!,
          matchedCriteria: ['chest pain'],
          confidence: 0.8,
          reasoning: 'test',
        }],
        overallSeverity: 'critical',
        recommendedDisposition: 'emergency',
        summary: 'test',
        evaluatedAt: new Date().toISOString(),
      };

      expect(hasImmediateRedFlags(evaluation)).toBe(true);
    });

    it('returns false when no red flags', () => {
      const evaluation: RedFlagEvaluation = {
        hasRedFlags: false,
        matches: [],
        overallSeverity: null,
        recommendedDisposition: 'routine',
        summary: 'No red flags',
        evaluatedAt: new Date().toISOString(),
      };

      expect(hasImmediateRedFlags(evaluation)).toBe(false);
    });
  });

  describe('getActionableRedFlags', () => {
    it('filters to critical and high severity flags', () => {
      const evaluation: RedFlagEvaluation = {
        hasRedFlags: true,
        matches: [
          {
            redFlag: { ...RED_FLAGS[0], severity: 'critical' },
            matchedCriteria: [],
            confidence: 0.9,
            reasoning: '',
          },
          {
            redFlag: { ...RED_FLAGS[0], severity: 'moderate', name: 'Moderate Flag' },
            matchedCriteria: [],
            confidence: 0.7,
            reasoning: '',
          },
        ],
        overallSeverity: 'critical',
        recommendedDisposition: 'emergency',
        summary: '',
        evaluatedAt: new Date().toISOString(),
      };

      const actionable = getActionableRedFlags(evaluation);

      expect(actionable).toHaveLength(1);
      expect(actionable[0].redFlag.severity).toBe('critical');
    });
  });
});

// =============================================================================
// BioMistral Client Tests
// =============================================================================

describe('BioMistralClient', () => {
  let client: BioMistralClient;

  beforeEach(() => {
    client = new BioMistralClient({ enableAuditLog: true });
  });

  describe('analyzeCase', () => {
    it('returns complete analysis for chest pain', async () => {
      const context: PatientContext = {
        demographics: { age: 55, ageUnit: 'years', sex: 'male' },
        vitals: { heartRate: 88, bloodPressureSystolic: 140, bloodPressureDiastolic: 90 },
        medicalHistory: { conditions: ['Hypertension', 'Diabetes'] },
      };
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Chest pain', severity: 'moderate' },
        symptoms: [{ name: 'Chest pain', duration: '2 hours' }],
      };

      const result = await client.analyzeCase(context, assessment);

      expect(result.requestId).toBeDefined();
      expect(result.redFlagEvaluation).toBeDefined();
      expect(result.differentialDiagnosis).toBeDefined();
      expect(result.clinicalSummary).toBeDefined();
      expect(result.disclaimer).toContain('AI-generated');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('returns emergency response for critical red flags', async () => {
      const context: PatientContext = {
        demographics: { age: 60, ageUnit: 'years', sex: 'male' },
        vitals: { bloodPressureSystolic: 85, heartRate: 130 },
        medicalHistory: { conditions: ['CAD', 'Prior MI'] },
      };
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Crushing chest pain radiating to arm', severity: 'severe' },
        symptoms: [
          { name: 'Crushing chest pain', radiation: 'left arm', severity: 'severe' },
          { name: 'Diaphoresis' },
          { name: 'Shortness of breath' },
        ],
      };

      const result = await client.analyzeCase(context, assessment);

      expect(result.redFlagEvaluation?.hasRedFlags).toBe(true);
      expect(result.redFlagEvaluation?.overallSeverity).toBe('critical');
      expect(result.clinicalSummary).toContain('EMERGENCY');
    });
  });

  describe('generateDifferentialDiagnosis', () => {
    it('generates differential for headache', async () => {
      const context = createBasePatientContext();
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Headache', severity: 'moderate' },
        symptoms: [{ name: 'Headache', duration: '3 days' }],
      };

      const result = await client.generateDifferentialDiagnosis(context, assessment);

      expect(result.primaryDiagnoses.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
      // Should include common headache diagnoses
      const diagnoses = result.primaryDiagnoses.map(d => d.diagnosis.name.toLowerCase());
      expect(diagnoses.some(d => d.includes('tension') || d.includes('migraine'))).toBe(true);
    });

    it('includes must-not-miss diagnoses for thunderclap headache', async () => {
      const context = createBasePatientContext();
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Sudden worst headache of life', severity: 'severe' },
        symptoms: [{ name: 'Sudden severe headache', onset: 'sudden', severity: 'severe' }],
      };

      const result = await client.generateDifferentialDiagnosis(context, assessment);

      expect(result.mustNotMissDiagnoses.length).toBeGreaterThan(0);
      expect(result.mustNotMissDiagnoses.some(d => 
        d.diagnosis.name.toLowerCase().includes('subarachnoid')
      )).toBe(true);
    });

    it('generates appropriate differentials for abdominal pain', async () => {
      const context: PatientContext = {
        demographics: { age: 25, ageUnit: 'years', sex: 'male' },
      };
      const assessment: ClinicalAssessment = {
        chiefComplaint: { complaint: 'Right lower quadrant abdominal pain', severity: 'moderate' },
        symptoms: [
          { name: 'Abdominal pain', location: 'right lower quadrant', severity: 'moderate' },
          { name: 'Nausea' },
          { name: 'Anorexia' },
        ],
      };

      const result = await client.generateDifferentialDiagnosis(context, assessment);

      expect(result.primaryDiagnoses.some(d => 
        d.diagnosis.name.toLowerCase().includes('appendicitis')
      )).toBe(true);
    });
  });

  describe('generateTreatmentPlan', () => {
    it('generates treatment plan with medications', async () => {
      const context: PatientContext = {
        demographics: { age: 40, ageUnit: 'years', sex: 'female' },
        allergies: [],
        medicalHistory: { conditions: [] },
      };

      const result = await client.generateTreatmentPlan(context, 'Tension Headache');

      expect(result.forDiagnosis).toBe('Tension Headache');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
    });

    it('identifies contraindications', async () => {
      const context: PatientContext = {
        demographics: { age: 65, ageUnit: 'years', sex: 'male' },
        medicalHistory: { conditions: ['Chronic kidney disease', 'GI bleed history'] },
        currentMedications: [{ name: 'Warfarin', dose: '5mg', frequency: 'daily' }],
      };

      const result = await client.generateTreatmentPlan(context, 'Back pain');

      expect(result.contraindications.length).toBeGreaterThan(0);
      expect(result.contraindications.some(c => 
        c.toLowerCase().includes('renal') || c.toLowerCase().includes('anticoagul')
      )).toBe(true);
    });
  });

  describe('audit logging', () => {
    it('records audit entries', async () => {
      const context = createBasePatientContext();
      const assessment = createBaseAssessment();

      await client.analyzeCase(context, assessment);

      const auditLog = client.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].requestType).toBe('comprehensive');
      expect(auditLog[0].responseReceived).toBe(true);
    });
  });
});

// =============================================================================
// Red Flag Reference Data Tests
// =============================================================================

describe('RED_FLAGS reference data', () => {
  it('has critical severity flags', () => {
    const critical = RED_FLAGS.filter(rf => rf.severity === 'critical');
    expect(critical.length).toBeGreaterThan(5);
  });

  it('covers major categories', () => {
    const categories = new Set(RED_FLAGS.map(rf => rf.category));
    expect(categories.has('cardiovascular')).toBe(true);
    expect(categories.has('neurological')).toBe(true);
    expect(categories.has('respiratory')).toBe(true);
    expect(categories.has('infectious')).toBe(true);
  });

  it('all red flags have required fields', () => {
    for (const rf of RED_FLAGS) {
      expect(rf.id).toBeDefined();
      expect(rf.name).toBeDefined();
      expect(rf.description).toBeDefined();
      expect(rf.severity).toBeDefined();
      expect(rf.category).toBeDefined();
      expect(rf.triggerCriteria.length).toBeGreaterThan(0);
      expect(rf.recommendedAction).toBeDefined();
      expect(rf.timeframe).toBeDefined();
    }
  });
});
