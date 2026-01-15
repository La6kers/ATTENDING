// =============================================================================
// ATTENDING AI - Assessment Components Barrel Export
// apps/patient-portal/components/assessment/index.ts
//
// UPDATED: Now re-exports unified types from @attending/shared/types
// =============================================================================

// Emergency Modal
export { EmergencyModal } from './EmergencyModal';
export type { EmergencyModalProps } from './EmergencyModal';

// Quick Replies
export {
  QuickReplies,
  QUICK_REPLY_PRESETS,
  YesNoReplies,
  PainScaleReplies,
  TimingReplies,
  PainCharacterReplies,
} from './QuickReplies';
export type { QuickRepliesProps } from './QuickReplies';

// Message Bubble
export { MessageBubble } from './MessageBubble';
export type { MessageBubbleProps } from './MessageBubble';

// Chat Container
export { ChatContainer } from './ChatContainer';
export type { ChatContainerProps } from './ChatContainer';

// Re-export unified types from shared for convenience
export type {
  QuickReply,
  ChatMessage,
  MessageRole,
  RedFlag,
  UrgencyLevel,
  DetailedAssessmentPhase,
  HPIData,
  AssessmentData,
} from '../../../shared/types/chat.types';

// Re-export utility functions
export {
  createMessage,
  generateMessageId,
  generateSessionId,
  formatMessageTime,
  calculateUrgencyScore,
  determineUrgencyLevel,
  getPhaseProgress,
  PHASE_PROGRESS,
  URGENCY_CONFIG,
} from '../../../shared/types/chat.types';
