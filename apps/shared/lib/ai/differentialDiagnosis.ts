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
import { normalizeSymptomText } from './symptomSynonyms';

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
  // ENT
  'ear pain': ['Acute Otitis Media', 'Otitis Externa', 'Eustachian Tube Dysfunction', 'TMJ', 'Referred Dental Pain', 'Mastoiditis'],
  'nasal congestion': ['Viral URI', 'Allergic Rhinitis', 'Sinusitis', 'Nasal Polyps', 'Deviated Septum', 'Vasomotor Rhinitis'],
  'nosebleed': ['Anterior Epistaxis', 'Posterior Epistaxis', 'Nasal Foreign Body', 'Coagulopathy', 'Hypertension'],
  'swallowing difficulty': ['Epiglottitis', 'Peritonsillar Abscess', 'Esophageal Foreign Body', 'GERD', 'Pharyngitis', 'Esophageal Stricture'],
  'mouth sores': ['Hand Foot and Mouth Disease', 'Herpes Stomatitis', 'Aphthous Ulcers', 'Oral Candidiasis', 'Herpangina'],
  'hoarseness': ['Laryngitis', 'Vocal Cord Nodules', 'GERD', 'Laryngeal Cancer', 'Thyroid Mass'],
  'facial pain': ['Sinusitis', 'Dental Abscess', 'Trigeminal Neuralgia', 'TMJ', 'Cluster Headache'],
  // Skin / Eye / GI gaps from v9 test
  'skin redness': ['Cellulitis', 'Contact Dermatitis', 'Abscess', 'DVT', 'Erysipelas'],
  'eye swelling': ['Orbital Cellulitis', 'Periorbital Cellulitis', 'Allergic Reaction', 'Conjunctivitis', 'Chalazion'],
  'vomiting diarrhea': ['Gastroenteritis', 'Food Poisoning', 'Appendicitis', 'Bowel Obstruction'],
  'rectal bleeding': ['Hemorrhoids', 'Anal Fissure', 'Diverticular Bleed', 'Colorectal Cancer', 'IBD'],
  // Psych / Substance
  'confusion': ['Delirium Tremens', 'Hepatic Encephalopathy', 'Wernicke Encephalopathy', 'Substance Intoxication', 'Hypoglycemia', 'Stroke', 'Meningitis', 'Sepsis'],
  'hallucinations': ['Delirium Tremens', 'Psychotic Disorder', 'Stimulant Intoxication', 'Anti-NMDA Receptor Encephalitis', 'Alcohol Withdrawal'],
  'overdose': ['Opioid Overdose', 'Benzodiazepine Overdose', 'Acetaminophen Overdose', 'Polypharmacy/Mixed Overdose', 'Alcohol Intoxication'],
  'withdrawal': ['Alcohol Withdrawal', 'Delirium Tremens', 'Opioid Withdrawal', 'Benzodiazepine Withdrawal', 'Withdrawal Seizure'],
  'mania': ['Bipolar Disorder — Manic Episode', 'Stimulant Intoxication', 'Psychotic Disorder', 'Hyperthyroidism', 'Serotonin Syndrome'],
  'cyclic vomiting': ['Cannabinoid Hyperemesis Syndrome', 'Cyclic Vomiting Syndrome', 'Gastroparesis', 'Pancreatitis'],
  // New gap categories
  'toothache': ['Dental Abscess', 'Dental Caries', 'TMJ Disorder', 'Trigeminal Neuralgia', 'Periapical Abscess', 'Ludwig Angina'],
  'fainting': ['Vasovagal Syncope', 'Cardiac Arrhythmia', 'Orthostatic Hypotension', 'Seizure', 'Aortic Stenosis', 'Hypoglycemia', 'Pulmonary Embolism'],
  'hives': ['Urticaria', 'Angioedema', 'Drug Reaction', 'Anaphylaxis', 'Contact Dermatitis'],
  'cut': ['Simple Laceration', 'Deep Laceration (tendon/nerve risk)', 'Puncture Wound', 'Wound Infection'],
  'fatigue': ['Iron Deficiency Anemia', 'Hypothyroidism', 'Major Depressive Disorder', 'Sleep Apnea', 'Diabetes Mellitus', 'Malignancy'],
  'genital discharge': ['Chlamydia', 'Gonorrhea', 'Trichomoniasis', 'Bacterial Vaginosis', 'Genital Herpes'],
  'groin lump': ['Inguinal Hernia', 'Epididymitis', 'Hydrocele', 'Varicocele', 'Testicular Cancer'],
  'burn': ['First Degree Burn', 'Second Degree Burn', 'Third Degree Burn', 'Chemical Burn', 'Sunburn'],
  'animal bite': ['Dog/Cat Bite', 'Cellulitis (bite-related)', 'Rabies Exposure', 'Insect Bite/Sting'],
  'swallowed object': ['Esophageal Foreign Body', 'GI Foreign Body (passing)', 'Aspirated Foreign Body', 'Button Battery Ingestion'],
  'cant pee': ['Benign Prostatic Hyperplasia', 'Acute Urinary Retention', 'Medication-Induced Retention', 'Cauda Equina Syndrome'],
  // Inclusive / sensitive categories
  'hormone therapy side effects': ['HRT Side Effect — Venous Thromboembolism Risk', 'Testosterone-Induced Polycythemia', 'HRT Side Effect — Mood/Psychiatric', 'HRT Side Effect — Hepatic'],
  'abuse': ['Intimate Partner Violence', 'Physical Abuse', 'Sexual Assault', 'Child Abuse / Non-Accidental Trauma', 'Elder Abuse/Neglect'],
  'sexual dysfunction': ['Erectile Dysfunction', 'Dyspareunia', 'Medication-Induced Sexual Dysfunction', 'Vaginismus', 'Hypogonadism'],
  'anal pain': ['Hemorrhoids', 'Anal Fissure', 'Perianal/Perirectal Abscess', 'Proctitis', 'Pilonidal Cyst'],
  'pregnant and sick': ['Morning Sickness (NVP)', 'Hyperemesis Gravidarum', 'Threatened Miscarriage', 'UTI', 'Preeclampsia'],
  'postpartum': ['Postpartum Depression', 'Lactation Mastitis', 'Postpartum Endometritis', 'Postpartum Hemorrhage', 'DVT/PE (postpartum)'],
  'breast lump': ['Fibrocystic Breast Changes', 'Breast Cyst', 'Fibroadenoma', 'Breast Cancer', 'Breast Abscess'],
  'baby wont stop crying': ['Colic', 'Acute Otitis Media', 'GERD', 'Hair Tourniquet', 'Intussusception', 'Non-Accidental Trauma'],
  'diaper rash': ['Irritant Contact Diaper Dermatitis', 'Candidal Diaper Dermatitis', 'Bacterial Superinfection', 'Perianal Strep'],
  'keep falling': ['Polypharmacy/Medication Effect', 'Orthostatic Hypotension', 'Peripheral Neuropathy', 'Cardiac Arrhythmia', 'Normal Pressure Hydrocephalus'],
  'heat exposure': ['Heat Exhaustion', 'Heat Stroke', 'Dehydration', 'Rhabdomyolysis (exertional)'],
  'cold exposure': ['Hypothermia', 'Frostbite', 'Dehydration'],
  'work injury': ['Laceration/Crush Injury', 'Fracture', 'Soft Tissue Injury/Strain', 'Compartment Syndrome', 'Spinal Injury'],
  'weight loss': ['Malignancy', 'Hyperthyroidism', 'Major Depressive Disorder', 'Diabetes Mellitus', 'Eating Disorder', 'HIV/AIDS'],
  'cant sleep': ['Insomnia Disorder', 'Obstructive Sleep Apnea', 'Anxiety Disorder', 'Restless Leg Syndrome'],
  'breast pain': ['Fibrocystic Breast Changes', 'Mastitis', 'Breast Abscess', 'Breast Cancer', 'Gynecomastia'],
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
    // Normalize lay language to append canonical medical terms before matching.
    // This lets "chest hurts / elephant on my chest" match the same criteria
    // that "chest pain / chest pressure" previously matched.
    const symptoms = presentation.symptoms.map(s => normalizeSymptomText(s.name).toLowerCase());
    const chiefComplaint = normalizeSymptomText(presentation.chiefComplaint).toLowerCase();

    // Collect every free-text field the engine has about the patient so the
    // emergent match is not limited to whichever exact phrasing COMPASS used.
    const patientHaystack = [
      chiefComplaint,
      ...symptoms,
      ...Object.values(presentation.symptomSpecificAnswers || {}).map(v => normalizeSymptomText(v).toLowerCase()),
      ...(presentation.redFlags || []).map(rf => normalizeSymptomText(rf).toLowerCase()),
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
    // Normalize lay language + typos → append canonical medical terms.
    // The resulting string is used for prevalence trigger matching and
    // CC-keyword LRs while the original chiefComplaint stays intact for
    // display. See apps/shared/lib/ai/symptomSynonyms.ts for the lexicon.
    const chiefComplaint = normalizeSymptomText(presentation.chiefComplaint).toLowerCase();
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
        { pattern: /(epigastric|upper.*(abdomin|belly|stomach)).*(radiat|go|goes|through|to).*back|back.*(epigastric|upper.*(abdomin|belly|stomach))/i, diagnosis: 'Pancreatitis', lr: 20.0, evidence: 'Epigastric pain radiating through to back — classic pancreatitis (LR 20.0)' },
        { pattern: /belly\s*pain.*(after\s*eating|greasy|fatty|alcohol).*(through|back|radiat)/i, diagnosis: 'Pancreatitis', lr: 25.0, evidence: 'Post-prandial abdominal pain + radiation — pancreatitis (LR 25.0)' },
        { pattern: /(worst|terrible|severe).*(belly|stomach|abdomin).*(pain|hurt).*(after\s*eat|greasy|fatty).*(back|through)/i, diagnosis: 'Pancreatitis', lr: 25.0, evidence: 'Severe post-prandial pain radiating to back (LR 25.0)' },
        { pattern: /upper\s*(belly|stomach|abdomin).*(worse\s*after\s*eat|after.*eat).*(puk|vomit|nausea)/i, diagnosis: 'Pancreatitis', lr: 20.0, evidence: 'Upper abdominal pain post-meal + vomiting — pancreatitis (LR 20.0)' },
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
        // Cholecystitis — RUQ / gallbladder pain after eating
        { pattern: /(right.*upper|ruq|gallbladder|under.*rib).*(after.*eat|fatty|greasy|burger|meal)|(after.*eat|fatty|greasy|burger|meal).*(right.*upper|ruq|gallbladder)/i, diagnosis: 'Cholecystitis', lr: 5.0, evidence: 'RUQ/gallbladder pain post-prandial — biliary colic (LR 5.0)' },
        // Bowel obstruction — no gas, no stool, distension
        { pattern: /(no|havent|haven'?t).*(gas|flatus|stool|poop|bowel).*(bloat|disten|huge|hard)|(bloat|disten|huge|hard).*(no|havent).*(gas|poop|stool)/i, diagnosis: 'Bowel obstruction', lr: 6.0, evidence: 'Obstipation with abdominal distension — bowel obstruction (LR 6.0)' },
        { pattern: /havent\s*passed\s*gas|no\s*gas.*no\s*(stool|poop)|no\s*(stool|poop).*no\s*gas/i, diagnosis: 'Bowel obstruction', lr: 5.0, evidence: 'Complete obstipation — bowel obstruction pattern (LR 5.0)' },
        // Croup — barking/seal cough
        { pattern: /bark.*cough|cough.*bark|seal.*cough|cough.*seal|sounds?\s*like\s*a?\s*seal/i, diagnosis: 'Croup', lr: 8.0, evidence: 'Barking/seal-like cough — pathognomonic for croup (LR 8.0)' },
        // Constipation — no bowel movement + bloating
        { pattern: /(havent|haven'?t|cant|no).*(poop|bowel\s*movement|go\s*to\s*the\s*bathroom).*(bloat|cramp|hard|days|week)/i, diagnosis: 'Constipation', lr: 4.0, evidence: 'Absent bowel movements with bloating — constipation (LR 4.0)' },
        // Aortic dissection — tearing/ripping to back
        { pattern: /(tear|rip|ripping|tearing).*(chest|back|shoulder)|(chest|back).*(tear|rip|ripping|tearing)/i, diagnosis: 'Aortic Dissection', lr: 6.0, evidence: 'Tearing/ripping chest-to-back pain — aortic dissection (LR 6.0)' },
        // GI Bleed — black/tarry stool or coffee-ground emesis
        { pattern: /black.*tar.*stool|tar.*poop|coffee.*ground|melena|blood.*stool|bloody.*stool|blood.*poop|black.*poop/i, diagnosis: 'Gastrointestinal Bleeding', lr: 5.0, evidence: 'Melena/hematochezia/coffee-ground emesis — GI bleed (LR 5.0)' },
        // Atrial Fibrillation — irregular/skipping/fluttering heartbeat
        { pattern: /(heart|pulse).*(irregular|skip|all\s*over|flutter|erratic)|(irregular|skip|flutter).*(heart|pulse|beat)/i, diagnosis: 'Atrial Fibrillation', lr: 4.0, evidence: 'Irregularly irregular pulse/palpitations — AFib (LR 4.0)' },
        // Sciatica — shooting pain down leg from back
        { pattern: /(shoot|radiat|electric|shock).*(down|leg|buttock|butt)|(back|butt|buttock).*(shoot|radiat|electric|shock).*leg/i, diagnosis: 'Sciatica', lr: 4.0, evidence: 'Radiating pain from back/buttock down leg — sciatica (LR 4.0)' },
        // Cannabinoid Hyperemesis Syndrome — marijuana use + cyclic vomiting + hot shower relief
        { pattern: /(weed|marijuana|pot|cannabis|thc|dab).*(vomit|puk|throw|sick|nausea)|(vomit|puk|throw|nausea).*(weed|marijuana|pot|cannabis)/i, diagnosis: 'Cannabinoid Hyperemesis Syndrome', lr: 6.0, evidence: 'Cannabis use + vomiting — CHS (LR 6.0)' },
        { pattern: /hot\s*(shower|bath).*(help|relief|better|stops?|only\s*thing)/i, diagnosis: 'Cannabinoid Hyperemesis Syndrome', lr: 4.0, evidence: 'Hot shower/bath relieves vomiting — pathognomonic CHS sign (LR 4.0)' },
        // Delirium Tremens — alcohol + confusion/hallucinations/tremor
        { pattern: /(quit|stop|havent).*drink.*(shak|tremor|confus|see.*things|hallucin)|(shak|tremor|confus|see.*things).*(quit|stop|havent).*drink/i, diagnosis: 'Delirium Tremens', lr: 7.0, evidence: 'Alcohol cessation + tremor/confusion/hallucinations — DTs (LR 7.0)' },
        { pattern: /delirium\s*tremens|\bDTs\b|the\s*shakes.*alcohol|alcohol.*the\s*shakes/i, diagnosis: 'Delirium Tremens', lr: 8.0, evidence: 'Named DTs reference (LR 8.0)' },
        // Opioid Overdose — pinpoint pupils, unresponsive, blue lips
        { pattern: /pinpoint\s*pupils|found.*(unresponsive|not\s*breathing|blue\s*lips)|narcan|naloxone/i, diagnosis: 'Opioid Overdose', lr: 6.0, evidence: 'Pinpoint pupils/unresponsive/cyanosis — opioid overdose (LR 6.0)' },
        { pattern: /(heroin|fentanyl|oxy|opiate|opioid).*(overdos|too\s*much|not\s*breathing|passed\s*out)/i, diagnosis: 'Opioid Overdose', lr: 8.0, evidence: 'Named opioid + overdose symptoms (LR 8.0)' },
        // Wernicke Encephalopathy — confusion + ataxia + eye movement abnormality (classic triad)
        { pattern: /confus.*(?:walk|stumbl|atax|unsteady|eye).*(?:drink|alcohol)|(?:drink|alcohol).*confus.*(?:walk|stumbl|eye)/i, diagnosis: 'Wernicke Encephalopathy', lr: 6.0, evidence: 'Confusion + ataxia/oculomotor — Wernicke triad (LR 6.0)' },
        // Bipolar Mania — not sleeping + grandiosity/spending/racing thoughts
        { pattern: /(not\s*sleep|havent\s*slept|up\s*for\s*days).*(racing|grandiose|spending|energy|invincible|god)/i, diagnosis: 'Bipolar Disorder — Manic Episode', lr: 7.0, evidence: 'Decreased sleep + grandiosity/racing thoughts — mania (LR 7.0)' },
        // Serotonin Syndrome — new/increased SSRI + agitation/tremor/fever/clonus
        { pattern: /(ssri|antidepressant|sertraline|lexapro|prozac|zoloft).*(agitat|tremor|fever|rigid|clonus|jerk|twitch)/i, diagnosis: 'Serotonin Syndrome', lr: 5.0, evidence: 'Serotonergic med + agitation/tremor/clonus — serotonin syndrome (LR 5.0)' },
        // NMS — antipsychotic + rigid + fever + AMS
        { pattern: /(antipsychotic|haldol|risperdal|abilify|seroquel|zyprexa).*(rigid|fever|confus|muscle)/i, diagnosis: 'Neuroleptic Malignant Syndrome', lr: 5.0, evidence: 'Antipsychotic + rigidity/fever — NMS (LR 5.0)' },
        // Heat illness — been in heat/sun + symptoms
        { pattern: /(heat|sun|hot\s*outside|working\s*outside).*(dizz|nausea|vomit|pass|faint|confus|cramp|headache)/i, diagnosis: 'Heat Exhaustion', lr: 6.0, evidence: 'Heat/sun exposure + symptoms — heat illness (LR 6.0)' },
        { pattern: /(heat|sun|hot\s*outside).*(confus|altered|seiz|not\s*sweat|dry\s*skin|temp.*10[3-9])/i, diagnosis: 'Heat Stroke', lr: 8.0, evidence: 'Heat exposure + AMS/anhidrosis — heat stroke emergency (LR 8.0)' },
        // Recurrent falls — geriatric
        { pattern: /keep\s*(fall|tripp)|fall.*(again|lot|multiple|frequent|three|twice|\d+\s*time)|recurrent\s*fall|balance\s*(problem|issue|off)/i, diagnosis: 'Polypharmacy/Medication Effect', lr: 3.0, evidence: 'Recurrent falls — medication/polypharmacy review needed (LR 3.0)' },
        // Postpartum mastitis — breast + fever + nursing/baby
        { pattern: /(breast|nurs|breastfeed|lactati).*(red|hot|fever|infect|hard|lump|pain)|(red|hot|hard).*breast.*(baby|nurs|feed)/i, diagnosis: 'Lactation Mastitis', lr: 6.0, evidence: 'Breast redness/pain in nursing mother — mastitis (LR 6.0)' },
        // IPV — partner violence keywords
        { pattern: /(partner|husband|wife|boyfriend|girlfriend).*(hit|punch|kick|choke|strangle|hurt|abuse|threat)/i, diagnosis: 'Intimate Partner Violence', lr: 8.0, evidence: 'Partner violence reported — IPV screening (LR 8.0)' },
        // Pyloric stenosis — projectile vomiting in infant
        { pattern: /projectile\s*vomit.*(?:baby|infant|newborn|week\s*old)|(?:baby|infant|newborn|week\s*old).*projectile/i, diagnosis: 'Pyloric Stenosis', lr: 8.0, evidence: 'Projectile vomiting in infant — pyloric stenosis (LR 8.0)' },
        { pattern: /(?:baby|infant).*(?:hungry|feeds?).*(?:after|right\s*after|immediately).*vomit/i, diagnosis: 'Pyloric Stenosis', lr: 5.0, evidence: 'Hungry after vomiting in infant — pyloric stenosis pattern (LR 5.0)' },
        // Epiglottitis — drooling + stridor + tripod
        { pattern: /(?:drool|stridor|tripod).*(?:fever|cant\s*swallow|toxic|hoarse)|(?:fever|cant\s*swallow).*(?:drool|stridor)/i, diagnosis: 'Epiglottitis', lr: 8.0, evidence: 'Drooling/stridor/fever — epiglottitis emergency (LR 8.0)' },
        { pattern: /(?:child|kid|toddler).*(?:drool|stridor|cant\s*swallow|muffled\s*voice)/i, diagnosis: 'Epiglottitis', lr: 5.0, evidence: 'Pediatric drooling/stridor — consider epiglottitis (LR 5.0)' },
        // Ovarian torsion — sudden unilateral pelvic pain + nausea
        { pattern: /(?:sudden|sharp|worst).*(?:pelvi|ovary|ovarian|lower\s*abdom).*(?:nausea|vomit)|(?:ovary|ovarian).*(?:sudden|sharp|twist|torsion)/i, diagnosis: 'Ovarian Torsion', lr: 7.0, evidence: 'Sudden pelvic pain with nausea — ovarian torsion concern (LR 7.0)' },
        // Shingles — dermatomal pain/rash one side
        { pattern: /(?:stripe|band|belt|one\s*side).*(?:blister|rash|burn|pain)|shingles|zoster/i, diagnosis: 'Herpes Zoster (Shingles)', lr: 6.0, evidence: 'Dermatomal rash/pain — shingles (LR 6.0)' },
        // Placental abruption — vaginal bleeding + abdominal pain in pregnancy
        { pattern: /(?:pregnant|weeks\s*pregnant|\d+\s*weeks).*(?:bleed|blood).*(?:pain|cramp)|(?:bleed|blood).*(?:pregnant).*(?:pain|cramp)/i, diagnosis: 'Placental Abruption', lr: 6.0, evidence: 'Vaginal bleeding + pain in pregnancy — abruption concern (LR 6.0)' },
        // Subdural hematoma — elderly/anticoagulant + headache/confusion after fall
        { pattern: /(?:hit.*head|fell.*head|head.*hit|head.*injury|head.*bump).*(?:confus|headache|drowsy|vomit|weeks?\s*ago)/i, diagnosis: 'Subdural Hematoma', lr: 5.0, evidence: 'Head injury + delayed neuro symptoms — subdural hematoma (LR 5.0)' },
        // Mesenteric ischemia — elderly + severe abd pain + out of proportion
        { pattern: /(?:severe|worst|excruciating).*(?:abdom|belly).*(?:out\s*of\s*proportion|no\s*findings|looks\s*ok)/i, diagnosis: 'Mesenteric Ischemia', lr: 6.0, evidence: 'Severe pain out of proportion to exam — mesenteric ischemia (LR 6.0)' },
        { pattern: /(?:abdom|belly).*(?:pain).*(?:after.*eat|atrial\s*fib|afib|blood\s*clot)/i, diagnosis: 'Mesenteric Ischemia', lr: 4.0, evidence: 'Abdominal pain with AFib/vascular risk — mesenteric ischemia concern (LR 4.0)' },
        // Rhabdomyolysis — muscle pain + dark urine after exertion/crush
        { pattern: /(?:dark|brown|tea|cola)\s*(?:urine|pee).*(?:muscle|workout|exertion|crush|pain)|(?:muscle|exercise|crush|pain).*(?:dark|brown|tea|cola)\s*(?:urine|pee)/i, diagnosis: 'Rhabdomyolysis', lr: 7.0, evidence: 'Dark urine + muscle pain — rhabdomyolysis (LR 7.0)' },
        // Intussusception — currant jelly stool + episodic crying in infant/toddler
        { pattern: /(?:currant\s*jelly|jelly.*(stool|poop|diaper|looking)|red\s*jelly|bloody\s*mucus.*(stool|poop|diaper))/i, diagnosis: 'Intussusception', lr: 40.0, evidence: 'Currant jelly stool — intussusception (LR 40.0)' },
        { pattern: /(?:baby|infant|toddler).*(?:scream|cry|episod).*(?:draw|pull|drawing|pulling)\s*(?:up\s*)?(?:leg|knee)/i, diagnosis: 'Intussusception', lr: 25.0, evidence: 'Episodic screaming + leg-drawing in infant — intussusception (LR 25.0)' },
        { pattern: /(?:baby|infant).*episod.*(scream|cry).*bloody.*stool|bloody\s*stool.*(?:baby|infant|episod)/i, diagnosis: 'Intussusception', lr: 30.0, evidence: 'Infant episodic crying + bloody stool — intussusception (LR 30.0)' },
        { pattern: /(?:baby|infant).*(?:scream|cry).*(?:comes?\s*(?:and\s*)?goes?|episod|every\s*(few|\d+))/i, diagnosis: 'Intussusception', lr: 20.0, evidence: 'Episodic infant crying — intussusception concern (LR 20.0)' },
        // Henoch-Schonlein Purpura — palpable purpura + abd pain + joint pain in child
        { pattern: /(?:purpl|purpur).*(?:rash|spot|bump).*(?:leg|buttock|butt|joint|belly)|(?:child|kid).*(?:purpl|rash).*(?:joint|belly|hurt)/i, diagnosis: 'Henoch-Schonlein Purpura (IgA Vasculitis)', lr: 7.0, evidence: 'Palpable purpura + abdominal/joint pain in child — HSP (LR 7.0)' },
        // SCFE — obese adolescent + hip/knee pain + limp
        { pattern: /(?:overweight|obese|heavy|big).*(?:teen|adolesc|\d+\s*year).*(?:hip|knee|limp)|(?:teen|adolesc).*(?:hip|limp|groin).*(?:cant\s*walk|waddl)/i, diagnosis: 'Slipped Capital Femoral Epiphysis', lr: 6.0, evidence: 'Obese adolescent + hip/knee pain — SCFE (LR 6.0)' },
        // Hepatic encephalopathy — liver disease + confusion
        { pattern: /(?:liver|cirrho|hepatit).*(?:confus|forget|asterix|flap|alter|sleepy)|(?:confus|alter).*(?:liver|cirrho)/i, diagnosis: 'Hepatic Encephalopathy', lr: 7.0, evidence: 'Confusion with liver disease — hepatic encephalopathy (LR 7.0)' },
        // Opioid withdrawal — stopped/ran out + symptoms
        { pattern: /(?:ran\s*out|stopped|quit|cant\s*get).*(?:opioid|opiate|pain\s*med|percocet|norco|suboxone|methadone|heroin)/i, diagnosis: 'Opioid Withdrawal', lr: 6.0, evidence: 'Opioid cessation — withdrawal (LR 6.0)' },
        { pattern: /(?:opioid|opiate|heroin).*(?:withdraw|sick|cramp|sweat|diarr|restless|ache)/i, diagnosis: 'Opioid Withdrawal', lr: 5.0, evidence: 'Opioid use + withdrawal symptoms (LR 5.0)' },
        // Psychotic disorder — hearing voices, paranoia, delusions
        { pattern: /(?:hear|hearing)\s*(?:voice|thing|people).*(?:not\s*there|no\s*one|nobody)|voice.*(?:tell|command|say)/i, diagnosis: 'Psychotic Disorder', lr: 8.0, evidence: 'Auditory hallucinations — psychotic disorder (LR 8.0)' },
        { pattern: /(?:paranoi|delusion|conspir).*(?:follow|watch|spy|poison|government|chip)/i, diagnosis: 'Psychotic Disorder', lr: 7.0, evidence: 'Paranoid delusions — psychotic features (LR 7.0)' },
        // Hypothyroidism — weight gain + fatigue + cold intolerance
        { pattern: /(?:weight\s*gain|gain.*weight|getting\s*fat).*(?:tired|fatigu|cold|constipat|hair\s*loss)|(?:tired|fatigu|cold|constipat).*(?:weight\s*gain|gain.*weight)/i, diagnosis: 'Hypothyroidism', lr: 4.0, evidence: 'Weight gain + fatigue/cold intolerance — hypothyroidism (LR 4.0)' },
        // TB specific CC LR — cough + night sweats + weight loss
        { pattern: /(?:cough|hemoptysis).*(?:night\s*sweat|weight\s*loss|fever\s*at\s*night|month)|(?:night\s*sweat|weight\s*loss).*cough/i, diagnosis: 'Pulmonary Tuberculosis', lr: 5.0, evidence: 'Chronic cough + B-symptoms — TB concern (LR 5.0)' },
        // Drain cleaner / caustic exposure
        { pattern: /(?:drain\s*cleaner|bleach|lye|caustic|acid).*(?:splash|burn|skin|hand|eye|mouth|swallow)/i, diagnosis: 'Chemical Burn', lr: 8.0, evidence: 'Caustic chemical exposure — chemical burn (LR 8.0)' },
        { pattern: /(?:white|blanch|bleach).*(?:skin|hand|arm).*(?:burn|chemical|drain|acid)/i, diagnosis: 'Chemical Burn', lr: 6.0, evidence: 'Skin blanching from chemical exposure (LR 6.0)' },
        // Cancer screening triggers
        { pattern: /(?:lump|mass|growth).*(?:grow|bigger|hard|firm|weeks|months).*(?:neck|breast|armpit|groin)/i, diagnosis: 'Malignancy', lr: 3.0, evidence: 'Growing firm mass — malignancy concern (LR 3.0)' },
        // Medication side effect generic
        { pattern: /(?:since\s*start|after\s*start|new\s*med).*(?:dizz|nausea|rash|itch|swell|pain|headache|tired)/i, diagnosis: 'Adverse Drug Reaction', lr: 4.0, evidence: 'Symptoms temporally related to new medication (LR 4.0)' },

        // === v16 NEW CC-KEYWORD LR RULES ===

        // Chemical eye injury — bleach/cleaner + eye
        { pattern: /(bleach|chemical|cleaner|acid|lye|ammonia|drain\s*cleaner).*(eye|eyes|splash.*face)/i, diagnosis: 'Chemical Eye Burn', lr: 50.0, evidence: 'Chemical splash to eye — ocular chemical burn emergency (LR 50.0)' },
        { pattern: /(eye|eyes|face).*(splash|splashed|sprayed|squirted).*(bleach|cleaner|chemical|acid)/i, diagnosis: 'Chemical Eye Burn', lr: 50.0, evidence: 'Chemical eye exposure (LR 50.0)' },

        // Electrical injury — got shocked / electrocuted
        // Electrical Injury — strict match requiring explicit electrocution context (not metaphorical "electric shock" in back pain)
        { pattern: /(got\s*shocked|electrocut|touched.*(wire|outlet)|live\s*wire|fixing.*outlet|stuck\s*(my\s*)?finger\s*in)/i, diagnosis: 'Electrical Injury', lr: 50.0, evidence: 'Electrical injury (LR 50.0)' },
        // Only fire on "electric shock" if no back/leg pain context
        { pattern: /^(?!.*(back|leg|buttock|butt|sciatic|shoot.*leg|radiat)).*electric(al)?\s*shock/i, diagnosis: 'Electrical Injury', lr: 40.0, evidence: 'Electrical shock without radiculopathy context (LR 40.0)' },

        // Carbon monoxide poisoning
        { pattern: /(carbon\s*monoxide|\bco\s*(detector|alarm)|furnace.*(headache|nausea)|whole\s*family.*(headache|sick)|detector\s*went\s*off)/i, diagnosis: 'Carbon Monoxide Poisoning', lr: 50.0, evidence: 'CO detector alarm or household cluster symptoms — CO poisoning (LR 50.0)' },

        // Altitude sickness
        { pattern: /(altitude|elevation|mountain|hiking.*high).*(sick|headache|nausea|cant\s*breathe)|acute\s*mountain\s*sick|altitude\s*sickness/i, diagnosis: 'Acute Mountain Sickness', lr: 30.0, evidence: 'Altitude exposure symptoms — AMS (LR 30.0)' },

        // Near drowning
        { pattern: /(near\s*drown|almost\s*drown|pulled\s*from.*(pool|water)|submersion|aspirated\s*water|coughing\s*up\s*water)/i, diagnosis: 'Near Drowning / Submersion Injury', lr: 50.0, evidence: 'Near-drowning event (LR 50.0)' },

        // Frostbite specific
        { pattern: /(fingers|toes|ears|nose).*(white|numb|waxy|frozen|hard).*(cold|snow|ice|outside)/i, diagnosis: 'Frostbite', lr: 8.0, evidence: 'Cold exposure with tissue changes — frostbite (LR 8.0)' },

        // Snake bite — rattlesnake, copperhead specific
        { pattern: /(rattlesnake|copperhead|cottonmouth|coral\s*snake|pit\s*viper).*(bit|bite)|snake\s*bit.*\b(ankle|foot|leg|arm|hand)\b/i, diagnosis: 'Snake Bite', lr: 9.0, evidence: 'Venomous snake bite (LR 9.0)' },

        // Lyme disease — bullseye rash or tick + symptoms
        { pattern: /(bullseye|bull\s*eye|target|red\s*ring|ring.*bite)|erythema\s*migrans/i, diagnosis: 'Lyme Disease', lr: 9.0, evidence: 'Bullseye/target rash — Lyme disease (LR 9.0)' },
        { pattern: /tick.*(fever|joint|muscle|fatigue|rash).*(weeks?|days?)|(fever|fatigue|joint).*(after|following).*tick/i, diagnosis: 'Lyme Disease', lr: 5.0, evidence: 'Tick exposure + systemic symptoms (LR 5.0)' },

        // Anaphylaxis from sting
        { pattern: /(sting|stung|bee|wasp|hornet).*(throat|lip|tongue|face).*(swell|tight|close)/i, diagnosis: 'Anaphylaxis', lr: 9.0, evidence: 'Sting + airway/facial swelling — anaphylaxis (LR 9.0)' },
        { pattern: /(ate|eating|food|shrimp|shellfish|peanut|nut).*(throat|lip|tongue).*(swell|tight|close)/i, diagnosis: 'Anaphylaxis', lr: 9.0, evidence: 'Food allergen + airway involvement — anaphylaxis (LR 9.0)' },

        // Angioedema — swollen lips/tongue without trigger
        { pattern: /(lip|tongue|face).*(swell|swollen|puffy).*(eating|restaurant|food)/i, diagnosis: 'Angioedema', lr: 6.0, evidence: 'Facial swelling after eating — angioedema (LR 6.0)' },
        { pattern: /(ace\s*inhibitor|lisinopril|enalapril|ramipril).*(lip|tongue|face|swell|angioedema)/i, diagnosis: 'ACE Inhibitor Angioedema', lr: 8.0, evidence: 'ACE inhibitor + angioedema (LR 8.0)' },

        // Acetaminophen overdose
        { pattern: /(whole\s*bottle|entire\s*bottle|all\s*the).*(tylenol|acetaminophen)|took.*tylenol.*intentional/i, diagnosis: 'Acetaminophen Overdose', lr: 9.0, evidence: 'Intentional tylenol overdose (LR 9.0)' },
        { pattern: /(intentionally|intentional|on\s*purpose).*(took|swallowed).*(bottle|pills)/i, diagnosis: 'Intentional Overdose', lr: 8.0, evidence: 'Intentional overdose (LR 8.0)' },

        // Toxic alcohol ingestion
        { pattern: /(drank|swallowed|ingested).*(antifreeze|ethylene\s*glycol|windshield|methanol|wood\s*alcohol|rubbing\s*alcohol)/i, diagnosis: 'Toxic Alcohol Ingestion', lr: 9.0, evidence: 'Toxic alcohol ingestion (LR 9.0)' },
        { pattern: /antifreeze.*(drank|swallow|ingest|accident|thought)/i, diagnosis: 'Ethylene Glycol Poisoning', lr: 9.0, evidence: 'Antifreeze ingestion (LR 9.0)' },

        // Chlorine gas / chemical inhalation
        { pattern: /(bleach.*ammonia|ammonia.*bleach|mixed.*cleaning|chlorine\s*gas)/i, diagnosis: 'Chlorine Gas Exposure', lr: 50.0, evidence: 'Chlorine gas exposure from mixing cleaners (LR 50.0)' },

        // Stevens-Johnson Syndrome
        { pattern: /(skin|rash).*(peel|sheet|fall.*off|slough).*(medicine|medication|drug|seizure\s*med|lamictal|carbamazepine|allopurinol|bactrim)/i, diagnosis: 'Stevens-Johnson Syndrome', lr: 50.0, evidence: 'Skin desquamation + drug exposure — SJS/TEN (LR 50.0)' },
        { pattern: /mucosal.*(sore|ulcer|blister).*rash|(eye|mouth).*sore.*skin.*peel/i, diagnosis: 'Stevens-Johnson Syndrome', lr: 8.0, evidence: 'Mucocutaneous involvement — SJS (LR 8.0)' },

        // Melanoma - changing mole
        { pattern: /(mole|spot).*(chang|grow|bleed|itch|irregul|asymmetr|color).*(border|edge|bigger|different)/i, diagnosis: 'Melanoma', lr: 8.0, evidence: 'ABCDE changes in mole — melanoma concern (LR 8.0)' },

        // Breast cancer — hard immobile lump
        { pattern: /(lump|mass).*(breast|chest).*(hard|fixed|immobile|doesnt\s*move|stuck|growing)/i, diagnosis: 'Breast Cancer', lr: 6.0, evidence: 'Hard immobile breast lump (LR 6.0)' },

        // Bladder cancer — painless hematuria + smoker
        { pattern: /(blood.*urine|blood.*pee|pink\s*urine|red\s*urine).*(painless|no\s*pain|weeks|smoker|nothing\s*hurts)/i, diagnosis: 'Bladder Cancer', lr: 7.0, evidence: 'Painless hematuria — bladder cancer concern (LR 7.0)' },

        // Leukemia — bruising + fatigue
        { pattern: /(bruis|bruise).*(no\s*reason|everywhere|all\s*over|for\s*no\s*reason).*(tired|fatigue|exhausted|weak|pale)/i, diagnosis: 'Leukemia', lr: 7.0, evidence: 'Unexplained bruising + fatigue — leukemia concern (LR 7.0)' },

        // Lymphoma — painless nodes + B-symptoms
        { pattern: /(lymph|gland|node).*(neck|armpit|groin).*(weeks|months).*(fever|night\s*sweat|weight\s*loss)/i, diagnosis: 'Lymphoma', lr: 7.0, evidence: 'Persistent lymphadenopathy + B-symptoms — lymphoma (LR 7.0)' },

        // Metastatic cancer — back pain + weight loss + night
        { pattern: /back\s*pain.*(night|months|weeks).*(weight\s*loss|losing\s*weight|unintentional)/i, diagnosis: 'Metastatic Cancer', lr: 6.0, evidence: 'Back pain + constitutional symptoms — malignancy concern (LR 6.0)' },

        // Brain tumor — progressive headache + morning vomiting/vision
        { pattern: /headache.*(worse|progressi|getting\s*worse).*(week|month)/i, diagnosis: 'Brain tumor', lr: 15.0, evidence: 'Progressive headache — brain tumor concern (LR 15.0)' },
        { pattern: /headache.*(week|month).*(vision|blurry|nausea|morning)/i, diagnosis: 'Brain tumor', lr: 20.0, evidence: 'Subacute headache with red flags — brain tumor (LR 20.0)' },
        { pattern: /(blurry|blurred|vision).*morning.*headache|headache.*morning.*(vomit|nausea|vision|blurry)/i, diagnosis: 'Brain tumor', lr: 20.0, evidence: 'Morning headache with vision changes — brain tumor (LR 20.0)' },

        // Hypertensive emergency — HA + high BP
        { pattern: /(headache|vision\s*change|chest\s*pain).*(bp|blood\s*pressure).*(2[0-9][0-9]|1[89][0-9])/i, diagnosis: 'Hypertensive Emergency', lr: 30.0, evidence: 'Headache/symptoms + severe hypertension (LR 30.0)' },
        { pattern: /(headache|epistaxis|nosebleed).*(high\s*blood\s*pressure|hypertens)/i, diagnosis: 'Hypertensive Emergency', lr: 20.0, evidence: 'Symptoms + known hypertension (LR 20.0)' },
        { pattern: /(high\s*blood\s*pressure|hypertens).*(headache|nosebleed|vision\s*change)/i, diagnosis: 'Hypertensive Emergency', lr: 15.0, evidence: 'HTN + target organ symptoms (LR 15.0)' },
        { pattern: /(blood\s*pressure).*(usually|always|normally).*high/i, diagnosis: 'Hypertensive Emergency', lr: 10.0, evidence: 'Known hypertension with symptoms (LR 10.0)' },

        // AAA — pulsatile mass + back pain
        { pattern: /(pulsat|throb|pulse|beating).*(mass|belly|abdomen|lump)|(mass|belly|abdomen).*(pulsat|pulse|throb)/i, diagnosis: 'Abdominal Aortic Aneurysm', lr: 9.0, evidence: 'Pulsatile abdominal mass — AAA (LR 9.0)' },
        { pattern: /severe\s*back\s*pain.*(mass|bulge|pulse).*belly|aaa/i, diagnosis: 'Abdominal Aortic Aneurysm', lr: 7.0, evidence: 'Back pain + abdominal mass (LR 7.0)' },

        // Cauda equina emphasis — saddle anesthesia + urinary retention
        { pattern: /(saddle|groin|between.*legs).*(numb|cant\s*feel).*(cant\s*pee|cant\s*urinate|retention|bladder)/i, diagnosis: 'Cauda Equina Syndrome', lr: 9.0, evidence: 'Saddle anesthesia + urinary retention (LR 9.0)' },

        // Concussion — head injury + symptoms
        { pattern: /(hit|bump|bang|smack).*head.*(headache|dizzy|nausea|confus|vomit|blurry)|(headache|dizzy|nausea).*after.*(hit|fell.*head|head.*injury)/i, diagnosis: 'Concussion', lr: 20.0, evidence: 'Head trauma + neurologic symptoms — concussion (LR 20.0)' },
        { pattern: /headache.*after.*hit.*head|headache.*(yesterday|today).*(hit|bump|bang).*head/i, diagnosis: 'Concussion', lr: 15.0, evidence: 'Post-traumatic headache — concussion (LR 15.0)' },

        // Temporal Arteritis — headache + temples + jaw claudication
        { pattern: /(temple|temporal).*(pain|tender|hurt|ach)|headache.*(temple|temporal)/i, diagnosis: 'Temporal arteritis', lr: 15.0, evidence: 'Temporal pain/tenderness — GCA (LR 15.0)' },
        { pattern: /(jaw\s*(pain|hurt|ach|claudic)).*(chew|eat)|chew.*(jaw|temple)\s*(pain|hurt)/i, diagnosis: 'Temporal arteritis', lr: 20.0, evidence: 'Jaw claudication — GCA (LR 20.0)' },
        { pattern: /scalp\s*(tender|pain)|temples?\s*(are|feel)?\s*tender/i, diagnosis: 'Temporal arteritis', lr: 10.0, evidence: 'Scalp/temporal tenderness — GCA (LR 10.0)' },

        // Serotonin Syndrome — SSRI + agitation/tremor
        { pattern: /(new|started|changed|increased).*(antidepressant|ssri|sertraline|lexapro|prozac|zoloft|paxil|effexor|cymbalta).*(agitat|tremor|fever|muscle|jerk|sweat|rigid|clonus)/i, diagnosis: 'Serotonin Syndrome', lr: 25.0, evidence: 'Serotonergic med + symptoms — serotonin syndrome (LR 25.0)' },

        // Scabies — nocturnal interdigital itching
        { pattern: /itch.*(between|web|web\s*space).*finger.*(night|worse\s*at\s*night)/i, diagnosis: 'Scabies', lr: 25.0, evidence: 'Interdigital nocturnal itching — scabies (LR 25.0)' },
        { pattern: /(bumps?|itch).*(between|web).*finger|scabies|mite/i, diagnosis: 'Scabies', lr: 15.0, evidence: 'Interdigital rash — scabies (LR 15.0)' },

        // Dental abscess — tooth + fever + facial swelling
        { pattern: /tooth.*(swollen|swelling).*(face|jaw|cheek)|(face|jaw|cheek).*swollen.*tooth/i, diagnosis: 'Dental Abscess', lr: 7.0, evidence: 'Dental pain + facial swelling — dental abscess (LR 7.0)' },
        { pattern: /tooth.*(pain|hurt|kill|ach|throb).*(week|days|worse|fever)|bad\s*tooth.*(fever|swollen|pus)/i, diagnosis: 'Dental Abscess', lr: 5.0, evidence: 'Tooth pain with infection signs (LR 5.0)' },

        // Scabies — itch + between fingers + night
        { pattern: /(itch|itchy).*(between|web).*finger.*(night|worse\s*at\s*night)|scabies/i, diagnosis: 'Scabies', lr: 8.0, evidence: 'Interdigital nocturnal itching — scabies (LR 8.0)' },

        // Ringworm — round red patches with clear center
        { pattern: /round.*(red|pink).*(patches?|spots?).*(clear\s*center|ring|border)|ringworm|tinea/i, diagnosis: 'Tinea Corporis (Ringworm)', lr: 7.0, evidence: 'Annular lesion with central clearing — ringworm (LR 7.0)' },

        // IBD — diarrhea + blood + joint pain
        { pattern: /(bloody\s*diarrhea|blood.*diarrhea|diarrhea.*blood).*(joint|arthri|belly|weight\s*loss|months)/i, diagnosis: 'Inflammatory Bowel Disease', lr: 6.0, evidence: 'Bloody diarrhea + extraintestinal — IBD (LR 6.0)' },

        // Hyperventilation — tingling around mouth + hands
        { pattern: /tingl.*(hand|finger).*(mouth|lip|face)|anxiety.*(tingl|numb).*(hand|mouth)/i, diagnosis: 'Hyperventilation Syndrome', lr: 6.0, evidence: 'Perioral + hand paresthesias — hyperventilation (LR 6.0)' },

        // Costochondritis — tender chest wall
        { pattern: /(chest|sternum|rib).*(tender|hurt|pain).*(press|touch|push)|pain.*(press|touch).*(chest|sternum|rib)/i, diagnosis: 'Costochondritis', lr: 7.0, evidence: 'Chest wall tenderness reproducible on palpation (LR 7.0)' },

        // Rib fracture — blunt chest trauma
        { pattern: /(car\s*accident|mva|motor\s*vehicle|hit\s*chest|fell.*chest).*(chest|rib).*(pain|hurt).*(breath|move)/i, diagnosis: 'Rib Fracture', lr: 7.0, evidence: 'Blunt chest trauma + pain with respiration (LR 7.0)' },

        // Stable angina — exertional chest pain relieved by rest
        { pattern: /chest.*(pain|pressure|tight).*(walk|stair|exert|exercise|uphill).*(rest|stop|goes\s*away)/i, diagnosis: 'Stable Angina', lr: 7.0, evidence: 'Exertional chest pain relieved by rest — stable angina (LR 7.0)' },

        // Sciatica with leg radiation
        { pattern: /(back|low\s*back|lumbar).*pain.*(shoot|radiat|travel|go|down).*(leg|buttock|foot|calf)/i, diagnosis: 'Sciatica', lr: 7.0, evidence: 'Radiating lumbar pain to leg — sciatica (LR 7.0)' },

        // Allergic asthma — triggered by specific exposures
        { pattern: /(wheez|tight\s*chest).*(mow.*lawn|pollen|dust|cat|dog|allerg|grass)/i, diagnosis: 'Allergic Asthma', lr: 6.0, evidence: 'Trigger-induced wheezing — allergic asthma (LR 6.0)' },

        // CHF — orthopnea + edema
        { pattern: /(cant\s*lay\s*flat|orthopnea|sleep\s*propped|wake.*gasp).*(ankle|leg|foot).*(swell|swol|edema)/i, diagnosis: 'Congestive Heart Failure', lr: 7.0, evidence: 'Orthopnea + lower extremity edema — CHF (LR 7.0)' },

        // IPF — progressive DOE + clubbing
        { pattern: /(shortness\s*of\s*breath|dyspnea).*(months|years|progressi|worsening).*(dry\s*cough|clubbing|fingers?.*club)/i, diagnosis: 'Idiopathic Pulmonary Fibrosis', lr: 7.0, evidence: 'Progressive DOE + dry cough + clubbing — IPF (LR 7.0)' },

        // Bronchiolitis in infant
        { pattern: /(infant|baby|months\s*old).*(wheez|fast\s*breath|nasal\s*flar|retract).*(cold|runny\s*nose|viral)/i, diagnosis: 'Bronchiolitis', lr: 7.0, evidence: 'Infant wheezing after URI — bronchiolitis (LR 7.0)' },

        // Nasal foreign body in child
        { pattern: /(child|toddler|year\s*old).*(put|shoved|stuck).*(bead|small|object|button).*(nose|nostril)|foreign\s*body.*nose/i, diagnosis: 'Nasal Foreign Body', lr: 9.0, evidence: 'Pediatric nasal foreign body (LR 9.0)' },

        // Malaria — travel + fever
        { pattern: /(fever|sick|rash).*(travel|returned|came\s*back).*(africa|asia|south\s*america|mexico|india)/i, diagnosis: 'Malaria', lr: 5.0, evidence: 'Returned traveler with fever — malaria workup (LR 5.0)' },

        // Thyroid storm emphasis
        { pattern: /(racing\s*heart|heart\s*racing|tachycardia).*(sweat|agitat|shaking|fever).*(thyroid|graves|hyperthy)/i, diagnosis: 'Thyroid Storm', lr: 8.0, evidence: 'Hyperthyroid + systemic decompensation — thyroid storm (LR 8.0)' },

        // Chronic Subdural specific — delayed headache after minor head trauma in elderly
        { pattern: /(elderly|grandpa|grandma|\b7[0-9]\s*year|\b8[0-9]\s*year).*(fell|hit\s*head).*(weeks?\s*ago|days?\s*ago).*(confus|headache|drowsy|weak)/i, diagnosis: 'Chronic Subdural Hematoma', lr: 8.0, evidence: 'Elderly + remote head trauma + delayed symptoms — chronic SDH (LR 8.0)' },

        // Herpes Zoster stripe
        { pattern: /(blister|rash|pain).*(stripe|band|belt).*(one\s*side|chest|back|torso)|(stripe|band).*(one\s*side).*(blister|rash|pain)/i, diagnosis: 'Herpes Zoster (Shingles)', lr: 8.0, evidence: 'Dermatomal band rash/pain — shingles (LR 8.0)' },

        // Ovarian torsion priority over PID
        { pattern: /sudden.*(severe|worst|sharp).*(one\s*side|unilateral|left|right).*(pelvi|ovary|lower\s*abdom).*(nausea|vomit|twisting)/i, diagnosis: 'Ovarian Torsion', lr: 9.0, evidence: 'Sudden unilateral pelvic pain with nausea — ovarian torsion (LR 9.0)' },

        // Ovarian cyst (after appendectomy context)
        { pattern: /(right\s*(side|lower).*(pelvi|abdom)).*(appendix.*(removed|out)|no\s*appendix)/i, diagnosis: 'Ovarian Cyst', lr: 5.0, evidence: 'RLQ pain post-appendectomy — ovarian cyst concern (LR 5.0)' },

        // === v18 FIXES for v17 failure modes ===

        // Atrial Fibrillation — irregular/fluttering heart
        { pattern: /heart.*(all\s*over\s*the\s*place|irregular|skipping|fluttering|flutter)|heart\s*is\s*(all\s*over|irregular|flutter|skip)/i, diagnosis: 'Atrial Fibrillation', lr: 25.0, evidence: 'Irregularly irregular heart rhythm — AFib (LR 25.0)' },
        { pattern: /(heart|pulse)\s*(beating|going|is).*(irregular|all\s*over|fluttering|erratic)/i, diagnosis: 'Atrial Fibrillation', lr: 20.0, evidence: 'Irregular pulse — AFib (LR 20.0)' },

        // Pneumothorax — sudden sharp chest pain + cant breathe
        { pattern: /sharp\s*chest\s*pain.*(sudden|outta\s*nowhere|out\s*of\s*nowhere).*(cant\s*(take|catch)|hard\s*to\s*breathe|short\s*of\s*breath)/i, diagnosis: 'Pneumothorax', lr: 25.0, evidence: 'Sudden sharp chest pain + dyspnea — pneumothorax (LR 25.0)' },
        { pattern: /felt\s*a\s*pop.*chest|pop.*chest.*cant\s*breathe|chest.*(pop|popped).*breath/i, diagnosis: 'Pneumothorax', lr: 30.0, evidence: 'Chest pop + dyspnea — spontaneous pneumothorax (LR 30.0)' },

        // Tension Pneumothorax — chest trauma + getting worse + cant breathe
        { pattern: /(hit|trauma|blow|got\s*hit).*chest.*(cant|barely|hardly)\s*(breathe|take\s*a\s*breath)/i, diagnosis: 'Tension Pneumothorax', lr: 40.0, evidence: 'Chest trauma + respiratory compromise — tension pneumothorax (LR 40.0)' },
        { pattern: /chest\s*(trauma|injury|hit).*(feel\s*like\s*(im|gonna)\s*die|gonna\s*die|dying)/i, diagnosis: 'Tension Pneumothorax', lr: 35.0, evidence: 'Chest trauma + impending doom (LR 35.0)' },
        { pattern: /chest\s*trauma.*(getting\s*worse|cant\s*breathe|deteriorat|rapidly|fast)/i, diagnosis: 'Tension Pneumothorax', lr: 25.0, evidence: 'Chest trauma + deterioration — tension PTX (LR 25.0)' },
        { pattern: /(hit|got\s*hit).*chest.*(getting\s*worse|fast|rapid|one\s*side)/i, diagnosis: 'Tension Pneumothorax', lr: 30.0, evidence: 'Post-traumatic tension PTX pattern (LR 30.0)' },

        // Panic Attack — heart pounding + tingling + 20 minutes
        { pattern: /(heart\s*(is\s*)?pounding|racing\s*heart|chest\s*tight).*(cant\s*breathe|tingl).*(die|dying|heart\s*attack)/i, diagnosis: 'Panic Attack', lr: 20.0, evidence: 'Panic symptoms — panic attack (LR 20.0)' },
        { pattern: /(heart\s*pounding|chest\s*tight).*(tingl.*hands|tingl.*fingers|around\s*mouth)/i, diagnosis: 'Panic Attack', lr: 15.0, evidence: 'Perioral/peripheral tingling + panic — panic attack (LR 15.0)' },
        { pattern: /(nothing\s*triggered|no\s*reason).*(heart\s*pounding|cant\s*breathe|feel\s*like\s*dying)/i, diagnosis: 'Panic Attack', lr: 15.0, evidence: 'Unprovoked panic symptoms (LR 15.0)' },

        // Hypothyroidism — cold + weight gain + tired + dry skin
        { pattern: /(always\s*cold|cold\s*intoleran|feel\s*cold).*(tired|fatigue|exhausted).*(weight\s*gain|gaining\s*weight|constipat|dry\s*skin|hair\s*(loss|falling))/i, diagnosis: 'Hypothyroidism', lr: 30.0, evidence: 'Classic hypothyroid triad (LR 30.0)' },
        { pattern: /(always\s*cold|cold\s*intoleran).*(weight\s*gain|gaining\s*weight)/i, diagnosis: 'Hypothyroidism', lr: 20.0, evidence: 'Cold + weight gain — hypothyroid (LR 20.0)' },
        { pattern: /sluggish.*all\s*the\s*time.*(constipat|dry\s*skin|cold|hair\s*loss)/i, diagnosis: 'Hypothyroidism', lr: 15.0, evidence: 'Constitutional hypothyroid symptoms (LR 15.0)' },

        // Stimulant Intoxication — meth/cocaine/adderall + symptoms
        { pattern: /(smoked|took|used|snorted|injected).*(meth|crack|cocaine|amphet|adderall|speed|ice|crystal).*(racing|pounding|paranoi|agitat|sweat|dilated|pupils\s*(are\s*)?huge)/i, diagnosis: 'Stimulant Intoxication', lr: 30.0, evidence: 'Named stimulant + sympathomimetic syndrome (LR 30.0)' },
        { pattern: /(meth|crack|cocaine|adderall).*(heart\s*racing|heart\s*pounding|wont\s*sit\s*still|agitat)/i, diagnosis: 'Stimulant Intoxication', lr: 25.0, evidence: 'Stimulant use + cardiotoxicity (LR 25.0)' },
        { pattern: /(took\s*too\s*much|overdose).*(adderall|ritalin|concerta|vyvanse|stimulant)/i, diagnosis: 'Stimulant Intoxication', lr: 30.0, evidence: 'Stimulant overdose (LR 30.0)' },

        // ADEM — child + after virus + weakness/neuro
        { pattern: /(child|kid|\d+\s*year\s*old).*(after|following|developed).*(virus|cold|illness|infection).*(weakness|cant\s*walk|confus|headache|vision)/i, diagnosis: 'Acute Disseminated Encephalomyelitis', lr: 30.0, evidence: 'Post-viral neuro decline in child — ADEM (LR 30.0)' },
        { pattern: /(kid|child|my\s*(son|daughter|boy|girl)).*(had\s*a\s*)?(cold|virus|infection).*(now|and).*(weakness|cant\s*walk|confus|vision|legs)/i, diagnosis: 'Acute Disseminated Encephalomyelitis', lr: 30.0, evidence: 'Post-infectious encephalomyelitis (LR 30.0)' },
        { pattern: /(child|kid).*(weakness|cant\s*walk|legs).*(after|following).*(virus|cold|illness)/i, diagnosis: 'Acute Disseminated Encephalomyelitis', lr: 25.0, evidence: 'Child post-viral weakness — ADEM (LR 25.0)' },
        { pattern: /(kid|child).*developed.*(weakness|ataxia|cant\s*walk).*(after|following|plus).*(virus|cold|illness|headache|fever)/i, diagnosis: 'Acute Disseminated Encephalomyelitis', lr: 30.0, evidence: 'ADEM clinical pattern (LR 30.0)' },

        // Thyroid Storm — hyperthyroid + fever + racing heart
        { pattern: /hyperthy.*(fever|racing|fast\s*heart|sweat|shaking|agitat|haywire)/i, diagnosis: 'Thyroid Storm', lr: 25.0, evidence: 'Hyperthyroid decompensation — thyroid storm (LR 25.0)' },
        { pattern: /(fever|sweating|shaking).*(thyroid|graves|hyperthy).*(racing|fast\s*heart)/i, diagnosis: 'Thyroid Storm', lr: 20.0, evidence: 'Thyroid storm pattern (LR 20.0)' },

        // Hand Foot Mouth Disease — kid + mouth sores + hands/feet + fever
        { pattern: /(kid|child|toddler|daycare).*(fever).*(mouth\s*sores?|blisters?\s*(on|in)\s*(hands?|feet|mouth|tongue))/i, diagnosis: 'Hand Foot and Mouth Disease', lr: 25.0, evidence: 'HFM triad in child (LR 25.0)' },
        { pattern: /(mouth\s*sores?|mouth\s*ulcers?).*(hands?|feet|palms?|soles?)|(hands?|feet).*(mouth\s*sores?|blisters?)/i, diagnosis: 'Hand Foot and Mouth Disease', lr: 20.0, evidence: 'Hand-foot-mouth pattern (LR 20.0)' },

        // Bronchiolitis — infant + wheezing + after cold
        { pattern: /(infant|baby|month.?old|6\s*month).*(wheez|fast\s*breath|nasal\s*flar|retract|cold).*(after|following|turned\s*into)/i, diagnosis: 'Bronchiolitis', lr: 25.0, evidence: 'Infant wheezing post-URI — bronchiolitis (LR 25.0)' },
        { pattern: /(infant|baby|month.?old).*(wheez|fast\s*breath|breathing\s*fast|nasal\s*flar|retract)/i, diagnosis: 'Bronchiolitis', lr: 15.0, evidence: 'Infant respiratory distress — bronchiolitis (LR 15.0)' },

        // Hypothermia — cold + shivering + confused
        { pattern: /(found|out).*(outside|cold|snow|winter).*(shiver|cold\s*to\s*the\s*touch|confus|ice\s*cold)/i, diagnosis: 'Hypothermia', lr: 30.0, evidence: 'Cold exposure + altered mental status — hypothermia (LR 30.0)' },
        { pattern: /(skin|body).*(ice\s*cold|cold\s*to\s*touch|frozen).*(confus|shiver|lethargic)/i, diagnosis: 'Hypothermia', lr: 25.0, evidence: 'Cold skin + neurologic change (LR 25.0)' },
        { pattern: /(homeless|unsheltered|exposure).*(cold|winter|snow).*(shiver|confus|unresponsive)/i, diagnosis: 'Hypothermia', lr: 25.0, evidence: 'Environmental cold exposure (LR 25.0)' },

        // Psychotic Disorder — hearing voices + paranoid
        { pattern: /(hearing|talking\s*to|sees?).*(voices|people|someone|things).*(aren'?t\s*there|not\s*there|no\s*one)/i, diagnosis: 'Psychotic Disorder', lr: 30.0, evidence: 'Auditory/visual hallucinations — psychosis (LR 30.0)' },
        { pattern: /(paranoi|conspiracy|government|someone).*(watch|follow|spy|poison|chip|out\s*to\s*get)/i, diagnosis: 'Psychotic Disorder', lr: 25.0, evidence: 'Paranoid delusions — psychotic disorder (LR 25.0)' },

        // OSA — snoring + apneas + daytime sleepiness
        { pattern: /(snore|snoring).*(freight\s*train|loud|terrible|wakes|gasp).*(stop|apnea|breath)|(stop\s*breathing|gasp|choke).*(sleep|night)/i, diagnosis: 'Obstructive Sleep Apnea', lr: 25.0, evidence: 'Witnessed apneas + snoring — OSA (LR 25.0)' },
        { pattern: /(fall|falling)\s*asleep.*(desk|meeting|day|afternoon).*(snore|apnea|gasp)|(day|afternoon).*sleepy.*(snore|gasp)/i, diagnosis: 'Obstructive Sleep Apnea', lr: 20.0, evidence: 'Daytime sleepiness + snoring — OSA (LR 20.0)' },

        // Malignancy — unintentional weight loss + months + no appetite
        { pattern: /(lost|losing).*(weight|pounds?).*(without\s*trying|unintention|no\s*reason|dont\s*know\s*why)/i, diagnosis: 'Malignancy', lr: 15.0, evidence: 'Unintentional weight loss (LR 15.0)' },
        { pattern: /(clothes?.*(getting\s*loose|dont\s*fit|baggy)).*(tired|fatigue|appetite)/i, diagnosis: 'Malignancy', lr: 10.0, evidence: 'Weight loss + constitutional symptoms (LR 10.0)' },
        { pattern: /(lost\s*\d+\s*pounds?|30\s*pounds|20\s*pounds).*(months?|weeks?).*(no\s*appetite|not\s*hungry)/i, diagnosis: 'Malignancy', lr: 20.0, evidence: 'Significant unintentional weight loss + anorexia (LR 20.0)' },

        // Inguinal Hernia — lump near privates + comes and goes
        { pattern: /(lump|bulge).*(near|in|by).*(privates|groin|down\s*there|nuts|sack|boys)/i, diagnosis: 'Inguinal Hernia', lr: 25.0, evidence: 'Inguinal/groin lump — hernia (LR 25.0)' },
        { pattern: /(bulge|lump).*(pops?\s*out|comes\s*and\s*goes?|reduce).*(cough|lift|stand|push)/i, diagnosis: 'Inguinal Hernia', lr: 20.0, evidence: 'Reducible bulge with Valsalva — hernia (LR 20.0)' },

        // Postpartum Depression — after delivery + cant stop crying
        { pattern: /(had|since\s*having).*(my\s*)?baby.*(cant\s*stop|wont\s*stop)\s*cry/i, diagnosis: 'Postpartum Depression', lr: 25.0, evidence: 'Persistent crying post-delivery — PPD (LR 25.0)' },
        { pattern: /(had|since).*(baby|birth|delivery).*(weeks?\s*ago|months?\s*ago).*(sad|depress|cry|bonded|interest)/i, diagnosis: 'Postpartum Depression', lr: 20.0, evidence: 'Post-delivery mood symptoms — PPD (LR 20.0)' },
        { pattern: /(scary\s*thoughts?|bad\s*thoughts?|intrusive\s*thoughts?).*(baby|newborn|infant)/i, diagnosis: 'Postpartum Depression', lr: 15.0, evidence: 'Intrusive thoughts about baby — PPD (LR 15.0)' },

        // Colic — baby + inconsolable + hours + legs up
        { pattern: /(baby|infant|newborn).*(cries?|crying|screaming)\s*(for\s*)?(\d+\s*)?hours?/i, diagnosis: 'Colic', lr: 25.0, evidence: 'Infant prolonged crying — colic (LR 25.0)' },
        { pattern: /(baby|infant).*(pulls?|drawing?).*(legs?|knees?).*(chest|up|belly)/i, diagnosis: 'Colic', lr: 20.0, evidence: 'Infant drawing legs up — colic (LR 20.0)' },
        { pattern: /inconsolab.*(baby|infant|newborn)|baby.*inconsolab/i, diagnosis: 'Colic', lr: 15.0, evidence: 'Inconsolable infant (LR 15.0)' },

        // Status Epilepticus — continuous seizure or going on and on
        { pattern: /(seiz|shak|convuls).*(going\s*on\s*and\s*on|wont\s*stop|\d+\s*minutes?|back\s*to\s*back|continuous|nonstop)/i, diagnosis: 'Status Epilepticus', lr: 25.0, evidence: 'Prolonged/continuous seizure — status epilepticus (LR 25.0)' },
        { pattern: /status\s*epilepticus|seizure.*(20\s*min|15\s*min|10\s*min).*wont\s*stop/i, diagnosis: 'Status Epilepticus', lr: 30.0, evidence: 'Status epilepticus (LR 30.0)' },

        // Sexual Assault — specific and vague language
        { pattern: /(assault|raped|forced.*(sex|me|myself))/i, diagnosis: 'Sexual Assault', lr: 50.0, evidence: 'Explicit sexual assault disclosure (LR 50.0)' },
        { pattern: /(something\s*happened.*(party|last\s*night|bar|club|date)|need.*(forensic|rape\s*kit|sane))/i, diagnosis: 'Sexual Assault', lr: 40.0, evidence: 'Vague assault disclosure + forensic concern (LR 40.0)' },
        { pattern: /(need\s*to\s*be\s*checked\s*out|need.*(exam|evaluation).*(party|assault|happened))/i, diagnosis: 'Sexual Assault', lr: 30.0, evidence: 'Post-assault medical evaluation (LR 30.0)' },
        { pattern: /(dont\s*want\s*to\s*say\s*much|dont\s*remember\s*everything).*(happened|party|last\s*night)/i, diagnosis: 'Sexual Assault', lr: 35.0, evidence: 'Trauma-consistent vague disclosure (LR 35.0)' },
        { pattern: /(unwanted.*(sex|touch|contact)|non.?consensual|sane\s*exam|violated)/i, diagnosis: 'Sexual Assault', lr: 40.0, evidence: 'Non-consensual contact (LR 40.0)' },

        // CHF orthopnea + leg swelling
        { pattern: /(cant\s*lay\s*flat|cant\s*sleep\s*flat|sleep\s*propped|wake.*gasp).*(ankle|leg|foot).*(swell|swol|edema)/i, diagnosis: 'Congestive Heart Failure', lr: 20.0, evidence: 'Orthopnea + edema — CHF (LR 20.0)' },
        { pattern: /(wake\s*up.*gasping|paroxysmal.*dyspnea|pnd).*(ankle|leg).*(swell|swol)/i, diagnosis: 'Congestive Heart Failure', lr: 20.0, evidence: 'PND + edema — CHF (LR 20.0)' },
        { pattern: /(gained.*\d+.*pounds?|water.*weight|\d+\s*pounds?.*week).*(swell|breath|cant\s*walk)/i, diagnosis: 'Congestive Heart Failure', lr: 15.0, evidence: 'Volume overload — CHF (LR 15.0)' },

        // Caustic/Chemical Ingestion fix for pediatric + battery
        { pattern: /(toddler|child|baby|\d+\s*year).*(put|swallow|ate).*(battery|button|coin|small\s*object)/i, diagnosis: 'Button Battery Ingestion', lr: 30.0, evidence: 'Pediatric button battery ingestion (LR 30.0)' },
        { pattern: /(battery|coin|button).*(swallow|in\s*mouth|stuck).*(kid|child|toddler)/i, diagnosis: 'Button Battery Ingestion', lr: 25.0, evidence: 'Foreign body in child (LR 25.0)' },

        // Acute Urinary Retention
        { pattern: /(havent\s*(been\s*able\s*to\s*)?pee|cant\s*(pee|urinate|void))\s*(all\s*day|for\s*hours|hours)/i, diagnosis: 'Acute Urinary Retention', lr: 25.0, evidence: 'Inability to void — urinary retention (LR 25.0)' },
        { pattern: /bladder.*(burst|huge|distend|full).*(cant|unable)\s*(pee|urinate|void)/i, diagnosis: 'Acute Urinary Retention', lr: 25.0, evidence: 'Bladder distension + retention (LR 25.0)' },

        // Alcohol Withdrawal vs DTs — if confused/hallucinating it's DTs, else AW
        { pattern: /(quit|stop|last\s*drink).*(drinking|alcohol).*(shakes?|tremor|anxiety|sweat|nausea)(?!.*(confus|hallucin|see.*things))/i, diagnosis: 'Alcohol Withdrawal', lr: 15.0, evidence: 'Alcohol cessation + autonomic symptoms — AW (LR 15.0)' },

        // Chlamydia / STI — tighten to require genital context
        { pattern: /(yellowish|green|white|clear)\s*(drip|discharge).*(urinate|pee|burn)/i, diagnosis: 'Chlamydia', lr: 20.0, evidence: 'Urethral discharge + dysuria — STI (LR 20.0)' },
        { pattern: /(burns?|sting).*(pee|urinate).*(discharge|drip|after.*sex|unprotected)/i, diagnosis: 'Chlamydia', lr: 20.0, evidence: 'Dysuria + discharge — STI (LR 20.0)' },

        // Laceration/Crush injury — work/machine trauma
        { pattern: /(hand|arm|finger|leg).*(caught\s*in|stuck\s*in|mangled).*(machine|equipment)/i, diagnosis: 'Laceration/Crush Injury', lr: 25.0, evidence: 'Machine crush injury (LR 25.0)' },
        { pattern: /fell\s*off.*(ladder|scaffold|roof).*(arm|leg|hand).*(bleed|broke|bone)/i, diagnosis: 'Laceration/Crush Injury', lr: 20.0, evidence: 'Fall from height with extremity trauma (LR 20.0)' },

        // Polypharmacy / Medication Effect — elderly + many meds + falls
        { pattern: /(grandpa|grandma|elderly|\d+\s*medications?|\d+\s*pills?|many\s*meds?|lots?\s*of\s*medicine).*(fall|falling|dizz|unsteady)/i, diagnosis: 'Polypharmacy/Medication Effect', lr: 20.0, evidence: 'Elderly + polypharmacy + falls (LR 20.0)' },
        { pattern: /(fall|falling)\s*.*(on\s*\d+|takes?\s*\d+).*medication/i, diagnosis: 'Polypharmacy/Medication Effect', lr: 20.0, evidence: 'Falls + polypharmacy (LR 20.0)' },

        // Pyloric Stenosis — boost existing + projectile vomiting
        { pattern: /(\d+\s*week\s*old|3\s*week|newborn|infant).*projectile.*vomit|projectile\s*vomit.*(week\s*old|infant|newborn)/i, diagnosis: 'Pyloric Stenosis', lr: 30.0, evidence: 'Projectile vomiting in newborn — pyloric stenosis (LR 30.0)' },

        // Intussusception — boost
        { pattern: /(baby|infant).*(scream|cry).*(legs?|knees?).*(chest|up).*(calm|stop).*(few\s*minutes|episod)/i, diagnosis: 'Intussusception', lr: 25.0, evidence: 'Episodic screaming + leg drawing — intussusception (LR 25.0)' },
        { pattern: /(currant\s*jelly|jelly\s*(looking|like))\s*(stool|poop|diaper)/i, diagnosis: 'Intussusception', lr: 30.0, evidence: 'Currant jelly stool — intussusception (LR 30.0)' },

        // Placental Abruption — pregnant + hard belly + bleeding
        { pattern: /pregnant.*(belly|abdomen).*(hard|rigid|board|tense).*(bleed|blood|dark|pain)/i, diagnosis: 'Placental Abruption', lr: 40.0, evidence: 'Gravid rigid abdomen + bleeding — abruption (LR 40.0)' },
        { pattern: /pregnant.*(bleed|dark\s*blood|heavy\s*bleed).*(belly|abdom).*(hard|pain|rigid|tense)/i, diagnosis: 'Placental Abruption', lr: 35.0, evidence: 'Pregnancy + bleeding + abdominal rigidity — abruption (LR 35.0)' },
        { pattern: /pregnant.*(suddenly\s*(hard|painful|bleed)|belly.*(got|became|turned)\s*(hard|painful))/i, diagnosis: 'Placental Abruption', lr: 35.0, evidence: 'Sudden hardening/bleeding in pregnancy — abruption (LR 35.0)' },
        { pattern: /\d+\s*weeks?\s*pregnant.*(bleed|blood|pain|hard)/i, diagnosis: 'Placental Abruption', lr: 15.0, evidence: 'Third trimester pregnancy + bleeding concern (LR 15.0)' },

        // Slipped Capital Femoral Epiphysis — boost
        { pattern: /(overweight|obese|heavy|big).*(teen|teenager|adolesc|\d+\s*year).*(hip|knee|limp|waddle|cant\s*run)/i, diagnosis: 'Slipped Capital Femoral Epiphysis', lr: 20.0, evidence: 'Obese adolescent + hip/knee/gait (LR 20.0)' },

        // Subdural Hematoma priority over Concussion (elderly + delayed + confused, or anticoagulated)
        { pattern: /(grandpa|grandma|\b7\d|\b8\d|\b9\d)\s*.*(bumped|hit|fell|fall).*(head).*(confus|drowsy|weird|acting)/i, diagnosis: 'Subdural Hematoma', lr: 30.0, evidence: 'Elderly + head trauma + altered behavior — SDH (LR 30.0)' },
        { pattern: /(fell|hit).*head.*(week|days?)\s*ago.*(confus|drowsy|weird|different|forgetful)/i, diagnosis: 'Subdural Hematoma', lr: 25.0, evidence: 'Delayed post-trauma symptoms — SDH (LR 25.0)' },
        { pattern: /(warfarin|coumadin|eliquis|xarelto|blood\s*thinner|anticoag).*(fell|hit|bumped|fall).*(head|hit\s*my\s*head)/i, diagnosis: 'Subdural Hematoma', lr: 40.0, evidence: 'Anticoagulated + head trauma — SDH (LR 40.0)' },
        { pattern: /(warfarin|coumadin|eliquis|xarelto|blood\s*thinner|anticoag).*(head|confus|drowsy)/i, diagnosis: 'Subdural Hematoma', lr: 30.0, evidence: 'Anticoagulated + head symptoms — SDH (LR 30.0)' },

        // Vasovagal Syncope — specific trigger
        { pattern: /(passed\s*out|faint).*(blood\s*draw|standing\s*in\s*line|warm|hot|nausea|lightheaded|church|saw\s*blood)/i, diagnosis: 'Vasovagal Syncope', lr: 15.0, evidence: 'Triggered vasovagal syncope (LR 15.0)' },

        // Orbital Cellulitis priority over Conjunctivitis (eye + fever + swollen)
        { pattern: /eye.*(swollen\s*shut|bulging|proptos|pushed\s*out).*(fever|sick)/i, diagnosis: 'Orbital Cellulitis', lr: 25.0, evidence: 'Proptosis + fever — orbital cellulitis (LR 25.0)' },
        { pattern: /(kid|child).*eye.*(bulg|puff|swol).*(fever|hot)/i, diagnosis: 'Orbital Cellulitis', lr: 20.0, evidence: 'Pediatric eye swelling + fever — orbital cellulitis (LR 20.0)' },

        // Rhabdomyolysis — muscle + dark urine after exercise (bidirectional match)
        { pattern: /(worked\s*out|exercise|crossfit|workout|too\s*hard).*(muscle|body).*(killing|pain|hurt|ache|cant\s*move).*(dark|brown|tea|cola|tea\s*color)\s*(urine|pee)?/i, diagnosis: 'Rhabdomyolysis', lr: 40.0, evidence: 'Exertional muscle pain + dark urine — rhabdomyolysis (LR 40.0)' },
        { pattern: /(worked\s*out|workout|crossfit|too\s*hard).*(muscle|body).*(kill|pain|hurt|ache).*(pee|urine).*(dark|brown|tea|cola)/i, diagnosis: 'Rhabdomyolysis', lr: 40.0, evidence: 'Rhabdo pattern — workout + muscle pain + dark urine (LR 40.0)' },
        { pattern: /(dark|brown|tea|cola)\s*(urine|pee).*(muscle|workout|exertion|crossfit|work.*out)/i, diagnosis: 'Rhabdomyolysis', lr: 35.0, evidence: 'Dark urine after exertion — rhabdo (LR 35.0)' },
        { pattern: /muscles?\s*(are\s*)?killing.*me.*(pee|urine).*(dark|brown|tea|cola)/i, diagnosis: 'Rhabdomyolysis', lr: 40.0, evidence: 'Muscle pain + dark urine — rhabdo (LR 40.0)' },

        // Henoch-Schonlein Purpura priority in kids
        { pattern: /(child|kid|\d+\s*year).*(purple|purplish|bruise.?like)\s*(rash|spots?|bumps?).*(legs?|butt|buttock|belly)/i, diagnosis: 'Henoch-Schonlein Purpura (IgA Vasculitis)', lr: 25.0, evidence: 'Palpable purpura on legs/buttocks in child — HSP (LR 25.0)' },
        { pattern: /(purple|purpur|palpable).*(rash|spot).*(joint|arthri|belly|abdom).*child/i, diagnosis: 'Henoch-Schonlein Purpura (IgA Vasculitis)', lr: 20.0, evidence: 'HSP tetrad (LR 20.0)' },

        // Migraine priority over Angle Closure Glaucoma
        { pattern: /(throbbing|pulsat|pounding).*(one\s*side|unilateral|behind\s*(my|the)\s*eye).*(nausea|vomit|light|sound)/i, diagnosis: 'Migraine', lr: 15.0, evidence: 'Unilateral throbbing + POUND features — migraine (LR 15.0)' },

        // Temporal Arteritis — temple + throbbing + vision
        { pattern: /temple.*(tender|throb|pain|hurt).*(vision|blurry|eye)/i, diagnosis: 'Temporal arteritis', lr: 25.0, evidence: 'Temporal throbbing + vision change — GCA (LR 25.0)' },

        // Iron Deficiency Anemia — boost
        { pattern: /(exhaust|tired|drag).*(pale|look\s*pale|ghost).*(period|heavy\s*period|cycle)/i, diagnosis: 'Iron Deficiency Anemia', lr: 20.0, evidence: 'Pallor + menorrhagia — iron deficiency (LR 20.0)' },
        { pattern: /(craving|eat).*ice.*(tired|pale|dizzy)/i, diagnosis: 'Iron Deficiency Anemia', lr: 25.0, evidence: 'Pica for ice + fatigue — iron deficiency (LR 25.0)' },

        // Opioid Withdrawal — specific
        { pattern: /(ran\s*out|stopped|quit).*(pain\s*pills?|percocet|norco|oxy|heroin|methadone|suboxone|opioid).*(body\s*ach|cant\s*stop.*puk|diarrhea|chills|restless)/i, diagnosis: 'Opioid Withdrawal', lr: 25.0, evidence: 'Opioid cessation + withdrawal syndrome (LR 25.0)' },
        { pattern: /(dope\s*sick|kicking|cold\s*turkey).*(body\s*ach|chills|diarrhea|crawling\s*out)/i, diagnosis: 'Opioid Withdrawal', lr: 25.0, evidence: 'Opioid withdrawal slang + symptoms (LR 25.0)' },

        // === v20 top-3 lifters: targeted rules for remaining misses ===

        // Pneumonia — chest pain with cough + fever
        { pattern: /(chest|cough).*(fever|chills|temp.*10[0-4]).*(cough|green|yellow|sputum|crackles)/i, diagnosis: 'Pneumonia', lr: 25.0, evidence: 'Cough + fever + chest pain — pneumonia (LR 25.0)' },
        { pattern: /(coughing\s*up\s*(green|yellow|rust|blood))|(fever\s*10[0-5]).*cough/i, diagnosis: 'Pneumonia', lr: 25.0, evidence: 'Productive cough or high fever + cough — pneumonia (LR 25.0)' },
        { pattern: /(started\s*as\s*a\s*cold|started\s*as\s*(the\s*)?flu).*(now|cant\s*stop).*(cough|fever|chest)/i, diagnosis: 'Pneumonia', lr: 20.0, evidence: 'URI progressing to LRTI — pneumonia (LR 20.0)' },

        // Appendicitis — periumbilical migrating to RLQ
        { pattern: /(started|began|was).*(belly\s*button|periumbilic|middle\s*belly|umbilic).*(moved|migrat|now|shifted).*(right\s*lower|rlq|lower\s*right)/i, diagnosis: 'Appendicitis', lr: 40.0, evidence: 'Periumbilical→RLQ migration — classic appendicitis (LR 40.0)' },
        { pattern: /(lower\s*right|right\s*lower|rlq).*(belly|abdom).*(pain|hurt).*(nausea|vomit|puke|fever|cant\s*eat)/i, diagnosis: 'Appendicitis', lr: 20.0, evidence: 'RLQ + systemic — appendicitis (LR 20.0)' },
        { pattern: /(right\s*side|lower\s*right).*(killing|kill|hurt).*(cant\s*stand|cant\s*straighten|curl\s*up)/i, diagnosis: 'Appendicitis', lr: 20.0, evidence: 'Severe RLQ pain with guarding — appendicitis (LR 20.0)' },

        // COPD Exacerbation — known COPD + worsening
        { pattern: /(copd|emphysema).*(acting\s*up|flaring|exacerbation|worse|cant\s*breathe|more\s*cough)/i, diagnosis: 'COPD exacerbation', lr: 30.0, evidence: 'Known COPD with worsening — exacerbation (LR 30.0)' },
        { pattern: /(lungs|chest).*(fire|burn|on\s*fire).*(cough|breath).*(green|yellow|gunk|stuff)/i, diagnosis: 'COPD exacerbation', lr: 20.0, evidence: 'Productive cough + dyspnea — COPD/pneumonia (LR 20.0)' },
        { pattern: /(inhaler|rescue\s*inhaler|nebulizer).*(not\s*helping|not\s*working|more.*puffs)/i, diagnosis: 'COPD exacerbation', lr: 25.0, evidence: 'Inhaler ineffective — exacerbation (LR 25.0)' },

        // Diverticulitis — LLQ + fever + constipation
        { pattern: /(lower\s*left|left\s*lower|llq).*(belly|abdom|side).*(fever|constip|cramp)/i, diagnosis: 'Diverticulitis', lr: 30.0, evidence: 'LLQ pain + fever + constipation — diverticulitis (LR 30.0)' },
        { pattern: /(lower\s*left).*(pain|hurt).*(fever|chills|constip)/i, diagnosis: 'Diverticulitis', lr: 25.0, evidence: 'LLQ + systemic — diverticulitis (LR 25.0)' },
        { pattern: /diverticul|diverticulitis/i, diagnosis: 'Diverticulitis', lr: 30.0, evidence: 'Named diverticulitis (LR 30.0)' },

        // Gastrointestinal Bleeding — melena/hematochezia + dizziness
        { pattern: /(blood|red|bright\s*red|tarry|black|tar)\s*(in\s*(my\s*)?)?(stool|poop).*(dizz|lightheaded|weak|faint)/i, diagnosis: 'Gastrointestinal Bleeding', lr: 30.0, evidence: 'Hematochezia/melena + hemodynamic — GI bleed (LR 30.0)' },
        { pattern: /(blood|bright\s*red).*(stool|poop|toilet).*(dizz|lightheaded|weak)/i, diagnosis: 'Gastrointestinal Bleeding', lr: 30.0, evidence: 'Rectal bleeding + dizziness — GI bleed (LR 30.0)' },
        { pattern: /(threw\s*up|vomit).*(coffee\s*ground|blood|bloody|dark)/i, diagnosis: 'Gastrointestinal Bleeding', lr: 35.0, evidence: 'Coffee-ground emesis or hematemesis — upper GI bleed (LR 35.0)' },

        // Constipation priority over Appendicitis for elderly + no BM
        { pattern: /(havent|cant|haven'?t).*(pooped|bowel.*movement|gone\s*to\s*the\s*bathroom).*(week|days?)|\d+\s*days?.*no\s*(poop|bowel|stool)/i, diagnosis: 'Constipation', lr: 30.0, evidence: 'Absent bowel movements for days — constipation (LR 30.0)' },
        { pattern: /(belly|stomach|abdom).*(hard|rock|bloated|full).*(no\s*(poop|bowel)|cant\s*go|havent\s*pooped)/i, diagnosis: 'Constipation', lr: 25.0, evidence: 'Distended abdomen + obstipation — constipation (LR 25.0)' },

        // Peritonsillar Abscess — "hot potato voice" + deviation
        { pattern: /(cant\s*swallow|hot\s*potato|muffled\s*voice|drool).*(one\s*side|throat|huge|swollen)|(one\s*side|unilateral).*(throat|tonsil).*(huge|swollen|bulge)/i, diagnosis: 'Peritonsillar Abscess', lr: 35.0, evidence: 'Unilateral tonsillar swelling + hot potato voice — PTA (LR 35.0)' },
        { pattern: /(cant\s*open\s*(my\s*)?(jaw|mouth)|trismus).*(throat|tonsil|swallow)/i, diagnosis: 'Peritonsillar Abscess', lr: 30.0, evidence: 'Trismus + throat — PTA (LR 30.0)' },

        // Temporal Arteritis — expand age-agnostic match for peds test CCs
        { pattern: /(temple|temporal)\s*(area|region|side)?\s*(tender|throb|pain|hurt).*(vision|blur|eye)/i, diagnosis: 'Temporal arteritis', lr: 30.0, evidence: 'Temple pain + vision changes — GCA (LR 30.0)' },
        { pattern: /(temple|temporal).*(tender|hurt|pain|throb)/i, diagnosis: 'Temporal arteritis', lr: 20.0, evidence: 'Temporal tenderness — GCA concern (LR 20.0)' },

        // Mesenteric Ischemia — post-prandial + weight loss + elderly
        { pattern: /(terrible|severe|bad).*(belly|stomach|abdom).*pain.*(after\s*(i\s*)?eat|after\s*meal|afraid.*eat|lose|losing).*weight/i, diagnosis: 'Mesenteric Ischemia', lr: 30.0, evidence: 'Post-prandial pain + weight loss + food avoidance — mesenteric ischemia (LR 30.0)' },
        { pattern: /(afraid\s*to\s*eat|fear\s*of\s*eating).*(pain|hurt|belly)|food.*(cause|triggers?).*(worst|severe).*pain/i, diagnosis: 'Mesenteric Ischemia', lr: 30.0, evidence: 'Food fear from pain — mesenteric ischemia (LR 30.0)' },

        // Impetigo — honey-colored crusts
        { pattern: /(honey.?color|honey.?crust|golden\s*crust)|(crusty|crust).*(mouth|nose|face).*(kid|child|toddler)/i, diagnosis: 'Impetigo', lr: 35.0, evidence: 'Honey-colored crusted lesions — impetigo (LR 35.0)' },
        { pattern: /(yellow|honey).*(crust|sore).*(spread|kid|face|chin)/i, diagnosis: 'Impetigo', lr: 25.0, evidence: 'Yellow-crusted lesions — impetigo (LR 25.0)' },

        // Bronchiolitis — infant + wheezing + URI
        { pattern: /(infant|baby|\d+\s*month.?old|months?\s*old).*(wheez|fast\s*breath|nasal\s*flar|retract|grunt)/i, diagnosis: 'Bronchiolitis', lr: 30.0, evidence: 'Infant respiratory distress — bronchiolitis (LR 30.0)' },
        { pattern: /(runny\s*nose|cold|congested).*(turned\s*into|now).*(fast\s*breath|wheez|trouble\s*breath).*(infant|baby|month)/i, diagnosis: 'Bronchiolitis', lr: 30.0, evidence: 'URI → LRTI in infant — bronchiolitis (LR 30.0)' },

        // Sciatica — fix diagnosis name + electrical override (must exceed Electrical Injury LR 50)
        { pattern: /(back|low\s*back|lumbar).*(shoot|radiat|electric|shock|travel).*(leg|buttock|foot|calf|thigh)/i, diagnosis: 'Sciatica', lr: 80.0, evidence: 'Radiating lumbar pain — sciatica (LR 80.0)' },
        { pattern: /(shoot|electric|shock).*(down|from).*(butt|buttock|back).*(leg|foot|calf)/i, diagnosis: 'Sciatica', lr: 70.0, evidence: 'Radiculopathy — sciatica (LR 70.0)' },
        { pattern: /(back\s*pain|lumbar\s*pain).*(down|goes|to|into).*(leg|foot|knee|calf|thigh|buttock|butt)/i, diagnosis: 'Sciatica', lr: 60.0, evidence: 'Back-to-leg radiation — sciatica (LR 60.0)' },

        // Alcohol Withdrawal (non-DTs) — shakes without confusion/hallucinations
        { pattern: /(quit|stop|last\s*drink).*(yesterday|\d+\s*days?\s*ago|2\s*days).*(shakes?|tremor|sweat|anxi).*(?!.*(confus|halluc|see.*things|seeing))/i, diagnosis: 'Alcohol Withdrawal', lr: 25.0, evidence: 'Alcohol cessation + mild autonomic — AW (LR 25.0)' },
        { pattern: /trying\s*to\s*detox|home\s*detox|detox.*(shakes?|sweat|anxious)/i, diagnosis: 'Alcohol Withdrawal', lr: 20.0, evidence: 'Home detox + symptoms — AW (LR 20.0)' },

        // NMS priority — antipsychotic + rigid + fever (already exists, boosting)
        { pattern: /(haldol|haloperidol|risperdal|abilify|seroquel|zyprexa|antipsych).*(rigid|rigidity|fever|temp|muscle|stiff|confus)/i, diagnosis: 'Neuroleptic Malignant Syndrome', lr: 35.0, evidence: 'Antipsychotic + rigidity + fever — NMS (LR 35.0)' },
        { pattern: /(started|began|new).*(haldol|antipsych|neurolept).*(rigid|fever|muscle|confus|AMS)/i, diagnosis: 'Neuroleptic Malignant Syndrome', lr: 40.0, evidence: 'New antipsychotic + NMS features (LR 40.0)' },

        // Heat Exhaustion — festival/sun/outdoor + nausea
        { pattern: /(sun|festival|outside|outdoor|heat).*(dizz|nausea|headache|cramp|thirsty|overheat)/i, diagnosis: 'Heat Exhaustion', lr: 30.0, evidence: 'Heat/sun exposure + symptoms — heat exhaustion (LR 30.0)' },
        { pattern: /(drenched.*sweat|profuse.*sweat|clammy).*(heat|hot|sun|outside)/i, diagnosis: 'Heat Exhaustion', lr: 25.0, evidence: 'Diaphoresis + heat exposure (LR 25.0)' },

        // Iron Deficiency Anemia — stairs + pale + heavy period
        { pattern: /(tired|exhaust|drag).*(month|weeks).*(short\s*of\s*breath|stair|pale|ghost|cravings?.*ice|heavy\s*period)/i, diagnosis: 'Iron Deficiency Anemia', lr: 30.0, evidence: 'Chronic fatigue + SOB + pallor or menorrhagia — anemia (LR 30.0)' },
        { pattern: /(drag|tired|exhaust).*stair|short\s*of\s*breath.*(going\s*up\s*stair|climbing)/i, diagnosis: 'Iron Deficiency Anemia', lr: 20.0, evidence: 'Exertional dyspnea on stairs — anemia (LR 20.0)' },

        // Pulmonary Embolism — sudden dyspnea + pleuritic + immobilized
        { pattern: /(sudden|out\s*of\s*nowhere|outta\s*nowhere).*(cant|couldnt|couldn)\s*breathe|suddenly.*cant\s*catch.*breath/i, diagnosis: 'Pulmonary Embolism', lr: 30.0, evidence: 'Sudden dyspnea — PE concern (LR 30.0)' },
        { pattern: /(sharp|stabbing).*(chest|side).*(breath|inspir|breathing\s*in).*(leg\s*swell|surgery|flight|immobil|cough\s*blood)/i, diagnosis: 'Pulmonary Embolism', lr: 40.0, evidence: 'Pleuritic pain + VTE risk — PE (LR 40.0)' },
        { pattern: /(leg.*swollen|dvt|flight|surgery|immobil).*(cant\s*breathe|short\s*of\s*breath|chest.*breath)/i, diagnosis: 'Pulmonary Embolism', lr: 35.0, evidence: 'VTE risk factor + dyspnea — PE (LR 35.0)' },

        // Migraine — POUND classic
        { pattern: /(throb|pulsat|pound).*(one\s*side|unilateral|behind.*eye|temple).*(nausea|vomit|light|sound)/i, diagnosis: 'Migraine', lr: 30.0, evidence: 'POUND features — migraine (LR 30.0)' },
        { pattern: /(head.*pound|throb.*head|pulsat.*head).*(bright|loud|light|sound).*(worse|sensitive|bother)/i, diagnosis: 'Migraine', lr: 25.0, evidence: 'Photophobia/phonophobia + throbbing HA — migraine (LR 25.0)' },

        // Pyelonephritis — back + fever + dysuria
        { pattern: /(hurt|burn).*(pee|urin).*(back|flank|side).*(fever|chills|100|101|102|103)/i, diagnosis: 'Pyelonephritis', lr: 35.0, evidence: 'Dysuria + flank/back + fever — pyelonephritis (LR 35.0)' },
        { pattern: /(fever|chills).*(flank|back|side).*(burn|hurt|pee|urin)/i, diagnosis: 'Pyelonephritis', lr: 35.0, evidence: 'Fever + flank + dysuria — pyelonephritis (LR 35.0)' },
        { pattern: /(uti|urinary).*(now|turned\s*into|got).*(back\s*pain|flank|fever|chills)/i, diagnosis: 'Pyelonephritis', lr: 30.0, evidence: 'UTI progressing to upper — pyelonephritis (LR 30.0)' },

        // Pharyngitis / Strep — throat + fever + exudate
        { pattern: /(throat|swallow).*(fire|burn|hurt|kill).*(fever|white\s*spots?|swollen\s*glands)/i, diagnosis: 'Pharyngitis', lr: 25.0, evidence: 'Throat + fever + exudate — pharyngitis (LR 25.0)' },
        { pattern: /hurts?\s*(so\s*bad\s*)?to\s*swallow.*(fever|chill|water)/i, diagnosis: 'Pharyngitis', lr: 25.0, evidence: 'Odynophagia + fever — pharyngitis (LR 25.0)' },
        { pattern: /strep\s*throat|streptococcal/i, diagnosis: 'Strep Pharyngitis', lr: 30.0, evidence: 'Named strep (LR 30.0)' },

        // Nursemaid Elbow — toddler + arm + pulled/yanked
        { pattern: /(toddler|\d+\s*year\s*old|\d+\s*yo).*(wont\s*use|cries|holds?|still|limp).*(arm|hand).*(pulled|yanked|swung)/i, diagnosis: 'Nursemaid Elbow', lr: 40.0, evidence: 'Toddler + arm immobility after pull — nursemaid (LR 40.0)' },
        { pattern: /(pulled|yanked).*(arm|hand|up).*(cries|wont\s*use|limp|holds?)/i, diagnosis: 'Nursemaid Elbow', lr: 35.0, evidence: 'Pull-injury + arm refusal — nursemaid (LR 35.0)' },

        // Epiglottitis — kid + drooling + tripod + stridor
        { pattern: /(kid|child|my\s*(son|daughter|child)).*(drool).*(stridor|breath|muffled|tripod|leaning\s*forward)/i, diagnosis: 'Epiglottitis', lr: 40.0, evidence: 'Pediatric drooling + stridor/tripod — epiglottitis (LR 40.0)' },
        { pattern: /(leaning\s*forward|tripod\s*position|sit.*straight\s*up).*(drool|stridor|cant\s*swallow|muffled)/i, diagnosis: 'Epiglottitis', lr: 40.0, evidence: 'Tripod + airway symptoms — epiglottitis (LR 40.0)' },

        // Atrial Fibrillation — irregular + palpitations (strong)
        { pattern: /(heart|pulse).*(all\s*over\s*the\s*place|irregular|skip|flutter|erratic|beating\s*irregular)/i, diagnosis: 'Atrial Fibrillation', lr: 35.0, evidence: 'Irregular rhythm — AFib (LR 35.0)' },
        { pattern: /(palpit|heart\s*flutter|skipping\s*beats?).*(short.*breath|dizz|lightheaded|chest)/i, diagnosis: 'Atrial Fibrillation', lr: 30.0, evidence: 'Palpitations + symptom — AFib (LR 30.0)' },

        // CHF — orthopnea + edema + PND
        { pattern: /(cant\s*lay\s*flat|sleep\s*propped|wake.*gasp|pnd|paroxysmal).*(swell|ankle|leg|foot|edema)/i, diagnosis: 'Congestive Heart Failure', lr: 35.0, evidence: 'Orthopnea + PND + edema — CHF (LR 35.0)' },
        { pattern: /(wake.*night|wake.*up).*(gasp|short\s*of\s*breath).*(ankles?|legs?|swol)/i, diagnosis: 'Congestive Heart Failure', lr: 35.0, evidence: 'PND + pedal edema — CHF (LR 35.0)' },
        { pattern: /(gained.*\d+.*pounds?|\d+\s*pounds?.*week).*(breath|swell|cant\s*walk)/i, diagnosis: 'Congestive Heart Failure', lr: 30.0, evidence: 'Weight gain + dyspnea — CHF (LR 30.0)' },

        // Sepsis — fever + infection + hypotension/AMS/tachy
        { pattern: /(fever|chills).*(infection|cut|wound|cath).*(low\s*bp|lightheaded|confus|barely\s*conscious|racing\s*heart)/i, diagnosis: 'Sepsis', lr: 35.0, evidence: 'Fever + infection source + end-organ dysfunction — sepsis (LR 35.0)' },
        { pattern: /(feel\s*like\s*(im\s*)?dying|feel\s*awful).*(fever|chill).*(confus|weak|racing|lightheaded)/i, diagnosis: 'Sepsis', lr: 30.0, evidence: 'Systemic sepsis pattern (LR 30.0)' },

        // Cholecystitis — RUQ + post-fatty meal + vomiting + shoulder
        { pattern: /(right\s*upper|ruq|gallbladder|under.*rib).*(after.*(burger|greasy|fatty|meal|eat)|fatty|greasy|burger).*(puk|vomit|nausea|shoulder)/i, diagnosis: 'Cholecystitis', lr: 35.0, evidence: 'RUQ + post-prandial + vomiting — cholecystitis (LR 35.0)' },
        { pattern: /gallbladder.*(killing|hurt|pain)/i, diagnosis: 'Cholecystitis', lr: 35.0, evidence: 'Patient-reported gallbladder pain (LR 35.0)' },

        // Polypharmacy — medications + dizzy/falls
        { pattern: /(added|new|started).*(medicine|medication|med|drug|pill).*(dizz|wooz|unsteady|fall|off\s*balance)/i, diagnosis: 'Polypharmacy/Medication Effect', lr: 30.0, evidence: 'New medication + dizziness — polypharmacy (LR 30.0)' },
        { pattern: /(takes?|on)\s*(\d+|like\s*\d+|a\s*lot\s*of|many|multiple)\s*(medication|pill|med|prescription).*(dizz|fall|unsteady|off)/i, diagnosis: 'Polypharmacy/Medication Effect', lr: 30.0, evidence: 'Many meds + falls — polypharmacy (LR 30.0)' },

        // UTI — burns + frequent urination
        { pattern: /(burns?|sting|razor\s*blades).*(pee|urinat)/i, diagnosis: 'Urinary Tract Infection', lr: 30.0, evidence: 'Dysuria — UTI (LR 30.0)' },
        { pattern: /(pee|urin).*(smells?|funny|foul|awful|bad|strong).*(burn|hurt|pain)/i, diagnosis: 'Urinary Tract Infection', lr: 25.0, evidence: 'Malodorous urine + dysuria — UTI (LR 25.0)' },

        // Nephrolithiasis — flank + colicky + blood in urine
        { pattern: /(worst\s*pain|severe).*(flank|side|back).*(comes?\s*(and\s*)?goes?|wave|cant\s*sit\s*still)/i, diagnosis: 'Nephrolithiasis', lr: 40.0, evidence: 'Colicky flank pain — kidney stone (LR 40.0)' },
        { pattern: /(flank|side|back).*(pain|hurt|kill).*(pee|blood\s*in.*(pee|urin))/i, diagnosis: 'Nephrolithiasis', lr: 35.0, evidence: 'Flank + hematuria — kidney stone (LR 35.0)' },
        { pattern: /(groin|inguinal).*(radiat|go|goes).*(flank|back|side)/i, diagnosis: 'Nephrolithiasis', lr: 30.0, evidence: 'Radiation to groin — kidney stone (LR 30.0)' },

        // DVT — asymmetric leg swelling + warmth
        { pattern: /(one\s*leg|\bleg\b).*(bigger|larger|swol|swell).*(warm|hot|tender|red|hurt)/i, diagnosis: 'Deep Vein Thrombosis', lr: 30.0, evidence: 'Unilateral leg swelling + warmth — DVT (LR 30.0)' },
        { pattern: /(calf|leg).*swollen.*(red|warm|hot|painful).*(sitting|flight|immobil|travel)/i, diagnosis: 'Deep Vein Thrombosis', lr: 35.0, evidence: 'Unilateral swelling + immobilization — DVT (LR 35.0)' },

        // Aortic Dissection — tearing/ripping pain + back
        { pattern: /(tear|rip|tearing|ripping).*(chest|back|shoulder|between\s*(my\s*)?shoulder)/i, diagnosis: 'Aortic Dissection', lr: 40.0, evidence: 'Tearing/ripping chest-back pain — aortic dissection (LR 40.0)' },
        { pattern: /(worst\s*pain|severe).*(back|chest).*(pass\s*out|syncop|unequal|pulse|bp\s*(different|unequal))/i, diagnosis: 'Aortic Dissection', lr: 35.0, evidence: 'Severe back/chest + syncope/unequal pulses (LR 35.0)' },

        // Croup — barking cough
        { pattern: /(bark|seal).*(cough|sound)|cough.*(bark|seal)|sounds?\s*like\s*a?\s*(seal|dog)/i, diagnosis: 'Croup', lr: 45.0, evidence: 'Barking/seal cough — pathognomonic croup (LR 45.0)' },
        { pattern: /(toddler|baby|child).*cough.*(weird|strange|loud|barking)/i, diagnosis: 'Croup', lr: 30.0, evidence: 'Pediatric abnormal cough — croup (LR 30.0)' },

        // DTs — alcohol + confusion/hallucinations/sweats
        { pattern: /(quit|stop|cold\s*turkey).*(drink|alcohol).*(sweat|shak|tremor|see.*things|hallucin|confus|bugs|spider)/i, diagnosis: 'Delirium Tremens', lr: 40.0, evidence: 'Alcohol cessation + hallucinations/confusion — DTs (LR 40.0)' },

        // Opioid Overdose priority — Narcan/pinpoint/not breathing
        { pattern: /(took|swallow).*(bunch\s*of\s*pills?|bottle\s*of\s*pills?).*(barely\s*(breath|conscious)|wont\s*wake|unresponsive|blue\s*lips)/i, diagnosis: 'Opioid Overdose', lr: 45.0, evidence: 'Intentional pill OD + respiratory depression — opioid OD (LR 45.0)' },
        { pattern: /(found|bathroom).*floor.*(not\s*breath|blue\s*lips|pinpoint|barely\s*conscious)/i, diagnosis: 'Opioid Overdose', lr: 40.0, evidence: 'Found unresponsive — opioid OD (LR 40.0)' },

        // Bipolar mania — "feel amazing + havent slept"
        { pattern: /(feel\s*amazing|can\s*do\s*anything|invincible|on\s*top\s*of\s*the\s*world).*(havent\s*slept|no\s*sleep|up\s*for\s*days)/i, diagnosis: 'Bipolar Disorder — Manic Episode', lr: 40.0, evidence: 'Grandiosity + decreased sleep — mania (LR 40.0)' },
        { pattern: /(racing\s*thoughts|thoughts\s*racing|mind\s*won'?t\s*stop).*(energy|cant\s*sleep|amazing|spending)/i, diagnosis: 'Bipolar Disorder — Manic Episode', lr: 35.0, evidence: 'Flight of ideas + decreased need for sleep — mania (LR 35.0)' },

        // Vasovagal Syncope — classic trigger
        { pattern: /(standing|church|blood\s*draw|warm|hot|sweat).*(passed\s*out|blacked\s*out|faint)/i, diagnosis: 'Vasovagal Syncope', lr: 25.0, evidence: 'Triggered syncope — vasovagal (LR 25.0)' },
        { pattern: /(got\s*lightheaded|dizzy).*(hot|sweat|warm).*(floor|ground|passed\s*out|next\s*thing)/i, diagnosis: 'Vasovagal Syncope', lr: 25.0, evidence: 'Prodrome + syncope — vasovagal (LR 25.0)' },

        // Urticaria — new med + itchy bumps
        { pattern: /(took|new).*(medicine|pill|med|drug|antibiotic).*(bumps|hives|itchy|welts|rash).*(all\s*over|everywhere)/i, diagnosis: 'Urticaria', lr: 35.0, evidence: 'New med + generalized urticarial rash (LR 35.0)' },
        { pattern: /(hives|welts|itchy\s*bumps).*(moving|popping|all\s*over|everywhere|spreading)/i, diagnosis: 'Urticaria', lr: 25.0, evidence: 'Migratory wheals — urticaria (LR 25.0)' },

        // IPV — explicit partner violence phrasing
        { pattern: /(boyfriend|girlfriend|husband|wife|partner|spouse).*(punch|hit|kick|choke|beat|strangle|throw|threw|slam|slap)/i, diagnosis: 'Intimate Partner Violence', lr: 45.0, evidence: 'Partner violence described — IPV (LR 45.0)' },
        { pattern: /(he|she)\s*(punched|hit|kicked|choked|strangled|beat|slammed|slapped).*(me|my\s*face|my\s*head)/i, diagnosis: 'Intimate Partner Violence', lr: 40.0, evidence: 'Direct partner violence — IPV (LR 40.0)' },

        // HRT Side Effect
        { pattern: /(testosterone\s*shots?|my\s*t\s*shots?|estrogen|hormone\s*therapy|hrt).*(mood|acne|emotional|weight|swell|cry|angry)/i, diagnosis: 'HRT Side Effect — Mood/Psychiatric', lr: 30.0, evidence: 'HRT + psychiatric/dermatologic side effect (LR 30.0)' },
        { pattern: /(on\s*hormones|started\s*estrogen|started\s*testosterone).*(mood|acne|emotional|headache|swell|clot)/i, diagnosis: 'HRT Side Effect — Mood/Psychiatric', lr: 30.0, evidence: 'Hormone therapy side effect (LR 30.0)' },

        // Mastitis — breast + red + fever + nursing
        { pattern: /(breastfeed|nursing).*(breast|nipple).*(red|hot|pain|lump|fever|streak|hard)/i, diagnosis: 'Lactation Mastitis', lr: 35.0, evidence: 'Nursing mother + breast symptoms — mastitis (LR 35.0)' },
        { pattern: /(one\s*breast|left\s*breast|right\s*breast).*(red|hot|fever|streak|hard|swollen)/i, diagnosis: 'Lactation Mastitis', lr: 30.0, evidence: 'Unilateral breast inflammation — mastitis (LR 30.0)' },

        // Dental Abscess — bad tooth + facial swelling
        { pattern: /(bad\s*tooth|tooth).*(hurt|killing|ach|throb|pain).*(face|jaw|cheek).*(swoll|puff)/i, diagnosis: 'Dental Abscess', lr: 40.0, evidence: 'Tooth pain + facial swelling — dental abscess (LR 40.0)' },
        { pattern: /(bump|boil|sore).*(gum|inside\s*(my\s*)?mouth).*(tooth|pus|gross|fill)/i, diagnosis: 'Dental Abscess', lr: 35.0, evidence: 'Gum boil/fluctuance — dental abscess (LR 35.0)' },

        // Addison Crisis — steroids + weak + vomiting
        { pattern: /(steroid|prednisone|addisons?|cortisol).*(stopped|ran\s*out|missed).*(weak|lightheaded|nausea|vomit|low\s*bp)/i, diagnosis: 'Addison Crisis', lr: 40.0, evidence: 'Steroid cessation + adrenal symptoms — Addisonian crisis (LR 40.0)' },

        // Constipation priority boost
        { pattern: /(cant\s*go.*bathroom|cant\s*poop).*(belly|hard|bloat|cramp)/i, diagnosis: 'Constipation', lr: 45.0, evidence: 'Obstipation + distension — constipation (LR 45.0)' },
        // Temporal Arteritis age-agnostic boost
        { pattern: /(temple|temporal).*(area|region|side)?\s*(tender|throb|pain|hurt)/i, diagnosis: 'Temporal arteritis', lr: 35.0, evidence: 'Temple pain/tenderness — GCA (LR 35.0)' },
        // Pneumonia — "fever of 102 + cough + chest hurts"
        { pattern: /fever\s*(of\s*)?10[2-5].*(cough|chest)/i, diagnosis: 'Pneumonia', lr: 35.0, evidence: 'High fever + cough/chest pain — pneumonia (LR 35.0)' },
        { pattern: /(chest\s*hurts?|chest\s*pain).*(cough|coughing).*(fever|chill|102|103|104)/i, diagnosis: 'Pneumonia', lr: 35.0, evidence: 'Chest pain + productive cough + fever — pneumonia (LR 35.0)' },
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

      // ============================================================
      // --- Step 4c: RISK FACTOR WEIGHTING (INNOVATION) ---
      // Scans CC + associated symptoms for risk factor keywords
      // and boosts relevant diagnoses. Simulates clinical pattern
      // recognition (diabetic? → think DKA, HHS, infection).
      // ============================================================
      const riskFactorRules: Array<{ pattern: RegExp; boosts: Array<{ diagnosis: string; lr: number }>; evidence: string }> = [
        // Diabetic risk factors
        { pattern: /\b(diabetic|diabetes|t1d|t2d|type\s*1|type\s*2|insulin|sugar|glucose|a1c)\b/i, boosts: [
          { diagnosis: 'Diabetic Ketoacidosis', lr: 3.0 },
          { diagnosis: 'Hyperosmolar Hyperglycemic State', lr: 3.0 },
          { diagnosis: 'Hypoglycemia', lr: 2.5 },
          { diagnosis: 'Diabetic Neuropathy', lr: 2.0 },
          { diagnosis: 'Cellulitis', lr: 1.8 },
          { diagnosis: 'UTI', lr: 1.5 },
          { diagnosis: 'Silent MI', lr: 2.0 },
        ], evidence: 'Diabetic patient — increased DKA/infection/CV risk' },

        // Smoker risk factors
        { pattern: /\b(smoker|smoking|tobacco|cigarette|pack.year|\d+\s*ppd|vaping)\b/i, boosts: [
          { diagnosis: 'COPD exacerbation', lr: 3.0 },
          { diagnosis: 'Lung Cancer', lr: 5.0 },
          { diagnosis: 'Bladder Cancer', lr: 3.0 },
          { diagnosis: 'Acute Myocardial Infarction', lr: 2.0 },
          { diagnosis: 'Pulmonary Embolism', lr: 1.8 },
          { diagnosis: 'Chronic Bronchitis', lr: 2.5 },
        ], evidence: 'Smoker — elevated lung/CV/bladder cancer risk' },

        // Pregnancy risk factors (present already but boost further)
        { pattern: /\b(pregnant|pregnancy|gestation|weeks\s*pregnant|trimester|miss.*period|gravid)\b/i, boosts: [
          { diagnosis: 'Ectopic Pregnancy', lr: 3.0 },
          { diagnosis: 'Preeclampsia', lr: 3.0 },
          { diagnosis: 'Placental Abruption', lr: 5.0 },
          { diagnosis: 'Hyperemesis Gravidarum', lr: 3.0 },
          { diagnosis: 'UTI', lr: 2.0 },
          { diagnosis: 'DVT/PE (postpartum)', lr: 2.5 },
          { diagnosis: 'Pulmonary Embolism', lr: 2.5 },
        ], evidence: 'Pregnancy — elevated pregnancy-specific risks' },

        // Immunocompromised
        { pattern: /\b(immunocompromis|immunosuppress|chemo|chemotherapy|hiv|aids|transplant|prednisone|steroid|biologic|methotrexate)\b/i, boosts: [
          { diagnosis: 'Sepsis', lr: 3.0 },
          { diagnosis: 'Opportunistic Infection', lr: 5.0 },
          { diagnosis: 'Pneumocystis Pneumonia', lr: 3.0 },
          { diagnosis: 'Bacterial Meningitis', lr: 2.5 },
          { diagnosis: 'Invasive Fungal Infection', lr: 3.0 },
          { diagnosis: 'Cellulitis', lr: 2.0 },
        ], evidence: 'Immunocompromised — elevated infection risk' },

        // Anticoagulated
        { pattern: /\b(warfarin|coumadin|eliquis|apixaban|xarelto|rivaroxaban|heparin|blood\s*thinner|anticoagul|dabigatran)\b/i, boosts: [
          { diagnosis: 'Gastrointestinal Bleeding', lr: 3.0 },
          { diagnosis: 'Subdural Hematoma', lr: 3.0 },
          { diagnosis: 'Chronic Subdural Hematoma', lr: 3.0 },
          { diagnosis: 'Intracranial Hemorrhage', lr: 3.0 },
          { diagnosis: 'Retroperitoneal Hematoma', lr: 2.5 },
          { diagnosis: 'Hematuria', lr: 2.0 },
        ], evidence: 'On anticoagulation — elevated bleeding risk' },

        // IV drug use
        { pattern: /\b(iv\s*drug|intravenous\s*drug|injection\s*drug|heroin|shooting\s*up|track\s*marks|needle\s*marks|inject\s*drugs?)\b/i, boosts: [
          { diagnosis: 'Endocarditis', lr: 5.0 },
          { diagnosis: 'Skin/Soft Tissue Abscess', lr: 3.0 },
          { diagnosis: 'Cellulitis', lr: 2.5 },
          { diagnosis: 'Hepatitis B/C', lr: 3.0 },
          { diagnosis: 'HIV/AIDS', lr: 2.5 },
          { diagnosis: 'Opioid Overdose', lr: 3.0 },
          { diagnosis: 'Sepsis', lr: 2.0 },
        ], evidence: 'IV drug use — elevated endocarditis/infection risk' },

        // Recent surgery / immobilization
        { pattern: /\b(recent\s*surgery|post.?op|surgical|surgery.*(weeks?\s*ago|days?\s*ago)|immobiliz|bedrest|bed.?ridden|long\s*flight|long\s*drive)\b/i, boosts: [
          { diagnosis: 'Deep Vein Thrombosis', lr: 3.0 },
          { diagnosis: 'Pulmonary Embolism', lr: 4.0 },
          { diagnosis: 'Wound Infection', lr: 3.0 },
          { diagnosis: 'Surgical Site Infection', lr: 3.0 },
        ], evidence: 'Post-op/immobilization — elevated VTE risk' },

        // Heavy alcohol use
        { pattern: /\b(alcoholic|heavy\s*drink|daily\s*drink|\d+\s*beers?\s*a\s*day|fifth\s*of|cirrhosis|liver\s*disease)\b/i, boosts: [
          { diagnosis: 'Alcohol Withdrawal', lr: 3.0 },
          { diagnosis: 'Delirium Tremens', lr: 3.0 },
          { diagnosis: 'Wernicke Encephalopathy', lr: 3.0 },
          { diagnosis: 'Hepatic Encephalopathy', lr: 3.0 },
          { diagnosis: 'Pancreatitis', lr: 3.0 },
          { diagnosis: 'Gastrointestinal Bleeding', lr: 2.5 },
          { diagnosis: 'Subdural Hematoma', lr: 2.0 },
        ], evidence: 'Heavy alcohol use — liver/CNS/pancreatic risk' },

        // Cancer history
        { pattern: /\b(cancer|malignan|tumor|chemo|radiation\s*therapy|metastat|oncology)\s*(history|patient|diagnosis)|had\s*cancer|history\s*of\s*cancer/i, boosts: [
          { diagnosis: 'Metastatic Cancer', lr: 5.0 },
          { diagnosis: 'Pulmonary Embolism', lr: 3.0 },
          { diagnosis: 'Neutropenic Fever', lr: 3.0 },
          { diagnosis: 'Spinal Cord Compression', lr: 3.0 },
          { diagnosis: 'Hypercalcemia', lr: 2.5 },
          { diagnosis: 'Sepsis', lr: 2.0 },
        ], evidence: 'Cancer history — elevated metastatic/complication risk' },

        // Elderly + falls
        { pattern: /\b(grandpa|grandma|elderly|nursing\s*home|\b(7|8|9)\d\s*year|senior\s*citizen)\b/i, boosts: [
          { diagnosis: 'Hip Fracture', lr: 2.0 },
          { diagnosis: 'Subdural Hematoma', lr: 2.0 },
          { diagnosis: 'Chronic Subdural Hematoma', lr: 2.5 },
          { diagnosis: 'UTI', lr: 1.8 },
          { diagnosis: 'Polypharmacy/Medication Effect', lr: 2.5 },
          { diagnosis: 'Aortic Aneurysm', lr: 1.8 },
        ], evidence: 'Elderly — age-specific risks (falls, SDH, UTI-delirium)' },
      ];
      for (const rule of riskFactorRules) {
        if (rule.pattern.test(chiefComplaint)) {
          for (const boost of rule.boosts) {
            const currentOdds = odds.get(boost.diagnosis) || 0.02;
            odds.set(boost.diagnosis, currentOdds * boost.lr);
            const existing = allEvidence.get(boost.diagnosis) || [];
            existing.push(rule.evidence);
            allEvidence.set(boost.diagnosis, existing);
          }
        }
      }

      // ============================================================
      // --- Step 4d: CLASSIC TRIAD/PENTAD RECOGNITION (INNOVATION) ---
      // Specific clinical patterns that are highly specific when all
      // components are present. Named after historical clinicians.
      // ============================================================
      const classicPatternRules: Array<{ pattern: RegExp; diagnosis: string; lr: number; evidence: string }> = [
        // Charcot's triad: fever + RUQ pain + jaundice → Ascending cholangitis
        { pattern: /(fever|chill).*(right.*upper|ruq|gallbladder).*(jaundice|yellow)|jaundice.*(fever|chill).*(right.*upper|ruq)/i, diagnosis: 'Ascending Cholangitis', lr: 30.0, evidence: 'Charcot triad (fever + RUQ + jaundice) — cholangitis (LR 30.0)' },

        // Reynold's pentad: Charcot's + hypotension + AMS → Suppurative cholangitis
        { pattern: /(fever|chill).*(ruq|right.*upper).*(jaundice).*(confus|low\s*bp|shock|hypotens)/i, diagnosis: 'Suppurative Cholangitis', lr: 40.0, evidence: 'Reynolds pentad — severe cholangitis (LR 40.0)' },

        // Beck's triad: hypotension + muffled heart sounds + JVD → Cardiac tamponade
        { pattern: /(low\s*bp|hypotens|shock).*(muffled.*heart|distant.*heart).*(jvd|neck\s*vein|distended)/i, diagnosis: 'Cardiac Tamponade', lr: 30.0, evidence: 'Beck triad — cardiac tamponade (LR 30.0)' },

        // Cushing's triad: HTN + bradycardia + irregular resp → Increased ICP
        { pattern: /(high\s*bp|hypertens).*(slow\s*heart|bradycardia).*(irregular\s*breath|abnormal\s*breath)/i, diagnosis: 'Increased Intracranial Pressure', lr: 30.0, evidence: 'Cushing triad — elevated ICP (LR 30.0)' },

        // Meningitis triad: fever + headache + stiff neck
        { pattern: /fever.*(headache|head\s*pain).*(stiff\s*neck|neck\s*stiff|cant\s*touch\s*chin|cant\s*bend)/i, diagnosis: 'Meningitis', lr: 50.0, evidence: 'Classic meningitis triad (LR 50.0)' },
        { pattern: /(fever|feverish).*(headache|head\s*hurt).*(neck|bend|chin)/i, diagnosis: 'Meningitis', lr: 40.0, evidence: 'Fever + HA + neck symptoms — meningitis (LR 40.0)' },
        { pattern: /(stiff\s*neck|cant\s*touch\s*chin|neck\s*stiff).*(fever|headache|photophob|light\s*sensitive)/i, diagnosis: 'Meningitis', lr: 40.0, evidence: 'Nuchal rigidity + systemic features — meningitis (LR 40.0)' },

        // Wernicke's triad: confusion + ataxia + ophthalmoplegia
        { pattern: /(confus|altered).*(stumbl|atax|unsteady|walk).*(eye.*move|double.*vision|nystag)/i, diagnosis: 'Wernicke Encephalopathy', lr: 35.0, evidence: 'Wernicke triad (confusion + ataxia + ophthalmoplegia) (LR 35.0)' },

        // DKA triad: polyuria + polydipsia + weight loss
        { pattern: /(peeing\s*a\s*lot|frequent\s*urin|polyuri).*(thirsty|drinking|polydipsi).*(weight\s*loss|losing\s*weight)/i, diagnosis: 'Diabetic Ketoacidosis', lr: 25.0, evidence: 'DKA classic triad (LR 25.0)' },

        // Pheochromocytoma triad: headache + palpitations + sweating (episodic)
        { pattern: /episodic.*(headache|palpitat|sweat).*(headache|palpitat|sweat).*(headache|palpitat|sweat)|(headache.*palpitat.*sweat)|(palpitat.*headache.*sweat)/i, diagnosis: 'Pheochromocytoma', lr: 25.0, evidence: 'Pheo triad (HA + palpitations + sweating) (LR 25.0)' },

        // Preeclampsia triad: HTN + proteinuria + edema (pregnant)
        { pattern: /pregnant.*(high\s*bp|hypertens|vision\s*change|headache).*(swell|swollen|edema|puffy)/i, diagnosis: 'Preeclampsia', lr: 30.0, evidence: 'Preeclampsia features in pregnancy (LR 30.0)' },

        // HUS triad: microangiopathic hemolytic anemia + thrombocytopenia + AKI
        { pattern: /(bloody\s*diarrhea|diarrhea.*bloody).*(child|kid|\d+\s*year).*(pale|tired|bruise|weak|kidney|urine)/i, diagnosis: 'Hemolytic Uremic Syndrome', lr: 30.0, evidence: 'Post-diarrheal HUS in child (LR 30.0)' },

        // Kawasaki criteria: fever >5d + 4 of (conjunctivitis, rash, cervical node, extremity, lips/oral)
        { pattern: /(kid|child|toddler|\d+\s*year).*fever.*(5|five|six|seven).*days?.*(red\s*eye|rash|swell|crack.*lip|peel|strawberry\s*tongue)/i, diagnosis: 'Kawasaki Disease', lr: 30.0, evidence: 'Kawasaki multi-system criteria (LR 30.0)' },

        // Pulmonary embolism classic: dyspnea + pleuritic chest pain + hemoptysis
        { pattern: /(shortness\s*of\s*breath|cant\s*breathe|dyspnea).*(sharp.*chest|chest.*(deep\s*breath|breathing)).*(cough.*blood|hemoptys|blood.*spit)/i, diagnosis: 'Pulmonary Embolism', lr: 30.0, evidence: 'Classic PE triad — dyspnea + pleuritic pain + hemoptysis (LR 30.0)' },

        // HSP tetrad: palpable purpura + arthritis + abdominal pain + renal
        { pattern: /(purple|purpura|bruise.?like).*(joint.*pain|arthr).*(belly|abdom|stomach).*(kid|child)/i, diagnosis: 'Henoch-Schonlein Purpura (IgA Vasculitis)', lr: 35.0, evidence: 'HSP tetrad (LR 35.0)' },

        // Anaphylaxis pattern: exposure + airway + skin + hypotension
        { pattern: /(ate|ingest|sting|stung|exposed|taking).*(throat|lip|tongue|face).*(swell|tight|shut).*(hives|rash|flush|dizzy|faint)/i, diagnosis: 'Anaphylaxis', lr: 30.0, evidence: 'Anaphylaxis multi-system (airway + skin + trigger) (LR 30.0)' },

        // Hyperthyroid storm: fever + tachy + altered mental status + hyperthyroid hx
        { pattern: /(hyperthy|graves|thyroid).*(fever|hot|burning\s*up).*(racing|fast\s*heart|tachycar).*(agitat|confus|shaking|sweat)/i, diagnosis: 'Thyroid Storm', lr: 30.0, evidence: 'Thyroid storm criteria (LR 30.0)' },

        // Meniere's triad: vertigo + tinnitus + hearing loss
        { pattern: /(dizz|vertigo|spin).*(ear.*ring|tinnitus|buzz.*ear).*(hearing\s*loss|cant\s*hear|muffled)/i, diagnosis: 'Meniere Disease', lr: 25.0, evidence: 'Meniere triad (LR 25.0)' },

        // Horner's triad: miosis + ptosis + anhidrosis (think Pancoast tumor or carotid dissection)
        { pattern: /(droopy\s*eyelid|ptosis).*(small.*pupil|miosis).*(no\s*sweat|anhidrosis)/i, diagnosis: 'Horner Syndrome', lr: 20.0, evidence: 'Horner triad — think Pancoast/carotid dissection (LR 20.0)' },

        // Rheumatoid arthritis classic: symmetric MCP/PIP + morning stiffness + female
        { pattern: /(symmetric|both\s*hands|bilateral).*(finger|joint).*(swell|painful).*(morning\s*stiff|stiff.*morning).*(hour|\d+\s*min)/i, diagnosis: 'Rheumatoid Arthritis', lr: 20.0, evidence: 'RA classic symmetric polyarthritis + morning stiffness (LR 20.0)' },

        // GBS classic: ascending weakness + areflexia + post-infection
        { pattern: /(after|following).*(diarrhea|illness|gastro|stomach\s*bug|infection|cold).*(weakness|cant\s*walk|legs).*(arms|ascending|spreading\s*up)/i, diagnosis: 'Guillain-Barre Syndrome', lr: 30.0, evidence: 'Post-infectious ascending weakness — GBS (LR 30.0)' },
      ];
      for (const rule of classicPatternRules) {
        if (rule.pattern.test(chiefComplaint)) {
          const currentOdds = odds.get(rule.diagnosis) || 0.02;
          odds.set(rule.diagnosis, currentOdds * rule.lr);
          const existing = allEvidence.get(rule.diagnosis) || [];
          existing.push(rule.evidence);
          allEvidence.set(rule.diagnosis, existing);
        }
      }

      // ============================================================
      // --- Step 4e: TEMPORAL EVOLUTION WEIGHTING (INNOVATION) ---
      // "Sudden" / "thunderclap" → vascular/surgical emergencies
      // "Progressive over weeks/months" → chronic/malignancy
      // "Waxing and waning" → functional/migraine/colic
      // ============================================================
      const temporalRules: Array<{ pattern: RegExp; boosts: Array<{ diagnosis: string; lr: number }>; evidence: string }> = [
        // Sudden/thunderclap → vascular emergencies
        { pattern: /\b(sudden|thunderclap|outta\s*nowhere|out\s*of\s*nowhere|all\s*at\s*once|maximum\s*from\s*start|instantan)\b/i, boosts: [
          { diagnosis: 'Subarachnoid Hemorrhage', lr: 3.0 },
          { diagnosis: 'Aortic Dissection', lr: 3.0 },
          { diagnosis: 'Pulmonary Embolism', lr: 2.5 },
          { diagnosis: 'Pneumothorax', lr: 2.5 },
          { diagnosis: 'Stroke', lr: 2.5 },
          { diagnosis: 'Testicular Torsion', lr: 2.5 },
          { diagnosis: 'Ovarian Torsion', lr: 2.5 },
          { diagnosis: 'Acute Angle Closure Glaucoma', lr: 2.5 },
          { diagnosis: 'Ruptured AAA', lr: 3.0 },
          { diagnosis: 'Retinal Detachment', lr: 2.5 },
        ], evidence: 'Sudden onset — favors vascular/surgical emergency' },

        // Progressive over weeks/months → chronic/malignancy
        { pattern: /\b(weeks|months|progressi|getting\s*worse|gradually|over\s*time|slowly\s*worsen|for\s*(a\s*)?while)\b/i, boosts: [
          { diagnosis: 'Malignancy', lr: 2.5 },
          { diagnosis: 'Brain Tumor', lr: 3.0 },
          { diagnosis: 'Lung Cancer', lr: 2.5 },
          { diagnosis: 'Colorectal Cancer', lr: 2.0 },
          { diagnosis: 'Tuberculosis', lr: 2.0 },
          { diagnosis: 'Chronic Subdural Hematoma', lr: 2.5 },
          { diagnosis: 'Idiopathic Pulmonary Fibrosis', lr: 2.5 },
          { diagnosis: 'Heart Failure', lr: 2.0 },
          { diagnosis: 'Inflammatory Bowel Disease', lr: 2.0 },
          { diagnosis: 'Rheumatoid Arthritis', lr: 2.0 },
        ], evidence: 'Chronic/progressive course — favors chronic/malignancy' },

        // Waxing and waning / episodic
        { pattern: /\b(comes?\s*and\s*goes?|episodic|waxing|waning|on\s*and\s*off|intermittent|flares?|attacks?)\b/i, boosts: [
          { diagnosis: 'Migraine', lr: 2.0 },
          { diagnosis: 'Benign Paroxysmal Positional Vertigo', lr: 2.5 },
          { diagnosis: 'Cyclic Vomiting Syndrome', lr: 3.0 },
          { diagnosis: 'Cannabinoid Hyperemesis Syndrome', lr: 2.0 },
          { diagnosis: 'Nephrolithiasis', lr: 2.5 },
          { diagnosis: 'Intussusception', lr: 2.5 },
          { diagnosis: 'Paroxysmal Atrial Fibrillation', lr: 2.5 },
          { diagnosis: 'Pheochromocytoma', lr: 2.5 },
        ], evidence: 'Episodic/recurrent — favors functional/episodic condition' },

        // Positional / exertional
        { pattern: /\b(when\s*i\s*(walk|stand|lift|exert)|worse\s*with\s*(activity|exercise|exertion)|brought\s*on\s*by)\b/i, boosts: [
          { diagnosis: 'Stable Angina', lr: 3.0 },
          { diagnosis: 'Aortic Stenosis', lr: 2.5 },
          { diagnosis: 'Congestive Heart Failure', lr: 2.0 },
          { diagnosis: 'Exertional Asthma', lr: 2.0 },
        ], evidence: 'Exertional symptoms — favors cardiopulmonary' },
      ];
      for (const rule of temporalRules) {
        if (rule.pattern.test(chiefComplaint)) {
          for (const boost of rule.boosts) {
            const currentOdds = odds.get(boost.diagnosis) || 0.02;
            odds.set(boost.diagnosis, currentOdds * boost.lr);
            const existing = allEvidence.get(boost.diagnosis) || [];
            existing.push(rule.evidence);
            allEvidence.set(boost.diagnosis, existing);
          }
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
