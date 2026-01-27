// =============================================================================
// ATTENDING AI - Unified Clinical AI Service
// apps/shared/services/clinical-ai/UnifiedClinicalAI.ts
//
// Single entry point for all clinical AI operations
// Supports BioMistral API with automatic fallback to rule-based logic
// =============================================================================

import { 
  getBioMistralConfig, 
  checkBioMistralHealth,
  type BioMistralConfig,
  type BioMistralProvider 
} from '../../config/biomistral.config';

// =============================================================================
// Types
// =============================================================================

export interface PatientContext {
  patientId: string;
  demographics: {
    age: number;
    gender: 'male' | 'female' | 'other';
    pregnancyStatus?: 'pregnant' | 'not_pregnant' | 'unknown';
  };
  chiefComplaint: string;
  symptoms: Array<{
    name: string;
    severity?: number;
    duration?: string;
    location?: string;
  }>;
  vitals?: {
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    painLevel?: number;
  };
  allergies: Array<{ allergen: string; reaction?: string; severity?: string }>;
  medications: Array<{ name: string; dose?: string; frequency?: string }>;
  medicalHistory: string[];
  redFlags?: string[];
}

export interface DifferentialDiagnosis {
  name: string;
  icdCode: string;
  probability: number;
  confidence: 'high' | 'moderate' | 'low';
  acuity: 'emergent' | 'urgent' | 'non_urgent';
  mustNotMiss?: boolean;
  supportingEvidence: string[];
  contradictingEvidence?: string[];
  recommendedWorkup: string[];
}

export interface LabRecommendation {
  testCode: string;
  testName: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  rationale: string;
  category: 'critical' | 'recommended' | 'consider';
  confidence: number;
}

export interface ImagingRecommendation {
  studyCode: string;
  studyName: string;
  modality: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  rationale: string;
  category: 'critical' | 'recommended' | 'consider';
  confidence: number;
}

export interface TreatmentRecommendation {
  id: string;
  category: 'medication' | 'procedure' | 'referral' | 'lifestyle' | 'monitoring';
  name: string;
  description: string;
  rationale: string;
  priority: 'essential' | 'recommended' | 'optional';
  evidenceLevel?: string;
}

export interface ClinicalAIResult {
  requestId: string;
  timestamp: string;
  provider: BioMistralProvider | 'rule-based';
  processingTimeMs: number;
  confidence: number;
  
  differentials?: DifferentialDiagnosis[];
  labRecommendations?: LabRecommendation[];
  imagingRecommendations?: ImagingRecommendation[];
  treatmentRecommendations?: TreatmentRecommendation[];
  
  redFlags?: {
    detected: boolean;
    flags: string[];
    severity: 'critical' | 'urgent' | 'moderate';
    immediateAction?: string;
  };
  
  clinicalSummary?: string;
  disclaimer: string;
}

// =============================================================================
// BioMistral API Client
// =============================================================================

class BioMistralAPIClient {
  private config: BioMistralConfig;
  private lastRequestTime: number = 0;
  
  constructor(config: BioMistralConfig) {
    this.config = config;
  }
  
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const endpoint = this.config.endpoints[this.config.provider];
    
    // Rate limiting
    await this.waitForRateLimit();
    
    try {
      let response: Response;
      let result: any;
      
      switch (this.config.provider) {
        case 'ollama':
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: endpoint.model || this.config.model,
              prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
              stream: false,
              options: {
                temperature: this.config.temperature,
                num_predict: this.config.maxTokens,
              },
            }),
          });
          result = await response.json();
          return result.response;
          
        case 'huggingface':
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: endpoint.headers,
            body: JSON.stringify({
              inputs: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
              parameters: {
                temperature: this.config.temperature,
                max_new_tokens: this.config.maxTokens,
                return_full_text: false,
              },
            }),
          });
          result = await response.json();
          return result[0]?.generated_text || '';
          
        case 'openai-compatible':
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: endpoint.headers,
            body: JSON.stringify({
              model: endpoint.model || this.config.model,
              messages: [
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                { role: 'user', content: prompt },
              ],
              temperature: this.config.temperature,
              max_tokens: this.config.maxTokens,
            }),
          });
          result = await response.json();
          return result.choices[0]?.message?.content || '';
          
        case 'replicate':
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: endpoint.headers,
            body: JSON.stringify({
              version: endpoint.model,
              input: {
                prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
              },
            }),
          });
          result = await response.json();
          return await this.pollReplicateResult(result.urls.get);
          
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      console.error(`[BioMistral] API call failed for ${this.config.provider}:`, error);
      throw error;
    }
  }
  
  private async waitForRateLimit(): Promise<void> {
    const minInterval = 60000 / this.config.rateLimit.requestsPerMinute;
    const elapsed = Date.now() - this.lastRequestTime;
    
    if (elapsed < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  private async pollReplicateResult(url: string, maxAttempts = 30): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(url, {
        headers: this.config.endpoints.replicate.headers,
      });
      const result = await response.json();
      
      if (result.status === 'succeeded') {
        return result.output.join('');
      } else if (result.status === 'failed') {
        throw new Error('Replicate prediction failed');
      }
    }
    throw new Error('Replicate prediction timeout');
  }
}

