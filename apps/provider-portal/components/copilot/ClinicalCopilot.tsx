// ============================================================
// ATTENDING AI - AI Clinical Copilot
// apps/provider-portal/components/copilot/ClinicalCopilot.tsx
//
// Phase 9A: Real-time AI assistant that whispers suggestions
// Like having the world's best consultant at your side
// ============================================================

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Pill,
  Stethoscope,
  BookOpen,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Settings,
  Sparkles,
  Target,
  Shield,
  Clock,
  Activity,
  Heart,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Minimize2,
  Maximize2,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type InsightType = 
  | 'differential' 
  | 'question' 
  | 'red_flag' 
  | 'drug_interaction' 
  | 'clinical_pearl'
  | 'guideline'
  | 'order_suggestion'
  | 'documentation';

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';

export interface CopilotInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  content: string;
  reasoning?: string;
  evidence?: {
    source: string;
    link?: string;
    strength: 'strong' | 'moderate' | 'weak';
  };
  actions?: CopilotAction[];
  dismissed: boolean;
  timestamp: Date;
  confidence: number;
}

export interface CopilotAction {
  id: string;
  label: string;
  type: 'order' | 'document' | 'refer' | 'educate' | 'follow_up';
  data?: any;
}

export interface DifferentialUpdate {
  diagnosis: string;
  probability: number;
  changeDirection: 'up' | 'down' | 'new' | 'stable';
  changeAmount?: number;
  supportingFindings: string[];
  contradictingFindings?: string[];
}

export interface PatientContext {
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  currentMedications: string[];
  allergies: string[];
  conditions: string[];
  recentLabs?: Record<string, string>;
  vitals?: Record<string, string>;
}

export interface CopilotState {
  isListening: boolean;
  isMinimized: boolean;
  isMuted: boolean;
  insights: CopilotInsight[];
  differentials: DifferentialUpdate[];
  conversationContext: string[];
  lastUpdate: Date;
}

// ============================================================
// MOCK AI ENGINE
// ============================================================

