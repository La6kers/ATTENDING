// ============================================================
// ATTENDING AI - Ambient Clinical Intelligence Service
// apps/shared/services/ambient/ambient-ai.service.ts
//
// Phase 8C: Backend service for auto-documentation
// Speech recognition, clinical NLP, and SOAP note generation
// ============================================================

// ============================================================
// TYPES
// ============================================================

export interface TranscriptSegment {
  id: string;
  speaker: 'provider' | 'patient' | 'unknown';
  text: string;
  timestamp: number;
  confidence: number;
  startTime: number;
  endTime: number;
}

export interface ClinicalEntity {
  type: 'symptom' | 'medication' | 'condition' | 'procedure' | 'vital' | 'allergy' | 'anatomy';
  text: string;
  normalizedText: string;
  code?: string;
  codeSystem?: 'ICD10' | 'SNOMED' | 'RXNORM' | 'CPT';
  confidence: number;
  position: { start: number; end: number };
}

export interface ClinicalExtraction {
  chiefComplaint: string;
  symptoms: Array<{
    name: string;
    duration?: string;
    severity?: string;
    location?: string;
    quality?: string;
    timing?: string;
    context?: string;
    aggravatingFactors?: string[];
    alleviatingFactors?: string[];
    associatedSymptoms?: string[];
  }>;
  medications: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    route?: string;
    indication?: string;
  }>;
  allergies: Array<{
    allergen: string;
    reaction?: string;
  }>;
  vitalSigns: Record<string, string>;
  physicalExamFindings: Array<{
    system: string;
    finding: string;
    abnormal: boolean;
  }>;
  entities: ClinicalEntity[];
}

export interface GeneratedNote {
  chiefComplaint: string;
  hpiNarrative: string;
  reviewOfSystems: Record<string, string>;
  physicalExam: Record<string, string>;
  assessment: string[];
  plan: string[];
  icdCodes: Array<{ code: string; description: string; confidence: number }>;
  cptCodes: Array<{ code: string; description: string; confidence: number }>;
  metadata: {
    generatedAt: Date;
    modelVersion: string;
    transcriptDuration: number;
    wordCount: number;
    confidence: number;
  };
}

export interface AmbientSessionConfig {
  patientId: string;
  providerId: string;
  encounterType: 'new_patient' | 'follow_up' | 'annual_wellness' | 'acute' | 'telehealth';
  specialty?: string;
  language: string;
  enableRealTimeProcessing: boolean;
  noteTemplate?: string;
}

export interface ProcessingResult {
  success: boolean;
  transcript: TranscriptSegment[];
  extractions: ClinicalExtraction;
  generatedNote: GeneratedNote;
  warnings: string[];
  processingTime: number;
}

// ============================================================
// AMBIENT AI SERVICE
// ============================================================

export class AmbientAIService {
  private modelVersion = 'biomistral-ambient-v1.0';
  private azureSpeechEndpoint = process.env.AZURE_SPEECH_ENDPOINT || '';
  private azureSpeechKey = process.env.AZURE_SPEECH_KEY || '';

  // ============================================================
  // SPEECH RECOGNITION
  // ============================================================

