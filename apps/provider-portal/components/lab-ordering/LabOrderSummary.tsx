// ============================================================
// Lab Order Summary Component
// components/lab-ordering/LabOrderSummary.tsx
//
// Shows selected labs, total cost, and order submission
// ============================================================

import React, { useState } from 'react';
import { 
  TestTube, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  Send, 
  X, 
  Loader2,
  Beaker,
  FileText
} from 'lucide-react';
import type { SelectedLab, LabPriority } from '../../store/labOrderingStore';

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

const priorityColors: Record<LabPriority, string> = {
  STAT: 'text-red-600',
  ASAP: 'text-orange-600',
  ROUTINE: 'text-blue-600',
};

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

  // Group labs by category
  const labsByCategory = selectedLabs.reduce((acc, lab) => {
    const category = lab.test.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(lab);
    return acc;
  }, {} as Record<string, SelectedLab[]>);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <TestTube className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Order Summary</h3>
              <p className="text-sm opacity-90">{selectedLabs.length} tests selected</p>
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
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{selectedLabs.length}</div>
          <div className="text-xs text-gray-600">Total Tests</div>
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
            <span className="text-lg font-bold text-gray-900">
              {statCount > 0 ? '~15' : '~45'}
            </span>
          </div>
          <div className="text-xs text-gray-600">Min to Results</div>
        </div>
      </div>

      {/* Warnings */}
      {(statCount > 0 || fastingRequired) && (
        <div className="p-4 space-y-2 border-b">
          {statCount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-red-50 text-red-800 p-2 rounded">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{statCount}</strong> STAT labs require immediate processing</span>
            </div>
          )}
          {fastingRequired && (
            <div className="flex items-center gap-2 text-sm bg-amber-50 text-amber-800 p-2 rounded">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Some tests require fasting - verify patient status</span>
            </div>
          )}
        </div>
      )}

      {/* Selected Labs List (Collapsible) */}
      <div className="border-b">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">
            {showDetails ? 'Hide' : 'Show'} Selected Tests
          </span>
          <span className="text-xs text-gray-500">
            {showDetails ? '▲' : '▼'}
          </span>
        </button>
        
        {showDetails && (
          <div className="px-4 pb-4 space-y-3">
            {Object.entries(labsByCategory).map(([category, labs]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  {category}
                </h4>
                <div className="space-y-1">
                  {labs.map((lab) => (
                    <div
                      key={lab.test.code}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{lab.test.name}</span>
                        <span className={`text-xs font-medium ${priorityColors[lab.priority]}`}>
                          {lab.priority}
                        </span>
                        {lab.aiRecommended && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            AI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">${lab.test.cost}</span>
                        <button
                          onClick={() => onRemoveLab(lab.test.code)}
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
          className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors ${
            submitting || !clinicalIndication.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting Order...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Lab Order ({selectedLabs.length} tests)
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

export default LabOrderSummary;
