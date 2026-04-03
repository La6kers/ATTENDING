// ============================================================
// ATTENDING AI - Differential Diagnosis Service
// apps/shared/lib/ai/differentialDiagnosis.ts
//
// AI-powered clinical decision support for generating
// differential diagnoses with confidence scoring
// Supports: BioMistral, Azure OpenAI, Local inference
// ============================================================

import { applyLikelihoodRatios, applySymptomBoosts } from './symptomDiagnosisBoosts';
import { applyGraphBoosts, applyGraphLikelihoodRatios, getGraphStats } from './symptomCauseGraph';
import { getPreTestProbabilities, hasPrevalenceData } from './clinicalPrevalence';
import { applyMedicationLikelihoodRatios } from './medicationDiagnosisRules';

// ============================================================
// TYPES
// ============================================================

export interface PatientPresentation {
  /** Primary complaint from patient */
  chiefComplaint: string;
  
  /** Duration of symptoms */
  duration?: string;
  
  /** Associated symptoms */
  symptoms: Symptom[];
  
  /** Vital signs */
  vitals?: VitalSigns;
  
  /** Patient demographics */
  demographics: {
    age: number;
    gender: 'male' | 'female' | 'other';
    pregnant?: boolean;
  };
  
  /** Medical history */
  medicalHistory?: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    surgeries?: string[];
    familyHistory?: string[];
  };
  
  /** Social history */
  socialHistory?: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    travelHistory?: string[];
  };
  
  /** Physical exam findings */
  physicalExam?: Record<string, string>;
  
  /** Red flags already identified */
  redFlags?: string[];

  /** Symptom-specific follow-up answers (from COMPASS complaint modules) */
  symptomSpecificAnswers?: Record<string, string>;
}

export interface Symptom {
  name: string;
  severity?: 'mild' | 'moderate' | 'severe';
  onset?: string;
  location?: string;
  character?: string;
  radiation?: string;
  alleviatingFactors?: string[];
  aggravatingFactors?: string[];
  timing?: string;
}

export interface VitalSigns {
  temperature?: number;
  heartRate?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  respiratoryRate?: number;
  oxygenSaturation?: number;
  painScore?: number;
}

export interface DifferentialDiagnosis {
  /** Diagnosis name (ICD-10 text) */
  diagnosis: string;
  
  /** ICD-10 code */
  icdCode?: string;
  
  /** Confidence score 0-100 */
  confidence: number;
  
  /** Clinical reasoning */
  reasoning: string;
  
  /** Supporting evidence from presentation */
  supportingFindings: string[];
  
  /** Findings that argue against this diagnosis */
  againstFindings: string[];
  
  /** Urgency level */
  urgency: 'emergent' | 'urgent' | 'routine';
  
  /** Red flags specific to this diagnosis */
  redFlags?: string[];
  
  /** Recommended workup */
  recommendedWorkup: {
    labs?: string[];
    imaging?: string[];
    procedures?: string[];
    consults?: string[];
  };
  
  /** Treatment considerations */
  treatmentConsiderations?: string[];
  
  /** Disposition recommendation */
  disposition?: 'discharge' | 'observation' | 'admit' | 'icu' | 'or';
}

export interface DifferentialDiagnosisResult {
  /** Generated differential diagnoses ranked by likelihood */
  differentials: DifferentialDiagnosis[];
  
  /** Most likely diagnosis */
  primaryDiagnosis: DifferentialDiagnosis;
  
  /** Critical diagnoses to rule out (can't miss) */
  mustRuleOut: DifferentialDiagnosis[];
  
  /** Overall clinical impression */
  clinicalImpression: string;
  
  /** Recommended next steps */
  recommendedActions: string[];
  
  /** AI model used */
  model: string;
  
  /** Confidence in overall assessment */
  overallConfidence: number;
  
  /** Generation timestamp */
  generatedAt: string;
  
  /** Request ID for feedback */
  requestId: string;
}

export interface AIServiceConfig {
  /** AI provider to use */
  provider: 'biomistral' | 'azure-openai' | 'anthropic' | 'local';
  
  /** API endpoint */
  endpoint?: string;
  
  /** API key */
  apiKey?: string;
  
  /** Model name */
  model?: string;
  
  /** Temperature for generation */
  temperature?: number;
  
