import React from 'react';
import { useClinicalHub } from '@/store/useClinicalHub';
import { ClinicalFilterSidebar } from './ClinicalFilterSidebar';
import { ClinicalMessageList } from './ClinicalMessageList';
import { ClinicalSummaryPanel } from './ClinicalSummaryPanel';

export const ClinicalDecisionHub: React.FC = () => {
  const { currentView, setView } = useClinicalHub();

  return (
    <div className="grid grid-cols-[200px_1fr_320px] h-screen gap-px bg-gray-200">
      {/* Smart Filter Sidebar */}
      <ClinicalFilterSidebar />

      {/* Main Content Area */}
      <div className="bg-gray-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold text-gray-900">Clinical Decision Hub</h1>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-md">
              <button
                onClick={() => setView('priority')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  currentView === 'priority'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Priority
              </button>
              <button
                onClick={() => setView('timeline')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  currentView === 'timeline'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setView('patient')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  currentView === 'patient'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Patient
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50 transition-colors">
              Mark Reviewed
            </button>
            <button className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50 transition-colors">
              Bulk Actions
            </button>
            <button className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50 transition-colors">
              Export
            </button>
          </div>
        </div>

        {/* Message List */}
        <ClinicalMessageList />
      </div>

      {/* Right Panel - Smart Summary */}
      <ClinicalSummaryPanel />
    </div>
  );
};
