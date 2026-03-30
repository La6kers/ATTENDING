// ============================================================
// COMPASS Chat Store - Zustand State Management
// apps/patient-portal/store/useChatStore.ts
//
// Manages the COMPASS patient chat interface state including:
// - Chat messages and conversation flow
// - Assessment progress tracking
// - Red flag detection via clinical-services package
// - Integration with XState assessment machine
//
// UPDATED: Uses unified types from @attending/shared/types/chat.types
// ============================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Import unified types from shared
import {
  type DetailedAssessmentPhase,
  type UrgencyLevel,
  type QuickReply,
  type ChatMessage,
  type RedFlag,
  type HPIData,
  type AssessmentData,
  createMessage,
  generateSessionId,
  createAssessmentData,
  createRedFlag,
  calculateUrgencyScore,
  determineUrgencyLevel,
  getPhaseProgress,
} from '@attending/shared/types/chat.types';

// Re-export types for components
export type { DetailedAssessmentPhase as AssessmentPhase, UrgencyLevel, QuickReply, ChatMessage, RedFlag, HPIData, AssessmentData };

// =============================================================================
// Red Flag Detection — Uses shared canonical evaluator (23 rules, offline-first)
// =============================================================================

import { evaluateTextForRedFlags } from '@attending/shared/lib/clinical-ai/redFlagTextEvaluator';

/**
 * Detect red flags using the canonical shared evaluator.
 * Works offline (Tier 0) — hardcoded rules, zero network dependency.
 */
function detectRedFlags(text: string): RedFlag[] {
  const result = evaluateTextForRedFlags(text);
  return result.flags.map(f =>
    createRedFlag(f.name, f.severity === 'critical' ? 'critical' : 'urgent', text, f.category)
  );
}

// =============================================================================
// Phase Configuration
// =============================================================================

interface PhaseConfig {
  question: string;
  quickReplies?: QuickReply[];
  nextPhase: DetailedAssessmentPhase;
}

