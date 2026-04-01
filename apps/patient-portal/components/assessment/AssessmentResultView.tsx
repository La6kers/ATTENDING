// =============================================================================
// ATTENDING AI — Assessment Result View
// apps/patient-portal/components/assessment/AssessmentResultView.tsx
//
// Shows narrative summary + AI differential diagnosis after assessment.
// Replaces the simple success screen with a clinical results page.
// =============================================================================

import React from 'react';
import {
  Stethoscope,
  AlertTriangle,
  CheckCircle,
  Home,
  Send,
  RefreshCw,
  Activity,
  FileText,
  ShieldAlert,
} from 'lucide-react';

import type { DifferentialDx } from '../../lib/differentialDiagnosis';
import type { RedFlag } from '../../../shared/types/chat.types';

// =============================================================================
// Props
// =============================================================================

export interface AssessmentResultViewProps {
  patientName?: string;
  summary: string;
  differentialDiagnosis: DifferentialDx[];
  redFlags: RedFlag[];
  urgencyLevel: string;
  isSubmitted: boolean;
  isSubmitting?: boolean;
  onSubmit: () => void;
  onNewAssessment: () => void;
  onGoHome: () => void;
}

// =============================================================================
// Urgency Badge
// =============================================================================

const UrgencyBadge: React.FC<{ level: string }> = ({ level }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    emergency: { bg: 'bg-red-100', text: 'text-red-700', label: 'EMERGENCY' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'HIGH PRIORITY' },
    moderate: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'MODERATE' },
    standard: { bg: 'bg-green-100', text: 'text-green-700', label: 'STANDARD' },
  };
  const c = config[level.toLowerCase()] || config.standard;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// =============================================================================
// Probability Bar
// =============================================================================

const ProbabilityBar: React.FC<{ probability: number; category: string }> = ({ probability, category }) => {
  const getColor = () => {
    if (category.includes('Emergency')) return 'from-red-500 to-red-400';
    if (probability >= 40) return 'from-teal-500 to-teal-400';
    if (probability >= 20) return 'from-blue-500 to-blue-400';
    return 'from-gray-400 to-gray-300';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor()} rounded-full transition-all duration-700`}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-sm font-bold text-white min-w-[3rem] text-right">{probability}%</span>
    </div>
  );
};

// =============================================================================
// Component
// =============================================================================

export const AssessmentResultView: React.FC<AssessmentResultViewProps> = ({
  patientName,
  summary,
  differentialDiagnosis,
  redFlags,
  urgencyLevel,
  isSubmitted,
  isSubmitting,
  onSubmit,
  onNewAssessment,
  onGoHome,
}) => {
  return (
    <div
      className="min-h-screen overflow-y-auto pb-8"
      style={{ background: 'linear-gradient(135deg, #0c3547 0%, #0c4c5e 50%, #0f5f76 100%)' }}
    >
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-teal-300" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isSubmitted ? 'Assessment Submitted' : 'Assessment Complete'}
          </h1>
          {patientName && (
            <p className="text-white/70 text-sm mb-2">Patient: {patientName}</p>
          )}
          <UrgencyBadge level={urgencyLevel} />
        </div>

        {/* Red Flags Alert */}
        {redFlags.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-400/30">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <h3 className="font-bold text-red-300">Red Flags Detected</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {redFlags.map((rf, i) => (
                <span key={i} className="px-2 py-1 rounded-lg bg-red-500/20 text-red-200 text-xs font-medium">
                  {typeof rf === 'string' ? rf : rf.symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Summary */}
        <div className="mb-6 p-5 rounded-xl bg-white/8 border border-white/15 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-teal-300" />
            <h2 className="font-bold text-white text-lg">Clinical Summary</h2>
          </div>
          <div className="text-white/85 text-sm leading-relaxed whitespace-pre-line">
            {summary}
          </div>
        </div>

        {/* AI Differential Diagnosis */}
        <div className="mb-6 p-5 rounded-xl bg-white/8 border border-white/15 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-teal-300" />
            <h2 className="font-bold text-white text-lg">AI-Supported Differential Diagnosis</h2>
          </div>
          <p className="text-white/50 text-xs mb-4">
            These are AI-suggested considerations for the treating provider — not a diagnosis.
            All clinical decisions remain with your healthcare provider.
          </p>

          <div className="space-y-4">
            {differentialDiagnosis.map((dx, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border transition-all ${
                  dx.category.includes('Emergency')
                    ? 'bg-red-500/10 border-red-400/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{dx.name}</h3>
                    <span className="text-xs text-white/40 font-mono">{dx.icd10Code}</span>
                    <span className="ml-2 text-xs text-teal-300/70">{dx.category}</span>
                  </div>
                </div>
                <ProbabilityBar probability={dx.probability} category={dx.category} />
                {dx.supportingEvidence.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {dx.supportingEvidence.map((ev, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md bg-white/8 text-white/60 text-xs">
                        {ev}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-400/20">
          <p className="text-xs text-amber-200/80 leading-relaxed">
            <strong>Important:</strong> This assessment supports — but never replaces — clinical judgment.
            AI-generated differential diagnosis is for provider consideration only. If your condition worsens
            or you experience emergency symptoms, call <strong>911</strong> immediately.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isSubmitted && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send to Provider
                </>
              )}
            </button>
          )}

          {isSubmitted && (
            <div className="flex items-center justify-center gap-2 py-3 text-green-300">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">Sent to your provider</span>
            </div>
          )}

          <button
            onClick={onGoHome}
            className="w-full py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/15 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>

          <button
            onClick={onNewAssessment}
            className="w-full py-3 text-white/60 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Start New Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultView;
