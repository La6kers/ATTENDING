// =============================================================================
// ATTENDING AI - Clinical Recommendations Component
// apps/provider-portal/components/interventions/ClinicalRecommendations.tsx
//
// Evidence-based recommendations with guideline citations
// =============================================================================

'use client';

import React, { useState } from 'react';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Shield,
  Heart,
  Activity,
  Pill,
  Stethoscope,
  FileText,
  ExternalLink,
  Clock,
  Target,
  TrendingDown,
  BookOpen,
  Zap,
  DollarSign,
  Users,
  Play,
  X,
  Info,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type RecommendationType = 
  | 'therapeutic'
  | 'diagnostic'
  | 'preventive'
  | 'safety'
  | 'monitoring'
  | 'cost_optimization';

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D';
export type UrgencyLevel = 'routine' | 'soon' | 'urgent' | 'emergent';

export interface ClinicalRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  rationale: string;
  evidenceLevel: EvidenceLevel;
  strength: 'strong' | 'moderate' | 'weak';
  urgency: UrgencyLevel;
  guidelines: Array<{
    organization: string;
    guidelineName: string;
    year: number;
    grade?: string;
    url?: string;
  }>;
  actions: Array<{
    type: string;
    description: string;
    priority: number;
    orderTemplate?: any;
  }>;
  alternatives?: Array<{
    description: string;
    reason: string;
    whenToConsider: string;
  }>;
  triggeredBy: string[];
  expectedBenefit: string;
  numberNeededToTreat?: number;
  riskReduction?: string;
  contraindications?: string[];
  precautions?: string[];
}

