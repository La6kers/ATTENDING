// =============================================================================
// ATTENDING AI - Shared Components
// apps/shared/components/index.ts
//
// Central export for all shared UI components.
// Note: UrgencyLevel is exported from both chat and ui, so we explicitly
// re-export from ui (Badge component) to resolve the ambiguity.
// =============================================================================

// Chat Components (exclude UrgencyLevel to avoid conflict with ui/Badge)
export {
  MessageBubble,
  QuickReplies,
  ChatInput,
  EmergencyModal,
  createMessage,
  formatMessageTime,
  generateMessageId,
  URGENCY_CONFIG,
  type MessageBubbleProps,
  type QuickRepliesProps,
  type ChatInputProps,
  type EmergencyModalProps,
  type ChatMessage,
  type QuickReply,
  type MessageRole,
  type MessageMetadata,
  type RedFlag,
} from './chat';

// Error Handling Components
export * from './errors';

// Base UI Components (includes canonical UrgencyLevel from Badge)
export * from './ui';

// Layout Components
export * from './layout';
