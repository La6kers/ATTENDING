// ============================================================
// Lab Test Card Component
// components/lab-ordering/LabTestCard.tsx
//
// Displays individual lab test with selection, priority, and AI rationale
// ============================================================

import React from 'react';
import { Brain, Clock, DollarSign } from 'lucide-react';
import type { LabTest, LabPriority, SelectedLab } from '../../store/labOrderingStore';

interface LabTestCardProps {
  test: LabTest;
  selected: boolean;
  selectedLab?: SelectedLab;
  showCosts?: boolean;
  aiRationale?: string;
  onToggle: (code: string) => void;
  onPriorityChange?: (code: string, priority: LabPriority) => void;
}

const priorityStyles: Record<LabPriority, string> = {
  STAT: 'bg-red-100 text-red-800 border-red-200',
  ASAP: 'bg-orange-100 text-orange-800 border-orange-200',
  ROUTINE: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const LabTestCard: React.FC<LabTestCardProps> = ({
  test,
  selected,
  selectedLab,
  showCosts = true,
  aiRationale,
  onToggle,
  onPriorityChange,
}) => {
  const currentPriority = selectedLab?.priority || test.defaultPriority;

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all ${
        selected ? 'border-indigo-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(test.code)}
            className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-gray-900">{test.name}</h4>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {test.code}
                  </span>
                  {selectedLab?.aiRecommended && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      AI
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                
                {/* Specimen & Turnaround Info */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {test.specimenType && (
                    <span>Specimen: {test.specimenType}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{test.turnaroundHours}h
                  </span>
                  {test.requiresFasting && (
                    <span className="text-amber-600 font-medium">Fasting required</span>
                  )}
                </div>
              </div>

              {/* Priority & Cost */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {selected && onPriorityChange ? (
                  <select
                    value={currentPriority}
                    onChange={(e) => onPriorityChange(test.code, e.target.value as LabPriority)}
                    className={`text-xs font-medium rounded-full px-2 py-1 border cursor-pointer ${priorityStyles[currentPriority]}`}
                  >
                    <option value="STAT">STAT</option>
                    <option value="ASAP">ASAP</option>
                    <option value="ROUTINE">Routine</option>
                  </select>
                ) : (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityStyles[test.defaultPriority]}`}>
                    {test.defaultPriority}
                  </span>
                )}
                {showCosts && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {test.cost}
                  </span>
                )}
              </div>
            </div>

            {/* AI Rationale */}
            {aiRationale && (
              <div className="mt-3 flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <span className="font-semibold">AI Rationale:</span> {aiRationale}
                </div>
              </div>
            )}

            {/* CPT/LOINC Codes */}
            {(test.cptCode || test.loincCode) && (
              <div className="mt-2 flex gap-3 text-xs text-gray-400">
                {test.cptCode && <span>CPT: {test.cptCode}</span>}
                {test.loincCode && <span>LOINC: {test.loincCode}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabTestCard;
