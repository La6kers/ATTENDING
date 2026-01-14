// ============================================================
// COMPASS Chat Store - Zustand State Management
// apps/patient-portal/store/useChatStore.ts
//
// Manages the COMPASS patient chat interface state including:
// - Chat messages and conversation flow
// - Assessment progress tracking
// - Red flag detection and urgency
// - Integration with XState assessment machine
// ============================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// =============================================================================
// Types
// =============================================================================

export type AssessmentPhase = 
  | 'welcome'
  | 'demographics'
  | 'chief_complaint'
  | 'hpi_onset'
  | 'hpi_location'
  | 'hpi_duration'
  | 'hpi_character'
  | 'hpi_severity'
  | 'hpi_aggravating'
  | 'hpi_relieving'
  | 'hpi_associated'
  | 'review_of_systems'
  | 'medications'
  | 'allergies'
  | 'medical_history'
  | 'social_history'
  | 'family_history'
  | 'summary'
  | 'complete';

export type UrgencyLevel = 'standard' | 'moderate' | 'high' | 'emergency';

export interface QuickReply {
  id: string;
  label: string;
  value: string;
  category?: string;
}

export interface MessageMetadata {
  phase?: AssessmentPhase;
  quickReplies?: QuickReply[];
  isRedFlag?: boolean;
  urgencyTrigger?: boolean;
  aiConfidence?: number;
  clinicalNote?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface RedFlag {
  id: string;
  symptom: string;
  severity: 'warning' | 'urgent' | 'critical';
  detectedAt: Date;
  context: string;
}

export interface HPIData {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: number;
  aggravating?: string[];
  relieving?: string[];
  associated?: string[];
  timing?: string;
}

export interface AssessmentData {
  sessionId: string;
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
  chiefComplaint?: string;
  hpi: HPIData;
  reviewOfSystems: Record<string, string[]>;
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  surgicalHistory: string[];
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingSituation?: string;
  };
  familyHistory: string[];
}

// =============================================================================
// Red Flag Detection Patterns
// =============================================================================

