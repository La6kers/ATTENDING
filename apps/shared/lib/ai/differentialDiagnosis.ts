// ============================================================
// ATTENDING AI - Differential Diagnosis Service
// apps/shared/lib/ai/differentialDiagnosis.ts
//
// AI-powered clinical decision support for generating
// differential diagnoses with confidence scoring
// Supports: BioMistral, Azure OpenAI, Local inference
// ============================================================
//
// TODO(SECURITY): This module is currently imported by frontend code and will
// be included in the browser bundle, exposing the full Bayesian scoring logic,
// ICD-10 mappings, and likelihood ratios to end users.
//
// For HIPAA/production hardening, this entire module should be moved to a
// server-side API route (e.g. pages/api/clinical/differential.ts or the
// .NET backend). The frontend should call the API endpoint and receive only
// the resulting differential list — not execute the algorithm itself.
//
// Impact: prevents reverse-engineering of proprietary scoring weights and
// protects any PHI that flows through the algorithm from being accessible
// in browser memory / devtools.
// ============================================================

import { applyLikelihoodRatios, applySymptomBoosts } from './symptomDiagnosisBoosts';
import { applyGraphBoosts, applyGraphLikelihoodRatios, getGraphStats } from './symptomCauseGraph';
import { getPreTestProbabilities, hasPrevalenceData } from './clinicalPrevalence';
import { applyMedicationLikelihoodRatios } from './medicationDiagnosisRules';
import { generateIntelligentWorkup, formatWorkupAsActions } from './workupIntelligence';

// Re-export all types from the types-only file so server-side code
// can still import everything from this module. Frontend code should
// import types directly from './differentialDiagnosis.types' instead.
export type {
  PatientPresentation,
  Symptom,
  VitalSigns,
  DifferentialDiagnosis,
  DifferentialDiagnosisResult,
  AIServiceConfig,
  ProviderFeedback,
} from './differentialDiagnosis.types';

import type {
  PatientPresentation,
  Symptom,
  VitalSigns,
  DifferentialDiagnosis,
  DifferentialDiagnosisResult,
  AIServiceConfig,
  ProviderFeedback,
} from './differentialDiagnosis.types';

// Types are defined in differentialDiagnosis.types.ts — re-exported above.
// Frontend code should import types from the .types file directly to avoid
// bundling this engine module (1,200+ lines of clinical logic) into the client.

