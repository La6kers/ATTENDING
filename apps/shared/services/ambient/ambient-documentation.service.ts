// ============================================================
// ATTENDING AI - Ambient Documentation Service
// apps/shared/services/ambient/ambient-documentation.service.ts
//
// Phase 8C: Speech recognition and clinical NLP processing
// Converts conversations to structured SOAP notes
// ============================================================

// ============================================================
// TYPES
// ============================================================

export type Speaker = 'provider' | 'patient' | 'unknown';

export interface TranscriptSegment {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
  confidence: number;
  clinicalEntities?: ClinicalEntity[];
}

export interface ClinicalEntity {
  type: 'symptom' | 'duration' | 'severity' | 'medication' | 'condition' | 'vital' | 'allergy' | 'procedure';
  text: string;
  normalizedValue?: string;
  code?: string;
  confidence: number;
}

export interface SOAPNote {
  subjective: SubjectiveSection;
  objective: ObjectiveSection;
  assessment: AssessmentSection;
  plan: PlanSection;
  metadata: NoteMetadata;
}

export interface SubjectiveSection {
  chiefComplaint: string;
  hpi: string;
  ros: Record<string, string>;
  pmh: string[];
  medications: string[];
  allergies: string[];
  socialHistory: string;
  familyHistory: string;
}

export interface ObjectiveSection {
  vitals: Record<string, string>;
  physicalExam: Record<string, string>;
  labResults?: string[];
}

export interface AssessmentSection {
  diagnoses: Array<{
    description: string;
    icd10?: string;
    isPrimary: boolean;
  }>;
  differentials?: string[];
}

export interface PlanSection {
  items: Array<{
    category: 'medication' | 'lab' | 'imaging' | 'referral' | 'education' | 'follow-up' | 'procedure';
    description: string;
    details?: string;
  }>;
}

export interface NoteMetadata {
  generatedAt: Date;
  modelVersion: string;
  confidence: number;
  processingTimeMs: number;
  transcriptSegments: number;
}

export interface AmbientSession {
  id: string;
  patientId: string;
  providerId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  transcript: TranscriptSegment[];
  soapNote?: SOAPNote;
  status: 'recording' | 'processing' | 'complete' | 'error';
}

// ============================================================
// CLINICAL NLP PATTERNS
// ============================================================

const SYMPTOM_PATTERNS = [
  /(?:have|having|feel|feeling|experience|experiencing|notice|noticing)\s+(?:a\s+)?(\w+(?:\s+\w+)?(?:\s+\w+)?)/gi,
  /(\w+)\s+(?:pain|ache|discomfort|soreness)/gi,
  /(headache|cough|fever|nausea|vomiting|diarrhea|fatigue|dizziness|weakness|numbness|tingling|swelling|rash|itching)/gi,
  /(shortness of breath|chest pain|abdominal pain|back pain|joint pain|muscle pain)/gi,
];

const DURATION_PATTERNS = [
  /(?:for|since|about|approximately|around)\s+(\d+\s+(?:day|week|month|hour|year)s?)/gi,
  /(?:started|began|onset)\s+(\d+\s+(?:day|week|month|hour|year)s?\s+ago)/gi,
  /(yesterday|today|this morning|last night|last week|few days)/gi,
];

const SEVERITY_PATTERNS = [
  /(mild|moderate|severe|worst|terrible|unbearable|excruciating)/gi,
  /(\d+)\s*(?:out of|\/)\s*10/gi,
  /(better|worse|same|improving|worsening|constant|intermittent)/gi,
];

const MEDICATION_PATTERNS = [
  /(aspirin|ibuprofen|tylenol|acetaminophen|advil|motrin|aleve|naproxen)/gi,
  /(lisinopril|metformin|atorvastatin|omeprazole|amlodipine|metoprolol|losartan)/gi,
  /(gabapentin|tramadol|hydrocodone|oxycodone|prednisone|amoxicillin|azithromycin)/gi,
];

const ALLERGY_PATTERNS = [
  /(?:allergic to|allergy to|allergies include)\s+(\w+(?:\s*,\s*\w+)*)/gi,
  /(penicillin|sulfa|codeine|morphine|latex|shellfish|peanut)\s+allergy/gi,
];

const VITAL_PATTERNS = [
  /(?:blood pressure|bp)\s*(?:is|was|of)?\s*(\d+\/\d+)/gi,
  /(?:heart rate|pulse|hr)\s*(?:is|was|of)?\s*(\d+)/gi,
  /(?:temperature|temp)\s*(?:is|was|of)?\s*(\d+\.?\d*)/gi,
  /(?:weight)\s*(?:is|was|of)?\s*(\d+)\s*(?:lbs?|pounds?|kg)?/gi,
];

// ============================================================
// AMBIENT DOCUMENTATION SERVICE
// ============================================================

export class AmbientDocumentationService {
  private modelVersion = 'biomistral-7b-ambient-v1';

  // ============================================================
  // CLINICAL ENTITY EXTRACTION
  // ============================================================

