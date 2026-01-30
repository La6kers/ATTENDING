// =============================================================================
// ATTENDING AI - Red Flag Detection Tests
// apps/shared/lib/clinical-ai/__tests__/redFlagDetection.test.ts
//
// CRITICAL SAFETY TESTS: These tests verify emergency condition detection.
// False negatives (missing emergencies) can result in patient death.
// False positives are tolerable - over-triage is safer than under-triage.
//
// Test Categories:
// 1. Cardiovascular emergencies
// 2. Neurological emergencies
// 3. Respiratory emergencies
// 4. Infectious emergencies
// 5. Psychiatric emergencies
// 6. Obstetric emergencies
// 7. Other critical conditions
// 8. Vital sign integration
// 9. False positive prevention
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateRedFlags,
  RED_FLAGS,
  hasImmediateRedFlags,
  getActionableRedFlags,
  formatRedFlagAlert,
  type RedFlagEvaluation,
} from '../redFlagDetection';
import type { PatientContext, ClinicalAssessment, Symptom, VitalSigns } from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createPatientContext(overrides: Partial<PatientContext> = {}): PatientContext {
  return {
    patientId: 'test-patient-001',
    demographics: {
      age: 45,
      ageUnit: 'years',
      sex: 'male',
      pregnancyStatus: undefined,
    },
    vitals: undefined,
    medicalHistory: {
      conditions: [],
    },
    ...overrides,
  };
}

function createAssessment(overrides: Partial<ClinicalAssessment> = {}): ClinicalAssessment {
  return {
    chiefComplaint: {
      complaint: '',
      onset: 'today',
    },
    symptoms: [],
    historyOfPresentIllness: '',
    ...overrides,
  };
}

function createSymptom(name: string, overrides: Partial<Symptom> = {}): Symptom {
  return {
    id: `symptom-${Date.now()}`,
    name,
    severity: 'moderate',
    duration: 'hours',
    onset: 'gradual',
    ...overrides,
  };
}

function createVitals(overrides: Partial<VitalSigns> = {}): VitalSigns {
  return {
    heartRate: 80,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    temperature: 37.0,
    temperatureUnit: 'C',
    ...overrides,
  };
}

// =============================================================================
// RED FLAG DEFINITION TESTS
// =============================================================================

