// ============================================================
// ATTENDING AI - Risk Score Dashboard
// apps/provider-portal/components/intelligence/RiskScoreDashboard.tsx
//
// Displays predictive risk scoring for patient deterioration
// Revolutionary Feature: Early warning before clinical decline
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Clock,
  ChevronDown,
  ChevronRight,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
} from 'lucide-react';

// Types from clinical-intelligence package
interface RiskScore {
  overall: number;
  category: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;
  factors: RiskFactor[];
  recommendations: RiskRecommendation[];
  predictedOutcomes: PredictedOutcome[];
  trending: 'improving' | 'stable' | 'worsening' | 'unknown';
  nextReassessment: string;
}

interface RiskFactor {
  name: string;
  value: number | string;
  contribution: number;
  threshold?: string;
  severity: 'normal' | 'borderline' | 'abnormal' | 'critical';
  trend?: 'improving' | 'stable' | 'worsening';
}

interface RiskRecommendation {
  priority: 'immediate' | 'urgent' | 'routine';
  category: 'monitoring' | 'intervention' | 'consultation' | 'testing';
  action: string;
  rationale: string;
  timeframe: string;
}

interface PredictedOutcome {
  outcome: string;
  probability: number;
  timeframe: string;
  preventable: boolean;
}

interface RiskScoreDashboardProps {
  patientId: string;
  patientName: string;
  riskScore: RiskScore;
  onRefresh?: () => void;
  onAcknowledge?: (recommendation: RiskRecommendation) => void;
}

export function RiskScoreDashboard({
  patientId,
  patientName,
  riskScore,
  onRefresh,
  onAcknowledge,
}: RiskScoreDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['factors', 'recommendations']);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Color mappings
  const categoryColors = {
    low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', ring: 'ring-green-500' },
    moderate: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', ring: 'ring-yellow-500' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', ring: 'ring-orange-500' },
    critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', ring: 'ring-red-500' },
  };

  const severityColors = {
    normal: 'text-green-600 bg-green-50',
    borderline: 'text-yellow-600 bg-yellow-50',
    abnormal: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
  };

  const trendIcons = {
    improving: <TrendingDown className="w-4 h-4 text-green-500" />,
    stable: <Minus className="w-4 h-4 text-gray-500" />,
    worsening: <TrendingUp className="w-4 h-4 text-red-500" />,
    unknown: <Activity className="w-4 h-4 text-gray-400" />,
  };

  const priorityColors = {
    immediate: 'bg-red-100 text-red-700 border-red-300',
    urgent: 'bg-orange-100 text-orange-700 border-orange-300',
    routine: 'bg-blue-100 text-blue-700 border-blue-300',
  };

  const colors = categoryColors[riskScore.category];

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${colors.border}`}>
      {/* Header */}
      <div className={`${colors.bg} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}>
              {riskScore.category === 'critical' ? (
                <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
              ) : (
                <Activity className={`w-6 h-6 ${colors.text}`} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Risk Assessment</h2>
              <p className="text-sm text-gray-600">{patientName}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Score Display */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* Main Score */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - riskScore.overall / 100)}`}
                  className={colors.text}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${colors.text}`}>{riskScore.overall}</span>
              </div>
            </div>
            
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                {riskScore.category.charAt(0).toUpperCase() + riskScore.category.slice(1)} Risk
              </span>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                {trendIcons[riskScore.trending]}
                <span>
                  {riskScore.trending === 'unknown' ? 'Trend unknown' : `Trending ${riskScore.trending}`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-500">Confidence</div>
              <div className="font-semibold text-gray-900">{Math.round(riskScore.confidence * 100)}%</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Next Check</div>
              <div className="font-semibold text-gray-900">{riskScore.nextReassessment}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('factors')}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-gray-900">Risk Factors ({riskScore.factors.length})</span>
          {expandedSections.includes('factors') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('factors') && (
          <div className="px-6 pb-4 space-y-3">
            {riskScore.factors.map((factor, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${severityColors[factor.severity]} flex items-center justify-between`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {factor.severity === 'critical' && <AlertTriangle className="w-5 h-5" />}
                    {factor.severity === 'abnormal' && <AlertCircle className="w-5 h-5" />}
                    {factor.severity === 'borderline' && <Info className="w-5 h-5" />}
                    {factor.severity === 'normal' && <CheckCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-medium">{factor.name}</div>
                    <div className="text-sm opacity-75">
                      Value: {factor.value} {factor.threshold && `(${factor.threshold})`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {factor.trend && trendIcons[factor.trend]}
                  <span className="text-sm font-medium">
                    {Math.round(factor.contribution * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('recommendations')}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-gray-900">
            Recommendations ({riskScore.recommendations.length})
          </span>
          {expandedSections.includes('recommendations') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('recommendations') && (
          <div className="px-6 pb-4 space-y-3">
            {riskScore.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase`}>
                        {rec.priority}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{rec.category}</span>
                    </div>
                    <p className="mt-1 font-medium">{rec.action}</p>
                    <p className="mt-1 text-sm opacity-75">{rec.rationale}</p>
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      {rec.timeframe}
                    </div>
                  </div>
                  {onAcknowledge && (
                    <button
                      onClick={() => onAcknowledge(rec)}
                      className="flex-shrink-0 px-3 py-1 text-sm bg-white rounded border hover:bg-gray-50"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Predicted Outcomes */}
      <div>
        <button
          onClick={() => toggleSection('outcomes')}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-gray-900">
            Predicted Outcomes ({riskScore.predictedOutcomes.length})
          </span>
          {expandedSections.includes('outcomes') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('outcomes') && (
          <div className="px-6 pb-4 space-y-3">
            {riskScore.predictedOutcomes.map((outcome, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{outcome.outcome}</span>
                    <span className="ml-2 text-sm text-gray-500">({outcome.timeframe})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {outcome.preventable && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        Preventable
                      </span>
                    )}
                    <span className={`font-bold ${
                      outcome.probability > 0.5 ? 'text-red-600' :
                      outcome.probability > 0.25 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {Math.round(outcome.probability * 100)}%
                    </span>
                  </div>
                </div>
                {/* Probability bar */}
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      outcome.probability > 0.5 ? 'bg-red-500' :
                      outcome.probability > 0.25 ? 'bg-orange-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${outcome.probability * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RiskScoreDashboard;