// ============================================================
// CLINICAL KNOWLEDGE BASE (server-only)
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
    // Sepsis needs an infection source (not just fever + tachycardia) —
    // otherwise any seizure, stroke, or trauma case with a mild fever lights
    // up the must-rule-out list. The symptom keywords here are now oriented
    // toward infection-specific findings (cough, dysuria, wound, line, etc).
    // The vital thresholds keep their contribution but the emergent matcher
    // won't cross its threshold without at least one infection source AND a
    // clinical red flag.
    symptoms: [
      'chills', 'rigors', 'confusion from infection',
      'productive cough', 'purulent sputum',
      'dysuria', 'flank pain',
      'wound drainage', 'cellulitis',
      'catheter', 'central line', 'indwelling',
    ],
    vitals: { temperature: 38.3, heartRate: 110, respiratoryRate: 24 },
    redFlags: [
      'lactate >2', 'hypotension', 'altered mental status',
      'sepsis', 'septic shock', 'suspected infection',
    ],
  },
  'Aortic Dissection': {
    symptoms: ['tearing chest pain', 'back pain', 'blood pressure differential'],
    redFlags: ['sudden onset', 'radiates to back', 'unequal pulses'],
  },
  'Subarachnoid Hemorrhage': {
    symptoms: [
      'thunderclap headache', 'worst headache', 'sudden severe headache',
      'neck stiffness', 'stiff neck', 'photophobia', 'light sensitivity',
      'vomiting',
    ],
    redFlags: [
      'worst headache of life', 'worst headache', 'thunderclap', 'sudden onset',
      'altered consciousness',
    ],
  },
  'Meningitis': {
    symptoms: [
      'severe headache', 'fever', 'neck stiffness', 'stiff neck',
      'photophobia', 'light sensitivity', 'confusion',
    ],
    redFlags: ['petechial rash', 'altered mental status', 'immunocompromised'],
  },
  'Ectopic Pregnancy': {
    symptoms: ['abdominal pain', 'vaginal bleeding', 'missed period'],
    redFlags: ['hypotension', 'positive pregnancy test', 'adnexal mass'],
  },
  'Cauda Equina Syndrome': {
    symptoms: [
      'back pain', 'low back pain', 'saddle numbness', 'saddle anesthesia',
      'bladder incontinence', 'bowel incontinence', 'urinary retention',
      'leg weakness', 'bilateral leg weakness', 'numbness between legs',
    ],
    redFlags: [
      'saddle anesthesia', 'saddle numbness', 'new bladder dysfunction',
      'bowel incontinence', 'bilateral sciatica', 'progressive neurologic deficit',
      'cauda equina',
    ],
  },
  'Anaphylaxis': {
    symptoms: [
      'throat swelling', 'tongue swelling', 'difficulty swallowing',
      'difficulty breathing', 'hives', 'urticaria', 'wheezing',
      'facial swelling', 'allergic reaction',
    ],
    redFlags: ['airway compromise', 'hypotension', 'multi-system involvement'],
  },
  'Testicular Torsion': {
    symptoms: ['testicular pain', 'scrotal pain', 'testicular swelling', 'groin pain'],
    redFlags: ['sudden onset', 'absent cremasteric reflex', 'horizontal testicle'],
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

      // Post-merge pediatric filter — removes adult-only diagnoses that leak
      // in via the symptom-cause graph or emergent matcher regardless of the
      // prevalence-path pediatric filter. Keeps the KB's adult data intact
      // for adult patients but blocks it for kids. Matches the same list of
      // regexes used in clinicalPrevalence.ts ADULT_ONLY_DIAGNOSES.
      if (presentation.demographics.age < 18) {
        const adultOnly = /COPD|Emphysema|Chronic Bronchitis|ACE inhibitor cough|Atrial Fibrillation\b|Endometrial|Cervical Cancer|Atrophic|Hip Osteoarthritis|Trochanteric Bursitis|\bOsteoarthritis\b|Colon Cancer|Lung Cancer|Pancreatic Cancer|Prostate|Temporal Arteritis|Polymyalgia Rheumatica|Peptic Ulcer Disease|Abdominal Aortic Aneurysm|Aortic Stenosis|Hypertensive|Diabetic Nephropathy|\bGout\b|Erectile|Menopausal|Postmenopausal|Hyperosmolar Hyperglycemic/i;
        differentials = differentials.filter(d => !adultOnly.test(d.diagnosis));
      }

      // Sort by confidence
      differentials.sort((a, b) => b.confidence - a.confidence);
      
      // Identify must-rule-out diagnoses
      const mustRuleOut = differentials.filter(d => 
        d.urgency === 'emergent' || 
        EMERGENCY_CONDITIONS[d.diagnosis]
      );

      // Ensure at least one differential exists. When the prevalence engine
      // doesn't recognize the chief complaint pattern (e.g. hip pain, vaginal
      // bleeding, generic pediatric), surface a friendly, non-alarming card
      // that tells the user we couldn't narrow it down rather than a 10%
      // "Unspecified condition" line that reads as a broken result.
      if (differentials.length === 0) {
        differentials.push({
          diagnosis: 'Needs in-person evaluation',
          confidence: 0,
          reasoning: `COMPASS couldn't narrow down a differential for "${presentation.chiefComplaint}" from the information provided. This is not a red flag by itself — it usually means the complaint needs an in-person exam (e.g., physical findings, vitals, or a focused history) to evaluate properly.`,
          supportingFindings: [`Chief complaint: ${presentation.chiefComplaint}`],
          againstFindings: [],
          urgency: 'routine',
          recommendedWorkup: {
            labs: [],
            imaging: [],
            procedures: ['Focused history and physical exam', 'Vital signs review'],
            consults: ['Primary care evaluation'],
          },
        });
      }

      // Generate intelligent workup using the full 7-layer pipeline
      const topDifferentials = differentials.slice(0, 10);
      const intelligentWorkup = generateIntelligentWorkup(presentation, topDifferentials);

      const result: DifferentialDiagnosisResult = {
        differentials: topDifferentials,
        primaryDiagnosis: differentials[0],
        mustRuleOut,
        clinicalImpression: this.generateClinicalImpression(presentation, differentials),
        recommendedActions: formatWorkupAsActions(intelligentWorkup),
        intelligentWorkup,
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

    // Collect every free-text field the engine has about the patient so the
    // emergent match is not limited to whichever exact phrasing COMPASS used.
    const patientHaystack = [
      chiefComplaint,
      ...symptoms,
      ...Object.values(presentation.symptomSpecificAnswers || {}).map(v => v.toLowerCase()),
      ...(presentation.redFlags || []).map(rf => rf.toLowerCase()),
    ].join(' | ');

    // Strict keyword matcher:
    //   - Full phrase substring hit (e.g. "chest pain" as-is) → match
    //   - Multi-word phrase → EVERY word of length ≥3 must appear in haystack
    //   - Single-word phrase → must be length ≥4 and present
    // Stem tolerance: if a criterion word doesn't appear as-is, accept it if
    // a 5+-char prefix is in the haystack so "stiffness" matches "stiff neck".
    // This prevents the previous 2-of-N rule from letting "jaw pain" / "arm
    // pain" degenerate to just "pain" and falsely pulling MI into abdominal
    // or GU presentations.
    const wordHit = (w: string): boolean => {
      if (patientHaystack.includes(w)) return true;
      if (w.length >= 6) {
        const stem = w.slice(0, 5);
        if (patientHaystack.includes(stem)) return true;
      }
      return false;
    };
    const matchesKeyword = (phrase: string): boolean => {
      const p = phrase.toLowerCase();
      if (patientHaystack.includes(p)) return true;
      const words = p.split(/\s+/).filter(w => w.length >= 3);
      if (words.length === 0) return false;
      if (words.length === 1) {
        // single-word criterion: avoid very generic 3-char hits
        return words[0].length >= 4 && wordHit(words[0]);
      }
      return words.every(wordHit);
    };

    for (const [condition, criteria] of Object.entries(EMERGENCY_CONDITIONS)) {
      let matchScore = 0;
      const supportingFindings: string[] = [];
      const redFlagsFound: string[] = [];

      // Check symptoms (keyword-tolerant)
      for (const symptom of criteria.symptoms) {
        if (matchesKeyword(symptom)) {
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

      // Check red flags — bidirectional keyword match against the same
      // patientHaystack (red flag text is already merged in above).
      for (const redFlag of criteria.redFlags) {
        if (matchesKeyword(redFlag)) {
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
          // Tiered HR rules — HR >150 is almost always a tachyarrhythmia, not
          // sinus. Route strongly to SVT/AFib RVR/VT and Cardiac Arrhythmia.
          { condition: !!(v.heartRate && v.heartRate > 150), diagnosis: 'Supraventricular Tachycardia', lr: 8.0, evidence: `Heart rate ${v.heartRate} — tachyarrhythmia (LR 8.0)` },
          { condition: !!(v.heartRate && v.heartRate > 150), diagnosis: 'Cardiac Arrhythmia', lr: 6.0, evidence: `Heart rate ${v.heartRate} — suspect arrhythmia (LR 6.0)` },
          { condition: !!(v.heartRate && v.heartRate > 150), diagnosis: 'Atrial Fibrillation with RVR', lr: 4.0, evidence: `Heart rate ${v.heartRate} — possible AFib RVR (LR 4.0)` },
          { condition: !!(v.heartRate && v.heartRate < 50), diagnosis: 'Medication side effect', lr: 2.0, evidence: `Bradycardia (HR ${v.heartRate}) — drug effect (LR 2.0)` },
          { condition: !!(v.heartRate && v.heartRate < 50), diagnosis: 'AV Block', lr: 4.0, evidence: `Bradycardia (HR ${v.heartRate}) — AV conduction disease (LR 4.0)` },
          { condition: !!(v.heartRate && v.heartRate < 40), diagnosis: 'Complete Heart Block', lr: 8.0, evidence: `Severe bradycardia (HR ${v.heartRate}) — likely complete heart block (LR 8.0)` },
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

      // --- Step 4d: Chief-complaint keyword LRs ---
      // Phrases that are pathognomonic enough to boost their diagnosis even
      // when the symptom-specific module didn't run or when the patient
      // described the pattern directly in the chief complaint text.
      const ccLRRules: Array<{ pattern: RegExp; diagnosis: string; lr: number; evidence: string }> = [
        // Appendicitis: migratory periumbilical → RLQ pain is textbook
        { pattern: /(periumbilic|belly\s*button|umbilic|mid.*abdomen).*(right.*lower|rlq|right\s*side)|(right.*lower|rlq).*(periumbilic|belly\s*button|umbilic|moved|migrated)/i, diagnosis: 'Appendicitis', lr: 6.0, evidence: 'Migratory periumbilical → RLQ pain (classic appendicitis pattern, LR 6.0)' },
        { pattern: /right\s*lower.*(nausea|fever|loss\s*of\s*appetite|anorexia)|rlq.*(nausea|fever|loss\s*of\s*appetite|anorexia)/i, diagnosis: 'Appendicitis', lr: 2.5, evidence: 'RLQ pain with nausea/fever/anorexia (LR 2.5)' },
        // Migraine: unilateral throbbing with photophobia
        { pattern: /(throbbing|pulsating|pounding).*(one\s*side|unilateral|right\s*side|left\s*side|temple)/i, diagnosis: 'Migraine', lr: 3.0, evidence: 'Unilateral throbbing headache — migraine feature (LR 3.0)' },
        { pattern: /(one\s*side|unilateral|right\s*side|left\s*side|temple).*(throbbing|pulsating|pounding)/i, diagnosis: 'Migraine', lr: 3.0, evidence: 'Unilateral throbbing headache — migraine feature (LR 3.0)' },
        { pattern: /(photophob|light\s*sensitiv|bothered\s*by\s*light)/i, diagnosis: 'Migraine', lr: 2.5, evidence: 'Photophobia — migraine feature (LR 2.5)' },
        { pattern: /(photophob|light\s*sensitiv|bothered\s*by\s*light).*(nausea|vomit)|(nausea|vomit).*(photophob|light\s*sensitiv)/i, diagnosis: 'Migraine', lr: 4.0, evidence: 'Photophobia + nausea — POUND criteria (LR 4.0)' },
        // Testicular torsion: sudden severe + can't miss
        { pattern: /sudden.*(testic|scrotal)|(testic|scrotal).*sudden/i, diagnosis: 'Testicular Torsion', lr: 4.0, evidence: 'Sudden-onset testicular pain — can\'t-miss surgical emergency (LR 4.0)' },
        // SAH: worst headache of life + thunderclap
        { pattern: /worst\s*headache|thunderclap|maximum\s*from\s*start/i, diagnosis: 'Subarachnoid Hemorrhage', lr: 5.0, evidence: 'Worst/thunderclap headache — SAH concern (LR 5.0)' },
        // Classic aortic dissection: tearing + radiating to back
        { pattern: /tearing|ripping/i, diagnosis: 'Aortic Dissection', lr: 5.0, evidence: 'Tearing/ripping pain quality — dissection pattern (LR 5.0)' },
        // AAA: elderly + tearing + back/abdomen (separate from dissection)
        { pattern: /(tearing|ripping|like\s*something.*ripped).*(belly|abdomin|back)|(belly|abdomin|back).*(tearing|ripping)/i, diagnosis: 'Abdominal Aortic Aneurysm', lr: 4.0, evidence: 'Tearing abdominal/back pain — AAA concern (LR 4.0)' },
        // Pancreatitis: epigastric to back, recent binge/alcohol
        { pattern: /(epigastric|upper.*abdomin|upper.*belly).*(radiat|go|through|to).*back|back.*(epigastric|upper.*abdomin)/i, diagnosis: 'Pancreatitis', lr: 5.0, evidence: 'Epigastric pain radiating through to back — classic pancreatitis (LR 5.0)' },
        { pattern: /(alcohol|binge|gallstone).*(belly|abdomin|pain)|(belly|abdomin|pain).*(alcohol|binge)/i, diagnosis: 'Pancreatitis', lr: 2.5, evidence: 'Alcohol/binge trigger for abdominal pain (LR 2.5)' },
        // Postpartum / recent delivery → PE priority
        { pattern: /(postpartum|after.*deliver|just\s*had.*baby|weeks.*after.*baby)/i, diagnosis: 'Pulmonary Embolism', lr: 4.0, evidence: 'Postpartum period — hypercoagulable, high PE risk (LR 4.0)' },
        { pattern: /(postpartum|after.*deliver|just\s*had.*baby).*(calf|leg)|calf.*(postpartum|after.*deliver)/i, diagnosis: 'DVT', lr: 5.0, evidence: 'Postpartum DVT — highest-risk period (LR 5.0)' },
        // Stable angina: predictable exertional pattern relieved by rest
        { pattern: /(exertion|walking|activity).*rest|rest.*(exertion|walking)|predictable.*exertion|every\s*day.*exertion/i, diagnosis: 'Stable Angina', lr: 4.0, evidence: 'Predictable exertional pain relieved by rest (LR 4.0)' },
        // Cluster headache: unilateral retro-orbital + autonomic
        { pattern: /(behind|around).*(eye).*pain.*tear|tear.*eye.*pain|runny.*nose.*one\s*side/i, diagnosis: 'Cluster Headache', lr: 5.0, evidence: 'Unilateral retro-orbital pain with autonomic features (LR 5.0)' },
        // EoE: food impaction in young/middle-aged male
        { pattern: /food.*stuck.*swallow|food.*catch|food.*impaction/i, diagnosis: 'Eosinophilic Esophagitis', lr: 3.0, evidence: 'Food impaction — consider eosinophilic esophagitis (LR 3.0)' },
        // Meralgia paresthetica: burning lateral thigh, weight/belt trigger
        { pattern: /(burn|numb|tingl).*(outer|lateral).*(thigh)|tight.*(belt|pants|waistband).*thigh/i, diagnosis: 'Meralgia Paresthetica', lr: 4.0, evidence: 'Burning/numb lateral thigh — lateral femoral cutaneous nerve compression (LR 4.0)' },
        // Gout: big toe, sudden overnight, red/hot/swollen
        { pattern: /big\s*toe.*(red|swol|hot|pain)|podagra|(red|swol|hot).*big\s*toe/i, diagnosis: 'Gout', lr: 6.0, evidence: 'Red swollen painful big toe — classic podagra (LR 6.0)' },
        // DVT: unilateral calf swollen and warm
        { pattern: /(calf|leg).*swol.*warm|(calf|leg).*red.*swol|unilateral.*calf/i, diagnosis: 'DVT', lr: 4.0, evidence: 'Unilateral swollen warm calf — DVT concern (LR 4.0)' },
        // Hyperemesis gravidarum: vomiting in pregnancy with dehydration
        { pattern: /(weeks\s*pregnant|pregnan).*(vomit|throw|keep.*down|nausea)|vomit.*(weeks\s*pregnant|pregnan)/i, diagnosis: 'Hyperemesis Gravidarum', lr: 8.0, evidence: 'Severe vomiting in pregnancy — hyperemesis gravidarum (LR 8.0)' },
        // Kawasaki disease: prolonged fever in child with rash/red hands
        { pattern: /(5|five|six|seven|eight)\s*days?.*fever.*(child|year\s*old|kid)|red.*cracked.*lips|strawberry.*tongue|swollen.*hands.*feet.*fever/i, diagnosis: 'Kawasaki Disease', lr: 8.0, evidence: 'Prolonged fever + mucocutaneous features — Kawasaki (LR 8.0)' },
        // Hemoptysis + weight loss + night sweats = TB until proven otherwise
        { pattern: /(hemoptysis|coughing\s*blood|blood.*sputum).*(weight\s*loss|night\s*sweat|fever)|night\s*sweat.*(weight\s*loss|fever).*cough/i, diagnosis: 'Tuberculosis', lr: 6.0, evidence: 'Hemoptysis + constitutional symptoms — rule out TB (LR 6.0)' },
        // Lupus: rash + joint pain + multi-system
        { pattern: /(malar|butterfly).*rash|rash.*cheek.*joint|mouth\s*ulcer.*joint|joint.*rash.*photosensit/i, diagnosis: 'Systemic Lupus Erythematosus', lr: 6.0, evidence: 'Malar rash + multisystem features — SLE pattern (LR 6.0)' },
        // Myasthenia: fatigability pattern
        { pattern: /(?:ptosis|drooping\s*eyelid|double\s*vision).*(?:worse.*day|worse.*evening|better.*rest|fatigu)|(?:end.*day|evening|fatigu).*(?:ptosis|drooping|diplopia)/i, diagnosis: 'Myasthenia Gravis', lr: 8.0, evidence: 'Fatigable weakness with ptosis/diplopia — myasthenia pattern (LR 8.0)' },
        // Pheochromocytoma: episodic triad
        { pattern: /(?:episod|paroxysmal|spike).*(?:headache|sweat|palpit|hypertens|bp)|(?:headache|sweat|palpit).*spike.*bp/i, diagnosis: 'Pheochromocytoma', lr: 6.0, evidence: 'Episodic headache/sweating/palpitations with BP spikes — pheochromocytoma (LR 6.0)' },
        // Adrenal insufficiency: hyperpigmentation + salt craving
        { pattern: /hyperpigment|skin.*dark.*crease|palm.*crease.*dark|(?:salt\s*crav|crav.*salt)/i, diagnosis: 'Adrenal Insufficiency', lr: 8.0, evidence: 'Hyperpigmentation or salt craving — adrenal insufficiency pattern (LR 8.0)' },
        // Carcinoid syndrome: flushing + diarrhea
        { pattern: /(?:flushing|flush).*(?:diarrh|wheez)|(?:diarrh|wheez).*flush/i, diagnosis: 'Carcinoid Syndrome', lr: 6.0, evidence: 'Flushing + diarrhea/wheezing — carcinoid triad (LR 6.0)' },
        // GBS: ascending weakness after illness
        { pattern: /(?:ascending|progress).*weak.*(?:arms|up)|weakness.*after.*(?:diarrh|illness|stomach\s*bug|infection)/i, diagnosis: 'Guillain-Barre Syndrome', lr: 7.0, evidence: 'Ascending weakness after illness — GBS (LR 7.0)' },
        // Spontaneous pneumothorax: tall thin young + sudden
        { pattern: /(?:tall|thin|skinny|lanky).*(?:chest\s*pain|shortness|sob|breath)|(?:sudden|suddenly).*(?:left|right).*chest.*shortness.*breath/i, diagnosis: 'Primary Spontaneous Pneumothorax', lr: 4.0, evidence: 'Tall/thin habitus + sudden unilateral chest pain and SOB (LR 4.0)' },
        // Preeclampsia: pregnancy + HTN/headache/vision/RUQ
        { pattern: /(?:pregnant|weeks\s*pregnant|\d+\s*weeks).*(?:headache|vision|swelling|ruq|upper.*abdom|blood\s*pressure)|(?:headache|vision).*(?:pregnant|weeks)/i, diagnosis: 'Preeclampsia', lr: 8.0, evidence: 'Pregnancy + headache/visual/RUQ — preeclampsia concern (LR 8.0)' },
        // IPF: chronic dry cough + clubbing
        { pattern: /(?:chronic|progressive).*dry\s*cough.*(?:clubbing|crackles|velcro|months|years)|clubbing.*(?:cough|dyspnea|breath)/i, diagnosis: 'Idiopathic Pulmonary Fibrosis', lr: 6.0, evidence: 'Chronic dry cough with clubbing/crackles — IPF pattern (LR 6.0)' },
        // Cluster headache: retro-orbital + autonomic
        { pattern: /(?:behind|around).*eye.*(?:tear|runny|nose|red|swell).*(?:same\s*time|every\s*day|daily|hour)/i, diagnosis: 'Cluster Headache', lr: 8.0, evidence: 'Retro-orbital pain with autonomic features + periodicity — cluster (LR 8.0)' },
        // PMR: proximal morning stiffness in elderly
        { pattern: /morning\s*stiff.*(?:shoulder|hip|neck).*(?:hours?|long\s*time)|(?:shoulder|hip|neck).*(?:morning\s*stiff|stiff.*morning)/i, diagnosis: 'Polymyalgia Rheumatica', lr: 6.0, evidence: 'Morning stiffness of shoulders/hips lasting >1 hour — PMR pattern (LR 6.0)' },
        // Stroke: FAST symptoms (Face, Arm, Speech, Time)
        // Match any pair of: face drooping, slurred/cannot speak, arm weakness
        { pattern: /(?:face|facial).*droop.*(?:speak|speech|slurr|arm|weak|move|cannot)/i, diagnosis: 'Stroke', lr: 8.0, evidence: 'FAST positive: facial droop + speech/arm weakness — stroke (LR 8.0)' },
        { pattern: /(?:speak|speech|slurr|arm|weak|cannot\s*move).*(?:face|facial).*droop/i, diagnosis: 'Stroke', lr: 8.0, evidence: 'FAST positive: facial droop + speech/arm weakness — stroke (LR 8.0)' },
        { pattern: /(?:cannot\s*speak|slurred\s*speech).*(?:arm|weakness|move)|(?:arm|weakness).*(?:cannot\s*speak|slurred\s*speech)/i, diagnosis: 'Stroke', lr: 8.0, evidence: 'Aphasia + arm weakness — stroke pattern (LR 8.0)' },
        { pattern: /sudden.*(?:weakness|numbness).*(?:one\s*side|left\s*side|right\s*side|hemi)/i, diagnosis: 'Stroke', lr: 6.0, evidence: 'Sudden unilateral weakness — stroke concern (LR 6.0)' },
      ];
      for (const rule of ccLRRules) {
        if (rule.pattern.test(chiefComplaint)) {
          const currentOdds = odds.get(rule.diagnosis) || 0.02;
          odds.set(rule.diagnosis, currentOdds * rule.lr);
          const existing = allEvidence.get(rule.diagnosis) || [];
          existing.push(rule.evidence);
          allEvidence.set(rule.diagnosis, existing);
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
    // BioMistral not configured — fall through to local
    console.log('[AI] BioMistral not configured - using local Bayesian engine');
    return this.generateWithLocalLogic(presentation);
  }

  private async generateWithExternalAI(presentation: PatientPresentation): Promise<DifferentialDiagnosis[]> {
    // Generate local differentials first as the probability anchor
    const localDifferentials = this.generateWithLocalLogic(presentation);

    // Build the AI enhancement request
    const endpoint = this.config.endpoint;
    const apiKey = this.config.apiKey;
    const model = this.config.model || 'gpt-4o';

    if (!endpoint || !apiKey) {
      console.log(`[AI] ${this.config.provider} not configured (missing endpoint/key) - using local Bayesian engine`);
      return localDifferentials;
    }

    try {
      // Build the prompt with local differentials as anchors
      const symptoms = presentation.symptoms.map(s => s.name).join(', ');
      const age = presentation.demographics.age;
      const gender = presentation.demographics.gender;
      const localSummary = localDifferentials.slice(0, 5).map(d =>
        `- ${d.diagnosis} (${d.confidence}%, ${d.urgency})`
      ).join('\n');

      const systemPrompt = `You are a clinical decision support assistant. You enhance differential diagnoses generated by a Bayesian engine. You do NOT replace the engine's probability calculations — you add clinical reasoning, identify missed diagnoses, and refine workup recommendations. Always return valid JSON. Never fabricate clinical evidence.`;

      const userPrompt = `Patient: ${age}-year-old ${gender}
Chief complaint: ${presentation.chiefComplaint}
Symptoms: ${symptoms}
Duration: ${presentation.duration || 'not specified'}
${presentation.vitals ? `Vitals: HR ${presentation.vitals.heartRate || 'N/A'}, BP ${presentation.vitals.bloodPressure ? `${presentation.vitals.bloodPressure.systolic}/${presentation.vitals.bloodPressure.diastolic}` : 'N/A'}, Temp ${presentation.vitals.temperature || 'N/A'}, SpO2 ${presentation.vitals.oxygenSaturation || 'N/A'}` : ''}
${presentation.redFlags?.length ? `Red flags: ${presentation.redFlags.join(', ')}` : ''}
${presentation.medicalHistory?.medications?.length ? `Medications: ${presentation.medicalHistory.medications.join(', ')}` : ''}

The Bayesian engine produced these differentials:
${localSummary}

Enhance these differentials. For each diagnosis, provide improved clinical reasoning and identify any diagnoses the engine may have missed. Return JSON array:
[{
  "diagnosis": "string",
  "icdCode": "string",
  "confidence": number (0-100),
  "reasoning": "detailed clinical reasoning",
  "supportingFindings": ["string"],
  "againstFindings": ["string"],
  "urgency": "emergent|urgent|routine",
  "recommendedWorkup": { "labs": [], "imaging": [], "procedures": [], "consults": [] }
}]

Return ONLY the JSON array, no markdown or explanation.`;

      // Build request based on provider
      let url: string;
      let headers: Record<string, string>;
      let body: Record<string, any>;

      if (this.config.provider === 'azure-openai') {
        // Azure OpenAI uses deployment-based URL and api-key header
        const deployment = model;
        url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-10-21`;
        headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
        body = {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1024,
          temperature: this.config.temperature || 0.3,
          response_format: { type: 'json_object' },
        };
      } else {
        // Anthropic
        url = 'https://api.anthropic.com/v1/messages';
        headers = {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        };
        body = {
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout || 15000);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[AI] ${this.config.provider} returned ${response.status}: ${errText.slice(0, 200)}`);
        return localDifferentials;
      }

      const data = await response.json();

      // Extract content based on provider format
      let content: string;
      if (this.config.provider === 'azure-openai') {
        content = data.choices?.[0]?.message?.content || '';
      } else {
        content = data.content?.[0]?.text || '';
      }

      if (!content) {
        console.log('[AI] Empty response from AI - using local differentials');
        return localDifferentials;
      }

      // Parse the AI response
      let aiDifferentials: DifferentialDiagnosis[];
      try {
        const parsed = JSON.parse(content);
        // Handle both { differentials: [...] } and [...] formats
        const arr = Array.isArray(parsed) ? parsed : (parsed.differentials || parsed.diagnoses || []);

        aiDifferentials = arr.map((d: any) => ({
          diagnosis: d.diagnosis || d.name || 'Unknown',
          icdCode: d.icdCode || d.icd_code || undefined,
          confidence: Math.min(100, Math.max(0, Number(d.confidence) || 0)),
          reasoning: d.reasoning || d.rationale || '',
          supportingFindings: Array.isArray(d.supportingFindings) ? d.supportingFindings : [],
          againstFindings: Array.isArray(d.againstFindings) ? d.againstFindings : [],
          urgency: (['emergent', 'urgent', 'routine'].includes(d.urgency) ? d.urgency : 'routine') as 'emergent' | 'urgent' | 'routine',
          recommendedWorkup: {
            labs: Array.isArray(d.recommendedWorkup?.labs) ? d.recommendedWorkup.labs : [],
            imaging: Array.isArray(d.recommendedWorkup?.imaging) ? d.recommendedWorkup.imaging : [],
            procedures: Array.isArray(d.recommendedWorkup?.procedures) ? d.recommendedWorkup.procedures : [],
            consults: Array.isArray(d.recommendedWorkup?.consults) ? d.recommendedWorkup.consults : [],
          },
        }));
      } catch (parseErr) {
        console.error('[AI] Failed to parse AI response - using local differentials:', parseErr);
        return localDifferentials;
      }

      if (aiDifferentials.length === 0) {
        return localDifferentials;
      }

      // Merge: use AI reasoning but anchor probabilities to local Bayesian values
      // The Bayesian engine's confidence is the ground truth for validated CDR conditions
      const merged = localDifferentials.map(local => {
        const aiMatch = aiDifferentials.find(ai =>
          ai.diagnosis.toLowerCase().includes(local.diagnosis.toLowerCase()) ||
          local.diagnosis.toLowerCase().includes(ai.diagnosis.toLowerCase())
        );

        if (aiMatch) {
          return {
            ...local,
            // Keep local confidence (Bayesian anchor) but allow AI to shift ±15 points
            confidence: Math.min(100, Math.max(0,
              local.confidence + Math.max(-15, Math.min(15, aiMatch.confidence - local.confidence))
            )),
            reasoning: aiMatch.reasoning || local.reasoning,
            supportingFindings: [...new Set([...local.supportingFindings, ...aiMatch.supportingFindings])],
            againstFindings: [...new Set([...local.againstFindings, ...aiMatch.againstFindings])],
            recommendedWorkup: {
              labs: [...new Set([...(local.recommendedWorkup.labs || []), ...(aiMatch.recommendedWorkup.labs || [])])],
              imaging: [...new Set([...(local.recommendedWorkup.imaging || []), ...(aiMatch.recommendedWorkup.imaging || [])])],
              procedures: [...new Set([...(local.recommendedWorkup.procedures || []), ...(aiMatch.recommendedWorkup.procedures || [])])],
              consults: [...new Set([...(local.recommendedWorkup.consults || []), ...(aiMatch.recommendedWorkup.consults || [])])],
            },
          };
        }
        return local;
      });

      // Add AI-only diagnoses that the local engine missed (capped at lower confidence)
      for (const ai of aiDifferentials) {
        const alreadyPresent = merged.some(m =>
          m.diagnosis.toLowerCase().includes(ai.diagnosis.toLowerCase()) ||
          ai.diagnosis.toLowerCase().includes(m.diagnosis.toLowerCase())
        );
        if (!alreadyPresent && ai.confidence >= 10) {
          merged.push({
            ...ai,
            // Cap AI-only diagnoses at 40% since they lack Bayesian validation
            confidence: Math.min(40, ai.confidence),
          });
        }
      }

      console.log(`[AI] ${this.config.provider} enhanced ${merged.length} differentials (${localDifferentials.length} local + ${aiDifferentials.length} AI)`);
      return merged;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`[AI] ${this.config.provider} timed out - using local Bayesian engine`);
      } else {
        console.error(`[AI] ${this.config.provider} failed - using local Bayesian engine:`, error.message);
      }
      return localDifferentials;
    }
  }

  private mergeEmergentConditions(
    differentials: DifferentialDiagnosis[],
    emergent: DifferentialDiagnosis[]
  ): DifferentialDiagnosis[] {
    // Prior impl unconditionally used the emergent copy, which pinned
    // emergency diagnoses at the matchScore confidence even when the
    // Bayesian pipeline's CC-keyword-LR boost produced a higher value.
    // For example, stroke with FAST symptoms gets emergent matchScore
    // 35% but the CC LR boosts the Bayesian version to ~84%. Take the
    // higher confidence and preserve emergent urgency + redFlags metadata.
    const byName = new Map<string, DifferentialDiagnosis>();

    for (const e of emergent) byName.set(e.diagnosis, e);

    for (const diff of differentials) {
      const existing = byName.get(diff.diagnosis);
      if (!existing) {
        byName.set(diff.diagnosis, diff);
      } else if (diff.confidence > existing.confidence) {
        // Keep higher confidence but inherit emergent's urgency/redFlags
        byName.set(diff.diagnosis, {
          ...diff,
          urgency: existing.urgency,
          redFlags: existing.redFlags || diff.redFlags,
          disposition: existing.disposition || diff.disposition,
          supportingFindings: Array.from(new Set([
            ...(existing.supportingFindings || []),
            ...(diff.supportingFindings || []),
          ])),
        });
      }
      // else existing emergent wins (already the higher-confidence view)
    }

    return Array.from(byName.values());
  }

  private generateReasoning(diagnosis: string, presentation: PatientPresentation): string {
    const age = presentation.demographics.age;
    const gender = presentation.demographics.gender;
    // The first entry in presentation.symptoms is always the chief complaint
    // itself (see pages/api/diagnose.ts) so exclude it from the "associated"
    // list — otherwise the CC gets echoed twice in the reasoning sentence.
    const associated = presentation.symptoms
      .slice(1)
      .map(s => s.name)
      .filter(n => n && n.toLowerCase() !== presentation.chiefComplaint.toLowerCase());
    const assocText = associated.length > 0
      ? ` with associated symptoms (${associated.join(', ')})`
      : '';
    return `Based on a ${age}-year-old ${gender} presenting with ${presentation.chiefComplaint}${assocText}, ${diagnosis} should be considered in the differential.`;
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

    // Clear diagnostic leader → give a bonus. Prior calibration left the
    // overall pegged at the primary's raw confidence which often reads
    // "27%" for a stroke or "30%" for an ectopic — technically the Bayesian
    // posterior but clinically misleading when the primary is correctly
    // the dominant differential. Bonus rules:
    //   gap > 15 pt  → +10 over primary (capped 95)
    //   gap 8–15 pt  → +5 over primary
    //   gap < 8 pt   → penalty (close differentials)
    if (!secondary) return Math.min(primary.confidence + 10, 95);
    const gap = primary.confidence - secondary.confidence;
    if (gap > 15) return Math.min(primary.confidence + 10, 95);
    if (gap >= 8)  return Math.min(primary.confidence + 5, 90);

    // Close differentials → reduce to reflect diagnostic uncertainty
    const penalty = Math.round((8 - gap) * 0.5);
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