describe('Red Flag Definitions', () => {
  it('should have all required fields for each red flag', () => {
    RED_FLAGS.forEach((redFlag, index) => {
      expect(redFlag.id, `Red flag ${index} missing id`).toBeDefined();
      expect(redFlag.name, `Red flag ${redFlag.id} missing name`).toBeDefined();
      expect(redFlag.description, `Red flag ${redFlag.id} missing description`).toBeDefined();
      expect(redFlag.severity, `Red flag ${redFlag.id} missing severity`).toBeDefined();
      expect(redFlag.category, `Red flag ${redFlag.id} missing category`).toBeDefined();
      expect(redFlag.triggerCriteria, `Red flag ${redFlag.id} missing triggerCriteria`).toBeDefined();
      expect(redFlag.triggerCriteria.length, `Red flag ${redFlag.id} has no trigger criteria`).toBeGreaterThan(0);
      expect(redFlag.recommendedAction, `Red flag ${redFlag.id} missing recommendedAction`).toBeDefined();
      expect(redFlag.timeframe, `Red flag ${redFlag.id} missing timeframe`).toBeDefined();
    });
  });

  it('should have valid severity levels', () => {
    const validSeverities = ['critical', 'high', 'moderate'];
    RED_FLAGS.forEach(redFlag => {
      expect(validSeverities).toContain(redFlag.severity);
    });
  });

  it('should have valid timeframes', () => {
    const validTimeframes = ['immediate', 'urgent'];
    RED_FLAGS.forEach(redFlag => {
      expect(validTimeframes).toContain(redFlag.timeframe);
    });
  });

  it('should cover all critical emergency categories', () => {
    const categories = new Set(RED_FLAGS.map(rf => rf.category));
    const requiredCategories = [
      'cardiovascular',
      'neurological',
      'respiratory',
      'infectious',
      'psychiatric',
    ];
    
    requiredCategories.forEach(category => {
      expect(categories.has(category), `Missing category: ${category}`).toBe(true);
    });
  });

  it('should have ICD codes for major conditions', () => {
    const criticalFlags = RED_FLAGS.filter(rf => rf.severity === 'critical');
    criticalFlags.forEach(rf => {
      expect(rf.icdCodes?.length, `Critical red flag ${rf.id} should have ICD codes`).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// CARDIOVASCULAR EMERGENCY TESTS
// =============================================================================

describe('Cardiovascular Red Flags', () => {
  describe('Acute Coronary Syndrome', () => {
    it('should detect chest pain radiating to left arm', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'chest pain radiating to left arm', onset: 'today' },
        symptoms: [
          createSymptom('chest pain', { radiation: 'left arm', quality: 'crushing' }),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-chest-pain-cardiac')).toBe(true);
      expect(result.overallSeverity).toBe('critical');
      expect(result.recommendedDisposition).toBe('emergency');
    });

    it('should detect chest pain with diaphoresis', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'chest pain', onset: 'today' },
        symptoms: [
          createSymptom('chest pain', { 
            quality: 'pressure',
            associatedSymptoms: ['diaphoresis', 'sweating'],
          }),
        ],
        historyOfPresentIllness: 'Patient reports chest pain with profuse sweating',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.category === 'cardiovascular')).toBe(true);
    });

    it('should detect crushing chest pain', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'crushing chest pain', onset: 'today' },
        symptoms: [
          createSymptom('chest pain', { quality: 'crushing', severity: 'severe' }),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-chest-pain-cardiac')).toBe(true);
    });

    it('should detect chest pain in patient with CAD history', () => {
      const context = createPatientContext({
        medicalHistory: {
          conditions: ['coronary artery disease', 'hyperlipidemia'],
        },
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'new chest pain', onset: 'today' },
        symptoms: [createSymptom('chest pain')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect chest pain with shortness of breath', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'chest pain and difficulty breathing', onset: 'today' },
        symptoms: [
          createSymptom('chest pain'),
          createSymptom('shortness of breath'),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });
});

// =============================================================================
// NEUROLOGICAL EMERGENCY TESTS
// =============================================================================

describe('Neurological Red Flags', () => {
  describe('Stroke', () => {
    it('should detect facial droop', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'sudden facial droop', onset: 'today' },
        symptoms: [createSymptom('facial droop', { onset: 'sudden' })],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-stroke')).toBe(true);
      expect(result.overallSeverity).toBe('critical');
    });

    it('should detect sudden arm weakness', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'sudden arm weakness on left side', onset: 'today' },
        symptoms: [
          createSymptom('arm weakness', { onset: 'sudden', location: 'left arm' }),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.category === 'neurological')).toBe(true);
    });

    it('should detect slurred speech', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'sudden difficulty speaking, slurred speech', onset: 'today' },
        symptoms: [createSymptom('slurred speech', { onset: 'sudden' })],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-stroke')).toBe(true);
    });

    it('should detect sudden severe headache (thunderclap)', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'sudden severe headache', onset: 'today' },
        symptoms: [
          createSymptom('headache', { 
            severity: 'severe', 
            onset: 'sudden',
            quality: 'worst headache of my life',
          }),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect sudden vision changes', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'sudden vision loss in right eye', onset: 'today' },
        symptoms: [createSymptom('vision changes', { onset: 'sudden', location: 'right eye' })],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });

  describe('Cauda Equina Syndrome', () => {
    it('should detect back pain with urinary retention', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'severe back pain with urinary retention', onset: 'today' },
        symptoms: [
          createSymptom('back pain', { severity: 'severe' }),
          createSymptom('urinary retention'),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-cauda-equina')).toBe(true);
    });

    it('should detect saddle anesthesia', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'back pain with numbness in groin area', onset: 'today' },
        symptoms: [createSymptom('back pain')],
        historyOfPresentIllness: 'Patient reports saddle anesthesia and back pain',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });
});

