// ============================================================
// ATTENDING AI - Differential Diagnosis Service
// apps/shared/lib/ai/differentialDiagnosis.ts
//
// AI-powered clinical decision support for generating
// differential diagnoses with confidence scoring
// Supports: BioMistral, Azure OpenAI, Local inference
// ============================================================

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
};

// ============================================================
// DIFFERENTIAL DIAGNOSIS SERVICE CLASS
// ============================================================

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
    const differentials: DifferentialDiagnosis[] = [];
    const symptoms = presentation.symptoms.map(s => s.name.toLowerCase());
    const chiefComplaint = presentation.chiefComplaint.toLowerCase();
    
    // Get potential diagnoses based on symptoms
    const potentialDiagnoses = new Map<string, number>();
    
    // Chief complaint mapping
    for (const [symptom, diagnoses] of Object.entries(SYMPTOM_DIAGNOSIS_MAP)) {
      if (chiefComplaint.includes(symptom)) {
        diagnoses.forEach((dx, index) => {
          const score = potentialDiagnoses.get(dx) || 0;
          potentialDiagnoses.set(dx, score + (30 - index * 3));
        });
      }
    }
    
    // Additional symptoms
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

    // Age/gender adjustments
    if (presentation.demographics.gender === 'female' && presentation.demographics.pregnant) {
      potentialDiagnoses.set('Ectopic Pregnancy', (potentialDiagnoses.get('Ectopic Pregnancy') || 0) + 30);
    }
    
    if (presentation.demographics.age > 65) {
      potentialDiagnoses.set('Acute Coronary Syndrome', (potentialDiagnoses.get('Acute Coronary Syndrome') || 0) + 15);
      potentialDiagnoses.set('Stroke', (potentialDiagnoses.get('Stroke') || 0) + 15);
    }

    // Convert to differential diagnoses
    for (const [diagnosis, score] of potentialDiagnoses.entries()) {
      if (score >= 15) {
        const urgency = EMERGENCY_CONDITIONS[diagnosis] ? 'emergent' as const : 
                       score > 50 ? 'urgent' as const : 'routine' as const;
        
        differentials.push({
          diagnosis,
          confidence: Math.min(score, 90),
          reasoning: this.generateReasoning(diagnosis, presentation),
          supportingFindings: this.findSupportingFindings(diagnosis, presentation),
          againstFindings: this.findAgainstFindings(diagnosis, presentation),
          urgency,
          recommendedWorkup: this.getWorkupForCondition(diagnosis),
        });
      }
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
      'Acute Coronary Syndrome': {
        labs: ['Troponin', 'BMP', 'CBC', 'BNP'],
        imaging: ['ECG', 'Chest X-ray', 'Echocardiogram'],
        consults: ['Cardiology'],
      },
      'Pulmonary Embolism': {
        labs: ['D-dimer', 'BMP', 'CBC', 'ABG'],
        imaging: ['CT Pulmonary Angiogram', 'Lower extremity Doppler'],
      },
      'Stroke': {
        labs: ['CBC', 'BMP', 'PT/INR', 'Glucose'],
        imaging: ['CT Head without contrast', 'MRI Brain'],
        consults: ['Neurology'],
      },
      'Appendicitis': {
        labs: ['CBC', 'CMP', 'Urinalysis'],
        imaging: ['CT Abdomen/Pelvis with contrast'],
        consults: ['Surgery'],
      },
      'Pneumonia': {
        labs: ['CBC', 'BMP', 'Procalcitonin', 'Blood cultures'],
        imaging: ['Chest X-ray'],
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
    
    return impression;
  }

  private generateRecommendedActions(differentials: DifferentialDiagnosis[]): string[] {
    const actions: string[] = [];
    const emergent = differentials.filter(d => d.urgency === 'emergent');
    
    if (emergent.length > 0) {
      actions.push(`STAT workup for ${emergent[0].diagnosis}`);
      actions.push('Continuous cardiac monitoring');
      actions.push('IV access');
    }
    
    // Consolidate recommended labs
    const labs = new Set<string>();
    differentials.slice(0, 3).forEach(d => d.recommendedWorkup.labs?.forEach(l => labs.add(l)));
    if (labs.size > 0) {
      actions.push(`Order labs: ${Array.from(labs).join(', ')}`);
    }
    
    // Consolidate recommended imaging
    const imaging = new Set<string>();
    differentials.slice(0, 3).forEach(d => d.recommendedWorkup.imaging?.forEach(i => imaging.add(i)));
    if (imaging.size > 0) {
      actions.push(`Order imaging: ${Array.from(imaging).join(', ')}`);
    }
    
    return actions;
  }

  private calculateOverallConfidence(differentials: DifferentialDiagnosis[]): number {
    if (differentials.length === 0) return 0;
    
    const primary = differentials[0];
    const secondary = differentials[1];
    
    // Higher confidence if clear leader
    if (!secondary || primary.confidence - secondary.confidence > 20) {
      return Math.min(primary.confidence + 10, 95);
    }
    
    // Lower confidence if close differentials
    return Math.max(primary.confidence - 10, 50);
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
