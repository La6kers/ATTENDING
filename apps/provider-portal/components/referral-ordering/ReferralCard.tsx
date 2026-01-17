// ============================================================
// Referral Card Component
// apps/provider-portal/components/referral-ordering/ReferralCard.tsx
// ============================================================

import {
  ChevronDown,
  ChevronRight,
  X,
  Eye,
  Send,
  Sparkles,
  AlertTriangle,
  UserPlus,
  Star,
} from 'lucide-react';
import type {
  AIReferralRecommendation,
  SelectedReferral,
  ReferralUrgency,
} from './types';

interface ReferralCardProps {
  recommendation?: AIReferralRecommendation;
  selectedReferral?: SelectedReferral;
  isSelected?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
  onUpdateUrgency?: (urgency: ReferralUrgency) => void;
  onUpdateClinicalQuestion?: (question: string) => void;
  onUpdateHistory?: (history: string) => void;
  onSelectProvider?: () => void;
  onPreview?: () => void;
  onSubmit?: () => void;
}

const URGENCY_STYLES: Record<ReferralUrgency, { bg: string; text: string; border: string }> = {
  STAT: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  URGENT: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  ROUTINE: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  ELECTIVE: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

export function ReferralCard({
  recommendation,
  selectedReferral,
  isSelected = false,
  isExpanded = false,
  onToggleExpand,
  onAdd,
  onRemove,
  onUpdateUrgency,
  onUpdateClinicalQuestion,
  onUpdateHistory,
  onSelectProvider,
  onPreview,
  onSubmit,
}: ReferralCardProps) {
  const specialty = selectedReferral?.specialty;
  const urgency = selectedReferral?.urgency || recommendation?.urgency || 'ROUTINE';
  const urgencyStyle = URGENCY_STYLES[urgency];
  
  const isUrgentCard = urgency === 'STAT' || urgency === 'URGENT';
  const isRecommended = !!recommendation && recommendation.category === 'recommended';
  
  const cardBorderClass = isUrgentCard 
    ? 'border-red-300' 
    : isRecommended 
      ? 'border-green-300' 
      : 'border-gray-200';
  
  const specialtyName = specialty?.name || recommendation?.specialty || 'Unknown Specialty';
  const subspecialty = specialty?.subspecialties?.[0] || recommendation?.subspecialty;
  const provider = selectedReferral?.preferredProvider;

  // Get icon for specialty
  const getSpecialtyIcon = (code: string) => {
    const icons: Record<string, string> = {
      'NEURO': '🧠',
      'CARDS': '❤️',
      'GI': '🫁',
      'PULM': '💨',
      'ENDO': '🩺',
      'RHEUM': '🔬',
      'ORTHO': '🦴',
      'PSYCH': '🧠',
      'DERM': '🧴',
      'OPHTH': '👁️',
      'ENT': '👂',
      'UROL': '🩻',
    };
    return icons[code] || '🏥';
  };

  return (
    <article 
      className={`bg-white rounded-xl border-2 ${cardBorderClass} overflow-hidden transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-purple-500' : ''
      }`}
    >
      {/* Header */}
      <header 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand?.();
          }
        }}
      >
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl" aria-hidden="true">
            {getSpecialtyIcon(specialty?.code || recommendation?.specialty || '')}
          </span>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">
                {specialtyName}
                {subspecialty && (
                  <span className="font-normal text-gray-500 ml-1">
                    - {subspecialty}
                  </span>
                )}
              </h3>
              
              {recommendation?.redFlagRelated && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
              
              {recommendation && (
                <span className="flex items-center gap-1 text-xs text-purple-600">
                  <Sparkles className="w-3 h-3" />
                  AI
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {provider 
                ? `${provider.name}, ${provider.credentials} - ${provider.organization}`
                : 'Provider not selected'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${urgencyStyle.bg} ${urgencyStyle.text}`}>
            {urgency}
          </span>
          
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </header>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100 space-y-4">
          {/* AI Recommendation */}
          {recommendation && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">
                  {recommendation.redFlagRelated ? 'AI Priority Alert' : 'AI Recommendation'}
                </span>
              </div>
              <p className="text-sm text-gray-700">{recommendation.rationale}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>Confidence: {Math.round(recommendation.confidence * 100)}%</span>
                {recommendation.suggestedTests.length > 0 && (
                  <span>Suggested: {recommendation.suggestedTests.join(', ')}</span>
                )}
              </div>
            </div>
          )}

          {/* Clinical Summary / Justification */}
          {recommendation?.clinicalQuestion && !selectedReferral && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Clinical Justification</h4>
              <ul className="space-y-1">
                {recommendation.clinicalQuestion.split('.').filter(Boolean).map((point, i) => (
                  <li key={i} className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-1.5 flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    {point.trim()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Selected Referral Details */}
          {selectedReferral && (
            <>
              {/* Urgency Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency Level</label>
                <div className="flex gap-2 flex-wrap">
                  {(['STAT', 'URGENT', 'ROUTINE', 'ELECTIVE'] as const).map(urg => {
                    const style = URGENCY_STYLES[urg];
                    const isActive = urgency === urg;
                    return (
                      <button
                        key={urg}
                        onClick={() => onUpdateUrgency?.(urg)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          isActive
                            ? `${style.bg} ${style.text} ${style.border}`
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {urg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clinical Question */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clinical Question for Specialist
                </label>
                <textarea
                  value={selectedReferral.clinicalQuestion}
                  onChange={(e) => onUpdateClinicalQuestion?.(e.target.value)}
                  placeholder="What specific question would you like the specialist to address?"
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Relevant History */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Relevant History Summary
                </label>
                <textarea
                  value={selectedReferral.relevantHistory}
                  onChange={(e) => onUpdateHistory?.(e.target.value)}
                  placeholder="Brief summary of relevant medical history..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[60px] focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Provider Details */}
          {(provider || specialty) && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {provider ? 'Provider Information' : 'Referral Information'}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {provider ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="text-gray-900 font-medium">{provider.organization}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Wait Time:</span>
                      <span className="text-gray-900 font-medium">{provider.nextAvailable.routine}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Insurance:</span>
                      <span className="text-green-600 font-medium">In-Network</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Accepting:</span>
                      <span className={provider.acceptingNew ? 'text-green-600' : 'text-red-600'}>
                        {provider.acceptingNew ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Avg Wait (Routine):</span>
                      <span className="text-gray-900 font-medium">~{specialty?.averageWaitDays.routine || 14} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Avg Wait (Urgent):</span>
                      <span className="text-gray-900 font-medium">~{specialty?.averageWaitDays.urgent || 3} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Prior Auth:</span>
                      <span className={specialty?.requiresAuth ? 'text-orange-600' : 'text-green-600'}>
                        {specialty?.requiresAuth ? 'Required' : 'Not Required'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className="text-gray-900 font-medium">Draft</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Provider Selection */}
          {selectedReferral && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Preferred Provider (Optional)
              </label>
              {provider ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {provider.name}, {provider.credentials}
                      </p>
                      <p className="text-sm text-gray-500">{provider.organization}</p>
                    </div>
                    {provider.preferred && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <button
                    onClick={onSelectProvider}
                    className="text-sm text-purple-600 hover:underline font-medium"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSelectProvider}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors text-sm"
                >
                  + Select Preferred Provider
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {isSelected ? (
              <>
                <button
                  onClick={onSubmit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isUrgentCard ? 'Submit Urgent Referral' : 'Submit Referral'}
                </button>
                <button
                  onClick={onPreview}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={onRemove}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={onAdd}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-purple-300 text-purple-700 rounded-xl font-medium hover:bg-purple-50 transition-colors"
              >
                Add Referral
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default ReferralCard;
