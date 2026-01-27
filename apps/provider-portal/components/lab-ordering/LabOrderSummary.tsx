// ============================================================
// Lab Order Summary Component (Refactored)
// components/lab-ordering/LabOrderSummary.tsx
//
// Shows selected labs, total cost, and order submission
// ============================================================

import React, { useState } from 'react';
import { TestTube, AlertTriangle, X, Beaker, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  PriorityBadge,
  AIBadge,
} from '@attending/ui-primitives';
import type { SelectedLab } from '../../store/labOrderingStore';

interface LabOrderSummaryProps {
  selectedLabs: SelectedLab[];
  totalCost: number;
  statCount: number;
  fastingRequired: boolean;
  clinicalIndication: string;
  specialInstructions: string;
  submitting: boolean;
  error: string | null;
  onIndicationChange: (indication: string) => void;
  onInstructionsChange: (instructions: string) => void;
  onRemoveLab: (code: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export const LabOrderSummary: React.FC<LabOrderSummaryProps> = ({
  selectedLabs,
  totalCost,
  statCount,
  fastingRequired,
  clinicalIndication,
  specialInstructions,
  submitting,
  error,
  onIndicationChange,
  onInstructionsChange,
  onRemoveLab,
  onSubmit,
  onClear,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (selectedLabs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-500">
          <Beaker className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <h3 className="font-medium text-gray-700">No Labs Selected</h3>
          <p className="text-sm mt-1">
            Select labs from the catalog or add AI recommendations
          </p>
        </div>
      </div>
    );
  }

  // Group labs by category - use lab.lab (primary) or lab.test (backward compat)
  const labsByCategory = selectedLabs.reduce((acc, selectedLab) => {
    const labData = selectedLab.lab || selectedLab.test;
    if (!labData) return acc;
    const category = labData.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(selectedLab);
    return acc;
  }, {} as Record<string, SelectedLab[]>);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <TestTube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Order Summary</h3>
              <p className="text-sm text-white/80">{selectedLabs.length} tests selected</p>
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
      <div className="p-4 bg-gray-50 border-b grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{selectedLabs.length}</p>
          <p className="text-xs text-gray-500">Total Tests</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{statCount}</p>
          <p className="text-xs text-gray-500">STAT Priority</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">${totalCost}</p>
          <p className="text-xs text-gray-500">Est. Cost</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-600">{statCount > 0 ? '~15' : '~45'}</p>
          <p className="text-xs text-gray-500">Min to Results</p>
        </div>
      </div>

      {/* Warnings */}
      {(statCount > 0 || fastingRequired) && (
        <div className="p-4 space-y-2 border-b">
          {statCount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                <strong>{statCount}</strong> STAT labs require immediate processing
              </p>
            </div>
          )}
          {fastingRequired && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Some tests require fasting - verify patient status
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selected Labs List - Collapsible */}
      <div className="border-b">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>{showDetails ? 'Hide' : 'Show'} Selected Tests</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showDetails && (
          <div className="px-4 pb-4 space-y-3">
            {Object.entries(labsByCategory).map(([category, labs]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  {category}
                </h4>
                <div className="space-y-1">
                  {labs.map((selectedLab) => {
                    const labData = selectedLab.lab || selectedLab.test;
                    if (!labData) return null;
                    return (
                      <div
                        key={labData.code}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">{labData.name}</span>
                          <PriorityBadge priority={selectedLab.priority as 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE'} size="sm" />
                          {selectedLab.aiRecommended && <AIBadge size="sm" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">${labData.cost}</span>
                          <button
                            onClick={() => onRemoveLab(labData.code)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
          Clinical Indication *
        </label>
        <textarea
          value={clinicalIndication}
          onChange={(e) => onIndicationChange(e.target.value)}
          placeholder="Enter clinical indication for lab orders..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          rows={2}
        />
      </div>

      {/* Special Instructions */}
      <div className="p-4 border-b">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Special Instructions (Optional)
        </label>
        <input
          type="text"
          value={specialInstructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="e.g., Call with critical values, Trough level timing..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
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
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
            submitting || !clinicalIndication.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:shadow-lg hover:-translate-y-0.5'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting Order...
            </span>
          ) : (
            `Submit Lab Order (${selectedLabs.length} tests)`
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

export default LabOrderSummary;
