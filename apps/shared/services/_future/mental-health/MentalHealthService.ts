// =============================================================================
// ATTENDING AI - Mental Health Integration Service
// apps/shared/services/mental-health/MentalHealthService.ts
//
// Comprehensive mental health support including:
// - PHQ-9, GAD-7, and other validated screenings
// - Crisis detection and intervention
// - Behavioral health resource matching
// - Therapy session tracking
// - Medication management for psych meds
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface MentalHealthProfile {
  patientId: string;
  diagnoses: MentalHealthDiagnosis[];
  screenings: ScreeningResult[];
  treatments: MentalHealthTreatment[];
  providers: BehavioralHealthProvider[];
  crisisHistory: CrisisEvent[];
  safetyPlan?: SafetyPlan;
  preferences: PatientPreferences;
  riskLevel: 'low' | 'moderate' | 'high' | 'acute';
  lastAssessmentDate?: Date;
}

export interface MentalHealthDiagnosis {
  condition: string;
  icd10Code: string;
  severity: 'mild' | 'moderate' | 'severe';
  onsetDate?: Date;
  diagnosedBy: string;
  diagnosedDate: Date;
  status: 'active' | 'in-remission' | 'resolved';
  notes?: string;
}

export interface ScreeningResult {
  id: string;
  patientId: string;
  screeningType: ScreeningType;
  administeredDate: Date;
  administeredBy?: string;
  responses: ScreeningResponse[];
  totalScore: number;
  severity: string;
  interpretation: string;
  recommendations: string[];
  followUpNeeded: boolean;
  followUpType?: string;
  crisisIndicators: CrisisIndicator[];
}

export type ScreeningType = 
  | 'PHQ-9'      // Depression
  | 'GAD-7'      // Anxiety
  | 'PHQ-2'      // Depression quick screen
  | 'GAD-2'      // Anxiety quick screen
  | 'MDQ'        // Bipolar
  | 'AUDIT-C'    // Alcohol
  | 'DAST-10'    // Drug use
  | 'PC-PTSD-5'  // PTSD
  | 'PSQ-9'      // Psychosis
  | 'C-SSRS'     // Suicide risk
  | 'Edinburgh'  // Postpartum depression
  | 'CAGE'       // Alcohol
  | 'custom';

export interface ScreeningResponse {
  questionNumber: number;
  questionText: string;
  response: number | string;
  score: number;
  isCritical: boolean;
  criticalReason?: string;
}

export interface CrisisIndicator {
  type: 'suicidal-ideation' | 'self-harm' | 'homicidal-ideation' | 'psychosis' | 'substance-overdose' | 'severe-symptoms';
  severity: 'passive' | 'active' | 'imminent';
  description: string;
  questionSource?: number;
  immediateActionRequired: boolean;
}

export interface MentalHealthTreatment {
  id: string;
  type: 'medication' | 'therapy' | 'hospitalization' | 'intensive-outpatient' | 'partial-hospitalization' | 'support-group' | 'other';
  name: string;
  provider?: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'discontinued';
  frequency?: string;
  notes?: string;
  effectiveness?: 'very-effective' | 'somewhat-effective' | 'minimally-effective' | 'not-effective' | 'too-early';
}

export interface BehavioralHealthProvider {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  role: 'psychiatrist' | 'psychologist' | 'therapist' | 'counselor' | 'social-worker' | 'care-manager' | 'other';
  organization?: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  lastContactDate?: Date;
}

export interface CrisisEvent {
  id: string;
  date: Date;
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  intervention: string;
  outcome: string;
  hospitalizedRequired: boolean;
  followUpPlan: string;
}

export interface SafetyPlan {
  id: string;
  patientId: string;
  createdDate: Date;
  lastReviewedDate: Date;
  warningSignsOfCrisis: string[];
  copingStrategies: string[];
  reasonsForLiving: string[];
  socialSupports: SafetyPlanContact[];
  professionalSupports: SafetyPlanContact[];
  emergencyContacts: SafetyPlanContact[];
  environmentalSafetySteps: string[];
  crisisHotlines: { name: string; number: string }[];
  personalizedTips: string[];
  patientSignature?: string;
  providerSignature?: string;
}

