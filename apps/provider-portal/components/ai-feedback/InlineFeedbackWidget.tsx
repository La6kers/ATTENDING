// ============================================================
// ATTENDING AI - Inline Clinical Feedback Widget
// apps/provider-portal/components/ai-feedback/InlineFeedbackWidget.tsx
//
// Lightweight thumbs up/down + free text widget designed to sit
// directly on AI recommendations (differential diagnosis, SOAP
// notes, lab suggestions). Collects structured data on AI
// accuracy from day one of pilot — this becomes the Series A
// clinical validation story.
//
// Design: Minimal visual footprint. Expands on interaction.
// Data: Stored for outcomes dashboard aggregation.
// ============================================================

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Send, X, CheckCircle } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type FeedbackType =
  | 'differential_diagnosis'
  | 'soap_note'
  | 'lab_recommendation'
  | 'imaging_recommendation'
  | 'medication_suggestion'
  | 'treatment_plan'
  | 'red_flag_detection'
  | 'triage_level';

export type FeedbackRating = 'helpful' | 'not_helpful';

export interface InlineFeedbackData {
  /** Unique ID for this feedback submission */
  id: string;
  /** What type of AI output is being rated */
  type: FeedbackType;
  /** The specific recommendation ID being rated */
  recommendationId: string;
  /** Thumbs up or down */
  rating: FeedbackRating;
  /** Optional free text comment */
  comment?: string;
  /** Provider who gave the feedback */
  providerId: string;
  /** Patient context (for correlation, not PHI) */
  encounterId?: string;
  /** Timestamp */
  createdAt: string;
  /** The original AI output text (truncated for storage) */
  aiOutputSnippet?: string;
}

export interface InlineFeedbackWidgetProps {
  /** What type of AI output is being rated */
  type: FeedbackType;
  /** Unique ID for this specific recommendation */
  recommendationId: string;
  /** The AI output text (truncated to first 200 chars for storage) */
  aiOutputText?: string;
  /** Encounter context */
  encounterId?: string;
  /** Provider ID */
  providerId?: string;
  /** Callback when feedback is submitted */
  onSubmit?: (feedback: InlineFeedbackData) => void;
  /** Compact mode - even smaller */
  compact?: boolean;
  /** Custom CSS class */
  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function InlineFeedbackWidget({
  type,
  recommendationId,
  aiOutputText,
  encounterId,
  providerId = 'current-provider',
  onSubmit,
  compact = false,
  className = '',
}: InlineFeedbackWidgetProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus comment box when it appears
  useEffect(() => {
    if (showComment && commentRef.current) {
      commentRef.current.focus();
    }
  }, [showComment]);

  const handleRating = useCallback(async (selectedRating: FeedbackRating) => {
    setRating(selectedRating);

    // For "not helpful", show comment box for more detail
    if (selectedRating === 'not_helpful') {
      setShowComment(true);
      return; // Don't submit yet, wait for optional comment
    }

    // For "helpful", submit immediately but allow adding comment
    await submitFeedback(selectedRating, '');
  }, []);

  const submitFeedback = useCallback(async (
    feedbackRating: FeedbackRating,
    feedbackComment: string
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const feedback: InlineFeedbackData = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      recommendationId,
      rating: feedbackRating,
      comment: feedbackComment.trim() || undefined,
      providerId,
      encounterId,
      createdAt: new Date().toISOString(),
      aiOutputSnippet: aiOutputText?.substring(0, 200),
    };

    try {
      // Call the API to persist feedback
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      }).catch(() => {
        // Silently fail API call - don't disrupt clinical workflow
        console.warn('[Feedback] API call failed, data logged locally');
      });

      // Always call the onSubmit callback
      onSubmit?.(feedback);

      setSubmitted(true);
      setShowComment(false);
    } catch (error) {
      console.error('[Feedback] Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [type, recommendationId, providerId, encounterId, aiOutputText, onSubmit, isSubmitting]);

  const handleCommentSubmit = useCallback(() => {
    if (rating) {
      submitFeedback(rating, comment);
    }
  }, [rating, comment, submitFeedback]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSubmit();
    }
  }, [handleCommentSubmit]);

  // Already submitted — show confirmation
  if (submitted) {
    return (
      <div className={`inline-flex items-center gap-1 text-xs text-emerald-600 ${className}`}>
        <CheckCircle size={12} />
        <span>Thanks</span>
      </div>
    );
  }

  // Compact mode: just two tiny icons
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-0.5 ${className}`}>
        <button
          onClick={() => handleRating('helpful')}
          className={`p-0.5 rounded transition-colors ${
            rating === 'helpful'
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'
          }`}
          title="Helpful"
          aria-label="Rate as helpful"
        >
          <ThumbsUp size={12} />
        </button>
        <button
          onClick={() => handleRating('not_helpful')}
          className={`p-0.5 rounded transition-colors ${
            rating === 'not_helpful'
              ? 'text-red-600 bg-red-50'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          }`}
          title="Not helpful"
          aria-label="Rate as not helpful"
        >
          <ThumbsDown size={12} />
        </button>

        {/* Comment popover for negative feedback */}
        {showComment && (
          <div className="absolute z-50 mt-1 top-full right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
            <textarea
              ref={commentRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What was wrong? (optional)"
              className="w-full text-xs border border-gray-200 rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              rows={2}
              maxLength={500}
            />
            <div className="flex justify-end gap-1 mt-1">
              <button
                onClick={() => { setShowComment(false); setRating(null); }}
                className="p-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <X size={12} />
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={isSubmitting}
                className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Send size={10} />
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard mode
  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Was this helpful?</span>
        <button
          onClick={() => handleRating('helpful')}
          className={`p-1 rounded-md transition-all ${
            rating === 'helpful'
              ? 'text-emerald-600 bg-emerald-50 ring-1 ring-emerald-200'
              : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'
          }`}
          title="Helpful"
          aria-label="Rate as helpful"
        >
          <ThumbsUp size={14} />
        </button>
        <button
          onClick={() => handleRating('not_helpful')}
          className={`p-1 rounded-md transition-all ${
            rating === 'not_helpful'
              ? 'text-red-600 bg-red-50 ring-1 ring-red-200'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          }`}
          title="Not helpful"
          aria-label="Rate as not helpful"
        >
          <ThumbsDown size={14} />
        </button>
      </div>

      {/* Comment expansion for negative feedback */}
      {showComment && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2 animate-in slide-in-from-top-1">
          <textarea
            ref={commentRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What should the recommendation have been? (optional)"
            className="w-full text-sm border border-gray-200 rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            rows={2}
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs text-gray-400">
              {comment.length}/500
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowComment(false); setRating(null); }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={isSubmitting}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Send size={12} />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InlineFeedbackWidget;
