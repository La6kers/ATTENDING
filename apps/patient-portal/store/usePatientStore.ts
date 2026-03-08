// =============================================================================
// ATTENDING AI - Unified Patient Store
// apps/patient-portal/store/usePatientStore.ts
//
// Consolidated state management for the patient portal (COMPASS).
// Manages assessment flow, chat messages, emergency detection, and provider connection.
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';
import type {
  ChatMessage as SharedChatMessage,
  RedFlag as SharedRedFlag,
  MessageRole,
} from '@attending/shared/types/chat.types';

// ============================================================================
// Types — extend shared canonical types for patient store
// ============================================================================

export type { MessageRole };

export type AssessmentPhase =
  | 'welcome'
  | 'demographics'
  | 'chief-complaint'
  | 'hpi-onset'
  | 'hpi-location'
  | 'hpi-duration'
  | 'hpi-character'
  | 'hpi-severity'
  | 'hpi-timing'
  | 'hpi-context'
  | 'hpi-modifying'
  | 'review-of-systems'
  | 'medical-history'
  | 'medications'
  | 'allergies'
  | 'social-history'
  | 'risk-assessment'
  | 'summary'
  | 'provider-handoff'
  | 'emergency';

export type UrgencyLevel = 'critical' | 'emergent' | 'urgent' | 'moderate' | 'routine';

/**
 * ChatMessage for the patient store. Extends shared ChatMessage with
 * phase, quickReplies as direct fields and store-specific metadata.
 */
export interface ChatMessage extends Omit<SharedChatMessage, 'metadata'> {
  phase?: AssessmentPhase;
  quickReplies?: string[];
  metadata?: {
    isEmergency?: boolean;
    redFlagDetected?: boolean;
    extractedData?: Record<string, any>;
  };
}

/**
 * RedFlag for the patient store. Extends shared RedFlag but uses
 * the store-specific UrgencyLevel for severity, and requires category.
 */
export interface RedFlag extends Omit<SharedRedFlag, 'severity' | 'context'> {
  severity: UrgencyLevel;
  category: string;
}

export interface VitalSigns {
  heartRate?: number;
  bloodPressure?: string;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  painLevel?: number;
}

export interface HPIData {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: number;
  timing?: string;
  context?: string;
  modifyingFactors?: {
    aggravating?: string[];
    relieving?: string[];
  };
  associatedSymptoms?: string[];
}

export interface ClinicalData {
  chiefComplaint: string;
  hpi: HPIData;
  reviewOfSystems: Record<string, string[]>;
  medicalHistory: string[];
  surgicalHistory: string[];
  medications: { name: string; dose?: string; frequency?: string }[];
  allergies: { allergen: string; reaction?: string; severity?: string }[];
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingSituation?: string;
  };
  familyHistory: string[];
  vitalSigns?: VitalSigns;
}

export interface PatientState {
  // Session
  sessionId: string | null;
  patientId: string | null;
  patientName: string;
  startTime: string | null;
  
  // Assessment Flow
  currentPhase: AssessmentPhase;
  phaseHistory: AssessmentPhase[];
  isComplete: boolean;
  progressPercent: number;
  
  // Clinical Data
  clinicalData: ClinicalData;
  redFlags: RedFlag[];
  urgencyLevel: UrgencyLevel;
  
  // Chat
  messages: ChatMessage[];
  isTyping: boolean;
  inputValue: string;
  
  // Emergency
  isEmergency: boolean;
  emergencyType: string | null;
  emergencyModalOpen: boolean;
  
  // Provider Connection
  isConnectedToProvider: boolean;
  assignedProviderId: string | null;
  assignedProviderName: string | null;
  providerTyping: boolean;
  
  // UI State
  isLoading: boolean;
  error: string | null;
}

export interface PatientActions {
  // Session
  startSession: (patientName: string) => void;
  endSession: () => void;
  
  // Assessment Flow
  setPhase: (phase: AssessmentPhase) => void;
  advancePhase: () => void;
  goBackPhase: () => void;
  
  // Clinical Data
  updateClinicalData: (updates: Partial<ClinicalData>) => void;
  setChiefComplaint: (complaint: string) => void;
  updateHPI: (updates: Partial<HPIData>) => void;
  addMedication: (medication: ClinicalData['medications'][0]) => void;
  addAllergy: (allergy: ClinicalData['allergies'][0]) => void;
  setVitalSigns: (vitals: VitalSigns) => void;
  