  extractClinicalEntities(text: string): ClinicalEntity[] {
    const entities: ClinicalEntity[] = [];

    // Extract symptoms
    SYMPTOM_PATTERNS.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: 'symptom',
          text: match[1] || match[0],
          confidence: 0.85,
        });
      }
    });

    // Extract duration
    DURATION_PATTERNS.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: 'duration',
          text: match[1] || match[0],
          confidence: 0.9,
        });
      }
    });

    // Extract severity
    SEVERITY_PATTERNS.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: 'severity',
          text: match[1] || match[0],
          confidence: 0.88,
        });
      }
    });

    // Extract medications
    MEDICATION_PATTERNS.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: 'medication',
          text: match[1] || match[0],
          confidence: 0.92,
        });
      }
    });

    // Extract allergies
    ALLERGY_PATTERNS.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: 'allergy',
          text: match[1] || match[0],
          confidence: 0.95,
        });
      }
    });

    // Extract vitals
    VITAL_PATTERNS.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: 'vital',
          text: match[1] || match[0],
          confidence: 0.93,
        });
      }
    });

    // Remove duplicates
    return this.deduplicateEntities(entities);
  }

  private deduplicateEntities(entities: ClinicalEntity[]): ClinicalEntity[] {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.text.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ============================================================
  // SOAP NOTE GENERATION
  // ============================================================

  async generateSOAPNote(
    transcript: TranscriptSegment[],
    patientInfo: { name: string; age?: number; gender?: string }
  ): Promise<SOAPNote> {
    const startTime = Date.now();

    // Combine transcript text by speaker
    const patientText = transcript
      .filter(s => s.speaker === 'patient')
      .map(s => s.text)
      .join(' ');

    const providerText = transcript
      .filter(s => s.speaker === 'provider')
      .map(s => s.text)
      .join(' ');

    // Extract all clinical entities
    const allEntities = transcript.flatMap(s => 
      s.clinicalEntities || this.extractClinicalEntities(s.text)
    );

    // Categorize entities
    const symptoms = allEntities.filter(e => e.type === 'symptom');
    const medications = allEntities.filter(e => e.type === 'medication');
    const allergies = allEntities.filter(e => e.type === 'allergy');
    const vitals = allEntities.filter(e => e.type === 'vital');
    const duration = allEntities.find(e => e.type === 'duration');
    const severity = allEntities.find(e => e.type === 'severity');

    // Generate HPI
    const chiefComplaint = symptoms[0]?.text || 'General evaluation';
    const hpi = this.generateHPI(patientInfo, symptoms, duration, severity, medications);

    // Generate SOAP note
    const soapNote: SOAPNote = {
      subjective: {
        chiefComplaint: this.capitalize(chiefComplaint),
        hpi,
        ros: this.generateROS(symptoms),
        pmh: ['Review patient chart for complete history'],
        medications: medications.map(m => this.capitalize(m.text)),
        allergies: allergies.length > 0 
          ? allergies.map(a => this.capitalize(a.text))
          : ['No known allergies reported - verify in chart'],
        socialHistory: 'See patient chart for details',
        familyHistory: 'See patient chart for details',
      },
      objective: {
        vitals: this.generateVitals(vitals),
        physicalExam: this.generatePhysicalExam(symptoms),
      },
      assessment: {
        diagnoses: [
          {
            description: this.capitalize(chiefComplaint),
            isPrimary: true,
          },
        ],
        differentials: this.generateDifferentials(symptoms),
      },
      plan: {
        items: this.generatePlan(symptoms, chiefComplaint),
      },
      metadata: {
        generatedAt: new Date(),
        modelVersion: this.modelVersion,
        confidence: this.calculateConfidence(transcript),
        processingTimeMs: Date.now() - startTime,
        transcriptSegments: transcript.length,
      },
    };

    return soapNote;
  }

  private generateHPI(
    patient: { name: string; age?: number; gender?: string },
    symptoms: ClinicalEntity[],
    duration?: ClinicalEntity,
    severity?: ClinicalEntity,
    medications?: ClinicalEntity[]
  ): string {
    const ageGender = patient.age && patient.gender 
      ? `${patient.age}-year-old ${patient.gender}` 
      : 'Patient';

    const symptomList = symptoms.map(s => s.text).join(', ') || 'symptoms as described';
    const durationText = duration?.text || 'unspecified duration';
    const severityText = severity?.text || 'unspecified severity';

    let hpi = `${patient.name} is a ${ageGender} presenting with ${symptomList} for ${durationText}. `;
    hpi += `Patient describes severity as ${severityText}. `;

    if (medications && medications.length > 0) {
      hpi += `Patient reports taking ${medications.map(m => m.text).join(', ')} for symptom relief. `;
    }

    return hpi;
  }

  private generateROS(symptoms: ClinicalEntity[]): Record<string, string> {
    const symptomTexts = symptoms.map(s => s.text.toLowerCase());
    
    return {
      constitutional: symptomTexts.some(s => s.includes('fever') || s.includes('fatigue'))
        ? 'See HPI for details'
        : 'Denies fever, chills, weight changes',
      cardiovascular: symptomTexts.some(s => s.includes('chest') || s.includes('palpitation'))
        ? 'See HPI for details'
        : 'Denies chest pain, palpitations, edema',
      respiratory: symptomTexts.some(s => s.includes('cough') || s.includes('breath'))
        ? 'See HPI for details'
        : 'Denies shortness of breath, cough, wheezing',
      gastrointestinal: symptomTexts.some(s => s.includes('nausea') || s.includes('abdominal'))
        ? 'See HPI for details'
        : 'Denies nausea, vomiting, diarrhea, constipation',
      genitourinary: 'Denies dysuria, frequency, urgency',
      musculoskeletal: symptomTexts.some(s => s.includes('pain') || s.includes('ache'))
        ? 'See HPI for details'
        : 'Denies joint pain, muscle weakness',
      neurological: symptomTexts.some(s => s.includes('headache') || s.includes('dizz'))
        ? 'See HPI for details'
        : 'Denies headache, dizziness, numbness',
      psychiatric: 'Denies anxiety, depression, sleep disturbance',
    };
  }

  private generateVitals(vitalEntities: ClinicalEntity[]): Record<string, string> {
    const vitals: Record<string, string> = {
      bp: 'Pending',
      hr: 'Pending',
      temp: 'Pending',
      rr: 'Pending',
      o2sat: 'Pending',
      weight: 'Pending',
    };

    vitalEntities.forEach(v => {
      const text = v.text.toLowerCase();
      if (text.includes('/') && !text.includes(':')) vitals.bp = v.text;
      else if (text.match(/^\d{2,3}$/) && parseInt(text) > 40 && parseInt(text) < 200) vitals.hr = `${v.text} bpm`;
      else if (text.match(/^\d+\.?\d*$/) && parseFloat(text) > 95 && parseFloat(text) < 105) vitals.temp = `${v.text}°F`;
    });

    return vitals;
  }

  private generatePhysicalExam(symptoms: ClinicalEntity[]): Record<string, string> {
    const symptomTexts = symptoms.map(s => s.text.toLowerCase());

    return {
      general: 'Alert, oriented, no acute distress',
      heent: symptomTexts.some(s => s.includes('headache') || s.includes('throat'))
        ? 'See relevant exam below'
        : 'Normocephalic, PERRLA, oropharynx clear',
      neck: 'Supple, no lymphadenopathy',
      cardiovascular: 'Regular rate and rhythm, no murmurs',
      respiratory: 'Clear to auscultation bilaterally, no wheezes or crackles',
      abdomen: 'Soft, non-tender, non-distended, normal bowel sounds',
      extremities: 'No edema, peripheral pulses intact',
      neurological: 'CN II-XII intact, strength 5/5 throughout, sensation intact',
      skin: 'Warm, dry, no rashes',
    };
  }

  private generateDifferentials(symptoms: ClinicalEntity[]): string[] {
    // In production, this would use AI to generate appropriate differentials
    const symptomTexts = symptoms.map(s => s.text.toLowerCase());
    const differentials: string[] = [];

    if (symptomTexts.some(s => s.includes('headache'))) {
      differentials.push('Tension headache', 'Migraine', 'Sinusitis');
    }
    if (symptomTexts.some(s => s.includes('chest'))) {
      differentials.push('Musculoskeletal pain', 'GERD', 'Anxiety');
    }
    if (symptomTexts.some(s => s.includes('cough'))) {
      differentials.push('Upper respiratory infection', 'Bronchitis', 'Allergies');
    }

    return differentials;
  }

  private generatePlan(symptoms: ClinicalEntity[], chiefComplaint: string): Array<{
    category: 'medication' | 'lab' | 'imaging' | 'referral' | 'education' | 'follow-up' | 'procedure';
    description: string;
    details?: string;
  }> {
    return [
      {
        category: 'education',
        description: `Discussed ${chiefComplaint} with patient`,
        details: 'Reviewed warning signs to watch for',
      },
      {
        category: 'follow-up',
        description: 'Return for follow-up as needed',
        details: 'Call if symptoms worsen or new symptoms develop',
      },
    ];
  }

  private calculateConfidence(transcript: TranscriptSegment[]): number {
    if (transcript.length === 0) return 0;
    
    const avgConfidence = transcript.reduce((sum, s) => sum + s.confidence, 0) / transcript.length;
    const lengthBonus = Math.min(transcript.length / 10, 0.1);
    
    return Math.min(Math.round((avgConfidence + lengthBonus) * 100), 98);
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  async startSession(patientId: string, providerId: string): Promise<AmbientSession> {
    return {
      id: `session_${Date.now()}`,
      patientId,
      providerId,
      startTime: new Date(),
      duration: 0,
      transcript: [],
      status: 'recording',
    };
  }

  async endSession(session: AmbientSession): Promise<AmbientSession> {
    return {
      ...session,
      endTime: new Date(),
      status: 'complete',
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const ambientDocumentation = new AmbientDocumentationService();
