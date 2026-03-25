// =============================================================================
// ATTENDING AI - BioMistral Client
// apps/shared/lib/clinical-ai/BioMistralClient.ts
//
// AI client for clinical decision support using BioMistral model
// =============================================================================

import {
  ClinicalAIConfig, DEFAULT_CLINICAL_AI_CONFIG, ClinicalAIRequest, ClinicalAIResponse,
  PatientContext, ClinicalAssessment, ClinicalAIOptions,
  DifferentialDiagnosisResult, DifferentialDiagnosis, Diagnosis, RecommendedTest,
  TreatmentPlan, TreatmentRecommendation, MedicationRecommendation,
  ClinicalAIAuditEntry,
} from './types';
import { evaluateRedFlags, RedFlagEvaluation } from './redFlagDetection';

// =============================================================================
// BioMistral Client Class
// =============================================================================

export class BioMistralClient {
  private config: ClinicalAIConfig;
  private auditLog: ClinicalAIAuditEntry[] = [];

  constructor(config: Partial<ClinicalAIConfig> = {}) {
    this.config = { ...DEFAULT_CLINICAL_AI_CONFIG, ...config };
  }

  // ===========================================================================
  // Main Analysis Methods
  // ===========================================================================

  async analyzeCase(
    patientContext: PatientContext,
    assessment: ClinicalAssessment,
    options?: ClinicalAIOptions
  ): Promise<ClinicalAIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // First, evaluate red flags locally (fast, no API call needed)
      const redFlagEvaluation = evaluateRedFlags(patientContext, assessment);

      // If critical red flags, prioritize emergency response but still include full analysis
      if (redFlagEvaluation.overallSeverity === 'critical') {
        const response = await this.buildEmergencyResponse(
          requestId,
          redFlagEvaluation,
          patientContext,
          assessment,
          options,
          startTime
        );
        this.logAudit(requestId, 'comprehensive', patientContext, response, startTime);
        return response;
      }

      // Generate differential diagnosis
      const differentialDiagnosis = await this.generateDifferentialDiagnosis(
        patientContext,
        assessment,
        options
      );

      // Generate treatment plan for top diagnoses
      const treatmentPlan = await this.generateTreatmentPlan(
        patientContext,
        differentialDiagnosis.primaryDiagnoses[0]?.diagnosis.name || assessment.chiefComplaint.complaint,
        options
      );

      const response: ClinicalAIResponse = {
        requestId,
        redFlagEvaluation,
        differentialDiagnosis,
        treatmentPlan,
        clinicalSummary: this.generateClinicalSummary(redFlagEvaluation, differentialDiagnosis, treatmentPlan),
        disclaimer: this.getDisclaimer(),
        processingTime: Math.max(1, Date.now() - startTime),
        modelInfo: {
          name: this.config.model,
          version: '1.0.0',
          confidenceScore: this.calculateOverallConfidence(differentialDiagnosis),
        },
      };