const RED_FLAG_PATTERNS = [
  { pattern: /chest pain|chest tightness|pressure in chest/i, severity: 'critical' as const, flag: 'Cardiac symptoms' },
  { pattern: /can'?t breathe|shortness of breath|difficulty breathing|sob/i, severity: 'critical' as const, flag: 'Respiratory distress' },
  { pattern: /worst headache|thunderclap|sudden severe headache/i, severity: 'critical' as const, flag: 'Severe headache - rule out SAH' },
  { pattern: /sudden weakness|face droop|slurred speech|can'?t move/i, severity: 'critical' as const, flag: 'Stroke symptoms' },
  { pattern: /suicid|kill myself|end my life|want to die/i, severity: 'critical' as const, flag: 'Suicidal ideation - psychiatric emergency' },
  { pattern: /blood in stool|vomiting blood|black stool|melena/i, severity: 'urgent' as const, flag: 'GI bleeding' },
  { pattern: /severe abdominal pain|rigid abdomen/i, severity: 'urgent' as const, flag: 'Acute abdomen' },
  { pattern: /allergic reaction|throat swelling|anaphylaxis/i, severity: 'critical' as const, flag: 'Anaphylaxis' },
  { pattern: /fever.*(\d{3}|104|105)|very high fever/i, severity: 'urgent' as const, flag: 'High fever' },
  { pattern: /unconscious|passed out|fainted|syncope/i, severity: 'urgent' as const, flag: 'Syncope/LOC' },
  { pattern: /pregnant.*bleeding|vaginal bleeding.*pregnant/i, severity: 'critical' as const, flag: 'Pregnancy bleeding' },
  { pattern: /numbness.*face|numbness.*arm|numbness.*leg/i, severity: 'urgent' as const, flag: 'Neurological symptoms' },
  { pattern: /vision loss|sudden blind|can'?t see/i, severity: 'urgent' as const, flag: 'Vision loss' },
  { pattern: /seizure|convulsion/i, severity: 'urgent' as const, flag: 'Seizure activity' },
];

function detectRedFlags(text: string): RedFlag[] {
  const flags: RedFlag[] = [];
  
  RED_FLAG_PATTERNS.forEach(({ pattern, severity, flag }) => {
    if (pattern.test(text)) {
      flags.push({
        id: `rf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symptom: flag,
        severity,
        detectedAt: new Date(),
        context: text.substring(0, 100),
      });
    }
  });
  
  return flags;
}

// =============================================================================
// Phase Configuration
// =============================================================================

const PHASE_CONFIG: Record<AssessmentPhase, {
  question: string;
  quickReplies?: QuickReply[];
  nextPhase: AssessmentPhase;
}> = {
  welcome: {
    question: "Hello! I'm COMPASS, your clinical assessment assistant. I'll help gather information about your symptoms to share with your healthcare provider. Let's start - what's your first name?",
    nextPhase: 'demographics',
  },
  demographics: {
    question: "Thanks! To help us provide better care, could you confirm your date of birth?",
    nextPhase: 'chief_complaint',
  },
  chief_complaint: {
    question: "What brings you in today? Please describe your main concern or symptoms.",
    nextPhase: 'hpi_onset',
  },
  hpi_onset: {
    question: "When did this start? Was it sudden or gradual?",
    quickReplies: [
      { id: 'today', label: 'Today', value: 'Started today' },
      { id: 'yesterday', label: 'Yesterday', value: 'Started yesterday' },
      { id: 'few_days', label: 'Few days ago', value: 'Started a few days ago' },
      { id: 'week', label: 'About a week', value: 'Started about a week ago' },
      { id: 'longer', label: 'More than a week', value: 'Started more than a week ago' },
    ],
    nextPhase: 'hpi_location',
  },
  hpi_location: {
    question: "Where exactly is the problem located? Does it stay in one place or move around?",
    nextPhase: 'hpi_duration',
  },
  hpi_duration: {
    question: "When the symptoms occur, how long do they last?",
    quickReplies: [
      { id: 'seconds', label: 'Seconds', value: 'Lasts seconds' },
      { id: 'minutes', label: 'Minutes', value: 'Lasts minutes' },
      { id: 'hours', label: 'Hours', value: 'Lasts hours' },
      { id: 'constant', label: 'Constant', value: 'Constant/continuous' },
      { id: 'comes_goes', label: 'Comes and goes', value: 'Intermittent' },
    ],
    nextPhase: 'hpi_character',
  },
  hpi_character: {
    question: "How would you describe what you're feeling? (e.g., sharp, dull, throbbing, burning, aching)",
    nextPhase: 'hpi_severity',
  },
  hpi_severity: {
    question: "On a scale of 0-10, with 10 being the worst, how would you rate the severity?",
    quickReplies: [
      { id: 's1', label: '1-3 Mild', value: '2' },
      { id: 's2', label: '4-5 Moderate', value: '5' },
      { id: 's3', label: '6-7 Significant', value: '7' },
      { id: 's4', label: '8-9 Severe', value: '9' },
      { id: 's5', label: '10 Worst ever', value: '10' },
    ],
    nextPhase: 'hpi_aggravating',
  },
  hpi_aggravating: {
    question: "What makes it worse? (movement, eating, breathing, lying down, etc.)",
    nextPhase: 'hpi_relieving',
  },
  hpi_relieving: {
    question: "What makes it better? (rest, medication, position change, etc.)",
    nextPhase: 'hpi_associated',
  },
  hpi_associated: {
    question: "Are you experiencing any other symptoms along with this? (nausea, fever, dizziness, etc.)",
    nextPhase: 'medications',
  },
  review_of_systems: {
    question: "Let me ask about other body systems. Have you had any recent issues with vision, hearing, breathing, heart, digestion, urination, or skin?",
    nextPhase: 'medications',
  },
  medications: {
    question: "What medications are you currently taking? Please include prescription, over-the-counter, and supplements.",
    quickReplies: [
      { id: 'none', label: 'No medications', value: 'No current medications' },
    ],
    nextPhase: 'allergies',
  },
  allergies: {
    question: "Do you have any known allergies to medications, foods, or environmental factors?",
    quickReplies: [
      { id: 'nkda', label: 'No known allergies', value: 'NKDA - No known drug allergies' },
    ],
    nextPhase: 'medical_history',
  },
  medical_history: {
    question: "Do you have any chronic medical conditions or past medical history I should know about?",
    quickReplies: [
      { id: 'none', label: 'No significant history', value: 'No significant past medical history' },
    ],
    nextPhase: 'social_history',
  },
  social_history: {
    question: "A few lifestyle questions: Do you use tobacco, alcohol, or other substances?",
    quickReplies: [
      { id: 'none', label: 'None', value: 'No tobacco, alcohol, or drug use' },
      { id: 'former', label: 'Former smoker', value: 'Former tobacco use' },
      { id: 'social', label: 'Social drinker', value: 'Social alcohol use only' },
    ],
    nextPhase: 'family_history',
  },
  family_history: {
    question: "Is there any significant family medical history? (heart disease, cancer, diabetes, etc.)",
    quickReplies: [
      { id: 'none', label: 'None known', value: 'No significant family history' },
    ],
    nextPhase: 'summary',
  },
  summary: {
    question: "Thank you for providing this information. Let me summarize what you've shared, then we'll send this to your healthcare provider for review.",
    nextPhase: 'complete',
  },
  complete: {
    question: "Your assessment has been submitted. A provider will review your information shortly. If your condition worsens or you experience any emergency symptoms, please call 911 immediately.",
    nextPhase: 'complete',
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
  currentPhase: AssessmentPhase;
  assessmentData: AssessmentData;
  
  // Urgency & Red Flags
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  redFlags: RedFlag[];
  
  // UI State
  isAIProcessing: boolean;
  showEmergencyModal: boolean;
  error: string | null;
  
  // Actions
  initializeSession: () => void;
  sendMessage: (content: string) => Promise<void>;
  handleQuickReply: (reply: QuickReply) => Promise<void>;
  setEmergencyModal: (show: boolean) => void;
  handleEmergency: () => void;
  submitAssessment: () => Promise<void>;
  resetSession: () => void;
  
  // Getters
  getAssessmentSummary: () => string;
}

// =============================================================================
// Utility Functions
// =============================================================================

function generateSessionId(): string {
  return `COMPASS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateUrgencyScore(redFlags: RedFlag[], severity?: number): number {
  let score = 0;
  
  // Base score from red flags
  redFlags.forEach(flag => {
    switch (flag.severity) {
      case 'critical': score += 40; break;
      case 'urgent': score += 25; break;
      case 'warning': score += 10; break;
    }
  });
  
  // Add severity score
  if (severity && severity >= 8) score += 20;
  else if (severity && severity >= 6) score += 10;
  
  return Math.min(score, 100);
}

function determineUrgencyLevel(score: number, hasEmergency: boolean): UrgencyLevel {
  if (hasEmergency || score >= 80) return 'emergency';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'standard';
}

// =============================================================================
// Store Implementation
// =============================================================================

const initialAssessmentData: AssessmentData = {
  sessionId: '',
  hpi: {},
  reviewOfSystems: {},
  medications: [],
  allergies: [],
  medicalHistory: [],
  surgicalHistory: [],
  socialHistory: {},
  familyHistory: [],
};

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        sessionId: '',
        isInitialized: false,
        messages: [],
        currentPhase: 'welcome',
        assessmentData: { ...initialAssessmentData },
        urgencyLevel: 'standard',
        urgencyScore: 0,
        redFlags: [],
        isAIProcessing: false,
        showEmergencyModal: false,
        error: null,

        // =======================================================================
        // Initialize Session
        // =======================================================================
        initializeSession: () => {
          const sessionId = generateSessionId();
          const welcomeConfig = PHASE_CONFIG.welcome;
          
          set(state => {
            state.sessionId = sessionId;
            state.isInitialized = true;
            state.assessmentData.sessionId = sessionId;
            state.messages = [{
              id: generateMessageId(),
              role: 'assistant',
              content: welcomeConfig.question,
              timestamp: new Date(),
              metadata: {
                phase: 'welcome',
                quickReplies: welcomeConfig.quickReplies,
              },
            }];
          });
        },

        // =======================================================================
        // Send Message
        // =======================================================================
        sendMessage: async (content: string) => {
          const { currentPhase, redFlags, assessmentData } = get();
          
          // Add user message
          const userMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'user',
            content,
            timestamp: new Date(),
            metadata: { phase: currentPhase },
          };
          
          set(state => {
            state.messages.push(userMessage);
            state.isAIProcessing = true;
          });

          // Check for red flags
          const newRedFlags = detectRedFlags(content);
          if (newRedFlags.length > 0) {
            set(state => {
              state.redFlags.push(...newRedFlags);
              state.urgencyScore = calculateUrgencyScore(state.redFlags, state.assessmentData.hpi.severity);
              state.urgencyLevel = determineUrgencyLevel(state.urgencyScore, false);
            });

            // Show emergency modal for critical flags
            if (newRedFlags.some(f => f.severity === 'critical')) {
              set({ showEmergencyModal: true });
            }
          }

          // Process response and update assessment data
          set(state => {
            switch (currentPhase) {
              case 'welcome':
                state.assessmentData.patientName = content;
                break;
              case 'demographics':
                state.assessmentData.dateOfBirth = content;
                break;
              case 'chief_complaint':
                state.assessmentData.chiefComplaint = content;
                break;
              case 'hpi_onset':
                state.assessmentData.hpi.onset = content;
                break;
              case 'hpi_location':
                state.assessmentData.hpi.location = content;
                break;
              case 'hpi_duration':
                state.assessmentData.hpi.duration = content;
                break;
              case 'hpi_character':
                state.assessmentData.hpi.character = content;
                break;
              case 'hpi_severity':
                const severity = parseInt(content) || 5;
                state.assessmentData.hpi.severity = severity;
                state.urgencyScore = calculateUrgencyScore(state.redFlags, severity);
                state.urgencyLevel = determineUrgencyLevel(state.urgencyScore, false);
                break;
              case 'hpi_aggravating':
                state.assessmentData.hpi.aggravating = [content];
                break;
              case 'hpi_relieving':
                state.assessmentData.hpi.relieving = [content];
                break;
              case 'hpi_associated':
                state.assessmentData.hpi.associated = content.split(',').map(s => s.trim());
                break;
              case 'medications':
                state.assessmentData.medications = content.toLowerCase().includes('no') ? [] : [content];
                break;
              case 'allergies':
                state.assessmentData.allergies = content.toLowerCase().includes('no') ? ['NKDA'] : [content];
                break;
              case 'medical_history':
                state.assessmentData.medicalHistory = content.toLowerCase().includes('no') ? [] : [content];
                break;
              case 'social_history':
                state.assessmentData.socialHistory = { smoking: content };
                break;
              case 'family_history':
                state.assessmentData.familyHistory = content.toLowerCase().includes('no') ? [] : [content];
                break;
            }
          });

          // Simulate AI processing delay
          await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

          // Move to next phase and add assistant response
          const phaseConfig = PHASE_CONFIG[currentPhase];
          const nextPhase = phaseConfig.nextPhase;
          const nextConfig = PHASE_CONFIG[nextPhase];

          set(state => {
            state.currentPhase = nextPhase;
            state.isAIProcessing = false;

            // Add contextual response if at summary
            if (nextPhase === 'summary') {
              const summary = get().getAssessmentSummary();
              state.messages.push({
                id: generateMessageId(),
                role: 'assistant',
                content: `${nextConfig.question}\n\n**Assessment Summary:**\n${summary}`,
                timestamp: new Date(),
                metadata: {
                  phase: nextPhase,
                  quickReplies: [
                    { id: 'submit', label: '✓ Submit to Provider', value: 'submit' },
                    { id: 'edit', label: '✏️ Make Changes', value: 'edit' },
                  ],
                },
              });
            } else {
              state.messages.push({
                id: generateMessageId(),
                role: 'assistant',
                content: nextConfig.question,
                timestamp: new Date(),
                metadata: {
                  phase: nextPhase,
                  quickReplies: nextConfig.quickReplies,
                },
              });
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
            await get().sendMessage(reply.value);
          }
        },

        // =======================================================================
        // Emergency Modal
        // =======================================================================
        setEmergencyModal: (show: boolean) => set({ showEmergencyModal: show }),
        
        handleEmergency: () => {
          set(state => {
            state.urgencyLevel = 'emergency';
            state.urgencyScore = 100;
            state.showEmergencyModal = false;
            
            // Add emergency acknowledgment message
            state.messages.push({
              id: generateMessageId(),
              role: 'system',
              content: '🚨 EMERGENCY ALERT: Please call 911 immediately or go to the nearest emergency room. Your assessment has been flagged for urgent provider review.',
              timestamp: new Date(),
              metadata: { isRedFlag: true, urgencyTrigger: true },
            });
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
            // Note: assessmentData already contains sessionId
            const payload = {
              ...assessmentData,
              redFlags: redFlags.map(rf => rf.symptom),
              urgencyLevel,
              urgencyScore,
              conversationHistory: messages.map(m => ({
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

            const result = await response.json();

            set(state => {
              state.currentPhase = 'complete';
              state.isAIProcessing = false;
              state.messages.push({
                id: generateMessageId(),
                role: 'assistant',
                content: PHASE_CONFIG.complete.question,
                timestamp: new Date(),
                metadata: { phase: 'complete' },
              });
            });

            // Notify via WebSocket (if available)
            if (typeof window !== 'undefined' && (window as any).socket) {
              (window as any).socket.emit('assessment:submit', { 
                assessment: payload,
                sessionId,
              });
            }

          } catch (error) {
            set(state => {
              state.isAIProcessing = false;
              state.error = error instanceof Error ? error.message : 'Submission failed';
              state.messages.push({
                id: generateMessageId(),
                role: 'system',
                content: '⚠️ There was an error submitting your assessment. Please try again or contact the clinic directly.',
                timestamp: new Date(),
              });
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
            currentPhase: 'welcome',
            assessmentData: { ...initialAssessmentData },
            urgencyLevel: 'standard',
            urgencyScore: 0,
            redFlags: [],
            isAIProcessing: false,
            showEmergencyModal: false,
            error: null,
          });
        },

        // =======================================================================
        // Get Assessment Summary
        // =======================================================================
        getAssessmentSummary: () => {
          const { assessmentData, redFlags, urgencyLevel } = get();
          const { chiefComplaint, hpi, medications, allergies, medicalHistory } = assessmentData;

          let summary = '';
          
          if (chiefComplaint) {
            summary += `**Chief Complaint:** ${chiefComplaint}\n\n`;
          }

          summary += `**History of Present Illness:**\n`;
          if (hpi.onset) summary += `- Onset: ${hpi.onset}\n`;
          if (hpi.location) summary += `- Location: ${hpi.location}\n`;
          if (hpi.duration) summary += `- Duration: ${hpi.duration}\n`;
          if (hpi.character) summary += `- Character: ${hpi.character}\n`;
          if (hpi.severity) summary += `- Severity: ${hpi.severity}/10\n`;
          if (hpi.aggravating?.length) summary += `- Aggravating factors: ${hpi.aggravating.join(', ')}\n`;
          if (hpi.relieving?.length) summary += `- Relieving factors: ${hpi.relieving.join(', ')}\n`;
          if (hpi.associated?.length) summary += `- Associated symptoms: ${hpi.associated.join(', ')}\n`;

          summary += `\n**Medications:** ${medications.length > 0 ? medications.join(', ') : 'None reported'}\n`;
          summary += `**Allergies:** ${allergies.length > 0 ? allergies.join(', ') : 'NKDA'}\n`;
          summary += `**Medical History:** ${medicalHistory.length > 0 ? medicalHistory.join(', ') : 'None reported'}\n`;

          if (redFlags.length > 0) {
            summary += `\n⚠️ **Red Flags Detected:** ${redFlags.map(rf => rf.symptom).join(', ')}\n`;
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
