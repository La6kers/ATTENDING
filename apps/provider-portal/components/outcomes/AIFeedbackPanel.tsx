// ============================================================
// ATTENDING AI - Enhanced AI Feedback Panel
// apps/provider-portal/components/outcomes/AIFeedbackPanel.tsx
//
// Phase 8: Continuous Learning Engine - Provider Feedback Interface
// Collects structured feedback to improve AI accuracy over time
// ============================================================

import React, { useState } from 'react';
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
  Send,
  Lightbulb,
  Clock,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface AIRecommendation {
  id: string;
  type: 'differential' | 'lab_order' | 'imaging' | 'medication' | 'referral' | 'red_flag';
  title: string;
  description: string;
  confidence: number;
  reasoning?: string;
  evidence?: string[];
  timestamp: Date;
}

export interface FeedbackData {
  recommendationId: string;
  rating: 'accurate' | 'partially_accurate' | 'inaccurate' | 'missed_important';
  selectedDiagnosis?: string;
  missedDiagnosis?: string;
  comment?: string;
  timeToDecision?: number;
  wouldUseAgain: boolean;
}

interface AIFeedbackPanelProps {
  recommendation: AIRecommendation;
  patientContext?: {
    chiefComplaint: string;
    symptoms: string[];
    age: number;
    gender: string;
  };
  onSubmitFeedback: (feedback: FeedbackData) => Promise<void>;
  onDismiss?: () => void;
}

// ============================================================
// FEEDBACK OPTIONS
// ============================================================

const FEEDBACK_OPTIONS = [
  {
    id: 'accurate',
    label: 'Accurate',
    description: 'The AI recommendation was clinically appropriate',
    icon: CheckCircle,
    color: 'green',
  },
  {
    id: 'partially_accurate',
    label: 'Partially Accurate',
    description: 'Some suggestions were helpful, others were not',
    icon: AlertTriangle,
    color: 'yellow',
  },
  {
    id: 'inaccurate',
    label: 'Inaccurate',
    description: 'The AI missed the diagnosis or suggested wrong approach',
    icon: XCircle,
    color: 'red',
  },
  {
    id: 'missed_important',
    label: 'Missed Important',
    description: 'AI failed to flag a critical finding or diagnosis',
    icon: AlertTriangle,
    color: 'orange',
  },
] as const;

