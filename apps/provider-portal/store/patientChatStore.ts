// Zustand store for patient chat state management

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  ClinicalData, 
  BioMistralResponse, 
  AssessmentPhase,
  Diagnosis,
  ClinicalSummary,
  UrgencyLevel
} from '@/types/medical';
import { ProviderChatMessage, ProviderChatSession, AIStatus } from '@/types/chat';
import { bioMistralService } from '@/services/biomistral/BioMistralService';

interface PatientChatStore {
  // Chat state
  messages: ProviderChatMessage[];
  currentPhase: AssessmentPhase;
  isAIProcessing: boolean;
  aiStatus: AIStatus;
  
  // Clinical data
  clinicalData: ClinicalData;
  differentialDiagnosis: Diagnosis[];
  riskScore: number;
  urgencyLevel: UrgencyLevel;
  
  // Session management
  currentSession: ProviderChatSession | null;
  sessionHistory: ProviderChatSession[];
  
  // UI state
  showEmergencyModal: boolean;
  showClinicalSummary: boolean;
  isTyping: boolean;
  
  // Actions - Chat operations
  sendMessage: (message: string) => Promise<void>;
  processAIResponse: (response: BioMistralResponse) => void;
  addMessage: (message: ProviderChatMessage) => void;
  clearChat: () => void;
  
  // Actions - Clinical data operations
  updateClinicalData: (data: Partial<ClinicalData>) => void;
  updatePhase: (phase: AssessmentPhase) => void;
  updateUrgencyLevel: (level: UrgencyLevel) => void;
  addDiagnosis: (diagnosis: Diagnosis) => void;
  
  // Actions - Summary operations
  generateSummary: () => Promise<ClinicalSummary>;
  submitToProvider: () => Promise<void>;
  
  // Actions - Session operations
  startNewSession: (patientId: string) => void;
  endSession: () => void;
  loadSession: (sessionId: string) => void;
  
  // Actions - UI operations
  setAIProcessing: (processing: boolean) => void;
  setEmergencyModal: (show: boolean) => void;
  setClinicalSummaryView: (show: boolean) => void;
  setTyping: (typing: boolean) => void;
  updateAIStatus: (status: Partial<AIStatus>) => void;
  
  // Actions - Emergency
  handleEmergency: (type: string) => void;
}