      this.logAudit(requestId, 'comprehensive', patientContext, response, startTime);
      return response;

    } catch (error) {
      console.error('[BioMistralClient] Analysis failed:', error);
      throw error;
    }
  }

  async generateDifferentialDiagnosis(
    patientContext: PatientContext,
    assessment: ClinicalAssessment,
    options?: ClinicalAIOptions
  ): Promise<DifferentialDiagnosisResult> {
    const prompt = this.buildDifferentialPrompt(patientContext, assessment, options);
    
    try {
      // In production, this would call the BioMistral API
      // For now, we use clinical logic to generate differentials
      const differentials = this.generateDifferentialsFromLogic(patientContext, assessment, options);
      
      return {
        primaryDiagnoses: differentials.filter(d => d.diagnosis.probability >= 0.2),
        mustNotMissDiagnoses: differentials.filter(d => d.diagnosis.mustNotMiss),
        lessLikelyDiagnoses: differentials.filter(d => d.diagnosis.probability < 0.2 && !d.diagnosis.mustNotMiss),
        recommendedTests: this.generateRecommendedTests(differentials),
        clinicalNotes: this.generateClinicalNotes(patientContext, assessment, differentials),
        generatedAt: new Date().toISOString(),
        modelVersion: this.config.model,
      };
    } catch (error) {
      console.error('[BioMistralClient] Differential generation failed:', error);
      throw error;
    }
  }

  async generateTreatmentPlan(
    patientContext: PatientContext,
    diagnosis: string,
    options?: ClinicalAIOptions
  ): Promise<TreatmentPlan> {
    try {
      const recommendations = this.generateTreatmentRecommendations(patientContext, diagnosis, options);
      const contraindications = this.identifyContraindications(patientContext);
      
      return {
        forDiagnosis: diagnosis,
        recommendations,
        contraindications,
        patientSpecificConsiderations: this.getPatientConsiderations(patientContext),
        monitoringPlan: this.generateMonitoringPlan(diagnosis),
        followUpSchedule: this.determineFollowUp(diagnosis),
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[BioMistralClient] Treatment plan generation failed:', error);
      throw error;
    }
  }

  // ===========================================================================
  // Differential Diagnosis Logic
  // ===========================================================================

  private generateDifferentialsFromLogic(
    patientContext: PatientContext,
    assessment: ClinicalAssessment,
    options?: ClinicalAIOptions
  ): DifferentialDiagnosis[] {
    const differentials: DifferentialDiagnosis[] = [];
    const chiefComplaint = assessment.chiefComplaint.complaint.toLowerCase();
    const symptoms = assessment.symptoms.map(s => s.name.toLowerCase());
    const allSymptoms = [chiefComplaint, ...symptoms].join(' ');

    // Chest pain differentials
    if (allSymptoms.includes('chest pain') || allSymptoms.includes('chest discomfort')) {
      differentials.push(...this.getChestPainDifferentials(patientContext, assessment));
    }

    // Headache differentials
    if (allSymptoms.includes('headache') || allSymptoms.includes('head pain')) {
      differentials.push(...this.getHeadacheDifferentials(patientContext, assessment));
    }

    // Abdominal pain differentials
    if (allSymptoms.includes('abdominal pain') || allSymptoms.includes('stomach pain') || allSymptoms.includes('belly pain')) {
      differentials.push(...this.getAbdominalPainDifferentials(patientContext, assessment));
    }

    // Shortness of breath differentials
    if (allSymptoms.includes('shortness of breath') || allSymptoms.includes('dyspnea') || allSymptoms.includes('difficulty breathing')) {
      differentials.push(...this.getDyspneaDifferentials(patientContext, assessment));
    }

    // Back pain differentials
    if (allSymptoms.includes('back pain') || allSymptoms.includes('low back pain')) {
      differentials.push(...this.getBackPainDifferentials(patientContext, assessment));
    }

    // Fever differentials
    if (allSymptoms.includes('fever') || (patientContext.vitals?.temperature && patientContext.vitals.temperature >= 38)) {
      differentials.push(...this.getFeverDifferentials(patientContext, assessment));
    }

    // Sort by probability
    differentials.sort((a, b) => b.diagnosis.probability - a.diagnosis.probability);

    // Limit results
    const maxDiagnoses = options?.maxDiagnoses || 10;
    return differentials.slice(0, maxDiagnoses);
  }

  private getChestPainDifferentials(patientContext: PatientContext, assessment: ClinicalAssessment): DifferentialDiagnosis[] {
    const age = patientContext.demographics.age;
    const hasCardiacHistory = patientContext.medicalHistory?.conditions.some(c => 
      c.toLowerCase().includes('cad') || c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiac')
    );

    return [
      {
        diagnosis: { name: 'Acute Coronary Syndrome', icdCode: 'I21.9', probability: hasCardiacHistory || age > 50 ? 0.35 : 0.15, confidence: 'moderate', acuity: 'emergent', mustNotMiss: true },
        reasoning: { supportingFindings: ['Chest pain'], contradictingFindings: [], missingInformation: ['ECG', 'Troponin'] },
        recommendedWorkup: ['ECG', 'Troponin I/T', 'CXR', 'BMP'],
      },
      {
        diagnosis: { name: 'Pulmonary Embolism', icdCode: 'I26.99', probability: 0.15, confidence: 'moderate', acuity: 'emergent', mustNotMiss: true },
        reasoning: { supportingFindings: ['Chest pain'], contradictingFindings: [], missingInformation: ['D-dimer', 'Wells score'] },
        recommendedWorkup: ['D-dimer', 'CT-PA if indicated'],
      },
      {
        diagnosis: { name: 'Musculoskeletal Chest Pain', icdCode: 'R07.89', probability: 0.30, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Chest pain'], contradictingFindings: [] },
      },
      {
        diagnosis: { name: 'GERD', icdCode: 'K21.0', probability: 0.20, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Chest pain'], contradictingFindings: [] },
      },
      {
        diagnosis: { name: 'Anxiety/Panic Disorder', icdCode: 'F41.0', probability: 0.15, confidence: 'low', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Chest pain'], contradictingFindings: [] },
      },
    ];
  }

  private getHeadacheDifferentials(patientContext: PatientContext, assessment: ClinicalAssessment): DifferentialDiagnosis[] {
    const symptoms = assessment.symptoms.map(s => s.name.toLowerCase()).join(' ');
    const hasNeckStiffness = symptoms.includes('neck stiffness') || symptoms.includes('stiff neck');
    const hasFever = symptoms.includes('fever') || (patientContext.vitals?.temperature && patientContext.vitals.temperature >= 38);
    const isThunderclap = symptoms.includes('sudden') || symptoms.includes('worst headache');

    return [
      {
        diagnosis: { name: 'Tension Headache', icdCode: 'G44.2', probability: 0.40, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Headache'], contradictingFindings: [] },
      },
      {
        diagnosis: { name: 'Migraine', icdCode: 'G43.909', probability: 0.25, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Headache'], contradictingFindings: [] },
      },
      {
        diagnosis: { name: 'Subarachnoid Hemorrhage', icdCode: 'I60.9', probability: isThunderclap ? 0.25 : 0.05, confidence: 'moderate', acuity: 'emergent', mustNotMiss: true },
        reasoning: { supportingFindings: isThunderclap ? ['Sudden severe headache'] : ['Headache'], contradictingFindings: [], missingInformation: ['CT head', 'LP if CT negative'] },
        recommendedWorkup: ['CT head without contrast', 'LP if CT negative'],
      },
      {
        diagnosis: { name: 'Meningitis', icdCode: 'G03.9', probability: hasNeckStiffness && hasFever ? 0.30 : 0.05, confidence: 'moderate', acuity: 'emergent', mustNotMiss: true },
        reasoning: { supportingFindings: hasNeckStiffness ? ['Headache', 'Neck stiffness'] : ['Headache'], contradictingFindings: [] },
        recommendedWorkup: ['LP', 'Blood cultures', 'CBC'],
      },
    ];
  }

  private getAbdominalPainDifferentials(patientContext: PatientContext, assessment: ClinicalAssessment): DifferentialDiagnosis[] {
    const symptoms = assessment.symptoms.map(s => `${s.name} ${s.location || ''}`).join(' ').toLowerCase();
    const isRLQ = symptoms.includes('right lower') || symptoms.includes('rlq');
    const isRUQ = symptoms.includes('right upper') || symptoms.includes('ruq');
    const isEpigastric = symptoms.includes('epigastric') || symptoms.includes('upper middle');

    const differentials: DifferentialDiagnosis[] = [];

    if (isRLQ) {
      differentials.push({
        diagnosis: { name: 'Appendicitis', icdCode: 'K35.80', probability: 0.35, confidence: 'moderate', acuity: 'urgent', mustNotMiss: true },
        reasoning: { supportingFindings: ['RLQ pain'], contradictingFindings: [], missingInformation: ['CT abdomen'] },
        recommendedWorkup: ['CBC', 'CRP', 'CT abdomen/pelvis'],
      });
    }

    if (isRUQ) {
      differentials.push({
        diagnosis: { name: 'Cholecystitis', icdCode: 'K81.0', probability: 0.30, confidence: 'moderate', acuity: 'urgent' },
        reasoning: { supportingFindings: ['RUQ pain'], contradictingFindings: [] },
        recommendedWorkup: ['RUQ ultrasound', 'LFTs', 'Lipase'],
      });
    }

    differentials.push(
      {
        diagnosis: { name: 'Gastroenteritis', icdCode: 'K52.9', probability: 0.25, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Abdominal pain'], contradictingFindings: [] },
      },
      {
        diagnosis: { name: 'Constipation', icdCode: 'K59.00', probability: 0.20, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Abdominal pain'], contradictingFindings: [] },
      }
    );

    return differentials;
  }

  private getDyspneaDifferentials(patientContext: PatientContext, assessment: ClinicalAssessment): DifferentialDiagnosis[] {
    const hasAsthma = patientContext.medicalHistory?.conditions.some(c => c.toLowerCase().includes('asthma'));
    const hasCOPD = patientContext.medicalHistory?.conditions.some(c => c.toLowerCase().includes('copd'));
    const hasHF = patientContext.medicalHistory?.conditions.some(c => c.toLowerCase().includes('heart failure') || c.toLowerCase().includes('chf'));

    return [
      {
        diagnosis: { name: 'Asthma Exacerbation', icdCode: 'J45.901', probability: hasAsthma ? 0.40 : 0.15, confidence: 'moderate', acuity: 'urgent' },
        reasoning: { supportingFindings: ['Shortness of breath'], contradictingFindings: [] },
        recommendedWorkup: ['Peak flow', 'CXR', 'ABG if severe'],
      },
      {
        diagnosis: { name: 'COPD Exacerbation', icdCode: 'J44.1', probability: hasCOPD ? 0.40 : 0.10, confidence: 'moderate', acuity: 'urgent' },
        reasoning: { supportingFindings: ['Shortness of breath'], contradictingFindings: [] },
        recommendedWorkup: ['CXR', 'ABG', 'BMP'],
      },
      {
        diagnosis: { name: 'Heart Failure Exacerbation', icdCode: 'I50.9', probability: hasHF ? 0.35 : 0.15, confidence: 'moderate', acuity: 'urgent' },
        reasoning: { supportingFindings: ['Shortness of breath'], contradictingFindings: [] },
        recommendedWorkup: ['BNP', 'CXR', 'ECG', 'BMP'],
      },
      {
        diagnosis: { name: 'Pneumonia', icdCode: 'J18.9', probability: 0.20, confidence: 'moderate', acuity: 'urgent' },
        reasoning: { supportingFindings: ['Shortness of breath'], contradictingFindings: [] },
        recommendedWorkup: ['CXR', 'CBC', 'Procalcitonin'],
      },
      {
        diagnosis: { name: 'Pulmonary Embolism', icdCode: 'I26.99', probability: 0.10, confidence: 'moderate', acuity: 'emergent', mustNotMiss: true },
        reasoning: { supportingFindings: ['Shortness of breath'], contradictingFindings: [], missingInformation: ['D-dimer', 'Wells score'] },
        recommendedWorkup: ['D-dimer', 'CT-PA if indicated'],
      },
    ];
  }

  private getBackPainDifferentials(patientContext: PatientContext, assessment: ClinicalAssessment): DifferentialDiagnosis[] {
    const symptoms = assessment.symptoms.map(s => s.name.toLowerCase()).join(' ');
    const hasNeuroSymptoms = symptoms.includes('weakness') || symptoms.includes('numbness') || symptoms.includes('incontinence');

    return [
      {
        diagnosis: { name: 'Lumbar Strain', icdCode: 'S39.012A', probability: 0.45, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Back pain'], contradictingFindings: [] },
      },
      {
        diagnosis: { name: 'Lumbar Disc Herniation', icdCode: 'M51.16', probability: 0.25, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Back pain'], contradictingFindings: [] },
        recommendedWorkup: ['Consider MRI if persistent or neuro symptoms'],
      },
      {
        diagnosis: { name: 'Cauda Equina Syndrome', icdCode: 'G83.4', probability: hasNeuroSymptoms ? 0.15 : 0.02, confidence: 'moderate', acuity: 'emergent', mustNotMiss: true },
        reasoning: { supportingFindings: hasNeuroSymptoms ? ['Back pain', 'Neurological symptoms'] : ['Back pain'], contradictingFindings: [] },
        recommendedWorkup: ['Emergent MRI lumbar spine'],
      },
      {
        diagnosis: { name: 'Vertebral Compression Fracture', icdCode: 'M48.50', probability: patientContext.demographics.age > 65 ? 0.15 : 0.05, confidence: 'moderate', acuity: 'urgent' },
        reasoning: { supportingFindings: ['Back pain'], contradictingFindings: [] },
        recommendedWorkup: ['X-ray lumbar spine'],
      },
    ];
  }

  private getFeverDifferentials(patientContext: PatientContext, assessment: ClinicalAssessment): DifferentialDiagnosis[] {
    return [
      {
        diagnosis: { name: 'Viral Upper Respiratory Infection', icdCode: 'J06.9', probability: 0.40, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Fever'], contradictingFindings: [] },
      },
      {
        diagnosis: { name: 'Urinary Tract Infection', icdCode: 'N39.0', probability: 0.20, confidence: 'moderate', acuity: 'non_urgent' },
        reasoning: { supportingFindings: ['Fever'], contradictingFindings: [] },
        recommendedWorkup: ['Urinalysis', 'Urine culture'],
      },
      {
        diagnosis: { name: 'Pneumonia', icdCode: 'J18.9', probability: 0.15, confidence: 'moderate', acuity: 'urgent' },
        reasoning: { supportingFindings: ['Fever'], contradictingFindings: [] },
        recommendedWorkup: ['CXR', 'CBC'],
      },
      {
        diagnosis: { name: 'Sepsis', icdCode: 'A41.9', probability: 0.10, confidence: 'moderate', acuity: 'emergent', mustNotMiss: true },
        reasoning: { supportingFindings: ['Fever'], contradictingFindings: [], missingInformation: ['Lactate', 'Blood cultures'] },
        recommendedWorkup: ['Blood cultures', 'Lactate', 'CBC', 'BMP', 'Procalcitonin'],
      },
    ];
  }

  // ===========================================================================
  // Treatment Recommendations
  // ===========================================================================

  private generateTreatmentRecommendations(
    patientContext: PatientContext,
    diagnosis: string,
    options?: ClinicalAIOptions
  ): TreatmentRecommendation[] {
    const recommendations: TreatmentRecommendation[] = [];
    const diagnosisLower = diagnosis.toLowerCase();

    // Add generic supportive care
    recommendations.push({
      id: 'tr-supportive',
      category: 'lifestyle',
      name: 'Supportive Care',
      description: 'Rest, hydration, and symptomatic relief as needed',
      rationale: 'General supportive measures benefit most acute conditions',
      evidenceLevel: 'C',
      priority: 'recommended',
    });

    // Diagnosis-specific recommendations
    if (diagnosisLower.includes('pain')) {
      recommendations.push({
        id: 'tr-pain-acetaminophen',
        category: 'medication',
        name: 'Acetaminophen',
        description: 'First-line analgesic for mild to moderate pain',
        rationale: 'Safe and effective pain relief with minimal side effects',
        evidenceLevel: 'A',
        priority: 'recommended',
        medication: {
          name: 'Acetaminophen',
          genericName: 'acetaminophen',
          brandNames: ['Tylenol'],
          dose: '650-1000 mg',
          frequency: 'every 6 hours as needed',
          duration: 'as needed',
          route: 'oral',
          indication: 'Pain relief',
          contraindications: ['Severe hepatic impairment'],
          warnings: ['Do not exceed 3g/day, 2g/day if hepatic impairment'],
        },
      });

      if (!this.hasContraindication(patientContext, 'nsaids')) {
        recommendations.push({
          id: 'tr-pain-nsaid',
          category: 'medication',
          name: 'NSAID (Ibuprofen)',
          description: 'Anti-inflammatory analgesic',
          rationale: 'Effective for inflammatory pain conditions',
          evidenceLevel: 'A',
          priority: 'optional',
          medication: {
            name: 'Ibuprofen',
            genericName: 'ibuprofen',
            brandNames: ['Advil', 'Motrin'],
            dose: '400-600 mg',
            frequency: 'every 6-8 hours as needed',
            duration: '5-7 days',
            route: 'oral',
            indication: 'Pain and inflammation',
            contraindications: ['GI bleeding', 'Renal impairment', 'Active ulcer'],
            warnings: ['Take with food', 'Avoid in patients on anticoagulants'],
          },
        });
      }
    }

    if (diagnosisLower.includes('infection') || diagnosisLower.includes('uti')) {
      recommendations.push({
        id: 'tr-uti-antibiotic',
        category: 'medication',
        name: 'Antibiotic Therapy',
        description: 'Empiric antibiotic for uncomplicated UTI',
        rationale: 'Standard treatment for bacterial UTI',
        evidenceLevel: 'A',
        guidelineSource: 'IDSA Guidelines',
        priority: 'essential',
        medication: {
          name: 'Nitrofurantoin',
          genericName: 'nitrofurantoin',
          brandNames: ['Macrobid'],
          dose: '100 mg',
          frequency: 'twice daily',
          duration: '5 days',
          route: 'oral',
          indication: 'Uncomplicated UTI',
          contraindications: ['CrCl < 30', 'G6PD deficiency'],
        },
      });
    }

    // Follow-up recommendation
    recommendations.push({
      id: 'tr-followup',
      category: 'monitoring',
      name: 'Follow-up Visit',
      description: 'Schedule follow-up to assess response to treatment',
      rationale: 'Ensures appropriate clinical improvement and allows for treatment adjustment',
      evidenceLevel: 'C',
      priority: 'recommended',
      followUp: 'Return in 3-5 days if not improving, or sooner if worsening',
    });

    return recommendations;
  }

  private hasContraindication(patientContext: PatientContext, medicationType: string): boolean {
    const conditions = patientContext.medicalHistory?.conditions || [];
    const allergies = patientContext.allergies || [];

    if (medicationType === 'nsaids') {
      return conditions.some(c => 
        c.toLowerCase().includes('gi bleed') ||
        c.toLowerCase().includes('kidney') ||
        c.toLowerCase().includes('renal') ||
        c.toLowerCase().includes('ulcer')
      ) || allergies.some(a => a.allergen.toLowerCase().includes('nsaid') || a.allergen.toLowerCase().includes('ibuprofen'));
    }

    return false;
  }

  private identifyContraindications(patientContext: PatientContext): string[] {
    const contraindications: string[] = [];
    const conditions = patientContext.medicalHistory?.conditions || [];
    const medications = patientContext.currentMedications || [];

    if (conditions.some(c => c.toLowerCase().includes('renal'))) {
      contraindications.push('Renal impairment - avoid nephrotoxic medications, adjust renally-cleared drugs');
    }
    if (conditions.some(c => c.toLowerCase().includes('liver') || c.toLowerCase().includes('hepat'))) {
      contraindications.push('Hepatic impairment - reduce acetaminophen dose, avoid hepatotoxic medications');
    }
    if (medications.some(m => m.name.toLowerCase().includes('warfarin') || m.name.toLowerCase().includes('coumadin'))) {
      contraindications.push('On anticoagulation - avoid NSAIDs, monitor for drug interactions');
    }
    if (patientContext.demographics.pregnancyStatus === 'pregnant') {
      contraindications.push('Pregnancy - verify medication safety in pregnancy');
    }

    return contraindications;
  }

  private getPatientConsiderations(patientContext: PatientContext): string[] {
    const considerations: string[] = [];

    if (patientContext.demographics.age > 65) {
      considerations.push('Geriatric patient - consider reduced doses, increased fall risk, polypharmacy');
    }
    if (patientContext.demographics.age < 18) {
      considerations.push('Pediatric patient - use weight-based dosing, age-appropriate formulations');
    }
    if (patientContext.demographics.pregnancyStatus === 'pregnant') {
      considerations.push('Pregnant patient - verify medication safety, consider fetal effects');
    }
    if (patientContext.allergies && patientContext.allergies.length > 0) {
      considerations.push(`Known allergies: ${patientContext.allergies.map(a => a.allergen).join(', ')}`);
    }

    return considerations;
  }

  private generateMonitoringPlan(diagnosis: string): string[] {
    return [
      'Monitor for clinical improvement within 48-72 hours',
      'Watch for red flag symptoms requiring immediate evaluation',
      'Track medication side effects',
    ];
  }

  private determineFollowUp(diagnosis: string): string {
    return 'Follow up in 1-2 weeks, or sooner if symptoms worsen';
  }

  // ===========================================================================
  // Test Recommendations
  // ===========================================================================

  private generateRecommendedTests(differentials: DifferentialDiagnosis[]): RecommendedTest[] {
    const testsMap = new Map<string, RecommendedTest>();

    for (const diff of differentials) {
      const workup = diff.recommendedWorkup || [];
      for (const test of workup) {
        if (!testsMap.has(test)) {
          testsMap.set(test, {
            id: `test-${test.toLowerCase().replace(/\s+/g, '-')}`,
            name: test,
            category: this.categorizeTest(test),
            priority: diff.diagnosis.mustNotMiss ? 'stat' : 'routine',
            rationale: `To evaluate for ${diff.diagnosis.name}`,
            targetDiagnoses: [diff.diagnosis.name],
          });
        } else {
          const existing = testsMap.get(test)!;
          existing.targetDiagnoses.push(diff.diagnosis.name);
          if (diff.diagnosis.mustNotMiss) existing.priority = 'stat';
        }
      }
    }

    return Array.from(testsMap.values());
  }

  private categorizeTest(test: string): 'laboratory' | 'imaging' | 'procedure' | 'referral' {
    const testLower = test.toLowerCase();
    if (testLower.includes('ct') || testLower.includes('xray') || testLower.includes('x-ray') || 
        testLower.includes('mri') || testLower.includes('ultrasound')) {
      return 'imaging';
    }
    if (testLower.includes('lp') || testLower.includes('lumbar puncture') || testLower.includes('biopsy')) {
      return 'procedure';
    }
    if (testLower.includes('consult') || testLower.includes('referral')) {
      return 'referral';
    }
    return 'laboratory';
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private async buildEmergencyResponse(
    requestId: string,
    redFlagEvaluation: RedFlagEvaluation,
    patientContext: PatientContext,
    assessment: ClinicalAssessment,
    options: ClinicalAIOptions | undefined,
    startTime: number
  ): Promise<ClinicalAIResponse> {
    // Even for emergencies, provide differential diagnosis for completeness
    const differentialDiagnosis = await this.generateDifferentialDiagnosis(
      patientContext,
      assessment,
      options
    );

    return {
      requestId,
      redFlagEvaluation,
      differentialDiagnosis,
      clinicalSummary: `EMERGENCY: ${redFlagEvaluation.summary}. Immediate intervention required.`,
      disclaimer: this.getDisclaimer(),
      processingTime: Math.max(1, Date.now() - startTime),
      modelInfo: {
        name: this.config.model,
        version: '1.0.0',
        confidenceScore: 0.95,
      },
    };
  }

  private buildDifferentialPrompt(
    patientContext: PatientContext,
    assessment: ClinicalAssessment,
    options?: ClinicalAIOptions
  ): string {
    return `Generate differential diagnosis for:
Patient: ${patientContext.demographics.age} year old ${patientContext.demographics.sex}
Chief Complaint: ${assessment.chiefComplaint.complaint}
Symptoms: ${assessment.symptoms.map(s => s.name).join(', ')}
Medical History: ${patientContext.medicalHistory?.conditions.join(', ') || 'None provided'}
Vitals: ${JSON.stringify(patientContext.vitals || {})}`;
  }

  private generateClinicalNotes(
    patientContext: PatientContext,
    assessment: ClinicalAssessment,
    differentials: DifferentialDiagnosis[]
  ): string {
    const topDx = differentials[0]?.diagnosis.name || 'undetermined';
    return `Based on the presentation of ${assessment.chiefComplaint.complaint} in a ${patientContext.demographics.age} year old ${patientContext.demographics.sex}, the most likely diagnosis is ${topDx}. Recommend workup to confirm diagnosis and rule out serious conditions.`;
  }

  private generateClinicalSummary(
    redFlags: RedFlagEvaluation,
    differential: DifferentialDiagnosisResult,
    treatment: TreatmentPlan
  ): string {
    const parts: string[] = [];

    if (redFlags.hasRedFlags) {
      parts.push(`Red Flags: ${redFlags.summary}`);
    }

    if (differential.primaryDiagnoses.length > 0) {
      parts.push(`Most Likely: ${differential.primaryDiagnoses[0].diagnosis.name}`);
    }

    if (differential.mustNotMissDiagnoses.length > 0) {
      parts.push(`Must Not Miss: ${differential.mustNotMissDiagnoses.map(d => d.diagnosis.name).join(', ')}`);
    }

    return parts.join(' | ') || 'Clinical analysis complete.';
  }

  private calculateOverallConfidence(differential: DifferentialDiagnosisResult): number {
    if (differential.primaryDiagnoses.length === 0) return 0.5;
    return differential.primaryDiagnoses[0].diagnosis.probability;
  }

  private getDisclaimer(): string {
    return 'AI-generated clinical decision support. All recommendations should be verified by a licensed healthcare provider. This is not a substitute for clinical judgment.';
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logAudit(
    requestId: string,
    requestType: ClinicalAIRequest['requestType'],
    patientContext: PatientContext,
    response: ClinicalAIResponse,
    startTime: number
  ): void {
    if (!this.config.enableAuditLog) return;

    const entry: ClinicalAIAuditEntry = {
      id: `audit-${requestId}`,
      timestamp: new Date().toISOString(),
      requestId,
      userId: 'system', // Would be populated from auth context
      requestType,
      requestSummary: `Analysis for ${patientContext.demographics.age}yo ${patientContext.demographics.sex}`,
      responseReceived: true,
      processingTime: Date.now() - startTime,
      redFlagsDetected: response.redFlagEvaluation?.matches.length || 0,
      diagnosesGenerated: response.differentialDiagnosis?.primaryDiagnoses.length || 0,
    };

    this.auditLog.push(entry);
  }

  getAuditLog(): ClinicalAIAuditEntry[] {
    return [...this.auditLog];
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

let clientInstance: BioMistralClient | null = null;

export function getClinicalAIClient(config?: Partial<ClinicalAIConfig>): BioMistralClient {
  if (!clientInstance) {
    clientInstance = new BioMistralClient(config);
  }
  return clientInstance;
}

export function resetClinicalAIClient(): void {
  clientInstance = null;
}