const COMMON_DIAGNOSES = [
  'Acute Coronary Syndrome',
  'Pulmonary Embolism',
  'Stroke/TIA',
  'Appendicitis',
  'Pneumonia',
  'UTI/Pyelonephritis',
  'Cellulitis',
  'DVT',
  'Migraine',
  'Tension Headache',
  'GERD',
  'Anxiety/Panic Attack',
  'Musculoskeletal Pain',
  'Viral Syndrome',
  'Other (specify)',
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export function AIFeedbackPanel({
  recommendation,
  patientContext,
  onSubmitFeedback,
  onDismiss,
}: AIFeedbackPanelProps) {
  const [selectedRating, setSelectedRating] = useState<FeedbackData['rating'] | null>(null);
  const [expandedSection, setExpandedSection] = useState<'rating' | 'details' | 'comment'>('rating');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>('');
  const [customDiagnosis, setCustomDiagnosis] = useState('');
  const [missedDiagnosis, setMissedDiagnosis] = useState('');
  const [comment, setComment] = useState('');
  const [wouldUseAgain, setWouldUseAgain] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRating) return;

    setIsSubmitting(true);
    try {
      await onSubmitFeedback({
        recommendationId: recommendation.id,
        rating: selectedRating,
        selectedDiagnosis: selectedDiagnosis === 'Other (specify)' ? customDiagnosis : selectedDiagnosis,
        missedDiagnosis: missedDiagnosis || undefined,
        comment: comment || undefined,
        wouldUseAgain,
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-900">Thank You!</h3>
        <p className="text-green-700 mt-1">
          Your feedback helps improve AI accuracy for everyone.
        </p>
        <div className="mt-4 p-3 bg-green-100 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-green-800">
            <Brain className="w-5 h-5" />
            <span className="font-medium">+1 Training Data Point Added</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            This feedback will be incorporated into the next model training cycle.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="mt-4 text-green-600 hover:text-green-700 font-medium"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">AI Feedback</h3>
            <p className="text-teal-200 text-sm">Help improve clinical accuracy</p>
          </div>
        </div>
      </div>

      {/* AI Recommendation Summary */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">
              {recommendation.type.replace('_', ' ')}
            </div>
            <div className="font-semibold text-gray-900 mt-1">{recommendation.title}</div>
            {recommendation.description && (
              <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className={`font-medium ${
              recommendation.confidence >= 80 ? 'text-green-600' :
              recommendation.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {recommendation.confidence}% confidence
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Rating Selection */}
        <div>
          <button
            onClick={() => setExpandedSection(expandedSection === 'rating' ? 'details' : 'rating')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-semibold text-gray-900">How accurate was this recommendation?</h4>
            {expandedSection === 'rating' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'rating' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {FEEDBACK_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedRating === option.id;
                const colorClasses = {
                  green: isSelected ? 'bg-green-100 border-green-500 text-green-700' : 'hover:bg-green-50',
                  yellow: isSelected ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'hover:bg-yellow-50',
                  red: isSelected ? 'bg-red-100 border-red-500 text-red-700' : 'hover:bg-red-50',
                  orange: isSelected ? 'bg-orange-100 border-orange-500 text-orange-700' : 'hover:bg-orange-50',
                };

                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedRating(option.id as FeedbackData['rating']);
                      setExpandedSection('details');
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected ? colorClasses[option.color] : 'border-gray-200 ' + colorClasses[option.color]
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${
                        option.color === 'green' ? 'text-green-500' :
                        option.color === 'yellow' ? 'text-yellow-500' :
                        option.color === 'red' ? 'text-red-500' : 'text-orange-500'
                      }`} />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Diagnosis Details */}
        {selectedRating && (
          <div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'details' ? 'comment' : 'details')}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="font-semibold text-gray-900">What was the actual diagnosis?</h4>
              {expandedSection === 'details' ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSection === 'details' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Final Diagnosis
                  </label>
                  <select
                    value={selectedDiagnosis}
                    onChange={(e) => setSelectedDiagnosis(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Select diagnosis...</option>
                    {COMMON_DIAGNOSES.map((dx) => (
                      <option key={dx} value={dx}>{dx}</option>
                    ))}
                  </select>
                  {selectedDiagnosis === 'Other (specify)' && (
                    <input
                      type="text"
                      value={customDiagnosis}
                      onChange={(e) => setCustomDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis..."
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  )}
                </div>

                {(selectedRating === 'inaccurate' || selectedRating === 'missed_important') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What did the AI miss?
                    </label>
                    <input
                      type="text"
                      value={missedDiagnosis}
                      onChange={(e) => setMissedDiagnosis(e.target.value)}
                      placeholder="Enter missed diagnosis or finding..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Additional Comments */}
        {selectedRating && (
          <div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'comment' ? 'rating' : 'comment')}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="font-semibold text-gray-900">Additional Comments (Optional)</h4>
              {expandedSection === 'comment' ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSection === 'comment' && (
              <div className="mt-4 space-y-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Any additional feedback to help improve the AI..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Would you use this AI recommendation again?
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWouldUseAgain(true)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                        wouldUseAgain
                          ? 'bg-green-100 text-green-700 border-2 border-green-500'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Yes
                    </button>
                    <button
                      onClick={() => setWouldUseAgain(false)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                        !wouldUseAgain
                          ? 'bg-red-100 text-red-700 border-2 border-red-500'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      No
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={!selectedRating || isSubmitting}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
              selectedRating && !isSubmitting
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Feedback
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Takes ~10 seconds • Improves AI for all providers
          </p>
        </div>
      </div>

      {/* Learning Tip */}
      <div className="px-6 py-4 bg-teal-50 border-t border-teal-100">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-teal-700">
              <strong>Did you know?</strong> Your feedback directly trains the AI model.
              Providers who give feedback see 15% higher accuracy rates within 30 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QUICK FEEDBACK WIDGET (Inline version)
// ============================================================

export function QuickFeedbackWidget({
  recommendationId,
  onFeedback,
}: {
  recommendationId: string;
  onFeedback: (rating: 'thumbs_up' | 'thumbs_down') => void;
}) {
  const [submitted, setSubmitted] = useState<'thumbs_up' | 'thumbs_down' | null>(null);

  const handleClick = (rating: 'thumbs_up' | 'thumbs_down') => {
    setSubmitted(rating);
    onFeedback(rating);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span>Feedback recorded</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Was this helpful?</span>
      <button
        onClick={() => handleClick('thumbs_up')}
        className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors"
        title="Yes, helpful"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleClick('thumbs_down')}
        className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
        title="Not helpful"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
}

export default AIFeedbackPanel;
