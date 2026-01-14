// ============================================================
// Lab Order Summary Component (Refactored)
// components/lab-ordering/LabOrderSummary.tsx
//
// Shows selected labs, total cost, and order submission using shared primitives
// ============================================================

import React, { useState } from 'react';
import { TestTube, Clock, AlertTriangle, X, Beaker, FileText } from 'lucide-react';
import { 
  GradientHeader, 
  StatsGrid, 
  WarningBanner, 
  CollapsibleSection,
  SubmitButton,
  PriorityBadge,
  AIBadge,
  type StatItem,
} from '@attending/ui-primitives';
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

  // Build stats for the grid
  const stats: StatItem[] = [
    { label: 'Total Tests', value: selectedLabs.length, color: 'gray' },
    { label: 'STAT Priority', value: statCount, color: 'red' },
    { label: 'Est. Cost', value: `$${totalCost}`, color: 'green' },
    { 
      label: 'Min to Results', 
      value: statCount > 0 ? '~15' : '~45',
      icon: Clock,
      color: 'gray'
    },
  ];

  // Build warnings
  const warnings: { type: 'error' | 'warning' | 'info'; message: React.ReactNode }[] = [];
  if (statCount > 0) {
    warnings.push({
      type: 'error',
      message: <><strong>{statCount}</strong> STAT labs require immediate processing</>,
    });
  }
  if (fastingRequired) {
    warnings.push({
      type: 'warning',
      message: 'Some tests require fasting - verify patient status',
    });
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
      <GradientHeader
        module="lab"
        icon={TestTube}
        title="Order Summary"
        subtitle={`${selectedLabs.length} tests selected`}
        actions={
          <button
            onClick={onClear}
            className="text-white/80 hover:text-white text-sm flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        }
      />

      {/* Stats Grid */}
      <StatsGrid stats={stats} columns={4} className="p-4 bg-gray-50 border-b" />

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-4 space-y-2 border-b">
          {warnings.map((warning, idx) => (
            <WarningBanner
              key={idx}
              type={warning.type}
              icon={AlertTriangle}
              message={warning.message}
            />
          ))}
        </div>
      )}

      {/* Selected Labs List */}
      <CollapsibleSection
        title={`${showDetails ? 'Hide' : 'Show'} Selected Tests`}
        isOpen={showDetails}
        onToggle={() => setShowDetails(!showDetails)}
      >
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
                      <PriorityBadge priority={lab.priority} size="sm" />
                      {lab.aiRecommended && <AIBadge size="sm" />}
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
      </CollapsibleSection>

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
        <SubmitButton
          onClick={onSubmit}
          disabled={submitting || !clinicalIndication.trim()}
          isLoading={submitting}
          loadingText="Submitting Order..."
          module="lab"
        >
          Submit Lab Order ({selectedLabs.length} tests)
        </SubmitButton>
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
