// ============================================================
// ATTENDING AI - Clinical Outcomes Dashboard
// apps/provider-portal/components/outcomes/ClinicalOutcomesDashboard.tsx
//
// Phase 8: Prove ROI with real clinical outcomes data
// This dashboard demonstrates measurable value to clinics and investors
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  DollarSign,
  Users,
  Brain,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface QualityMetric {
  id: string;
  name: string;
  description: string;
  currentValue: number;
  targetValue: number;
  nationalAverage: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  category: 'quality' | 'efficiency' | 'safety';
}

interface EfficiencyMetric {
  id: string;
  name: string;
  beforeValue: number;
  afterValue: number;
  unit: string;
  improvement: number;
  improvementType: 'increase' | 'decrease';
}

interface FinancialImpact {
  valueBadedBonuses: number;
  penaltiesAvoided: number;
  additionalRevenue: number;
  totalMonthlyValue: number;
}

interface AIPerformanceMetric {
  totalInferences: number;
  accuracyRate: number;
  providerAgreementRate: number;
  averageLatency: number;
  feedbackPositive: number;
  feedbackNegative: number;
}

interface OutcomesDashboardData {
  qualityMetrics: QualityMetric[];
  efficiencyMetrics: EfficiencyMetric[];
  financialImpact: FinancialImpact;
  aiPerformance: AIPerformanceMetric;
  lastUpdated: string;
}

// ============================================================
// MOCK DATA (Replace with real API calls)
// ============================================================

const mockDashboardData: OutcomesDashboardData = {
  qualityMetrics: [
    {
      id: 'diabetes-control',
      name: 'Diabetes Control',
      description: 'Patients with A1c < 8%',
      currentValue: 82,
      targetValue: 80,
      nationalAverage: 65,
      unit: '%',
      trend: 'up',
      trendValue: 5,
      category: 'quality',
    },
    {
      id: 'bp-control',
      name: 'Hypertension Control',
      description: 'Patients with BP < 140/90',
      currentValue: 75,
      targetValue: 70,
      nationalAverage: 58,
      unit: '%',
      trend: 'up',
      trendValue: 8,
      category: 'quality',
    },
    {
      id: 'breast-cancer-screening',
      name: 'Breast Cancer Screening',
      description: 'Eligible women screened',
      currentValue: 88,
      targetValue: 80,
      nationalAverage: 72,
      unit: '%',
      trend: 'up',
      trendValue: 3,
      category: 'quality',
    },
    {
      id: 'colorectal-screening',
      name: 'Colorectal Cancer Screening',
      description: 'Eligible patients screened',
      currentValue: 71,
      targetValue: 70,
      nationalAverage: 62,
      unit: '%',
      trend: 'up',
      trendValue: 6,
      category: 'quality',
    },
    {
      id: 'readmission-rate',
      name: '30-Day Readmission Rate',
      description: 'Patients readmitted within 30 days',
      currentValue: 8,
      targetValue: 12,
      nationalAverage: 15,
      unit: '%',
      trend: 'down',
      trendValue: 4,
      category: 'safety',
    },
    {
      id: 'care-gap-closure',
      name: 'Care Gap Closure',
      description: 'Open care gaps addressed',
      currentValue: 89,
      targetValue: 85,
      nationalAverage: 68,
      unit: '%',
      trend: 'up',
      trendValue: 12,
      category: 'quality',
    },
  ],
  efficiencyMetrics: [
    {
      id: 'documentation-time',
      name: 'Documentation Time per Patient',
      beforeValue: 16,
      afterValue: 6,
      unit: 'min',
      improvement: 63,
      improvementType: 'decrease',
    },
    {
      id: 'patients-per-day',
      name: 'Patients Seen per Day',
      beforeValue: 18,
      afterValue: 24,
      unit: 'patients',
      improvement: 33,
      improvementType: 'increase',
    },
    {
      id: 'time-to-diagnosis',
      name: 'Time to Initial Assessment',
      beforeValue: 45,
      afterValue: 12,
      unit: 'min',
      improvement: 73,
      improvementType: 'decrease',
    },
    {
      id: 'referral-completion',
      name: 'Referral Completion Rate',
      beforeValue: 45,
      afterValue: 78,
      unit: '%',
      improvement: 73,
      improvementType: 'increase',
    },
    {
      id: 'lab-followup',
      name: 'Lab Result Follow-up Rate',
      beforeValue: 72,
      afterValue: 95,
      unit: '%',
      improvement: 32,
      improvementType: 'increase',
    },
    {
      id: 'phone-triage-time',
      name: 'Phone Triage Time',
      beforeValue: 12,
      afterValue: 4,
      unit: 'min',
      improvement: 67,
      improvementType: 'decrease',
    },
  ],
  financialImpact: {
    valueBadedBonuses: 127500,
    penaltiesAvoided: 45000,
    additionalRevenue: 90000,
    totalMonthlyValue: 262500,
  },
  aiPerformance: {
    totalInferences: 15420,
    accuracyRate: 91.5,
    providerAgreementRate: 94.2,
    averageLatency: 850,
    feedbackPositive: 1143,
    feedbackNegative: 107,
  },
  lastUpdated: new Date().toISOString(),
};

