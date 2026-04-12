// =============================================================================
// ATTENDING AI - Ambient Clinical Listening Service
// apps/shared/services/ambient/AmbientListeningService.ts
//
// Real-time audio capture and processing for clinical encounters
// Filters non-medical content, identifies speakers, extracts clinical data
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type SpeakerRole = 'provider' | 'patient' | 'family' | 'unknown';
export type SessionStatus = 'idle' | 'recording' | 'paused' | 'processing' | 'complete' | 'error';

export interface AudioChunk {
  id: string;
  timestamp: number;
  duration: number;
  audioData: ArrayBuffer | string; // Base64 for serialization
  sampleRate: number;
  channels: number;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  timestamp: number;
  duration: number;
  speaker: SpeakerRole;
  isMedicalContent: boolean;
  entities: ExtractedEntity[];
  alternatives?: string[];
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  normalizedValue?: string;
  code?: {
    system: 'ICD10' | 'SNOMED' | 'LOINC' | 'RXNORM' | 'CPT';
    code: string;
    display: string;
  };
  confidence: number;
  startOffset: number;
  endOffset: number;
  context?: string;
}

export type EntityType = 
  | 'chief_complaint'
  | 'symptom'
  | 'symptom_onset'
  | 'symptom_duration'
  | 'symptom_severity'
  | 'symptom_location'
  | 'symptom_quality'
  | 'aggravating_factor'
  | 'relieving_factor'
  | 'associated_symptom'
  | 'medication'
  | 'medication_dose'
  | 'medication_frequency'
  | 'allergy'
  | 'allergy_reaction'
  | 'condition'
  | 'procedure'
  | 'vital_sign'
  | 'lab_value'
  | 'family_history'
  | 'social_history'
  | 'physical_exam_finding'
  | 'assessment'
  | 'plan_item'
  | 'follow_up';

export interface ListeningSession {
  id: string;
  encounterId: string;
  patientId: string;
  providerId: string;
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  pausedDuration: number;
  transcriptions: TranscriptionResult[];
  extractedData: ClinicalExtraction;
  audioChunks: string[]; // IDs only, audio stored separately
  settings: SessionSettings;
  metadata: SessionMetadata;
}

export interface SessionSettings {
  enableSpeakerDiarization: boolean;
  enableMedicalFiltering: boolean;
  language: string;
  specialty?: string;
  sensitivityLevel: 'standard' | 'high' | 'pediatric' | 'psychiatric';
  autoGenerateNote: boolean;
  realTimeTranscription: boolean;
}

export interface SessionMetadata {
  deviceInfo?: string;
  audioQuality: 'low' | 'medium' | 'high';
  noiseLevel: number;
  totalAudioDuration: number;
  medicalContentDuration: number;
  wordCount: number;
  speakerBreakdown: Record<SpeakerRole, number>;
}

export interface ClinicalExtraction {
  chiefComplaint?: string;
  hpiElements: HPIElements;
  reviewOfSystems: ReviewOfSystems;
  medications: MedicationMention[];
  allergies: AllergyMention[];
  conditions: ConditionMention[];
  vitals: VitalMention[];
  physicalExam: PhysicalExamFindings;
  assessment: AssessmentData;
  plan: PlanItem[];
  socialHistory: SocialHistoryData;
  familyHistory: FamilyHistoryData;
}

export interface HPIElements {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: string;
  aggravatingFactors: string[];
  relievingFactors: string[];
  associatedSymptoms: string[];
  timing?: string;
  context?: string;
}

export interface ReviewOfSystems {
  constitutional: string[];
  eyes: string[];
  enmt: string[];
  cardiovascular: string[];
  respiratory: string[];
  gastrointestinal: string[];
  genitourinary: string[];
  musculoskeletal: string[];
  integumentary: string[];
  neurological: string[];
  psychiatric: string[];
  endocrine: string[];
  hematologic: string[];
  allergicImmunologic: string[];
}

export interface MedicationMention {
  name: string;
  dose?: string;
  frequency?: string;
  route?: string;
  indication?: string;
  status: 'current' | 'past' | 'proposed' | 'discontinued';
  rxnormCode?: string;
}

export interface AllergyMention {
  allergen: string;
  reaction?: string;
  severity?: string;
  type: 'drug' | 'food' | 'environmental' | 'other';
}