const generateMockInsights = (context: PatientContext, conversationText: string): CopilotInsight[] => {
  const insights: CopilotInsight[] = [];
  const text = conversationText.toLowerCase();
  const timestamp = new Date();

  // Red flag detection
  if (text.includes('worst headache') || text.includes('thunderclap')) {
    insights.push({
      id: `insight_${Date.now()}_1`,
      type: 'red_flag',
      priority: 'critical',
      title: '🚨 Possible Subarachnoid Hemorrhage',
      content: '"Worst headache of life" or thunderclap onset requires immediate evaluation for SAH',
      reasoning: 'Sudden severe headache has ~25% probability of SAH and requires emergent workup',
      evidence: {
        source: 'AHA/ASA Guidelines 2019',
        strength: 'strong',
      },
      actions: [
        { id: 'a1', label: 'Order STAT CT Head', type: 'order' },
        { id: 'a2', label: 'Order LP if CT negative', type: 'order' },
      ],
      dismissed: false,
      timestamp,
      confidence: 0.95,
    });
  }

  if (text.includes('chest pain') && (text.includes('left arm') || text.includes('jaw') || text.includes('sweating'))) {
    insights.push({
      id: `insight_${Date.now()}_2`,
      type: 'red_flag',
      priority: 'critical',
      title: '🚨 ACS Warning Signs Detected',
      content: 'Chest pain with radiation to arm/jaw and diaphoresis suggests acute coronary syndrome',
      actions: [
        { id: 'a1', label: 'Order STAT ECG', type: 'order' },
        { id: 'a2', label: 'Order Troponin', type: 'order' },
        { id: 'a3', label: 'Activate ACS Pathway', type: 'order' },
      ],
      dismissed: false,
      timestamp,
      confidence: 0.92,
    });
  }

  // Question suggestions based on symptoms
  if (text.includes('headache') && !text.includes('vision')) {
    insights.push({
      id: `insight_${Date.now()}_3`,
      type: 'question',
      priority: 'medium',
      title: 'Consider Asking',
      content: 'Any vision changes, photophobia, or neck stiffness?',
      reasoning: 'These symptoms help differentiate between primary headache and more serious causes',
      dismissed: false,
      timestamp,
      confidence: 0.85,
    });
  }

  if (text.includes('cough') && !text.includes('how long')) {
    insights.push({
      id: `insight_${Date.now()}_4`,
      type: 'question',
      priority: 'low',
      title: 'Consider Asking',
      content: 'How long have you had the cough? Any blood in the sputum?',
      reasoning: 'Duration helps classify acute vs chronic; hemoptysis is a red flag',
      dismissed: false,
      timestamp,
      confidence: 0.82,
    });
  }

  // Drug interaction warnings
  if (context.currentMedications.some(m => m.toLowerCase().includes('warfarin'))) {
    if (text.includes('ibuprofen') || text.includes('aspirin') || text.includes('nsaid')) {
      insights.push({
        id: `insight_${Date.now()}_5`,
        type: 'drug_interaction',
        priority: 'high',
        title: '⚠️ Drug Interaction Warning',
        content: 'Patient is on Warfarin. NSAIDs significantly increase bleeding risk.',
        reasoning: 'NSAIDs inhibit platelet function and can displace warfarin from protein binding',
        evidence: {
          source: 'Lexicomp Drug Interactions',
          strength: 'strong',
        },
        actions: [
          { id: 'a1', label: 'Consider Acetaminophen instead', type: 'order' },
        ],
        dismissed: false,
        timestamp,
        confidence: 0.98,
      });
    }
  }

  // Clinical pearls
  if (text.includes('diabetes') || context.conditions.includes('Type 2 Diabetes')) {
    if (text.includes('foot') || text.includes('feet')) {
      insights.push({
        id: `insight_${Date.now()}_6`,
        type: 'clinical_pearl',
        priority: 'medium',
        title: '💡 Clinical Pearl',
        content: 'Diabetic foot exam: Check monofilament sensation, pulses, and inspect between toes',
        reasoning: 'Peripheral neuropathy present in 50% of diabetics; early detection prevents amputations',
        dismissed: false,
        timestamp,
        confidence: 0.88,
      });
    }
  }

  // Guideline recommendations
  if (context.age >= 50 && !text.includes('colonoscopy')) {
    insights.push({
      id: `insight_${Date.now()}_7`,
      type: 'guideline',
      priority: 'low',
      title: 'Preventive Care Reminder',
      content: 'Patient is due for colorectal cancer screening (age ≥50)',
      evidence: {
        source: 'USPSTF 2021',
        link: 'https://uspreventiveservicestaskforce.org',
        strength: 'strong',
      },
      actions: [
        { id: 'a1', label: 'Order Colonoscopy Referral', type: 'refer' },
        { id: 'a2', label: 'Discuss FIT Testing', type: 'educate' },
      ],
      dismissed: false,
      timestamp,
      confidence: 0.90,
    });
  }

  // Order suggestions
  if (text.includes('sore throat') && text.includes('fever')) {
    insights.push({
      id: `insight_${Date.now()}_8`,
      type: 'order_suggestion',
      priority: 'medium',
      title: 'Suggested Order',
      content: 'Consider Rapid Strep Test based on symptoms',
      reasoning: 'Centor criteria: fever + tonsillar exudates + tender anterior cervical nodes + absence of cough',
      actions: [
        { id: 'a1', label: 'Order Rapid Strep', type: 'order' },
        { id: 'a2', label: 'Calculate Centor Score', type: 'document' },
      ],
      dismissed: false,
      timestamp,
      confidence: 0.86,
    });
  }

  return insights;
};

const generateMockDifferentials = (conversationText: string): DifferentialUpdate[] => {
  const text = conversationText.toLowerCase();
  const differentials: DifferentialUpdate[] = [];

  if (text.includes('headache')) {
    differentials.push(
      {
        diagnosis: 'Tension-type headache',
        probability: 45,
        changeDirection: 'stable',
        supportingFindings: ['Bilateral location', 'Pressing quality'],
      },
      {
        diagnosis: 'Migraine',
        probability: 30,
        changeDirection: text.includes('nausea') ? 'up' : 'stable',
        changeAmount: text.includes('nausea') ? 10 : 0,
        supportingFindings: text.includes('nausea') ? ['Nausea present'] : [],
      },
      {
        diagnosis: 'Secondary headache',
        probability: text.includes('worst') ? 20 : 10,
        changeDirection: text.includes('worst') ? 'up' : 'stable',
        supportingFindings: text.includes('worst') ? ['Sudden severe onset'] : [],
        contradictingFindings: ['No focal deficits mentioned'],
      }
    );
  }

  if (text.includes('chest pain')) {
    differentials.push(
      {
        diagnosis: 'Musculoskeletal pain',
        probability: 40,
        changeDirection: text.includes('reproducible') ? 'up' : 'stable',
        supportingFindings: ['Common in primary care'],
      },
      {
        diagnosis: 'GERD/Esophageal',
        probability: 25,
        changeDirection: 'stable',
        supportingFindings: ['Burning quality possible'],
      },
      {
        diagnosis: 'Acute Coronary Syndrome',
        probability: text.includes('exertion') || text.includes('sweating') ? 25 : 15,
        changeDirection: text.includes('exertion') ? 'up' : 'stable',
        changeAmount: 10,
        supportingFindings: text.includes('exertion') ? ['Exertional component'] : [],
      }
    );
  }

  return differentials;
};

