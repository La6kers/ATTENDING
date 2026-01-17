// =============================================================================
// ATTENDING AI - COMPASS Assessment XState Machine
// apps/patient-portal/machines/assessmentMachine.ts
//
// Comprehensive state machine for the 18-phase patient assessment flow.
// Handles phase transitions, emergency detection, and provider handoff.
// =============================================================================

import { createMachine, assign } from 'xstate';

// ============================================================================
// Types
// ============================================================================

export type AssessmentPhase =
  | 'welcome'
  | 'demographics'
  | 'chiefComplaint'
  | 'hpiOnset'
  | 'hpiLocation'
  | 'hpiDuration'
  | 'hpiCharacter'
  | 'hpiSeverity'
  | 'hpiTiming'
  | 'hpiContext'
  | 'hpiModifying'
  | 'reviewOfSystems'
  | 'medicalHistory'
  | 'medications'
  | 'allergies'
  | 'socialHistory'
  | 'riskAssessment'
  | 'summary'
  | 'providerHandoff'
  | 'emergency'
  | 'completed';

export type UrgencyLevel = 'critical' | 'emergent' | 'urgent' | 'moderate' | 'routine';

export interface VitalSigns {
  heartRate?: number;
  bloodPressure?: string;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  painLevel?: number;
}

export interface RedFlag {
  id: string;
  symptom: string;
  severity: UrgencyLevel;
  category: string;
  detectedAt: string;
}

export interface HPIData {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: number;
  timing?: string;
  context?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  associatedSymptoms?: string[];
}

export interface MedicationEntry {
  name: string;
  dose?: string;
  frequency?: string;
  route?: string;
}

export interface AllergyEntry {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  phase?: AssessmentPhase;
  quickReplies?: string[];
}

export interface AssessmentContext {
  // Session
  sessionId: string;
  patientId: string;
  patientName: string;
  startTime: string;
  
  // Demographics
  dateOfBirth?: string;
  gender?: string;
  contactPhone?: string;
  
  // Clinical Data
  chiefComplaint: string;
  hpiData: HPIData;
  reviewOfSystems: Record<string, string[]>;
  medicalHistory: string[];
  surgicalHistory: string[];
  medications: MedicationEntry[];
  allergies: AllergyEntry[];
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingSituation?: string;
  };
  familyHistory: string[];
  vitalSigns?: VitalSigns;
  
  // Red Flags & Urgency
  redFlags: RedFlag[];
  urgencyLevel: UrgencyLevel;
  
  // Provider Connection
  assignedProviderId?: string;
  assignedProviderName?: string;
  
  // Progress
  currentPhase: AssessmentPhase;
  phaseHistory: AssessmentPhase[];
  progressPercent: number;
  
  // Emergency
  isEmergency: boolean;
  emergencyType?: string;
  
  // Messages
  messages: ChatMessage[];
  lastUserInput: string;
  lastAIResponse: string;
  
  // Errors
  errorMessage?: string;
}