export interface ConditionMention {
  name: string;
  status: 'active' | 'resolved' | 'historical';
  icd10Code?: string;
  snomedCode?: string;
}

export interface VitalMention {
  type: string;
  value: string;
  unit?: string;
  timestamp?: Date;
}

export interface PhysicalExamFindings {
  general: string[];
  heent: string[];
  neck: string[];
  cardiovascular: string[];
  respiratory: string[];
  abdomen: string[];
  extremities: string[];
  neurological: string[];
  skin: string[];
  psychiatric: string[];
}

export interface AssessmentData {
  primaryDiagnosis?: string;
  differentials: string[];
  clinicalImpression?: string;
}

export interface PlanItem {
  category: 'medication' | 'lab' | 'imaging' | 'referral' | 'procedure' | 'education' | 'follow_up' | 'other';
  description: string;
  details?: string;
  priority?: 'routine' | 'urgent' | 'emergent';
}

export interface SocialHistoryData {
  tobacco?: string;
  alcohol?: string;
  drugs?: string;
  occupation?: string;
  exercise?: string;
  diet?: string;
  sexualHistory?: string;
  livingSituation?: string;
}

export interface FamilyHistoryData {
  conditions: Array<{
    condition: string;
    relation: string;
  }>;
}

// =============================================================================
// MEDICAL CONTENT CLASSIFIER
// =============================================================================

const MEDICAL_KEYWORDS = new Set([
  // Symptoms
  'pain', 'ache', 'hurt', 'sore', 'tender', 'swelling', 'swollen', 'numb', 'tingling',
  'weakness', 'fatigue', 'tired', 'dizzy', 'lightheaded', 'nausea', 'vomiting',
  'diarrhea', 'constipation', 'fever', 'chills', 'cough', 'wheeze', 'breath',
  'headache', 'migraine', 'rash', 'itch', 'bleeding', 'discharge', 'lump', 'mass',
  
  // Body parts
  'head', 'chest', 'abdomen', 'stomach', 'back', 'neck', 'arm', 'leg', 'knee',
  'shoulder', 'hip', 'ankle', 'wrist', 'elbow', 'throat', 'ear', 'eye', 'nose',
  'heart', 'lung', 'liver', 'kidney', 'bladder', 'bowel', 'joint', 'muscle',
  
  // Medical terms
  'diagnosis', 'treatment', 'medication', 'prescription', 'dose', 'dosage',
  'allergy', 'allergic', 'condition', 'disease', 'disorder', 'syndrome',
  'symptom', 'chronic', 'acute', 'history', 'surgery', 'procedure', 'test',
  'lab', 'bloodwork', 'xray', 'scan', 'mri', 'ct', 'ultrasound', 'biopsy',
  
  // Actions
  'taking', 'prescribed', 'started', 'stopped', 'increased', 'decreased',
  'examined', 'checked', 'measured', 'ordered', 'referred', 'diagnosed',
  
  // Time/severity
  'worse', 'better', 'severe', 'mild', 'moderate', 'constant', 'intermittent',
  'days', 'weeks', 'months', 'years', 'ago', 'since', 'started', 'began',
]);

const NON_MEDICAL_PHRASES = [
  'how are you',
  'nice to meet',
  'have a seat',
  'weather',
  'parking',
  'insurance card',
  'waiting room',
  'check in',
  'sign here',
  'copay',
  'appointment',
  'schedule',
  'running late',
  'be right back',
  'excuse me',
  'thank you',
  'you\'re welcome',
  'take care',
  'see you',
  'goodbye',
  'hello',
  'how\'s your day',
];

// =============================================================================
// AMBIENT LISTENING SERVICE
// =============================================================================

export class AmbientListeningService extends EventEmitter {
  private currentSession: ListeningSession | null = null;
  private audioBuffer: AudioChunk[] = [];
  private transcriptionQueue: TranscriptionResult[] = [];
  private isProcessing = false;

  // =========================================================================
  // SESSION MANAGEMENT
  // =========================================================================

