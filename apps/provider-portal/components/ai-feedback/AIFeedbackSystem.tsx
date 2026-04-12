// ============================================================
// ATTENDING AI - Enhanced AI Feedback System
// Phase 8: Clinical Excellence & Differentiation
//
// Collects structured feedback to power continuous learning
// Every interaction makes the AI smarter
// ============================================================

'use client';

import React, { useState, useCallback } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  Target,
  Lightbulb,
  Send,
  X,
  Star,
  Clock,
  Stethoscope,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface AIRecommendation {
  id: string;
  type: 'differential' | 'order' | 'redFlag' | 'pathway';
  content: string;
  confidence: number;
  reasoning?: string;
  timestamp: string;
}

export interface FeedbackData {
  recommendationId: string;
  rating: 'accurate' | 'partial' | 'inaccurate' | null;
  quickRating: 'up' | 'down' | null;
  correctDiagnosis?: string;
  missedDiagnosis?: string;
  ordersAdded?: string[];
  ordersRemoved?: string[];
  detailedFeedback?: string;
  clinicalContext?: string;
  wouldRecommendToColleague: boolean | null;
  timeToDecision?: number; // seconds
}

export interface FeedbackSubmission extends FeedbackData {
  providerId: string;
  patientId?: string;
  assessmentId?: string;
  timestamp: string;
}

// ============================================================
// FEEDBACK CONTEXT
// ============================================================

interface FeedbackContextValue {
  submitFeedback: (feedback: FeedbackSubmission) => Promise<void>;
  feedbackStats: {
    totalFeedback: number;
    accuracyRate: number;
    lastWeekTrend: 'up' | 'down' | 'stable';
  };
}

const defaultStats = {
  totalFeedback: 1250,
  accuracyRate: 91.5,
  lastWeekTrend: 'up' as const,
};

// ============================================================
// QUICK FEEDBACK (Inline)
// ============================================================

