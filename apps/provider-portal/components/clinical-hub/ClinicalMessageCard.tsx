import React from 'react';
import { useClinicalHub } from '@/store/useClinicalHub';
import { ClinicalMessage, getPriorityClass, getScoreClass, getTypeIcon, checkVitalAbnormal } from '@/lib/clinicalMockData';
import { cn } from '@attending/shared/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  message: ClinicalMessage;
}

export const ClinicalMessageCard: React.FC<Props> = ({ message }) => {
  const { expandedMessages, toggleExpanded, executeAction, removeMessage } = useClinicalHub();
  const isExpanded = expandedMessages.has(message.id);

  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    console.log(`${action} action for message ${message.id}`);
    
    if (action === 'urgent') {
      // Handle urgent action
    } else if (action === 'review') {
      // Mark as reviewed
    } else if (action === 'defer') {
      // Defer message
    }
  };

  return (
    <div className={cn(
      "bg-white border rounded-md mb-1.5 transition-all relative",
      getPriorityClass(message.priority) === 'critical' && "border-l-4 border-l-red-600 shadow-sm",
      getPriorityClass(message.priority) === 'warning' && "border-l-4 border-l-amber-500",
      getPriorityClass(message.priority) === 'routine' && "border-l-4 border-l-green-500",
      "hover:shadow-md"
    )}>
      {/* Main Message Layout */}
      <div 
        className="grid grid-cols-[40px_1fr_200px] gap-3 p-2.5 cursor-pointer"
        onClick={() => toggleExpanded(message.id)}
      >
        {/* Priority Indicator */}
        <div className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm",
            getScoreClass(message.priority)
          )}>
            {message.priority}
          </div>
          <div className="text-[10px] text-gray-500">{getTypeIcon(message.type)}</div>
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900">{message.patient}</span>
            <div className="flex gap-2">
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                message.type === 'lab' && "bg-blue-100 text-blue-800",
                message.type === 'imaging' && "bg-indigo-100 text-indigo-800",
                message.type === 'phone' && "bg-fuchsia-100 text-fuchsia-800",
                message.type === 'email' && "bg-green-100 text-green-800",
                message.type === 'provider' && "bg-amber-100 text-amber-800",
                message.type === 'staff' && "bg-cyan-100 text-cyan-800",
                message.type === 'refill' && "bg-gray-100 text-gray-800"
              )}>
                {message.type.toUpperCase()}
              </span>
              {message.newDiagnosis && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-800">
                  NEW DX
                </span>
              )}
              {message.criticalFactors && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-600 text-white">
                  CRITICAL
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-600 line-clamp-2">{message.preview}</div>
          <div className="flex gap-1 mt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-green-100 text-green-700">
              AI Analysis Ready
            </span>
            {message.clinicalGuidelines && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-gray-100 text-gray-600">
                Guidelines Available
              </span>
            )}
            {message.priority > 6 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-700">
                Needs Review
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-1 items-end">
          <div className="text-[11px] text-gray-500 text-right">{message.time}</div>
          <div className="flex gap-1">
            {message.priority > 7 && (
              <button
                onClick={(e) => handleQuickAction(e, 'urgent')}
                className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600 transition-colors"
              >
                Urgent
              </button>
            )}
            <button
              onClick={(e) => handleQuickAction(e, 'review')}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] rounded hover:bg-gray-200 transition-colors"
            >
              Review
            </button>
            <button
              onClick={(e) => handleQuickAction(e, 'defer')}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] rounded hover:bg-gray-200 transition-colors"
            >
              Defer
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      {isExpanded && (
        <ClinicalMessageDetail 
          message={message} 
          onExecute={() => {
            executeAction(message.id);
            setTimeout(() => removeMessage(message.id), 1000);
          }}
        />
      )}
    </div>
  );
};