  // Red Flags
  addRedFlag: (redFlag: Omit<RedFlag, 'id' | 'detectedAt'>) => void;
  evaluateForRedFlags: (text: string) => void;
  
  // Chat
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setTyping: (isTyping: boolean) => void;
  setInputValue: (value: string) => void;
  clearMessages: () => void;
  
  // Emergency
  triggerEmergency: (type: string) => void;
  dismissEmergency: () => void;
  call911: () => void;
  
  // Provider
  connectToProvider: (providerId: string, providerName: string) => void;
  disconnectFromProvider: () => void;
  setProviderTyping: (typing: boolean) => void;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Computed
  getProgress: () => number;
  getSummary: () => string;
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_ORDER: AssessmentPhase[] = [
  'welcome',
  'demographics',
  'chief-complaint',
  'hpi-onset',
  'hpi-location',
  'hpi-duration',
  'hpi-character',
  'hpi-severity',
  'hpi-timing',
  'hpi-context',
  'hpi-modifying',
  'review-of-systems',
  'medical-history',
  'medications',
  'allergies',
  'social-history',
  'risk-assessment',
  'summary',
  'provider-handoff'
];

const RED_FLAG_KEYWORDS: { keywords: string[]; category: string; severity: UrgencyLevel }[] = [
  { 
    keywords: ['chest pain', 'chest pressure', 'crushing chest'],
    category: 'Cardiovascular',
    severity: 'critical'
  },
  {
    keywords: ['can\'t breathe', 'difficulty breathing', 'shortness of breath'],
    category: 'Respiratory',
    severity: 'critical'
  },
  {
    keywords: ['sudden weakness', 'facial droop', 'slurred speech', 'arm weakness'],
    category: 'Neurological',
    severity: 'critical'
  },
  {
    keywords: ['worst headache', 'thunderclap headache'],
    category: 'Neurological',
    severity: 'critical'
  },
  {
    keywords: ['suicidal', 'want to die', 'kill myself'],
    category: 'Psychiatric',
    severity: 'critical'
  },
  {
    keywords: ['unconscious', 'unresponsive', 'passed out'],
    category: 'General',
    severity: 'critical'
  },
  {
    keywords: ['severe bleeding', 'bleeding heavily'],
    category: 'Trauma',
    severity: 'critical'
  },
  {
    keywords: ['high fever', 'fever and confusion', 'fever and stiff neck'],
    category: 'Infectious',
    severity: 'emergent'
  },
  {
    keywords: ['severe abdominal pain', 'rigid abdomen'],
    category: 'Abdominal',
    severity: 'emergent'
  },
  {
    keywords: ['allergic reaction', 'throat swelling', 'tongue swelling'],
    category: 'Allergy',
    severity: 'critical'
  }
];

const initialClinicalData: ClinicalData = {
  chiefComplaint: '',
  hpi: {},
  reviewOfSystems: {},
  medicalHistory: [],
  surgicalHistory: [],
  medications: [],
  allergies: [],
  socialHistory: {},
  familyHistory: [],
};

// ============================================================================
// Store Implementation
// ============================================================================

export const usePatientStore = create<PatientState & PatientActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        sessionId: null,
        patientId: null,
        patientName: '',
        startTime: null,
        currentPhase: 'welcome',
        phaseHistory: [],
        isComplete: false,
        progressPercent: 0,
        clinicalData: { ...initialClinicalData },
        redFlags: [],
        urgencyLevel: 'routine',
        messages: [],
        isTyping: false,
        inputValue: '',
        isEmergency: false,
        emergencyType: null,
        emergencyModalOpen: false,
        isConnectedToProvider: false,
        assignedProviderId: null,
        assignedProviderName: null,
        providerTyping: false,
        isLoading: false,
        error: null,

        // Session
        startSession: (patientName) => {
          set((state) => {
            state.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            state.patientName = patientName;
            state.startTime = new Date().toISOString();
            state.currentPhase = 'welcome';
            state.phaseHistory = ['welcome'];
            
            // Add welcome message
            state.messages = [{
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: `Hello ${patientName}! I'm COMPASS, your AI health assistant. I'm here to help gather information about your symptoms to share with your healthcare provider. Let's get started. What brings you in today?`,
              timestamp: new Date().toISOString(),
              phase: 'welcome',
              quickReplies: ['I have pain', 'I feel sick', 'I need a check-up', 'Other concern']
            }];
          });
        },