export const usePatientChatStore = create<PatientChatStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      messages: [],
      currentPhase: 'chief-complaint',
      isAIProcessing: false,
      aiStatus: {
        isProcessing: false,
        currentAction: 'Ready',
        lastUpdate: new Date().toISOString()
      },
      
      clinicalData: bioMistralService.getClinicalData(),
      differentialDiagnosis: [],
      riskScore: 0,
      urgencyLevel: 'standard',
      
      currentSession: null,
      sessionHistory: [],
      
      showEmergencyModal: false,
      showClinicalSummary: false,
      isTyping: false,
      
      // Chat operations
      sendMessage: async (message: string) => {
        set(state => {
          state.isAIProcessing = true;
          state.aiStatus = {
            isProcessing: true,
            currentAction: 'Analyzing medical context...',
            lastUpdate: new Date().toISOString()
          };
        });
        
        try {
          // Add user message
          const userMessage: ProviderChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
          };
          
          get().addMessage(userMessage);
          
          // Process with BioMistral
          const response = await bioMistralService.processPatientInput(message);
          
          // Process AI response
          get().processAIResponse(response);
          
        } catch (error) {
          console.error('Error sending message:', error);
          set(state => {
            state.isAIProcessing = false;
            state.aiStatus = {
              isProcessing: false,
              error: 'Failed to process message',
              lastUpdate: new Date().toISOString()
            };
          });
          
          // Add error message
          const errorMessage: ProviderChatMessage = {
            id: `msg-error-${Date.now()}`,
            role: 'assistant',
            content: "I apologize, but I encountered an error. Please try again or contact support if the issue persists.",
            timestamp: new Date().toISOString()
          };
          
          get().addMessage(errorMessage);
        }
      },
      
      processAIResponse: (response: BioMistralResponse) => {
        set(state => {
          // Add AI message
          const aiMessage: ProviderChatMessage = {
            id: `msg-ai-${Date.now()}`,
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString(),
            metadata: {
              phase: response.nextPhase,
              urgencyLevel: response.urgencyLevel,
              quickReplies: response.quickReplies,
              medicalSuggestions: response.medicalSuggestions,
              aiThinking: response.aiThinking,
              clinicalData: response.clinicalExtraction
            }
          };
          
          state.messages.push(aiMessage);
          
          // Update phase
          state.currentPhase = response.nextPhase;
          
          // Update urgency level
          state.urgencyLevel = response.urgencyLevel;
          
          // Update clinical data from service
          state.clinicalData = bioMistralService.getClinicalData();
          state.differentialDiagnosis = bioMistralService.getDifferentialDiagnosis();
          
          // Update AI status
          state.isAIProcessing = false;
          state.aiStatus = {
            isProcessing: false,
            currentAction: 'Medical AI Ready',
            lastUpdate: new Date().toISOString()
          };
          
          // Check if assessment is complete
          if (response.nextPhase === 'clinical-summary' && 
              state.messages.filter(m => m.metadata?.phase === 'clinical-summary').length > 1) {
            state.showClinicalSummary = true;
          }
        });
      },
      
      addMessage: (message: ProviderChatMessage) => {
        set(state => {
          state.messages.push(message);
          
          // Update session if active
          if (state.currentSession) {
            state.currentSession.messages.push(message);
          }
        });
      },
      
      clearChat: () => {
        set(state => {
          state.messages = [];
          state.currentPhase = 'chief-complaint';
          state.clinicalData = bioMistralService.getClinicalData();
          state.differentialDiagnosis = [];
          state.riskScore = 0;
          state.urgencyLevel = 'standard';
          state.showClinicalSummary = false;
        });
        
        // Reset BioMistral service
        bioMistralService.reset();
      },
      
      // Clinical data operations
      updateClinicalData: (data: Partial<ClinicalData>) => {
        set(state => {
          state.clinicalData = { ...state.clinicalData, ...data };
        });
      },
      
      updatePhase: (phase: AssessmentPhase) => {
        set(state => {
          state.currentPhase = phase;
          state.clinicalData.assessmentPhase = phase;
        });
      },
      
      updateUrgencyLevel: (level: UrgencyLevel) => {
        set(state => {
          state.urgencyLevel = level;
        });
      },
      
      addDiagnosis: (diagnosis: Diagnosis) => {
        set(state => {
          const existing = state.differentialDiagnosis.find(d => d.name === diagnosis.name);
          if (!existing) {
            state.differentialDiagnosis.push(diagnosis);
          }
        });
      },
      
      // Summary operations
      generateSummary: async () => {
        set(state => {
          state.isAIProcessing = true;
          state.aiStatus = {
            isProcessing: true,
            currentAction: 'Generating clinical summary...',
            lastUpdate: new Date().toISOString()
          };
        });
        
        try {
          const summary = await bioMistralService.generateClinicalSummary();
          
          set(state => {
            state.isAIProcessing = false;
            state.aiStatus = {
              isProcessing: false,
              currentAction: 'Summary generated',
              lastUpdate: new Date().toISOString()
            };
          });
          
          return summary;
        } catch (error) {
          console.error('Error generating summary:', error);
          set(state => {
            state.isAIProcessing = false;
            state.aiStatus = {
              isProcessing: false,
              error: 'Failed to generate summary',
              lastUpdate: new Date().toISOString()
            };
          });
          throw error;
        }
      },
      
      submitToProvider: async () => {
        set(state => {
          state.isAIProcessing = true;
          state.aiStatus = {
            isProcessing: true,
            currentAction: 'Submitting to provider...',
            lastUpdate: new Date().toISOString()
          };
        });
        
        try {
          // Generate summary
          const summary = await get().generateSummary();
          
          // In production, this would send to the provider portal
          console.log('Submitting summary to provider:', summary);
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          set(state => {
            state.isAIProcessing = false;
            state.aiStatus = {
              isProcessing: false,
              currentAction: 'Submitted successfully',
              lastUpdate: new Date().toISOString()
            };
            
            // End current session
            if (state.currentSession) {
              state.currentSession.isComplete = true;
              state.currentSession.endTime = new Date().toISOString();
              state.currentSession.clinicalSummaryId = `summary-${Date.now()}`;
            }
          });
          
        } catch (error) {
          console.error('Error submitting to provider:', error);
          set(state => {
            state.isAIProcessing = false;
            state.aiStatus = {
              isProcessing: false,
              error: 'Failed to submit to provider',
              lastUpdate: new Date().toISOString()
            };
          });
          throw error;
        }
      },
      
      // Session operations
      startNewSession: (patientId: string) => {
        const session: ProviderChatSession = {
          id: `session-${Date.now()}`,
          patientId,
          startTime: new Date().toISOString(),
          messages: [],
          currentPhase: 'chief-complaint',
          isComplete: false
        };
        
        set(state => {
          state.currentSession = session;
          state.sessionHistory.push(session);
        });
        
        // Add welcome message
        const welcomeMessage: ProviderChatMessage = {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: `Welcome! I'm BioMistral-7B, your medical AI assistant. I'll conduct a comprehensive clinical interview to gather your symptoms and medical history for your healthcare provider.

I'll ask you questions one at a time to thoroughly understand your condition. Please provide as much detail as you can.

Let's begin with your primary concern. <strong>What is the main symptom or issue that brings you in today?</strong>`,
          timestamp: new Date().toISOString(),
          metadata: {
            phase: 'chief-complaint',
            quickReplies: ['Chest pain', 'Headache', 'Abdominal pain', 'Breathing problems', 'Pain', 'Other symptoms'],
            medicalSuggestions: ['Multiple symptoms', 'Follow-up visit', 'Medication concerns']
          }
        };
        
        get().addMessage(welcomeMessage);
      },
      
      endSession: () => {
        set(state => {
          if (state.currentSession) {
            state.currentSession.endTime = new Date().toISOString();
            state.currentSession.isComplete = true;
          }
          state.currentSession = null;
        });
      },
      
      loadSession: (sessionId: string) => {
        set(state => {
          const session = state.sessionHistory.find(s => s.id === sessionId);
          if (session) {
            state.currentSession = session;
            state.messages = [...session.messages];
            state.currentPhase = session.currentPhase;
          }
        });
      },
      
      // UI operations
      setAIProcessing: (processing: boolean) => {
        set(state => {
          state.isAIProcessing = processing;
        });
      },
      
      setEmergencyModal: (show: boolean) => {
        set(state => {
          state.showEmergencyModal = show;
        });
      },
      
      setClinicalSummaryView: (show: boolean) => {
        set(state => {
          state.showClinicalSummary = show;
        });
      },
      
      setTyping: (typing: boolean) => {
        set(state => {
          state.isTyping = typing;
        });
      },
      
      updateAIStatus: (status: Partial<AIStatus>) => {
        set(state => {
          state.aiStatus = { ...state.aiStatus, ...status };
        });
      },
      
      // Emergency operations
      handleEmergency: (type: string) => {
        console.log('Emergency type:', type);
        
        // Add emergency message
        const emergencyMessage: ProviderChatMessage = {
          id: `msg-emergency-${Date.now()}`,
          role: 'system',
          content: `🚨 Emergency protocol activated. Type: ${type}. Please follow the emergency instructions provided.`,
          timestamp: new Date().toISOString()
        };
        
        get().addMessage(emergencyMessage);
        
        // In production, this would trigger emergency protocols
        set(state => {
          state.urgencyLevel = 'high';
          state.showEmergencyModal = false;
        });
      }
    }))
  )
);
