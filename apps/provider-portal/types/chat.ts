// Re-export all chat types from shared package
// This file maintains backward compatibility with existing imports
// Eventually, imports should be updated to use @attending/shared directly

export type {
  ChatMessage,
  ChatSession,
  AIStatus,
  AssessmentPhase,
  UrgencyLevel,
  BioMistralResponse,
} from '@attending/shared';

// Additional types for UI components (not in shared yet)
export interface QuickReply {
  text: string;
  value: string;
  category?: 'symptom' | 'severity' | 'timing' | 'yes-no' | 'other';
}

export interface MedicalSuggestion {
  text: string;
  type: 'follow-up' | 'clarification' | 'symptom' | 'action';
}

export interface TypingIndicator {
  isVisible: boolean;
  message?: string;
}