export interface SafetyPlanContact {
  name: string;
  relationship: string;
  phone: string;
  availableHours?: string;
}

export interface PatientPreferences {
  preferredTherapyType: string[];
  preferredProviderGender?: 'male' | 'female' | 'no-preference';
  preferredLanguage: string;
  teleheathPreference: 'in-person-only' | 'telehealth-only' | 'no-preference';
  groupTherapyOpenness: boolean;
  medicationOpenness: boolean;
  specificConcerns?: string[];
}

export interface TherapySession {
  id: string;
  patientId: string;
  providerId: string;
  sessionDate: Date;
  sessionType: 'individual' | 'group' | 'couples' | 'family';
  modality: 'in-person' | 'telehealth-video' | 'telehealth-phone';
  duration: number; // minutes
  primaryFocus: string[];
  interventionsUsed: string[];
  homeworkAssigned?: string;
  nextSessionDate?: Date;
  progressNotes?: string;
  moodRating?: number;
  symptomChanges?: string;
}

// =============================================================================
// Screening Instruments
// =============================================================================

interface ScreeningInstrument {
  type: ScreeningType;
  name: string;
  questions: ScreeningQuestion[];
  scoringRanges: ScoringRange[];
  criticalItems: number[];
  timeToAdminister: string;
}

interface ScreeningQuestion {
  number: number;
  text: string;
  options: { value: number; label: string }[];
}

interface ScoringRange {
  min: number;
  max: number;
  severity: string;
  interpretation: string;
  recommendations: string[];
}