// =============================================================================
// Rule-Based Fallback Engine
// =============================================================================

class RuleBasedEngine {
  generateDifferentials(patient: PatientContext): DifferentialDiagnosis[] {
    const differentials: DifferentialDiagnosis[] = [];
    const complaint = patient.chiefComplaint.toLowerCase();
    const symptoms = patient.symptoms.map(s => s.name.toLowerCase()).join(' ');
    const allText = `${complaint} ${symptoms}`;

    // Chest pain
    if (allText.includes('chest pain') || allText.includes('chest')) {
      differentials.push(
        {
          name: 'Acute Coronary Syndrome',
          icdCode: 'I21.9',
          probability: patient.demographics.age > 50 ? 0.35 : 0.15,
          confidence: 'moderate',
          acuity: 'emergent',
          mustNotMiss: true,
          supportingEvidence: ['Chest pain'],
          recommendedWorkup: ['ECG', 'Troponin', 'CXR', 'BMP'],
        },
        {
          name: 'Pulmonary Embolism',
          icdCode: 'I26.99',
          probability: 0.15,
          confidence: 'moderate',
          acuity: 'emergent',
          mustNotMiss: true,
          supportingEvidence: ['Chest pain'],
          recommendedWorkup: ['D-dimer', 'CT-PA'],
        },
        {
          name: 'Musculoskeletal Pain',
          icdCode: 'R07.89',
          probability: 0.30,
          confidence: 'moderate',
          acuity: 'non_urgent',
          supportingEvidence: ['Chest pain'],
          recommendedWorkup: [],
        }
      );
    }

    // Headache
    if (allText.includes('headache') || allText.includes('head pain')) {
      differentials.push(
        {
          name: 'Tension Headache',
          icdCode: 'G44.2',
          probability: 0.40,
          confidence: 'moderate',
          acuity: 'non_urgent',
          supportingEvidence: ['Headache'],
          recommendedWorkup: [],
        },
        {
          name: 'Migraine',
          icdCode: 'G43.909',
          probability: 0.25,
          confidence: 'moderate',
          acuity: 'non_urgent',
          supportingEvidence: ['Headache'],
          recommendedWorkup: [],
        }
      );
      
      if (allText.includes('worst') || allText.includes('sudden')) {
        differentials.unshift({
          name: 'Subarachnoid Hemorrhage',
          icdCode: 'I60.9',
          probability: 0.25,
          confidence: 'moderate',
          acuity: 'emergent',
          mustNotMiss: true,
          supportingEvidence: ['Sudden severe headache'],
          recommendedWorkup: ['CT Head', 'LP if CT negative'],
        });
      }
    }

    // Abdominal pain
    if (allText.includes('abdominal') || allText.includes('stomach') || allText.includes('belly')) {
      differentials.push(
        {
          name: 'Gastroenteritis',
          icdCode: 'K52.9',
          probability: 0.30,
          confidence: 'moderate',
          acuity: 'non_urgent',
          supportingEvidence: ['Abdominal pain'],
          recommendedWorkup: [],
        },
        {
          name: 'Appendicitis',
          icdCode: 'K35.80',
          probability: allText.includes('right') ? 0.30 : 0.15,
          confidence: 'moderate',
          acuity: 'urgent',
          mustNotMiss: true,
          supportingEvidence: ['Abdominal pain'],
          recommendedWorkup: ['CBC', 'CRP', 'CT abdomen'],
        }
      );
    }

    // Shortness of breath
    if (allText.includes('breath') || allText.includes('dyspnea')) {
      differentials.push(
        {
          name: 'Asthma Exacerbation',
          icdCode: 'J45.901',
          probability: 0.25,
          confidence: 'moderate',
          acuity: 'urgent',
          supportingEvidence: ['Shortness of breath'],
          recommendedWorkup: ['Peak flow', 'CXR'],
        },
        {
          name: 'Heart Failure',
          icdCode: 'I50.9',
          probability: patient.demographics.age > 50 ? 0.25 : 0.10,
          confidence: 'moderate',
          acuity: 'urgent',
          supportingEvidence: ['Shortness of breath'],
          recommendedWorkup: ['BNP', 'CXR', 'ECG'],
        }
      );
    }

    return differentials.sort((a, b) => b.probability - a.probability);
  }
  
