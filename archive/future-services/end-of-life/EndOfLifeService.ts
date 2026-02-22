// =============================================================================
// ATTENDING AI - End-of-Life Care Planning Service
// apps/shared/services/end-of-life/EndOfLifeService.ts
//
// Comprehensive end-of-life care support including:
// - Advance directive creation & storage
// - Goals of care documentation
// - Palliative care coordination
// - Family communication tools
// - Hospice transition support
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface AdvanceCarePlan {
  id: string;
  patientId: string;
  status: 'draft' | 'active' | 'superseded' | 'voided';
  createdDate: Date;
  lastUpdatedDate: Date;
  lastReviewedDate: Date;
  reviewedBy?: string;
  advanceDirective?: AdvanceDirective;
  goalsOfCare: GoalsOfCare;
  polstForm?: POLSTForm;
  healthcareProxy?: HealthcareProxy;
  documentLocations: DocumentLocation[];
  conversations: GoalsConversation[];
  preferences: EndOfLifePreferences;
  familyAwareness: FamilyAwareness;
}

export interface AdvanceDirective {
  type: 'living-will' | 'healthcare-power-of-attorney' | 'both';
  executedDate: Date;
  witnessedBy: string[];
  notarized: boolean;
  stateCompliant: string;
  documentUrl?: string;
  keyProvisions: {
    lifeSustainingTreatment: LifeSustainingPreferences;
    organDonation: OrganDonationPreferences;
    anatomicalGift: boolean;
    otherInstructions?: string;
  };
}

export interface LifeSustainingPreferences {
  cprPreference: 'attempt' | 'do-not-attempt' | 'limited-trial' | 'undecided';
  mechanicalVentilation: 'accept' | 'decline' | 'trial-period' | 'undecided';
  artificialNutrition: 'accept' | 'decline' | 'trial-period' | 'undecided';
  dialysis: 'accept' | 'decline' | 'trial-period' | 'undecided';
  hospitalization: 'accept' | 'decline' | 'limited' | 'undecided';
  antibiotics: 'accept' | 'decline' | 'comfort-only' | 'undecided';
  bloodTransfusion: 'accept' | 'decline' | 'undecided';
  conditions: string; // Under what conditions these apply
}

export interface OrganDonationPreferences {
  willDonate: boolean;
  registeredDonor: boolean;
  restrictions?: string[];
  researchConsent: boolean;
}

export interface GoalsOfCare {
  id: string;
  documentedDate: Date;
  documentedBy: string;
  primaryGoal: PrimaryGoal;
  secondaryGoals: string[];
  qualityOfLifePriorities: QualityOfLifePriority[];
  treatmentPreferences: TreatmentPreference[];
  prognosticAwareness: PrognosticAwareness;
  decisionMakingCapacity: DecisionMakingCapacity;
  informationPreferences: InformationPreferences;
  spiritualConsiderations?: SpiritualConsiderations;
  culturalConsiderations?: string;
  additionalWishes?: string;
}

export type PrimaryGoal =
  | 'cure-focused'
  | 'life-prolongation'
  | 'function-preservation'
  | 'comfort-focused'
  | 'uncertain';

export interface QualityOfLifePriority {
  priority: string;
  rank: number;
  notes?: string;
}

export interface TreatmentPreference {
  treatment: string;
  preference: 'want' | 'accept-if-recommended' | 'decline' | 'undecided';
  conditions?: string;
  notes?: string;
}

export interface PrognosticAwareness {
  understandsPrognosis: boolean;
  discussedWith: string[];
  lastDiscussionDate?: Date;
  prognosticEstimate?: string;
  patientPerspective?: string;
}

export interface DecisionMakingCapacity {
  hasCapacity: boolean;
  assessmentDate: Date;
  assessedBy: string;
  limitations?: string;
  supportNeeded?: string;
}

export interface InformationPreferences {
  wantsFullInformation: boolean;
  informationLevel: 'full-details' | 'general-overview' | 'minimal' | 'defer-to-family';
  whoToInform: string[];
  communicationPreferences: string;
}

export interface SpiritualConsiderations {
  religiousAffiliation?: string;
  spiritualPractices?: string[];
  clergyContact?: { name: string; phone: string };
  ritesRequested?: string[];
  afterDeathWishes?: string[];
}