const PHASE_CONFIG: Record<DetailedAssessmentPhase, PhaseConfig> = {
  welcome: {
    question: "Hello! I'm COMPASS, your clinical assessment assistant. I'll help gather information about your symptoms to share with your healthcare provider. Let's start - what's your first name?",
    nextPhase: 'demographics',
  },
  demographics: {
    question: 'Thanks! To help us provide better care, could you confirm your date of birth?',
    nextPhase: 'chiefComplaint',
  },
  chiefComplaint: {
    question: 'What brings you in today? Please describe your main concern or symptoms.',
    nextPhase: 'hpiOnset',
  },
  hpiOnset: {
    question: 'When did this start? Was it sudden or gradual?',
    quickReplies: [
      { id: 'today', text: 'Today', value: 'Started today' },
      { id: 'yesterday', text: 'Yesterday', value: 'Started yesterday' },
      { id: 'few_days', text: 'Few days ago', value: 'Started a few days ago' },
      { id: 'week', text: 'About a week', value: 'Started about a week ago' },
      { id: 'longer', text: 'More than a week', value: 'Started more than a week ago' },
    ],
    nextPhase: 'hpiLocation',
  },
  hpiLocation: {
    question: 'Where exactly is the problem located? Does it stay in one place or move around?',
    nextPhase: 'hpiDuration',
  },
  hpiDuration: {
    question: 'When the symptoms occur, how long do they last?',
    quickReplies: [
      { id: 'seconds', text: 'Seconds', value: 'Lasts seconds' },
      { id: 'minutes', text: 'Minutes', value: 'Lasts minutes' },
      { id: 'hours', text: 'Hours', value: 'Lasts hours' },
      { id: 'constant', text: 'Constant', value: 'Constant/continuous' },
      { id: 'comes_goes', text: 'Comes and goes', value: 'Intermittent' },
    ],
    nextPhase: 'hpiCharacter',
  },
  hpiCharacter: {
    question: "How would you describe what you're feeling? (e.g., sharp, dull, throbbing, burning, aching)",
    nextPhase: 'hpiSeverity',
  },
  hpiSeverity: {
    question: 'On a scale of 0-10, with 10 being the worst, how would you rate the severity?',
    quickReplies: [
      { id: 's1', text: '1-3 Mild', value: '2' },
      { id: 's2', text: '4-5 Moderate', value: '5' },
      { id: 's3', text: '6-7 Significant', value: '7' },
      { id: 's4', text: '8-9 Severe', value: '9', variant: 'warning' },
      { id: 's5', text: '10 Worst ever', value: '10', variant: 'danger' },
    ],
    nextPhase: 'hpiTiming',
  },
  hpiTiming: {
    question: 'Is it constant or does it come and go? When is it worse?',
    nextPhase: 'hpiContext',
  },
  hpiContext: {
    question: 'What were you doing when this started? Any triggering events?',
    nextPhase: 'hpiModifying',
  },
  hpiModifying: {
    question: 'What makes it worse or better? (movement, rest, medications, etc.)',
    nextPhase: 'hpiAggravating',
  },
  hpiAggravating: {
    question: 'What makes it worse? (movement, eating, breathing, lying down, etc.)',
    nextPhase: 'hpiRelieving',
  },
  hpiRelieving: {
    question: 'What makes it better? (rest, medication, position change, etc.)',
    nextPhase: 'hpiAssociated',
  },
  hpiAssociated: {
    question: 'Are you experiencing any other symptoms along with this? (nausea, fever, dizziness, etc.)',
    nextPhase: 'medications',
  },
  reviewOfSystems: {
    question: 'Let me ask about other body systems. Have you had any recent issues with vision, hearing, breathing, heart, digestion, urination, or skin?',
    nextPhase: 'medications',
  },
  medications: {
    question: 'What medications are you currently taking? Please include prescription, over-the-counter, and supplements.',
    quickReplies: [{ id: 'none', text: 'No medications', value: 'No current medications' }],
    nextPhase: 'allergies',
  },
  allergies: {
    question: 'Do you have any known allergies to medications, foods, or environmental factors?',
    quickReplies: [{ id: 'nkda', text: 'No known allergies', value: 'NKDA - No known drug allergies' }],
    nextPhase: 'medicalHistory',
  },
  medicalHistory: {
    question: 'Do you have any chronic medical conditions or past medical history I should know about?',
    quickReplies: [{ id: 'none', text: 'No significant history', value: 'No significant past medical history' }],
    nextPhase: 'socialHistory',
  },
  socialHistory: {
    question: 'A few lifestyle questions: Do you use tobacco, alcohol, or other substances?',
    quickReplies: [
      { id: 'none', text: 'None', value: 'No tobacco, alcohol, or drug use' },
      { id: 'former', text: 'Former smoker', value: 'Former tobacco use' },
      { id: 'social', text: 'Social drinker', value: 'Social alcohol use only' },
    ],
    nextPhase: 'familyHistory',
  },
  familyHistory: {
    question: 'Is there any significant family medical history? (heart disease, cancer, diabetes, etc.)',
    quickReplies: [{ id: 'none', text: 'None known', value: 'No significant family history' }],
    nextPhase: 'riskAssessment',
  },
  riskAssessment: {
    question: 'Is there anything else you think is important for your healthcare provider to know?',
    quickReplies: [{ id: 'nothing', text: 'Nothing else', value: 'No additional information' }],
    nextPhase: 'summary',
  },
  summary: {
    question: "Thank you for providing this information. Let me summarize what you've shared, then we'll send this to your healthcare provider for review.",
    nextPhase: 'providerHandoff',
  },
  providerHandoff: {
    question: 'Your assessment is being reviewed by our clinical team. Please stay available for any follow-up questions.',
    nextPhase: 'complete',
  },
  emergency: {
    question: '🚨 EMERGENCY: Please call 911 immediately. Your symptoms indicate a potential medical emergency.',
    nextPhase: 'complete',
  },
  complete: {
    question: 'Your assessment has been submitted. A provider will review your information shortly. If your condition worsens or you experience any emergency symptoms, please call 911 immediately.',
    nextPhase: 'complete',
  },
  completed: {
    question: 'Your assessment has been completed. Thank you for using COMPASS.',
    nextPhase: 'completed',
  },
};

// =============================================================================
// Store Interface
// =============================================================================

interface ChatState {
  // Session
  sessionId: string;
  isInitialized: boolean;

  // Messages
  messages: ChatMessage[];

  // Assessment Progress
  currentPhase: DetailedAssessmentPhase;
  assessmentData: AssessmentData;

