// ============================================================
// AI Imaging Recommendations Panel (Refactored)
// components/imaging-ordering/AIImagingRecommendationsPanel.tsx
//
// Displays BioMistral AI imaging recommendations using shared primitives
// ============================================================

import React from 'react';
import { 
  Brain, AlertTriangle, CheckCircle, HelpCircle, 
  ShieldCheck, XCircle, Monitor, Waves, Radio, Heart, Zap 
} from 'lucide-react';
import { 
  GradientHeader, 
  LoadingState, 
  PriorityBadge,
  ConfidenceIndicator,
  WarningBanner,
} from '@attending/ui-primitives';
import {
  type RecommendationCategory,
  RECOMMENDATION_CATEGORY_CONFIGS,
  groupRecommendationsByCategory,
} from '../shared/recommendation-utils';
import type { AIImagingRecommendation, ImagingModality, ImagingPriority } from '../../store/imagingOrderingStore';

interface AIImagingRecommendationsPanelProps {
  recommendations: AIImagingRecommendation[];
  isLoading: boolean;
  selectedCodes: Set<string>;
  onAddCategory: (category: 'critical' | 'recommended' | 'consider') => void;
  onAddSingle: (studyCode: string, priority: ImagingPriority, rationale: string) => void;
}

// Category icons mapping
const categoryIcons: Record<RecommendationCategory, React.ComponentType<{ className?: string }>> = {
  critical: AlertTriangle,
  recommended: CheckCircle,
  consider: HelpCircle,
  'not-indicated': XCircle,
  avoid: XCircle,
};

// Modality icons for display
const modalityIcons: Record<ImagingModality, React.ReactNode> = {
  CT: <Monitor className="w-3 h-3" />,
  MRI: <Waves className="w-3 h-3" />,
  XRAY: <Radio className="w-3 h-3" />,
  US: <Heart className="w-3 h-3" />,
  NM: <Zap className="w-3 h-3" />,
  FLUORO: <Monitor className="w-3 h-3" />,
  MAMMO: <Monitor className="w-3 h-3" />,
  DEXA: <Monitor className="w-3 h-3" />,
};

export const AIImagingRecommendationsPanel: React.FC<AIImagingRecommendationsPanelProps> = ({
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
        <LoadingState message="Generating AI imaging recommendations..." />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Imaging Recommendations</h3>
            <p className="text-sm text-gray-500">
              Set a patient context to receive AI-powered imaging recommendations
            </p>
          </div>
        </div>
      </div>
    );
  }

  const indicatedCount = recommendations.filter(r => r.category !== 'not-indicated').length;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <GradientHeader
        module="imaging"
        icon={<Brain className="w-5 h-5 text-white" />}
        title="BioMistral AI Imaging Recommendations"
        subtitle={`${indicatedCount} studies recommended based on clinical presentation`}
      />

      {/* Categories */}
      <div className="p-4 space-y-4">
        {(['critical', 'recommended', 'consider', 'not-indicated'] as const).map((category) => {
          const recs = groupedRecs[category] || [];
          if (recs.length === 0) return null;

          const config = RECOMMENDATION_CATEGORY_CONFIGS[category];
          const Icon = categoryIcons[category];
          const isNotIndicated = category === 'not-indicated';
          const allSelected = !isNotIndicated && recs.every((r) => selectedCodes.has(r.studyCode));

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
                    {recs.length} {recs.length === 1 ? 'study' : 'studies'}
                  </span>
                </div>
                {!isNotIndicated && (
                  <button
                    onClick={() => onAddCategory(category)}
                    disabled={allSelected}
                    className={`text-xs font-medium px-3 py-1.5 rounded text-white transition-colors ${
                      allSelected ? 'bg-gray-400 cursor-not-allowed' : config.buttonColor
                    }`}
                  >
                    {allSelected ? 'All Added' : 'Add All'}
                  </button>
                )}
              </div>

              {/* Recommendations */}
              <div className="px-4 pb-4 space-y-2">
                {recs.map((rec) => {
                  const isSelected = selectedCodes.has(rec.studyCode);
                  return (
                    <div
                      key={rec.id}
                      className={`bg-white rounded-lg p-3 border ${
                        isSelected
                          ? 'border-indigo-300 bg-indigo-50'
                          : isNotIndicated
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{rec.studyName}</span>
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              {modalityIcons[rec.modality as ImagingModality]}
                              {rec.modality}
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
                              {rec.clinicalEvidence.slice(0, 2).join('; ')}
                            </div>
                          )}
                          
                          {rec.warningMessage && (
                            <div className="mt-2">
                              <WarningBanner type="warning" message={rec.warningMessage} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <PriorityBadge priority={rec.priority} size="sm" />
                          <ConfidenceIndicator confidence={rec.confidence} size="sm" />
                          {!isSelected && !isNotIndicated && (
                            <button
                              onClick={() => onAddSingle(rec.studyCode, rec.priority, rec.rationale)}
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

export default AIImagingRecommendationsPanel;
