// ============================================================
// AI Recommendations Panel (Refactored)
// components/lab-ordering/AIRecommendationsPanel.tsx
//
// Displays BioMistral AI lab recommendations using shared primitives
// ============================================================

import React from 'react';
import { Brain, AlertTriangle, CheckCircle, HelpCircle, ShieldCheck, XCircle } from 'lucide-react';
import { 
  GradientHeader, 
  LoadingState, 
  PriorityBadge,
  ConfidenceIndicator,
} from '@attending/ui-primitives';
import { 
  type RecommendationCategory,
  RECOMMENDATION_CATEGORY_CONFIGS,
  groupRecommendationsByCategory,
} from '../shared/recommendation-utils';
import type { AILabRecommendation } from '../../store/labOrderingStore';

interface AIRecommendationsPanelProps {
  recommendations: AILabRecommendation[];
  isLoading: boolean;
  selectedCodes: Set<string>;
  onAddCategory: (category: 'critical' | 'recommended' | 'consider') => void;
  onAddSingle: (testCode: string, priority: 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE', rationale: string) => void;
}

// Category icons mapping
const categoryIcons: Record<RecommendationCategory, React.ComponentType<{ className?: string }>> = {
  critical: AlertTriangle,
  recommended: CheckCircle,
  consider: HelpCircle,
  'not-indicated': XCircle,
  avoid: XCircle,
};

export const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({
  recommendations,
  isLoading,
  selectedCodes,
  onAddCategory,
  onAddSingle,
}) => {
  const groupedRecs = groupRecommendationsByCategory(recommendations);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <LoadingState message="Generating AI recommendations..." />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Lab Recommendations</h3>
            <p className="text-sm text-gray-500">
              Set a patient context to receive AI-powered lab recommendations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <GradientHeader
        module="labs"
        icon={Brain}
        title="BioMistral AI Recommendations"
        subtitle={`${recommendations.length} tests recommended based on clinical presentation`}
      />

      {/* Categories */}
      <div className="p-4 space-y-4">
        {(['critical', 'recommended', 'consider'] as const).map((category) => {
          const recs = groupedRecs[category] || [];
          if (recs.length === 0) return null;

          const config = RECOMMENDATION_CATEGORY_CONFIGS[category];
          const Icon = categoryIcons[category];
          const allSelected = recs.every((r) => selectedCodes.has(r.testCode));

          return (
            <div
              key={category}
              className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
            >
              {/* Category Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  <div>
                    <h4 className="font-semibold text-gray-900">{config.title}</h4>
                    <p className="text-xs text-gray-600">{config.description}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeColor}`}>
                    {recs.length} tests
                  </span>
                </div>
                <button
                  onClick={() => onAddCategory(category)}
                  disabled={allSelected}
                  className={`text-xs font-medium px-3 py-1.5 rounded text-white transition-colors ${
                    allSelected ? 'bg-gray-400 cursor-not-allowed' : config.buttonColor
                  }`}
                >
                  {allSelected ? 'All Added' : 'Add All'}
                </button>
              </div>

              {/* Recommendations */}
              <div className="px-4 pb-4 space-y-2">
                {recs.map((rec) => {
                  const isSelected = selectedCodes.has(rec.testCode);
                  return (
                    <div
                      key={rec.id}
                      className={`bg-white rounded-lg p-3 border ${
                        isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{rec.testName}</span>
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {rec.testCode}
                            </span>
                            {rec.redFlagRelated && (
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Red Flag
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{rec.rationale}</p>
                          {rec.clinicalEvidence.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">Evidence:</span>{' '}
                              {rec.clinicalEvidence.join('; ')}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <PriorityBadge priority={rec.priority} size="sm" />
                          <ConfidenceIndicator confidence={rec.confidence} size="sm" />
                          {!isSelected && (
                            <button
                              onClick={() => onAddSingle(rec.testCode, rec.priority, rec.rationale)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIRecommendationsPanel;