export type AssessmentEvent =
  | { type: 'ADD_MESSAGE'; message: Omit<ChatMessage, 'id' | 'timestamp'> }
  | { type: 'SUBMIT_HPI_DATA'; field: string; value: any }
  | { type: 'TRIGGER_EMERGENCY'; emergencyType: string }
  | { type: 'DISMISS_EMERGENCY' }
  | { type: 'CALL_911' }
  | { type: 'START'; patientName: string; patientId?: string }
  | { type: 'SUBMIT_DEMOGRAPHICS'; data: { dateOfBirth: string; gender: string; contactPhone?: string } }
  | { type: 'SUBMIT_CHIEF_COMPLAINT'; complaint: string }
  | { type: 'SUBMIT_HPI_ONSET'; onset: string }
  | { type: 'SUBMIT_HPI_LOCATION'; location: string }
  | { type: 'SUBMIT_HPI_DURATION'; duration: string }
  | { type: 'SUBMIT_HPI_CHARACTER'; character: string }
  | { type: 'SUBMIT_HPI_SEVERITY'; severity: number }
  | { type: 'SUBMIT_HPI_TIMING'; timing: string }
  | { type: 'SUBMIT_HPI_CONTEXT'; context: string }
  | { type: 'SUBMIT_HPI_MODIFYING'; aggravating: string[]; relieving: string[] }
  | { type: 'SUBMIT_ROS'; system: string; symptoms: string[] }
  | { type: 'COMPLETE_ROS' }
  | { type: 'SUBMIT_MEDICAL_HISTORY'; conditions: string[] }
  | { type: 'SUBMIT_MEDICATIONS'; medications: MedicationEntry[] }
  | { type: 'SUBMIT_ALLERGIES'; allergies: AllergyEntry[] }
  | { type: 'SUBMIT_SOCIAL_HISTORY'; data: AssessmentContext['socialHistory'] }
  | { type: 'SUBMIT_RISK_ASSESSMENT'; data: any }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SKIP' }
  | { type: 'RED_FLAG_DETECTED'; redFlag: RedFlag }
  | { type: 'EMERGENCY_TRIGGERED'; emergencyType: string }
  | { type: 'EMERGENCY_ACKNOWLEDGED' }
  | { type: 'EMERGENCY_CALL_911' }
  | { type: 'PROVIDER_CONNECTED'; providerId: string; providerName: string }
  | { type: 'COMPLETE' }
  | { type: 'RESET' }
  | { type: 'ERROR'; message: string };

// ============================================================================
// Red Flag Detection Patterns
// ============================================================================

const RED_FLAG_PATTERNS: { keywords: string[]; category: string; severity: UrgencyLevel }[] = [
  {
    keywords: ['chest pain', 'chest pressure', 'crushing chest', 'heart attack'],
    category: 'Cardiovascular',
    severity: 'critical'
  },
  {
    keywords: ['can\'t breathe', 'difficulty breathing', 'shortness of breath', 'gasping'],
    category: 'Respiratory',
    severity: 'critical'
  },
  {
    keywords: ['sudden weakness', 'facial droop', 'slurred speech', 'arm weakness', 'stroke'],
    category: 'Neurological',
    severity: 'critical'
  },
  {
    keywords: ['worst headache', 'thunderclap headache', 'severe headache sudden'],
    category: 'Neurological',
    severity: 'critical'
  },
  {
    keywords: ['suicidal', 'want to die', 'kill myself', 'end my life', 'suicide'],
    category: 'Psychiatric',
    severity: 'critical'
  },
  {
    keywords: ['unconscious', 'unresponsive', 'passed out', 'fainted'],
    category: 'General',
    severity: 'critical'
  },
  {
    keywords: ['severe bleeding', 'bleeding heavily', 'won\'t stop bleeding'],
    category: 'Trauma',
    severity: 'critical'
  },
  {
    keywords: ['allergic reaction', 'throat swelling', 'tongue swelling', 'anaphylaxis'],
    category: 'Allergy',
    severity: 'critical'
  },
  {
    keywords: ['high fever', 'fever confusion', 'fever stiff neck', 'temperature 103', 'temperature 104'],
    category: 'Infectious',
    severity: 'emergent'
  },
  {
    keywords: ['severe abdominal pain', 'rigid abdomen', 'blood in stool'],
    category: 'Abdominal',
    severity: 'emergent'
  },
  {
    keywords: ['vomiting blood', 'coughing blood', 'blood in vomit'],
    category: 'GI Bleeding',
    severity: 'emergent'
  },
  {
    keywords: ['seizure', 'convulsion', 'shaking uncontrollably'],
    category: 'Neurological',
    severity: 'emergent'
  },
  {
    keywords: ['overdose', 'took too many pills', 'poisoning'],
    category: 'Toxicology',
    severity: 'critical'
  },
  {
    keywords: ['pregnant bleeding', 'pregnancy bleeding', 'miscarriage'],
    category: 'Obstetric',
    severity: 'emergent'
  }
];