  generateLabRecommendations(patient: PatientContext): LabRecommendation[] {
    const labs: LabRecommendation[] = [];
    const complaint = patient.chiefComplaint.toLowerCase();

    // Baseline labs
    labs.push({
      testCode: 'CBC-DIFF',
      testName: 'Complete Blood Count with Differential',
      priority: 'ROUTINE',
      rationale: 'Baseline evaluation for infection, anemia',
      category: 'recommended',
      confidence: 0.85,
    });

    labs.push({
      testCode: 'BMP',
      testName: 'Basic Metabolic Panel',
      priority: 'ROUTINE',
      rationale: 'Electrolytes, kidney function',
      category: 'recommended',
      confidence: 0.85,
    });

    // Complaint-specific
    if (complaint.includes('chest')) {
      labs.push({
        testCode: 'TROP-I',
        testName: 'Troponin I',
        priority: 'STAT',
        rationale: 'Rule out myocardial injury',
        category: 'critical',
        confidence: 0.95,
      });
      labs.push({
        testCode: 'BNP',
        testName: 'B-type Natriuretic Peptide',
        priority: 'STAT',
        rationale: 'Heart failure evaluation',
        category: 'critical',
        confidence: 0.90,
      });
    }

    if (complaint.includes('fever') || complaint.includes('infection')) {
      labs.push({
        testCode: 'PROCALCITONIN',
        testName: 'Procalcitonin',
        priority: 'STAT',
        rationale: 'Bacterial vs viral infection',
        category: 'critical',
        confidence: 0.90,
      });
      labs.push({
        testCode: 'LACTATE',
        testName: 'Lactate',
        priority: 'STAT',
        rationale: 'Sepsis severity',
        category: 'critical',
        confidence: 0.92,
      });
    }

    // Pregnancy test for females of childbearing age
    if (
      patient.demographics.gender === 'female' &&
      patient.demographics.age >= 12 &&
      patient.demographics.age <= 55 &&
      patient.demographics.pregnancyStatus !== 'not_pregnant'
    ) {
      labs.push({
        testCode: 'HCG-U',
        testName: 'Urine Pregnancy Test',
        priority: 'STAT',
        rationale: 'Required before imaging/medications',
        category: 'critical',
        confidence: 0.98,
      });
    }

    return labs;
  }
  
  generateImagingRecommendations(patient: PatientContext): ImagingRecommendation[] {
    const imaging: ImagingRecommendation[] = [];
    const complaint = patient.chiefComplaint.toLowerCase();

    if (complaint.includes('chest')) {
      imaging.push({
        studyCode: 'XR-CHEST-2V',
        studyName: 'Chest X-ray 2 Views',
        modality: 'XR',
        priority: 'STAT',
        rationale: 'Baseline chest evaluation',
        category: 'critical',
        confidence: 0.90,
      });
    }

    if (complaint.includes('headache') || complaint.includes('worst')) {
      imaging.push({
        studyCode: 'CT-HEAD-NC',
        studyName: 'CT Head without Contrast',
        modality: 'CT',
        priority: 'STAT',
        rationale: 'Rule out intracranial pathology',
        category: 'critical',
        confidence: 0.92,
      });
    }

    if (complaint.includes('abdominal') || complaint.includes('stomach')) {
      const hasContrastAllergy = patient.allergies.some(a => 
        a.allergen.toLowerCase().includes('contrast') ||
        a.allergen.toLowerCase().includes('iodine')
      );
      
      if (hasContrastAllergy) {
        imaging.push({
          studyCode: 'CT-ABD-PELVIS-NC',
          studyName: 'CT Abdomen/Pelvis without Contrast',
          modality: 'CT',
          priority: 'ROUTINE',
          rationale: 'Abdominal evaluation (contrast allergy noted)',
          category: 'recommended',
          confidence: 0.85,
        });
      } else {
        imaging.push({
          studyCode: 'CT-ABD-PELVIS-C',
          studyName: 'CT Abdomen/Pelvis with Contrast',
          modality: 'CT',
          priority: 'ROUTINE',
          rationale: 'Comprehensive abdominal evaluation',
          category: 'recommended',
          confidence: 0.88,
        });
      }
    }

    return imaging;
  }
  