export interface POLSTForm {
  id: string;
  completedDate: Date;
  completedBy: string;
  physicianSignature: boolean;
  patientOrSurrogateSignature: boolean;
  sectionA: {
    cprOrder: 'full-cpr' | 'dnr' | 'limited';
    notes?: string;
  };
  sectionB: {
    medicalInterventions: 'full-treatment' | 'selective-treatment' | 'comfort-focused';
    specificInstructions?: string;
  };
  sectionC: {
    artificialNutrition: 'long-term' | 'trial-period' | 'no-artificial-nutrition';
    specificInstructions?: string;
  };
  reviewDate?: Date;
  stateForm: string;
  documentUrl?: string;
}

export interface HealthcareProxy {
  id: string;
  primaryAgent: ProxyAgent;
  alternateAgents: ProxyAgent[];
  authorityScope: string[];
  restrictions?: string[];
  activationConditions: string;
  documentedDate: Date;
  documentUrl?: string;
}

export interface ProxyAgent {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  knowsWishes: boolean;
  lastDiscussionDate?: Date;
}

export interface DocumentLocation {
  documentType: string;
  location: 'ehr' | 'patient-portal' | 'paper-chart' | 'external' | 'home';
  description: string;
  lastVerified: Date;
  accessInstructions?: string;
}

export interface GoalsConversation {
  id: string;
  date: Date;
  conductedBy: string;
  participants: string[];
  setting: string;
  topicsDiscussed: string[];
  keyPoints: string[];
  decisionsReached?: string[];
  followUpNeeded?: string;
  nextConversationDate?: Date;
  notes?: string;
}

export interface EndOfLifePreferences {
  placeOfDeath: 'home' | 'hospital' | 'hospice-facility' | 'nursing-home' | 'undecided';
  whoPresent: string[];
  musicOrReadings?: string[];
  personalItems?: string[];
  lastWishes?: string[];
  funeralPreferences?: {
    type: 'burial' | 'cremation' | 'other' | 'undecided';
    service: 'religious' | 'secular' | 'none' | 'undecided';
    instructions?: string;
  };
}

export interface FamilyAwareness {
  familyInformed: boolean;
  familyAgreement: 'full' | 'partial' | 'disagreement' | 'not-discussed';
  conflictsIdentified?: string[];
  familyMeetingHeld?: boolean;
  familyMeetingDate?: Date;
  supportNeeded?: string[];
}

// =============================================================================
// Palliative Care Types
// =============================================================================

export interface PalliativeCareConsult {
  id: string;
  patientId: string;
  requestDate: Date;
  requestedBy: string;
  reason: string;
  urgency: 'emergent' | 'urgent' | 'routine';
  status: 'requested' | 'scheduled' | 'completed' | 'declined';
  scheduledDate?: Date;
  completedDate?: Date;
  consultNote?: string;
  recommendations?: string[];
  followUpPlan?: string;
}

export interface SymptomAssessment {
  id: string;
  patientId: string;
  assessmentDate: Date;
  assessedBy: string;
  symptoms: SymptomRating[];
  overallDistress: number;
  functionalStatus: FunctionalStatus;
  recommendations: string[];
}

export interface SymptomRating {
  symptom: string;
  severity: number; // 0-10
  frequency: 'constant' | 'frequent' | 'occasional' | 'rare';
  impact: 'severe' | 'moderate' | 'mild' | 'none';
  currentTreatment?: string;
  effectivenessOfTreatment?: 'effective' | 'partial' | 'ineffective';
}

export interface FunctionalStatus {
  scale: 'ECOG' | 'Karnofsky' | 'PPS';
  score: number;
  description: string;
  trend: 'improving' | 'stable' | 'declining';
  lastAssessedDate: Date;
}

// =============================================================================
// Hospice Types
// =============================================================================

export interface HospiceEligibility {
  patientId: string;
  assessmentDate: Date;
  assessedBy: string;
  diagnosis: string;
  prognosis: string;
  eligibleForHospice: boolean;
  eligibilityCriteria: EligibilityCriterion[];
  functionalStatus: FunctionalStatus;
  clinicalIndicators: string[];
  recommendations: string[];
  discussedWithPatient: boolean;
  discussedWithFamily: boolean;
  patientDecision?: 'accept' | 'decline' | 'undecided';
  barriersToCare?: string[];
}

export interface EligibilityCriterion {
  criterion: string;
  met: boolean;
  evidence?: string;
}

