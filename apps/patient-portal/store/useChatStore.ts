// Patient Portal Chat Store - Adapted from Provider Portal for Patient Use
// apps/patient-portal/store/useChatStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  AssessmentPhase,
  UrgencyLevel,
  ChatMessage,
  ClinicalData as SharedClinicalData,
} from '@attending/shared';

// Re-export types for components that import from this store
export type { AssessmentPhase, UrgencyLevel, ChatMessage };

// Local simplified ClinicalData for chat store state
export interface LocalClinicalData {
  chiefComplaint: string;
  hpi: Record<string, any>;
  ros: Record<string, any>;
  pmh: Record<string, any>;
  medications: any[];
  allergies: any[];
  riskFactors: string[];
  redFlags: string[];
  assessmentPhase: AssessmentPhase;
}

// Local RedFlag type (also available in shared/machines)
export interface RedFlag {
  id: string;
  name: string;
  description: string;
  severity: 'warning' | 'critical';
  requiresEmergency?: boolean;
  recommendation?: string;
}

interface ChatStore {
  // State
  messages: ChatMessage[];
  currentPhase: AssessmentPhase;
  isAIProcessing: boolean;
  urgencyLevel: UrgencyLevel;
  redFlags: RedFlag[];
  clinicalData: LocalClinicalData;
  sessionId: string | null;
  patientId: string | null;
  showEmergencyModal: boolean;
  isComplete: boolean;

  // Actions
  startNewSession: (patientId: string) => void;
  sendMessage: (message: string) => Promise<void>;
  handleQuickReply: (reply: string) => void;
  setEmergencyModal: (show: boolean) => void;
  handleEmergency: () => void;
  reset: () => void;
}

// Mock AI Response Generator (replace with actual BioMistral service)
const generateAIResponse = async (
  message: string, 
  phase: AssessmentPhase,
  clinicalData: LocalClinicalData
): Promise<{
  message: string;
  quickReplies: string[];
  nextPhase: AssessmentPhase;
  urgencyLevel: UrgencyLevel;
  aiThinking: string;
  redFlags: RedFlag[];
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Check for emergency keywords
  const emergencyKeywords = ['chest pain', 'can\'t breathe', 'severe', 'worst', 'unconscious'];
  const hasEmergency = emergencyKeywords.some(kw => message.toLowerCase().includes(kw));

  const phaseResponses: Record<AssessmentPhase, any> = {
    'chief-complaint': {
      message: `Thank you for sharing that. To better understand your <strong>${message}</strong>, I need to ask some follow-up questions.\n\n<strong>When exactly did this symptom first start?</strong> Please be as specific as possible.`,
      quickReplies: ['Just now', 'Today', 'Yesterday', 'Few days ago', 'Week ago', 'Longer'],
      nextPhase: 'hpi-development',
      aiThinking: 'Recording chief complaint and transitioning to HPI development',
    },
    'hpi-development': {
      message: `I understand. Now let me ask about the characteristics of your symptoms.\n\n<strong>On a scale of 1-10, how severe is your symptom right now?</strong> (1 = barely noticeable, 10 = worst imaginable)`,
      quickReplies: ['1-3 (Mild)', '4-6 (Moderate)', '7-9 (Severe)', '10 (Worst ever)'],
      nextPhase: 'hpi-development',
      aiThinking: 'Gathering HPI details - onset recorded, now assessing severity',
    },
    'review-of-systems': {
      message: `Now I'll ask about other symptoms you might be experiencing.\n\n<strong>Have you had any fever, chills, or night sweats?</strong>`,
      quickReplies: ['Yes, fever', 'Yes, chills', 'Yes, both', 'No'],
      nextPhase: 'review-of-systems',
      aiThinking: 'Conducting systematic review of systems',
    },
    'medical-history': {
      message: `Let's review your medical background.\n\n<strong>Do you have any chronic medical conditions?</strong> (diabetes, hypertension, heart disease, asthma, etc.)`,
      quickReplies: ['None', 'Diabetes', 'Hypertension', 'Multiple conditions'],
      nextPhase: 'medical-history',
      aiThinking: 'Gathering past medical history',
    },
    'risk-stratification': {
      message: `Almost done! A few final questions.\n\n<strong>Do you have any allergies to medications?</strong>`,
      quickReplies: ['No allergies', 'Yes, have allergies'],
      nextPhase: 'clinical-summary',
      aiThinking: 'Final risk assessment questions',
    },
    'clinical-summary': {
      message: `<strong>Assessment Complete!</strong>\n\nThank you for providing this information. I've compiled a summary for your healthcare provider.\n\n<strong>Chief Complaint:</strong> ${clinicalData.chiefComplaint}\n<strong>Assessment Status:</strong> Ready for provider review\n\nWould you like to review the summary or submit directly?`,
      quickReplies: ['Review Summary', 'Submit to Provider', 'Add More Info'],
      nextPhase: 'clinical-summary',
      aiThinking: 'Assessment complete - generating clinical summary',
    }
  };

  const response = phaseResponses[phase];
  
  // Check for red flags
  const detectedRedFlags: RedFlag[] = [];
  if (hasEmergency) {
    detectedRedFlags.push({
      id: 'rf_emergency',
      name: 'Emergency Symptoms',
      description: 'Potential emergency symptoms detected',
      severity: 'critical',
      requiresEmergency: true,
      recommendation: 'Seek immediate medical attention'
    });
  }

  return {
    ...response,
    urgencyLevel: hasEmergency ? 'high' : 'standard',
    redFlags: detectedRedFlags,
  };
};

