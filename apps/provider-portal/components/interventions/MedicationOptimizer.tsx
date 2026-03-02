// =============================================================================
// ATTENDING AI - Medication Optimizer Component
// apps/provider-portal/components/interventions/MedicationOptimizer.tsx
//
// AI-powered medication review and optimization
// =============================================================================

'use client';

import React, { useState } from 'react';
import {
  Pill,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Combine,
  Shield,
  Clock,
  FileText,
  AlertCircle,
  BookOpen,
  Activity,
  Info,
  Target,
  Zap,
  ArrowRight,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type OptimizationType = 
  | 'deprescribe'
  | 'therapeutic_substitution'
  | 'dose_optimization'
  | 'duplicate_therapy'
  | 'drug_disease_interaction'
  | 'pill_burden_reduction'
  | 'renal_adjustment'
  | 'cost_reduction';

interface MedicationOptimization {
  id: string;
  type: OptimizationType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  currentMedication: {
    name: string;
    dose: string;
    frequency: string;
    indication?: string;
  };
  recommendation: string;
  rationale: string;
  suggestedAction: string;
  alternativeMedication?: {
    name: string;
    dose: string;
    frequency: string;
  };
  evidenceLevel: string;
  guidelines?: string[];
  expectedBenefit: string;
  estimatedSavings?: number;
  pillBurdenReduction?: number;
  tapering?: {
    steps: Array<{ week: number; dose: string; instructions: string }>;
    duration: string;
  };
  warnings?: string[];
}

interface MedicationReviewReport {
  totalMedications: number;
  highRiskMedications: number;
  polypharmacyLevel: 'none' | 'moderate' | 'severe';
  optimizations: MedicationOptimization[];
  potentialCostSavings: number;
  pillBurdenReduction: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockReport: MedicationReviewReport = {
  totalMedications: 12,
  highRiskMedications: 3,
  polypharmacyLevel: 'severe',
  potentialCostSavings: 385,
  pillBurdenReduction: 4,
  optimizations: [
    {
      id: 'opt_1',
      type: 'deprescribe',
      priority: 'high',
      currentMedication: {
        name: 'Lorazepam',
        dose: '0.5mg',
        frequency: 'TID',
        indication: 'Anxiety',
      },
      recommendation: 'Strongly consider benzodiazepine tapering and discontinuation',
      rationale: 'Beers Criteria: Older adults have increased sensitivity. Risk of cognitive impairment, delirium, falls, fractures, and motor vehicle accidents.',
      suggestedAction: 'reduce',
      evidenceLevel: 'High (AGS Beers Criteria 2023)',
      guidelines: ['AGS Beers Criteria 2023', 'STOPP/START v2'],
      expectedBenefit: 'Reduced fall risk, improved cognition, reduced sedation',
      tapering: {
        steps: [
          { week: 1, dose: '0.375mg TID', instructions: 'Reduce dose by 25%' },
          { week: 3, dose: '0.25mg TID', instructions: 'Reduce dose by 50%' },
          { week: 5, dose: '0.25mg BID', instructions: 'Reduce frequency' },
          { week: 7, dose: '0.25mg QHS', instructions: 'Once daily at bedtime' },
          { week: 9, dose: 'Discontinue', instructions: 'Stop medication' },
        ],
        duration: '8-10 weeks',
      },
      warnings: ['Monitor for withdrawal symptoms', 'Consider non-pharmacologic anxiety management'],
    },
    {
      id: 'opt_2',
      type: 'deprescribe',
      priority: 'medium',
      currentMedication: {
        name: 'Omeprazole',
        dose: '40mg',
        frequency: 'Daily',
        indication: 'GERD',
      },
      recommendation: 'Consider PPI deprescribing or step-down to H2 blocker',
      rationale: 'Long-term PPI use associated with increased risk of C. diff, bone fractures, CKD, and B12 deficiency. Patient has been on PPI > 8 weeks without clear ongoing indication.',
      suggestedAction: 'reduce',
      evidenceLevel: 'High (ACG Guidelines)',
      guidelines: ['ACG Guidelines', 'Choosing Wisely'],
      expectedBenefit: 'Reduced long-term adverse effects, cost savings',
      estimatedSavings: 45,
      tapering: {
        steps: [
          { week: 1, dose: '20mg Daily', instructions: 'Reduce to standard dose' },
          { week: 3, dose: '20mg every other day', instructions: 'Alternate days' },
          { week: 5, dose: 'Famotidine 20mg PRN', instructions: 'Switch to H2 blocker as needed' },
        ],
        duration: '4-6 weeks',
      },
      warnings: ['May experience rebound acid hypersecretion', 'Monitor for symptom recurrence'],
    },
    {
      id: 'opt_3',
      type: 'drug_disease_interaction',
      priority: 'urgent',
      currentMedication: {
        name: 'Meloxicam',
        dose: '15mg',
        frequency: 'Daily',
        indication: 'Arthritis pain',
      },
      recommendation: 'NSAIDs worsen heart failure and CKD - avoid if possible',
      rationale: 'Patient has heart failure and CKD Stage 3. NSAIDs cause sodium retention, reduce renal blood flow, and can precipitate HF exacerbation.',
      suggestedAction: 'discontinue',
      alternativeMedication: {
        name: 'Acetaminophen',
        dose: '650mg',
        frequency: 'Q6H PRN',
      },
      evidenceLevel: 'High (ACC/AHA HF Guidelines)',
      guidelines: ['ACC/AHA Heart Failure Guidelines', 'AGS Beers Criteria'],
      expectedBenefit: 'Reduced risk of HF exacerbation and AKI',
      warnings: ['May need alternative pain management strategy'],
    },
    {
      id: 'opt_4',
      type: 'duplicate_therapy',
      priority: 'high',
      currentMedication: {
        name: 'Lisinopril 20mg + Losartan 50mg',
        dose: 'Both active',
        frequency: 'Daily',
        indication: 'Hypertension',
      },
      recommendation: 'Patient is on 2 medications in the ACE-I/ARB class. Review for therapeutic duplication.',
      rationale: 'Dual RAAS blockade increases risk of hyperkalemia, hypotension, and AKI without clear mortality benefit.',
      suggestedAction: 'discontinue',
      evidenceLevel: 'High (ONTARGET Trial)',
      guidelines: ['ACC/AHA Hypertension Guidelines'],
      expectedBenefit: 'Reduced adverse effects, improved safety',
      pillBurdenReduction: 1,
    },
    {
      id: 'opt_5',
      type: 'cost_reduction',
      priority: 'low',
      currentMedication: {
        name: 'Crestor (Rosuvastatin)',
        dose: '20mg',
        frequency: 'Daily',
        indication: 'Hyperlipidemia',
      },
      recommendation: 'Consider switching to generic rosuvastatin for cost savings',
      rationale: 'Generic rosuvastatin is bioequivalent to brand Crestor at significantly lower cost.',
      suggestedAction: 'switch',
      alternativeMedication: {
        name: 'Rosuvastatin (generic)',
        dose: '20mg',
        frequency: 'Daily',
      },
      evidenceLevel: 'High (FDA Generic Approval)',
      expectedBenefit: 'Estimated savings of $120/month',
      estimatedSavings: 120,
    },
    {
      id: 'opt_6',
      type: 'pill_burden_reduction',
      priority: 'low',
      currentMedication: {
        name: 'Amlodipine 5mg + Lisinopril 20mg',
        dose: 'Separate tablets',
        frequency: 'Both Daily',
        indication: 'Hypertension',
      },
      recommendation: 'Consider combination Amlodipine/Lisinopril to reduce pill burden',
      rationale: 'Combination products can improve adherence by reducing number of daily pills.',
      suggestedAction: 'consolidate',
      alternativeMedication: {
        name: 'Amlodipine/Lisinopril 5/20mg',
        dose: '1 tablet',
        frequency: 'Daily',
      },
      evidenceLevel: 'Moderate',
      expectedBenefit: 'Improved adherence, reduced pill burden',
      pillBurdenReduction: 1,
      estimatedSavings: 15,
    },
    {
      id: 'opt_7',
      type: 'renal_adjustment',
      priority: 'urgent',
      currentMedication: {
        name: 'Gabapentin',
        dose: '600mg',
        frequency: 'TID',
        indication: 'Neuropathy',
      },
      recommendation: 'Renal adjustment needed (eGFR 35): Reduce to 200-300mg daily',
      rationale: 'Gabapentin is renally cleared. Current dose at eGFR 35 increases risk of toxicity including sedation, ataxia, and respiratory depression.',
      suggestedAction: 'modify',
      alternativeMedication: {
        name: 'Gabapentin',
        dose: '300mg',
        frequency: 'Daily',
      },
      evidenceLevel: 'High (Package Insert)',
      expectedBenefit: 'Prevent drug toxicity',
      warnings: ['Monitor for sedation', 'Assess pain control at lower dose'],
    },
  ],
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const typeConfig: Record<OptimizationType, { icon: any; label: string; color: string }> = {
  deprescribe: { icon: TrendingDown, label: 'Deprescribe', color: 'bg-teal-100 text-teal-700' },
  therapeutic_substitution: { icon: RefreshCw, label: 'Substitution', color: 'bg-blue-100 text-blue-700' },
  dose_optimization: { icon: Target, label: 'Dose Adjustment', color: 'bg-amber-100 text-amber-700' },
  duplicate_therapy: { icon: Combine, label: 'Duplicate', color: 'bg-red-100 text-red-700' },
  drug_disease_interaction: { icon: AlertTriangle, label: 'Drug-Disease', color: 'bg-red-100 text-red-700' },
  pill_burden_reduction: { icon: Pill, label: 'Pill Burden', color: 'bg-emerald-100 text-emerald-700' },
  renal_adjustment: { icon: Activity, label: 'Renal Adjust', color: 'bg-orange-100 text-orange-700' },
  cost_reduction: { icon: DollarSign, label: 'Cost Savings', color: 'bg-green-100 text-green-700' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  urgent: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Urgent' },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'High' },
  medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Medium' },
  low: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Low' },
};

const OptimizationCard: React.FC<{
  optimization: MedicationOptimization;
  onAccept: (id: string) => void;
  onDefer: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ optimization, onAccept, onDefer, onReject }) => {
  const [expanded, setExpanded] = useState(false);
  const [showTapering, setShowTapering] = useState(false);

  const { icon: TypeIcon, label, color } = typeConfig[optimization.type];
  const priority = priorityConfig[optimization.priority];

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${
      optimization.priority === 'urgent' ? 'border-red-300 bg-red-50/30' :
      optimization.priority === 'high' ? 'border-orange-200 bg-orange-50/30' :
      'border-slate-200 bg-white'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <TypeIcon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                  {label}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priority.color}`}>
                  {priority.label}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900">
                {optimization.currentMedication.name}
              </h3>
              <p className="text-sm text-slate-500">
                {optimization.currentMedication.dose} {optimization.currentMedication.frequency}
                {optimization.currentMedication.indication && (
                  <span className="ml-2 text-slate-400">• {optimization.currentMedication.indication}</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {optimization.estimatedSavings && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                <DollarSign size={14} className="text-green-600" />
                <span className="text-sm font-medium text-green-700">${optimization.estimatedSavings}/mo</span>
              </div>
            )}
            {optimization.pillBurdenReduction && (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-full">
                <Pill size={14} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">-{optimization.pillBurdenReduction} pills</span>
              </div>
            )}
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-slate-100 rounded-lg p-3 mb-3">
          <p className="text-sm font-medium text-slate-900">{optimization.recommendation}</p>
        </div>

        {/* Alternative */}
        {optimization.alternativeMedication && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <ArrowRight size={18} className="text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Switch to: {optimization.alternativeMedication.name}
              </p>
              <p className="text-xs text-blue-700">
                {optimization.alternativeMedication.dose} {optimization.alternativeMedication.frequency}
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => onAccept(optimization.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
          >
            <CheckCircle size={16} />
            Accept
          </button>
          <button
            onClick={() => onDefer(optimization.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Clock size={16} />
            Defer
          </button>
          <button
            onClick={() => onReject(optimization.id)}
            className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <XCircle size={16} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-2 border border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="pt-3 border-t border-slate-200 space-y-4">
            {/* Rationale */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Info size={14} />
                Clinical Rationale
              </h4>
              <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                {optimization.rationale}
              </p>
            </div>

            {/* Evidence */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500">Evidence: {optimization.evidenceLevel}</span>
              </div>
              {optimization.guidelines && (
                <div className="flex flex-wrap gap-1">
                  {optimization.guidelines.map((g, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Expected Benefit */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-emerald-700 mb-1 flex items-center gap-2">
                <Target size={14} />
                Expected Benefit
              </h4>
              <p className="text-sm text-emerald-600">{optimization.expectedBenefit}</p>
            </div>

            {/* Tapering Schedule */}
            {optimization.tapering && (
              <div>
                <button
                  onClick={() => setShowTapering(!showTapering)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2"
                >
                  <Clock size={14} />
                  Tapering Schedule ({optimization.tapering.duration})
                  <ChevronDown size={14} className={`transition-transform ${showTapering ? 'rotate-180' : ''}`} />
                </button>
                {showTapering && (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-600">Week</th>
                          <th className="px-3 py-2 text-left text-slate-600">Dose</th>
                          <th className="px-3 py-2 text-left text-slate-600">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {optimization.tapering.steps.map((step, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-slate-900">Week {step.week}</td>
                            <td className="px-3 py-2 text-slate-700">{step.dose}</td>
                            <td className="px-3 py-2 text-slate-600">{step.instructions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Warnings */}
            {optimization.warnings && optimization.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Important Considerations
                </h4>
                <ul className="space-y-1">
                  {optimization.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MedicationOptimizer: React.FC<{
  patientId?: string;
  patientName?: string;
}> = ({ patientId, patientName }) => {
  const [report] = useState<MedicationReviewReport>(mockReport);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'deprescribe' | 'cost'>('all');
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  const filteredOptimizations = report.optimizations.filter(opt => {
    if (processedIds.has(opt.id)) return false;
    if (filter === 'all') return true;
    if (filter === 'urgent') return opt.priority === 'urgent' || opt.priority === 'high';
    if (filter === 'deprescribe') return opt.type === 'deprescribe';
    if (filter === 'cost') return opt.type === 'cost_reduction' || opt.estimatedSavings;
    return true;
  });

  const handleAccept = (id: string) => {
    setProcessedIds(prev => new Set([...prev, id]));
    console.log('Accepted optimization:', id);
  };

  const handleDefer = (id: string) => {
    setProcessedIds(prev => new Set([...prev, id]));
    console.log('Deferred optimization:', id);
  };

  const handleReject = (id: string) => {
    setProcessedIds(prev => new Set([...prev, id]));
    console.log('Rejected optimization:', id);
  };

  const polypharmacyColor = {
    none: 'text-emerald-600',
    moderate: 'text-amber-600',
    severe: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Medication Optimizer</h2>
              <p className="text-amber-100 text-sm">AI-powered medication review & deprescribing</p>
            </div>
          </div>
          {patientName && (
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{patientName}</span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{report.totalMedications}</p>
          <p className="text-xs text-slate-500">Total Meds</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{report.highRiskMedications}</p>
          <p className="text-xs text-slate-500">High Risk</p>
        </div>
        <div className="p-4 text-center">
          <p className={`text-2xl font-bold ${polypharmacyColor[report.polypharmacyLevel]}`}>
            {report.polypharmacyLevel.charAt(0).toUpperCase() + report.polypharmacyLevel.slice(1)}
          </p>
          <p className="text-xs text-slate-500">Polypharmacy</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">${report.potentialCostSavings}</p>
          <p className="text-xs text-slate-500">Savings/mo</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">-{report.pillBurdenReduction}</p>
          <p className="text-xs text-slate-500">Pills/day</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-2">
        {[
          { key: 'all', label: 'All Recommendations' },
          { key: 'urgent', label: 'Urgent/High Priority' },
          { key: 'deprescribe', label: 'Deprescribing' },
          { key: 'cost', label: 'Cost Savings' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Optimizations List */}
      <div className="p-6 space-y-4 max-h-[700px] overflow-y-auto">
        {filteredOptimizations.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">All recommendations reviewed!</p>
            <p className="text-sm mt-1">Great job optimizing this patient's medications</p>
          </div>
        ) : (
          filteredOptimizations.map((opt) => (
            <OptimizationCard
              key={opt.id}
              optimization={opt}
              onAccept={handleAccept}
              onDefer={handleDefer}
              onReject={handleReject}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MedicationOptimizer;