  /**
   * Initialize real-time speech recognition session
   */
  async initializeSpeechSession(config: AmbientSessionConfig): Promise<{
    sessionId: string;
    websocketUrl: string;
  }> {
    // In production, this would initialize Azure Speech Services
    // and return a WebSocket URL for real-time streaming
    
    const sessionId = `amb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sessionId,
      websocketUrl: `wss://speech.azure.com/ambient/${sessionId}`,
    };
  }

  /**
   * Process audio chunk for transcription
   */
  async processAudioChunk(
    sessionId: string,
    audioData: ArrayBuffer
  ): Promise<TranscriptSegment | null> {
    // In production, this would send audio to Azure Speech Services
    // and return transcribed segments with speaker diarization
    
    // Placeholder for actual implementation
    return null;
  }

  /**
   * Finalize speech session and get complete transcript
   */
  async finalizeSpeechSession(sessionId: string): Promise<TranscriptSegment[]> {
    // In production, this would close the speech session
    // and return the final transcript with speaker labels
    
    return [];
  }

  // ============================================================
  // CLINICAL NLP
  // ============================================================

  /**
   * Extract clinical entities from transcript
   */
  async extractClinicalEntities(
    transcript: TranscriptSegment[]
  ): Promise<ClinicalEntity[]> {
    const fullText = transcript.map(s => s.text).join(' ');
    const entities: ClinicalEntity[] = [];

    // In production, this would use BioMistral or Azure Health Text Analytics
    // to extract clinical entities with proper coding

    // Symptom patterns
    const symptomPatterns = [
      /(?:complains? of|experiencing|having|reports?)\s+([^,.]+)/gi,
      /(?:headache|pain|nausea|vomiting|fever|cough|fatigue|dizziness)/gi,
    ];

    // Medication patterns
    const medicationPatterns = [
      /(?:takes?|taking|on|prescribed)\s+(\w+(?:\s+\d+\s*mg)?)/gi,
      /(?:metformin|lisinopril|atorvastatin|aspirin|ibuprofen|acetaminophen)/gi,
    ];

    // Vital sign patterns
    const vitalPatterns = [
      /blood pressure[:\s]+(\d{2,3}\/\d{2,3})/gi,
      /(?:heart rate|pulse)[:\s]+(\d{2,3})/gi,
      /temp(?:erature)?[:\s]+(\d{2,3}(?:\.\d)?)/gi,
    ];

    // Process patterns
    for (const pattern of symptomPatterns) {
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        entities.push({
          type: 'symptom',
          text: match[0],
          normalizedText: match[1] || match[0],
          confidence: 0.85,
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    return entities;
  }

  /**
   * Extract structured clinical data from transcript
   */
  async extractClinicalData(
    transcript: TranscriptSegment[],
    entities: ClinicalEntity[]
  ): Promise<ClinicalExtraction> {
    const patientSegments = transcript.filter(s => s.speaker === 'patient');
    const providerSegments = transcript.filter(s => s.speaker === 'provider');

    // Analyze patient statements for symptoms
    const symptoms = this.extractSymptoms(patientSegments);
    
    // Extract medications mentioned
    const medications = this.extractMedications(transcript);
    
    // Extract vital signs
    const vitalSigns = this.extractVitalSigns(providerSegments);

    // Determine chief complaint (usually first symptom mentioned)
    const chiefComplaint = symptoms[0]?.name || 'Visit for evaluation';

    return {
      chiefComplaint,
      symptoms,
      medications,
      allergies: [],
      vitalSigns,
      physicalExamFindings: [],
      entities,
    };
  }

  private extractSymptoms(segments: TranscriptSegment[]): ClinicalExtraction['symptoms'] {
    const symptoms: ClinicalExtraction['symptoms'] = [];
    
    // In production, use ML model for accurate extraction
    // This is a simplified pattern-based approach
    
    const text = segments.map(s => s.text).join(' ').toLowerCase();
    
    // Duration patterns
    const durationMatch = text.match(/(?:for|since|past)\s+(\d+\s+(?:days?|weeks?|months?))/i);
    
    // Severity patterns
    const severityMatch = text.match(/(?:rate|scale).*?(\d+).*?(?:out of|\/)\s*10/i);
    
    // Location patterns
    const locationMatch = text.match(/(?:in|on|around)\s+(my\s+)?(\w+(?:\s+\w+)?)/i);

    // Check for common symptoms
    const symptomKeywords = [
      'headache', 'pain', 'nausea', 'vomiting', 'fever', 'cough',
      'fatigue', 'dizziness', 'shortness of breath', 'chest pain',
      'abdominal pain', 'back pain', 'joint pain', 'weakness'
    ];

    for (const keyword of symptomKeywords) {
      if (text.includes(keyword)) {
        symptoms.push({
          name: keyword,
          duration: durationMatch?.[1],
          severity: severityMatch?.[1] ? `${severityMatch[1]}/10` : undefined,
          location: locationMatch?.[2],
        });
      }
    }

    return symptoms;
  }

  private extractMedications(segments: TranscriptSegment[]): ClinicalExtraction['medications'] {
    const medications: ClinicalExtraction['medications'] = [];
    const text = segments.map(s => s.text).join(' ').toLowerCase();

    // Common medication patterns
    const medPatterns = [
      { regex: /metformin\s*(\d+\s*mg)?/gi, name: 'Metformin' },
      { regex: /lisinopril\s*(\d+\s*mg)?/gi, name: 'Lisinopril' },
      { regex: /ibuprofen\s*(\d+\s*mg)?/gi, name: 'Ibuprofen' },
      { regex: /acetaminophen|tylenol\s*(\d+\s*mg)?/gi, name: 'Acetaminophen' },
    ];

    for (const pattern of medPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        medications.push({
          name: pattern.name,
          dose: match[1] || undefined,
        });
      }
    }

    return medications;
  }

  private extractVitalSigns(segments: TranscriptSegment[]): Record<string, string> {
    const vitals: Record<string, string> = {};
    const text = segments.map(s => s.text).join(' ');

    // Blood pressure
    const bpMatch = text.match(/(\d{2,3})[\s/]+(?:over\s+)?(\d{2,3})/);
    if (bpMatch) {
      vitals['Blood Pressure'] = `${bpMatch[1]}/${bpMatch[2]} mmHg`;
    }

    // Heart rate
    const hrMatch = text.match(/(?:heart rate|pulse|hr)[:\s]+(\d{2,3})/i);
    if (hrMatch) {
      vitals['Heart Rate'] = `${hrMatch[1]} bpm`;
    }

    // Temperature
    const tempMatch = text.match(/temp(?:erature)?[:\s]+(\d{2,3}(?:\.\d)?)/i);
    if (tempMatch) {
      vitals['Temperature'] = `${tempMatch[1]}°F`;
    }

    return vitals;
  }

  // ============================================================
  // NOTE GENERATION
  // ============================================================

  /**
   * Generate clinical note from extractions
   */
  async generateClinicalNote(
    extractions: ClinicalExtraction,
    config: AmbientSessionConfig
  ): Promise<GeneratedNote> {
    const startTime = Date.now();

    // Generate HPI narrative
    const hpiNarrative = this.generateHPINarrative(extractions);

    // Generate ROS
    const reviewOfSystems = this.generateROS(extractions);

    // Generate physical exam section
    const physicalExam = this.generatePhysicalExam(extractions);

    // Generate assessment
    const assessment = this.generateAssessment(extractions);

    // Generate plan
    const plan = this.generatePlan(extractions, assessment);

    // Generate codes
    const icdCodes = this.suggestICDCodes(extractions, assessment);
    const cptCodes = this.suggestCPTCodes(config.encounterType);

    return {
      chiefComplaint: extractions.chiefComplaint,
      hpiNarrative,
      reviewOfSystems,
      physicalExam,
      assessment,
      plan,
      icdCodes,
      cptCodes,
      metadata: {
        generatedAt: new Date(),
        modelVersion: this.modelVersion,
        transcriptDuration: 0, // Would be calculated from actual transcript
        wordCount: hpiNarrative.split(' ').length,
        confidence: 0.85,
      },
    };
  }

  private generateHPINarrative(extractions: ClinicalExtraction): string {
    const { chiefComplaint, symptoms } = extractions;
    
    if (symptoms.length === 0) {
      return `Patient presents for ${chiefComplaint.toLowerCase()}.`;
    }

    const mainSymptom = symptoms[0];
    let narrative = `Patient presents with ${mainSymptom.name}`;
    
    if (mainSymptom.duration) {
      narrative += ` for ${mainSymptom.duration}`;
    }
    
    if (mainSymptom.location) {
      narrative += ` located in the ${mainSymptom.location}`;
    }
    
    if (mainSymptom.severity) {
      narrative += `, rated ${mainSymptom.severity} in severity`;
    }

    narrative += '.';

    // Add associated symptoms
    if (symptoms.length > 1) {
      const associated = symptoms.slice(1).map(s => s.name).join(', ');
      narrative += ` Patient also reports ${associated}.`;
    }

    // Add medications
    if (extractions.medications.length > 0) {
      const meds = extractions.medications.map(m => 
        m.dose ? `${m.name} ${m.dose}` : m.name
      ).join(', ');
      narrative += ` Current medications include ${meds}.`;
    }

    return narrative;
  }

  private generateROS(extractions: ClinicalExtraction): Record<string, string> {
    // Default ROS template
    const ros: Record<string, string> = {
      constitutional: 'Denies fever, chills, weight changes',
      heent: 'Denies vision changes, hearing loss, sore throat',
      cardiovascular: 'Denies chest pain, palpitations, edema',
      respiratory: 'Denies shortness of breath, cough, wheezing',
      gastrointestinal: 'Denies nausea, vomiting, abdominal pain, diarrhea',
      musculoskeletal: 'Denies joint pain, muscle weakness, back pain',
      neurological: 'Denies headache, dizziness, numbness, weakness',
      psychiatric: 'Denies depression, anxiety, sleep disturbances',
    };

    // Update based on positive symptoms
    for (const symptom of extractions.symptoms) {
      const name = symptom.name.toLowerCase();
      
      if (name.includes('headache') || name.includes('dizz')) {
        ros.neurological = `Positive for ${name}. ${ros.neurological.replace('Denies headache, dizziness, ', '')}`;
      }
      if (name.includes('nausea') || name.includes('vomit') || name.includes('abdominal')) {
        ros.gastrointestinal = `Positive for ${name}. ${ros.gastrointestinal.replace('Denies nausea, vomiting, abdominal pain, ', '')}`;
      }
      if (name.includes('chest') || name.includes('palpitation')) {
        ros.cardiovascular = `Positive for ${name}. ${ros.cardiovascular.replace('Denies chest pain, palpitations, ', '')}`;
      }
    }

    return ros;
  }

  private generatePhysicalExam(extractions: ClinicalExtraction): Record<string, string> {
    const exam: Record<string, string> = {
      general: 'Alert and oriented, appears comfortable',
      vitals: Object.entries(extractions.vitalSigns)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || 'See nursing documentation',
      heent: 'Normocephalic, PERRLA, EOMI, oropharynx clear',
      neck: 'Supple, no lymphadenopathy, no thyromegaly',
      cardiovascular: 'Regular rate and rhythm, no murmurs',
      respiratory: 'Clear to auscultation bilaterally, no wheezes or crackles',
      abdomen: 'Soft, non-tender, non-distended, normal bowel sounds',
      extremities: 'No edema, pulses intact',
      neurological: 'Alert, cranial nerves intact, strength 5/5',
    };

    return exam;
  }

  private generateAssessment(extractions: ClinicalExtraction): string[] {
    const assessment: string[] = [];

    // Map symptoms to possible diagnoses
    for (const symptom of extractions.symptoms) {
      const name = symptom.name.toLowerCase();
      
      if (name.includes('headache')) {
        if (symptom.severity && parseInt(symptom.severity) >= 7) {
          assessment.push('Headache, possibly migraine - consider neurological workup if persistent');
        } else {
          assessment.push('Tension-type headache');
        }
      }
      if (name.includes('cough')) {
        assessment.push('Acute cough - consider viral URI vs bacterial infection');
      }
      if (name.includes('abdominal pain')) {
        assessment.push('Abdominal pain - differential includes gastritis, constipation');
      }
    }

    if (assessment.length === 0) {
      assessment.push('Patient evaluated for chief complaint');
    }

    return assessment;
  }

  private generatePlan(
    extractions: ClinicalExtraction,
    assessment: string[]
  ): string[] {
    const plan: string[] = [];

    // Generic plans based on assessment
    for (const dx of assessment) {
      if (dx.toLowerCase().includes('headache')) {
        plan.push('OTC analgesics PRN for pain');
        plan.push('Encourage hydration and rest');
        plan.push('Return if symptoms worsen or persist >1 week');
      }
      if (dx.toLowerCase().includes('cough') || dx.toLowerCase().includes('uri')) {
        plan.push('Supportive care with rest and fluids');
        plan.push('OTC cough suppressant PRN');
        plan.push('Return if fever develops or symptoms worsen');
      }
    }

    // Always include follow-up
    if (!plan.some(p => p.toLowerCase().includes('return') || p.toLowerCase().includes('follow'))) {
      plan.push('Follow up as needed or if symptoms worsen');
    }

    return plan;
  }

  private suggestICDCodes(
    extractions: ClinicalExtraction,
    assessment: string[]
  ): GeneratedNote['icdCodes'] {
    const codes: GeneratedNote['icdCodes'] = [];

    // Map common diagnoses to ICD-10 codes
    const icdMap: Record<string, { code: string; description: string }> = {
      'headache': { code: 'R51.9', description: 'Headache, unspecified' },
      'migraine': { code: 'G43.909', description: 'Migraine, unspecified, not intractable, without status migrainosus' },
      'tension': { code: 'G44.209', description: 'Tension-type headache, unspecified, not intractable' },
      'cough': { code: 'R05.9', description: 'Cough, unspecified' },
      'uri': { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
      'abdominal pain': { code: 'R10.9', description: 'Unspecified abdominal pain' },
      'nausea': { code: 'R11.0', description: 'Nausea' },
    };

    for (const dx of assessment) {
      const dxLower = dx.toLowerCase();
      for (const [keyword, icdData] of Object.entries(icdMap)) {
        if (dxLower.includes(keyword) && !codes.some(c => c.code === icdData.code)) {
          codes.push({ ...icdData, confidence: 0.85 });
        }
      }
    }

    return codes;
  }

  private suggestCPTCodes(
    encounterType: AmbientSessionConfig['encounterType']
  ): GeneratedNote['cptCodes'] {
    const cptMap: Record<string, { code: string; description: string }> = {
      new_patient: { code: '99203', description: 'Office visit, new patient, low complexity' },
      follow_up: { code: '99214', description: 'Office visit, established patient, moderate complexity' },
      annual_wellness: { code: '99396', description: 'Preventive visit, established patient, 40-64 years' },
      acute: { code: '99214', description: 'Office visit, established patient, moderate complexity' },
      telehealth: { code: '99214', description: 'Office visit, established patient, moderate complexity' },
    };

    return [{ ...cptMap[encounterType], confidence: 0.80 }];
  }

  // ============================================================
  // FULL PROCESSING PIPELINE
  // ============================================================

  /**
   * Process complete recording and generate note
   */
  async processRecording(
    transcript: TranscriptSegment[],
    config: AmbientSessionConfig
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Extract clinical entities
      const entities = await this.extractClinicalEntities(transcript);

      // Extract structured clinical data
      const extractions = await this.extractClinicalData(transcript, entities);

      // Generate clinical note
      const generatedNote = await this.generateClinicalNote(extractions, config);

      // Add warnings if needed
      if (extractions.symptoms.length === 0) {
        warnings.push('No symptoms clearly identified - please review and add chief complaint');
      }
      if (generatedNote.icdCodes.length === 0) {
        warnings.push('No ICD codes could be suggested - manual coding required');
      }

      return {
        success: true,
        transcript,
        extractions,
        generatedNote,
        warnings,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        transcript,
        extractions: {
          chiefComplaint: '',
          symptoms: [],
          medications: [],
          allergies: [],
          vitalSigns: {},
          physicalExamFindings: [],
          entities: [],
        },
        generatedNote: null as any,
        warnings: [`Processing error: ${error}`],
        processingTime: Date.now() - startTime,
      };
    }
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const ambientAI = new AmbientAIService();
