// =============================================================================
// ATTENDING AI - Unified Chat Components
// apps/shared/components/chat/index.ts
//
// Barrel export for all shared chat components.
// Use these components in both Patient and Provider portals.
//
// Usage:
//   import { MessageBubble, QuickReplies, ChatInput, EmergencyModal } from '@attending/shared/components/chat';
// =============================================================================

export { MessageBubble, type MessageBubbleProps } from './MessageBubble';
export { QuickReplies, type QuickRepliesProps } from './QuickReplies';
export { ChatInput, type ChatInputProps } from './ChatInput';
export { EmergencyModal, type EmergencyModalProps } from './EmergencyModal';

// Re-export chat types for convenience
export type {
  ChatMessage,
  QuickReply,
  MessageRole,
  MessageMetadata,
  UrgencyLevel,
  RedFlag,
} from '../../types/chat.types';

export {
  createMessage,
  formatMessageTime,
  generateMessageId,
  URGENCY_CONFIG,
} from '../../types/chat.types';
