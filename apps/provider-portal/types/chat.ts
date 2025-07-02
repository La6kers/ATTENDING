// Chat-specific type definitions

import { AssessmentPhase, BioMistralResponse, UrgencyLevel } from './medical';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    phase?: AssessmentPhase;
    urgencyLevel?: UrgencyLevel;
    quickReplies?: string[];
    medicalSuggestions?: string[];
    aiThinking?: string;
    clinicalData?: any;
  };
}

export interface ChatSession {
  id: string;
  patientId: string;
  startTime: string;
  endTime?: string;
  messages: ChatMessage[];
  currentPhase: AssessmentPhase;
  isComplete: boolean;
  clinicalSummaryId?: string;
}

export interface QuickReply {
  text: string;
  value: string;
  category?: 'symptom' | 'severity' | 'timing' | 'yes-no' | 'other';
}

export interface MedicalSuggestion {
  text: string;
  type: 'follow-up' | 'clarification' | 'symptom' | 'action';
}

export interface AIStatus {
  isProcessing: boolean;
  currentAction?: string;
  error?: string;
  lastUpdate?: string;
}

export interface TypingIndicator {
  isVisible: boolean;
  message?: string;
}