export const useChatStore = create<ChatStore>()(
  devtools(
    immer((set, get) => ({
      // Initial State
      messages: [],
      currentPhase: 'chief-complaint',
      isAIProcessing: false,
      urgencyLevel: 'standard',
      redFlags: [],
      clinicalData: {
        chiefComplaint: '',
        hpi: {},
        ros: {},
        pmh: {},
        medications: [],
        allergies: [],
        riskFactors: [],
        redFlags: [],
        assessmentPhase: 'chief-complaint',
      },
      sessionId: null,
      patientId: null,
      showEmergencyModal: false,
      isComplete: false,

      // Actions
      startNewSession: (patientId: string) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        set(state => {
          state.sessionId = sessionId;
          state.patientId = patientId;
          state.messages = [];
          state.currentPhase = 'chief-complaint';
          state.isComplete = false;
        });

        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `<strong>Welcome to COMPASS</strong> 🩺\n\nI'm your AI health assistant. I'll help gather information about your symptoms to share with your healthcare provider.\n\nI'll ask you questions one at a time to understand your condition better. Please answer as accurately as you can.\n\n<strong>What is the main symptom or concern that brings you here today?</strong>`,
          timestamp: new Date().toISOString(),
          metadata: {
            phase: 'chief-complaint',
            quickReplies: ['Chest pain', 'Headache', 'Abdominal pain', 'Breathing problems', 'Pain', 'Other'],
            urgencyLevel: 'standard',
            aiThinking: 'Session started - awaiting chief complaint'
          }
        };

        set(state => {
          state.messages.push(welcomeMessage);
        });
      },

      sendMessage: async (message: string) => {
        const { currentPhase, clinicalData } = get();

        // Add user message
        const userMessage: ChatMessage = {
          id: `msg_user_${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        };

        set(state => {
          state.messages.push(userMessage);
          state.isAIProcessing = true;
          
          // Update clinical data based on phase
          if (state.currentPhase === 'chief-complaint' && !state.clinicalData.chiefComplaint) {
            state.clinicalData.chiefComplaint = message;
          }
        });

        try {
          // Get AI response
          const response = await generateAIResponse(message, currentPhase, clinicalData);

          // Add AI message
          const aiMessage: ChatMessage = {
            id: `msg_ai_${Date.now()}`,
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString(),
            metadata: {
              phase: response.nextPhase,
              quickReplies: response.quickReplies,
              urgencyLevel: response.urgencyLevel,
              aiThinking: response.aiThinking
            }
          };

          set(state => {
            state.messages.push(aiMessage);
            state.currentPhase = response.nextPhase;
            state.urgencyLevel = response.urgencyLevel;
            state.isAIProcessing = false;
            state.clinicalData.assessmentPhase = response.nextPhase;

            // Handle red flags
            if (response.redFlags.length > 0) {
              state.redFlags = [...state.redFlags, ...response.redFlags];
              state.clinicalData.redFlags = response.redFlags.map(rf => rf.name);
              
              // Show emergency modal for critical flags
              if (response.redFlags.some(rf => rf.requiresEmergency)) {
                state.showEmergencyModal = true;
              }
            }

            // Check if complete
            if (response.nextPhase === 'clinical-summary') {
              state.isComplete = true;
            }
          });

        } catch (error) {
          console.error('Error processing message:', error);
          
          const errorMessage: ChatMessage = {
            id: `msg_error_${Date.now()}`,
            role: 'assistant',
            content: 'I apologize, but I encountered an error. Please try again or describe your symptoms differently.',
            timestamp: new Date().toISOString(),
            metadata: {
              quickReplies: ['Try again', 'Start over']
            }
          };

          set(state => {
            state.messages.push(errorMessage);
            state.isAIProcessing = false;
          });
        }
      },

      handleQuickReply: (reply: string) => {
        get().sendMessage(reply);
      },

      setEmergencyModal: (show: boolean) => {
        set(state => {
          state.showEmergencyModal = show;
        });
      },

      handleEmergency: () => {
        const emergencyMessage: ChatMessage = {
          id: `msg_emergency_${Date.now()}`,
          role: 'system',
          content: '🚨 EMERGENCY PROTOCOL ACTIVATED - Please call 911 or go to your nearest emergency room immediately.',
          timestamp: new Date().toISOString()
        };

        set(state => {
          state.messages.push(emergencyMessage);
          state.urgencyLevel = 'high';
          state.showEmergencyModal = false;
        });
      },

      reset: () => {
        set(state => {
          state.messages = [];
          state.currentPhase = 'chief-complaint';
          state.isAIProcessing = false;
          state.urgencyLevel = 'standard';
          state.redFlags = [];
          state.clinicalData = {
            chiefComplaint: '',
            hpi: {},
            ros: {},
            pmh: {},
            medications: [],
            allergies: [],
            riskFactors: [],
            redFlags: [],
            assessmentPhase: 'chief-complaint',
          };
          state.sessionId = null;
          state.patientId = null;
          state.showEmergencyModal = false;
          state.isComplete = false;
        });
      }
    })),
    { name: 'compass-chat-store' }
  )
);