  detectRedFlags(patient: PatientContext): ClinicalAIResult['redFlags'] {
    const flags: string[] = [];
    const complaint = patient.chiefComplaint.toLowerCase();
    const symptoms = patient.symptoms.map(s => s.name.toLowerCase()).join(' ');
    const allText = `${complaint} ${symptoms}`;

    // Critical red flags
    if (allText.includes('worst headache') || allText.includes('thunderclap')) {
      flags.push('Thunderclap headache - possible SAH');
    }
    if (allText.includes('chest pain') && patient.demographics.age > 40) {
      flags.push('Chest pain - rule out ACS');
    }
    if (allText.includes('suicidal') || allText.includes('kill myself')) {
      flags.push('Suicidal ideation - psychiatric emergency');
    }
    if (allText.includes('stroke') || allText.includes('face droop') || allText.includes('weakness')) {
      flags.push('Stroke symptoms - activate stroke protocol');
    }

    // Vital sign red flags
    if (patient.vitals) {
      if (patient.vitals.oxygenSaturation && patient.vitals.oxygenSaturation < 92) {
        flags.push(`Hypoxemia: SpO2 ${patient.vitals.oxygenSaturation}%`);
      }
      if (patient.vitals.heartRate && (patient.vitals.heartRate > 150 || patient.vitals.heartRate < 40)) {
        flags.push(`Abnormal heart rate: ${patient.vitals.heartRate} bpm`);
      }
      if (patient.vitals.bloodPressure) {
        if (patient.vitals.bloodPressure.systolic > 180 || patient.vitals.bloodPressure.diastolic > 120) {
          flags.push('Hypertensive emergency');
        }
        if (patient.vitals.bloodPressure.systolic < 90) {
          flags.push('Hypotension - possible shock');
        }
      }
    }

    if (flags.length === 0) {
      return undefined;
    }

    const hasCritical = flags.some(f => 
      f.includes('SAH') || f.includes('ACS') || f.includes('stroke') || 
      f.includes('shock') || f.includes('suicidal')
    );

    return {
      detected: true,
      flags,
      severity: hasCritical ? 'critical' : 'urgent',
      immediateAction: hasCritical ? 'Immediate physician evaluation required' : undefined,
    };
  }
}

// =============================================================================
// Unified Clinical AI Service
// =============================================================================

export class UnifiedClinicalAIService {
  private config: BioMistralConfig;
  private apiClient: BioMistralAPIClient;
  private ruleEngine: RuleBasedEngine;
  private isHealthy: boolean = false;
  
  constructor(config?: Partial<BioMistralConfig>) {
    this.config = { ...getBioMistralConfig(), ...config };
    this.apiClient = new BioMistralAPIClient(this.config);
    this.ruleEngine = new RuleBasedEngine();
  }
  
  async initialize(): Promise<void> {
    const health = await checkBioMistralHealth();
    this.isHealthy = health.available;
    
    if (!this.isHealthy) {
      console.warn('[ClinicalAI] BioMistral not available, will use rule-based fallback:', health.error);
    } else {
      console.log(`[ClinicalAI] BioMistral available via ${health.provider} (${health.latencyMs}ms)`);
    }
  }
  
  async analyzeCase(patient: PatientContext): Promise<ClinicalAIResult> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const startTime = Date.now();
    
    // Always check red flags first (fast, rule-based)
    const redFlags = this.ruleEngine.detectRedFlags(patient);
    
    // If BioMistral is healthy and enabled, try AI first
    if (this.isHealthy && this.config.features.differentialDiagnosis) {
      try {
        const aiResult = await this.generateWithAI(patient, requestId, startTime, redFlags);
        if (aiResult.confidence >= this.config.thresholds.differential) {
          return aiResult;
        }
        console.log('[ClinicalAI] AI confidence below threshold, supplementing with rule-based');
      } catch (error) {
        console.warn('[ClinicalAI] AI generation failed, falling back:', error);
      }
    }
    