export interface HospiceReferral {
  id: string;
  patientId: string;
  referralDate: Date;
  referredBy: string;
  hospiceAgency?: string;
  diagnosis: string;
  primaryCaregiver?: string;
  preferredLevelOfCare: 'routine' | 'continuous' | 'respite' | 'general-inpatient';
  status: 'pending' | 'accepted' | 'enrolled' | 'declined' | 'revoked';
  enrollmentDate?: Date;
  notes?: string;
}

// =============================================================================
// Conversation Guide Types
// =============================================================================

export interface ConversationGuide {
  id: string;
  name: string;
  description: string;
  targetAudience: 'patient' | 'family' | 'both';
  estimatedTime: string;
  sections: ConversationSection[];
}

export interface ConversationSection {
  title: string;
  purpose: string;
  questions: string[];
  tips: string[];
  possibleResponses?: string[];
  followUpActions?: string[];
}

// =============================================================================
// Sample Conversation Guides
// =============================================================================

const SERIOUS_ILLNESS_CONVERSATION_GUIDE: ConversationGuide = {
  id: 'sicg',
  name: 'Serious Illness Conversation Guide',
  description: 'Framework for discussing serious illness, prognosis, and goals of care',
  targetAudience: 'patient',
  estimatedTime: '30-45 minutes',
  sections: [
    {
      title: 'Set up the Conversation',
      purpose: 'Prepare patient and establish rapport',
      questions: [
        'I\'d like to talk about what is ahead with your illness and do some thinking in advance about what is important to you.',
        'Would it be okay to talk about this now?',
        'Would you like anyone else here for this conversation?',
      ],
      tips: [
        'Choose a quiet, private setting',
        'Ensure adequate time without interruptions',
        'Have tissues available',
      ],
    },
    {
      title: 'Assess Understanding and Preferences',
      purpose: 'Understand patient\'s current knowledge and information preferences',
      questions: [
        'What is your understanding of where you are with your illness?',
        'How much information about what is likely to be ahead would you like from me?',
      ],
      tips: [
        'Listen more than you speak',
        'Validate emotions',
        'Respect information preferences',
      ],
    },
    {
      title: 'Share Prognosis',
      purpose: 'Provide honest information at appropriate level',
      questions: [
        'I wish we were not in this situation, but I am worried that time may be short...',
        'I want to share with you my understanding of where things are...',
      ],
      tips: [
        'Use "I wish..." or "I worry..." statements',
        'Allow silence for processing',
        'Check understanding',
      ],
    },
    {
      title: 'Explore Key Topics',
      purpose: 'Understand values, goals, fears, and sources of strength',
      questions: [
        'What are your most important goals if your health situation worsens?',
        'What are you most afraid of?',
        'What gives you strength as you think about the future?',
        'What abilities are so critical to your life that you can\'t imagine living without them?',
      ],
      tips: [
        'Explore each answer deeply',
        'Reflect back what you hear',
        'Document key values and goals',
      ],
    },
    {
      title: 'Close the Conversation',
      purpose: 'Summarize and plan next steps',
      questions: [
        'I\'ve heard you say that [summarize key points]. Did I get that right?',
        'How would you like to share this with your family?',
        'Would it be helpful to schedule a family meeting?',
      ],
      tips: [
        'Summarize key themes',
        'Offer continued support',
        'Schedule follow-up',
        'Document the conversation',
      ],
    },
  ],
};

const FAMILY_MEETING_GUIDE: ConversationGuide = {
  id: 'fmg',
  name: 'Family Meeting Guide',
  description: 'Framework for conducting family meetings about goals of care',
  targetAudience: 'family',
  estimatedTime: '45-60 minutes',
  sections: [
    {
      title: 'Opening',
      purpose: 'Set the stage and understand attendees',
      questions: [
        'Thank you all for being here. We\'re here today to talk about [patient\'s] care.',
        'Can each person introduce themselves and their relationship?',
        'What questions or concerns are most on your mind today?',
      ],
      tips: [
        'Have all key family members present',
        'Clarify role of each person in decision-making',
        'Set ground rules for respectful discussion',
      ],
    },
    {
      title: 'Medical Update',
      purpose: 'Share current medical situation',
      questions: [
        'Let me share where we are medically...',
        'What questions do you have about what I\'ve shared?',
      ],
      tips: [
        'Use simple, clear language',
        'Avoid medical jargon',
        'Check understanding frequently',
      ],
    },
    {
      title: 'Discuss Goals',
      purpose: 'Align around patient\'s wishes',
      questions: [
        'What do you think [patient] would say if they could speak for themselves?',
        'What was most important to [patient] in their life?',
        'What would [patient] consider a fate worse than death?',
      ],
      tips: [
        'Focus on patient\'s values, not family preferences',
        'Acknowledge disagreements respectfully',
        'Remind that goal is honoring patient\'s wishes',
      ],
    },
    {
      title: 'Develop Plan',
      purpose: 'Create care plan aligned with goals',
      questions: [
        'Given what we know about [patient\'s] wishes, what care plan makes the most sense?',
        'What support do you need to carry out this plan?',
      ],
      tips: [
        'Connect plan to patient values',
        'Address family needs for support',
        'Be clear about what will and won\'t be done',
      ],
    },
    {
      title: 'Closing',
      purpose: 'Summarize decisions and next steps',
      questions: [
        'To summarize what we\'ve decided today...',
        'What questions do you still have?',
        'How can we best support you in the coming days?',
      ],
      tips: [
        'Provide written summary if possible',
        'Schedule follow-up',
        'Offer bereavement support resources',
      ],
    },
  ],
};