export interface RecommendationsSummary {
  total: number;
  urgent: number;
  safety: number;
  therapeutic: number;
  preventive: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockRecommendations: ClinicalRecommendation[] = [
  {
    id: 'rec_1',
    type: 'therapeutic',
    title: 'Diabetes Therapy Intensification Recommended',
    description: 'Current A1c is 9.2% (goal <7% for most patients). Consider adding GLP-1 RA for cardiovascular benefit.',
    rationale: 'A1c above goal increases risk of microvascular complications. Per ADA guidelines, therapy should be intensified if A1c remains above target after 3 months. Patient has established cardiovascular disease, making GLP-1 RA preferred.',
    evidenceLevel: 'A',
    strength: 'strong',
    urgency: 'soon',
    guidelines: [
      {
        organization: 'American Diabetes Association',
        guidelineName: 'Standards of Medical Care in Diabetes',
        year: 2024,
        grade: 'A',
        url: 'https://diabetesjournals.org/care/article/47/Supplement_1/S158/153955',
      },
    ],
    actions: [
      {
        type: 'prescribe',
        description: 'Start Semaglutide 0.25mg weekly, titrate to 1mg',
        priority: 1,
        orderTemplate: { name: 'Semaglutide 0.25mg', frequency: 'Weekly' },
      },
      {
        type: 'order',
        description: 'Recheck A1c in 3 months',
        priority: 2,
        orderTemplate: { name: 'Hemoglobin A1c', code: '4548-4' },
      },
      {
        type: 'educate',
        description: 'Diabetes self-management education',
        priority: 3,
      },
    ],
    alternatives: [
      {
        description: 'If GLP-1 RA not tolerated, consider SGLT2 inhibitor',
        reason: 'Also provides cardiovascular benefit',
        whenToConsider: 'GI intolerance to GLP-1 RA',
      },
    ],
    triggeredBy: ['A1c 9.2%', 'Type 2 Diabetes', 'Established ASCVD'],
    expectedBenefit: 'Each 1% reduction in A1c reduces microvascular complications by ~35%',
    numberNeededToTreat: 15,
    riskReduction: '35% reduction in microvascular complications per 1% A1c reduction',
  },
  {
    id: 'rec_2',
    type: 'safety',
    title: '⚠️ High Bleeding Risk: NSAID + Anticoagulant',
    description: 'Patient is on Ibuprofen AND Apixaban. This combination significantly increases GI and other bleeding risk.',
    rationale: 'Concurrent use of NSAIDs with anticoagulants increases bleeding risk 2-4 fold, particularly GI bleeding. This combination should be avoided when possible.',
    evidenceLevel: 'A',
    strength: 'strong',
    urgency: 'urgent',
    guidelines: [
      {
        organization: 'ACC/AHA',
        guidelineName: 'Guideline for Antithrombotic Therapy',
        year: 2023,
      },
    ],
    actions: [
      {
        type: 'discontinue',
        description: 'Discontinue Ibuprofen if possible',
        priority: 1,
      },
      {
        type: 'prescribe',
        description: 'Switch to Acetaminophen for pain management',
        priority: 2,
        orderTemplate: { name: 'Acetaminophen 650mg', frequency: 'Q6H PRN' },
      },
      {
        type: 'prescribe',
        description: 'If NSAID required, add PPI for GI protection',
        priority: 3,
        orderTemplate: { name: 'Omeprazole 20mg', frequency: 'Daily' },
      },
    ],
    triggeredBy: ['Active Ibuprofen', 'Active Apixaban'],
    expectedBenefit: '50-75% reduction in GI bleeding risk by avoiding combination',
  },
  {
    id: 'rec_3',
    type: 'preventive',
    title: 'Colorectal Cancer Screening Recommended',
    description: 'Patient is 52 years old and due for colorectal cancer screening. No documented screening in past 10 years.',
    rationale: 'Colorectal cancer screening reduces CRC mortality by detecting cancer early or preventing it through polyp removal. Screening is recommended for all adults 45-75.',
    evidenceLevel: 'A',
    strength: 'strong',
    urgency: 'routine',
    guidelines: [
      {
        organization: 'USPSTF',
        guidelineName: 'Screening for Colorectal Cancer',
        year: 2021,
        grade: 'A',
      },
    ],
    actions: [
      {
        type: 'order',
        description: 'Order FIT test or refer for colonoscopy',
        priority: 1,
        orderTemplate: { name: 'FIT (Fecal Immunochemical Test)', code: '82274' },
      },
      {
        type: 'educate',
        description: 'Discuss screening options with patient',
        priority: 2,
      },
    ],
    alternatives: [
      {
        description: 'Colonoscopy every 10 years',
        reason: 'Gold standard, allows polyp removal',
        whenToConsider: 'Patient preference or family history',
      },
      {
        description: 'FIT-DNA (Cologuard) every 3 years',
        reason: 'More sensitive than FIT alone',
        whenToConsider: 'Patient declines colonoscopy',
      },
    ],
    triggeredBy: ['Age 52', 'No recent CRC screening'],
    expectedBenefit: '50-60% reduction in CRC mortality with regular screening',
    numberNeededToTreat: 200,
  },
  {
    id: 'rec_4',
    type: 'therapeutic',
    title: 'High-Intensity Statin Therapy Recommended',
    description: 'Patient has established ASCVD and is on moderate-intensity statin. Recommend intensifying to high-intensity statin for secondary prevention.',
    rationale: 'High-intensity statin therapy reduces cardiovascular events by 30-40% in patients with established ASCVD.',
    evidenceLevel: 'A',
    strength: 'strong',
    urgency: 'soon',
    guidelines: [
      {
        organization: 'ACC/AHA',
        guidelineName: 'Guideline on the Management of Blood Cholesterol',
        year: 2018,
        grade: 'A',
      },
    ],
    actions: [
      {
        type: 'adjust',
        description: 'Intensify to Atorvastatin 80mg or Rosuvastatin 20-40mg daily',
        priority: 1,
        orderTemplate: { name: 'Atorvastatin 80mg', frequency: 'Daily' },
      },
      {
        type: 'order',
        description: 'Check lipid panel in 4-12 weeks',
        priority: 2,
        orderTemplate: { name: 'Lipid Panel', code: '24331-1' },
      },
    ],
    triggeredBy: ['ASCVD diagnosis', 'Moderate-intensity statin'],
    expectedBenefit: '30-40% reduction in major cardiovascular events',
    numberNeededToTreat: 25,
    precautions: ['Monitor for myopathy', 'Check LFTs'],
  },
  {
    id: 'rec_5',
    type: 'cost_optimization',
    title: 'Generic Medication Substitution Available',
    description: 'Nexium (esomeprazole) can be switched to generic Omeprazole. Estimated savings: $150-200/month.',
    rationale: 'Generic medications are bioequivalent to brand-name drugs but cost significantly less. Switching improves adherence by reducing cost burden.',
    evidenceLevel: 'A',
    strength: 'strong',
    urgency: 'routine',
    guidelines: [
      {
        organization: 'FDA',
        guidelineName: 'Generic Drug Facts',
        year: 2023,
      },
    ],
    actions: [
      {
        type: 'prescribe',
        description: 'Switch to Omeprazole 20mg daily (same dose)',
        priority: 1,
        orderTemplate: { name: 'Omeprazole 20mg', frequency: 'Daily' },
      },
    ],
    triggeredBy: ['Taking brand Nexium'],
    expectedBenefit: 'Estimated savings of $150-200/month',
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const TypeIcon: React.FC<{ type: RecommendationType; size?: number }> = ({ type, size = 18 }) => {
  const icons: Record<RecommendationType, React.ReactNode> = {
    therapeutic: <Pill size={size} />,
    diagnostic: <Stethoscope size={size} />,
    preventive: <Shield size={size} />,
    safety: <AlertTriangle size={size} />,
    monitoring: <Activity size={size} />,
    cost_optimization: <DollarSign size={size} />,
  };
  return <>{icons[type]}</>;
};

const typeLabels: Record<RecommendationType, string> = {
  therapeutic: 'Treatment',
  diagnostic: 'Diagnostic',
  preventive: 'Preventive',
  safety: 'Safety Alert',
  monitoring: 'Monitoring',
  cost_optimization: 'Cost Savings',
};

const typeColors: Record<RecommendationType, string> = {
  therapeutic: 'bg-blue-100 text-blue-700 border-blue-200',
  diagnostic: 'bg-teal-100 text-teal-700 border-teal-200',
  preventive: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  safety: 'bg-red-100 text-red-700 border-red-200',
  monitoring: 'bg-amber-100 text-amber-700 border-amber-200',
  cost_optimization: 'bg-green-100 text-green-700 border-green-200',
};

const urgencyConfig: Record<UrgencyLevel, { color: string; label: string; bg: string }> = {
  emergent: { color: 'text-red-700', label: 'Emergent', bg: 'bg-red-100' },
  urgent: { color: 'text-orange-700', label: 'Urgent', bg: 'bg-orange-100' },
  soon: { color: 'text-amber-700', label: 'Soon', bg: 'bg-amber-100' },
  routine: { color: 'text-slate-600', label: 'Routine', bg: 'bg-slate-100' },
};

const evidenceColors: Record<EvidenceLevel, string> = {
  A: 'bg-emerald-500',
  B: 'bg-blue-500',
  C: 'bg-amber-500',
  D: 'bg-slate-400',
};

const EvidenceBadge: React.FC<{ level: EvidenceLevel; strength: string }> = ({ level, strength }) => (
  <div className="flex items-center gap-2">
    <div className={`w-6 h-6 rounded-full ${evidenceColors[level]} text-white text-xs font-bold flex items-center justify-center`}>
      {level}
    </div>
    <span className="text-xs text-slate-500 capitalize">{strength} recommendation</span>
  </div>
);

const UrgencyBadge: React.FC<{ urgency: UrgencyLevel }> = ({ urgency }) => {
  const config = urgencyConfig[urgency];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
};

// =============================================================================
// RECOMMENDATION CARD
// =============================================================================

const RecommendationCard: React.FC<{
  recommendation: ClinicalRecommendation;
  onAccept: (id: string, actionIndex: number) => void;
  onDismiss: (id: string) => void;
}> = ({ recommendation, onAccept, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  return (
    <div className={`rounded-xl border-2 ${
      recommendation.urgency === 'urgent' || recommendation.urgency === 'emergent'
        ? 'border-red-200 bg-red-50/50'
        : recommendation.type === 'safety'
        ? 'border-orange-200 bg-orange-50/50'
        : 'border-slate-200 bg-white'
    } overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeColors[recommendation.type]}`}>
              <TypeIcon type={recommendation.type} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[recommendation.type]}`}>
                  {typeLabels[recommendation.type]}
                </span>
                <UrgencyBadge urgency={recommendation.urgency} />
              </div>
              <h3 className="font-semibold text-slate-900">{recommendation.title}</h3>
            </div>
          </div>
          <button
            onClick={() => onDismiss(recommendation.id)}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-3">{recommendation.description}</p>

        {/* Evidence & Guidelines */}
        <div className="flex items-center justify-between mb-4">
          <EvidenceBadge level={recommendation.evidenceLevel} strength={recommendation.strength} />
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500">
              {recommendation.guidelines[0]?.organization} {recommendation.guidelines[0]?.year}
            </span>
            {recommendation.guidelines[0]?.url && (
              <a
                href={recommendation.guidelines[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Triggered By */}
        <div className="flex flex-wrap gap-2 mb-4">
          {recommendation.triggeredBy.map((trigger, idx) => (
            <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
              {trigger}
            </span>
          ))}
        </div>

        {/* Primary Actions */}
        <div className="space-y-2">
          {recommendation.actions.slice(0, 2).map((action, idx) => (
            <button
              key={idx}
              onClick={() => onAccept(recommendation.id, idx)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                idx === 0
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Play size={16} className={idx === 0 ? 'text-white' : 'text-slate-500'} />
                <div className="text-left">
                  <p className="text-sm font-medium">{action.description}</p>
                  {action.orderTemplate && (
                    <p className={`text-xs ${idx === 0 ? 'text-blue-100' : 'text-slate-500'}`}>
                      {action.orderTemplate.name}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronDown size={16} />
              Show Less
            </>
          ) : (
            <>
              <ChevronRight size={16} />
              View Details & Evidence
            </>
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 bg-slate-50/50">
          {/* Rationale */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Brain size={14} />
              Clinical Rationale
            </h4>
            <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
              {recommendation.rationale}
            </p>
          </div>

          {/* Expected Benefit */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Target size={14} />
              Expected Benefit
            </h4>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-700">{recommendation.expectedBenefit}</p>
              {recommendation.numberNeededToTreat && (
                <p className="text-xs text-emerald-600 mt-1">
                  NNT: {recommendation.numberNeededToTreat} patients
                </p>
              )}
              {recommendation.riskReduction && (
                <p className="text-xs text-emerald-600 mt-1">
                  {recommendation.riskReduction}
                </p>
              )}
            </div>
          </div>

          {/* All Actions */}
          {recommendation.actions.length > 2 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Additional Actions</h4>
              <div className="space-y-2">
                {recommendation.actions.slice(2).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAccept(recommendation.id, idx + 2)}
                    className="w-full flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors text-left"
                  >
                    <CheckCircle size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-700">{action.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {recommendation.alternatives && recommendation.alternatives.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2"
              >
                <Info size={14} />
                Alternative Options
                <ChevronRight size={14} className={showAlternatives ? 'rotate-90' : ''} />
              </button>
              {showAlternatives && (
                <div className="space-y-2">
                  {recommendation.alternatives.map((alt, idx) => (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900">{alt.description}</p>
                      <p className="text-xs text-blue-700 mt-1">{alt.reason}</p>
                      <p className="text-xs text-blue-600 mt-1 italic">
                        When to consider: {alt.whenToConsider}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Precautions */}
          {recommendation.precautions && recommendation.precautions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                Precautions
              </h4>
              <ul className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                {recommendation.precautions.map((precaution, idx) => (
                  <li key={idx} className="text-sm text-amber-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    {precaution}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contraindications */}
          {recommendation.contraindications && recommendation.contraindications.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                <X size={14} />
                Contraindications
              </h4>
              <ul className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                {recommendation.contraindications.map((contra, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {contra}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Guidelines */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <BookOpen size={14} />
              Guideline References
            </h4>
            <div className="space-y-2">
              {recommendation.guidelines.map((guideline, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{guideline.organization}</p>
                    <p className="text-xs text-slate-500">{guideline.guidelineName} ({guideline.year})</p>
                    {guideline.grade && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                        Grade {guideline.grade}
                      </span>
                    )}
                  </div>
                  {guideline.url && (
                    <a
                      href={guideline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ClinicalRecommendations: React.FC<{
  patientId?: string;
  patientName?: string;
}> = ({ patientId, patientName }) => {
  const [recommendations, setRecommendations] = useState<ClinicalRecommendation[]>(mockRecommendations);
  const [filter, setFilter] = useState<RecommendationType | 'all'>('all');
  const [acceptedActions, setAcceptedActions] = useState<string[]>([]);

  const filteredRecommendations = filter === 'all'
    ? recommendations
    : recommendations.filter(r => r.type === filter);

  const summary: RecommendationsSummary = {
    total: recommendations.length,
    urgent: recommendations.filter(r => r.urgency === 'urgent' || r.urgency === 'emergent').length,
    safety: recommendations.filter(r => r.type === 'safety').length,
    therapeutic: recommendations.filter(r => r.type === 'therapeutic').length,
    preventive: recommendations.filter(r => r.type === 'preventive').length,
  };

  const handleAccept = (recId: string, actionIndex: number) => {
    const key = `${recId}_${actionIndex}`;
    setAcceptedActions(prev => [...prev, key]);
    // In production, this would trigger the order/action
    console.log('Accepted action:', recId, actionIndex);
  };

  const handleDismiss = (recId: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== recId));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Clinical Recommendations</h2>
              <p className="text-teal-100 text-sm">Evidence-based guidance with guideline citations</p>
            </div>
          </div>
          {patientName && (
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{patientName}</span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 divide-x divide-slate-200 border-b border-slate-200">
        {[
          { label: 'Total', value: summary.total, color: 'text-slate-700' },
          { label: 'Urgent', value: summary.urgent, color: 'text-red-600' },
          { label: 'Safety', value: summary.safety, color: 'text-orange-600' },
          { label: 'Treatment', value: summary.therapeutic, color: 'text-blue-600' },
          { label: 'Preventive', value: summary.preventive, color: 'text-emerald-600' },
        ].map((stat, idx) => (
          <div key={idx} className="p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        {[
          { key: 'all', label: 'All' },
          { key: 'safety', label: 'Safety Alerts' },
          { key: 'therapeutic', label: 'Treatment' },
          { key: 'preventive', label: 'Preventive' },
          { key: 'cost_optimization', label: 'Cost Savings' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-teal-100 text-teal-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="p-6 space-y-4 max-h-[700px] overflow-y-auto">
        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No recommendations in this category</p>
          </div>
        ) : (
          filteredRecommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ClinicalRecommendations;