export const QuickFeedback: React.FC<{
  recommendationId: string;
  onFeedback?: (rating: 'up' | 'down') => void;
  onExpandedFeedback?: () => void;
  size?: 'sm' | 'md';
}> = ({ recommendationId, onFeedback, onExpandedFeedback, size = 'sm' }) => {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRating = async (newRating: 'up' | 'down') => {
    setRating(newRating);
    setIsSubmitted(true);
    onFeedback?.(newRating);
    
    // Auto-prompt for detailed feedback on negative rating
    if (newRating === 'down' && onExpandedFeedback) {
      setTimeout(() => {
        onExpandedFeedback();
      }, 500);
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonPadding = size === 'sm' ? 'p-1.5' : 'p-2';

  if (isSubmitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span>Thanks for the feedback!</span>
        <button
          onClick={onExpandedFeedback}
          className="text-teal-600 hover:text-teal-700 dark:text-teal-400 underline"
        >
          Add details
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Helpful?</span>
      <button
        onClick={() => handleRating('up')}
        className={`${buttonPadding} rounded-lg transition-colors ${
          rating === 'up'
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-700'
        }`}
        title="Accurate"
      >
        <ThumbsUp className={iconSize} />
      </button>
      <button
        onClick={() => handleRating('down')}
        className={`${buttonPadding} rounded-lg transition-colors ${
          rating === 'down'
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-700'
        }`}
        title="Inaccurate"
      >
        <ThumbsDown className={iconSize} />
      </button>
    </div>
  );
};

// ============================================================
// DETAILED FEEDBACK MODAL
// ============================================================

export const DetailedFeedbackModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  recommendation: AIRecommendation;
  initialRating?: 'up' | 'down' | null;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
}> = ({ isOpen, onClose, recommendation, initialRating, onSubmit }) => {
  const [feedback, setFeedback] = useState<FeedbackData>({
    recommendationId: recommendation.id,
    rating: initialRating === 'up' ? 'accurate' : initialRating === 'down' ? 'inaccurate' : null,
    quickRating: initialRating ?? null,
    wouldRecommendToColleague: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(feedback);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Feedback
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Recommendation Being Reviewed */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              AI Recommendation ({recommendation.type})
            </p>
            <p className="text-gray-900 dark:text-white">{recommendation.content}</p>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
              <span className={`font-medium ${
                recommendation.confidence >= 80 ? 'text-green-600' :
                recommendation.confidence >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {recommendation.confidence}%
              </span>
            </div>
          </div>

          {/* Accuracy Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How accurate was this recommendation?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'accurate', label: 'Accurate', icon: CheckCircle, color: 'green' },
                { value: 'partial', label: 'Partially', icon: AlertTriangle, color: 'yellow' },
                { value: 'inaccurate', label: 'Inaccurate', icon: XCircle, color: 'red' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFeedback(f => ({ ...f, rating: option.value as any }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                    feedback.rating === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20`
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <option.icon className={`w-5 h-5 ${
                    feedback.rating === option.value ? `text-${option.color}-600` : 'text-gray-400'
                  }`} />
                  <span className={`text-sm ${
                    feedback.rating === option.value ? `text-${option.color}-700 font-medium` : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Diagnosis Correction (if inaccurate) */}
          {(feedback.rating === 'inaccurate' || feedback.rating === 'partial') && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What was the correct diagnosis?
                </label>
                <input
                  type="text"
                  placeholder="Enter correct diagnosis..."
                  value={feedback.correctDiagnosis || ''}
                  onChange={(e) => setFeedback(f => ({ ...f, correctDiagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Did the AI miss an important diagnosis?
                </label>
                <input
                  type="text"
                  placeholder="Missed diagnosis (if any)..."
                  value={feedback.missedDiagnosis || ''}
                  onChange={(e) => setFeedback(f => ({ ...f, missedDiagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Would Recommend */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Would you recommend this AI to a colleague?
            </label>
            <div className="flex gap-2">
              {[
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
              ].map(option => (
                <button
                  key={String(option.value)}
                  onClick={() => setFeedback(f => ({ ...f, wouldRecommendToColleague: option.value }))}
                  className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                    feedback.wouldRecommendToColleague === option.value
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} advanced options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Additional clinical context
                </label>
                <textarea
                  placeholder="Any relevant context that might help improve the AI..."
                  value={feedback.clinicalContext || ''}
                  onChange={(e) => setFeedback(f => ({ ...f, clinicalContext: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Detailed feedback
                </label>
                <textarea
                  placeholder="Any other feedback about this recommendation..."
                  value={feedback.detailedFeedback || ''}
                  onChange={(e) => setFeedback(f => ({ ...f, detailedFeedback: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your feedback improves AI for everyone
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!feedback.rating || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// AI RECOMMENDATION CARD WITH FEEDBACK
// ============================================================

export const AIRecommendationCard: React.FC<{
  recommendation: AIRecommendation;
  onFeedbackSubmit?: (feedback: FeedbackData) => Promise<void>;
}> = ({ recommendation, onFeedbackSubmit }) => {
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [quickRating, setQuickRating] = useState<'up' | 'down' | null>(null);

  const getTypeIcon = () => {
    switch (recommendation.type) {
      case 'differential':
        return <Stethoscope className="w-5 h-5 text-blue-500" />;
      case 'redFlag':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'pathway':
        return <Target className="w-5 h-5 text-teal-500" />;
      case 'order':
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      default:
        return <Brain className="w-5 h-5 text-gray-500" />;
    }
  };

  const getConfidenceColor = () => {
    if (recommendation.confidence >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (recommendation.confidence >= 50) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const handleQuickFeedback = (rating: 'up' | 'down') => {
    setQuickRating(rating);
    if (rating === 'down') {
      setShowDetailedFeedback(true);
    }
  };

  const handleDetailedSubmit = async (feedback: FeedbackData) => {
    if (onFeedbackSubmit) {
      await onFeedbackSubmit(feedback);
    }
    setShowDetailedFeedback(false);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getTypeIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {recommendation.type.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor()}`}>
                {recommendation.confidence}% confidence
              </span>
            </div>
            <p className="text-gray-900 dark:text-white font-medium">
              {recommendation.content}
            </p>
            {recommendation.reasoning && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {recommendation.reasoning}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{new Date(recommendation.timestamp).toLocaleTimeString()}</span>
          </div>
          <QuickFeedback
            recommendationId={recommendation.id}
            onFeedback={handleQuickFeedback}
            onExpandedFeedback={() => setShowDetailedFeedback(true)}
          />
        </div>
      </div>

      <DetailedFeedbackModal
        isOpen={showDetailedFeedback}
        onClose={() => setShowDetailedFeedback(false)}
        recommendation={recommendation}
        initialRating={quickRating}
        onSubmit={handleDetailedSubmit}
      />
    </>
  );
};

// ============================================================
// FEEDBACK SUMMARY WIDGET
// ============================================================

export const FeedbackSummaryWidget: React.FC<{
  stats?: {
    totalFeedback: number;
    accuracyRate: number;
    lastWeekTrend: 'up' | 'down' | 'stable';
  };
}> = ({ stats = defaultStats }) => {
  return (
    <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-4 text-white">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5" />
        <h3 className="font-semibold">AI Learning Progress</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-teal-200 text-sm">Feedback Received</p>
          <p className="text-2xl font-bold">{stats.totalFeedback.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-teal-200 text-sm">Current Accuracy</p>
          <div className="flex items-center gap-1">
            <p className="text-2xl font-bold">{stats.accuracyRate}%</p>
            {stats.lastWeekTrend === 'up' && (
              <span className="text-green-300 text-sm">↑</span>
            )}
          </div>
        </div>
      </div>

      <p className="text-teal-200 text-xs mt-3">
        Your feedback directly improves diagnosis accuracy
      </p>
    </div>
  );
};

// ============================================================
// EXPORTS
// ============================================================

export default {
  QuickFeedback,
  DetailedFeedbackModal,
  AIRecommendationCard,
  FeedbackSummaryWidget,
};
