// ============================================================
// AI Medication Recommendations Panel
// components/medication-ordering/AIMedicationRecommendationsPanel.tsx
//
// Displays BioMistral AI medication recommendations with categories
// ============================================================

import React from 'react';
import { Brain, AlertTriangle, CheckCircle, Plus, Loader2, ShieldCheck, Ban, Pill } from 'lucide-react';
import type { AIMedicationRecommendation, PrescriptionPriority } from '../../store/medicationOrderingStore';

interface AIMedicationRecommendationsPanelProps {
  recommendations: AIMedicationRecommendation[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onAddRecommendation: (medId: string, priority: PrescriptionPriority, rationale: string) => void;
}

const typeConfig = {
  'first-line': {
    icon: CheckCircle,
    title: 'First-Line Therapy',
    description: 'Recommended as initial treatment based on clinical guidelines',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-800',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
  'alternative': {
    icon: Plus,
    title: 'Alternative Options',
    description: 'Consider if first-line is contraindicated or ineffective',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  'adjunct': {
    icon: Pill,
    title: 'Adjunct Therapy',
    description: 'May be added to enhance primary treatment',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-800',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
  },
  'avoid': {
    icon: Ban,
    title: 'Use with Caution / Avoid',
    description: 'Potential concerns for this patient',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-800',
    buttonColor: 'bg-gray-400 cursor-not-allowed',
  },
};

export const AIMedicationRecommendationsPanel: React.FC<AIMedicationRecommendationsPanelProps> = ({
  recommendations,
  isLoading,
  selectedIds,
  onAddRecommendation,
}) => {
  const groupedRecs = recommendations.reduce((acc, rec) => {
    if (!acc[rec.recommendationType]) acc[rec.recommendationType] = [];
    acc[rec.recommendationType].push(rec);
    return acc;
  }, {} as Record<string, AIMedicationRecommendation[]>);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Analyzing patient context for medication recommendations...</span>
        </div>
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
            <h3 className="font-semibold text-gray-900">AI Medication Recommendations</h3>
            <p className="text-sm text-gray-500">
              Set a patient context to receive AI-powered prescribing recommendations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">BioMistral Prescribing Recommendations</h3>
            <p className="text-sm opacity-90">
              {recommendations.length} medications recommended based on clinical presentation
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 space-y-4">
        {(['first-line', 'alternative', 'adjunct', 'avoid'] as const).map((type) => {
          const recs = groupedRecs[type] || [];
          if (recs.length === 0) return null;

          const config = typeConfig[type];
          const Icon = config.icon;

          return (
            <div
              key={type}
              className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
            >
              {/* Category Header */}
              <div className="p-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
                <div>
                  <h4 className="font-semibold text-gray-900">{config.title}</h4>
                  <p className="text-xs text-gray-600">{config.description}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeColor} ml-auto`}>
                  {recs.length} {recs.length === 1 ? 'medication' : 'medications'}
                </span>
              </div>

              {/* Recommendations */}
              <div className="px-4 pb-4 space-y-2">
                {recs.map((rec) => {
                  const isSelected = selectedIds.has(rec.medicationId);
                  const isAvoid = type === 'avoid';
                  
                  return (
                    <div
                      key={rec.id}
                      className={`bg-white rounded-lg p-3 border ${
                        isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{rec.medicationName}</span>
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                              {rec.category.replace('-', ' ')}
                            </span>
                            {rec.warningMessage && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Warning
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

                          {rec.dosageRecommendation && (
                            <div className="mt-1 text-xs text-indigo-600">
                              <span className="font-medium">Dosing:</span> {rec.dosageRecommendation}
                            </div>
                          )}

                          {rec.monitoringRequired && rec.monitoringRequired.length > 0 && (
                            <div className="mt-1 text-xs text-amber-600">
                              <span className="font-medium">Monitor:</span> {rec.monitoringRequired.join(', ')}
                            </div>
                          )}

                          {rec.warningMessage && (
                            <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-800">
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                              {rec.warningMessage}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              rec.priority === 'STAT'
                                ? 'bg-red-100 text-red-800'
                                : rec.priority === 'URGENT'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <div className="text-xs text-gray-500">
                            {Math.round(rec.confidence * 100)}% confidence
                          </div>
                          {!isSelected && !isAvoid && (
                            <button
                              onClick={() => onAddRecommendation(rec.medicationId, rec.priority, rec.rationale)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              + Prescribe
                            </button>
                          )}
                          {isSelected && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Added
                            </span>
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

export default AIMedicationRecommendationsPanel;