// =============================================================================
// End-of-Life Service Class
// =============================================================================

export class EndOfLifeService extends EventEmitter {
  private advanceCarePlans: Map<string, AdvanceCarePlan> = new Map();
  private palliativeConsults: Map<string, PalliativeCareConsult[]> = new Map();
  private symptomAssessments: Map<string, SymptomAssessment[]> = new Map();
  private hospiceReferrals: Map<string, HospiceReferral> = new Map();
  private conversationGuides: Map<string, ConversationGuide> = new Map();

  constructor() {
    super();
    this.conversationGuides.set('sicg', SERIOUS_ILLNESS_CONVERSATION_GUIDE);
    this.conversationGuides.set('fmg', FAMILY_MEETING_GUIDE);
  }

  // ===========================================================================
  // Advance Care Plan Management
  // ===========================================================================

  createAdvanceCarePlan(
    patientId: string,
    initialData?: Partial<AdvanceCarePlan>
  ): AdvanceCarePlan {
    const id = `acp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const plan: AdvanceCarePlan = {
      id,
      patientId,
      status: 'draft',
      createdDate: now,
      lastUpdatedDate: now,
      lastReviewedDate: now,
      goalsOfCare: {
        id: `goc_${Date.now()}`,
        documentedDate: now,
        documentedBy: '',
        primaryGoal: 'uncertain',
        secondaryGoals: [],
        qualityOfLifePriorities: [],
        treatmentPreferences: [],
        prognosticAwareness: {
          understandsPrognosis: false,
          discussedWith: [],
        },
        decisionMakingCapacity: {
          hasCapacity: true,
          assessmentDate: now,
          assessedBy: '',
        },
        informationPreferences: {
          wantsFullInformation: true,
          informationLevel: 'full-details',
          whoToInform: [],
          communicationPreferences: '',
        },
      },
      documentLocations: [],
      conversations: [],
      preferences: {
        placeOfDeath: 'undecided',
        whoPresent: [],
      },
      familyAwareness: {
        familyInformed: false,
        familyAgreement: 'not-discussed',
      },
      ...initialData,
    };

    this.advanceCarePlans.set(patientId, plan);
    this.emit('advanceCarePlanCreated', plan);

    return plan;
  }

  getAdvanceCarePlan(patientId: string): AdvanceCarePlan | undefined {
    return this.advanceCarePlans.get(patientId);
  }

  updateGoalsOfCare(
    patientId: string,
    goals: Partial<GoalsOfCare>,
    documentedBy: string
  ): GoalsOfCare | null {
    const plan = this.advanceCarePlans.get(patientId);
    if (!plan) return null;

    plan.goalsOfCare = {
      ...plan.goalsOfCare,
      ...goals,
      documentedDate: new Date(),
      documentedBy,
    };
    plan.lastUpdatedDate = new Date();

    this.emit('goalsOfCareUpdated', { patientId, goalsOfCare: plan.goalsOfCare });

    return plan.goalsOfCare;
  }

  recordGoalsConversation(
    patientId: string,
    conversation: Omit<GoalsConversation, 'id'>
  ): GoalsConversation {
    const plan = this.advanceCarePlans.get(patientId);
    if (!plan) {
      this.createAdvanceCarePlan(patientId);
    }

    const updatedPlan = this.advanceCarePlans.get(patientId)!;

    const fullConversation: GoalsConversation = {
      ...conversation,
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };

    updatedPlan.conversations.push(fullConversation);
    updatedPlan.lastUpdatedDate = new Date();

    this.emit('goalsConversationRecorded', { patientId, conversation: fullConversation });

    return fullConversation;
  }

  // ===========================================================================
  // Advance Directive Management
  // ===========================================================================

  addAdvanceDirective(
    patientId: string,
    directive: AdvanceDirective
  ): void {
    const plan = this.advanceCarePlans.get(patientId);
    if (!plan) {
      this.createAdvanceCarePlan(patientId);
    }

    const updatedPlan = this.advanceCarePlans.get(patientId)!;
    updatedPlan.advanceDirective = directive;
    updatedPlan.lastUpdatedDate = new Date();

    this.emit('advanceDirectiveAdded', { patientId, directive });
  }

  addPOLSTForm(patientId: string, polst: POLSTForm): void {
    const plan = this.advanceCarePlans.get(patientId);
    if (!plan) {
      this.createAdvanceCarePlan(patientId);
    }

    const updatedPlan = this.advanceCarePlans.get(patientId)!;
    updatedPlan.polstForm = polst;
    updatedPlan.lastUpdatedDate = new Date();

    this.emit('polstFormAdded', { patientId, polst });
  }

  // ===========================================================================
  // Healthcare Proxy Management
  // ===========================================================================

  addHealthcareProxy(patientId: string, proxy: HealthcareProxy): void {
    const plan = this.advanceCarePlans.get(patientId);
    if (!plan) {
      this.createAdvanceCarePlan(patientId);
    }

    const updatedPlan = this.advanceCarePlans.get(patientId)!;
    updatedPlan.healthcareProxy = proxy;
    updatedPlan.lastUpdatedDate = new Date();

    this.emit('healthcareProxyAdded', { patientId, proxy });
  }

  // ===========================================================================
  // Palliative Care
  // ===========================================================================

  requestPalliativeConsult(
    patientId: string,
    consult: Omit<PalliativeCareConsult, 'id' | 'status'>
  ): PalliativeCareConsult {
    const fullConsult: PalliativeCareConsult = {
      ...consult,
      id: `pc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      status: 'requested',
    };

