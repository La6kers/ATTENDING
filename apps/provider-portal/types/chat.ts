// Provider Portal Chat Types
// apps/provider-portal/types/chat.ts
//
// Local type definitions for the provider portal chat functionality.
// These differ from shared types as they're for provider-facing features.

// Re-export some types from shared that are compatible
export type { 
  UrgencyLevel, 
  QuickReply,
} from '@attending/shared/types/chat.types';

// Import shared types for composition
import type { 
  UrgencyLevel, 
  QuickReply,
  DetailedAssessmentPhase,
  HighLevelAssessmentPhase,
} from '@attending/shared/types/chat.types';

// =============================================================================
// Provider Portal Assessment Phases
// Provider uses high-level phases (with hyphens) for display
// =============================================================================

/**
 * Assessment phase for provider portal display.
 * Uses high-level categories rather than detailed phases.
 */
export type AssessmentPhase = HighLevelAssessmentPhase;

// Alias for backward compatibility
export type { DetailedAssessmentPhase };

// =============================================================================
// Provider Chat Session Types
// =============================================================================

/**
 * AI processing status
 */
export interface AIStatus {
  isProcessing: boolean;
  currentAction?: string;
  error?: string;
  lastUpdate?: string;
}

/**
 * Provider-facing chat message with additional metadata
 * Named distinctly to avoid conflicts with shared ChatMessage type
 */
export interface ProviderChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    phase?: AssessmentPhase;
    urgencyLevel?: UrgencyLevel;
    quickReplies?: string[] | QuickReply[];
    medicalSuggestions?: string[];
    aiThinking?: string;
    clinicalData?: any;
  };
}

// Alias for backward compatibility - use ProviderChatMessage to avoid type conflicts
export type ChatMessage = ProviderChatMessage;

/**
 * Provider-facing chat session (different from patient COMPASS session)
 * Named distinctly to avoid conflicts with shared ChatSession type
 */
export interface ProviderChatSession {
  id: string;
  patientId: string;
  startTime: string;
  endTime?: string;
  messages: ChatMessage[];
  currentPhase: AssessmentPhase;
  isComplete: boolean;
  clinicalSummaryId?: string;
}

// Alias for backward compatibility - deprecated, use ProviderChatSession
export type ChatSession = ProviderChatSession;

// =============================================================================
// BioMistral Response Types
// =============================================================================

export interface ClinicalExtraction {
  extractedData: Record<string, any>;
  redFlags: string[];
  riskFactors: string[];
  differentialConsiderations: string[];
  clinicalPearls?: string[];
}

export interface BioMistralResponse {
  message: string;
  quickReplies: string[];
  medicalSuggestions: string[];
  clinicalExtraction: ClinicalExtraction;
  aiThinking: string;
  nextPhase: AssessmentPhase;
  urgencyLevel: UrgencyLevel;
  confidence?: number;
}

// =============================================================================
// Additional UI Types
// =============================================================================

export interface MedicalSuggestion {
  text: string;
  type: 'follow-up' | 'clarification' | 'symptom' | 'action';
}

export interface TypingIndicator {
  isVisible: boolean;
  message?: string;
}