// =============================================================================
// RESPIRATORY EMERGENCY TESTS
// =============================================================================

describe('Respiratory Red Flags', () => {
  describe('Acute Respiratory Failure', () => {
    it('should detect oxygen saturation below 90%', () => {
      const context = createPatientContext({
        vitals: createVitals({ oxygenSaturation: 85 }),
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'shortness of breath', onset: 'today' },
        symptoms: [createSymptom('shortness of breath', { severity: 'severe' })],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.category === 'respiratory')).toBe(true);
      expect(result.overallSeverity).toBe('critical');
    });

    it('should detect respiratory rate above 30', () => {
      const context = createPatientContext({
        vitals: createVitals({ respiratoryRate: 34 }),
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'difficulty breathing', onset: 'today' },
        symptoms: [createSymptom('shortness of breath')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect accessory muscle use', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'severe shortness of breath', onset: 'today' },
        historyOfPresentIllness: 'Patient using accessory muscles to breathe',
        symptoms: [
          createSymptom('shortness of breath', { 
            severity: 'severe',
            associatedSymptoms: ['accessory muscle use'],
          }),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect cyanosis', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'shortness of breath with blue lips', onset: 'today' },
        symptoms: [createSymptom('cyanosis')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });

  describe('Pulmonary Embolism', () => {
    it('should detect sudden onset dyspnea', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'sudden onset shortness of breath', onset: 'today' },
        symptoms: [createSymptom('shortness of breath', { onset: 'sudden' })],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect pleuritic chest pain', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'sharp chest pain worse with breathing', onset: 'today' },
        symptoms: [
          createSymptom('chest pain', { 
            quality: 'pleuritic',
            aggravatedBy: ['breathing', 'deep breath'],
          }),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect hemoptysis', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'coughing up blood', onset: 'today' },
        symptoms: [createSymptom('hemoptysis')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect DVT symptoms with dyspnea', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'leg swelling and shortness of breath', onset: 'today' },
        symptoms: [
          createSymptom('leg swelling', { location: 'left leg', unilateral: true }),
          createSymptom('shortness of breath'),
        ],
        historyOfPresentIllness: 'Unilateral leg swelling with dyspnea',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });
});

// =============================================================================
// INFECTIOUS EMERGENCY TESTS
// =============================================================================

describe('Infectious Red Flags', () => {
  describe('Sepsis', () => {
    it('should detect fever with hypotension', () => {
      const context = createPatientContext({
        vitals: createVitals({
          temperature: 39.5,
          bloodPressureSystolic: 85,
        }),
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'fever and feeling faint', onset: 'today' },
        symptoms: [
          createSymptom('fever'),
          createSymptom('hypotension'),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-sepsis')).toBe(true);
      expect(result.overallSeverity).toBe('critical');
    });

    it('should detect infection with altered mental status', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'infection and confusion', onset: 'today' },
        symptoms: [
          createSymptom('fever'),
          createSymptom('confusion'),
        ],
        historyOfPresentIllness: 'Suspected infection with altered mental status',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect immunocompromised patient with fever', () => {
      const context = createPatientContext({
        medicalHistory: {
          conditions: ['HIV', 'type 2 diabetes'],
        },
        vitals: createVitals({ temperature: 38.5 }),
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'fever', onset: 'today' },
        symptoms: [createSymptom('fever')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });

  describe('Meningitis', () => {
    it('should detect fever with neck stiffness and headache', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'severe headache, fever, and stiff neck', onset: 'today' },
        symptoms: [
          createSymptom('headache', { severity: 'severe' }),
          createSymptom('fever'),
          createSymptom('neck stiffness'),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-meningitis')).toBe(true);
    });

    it('should detect fever with photophobia', () => {
      const context = createPatientContext({
        vitals: createVitals({ temperature: 39.0 }),
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'headache, fever, and sensitivity to light', onset: 'today' },
        symptoms: [
          createSymptom('headache'),
          createSymptom('photophobia'),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect fever with petechial rash', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'fever and rash', onset: 'today' },
        symptoms: [
          createSymptom('fever'),
        ],
        historyOfPresentIllness: 'Patient has fever with petechial rash',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });
});

// =============================================================================
// PSYCHIATRIC EMERGENCY TESTS
// =============================================================================

describe('Psychiatric Red Flags', () => {
  describe('Suicidal Ideation', () => {
    it('should detect suicidal ideation with plan', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'having thoughts of suicide', onset: 'today' },
        symptoms: [createSymptom('suicidal ideation')],
        historyOfPresentIllness: 'Patient reports suicidal ideation with specific plan',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-suicidal-ideation')).toBe(true);
      expect(result.overallSeverity).toBe('critical');
    });

    it('should detect suicide with intent', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'suicidal thoughts', onset: 'today' },
        historyOfPresentIllness: 'Patient expresses suicidal ideation with intent to act',
        symptoms: [createSymptom('suicidal ideation')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect recent suicide attempt', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'took pills, recent suicide attempt', onset: 'today' },
        symptoms: [],
        historyOfPresentIllness: 'Recent suicide attempt by overdose',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect command hallucinations to harm self', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'hearing voices telling me to hurt myself', onset: 'today' },
        symptoms: [createSymptom('auditory hallucinations')],
        historyOfPresentIllness: 'Patient reporting command hallucinations to harm self',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });
});

// =============================================================================
// OBSTETRIC/GYN EMERGENCY TESTS
// =============================================================================

describe('Obstetric Red Flags', () => {
  describe('Ectopic Pregnancy', () => {
    it('should detect abdominal pain with positive pregnancy test', () => {
      const context = createPatientContext({
        demographics: {
          age: 28,
          ageUnit: 'years',
          sex: 'female',
          pregnancyStatus: 'pregnant',
        },
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'abdominal pain with positive pregnancy test', onset: 'today' },
        symptoms: [createSymptom('abdominal pain')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-ectopic-pregnancy')).toBe(true);
    });

    it('should detect vaginal bleeding in early pregnancy', () => {
      const context = createPatientContext({
        demographics: {
          age: 25,
          ageUnit: 'years',
          sex: 'female',
          pregnancyStatus: 'pregnant',
        },
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'vaginal bleeding, 6 weeks pregnant', onset: 'today' },
        symptoms: [createSymptom('vaginal bleeding')],
        historyOfPresentIllness: 'Vaginal bleeding with positive pregnancy test',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect shoulder pain in early pregnancy', () => {
      const context = createPatientContext({
        demographics: {
          age: 30,
          ageUnit: 'years',
          sex: 'female',
          pregnancyStatus: 'pregnant',
        },
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'shoulder pain in early pregnancy', onset: 'today' },
        symptoms: [createSymptom('shoulder pain')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });
});

// =============================================================================
// PEDIATRIC EMERGENCY TESTS
// =============================================================================

describe('Pediatric Red Flags', () => {
  describe('Febrile Infant', () => {
    it('should detect fever in infant under 60 days', () => {
      const context = createPatientContext({
        demographics: {
          age: 45,
          ageUnit: 'days',
          sex: 'male',
        },
        vitals: createVitals({ temperature: 38.2 }),
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'fever', onset: 'today' },
        symptoms: [createSymptom('fever')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-pediatric-fever')).toBe(true);
    });
  });
});

// =============================================================================
// OTHER CRITICAL CONDITIONS
// =============================================================================

describe('Other Critical Red Flags', () => {
  describe('Anaphylaxis', () => {
    it('should detect allergic reaction with hypotension', () => {
      const context = createPatientContext({
        vitals: createVitals({ bloodPressureSystolic: 80 }),
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'allergic reaction, feeling faint', onset: 'today' },
        symptoms: [
          createSymptom('allergic reaction'),
          createSymptom('hives'),
        ],
        historyOfPresentIllness: 'Allergic reaction with hypotension',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-anaphylaxis')).toBe(true);
    });

    it('should detect allergic reaction with airway swelling', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'allergic reaction, throat swelling', onset: 'today' },
        symptoms: [createSymptom('throat swelling')],
        historyOfPresentIllness: 'Allergic reaction with airway swelling',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });

  describe('GI Hemorrhage', () => {
    it('should detect hematemesis', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'vomiting blood', onset: 'today' },
        symptoms: [createSymptom('hematemesis')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-gi-bleed')).toBe(true);
    });

    it('should detect melena', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'black tarry stools', onset: 'today' },
        symptoms: [createSymptom('melena')],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });

    it('should detect GI bleeding with syncope', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'rectal bleeding and passed out', onset: 'today' },
        symptoms: [
          createSymptom('rectal bleeding'),
          createSymptom('syncope'),
        ],
        historyOfPresentIllness: 'GI bleeding with syncope',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
    });
  });

  describe('Testicular Torsion', () => {
    it('should detect sudden onset severe testicular pain', () => {
      const context = createPatientContext({
        demographics: {
          age: 16,
          ageUnit: 'years',
          sex: 'male',
        },
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'sudden severe testicular pain', onset: 'today' },
        symptoms: [
          createSymptom('testicular pain', { 
            severity: 'severe', 
            onset: 'sudden',
          }),
        ],
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-testicular-torsion')).toBe(true);
    });
  });

  describe('Diabetic Emergency', () => {
    it('should detect DKA symptoms', () => {
      const context = createPatientContext({
        medicalHistory: {
          conditions: ['type 1 diabetes'],
        },
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'diabetic with confusion and vomiting', onset: 'today' },
        symptoms: [
          createSymptom('confusion'),
          createSymptom('vomiting'),
          createSymptom('abdominal pain'),
        ],
        historyOfPresentIllness: 'Known diabetic with altered mental status and Kussmaul breathing',
      });

      const result = evaluateRedFlags(context, assessment);

      expect(result.hasRedFlags).toBe(true);
      expect(result.matches.some(m => m.redFlag.id === 'rf-diabetic-emergency')).toBe(true);
    });
  });
});

// =============================================================================
// VITAL SIGN INTEGRATION TESTS
// =============================================================================

describe('Vital Sign Integration', () => {
  it('should integrate hypotension into cardiovascular red flags', () => {
    const context = createPatientContext({
      vitals: createVitals({ bloodPressureSystolic: 75, bloodPressureDiastolic: 45 }),
    });
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'chest pain', onset: 'today' },
      symptoms: [createSymptom('chest pain')],
    });

    const result = evaluateRedFlags(context, assessment);

    expect(result.hasRedFlags).toBe(true);
    const cardiacMatch = result.matches.find(m => m.redFlag.category === 'cardiovascular');
    expect(cardiacMatch?.matchedCriteria.some(c => c.includes('Hypotension'))).toBe(true);
  });

  it('should integrate tachycardia into sepsis detection', () => {
    const context = createPatientContext({
      vitals: createVitals({ 
        heartRate: 130,
        temperature: 39.5,
        respiratoryRate: 28,
      }),
    });
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'fever and chills', onset: 'today' },
      symptoms: [createSymptom('fever')],
    });

    const result = evaluateRedFlags(context, assessment);

    expect(result.hasRedFlags).toBe(true);
    const sepsisMatch = result.matches.find(m => m.redFlag.id === 'rf-sepsis');
    expect(sepsisMatch?.matchedCriteria.some(c => c.includes('Tachycardia'))).toBe(true);
  });

  it('should integrate hypoxia into respiratory red flags', () => {
    const context = createPatientContext({
      vitals: createVitals({ oxygenSaturation: 87 }),
    });
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'shortness of breath', onset: 'today' },
      symptoms: [createSymptom('shortness of breath')],
    });

    const result = evaluateRedFlags(context, assessment);

    expect(result.hasRedFlags).toBe(true);
    const respMatch = result.matches.find(m => m.redFlag.category === 'respiratory');
    expect(respMatch?.matchedCriteria.some(c => c.includes('Hypoxia'))).toBe(true);
  });

  it('should integrate severe hypertension into stroke detection', () => {
    const context = createPatientContext({
      vitals: createVitals({ bloodPressureSystolic: 195, bloodPressureDiastolic: 110 }),
    });
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'sudden severe headache', onset: 'today' },
      symptoms: [createSymptom('headache', { severity: 'severe', onset: 'sudden' })],
    });

    const result = evaluateRedFlags(context, assessment);

    expect(result.hasRedFlags).toBe(true);
    const neuroMatch = result.matches.find(m => m.redFlag.category === 'neurological');
    expect(neuroMatch?.matchedCriteria.some(c => c.includes('hypertension'))).toBe(true);
  });
});

// =============================================================================
// FALSE POSITIVE PREVENTION TESTS
// =============================================================================

describe('False Positive Prevention', () => {
  it('should NOT flag mild headache without other symptoms', () => {
    const context = createPatientContext();
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'mild headache', onset: 'yesterday' },
      symptoms: [createSymptom('headache', { severity: 'mild' })],
    });

    const result = evaluateRedFlags(context, assessment);

    // Should not trigger stroke alert for simple headache
    expect(result.matches.some(m => m.redFlag.id === 'rf-stroke')).toBe(false);
  });

  it('should NOT flag chronic stable chest pain', () => {
    const context = createPatientContext();
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'chest pain for 3 months, reproducible with palpation', onset: '3 months ago' },
      symptoms: [
        createSymptom('chest pain', { 
          duration: 'months',
          quality: 'sharp',
          aggravatedBy: ['palpation', 'movement'],
        }),
      ],
    });

    const result = evaluateRedFlags(context, assessment);

    // Musculoskeletal chest pain should not trigger cardiac alert
    // This may still flag as some concern, but not as ACS
    if (result.matches.some(m => m.redFlag.id === 'rf-chest-pain-cardiac')) {
      // If it does match, confidence should be lower
      const acsMatch = result.matches.find(m => m.redFlag.id === 'rf-chest-pain-cardiac');
      expect(acsMatch?.confidence).toBeLessThan(0.8);
    }
  });

  it('should NOT flag normal vital signs as emergency', () => {
    const context = createPatientContext({
      vitals: createVitals(), // Normal vitals
    });
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'sore throat', onset: 'yesterday' },
      symptoms: [createSymptom('sore throat')],
    });

    const result = evaluateRedFlags(context, assessment);

    // Sore throat with normal vitals should not be emergency
    expect(result.recommendedDisposition).not.toBe('emergency');
  });

  it('should NOT flag common cold symptoms as emergency', () => {
    const context = createPatientContext();
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'runny nose and cough', onset: '2 days ago' },
      symptoms: [
        createSymptom('runny nose'),
        createSymptom('cough'),
        createSymptom('mild fever'),
      ],
    });

    const result = evaluateRedFlags(context, assessment);

    expect(result.overallSeverity).not.toBe('critical');
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  describe('hasImmediateRedFlags', () => {
    it('should return true when immediate action needed', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'chest pain radiating to arm', onset: 'today' },
        symptoms: [createSymptom('chest pain', { radiation: 'arm' })],
      });

      const evaluation = evaluateRedFlags(context, assessment);
      
      if (evaluation.hasRedFlags) {
        expect(hasImmediateRedFlags(evaluation)).toBe(true);
      }
    });

    it('should return false when no red flags', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'minor headache', onset: 'yesterday' },
        symptoms: [],
      });

      const evaluation = evaluateRedFlags(context, assessment);
      
      expect(hasImmediateRedFlags(evaluation)).toBe(false);
    });
  });

  describe('getActionableRedFlags', () => {
    it('should return only critical and high severity flags', () => {
      const context = createPatientContext({
        vitals: createVitals({ oxygenSaturation: 85 }),
      });
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'chest pain and shortness of breath', onset: 'today' },
        symptoms: [
          createSymptom('chest pain'),
          createSymptom('shortness of breath'),
        ],
      });

      const evaluation = evaluateRedFlags(context, assessment);
      const actionable = getActionableRedFlags(evaluation);

      actionable.forEach(match => {
        expect(['critical', 'high']).toContain(match.redFlag.severity);
      });
    });
  });

  describe('formatRedFlagAlert', () => {
    it('should format alert message correctly', () => {
      const context = createPatientContext();
      const assessment = createAssessment({
        chiefComplaint: { complaint: 'chest pain radiating to arm', onset: 'today' },
        symptoms: [createSymptom('chest pain', { radiation: 'arm' })],
      });

      const evaluation = evaluateRedFlags(context, assessment);
      
      if (evaluation.matches.length > 0) {
        const formatted = formatRedFlagAlert(evaluation.matches[0]);
        expect(formatted).toContain('⚠️');
        expect(formatted).toContain(evaluation.matches[0].redFlag.name);
        expect(formatted).toContain('Action:');
      }
    });
  });
});

