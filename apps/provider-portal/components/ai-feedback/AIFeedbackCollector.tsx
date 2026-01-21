// ============================================================
// ATTENDING AI - AI Feedback Collection
// apps/provider-portal/components/ai-feedback/AIFeedbackCollector.tsx
//
// Phase 8: Continuous Learning Engine
// Collects provider feedback to improve AI accuracy over time
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Brain,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Lightbulb,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type FeedbackRating = 'accurate' | 'partially_accurate' | 'inaccurate' | 'missed_important';

export interface AIRecommendation {
  id: string;
  type: 'diagnosis' | 'lab' | 'imaging' | 'medication' | 'referral' | 'red_flag';
  content: string;
  confidence: number;
  reasoning?: string;
}

export interface AIFeedbackData {
  recommendationId: string;
  assessmentId: string;
  patientId: string;
  providerId: string;
  rating: FeedbackRating;
  correctDiagnosis?: string;
  additionalNotes?: string;
  missedFindings?: string[];
  timestamp: Date;
}

export interface AIFeedbackCollectorProps {
  assessmentId: string;
  patientId: string;
  recommendations: AIRecommendation[];
  onFeedbackSubmit: (feedback: AIFeedbackData) => Promise<void>;
}

// ============================================================
// RATING OPTIONS
// ============================================================

const RATING_OPTIONS: Array<{
  value: FeedbackRating;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    value: 'accurate',
    label: 'Accurate',
    description: 'AI recommendation was clinically appropriate',
    icon: <CheckCircle size={18} />,
    color: 'emerald',
  },
  {
    value: 'partially_accurate',
    label: 'Partially Accurate',
    description: 'Some recommendations were helpful, others not',
    icon: <AlertTriangle size={18} />,
    color: 'amber',
  },
  {
    value: 'inaccurate',
    label: 'Inaccurate',
    description: 'AI missed the diagnosis or suggested wrong tests',
    icon: <XCircle size={18} />,
    color: 'red',
  },
  {
    value: 'missed_important',
    label: 'Missed Important',
    description: 'AI failed to flag a critical finding',
    icon: <AlertTriangle size={18} />,
    color: 'red',
  },
];

// ============================================================
// COMPONENTS
// ============================================================

// Individual Recommendation Feedback Card
const RecommendationFeedbackCard: React.FC<{
  recommendation: AIRecommendation;
  onFeedback: (rating: FeedbackRating, notes?: string, correctDiagnosis?: string) => void;
  isSubmitted: boolean;
}> = ({ recommendation, onFeedback, isSubmitted }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [notes, setNotes] = useState('');
  const [correctDiagnosis, setCorrectDiagnosis] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);

  const handleSubmit = () => {
    if (selectedRating) {
      onFeedback(selectedRating, notes, correctDiagnosis);
    }
  };

  const getTypeIcon = () => {
    switch (recommendation.type) {
      case 'diagnosis':
        return <Brain size={16} className="text-purple-500" />;
      case 'red_flag':
        return <AlertTriangle size={16} className="text-red-500" />;
      default:
        return <Lightbulb size={16} className="text-blue-500" />;
    }
  };

  const getConfidenceColor = () => {
    if (recommendation.confidence >= 80) return 'text-emerald-600 bg-emerald-50';
    if (recommendation.confidence >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <div className={`border rounded-lg transition-all ${
      isSubmitted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
    }`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => !isSubmitted && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {getTypeIcon()}
          <div>
            <p className="font-medium text-slate-900">{recommendation.content}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor()}`}>
                {recommendation.confidence}% confidence
              </span>
              <span className="text-xs text-slate-400 capitalize">
                {recommendation.type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        
        {isSubmitted ? (
          <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
            <CheckCircle size={16} />
            Feedback Submitted
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {/* Quick Feedback Buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFeedback('accurate');
              }}
              className="p-2 hover:bg-emerald-50 rounded-lg transition-colors group"
              title="Accurate"
            >
              <ThumbsUp size={18} className="text-slate-400 group-hover:text-emerald-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
              title="Provide detailed feedback"
            >
              <ThumbsDown size={18} className="text-slate-400 group-hover:text-red-500" />
            </button>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        )}
      </div>

      {/* Expanded Feedback Form */}
      {expanded && !isSubmitted && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {/* AI Reasoning (if available) */}
          {recommendation.reasoning && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">AI Reasoning</p>
              <p className="text-sm text-slate-700">{recommendation.reasoning}</p>
            </div>
          )}

          {/* Rating Selection */}
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Rate this recommendation</p>
            <div className="grid grid-cols-2 gap-2">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedRating(option.value);
                    setShowCorrection(option.value === 'inaccurate' || option.value === 'missed_important');
                  }}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                    selectedRating === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={selectedRating === option.value ? `text-${option.color}-500` : 'text-slate-400'}>
                    {option.icon}
                  </span>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Correction Input */}
          {showCorrection && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                What was the correct diagnosis?
              </label>
              <input
                type="text"
                value={correctDiagnosis}
                onChange={(e) => setCorrectDiagnosis(e.target.value)}
                placeholder="Enter the correct diagnosis..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Additional notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share any additional feedback to help improve the AI..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!selectedRating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              Submit Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const AIFeedbackCollector: React.FC<AIFeedbackCollectorProps> = ({
  assessmentId,
  patientId,
  recommendations,
  onFeedbackSubmit,
}) => {
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleFeedback = async (
    recommendationId: string,
    rating: FeedbackRating,
    notes?: string,
    correctDiagnosis?: string
  ) => {
    const feedbackData: AIFeedbackData = {
      recommendationId,
      assessmentId,
      patientId,
      providerId: 'current-provider', // In production, get from auth context
      rating,
      correctDiagnosis,
      additionalNotes: notes,
      timestamp: new Date(),
    };

    try {
      await onFeedbackSubmit(feedbackData);
      setSubmittedIds((prev) => new Set(prev).add(recommendationId));
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const totalRecommendations = recommendations.length;
  const submittedCount = submittedIds.size;
  const progressPercent = totalRecommendations > 0 ? (submittedCount / totalRecommendations) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Feedback</h3>
            <p className="text-sm text-slate-500">
              Help improve AI accuracy with your clinical expertise
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">
              {submittedCount}/{totalRecommendations}
            </p>
            <p className="text-xs text-slate-500">reviewed</p>
          </div>
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-purple-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {recommendations.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No AI recommendations to review for this assessment.
            </p>
          ) : (
            <>
              {/* Info Banner */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg mb-4">
                <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Your feedback helps the AI learn and improve. Quick thumbs up/down for accurate 
                  recommendations, or expand for detailed feedback on inaccuracies.
                </p>
              </div>

              {/* Recommendation Cards */}
              {recommendations.map((rec) => (
                <RecommendationFeedbackCard
                  key={rec.id}
                  recommendation={rec}
                  isSubmitted={submittedIds.has(rec.id)}
                  onFeedback={(rating, notes, correctDiagnosis) =>
                    handleFeedback(rec.id, rating, notes, correctDiagnosis)
                  }
                />
              ))}

              {/* Completion Message */}
              {submittedCount === totalRecommendations && totalRecommendations > 0 && (
                <div className="flex items-center justify-center gap-2 p-4 bg-emerald-50 rounded-lg text-emerald-700">
                  <CheckCircle size={20} />
                  <span className="font-medium">
                    Thank you! All feedback submitted for this assessment.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIFeedbackCollector;
