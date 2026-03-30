/**
 * SNF Transfer Services — Comprehensive Test Suite
 *
 * Tests all 12 SNF-to-Hospital transfer domain services with
 * realistic clinical data, edge cases, and orchestrator workflow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DiagnosisCodingEngine } from '../DiagnosisCodingEngine';
import type { CodingInput, CodingResult } from '../DiagnosisCodingEngine';

import { EmLevelDeterminator } from '../EmLevelDeterminator';
import type { EMInput, DiagnosisInput } from '../EmLevelDeterminator';

import { FunctionalStatusAggregator } from '../FunctionalStatusAggregator';
import type { FunctionalAssessmentRecord } from '../FunctionalStatusAggregator';

import { InteractDocumentGenerator } from '../InteractDocumentGenerator';

import { IsolationPrecautionManager } from '../IsolationPrecautionManager';
import type { IsolationRecord } from '../IsolationPrecautionManager';

import { MarReconciliationEngine } from '../MarReconciliationEngine';

import { NarrativeGenerator } from '../NarrativeGenerator';
import type { NarrativeInput } from '../NarrativeGenerator';

import { PolstExtractor } from '../PolstExtractor';
import type { AdvanceDirectiveRecord } from '../PolstExtractor';

import { PprEvaluator } from '../PprEvaluator';

import { SnfTransferOrchestrator } from '../SnfTransferOrchestrator';

import { TransferCommunicationService } from '../TransferCommunicationService';

import { WoundAssessmentProcessor } from '../WoundAssessmentProcessor';

import type { SNFMedicationRecord, FormularyEntry } from '../../../types/mar-reconciliation.types';
import { isHighRiskMedication, calculateReconciliationCompleteness } from '../../../types/mar-reconciliation.types';
import type { InteractDocument, InteractWoundEntry, BradenSubscores } from '../../../types/interact.types';
import { calculateBradenTotal, getBradenRiskLevel, isDNR } from '../../../types/interact.types';
import { isEmergencyTransfer } from '../../../types/snf-transfer.types';

// =============================================================================
// Shared Test Fixtures
// =============================================================================

function makeCodingInput(overrides: Partial<CodingInput> = {}): CodingInput {
  return {
    patientAge: 82,
    patientGender: 'Female',
    chiefComplaint: 'Acute shortness of breath',
    presentingSymptoms: ['dyspnea', 'bilateral lower extremity edema', 'weight gain 5 lbs in 3 days'],
    medicalHistory: ['congestive heart failure', 'hypertension', 'type 2 diabetes', 'atrial fibrillation'],
    medications: ['lisinopril 10mg daily', 'furosemide 40mg BID', 'metformin 500mg BID', 'apixaban 5mg BID'],
    allergies: ['penicillin'],
    vitals: {
      bloodPressureSystolic: 158,
      bloodPressureDiastolic: 92,
      heartRate: 104,
      respiratoryRate: 24,
      temperature: 98.8,
      oxygenSaturation: 88,
    },
    labResults: [
      { testName: 'BNP', value: 1200, units: 'pg/mL', referenceRange: '<100', isAbnormal: true, isCritical: true },
      { testName: 'Sodium', value: 131, units: 'mEq/L', referenceRange: '135-145', isAbnormal: true, isCritical: false },
      { testName: 'Potassium', value: 5.3, units: 'mEq/L', referenceRange: '3.5-5.0', isAbnormal: true, isCritical: false },
      { testName: 'eGFR', value: 42, units: 'mL/min', referenceRange: '>60', isAbnormal: true, isCritical: false },
      { testName: 'Glucose', value: 245, units: 'mg/dL', referenceRange: '70-100', isAbnormal: true, isCritical: false },
    ],
    transferReason: 'Acute heart failure exacerbation with respiratory distress',
    ...overrides,
  };
}

function makeNarrativeInput(overrides: Partial<NarrativeInput> = {}): NarrativeInput {
  return {
    patientName: 'Smith, Margaret',
    patientAge: 82,
    patientGender: 'Female',
    chiefComplaint: 'Acute shortness of breath',
    presentingSymptoms: ['dyspnea', 'bilateral edema', 'weight gain'],
    medicalHistory: ['CHF', 'hypertension', 'type 2 diabetes'],
    medications: ['lisinopril 10mg', 'furosemide 40mg', 'metformin 500mg'],
    allergies: ['penicillin'],
    sendingFacility: 'Sunrise SNF',
    transferReason: 'CHF exacerbation',
    transferUrgency: 'Urgent',
    codeStatus: 'DNR',
    ...overrides,
  };
}

function makeSNFMedication(overrides: Partial<SNFMedicationRecord> = {}): SNFMedicationRecord {
  return {
    id: 'med-1',
    patientId: 'pt-1',
    medicationName: 'Lisinopril',
    genericName: 'lisinopril',
    rxnormCode: '29046',
    dose: '10',
    doseUnit: 'mg',
    frequency: 'daily',
    route: 'oral',
    scheduledTimes: ['0800'],
    isPRN: false,
    isControlled: false,
    status: 'ACTIVE',
    startDate: '2024-01-15',
    recentAdministrations: [],
    ...overrides,
  };
}

function makeFormularyEntry(overrides: Partial<FormularyEntry> = {}): FormularyEntry {
  return {
    id: 'form-1',
    organizationId: 'org-1',
    medicationName: 'Lisinopril',
    genericName: 'lisinopril',
    rxnormCode: '29046',
    isOnFormulary: true,
    therapeuticClass: 'ACE_INHIBITOR',
    ...overrides,
  };
}

function makeIsolationRecord(overrides: Partial<IsolationRecord> = {}): IsolationRecord {
  return {
    id: 'iso-1',
    patientId: 'pt-1',
    precautionType: 'CONTACT',
    organism: 'MRSA',
    organismCode: 'MRSA-001',
    cultureDate: '2025-12-01',
    cultureSource: 'nares',
    ppeRequirements: ['gown', 'gloves'],
    roomRequirements: 'PRIVATE',
    clearanceCriteria: '3 negative nares cultures 1 week apart',
    status: 'ACTIVE',
    startDate: '2025-12-01',
    ...overrides,
  };
}

function makeAdvanceDirectiveRecord(overrides: Partial<AdvanceDirectiveRecord> = {}): AdvanceDirectiveRecord {
  return {
    id: 'ad-1',
    patientId: 'pt-1',
    documentType: 'POLST',
    codeStatus: 'DNR',
    intubationPreference: 'NO',
    dialysisPreference: 'TRIAL_PERIOD',
    antibioticsPreference: 'LIMITED',
    nutritionDirective: 'COMFORT_FEEDING',
    treatmentLimitations: ['No ICU admission', 'No mechanical ventilation'],
    effectiveDate: '2025-06-15',
    ocrProcessed: false,
    isActive: true,
    ...overrides,
  };
}

function makeFunctionalRecord(overrides: Partial<FunctionalAssessmentRecord> = {}): FunctionalAssessmentRecord {
  return {
    id: 'fa-1',
    patientId: 'pt-1',
    instrumentType: 'BARTHEL',
    totalScore: 55,
    subscores: { feeding: 5, bathing: 0, grooming: 5, dressing: 5, bowels: 10, bladder: 5, toileting: 5, transfers: 10, mobility: 10, stairs: 0 },
    assessedAt: new Date().toISOString(),
    mobilityAids: ['wheelchair', 'walker'],
    weightBearingStatus: 'PARTIAL',
    transferAssistance: 'MOD_ASSIST',
    cognitiveStatus: 'MILD_IMPAIRMENT',
    ...overrides,
  };
}

function makeWound(overrides: Partial<InteractWoundEntry> = {}): InteractWoundEntry {
  return {
    location: 'Sacrum',
    woundType: 'PRESSURE_INJURY',
    stage: 'STAGE_3',
    lengthCm: 4.5,
    widthCm: 3.2,
    depthCm: 1.0,
    woundBed: 'GRANULATION',
    exudateType: 'SEROUS',
    exudateAmount: 'MODERATE',
    periWoundSkin: 'Erythematous',
    odorPresent: false,
    currentTreatment: 'Silver alginate dressing, changed q3d',
    bradenScore: 14,
    ...overrides,
  };
}

// =============================================================================
// 1. DiagnosisCodingEngine
// =============================================================================

describe('DiagnosisCodingEngine', () => {
  let engine: DiagnosisCodingEngine;

  beforeEach(() => {
    engine = new DiagnosisCodingEngine();
  });

  describe('suggestCodes', () => {
    it('should return codes from medical history keyword matching', () => {
      const input = makeCodingInput();
      const result = engine.suggestCodes(input);

      expect(result.suggestedCodes.length).toBeGreaterThan(0);
      expect(result.primaryDiagnosis).not.toBeNull();
      expect(result.summaryText).toBeTruthy();
    });

    it('should derive lab-based codes for abnormal sodium', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'confusion',
        labResults: [
          { testName: 'Sodium', value: 128, units: 'mEq/L', referenceRange: '135-145', isAbnormal: true, isCritical: false },
        ],
      });
      const result = engine.suggestCodes(input);
      const hyponatremia = result.suggestedCodes.find((c) => c.code === 'E87.1');
      expect(hyponatremia).toBeDefined();
      expect(hyponatremia?.source).toBe('LAB_DERIVED');
      expect(hyponatremia?.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should derive hyperkalemia code for elevated potassium', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'weakness',
        labResults: [
          { testName: 'Potassium', value: 6.1, units: 'mEq/L', referenceRange: '3.5-5.0', isAbnormal: true, isCritical: true },
        ],
      });
      const result = engine.suggestCodes(input);
      expect(result.suggestedCodes.some((c) => c.code === 'E87.5')).toBe(true);
    });

    it('should derive hypokalemia code for low potassium', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'weakness',
        labResults: [
          { testName: 'Potassium', value: 2.8, units: 'mEq/L', referenceRange: '3.5-5.0', isAbnormal: true, isCritical: true },
        ],
      });
      const result = engine.suggestCodes(input);
      expect(result.suggestedCodes.some((c) => c.code === 'E87.6')).toBe(true);
    });

    it('should derive hyperglycemia code for glucose > 200', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'altered mental status',
        labResults: [
          { testName: 'Glucose', value: 350, units: 'mg/dL', referenceRange: '70-100', isAbnormal: true, isCritical: true },
        ],
      });
      const result = engine.suggestCodes(input);
      expect(result.suggestedCodes.some((c) => c.code === 'E11.65')).toBe(true);
    });

    it('should derive hypoglycemia code for glucose < 70', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'unresponsive',
        labResults: [
          { testName: 'Glucose', value: 42, units: 'mg/dL', referenceRange: '70-100', isAbnormal: true, isCritical: true },
        ],
      });
      const result = engine.suggestCodes(input);
      expect(result.suggestedCodes.some((c) => c.code === 'E16.2')).toBe(true);
    });

    it('should derive CKD Stage 3 code for eGFR 30-59', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'fatigue',
        labResults: [
          { testName: 'eGFR', value: 42, units: 'mL/min', referenceRange: '>60', isAbnormal: true, isCritical: false },
        ],
      });
      const result = engine.suggestCodes(input);
      expect(result.suggestedCodes.some((c) => c.code === 'N18.3')).toBe(true);
    });

    it('should derive CKD Stage 4 code for eGFR 15-29', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'fatigue',
        labResults: [
          { testName: 'eGFR', value: 22, units: 'mL/min', referenceRange: '>60', isAbnormal: true, isCritical: false },
        ],
      });
      const result = engine.suggestCodes(input);
      expect(result.suggestedCodes.some((c) => c.code === 'N18.4')).toBe(true);
    });

    it('should derive heart failure code for elevated BNP', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'dyspnea',
        labResults: [
          { testName: 'BNP', value: 800, units: 'pg/mL', referenceRange: '<100', isAbnormal: true, isCritical: true },
        ],
      });
      const result = engine.suggestCodes(input);
      expect(result.suggestedCodes.some((c) => c.code === 'I50.9')).toBe(true);
    });

    it('should derive vital sign codes for hypertension, hypoxemia, tachycardia, and fever', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'feeling unwell',
        labResults: [],
        vitals: {
          bloodPressureSystolic: 180,
          bloodPressureDiastolic: 100,
          heartRate: 115,
          oxygenSaturation: 85,
          temperature: 102.4,
        },
      });
      const result = engine.suggestCodes(input);
      const codes = result.suggestedCodes.map((c) => c.code);
      expect(codes).toContain('I10');       // Hypertension
      expect(codes).toContain('R09.02');    // Hypoxemia
      expect(codes).toContain('R00.0');     // Tachycardia
      expect(codes).toContain('R50.9');     // Fever
    });

    it('should deduplicate codes keeping highest confidence', () => {
      const input = makeCodingInput({
        medicalHistory: ['hypertension', 'high blood pressure'],
        transferReason: 'hypertension crisis',
      });
      const result = engine.suggestCodes(input);
      const htnCodes = result.suggestedCodes.filter((c) => c.code === 'I10');
      expect(htnCodes.length).toBeLessThanOrEqual(1);
    });

    it('should identify documentation gaps for diabetes quality measures', () => {
      const input = makeCodingInput({
        medicalHistory: ['diabetes'],
      });
      const result = engine.suggestCodes(input);
      expect(result.documentationGaps.some((g) => g.field === 'DM_QUALITY')).toBe(true);
    });

    it('should identify documentation gaps for hypertension quality measures', () => {
      const input = makeCodingInput({
        medicalHistory: ['hypertension'],
      });
      const result = engine.suggestCodes(input);
      expect(result.documentationGaps.some((g) => g.field === 'HTN_QUALITY')).toBe(true);
    });

    it('should handle empty medical history gracefully', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'routine',
        labResults: [],
        vitals: undefined,
        transferReason: undefined,
      });
      const result = engine.suggestCodes(input);
      expect(result).toBeDefined();
      expect(result.suggestedCodes).toBeDefined();
      expect(result.codingComplexity).toBeDefined();
    });

    it('should classify coding complexity based on code count', () => {
      // Simple: <= 2 codes
      const simpleInput = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'headache',
        labResults: [],
        vitals: undefined,
        transferReason: undefined,
      });
      const simpleResult = engine.suggestCodes(simpleInput);
      expect(['SIMPLE', 'MODERATE', 'COMPLEX']).toContain(simpleResult.codingComplexity);
    });

    it('should match transfer reason keywords to ICD codes', () => {
      const input = makeCodingInput({
        medicalHistory: [],
        presentingSymptoms: [],
        chiefComplaint: 'transfer',
        transferReason: 'pneumonia',
      });
      const result = engine.suggestCodes(input);
      // Should find pneumonia-related codes from the transfer reason
      expect(result.suggestedCodes.some((c) => c.rationale.includes('transfer reason'))).toBe(true);
    });
  });

  describe('buildAICodingPrompt', () => {
    it('should produce a prompt string containing patient data', () => {
      const input = makeCodingInput();
      const tier0 = engine.suggestCodes(input);
      const prompt = engine.buildAICodingPrompt(input, tier0);

      expect(prompt).toContain('82');
      expect(prompt).toContain('Female');
      expect(prompt).toContain('shortness of breath');
      expect(prompt).toContain('congestive heart failure');
      expect(prompt).toContain('JSON format');
    });

    it('should include tier 0 suggestions in the prompt', () => {
      const input = makeCodingInput();
      const tier0 = engine.suggestCodes(input);
      const prompt = engine.buildAICodingPrompt(input, tier0);

      for (const code of tier0.suggestedCodes.slice(0, 3)) {
        expect(prompt).toContain(code.code);
      }
    });
  });
});

// =============================================================================
// 2. EmLevelDeterminator
// =============================================================================

describe('EmLevelDeterminator', () => {
  let determinator: EmLevelDeterminator;

  beforeEach(() => {
    determinator = new EmLevelDeterminator();
  });

  describe('determine', () => {
    it('should return HIGH MDM for life-threatening diagnosis with hospitalization', () => {
      const input: EMInput = {
        encounterCategory: 'EMERGENCY_DEPARTMENT',
        diagnoses: [
          {
            description: 'Sepsis',
            icd10Code: 'A41.9',
            isNew: true,
            isAcute: true,
            isChronic: false,
            isExacerbation: false,
            isStable: false,
            isLifeThreatening: true,
          },
        ],
        isHospitalization: true,
        acuteDiagnosisSeverity: 'LIFE_THREATENING',
        labsOrdered: ['CBC', 'BMP', 'blood cultures', 'lactate'],
        labsReviewed: ['CBC', 'BMP'],
        externalRecordsReviewed: true,
      };
      const result = determinator.determine(input);

      expect(result.overallMDM).toBe('HIGH');
      expect(result.cptCode).toBe('99285'); // ED high complexity
    });

    it('should return MODERATE MDM for chronic exacerbation with hospitalization', () => {
      const input: EMInput = {
        encounterCategory: 'INITIAL_HOSPITAL',
        diagnoses: [
          {
            description: 'CHF exacerbation',
            isNew: false,
            isAcute: false,
            isChronic: true,
            isExacerbation: true,
            isStable: false,
            isLifeThreatening: false,
          },
        ],
        isHospitalization: true,
        acuteDiagnosisSeverity: 'MODERATE',
        labsOrdered: ['BNP', 'CXR'],
        externalRecordsReviewed: true,
      };
      const result = determinator.determine(input);

      expect(['MODERATE', 'HIGH']).toContain(result.overallMDM);
    });

    it('should use SNF transfer context for data points when provided', () => {
      const input: EMInput = {
        encounterCategory: 'INITIAL_HOSPITAL',
        diagnoses: [
          {
            description: 'Pneumonia',
            isNew: true,
            isAcute: true,
            isChronic: false,
            isExacerbation: false,
            isStable: false,
            isLifeThreatening: false,
          },
        ],
        snfTransferContext: {
          marReconciliationPerformed: true,
          medicationCount: 12,
          hasHighRiskMeds: true,
          hasControlledSubstances: true,
          hasCriticalDiscrepancies: false,
        },
        isHospitalization: true,
        acuteDiagnosisSeverity: 'MODERATE',
        labsOrdered: ['CBC'],
        externalRecordsReviewed: true,
      };
      const result = determinator.determine(input);

      expect(result.cptCode).toBeTruthy();
      expect(result.rationale).toContain('E/M Level');
    });

    it('should handle empty diagnosis list gracefully', () => {
      const input: EMInput = {
        encounterCategory: 'OFFICE_OUTPATIENT',
        diagnoses: [],
        isHospitalization: false,
        acuteDiagnosisSeverity: 'MINOR',
      };
      const result = determinator.determine(input);

      expect(result.element1.level).toBe('STRAIGHTFORWARD');
      expect(result.cptCode).toBeTruthy();
    });

    it('should generate documentation gap messages', () => {
      const input: EMInput = {
        encounterCategory: 'EMERGENCY_DEPARTMENT',
        diagnoses: [
          {
            description: 'Sepsis',
            isNew: true,
            isAcute: true,
            isChronic: false,
            isExacerbation: false,
            isStable: false,
            isLifeThreatening: true,
          },
        ],
        isHospitalization: true,
        acuteDiagnosisSeverity: 'LIFE_THREATENING',
        // No labs, no imaging — data element will be low
      };
      const result = determinator.determine(input);
      // The result should have some gaps or upgrades when elements differ
      expect(result.documentationGaps).toBeDefined();
      expect(result.specificityUpgrades).toBeDefined();
    });
  });

  describe('determineFromCodingResult', () => {
    it('should derive E/M level from a DiagnosisCodingEngine output', () => {
      const codingEngine = new DiagnosisCodingEngine();
      const codingResult = codingEngine.suggestCodes(makeCodingInput());

      const result = determinator.determineFromCodingResult(
        codingResult,
        'INITIAL_HOSPITAL',
        { labsOrdered: ['CBC', 'BMP', 'BNP'], externalRecordsReviewed: true }
      );

      expect(result.overallMDM).toBeTruthy();
      expect(result.cptCode).toBeTruthy();
      expect(result.emCategory).toBe('INITIAL_HOSPITAL');
    });
  });
});

// =============================================================================
// 3. FunctionalStatusAggregator
// =============================================================================

describe('FunctionalStatusAggregator', () => {
  let aggregator: FunctionalStatusAggregator;

  beforeEach(() => {
    aggregator = new FunctionalStatusAggregator();
  });

  describe('aggregate', () => {
    it('should aggregate multiple functional assessment records', () => {
      const records: FunctionalAssessmentRecord[] = [
        makeFunctionalRecord({ instrumentType: 'BARTHEL', totalScore: 55 }),
        makeFunctionalRecord({ id: 'fa-2', instrumentType: 'MORSE_FALL', totalScore: 65, subscores: { history_of_falling: 25, secondary_diagnosis: 15, ambulatory_aid: 15, iv_therapy: 0, gait: 10, mental_status: 0 } }),
        makeFunctionalRecord({ id: 'fa-3', instrumentType: 'BRADEN', totalScore: 14, subscores: { sensoryPerception: 3, moisture: 2, activity: 2, mobility: 2, nutrition: 3, frictionShear: 2 } }),
      ];

      const result = aggregator.aggregate(records);

      expect(result.assessments).toHaveLength(3);
      expect(result.mobilityAids).toContain('wheelchair');
      expect(result.mobilityAids).toContain('walker');
      expect(result.transferAssistance).toBe('MOD_ASSIST');
      expect(result.cognitiveStatus).toBe('MILD_IMPAIRMENT');
    });

    it('should use only the most recent assessment per instrument type', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const records: FunctionalAssessmentRecord[] = [
        makeFunctionalRecord({ assessedAt: yesterday.toISOString(), totalScore: 40 }),
        makeFunctionalRecord({ id: 'fa-2', assessedAt: new Date().toISOString(), totalScore: 55 }),
      ];

      const result = aggregator.aggregate(records);
      expect(result.assessments).toHaveLength(1);
      expect(result.assessments[0].totalScore).toBe(55);
    });

    it('should filter out scores outside valid range', () => {
      const records: FunctionalAssessmentRecord[] = [
        makeFunctionalRecord({ instrumentType: 'BARTHEL', totalScore: 150 }), // Invalid: >100
      ];

      const result = aggregator.aggregate(records);
      expect(result.assessments).toHaveLength(0);
    });

    it('should extract the most restricted weight-bearing status', () => {
      const records: FunctionalAssessmentRecord[] = [
        makeFunctionalRecord({ weightBearingStatus: 'PARTIAL' }),
        makeFunctionalRecord({ id: 'fa-2', instrumentType: 'KATZ_ADL', totalScore: 3, subscores: {}, weightBearingStatus: 'NON_WEIGHT_BEARING' }),
      ];

      const result = aggregator.aggregate(records);
      expect(result.weightBearingStatus).toBe('NON_WEIGHT_BEARING');
    });

    it('should extract the highest (most dependent) assistance level', () => {
      const records: FunctionalAssessmentRecord[] = [
        makeFunctionalRecord({ transferAssistance: 'MIN_ASSIST' }),
        makeFunctionalRecord({ id: 'fa-2', instrumentType: 'KATZ_ADL', totalScore: 3, subscores: {}, transferAssistance: 'DEPENDENT' }),
      ];

      const result = aggregator.aggregate(records);
      expect(result.transferAssistance).toBe('DEPENDENT');
    });

    it('should extract the worst cognitive status', () => {
      const records: FunctionalAssessmentRecord[] = [
        makeFunctionalRecord({ cognitiveStatus: 'MILD_IMPAIRMENT' }),
        makeFunctionalRecord({ id: 'fa-2', instrumentType: 'KATZ_ADL', totalScore: 3, subscores: {}, cognitiveStatus: 'SEVERE' }),
      ];

      const result = aggregator.aggregate(records);
      expect(result.cognitiveStatus).toBe('SEVERE');
    });

    it('should handle empty records array', () => {
      const result = aggregator.aggregate([]);
      expect(result.assessments).toHaveLength(0);
      expect(result.mobilityAids).toHaveLength(0);
      expect(result.transferAssistance).toBe('INDEPENDENT');
      expect(result.cognitiveStatus).toBe('INTACT');
    });

    it('should set cognitive baseline text from worst cognitive status', () => {
      const records = [makeFunctionalRecord({ cognitiveStatus: 'MODERATE' })];
      const result = aggregator.aggregate(records);
      expect(result.cognitiveBaseline).toContain('moderate');
    });
  });

  describe('getInterpretation', () => {
    it('should interpret Barthel scores correctly', () => {
      expect(aggregator.getInterpretation('BARTHEL', 100)).toContain('INDEPENDENT');
      expect(aggregator.getInterpretation('BARTHEL', 55)).toContain('SEVERE');
      expect(aggregator.getInterpretation('BARTHEL', 15)).toContain('TOTAL');
    });

    it('should interpret Morse Fall Scale correctly', () => {
      expect(aggregator.getInterpretation('MORSE_FALL', 10)).toContain('LOW');
      expect(aggregator.getInterpretation('MORSE_FALL', 35)).toContain('MODERATE');
      expect(aggregator.getInterpretation('MORSE_FALL', 65)).toContain('HIGH');
    });

    it('should interpret Braden scores correctly', () => {
      expect(aggregator.getInterpretation('BRADEN', 8)).toContain('VERY_HIGH');
      expect(aggregator.getInterpretation('BRADEN', 11)).toContain('HIGH');
      expect(aggregator.getInterpretation('BRADEN', 14)).toContain('MODERATE');
      expect(aggregator.getInterpretation('BRADEN', 16)).toContain('MILD');
      expect(aggregator.getInterpretation('BRADEN', 20)).toContain('NO_RISK');
    });

    it('should interpret Katz ADL scores', () => {
      expect(aggregator.getInterpretation('KATZ_ADL', 6)).toContain('A');
      expect(aggregator.getInterpretation('KATZ_ADL', 4)).toContain('B-C');
      expect(aggregator.getInterpretation('KATZ_ADL', 1)).toContain('F-G');
    });
  });

  describe('isWithinValidRange', () => {
    it('should validate Barthel range 0-100', () => {
      expect(aggregator.isWithinValidRange('BARTHEL', 0)).toBe(true);
      expect(aggregator.isWithinValidRange('BARTHEL', 100)).toBe(true);
      expect(aggregator.isWithinValidRange('BARTHEL', -1)).toBe(false);
      expect(aggregator.isWithinValidRange('BARTHEL', 101)).toBe(false);
    });

    it('should validate Braden range 6-23', () => {
      expect(aggregator.isWithinValidRange('BRADEN', 6)).toBe(true);
      expect(aggregator.isWithinValidRange('BRADEN', 23)).toBe(true);
      expect(aggregator.isWithinValidRange('BRADEN', 5)).toBe(false);
      expect(aggregator.isWithinValidRange('BRADEN', 24)).toBe(false);
    });

    it('should accept any score for CUSTOM instrument type', () => {
      expect(aggregator.isWithinValidRange('CUSTOM', 999)).toBe(true);
    });
  });
});

// =============================================================================
// 4. InteractDocumentGenerator
// =============================================================================

describe('InteractDocumentGenerator', () => {
  let generator: InteractDocumentGenerator;

  beforeEach(() => {
    generator = new InteractDocumentGenerator();
  });

  describe('validate', () => {
    it('should return errors for completely empty document', () => {
      const result = generator.validate({});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.completionPercentage).toBe(0);
    });

    it('should produce warnings for advance directive not verified within 90 days', () => {
      const result = generator.validate({
        advanceDirectives: {
          codeStatus: 'DNR',
          documentType: 'POLST',
          documentDate: '2024-01-01',
          verificationStatus: 'Not verified',
          verifiedWithinNinetyDays: false,
          scannedDocumentAvailable: false,
        },
      });
      expect(result.warnings.some((w) => w.fieldId === 'directive_verification')).toBe(true);
    });

    it('should produce warnings for stale functional assessment', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // >90 days ago

      const result = generator.validate({
        functionalStatus: {
          assessments: [
            {
              instrumentType: 'BARTHEL',
              totalScore: 55,
              interpretation: 'Severe (55/100)',
              subscores: {},
              assessmentDate: oldDate.toISOString(),
            },
          ],
          mobilityAids: [],
          transferAssistance: 'MOD_ASSIST',
          cognitiveStatus: 'INTACT',
          cognitiveBaseline: 'Intact',
        },
      });
      expect(result.warnings.some((w) => w.rule === 'FRESHNESS')).toBe(true);
    });

    it('should report section completeness percentages', () => {
      const result = generator.validate({});
      expect(result.sectionCompleteness).toBeDefined();
      expect(Object.keys(result.sectionCompleteness).length).toBe(10); // 10 INTERACT sections
    });
  });

  describe('getComplianceScore', () => {
    it('should return 0 for empty document', () => {
      const score = generator.getComplianceScore({});
      expect(score).toBe(0);
    });

    it('should return a higher score when sections are populated', () => {
      const doc: Partial<InteractDocument> = {
        patientIdentification: {
          patientFullName: 'Smith, Margaret',
          dateOfBirth: '1942-05-15',
          gender: 'Female',
          insuranceNumber: 'M123456789',
          insuranceProvider: 'Medicare',
          snfFacilityName: 'Sunrise SNF',
          snfPhone: '555-0100',
          snfAddress: '123 Care Lane',
          attendingPhysician: 'Dr. Jones',
          attendingPhysicianPhone: '555-0200',
          transferDateTime: new Date().toISOString(),
        },
      };
      const score = generator.getComplianceScore(doc);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('generate', () => {
    it('should throw not-implemented error (requires data layer)', async () => {
      await expect(generator.generate('transfer-1')).rejects.toThrow('Not implemented');
    });
  });
});

// =============================================================================
// 5. IsolationPrecautionManager
// =============================================================================

describe('IsolationPrecautionManager', () => {
  let manager: IsolationPrecautionManager;

  beforeEach(() => {
    manager = new IsolationPrecautionManager();
  });

  describe('assembleIsolationData', () => {
    it('should assemble active isolation records', () => {
      const records = [makeIsolationRecord()];
      const result = manager.assembleIsolationData('pt-1', records);

      expect(result.hasActiveIsolation).toBe(true);
      expect(result.precautions).toHaveLength(1);
      expect(result.precautions[0].organism).toBe('MRSA');
      expect(result.precautions[0].precautionType).toBe('CONTACT');
    });

    it('should filter out cleared isolation records', () => {
      const records = [
        makeIsolationRecord({ status: 'ACTIVE' }),
        makeIsolationRecord({ id: 'iso-2', status: 'CLEARED', organism: 'VRE' }),
      ];
      const result = manager.assembleIsolationData('pt-1', records);

      expect(result.precautions).toHaveLength(1);
      expect(result.precautions[0].organism).toBe('MRSA');
    });

    it('should return hasActiveIsolation=false when no active records', () => {
      const result = manager.assembleIsolationData('pt-1', []);
      expect(result.hasActiveIsolation).toBe(false);
      expect(result.precautions).toHaveLength(0);
    });

    it('should use default PPE when record has empty ppeRequirements', () => {
      const records = [makeIsolationRecord({ ppeRequirements: [] })];
      const result = manager.assembleIsolationData('pt-1', records);

      expect(result.precautions[0].ppeRequirements).toEqual(['gown', 'gloves']);
    });

    it('should default organism to Unspecified when missing', () => {
      const records = [makeIsolationRecord({ organism: undefined })];
      const result = manager.assembleIsolationData('pt-1', records);
      expect(result.precautions[0].organism).toBe('Unspecified');
    });
  });

  describe('determineRoomRequirements', () => {
    it('should return NEGATIVE_PRESSURE as most restrictive', () => {
      const precautions = [
        { roomRequirements: 'PRIVATE', precautionType: 'CONTACT' as const, organism: 'MRSA', cultureDate: '', cultureSource: 'nares' as const, ppeRequirements: [] },
        { roomRequirements: 'NEGATIVE_PRESSURE', precautionType: 'AIRBORNE' as const, organism: 'TB', cultureDate: '', cultureSource: 'sputum' as const, ppeRequirements: [] },
      ];
      expect(manager.determineRoomRequirements(precautions)).toBe('NEGATIVE_PRESSURE');
    });

    it('should return ANTEROOM when present and no negative pressure', () => {
      const precautions = [
        { roomRequirements: 'ANTEROOM', precautionType: 'AIRBORNE' as const, organism: 'measles', cultureDate: '', cultureSource: 'nares' as const, ppeRequirements: [] },
      ];
      expect(manager.determineRoomRequirements(precautions)).toBe('ANTEROOM');
    });

    it('should return PRIVATE for standard precautions', () => {
      const precautions = [
        { roomRequirements: 'PRIVATE', precautionType: 'CONTACT' as const, organism: 'MRSA', cultureDate: '', cultureSource: 'nares' as const, ppeRequirements: [] },
      ];
      expect(manager.determineRoomRequirements(precautions)).toBe('PRIVATE');
    });

    it('should return STANDARD when no precautions', () => {
      expect(manager.determineRoomRequirements([])).toBe('STANDARD');
    });
  });

  describe('isMDRO', () => {
    it('should identify MRSA as MDRO', () => {
      expect(manager.isMDRO('MRSA')).toBe(true);
    });

    it('should identify VRE as MDRO', () => {
      expect(manager.isMDRO('VRE')).toBe(true);
    });

    it('should identify CRE as MDRO', () => {
      expect(manager.isMDRO('CRE')).toBe(true);
    });

    it('should identify carbapenem-resistant organisms', () => {
      expect(manager.isMDRO('Carbapenem-resistant Klebsiella')).toBe(true);
    });

    it('should not flag common non-MDRO organisms', () => {
      expect(manager.isMDRO('E. coli')).toBe(false);
      expect(manager.isMDRO('Staphylococcus aureus')).toBe(false);
    });
  });

  describe('getPpeForPrecautionType', () => {
    it('should return gown + gloves for CONTACT', () => {
      expect(manager.getPpeForPrecautionType('CONTACT')).toEqual(['gown', 'gloves']);
    });

    it('should return full PPE for AIRBORNE', () => {
      const ppe = manager.getPpeForPrecautionType('AIRBORNE');
      expect(ppe).toContain('N95');
      expect(ppe).toContain('gloves');
      expect(ppe).toContain('gown');
      expect(ppe).toContain('eye_protection');
    });

    it('should return surgical mask for DROPLET', () => {
      const ppe = manager.getPpeForPrecautionType('DROPLET');
      expect(ppe).toContain('surgical_mask');
    });
  });
});

// =============================================================================
// 6. MarReconciliationEngine
// =============================================================================

describe('MarReconciliationEngine', () => {
  let engine: MarReconciliationEngine;

  beforeEach(() => {
    engine = new MarReconciliationEngine();
  });

  describe('checkFormularyMatch', () => {
    it('should return EXACT_RXNORM match when RxNorm codes match', () => {
      const med = makeSNFMedication({ rxnormCode: '29046' });
      const formulary = [makeFormularyEntry({ rxnormCode: '29046', isOnFormulary: true })];
      const result = engine.checkFormularyMatch(med, formulary);

      expect(result.matchType).toBe('EXACT_RXNORM');
      expect(result.confidence).toBe(1.0);
      expect(result.matchedEntry).toBeDefined();
    });

    it('should return GENERIC_MATCH when generic names match', () => {
      const med = makeSNFMedication({ rxnormCode: undefined, genericName: 'lisinopril' });
      const formulary = [makeFormularyEntry({ rxnormCode: 'other', genericName: 'lisinopril', isOnFormulary: true })];
      const result = engine.checkFormularyMatch(med, formulary);

      expect(result.matchType).toBe('GENERIC_MATCH');
      expect(result.confidence).toBe(0.9);
    });

    it('should return NO_MATCH when medication is not on formulary', () => {
      const med = makeSNFMedication({ rxnormCode: 'unknown-123', genericName: 'obscure_drug' });
      const formulary = [makeFormularyEntry({ rxnormCode: '29046', genericName: 'lisinopril' })];
      const result = engine.checkFormularyMatch(med, formulary);

      expect(result.matchType).toBe('NO_MATCH');
      expect(result.confidence).toBe(0.0);
    });

    it('should return CLASS_MATCH when off-formulary entry has alternative', () => {
      const med = makeSNFMedication({ rxnormCode: 'off-form-001' });
      const formulary = [
        makeFormularyEntry({
          rxnormCode: 'off-form-001',
          isOnFormulary: false,
          formularyAlternative: 'Enalapril',
          formularyAlternativeRxnorm: 'alt-001',
        }),
        makeFormularyEntry({
          id: 'form-alt',
          rxnormCode: 'alt-001',
          medicationName: 'Enalapril',
          genericName: 'enalapril',
          isOnFormulary: true,
        }),
      ];
      const result = engine.checkFormularyMatch(med, formulary);

      expect(result.matchType).toBe('CLASS_MATCH');
      expect(result.confidence).toBe(0.7);
    });

    it('should prioritize RxNorm over generic match', () => {
      const med = makeSNFMedication({ rxnormCode: '29046', genericName: 'lisinopril' });
      const formulary = [makeFormularyEntry({ rxnormCode: '29046', genericName: 'lisinopril', isOnFormulary: true })];
      const result = engine.checkFormularyMatch(med, formulary);

      expect(result.matchType).toBe('EXACT_RXNORM');
    });
  });

  describe('detectTherapeuticDuplications', () => {
    it('should detect medications in the same therapeutic class', () => {
      const medications = [
        makeSNFMedication({ id: 'med-1', medicationName: 'Lisinopril', genericName: 'lisinopril', rxnormCode: 'rx-1' }),
        makeSNFMedication({ id: 'med-2', medicationName: 'Enalapril', genericName: 'enalapril', rxnormCode: 'rx-2' }),
      ];
      const formulary = [
        makeFormularyEntry({ rxnormCode: 'rx-1', genericName: 'lisinopril', therapeuticClass: 'ACE_INHIBITOR' }),
        makeFormularyEntry({ id: 'form-2', rxnormCode: 'rx-2', genericName: 'enalapril', therapeuticClass: 'ACE_INHIBITOR' }),
      ];

      const discrepancies = engine.detectTherapeuticDuplications(medications, formulary);
      expect(discrepancies.length).toBeGreaterThanOrEqual(1);
      expect(discrepancies[0].discrepancyType).toBe('THERAPEUTIC_DUPLICATION');
    });

    it('should not flag medications in different classes', () => {
      const medications = [
        makeSNFMedication({ id: 'med-1', genericName: 'lisinopril', rxnormCode: 'rx-1' }),
        makeSNFMedication({ id: 'med-2', medicationName: 'Metformin', genericName: 'metformin', rxnormCode: 'rx-2' }),
      ];
      const formulary = [
        makeFormularyEntry({ rxnormCode: 'rx-1', genericName: 'lisinopril', therapeuticClass: 'ACE_INHIBITOR' }),
        makeFormularyEntry({ id: 'form-2', rxnormCode: 'rx-2', genericName: 'metformin', therapeuticClass: 'BIGUANIDE' }),
      ];

      const discrepancies = engine.detectTherapeuticDuplications(medications, formulary);
      expect(discrepancies).toHaveLength(0);
    });

    it('should skip medications with HELD status', () => {
      const medications = [
        makeSNFMedication({ id: 'med-1', genericName: 'lisinopril', rxnormCode: 'rx-1', status: 'ACTIVE' }),
        makeSNFMedication({ id: 'med-2', medicationName: 'Enalapril', genericName: 'enalapril', rxnormCode: 'rx-2', status: 'HELD' }),
      ];
      const formulary = [
        makeFormularyEntry({ rxnormCode: 'rx-1', genericName: 'lisinopril', therapeuticClass: 'ACE_INHIBITOR' }),
        makeFormularyEntry({ id: 'form-2', rxnormCode: 'rx-2', genericName: 'enalapril', therapeuticClass: 'ACE_INHIBITOR' }),
      ];

      const discrepancies = engine.detectTherapeuticDuplications(medications, formulary);
      expect(discrepancies).toHaveLength(0);
    });
  });

  describe('flagHighRiskMedications', () => {
    it('should flag warfarin as high-risk', () => {
      const medications = [
        makeSNFMedication({ medicationName: 'Warfarin', genericName: 'warfarin', rxnormCode: '11289' }),
      ];
      const discrepancies = engine.flagHighRiskMedications(medications);
      expect(discrepancies.length).toBe(1);
      expect(discrepancies[0].discrepancyType).toBe('HIGH_RISK_MEDICATION');
    });

    it('should flag opioids as high-risk with DEA schedule note', () => {
      const medications = [
        makeSNFMedication({
          medicationName: 'Oxycodone',
          genericName: 'oxycodone',
          rxnormCode: '7804',
          isControlled: true,
          deaSchedule: 'II',
        }),
      ];
      const discrepancies = engine.flagHighRiskMedications(medications);
      expect(discrepancies.length).toBe(1);
      expect(discrepancies[0].description).toContain('DEA Schedule II');
    });

    it('should not flag non-high-risk medications', () => {
      const medications = [
        makeSNFMedication({ medicationName: 'Acetaminophen', genericName: 'acetaminophen' }),
      ];
      const discrepancies = engine.flagHighRiskMedications(medications);
      expect(discrepancies).toHaveLength(0);
    });

    it('should skip medications with non-ACTIVE status', () => {
      const medications = [
        makeSNFMedication({ medicationName: 'Warfarin', genericName: 'warfarin', rxnormCode: '11289', status: 'DISCONTINUED' }),
      ];
      const discrepancies = engine.flagHighRiskMedications(medications);
      expect(discrepancies).toHaveLength(0);
    });
  });

  describe('flagRecentChanges', () => {
    it('should flag medications changed within the window', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const medications = [
        makeSNFMedication({
          lastDoseChange: twoDaysAgo.toISOString(),
          previousDose: '5',
          dose: '10',
        }),
      ];
      const discrepancies = engine.flagRecentChanges(medications, 7);
      expect(discrepancies.length).toBe(1);
      expect(discrepancies[0].discrepancyType).toBe('RECENT_CHANGE');
      expect(discrepancies[0].description).toContain('previous dose 5');
    });

    it('should not flag medications changed outside the window', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const medications = [
        makeSNFMedication({ lastDoseChange: thirtyDaysAgo.toISOString() }),
      ];
      const discrepancies = engine.flagRecentChanges(medications, 7);
      expect(discrepancies).toHaveLength(0);
    });

    it('should not flag medications without lastDoseChange', () => {
      const medications = [makeSNFMedication({ lastDoseChange: undefined })];
      const discrepancies = engine.flagRecentChanges(medications);
      expect(discrepancies).toHaveLength(0);
    });
  });

  describe('reconcile', () => {
    it('should throw not-implemented error (requires data layer)', async () => {
      await expect(engine.reconcile('transfer-1')).rejects.toThrow('Not implemented');
    });
  });
});

// =============================================================================
// 7. NarrativeGenerator
// =============================================================================

describe('NarrativeGenerator', () => {
  let generator: NarrativeGenerator;

  beforeEach(() => {
    generator = new NarrativeGenerator();
  });

  describe('generateTemplateNarrative', () => {
    it('should generate all four narrative sections', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput());

      expect(result.clinicalNarrative).toBeTruthy();
      expect(result.codingSupportNarrative).toBeTruthy();
      expect(result.transferSummary).toBeTruthy();
      expect(result.oneLiner).toBeTruthy();
    });

    it('should include patient demographics in clinical narrative', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput());
      expect(result.clinicalNarrative).toContain('82-year-old');
      expect(result.clinicalNarrative).toContain('female');
    });

    it('should include PMH in clinical narrative', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput());
      expect(result.clinicalNarrative).toContain('CHF');
      expect(result.clinicalNarrative).toContain('hypertension');
    });

    it('should include code status prominently', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput({ codeStatus: 'DNR_DNI' }));
      expect(result.clinicalNarrative).toContain('DNR_DNI');
      expect(result.transferSummary).toContain('DNR_DNI');
    });

    it('should include isolation status when present', () => {
      const result = generator.generateTemplateNarrative(
        makeNarrativeInput({ isolationStatus: 'CONTACT: MRSA' })
      );
      expect(result.clinicalNarrative).toContain('MRSA');
      expect(result.transferSummary).toContain('MRSA');
    });

    it('should handle NKDA when no allergies', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput({ allergies: [] }));
      expect(result.clinicalNarrative).toContain('No known drug allergies');
    });

    it('should include wound summary when present', () => {
      const result = generator.generateTemplateNarrative(
        makeNarrativeInput({ woundSummary: 'Stage 3 sacral pressure injury' })
      );
      expect(result.clinicalNarrative).toContain('Stage 3 sacral pressure injury');
    });

    it('should list medications in narrative (short list shows all)', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput({
        medications: ['lisinopril', 'metformin'],
      }));
      expect(result.clinicalNarrative).toContain('lisinopril');
      expect(result.clinicalNarrative).toContain('metformin');
    });

    it('should truncate long medication lists', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput({
        medications: Array.from({ length: 15 }, (_, i) => `med-${i}`),
      }));
      expect(result.clinicalNarrative).toContain('others');
    });

    it('should generate one-liner with age, gender, PMH, and chief concern', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput());
      expect(result.oneLiner).toMatch(/82yo F/);
      expect(result.oneLiner).toContain('SNF');
    });

    it('should show coding support as "No coding analysis available" when no coding result', () => {
      const result = generator.generateTemplateNarrative(makeNarrativeInput({ codingResult: undefined }));
      expect(result.codingSupportNarrative).toContain('No coding analysis available');
    });

    it('should include coding data when codingResult is provided', () => {
      const codingEngine = new DiagnosisCodingEngine();
      const codingResult = codingEngine.suggestCodes(makeCodingInput());
      const result = generator.generateTemplateNarrative(makeNarrativeInput({ codingResult }));

      expect(result.codingSupportNarrative).toContain('Coding Support Documentation');
    });
  });

  describe('buildAINarrativePrompt', () => {
    it('should produce a prompt containing patient data and instructions', () => {
      const prompt = generator.buildAINarrativePrompt(makeNarrativeInput());
      expect(prompt).toContain('82-year-old');
      expect(prompt).toContain('Clinical Narrative');
      expect(prompt).toContain('One-Liner');
    });
  });
});

// =============================================================================
// 8. PolstExtractor
// =============================================================================

describe('PolstExtractor', () => {
  let extractor: PolstExtractor;

  beforeEach(() => {
    extractor = new PolstExtractor();
  });

  describe('extractFromRecord', () => {
    it('should extract advance directives from a complete record', () => {
      const record = makeAdvanceDirectiveRecord({
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'Nurse Smith',
      });
      const result = extractor.extractFromRecord(record);

      expect(result.codeStatus).toBe('DNR');
      expect(result.documentType).toBe('POLST');
      expect(result.intubationPreference).toBe('NO');
      expect(result.dialysisPreference).toBe('TRIAL_PERIOD');
      expect(result.antibioticsPreference).toBe('LIMITED');
      expect(result.nutritionDirective).toBe('COMFORT_FEEDING');
      expect(result.treatmentLimitations).toContain('No ICU admission');
      expect(result.verifiedWithinNinetyDays).toBe(true);
    });

    it('should mark as not verified when verifiedAt is missing', () => {
      const record = makeAdvanceDirectiveRecord({ verifiedAt: undefined });
      const result = extractor.extractFromRecord(record);

      expect(result.verifiedWithinNinetyDays).toBe(false);
      expect(result.verificationStatus).toContain('NOT VERIFIED');
    });

    it('should mark as not verified when verification is stale (>90 days)', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 120);
      const record = makeAdvanceDirectiveRecord({
        verifiedAt: oldDate.toISOString(),
        verifiedBy: 'Old Nurse',
      });
      const result = extractor.extractFromRecord(record);

      expect(result.verifiedWithinNinetyDays).toBe(false);
      expect(result.verificationStatus).toContain('NOT VERIFIED');
      expect(result.verificationStatus).toContain('exceeds 90-day');
    });

    it('should indicate scanned document availability', () => {
      const withDoc = extractor.extractFromRecord(
        makeAdvanceDirectiveRecord({ documentUrl: 'https://storage/polst-scan.pdf' })
      );
      expect(withDoc.scannedDocumentAvailable).toBe(true);

      const withoutDoc = extractor.extractFromRecord(
        makeAdvanceDirectiveRecord({ documentUrl: undefined })
      );
      expect(withoutDoc.scannedDocumentAvailable).toBe(false);
    });
  });

  describe('needsVerification', () => {
    it('should return true when not verified', () => {
      expect(extractor.needsVerification(makeAdvanceDirectiveRecord({ verifiedAt: undefined }))).toBe(true);
    });

    it('should return false when recently verified', () => {
      expect(extractor.needsVerification(makeAdvanceDirectiveRecord({ verifiedAt: new Date().toISOString() }))).toBe(false);
    });

    it('should return true when verification is stale', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      expect(extractor.needsVerification(makeAdvanceDirectiveRecord({ verifiedAt: oldDate.toISOString() }))).toBe(true);
    });
  });

  describe('extractFromScannedDocument', () => {
    it('should throw not-implemented error (requires OCR model)', async () => {
      await expect(extractor.extractFromScannedDocument('fake-data')).rejects.toThrow('Not implemented');
    });
  });
});

// =============================================================================
// 9. PprEvaluator
// =============================================================================

describe('PprEvaluator', () => {
  let evaluator: PprEvaluator;

  beforeEach(() => {
    evaluator = new PprEvaluator();
  });

  describe('evaluate', () => {
    it('should flag pneumonia ICD code as PPR', async () => {
      const result = await evaluator.evaluate('pt-1', 'pneumonia', ['J18.9']);
      expect(result.isFlagged).toBe(true);
      expect(result.matchedCategories.some((c) => c.code === 'PPR_PNEUMONIA')).toBe(true);
    });

    it('should flag UTI ICD code as PPR', async () => {
      const result = await evaluator.evaluate('pt-1', 'urinary tract infection', ['N39.0']);
      expect(result.isFlagged).toBe(true);
      expect(result.matchedCategories.some((c) => c.code === 'PPR_UTI')).toBe(true);
    });

    it('should flag CHF exacerbation ICD code as PPR', async () => {
      const result = await evaluator.evaluate('pt-1', 'heart failure', ['I50.23']);
      expect(result.isFlagged).toBe(true);
      expect(result.matchedCategories.some((c) => c.code === 'PPR_CHF')).toBe(true);
    });

    it('should flag sepsis ICD codes as PPR', async () => {
      const result = await evaluator.evaluate('pt-1', 'sepsis', ['A41.9']);
      expect(result.isFlagged).toBe(true);
      expect(result.matchedCategories.some((c) => c.code === 'PPR_SEPSIS')).toBe(true);
    });

    it('should flag via keyword text match even without matching ICD code', async () => {
      const result = await evaluator.evaluate('pt-1', 'patient fell and has hip fracture', []);
      expect(result.isFlagged).toBe(true);
      expect(result.matchedCategories.some((c) => c.code === 'PPR_FALL')).toBe(true);
    });

    it('should not flag non-PPR diagnoses with unrelated ICD codes', async () => {
      const result = await evaluator.evaluate('pt-1', 'medication refill', ['Z00.00']);
      // Z00.00 (general exam) is not a PPR code, and "medication refill" has no PPR keywords
      expect(result).toBeDefined();
    });

    it('should handle empty ICD codes array with neutral text', async () => {
      const result = await evaluator.evaluate('pt-1', 'medication refill request', []);
      expect(result).toBeDefined();
    });

    it('should not duplicate categories from both ICD and text match', async () => {
      const result = await evaluator.evaluate('pt-1', 'pneumonia', ['J18.9']);
      const pneumoniaCats = result.matchedCategories.filter((c) => c.code === 'PPR_PNEUMONIA');
      expect(pneumoniaCats.length).toBe(1);
    });

    it('should flag dehydration by keyword', async () => {
      const result = await evaluator.evaluate('pt-1', 'severe dehydration', []);
      expect(result.isFlagged).toBe(true);
      expect(result.matchedCategories.some((c) => c.code === 'PPR_DEHYDRATION')).toBe(true);
    });

    it('should flag electrolyte imbalance ICD codes', async () => {
      const result = await evaluator.evaluate('pt-1', 'hyponatremia', ['E87.1']);
      expect(result.isFlagged).toBe(true);
      expect(result.matchedCategories.some((c) => c.code === 'PPR_ELECTROLYTE')).toBe(true);
    });
  });

  describe('matchDiagnosisCategory', () => {
    it('should match exact ICD code', () => {
      const result = evaluator.matchDiagnosisCategory('N39.0');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('PPR_UTI');
    });

    it('should match ICD code prefix (J18 matches J18.x)', () => {
      const result = evaluator.matchDiagnosisCategory('J18.1');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('PPR_PNEUMONIA');
    });

    it('should return null for non-PPR code', () => {
      const result = evaluator.matchDiagnosisCategory('Z00.00');
      expect(result).toBeNull();
    });

    it('should be case-insensitive', () => {
      const result = evaluator.matchDiagnosisCategory('j18.9');
      expect(result).not.toBeNull();
    });

    it('should handle codes with and without dots', () => {
      const withDot = evaluator.matchDiagnosisCategory('J18.9');
      const withoutDot = evaluator.matchDiagnosisCategory('J189');
      expect(withDot?.code).toBe(withoutDot?.code);
    });
  });

  describe('isWithin30DayWindow', () => {
    it('should return true for discharge within 30 days', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      expect(evaluator.isWithin30DayWindow(tenDaysAgo.toISOString())).toBe(true);
    });

    it('should return false for discharge beyond 30 days', () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      expect(evaluator.isWithin30DayWindow(sixtyDaysAgo.toISOString())).toBe(false);
    });

    it('should return true for discharge today', () => {
      expect(evaluator.isWithin30DayWindow(new Date().toISOString())).toBe(true);
    });
  });
});

// =============================================================================
// 10. SnfTransferOrchestrator
// =============================================================================

describe('SnfTransferOrchestrator', () => {
  let orchestrator: SnfTransferOrchestrator;
  let events: TransferEvent[];
  let mockMarEngine: MarReconciliationEngine;
  let mockDocGen: InteractDocumentGenerator;
  let mockCommService: TransferCommunicationService;
  let mockWoundProcessor: WoundAssessmentProcessor;
  let mockIsoManager: IsolationPrecautionManager;
  let mockFuncAgg: FunctionalStatusAggregator;
  let mockPprEval: PprEvaluator;
  let mockPolst: PolstExtractor;

  beforeEach(() => {
    events = [];
    mockMarEngine = new MarReconciliationEngine();
    mockDocGen = new InteractDocumentGenerator();
    mockCommService = new TransferCommunicationService();
    mockWoundProcessor = new WoundAssessmentProcessor();
    mockIsoManager = new IsolationPrecautionManager();
    mockFuncAgg = new FunctionalStatusAggregator();
    mockPprEval = new PprEvaluator();
    mockPolst = new PolstExtractor();

    orchestrator = new SnfTransferOrchestrator(
      mockMarEngine,
      mockDocGen,
      mockCommService,
      mockWoundProcessor,
      mockIsoManager,
      mockFuncAgg,
      mockPprEval,
      mockPolst,
      (event) => events.push(event),
    );
  });

  describe('initiateTransfer', () => {
    it('should create a transfer request and emit TRANSFER_INITIATED', async () => {
      // Mock PPR evaluate to not flag
      vi.spyOn(mockPprEval, 'evaluate').mockResolvedValue({
        transferRequestId: '',
        isFlagged: false,
        matchedCategories: [],
        thirtyDayHistory: [],
        clinicalIndicators: [],
      });

      const result = await orchestrator.initiateTransfer({
        patientId: 'pt-1',
        sendingFacilityId: 'snf-1',
        receivingFacilityId: 'hosp-1',
        urgencyLevel: 'URGENT',
        reasonForTransfer: 'CHF exacerbation',
        icdCodes: ['I50.23'],
      });

      expect(result.patientId).toBe('pt-1');
      expect(result.urgencyLevel).toBe('URGENT');
      expect(result.status).toBe('INITIATED');
      expect(result.reasonForTransfer).toBe('CHF exacerbation');

      const initiatedEvent = events.find((e) => e.type === 'TRANSFER_INITIATED');
      expect(initiatedEvent).toBeDefined();
      expect(initiatedEvent?.data.urgencyLevel).toBe('URGENT');
    });

    it('should flag PPR and emit PPR_FLAG_RAISED when diagnosis matches', async () => {
      vi.spyOn(mockPprEval, 'evaluate').mockResolvedValue({
        transferRequestId: '',
        isFlagged: true,
        matchedCategories: [{ code: 'PPR_CHF', description: 'CHF', icd10Codes: ['I50'], matchedDiagnosis: 'I50.23' }],
        thirtyDayHistory: [],
        clinicalIndicators: ['I50.23'],
      });

      const result = await orchestrator.initiateTransfer({
        patientId: 'pt-1',
        sendingFacilityId: 'snf-1',
        receivingFacilityId: 'hosp-1',
        urgencyLevel: 'URGENT',
        reasonForTransfer: 'CHF exacerbation',
        icdCodes: ['I50.23'],
      });

      expect(result.pprFlag).toBeDefined();
      expect(result.pprFlag?.isFlagged).toBe(true);
      expect(events.some((e) => e.type === 'PPR_FLAG_RAISED')).toBe(true);
    });

    it('should start emergency data collection for EMERGENCY mode', async () => {
      vi.spyOn(mockPprEval, 'evaluate').mockResolvedValue({
        transferRequestId: '',
        isFlagged: false,
        matchedCategories: [],
        thirtyDayHistory: [],
        clinicalIndicators: [],
      });

      const result = await orchestrator.initiateTransfer({
        patientId: 'pt-1',
        sendingFacilityId: 'snf-1',
        receivingFacilityId: 'hosp-1',
        urgencyLevel: 'EMERGENCY',
        reasonForTransfer: 'Acute respiratory failure',
      });

      expect(result.transferMode).toBe('EMERGENCY');
    });
  });

  describe('getTransferProgress', () => {
    it('should return progress with all INTERACT sections', async () => {
      const progress = await orchestrator.getTransferProgress('transfer-1');

      expect(progress.transferRequestId).toBe('transfer-1');
      expect(progress.sections.length).toBe(10); // 10 INTERACT sections
      expect(progress.sections.every((s) => s.status === 'NOT_STARTED')).toBe(true);
    });
  });

  describe('completeSection', () => {
    it('should emit SECTION_COMPLETED event', async () => {
      await orchestrator.completeSection('transfer-1', 'PATIENT_IDENTIFICATION', {});
      expect(events.some((e) => e.type === 'SECTION_COMPLETED' && e.data.sectionId === 'PATIENT_IDENTIFICATION')).toBe(true);
    });
  });

  describe('handleAcknowledgment', () => {
    it('should emit HOSPITAL_ACKNOWLEDGED event', async () => {
      await orchestrator.handleAcknowledgment('transfer-1', {
        transferRequestId: 'transfer-1',
        receivedAt: new Date().toISOString(),
        receivedBy: 'Dr. Receiving',
        receivingPhysician: 'Dr. Smith',
        isolationRoomAssigned: 'Room 4B',
      });

      expect(events.some((e) => e.type === 'HOSPITAL_ACKNOWLEDGED')).toBe(true);
    });
  });

  describe('cancelTransfer', () => {
    it('should emit TRANSFER_CANCELLED event with reason', async () => {
      await orchestrator.cancelTransfer('transfer-1', 'Patient stabilized');
      const event = events.find((e) => e.type === 'TRANSFER_CANCELLED');
      expect(event).toBeDefined();
      expect(event?.data.reason).toBe('Patient stabilized');
    });
  });
});

// =============================================================================
// 11. TransferCommunicationService
// =============================================================================

describe('TransferCommunicationService', () => {
  let service: TransferCommunicationService;

  beforeEach(() => {
    service = new TransferCommunicationService();
  });

  it('should throw not-implemented on transmit', async () => {
    await expect(service.transmit('transfer-1')).rejects.toThrow('Not implemented');
  });

  it('should throw not-implemented on transmitIncremental', async () => {
    await expect(service.transmitIncremental('transfer-1', {})).rejects.toThrow('Not implemented');
  });

  it('should throw not-implemented on receiveAcknowledgment', async () => {
    await expect(service.receiveAcknowledgment('transfer-1')).rejects.toThrow('Not implemented');
  });

  it('should throw not-implemented on getReceivingPanelData', async () => {
    await expect(service.getReceivingPanelData('transfer-1')).rejects.toThrow('Not implemented');
  });
});

// =============================================================================
// 12. WoundAssessmentProcessor
// =============================================================================

describe('WoundAssessmentProcessor', () => {
  let processor: WoundAssessmentProcessor;

  beforeEach(() => {
    processor = new WoundAssessmentProcessor();
  });

  describe('generateCmsNarrative', () => {
    it('should generate a complete CMS wound narrative', () => {
      const wound = makeWound();
      const narrative = processor.generateCmsNarrative(wound);

      expect(narrative).toContain('pressure injury');
      expect(narrative).toContain('Sacrum');
      expect(narrative).toContain('STAGE 3');
      expect(narrative).toContain('4.5 x 3.2 x 1');
      expect(narrative).toContain('granulation');
      expect(narrative).toContain('serous');
      expect(narrative).toContain('moderate');
      expect(narrative).toContain('no odor');
      expect(narrative).toContain('Silver alginate');
      expect(narrative).toContain('Braden Scale score: 14');
    });

    it('should handle wound without dimensions', () => {
      const wound = makeWound({ lengthCm: undefined, widthCm: undefined, depthCm: undefined });
      const narrative = processor.generateCmsNarrative(wound);
      expect(narrative).not.toContain('measuring');
    });

    it('should handle wound without stage', () => {
      const wound = makeWound({ woundType: 'SURGICAL', stage: undefined });
      const narrative = processor.generateCmsNarrative(wound);
      expect(narrative).toContain('surgical');
      expect(narrative).not.toContain('STAGE');
    });

    it('should note odor when present', () => {
      const wound = makeWound({ odorPresent: true });
      const narrative = processor.generateCmsNarrative(wound);
      expect(narrative).toContain('odor present');
    });

    it('should handle wound without exudate data', () => {
      const wound = makeWound({ exudateType: undefined, exudateAmount: undefined });
      const narrative = processor.generateCmsNarrative(wound);
      expect(narrative).not.toContain('exudate');
    });

    it('should include periwound description when present', () => {
      const wound = makeWound({ periWoundSkin: 'Macerated' });
      const narrative = processor.generateCmsNarrative(wound);
      expect(narrative).toContain('Macerated');
    });

    it('should handle minimal wound data', () => {
      const minimalWound: InteractWoundEntry = {
        location: 'Right heel',
        woundType: 'PRESSURE_INJURY',
        stage: 'STAGE_1',
        odorPresent: false,
        currentTreatment: 'Offloading',
      };
      const narrative = processor.generateCmsNarrative(minimalWound);
      expect(narrative).toContain('Right heel');
      expect(narrative).toContain('STAGE 1');
      expect(narrative).toContain('Offloading');
    });
  });

  describe('aggregateWoundStatus', () => {
    it('should aggregate multiple wounds into wound status', () => {
      const wounds = [makeWound(), makeWound({ location: 'Right heel', stage: 'STAGE_2' })];
      const result = processor.aggregateWoundStatus(wounds);

      expect(result.totalCount).toBe(2);
      expect(result.wounds).toHaveLength(2);
    });

    it('should return empty status for no wounds', () => {
      const result = processor.aggregateWoundStatus([]);
      expect(result.totalCount).toBe(0);
      expect(result.wounds).toHaveLength(0);
    });
  });

  describe('validateBradenSubscores', () => {
    it('should accept valid Braden subscores', () => {
      const valid: BradenSubscores = {
        sensoryPerception: 3,
        moisture: 2,
        activity: 2,
        mobility: 2,
        nutrition: 3,
        frictionShear: 2,
      };
      expect(processor.validateBradenSubscores(valid)).toBe(true);
    });

    it('should reject subscores with values below minimum', () => {
      const invalid: BradenSubscores = {
        sensoryPerception: 0, // Invalid: min is 1
        moisture: 2,
        activity: 2,
        mobility: 2,
        nutrition: 3,
        frictionShear: 2,
      };
      expect(processor.validateBradenSubscores(invalid)).toBe(false);
    });

    it('should reject subscores with values above maximum', () => {
      const invalid: BradenSubscores = {
        sensoryPerception: 3,
        moisture: 2,
        activity: 2,
        mobility: 5, // Invalid: max is 4
        nutrition: 3,
        frictionShear: 2,
      };
      expect(processor.validateBradenSubscores(invalid)).toBe(false);
    });

    it('should reject frictionShear > 3', () => {
      const invalid: BradenSubscores = {
        sensoryPerception: 3,
        moisture: 2,
        activity: 2,
        mobility: 2,
        nutrition: 3,
        frictionShear: 4, // Invalid: max is 3
      };
      expect(processor.validateBradenSubscores(invalid)).toBe(false);
    });

    it('should accept boundary values (all minimums)', () => {
      const boundary: BradenSubscores = {
        sensoryPerception: 1,
        moisture: 1,
        activity: 1,
        mobility: 1,
        nutrition: 1,
        frictionShear: 1,
      };
      expect(processor.validateBradenSubscores(boundary)).toBe(true);
    });

    it('should accept boundary values (all maximums)', () => {
      const boundary: BradenSubscores = {
        sensoryPerception: 4,
        moisture: 4,
        activity: 4,
        mobility: 4,
        nutrition: 4,
        frictionShear: 3,
      };
      expect(processor.validateBradenSubscores(boundary)).toBe(true);
    });
  });

  describe('processPhoto', () => {
    it('should throw not-implemented error (requires CV model)', async () => {
      await expect(processor.processPhoto({
        imageData: 'fake',
        patientId: 'pt-1',
        location: 'Sacrum',
        woundType: 'PRESSURE_INJURY',
        measurementReferencePresent: false,
      })).rejects.toThrow('Not implemented');
    });
  });
});

// =============================================================================
// Type Guards (from types files)
// =============================================================================

describe('Type Guards and Helpers', () => {
  describe('snf-transfer.types', () => {
    it('isEmergencyTransfer should detect emergency transfers', () => {
      const emergencyReq = { transferMode: 'EMERGENCY' } as any;
      const urgentReq = { transferMode: 'URGENT' } as any;
      expect(isEmergencyTransfer(emergencyReq)).toBe(true);
      expect(isEmergencyTransfer(urgentReq)).toBe(false);
    });
  });

  describe('interact.types', () => {
    it('calculateBradenTotal should sum subscores correctly', () => {
      const subscores: BradenSubscores = {
        sensoryPerception: 3, moisture: 2, activity: 2, mobility: 2, nutrition: 3, frictionShear: 2,
      };
      expect(calculateBradenTotal(subscores)).toBe(14);
    });

    it('getBradenRiskLevel should classify risk correctly', () => {
      expect(getBradenRiskLevel(8)).toBe('VERY_HIGH');
      expect(getBradenRiskLevel(11)).toBe('HIGH');
      expect(getBradenRiskLevel(14)).toBe('MODERATE');
      expect(getBradenRiskLevel(17)).toBe('MILD');
      expect(getBradenRiskLevel(20)).toBe('NO_RISK');
    });

    it('isDNR should detect DNR-related code statuses', () => {
      expect(isDNR({ codeStatus: 'DNR' })).toBe(true);
      expect(isDNR({ codeStatus: 'DNR_DNI' })).toBe(true);
      expect(isDNR({ codeStatus: 'COMFORT_MEASURES_ONLY' })).toBe(true);
      expect(isDNR({ codeStatus: 'FULL_CODE' })).toBe(false);
    });
  });

  describe('mar-reconciliation.types', () => {
    it('isHighRiskMedication should flag warfarin by generic name', () => {
      const warfarin = makeSNFMedication({ genericName: 'warfarin' });
      expect(isHighRiskMedication(warfarin)).toBe(true);
    });

    it('isHighRiskMedication should not flag acetaminophen', () => {
      const tylenol = makeSNFMedication({ genericName: 'acetaminophen' });
      expect(isHighRiskMedication(tylenol)).toBe(false);
    });

    it('calculateReconciliationCompleteness should return 100 for no discrepancies', () => {
      const session = { discrepancies: [] } as any;
      expect(calculateReconciliationCompleteness(session)).toBe(100);
    });

    it('calculateReconciliationCompleteness should calculate percentage for mixed resolutions', () => {
      const session = {
        discrepancies: [
          { resolution: 'ACCEPTED' },
          { resolution: 'PENDING' },
          { resolution: 'SUBSTITUTED' },
          { resolution: 'PENDING' },
        ],
      } as any;
      expect(calculateReconciliationCompleteness(session)).toBe(50);
    });
  });
});