// ============================================================
// COMPONENTS
// ============================================================

// Quality Metric Card
const QualityMetricCard: React.FC<{ metric: QualityMetric }> = ({ metric }) => {
  const isExceedingTarget = metric.id === 'readmission-rate' 
    ? metric.currentValue < metric.targetValue 
    : metric.currentValue >= metric.targetValue;
  
  const isExceedingNational = metric.id === 'readmission-rate'
    ? metric.currentValue < metric.nationalAverage
    : metric.currentValue > metric.nationalAverage;

  const difference = metric.id === 'readmission-rate'
    ? metric.nationalAverage - metric.currentValue
    : metric.currentValue - metric.nationalAverage;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{metric.name}</h3>
          <p className="text-sm text-slate-500">{metric.description}</p>
        </div>
        {isExceedingTarget ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle size={12} />
            On Target
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            <AlertTriangle size={12} />
            Below Target
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-1">
          <span className="text-3xl font-bold text-slate-900">
            {metric.currentValue}
            <span className="text-lg font-normal text-slate-500">{metric.unit}</span>
          </span>
          <span className={`flex items-center gap-1 text-sm font-medium ${
            metric.trend === 'up' ? 'text-emerald-600' : metric.trend === 'down' ? 'text-red-600' : 'text-slate-500'
          }`}>
            {metric.trend === 'up' ? <TrendingUp size={14} /> : metric.trend === 'down' ? <TrendingDown size={14} /> : null}
            {metric.trendValue > 0 ? '+' : ''}{metric.trendValue}% vs last quarter
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isExceedingTarget ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(metric.currentValue, 100)}%` }}
          />
        </div>
      </div>

      {/* Comparison */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Target:</span>
          <span className="font-medium text-slate-700">{metric.targetValue}{metric.unit}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">National:</span>
          <span className="font-medium text-slate-700">{metric.nationalAverage}{metric.unit}</span>
          {isExceedingNational && (
            <span className="text-emerald-600 font-medium">
              (+{difference.toFixed(0)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Efficiency Metric Card
const EfficiencyMetricCard: React.FC<{ metric: EfficiencyMetric }> = ({ metric }) => {
  const isImprovement = metric.improvementType === 'increase' 
    ? metric.afterValue > metric.beforeValue 
    : metric.afterValue < metric.beforeValue;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-slate-900 mb-4">{metric.name}</h3>
      
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-1">Before</p>
          <p className="text-xl font-semibold text-slate-400">
            {metric.beforeValue}
            <span className="text-sm font-normal"> {metric.unit}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-[2px] bg-slate-300" />
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
            isImprovement ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {metric.improvementType === 'decrease' ? '-' : '+'}{metric.improvement}%
          </div>
          <div className="w-8 h-[2px] bg-slate-300" />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-1">After</p>
          <p className="text-xl font-semibold text-emerald-600">
            {metric.afterValue}
            <span className="text-sm font-normal"> {metric.unit}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Financial Impact Card
const FinancialImpactCard: React.FC<{ impact: FinancialImpact }> = ({ impact }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-6 h-6" />
        <h3 className="text-xl font-semibold">Financial Impact</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-emerald-100 text-sm mb-1">Value-Based Bonuses</p>
          <p className="text-2xl font-bold">{formatCurrency(impact.valueBadedBonuses)}</p>
        </div>
        <div>
          <p className="text-emerald-100 text-sm mb-1">Penalties Avoided</p>
          <p className="text-2xl font-bold">{formatCurrency(impact.penaltiesAvoided)}</p>
        </div>
        <div>
          <p className="text-emerald-100 text-sm mb-1">Additional Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(impact.additionalRevenue)}</p>
        </div>
      </div>

      <div className="border-t border-emerald-400 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-emerald-100 text-lg">Total Monthly Value</p>
          <p className="text-4xl font-bold">{formatCurrency(impact.totalMonthlyValue)}</p>
        </div>
        <p className="text-emerald-200 text-sm mt-1">
          {formatCurrency(impact.totalMonthlyValue * 12)} projected annual impact
        </p>
      </div>
    </div>
  );
};

// AI Performance Card
const AIPerformanceCard: React.FC<{ performance: AIPerformanceMetric }> = ({ performance }) => {
  const totalFeedback = performance.feedbackPositive + performance.feedbackNegative;
  const positivePercentage = (performance.feedbackPositive / totalFeedback) * 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-6 h-6 text-teal-600" />
        <h3 className="text-xl font-semibold text-slate-900">AI Performance</h3>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Accuracy Gauge */}
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-3">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#1A8FA8"
                strokeWidth="12"
                strokeDasharray={`${(performance.accuracyRate / 100) * 352} 352`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{performance.accuracyRate}%</span>
            </div>
          </div>
          <p className="text-sm text-slate-600">Diagnostic Accuracy</p>
        </div>

        {/* Provider Agreement Gauge */}
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-3">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeDasharray={`${(performance.providerAgreementRate / 100) * 352} 352`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{performance.providerAgreementRate}%</span>
            </div>
          </div>
          <p className="text-sm text-slate-600">Provider Agreement</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{performance.totalInferences.toLocaleString()}</p>
          <p className="text-sm text-slate-500">Total Inferences</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{performance.averageLatency}ms</p>
          <p className="text-sm text-slate-500">Avg Latency</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{positivePercentage.toFixed(1)}%</p>
          <p className="text-sm text-slate-500">Positive Feedback</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export const ClinicalOutcomesDashboard: React.FC = () => {
  const [data, setData] = useState<OutcomesDashboardData>(mockDashboardData);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('quarter');

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setData({
        ...mockDashboardData,
        lastUpdated: new Date().toISOString(),
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clinical Outcomes Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Proving value with real clinical data
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <div className="flex bg-white rounded-lg border border-slate-200 p-1">
            {(['month', 'quarter', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Quality Metrics Met</p>
              <p className="text-2xl font-bold text-slate-900">5/6</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Time Saved Daily</p>
              <p className="text-2xl font-bold text-slate-900">2.4 hrs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Additional Patients/Day</p>
              <p className="text-2xl font-bold text-slate-900">+6</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">vs National Average</p>
              <p className="text-2xl font-bold text-emerald-600">+17%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-teal-600" />
          <h2 className="text-xl font-semibold text-slate-900">Quality Metrics</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {data.qualityMetrics.map((metric) => (
            <QualityMetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>

      {/* Efficiency Metrics */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-900">Efficiency Improvements</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {data.efficiencyMetrics.map((metric) => (
            <EfficiencyMetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>

      {/* Financial & AI Performance */}
      <div className="grid grid-cols-2 gap-6">
        <FinancialImpactCard impact={data.financialImpact} />
        <AIPerformanceCard performance={data.aiPerformance} />
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-slate-500">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default ClinicalOutcomesDashboard;