  async startSession(
    encounterId: string,
    patientId: string,
    providerId: string,
    settings: Partial<SessionSettings> = {}
  ): Promise<ListeningSession> {
    if (this.currentSession?.status === 'recording') {
      throw new Error('A session is already in progress');
    }

    const sessionSettings: SessionSettings = {
      enableSpeakerDiarization: true,
      enableMedicalFiltering: true,
      language: 'en-US',
      sensitivityLevel: 'standard',
      autoGenerateNote: true,
      realTimeTranscription: true,
      ...settings,
    };

    this.currentSession = {
      id: `ambient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      encounterId,
      patientId,
      providerId,
      status: 'recording',
      startTime: new Date(),
      pausedDuration: 0,
      transcriptions: [],
      extractedData: this.initializeExtractedData(),
      audioChunks: [],
      settings: sessionSettings,
      metadata: {
        audioQuality: 'high',
        noiseLevel: 0,
        totalAudioDuration: 0,
        medicalContentDuration: 0,
        wordCount: 0,
        speakerBreakdown: {
          provider: 0,
          patient: 0,
          family: 0,
          unknown: 0,
        },
      },
    };

    this.emit('sessionStarted', this.currentSession);
    console.log(`[AmbientListening] Session started: ${this.currentSession.id}`);

    return this.currentSession;
  }

  async pauseSession(): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== 'recording') {
      throw new Error('No active recording session to pause');
    }

    this.currentSession.status = 'paused';
    this.emit('sessionPaused', this.currentSession);
  }

  async resumeSession(): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== 'paused') {
      throw new Error('No paused session to resume');
    }

    this.currentSession.status = 'recording';
    this.emit('sessionResumed', this.currentSession);
  }

  async endSession(): Promise<ListeningSession> {
    if (!this.currentSession) {
      throw new Error('No active session to end');
    }

    this.currentSession.status = 'processing';
    this.currentSession.endTime = new Date();
    this.emit('sessionEnding', this.currentSession);

    // Process any remaining audio
    await this.flushAudioBuffer();

    // Final extraction pass
    await this.performFinalExtraction();

    this.currentSession.status = 'complete';
    this.emit('sessionComplete', this.currentSession);

    const completedSession = this.currentSession;
    this.currentSession = null;
    this.audioBuffer = [];
    this.transcriptionQueue = [];

    return completedSession;
  }

  getSession(): ListeningSession | null {
    return this.currentSession;
  }

  // =========================================================================
  // AUDIO PROCESSING
  // =========================================================================

  async processAudioChunk(chunk: AudioChunk): Promise<TranscriptionResult | null> {
    if (!this.currentSession || this.currentSession.status !== 'recording') {
      return null;
    }

    this.audioBuffer.push(chunk);
    this.currentSession.audioChunks.push(chunk.id);
    this.currentSession.metadata.totalAudioDuration += chunk.duration;

    // Process when buffer has enough audio (2 seconds)
    const totalBufferDuration = this.audioBuffer.reduce((sum, c) => sum + c.duration, 0);
    if (totalBufferDuration >= 2000) {
      return this.processBufferedAudio();
    }

    return null;
  }

  private async processBufferedAudio(): Promise<TranscriptionResult | null> {
    if (this.isProcessing || this.audioBuffer.length === 0) {
      return null;
    }

    this.isProcessing = true;
    const chunksToProcess = [...this.audioBuffer];
    this.audioBuffer = [];

    try {
      // In production, this would call a speech-to-text API
      const transcription = await this.transcribeAudio(chunksToProcess);
      
      if (transcription) {
        // Identify speaker
        transcription.speaker = await this.identifySpeaker(transcription);
        
        // Check if medical content
        transcription.isMedicalContent = this.isMedicalContent(transcription.text);
        
        if (transcription.isMedicalContent || !this.currentSession?.settings.enableMedicalFiltering) {
          // Extract clinical entities
          transcription.entities = this.extractEntities(transcription.text);
          
          // Update extracted data
          this.updateExtractedData(transcription);
          
          // Add to session
          this.currentSession?.transcriptions.push(transcription);
          this.currentSession!.metadata.wordCount += transcription.text.split(/\s+/).length;
          
          if (transcription.isMedicalContent) {
            const duration = chunksToProcess.reduce((sum, c) => sum + c.duration, 0);
            this.currentSession!.metadata.medicalContentDuration += duration;
          }
          
          // Update speaker breakdown
          this.currentSession!.metadata.speakerBreakdown[transcription.speaker] += 
            transcription.text.split(/\s+/).length;

          this.emit('transcription', transcription);
          return transcription;
        }
      }

      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  private async flushAudioBuffer(): Promise<void> {
    while (this.audioBuffer.length > 0) {
      await this.processBufferedAudio();
    }
  }

  // =========================================================================
  // TRANSCRIPTION (Simulated - would use real STT in production)
  // =========================================================================

  private async transcribeAudio(chunks: AudioChunk[]): Promise<TranscriptionResult | null> {
    // In production, this would call:
    // - Google Cloud Speech-to-Text
    // - AWS Transcribe Medical
    // - Azure Speech Services
    // - Whisper API
    
    // For now, return null - actual transcription would come from the frontend
    // via WebSocket with real microphone data
    
    return null;
  }

  // Method to receive transcription from external STT service
  async ingestTranscription(
    text: string,
    confidence: number = 0.9,
    timestamp: number = Date.now()
  ): Promise<TranscriptionResult | null> {
    if (!this.currentSession || this.currentSession.status !== 'recording') {
      return null;
    }

    const transcription: TranscriptionResult = {
      id: `trans_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      confidence,
      timestamp,
      duration: 0,
      speaker: 'unknown',
      isMedicalContent: false,
      entities: [],
    };

    // Identify speaker
    transcription.speaker = await this.identifySpeaker(transcription);
    
    // Check if medical content
    transcription.isMedicalContent = this.isMedicalContent(transcription.text);
    
    if (transcription.isMedicalContent || !this.currentSession.settings.enableMedicalFiltering) {
      // Extract clinical entities
      transcription.entities = this.extractEntities(transcription.text);
      
      // Update extracted data
      this.updateExtractedData(transcription);
      
      // Add to session
      this.currentSession.transcriptions.push(transcription);
      this.currentSession.metadata.wordCount += transcription.text.split(/\s+/).length;
      
      // Update speaker breakdown
      this.currentSession.metadata.speakerBreakdown[transcription.speaker] += 
        transcription.text.split(/\s+/).length;

      this.emit('transcription', transcription);
      return transcription;
    }

    return null;
  }

