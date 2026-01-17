import React, { useState } from 'react';
import { useClinicalHub } from '@/store/useClinicalHub';
import { ClinicalMessage } from '@/lib/clinicalMockData';
import { cn } from '@attending/shared/lib/utils';

export const ClinicalSummaryPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'risks'>('overview');
  const { messages } = useClinicalHub();

  // Calculate risk factors
  const criticalCount = messages.filter(m => m.priority >= 8).length;
  const abnormalLabCount = messages.filter(m => m.type === 'lab' && m.priority > 5).length;
  const newDiagnosisCount = messages.filter(m => m.newDiagnosis).length;
  const imagingCount = messages.filter(m => m.type === 'imaging').length;

  return (
    <div className="bg-white border-l border-gray-200 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-gray-900">Smart Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "text-[11px] px-2 py-1 rounded transition-colors",
              activeTab === 'overview'
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "text-[11px] px-2 py-1 rounded transition-colors",
              activeTab === 'timeline'
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={cn(
              "text-[11px] px-2 py-1 rounded transition-colors",
              activeTab === 'risks'
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Risks
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <>
          {/* Risk Panel */}
          <div className="bg-red-50 rounded-md p-3 mb-3">
            <div className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
              ⚠️ Active Risk Factors
            </div>
            <div className="space-y-1">
              {criticalCount > 0 && (
                <RiskItem text={`${criticalCount} patients with critical conditions`} />
              )}
              {abnormalLabCount > 0 && (
                <RiskItem text={`${abnormalLabCount} abnormal lab results`} />
              )}
              {newDiagnosisCount > 0 && (
                <RiskItem text={`${newDiagnosisCount} new diagnoses requiring education`} />
              )}
              {imagingCount > 0 && (
                <RiskItem text={`${imagingCount} imaging results to review`} />
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <StatCard label="Total Messages" value={messages.length} color="blue" />
            <StatCard label="Critical" value={criticalCount} color="red" />
            <StatCard label="Pending Actions" value={messages.filter(m => m.recommendedActions && m.recommendedActions.length > 0).length} color="amber" />
            <StatCard label="New Today" value={messages.filter(m => m.time.includes('min') || m.time.includes('hour')).length} color="green" />
          </div>

          {/* Recent Activity */}
          <div className="mt-4">
            <h3 className="text-xs font-bold text-gray-700 mb-2">Recent Activity</h3>
            <div className="space-y-2">
              {messages.slice(0, 5).map(msg => (
                <div key={msg.id} className="text-[11px] text-gray-600">
                  <span className="font-semibold">{msg.time}:</span> {msg.patient} - {msg.preview.substring(0, 50)}...
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'timeline' && (
        <Timeline messages={messages} />
      )}

      {activeTab === 'risks' && (
        <RiskAnalysis messages={messages} />
      )}
    </div>
  );
};

// Risk Item Component
const RiskItem: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-[11px] text-red-800 pl-3 relative">
    <span className="absolute left-0">⚠</span>
    {text}
  </div>
);

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'red' | 'amber' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700'
  };

  return (
    <div className={cn("p-2 rounded", colorClasses[color])}>
      <div className="text-[10px] font-semibold opacity-75">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
};

// Timeline Component
const Timeline: React.FC<{ messages: ClinicalMessage[] }> = ({ messages }) => {
  const sortedMessages = [...messages].sort((a, b) => {
    const getMinutes = (timeStr: string) => {
      if (timeStr.includes('min')) return parseInt(timeStr);
      if (timeStr.includes('hour')) return parseInt(timeStr) * 60;
      return 999;
    };
    return getMinutes(a.time) - getMinutes(b.time);
  });

  return (
    <div className="relative pl-5">
      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      {sortedMessages.map((msg, _idx) => (
        <div key={msg.id} className="relative mb-3 text-[11px]">
          <div className={cn(
            "absolute -left-3 top-1.5 w-2 h-2 rounded-full border-2 border-white",
            msg.priority >= 8 ? "bg-red-600" : "bg-gray-400"
          )}></div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase">{msg.time}</div>
          <div className="text-gray-700 mt-0.5">
            {msg.patient} - {msg.preview.substring(0, 60)}...
          </div>
        </div>
      ))}
    </div>
  );
};

// Risk Analysis Component
const RiskAnalysis: React.FC<{ messages: ClinicalMessage[] }> = ({ messages }) => {
  const riskCategories = [
    {
      title: 'Immediate Attention Required',
      items: messages.filter(m => m.priority >= 8).map(m => ({
        patient: m.patient,
        risk: m.criticalFactors ? m.criticalFactors[0] : m.preview.substring(0, 40)
      }))
    },
    {
      title: 'Abnormal Results',
      items: messages.filter(m => m.results?.some(r => r.status === 'critical' || r.status === 'abnormal')).map(m => ({
        patient: m.patient,
        risk: m.results?.find(r => r.status === 'critical' || r.status === 'abnormal')?.test || 'Abnormal finding'
      }))
    },
    {
      title: 'Medication Concerns',
      items: messages.filter(m => m.recommendedActions?.some(a => a.action.toLowerCase().includes('medication'))).map(m => ({
        patient: m.patient,
        risk: 'Medication adjustment needed'
      }))
    }
  ];

  return (
    <div className="space-y-4">
      {riskCategories.map((category, idx) => (
        <div key={idx}>
          <h3 className="text-xs font-bold text-gray-700 mb-2">{category.title}</h3>
          {category.items.length > 0 ? (
            <div className="space-y-1">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className="text-[11px] bg-gray-50 p-2 rounded">
                  <span className="font-semibold text-gray-900">{item.patient}:</span>
                  <span className="text-gray-600 ml-1">{item.risk}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-gray-500 italic">No items in this category</div>
          )}
        </div>
      ))}
    </div>
  );
};