  // Urgency & Red Flags
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  redFlags: RedFlag[];

  // UI State
  isAIProcessing: boolean;
  showEmergencyModal: boolean;
  hpiFormat: 'bulleted' | 'oldcarts';
  error: string | null;

  // Actions
  initializeSession: () => void;
  sendMessage: (content: string) => Promise<void>;
  handleQuickReply: (reply: QuickReply) => Promise<void>;
  setEmergencyModal: (show: boolean) => void;
  setHpiFormat: (format: 'bulleted' | 'oldcarts') => void;
  handleEmergency: () => void;
  submitAssessment: () => Promise<void>;
  resetSession: () => void;

  // Getters
  getAssessmentSummary: () => string;
  getProgress: () => number;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        sessionId: '',
        isInitialized: false,
        messages: [],
        currentPhase: 'welcome' as DetailedAssessmentPhase,
        assessmentData: createAssessmentData(''),
        urgencyLevel: 'standard' as UrgencyLevel,
        urgencyScore: 0,
        redFlags: [],
        isAIProcessing: false,
        showEmergencyModal: false,
        hpiFormat: 'bulleted' as 'bulleted' | 'oldcarts',
        error: null,

        // =======================================================================
        // Initialize Session
        // =======================================================================
        initializeSession: () => {
          const sessionId = generateSessionId();
          const welcomeConfig = PHASE_CONFIG.welcome;

          set((state) => {
            state.sessionId = sessionId;
            state.isInitialized = true;
            state.assessmentData = createAssessmentData(sessionId);
            state.messages = [
              createMessage('assistant', welcomeConfig.question, {
                phase: 'welcome',
                quickReplies: welcomeConfig.quickReplies,
              }),
            ];
          });
        },

        // =======================================================================
        // Send Message
        // =======================================================================
        sendMessage: async (content: string) => {
          const { currentPhase } = get();

          // Add user message
          const userMessage = createMessage('user', content, { phase: currentPhase });

          set((state) => {
            state.messages.push(userMessage);
            state.isAIProcessing = true;
          });

          // Check for red flags using clinical services or fallback
          const newRedFlags = detectRedFlags(content);
          if (newRedFlags.length > 0) {
            set((state) => {
              state.redFlags.push(...newRedFlags);
              state.urgencyScore = calculateUrgencyScore(state.redFlags, state.assessmentData.hpi.severity);
              state.urgencyLevel = determineUrgencyLevel(state.urgencyScore, false);
            });

            // Show emergency modal for critical flags
            if (newRedFlags.some((f) => f.severity === 'critical')) {
              set({ showEmergencyModal: true });
            }
          }

          // Process response and update assessment data
          set((state) => {
            switch (currentPhase) {
              case 'welcome':
                state.assessmentData.patientName = content;
                break;
              case 'demographics':
                state.assessmentData.dateOfBirth = content;
                break;
              case 'chiefComplaint':
                state.assessmentData.chiefComplaint = content;
                break;
              case 'hpiOnset':
                state.assessmentData.hpi.onset = content;
                break;
              case 'hpiLocation':
                state.assessmentData.hpi.location = content;
                break;
              case 'hpiDuration':
                state.assessmentData.hpi.duration = content;
                break;
              case 'hpiCharacter':
                state.assessmentData.hpi.character = content;
                break;
              case 'hpiSeverity': {
                const severity = parseInt(content) || 5;
                state.assessmentData.hpi.severity = severity;
                state.urgencyScore = calculateUrgencyScore(state.redFlags, severity);
                state.urgencyLevel = determineUrgencyLevel(state.urgencyScore, false);
                break;
              }
              case 'hpiTiming':
                state.assessmentData.hpi.timing = content;
                break;
              case 'hpiContext':
                // Store context in associated symptoms or a dedicated field
                break;
              case 'hpiModifying':
              case 'hpiAggravating':
                state.assessmentData.hpi.aggravating = [content];
                break;
              case 'hpiRelieving':
                state.assessmentData.hpi.relieving = [content];
                break;
              case 'hpiAssociated':
                state.assessmentData.hpi.associated = content.split(',').map((s) => s.trim());
                break;
              case 'medications':
                state.assessmentData.medications = content.toLowerCase().includes('no') ? [] : [content];
                break;
              case 'allergies':
                state.assessmentData.allergies = content.toLowerCase().includes('no') ? ['NKDA'] : [content];
                break;
              case 'medicalHistory':
                state.assessmentData.medicalHistory = content.toLowerCase().includes('no') ? [] : [content];
                break;
              case 'socialHistory':
                state.assessmentData.socialHistory = { smoking: content };
                break;
              case 'familyHistory':
                state.assessmentData.familyHistory = content.toLowerCase().includes('no') ? [] : [content];
                break;
            }
          });

          // Simulate AI processing delay
          await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

          // Move to next phase and add assistant response
          const phaseConfig = PHASE_CONFIG[currentPhase];
          const nextPhase = phaseConfig.nextPhase;
          const nextConfig = PHASE_CONFIG[nextPhase];

          set((state) => {
            state.currentPhase = nextPhase;
            state.isAIProcessing = false;

            // Add contextual response if at summary
            if (nextPhase === 'summary') {
              const summary = get().getAssessmentSummary();
              state.messages.push(
                createMessage('assistant', `${nextConfig.question}\n\n**Assessment Summary:**\n${summary}`, {
                  phase: nextPhase,
                  quickReplies: [
                    { id: 'submit', text: '✓ Submit to Provider', value: 'submit', variant: 'success' },
                    { id: 'edit', text: '✏️ Make Changes', value: 'edit' },
                  ],
                })
              );
            } else {
              state.messages.push(
                createMessage('assistant', nextConfig.question, {
                  phase: nextPhase,
                  quickReplies: nextConfig.quickReplies,
                })
              );
            }
          });
        },