  // =========================================================================
  // SPEAKER DIARIZATION
  // =========================================================================

  private async identifySpeaker(transcription: TranscriptionResult): Promise<SpeakerRole> {
    const text = transcription.text.toLowerCase();

    // Provider indicators
    const providerPhrases = [
      'let me examine', 'i\'m going to', 'we\'ll order', 'i recommend',
      'your blood pressure', 'the test shows', 'i think', 'my assessment',
      'take a deep breath', 'does it hurt when', 'on a scale of',
      'any allergies', 'current medications', 'medical history',
    ];

    // Patient indicators
    const patientPhrases = [
      'i feel', 'i have', 'it hurts', 'i\'ve been', 'i noticed',
      'my pain', 'i take', 'i\'m allergic', 'my doctor', 'started yesterday',
      'getting worse', 'i can\'t', 'i haven\'t', 'makes it worse',
    ];

    const providerScore = providerPhrases.filter(p => text.includes(p)).length;
    const patientScore = patientPhrases.filter(p => text.includes(p)).length;

    if (providerScore > patientScore) return 'provider';
    if (patientScore > providerScore) return 'patient';

    // Check for questions (providers ask more questions)
    if (text.includes('?')) {
      return text.startsWith('what') || text.startsWith('how') || 
             text.startsWith('when') || text.startsWith('where') ||
             text.startsWith('do you') || text.startsWith('have you')
        ? 'provider' : 'patient';
    }

    return 'unknown';
  }

  // =========================================================================
  // MEDICAL CONTENT FILTERING
  // =========================================================================

  private isMedicalContent(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Check for non-medical phrases
    for (const phrase of NON_MEDICAL_PHRASES) {
      if (lowerText.includes(phrase)) {
        // But might still be medical if also contains medical terms
        const hasMedicalKeyword = Array.from(MEDICAL_KEYWORDS).some(kw => 
          lowerText.includes(kw)
        );
        if (!hasMedicalKeyword) return false;
      }
    }

    // Check for medical keywords
    const words = lowerText.split(/\s+/);
    const medicalWordCount = words.filter(w => MEDICAL_KEYWORDS.has(w)).length;
    
    // Consider medical if >10% of words are medical terms OR contains key patterns
    const medicalRatio = medicalWordCount / words.length;
    if (medicalRatio > 0.1) return true;

    // Check for specific patterns
    const medicalPatterns = [
      /\d+\s*(mg|mcg|ml|units?|tablets?|pills?)/i,
      /\d+\/\d+/, // Blood pressure
      /\d+\s*(times?|x)\s*(a|per)\s*(day|week|month)/i,
      /(taking|prescribed|started|stopped)\s+\w+/i,
      /(pain|ache|discomfort)\s+(in|on|at)/i,
      /allergic\s+to/i,
      /history\s+of/i,
    ];

    return medicalPatterns.some(p => p.test(lowerText));
  }

