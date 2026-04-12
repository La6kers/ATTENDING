/**
 * ATTENDING AI - AI Provider Abstraction
 * 
 * Provides a unified interface for multiple AI providers.
 * Enables swapping between BioMistral, OpenAI, Anthropic Claude,
 * and mock providers without changing application code.
 * 
 * @module @attending/shared/services/ai-providers
 * @author ATTENDING AI Team
 */

import {
  CLINICAL_SYSTEM_PROMPT,
  buildExtractionPrompt,
  buildDifferentialPrompt,
  buildDocumentationPrompt,
  buildInteractionPrompt,
  buildOrderPrompt,
} from './clinicalPrompts';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AIProviderType = 'biomistral' | 'openai' | 'anthropic' | 'azure-openai' | 'mock';

export type ClinicalTaskType =
  | 'extraction'        // Extract structured data from text — needs ~500 output tokens
  | 'differential'      // Generate differential diagnosis — needs ~1000 output tokens
  | 'documentation'     // Generate SOAP/HPI/notes — needs ~1500 output tokens
  | 'interaction_check' // Drug interaction check — needs ~500 output tokens
  | 'order_recommend'   // Lab/imaging recommendations — needs ~500 output tokens
  | 'image_analysis'    // Vision analysis — needs ~1000 output tokens
  | 'general';          // Uncategorized — uses default 2048

// Task-specific maxTokens limits to avoid wasting output tokens
const TASK_TOKEN_LIMITS: Record<ClinicalTaskType, number> = {
  extraction: 512,
  differential: 1024,
  documentation: 1536,
  interaction_check: 512,
  order_recommend: 512,
  image_analysis: 1024,
  general: 2048,
};

export function getMaxTokensForTask(task: ClinicalTaskType): number {
  return TASK_TOKEN_LIMITS[task] || 2048;
}

export interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
  taskType?: ClinicalTaskType;
}

export interface AICompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProviderType;
  latency: number;
  cached?: boolean;
}

export interface AIImageAnalysisResult {
  description: string;
  findings: string[];
  confidence: number;
  annotations?: ImageAnnotation[];
  rawResponse?: any;
}

export interface ImageAnnotation {
  label: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface AITranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  segments?: TranscriptionSegment[];
  duration: number;
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AIEmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

// ============================================================================
// Clinical-Specific Types
// ============================================================================

export interface ClinicalExtractionResult {
  chiefComplaint?: string;
  symptoms: string[];
  duration?: string;
  severity?: string;
  medications: string[];
  allergies: string[];
  vitalSigns?: Record<string, string>;
  redFlags: string[];
  confidence: number;
}

export interface DifferentialDiagnosisResult {
  diagnoses: Array<{
    name: string;
    icdCode?: string;
    probability: number;
    supportingFindings: string[];
    contradictingFindings: string[];
    recommendedTests: string[];
  }>;
  urgency: 'routine' | 'urgent' | 'emergent';
  reasoning: string;
}

export interface PatientContext {
  age?: number;
  sex?: 'male' | 'female' | 'other';
  medicalHistory?: string[];
  currentMedications?: string[];
  allergies?: string[];
  vitals?: Record<string, string>;
}

export interface EncounterData {
  chiefComplaint: string;
  hpiText?: string;
  symptoms?: string[];
  physicalExam?: string;
  vitalSigns?: Record<string, string>;
  assessments?: string[];
  orders?: string[];
}

export interface DrugInteractionResult {
  interactions: Array<{
    drugs: string[];
    severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
    description: string;
    recommendation: string;
  }>;
  overallRisk: 'low' | 'moderate' | 'high';
}

export interface OrderRecommendation {
  type: 'lab' | 'imaging' | 'referral' | 'procedure';
  name: string;
  code?: string;
  rationale: string;
  priority: 'routine' | 'urgent' | 'stat';
  confidence: number;
}

// ============================================================================
// AI Provider Interface
// ============================================================================

export interface IAIProvider {
  readonly providerType: AIProviderType;
  readonly modelId: string;

  /** Text completion/chat */
  complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult>;