    const consults = this.palliativeConsults.get(patientId) || [];
    consults.push(fullConsult);
    this.palliativeConsults.set(patientId, consults);

    this.emit('palliativeConsultRequested', fullConsult);

    return fullConsult;
  }

  recordSymptomAssessment(
    patientId: string,
    assessment: Omit<SymptomAssessment, 'id'>
  ): SymptomAssessment {
    const fullAssessment: SymptomAssessment = {
      ...assessment,
      id: `sa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };

    const assessments = this.symptomAssessments.get(patientId) || [];
    assessments.push(fullAssessment);
    this.symptomAssessments.set(patientId, assessments);

    // Check for severe symptoms requiring intervention
    const severeSymptoms = fullAssessment.symptoms.filter(s => s.severity >= 7);
    if (severeSymptoms.length > 0) {
      this.emit('severeSymptomAlert', { patientId, assessment: fullAssessment, severeSymptoms });
    }

    return fullAssessment;
  }

  getSymptomTrends(
    patientId: string,
    symptom: string,
    periodDays: number = 30
  ): { date: Date; severity: number }[] {
    const assessments = this.symptomAssessments.get(patientId) || [];
    const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    return assessments
      .filter(a => a.assessmentDate >= cutoff)
      .map(a => {
        const symptomRating = a.symptoms.find(s => s.symptom.toLowerCase() === symptom.toLowerCase());
        return {
          date: a.assessmentDate,
          severity: symptomRating?.severity || 0,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // ===========================================================================
  // Hospice
  // ===========================================================================

  assessHospiceEligibility(
    patientId: string,
    assessment: Omit<HospiceEligibility, 'patientId'>
  ): HospiceEligibility {
    const fullAssessment: HospiceEligibility = {
      ...assessment,
      patientId,
    };

    this.emit('hospiceEligibilityAssessed', fullAssessment);

    if (fullAssessment.eligibleForHospice) {
      this.emit('hospiceEligible', fullAssessment);
    }

    return fullAssessment;
  }

  createHospiceReferral(
    referral: Omit<HospiceReferral, 'id' | 'status'>
  ): HospiceReferral {
    const fullReferral: HospiceReferral = {
      ...referral,
      id: `hr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      status: 'pending',
    };

    this.hospiceReferrals.set(referral.patientId, fullReferral);
    this.emit('hospiceReferralCreated', fullReferral);

    return fullReferral;
  }

  // ===========================================================================
  // Conversation Guides
  // ===========================================================================

  getConversationGuide(guideId: string): ConversationGuide | undefined {
    return this.conversationGuides.get(guideId);
  }

  getAvailableGuides(): ConversationGuide[] {
    return Array.from(this.conversationGuides.values());
  }

  // ===========================================================================
  // Document Management
  // ===========================================================================

  addDocumentLocation(
    patientId: string,
    location: DocumentLocation
  ): void {
    const plan = this.advanceCarePlans.get(patientId);
    if (!plan) {
      this.createAdvanceCarePlan(patientId);
    }

    const updatedPlan = this.advanceCarePlans.get(patientId)!;
    updatedPlan.documentLocations.push(location);
    updatedPlan.lastUpdatedDate = new Date();
  }

  getAdvanceCarePlanSummary(patientId: string): {
    hasAdvanceDirective: boolean;
    hasHealthcareProxy: boolean;
    hasPOLST: boolean;
    hasGoalsOfCare: boolean;
    lastReviewDate?: Date;
    primaryGoal?: PrimaryGoal;
    cprPreference?: string;
    documentLocations: string[];
    missingDocuments: string[];
    recommendations: string[];
  } | null {
    const plan = this.advanceCarePlans.get(patientId);
    if (!plan) {
      return null;
    }

    const missingDocuments: string[] = [];
    const recommendations: string[] = [];

    if (!plan.advanceDirective) {
      missingDocuments.push('Advance Directive');
      recommendations.push('Complete advance directive documentation');
    }

    if (!plan.healthcareProxy) {
      missingDocuments.push('Healthcare Proxy');
      recommendations.push('Designate healthcare proxy');
    }

    if (plan.goalsOfCare.primaryGoal === 'uncertain') {
      recommendations.push('Clarify primary goals of care');
    }

    const lastReview = plan.lastReviewedDate;
    const monthsSinceReview = lastReview
      ? (Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24 * 30)
      : Infinity;

    if (monthsSinceReview > 12) {
      recommendations.push('Annual review of advance care plan recommended');
    }

    return {
      hasAdvanceDirective: !!plan.advanceDirective,
      hasHealthcareProxy: !!plan.healthcareProxy,
      hasPOLST: !!plan.polstForm,
      hasGoalsOfCare: plan.goalsOfCare.primaryGoal !== 'uncertain',
      lastReviewDate: plan.lastReviewedDate,
      primaryGoal: plan.goalsOfCare.primaryGoal,
      cprPreference: plan.advanceDirective?.keyProvisions.lifeSustainingTreatment.cprPreference,
      documentLocations: plan.documentLocations.map(d => `${d.documentType}: ${d.location}`),
      missingDocuments,
      recommendations,
    };
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  getPopulationMetrics(): {
    totalPlans: number;
    completePlans: number;
    goalsDocumented: number;
    hospiceReferrals: number;
    palliativeConsults: number;
    commonPrimaryGoals: { goal: PrimaryGoal; count: number }[];
  } {
    const plans = Array.from(this.advanceCarePlans.values());
    const consults = Array.from(this.palliativeConsults.values()).flat();
    const referrals = Array.from(this.hospiceReferrals.values());

    const goalCounts: Record<PrimaryGoal, number> = {
      'cure-focused': 0,
      'life-prolongation': 0,
      'function-preservation': 0,
      'comfort-focused': 0,
      'uncertain': 0,
    };

    for (const plan of plans) {
      goalCounts[plan.goalsOfCare.primaryGoal]++;
    }

    return {
      totalPlans: plans.length,
      completePlans: plans.filter(p => 
        p.advanceDirective && p.healthcareProxy && p.goalsOfCare.primaryGoal !== 'uncertain'
      ).length,
      goalsDocumented: plans.filter(p => p.goalsOfCare.primaryGoal !== 'uncertain').length,
      hospiceReferrals: referrals.length,
      palliativeConsults: consults.length,
      commonPrimaryGoals: Object.entries(goalCounts)
        .map(([goal, count]) => ({ goal: goal as PrimaryGoal, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}

// Singleton instance
export const endOfLifeService = new EndOfLifeService();
export default endOfLifeService;