  // =========================================================================
  // ENTITY EXTRACTION
  // =========================================================================

  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const lowerText = text.toLowerCase();

    // Chief Complaint patterns
    const ccPatterns = [
      /(?:here for|coming in for|complaint of|presents with)\s+(.+?)(?:\.|,|$)/i,
      /(?:main|chief|primary)\s+(?:concern|complaint|problem)\s+(?:is|:)\s*(.+?)(?:\.|,|$)/i,
    ];
    
    ccPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        entities.push({
          type: 'chief_complaint',
          value: match[1].trim(),
          confidence: 0.9,
          startOffset: match.index || 0,
          endOffset: (match.index || 0) + match[0].length,
        });
      }
    });

    // Symptom patterns
    const symptomPatterns = [
      { pattern: /(pain|ache|discomfort|soreness)\s+(?:in|on|at)?\s*(?:the|my)?\s*(\w+(?:\s+\w+)?)/gi, group: 0 },
      { pattern: /(\w+)\s+(pain|ache|discomfort)/gi, group: 0 },
      { pattern: /(headache|migraine|nausea|vomiting|diarrhea|constipation|fatigue|weakness|dizziness|fever|chills|cough|shortness of breath)/gi, group: 1 },
    ];

    symptomPatterns.forEach(({ pattern, group }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'symptom',
          value: match[group].trim(),
          confidence: 0.85,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
        });
      }
    });

    // Duration patterns
    const durationPatterns = [
      /(?:for|since|about|approximately|around)\s+(\d+\s+(?:day|week|month|year|hour)s?)/gi,
      /(?:started|began|onset)\s+(\d+\s+(?:day|week|month|year|hour)s?\s+ago)/gi,
      /(yesterday|today|this morning|last night|last week|few days|couple of days)/gi,
    ];

    durationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'symptom_duration',
          value: match[1] || match[0],
          confidence: 0.9,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
        });
      }
    });

    // Severity patterns
    const severityPatterns = [
      /(\d+)\s*(?:out of|\/)\s*10/gi,
      /(mild|moderate|severe|terrible|worst|excruciating)/gi,
      /(getting better|getting worse|same|improving|worsening)/gi,
    ];

    severityPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'symptom_severity',
          value: match[1] || match[0],
          confidence: 0.88,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
        });
      }
    });

    // Medication patterns
    const medicationPattern = /(?:taking|take|on|prescribed|started|stopped)\s+(\w+(?:\s+\d+\s*(?:mg|mcg|ml))?)/gi;
    let medMatch;
    while ((medMatch = medicationPattern.exec(text)) !== null) {
      entities.push({
        type: 'medication',
        value: medMatch[1].trim(),
        confidence: 0.85,
        startOffset: medMatch.index,
        endOffset: medMatch.index + medMatch[0].length,
      });
    }

    // Allergy patterns
    const allergyPattern = /(?:allergic to|allergy to|allergies?(?:\s+to)?)\s+(\w+(?:\s*,\s*\w+)*)/gi;
    let allergyMatch;
    while ((allergyMatch = allergyPattern.exec(text)) !== null) {
      const allergens = allergyMatch[1].split(/\s*,\s*/);
      allergens.forEach(allergen => {
        entities.push({
          type: 'allergy',
          value: allergen.trim(),
          confidence: 0.95,
          startOffset: allergyMatch!.index,
          endOffset: allergyMatch!.index + allergyMatch![0].length,
        });
      });
    }

    // Vital sign patterns
    const vitalPatterns = [
      { pattern: /(?:blood pressure|bp)\s*(?:is|was|of)?\s*(\d+\/\d+)/gi, type: 'blood_pressure' },
      { pattern: /(?:heart rate|pulse|hr)\s*(?:is|was|of)?\s*(\d+)/gi, type: 'heart_rate' },
      { pattern: /(?:temperature|temp)\s*(?:is|was|of)?\s*(\d+\.?\d*)/gi, type: 'temperature' },
      { pattern: /(?:weight)\s*(?:is|was|of)?\s*(\d+)\s*(?:lbs?|pounds?|kg)?/gi, type: 'weight' },
      { pattern: /(?:oxygen|o2|sat)\s*(?:is|was|of)?\s*(\d+)%?/gi, type: 'oxygen_saturation' },
    ];

    vitalPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'vital_sign',
          value: match[1],
          normalizedValue: type,
          confidence: 0.92,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
        });
      }
    });

    // Remove duplicates
    const uniqueEntities = this.deduplicateEntities(entities);

    return uniqueEntities;
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Map<string, ExtractedEntity>();
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = seen.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }

    return Array.from(seen.values());
  }

  // =========================================================================
  // DATA EXTRACTION UPDATE
  // =========================================================================

  private initializeExtractedData(): ClinicalExtraction {
    return {
      hpiElements: {
        aggravatingFactors: [],
        relievingFactors: [],
        associatedSymptoms: [],
      },
      reviewOfSystems: {
        constitutional: [],
        eyes: [],
        enmt: [],
        cardiovascular: [],
        respiratory: [],
        gastrointestinal: [],
        genitourinary: [],
        musculoskeletal: [],
        integumentary: [],
        neurological: [],
        psychiatric: [],
        endocrine: [],
        hematologic: [],
        allergicImmunologic: [],
      },
      medications: [],
      allergies: [],
      conditions: [],
      vitals: [],
      physicalExam: {
        general: [],
        heent: [],
        neck: [],
        cardiovascular: [],
        respiratory: [],
        abdomen: [],
        extremities: [],
        neurological: [],
        skin: [],
        psychiatric: [],
      },
      assessment: {
        differentials: [],
      },
      plan: [],
      socialHistory: {},
      familyHistory: {
        conditions: [],
      },
    };
  }

  private updateExtractedData(transcription: TranscriptionResult): void {
    if (!this.currentSession) return;

    const data = this.currentSession.extractedData;

    for (const entity of transcription.entities) {
      switch (entity.type) {
        case 'chief_complaint':
          if (!data.chiefComplaint) {
            data.chiefComplaint = entity.value;
          }
          break;

        case 'symptom':
          // Categorize into ROS
          this.categorizeSymptom(entity.value, data.reviewOfSystems);
          break;

        case 'symptom_duration':
          data.hpiElements.duration = entity.value;
          break;

        case 'symptom_severity':
          data.hpiElements.severity = entity.value;
          break;

        case 'symptom_location':
          data.hpiElements.location = entity.value;
          break;

        case 'aggravating_factor':
          if (!data.hpiElements.aggravatingFactors.includes(entity.value)) {
            data.hpiElements.aggravatingFactors.push(entity.value);
          }
          break;

        case 'relieving_factor':
          if (!data.hpiElements.relievingFactors.includes(entity.value)) {
            data.hpiElements.relievingFactors.push(entity.value);
          }
          break;

        case 'medication':
          const existingMed = data.medications.find(
            m => m.name.toLowerCase() === entity.value.toLowerCase()
          );
          if (!existingMed) {
            data.medications.push({
              name: entity.value,
              status: 'current',
              rxnormCode: entity.code?.code,
            });
          }
          break;

        case 'allergy':
          const existingAllergy = data.allergies.find(
            a => a.allergen.toLowerCase() === entity.value.toLowerCase()
          );
          if (!existingAllergy) {
            data.allergies.push({
              allergen: entity.value,
              type: this.classifyAllergenType(entity.value),
            });
          }
          break;

        case 'vital_sign':
          data.vitals.push({
            type: entity.normalizedValue || 'unknown',
            value: entity.value,
            timestamp: new Date(),
          });
          break;
      }
    }
  }

  private categorizeSymptom(symptom: string, ros: ReviewOfSystems): void {
    const lower = symptom.toLowerCase();

    const categories: Array<{ keywords: string[]; category: keyof ReviewOfSystems }> = [
      { keywords: ['fever', 'chills', 'fatigue', 'weight', 'appetite', 'night sweats'], category: 'constitutional' },
      { keywords: ['vision', 'eye', 'blind', 'blurry'], category: 'eyes' },
      { keywords: ['ear', 'hearing', 'nose', 'throat', 'sinus', 'congestion'], category: 'enmt' },
      { keywords: ['chest', 'heart', 'palpitation', 'edema', 'leg swelling'], category: 'cardiovascular' },
      { keywords: ['breath', 'cough', 'wheeze', 'lung', 'respiratory'], category: 'respiratory' },
      { keywords: ['nausea', 'vomit', 'diarrhea', 'constipation', 'abdominal', 'stomach'], category: 'gastrointestinal' },
      { keywords: ['urinary', 'urine', 'bladder', 'kidney'], category: 'genitourinary' },
      { keywords: ['joint', 'muscle', 'back', 'arthritis', 'stiff'], category: 'musculoskeletal' },
      { keywords: ['rash', 'skin', 'itch', 'lesion'], category: 'integumentary' },
      { keywords: ['headache', 'dizzy', 'numb', 'tingling', 'weakness', 'seizure'], category: 'neurological' },
      { keywords: ['anxiety', 'depression', 'sleep', 'mood', 'stress'], category: 'psychiatric' },
    ];

    for (const { keywords, category } of categories) {
      if (keywords.some(kw => lower.includes(kw))) {
        if (!ros[category].includes(symptom)) {
          ros[category].push(symptom);
        }
        return;
      }
    }

    // Default to constitutional if no match
    if (!ros.constitutional.includes(symptom)) {
      ros.constitutional.push(symptom);
    }
  }

  private classifyAllergenType(allergen: string): 'drug' | 'food' | 'environmental' | 'other' {
    const lower = allergen.toLowerCase();
    
    const drugAllergens = ['penicillin', 'sulfa', 'aspirin', 'ibuprofen', 'codeine', 'morphine', 'amoxicillin'];
    const foodAllergens = ['peanut', 'shellfish', 'egg', 'milk', 'wheat', 'soy', 'fish', 'tree nut'];
    const envAllergens = ['pollen', 'dust', 'mold', 'latex', 'bee', 'insect'];

    if (drugAllergens.some(d => lower.includes(d))) return 'drug';
    if (foodAllergens.some(f => lower.includes(f))) return 'food';
    if (envAllergens.some(e => lower.includes(e))) return 'environmental';
    return 'other';
  }

  // =========================================================================
  // FINAL EXTRACTION
  // =========================================================================

  private async performFinalExtraction(): Promise<void> {
    if (!this.currentSession) return;

    // Consolidate and validate extracted data
    const data = this.currentSession.extractedData;

    // Generate chief complaint if not explicitly stated
    if (!data.chiefComplaint && data.reviewOfSystems) {
      const allSymptoms = Object.values(data.reviewOfSystems).flat();
      if (allSymptoms.length > 0) {
        data.chiefComplaint = allSymptoms[0];
      }
    }

    // Generate assessment from symptoms
    if (data.chiefComplaint) {
      data.assessment.differentials = this.generateDifferentials(
        data.chiefComplaint,
        data.reviewOfSystems
      );
    }

    this.emit('extractionComplete', data);
  }

  private generateDifferentials(chiefComplaint: string, ros: ReviewOfSystems): string[] {
    const lower = chiefComplaint.toLowerCase();
    const differentials: string[] = [];

    // Simple rule-based differential generation
    // In production, this would use AI
    if (lower.includes('headache')) {
      differentials.push('Tension headache', 'Migraine', 'Sinusitis', 'Medication overuse headache');
    }
    if (lower.includes('chest') && lower.includes('pain')) {
      differentials.push('Musculoskeletal pain', 'GERD', 'Costochondritis', 'Anxiety');
    }
    if (lower.includes('cough')) {
      differentials.push('Upper respiratory infection', 'Bronchitis', 'Allergic rhinitis', 'GERD');
    }
    if (lower.includes('abdominal') || lower.includes('stomach')) {
      differentials.push('Gastritis', 'GERD', 'Gastroenteritis', 'Irritable bowel syndrome');
    }
    if (lower.includes('back') && lower.includes('pain')) {
      differentials.push('Muscle strain', 'Degenerative disc disease', 'Sciatica', 'Facet arthropathy');
    }

    return differentials.slice(0, 5);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const ambientListening = new AmbientListeningService();