  /** Analyze a medical image (X-ray, CT, etc.) */
  analyzeImage?(imageBase64: string, prompt?: string): Promise<AIImageAnalysisResult>;

  /** Transcribe audio (voice input) */
  transcribe?(audioBase64: string, language?: string): Promise<AITranscriptionResult>;

  /** Generate embeddings for semantic search */
  embed?(text: string): Promise<AIEmbeddingResult>;

  /** Check if the provider is available/healthy */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// Clinical AI Interface (Domain-Specific)
// ============================================================================

export interface IClinicalAIProvider extends IAIProvider {
  /** Extract structured clinical data from free text */
  extractClinicalData(text: string): Promise<ClinicalExtractionResult>;

  /** Generate differential diagnosis */
  generateDifferential(
    symptoms: string[],
    patientContext?: PatientContext
  ): Promise<DifferentialDiagnosisResult>;

  /** Generate clinical documentation (SOAP note, etc.) */
  generateDocumentation(
    encounter: EncounterData,
    format: 'soap' | 'hpi' | 'assessment' | 'plan'
  ): Promise<string>;

  /** Check for drug interactions */
  checkInteractions(medications: string[]): Promise<DrugInteractionResult>;

  /** Recommend lab/imaging orders */
  recommendOrders(
    diagnosis: string,
    currentOrders: string[]
  ): Promise<OrderRecommendation[]>;
}

// ============================================================================
// BioMistral Provider (Healthcare-Specific)
// ============================================================================

export class BioMistralProvider implements IClinicalAIProvider {
  readonly providerType: AIProviderType = 'biomistral';
  readonly modelId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || process.env.BIOMISTRAL_BASE_URL || 'https://api.biomistral.ai/v1';
    this.modelId = config.model || process.env.BIOMISTRAL_MODEL || 'biomistral-7b-clinical';
  }

  async complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();