        endSession: () => {
          set((state) => {
            state.isComplete = true;
            state.currentPhase = 'summary';
          });
        },

        // Assessment Flow
        setPhase: (phase) => {
          set((state) => {
            state.currentPhase = phase;
            if (!state.phaseHistory.includes(phase)) {
              state.phaseHistory.push(phase);
            }
            state.progressPercent = (PHASE_ORDER.indexOf(phase) / (PHASE_ORDER.length - 1)) * 100;
          });
        },

        advancePhase: () => {
          const { currentPhase } = get();
          const currentIndex = PHASE_ORDER.indexOf(currentPhase);
          if (currentIndex < PHASE_ORDER.length - 1) {
            const nextPhase = PHASE_ORDER[currentIndex + 1];
            set((state) => {
              state.currentPhase = nextPhase;
              state.phaseHistory.push(nextPhase);
              state.progressPercent = ((currentIndex + 1) / (PHASE_ORDER.length - 1)) * 100;
            });
          }
        },

        goBackPhase: () => {
          const { phaseHistory } = get();
          if (phaseHistory.length > 1) {
            set((state) => {
              state.phaseHistory.pop();
              state.currentPhase = state.phaseHistory[state.phaseHistory.length - 1];
              state.progressPercent = (PHASE_ORDER.indexOf(state.currentPhase) / (PHASE_ORDER.length - 1)) * 100;
            });
          }
        },

        // Clinical Data
        updateClinicalData: (updates) => {
          set((state) => {
            state.clinicalData = { ...state.clinicalData, ...updates };
          });
        },

        setChiefComplaint: (complaint) => {
          set((state) => {
            state.clinicalData.chiefComplaint = complaint;
          });
          // Check for red flags
          get().evaluateForRedFlags(complaint);
        },

        updateHPI: (updates) => {
          set((state) => {
            state.clinicalData.hpi = { ...state.clinicalData.hpi, ...updates };
          });
        },

        addMedication: (medication) => {
          set((state) => {
            state.clinicalData.medications.push(medication);
          });
        },

        addAllergy: (allergy) => {
          set((state) => {
            state.clinicalData.allergies.push(allergy);
          });
        },

        setVitalSigns: (vitals) => {
          set((state) => {
            state.clinicalData.vitalSigns = vitals;
          });
        },

