// ============================================================
// Imaging Order Summary Component
// components/imaging-ordering/ImagingOrderSummary.tsx
//
// Shows selected studies, costs, radiation, and order submission
// ============================================================

import React, { useState } from 'react';
import { 
  FileImage, Clock, DollarSign, AlertTriangle, Send, X, Loader2,
  Zap, Shield, FileText, Monitor, Waves, Radio, Heart
} from 'lucide-react';
import type { SelectedStudy, ImagingPriority, ImagingModality } from '../../store/imagingOrderingStore';

interface ImagingOrderSummaryProps {
  selectedStudies: SelectedStudy[];
  totalCost: number;
  statCount: number;
  hasContrastStudies: boolean;
  radiationTotal: string;
  clinicalIndication: string;
  submitting: boolean;
  error: string | null;
  onIndicationChange: (indication: string) => void;
  onRemoveStudy: (code: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

const priorityColors: Record<ImagingPriority, string> = {
  STAT: 'text-red-600',
  URGENT: 'text-orange-600',
  ASAP: 'text-yellow-600',
  ROUTINE: 'text-blue-600',
};

const modalityIcons: Record<ImagingModality, React.ReactNode> = {
  CT: <Monitor className="w-3 h-3" />,
  MRI: <Waves className="w-3 h-3" />,
  XRAY: <Radio className="w-3 h-3" />,
  US: <Heart className="w-3 h-3" />,
  NM: <Zap className="w-3 h-3" />,
  FLUORO: <Monitor className="w-3 h-3" />,
  MAMMO: <Shield className="w-3 h-3" />,
  DEXA: <Shield className="w-3 h-3" />,
};

export const ImagingOrderSummary: React.FC<ImagingOrderSummaryProps> = ({
  selectedStudies,
  totalCost,
  statCount,
  hasContrastStudies,
  radiationTotal,
  clinicalIndication,
  submitting,
  error,
  onIndicationChange,
  onRemoveStudy,
  onSubmit,
  onClear,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (selectedStudies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-500">
          <FileImage className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <h3 className="font-medium text-gray-700">No Studies Selected</h3>
          <p className="text-sm mt-1">
            Select imaging studies from the catalog or add AI recommendations
          </p>
        </div>
      </div>
    );
  }

  // Group studies by modality
  const studiesByModality = selectedStudies.reduce((acc, s) => {
    const modality = s.study.modality;
    if (!acc[modality]) acc[modality] = [];
    acc[modality].push(s);
    return acc;
  }, {} as Record<string, SelectedStudy[]>);

  // Calculate total duration
  const totalDuration = selectedStudies.reduce((sum, s) => sum + s.study.durationMinutes, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FileImage className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Order Summary</h3>
              <p className="text-sm opacity-90">{selectedStudies.length} studies selected</p>
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-white/80 hover:text-white text-sm flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{selectedStudies.length}</div>
          <div className="text-xs text-gray-600">Total Studies</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{statCount}</div>
          <div className="text-xs text-gray-600">STAT Priority</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">${totalCost}</div>
          <div className="text-xs text-gray-600">Est. Cost</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-5 h-5 text-gray-600" />
            <span className="text-lg font-bold text-gray-900">~{totalDuration}</span>
          </div>
          <div className="text-xs text-gray-600">Min Total</div>
        </div>
      </div>

      {/* Warnings */}
      <div className="p-4 space-y-2 border-b">
        {statCount > 0 && (
          <div className="flex items-center gap-2 text-sm bg-red-50 text-red-800 p-2 rounded">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span><strong>{statCount}</strong> STAT studies require immediate scheduling</span>
          </div>
        )}
        {hasContrastStudies && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-800 p-2 rounded">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>Contrast studies selected - verify allergies and kidney function</span>
          </div>
        )}
        {radiationTotal !== '0.0 mSv' && (
          <div className="flex items-center gap-2 text-sm bg-amber-50 text-amber-800 p-2 rounded">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span>Total estimated radiation: <strong>{radiationTotal}</strong></span>
          </div>
        )}
      </div>

      {/* Selected Studies List (Collapsible) */}
      <div className="border-b">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">
            {showDetails ? 'Hide' : 'Show'} Selected Studies
          </span>
          <span className="text-xs text-gray-500">
            {showDetails ? '▲' : '▼'}
          </span>
        </button>
        
        {showDetails && (
          <div className="px-4 pb-4 space-y-3">
            {Object.entries(studiesByModality).map(([modality, studies]) => (
              <div key={modality}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  {modalityIcons[modality as ImagingModality]}
                  {modality}
                </h4>
                <div className="space-y-1">
                  {studies.map((s) => (
                    <div
                      key={s.study.code}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm text-gray-900 truncate">{s.study.name}</span>
                        <span className={`text-xs font-medium ${priorityColors[s.priority]}`}>
                          {s.priority}
                        </span>
                        {s.aiRecommended && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            AI
                          </span>
                        )}
                        {s.contrast && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            +C
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-500">${s.study.cost}</span>
                        {s.study.radiationDose && (
                          <span className="text-xs text-amber-600">{s.study.radiationDose}</span>
                        )}
                        <button
                          onClick={() => onRemoveStudy(s.study.code)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clinical Indication */}
      <div className="p-4 border-b">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Clinical Indication / History *
        </label>
        <textarea
          value={clinicalIndication}
          onChange={(e) => onIndicationChange(e.target.value)}
          placeholder="Enter clinical history and indication for imaging studies..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">
          Include relevant symptoms, history, and clinical question for radiologist interpretation
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Submit Button */}
      <div className="p-4">
        <button
          onClick={onSubmit}
          disabled={submitting || !clinicalIndication.trim()}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors ${
            submitting || !clinicalIndication.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting Orders...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Imaging Order ({selectedStudies.length} studies)
            </>
          )}
        </button>
        {!clinicalIndication.trim() && (
          <p className="text-xs text-center text-gray-500 mt-2">
            Clinical indication is required to submit
          </p>
        )}
      </div>
    </div>
  );
};

export default ImagingOrderSummary;