    const response = await fetch(`${this.baseUrl}/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        prompt: options?.systemPrompt ? `${options.systemPrompt}\n\n${prompt}` : prompt,
        max_tokens: options?.maxTokens || getMaxTokensForTask(options?.taskType || 'general'),
        temperature: options?.temperature || 0.3,
        top_p: options?.topP || 0.9,
        stop: options?.stopSequences,
      }),
    });

    if (!response.ok) {
      throw new Error(`BioMistral API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].text,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: this.modelId,
      provider: this.providerType,
      latency: Date.now() - startTime,
    };
  }

  async extractClinicalData(text: string): Promise<ClinicalExtractionResult> {
    const result = await this.complete(buildExtractionPrompt(text), {
      temperature: 0.1,
      responseFormat: 'json',
      taskType: 'extraction',
      systemPrompt: CLINICAL_SYSTEM_PROMPT,
    });

    try {
      const parsed = JSON.parse(result.content);
      return { ...parsed, confidence: 0.85 };
    } catch {
      return { symptoms: [], medications: [], allergies: [], redFlags: [], confidence: 0 };
    }
  }

  async generateDifferential(
    symptoms: string[],
    context?: PatientContext
  ): Promise<DifferentialDiagnosisResult> {
    const result = await this.complete(buildDifferentialPrompt(symptoms, context), {
      temperature: 0.2,
      taskType: 'differential',
      systemPrompt: CLINICAL_SYSTEM_PROMPT,
    });

    try {
      return JSON.parse(result.content);
    } catch {
      return { diagnoses: [], urgency: 'routine', reasoning: 'Unable to generate differential' };
    }
  }

  async generateDocumentation(encounter: EncounterData, format: 'soap' | 'hpi' | 'assessment' | 'plan'): Promise<string> {
    const result = await this.complete(buildDocumentationPrompt(encounter, format), {
      temperature: 0.3,
      taskType: 'documentation',
      systemPrompt: CLINICAL_SYSTEM_PROMPT,
    });
    return result.content;
  }

  async checkInteractions(medications: string[]): Promise<DrugInteractionResult> {
    const result = await this.complete(buildInteractionPrompt(medications), {
      temperature: 0.1,
      taskType: 'interaction_check',
      systemPrompt: CLINICAL_SYSTEM_PROMPT,
    });

    try {
      return JSON.parse(result.content);
    } catch {
      return { interactions: [], overallRisk: 'low' };
    }
  }

  async recommendOrders(diagnosis: string, currentOrders: string[]): Promise<OrderRecommendation[]> {
    const result = await this.complete(buildOrderPrompt(diagnosis, currentOrders), {
      temperature: 0.2,
      taskType: 'order_recommend',
      systemPrompt: CLINICAL_SYSTEM_PROMPT,
    });

    try {
      return JSON.parse(result.content);
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.complete('Health check', { maxTokens: 10 });
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// OpenAI Provider
// ============================================================================

export class OpenAIProvider implements IClinicalAIProvider {
  readonly providerType: AIProviderType = 'openai';
  readonly modelId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.modelId = config.model || 'gpt-4-turbo-preview';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        max_tokens: options?.maxTokens || getMaxTokensForTask(options?.taskType || 'general'),
        temperature: options?.temperature || 0.3,
        top_p: options?.topP || 0.9,
        stop: options?.stopSequences,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: this.modelId,
      provider: this.providerType,
      latency: Date.now() - startTime,
    };
  }

  async analyzeImage(imageBase64: string, prompt?: string): Promise<AIImageAnalysisResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Analyze this medical image. Describe findings and any abnormalities.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        }],
        max_tokens: getMaxTokensForTask('image_analysis'),
      }),
    });

    const data = await response.json();
    return {
      description: data.choices[0].message.content,
      findings: [],
      confidence: 0.8,
    };
  }

  async transcribe(audioBase64: string, language?: string): Promise<AITranscriptionResult> {
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper-1');
    if (language) formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData,
    });

    const data = await response.json();
    return {
      text: data.text,
      confidence: 0.95,
      language: data.language,
      duration: data.duration,
      segments: data.segments?.map((s: any) => ({
        text: s.text,
        start: s.start,
        end: s.end,
        confidence: s.confidence || 0.9,
      })),
    };
  }

  async embed(text: string): Promise<AIEmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });

    const data = await response.json();
    return {
      embedding: data.data[0].embedding,
      model: 'text-embedding-3-small',
      dimensions: data.data[0].embedding.length,
    };
  }

  async extractClinicalData(text: string): Promise<ClinicalExtractionResult> {
    const result = await this.complete(
      `Extract structured clinical information from: "${text}"
       Return JSON: { chiefComplaint, symptoms[], duration, severity, medications[], allergies[], redFlags[] }`,
      { temperature: 0.1, responseFormat: 'json' }
    );
    try {
      return { ...JSON.parse(result.content), confidence: 0.9 };
    } catch {
      return { symptoms: [], medications: [], allergies: [], redFlags: [], confidence: 0 };
    }
  }

  async generateDifferential(symptoms: string[], context?: PatientContext): Promise<DifferentialDiagnosisResult> {
    const result = await this.complete(
      `Generate differential diagnosis for: ${symptoms.join(', ')}
       Patient context: ${JSON.stringify(context || {})}
       Return JSON with diagnoses array and urgency level.`,
      { temperature: 0.2 }
    );
    try {
      return JSON.parse(result.content);
    } catch {
      return { diagnoses: [], urgency: 'routine', reasoning: '' } as any;
    }
  }

  async generateDocumentation(encounter: EncounterData, format: string): Promise<string> {
    const result = await this.complete(
      `Generate ${format.toUpperCase()} note for: ${JSON.stringify(encounter)}`,
      { temperature: 0.3 }
    );
    return result.content;
  }

  async checkInteractions(medications: string[]): Promise<DrugInteractionResult> {
    const result = await this.complete(
      `Check drug interactions: ${medications.join(', ')}. Return JSON.`,
      { temperature: 0.1, responseFormat: 'json' }
    );
    try {
      return JSON.parse(result.content);
    } catch {
      return { interactions: [], overallRisk: 'low' };
    }
  }

  async recommendOrders(diagnosis: string, currentOrders: string[]): Promise<OrderRecommendation[]> {
    const result = await this.complete(
      `Recommend orders for ${diagnosis}. Current: ${currentOrders.join(', ')}. Return JSON array.`,
      { temperature: 0.2, responseFormat: 'json' }
    );
    try {
      return JSON.parse(result.content);
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.complete('test', { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Anthropic Claude Provider
// ============================================================================

export class AnthropicProvider implements IClinicalAIProvider {
  readonly providerType: AIProviderType = 'anthropic';
  readonly modelId: string;
  private apiKey: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.modelId = config.model || 'claude-3-5-sonnet-20241022';
  }

  async complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: options?.maxTokens || getMaxTokensForTask(options?.taskType || 'general'),
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: this.modelId,
      provider: this.providerType,
      latency: Date.now() - startTime,
    };
  }

  async extractClinicalData(text: string): Promise<ClinicalExtractionResult> {
    const result = await this.complete(
      `Extract clinical data from: "${text}". Return only valid JSON with: chiefComplaint, symptoms[], medications[], allergies[], redFlags[].`,
      { temperature: 0.1 }
    );
    try {
      return { ...JSON.parse(result.content), confidence: 0.9 };
    } catch {
      return { symptoms: [], medications: [], allergies: [], redFlags: [], confidence: 0 };
    }
  }

  async generateDifferential(symptoms: string[], context?: PatientContext): Promise<DifferentialDiagnosisResult> {
    const result = await this.complete(
      `Differential for: ${symptoms.join(', ')}. Context: ${JSON.stringify(context)}. Return JSON only with diagnoses array and urgency.`,
      { temperature: 0.2 }
    );
    try {
      return JSON.parse(result.content);
    } catch {
      return { diagnoses: [], urgency: 'routine', reasoning: '' };
    }
  }

  async generateDocumentation(encounter: EncounterData, format: string): Promise<string> {
    return (await this.complete(`Generate ${format} for: ${JSON.stringify(encounter)}`)).content;
  }

  async checkInteractions(medications: string[]): Promise<DrugInteractionResult> {
    const result = await this.complete(`Drug interactions: ${medications.join(', ')}. Return JSON only.`);
    try {
      return JSON.parse(result.content);
    } catch {
      return { interactions: [], overallRisk: 'low' };
    }
  }

  async recommendOrders(diagnosis: string, currentOrders: string[]): Promise<OrderRecommendation[]> {
    const result = await this.complete(`Orders for ${diagnosis}. Current: ${currentOrders.join(', ')}. Return JSON array only.`);
    try {
      return JSON.parse(result.content);
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.complete('test', { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Azure OpenAI Provider (HIPAA BAA, uses api-key header, deployment-based URL)
// ============================================================================

export class AzureOpenAIProvider implements IClinicalAIProvider {
  readonly providerType: AIProviderType = 'azure-openai';
  readonly modelId: string;
  private apiKey: string;
  private endpoint: string;
  private deployment: string;
  private apiVersion: string;

  constructor(config: { apiKey: string; endpoint: string; deployment: string; apiVersion?: string }) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint.replace(/\/$/, ''); // strip trailing slash
    this.deployment = config.deployment;
    this.apiVersion = config.apiVersion || '2024-10-21';
    this.modelId = config.deployment;
  }

  private get completionsUrl(): string {
    return `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
  }

  async complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(this.completionsUrl, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        max_tokens: options?.maxTokens || getMaxTokensForTask(options?.taskType || 'general'),
        temperature: options?.temperature || 0.3,
        top_p: options?.topP || 0.9,
        stop: options?.stopSequences,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: this.deployment,
      provider: this.providerType,
      latency: Date.now() - startTime,
    };
  }

  async extractClinicalData(text: string): Promise<ClinicalExtractionResult> {
    const result = await this.complete(
      `Extract structured clinical information from: "${text}"
       Return JSON: { chiefComplaint, symptoms[], duration, severity, medications[], allergies[], redFlags[] }`,
      { temperature: 0.1, responseFormat: 'json', taskType: 'extraction' }
    );
    try {
      return { ...JSON.parse(result.content), confidence: 0.9 };
    } catch {
      return { symptoms: [], medications: [], allergies: [], redFlags: [], confidence: 0 };
    }
  }

  async generateDifferential(symptoms: string[], context?: PatientContext): Promise<DifferentialDiagnosisResult> {
    const result = await this.complete(
      `Generate differential diagnosis for: ${symptoms.join(', ')}
       Patient context: ${JSON.stringify(context || {})}
       Return JSON with diagnoses array and urgency level.`,
      { temperature: 0.2, responseFormat: 'json', taskType: 'differential' }
    );
    try {
      return JSON.parse(result.content);
    } catch {
      return { diagnoses: [], urgency: 'routine', reasoning: '' };
    }
  }

  async generateDocumentation(encounter: EncounterData, format: string): Promise<string> {
    return (await this.complete(
      `Generate ${format.toUpperCase()} note for: ${JSON.stringify(encounter)}`,
      { temperature: 0.3, taskType: 'documentation' }
    )).content;
  }

  async checkInteractions(medications: string[]): Promise<DrugInteractionResult> {
    const result = await this.complete(
      `Check drug interactions: ${medications.join(', ')}. Return JSON with interactions array and overallRisk.`,
      { temperature: 0.1, responseFormat: 'json', taskType: 'interaction_check' }
    );
    try {
      return JSON.parse(result.content);
    } catch {
      return { interactions: [], overallRisk: 'low' };
    }
  }

  async recommendOrders(diagnosis: string, currentOrders: string[]): Promise<OrderRecommendation[]> {
    const result = await this.complete(
      `Orders for ${diagnosis}. Current: ${currentOrders.join(', ')}. Return JSON array with type, name, code, rationale, priority, confidence.`,
      { temperature: 0.2, responseFormat: 'json', taskType: 'order_recommend' }
    );
    try {
      return JSON.parse(result.content);
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.complete('test', { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Mock Provider (for testing & development)
// ============================================================================

export class MockAIProvider implements IClinicalAIProvider {
  readonly providerType: AIProviderType = 'mock';
  readonly modelId = 'mock-model';
  
  private delay: number;
  private shouldFail: boolean;

  constructor(config: { delay?: number; shouldFail?: boolean } = {}) {
    this.delay = config.delay || 100;
    this.shouldFail = config.shouldFail || false;
  }

  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
  }

  async complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult> {
    await this.simulateDelay();
    
    if (this.shouldFail) {
      throw new Error('Mock provider configured to fail');
    }

    return {
      content: `Mock response to: "${prompt.substring(0, 50)}..."`,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      model: this.modelId,
      provider: this.providerType,
      latency: this.delay,
    };
  }

  async extractClinicalData(_text: string): Promise<ClinicalExtractionResult> {
    await this.simulateDelay();
    return {
      chiefComplaint: 'Mock chief complaint',
      symptoms: ['headache', 'fatigue'],
      duration: '3 days',
      severity: 'moderate',
      medications: ['aspirin'],
      allergies: ['penicillin'],
      redFlags: [],
      confidence: 0.95,
    };
  }

  async generateDifferential(symptoms: string[]): Promise<DifferentialDiagnosisResult> {
    await this.simulateDelay();
    return {
      diagnoses: [
        {
          name: 'Migraine without aura',
          icdCode: 'G43.909',
          probability: 75,
          supportingFindings: symptoms,
          contradictingFindings: [],
          recommendedTests: ['CBC', 'BMP'],
        },
        {
          name: 'Tension-type headache',
          icdCode: 'G44.209',
          probability: 25,
          supportingFindings: ['headache'],
          contradictingFindings: [],
          recommendedTests: [],
        },
      ],
      urgency: 'routine',
      reasoning: 'Mock differential reasoning based on provided symptoms',
    };
  }

  async generateDocumentation(encounter: EncounterData, format: string): Promise<string> {
    await this.simulateDelay();
    return `Mock ${format.toUpperCase()} Note\n\nChief Complaint: ${encounter.chiefComplaint}\n\nThis is a mock clinical note for testing purposes.`;
  }

  async checkInteractions(medications: string[]): Promise<DrugInteractionResult> {
    await this.simulateDelay();
    return {
      interactions: medications.length > 1 ? [{
        drugs: medications.slice(0, 2),
        severity: 'minor',
        description: 'Mock interaction detected',
        recommendation: 'Monitor closely',
      }] : [],
      overallRisk: 'low',
    };
  }

  async recommendOrders(_diagnosis: string): Promise<OrderRecommendation[]> {
    await this.simulateDelay();
    return [
      {
        type: 'lab',
        name: 'Complete Blood Count',
        code: '85025',
        rationale: 'Baseline evaluation',
        priority: 'routine',
        confidence: 0.9,
      },
      {
        type: 'lab',
        name: 'Basic Metabolic Panel',
        code: '80048',
        rationale: 'Assess electrolytes and kidney function',
        priority: 'routine',
        confidence: 0.85,
      },
    ];
  }

  async healthCheck(): Promise<boolean> {
    await this.simulateDelay();
    return !this.shouldFail;
  }
}

// ============================================================================
// AI Provider Factory
// ============================================================================

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  options?: Record<string, any>;
}

export class AIProviderFactory {
  private static providers = new Map<AIProviderType, IAIProvider>();
  private static defaultProvider: AIProviderType = 'mock';

  /**
   * Create a provider instance
   */
  static create(config: AIProviderConfig): IAIProvider {
    switch (config.provider) {
      case 'biomistral':
        return new BioMistralProvider({
          apiKey: config.apiKey!,
          baseUrl: config.baseUrl,
          model: config.model,
        });

      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey!,
          model: config.model,
          baseUrl: config.baseUrl,
        });

      case 'anthropic':
        return new AnthropicProvider({
          apiKey: config.apiKey!,
          model: config.model,
        });

      case 'azure-openai':
        return new AzureOpenAIProvider({
          apiKey: config.apiKey || process.env.AZURE_OPENAI_KEY || '',
          endpoint: config.baseUrl || process.env.AZURE_OPENAI_ENDPOINT || '',
          deployment: config.model || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
        });

      case 'mock':
      default:
        return new MockAIProvider(config.options);
    }
  }

  /**
   * Get or create a singleton provider
   */
  static getProvider(type?: AIProviderType): IAIProvider {
    const providerType = type || this.defaultProvider;
    
    if (!this.providers.has(providerType)) {
      const config = this.getConfigFromEnv(providerType);
      this.providers.set(providerType, this.create(config));
    }

    return this.providers.get(providerType)!;
  }

  /**
   * Get provider config from environment variables
   */
  private static getConfigFromEnv(provider: AIProviderType): AIProviderConfig {
    switch (provider) {
      case 'biomistral':
        return {
          provider: 'biomistral',
          apiKey: process.env.BIOMISTRAL_API_KEY,
          baseUrl: process.env.BIOMISTRAL_BASE_URL,
          model: process.env.BIOMISTRAL_MODEL,
        };

      case 'openai':
        return {
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
        };

      case 'anthropic':
        return {
          provider: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL,
        };

      case 'azure-openai':
        return {
          provider: 'azure-openai',
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          baseUrl: process.env.AZURE_OPENAI_ENDPOINT,
          model: process.env.AZURE_OPENAI_DEPLOYMENT,
        };

      default:
        return { provider: 'mock' };
    }
  }

  /**
   * Set the default provider type
   */
  static setDefaultProvider(type: AIProviderType): void {
    this.defaultProvider = type;
  }

  /**
   * Register a custom provider
   */
  static registerProvider(type: AIProviderType, provider: IAIProvider): void {
    this.providers.set(type, provider);
  }

  /**
   * Clear all cached providers
   */
  static clearProviders(): void {
    this.providers.clear();
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the configured AI provider based on environment
 */
export function getAIProvider(): IClinicalAIProvider {
  const providerType = (process.env.AI_PROVIDER as AIProviderType) || 'mock';
  return AIProviderFactory.getProvider(providerType) as IClinicalAIProvider;
}

/**
 * Get the current AI provider type from environment
 */
export function getCurrentProviderType(): AIProviderType {
  return (process.env.AI_PROVIDER as AIProviderType) || 'mock';
}

export default AIProviderFactory;