// ============================================================================
// Helper Functions
// ============================================================================

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function detectRedFlags(text: string): RedFlag[] {
  const normalizedText = text.toLowerCase();
  const detectedFlags: RedFlag[] = [];

  for (const pattern of RED_FLAG_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalizedText.includes(keyword)) {
        detectedFlags.push({
          id: `rf-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          symptom: keyword,
          severity: pattern.severity,
          category: pattern.category,
          detectedAt: new Date().toISOString()
        });
        break; // Only one match per pattern
      }
    }
  }

  return detectedFlags;
}

function calculateUrgency(redFlags: RedFlag[]): UrgencyLevel {
  if (redFlags.some(rf => rf.severity === 'critical')) return 'critical';
  if (redFlags.some(rf => rf.severity === 'emergent')) return 'emergent';
  if (redFlags.some(rf => rf.severity === 'urgent')) return 'urgent';
  if (redFlags.length > 0) return 'moderate';
  return 'routine';
}

function calculateProgress(phase: AssessmentPhase): number {
  const phases: AssessmentPhase[] = [
    'welcome', 'demographics', 'chiefComplaint',
    'hpiOnset', 'hpiLocation', 'hpiDuration', 'hpiCharacter',
    'hpiSeverity', 'hpiTiming', 'hpiContext', 'hpiModifying',
    'reviewOfSystems', 'medicalHistory', 'medications', 'allergies',
    'socialHistory', 'riskAssessment', 'summary', 'providerHandoff'
  ];
  const index = phases.indexOf(phase);
  return index >= 0 ? Math.round((index / (phases.length - 1)) * 100) : 0;
}

// ============================================================================
// Initial Context
// ============================================================================

const initialContext: AssessmentContext = {
  sessionId: '',
  patientId: '',
  patientName: '',
  startTime: '',
  chiefComplaint: '',
  hpiData: {},
  reviewOfSystems: {},
  medicalHistory: [],
  surgicalHistory: [],
  medications: [],
  allergies: [],
  socialHistory: {},
  familyHistory: [],
  redFlags: [],
  urgencyLevel: 'routine',
  currentPhase: 'welcome',
  phaseHistory: [],
  progressPercent: 0,
  isEmergency: false,
  messages: [],
  lastUserInput: '',
  lastAIResponse: ''
};

// ============================================================================
// Assessment State Machine
// ============================================================================

export const assessmentMachine = createMachine({
  id: 'compassAssessment',
  initial: 'idle',
  context: initialContext,
  states: {
    // ========================================
    // IDLE - Waiting to start
    // ========================================
    idle: {
      on: {
        START: {
          target: 'welcome',
          actions: assign((_ctx, event) => {
            const startEvent = event as { type: 'START'; patientName: string; patientId?: string };
            return {
              sessionId: generateSessionId(),
              patientName: startEvent.patientName,
              patientId: startEvent.patientId || `patient-${Date.now()}`,
              startTime: new Date().toISOString(),
              currentPhase: 'welcome' as AssessmentPhase,
              phaseHistory: ['welcome'] as AssessmentPhase[],
              progressPercent: 0
            };
          })
        }
      }
    },

    // ========================================
    // WELCOME
    // ========================================
    welcome: {
      entry: assign({
        currentPhase: () => 'welcome' as AssessmentPhase,
        progressPercent: () => calculateProgress('welcome')
      }),
      on: {
        NEXT: {
          target: 'demographics',
          actions: assign({
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'demographics'] as AssessmentPhase[]
          })
        }
      }
    },

    // ========================================
    // DEMOGRAPHICS
    // ========================================
    demographics: {
      entry: assign({
        currentPhase: () => 'demographics' as AssessmentPhase,
        progressPercent: () => calculateProgress('demographics')
      }),
      on: {
        SUBMIT_DEMOGRAPHICS: {
          target: 'chiefComplaint',
          actions: assign((_ctx, event) => {
            const submitEvent = event as { type: 'SUBMIT_DEMOGRAPHICS'; data: { dateOfBirth: string; gender: string; contactPhone?: string } };
            return {
              dateOfBirth: submitEvent.data.dateOfBirth,
              gender: submitEvent.data.gender,
              contactPhone: submitEvent.data.contactPhone,
              phaseHistory: [..._ctx.phaseHistory, 'chiefComplaint'] as AssessmentPhase[]
            };
          })
        },
        SKIP: {
          target: 'chiefComplaint',
          actions: assign({
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'chiefComplaint'] as AssessmentPhase[]
          })
        },
        BACK: 'welcome'
      }
    },

    // ========================================
    // CHIEF COMPLAINT
    // ========================================
    chiefComplaint: {
      entry: assign({
        currentPhase: () => 'chiefComplaint' as AssessmentPhase,
        progressPercent: () => calculateProgress('chiefComplaint')
      }),
      on: {
        SUBMIT_CHIEF_COMPLAINT: [
          {
            // Check for emergency red flags
            target: 'emergency',
            cond: (_, event) => {
              const flags = detectRedFlags(event.complaint);
              return flags.some(f => f.severity === 'critical');
            },
            actions: assign({
              chiefComplaint: (_, event) => event.complaint,
              lastUserInput: (_, event) => event.complaint,
              redFlags: (ctx, event) => [...ctx.redFlags, ...detectRedFlags(event.complaint)],
              urgencyLevel: (ctx, event) => calculateUrgency([...ctx.redFlags, ...detectRedFlags(event.complaint)]),
              isEmergency: () => true,
              emergencyType: (_, event) => {
                const flags = detectRedFlags(event.complaint);
                return flags[0]?.category || 'Unknown';
              }
            })
          },
          {
            // Normal flow
            target: 'hpiOnset',
            actions: assign({
              chiefComplaint: (_, event) => event.complaint,
              lastUserInput: (_, event) => event.complaint,
              redFlags: (ctx, event) => [...ctx.redFlags, ...detectRedFlags(event.complaint)],
              urgencyLevel: (ctx, event) => calculateUrgency([...ctx.redFlags, ...detectRedFlags(event.complaint)]),
              phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiOnset'] as AssessmentPhase[]
            })
          }
        ],
        BACK: 'demographics'
      }
    },

    // ========================================
    // HPI - Onset
    // ========================================
    hpiOnset: {
      entry: assign({
        currentPhase: () => 'hpiOnset' as AssessmentPhase,
        progressPercent: () => calculateProgress('hpiOnset')
      }),
      on: {
        SUBMIT_HPI_ONSET: {
          target: 'hpiLocation',
          actions: assign({
            hpiData: (ctx, event) => ({ ...ctx.hpiData, onset: event.onset }),
            lastUserInput: (_, event) => event.onset,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiLocation'] as AssessmentPhase[]
          })
        },
        SKIP: {
          target: 'hpiLocation',
          actions: assign({
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiLocation'] as AssessmentPhase[]
          })
        },
        BACK: 'chiefComplaint',
        RED_FLAG_DETECTED: {
          target: 'emergency',
          actions: assign({
            redFlags: (ctx, event) => [...ctx.redFlags, event.redFlag],
            urgencyLevel: (ctx, event) => calculateUrgency([...ctx.redFlags, event.redFlag]),
            isEmergency: () => true,
            emergencyType: (_, event) => event.redFlag.category
          })
        }
      }
    },

    // ========================================
    // HPI - Location
    // ========================================
    hpiLocation: {
      entry: assign({
        currentPhase: () => 'hpiLocation' as AssessmentPhase,
        progressPercent: () => calculateProgress('hpiLocation')
      }),
      on: {
        SUBMIT_HPI_LOCATION: {
          target: 'hpiDuration',
          actions: assign({
            hpiData: (ctx, event) => ({ ...ctx.hpiData, location: event.location }),
            lastUserInput: (_, event) => event.location,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiDuration'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'hpiDuration' },
        BACK: 'hpiOnset'
      }
    },

    // ========================================
    // HPI - Duration
    // ========================================
    hpiDuration: {
      entry: assign({
        currentPhase: () => 'hpiDuration' as AssessmentPhase,
        progressPercent: () => calculateProgress('hpiDuration')
      }),
      on: {
        SUBMIT_HPI_DURATION: {
          target: 'hpiCharacter',
          actions: assign({
            hpiData: (ctx, event) => ({ ...ctx.hpiData, duration: event.duration }),
            lastUserInput: (_, event) => event.duration,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiCharacter'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'hpiCharacter' },
        BACK: 'hpiLocation'
      }
    },

    // ========================================
    // HPI - Character/Quality
    // ========================================
    hpiCharacter: {
      entry: assign({
        currentPhase: () => 'hpiCharacter' as AssessmentPhase,
        progressPercent: () => calculateProgress('hpiCharacter')
      }),
      on: {
        SUBMIT_HPI_CHARACTER: {
          target: 'hpiSeverity',
          actions: assign({
            hpiData: (ctx, event) => ({ ...ctx.hpiData, character: event.character }),
            lastUserInput: (_, event) => event.character,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiSeverity'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'hpiSeverity' },
        BACK: 'hpiDuration'
      }
    },

    // ========================================
    // HPI - Severity (Pain Scale)
    // ========================================
    hpiSeverity: {
      entry: assign({
        currentPhase: () => 'hpiSeverity' as AssessmentPhase,
        progressPercent: () => calculateProgress('hpiSeverity')
      }),
      on: {
        SUBMIT_HPI_SEVERITY: [
          {
            // Severe pain triggers urgency increase
            target: 'hpiTiming',
            cond: (_, event) => event.severity < 8,
            actions: assign({
              hpiData: (ctx, event) => ({ ...ctx.hpiData, severity: event.severity }),
              lastUserInput: (_, event) => `${event.severity}/10`,
              phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiTiming'] as AssessmentPhase[]
            })
          },
          {
            // Severe pain (8+)
            target: 'hpiTiming',
            actions: assign({
              hpiData: (ctx, event) => ({ ...ctx.hpiData, severity: event.severity }),
              lastUserInput: (_, event) => `${event.severity}/10`,
              urgencyLevel: (ctx) => ctx.urgencyLevel === 'routine' ? 'urgent' : ctx.urgencyLevel,
              phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiTiming'] as AssessmentPhase[]
            })
          }
        ],
        SKIP: { target: 'hpiTiming' },
        BACK: 'hpiCharacter'
      }
    },

    // ========================================
    // HPI - Timing
    // ========================================
    hpiTiming: {
      entry: assign({
        currentPhase: () => 'hpiTiming' as AssessmentPhase,
        progressPercent: () => calculateProgress('hpiTiming')
      }),
      on: {
        SUBMIT_HPI_TIMING: {
          target: 'hpiContext',
          actions: assign({
            hpiData: (ctx, event) => ({ ...ctx.hpiData, timing: event.timing }),
            lastUserInput: (_, event) => event.timing,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiContext'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'hpiContext' },
        BACK: 'hpiSeverity'
      }
    },

    // ========================================
    // HPI - Context
    // ========================================
    hpiContext: {
      entry: assign({
        currentPhase: () => 'hpiContext' as AssessmentPhase,
        progressPercent: () => calculateProgress('hpiContext')
      }),
      on: {
        SUBMIT_HPI_CONTEXT: {
          target: 'hpiModifying',
          actions: assign({
            hpiData: (ctx, event) => ({ ...ctx.hpiData, context: event.context }),
            lastUserInput: (_, event) => event.context,
            redFlags: (ctx, event) => [...ctx.redFlags, ...detectRedFlags(event.context)],
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'hpiModifying'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'hpiModifying' },
        BACK: 'hpiTiming'
      }
    },

    // ========================================
    // HPI - Modifying Factors
    // ========================================
    hpiModifying: {
      entry: assign({
        currentPhase: () => 'hpiModifying' as AssessmentPhase,
        progressPercent: () => calculateProgress('hpiModifying')
      }),
      on: {
        SUBMIT_HPI_MODIFYING: {
          target: 'reviewOfSystems',
          actions: assign({
            hpiData: (ctx, event) => ({
              ...ctx.hpiData,
              aggravatingFactors: event.aggravating,
              relievingFactors: event.relieving
            }),
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'reviewOfSystems'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'reviewOfSystems' },
        BACK: 'hpiContext'
      }
    },

    // ========================================
    // REVIEW OF SYSTEMS
    // ========================================
    reviewOfSystems: {
      entry: assign({
        currentPhase: () => 'reviewOfSystems' as AssessmentPhase,
        progressPercent: () => calculateProgress('reviewOfSystems')
      }),
      on: {
        SUBMIT_ROS: {
          actions: assign({
            reviewOfSystems: (ctx, event) => ({
              ...ctx.reviewOfSystems,
              [event.system]: event.symptoms
            }),
            redFlags: (ctx, event) => [
              ...ctx.redFlags,
              ...detectRedFlags(event.symptoms.join(' '))
            ]
          })
        },
        COMPLETE_ROS: {
          target: 'medicalHistory',
          actions: assign({
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'medicalHistory'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'medicalHistory' },
        BACK: 'hpiModifying',
        RED_FLAG_DETECTED: {
          target: 'emergency',
          actions: assign({
            redFlags: (ctx, event) => [...ctx.redFlags, event.redFlag],
            isEmergency: () => true,
            emergencyType: (_, event) => event.redFlag.category
          })
        }
      }
    },

    // ========================================
    // MEDICAL HISTORY
    // ========================================
    medicalHistory: {
      entry: assign({
        currentPhase: () => 'medicalHistory' as AssessmentPhase,
        progressPercent: () => calculateProgress('medicalHistory')
      }),
      on: {
        SUBMIT_MEDICAL_HISTORY: {
          target: 'medications',
          actions: assign({
            medicalHistory: (_, event) => event.conditions,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'medications'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'medications' },
        BACK: 'reviewOfSystems'
      }
    },

    // ========================================
    // MEDICATIONS
    // ========================================
    medications: {
      entry: assign({
        currentPhase: () => 'medications' as AssessmentPhase,
        progressPercent: () => calculateProgress('medications')
      }),
      on: {
        SUBMIT_MEDICATIONS: {
          target: 'allergies',
          actions: assign({
            medications: (_, event) => event.medications,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'allergies'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'allergies' },
        BACK: 'medicalHistory'
      }
    },

    // ========================================
    // ALLERGIES
    // ========================================
    allergies: {
      entry: assign({
        currentPhase: () => 'allergies' as AssessmentPhase,
        progressPercent: () => calculateProgress('allergies')
      }),
      on: {
        SUBMIT_ALLERGIES: {
          target: 'socialHistory',
          actions: assign({
            allergies: (_, event) => event.allergies,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'socialHistory'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'socialHistory' },
        BACK: 'medications'
      }
    },

    // ========================================
    // SOCIAL HISTORY
    // ========================================
    socialHistory: {
      entry: assign({
        currentPhase: () => 'socialHistory' as AssessmentPhase,
        progressPercent: () => calculateProgress('socialHistory')
      }),
      on: {
        SUBMIT_SOCIAL_HISTORY: {
          target: 'riskAssessment',
          actions: assign({
            socialHistory: (_, event) => event.data,
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'riskAssessment'] as AssessmentPhase[]
          })
        },
        SKIP: { target: 'riskAssessment' },
        BACK: 'allergies'
      }
    },

    // ========================================
    // RISK ASSESSMENT
    // ========================================
    riskAssessment: {
      entry: assign({
        currentPhase: () => 'riskAssessment' as AssessmentPhase,
        progressPercent: () => calculateProgress('riskAssessment')
      }),
      on: {
        SUBMIT_RISK_ASSESSMENT: {
          target: 'summary',
          actions: assign({
            urgencyLevel: (ctx) => calculateUrgency(ctx.redFlags),
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'summary'] as AssessmentPhase[]
          })
        },
        NEXT: { target: 'summary' },
        BACK: 'socialHistory'
      }
    },

    // ========================================
    // SUMMARY
    // ========================================
    summary: {
      entry: assign({
        currentPhase: () => 'summary' as AssessmentPhase,
        progressPercent: () => calculateProgress('summary')
      }),
      on: {
        NEXT: {
          target: 'providerHandoff',
          actions: assign({
            phaseHistory: (ctx) => [...ctx.phaseHistory, 'providerHandoff'] as AssessmentPhase[]
          })
        },
        BACK: 'riskAssessment'
      }
    },

    // ========================================
    // PROVIDER HANDOFF
    // ========================================
    providerHandoff: {
      entry: assign({
        currentPhase: () => 'providerHandoff' as AssessmentPhase,
        progressPercent: () => 100
      }),
      on: {
        PROVIDER_CONNECTED: {
          target: 'completed',
          actions: assign({
            assignedProviderId: (_, event) => event.providerId,
            assignedProviderName: (_, event) => event.providerName
          })
        },
        COMPLETE: 'completed'
      }
    },

    // ========================================
    // EMERGENCY
    // ========================================
    emergency: {
      entry: assign({
        currentPhase: () => 'emergency' as AssessmentPhase,
        isEmergency: () => true
      }),
      on: {
        EMERGENCY_ACKNOWLEDGED: {
          // Return to assessment if acknowledged
          target: 'hpiOnset',
          actions: assign({
            isEmergency: () => false
          })
        },
        EMERGENCY_CALL_911: {
          // Stay in emergency state but mark 911 called
          actions: assign({
            lastAIResponse: () => '911 has been called. Help is on the way.'
          })
        },
        PROVIDER_CONNECTED: {
          target: 'providerHandoff',
          actions: assign({
            assignedProviderId: (_, event) => event.providerId,
            assignedProviderName: (_, event) => event.providerName
          })
        }
      }
    },

    // ========================================
    // COMPLETED
    // ========================================
    completed: {
      type: 'final',
      entry: assign({
        currentPhase: () => 'completed' as AssessmentPhase,
        progressPercent: () => 100
      })
    }
  },
  on: {
    // Global events
    ADD_MESSAGE: {
      actions: assign({
        messages: (ctx, event) => [
          ...ctx.messages,
          {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            ...event.message
          }
        ]
      })
    },
    SUBMIT_HPI_DATA: {
      actions: assign({
        hpiData: (ctx, event) => ({ ...ctx.hpiData, [event.field]: event.value }),
        lastUserInput: (_, event) => String(event.value)
      })
    },
    TRIGGER_EMERGENCY: {
      target: '.emergency',
      actions: assign({
        isEmergency: () => true,
        emergencyType: (_, event) => event.emergencyType,
        urgencyLevel: () => 'critical' as UrgencyLevel
      })
    },
    DISMISS_EMERGENCY: {
      actions: assign({
        isEmergency: () => false
      })
    },
    CALL_911: {
      actions: assign({
        lastAIResponse: () => '911 has been called. Help is on the way.'
      })
    },
    RESET: {
      target: 'idle',
      actions: assign(() => ({ ...initialContext }))
    },
    ERROR: {
      actions: assign({
        errorMessage: (_, event) => event.message
      })
    },
    // Emergency can be triggered from any state
    EMERGENCY_TRIGGERED: {
      target: '.emergency',
      actions: assign({
        isEmergency: () => true,
        emergencyType: (_, event) => event.emergencyType,
        urgencyLevel: () => 'critical' as UrgencyLevel
      })
    }
  }
});

export default assessmentMachine;
