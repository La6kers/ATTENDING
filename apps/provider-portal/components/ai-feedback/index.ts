// ============================================================
// ATTENDING AI - AI Feedback Components Index
// apps/provider-portal/components/ai-feedback/index.ts
// ============================================================

export { AIFeedbackCollector } from './AIFeedbackCollector';
export type { 
  AIFeedbackData, 
  AIRecommendation, 
  FeedbackRating,
  AIFeedbackCollectorProps 
} from './AIFeedbackCollector';

// Inline widget for embedding directly on AI recommendations
export { InlineFeedbackWidget } from './InlineFeedbackWidget';
export type {
  FeedbackType,
  FeedbackRating as InlineFeedbackRating,
  InlineFeedbackData,
  InlineFeedbackWidgetProps,
} from './InlineFeedbackWidget';
