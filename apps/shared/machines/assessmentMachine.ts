// apps/shared/machines/assessmentMachine.ts
// XState Machine for COMPASS Assessment Flow
// This machine orchestrates the patient symptom assessment interview

import { createMachine, assign } from 'xstate';
import type { 
  UrgencyLevel, 
  HistoryOfPresentIllness,
  ClinicalData,
  AssessmentPhase 
} from '../types';

// ================================
// CONTEXT TYPES
// ================================

export interface RedFlag {
  id: string;
  name: string;
  description: string;
  severity: 'warning' | 'critical';
  requiresEmergency?: boolean;
  recommendation?: string;
  triggeredBy?: string;
}

export interface AssessmentContext {
  sessionId: string;
  patientId: string;
  patientName: string;
  chiefComplaint: string;
  currentQuestion: string;
  questionHistory: string[];
  userResponses: Record<string, string | number | string[]>;
  hpiData: Partial<HistoryOfPresentIllness>;
  detectedRedFlags: RedFlag[];
  urgencyScore: number;
  urgencyLevel: UrgencyLevel;
  userLocation: { latitude: number; longitude: number; accuracy?: number } | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

// ================================
// EVENT TYPES
// ================================

export type AssessmentEvent =
  | { type: 'START'; patientId?: string; patientName?: string }
  | { type: 'PROVIDE_CHIEF_COMPLAINT'; value: string }
  | { type: 'PROVIDE_ONSET'; value: string }
  | { type: 'PROVIDE_LOCATION'; value: string }
  | { type: 'PROVIDE_SEVERITY'; value: number }
  | { type: 'PROVIDE_QUALITY'; value: string }
  | { type: 'PROVIDE_ASSOCIATED_SYMPTOMS'; value: string[] }
  | { type: 'PROVIDE_AGGRAVATING_FACTORS'; value: string[] }
  | { type: 'PROVIDE_RELIEVING_FACTORS'; value: string[] }
  | { type: 'PROVIDE_MEDICATIONS'; value: string[] }
  | { type: 'PROVIDE_ALLERGIES'; value: string[] }
  | { type: 'PROVIDE_MEDICAL_HISTORY'; value: string[] }
  | { type: 'PROVIDE_ADDITIONAL_INFO'; value: string }
  | { type: 'YES' }
  | { type: 'NO' }
  | { type: 'SKIP' }
  | { type: 'BACK' }
  | { type: 'TRIGGER_EMERGENCY' }
  | { type: 'DISMISS_EMERGENCY' }
  | { type: 'SUBMIT' }
  | { type: 'EDIT' }
  | { type: 'COMPLETE' }
  | { type: 'RETRY' }
  | { type: 'ERROR'; message: string };

// ================================
// RED FLAG DEFINITIONS
// ================================

const RED_FLAG_RULES: Array<{
  id: string;
  name: string;
  description: string;
  severity: 'warning' | 'critical';
  requiresEmergency?: boolean;
  recommendation?: string;
  conditions: (ctx: AssessmentContext) => boolean;
}> = [
  {
    id: 'rf_thunderclap',
    name: 'Thunderclap Headache',
    description: 'Sudden severe headache reaching maximum intensity within seconds',
    severity: 'critical',
    requiresEmergency: true,
    recommendation: 'Immediate evaluation for subarachnoid hemorrhage - CT head, LP if CT negative',
    conditions: (ctx) => {
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      const onset = (ctx.userResponses.onset?.toString() || '').toLowerCase();
      return (
        complaint.includes('headache') &&
        (complaint.includes('worst') ||
          complaint.includes('sudden') ||
          complaint.includes('thunderclap') ||
          onset.includes('sudden') ||
          onset.includes('seconds'))
      );
    },
  },
  {
    id: 'rf_worst_headache',
    name: 'Worst Headache of Life',
    description: 'Patient describes this as the worst headache they have ever experienced',
    severity: 'critical',
    requiresEmergency: true,
    recommendation: 'Rule out SAH - emergent neuroimaging required',
    conditions: (ctx) => {
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      return complaint.includes('worst') && complaint.includes('headache');
    },
  },
  {
    id: 'rf_chest_pain_exertion',
    name: 'Exertional Chest Pain',
    description: 'Chest pain triggered or worsened by physical activity',
    severity: 'critical',
    requiresEmergency: true,
    recommendation: 'Evaluate for ACS - ECG, troponins, cardiology consult',
    conditions: (ctx) => {
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      const aggravating = (ctx.userResponses.aggravatingFactors || []).join(' ').toLowerCase();
      return (
        (complaint.includes('chest') || complaint.includes('heart')) &&
        (complaint.includes('exertion') ||
          aggravating.includes('exertion') ||
          aggravating.includes('exercise') ||
          aggravating.includes('walking') ||
          aggravating.includes('stairs'))
      );
    },
  },
  {
    id: 'rf_chest_pain_radiation',
    name: 'Chest Pain with Radiation',
    description: 'Chest pain radiating to arm, jaw, or back',
    severity: 'critical',
    requiresEmergency: true,
    recommendation: 'High suspicion for ACS - activate chest pain protocol',
    conditions: (ctx) => {
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      const location = (ctx.userResponses.location?.toString() || '').toLowerCase();
      return (
        complaint.includes('chest') &&
        (location.includes('arm') || location.includes('jaw') || 
         location.includes('back') || location.includes('radiat'))
      );
    },
  },
  {
    id: 'rf_severe_pain',
    name: 'Severe Pain',
    description: 'Pain intensity rated 8 or higher on 10-point scale',
    severity: 'warning',
    conditions: (ctx) => {
      const severity = ctx.userResponses.severity as number;
      return severity >= 8;
    },
  },
  {
    id: 'rf_altered_mental',
    name: 'Altered Mental Status',
    description: 'Changes in consciousness, confusion, or difficulty thinking clearly',
    severity: 'critical',
    requiresEmergency: true,
    recommendation: 'Immediate neurological evaluation - consider stroke, metabolic, toxic causes',
    conditions: (ctx) => {
      const symptoms = (ctx.userResponses.associatedSymptoms || []).join(' ').toLowerCase();
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      return (
        symptoms.includes('confusion') ||
        symptoms.includes('disoriented') ||
        symptoms.includes('can\'t think') ||
        complaint.includes('confusion') ||
        complaint.includes('altered')
      );
    },
  },
  {
    id: 'rf_shortness_breath_sudden',
    name: 'Acute Shortness of Breath',
    description: 'Sudden onset difficulty breathing',
    severity: 'critical',
    requiresEmergency: true,
    recommendation: 'Evaluate for PE, MI, pneumothorax, anaphylaxis',
    conditions: (ctx) => {
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      const onset = (ctx.userResponses.onset?.toString() || '').toLowerCase();
      return (
        (complaint.includes('breath') || complaint.includes('breathing') || complaint.includes('dyspnea')) &&
        (onset.includes('sudden') || onset.includes('acute') || onset.includes('minutes'))
      );
    },
  },
  {
    id: 'rf_vision_loss',
    name: 'Sudden Vision Changes',
    description: 'Acute vision loss or significant visual disturbance',
    severity: 'critical',
    requiresEmergency: true,
    recommendation: 'Urgent ophthalmology and neurology evaluation',
    conditions: (ctx) => {
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      const symptoms = (ctx.userResponses.associatedSymptoms || []).join(' ').toLowerCase();
      return (
        complaint.includes('vision') || 
        complaint.includes('blind') ||
        symptoms.includes('vision') ||
        symptoms.includes('seeing spots') ||
        symptoms.includes('can\'t see')
      );
    },
  },
  {
    id: 'rf_weakness_one_side',
    name: 'Unilateral Weakness',
    description: 'Weakness or numbness on one side of the body',
    severity: 'critical',
    requiresEmergency: true,
    recommendation: 'Stroke alert - immediate CT/MRI, neurology consult',
    conditions: (ctx) => {
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      const symptoms = (ctx.userResponses.associatedSymptoms || []).join(' ').toLowerCase();
      return (
        (complaint.includes('weak') || symptoms.includes('weak') || symptoms.includes('numb')) &&
        (complaint.includes('one side') || symptoms.includes('one side') || 
         complaint.includes('left') || complaint.includes('right'))
      );
    },
  },
];

// ================================
// HELPER FUNCTIONS
// ================================

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const checkForRedFlags = (ctx: AssessmentContext): RedFlag[] => {
  const detected: RedFlag[] = [];
  
  for (const rule of RED_FLAG_RULES) {
    if (rule.conditions(ctx)) {
      detected.push({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        requiresEmergency: rule.requiresEmergency,
        recommendation: rule.recommendation,
      });
    }
  }
  
  return detected;
};

const calculateUrgency = (ctx: AssessmentContext): { score: number; level: UrgencyLevel } => {
  let score = 0;
  
  // Severity contribution (0-50)
  const severity = ctx.userResponses.severity as number;
  if (severity) {
    score += severity * 5;
  }
  
  // Red flag contribution
  ctx.detectedRedFlags.forEach(rf => {
    score += rf.severity === 'critical' ? 30 : 15;
  });
  
  // Cap at 100
  score = Math.min(100, score);
  
  // Determine level - map to existing UrgencyLevel type
  let level: UrgencyLevel = 'standard';
  if (score >= 80 || ctx.detectedRedFlags.some(rf => rf.requiresEmergency)) {
    level = 'high';
  } else if (score >= 50) {
    level = 'moderate';
  }
  
  return { score, level };
};

// ================================
// INITIAL CONTEXT
// ================================

const createInitialContext = (): AssessmentContext => ({
  sessionId: '',
  patientId: '',
  patientName: '',
  chiefComplaint: '',
  currentQuestion: '',
  questionHistory: [],
  userResponses: {},
  hpiData: {},
  detectedRedFlags: [],
  urgencyScore: 0,
  urgencyLevel: 'standard',
  userLocation: null,
  error: null,
  startedAt: '',
  completedAt: null,
});

// ================================
// STATE MACHINE
// ================================

export const assessmentMachine = createMachine({
  id: 'compassAssessment',
  initial: 'idle',
  context: createInitialContext(),
  states: {
    idle: {
      on: {
        START: {
          target: 'welcome',
          actions: assign({
            sessionId: () => generateSessionId(),
            patientId: (_, event) => event.patientId || '',
            patientName: (_, event) => event.patientName || '',
            startedAt: () => new Date().toISOString(),
          }),
        },
      },
    },
    
    welcome: {
      entry: assign({
        currentQuestion: () => 'Hello! I\'m COMPASS, your virtual health assistant. I\'ll help gather information about your symptoms to share with your healthcare provider. What brings you in today?',
      }),
      on: {
        PROVIDE_CHIEF_COMPLAINT: {
          target: 'askingOnset',
          actions: [
            assign({
              chiefComplaint: (_, event) => event.value,
              userResponses: (ctx, event) => ({
                ...ctx.userResponses,
                chiefComplaint: event.value,
              }),
            }),
            assign((ctx) => ({
              detectedRedFlags: checkForRedFlags(ctx),
            })),
          ],
        },
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingOnset: {
      entry: assign({
        currentQuestion: () => 'When did this start? Please be as specific as possible.',
        questionHistory: (ctx) => [...ctx.questionHistory, 'chiefComplaint'],
      }),
      on: {
        PROVIDE_ONSET: {
          target: 'askingLocation',
          actions: [
            assign({
              userResponses: (ctx, event) => ({
                ...ctx.userResponses,
                onset: event.value,
              }),
              hpiData: (ctx, event) => ({
                ...ctx.hpiData,
                onset: event.value,
              }),
            }),
            assign((ctx) => ({
              detectedRedFlags: checkForRedFlags(ctx),
            })),
          ],
        },
        BACK: 'welcome',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingLocation: {
      entry: assign({
        currentQuestion: () => 'Where exactly are you feeling this? Please describe the location.',
        questionHistory: (ctx) => [...ctx.questionHistory, 'onset'],
      }),
      on: {
        PROVIDE_LOCATION: {
          target: 'askingSeverity',
          actions: assign({
            userResponses: (ctx, event) => ({
              ...ctx.userResponses,
              location: event.value,
            }),
            hpiData: (ctx, event) => ({
              ...ctx.hpiData,
              location: event.value,
            }),
          }),
        },
        SKIP: 'askingSeverity',
        BACK: 'askingOnset',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingSeverity: {
      entry: assign({
        currentQuestion: () => 'On a scale of 0 to 10, how severe is this? (0 = no discomfort, 10 = worst imaginable)',
        questionHistory: (ctx) => [...ctx.questionHistory, 'location'],
      }),
      on: {
        PROVIDE_SEVERITY: {
          target: 'askingQuality',
          actions: [
            assign({
              userResponses: (ctx, event) => ({
                ...ctx.userResponses,
                severity: event.value,
              }),
              hpiData: (ctx, event) => ({
                ...ctx.hpiData,
                severity: event.value,
              }),
            }),
            assign((ctx) => {
              const flags = checkForRedFlags(ctx);
              const { score, level } = calculateUrgency({ ...ctx, detectedRedFlags: flags });
              return {
                detectedRedFlags: flags,
                urgencyScore: score,
                urgencyLevel: level,
              };
            }),
          ],
        },
        BACK: 'askingLocation',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingQuality: {
      entry: assign({
        currentQuestion: () => 'How would you describe the sensation? (e.g., sharp, dull, throbbing, burning, pressure, aching)',
        questionHistory: (ctx) => [...ctx.questionHistory, 'severity'],
      }),
      on: {
        PROVIDE_QUALITY: {
          target: 'askingAggravating',
          actions: assign({
            userResponses: (ctx, event) => ({
              ...ctx.userResponses,
              quality: event.value,
            }),
            hpiData: (ctx, event) => ({
              ...ctx.hpiData,
              character: event.value,
            }),
          }),
        },
        SKIP: 'askingAggravating',
        BACK: 'askingSeverity',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingAggravating: {
      entry: assign({
        currentQuestion: () => 'What makes it worse? (e.g., movement, eating, stress, certain positions)',
        questionHistory: (ctx) => [...ctx.questionHistory, 'quality'],
      }),
      on: {
        PROVIDE_AGGRAVATING_FACTORS: {
          target: 'askingRelieving',
          actions: [
            assign({
              userResponses: (ctx, event) => ({
                ...ctx.userResponses,
                aggravatingFactors: event.value,
              }),
              hpiData: (ctx, event) => ({
                ...ctx.hpiData,
                aggravatingFactors: event.value,
              }),
            }),
            assign((ctx) => ({
              detectedRedFlags: checkForRedFlags(ctx),
            })),
          ],
        },
        NO: 'askingRelieving',
        SKIP: 'askingRelieving',
        BACK: 'askingQuality',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingRelieving: {
      entry: assign({
        currentQuestion: () => 'What makes it better? (e.g., rest, medication, ice, heat)',
        questionHistory: (ctx) => [...ctx.questionHistory, 'aggravatingFactors'],
      }),
      on: {
        PROVIDE_RELIEVING_FACTORS: {
          target: 'askingAssociatedSymptoms',
          actions: assign({
            userResponses: (ctx, event) => ({
              ...ctx.userResponses,
              relievingFactors: event.value,
            }),
            hpiData: (ctx, event) => ({
              ...ctx.hpiData,
              relievingFactors: event.value,
            }),
          }),
        },
        NO: 'askingAssociatedSymptoms',
        SKIP: 'askingAssociatedSymptoms',
        BACK: 'askingAggravating',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingAssociatedSymptoms: {
      entry: assign({
        currentQuestion: () => 'Are you experiencing any other symptoms? (e.g., nausea, dizziness, fever, fatigue, shortness of breath)',
        questionHistory: (ctx) => [...ctx.questionHistory, 'relievingFactors'],
      }),
      on: {
        PROVIDE_ASSOCIATED_SYMPTOMS: {
          target: 'askingMedications',
          actions: [
            assign({
              userResponses: (ctx, event) => ({
                ...ctx.userResponses,
                associatedSymptoms: event.value,
              }),
              hpiData: (ctx, event) => ({
                ...ctx.hpiData,
                associatedSymptoms: event.value,
              }),
            }),
            assign((ctx) => ({
              detectedRedFlags: checkForRedFlags(ctx),
            })),
          ],
        },
        NO: {
          target: 'askingMedications',
          actions: assign({
            userResponses: (ctx) => ({
              ...ctx.userResponses,
              associatedSymptoms: [],
            }),
          }),
        },
        BACK: 'askingRelieving',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingMedications: {
      entry: assign({
        currentQuestion: () => 'What medications are you currently taking? Please list all prescription and over-the-counter medications.',
        questionHistory: (ctx) => [...ctx.questionHistory, 'associatedSymptoms'],
      }),
      on: {
        PROVIDE_MEDICATIONS: {
          target: 'askingAllergies',
          actions: assign({
            userResponses: (ctx, event) => ({
              ...ctx.userResponses,
              medications: event.value,
            }),
          }),
        },
        NO: {
          target: 'askingAllergies',
          actions: assign({
            userResponses: (ctx) => ({
              ...ctx.userResponses,
              medications: [],
            }),
          }),
        },
        BACK: 'askingAssociatedSymptoms',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingAllergies: {
      entry: assign({
        currentQuestion: () => 'Do you have any medication allergies? If yes, please list them and any reactions you\'ve had.',
        questionHistory: (ctx) => [...ctx.questionHistory, 'medications'],
      }),
      on: {
        PROVIDE_ALLERGIES: {
          target: 'askingMedicalHistory',
          actions: assign({
            userResponses: (ctx, event) => ({
              ...ctx.userResponses,
              allergies: event.value,
            }),
          }),
        },
        NO: {
          target: 'askingMedicalHistory',
          actions: assign({
            userResponses: (ctx) => ({
              ...ctx.userResponses,
              allergies: ['NKDA'],
            }),
          }),
        },
        BACK: 'askingMedications',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingMedicalHistory: {
      entry: assign({
        currentQuestion: () => 'Do you have any significant medical conditions or past surgeries we should know about?',
        questionHistory: (ctx) => [...ctx.questionHistory, 'allergies'],
      }),
      on: {
        PROVIDE_MEDICAL_HISTORY: {
          target: 'askingAdditionalInfo',
          actions: assign({
            userResponses: (ctx, event) => ({
              ...ctx.userResponses,
              medicalHistory: event.value,
            }),
          }),
        },
        NO: {
          target: 'askingAdditionalInfo',
          actions: assign({
            userResponses: (ctx) => ({
              ...ctx.userResponses,
              medicalHistory: [],
            }),
          }),
        },
        BACK: 'askingAllergies',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingAdditionalInfo: {
      entry: assign({
        currentQuestion: () => 'Is there anything else you\'d like to tell your healthcare provider about your symptoms or concerns?',
        questionHistory: (ctx) => [...ctx.questionHistory, 'medicalHistory'],
      }),
      on: {
        PROVIDE_ADDITIONAL_INFO: {
          target: 'review',
          actions: assign({
            userResponses: (ctx, event) => ({
              ...ctx.userResponses,
              additionalInfo: event.value,
            }),
          }),
        },
        SKIP: 'review',
        NO: 'review',
        BACK: 'askingMedicalHistory',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    review: {
      entry: assign({
        currentQuestion: () => 'Please review your information below. You can edit any section or submit when ready.',
      }),
      on: {
        EDIT: 'welcome',
        SUBMIT: 'submitting',
        BACK: 'askingAdditionalInfo',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    submitting: {
      invoke: {
        id: 'submitAssessment',
        src: (ctx) => {
          // This would be replaced with actual API call via CompassBridge
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              // Simulate API call
              if (Math.random() > 0.05) { // 95% success rate
                resolve({ success: true, assessmentId: ctx.sessionId });
              } else {
                reject(new Error('Network error. Please try again.'));
              }
            }, 1500);
          });
        },
        onDone: {
          target: 'complete',
          actions: assign({
            completedAt: () => new Date().toISOString(),
          }),
        },
        onError: {
          target: 'submitError',
          actions: assign({
            error: (_, event) => event.data?.message || 'Failed to submit assessment',
          }),
        },
      },
    },
    
    submitError: {
      entry: assign({
        currentQuestion: (ctx) => `There was an error submitting your assessment: ${ctx.error}. Please try again.`,
      }),
      on: {
        RETRY: 'submitting',
        EDIT: 'review',
      },
    },
    
    complete: {
      entry: assign({
        currentQuestion: () => 'Thank you! Your assessment has been submitted successfully. A healthcare provider will review your information and may follow up with you soon.',
      }),
      type: 'final',
    },
    
    emergency: {
      entry: assign({
        urgencyLevel: () => 'high' as UrgencyLevel,
        urgencyScore: () => 100,
      }),
      on: {
        DISMISS_EMERGENCY: 'review',
      },
    },
  },
});

export default assessmentMachine;