// ============================================================
// COMPONENTS
// ============================================================

const InsightCard: React.FC<{
  insight: CopilotInsight;
  onDismiss: (id: string) => void;
  onAction: (action: CopilotAction) => void;
  onFeedback: (id: string, helpful: boolean) => void;
  isCompact?: boolean;
}> = ({ insight, onDismiss, onAction, onFeedback, isCompact }) => {
  const [expanded, setExpanded] = useState(!isCompact);

  const priorityConfig = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
    high: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600' },
    medium: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
    low: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600' },
  };

  const typeIcons: Record<InsightType, React.ReactNode> = {
    differential: <Activity size={16} />,
    question: <HelpCircle size={16} />,
    red_flag: <AlertTriangle size={16} />,
    drug_interaction: <Pill size={16} />,
    clinical_pearl: <Lightbulb size={16} />,
    guideline: <BookOpen size={16} />,
    order_suggestion: <Target size={16} />,
    documentation: <Stethoscope size={16} />,
  };

  const config = priorityConfig[insight.priority];

  if (insight.dismissed) return null;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <div 
        className="flex items-start justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-2">
          <span className={config.icon}>{typeIcons[insight.type]}</span>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{insight.title}</p>
            {!expanded && (
              <p className="text-xs text-slate-600 line-clamp-1">{insight.content}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">{insight.confidence}%</span>
          <button onClick={(e) => { e.stopPropagation(); onDismiss(insight.id); }} className="p-1 hover:bg-white/50 rounded">
            <X size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/50">
          <p className="text-sm text-slate-700 mt-2">{insight.content}</p>
          
          {insight.reasoning && (
            <p className="text-xs text-slate-500 mt-2 italic">
              {insight.reasoning}
            </p>
          )}

          {insight.evidence && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className={`px-1.5 py-0.5 rounded ${
                insight.evidence.strength === 'strong' ? 'bg-green-100 text-green-700' :
                insight.evidence.strength === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {insight.evidence.strength} evidence
              </span>
              <span className="text-slate-500">{insight.evidence.source}</span>
              {insight.evidence.link && (
                <a href={insight.evidence.link} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          {insight.actions && insight.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {insight.actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => onAction(action)}
                  className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Feedback */}
          <div className="mt-3 flex items-center gap-2 border-t border-white/50 pt-2">
            <span className="text-xs text-slate-500">Helpful?</span>
            <button
              onClick={() => onFeedback(insight.id, true)}
              className="p-1 hover:bg-green-100 rounded transition-colors"
            >
              <ThumbsUp size={14} className="text-slate-400 hover:text-green-600" />
            </button>
            <button
              onClick={() => onFeedback(insight.id, false)}
              className="p-1 hover:bg-red-100 rounded transition-colors"
            >
              <ThumbsDown size={14} className="text-slate-400 hover:text-red-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DifferentialMeter: React.FC<{ differential: DifferentialUpdate }> = ({ differential }) => {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-900">{differential.diagnosis}</span>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold ${
              differential.changeDirection === 'up' ? 'text-red-600' :
              differential.changeDirection === 'down' ? 'text-green-600' :
              'text-slate-600'
            }`}>
              {differential.probability}%
            </span>
            {differential.changeDirection === 'up' && <ChevronUp size={14} className="text-red-500" />}
            {differential.changeDirection === 'down' && <ChevronDown size={14} className="text-green-500" />}
            {differential.changeDirection === 'new' && <Sparkles size={14} className="text-teal-500" />}
          </div>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              differential.probability >= 50 ? 'bg-red-500' :
              differential.probability >= 30 ? 'bg-orange-500' :
              differential.probability >= 15 ? 'bg-yellow-500' :
              'bg-slate-400'
            }`}
            style={{ width: `${differential.probability}%` }}
          />
        </div>
        {differential.supportingFindings.length > 0 && (
          <p className="text-xs text-green-600 mt-1">
            + {differential.supportingFindings.join(', ')}
          </p>
        )}
        {differential.contradictingFindings && differential.contradictingFindings.length > 0 && (
          <p className="text-xs text-red-600">
            - {differential.contradictingFindings.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COPILOT COMPONENT
// ============================================================

export const ClinicalCopilot: React.FC<{
  patientContext: PatientContext;
  onOrderAction?: (action: CopilotAction) => void;
  position?: 'right' | 'bottom';
}> = ({ patientContext, onOrderAction, position = 'right' }) => {
  const [state, setState] = useState<CopilotState>({
    isListening: true,
    isMinimized: false,
    isMuted: false,
    insights: [],
    differentials: [],
    conversationContext: [],
    lastUpdate: new Date(),
  });
  const [showSettings, setShowSettings] = useState(false);
  const [conversationInput, setConversationInput] = useState('');

  // Simulate real-time updates
  const processConversation = useCallback((text: string) => {
    // Add to conversation context
    setState(prev => ({
      ...prev,
      conversationContext: [...prev.conversationContext, text],
      lastUpdate: new Date(),
    }));

    // Generate insights
    const fullContext = [...state.conversationContext, text].join(' ');
    const newInsights = generateMockInsights(patientContext, fullContext);
    const newDifferentials = generateMockDifferentials(fullContext);

    // Merge with existing insights (avoid duplicates)
    setState(prev => {
      const existingIds = new Set(prev.insights.map(i => i.id));
      const uniqueNewInsights = newInsights.filter(i => !existingIds.has(i.id));
      
      return {
        ...prev,
        insights: [...uniqueNewInsights, ...prev.insights].slice(0, 10), // Keep last 10
        differentials: newDifferentials.length > 0 ? newDifferentials : prev.differentials,
      };
    });
  }, [patientContext, state.conversationContext]);

  const handleDismiss = (id: string) => {
    setState(prev => ({
      ...prev,
      insights: prev.insights.map(i => i.id === id ? { ...i, dismissed: true } : i),
    }));
  };

  const handleAction = (action: CopilotAction) => {
    onOrderAction?.(action);
  };

  const handleFeedback = (id: string, helpful: boolean) => {
    // In production, send to learning engine
    console.log(`Feedback for insight ${id}: ${helpful ? 'helpful' : 'not helpful'}`);
  };

  const handleSubmitConversation = () => {
    if (conversationInput.trim()) {
      processConversation(conversationInput);
      setConversationInput('');
    }
  };

  const activeInsights = state.insights.filter(i => !i.dismissed);
  const criticalInsights = activeInsights.filter(i => i.priority === 'critical');
  const otherInsights = activeInsights.filter(i => i.priority !== 'critical');

  if (state.isMinimized) {
    return (
      <button
        onClick={() => setState(prev => ({ ...prev, isMinimized: false }))}
        className="fixed bottom-6 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 transition-colors z-50"
      >
        <Brain size={24} />
        {criticalInsights.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {criticalInsights.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed ${position === 'right' ? 'right-4 top-20 bottom-4 w-80' : 'bottom-0 left-0 right-0 h-80'} bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col z-40 overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3 text-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">AI Clinical Copilot</h3>
            <p className="text-xs text-teal-200">
              {state.isListening ? 'Listening...' : 'Paused'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setState(prev => ({ ...prev, isListening: !prev.isListening }))}
            className={`p-1.5 rounded-lg transition-colors ${state.isListening ? 'bg-white/20' : 'bg-white/10'}`}
          >
            {state.isListening ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
          <button
            onClick={() => setState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {state.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => setState(prev => ({ ...prev, isMinimized: true }))}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* Patient Context */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex-shrink-0">
        <p className="text-xs text-slate-600">
          <strong>{patientContext.patientName}</strong> • {patientContext.age}{patientContext.gender} • {patientContext.chiefComplaint}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Critical Alerts */}
        {criticalInsights.length > 0 && (
          <div className="p-3 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-red-700">CRITICAL ALERTS</span>
            </div>
            <div className="space-y-2">
              {criticalInsights.map(insight => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={handleDismiss}
                  onAction={handleAction}
                  onFeedback={handleFeedback}
                />
              ))}
            </div>
          </div>
        )}

        {/* Differential Diagnosis */}
        {state.differentials.length > 0 && (
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-slate-700">DIFFERENTIAL DIAGNOSIS</span>
            </div>
            <div className="space-y-1">
              {state.differentials.slice(0, 4).map((diff, idx) => (
                <DifferentialMeter key={idx} differential={diff} />
              ))}
            </div>
          </div>
        )}

        {/* Other Insights */}
        {otherInsights.length > 0 && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-700">SUGGESTIONS</span>
            </div>
            <div className="space-y-2">
              {otherInsights.map(insight => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={handleDismiss}
                  onAction={handleAction}
                  onFeedback={handleFeedback}
                  isCompact
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeInsights.length === 0 && state.differentials.length === 0 && (
          <div className="p-6 text-center text-slate-400">
            <Brain className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Listening to conversation...</p>
            <p className="text-xs">AI suggestions will appear here</p>
          </div>
        )}
      </div>

      {/* Conversation Input (for demo purposes) */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={conversationInput}
            onChange={(e) => setConversationInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitConversation()}
            placeholder="Enter conversation text..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleSubmitConversation}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1 text-center">
          Demo: Type symptoms to see AI suggestions
        </p>
      </div>
    </div>
  );
};

export default ClinicalCopilot;
