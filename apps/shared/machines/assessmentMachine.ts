// apps/shared/machines/assessmentMachine.ts
// XState Machine for COMPASS Assessment Flow
// This machine orchestrates the patient symptom assessment interview

import { createMachine, assign } from 'xstate';
import type { 
  UrgencyLevel, 
  HistoryOfPresentIllness,
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

// Events with string values
interface StringValueEvent { 
  type: 'PROVIDE_CHIEF_COMPLAINT' | 'PROVIDE_ONSET' | 'PROVIDE_LOCATION' | 
        'PROVIDE_QUALITY' | 'PROVIDE_ADDITIONAL_INFO'; 
  value: string; 
}

// Events with number values
interface NumberValueEvent { 
  type: 'PROVIDE_SEVERITY'; 
  value: number; 
}

// Events with string array values
interface ArrayValueEvent { 
  type: 'PROVIDE_ASSOCIATED_SYMPTOMS' | 'PROVIDE_AGGRAVATING_FACTORS' | 
        'PROVIDE_RELIEVING_FACTORS' | 'PROVIDE_MEDICATIONS' | 
        'PROVIDE_ALLERGIES' | 'PROVIDE_MEDICAL_HISTORY'; 
  value: string[]; 
}

// Start event
interface StartEvent { 
  type: 'START'; 
  patientId?: string; 
  patientName?: string; 
}

// Error event
interface ErrorEvent { 
  type: 'ERROR'; 
  message: string; 
}

// Simple events with no payload
type SimpleEvent = 
  | { type: 'YES' }
  | { type: 'NO' }
  | { type: 'SKIP' }
  | { type: 'BACK' }
  | { type: 'TRIGGER_EMERGENCY' }
  | { type: 'DISMISS_EMERGENCY' }
  | { type: 'SUBMIT' }
  | { type: 'EDIT' }
  | { type: 'COMPLETE' }
  | { type: 'RETRY' };

export type AssessmentEvent = 
  | StartEvent 
  | StringValueEvent 
  | NumberValueEvent 
  | ArrayValueEvent 
  | ErrorEvent 
  | SimpleEvent;

// Type guards for event discrimination
const hasStringValue = (event: AssessmentEvent): event is StringValueEvent => 
  'value' in event && typeof (event as StringValueEvent).value === 'string';

const hasNumberValue = (event: AssessmentEvent): event is NumberValueEvent => 
  'value' in event && typeof (event as NumberValueEvent).value === 'number';

const hasArrayValue = (event: AssessmentEvent): event is ArrayValueEvent => 
  'value' in event && Array.isArray((event as ArrayValueEvent).value);

const isStartEvent = (event: AssessmentEvent): event is StartEvent => 
  event.type === 'START';

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
      const aggravatingRaw = ctx.userResponses.aggravatingFactors;
      const aggravating = Array.isArray(aggravatingRaw) 
        ? aggravatingRaw.join(' ').toLowerCase() 
        : String(aggravatingRaw || '').toLowerCase();
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
      const symptomsRaw = ctx.userResponses.associatedSymptoms;
      const symptoms = Array.isArray(symptomsRaw)
        ? symptomsRaw.join(' ').toLowerCase()
        : String(symptomsRaw || '').toLowerCase();
      const complaint = (ctx.chiefComplaint || '').toLowerCase();
      return (
        symptoms.includes('confusion') ||
        symptoms.includes('disoriented') ||
        symptoms.includes("can't think") ||
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
      const symptomsRaw = ctx.userResponses.associatedSymptoms;
      const symptoms = Array.isArray(symptomsRaw)
        ? symptomsRaw.join(' ').toLowerCase()
        : String(symptomsRaw || '').toLowerCase();
      return (
        complaint.includes('vision') || 
        complaint.includes('blind') ||
        symptoms.includes('vision') ||
        symptoms.includes('seeing spots') ||
        symptoms.includes("can't see")
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
      const symptomsRaw = ctx.userResponses.associatedSymptoms;
      const symptoms = Array.isArray(symptomsRaw)
        ? symptomsRaw.join(' ').toLowerCase()
        : String(symptomsRaw || '').toLowerCase();
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
// TYPED ASSIGN HELPERS
// ================================

// Helper to safely extract string value from events
const getStringValue = (event: AssessmentEvent): string => {
  if (hasStringValue(event)) return event.value;
  return '';
};

// Helper to safely extract number value from events
const getNumberValue = (event: AssessmentEvent): number => {
  if (hasNumberValue(event)) return event.value;
  return 0;
};

// Helper to safely extract array value from events
const getArrayValue = (event: AssessmentEvent): string[] => {
  if (hasArrayValue(event)) return event.value;
  return [];
};

// ================================
// STATE MACHINE
// ================================

export const assessmentMachine = createMachine<AssessmentContext, AssessmentEvent>({
  id: 'compassAssessment',
  initial: 'idle',
  context: createInitialContext(),
  predictableActionArguments: true,
  states: {
    idle: {
      on: {
        START: {
          target: 'welcome',
          actions: assign((ctx, event) => {
            const startEvent = isStartEvent(event) ? event : { patientId: '', patientName: '' };
            return {
              sessionId: generateSessionId(),
              patientId: startEvent.patientId || '',
              patientName: startEvent.patientName || '',
              startedAt: new Date().toISOString(),
            };
          }),
        },
      },
    },
    
    welcome: {
      entry: assign({
        currentQuestion: () => "Hello! I'm COMPASS, your virtual health assistant. I'll help gather information about your symptoms to share with your healthcare provider. What brings you in today?",
      }),
      on: {
        PROVIDE_CHIEF_COMPLAINT: {
          target: 'askingOnset',
          actions: [
            assign((ctx, event) => {
              const value = getStringValue(event);
              return {
                chiefComplaint: value,
                userResponses: { ...ctx.userResponses, chiefComplaint: value },
              };
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
      entry: assign((ctx) => ({
        currentQuestion: 'When did this start? Please be as specific as possible.',
        questionHistory: [...ctx.questionHistory, 'chiefComplaint'],
      })),
      on: {
        PROVIDE_ONSET: {
          target: 'askingLocation',
          actions: [
            assign((ctx, event) => {
              const value = getStringValue(event);
              return {
                userResponses: { ...ctx.userResponses, onset: value },
                hpiData: { ...ctx.hpiData, onset: value },
              };
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
      entry: assign((ctx) => ({
        currentQuestion: 'Where exactly are you feeling this? Please describe the location.',
        questionHistory: [...ctx.questionHistory, 'onset'],
      })),
      on: {
        PROVIDE_LOCATION: {
          target: 'askingSeverity',
          actions: assign((ctx, event) => {
            const value = getStringValue(event);
            return {
              userResponses: { ...ctx.userResponses, location: value },
              hpiData: { ...ctx.hpiData, location: value },
            };
          }),
        },
        SKIP: 'askingSeverity',
        BACK: 'askingOnset',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingSeverity: {
      entry: assign((ctx) => ({
        currentQuestion: 'On a scale of 0 to 10, how severe is this? (0 = no discomfort, 10 = worst imaginable)',
        questionHistory: [...ctx.questionHistory, 'location'],
      })),
      on: {
        PROVIDE_SEVERITY: {
          target: 'askingQuality',
          actions: [
            assign((ctx, event) => {
              const value = getNumberValue(event);
              return {
                userResponses: { ...ctx.userResponses, severity: value },
                hpiData: { ...ctx.hpiData, severity: value },
              };
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
      entry: assign((ctx) => ({
        currentQuestion: 'How would you describe the sensation? (e.g., sharp, dull, throbbing, burning, pressure, aching)',
        questionHistory: [...ctx.questionHistory, 'severity'],
      })),
      on: {
        PROVIDE_QUALITY: {
          target: 'askingAggravating',
          actions: assign((ctx, event) => {
            const value = getStringValue(event);
            return {
              userResponses: { ...ctx.userResponses, quality: value },
              hpiData: { ...ctx.hpiData, character: value },
            };
          }),
        },
        SKIP: 'askingAggravating',
        BACK: 'askingSeverity',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingAggravating: {
      entry: assign((ctx) => ({
        currentQuestion: 'What makes it worse? (e.g., movement, eating, stress, certain positions)',
        questionHistory: [...ctx.questionHistory, 'quality'],
      })),
      on: {
        PROVIDE_AGGRAVATING_FACTORS: {
          target: 'askingRelieving',
          actions: [
            assign((ctx, event) => {
              const value = getArrayValue(event);
              return {
                userResponses: { ...ctx.userResponses, aggravatingFactors: value },
                hpiData: { ...ctx.hpiData, aggravatingFactors: value },
              };
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
      entry: assign((ctx) => ({
        currentQuestion: 'What makes it better? (e.g., rest, medication, ice, heat)',
        questionHistory: [...ctx.questionHistory, 'aggravatingFactors'],
      })),
      on: {
        PROVIDE_RELIEVING_FACTORS: {
          target: 'askingAssociatedSymptoms',
          actions: assign((ctx, event) => {
            const value = getArrayValue(event);
            return {
              userResponses: { ...ctx.userResponses, relievingFactors: value },
              hpiData: { ...ctx.hpiData, relievingFactors: value },
            };
          }),
        },
        NO: 'askingAssociatedSymptoms',
        SKIP: 'askingAssociatedSymptoms',
        BACK: 'askingAggravating',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingAssociatedSymptoms: {
      entry: assign((ctx) => ({
        currentQuestion: 'Are you experiencing any other symptoms? (e.g., nausea, dizziness, fever, fatigue, shortness of breath)',
        questionHistory: [...ctx.questionHistory, 'relievingFactors'],
      })),
      on: {
        PROVIDE_ASSOCIATED_SYMPTOMS: {
          target: 'askingMedications',
          actions: [
            assign((ctx, event) => {
              const value = getArrayValue(event);
              return {
                userResponses: { ...ctx.userResponses, associatedSymptoms: value },
                hpiData: { ...ctx.hpiData, associatedSymptoms: value },
              };
            }),
            assign((ctx) => ({
              detectedRedFlags: checkForRedFlags(ctx),
            })),
          ],
        },
        NO: {
          target: 'askingMedications',
          actions: assign((ctx) => ({
            userResponses: { ...ctx.userResponses, associatedSymptoms: [] },
          })),
        },
        BACK: 'askingRelieving',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingMedications: {
      entry: assign((ctx) => ({
        currentQuestion: 'What medications are you currently taking? Please list all prescription and over-the-counter medications.',
        questionHistory: [...ctx.questionHistory, 'associatedSymptoms'],
      })),
      on: {
        PROVIDE_MEDICATIONS: {
          target: 'askingAllergies',
          actions: assign((ctx, event) => ({
            userResponses: { ...ctx.userResponses, medications: getArrayValue(event) },
          })),
        },
        NO: {
          target: 'askingAllergies',
          actions: assign((ctx) => ({
            userResponses: { ...ctx.userResponses, medications: [] },
          })),
        },
        BACK: 'askingAssociatedSymptoms',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingAllergies: {
      entry: assign((ctx) => ({
        currentQuestion: "Do you have any medication allergies? If yes, please list them and any reactions you've had.",
        questionHistory: [...ctx.questionHistory, 'medications'],
      })),
      on: {
        PROVIDE_ALLERGIES: {
          target: 'askingMedicalHistory',
          actions: assign((ctx, event) => ({
            userResponses: { ...ctx.userResponses, allergies: getArrayValue(event) },
          })),
        },
        NO: {
          target: 'askingMedicalHistory',
          actions: assign((ctx) => ({
            userResponses: { ...ctx.userResponses, allergies: ['NKDA'] },
          })),
        },
        BACK: 'askingMedications',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingMedicalHistory: {
      entry: assign((ctx) => ({
        currentQuestion: 'Do you have any significant medical conditions or past surgeries we should know about?',
        questionHistory: [...ctx.questionHistory, 'allergies'],
      })),
      on: {
        PROVIDE_MEDICAL_HISTORY: {
          target: 'askingAdditionalInfo',
          actions: assign((ctx, event) => ({
            userResponses: { ...ctx.userResponses, medicalHistory: getArrayValue(event) },
          })),
        },
        NO: {
          target: 'askingAdditionalInfo',
          actions: assign((ctx) => ({
            userResponses: { ...ctx.userResponses, medicalHistory: [] },
          })),
        },
        BACK: 'askingAllergies',
        TRIGGER_EMERGENCY: 'emergency',
      },
    },
    
    askingAdditionalInfo: {
      entry: assign((ctx) => ({
        currentQuestion: "Is there anything else you'd like to tell your healthcare provider about your symptoms or concerns?",
        questionHistory: [...ctx.questionHistory, 'medicalHistory'],
      })),
      on: {
        PROVIDE_ADDITIONAL_INFO: {
          target: 'review',
          actions: assign((ctx, event) => ({
            userResponses: { ...ctx.userResponses, additionalInfo: getStringValue(event) },
          })),
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
          const payload = {
            sessionId: ctx.sessionId,
            patientId: ctx.patientId,
            chiefComplaint: ctx.chiefComplaint,
            symptoms: JSON.stringify(ctx.detectedRedFlags.map(rf => rf.symptom)),
            hpiNarrative: JSON.stringify(ctx.hpiData),
            reviewOfSystems: ctx.userResponses.reviewOfSystems
              ? JSON.stringify(ctx.userResponses.reviewOfSystems)
              : null,
            medications: ctx.userResponses.medications
              ? JSON.stringify(ctx.userResponses.medications)
              : null,
            allergies: ctx.userResponses.allergies
              ? JSON.stringify(ctx.userResponses.allergies)
              : null,
            redFlagsDetected: JSON.stringify(ctx.detectedRedFlags),
            triageLevel: ctx.urgencyLevel === 'high' ? 'EMERGENCY'
              : ctx.urgencyLevel === 'medium' ? 'URGENT'
              : 'ROUTINE',
            conversation: JSON.stringify(ctx.questionHistory),
            completedAt: new Date().toISOString(),
          };

          return fetch('/api/assessments/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).then(async (res) => {
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(errBody.error || `Server error (${res.status})`);
            }
            return res.json();
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
          actions: assign((ctx, event) => ({
            error: (event as any).data?.message || 'Failed to submit assessment',
          })),
        },
      },
    },
    
    submitError: {
      entry: assign((ctx) => ({
        currentQuestion: `There was an error submitting your assessment: ${ctx.error}. Please try again.`,
      })),
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