const PHQ9_INSTRUMENT: ScreeningInstrument = {
  type: 'PHQ-9',
  name: 'Patient Health Questionnaire-9',
  questions: [
    { number: 1, text: 'Little interest or pleasure in doing things', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 2, text: 'Feeling down, depressed, or hopeless', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 3, text: 'Trouble falling or staying asleep, or sleeping too much', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 4, text: 'Feeling tired or having little energy', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 5, text: 'Poor appetite or overeating', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 6, text: 'Feeling bad about yourself—or that you are a failure or have let yourself or your family down', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 8, text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite—being so fidgety or restless that you have been moving around a lot more than usual', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 9, text: 'Thoughts that you would be better off dead or of hurting yourself in some way', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
  ],
  scoringRanges: [
    { min: 0, max: 4, severity: 'Minimal', interpretation: 'Minimal depression symptoms', recommendations: ['No treatment indicated', 'Routine follow-up'] },
    { min: 5, max: 9, severity: 'Mild', interpretation: 'Mild depression symptoms', recommendations: ['Watchful waiting', 'Consider follow-up screening in 2-4 weeks', 'Psychoeducation'] },
    { min: 10, max: 14, severity: 'Moderate', interpretation: 'Moderate depression', recommendations: ['Consider treatment plan', 'Therapy recommended', 'Medication may be considered'] },
    { min: 15, max: 19, severity: 'Moderately Severe', interpretation: 'Moderately severe depression', recommendations: ['Active treatment warranted', 'Combination therapy and medication often beneficial', 'Close follow-up'] },
    { min: 20, max: 27, severity: 'Severe', interpretation: 'Severe depression', recommendations: ['Immediate intervention', 'Medication strongly recommended', 'Consider psychiatric referral', 'Assess for hospitalization if safety concerns'] },
  ],
  criticalItems: [9], // Question 9 about suicidal ideation
  timeToAdminister: '2-5 minutes',
};

const GAD7_INSTRUMENT: ScreeningInstrument = {
  type: 'GAD-7',
  name: 'Generalized Anxiety Disorder-7',
  questions: [
    { number: 1, text: 'Feeling nervous, anxious, or on edge', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 2, text: 'Not being able to stop or control worrying', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 3, text: 'Worrying too much about different things', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 4, text: 'Trouble relaxing', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 5, text: 'Being so restless that it\'s hard to sit still', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 6, text: 'Becoming easily annoyed or irritable', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    { number: 7, text: 'Feeling afraid as if something awful might happen', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
  ],
  scoringRanges: [
    { min: 0, max: 4, severity: 'Minimal', interpretation: 'Minimal anxiety', recommendations: ['No treatment indicated'] },
    { min: 5, max: 9, severity: 'Mild', interpretation: 'Mild anxiety', recommendations: ['Watchful waiting', 'Relaxation techniques', 'Follow-up screening'] },
    { min: 10, max: 14, severity: 'Moderate', interpretation: 'Moderate anxiety', recommendations: ['Consider treatment', 'CBT recommended', 'Medication may be helpful'] },
    { min: 15, max: 21, severity: 'Severe', interpretation: 'Severe anxiety', recommendations: ['Active treatment warranted', 'Combination therapy recommended', 'Psychiatric consultation'] },
  ],
  criticalItems: [],
  timeToAdminister: '2-3 minutes',
};

const SCREENING_INSTRUMENTS: Record<ScreeningType, ScreeningInstrument> = {
  'PHQ-9': PHQ9_INSTRUMENT,
  'GAD-7': GAD7_INSTRUMENT,
  'PHQ-2': { type: 'PHQ-2', name: 'Patient Health Questionnaire-2', questions: PHQ9_INSTRUMENT.questions.slice(0, 2), scoringRanges: [{ min: 0, max: 2, severity: 'Negative', interpretation: 'Depression screen negative', recommendations: [] }, { min: 3, max: 6, severity: 'Positive', interpretation: 'Depression screen positive - administer full PHQ-9', recommendations: ['Administer PHQ-9'] }], criticalItems: [], timeToAdminister: '1 minute' },
  'GAD-2': { type: 'GAD-2', name: 'Generalized Anxiety Disorder-2', questions: GAD7_INSTRUMENT.questions.slice(0, 2), scoringRanges: [{ min: 0, max: 2, severity: 'Negative', interpretation: 'Anxiety screen negative', recommendations: [] }, { min: 3, max: 6, severity: 'Positive', interpretation: 'Anxiety screen positive - administer full GAD-7', recommendations: ['Administer GAD-7'] }], criticalItems: [], timeToAdminister: '1 minute' },
  'MDQ': { type: 'MDQ', name: 'Mood Disorder Questionnaire', questions: [], scoringRanges: [], criticalItems: [], timeToAdminister: '5 minutes' },
  'AUDIT-C': { type: 'AUDIT-C', name: 'Alcohol Use Disorders Identification Test', questions: [], scoringRanges: [], criticalItems: [], timeToAdminister: '2 minutes' },
  'DAST-10': { type: 'DAST-10', name: 'Drug Abuse Screening Test', questions: [], scoringRanges: [], criticalItems: [], timeToAdminister: '3 minutes' },
  'PC-PTSD-5': { type: 'PC-PTSD-5', name: 'Primary Care PTSD Screen', questions: [], scoringRanges: [], criticalItems: [], timeToAdminister: '2 minutes' },
  'PSQ-9': { type: 'PSQ-9', name: 'Prodromal Questionnaire', questions: [], scoringRanges: [], criticalItems: [], timeToAdminister: '5 minutes' },
  'C-SSRS': { type: 'C-SSRS', name: 'Columbia Suicide Severity Rating Scale', questions: [], scoringRanges: [], criticalItems: [1, 2, 3, 4, 5, 6], timeToAdminister: '5-10 minutes' },
  'Edinburgh': { type: 'Edinburgh', name: 'Edinburgh Postnatal Depression Scale', questions: [], scoringRanges: [], criticalItems: [10], timeToAdminister: '5 minutes' },
  'CAGE': { type: 'CAGE', name: 'CAGE Alcohol Questionnaire', questions: [], scoringRanges: [], criticalItems: [], timeToAdminister: '1 minute' },
  'custom': { type: 'custom', name: 'Custom Screening', questions: [], scoringRanges: [], criticalItems: [], timeToAdminister: 'Variable' },
};

// =============================================================================
// Mental Health Service Class
// =============================================================================

export class MentalHealthService extends EventEmitter {
  private profiles: Map<string, MentalHealthProfile> = new Map();
  private screenings: Map<string, ScreeningResult[]> = new Map();
  private sessions: Map<string, TherapySession[]> = new Map();
  private safetyPlans: Map<string, SafetyPlan> = new Map();

  constructor() {
    super();
  }

  // ===========================================================================
  // Screening Administration
  // ===========================================================================

  getScreeningInstrument(type: ScreeningType): ScreeningInstrument | null {
    return SCREENING_INSTRUMENTS[type] || null;
  }

  administerScreening(
    patientId: string,
    screeningType: ScreeningType,
    responses: { questionNumber: number; response: number }[],
    administeredBy?: string
  ): ScreeningResult {
    const instrument = SCREENING_INSTRUMENTS[screeningType];
    if (!instrument) {
      throw new Error(`Unknown screening type: ${screeningType}`);
    }

    const id = `screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate score and build response details
    let totalScore = 0;
    const screeningResponses: ScreeningResponse[] = [];
    const crisisIndicators: CrisisIndicator[] = [];

    for (const response of responses) {
      const question = instrument.questions.find(q => q.number === response.questionNumber);
      if (!question) continue;

      const score = response.response;
      totalScore += score;

      const isCritical = instrument.criticalItems.includes(response.questionNumber) && score > 0;
      
      screeningResponses.push({
        questionNumber: response.questionNumber,
        questionText: question.text,
        response: response.response,
        score,
        isCritical,
        criticalReason: isCritical ? 'Critical item endorsed' : undefined,
      });

      // Check for crisis indicators
      if (isCritical) {
        if (screeningType === 'PHQ-9' && response.questionNumber === 9 && score > 0) {
          crisisIndicators.push({
            type: 'suicidal-ideation',
            severity: score >= 2 ? 'active' : 'passive',
            description: `Patient endorsed suicidal ideation (score: ${score})`,
            questionSource: 9,
            immediateActionRequired: score >= 2,
          });
        }
      }
    }

    // Determine severity and interpretation
    const scoringRange = instrument.scoringRanges.find(
      r => totalScore >= r.min && totalScore <= r.max
    );

    const result: ScreeningResult = {
      id,
      patientId,
      screeningType,
      administeredDate: new Date(),
      administeredBy,
      responses: screeningResponses,
      totalScore,
      severity: scoringRange?.severity || 'Unknown',
      interpretation: scoringRange?.interpretation || 'Unable to interpret',
      recommendations: scoringRange?.recommendations || [],
      followUpNeeded: totalScore >= (instrument.scoringRanges[1]?.min || 5),
      crisisIndicators,
    };

    // Determine follow-up type
    if (crisisIndicators.some(c => c.immediateActionRequired)) {
      result.followUpType = 'immediate-safety-assessment';
    } else if (totalScore >= (instrument.scoringRanges[instrument.scoringRanges.length - 1]?.min || 15)) {
      result.followUpType = 'urgent-psychiatric-evaluation';
    } else if (result.followUpNeeded) {
      result.followUpType = 'routine-follow-up';
    }

    // Store result
    const patientScreenings = this.screenings.get(patientId) || [];
    patientScreenings.push(result);
    this.screenings.set(patientId, patientScreenings);

    // Update profile risk level
    this.updateRiskLevel(patientId);

    // Emit events
    this.emit('screeningCompleted', result);

    if (crisisIndicators.length > 0) {
      this.emit('crisisIndicatorDetected', { patientId, result, crisisIndicators });
    }

    return result;
  }

  getScreeningHistory(patientId: string, screeningType?: ScreeningType): ScreeningResult[] {
    const screenings = this.screenings.get(patientId) || [];
    if (screeningType) {
      return screenings.filter(s => s.screeningType === screeningType);
    }
    return screenings.sort((a, b) => b.administeredDate.getTime() - a.administeredDate.getTime());
  }

  // ===========================================================================
  // Crisis Detection & Management
  // ===========================================================================

  assessCrisisRisk(patientId: string): {
    riskLevel: 'low' | 'moderate' | 'high' | 'acute';
    riskFactors: string[];
    protectiveFactors: string[];
    recommendations: string[];
    immediateActionRequired: boolean;
  } {
    const profile = this.profiles.get(patientId);
    const screenings = this.screenings.get(patientId) || [];
    
    const riskFactors: string[] = [];
    const protectiveFactors: string[] = [];
    let riskScore = 0;

    // Check recent screenings
    const recentScreenings = screenings.filter(
      s => s.administeredDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    for (const screening of recentScreenings) {
      if (screening.crisisIndicators.length > 0) {
        riskScore += 30;
        riskFactors.push(`Recent crisis indicators on ${screening.screeningType}`);
      }
      
      if (screening.severity === 'Severe' || screening.severity === 'Moderately Severe') {
        riskScore += 15;
        riskFactors.push(`${screening.severity} ${screening.screeningType} score`);
      }
    }

    // Check crisis history
    if (profile?.crisisHistory?.length) {
      const recentCrisis = profile.crisisHistory.filter(
        c => c.date > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      );
      if (recentCrisis.length > 0) {
        riskScore += 20;
        riskFactors.push('Recent crisis event in past 90 days');
      }
    }

    // Check for protective factors
    if (profile?.safetyPlan) {
      protectiveFactors.push('Safety plan in place');
      riskScore -= 5;
    }

    if (profile?.providers?.length) {
      protectiveFactors.push('Engaged with behavioral health provider');
      riskScore -= 5;
    }

    if (profile?.treatments?.some(t => t.status === 'active')) {
      protectiveFactors.push('Active in treatment');
      riskScore -= 5;
    }

    // Determine risk level
    let riskLevel: 'low' | 'moderate' | 'high' | 'acute';
    if (riskScore >= 50) {
      riskLevel = 'acute';
    } else if (riskScore >= 30) {
      riskLevel = 'high';
    } else if (riskScore >= 15) {
      riskLevel = 'moderate';
    } else {
      riskLevel = 'low';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskLevel === 'acute') {
      recommendations.push('Immediate safety assessment required');
      recommendations.push('Consider emergency psychiatric evaluation');
      recommendations.push('Do not leave patient alone');
    } else if (riskLevel === 'high') {
      recommendations.push('Same-day psychiatric evaluation recommended');
      recommendations.push('Review and update safety plan');
      recommendations.push('Increase monitoring frequency');
    } else if (riskLevel === 'moderate') {
      recommendations.push('Schedule follow-up within 1 week');
      recommendations.push('Consider safety plan if not in place');
      recommendations.push('Review current treatment plan');
    }

    return {
      riskLevel,
      riskFactors,
      protectiveFactors,
      recommendations,
      immediateActionRequired: riskLevel === 'acute',
    };
  }

  // ===========================================================================
  // Safety Plan Management
  // ===========================================================================

  createSafetyPlan(
    patientId: string,
    plan: Omit<SafetyPlan, 'id' | 'createdDate' | 'lastReviewedDate'>
  ): SafetyPlan {
    const fullPlan: SafetyPlan = {
      ...plan,
      id: `sp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      patientId,
      createdDate: new Date(),
      lastReviewedDate: new Date(),
      crisisHotlines: [
        { name: '988 Suicide & Crisis Lifeline', number: '988' },
        { name: 'Crisis Text Line', number: 'Text HOME to 741741' },
        { name: 'National Domestic Violence Hotline', number: '1-800-799-7233' },
        ...plan.crisisHotlines,
      ],
    };

    this.safetyPlans.set(patientId, fullPlan);
    this.emit('safetyPlanCreated', fullPlan);

    return fullPlan;
  }

  getSafetyPlan(patientId: string): SafetyPlan | undefined {
    return this.safetyPlans.get(patientId);
  }

  // ===========================================================================
  // Therapy Session Tracking
  // ===========================================================================

  recordTherapySession(session: Omit<TherapySession, 'id'>): TherapySession {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const fullSession: TherapySession = {
      ...session,
      id,
    };

    const patientSessions = this.sessions.get(session.patientId) || [];
    patientSessions.push(fullSession);
    this.sessions.set(session.patientId, patientSessions);

    this.emit('therapySessionRecorded', fullSession);

    return fullSession;
  }

  getTherapySessions(patientId: string): TherapySession[] {
    return (this.sessions.get(patientId) || [])
      .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
  }

  // ===========================================================================
  // Profile Management
  // ===========================================================================

  getProfile(patientId: string): MentalHealthProfile | undefined {
    return this.profiles.get(patientId);
  }

  updateProfile(patientId: string, updates: Partial<MentalHealthProfile>): MentalHealthProfile {
    const existing = this.profiles.get(patientId) || {
      patientId,
      diagnoses: [],
      screenings: [],
      treatments: [],
      providers: [],
      crisisHistory: [],
      preferences: {
        preferredTherapyType: [],
        preferredLanguage: 'English',
        teleheathPreference: 'no-preference',
        groupTherapyOpenness: false,
        medicationOpenness: true,
      },
      riskLevel: 'low',
    };

    const updated: MentalHealthProfile = {
      ...existing,
      ...updates,
    };

    this.profiles.set(patientId, updated);
    return updated;
  }

  private updateRiskLevel(patientId: string): void {
    const assessment = this.assessCrisisRisk(patientId);
    const profile = this.profiles.get(patientId);
    
    if (profile) {
      profile.riskLevel = assessment.riskLevel;
      profile.lastAssessmentDate = new Date();
    }
  }

  // ===========================================================================
  // Resource Matching
  // ===========================================================================

  findBehavioralHealthResources(
    patientId: string,
    resourceType: 'therapist' | 'psychiatrist' | 'support-group' | 'crisis-services' | 'all'
  ): {
    providers: any[];
    supportGroups: any[];
    crisisResources: any[];
    onlineResources: any[];
  } {
    const profile = this.profiles.get(patientId);
    
    // In production, this would query a provider directory
    // For demonstration, we provide structure
    
    return {
      providers: [
        {
          name: 'Mental Health Associates',
          type: 'group-practice',
          specialties: ['Depression', 'Anxiety', 'Trauma'],
          acceptingNewPatients: true,
          telehealth: true,
          insuranceAccepted: ['Most major insurances'],
          languages: ['English', 'Spanish'],
          nextAvailability: '2-3 weeks',
        },
      ],
      supportGroups: [
        {
          name: 'Depression and Anxiety Support Group',
          frequency: 'Weekly',
          location: 'Community Center',
          cost: 'Free',
          virtualOption: true,
        },
      ],
      crisisResources: [
        { name: '988 Suicide & Crisis Lifeline', contact: '988', available: '24/7' },
        { name: 'Crisis Text Line', contact: 'Text HOME to 741741', available: '24/7' },
        { name: 'Local Crisis Center', contact: '555-CRISIS', available: '24/7' },
      ],
      onlineResources: [
        { name: 'NAMI', url: 'https://www.nami.org', description: 'National Alliance on Mental Illness' },
        { name: 'MentalHealth.gov', url: 'https://www.mentalhealth.gov', description: 'Federal mental health resources' },
      ],
    };
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  getPatientProgressReport(patientId: string): {
    screeningTrends: { date: Date; type: ScreeningType; score: number }[];
    treatmentEngagement: { sessionsAttended: number; sessionsScheduled: number };
    symptomChanges: string;
    recommendations: string[];
  } {
    const screenings = this.screenings.get(patientId) || [];
    const sessions = this.sessions.get(patientId) || [];

    const screeningTrends = screenings.map(s => ({
      date: s.administeredDate,
      type: s.screeningType,
      score: s.totalScore,
    }));

    const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => s.sessionDate > last90Days);

    // Analyze symptom changes
    const phq9Screenings = screenings.filter(s => s.screeningType === 'PHQ-9').slice(-3);
    let symptomChanges = 'Insufficient data';
    
    if (phq9Screenings.length >= 2) {
      const first = phq9Screenings[0].totalScore;
      const last = phq9Screenings[phq9Screenings.length - 1].totalScore;
      const change = last - first;
      
      if (change <= -5) {
        symptomChanges = 'Significant improvement';
      } else if (change < 0) {
        symptomChanges = 'Mild improvement';
      } else if (change === 0) {
        symptomChanges = 'Stable';
      } else if (change <= 5) {
        symptomChanges = 'Mild worsening';
      } else {
        symptomChanges = 'Significant worsening - review treatment plan';
      }
    }

    return {
      screeningTrends,
      treatmentEngagement: {
        sessionsAttended: recentSessions.length,
        sessionsScheduled: recentSessions.length, // Would track scheduled vs attended
      },
      symptomChanges,
      recommendations: symptomChanges.includes('worsening') 
        ? ['Review current treatment plan', 'Consider medication adjustment', 'Increase session frequency']
        : ['Continue current treatment plan'],
    };
  }
}

// Singleton instance
export const mentalHealthService = new MentalHealthService();
export default mentalHealthService;
