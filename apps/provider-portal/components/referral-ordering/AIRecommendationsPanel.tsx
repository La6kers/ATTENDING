// ============================================================
// AI Recommendations Panel for Referrals
// apps/provider-portal/components/referral-ordering/AIRecommendationsPanel.tsx
// ============================================================

import { Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import type { AIReferralRecommendation, Specialty } from './types';

interface AIRecommendationsPanelProps {
  recommendations: AIReferralRecommendation[];
  specialtyCatalog: Specialty[];
  selectedReferrals: Set<string>;
  loading?: boolean;
  onAddRecommendation: (recommendation: AIReferralRecommendation, specialty: Specialty) => void;
  onRemoveRecommendation: (specialtyCode: string) => void;
}

const CATEGORY_STYLES: Record<string, {
  border: string;
  bg: string;
  badge: string;
  icon: string;
}> = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-700',
    icon: 'text-red-600',
  },
  recommended: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-600',
  },
  consider: {
    border: 'border-l-gray-400',
    bg: 'bg-gray-50',
    badge: 'bg-gray-100 text-gray-700',
    icon: 'text-gray-600',
  },
  avoid: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    icon: 'text-orange-600',
  },
  'not-indicated': {
    border: 'border-l-gray-300',
    bg: 'bg-gray-50',
    badge: 'bg-gray-100 text-gray-500',
    icon: 'text-gray-400',
  },
  new: {
    border: 'border-l-purple-500',
    bg: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'text-purple-600',
  },
};

const URGENCY_STYLES = {
  STAT: 'bg-red-100 text-red-700 border-red-300',
  URGENT: 'bg-orange-100 text-orange-700 border-orange-300',
  ROUTINE: 'bg-blue-100 text-blue-700 border-blue-300',
  ELECTIVE: 'bg-gray-100 text-gray-700 border-gray-300',
};

export function AIRecommendationsPanel({
  recommendations,
  specialtyCatalog,
  selectedReferrals,
  loading = false,
  onAddRecommendation,
  onRemoveRecommendation,
}: AIRecommendationsPanelProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          <span className="text-purple-700 font-medium">
            Analyzing clinical context for referral recommendations...
          </span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  // Group recommendations by category
  const critical = recommendations.filter(r => r.category === 'critical');
  const recommended = recommendations.filter(r => r.category === 'recommended');
  const consider = recommendations.filter(r => r.category === 'consider');

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">AI Recommended Referrals</h3>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
            {recommendations.length} suggested
          </span>
        </div>
      </div>

      {/* Critical Referrals */}
      {critical.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Critical - Immediate Action Required
          </h4>
          {critical.map(rec => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              specialty={specialtyCatalog.find(s => s.code === rec.specialty)}
              isSelected={selectedReferrals.has(rec.specialty)}
              onAdd={() => {
                const spec = specialtyCatalog.find(s => s.code === rec.specialty);
                if (spec) onAddRecommendation(rec, spec);
              }}
              onRemove={() => onRemoveRecommendation(rec.specialty)}
            />
          ))}
        </div>
      )}

      {/* Recommended Referrals */}
      {recommended.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Recommended
          </h4>
          {recommended.map(rec => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              specialty={specialtyCatalog.find(s => s.code === rec.specialty)}
              isSelected={selectedReferrals.has(rec.specialty)}
              onAdd={() => {
                const spec = specialtyCatalog.find(s => s.code === rec.specialty);
                if (spec) onAddRecommendation(rec, spec);
              }}
              onRemove={() => onRemoveRecommendation(rec.specialty)}
            />
          ))}
        </div>
      )}

      {/* Consider Referrals */}
      {consider.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Consider
          </h4>
          {consider.map(rec => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              specialty={specialtyCatalog.find(s => s.code === rec.specialty)}
              isSelected={selectedReferrals.has(rec.specialty)}
              onAdd={() => {
                const spec = specialtyCatalog.find(s => s.code === rec.specialty);
                if (spec) onAddRecommendation(rec, spec);
              }}
              onRemove={() => onRemoveRecommendation(rec.specialty)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual recommendation card component
function RecommendationCard({
  recommendation,
  specialty,
  isSelected,
  onAdd,
  onRemove,
}: {
  recommendation: AIReferralRecommendation;
  specialty?: Specialty;
  isSelected: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const categoryStyle = CATEGORY_STYLES[recommendation.category] || CATEGORY_STYLES.consider;
  const urgencyStyle = URGENCY_STYLES[recommendation.urgency];

  return (
    <div 
      className={`p-3 rounded-lg border-l-4 ${categoryStyle.border} ${categoryStyle.bg} ${
        isSelected ? 'ring-2 ring-purple-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">
              {specialty?.name || recommendation.specialty}
            </span>
            {recommendation.subspecialty && (
              <span className="text-xs text-gray-500">
                ({recommendation.subspecialty})
              </span>
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${urgencyStyle}`}>
              {recommendation.urgency}
            </span>
            {recommendation.redFlagRelated && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>

          {/* Rationale */}
          <p className="text-sm text-gray-700 mt-1 line-clamp-2">
            {recommendation.rationale}
          </p>

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              Confidence: 
              <span className={`font-medium ${
                recommendation.confidence >= 0.9 ? 'text-green-600' :
                recommendation.confidence >= 0.7 ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {Math.round(recommendation.confidence * 100)}%
              </span>
            </span>
            {recommendation.suggestedTests.length > 0 && (
              <span className="truncate">
                Tests: {recommendation.suggestedTests.slice(0, 2).join(', ')}
                {recommendation.suggestedTests.length > 2 && '...'}
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={isSelected ? onRemove : onAdd}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isSelected
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
          }`}
        >
          {isSelected ? 'Added ✓' : 'Add'}
        </button>
      </div>
    </div>
  );
}

export default AIRecommendationsPanel;