        // Red Flags
        addRedFlag: (redFlag) => {
          set((state) => {
            const newFlag: RedFlag = {
              ...redFlag,
              id: `rf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              detectedAt: new Date().toISOString()
            };
            state.redFlags.push(newFlag);
            
            // Update urgency level
            if (redFlag.severity === 'critical') {
              state.urgencyLevel = 'critical';
              state.isEmergency = true;
              state.emergencyType = redFlag.category;
              state.emergencyModalOpen = true;
            } else if (redFlag.severity === 'emergent' && state.urgencyLevel !== 'critical') {
              state.urgencyLevel = 'emergent';
            }
          });
        },

        evaluateForRedFlags: (text) => {
          const normalizedText = text.toLowerCase();
          
          for (const pattern of RED_FLAG_KEYWORDS) {
            for (const keyword of pattern.keywords) {
              if (normalizedText.includes(keyword)) {
                get().addRedFlag({
                  symptom: keyword,
                  severity: pattern.severity,
                  category: pattern.category
                });
                return; // Stop after first match to avoid duplicates
              }
            }
          }
        },

        // Chat
        addMessage: (message) => {
          set((state) => {
            const newMessage: ChatMessage = {
              ...message,
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString()
            };
            state.messages.push(newMessage);
            
            // Evaluate user messages for red flags
            if (message.role === 'user') {
              // Don't call evaluateForRedFlags here - it's already called when relevant
            }
          });
        },

        setTyping: (isTyping) => {
          set((state) => {
            state.isTyping = isTyping;
          });
        },

        setInputValue: (value) => {
          set((state) => {
            state.inputValue = value;
          });
        },

        clearMessages: () => {
          set((state) => {
            state.messages = [];
          });
        },

        // Emergency
        triggerEmergency: (type) => {
          set((state) => {
            state.isEmergency = true;
            state.emergencyType = type;
            state.emergencyModalOpen = true;
            state.currentPhase = 'emergency';
            state.urgencyLevel = 'critical';
            
            // Add emergency message
            state.messages.push({
              id: `msg-${Date.now()}`,
              role: 'system',
              content: `⚠️ EMERGENCY DETECTED: ${type}. Please call 911 immediately if you are experiencing a medical emergency.`,
              timestamp: new Date().toISOString(),
              metadata: { isEmergency: true }
            });
          });
        },

        dismissEmergency: () => {
          set((state) => {
            state.emergencyModalOpen = false;
          });
        },

        call911: () => {
          if (typeof window !== 'undefined') {
            window.location.href = 'tel:911';
          }
        },

        // Provider Connection
        connectToProvider: (providerId, providerName) => {
          set((state) => {
            state.isConnectedToProvider = true;
            state.assignedProviderId = providerId;
            state.assignedProviderName = providerName;
            
            state.messages.push({
              id: `msg-${Date.now()}`,
              role: 'system',
              content: `You are now connected with ${providerName}. They will review your information shortly.`,
              timestamp: new Date().toISOString()
            });
          });
        },

        disconnectFromProvider: () => {
          set((state) => {
            state.isConnectedToProvider = false;
            state.assignedProviderId = null;
            state.assignedProviderName = null;
          });
        },

        setProviderTyping: (typing) => {
          set((state) => {
            state.providerTyping = typing;
          });
        },

        // Utility
        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        reset: () => {
          set((state) => {
            Object.assign(state, {
              sessionId: null,
              patientId: null,
              patientName: '',
              startTime: null,
              currentPhase: 'welcome',
              phaseHistory: [],
              isComplete: false,
              progressPercent: 0,
              clinicalData: { ...initialClinicalData },
              redFlags: [],
              urgencyLevel: 'routine',
              messages: [],
              isTyping: false,
              inputValue: '',
              isEmergency: false,
              emergencyType: null,
              emergencyModalOpen: false,
              isConnectedToProvider: false,
              assignedProviderId: null,
              assignedProviderName: null,
              providerTyping: false,
              isLoading: false,
              error: null,
            });
          });
        },

        // Computed
        getProgress: () => {
          const { currentPhase } = get();
          return (PHASE_ORDER.indexOf(currentPhase) / (PHASE_ORDER.length - 1)) * 100;
        },

        getSummary: () => {
          const { clinicalData, redFlags, urgencyLevel } = get();
          
          let summary = `## Assessment Summary\n\n`;
          summary += `**Chief Complaint:** ${clinicalData.chiefComplaint || 'Not provided'}\n\n`;
          
          if (Object.keys(clinicalData.hpi).length > 0) {
            summary += `**History of Present Illness:**\n`;
            if (clinicalData.hpi.onset) summary += `- Onset: ${clinicalData.hpi.onset}\n`;
            if (clinicalData.hpi.duration) summary += `- Duration: ${clinicalData.hpi.duration}\n`;
            if (clinicalData.hpi.severity) summary += `- Severity: ${clinicalData.hpi.severity}/10\n`;
            if (clinicalData.hpi.character) summary += `- Character: ${clinicalData.hpi.character}\n`;
            summary += '\n';
          }
          
          if (redFlags.length > 0) {
            summary += `**⚠️ Red Flags Detected:**\n`;
            redFlags.forEach(rf => {
              summary += `- ${rf.symptom} (${rf.severity})\n`;
            });
            summary += '\n';
          }
          
          summary += `**Urgency Level:** ${urgencyLevel.toUpperCase()}\n`;
          
          return summary;
        },
      })),
      {
        name: 'compass-patient-store',
        partialize: (state) => ({
          // Only persist certain fields
          sessionId: state.sessionId,
          patientName: state.patientName,
          clinicalData: state.clinicalData,
          messages: state.messages.slice(-50), // Keep last 50 messages
          currentPhase: state.currentPhase,
          redFlags: state.redFlags,
        }),
      }
    ),
    { name: 'patient-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectHasCriticalRedFlags = (state: PatientState) => 
  state.redFlags.some(rf => rf.severity === 'critical');

export const selectMessageCount = (state: PatientState) => 
  state.messages.length;

export const selectLastMessage = (state: PatientState) => 
  state.messages[state.messages.length - 1];