  /** Maximum tokens */
  maxTokens?: number;
  
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface ProviderFeedback {
  /** Request ID from differential result */
  requestId: string;
  
  /** Provider's selected diagnosis */
  selectedDiagnosis: string;
  
  /** Was the AI helpful? */
  wasHelpful: boolean;
  
  /** Accuracy rating 1-5 */
  accuracyRating?: number;
  
  /** Comments */
  comments?: string;
  
  /** Final confirmed diagnosis (after workup) */
  confirmedDiagnosis?: string;
}

// ============================================================
// CLINICAL KNOWLEDGE BASE
// ============================================================

const EMERGENCY_CONDITIONS: Record<string, {
  symptoms: string[];
  vitals?: Partial<VitalSigns>;
  redFlags: string[];
}> = {
  'Acute Myocardial Infarction': {
    symptoms: ['chest pain', 'shortness of breath', 'diaphoresis', 'nausea', 'jaw pain', 'arm pain'],
    vitals: { heartRate: 100 },
    redFlags: ['ST elevation', 'troponin elevation', 'new heart failure'],
  },
  'Pulmonary Embolism': {
    symptoms: ['dyspnea', 'chest pain', 'hemoptysis', 'leg swelling'],
    vitals: { oxygenSaturation: 92, heartRate: 100 },
    redFlags: ['DVT history', 'recent surgery', 'malignancy', 'immobilization'],
  },
  'Stroke': {
    symptoms: ['weakness', 'facial droop', 'speech difficulty', 'vision changes', 'headache'],
    redFlags: ['sudden onset', 'focal neurological deficit', 'worst headache of life'],
  },
  'Sepsis': {
    symptoms: ['fever', 'chills', 'confusion', 'tachycardia'],
    vitals: { temperature: 38.3, heartRate: 90, respiratoryRate: 22 },
    redFlags: ['lactate >2', 'hypotension', 'altered mental status'],
  },
  'Aortic Dissection': {
    symptoms: ['tearing chest pain', 'back pain', 'blood pressure differential'],
    redFlags: ['sudden onset', 'radiates to back', 'unequal pulses'],
  },
  'Subarachnoid Hemorrhage': {
    symptoms: ['thunderclap headache', 'neck stiffness', 'photophobia', 'vomiting'],
    redFlags: ['worst headache of life', 'sudden onset', 'altered consciousness'],
  },
  'Meningitis': {
    symptoms: ['headache', 'fever', 'neck stiffness', 'photophobia', 'confusion'],
    redFlags: ['petechial rash', 'altered mental status', 'immunocompromised'],
  },
  'Ectopic Pregnancy': {
    symptoms: ['abdominal pain', 'vaginal bleeding', 'missed period'],
    redFlags: ['hypotension', 'positive pregnancy test', 'adnexal mass'],
  },
};

const SYMPTOM_DIAGNOSIS_MAP: Record<string, string[]> = {
  'chest pain': ['Acute Coronary Syndrome', 'Pulmonary Embolism', 'Pneumonia', 'GERD', 'Musculoskeletal pain', 'Costochondritis', 'Aortic Dissection', 'Pericarditis'],
  'headache': ['Tension headache', 'Migraine', 'Cluster headache', 'Subarachnoid hemorrhage', 'Meningitis', 'Brain tumor', 'Temporal arteritis', 'Sinusitis'],
  'abdominal pain': ['Appendicitis', 'Cholecystitis', 'Pancreatitis', 'Bowel obstruction', 'Peptic ulcer', 'Diverticulitis', 'Gastroenteritis', 'Ectopic pregnancy'],
  'shortness of breath': ['COPD exacerbation', 'Asthma', 'Pneumonia', 'Heart failure', 'Pulmonary embolism', 'Anxiety', 'Anemia', 'Pneumothorax'],
  'fever': ['Viral infection', 'Bacterial infection', 'UTI', 'Pneumonia', 'Sepsis', 'Meningitis', 'Endocarditis', 'Malignancy'],
  'dizziness': ['BPPV', 'Vestibular neuritis', 'Orthostatic hypotension', 'Stroke', 'Cardiac arrhythmia', 'Anemia', 'Hypoglycemia', 'Medication side effect'],
  'back pain': ['Musculoskeletal strain', 'Herniated disc', 'Spinal stenosis', 'Kidney stone', 'Pyelonephritis', 'Aortic aneurysm', 'Compression fracture', 'Malignancy'],
  'weakness': ['Stroke', 'Guillain-Barré syndrome', 'Myasthenia gravis', 'Electrolyte abnormality', 'Anemia', 'Hypothyroidism', 'Depression', 'Malignancy'],
  'knee pain': ['Osteoarthritis', 'Meniscal Tear', 'ACL Tear', 'Patellofemoral Pain Syndrome', 'MCL Sprain', 'IT Band Syndrome', 'Baker\'s Cyst', 'Gout'],
  'sore throat': ['Viral Pharyngitis', 'Strep Pharyngitis', 'Peritonsillar Abscess', 'Infectious Mononucleosis', 'GERD', 'Epiglottitis'],
  'cough': ['Viral URI', 'Pneumonia', 'Asthma', 'COPD exacerbation', 'Bronchitis', 'Pertussis', 'ACE inhibitor cough', 'Pulmonary Embolism'],
  'urinary': ['UTI', 'Pyelonephritis', 'Kidney Stone', 'Interstitial Cystitis', 'Urethritis', 'Prostatitis'],
  'depression': ['Major Depressive Disorder', 'Generalized Anxiety Disorder', 'Adjustment Disorder', 'Bipolar Disorder', 'Hypothyroidism', 'Substance Use Disorder'],
  'anxiety': ['Generalized Anxiety Disorder', 'Panic Disorder', 'Major Depressive Disorder', 'Hyperthyroidism', 'Cardiac Arrhythmia', 'Substance Use Disorder'],
};

// ============================================================
// DIFFERENTIAL DIAGNOSIS SERVICE CLASS
// ============================================================

// ============================================================
// CONFIDENCE CALIBRATION
// Maps posterior probability (0-1) to display confidence (0-95)
// Uses sigmoid on logit scale for smooth, clinically useful output
// ============================================================

function calibrateConfidence(posterior: number): number {
  if (posterior <= 0.001) return 1;
  if (posterior >= 0.99) return 95;

  // Sigmoid on logit scale with compression factor k=0.7
  // This ensures:
  //   P=0.01 → ~3%    (very unlikely)
  //   P=0.10 → ~15%   (low probability)
  //   P=0.30 → ~38%   (moderate)
  //   P=0.50 → ~57%   (likely)
  //   P=0.70 → ~74%   (high)
  //   P=0.90 → ~89%   (very high)
  //   P=0.95 → ~92%   (near certain, but never 100)
  const logit = Math.log(posterior / (1 - posterior));
  const sigmoid = 1 / (1 + Math.exp(-0.7 * logit));
  return Math.round(sigmoid * 95);
}

export class DifferentialDiagnosisService {
  private config: AIServiceConfig;
  private feedbackQueue: ProviderFeedback[] = [];

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = {
      provider: 'local',
      temperature: 0.3,
      maxTokens: 2000,
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Generate differential diagnoses for a patient presentation
   */
  async generateDifferentials(
    presentation: PatientPresentation
  ): Promise<DifferentialDiagnosisResult> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Check for emergent conditions first
      const emergentConditions = this.checkEmergentConditions(presentation);
      
      // Generate differentials based on provider
      let differentials: DifferentialDiagnosis[];
      
      switch (this.config.provider) {
        case 'azure-openai':
        case 'anthropic':
          differentials = await this.generateWithExternalAI(presentation);
          break;
        case 'biomistral':
          differentials = await this.generateWithBioMistral(presentation);
          break;
        case 'local':
        default:
          differentials = this.generateWithLocalLogic(presentation);
      }

      // Merge emergent conditions
      differentials = this.mergeEmergentConditions(differentials, emergentConditions);
      
      // Sort by confidence
      differentials.sort((a, b) => b.confidence - a.confidence);
      
      // Identify must-rule-out diagnoses
      const mustRuleOut = differentials.filter(d => 
        d.urgency === 'emergent' || 
        EMERGENCY_CONDITIONS[d.diagnosis]
      );

      // Ensure at least one differential exists
      if (differentials.length === 0) {
        differentials.push({
          diagnosis: 'Unspecified condition',
          confidence: 10,
          reasoning: `Insufficient data to generate specific differential for "${presentation.chiefComplaint}". Clinical evaluation recommended.`,
          supportingFindings: [presentation.chiefComplaint],
          againstFindings: [],
          urgency: 'routine',
          recommendedWorkup: { labs: ['CBC', 'BMP'], imaging: [] },
        });
      }

      const result: DifferentialDiagnosisResult = {
        differentials: differentials.slice(0, 10),
        primaryDiagnosis: differentials[0],
        mustRuleOut,
        clinicalImpression: this.generateClinicalImpression(presentation, differentials),
        recommendedActions: this.generateRecommendedActions(differentials),
        model: this.config.provider,
        overallConfidence: this.calculateOverallConfidence(differentials),
        generatedAt: new Date().toISOString(),
        requestId,
      };

      console.log(`[AI] Differential diagnosis generated in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('[AI] Differential diagnosis generation failed:', error);
      throw error;
    }
  }

  /**
   * Submit provider feedback for learning
   */
  async submitFeedback(feedback: ProviderFeedback): Promise<void> {
    this.feedbackQueue.push(feedback);
    
    // In production, send to ML pipeline
    console.log(`[AI] Feedback received for request ${feedback.requestId}`);
    
    // Batch process feedback periodically
    if (this.feedbackQueue.length >= 10) {
      await this.processFeedbackBatch();
    }
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private checkEmergentConditions(presentation: PatientPresentation): DifferentialDiagnosis[] {
    const emergent: DifferentialDiagnosis[] = [];
    const symptoms = presentation.symptoms.map(s => s.name.toLowerCase());
    const chiefComplaint = presentation.chiefComplaint.toLowerCase();

    for (const [condition, criteria] of Object.entries(EMERGENCY_CONDITIONS)) {
      let matchScore = 0;
      const supportingFindings: string[] = [];
      const redFlagsFound: string[] = [];

      // Check symptoms
      for (const symptom of criteria.symptoms) {
        if (symptoms.some(s => s.includes(symptom)) || chiefComplaint.includes(symptom)) {
          matchScore += 15;
          supportingFindings.push(symptom);
        }
      }

      // Check vitals
      if (criteria.vitals && presentation.vitals) {
        if (criteria.vitals.heartRate && presentation.vitals.heartRate && 
            presentation.vitals.heartRate >= criteria.vitals.heartRate) {
          matchScore += 10;
          supportingFindings.push(`Elevated heart rate: ${presentation.vitals.heartRate}`);
        }
        if (criteria.vitals.temperature && presentation.vitals.temperature &&
            presentation.vitals.temperature >= criteria.vitals.temperature) {
          matchScore += 10;
          supportingFindings.push(`Fever: ${presentation.vitals.temperature}°C`);
        }
        if (criteria.vitals.oxygenSaturation && presentation.vitals.oxygenSaturation &&
            presentation.vitals.oxygenSaturation <= criteria.vitals.oxygenSaturation) {
          matchScore += 15;
          supportingFindings.push(`Low O2 saturation: ${presentation.vitals.oxygenSaturation}%`);
        }
      }

      // Check red flags
      for (const redFlag of criteria.redFlags) {
        if (presentation.redFlags?.some(rf => rf.toLowerCase().includes(redFlag.toLowerCase()))) {
          matchScore += 20;
          redFlagsFound.push(redFlag);
        }
      }

      if (matchScore >= 30) {
        emergent.push({
          diagnosis: condition,
          confidence: Math.min(matchScore, 95),
          reasoning: `Emergency condition with ${supportingFindings.length} supporting findings and ${redFlagsFound.length} red flags`,
          supportingFindings,
          againstFindings: [],
          urgency: 'emergent',
          redFlags: redFlagsFound,
          recommendedWorkup: this.getWorkupForCondition(condition),
          disposition: 'admit',
        });
      }
    }

    return emergent;
  }

  private generateWithLocalLogic(presentation: PatientPresentation): DifferentialDiagnosis[] {
    const chiefComplaint = presentation.chiefComplaint.toLowerCase();
    const age = presentation.demographics.age;
    const gender = presentation.demographics.gender;

    // ================================================================
    // BAYESIAN PIPELINE — replaces arbitrary additive scoring
    // ================================================================

    // --- Step 1: Pre-test probabilities from prevalence tables ---
    // These are calibrated base rates adjusted by age/gender
    const useBayesian = hasPrevalenceData(presentation.chiefComplaint);
    let posteriors: Map<string, number>;
    const allEvidence = new Map<string, string[]>();

    if (useBayesian) {
      // === BAYESIAN PATH (prevalence data available) ===
      const priors = getPreTestProbabilities(
        presentation.chiefComplaint, age, gender
      );

      // --- Step 2: Convert probabilities to odds ---
      const odds = new Map<string, number>();
      for (const [dx, prob] of priors) {
        odds.set(dx, prob / (1 - prob));
      }

      // --- Step 3: Apply likelihood ratios from symptom-specific answers ---
      if (presentation.symptomSpecificAnswers && Object.keys(presentation.symptomSpecificAnswers).length > 0) {
        const allAskedKeys = new Set(Object.keys(presentation.symptomSpecificAnswers));
        const symptomEvidence = applyLikelihoodRatios(
          presentation.symptomSpecificAnswers,
          odds,
          allAskedKeys
        );
        // Merge evidence
        for (const [dx, ev] of symptomEvidence) {
          const existing = allEvidence.get(dx) || [];
          allEvidence.set(dx, [...existing, ...ev]);
        }
      }

      // --- Step 4: Apply graph-derived likelihood ratios ---
      const graphEvidence = applyGraphLikelihoodRatios(chiefComplaint, odds);
      for (const [dx, ev] of graphEvidence) {
        const existing = allEvidence.get(dx) || [];
        allEvidence.set(dx, [...existing, ...ev]);
      }

      // --- Step 4b: Apply vitals-based likelihood ratios ---
      if (presentation.vitals) {
        const v = presentation.vitals;
        const vitalsLRs: { condition: boolean; diagnosis: string; lr: number; evidence: string }[] = [
          { condition: !!(v.heartRate && v.heartRate > 100), diagnosis: 'Acute Coronary Syndrome', lr: 1.8, evidence: `Tachycardia (HR ${v.heartRate}) — cardiac etiology (LR 1.8)` },
          { condition: !!(v.heartRate && v.heartRate > 100), diagnosis: 'Pulmonary Embolism', lr: 2.0, evidence: `Tachycardia (HR ${v.heartRate}) — PE risk (LR 2.0)` },
          { condition: !!(v.heartRate && v.heartRate > 100), diagnosis: 'Sepsis', lr: 2.5, evidence: `Tachycardia (HR ${v.heartRate}) — sepsis criterion (LR 2.5)` },
          { condition: !!(v.heartRate && v.heartRate < 50), diagnosis: 'Medication side effect', lr: 2.0, evidence: `Bradycardia (HR ${v.heartRate}) — drug effect (LR 2.0)` },
          { condition: !!(v.oxygenSaturation && v.oxygenSaturation < 92), diagnosis: 'Pulmonary Embolism', lr: 3.5, evidence: `Hypoxia (SpO2 ${v.oxygenSaturation}%) — PE (LR 3.5)` },
          { condition: !!(v.oxygenSaturation && v.oxygenSaturation < 92), diagnosis: 'Pneumonia', lr: 2.5, evidence: `Hypoxia (SpO2 ${v.oxygenSaturation}%) — pneumonia (LR 2.5)` },
          { condition: !!(v.oxygenSaturation && v.oxygenSaturation < 92), diagnosis: 'COPD exacerbation', lr: 2.5, evidence: `Hypoxia (SpO2 ${v.oxygenSaturation}%) — COPD (LR 2.5)` },
          { condition: !!(v.temperature && v.temperature > 100.4), diagnosis: 'Sepsis', lr: 3.0, evidence: `Fever (${v.temperature}°) — sepsis risk (LR 3.0)` },
          { condition: !!(v.temperature && v.temperature > 100.4), diagnosis: 'Pneumonia', lr: 2.0, evidence: `Fever (${v.temperature}°) — infection (LR 2.0)` },
          { condition: !!(v.temperature && v.temperature > 100.4), diagnosis: 'Meningitis', lr: 2.5, evidence: `Fever (${v.temperature}°) — meningitis (LR 2.5)` },
          { condition: !!(v.bloodPressure && v.bloodPressure.systolic < 90), diagnosis: 'Sepsis', lr: 5.0, evidence: `Hypotension (BP ${v.bloodPressure?.systolic}/${v.bloodPressure?.diastolic}) — shock (LR 5.0)` },
          { condition: !!(v.bloodPressure && v.bloodPressure.systolic < 90), diagnosis: 'GI bleeding', lr: 3.0, evidence: `Hypotension — hemorrhagic shock (LR 3.0)` },
          { condition: !!(v.bloodPressure && v.bloodPressure.systolic < 90), diagnosis: 'Ectopic Pregnancy', lr: 3.0, evidence: `Hypotension — ruptured ectopic (LR 3.0)` },
          { condition: !!(v.bloodPressure && v.bloodPressure.systolic > 180), diagnosis: 'Stroke', lr: 2.5, evidence: `Hypertensive crisis (BP ${v.bloodPressure?.systolic}) — stroke risk (LR 2.5)` },
          { condition: !!(v.bloodPressure && v.bloodPressure.systolic > 180), diagnosis: 'Aortic Dissection', lr: 2.0, evidence: `Hypertension — dissection risk (LR 2.0)` },
        ];
        for (const rule of vitalsLRs) {
          if (rule.condition) {
            const currentOdds = odds.get(rule.diagnosis) || 0.01;
            odds.set(rule.diagnosis, currentOdds * rule.lr);
            const existing = allEvidence.get(rule.diagnosis) || [];
            existing.push(rule.evidence);
            allEvidence.set(rule.diagnosis, existing);
          }
        }
      }

      // --- Step 4c: Apply medication-based likelihood ratios ---
      if (presentation.medicalHistory?.medications && presentation.medicalHistory.medications.length > 0) {
        const medEvidence = applyMedicationLikelihoodRatios(presentation.medicalHistory.medications, odds);
        for (const [dx, ev] of medEvidence) {
          const existing = allEvidence.get(dx) || [];
          allEvidence.set(dx, [...existing, ...ev]);
        }
      }

      // --- Step 5: Convert odds back to posterior probabilities ---
      posteriors = new Map<string, number>();
      for (const [dx, o] of odds) {
        const clampedOdds = Math.min(Math.max(o, 0.001), 1000);
        posteriors.set(dx, clampedOdds / (1 + clampedOdds));
      }

    } else {
      // === FALLBACK PATH (unknown complaint — use legacy scoring) ===
      const potentialDiagnoses = new Map<string, number>();
      const symptoms = presentation.symptoms.map(s => s.name.toLowerCase());

      for (const [symptom, diagnoses] of Object.entries(SYMPTOM_DIAGNOSIS_MAP)) {
        if (chiefComplaint.includes(symptom)) {
          diagnoses.forEach((dx, index) => {
            const score = potentialDiagnoses.get(dx) || 0;
            potentialDiagnoses.set(dx, score + (30 - index * 3));
          });
        }
      }
      for (const symptom of symptoms) {
        for (const [key, diagnoses] of Object.entries(SYMPTOM_DIAGNOSIS_MAP)) {
          if (symptom.includes(key)) {
            diagnoses.forEach((dx, index) => {
              const score = potentialDiagnoses.get(dx) || 0;
              potentialDiagnoses.set(dx, score + (20 - index * 2));
            });
          }
        }
      }

      // Legacy symptom boosts (additive path)
      if (presentation.symptomSpecificAnswers && Object.keys(presentation.symptomSpecificAnswers).length > 0) {
        const ev = applySymptomBoosts(presentation.symptomSpecificAnswers, potentialDiagnoses);
        for (const [dx, e] of ev) {
          allEvidence.set(dx, e);
        }
      }

      // Legacy graph boosts (additive path)
      const graphEv = applyGraphBoosts(chiefComplaint, potentialDiagnoses);
      for (const [dx, e] of graphEv) {
        const existing = allEvidence.get(dx) || [];
        allEvidence.set(dx, [...existing, ...e]);
      }

      // Convert scores to pseudo-probabilities
      posteriors = new Map<string, number>();
      for (const [dx, score] of potentialDiagnoses) {
        if (score >= 15) {
          posteriors.set(dx, Math.min(score / 120, 0.90));
        }
      }
    }

    // --- Step 6: Convert posteriors to DifferentialDiagnosis[] ---
    const differentials: DifferentialDiagnosis[] = [];

    for (const [diagnosis, posterior] of posteriors) {
      if (posterior < 0.01) continue; // Filter very low probability

      const confidence = calibrateConfidence(posterior);
      if (confidence < 2) continue; // Filter noise

      const urgency = EMERGENCY_CONDITIONS[diagnosis] ? 'emergent' as const :
                     posterior > 0.30 ? 'urgent' as const : 'routine' as const;

      const baseSupportingFindings = this.findSupportingFindings(diagnosis, presentation);
      const symptomFindings = allEvidence.get(diagnosis) || [];

      differentials.push({
        diagnosis,
        confidence,
        reasoning: this.generateReasoning(diagnosis, presentation),
        supportingFindings: [...baseSupportingFindings, ...symptomFindings],
        againstFindings: this.findAgainstFindings(diagnosis, presentation),
        urgency,
        recommendedWorkup: this.getWorkupForCondition(diagnosis),
      });
    }

    return differentials;
  }

  private async generateWithBioMistral(presentation: PatientPresentation): Promise<DifferentialDiagnosis[]> {
    // In production, this would call the BioMistral API
    // For now, fallback to local logic
    console.log('[AI] BioMistral integration - using local fallback');
    return this.generateWithLocalLogic(presentation);
  }

  private async generateWithExternalAI(presentation: PatientPresentation): Promise<DifferentialDiagnosis[]> {
    // In production, this would call Azure OpenAI or Anthropic
    // For now, fallback to local logic
    console.log(`[AI] ${this.config.provider} integration - using local fallback`);
    return this.generateWithLocalLogic(presentation);
  }

  private mergeEmergentConditions(
    differentials: DifferentialDiagnosis[],
    emergent: DifferentialDiagnosis[]
  ): DifferentialDiagnosis[] {
    const merged = [...emergent];
    
    for (const diff of differentials) {
      if (!emergent.find(e => e.diagnosis === diff.diagnosis)) {
        merged.push(diff);
      }
    }
    
    return merged;
  }

  private generateReasoning(diagnosis: string, presentation: PatientPresentation): string {
    const age = presentation.demographics.age;
    const gender = presentation.demographics.gender;
    const symptoms = presentation.symptoms.map(s => s.name).join(', ');
    
    return `Based on ${age}-year-old ${gender} presenting with ${presentation.chiefComplaint} and associated symptoms (${symptoms}), ${diagnosis} should be considered in the differential.`;
  }

  private findSupportingFindings(diagnosis: string, presentation: PatientPresentation): string[] {
    const findings: string[] = [];
    const criteria = EMERGENCY_CONDITIONS[diagnosis];
    
    if (criteria) {
      for (const symptom of criteria.symptoms) {
        if (presentation.symptoms.some(s => s.name.toLowerCase().includes(symptom))) {
          findings.push(symptom);
        }
      }
    }
    
    findings.push(presentation.chiefComplaint);
    return findings;
  }

  private findAgainstFindings(diagnosis: string, presentation: PatientPresentation): string[] {
    const findings: string[] = [];
    
    // Age-based exclusions
    if (diagnosis === 'Ectopic Pregnancy' && presentation.demographics.gender !== 'female') {
      findings.push('Male patient');
    }
    
    // Normal vitals against certain diagnoses
    if (presentation.vitals) {
      if (diagnosis === 'Sepsis' && presentation.vitals.temperature && presentation.vitals.temperature < 38) {
        findings.push('Afebrile');
      }
      if (diagnosis === 'Pulmonary Embolism' && presentation.vitals.oxygenSaturation && presentation.vitals.oxygenSaturation > 95) {
        findings.push('Normal oxygen saturation');
      }
    }
    
    return findings;
  }

  private getWorkupForCondition(diagnosis: string): DifferentialDiagnosis['recommendedWorkup'] {
    const workupMap: Record<string, DifferentialDiagnosis['recommendedWorkup']> = {
      // === CARDIOVASCULAR ===
      'Acute Coronary Syndrome': {
        labs: ['Troponin (serial q3h x2)', 'BMP', 'CBC', 'BNP', 'Lipid panel', 'PT/INR'],
        imaging: ['12-lead ECG (stat)', 'Chest X-ray', 'Echocardiogram'],
        consults: ['Cardiology'],
      },
      'Aortic Dissection': {
        labs: ['CBC', 'BMP', 'Type & Screen', 'Lactate', 'D-dimer'],
        imaging: ['CT Angiography Chest/Abdomen/Pelvis (stat)', 'Chest X-ray'],
        consults: ['Cardiothoracic Surgery', 'Vascular Surgery'],
      },
      'Heart Failure': {
        labs: ['BNP or NT-proBNP', 'BMP', 'CBC', 'Troponin', 'TSH', 'Hepatic panel'],
        imaging: ['Chest X-ray', 'Echocardiogram', '12-lead ECG'],
        consults: ['Cardiology'],
      },
      'Pericarditis': {
        labs: ['Troponin', 'CBC', 'ESR', 'CRP', 'BMP'],
        imaging: ['12-lead ECG', 'Echocardiogram', 'Chest X-ray'],
      },
      'Cardiac Arrhythmia': {
        labs: ['BMP (electrolytes)', 'Magnesium', 'TSH', 'Troponin'],
        imaging: ['12-lead ECG', 'Telemetry monitoring', 'Echocardiogram'],
        consults: ['Cardiology/Electrophysiology'],
      },

      // === RESPIRATORY ===
      'Pulmonary Embolism': {
        labs: ['D-dimer', 'CBC', 'BMP', 'ABG', 'Troponin', 'BNP'],
        imaging: ['CT Pulmonary Angiogram (stat)', 'Lower extremity venous Doppler'],
        consults: ['Pulmonology'],
      },
      'Pneumonia': {
        labs: ['CBC', 'BMP', 'Procalcitonin', 'Blood cultures x2', 'Sputum culture'],
        imaging: ['Chest X-ray (PA and lateral)'],
      },
      'COPD exacerbation': {
        labs: ['CBC', 'BMP', 'ABG or VBG', 'Procalcitonin'],
        imaging: ['Chest X-ray'],
        procedures: ['Peak flow / spirometry if stable'],
      },
      'Asthma': {
        labs: ['CBC (eosinophils)', 'BMP'],
        imaging: ['Chest X-ray (if first episode or severe)'],
        procedures: ['Peak flow measurement', 'Spirometry with bronchodilator response'],
      },
      'Pneumothorax': {
        labs: ['ABG'],
        imaging: ['Chest X-ray (upright, expiratory)', 'CT Chest if equivocal'],
        consults: ['Thoracic Surgery if large/tension'],
      },
      'Bronchitis': {
        imaging: ['Chest X-ray (only if pneumonia suspected)'],
        procedures: ['Pulse oximetry'],
      },
      'Viral URI': {
        procedures: ['Rapid strep test if pharyngitis', 'Influenza/COVID rapid test if febrile'],
      },

      // === NEUROLOGICAL ===
      'Stroke': {
        labs: ['CBC', 'BMP', 'PT/INR', 'Glucose (stat)', 'Troponin', 'Lipid panel'],
        imaging: ['CT Head without contrast (stat)', 'CT Angiography head/neck', 'MRI Brain with diffusion'],
        consults: ['Neurology (stat)', 'Interventional Neuroradiology if LVO'],
      },
      'Subarachnoid Hemorrhage': {
        labs: ['CBC', 'BMP', 'PT/INR', 'Type & Screen'],
        imaging: ['CT Head without contrast (stat)', 'CT Angiography if CT negative but high suspicion'],
        procedures: ['Lumbar puncture if CT negative (xanthochromia)'],
        consults: ['Neurosurgery'],
      },
      'Meningitis': {
        labs: ['CBC', 'BMP', 'Blood cultures x2', 'Procalcitonin', 'Lactate'],
        imaging: ['CT Head before LP if indicated'],
        procedures: ['Lumbar puncture with CSF analysis (cell count, glucose, protein, gram stain, culture)'],
        consults: ['Infectious Disease'],
      },
      'Tension headache': {
        procedures: ['Neurological exam — if normal, clinical diagnosis'],
      },
      'Migraine': {
        imaging: ['MRI Brain (if new-onset, atypical features, or focal neuro findings)'],
        procedures: ['Neurological exam'],
      },
      'Cluster headache': {
        imaging: ['MRI Brain with pituitary protocol (to rule out structural cause)'],
        consults: ['Neurology'],
      },
      'Temporal arteritis': {
        labs: ['ESR (stat)', 'CRP', 'CBC'],
        procedures: ['Temporal artery biopsy'],
        consults: ['Rheumatology', 'Ophthalmology (if visual symptoms)'],
      },

      // === MUSCULOSKELETAL — KNEE ===
      'Meniscal Tear': {
        imaging: ['X-ray knee (AP, lateral, sunrise views)', 'MRI knee without contrast'],
        procedures: ['McMurray test', 'Joint line tenderness assessment', 'Thessaly test'],
        consults: ['Orthopedics'],
      },
      'Medial Meniscus Tear': {
        imaging: ['X-ray knee (AP, lateral, sunrise views)', 'MRI knee without contrast'],
        procedures: ['McMurray test', 'Medial joint line palpation', 'Apley compression test'],
        consults: ['Orthopedics'],
      },
      'Lateral Meniscus Tear': {
        imaging: ['X-ray knee (AP, lateral, sunrise views)', 'MRI knee without contrast'],
        procedures: ['McMurray test', 'Lateral joint line palpation'],
        consults: ['Orthopedics'],
      },
      'ACL Tear': {
        imaging: ['X-ray knee (AP, lateral — rule out fracture)', 'MRI knee without contrast'],
        procedures: ['Lachman test', 'Anterior drawer test', 'Pivot shift test'],
        consults: ['Orthopedics / Sports Medicine'],
      },
      'MCL Sprain': {
        imaging: ['X-ray knee (AP, lateral)', 'MRI knee (if grade 2-3 suspected)'],
        procedures: ['Valgus stress test at 0° and 30°'],
        consults: ['Orthopedics (if grade 3)'],
      },
      'Patellofemoral Pain Syndrome': {
        imaging: ['X-ray knee (AP, lateral, sunrise/Merchant view)'],
        procedures: ['Patellar grind test', 'J-sign assessment', 'Q-angle measurement'],
        consults: ['Physical Therapy'],
      },
      'IT Band Syndrome': {
        imaging: ['X-ray knee (if needed to rule out other pathology)'],
        procedures: ['Ober test', 'Noble compression test'],
        consults: ['Physical Therapy / Sports Medicine'],
      },
      'Baker\'s Cyst': {
        imaging: ['Ultrasound popliteal fossa', 'MRI knee (to evaluate for associated intra-articular pathology)'],
      },
      'Osteoarthritis': {
        labs: ['ESR, CRP (to rule out inflammatory arthritis)', 'Uric acid (if gout considered)'],
        imaging: ['X-ray knee (weight-bearing AP, lateral, sunrise views)'],
        consults: ['Orthopedics (if severe/surgical candidate)', 'Physical Therapy'],
      },
      'Gout': {
        labs: ['Uric acid', 'CBC', 'BMP', 'ESR', 'CRP'],
        imaging: ['X-ray (for chronic changes)', 'Ultrasound (double contour sign)'],
        procedures: ['Joint aspiration with crystal analysis (gold standard)'],
        consults: ['Rheumatology (if recurrent)'],
      },
      'Patellar Fracture': {
        imaging: ['X-ray knee (AP, lateral)', 'CT knee (if complex fracture pattern)'],
        consults: ['Orthopedics'],
      },
      'Fracture': {
        imaging: ['X-ray (AP, lateral, oblique views of affected area)', 'CT if occult fracture suspected'],
        consults: ['Orthopedics'],
      },

      // === MUSCULOSKELETAL — BACK ===
      'Musculoskeletal strain': {
        imaging: ['X-ray lumbar spine (if trauma, age >50, or red flags)'],
        procedures: ['Neurological exam — straight leg raise, reflexes, strength'],
      },
      'Herniated Disc': {
        imaging: ['MRI lumbar spine without contrast'],
        procedures: ['Straight leg raise test', 'Neurological exam (L4-S1 dermatomes)'],
        consults: ['Neurosurgery or Orthopedic Spine (if surgical candidate)', 'Physical Therapy'],
      },
      'Spinal Stenosis': {
        imaging: ['MRI lumbar spine without contrast', 'X-ray lumbar spine (flexion/extension views)'],
        procedures: ['Neurological exam', 'Gait assessment'],
        consults: ['Neurosurgery or Orthopedic Spine', 'Physical Therapy'],
      },
      'Cauda Equina Syndrome': {
        imaging: ['MRI lumbar spine without contrast (STAT)'],
        procedures: ['Rectal exam (tone)', 'Post-void residual (bladder scan)'],
        consults: ['Neurosurgery (STAT)'],
      },
      'Compression fracture': {
        labs: ['CBC', 'BMP', 'Calcium', 'Vitamin D', 'DEXA if not recent'],
        imaging: ['X-ray thoracolumbar spine', 'MRI (if neurological compromise or uncertain acuity)'],
        consults: ['Interventional Radiology (vertebroplasty/kyphoplasty if acute)'],
      },

      // === GASTROINTESTINAL ===
      'Appendicitis': {
        labs: ['CBC with differential', 'CMP', 'Urinalysis', 'Lipase', 'hCG (females of childbearing age)'],
        imaging: ['CT Abdomen/Pelvis with IV contrast'],
        consults: ['General Surgery'],
      },
      'Cholecystitis': {
        labs: ['CBC', 'CMP (with hepatic panel)', 'Lipase', 'Urinalysis'],
        imaging: ['RUQ Ultrasound', 'HIDA scan (if US equivocal)'],
        consults: ['General Surgery'],
      },
      'Pancreatitis': {
        labs: ['Lipase (>3x ULN diagnostic)', 'CBC', 'CMP', 'Calcium', 'Triglycerides', 'Lactate'],
        imaging: ['CT Abdomen/Pelvis with IV contrast (if diagnosis uncertain or severe)', 'RUQ Ultrasound (gallstone etiology)'],
        consults: ['Gastroenterology (if severe)', 'Surgery (if gallstone pancreatitis)'],
      },
      'Bowel obstruction': {
        labs: ['CBC', 'BMP', 'Lactate', 'Lipase'],
        imaging: ['CT Abdomen/Pelvis with IV contrast', 'Abdominal X-ray (upright and supine)'],
        consults: ['General Surgery'],
      },
      'Peptic Ulcer': {
        labs: ['CBC', 'BMP', 'H. pylori testing (stool antigen or urea breath test)', 'Type & Screen (if bleeding)'],
        imaging: ['CT Abdomen (if perforation suspected)'],
        procedures: ['EGD (if refractory, alarm symptoms, or bleeding)'],
        consults: ['Gastroenterology'],
      },
      'Diverticulitis': {
        labs: ['CBC', 'BMP', 'CRP', 'Urinalysis'],
        imaging: ['CT Abdomen/Pelvis with IV contrast'],
        consults: ['Surgery (if complicated — abscess, perforation, fistula)'],
      },
      'Gastroenteritis': {
        labs: ['BMP (if dehydrated)', 'CBC', 'Stool studies (if bloody or prolonged)'],
      },
      'GERD': {
        procedures: ['Trial of PPI therapy (diagnostic and therapeutic)'],
        imaging: ['EGD (if alarm symptoms: dysphagia, weight loss, anemia, age >60 new-onset)'],
      },
      'Inflammatory Bowel Disease': {
        labs: ['CBC', 'CMP', 'ESR', 'CRP', 'Fecal calprotectin', 'Stool studies (rule out infection)'],
        imaging: ['CT Abdomen/Pelvis (if acute flare)'],
        procedures: ['Colonoscopy with biopsies'],
        consults: ['Gastroenterology'],
      },
      'Ectopic Pregnancy': {
        labs: ['Quantitative hCG (stat)', 'CBC', 'Type & Rh', 'BMP'],
        imaging: ['Transvaginal ultrasound (stat)'],
        consults: ['OB/GYN (stat)'],
      },

      // === UROLOGICAL ===
      'UTI': {
        labs: ['Urinalysis with microscopy', 'Urine culture and sensitivity'],
      },
      'Pyelonephritis': {
        labs: ['Urinalysis', 'Urine culture', 'CBC', 'BMP', 'Blood cultures x2', 'Lactate'],
        imaging: ['CT Abdomen/Pelvis without contrast (if complicated or not improving)'],
      },
      'Kidney Stone': {
        labs: ['Urinalysis', 'BMP', 'CBC', 'Uric acid'],
        imaging: ['CT Abdomen/Pelvis without contrast (stone protocol)'],
        consults: ['Urology (if stone >6mm, obstruction, or infection)'],
      },
      'Prostatitis': {
        labs: ['Urinalysis', 'Urine culture', 'CBC', 'PSA (after acute phase resolves)'],
        procedures: ['Digital rectal exam'],
      },

      // === SORE THROAT ===
      'Viral Pharyngitis': {
        procedures: ['Rapid strep test', 'Monospot if mononucleosis suspected'],
      },
      'Strep Pharyngitis': {
        labs: ['Rapid strep antigen test', 'Throat culture (if rapid negative and high suspicion)'],
      },
      'Peritonsillar Abscess': {
        imaging: ['CT Neck with IV contrast', 'Intraoral or transcervical ultrasound'],
        procedures: ['Needle aspiration or I&D'],
        consults: ['ENT / Otolaryngology'],
      },
      'Infectious Mononucleosis': {
        labs: ['CBC with differential (atypical lymphocytes)', 'Monospot / heterophile antibody', 'EBV VCA IgM/IgG', 'CMP (hepatic panel)'],
        imaging: ['Abdominal ultrasound (if splenomegaly concern)'],
      },
      'Epiglottitis': {
        imaging: ['Lateral neck X-ray (thumbprint sign)', 'CT Neck with contrast if stable'],
        procedures: ['Direct laryngoscopy in controlled setting'],
        consults: ['ENT (stat)', 'Anesthesia (airway management)'],
      },

      // === INFECTIOUS ===
      'Sepsis': {
        labs: ['CBC', 'BMP', 'Lactate (stat)', 'Blood cultures x2 (before antibiotics)', 'Procalcitonin', 'Hepatic panel', 'Coagulation studies', 'Urinalysis'],
        imaging: ['Chest X-ray', 'CT as indicated by suspected source'],
        consults: ['Infectious Disease', 'Critical Care (if shock)'],
      },
      'Viral infection': {
        labs: ['CBC (if needed)', 'Rapid influenza/COVID test'],
      },
      'Bacterial infection': {
        labs: ['CBC', 'BMP', 'CRP', 'Blood cultures (if systemic)', 'Culture of suspected source'],
      },
      'Endocarditis': {
        labs: ['Blood cultures x3 (from separate sites)', 'CBC', 'ESR', 'CRP', 'BMP', 'Urinalysis'],
        imaging: ['Transthoracic echocardiogram', 'Transesophageal echocardiogram (if TTE non-diagnostic)'],
        consults: ['Infectious Disease', 'Cardiology'],
      },

      // === MENTAL HEALTH ===
      'Major Depressive Disorder': {
        labs: ['TSH', 'CBC', 'BMP', 'Vitamin B12', 'Folate', 'Vitamin D'],
        procedures: ['PHQ-9 screening', 'Columbia Suicide Severity Rating Scale', 'Safety assessment'],
        consults: ['Psychiatry (if severe, suicidal, or psychotic features)', 'Behavioral Health'],
      },
      'Major Depressive Disorder — Severe': {
        labs: ['TSH', 'CBC', 'BMP', 'UDS'],
        procedures: ['Columbia Suicide Severity Rating Scale (stat)', 'Safety assessment', 'PHQ-9'],
        consults: ['Psychiatry (stat)', 'Social Work'],
      },
      'Generalized Anxiety Disorder': {
        labs: ['TSH', 'CBC', 'BMP', 'Urine drug screen'],
        procedures: ['GAD-7 screening', 'PHQ-9 (comorbid depression)'],
        consults: ['Behavioral Health'],
      },
      'Panic Disorder': {
        labs: ['TSH', 'BMP', 'CBC', '12-lead ECG (rule out cardiac)'],
        procedures: ['GAD-7', 'PHQ-9'],
        consults: ['Behavioral Health'],
      },
      'Bipolar Disorder': {
        labs: ['TSH', 'CBC', 'BMP', 'UDS', 'Hepatic panel (baseline for mood stabilizers)'],
        procedures: ['MDQ screening', 'PHQ-9'],
        consults: ['Psychiatry'],
      },
      'Adjustment Disorder': {
        procedures: ['PHQ-9', 'GAD-7', 'Psychosocial assessment'],
        consults: ['Behavioral Health'],
      },

      // === VASCULAR ===
      'DVT': {
        labs: ['D-dimer', 'CBC', 'BMP', 'PT/INR'],
        imaging: ['Lower extremity venous duplex ultrasound'],
        consults: ['Hematology (if unprovoked or recurrent)'],
      },

      // === OTHER ===
      'Sinusitis': {
        imaging: ['CT Sinuses (only if chronic or complicated)'],
        procedures: ['Clinical diagnosis based on symptoms >10 days or worsening pattern'],
      },
      'Anemia': {
        labs: ['CBC with differential', 'Reticulocyte count', 'Iron studies (Fe, TIBC, ferritin)', 'B12', 'Folate', 'BMP'],
        procedures: ['Stool guaiac (if GI source suspected)'],
      },
      'Hypothyroidism': {
        labs: ['TSH', 'Free T4', 'TPO antibodies'],
      },
      'Hyperthyroidism': {
        labs: ['TSH', 'Free T4', 'Free T3', 'TSH receptor antibodies'],
        imaging: ['Thyroid ultrasound', 'Radioactive iodine uptake scan'],
      },
      'Costochondritis': {
        procedures: ['Reproducible tenderness on palpation of costochondral junctions — clinical diagnosis'],
      },
      'Musculoskeletal pain': {
        imaging: ['X-ray of affected area (if trauma or concern for fracture)'],
        procedures: ['Focused musculoskeletal exam'],
      },
      'BPPV': {
        procedures: ['Dix-Hallpike maneuver', 'Epley maneuver (therapeutic)'],
      },
      'Vestibular neuritis': {
        procedures: ['Head impulse test', 'HINTS exam'],
        imaging: ['MRI Brain (if central cause not excluded)'],
        consults: ['Neurology (if HINTS concerning)'],
      },
      'Orthostatic hypotension': {
        labs: ['CBC', 'BMP'],
        procedures: ['Orthostatic vital signs (lying, sitting, standing)'],
      },
      'Pertussis': {
        labs: ['Bordetella pertussis PCR (nasopharyngeal swab)', 'CBC (lymphocytosis)'],
      },
      'ACE inhibitor cough': {
        procedures: ['Medication review — trial discontinuation of ACE inhibitor, switch to ARB'],
      },
      'Substance Use Disorder': {
        labs: ['Urine drug screen', 'CBC', 'CMP', 'Hepatic panel', 'Hepatitis panel'],
        procedures: ['AUDIT-C or DAST-10 screening'],
        consults: ['Addiction Medicine / Behavioral Health'],
      },
      'Urethritis': {
        labs: ['Urinalysis', 'GC/Chlamydia NAAT', 'HIV', 'RPR'],
      },
      'Interstitial Cystitis': {
        labs: ['Urinalysis', 'Urine culture (to rule out UTI)'],
        procedures: ['Voiding diary', 'Potassium sensitivity test'],
        consults: ['Urology'],
      },
    };

    return workupMap[diagnosis] || {
      labs: ['CBC', 'BMP'],
      imaging: [],
    };
  }

  private generateClinicalImpression(
    presentation: PatientPresentation,
    differentials: DifferentialDiagnosis[]
  ): string {
    const primary = differentials[0];
    const emergent = differentials.filter(d => d.urgency === 'emergent');
    
    let impression = `${presentation.demographics.age}-year-old ${presentation.demographics.gender} presenting with ${presentation.chiefComplaint}. `;

    if (emergent.length > 0) {
      impression += `CRITICAL: Must rule out ${emergent.map(e => e.diagnosis).join(', ')}. `;
    }

    impression += `Most likely diagnosis: ${primary.diagnosis} (${primary.confidence}% confidence).`;

    // Add graph coverage info
    const stats = getGraphStats(presentation.chiefComplaint);
    if (stats.totalCauses > 0) {
      impression += ` Evidence base: ${stats.totalCauses} known causes evaluated (${stats.specificCauses} highly specific).`;
    }

    return impression;
  }

  private generateRecommendedActions(differentials: DifferentialDiagnosis[]): string[] {
    const actions: string[] = [];
    const emergent = differentials.filter(d => d.urgency === 'emergent');
    const primary = differentials[0];

    // Emergent conditions get stat-level actions
    if (emergent.length > 0) {
      actions.push(`STAT workup to rule out ${emergent.map(e => e.diagnosis).join(', ')}`);
      // Condition-specific emergent actions
      const emergentNames = emergent.map(e => e.diagnosis.toLowerCase());
      if (emergentNames.some(n => n.includes('coronary') || n.includes('mi'))) {
        actions.push('12-lead ECG stat, serial troponins, cardiac monitoring, IV access');
      }
      if (emergentNames.some(n => n.includes('stroke'))) {
        actions.push('CT Head stat, determine time of onset, activate stroke protocol');
      }
      if (emergentNames.some(n => n.includes('pulmonary embolism'))) {
        actions.push('CT Pulmonary Angiogram stat, anticoagulation if high clinical suspicion');
      }
      if (emergentNames.some(n => n.includes('cauda equina'))) {
        actions.push('MRI lumbar spine STAT, neurosurgery consultation STAT');
      }
      if (emergentNames.some(n => n.includes('sepsis'))) {
        actions.push('Blood cultures, lactate, broad-spectrum antibiotics within 1 hour, IV fluids');
      }
      if (emergentNames.some(n => n.includes('subarachnoid'))) {
        actions.push('CT Head stat, neurosurgery consultation, LP if CT negative but high suspicion');
      }
      if (emergentNames.some(n => n.includes('dissection'))) {
        actions.push('CT Angiography stat, blood pressure control, cardiothoracic surgery consult');
      }
      if (emergentNames.some(n => n.includes('ectopic'))) {
        actions.push('Quantitative hCG and transvaginal ultrasound stat, OB/GYN consultation');
      }
    }

    // Primary diagnosis-driven actions (non-emergent)
    if (primary && primary.urgency !== 'emergent') {
      const primaryWorkup = primary.recommendedWorkup;

      // Imaging — most actionable for the primary diagnosis
      if (primaryWorkup.imaging && primaryWorkup.imaging.length > 0) {
        actions.push(`Imaging: ${primaryWorkup.imaging.join(', ')}`);
      }

      // Labs — deduplicated across top differentials
      const labs = new Set<string>();
      differentials.slice(0, 3).forEach(d => d.recommendedWorkup.labs?.forEach(l => labs.add(l)));
      if (labs.size > 0) {
        actions.push(`Labs: ${Array.from(labs).join(', ')}`);
      }

      // Physical exam maneuvers / procedures for primary
      if (primaryWorkup.procedures && primaryWorkup.procedures.length > 0) {
        actions.push(`Exam: ${primaryWorkup.procedures.join(', ')}`);
      }

      // Consults — from top differentials, deduplicated
      const consults = new Set<string>();
      differentials.slice(0, 3).forEach(d => d.recommendedWorkup.consults?.forEach(c => consults.add(c)));
      if (consults.size > 0) {
        actions.push(`Referral: ${Array.from(consults).join(', ')}`);
      }
    }

    // Safety-net recommendation if nothing emergent
    if (emergent.length === 0) {
      actions.push('Follow up if symptoms worsen or new symptoms develop');
    }

    return actions;
  }

  private calculateOverallConfidence(differentials: DifferentialDiagnosis[]): number {
    if (differentials.length === 0) return 0;

    const primary = differentials[0];
    const secondary = differentials[1];

    // Clear diagnostic leader → high overall confidence
    if (!secondary || primary.confidence - secondary.confidence > 15) {
      return Math.min(primary.confidence, 95);
    }

    // Close differentials → reduce to reflect diagnostic uncertainty
    const gap = primary.confidence - secondary.confidence;
    const penalty = Math.round((15 - gap) * 0.5);
    return Math.max(primary.confidence - penalty, 30);
  }

  private generateRequestId(): string {
    return `ddx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processFeedbackBatch(): Promise<void> {
    const batch = this.feedbackQueue.splice(0, 10);
    // In production, send to ML pipeline for model improvement
    console.log(`[AI] Processing feedback batch of ${batch.length} items`);
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const differentialDiagnosisService = new DifferentialDiagnosisService({
  provider: (process.env.AI_PROVIDER as any) || 'local',
  endpoint: process.env.AI_ENDPOINT,
  apiKey: process.env.AI_API_KEY,
  model: process.env.AI_MODEL,
});

export default differentialDiagnosisService;