    // Fallback to rule-based
    return this.generateWithRules(patient, requestId, startTime, redFlags);
  }
  
  private async generateWithAI(
    patient: PatientContext,
    requestId: string,
    startTime: number,
    redFlags?: ClinicalAIResult['redFlags']
  ): Promise<ClinicalAIResult> {
    const systemPrompt = `You are BioMistral, a clinical decision support AI trained on medical literature.
You provide evidence-based differential diagnoses and recommendations.
Always prioritize patient safety and identify must-not-miss diagnoses.
Respond in valid JSON format only.`;

    const prompt = `Analyze this clinical case and provide differential diagnoses with recommendations.

Patient: ${patient.demographics.age} year old ${patient.demographics.gender}
Chief Complaint: ${patient.chiefComplaint}
Symptoms: ${patient.symptoms.map(s => `${s.name} (severity: ${s.severity || 'unknown'})`).join(', ')}
Medical History: ${patient.medicalHistory.join(', ') || 'None provided'}
Medications: ${patient.medications.map(m => m.name).join(', ') || 'None'}
Allergies: ${patient.allergies.map(a => a.allergen).join(', ') || 'NKDA'}
Vitals: ${JSON.stringify(patient.vitals || {})}

Respond with JSON containing:
{
  "differentials": [{ "name", "icdCode", "probability", "confidence", "acuity", "mustNotMiss", "supportingEvidence", "recommendedWorkup" }],
  "labRecommendations": [{ "testCode", "testName", "priority", "rationale", "category" }],
  "imagingRecommendations": [{ "studyCode", "studyName", "modality", "priority", "rationale", "category" }],
  "clinicalSummary": "string"
}`;

    const responseText = await this.apiClient.generate(prompt, systemPrompt);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    const aiData = JSON.parse(jsonMatch[0]);
    
    return {
      requestId,
      timestamp: new Date().toISOString(),
      provider: this.config.provider,
      processingTimeMs: Date.now() - startTime,
      confidence: this.calculateConfidence(aiData),
      differentials: aiData.differentials,
      labRecommendations: aiData.labRecommendations,
      imagingRecommendations: aiData.imagingRecommendations,
      redFlags,
      clinicalSummary: aiData.clinicalSummary,
      disclaimer: 'AI-generated clinical decision support. Verify all recommendations with clinical judgment.',
    };
  }
  
  private generateWithRules(
    patient: PatientContext,
    requestId: string,
    startTime: number,
    redFlags?: ClinicalAIResult['redFlags']
  ): ClinicalAIResult {
    const differentials = this.ruleEngine.generateDifferentials(patient);
    const labRecommendations = this.ruleEngine.generateLabRecommendations(patient);
    const imagingRecommendations = this.ruleEngine.generateImagingRecommendations(patient);
    
    const topDx = differentials[0]?.name || 'undetermined';
    const mustNotMiss = differentials.filter(d => d.mustNotMiss).map(d => d.name);
    
    return {
      requestId,
      timestamp: new Date().toISOString(),
      provider: 'rule-based',
      processingTimeMs: Date.now() - startTime,
      confidence: 0.75,
      differentials,
      labRecommendations,
      imagingRecommendations,
      redFlags,
      clinicalSummary: `Based on ${patient.chiefComplaint} in a ${patient.demographics.age}yo ${patient.demographics.gender}, ` +
        `most likely diagnosis is ${topDx}. ` +
        (mustNotMiss.length > 0 ? `Must not miss: ${mustNotMiss.join(', ')}.` : ''),
      disclaimer: 'Rule-based clinical decision support. Verify all recommendations with clinical judgment.',
    };
  }
  
  async generateDifferentials(patient: PatientContext): Promise<DifferentialDiagnosis[]> {
    const result = await this.analyzeCase(patient);
    return result.differentials || [];
  }
  
  async generateLabRecommendations(patient: PatientContext): Promise<LabRecommendation[]> {
    if (!this.config.features.labRecommendations) {
      return this.ruleEngine.generateLabRecommendations(patient);
    }
    const result = await this.analyzeCase(patient);
    return result.labRecommendations || [];
  }
  
  async generateImagingRecommendations(patient: PatientContext): Promise<ImagingRecommendation[]> {
    if (!this.config.features.imagingRecommendations) {
      return this.ruleEngine.generateImagingRecommendations(patient);
    }
    const result = await this.analyzeCase(patient);
    return result.imagingRecommendations || [];
  }
  
  private calculateConfidence(aiData: any): number {
    if (!aiData.differentials || aiData.differentials.length === 0) {
      return 0.5;
    }
    const topDx = aiData.differentials.slice(0, 3);
    const avgProbability = topDx.reduce((sum: number, d: any) => sum + (d.probability || 0.5), 0) / topDx.length;
    return Math.min(avgProbability + 0.2, 0.95);
  }
  
  getHealthStatus(): { healthy: boolean; provider: string; fallbackActive: boolean } {
    return {
      healthy: this.isHealthy,
      provider: this.isHealthy ? this.config.provider : 'rule-based',
      fallbackActive: !this.isHealthy,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let serviceInstance: UnifiedClinicalAIService | null = null;

export async function getClinicalAIService(): Promise<UnifiedClinicalAIService> {
  if (!serviceInstance) {
    serviceInstance = new UnifiedClinicalAIService();
    await serviceInstance.initialize();
  }
  return serviceInstance;
}

export function resetClinicalAIService(): void {
  serviceInstance = null;
}
