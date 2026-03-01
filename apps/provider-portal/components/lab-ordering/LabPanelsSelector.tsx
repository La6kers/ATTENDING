// ============================================================
// Lab Panels Selector Component
// components/lab-ordering/LabPanelsSelector.tsx
//
// Quick-add common lab panels
// ============================================================

import React from 'react';
import { Package, Plus, Check, DollarSign } from 'lucide-react';
import type { LabPanel, SelectedLab } from '../../store/labOrderingStore';

interface LabPanelsSelectorProps {
  panels: Record<string, LabPanel>;
  selectedLabs: Record<string, SelectedLab>;
  showCosts?: boolean;
  onAddPanel: (panelId: string) => void;
}

export const LabPanelsSelector: React.FC<LabPanelsSelectorProps> = ({
  panels,
  selectedLabs,
  showCosts = true,
  onAddPanel,
}) => {
  const panelList = Object.values(panels);

  // Check if all tests in a panel are already selected
  const isPanelComplete = (panel: LabPanel): boolean => {
    return panel.tests.every((testCode) => testCode in selectedLabs);
  };

  // Count how many tests in the panel are selected
  const getSelectedCount = (panel: LabPanel): number => {
    return panel.tests.filter((testCode) => testCode in selectedLabs).length;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Lab Panels</h3>
            <p className="text-sm opacity-90">Quick-add common test combinations</p>
          </div>
        </div>
      </div>

      {/* Panels Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {panelList.map((panel) => {
          const complete = isPanelComplete(panel);
          const selectedCount = getSelectedCount(panel);
          const partiallySelected = selectedCount > 0 && !complete;

          return (
            <div
              key={panel.id}
              className={`border rounded-lg p-4 transition-all ${
                complete
                  ? 'border-green-300 bg-green-50'
                  : partiallySelected
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{panel.name}</h4>
                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {panel.abbreviation}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{panel.description}</p>
                  
                  {/* Tests in panel */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {panel.tests.map((testCode) => (
                      <span
                        key={testCode}
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          testCode in selectedLabs
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {testCode}
                      </span>
                    ))}
                  </div>

                  {/* Common indications */}
                  {panel.commonIndications.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="font-medium">Common uses:</span>{' '}
                      {panel.commonIndications.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {showCosts && (
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {panel.cost}
                    </span>
                  )}
                  
                  <button
                    onClick={() => onAddPanel(panel.id)}
                    disabled={complete}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      complete
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {complete ? (
                      <>
                        <Check className="w-4 h-4" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {partiallySelected ? `Add ${panel.tests.length - selectedCount} more` : 'Add Panel'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LabPanelsSelector;