        // =======================================================================
        // Handle Quick Reply
        // =======================================================================
        handleQuickReply: async (reply: QuickReply) => {
          if (reply.value === 'submit') {
            await get().submitAssessment();
          } else {
            await get().sendMessage(reply.value || reply.text);
          }
        },

        // =======================================================================
        // Emergency Modal
        // =======================================================================
        setEmergencyModal: (show: boolean) => set({ showEmergencyModal: show }),
        setHpiFormat: (format: 'bulleted' | 'oldcarts') => set({ hpiFormat: format }),

        handleEmergency: () => {
          set((state) => {
            state.urgencyLevel = 'emergency';
            state.urgencyScore = 100;
            state.showEmergencyModal = false;

            // Add emergency acknowledgment message
            state.messages.push(
              createMessage(
                'system',
                '🚨 EMERGENCY ALERT: Please call 911 immediately or go to the nearest emergency room. Your assessment has been flagged for urgent provider review.',
                { isRedFlag: true, urgencyTrigger: true, isEmergency: true }
              )
            );
          });

          // Submit assessment immediately
          get().submitAssessment();
        },

        // =======================================================================
        // Submit Assessment
        // =======================================================================
        submitAssessment: async () => {
          const { sessionId, assessmentData, redFlags, urgencyLevel, urgencyScore, messages } = get();

          set({ isAIProcessing: true });

          try {
            const payload = {
              ...assessmentData,
              redFlags: redFlags.map((rf) => rf.symptom),
              urgencyLevel,
              urgencyScore,
              conversationHistory: messages.map((m) => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
              })),
              submittedAt: new Date().toISOString(),
            };

            // Submit to API
            const response = await fetch('/api/assessments/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              throw new Error('Failed to submit assessment');
            }

            set((state) => {
              state.currentPhase = 'complete';
              state.isAIProcessing = false;
              state.messages.push(createMessage('assistant', PHASE_CONFIG.complete.question, { phase: 'complete' }));
            });

