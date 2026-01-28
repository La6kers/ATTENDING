// =============================================================================
// ATTENDING AI - AI Scribe Service
// apps/shared/services/ai-scribe/AmbientScribeService.ts
//
// Real-time transcription and clinical documentation generation
// Features:
// - Live audio transcription
// - Speaker diarization (physician vs patient)
// - SOAP note generation
// - ICD-10/CPT code suggestion
// - Order extraction from conversation
// - Patient instruction generation
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface TranscriptSegment {
  id: string;
  speaker: 'physician' | 'patient' | 'other' | 'unknown';
  text: string;
  timestamp: number;
  duration: number;
  confidence: number;
  keywords?: string[];
  medicalEntities?: MedicalEntity[];
}

export interface MedicalEntity {
  type: 'symptom' | 'diagnosis' | 'medication' | 'procedure' | 'anatomy' | 'lab' | 'vital' | 'allergy' | 'duration' | 'frequency';
  text: string;
  normalized?: string;
  code?: string; // SNOMED, RxNorm, ICD-10, etc.
  confidence: number;
  position: { start: number; end: number };
}

export interface SOAPNote {
  subjective: {
    chiefComplaint: string;
    hpiNarrative: string;
    reviewOfSystems: Record<string, string[]>;
    pastMedicalHistory?: string;
    medications?: string;
    allergies?: string;
    socialHistory?: string;
    familyHistory?: string;
  };
  objective: {
    vitals?: VitalSigns;
    physicalExam: Record<string, string>;
    labResults?: string;
    imagingResults?: string;
  };
  assessment: {
    diagnoses: DiagnosisEntry[];
    differentials?: string[];
    clinicalReasoning?: string;
  };
  plan: {
    items: PlanItem[];
    followUp?: string;
    patientEducation?: string[];
  };
  metadata: {
    generatedAt: Date;
    encounterDuration: number;
    transcriptWordCount: number;
    confidence: number;
  };
}

export interface VitalSigns {
  bloodPressure?: { systolic: number; diastolic: number };
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: { value: number; unit: 'kg' | 'lb' };
  height?: { value: number; unit: 'cm' | 'in' };
  bmi?: number;
  painLevel?: number;
}

export interface DiagnosisEntry {
  description: string;
  icd10Code?: string;
  icd10Description?: string;
  status: 'confirmed' | 'probable' | 'rule-out' | 'resolved';
  isPrimary: boolean;
  hccRelevant?: boolean;
}

export interface PlanItem {
  category: 'medication' | 'lab' | 'imaging' | 'referral' | 'procedure' | 'education' | 'follow-up' | 'other';
  description: string;
  details?: string;
  cptCode?: string;
  orderTemplate?: string;
  priority: 'routine' | 'urgent' | 'stat';
}

export interface CodingSuggestion {
  type: 'ICD-10' | 'CPT' | 'HCPCS';
  code: string;
  description: string;
  confidence: number;
  supportingEvidence: string[];
  mdmLevel?: '99211' | '99212' | '99213' | '99214' | '99215';
}

export interface PatientInstructions {
  summary: string;
  medications: MedicationInstruction[];
  warnings: string[];
  followUpInstructions: string;
  dietaryRecommendations?: string[];
  activityRestrictions?: string[];
  whenToSeekCare: string[];
  resources?: { title: string; url?: string }[];
  readingLevel: 'simple' | 'standard' | 'detailed';
  language: string;
}

export interface MedicationInstruction {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  purpose: string;
  sideEffects: string[];
  warnings: string[];
  isNew: boolean;
}

export interface ScribeSession {
  id: string;
  patientId: string;
  providerId: string;
  encounterType: 'office-visit' | 'telehealth' | 'procedure' | 'follow-up' | 'urgent';
  startTime: Date;
  endTime?: Date;
  status: 'recording' | 'paused' | 'processing' | 'completed' | 'error';
  transcript: TranscriptSegment[];
  soapNote?: SOAPNote;
  codingSuggestions?: CodingSuggestion[];
  patientInstructions?: PatientInstructions;
  extractedOrders?: PlanItem[];
}

export interface ScribeConfig {
  language: string;
  specialty?: string;
  noteTemplate?: string;
  autoGenerateCodes: boolean;
  autoGenerateInstructions: boolean;
  enableRealTimeAnalysis: boolean;
  speakerDiarization: boolean;
  sensitivityFilter: boolean;
}

// =============================================================================
// Medical Entity Extraction Patterns
// =============================================================================

const SYMPTOM_PATTERNS = [
  /(?:complaining of|reports?|experiencing|having|feels?|noticed?)\s+([^,.]+)/gi,
  /(?:pain|ache|discomfort|tenderness)\s+(?:in|at|around)?\s*(?:the|my|his|her)?\s*([^,.]+)/gi,
  /(?:fever|chills|nausea|vomiting|diarrhea|constipation|fatigue|weakness|dizziness)/gi,
  /(?:shortness of breath|chest pain|headache|back pain|abdominal pain)/gi,
  /(?:cough|congestion|sore throat|runny nose|difficulty swallowing)/gi,
];

