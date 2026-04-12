// =============================================================================
// ATTENDING AI - Shared Components
// apps/shared/components/index.ts
//
// Central export for all shared UI components.
// Note: UrgencyLevel is exported from both chat and ui, so we explicitly
// re-export from ui (Badge component) to resolve the ambiguity.
// =============================================================================

// Emergency Components (consolidated emergency modal)
export {
  EmergencyModal,
  type EmergencyModalProps,
  type EmergencyType,
  type UrgencyLevel as EmergencyUrgencyLevel,
  type EmergencyFacility,
} from './emergency';

// Chat Components (exclude EmergencyModal - use consolidated version above)
export {
  MessageBubble,
  QuickReplies,
  ChatInput,
  createMessage,
  formatMessageTime,
  generateMessageId,
  URGENCY_CONFIG,
  type MessageBubbleProps,
  type QuickRepliesProps,
  type ChatInputProps,
  type ChatMessage,
  type QuickReply,
  type MessageRole,
  type MessageMetadata,
  type RedFlag,
} from './chat';

// Clinical Components - Domain-specific healthcare components
export {
  PatientBanner,
  PriorityBadge,
  AIBadge,
  OrderCard,
  AIRecommendationsPanel,
  ClinicalFindingCard,
  OrderSummary,
  CollapsibleSection,
  QuickActionsBar,
  createLabOrderActions,
  createImagingOrderActions,
  createMedicationOrderActions,
  PRIORITY_CONFIG,
  RECOMMENDATION_CONFIG,
  type PatientInfo,
  type PatientVitals,
  type PatientBannerProps,
  type PriorityBadgeProps,
  type AIBadgeProps,
  type OrderItem,
  type OrderCardProps,
  type AIRecommendation,
  type AIRecommendationsPanelProps,
  type ClinicalFinding,
  type ClinicalFindingCardProps,
  type OrderSummaryProps,
  type CollapsibleSectionProps,
  type OrderPriority,
  type RecommendationCategory,
  type QuickAction,
  type QuickActionsBarProps,
} from './clinical';

// Error Handling Components
export * from './errors';

// Base UI Components (includes canonical UrgencyLevel from Badge)
export * from './ui';

// Layout Components
export * from './layout';