            // Real-time notification is handled server-side after the POST succeeds.
            // The backend SignalR hub broadcasts AssessmentNew to connected providers.
          } catch (error) {
            set((state) => {
              state.isAIProcessing = false;
              state.error = error instanceof Error ? error.message : 'Submission failed';
              state.messages.push(
                createMessage(
                  'system',
                  '⚠️ There was an error submitting your assessment. Please try again or contact the clinic directly.'
                )
              );
            });
          }
        },

        // =======================================================================
        // Reset Session
        // =======================================================================
        resetSession: () => {
          set({
            sessionId: '',
            isInitialized: false,
            messages: [],
            currentPhase: 'welcome' as DetailedAssessmentPhase,
            assessmentData: createAssessmentData(''),
            urgencyLevel: 'standard' as UrgencyLevel,
            urgencyScore: 0,
            redFlags: [],
            isAIProcessing: false,
            showEmergencyModal: false,
            error: null,
          });
        },

        // =======================================================================
        // Get Progress
        // =======================================================================
        getProgress: () => {
          return getPhaseProgress(get().currentPhase);
        },

        // =======================================================================
        // Get Assessment Summary
        // =======================================================================
        getAssessmentSummary: () => {
          const { assessmentData, redFlags, urgencyLevel, hpiFormat } = get();
          const { chiefComplaint, hpi, medications, allergies, medicalHistory, socialHistory } = assessmentData;

          if (hpiFormat === 'oldcarts') {
            // OLDCARTS structured comprehensive format
            let summary = '';
            if (chiefComplaint) summary += `**Chief Complaint:** ${chiefComplaint}\n\n`;

            summary += `**HISTORY OF PRESENT ILLNESS**\n\n`;
            if (hpi.onset) summary += `**Onset:** ${hpi.onset}\n\n`;
            if (hpi.location) summary += `**Location:** ${hpi.location}\n\n`;
            if (hpi.duration) summary += `**Duration:** ${hpi.duration}\n\n`;
            if (hpi.character) summary += `**Character:** ${hpi.character}\n\n`;
            if (hpi.aggravating?.length) summary += `**Aggravating Factors:** ${hpi.aggravating.join('; ')}\n\n`;
            if (hpi.relieving?.length) summary += `**Relieving Factors:** ${hpi.relieving.join('; ')}\n\n`;
            if (hpi.timing) summary += `**Timing:** ${hpi.timing}\n\n`;
            if (hpi.severity) summary += `**Severity:** ${hpi.severity}/10 on pain scale\n\n`;
            if (hpi.associated?.length) summary += `**Associated Symptoms:** ${hpi.associated.join(', ')}\n\n`;

            summary += `**Past Medical History:** ${medicalHistory.length > 0 ? medicalHistory.join(', ') : 'None reported'}\n`;
            summary += `**Medications:** ${medications.length > 0 ? medications.join(', ') : 'None reported'}\n`;
            summary += `**Allergies:** ${allergies.length > 0 ? allergies.join(', ') : 'NKDA'}\n`;
            if (socialHistory) summary += `**Social History:** ${typeof socialHistory === 'string' ? socialHistory : (socialHistory as any).smoking || 'Not reported'}\n`;

            if (redFlags.length > 0) {
              summary += `\n⚠️ **Red Flags Detected:** ${redFlags.map((rf) => rf.symptom).join(', ')}\n`;
            }
            summary += `\n**Urgency Level:** ${urgencyLevel.toUpperCase()}`;
            return summary;
          }

          // Bulleted simple symptom list (default)
          let summary = '';
          if (chiefComplaint) summary += `**Chief Complaint:** ${chiefComplaint}\n\n`;

          summary += `**Symptoms:**\n`;
          if (chiefComplaint) summary += `• ${chiefComplaint}`;
          if (hpi.severity) summary += ` — ${hpi.severity}/10`;
          if (hpi.onset) summary += `, ${hpi.onset.toLowerCase()}`;
          summary += '\n';
          if (hpi.associated?.length) {
            hpi.associated.forEach(s => { summary += `• ${s}\n`; });
          }

          summary += `\n**Medications:** ${medications.length > 0 ? medications.join(', ') : 'None reported'}\n`;
          summary += `**Allergies:** ${allergies.length > 0 ? allergies.join(', ') : 'NKDA'}\n`;

          if (redFlags.length > 0) {
            summary += `\n⚠️ **Red Flags Detected:** ${redFlags.map((rf) => rf.symptom).join(', ')}\n`;
          }
          summary += `\n**Urgency Level:** ${urgencyLevel.toUpperCase()}`;
          return summary;
        },
      })),
      {
        name: 'compass-chat-storage',
        partialize: (state) => ({
          sessionId: state.sessionId,
          assessmentData: state.assessmentData,
          redFlags: state.redFlags,
          urgencyLevel: state.urgencyLevel,
        }),
      }
    ),
    { name: 'compass-chat-store' }
  )
);

export default useChatStore;