const MEDICATION_PATTERNS = [
  /(?:taking|takes?|on|prescribed|started?)\s+(\w+)\s*(\d+\s*(?:mg|mcg|ml|units?))?/gi,
  /(?:metformin|lisinopril|atorvastatin|omeprazole|amlodipine|metoprolol|losartan|gabapentin|sertraline|hydrochlorothiazide)/gi,
  /(?:aspirin|ibuprofen|acetaminophen|tylenol|advil|motrin)/gi,
];

const VITAL_PATTERNS = [
  /blood pressure\s*(?:is|of|was)?\s*(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/gi,
  /(?:bp|b\.p\.)\s*(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/gi,
  /(?:heart rate|pulse|hr)\s*(?:is|of|was)?\s*(\d{2,3})/gi,
  /(?:temperature|temp)\s*(?:is|of|was)?\s*(\d{2,3}(?:\.\d)?)\s*(?:degrees?|°)?/gi,
  /(?:weight)\s*(?:is|of|was)?\s*(\d{2,3}(?:\.\d)?)\s*(?:pounds?|lbs?|kilograms?|kg)/gi,
  /(?:oxygen|o2|spo2|sat)\s*(?:is|of|was)?\s*(\d{2,3})\s*(?:percent|%)?/gi,
];

const DURATION_PATTERNS = [
  /(?:for|since|past|last)\s+(\d+)\s*(days?|weeks?|months?|years?|hours?)/gi,
  /(?:started?|began?|onset)\s+(\d+)\s*(days?|weeks?|months?|years?)\s*ago/gi,
];

// =============================================================================
// ICD-10 Code Mapping (Common Conditions)
// =============================================================================

const ICD10_MAPPINGS: Record<string, { code: string; description: string }> = {
  'hypertension': { code: 'I10', description: 'Essential (primary) hypertension' },
  'high blood pressure': { code: 'I10', description: 'Essential (primary) hypertension' },
  'type 2 diabetes': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  'diabetes': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  'hyperlipidemia': { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
  'high cholesterol': { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
  'obesity': { code: 'E66.9', description: 'Obesity, unspecified' },
  'chest pain': { code: 'R07.9', description: 'Chest pain, unspecified' },
  'shortness of breath': { code: 'R06.00', description: 'Dyspnea, unspecified' },
  'dyspnea': { code: 'R06.00', description: 'Dyspnea, unspecified' },
  'headache': { code: 'R51.9', description: 'Headache, unspecified' },
  'migraine': { code: 'G43.909', description: 'Migraine, unspecified, not intractable' },
  'back pain': { code: 'M54.9', description: 'Dorsalgia, unspecified' },
  'low back pain': { code: 'M54.50', description: 'Low back pain, unspecified' },
  'abdominal pain': { code: 'R10.9', description: 'Unspecified abdominal pain' },
  'nausea': { code: 'R11.0', description: 'Nausea' },
  'vomiting': { code: 'R11.10', description: 'Vomiting, unspecified' },
  'diarrhea': { code: 'R19.7', description: 'Diarrhea, unspecified' },
  'constipation': { code: 'K59.00', description: 'Constipation, unspecified' },
  'fatigue': { code: 'R53.83', description: 'Other fatigue' },
  'anxiety': { code: 'F41.9', description: 'Anxiety disorder, unspecified' },
  'depression': { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
  'insomnia': { code: 'G47.00', description: 'Insomnia, unspecified' },
  'cough': { code: 'R05.9', description: 'Cough, unspecified' },
  'upper respiratory infection': { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  'uri': { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  'urinary tract infection': { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
  'uti': { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
  'atrial fibrillation': { code: 'I48.91', description: 'Unspecified atrial fibrillation' },
  'afib': { code: 'I48.91', description: 'Unspecified atrial fibrillation' },
  'heart failure': { code: 'I50.9', description: 'Heart failure, unspecified' },
  'chf': { code: 'I50.9', description: 'Heart failure, unspecified' },
  'copd': { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
  'asthma': { code: 'J45.909', description: 'Unspecified asthma, uncomplicated' },
  'pneumonia': { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
  'ckd': { code: 'N18.9', description: 'Chronic kidney disease, unspecified' },
  'chronic kidney disease': { code: 'N18.9', description: 'Chronic kidney disease, unspecified' },
};

// =============================================================================
// CPT Code Mapping
// =============================================================================

const CPT_MAPPINGS: Record<string, { code: string; description: string }> = {
  'cbc': { code: '85025', description: 'Complete blood count with differential' },
  'complete blood count': { code: '85025', description: 'Complete blood count with differential' },
  'cmp': { code: '80053', description: 'Comprehensive metabolic panel' },
  'comprehensive metabolic panel': { code: '80053', description: 'Comprehensive metabolic panel' },
  'bmp': { code: '80048', description: 'Basic metabolic panel' },
  'basic metabolic panel': { code: '80048', description: 'Basic metabolic panel' },
  'lipid panel': { code: '80061', description: 'Lipid panel' },
  'a1c': { code: '83036', description: 'Hemoglobin A1c' },
  'hemoglobin a1c': { code: '83036', description: 'Hemoglobin A1c' },
  'tsh': { code: '84443', description: 'Thyroid stimulating hormone' },
  'urinalysis': { code: '81003', description: 'Urinalysis, automated' },
  'chest xray': { code: '71046', description: 'Chest X-ray, 2 views' },
  'chest x-ray': { code: '71046', description: 'Chest X-ray, 2 views' },
  'ekg': { code: '93000', description: 'Electrocardiogram, routine' },
  'ecg': { code: '93000', description: 'Electrocardiogram, routine' },
  'electrocardiogram': { code: '93000', description: 'Electrocardiogram, routine' },
  'ct scan': { code: '70450', description: 'CT head/brain without contrast' },
  'mri': { code: '70551', description: 'MRI brain without contrast' },
  'ultrasound': { code: '76700', description: 'Ultrasound, abdominal, complete' },
};

// =============================================================================
// Ambient Scribe Service Class
// =============================================================================

export class AmbientScribeService extends EventEmitter {
  private sessions: Map<string, ScribeSession> = new Map();
  private config: ScribeConfig;
  private mediaRecorder?: MediaRecorder;
  private audioContext?: AudioContext;
  private recognizer?: any; // Web Speech API or custom ASR

  constructor(config?: Partial<ScribeConfig>) {
    super();
    this.config = {
      language: 'en-US',
      autoGenerateCodes: true,
      autoGenerateInstructions: true,
      enableRealTimeAnalysis: true,
      speakerDiarization: true,
      sensitivityFilter: true,
      ...config,
    };
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  async startSession(
    patientId: string,
    providerId: string,
    encounterType: ScribeSession['encounterType'] = 'office-visit'
  ): Promise<ScribeSession> {
    const sessionId = `scribe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ScribeSession = {
      id: sessionId,
      patientId,
      providerId,
      encounterType,
      startTime: new Date(),
      status: 'recording',
      transcript: [],
    };

    this.sessions.set(sessionId, session);
    
    // Start audio capture
    await this.startAudioCapture(sessionId);
    
    this.emit('sessionStarted', session);
    console.log(`[SCRIBE] Session started: ${sessionId}`);
    
    return session;
  }

  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    session.status = 'paused';
    this.stopAudioCapture();
    this.emit('sessionPaused', session);
  }

  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    session.status = 'recording';
    await this.startAudioCapture(sessionId);
    this.emit('sessionResumed', session);
  }

  async endSession(sessionId: string): Promise<ScribeSession> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    session.status = 'processing';
    session.endTime = new Date();
    this.stopAudioCapture();
    
    this.emit('sessionProcessing', session);
    
    // Generate all outputs
    try {
      session.soapNote = await this.generateSOAPNote(session);
      
      if (this.config.autoGenerateCodes) {
        session.codingSuggestions = await this.generateCodingSuggestions(session);
      }
      
      if (this.config.autoGenerateInstructions) {
        session.patientInstructions = await this.generatePatientInstructions(session);
      }
      
      session.extractedOrders = await this.extractOrders(session);
      session.status = 'completed';
      
      this.emit('sessionCompleted', session);
      console.log(`[SCRIBE] Session completed: ${sessionId}`);
    } catch (error) {
      session.status = 'error';
      this.emit('sessionError', { session, error });
      throw error;
    }
    
    return session;
  }

  getSession(sessionId: string): ScribeSession | undefined {
    return this.sessions.get(sessionId);
  }

  // ===========================================================================
  // Audio Capture & Transcription
  // ===========================================================================

  private async startAudioCapture(sessionId: string): Promise<void> {
    if (typeof window === 'undefined') {
      console.log('[SCRIBE] Server-side: skipping audio capture');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up Web Speech API for transcription
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        this.recognizer = new SpeechRecognition();
        this.recognizer.continuous = true;
        this.recognizer.interimResults = true;
        this.recognizer.lang = this.config.language;
        
        this.recognizer.onresult = (event: any) => {
          this.handleTranscriptionResult(sessionId, event);
        };
        
        this.recognizer.onerror = (event: any) => {
          console.error('[SCRIBE] Recognition error:', event.error);
          this.emit('transcriptionError', { sessionId, error: event.error });
        };
        
        this.recognizer.start();
        console.log('[SCRIBE] Speech recognition started');
      }
      
      // Also record raw audio for backup
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.start(1000); // Collect data every second
      
    } catch (error) {
      console.error('[SCRIBE] Failed to start audio capture:', error);
      throw error;
    }
  }

  private stopAudioCapture(): void {
    if (this.recognizer) {
      this.recognizer.stop();
      this.recognizer = undefined;
    }
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = undefined;
    }
  }

  private handleTranscriptionResult(sessionId: string, event: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      if (result.isFinal) {
        const text = result[0].transcript.trim();
        if (!text) continue;
        
        const segment: TranscriptSegment = {
          id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          speaker: this.detectSpeaker(text, session),
          text,
          timestamp: Date.now() - session.startTime.getTime(),
          duration: 0, // Would be calculated from audio
          confidence: result[0].confidence || 0.9,
        };
        
        // Extract medical entities in real-time
        if (this.config.enableRealTimeAnalysis) {
          segment.medicalEntities = this.extractMedicalEntities(text);
          segment.keywords = this.extractKeywords(text);
        }
        
        session.transcript.push(segment);
        this.emit('transcriptUpdate', { sessionId, segment });
      }
    }
  }

  // ===========================================================================
  // Speaker Diarization
  // ===========================================================================

  private detectSpeaker(text: string, session: ScribeSession): TranscriptSegment['speaker'] {
    // Simple heuristic-based speaker detection
    // In production, use ML-based diarization
    
    const physicianPhrases = [
      /^(?:so|okay|alright|now|let me|i('ll| will)|we('ll| will)|i('m| am) going to)/i,
      /(?:examination|diagnos|prescri|recommend|order|refer|follow.?up)/i,
      /(?:your lab|your test|your blood pressure|your vitals)/i,
      /(?:i('m| am) (?:seeing|noticing|concerned|going to))/i,
    ];
    
    const patientPhrases = [
      /^(?:i('ve| have)|i('m| am)|my|it('s| is|'s been))/i,
      /(?:hurts?|pain|ache|feel|feeling|notice|started|been having)/i,
      /(?:doctor|doc|you think|should i|what about|is it|can i)/i,
    ];
    
    // Check for physician patterns
    for (const pattern of physicianPhrases) {
      if (pattern.test(text)) return 'physician';
    }
    
    // Check for patient patterns
    for (const pattern of patientPhrases) {
      if (pattern.test(text)) return 'patient';
    }
    
    // Use context from previous segments
    const recentSegments = session.transcript.slice(-3);
    if (recentSegments.length > 0) {
      const lastSpeaker = recentSegments[recentSegments.length - 1].speaker;
      // Conversation typically alternates
      return lastSpeaker === 'physician' ? 'patient' : 'physician';
    }
    
    return 'unknown';
  }

  // ===========================================================================
  // Medical Entity Extraction
  // ===========================================================================

  extractMedicalEntities(text: string): MedicalEntity[] {
    const entities: MedicalEntity[] = [];
    
    // Extract symptoms
    for (const pattern of SYMPTOM_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'symptom',
          text: match[0],
          confidence: 0.8,
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }
    
    // Extract medications
    for (const pattern of MEDICATION_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'medication',
          text: match[0],
          confidence: 0.85,
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }
    
    // Extract vitals
    for (const pattern of VITAL_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'vital',
          text: match[0],
          confidence: 0.9,
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }
    
    // Extract durations
    for (const pattern of DURATION_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'duration',
          text: match[0],
          confidence: 0.85,
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }
    
    return entities;
  }

  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Check for ICD-10 condition keywords
    for (const condition of Object.keys(ICD10_MAPPINGS)) {
      if (lowerText.includes(condition)) {
        keywords.push(condition);
      }
    }
    
    // Check for CPT procedure keywords
    for (const procedure of Object.keys(CPT_MAPPINGS)) {
      if (lowerText.includes(procedure)) {
        keywords.push(procedure);
      }
    }
    
    return [...new Set(keywords)];
  }

  // ===========================================================================
  // SOAP Note Generation
  // ===========================================================================

  async generateSOAPNote(session: ScribeSession): Promise<SOAPNote> {
    const fullTranscript = session.transcript.map(s => `${s.speaker}: ${s.text}`).join('\n');
    const patientStatements = session.transcript.filter(s => s.speaker === 'patient');
    const physicianStatements = session.transcript.filter(s => s.speaker === 'physician');
    
    // Extract all medical entities
    const allEntities = session.transcript.flatMap(s => s.medicalEntities || []);
    const symptoms = allEntities.filter(e => e.type === 'symptom');
    const medications = allEntities.filter(e => e.type === 'medication');
    const vitals = allEntities.filter(e => e.type === 'vital');
    
    // Generate chief complaint
    const chiefComplaint = this.extractChiefComplaint(patientStatements);
    
    // Generate HPI
    const hpiNarrative = this.generateHPI(patientStatements, symptoms);
    
    // Extract vitals from conversation
    const extractedVitals = this.extractVitals(fullTranscript);
    
    // Generate assessment
    const diagnoses = this.generateDiagnoses(fullTranscript, symptoms);
    
    // Generate plan
    const planItems = this.generatePlanItems(physicianStatements, fullTranscript);
    
    const soapNote: SOAPNote = {
      subjective: {
        chiefComplaint,
        hpiNarrative,
        reviewOfSystems: this.generateROS(patientStatements),
        medications: medications.map(m => m.text).join(', ') || undefined,
      },
      objective: {
        vitals: extractedVitals,
        physicalExam: this.generatePhysicalExam(physicianStatements),
      },
      assessment: {
        diagnoses,
        clinicalReasoning: this.generateClinicalReasoning(fullTranscript, diagnoses),
      },
      plan: {
        items: planItems,
        followUp: this.extractFollowUp(physicianStatements),
        patientEducation: this.extractEducation(physicianStatements),
      },
      metadata: {
        generatedAt: new Date(),
        encounterDuration: session.endTime 
          ? (session.endTime.getTime() - session.startTime.getTime()) / 1000 
          : 0,
        transcriptWordCount: fullTranscript.split(/\s+/).length,
        confidence: this.calculateNoteConfidence(session),
      },
    };
    
    return soapNote;
  }

  private extractChiefComplaint(patientStatements: TranscriptSegment[]): string {
    // Look for the first substantive patient statement
    for (const segment of patientStatements.slice(0, 5)) {
      const text = segment.text.toLowerCase();
      
      // Common CC patterns
      if (text.includes('here for') || text.includes('coming in for') || 
          text.includes('been having') || text.includes('problem with')) {
        return segment.text;
      }
      
      // Has symptom entities
      if (segment.medicalEntities?.some(e => e.type === 'symptom')) {
        return segment.text;
      }
    }
    
    return patientStatements[0]?.text || 'Not documented';
  }

  private generateHPI(patientStatements: TranscriptSegment[], symptoms: MedicalEntity[]): string {
    const relevantStatements = patientStatements
      .filter(s => s.medicalEntities?.some(e => e.type === 'symptom' || e.type === 'duration'))
      .map(s => s.text);
    
    if (relevantStatements.length === 0) {
      return 'Patient presents with symptoms as described. Further details documented in conversation.';
    }
    
    // Combine into narrative
    return relevantStatements.slice(0, 5).join(' ');
  }

  private generateROS(patientStatements: TranscriptSegment[]): Record<string, string[]> {
    const ros: Record<string, string[]> = {};
    const fullText = patientStatements.map(s => s.text.toLowerCase()).join(' ');
    
    const rosCategories: Record<string, string[]> = {
      constitutional: ['fever', 'chills', 'weight loss', 'weight gain', 'fatigue', 'malaise'],
      eyes: ['vision changes', 'eye pain', 'blurry vision', 'double vision'],
      enmt: ['sore throat', 'ear pain', 'hearing loss', 'nasal congestion', 'nosebleed'],
      cardiovascular: ['chest pain', 'palpitations', 'shortness of breath', 'leg swelling', 'orthopnea'],
      respiratory: ['cough', 'wheezing', 'hemoptysis', 'dyspnea'],
      gi: ['nausea', 'vomiting', 'diarrhea', 'constipation', 'abdominal pain', 'heartburn'],
      gu: ['dysuria', 'frequency', 'urgency', 'hematuria', 'incontinence'],
      musculoskeletal: ['joint pain', 'muscle pain', 'back pain', 'stiffness', 'swelling'],
      skin: ['rash', 'itching', 'lesions', 'bruising'],
      neurological: ['headache', 'dizziness', 'numbness', 'tingling', 'weakness', 'seizures'],
      psychiatric: ['depression', 'anxiety', 'sleep problems', 'mood changes'],
    };
    
    for (const [category, symptoms] of Object.entries(rosCategories)) {
      const found = symptoms.filter(s => fullText.includes(s));
      if (found.length > 0) {
        ros[category] = found;
      }
    }
    
    return ros;
  }

  private extractVitals(text: string): VitalSigns | undefined {
    const vitals: VitalSigns = {};
    
    // Blood pressure
    const bpMatch = text.match(/(?:blood pressure|bp)\s*(?:is|of|was)?\s*(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i);
    if (bpMatch) {
      vitals.bloodPressure = { systolic: parseInt(bpMatch[1]), diastolic: parseInt(bpMatch[2]) };
    }
    
    // Heart rate
    const hrMatch = text.match(/(?:heart rate|pulse|hr)\s*(?:is|of|was)?\s*(\d{2,3})/i);
    if (hrMatch) {
      vitals.heartRate = parseInt(hrMatch[1]);
    }
    
    // Temperature
    const tempMatch = text.match(/(?:temperature|temp)\s*(?:is|of|was)?\s*(\d{2,3}(?:\.\d)?)/i);
    if (tempMatch) {
      vitals.temperature = parseFloat(tempMatch[1]);
    }
    
    // O2 sat
    const o2Match = text.match(/(?:oxygen|o2|spo2|sat)\s*(?:is|of|was)?\s*(\d{2,3})/i);
    if (o2Match) {
      vitals.oxygenSaturation = parseInt(o2Match[1]);
    }
    
    // Weight
    const weightMatch = text.match(/(?:weight)\s*(?:is|of|was)?\s*(\d{2,3}(?:\.\d)?)\s*(pounds?|lbs?|kilograms?|kg)/i);
    if (weightMatch) {
      const value = parseFloat(weightMatch[1]);
      const unit = weightMatch[2].toLowerCase().startsWith('k') ? 'kg' : 'lb';
      vitals.weight = { value, unit };
    }
    
    return Object.keys(vitals).length > 0 ? vitals : undefined;
  }

  private generatePhysicalExam(physicianStatements: TranscriptSegment[]): Record<string, string> {
    const exam: Record<string, string> = {};
    const fullText = physicianStatements.map(s => s.text.toLowerCase()).join(' ');
    
    // Look for exam findings
    const examPatterns: Record<string, RegExp[]> = {
      general: [/(?:appears?|looks?)\s+(\w+)/i, /(?:alert|oriented|comfortable|distress)/i],
      heent: [/(?:pupils|throat|ears?|nose|neck)/i, /(?:pharynx|tympanic|lymph)/i],
      cardiovascular: [/(?:heart sounds|murmur|rhythm|regular|irregular)/i, /(?:s1|s2|gallop)/i],
      respiratory: [/(?:lungs?|breath sounds|clear|wheezing|rales|rhonchi)/i],
      abdomen: [/(?:abdomen|bowel sounds|tender|soft|distended)/i],
      extremities: [/(?:edema|pulses|cyanosis|clubbing)/i],
      neurological: [/(?:cranial nerves|motor|sensory|reflexes|strength)/i],
    };
    
    for (const [system, patterns] of Object.entries(examPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(fullText)) {
          // Find the relevant statement
          const relevantStatement = physicianStatements.find(s => pattern.test(s.text.toLowerCase()));
          if (relevantStatement) {
            exam[system] = relevantStatement.text;
            break;
          }
        }
      }
    }
    
    return exam;
  }

  private generateDiagnoses(text: string, symptoms: MedicalEntity[]): DiagnosisEntry[] {
    const diagnoses: DiagnosisEntry[] = [];
    const lowerText = text.toLowerCase();
    const addedCodes = new Set<string>();
    
    // Check for known conditions
    for (const [condition, codeInfo] of Object.entries(ICD10_MAPPINGS)) {
      if (lowerText.includes(condition) && !addedCodes.has(codeInfo.code)) {
        diagnoses.push({
          description: codeInfo.description,
          icd10Code: codeInfo.code,
          icd10Description: codeInfo.description,
          status: 'confirmed',
          isPrimary: diagnoses.length === 0,
        });
        addedCodes.add(codeInfo.code);
      }
    }
    
    // If no diagnoses found, add symptom-based codes
    if (diagnoses.length === 0 && symptoms.length > 0) {
      const symptomText = symptoms[0].text.toLowerCase();
      for (const [condition, codeInfo] of Object.entries(ICD10_MAPPINGS)) {
        if (symptomText.includes(condition)) {
          diagnoses.push({
            description: codeInfo.description,
            icd10Code: codeInfo.code,
            status: 'probable',
            isPrimary: true,
          });
          break;
        }
      }
    }
    
    return diagnoses;
  }

  private generateClinicalReasoning(text: string, diagnoses: DiagnosisEntry[]): string {
    if (diagnoses.length === 0) {
      return 'Clinical assessment based on history and examination.';
    }
    
    const primaryDx = diagnoses.find(d => d.isPrimary);
    return `Based on the patient's presenting symptoms and clinical findings, the primary diagnosis of ${primaryDx?.description || 'the condition'} is supported. Further workup may be indicated as clinically appropriate.`;
  }

  private generatePlanItems(physicianStatements: TranscriptSegment[], fullText: string): PlanItem[] {
    const planItems: PlanItem[] = [];
    const lowerText = fullText.toLowerCase();
    
    // Check for lab orders
    for (const [labName, codeInfo] of Object.entries(CPT_MAPPINGS)) {
      if (lowerText.includes(labName)) {
        const category = labName.includes('xray') || labName.includes('ct') || 
                        labName.includes('mri') || labName.includes('ultrasound') 
                        ? 'imaging' : 'lab';
        planItems.push({
          category,
          description: `Order ${codeInfo.description}`,
          cptCode: codeInfo.code,
          priority: 'routine',
        });
      }
    }
    
    // Check for medication mentions in plan context
    const planContext = physicianStatements.filter(s => 
      /(?:prescrib|start|continu|increas|decreas|stop|refill)/i.test(s.text)
    );
    
    for (const statement of planContext) {
      if (/prescrib|start|begin/i.test(statement.text)) {
        planItems.push({
          category: 'medication',
          description: statement.text,
          priority: 'routine',
        });
      }
    }
    
    // Check for referrals
    if (/refer|consult|specialist/i.test(lowerText)) {
      const referralMatch = lowerText.match(/refer(?:ral)?\s+to\s+(\w+)/i);
      planItems.push({
        category: 'referral',
        description: referralMatch ? `Referral to ${referralMatch[1]}` : 'Specialist referral',
        priority: 'routine',
      });
    }
    
    return planItems;
  }

  private extractFollowUp(physicianStatements: TranscriptSegment[]): string | undefined {
    for (const statement of physicianStatements) {
      if (/follow.?up|come back|return|see you|schedule/i.test(statement.text)) {
        return statement.text;
      }
    }
    return undefined;
  }

  private extractEducation(physicianStatements: TranscriptSegment[]): string[] {
    const education: string[] = [];
    
    for (const statement of physicianStatements) {
      if (/make sure|remember|important|avoid|don't|should|need to/i.test(statement.text)) {
        education.push(statement.text);
      }
    }
    
    return education;
  }

  private calculateNoteConfidence(session: ScribeSession): number {
    const avgConfidence = session.transcript.reduce((sum, s) => sum + s.confidence, 0) / 
                         Math.max(session.transcript.length, 1);
    
    const hasSufficientContent = session.transcript.length >= 5;
    const hasEntities = session.transcript.some(s => s.medicalEntities && s.medicalEntities.length > 0);
    
    let confidence = avgConfidence;
    if (!hasSufficientContent) confidence *= 0.8;
    if (!hasEntities) confidence *= 0.9;
    
    return Math.round(confidence * 100) / 100;
  }

  // ===========================================================================
  // Coding Suggestions
  // ===========================================================================

  async generateCodingSuggestions(session: ScribeSession): Promise<CodingSuggestion[]> {
    const suggestions: CodingSuggestion[] = [];
    
    if (!session.soapNote) return suggestions;
    
    // ICD-10 from diagnoses
    for (const diagnosis of session.soapNote.assessment.diagnoses) {
      if (diagnosis.icd10Code) {
        suggestions.push({
          type: 'ICD-10',
          code: diagnosis.icd10Code,
          description: diagnosis.icd10Description || diagnosis.description,
          confidence: diagnosis.status === 'confirmed' ? 0.95 : 0.75,
          supportingEvidence: [diagnosis.description],
        });
      }
    }
    
    // CPT from plan items
    for (const item of session.soapNote.plan.items) {
      if (item.cptCode) {
        suggestions.push({
          type: 'CPT',
          code: item.cptCode,
          description: item.description,
          confidence: 0.9,
          supportingEvidence: [item.description],
        });
      }
    }
    
    // E/M level suggestion
    const mdmLevel = this.calculateMDMLevel(session);
    suggestions.push({
      type: 'CPT',
      code: mdmLevel,
      description: `Office visit - ${this.getMDMLevelDescription(mdmLevel)}`,
      confidence: 0.85,
      supportingEvidence: this.getMDMEvidence(session),
      mdmLevel,
    });
    
    return suggestions;
  }

  private calculateMDMLevel(session: ScribeSession): CodingSuggestion['mdmLevel'] {
    if (!session.soapNote) return '99213';
    
    const diagnosisCount = session.soapNote.assessment.diagnoses.length;
    const planItemCount = session.soapNote.plan.items.length;
    const hasNewProblem = session.soapNote.assessment.diagnoses.some(d => d.status === 'confirmed');
    
    // Simplified MDM calculation
    if (diagnosisCount >= 3 || planItemCount >= 4) return '99215';
    if (diagnosisCount >= 2 || planItemCount >= 3 || hasNewProblem) return '99214';
    if (diagnosisCount >= 1 || planItemCount >= 1) return '99213';
    return '99212';
  }

  private getMDMLevelDescription(level: CodingSuggestion['mdmLevel']): string {
    const descriptions: Record<string, string> = {
      '99211': 'Minimal complexity',
      '99212': 'Straightforward complexity',
      '99213': 'Low complexity',
      '99214': 'Moderate complexity',
      '99215': 'High complexity',
    };
    return descriptions[level || '99213'] || 'Unknown';
  }

  private getMDMEvidence(session: ScribeSession): string[] {
    const evidence: string[] = [];
    
    if (session.soapNote) {
      evidence.push(`${session.soapNote.assessment.diagnoses.length} diagnoses addressed`);
      evidence.push(`${session.soapNote.plan.items.length} plan items`);
      
      const labCount = session.soapNote.plan.items.filter(i => i.category === 'lab').length;
      if (labCount > 0) evidence.push(`${labCount} labs ordered`);
      
      const rxCount = session.soapNote.plan.items.filter(i => i.category === 'medication').length;
      if (rxCount > 0) evidence.push(`${rxCount} medications managed`);
    }
    
    return evidence;
  }

  // ===========================================================================
  // Patient Instructions Generation
  // ===========================================================================

  async generatePatientInstructions(
    session: ScribeSession,
    readingLevel: PatientInstructions['readingLevel'] = 'standard',
    language: string = 'en'
  ): Promise<PatientInstructions> {
    if (!session.soapNote) {
      return this.getDefaultInstructions(language);
    }

    const diagnoses = session.soapNote.assessment.diagnoses;
    const planItems = session.soapNote.plan.items;
    
    // Generate summary
    const summary = this.generateInstructionSummary(diagnoses, planItems, readingLevel);
    
    // Generate medication instructions
    const medications = this.generateMedicationInstructions(planItems, readingLevel);
    
    // Generate warnings
    const warnings = this.generateWarnings(diagnoses, medications);
    
    // Follow-up
    const followUp = session.soapNote.plan.followUp || 'Follow up as scheduled with your healthcare provider.';
    
    return {
      summary,
      medications,
      warnings,
      followUpInstructions: followUp,
      whenToSeekCare: this.getWhenToSeekCare(diagnoses),
      readingLevel,
      language,
    };
  }

  private generateInstructionSummary(
    diagnoses: DiagnosisEntry[],
    planItems: PlanItem[],
    readingLevel: PatientInstructions['readingLevel']
  ): string {
    const primaryDx = diagnoses.find(d => d.isPrimary);
    
    if (readingLevel === 'simple') {
      return `You came in today for ${primaryDx?.description || 'your health concern'}. ` +
             `Your doctor has made a plan to help you feel better.`;
    }
    
    return `Today's visit addressed ${primaryDx?.description || 'your presenting concerns'}. ` +
           `Please review the following instructions carefully and contact our office with any questions.`;
  }

  private generateMedicationInstructions(
    planItems: PlanItem[],
    readingLevel: PatientInstructions['readingLevel']
  ): MedicationInstruction[] {
    const medItems = planItems.filter(p => p.category === 'medication');
    
    return medItems.map(item => ({
      name: item.description,
      dosage: 'As prescribed',
      frequency: 'As directed',
      purpose: 'For your condition',
      sideEffects: ['Contact your doctor if you experience any unusual symptoms'],
      warnings: ['Take as directed', 'Do not stop without consulting your doctor'],
      isNew: true,
    }));
  }

  private generateWarnings(
    diagnoses: DiagnosisEntry[],
    medications: MedicationInstruction[]
  ): string[] {
    const warnings: string[] = [];
    
    // Diagnosis-specific warnings
    for (const dx of diagnoses) {
      if (dx.icd10Code?.startsWith('I')) {
        warnings.push('Monitor your blood pressure regularly');
      }
      if (dx.icd10Code?.startsWith('E11')) {
        warnings.push('Check your blood sugar as directed');
      }
    }
    
    // Medication warnings
    if (medications.length > 0) {
      warnings.push('Take all medications as prescribed');
      warnings.push('Report any side effects to your healthcare provider');
    }
    
    return warnings;
  }

  private getWhenToSeekCare(diagnoses: DiagnosisEntry[]): string[] {
    const reasons = [
      'Symptoms worsen or do not improve',
      'New or concerning symptoms develop',
      'Fever above 101°F (38.3°C)',
      'Difficulty breathing',
      'Severe pain',
    ];
    
    // Add diagnosis-specific reasons
    for (const dx of diagnoses) {
      if (dx.icd10Code === 'R07.9') { // Chest pain
        reasons.push('Chest pain spreading to arm, jaw, or back');
        reasons.push('Shortness of breath with chest pain');
      }
    }
    
    return reasons;
  }

  private getDefaultInstructions(language: string): PatientInstructions {
    return {
      summary: 'Please follow the instructions provided by your healthcare provider.',
      medications: [],
      warnings: ['Contact your healthcare provider with any questions'],
      followUpInstructions: 'Follow up as directed',
      whenToSeekCare: [
        'Symptoms worsen',
        'New concerning symptoms',
        'Questions about your care',
      ],
      readingLevel: 'standard',
      language,
    };
  }

  // ===========================================================================
  // Order Extraction
  // ===========================================================================

  async extractOrders(session: ScribeSession): Promise<PlanItem[]> {
    if (!session.soapNote) return [];
    return session.soapNote.plan.items;
  }

  // ===========================================================================
  // Manual Transcript Addition (for testing/demo)
  // ===========================================================================

  addTranscriptSegment(sessionId: string, speaker: TranscriptSegment['speaker'], text: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    const segment: TranscriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      speaker,
      text,
      timestamp: Date.now() - session.startTime.getTime(),
      duration: 0,
      confidence: 1.0,
      medicalEntities: this.extractMedicalEntities(text),
      keywords: this.extractKeywords(text),
    };
    
    session.transcript.push(segment);
    this.emit('transcriptUpdate', { sessionId, segment });
  }
}

// Singleton instance
export const ambientScribeService = new AmbientScribeService();
export default ambientScribeService;