// Separate component for the expanded detail view
const ClinicalMessageDetail: React.FC<{ message: ClinicalMessage; onExecute: () => void }> = ({ message, onExecute }) => {
  const { toggleAction, updateComposedResponse, composedResponses } = useClinicalHub();
  const [activeTab, setActiveTab] = React.useState('response');

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-3">
      {/* Patient Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
          💬 {message.type === 'provider' ? 'Provider Communication' : message.type === 'staff' ? 'Staff Report' : 'Patient Message'}
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          {message.fullMessage || message.emailContent || message.providerNote || message.staffNote || message.preview}
        </div>
        {(message.criticalFactors || message.vitals) && (
          <div className="flex gap-3 mt-2 pt-2 border-t border-blue-200 text-[10px] text-blue-700">
            {message.vitals && Object.entries(message.vitals).map(([k, v]) => (
              <span key={k}>
                <strong>{k.toUpperCase()}:</strong> 
                <span className={cn("ml-1", checkVitalAbnormal(k, v) && "text-red-600 font-semibold")}>
                  {v}
                </span>
              </span>
            ))}
            {message.criticalFactors && (
              <span><strong>Red Flags:</strong> {message.criticalFactors.join(', ')}</span>
            )}
          </div>
        )}
      </div>

      {/* Clinical Context */}
      <div className="grid grid-cols-4 gap-2 p-2 bg-white rounded">
        <div className="flex flex-col gap-0.5">
          <div className="text-[9px] text-gray-500 uppercase font-semibold">Age/Gender</div>
          <div className="text-[11px] font-semibold text-gray-900">{message.age}{message.gender}</div>
        </div>
        {message.pmh && (
          <div className="flex flex-col gap-0.5">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">PMH</div>
            <div className="text-[11px] font-semibold text-gray-900">{message.pmh.join(', ')}</div>
          </div>
        )}
        {message.medications && Array.isArray(message.medications) && typeof message.medications[0] === 'string' && (
          <div className="flex flex-col gap-0.5">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">Current Meds</div>
            <div className="text-[10px] font-semibold text-gray-900">{message.medications.length} active</div>
          </div>
        )}
      </div>

      {/* Clinical Guidelines */}
      {message.clinicalGuidelines && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2">
          <div className="text-xs font-bold text-amber-800 mb-1">📋 Clinical Guidelines</div>
          {message.clinicalGuidelines.map((guideline, idx) => (
            <div key={idx} className="text-[10px] text-amber-900 mb-0.5 pl-3 relative">
              <span className="absolute left-0">•</span>
              {guideline}
            </div>
          ))}
        </div>
      )}

      {/* Decision Support */}
      {message.recommendedActions && (
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-md p-3">
          <div className="text-xs font-bold mb-2 flex items-center gap-1">
            🧭 Clinical Decision Support
          </div>
          <div className="grid grid-cols-2 gap-2">
            {message.recommendedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  toggleAction(message.id, idx);
                  updateComposedResponse(message.id, 
                    (composedResponses[message.id] || '') + action.action + '. '
                  );
                }}
                className={cn(
                  "p-2 rounded text-left transition-all text-[11px]",
                  action.selected
                    ? "bg-white text-purple-600"
                    : "bg-white/20 hover:bg-white/30"
                )}
              >
                <div className="font-semibold">{action.action}</div>
                <div className="text-[9px] opacity-90">Priority: {action.priority}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Display */}
      {message.results && (
        <div className="grid grid-cols-3 gap-1.5">
          {message.results.map((result, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded p-2 cursor-pointer hover:border-blue-500 transition-colors">
              <div className="text-[10px] font-semibold text-gray-500 mb-1">
                {result.test || result.finding}
              </div>
              <div className={cn(
                "text-sm font-bold mb-0.5",
                result.status === 'critical' && "text-red-600",
                result.status === 'abnormal' && "text-amber-600",
                result.status === 'normal' && "text-green-600",
                !result.status && "text-gray-900 text-[11px]"
              )}>
                {result.value || result.significance}
              </div>
              <div className="text-[9px] text-gray-500 flex justify-between">
                <span>{result.normal || result.action}</span>
                {result.trend && <span>{result.trend}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Builder */}
      <div className="bg-white rounded-md p-3 border border-gray-200">
        <div className="flex gap-1 mb-2 border-b border-gray-200">
          {['response', 'orders', 'follow-up', 'documentation'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors",
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2 max-h-32 overflow-y-auto">
          {getActionOptions(activeTab, message).map((option, idx) => (
            <button
              key={idx}
              onClick={() => updateComposedResponse(message.id, 
                (composedResponses[message.id] || '') + option.text
              )}
              className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[10px] text-center transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>

        <textarea
          className="w-full p-2 border border-gray-200 rounded text-xs min-h-[80px] max-h-[150px] resize-y"
          placeholder="Your clinical decision and response..."
          value={composedResponses[message.id] || ''}
          onChange={(e) => updateComposedResponse(message.id, e.target.value)}
        />

        <div className="flex gap-1.5 mt-2">
          <button
            onClick={onExecute}
            className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded transition-colors"
          >
            Execute & Send
          </button>
          <button className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded transition-colors">
            Save Draft
          </button>
          <button className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded transition-colors">
            Defer
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to get action options based on tab
function getActionOptions(tab: string, message: ClinicalMessage) {
  const baseTemplates = [
    { label: 'Acknowledge', text: 'I have reviewed your message. ' },
    { label: 'Schedule Visit', text: 'Please schedule an appointment to discuss this further. ' }
  ];

  if (tab === 'response') {
    if (message.priority > 7) {
      return [
        { label: 'Urgent Action', text: 'This requires immediate attention. ' },
        { label: 'ED Referral', text: 'Please go to the emergency department immediately. ' },
        { label: 'Call 911', text: 'Please call 911 immediately for emergency medical attention. ' },
        ...baseTemplates
      ];
    } else if (message.type === 'lab') {
      return [
        { label: 'Results Reviewed', text: 'I have reviewed your lab results. ' },
        { label: 'Medication Adjustment', text: 'Based on your results, I am adjusting your medications. ' },
        { label: 'Lifestyle Changes', text: 'These results indicate we should discuss lifestyle modifications. ' },
        ...baseTemplates
      ];
    }
    return baseTemplates;
  } else if (tab === 'orders') {
    return [
      { label: 'CBC', text: 'Order CBC. ' },
      { label: 'CMP', text: 'Order CMP. ' },
      { label: 'A1C', text: 'Order A1C. ' },
      { label: 'Lipids', text: 'Order Lipid Panel. ' },
      { label: 'TSH', text: 'Order TSH. ' },
      { label: 'UA', text: 'Order UA. ' }
    ];
  } else if (tab === 'follow-up') {
    return [
      { label: '1 week', text: 'Follow up in 1 week. ' },
      { label: '2 weeks', text: 'Follow up in 2 weeks. ' },
      { label: '1 month', text: 'Follow up in 1 month. ' },
      { label: '3 months', text: 'Follow up in 3 months. ' }
    ];
  } else {
    return [
      { label: 'Chart note', text: 'Documented in chart. ' },
      { label: 'Update plan', text: 'Care plan updated. ' },
      { label: 'Education', text: 'Patient educated. ' },
      { label: 'Risk discussion', text: 'Risks discussed. ' }
    ];
  }
}