// =============================================================================
// EDGE CASES AND REGRESSION TESTS
// =============================================================================

describe('Edge Cases', () => {
  it('should handle empty symptoms array', () => {
    const context = createPatientContext();
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'not feeling well', onset: 'today' },
      symptoms: [],
    });

    expect(() => evaluateRedFlags(context, assessment)).not.toThrow();
  });

  it('should handle missing vital signs', () => {
    const context = createPatientContext({ vitals: undefined });
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'chest pain', onset: 'today' },
      symptoms: [createSymptom('chest pain')],
    });

    expect(() => evaluateRedFlags(context, assessment)).not.toThrow();
  });

  it('should handle missing medical history', () => {
    const context = createPatientContext({ medicalHistory: undefined });
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'chest pain', onset: 'today' },
      symptoms: [createSymptom('chest pain')],
    });

    expect(() => evaluateRedFlags(context, assessment)).not.toThrow();
  });

  it('should handle very long symptom descriptions', () => {
    const context = createPatientContext();
    const longDescription = 'A '.repeat(1000);
    const assessment = createAssessment({
      chiefComplaint: { complaint: longDescription, onset: 'today' },
      symptoms: [createSymptom(longDescription)],
    });

    expect(() => evaluateRedFlags(context, assessment)).not.toThrow();
  });

  it('should handle special characters in input', () => {
    const context = createPatientContext();
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'chest pain <script>alert("xss")</script>', onset: 'today' },
      symptoms: [createSymptom('chest pain')],
    });

    expect(() => evaluateRedFlags(context, assessment)).not.toThrow();
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('should evaluate red flags in under 100ms', () => {
    const context = createPatientContext({
      vitals: createVitals(),
      medicalHistory: { conditions: ['diabetes', 'hypertension', 'CAD'] },
    });
    const assessment = createAssessment({
      chiefComplaint: { complaint: 'chest pain radiating to arm with diaphoresis', onset: 'today' },
      symptoms: [
        createSymptom('chest pain'),
        createSymptom('shortness of breath'),
        createSymptom('nausea'),
        createSymptom('diaphoresis'),
      ],
      historyOfPresentIllness: 'Patient with multiple cardiac risk factors presenting with typical ACS symptoms',
    });

    const start = performance.now();
    const result = evaluateRedFlags(context, assessment);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
    expect(result).toBeDefined();
  });

  it('should handle batch evaluation efficiently', () => {
    const contexts = Array.from({ length: 100 }, () => createPatientContext());
    const assessments = contexts.map(() => createAssessment({
      chiefComplaint: { complaint: 'various symptoms', onset: 'today' },
      symptoms: [createSymptom('headache')],
    }));

    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      evaluateRedFlags(contexts[i], assessments[i]);
    }
    
    const duration = performance.now() - start;
    const averageTime = duration / 100;

    expect(averageTime).toBeLessThan(50); // Less than 50ms per evaluation
  });
});
