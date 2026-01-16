import { FC } from 'react';
import { useInbox } from '@/store/useInbox';
import { Brain, AlertCircle, CheckCircle, Info, Activity } from 'lucide-react';
import { cn } from '@attending/shared/lib/utils';

export const AIAssistant: FC = () => {
  const { currentMessage, aiAssistant } = useInbox();
  
  if (!currentMessage?.aiAnalysis) return null;

  const { summary, recommendations, riskFactors, suggestedActions } = currentMessage.aiAnalysis;
  
  // Check if this is a BioMistral assessment
  const isBioMistralAssessment = currentMessage.type === 'biomistral-assessment' || 
    currentMessage.aiAnalysis.source === 'biomistral-7b';

  return (
    <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800">
          {isBioMistralAssessment ? 'BioMistral-7B Clinical Assessment' : 'AI Analysis'}
        </h3>
        {isBioMistralAssessment && (
          <span className="ml-auto text-xs font-medium text-green-600 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            AI-Conducted Interview
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="mb-4 rounded-lg bg-white/80 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          <h4 className="font-medium text-slate-700">Summary</h4>
        </div>
        <p className="text-sm text-slate-600">{summary}</p>
      </div>

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div className="mb-4 rounded-lg bg-white/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h4 className="font-medium text-slate-700">Risk Factors</h4>
          </div>
          <ul className="space-y-1">
            {riskFactors.map((risk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-4 rounded-lg bg-white/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h4 className="font-medium text-slate-700">Recommendations</h4>
          </div>
          <ul className="space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div className="rounded-lg bg-white/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-purple-500" />
            <h4 className="font-medium text-slate-700">Suggested Actions</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, index) => (
              <button
                key={index}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  "bg-purple-100 text-purple-700 hover:bg-purple-200"
                )}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {aiAssistant.isAnalyzing && (
        <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Analyzing message...
        </div>
      )}
    </div>
  );
};
