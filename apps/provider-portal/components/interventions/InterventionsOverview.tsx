// =============================================================================
// ATTENDING AI - Interventions Overview Dashboard
// apps/provider-portal/components/interventions/InterventionsOverview.tsx
//
// Summary view of all clinical intervention modules
// =============================================================================

'use client';

import React from 'react';
import {
  Brain,
  Sparkles,
  FlaskConical,
  Heart,
  Pill,
  Users,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Activity,
  Target,
  Shield,
  Clock,
  Zap,
  ArrowRight,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface InterventionSummary {
  id: string;
  module: string;
  icon: any;
  gradient: string;
  totalItems: number;
  urgentItems: number;
  recentActivity: string;
  topItems: Array<{
    title: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    type: string;
  }>;
  metrics: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }>;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const interventionSummaries: InterventionSummary[] = [
  {
    id: 'recommendations',
    module: 'Clinical Recommendations',
    icon: Brain,
    gradient: 'from-indigo-600 to-purple-600',
    totalItems: 5,
    urgentItems: 2,
    recentActivity: '2 new recommendations generated',
    topItems: [
      { title: 'NSAID + Anticoagulant Interaction', priority: 'urgent', type: 'Safety' },
      { title: 'Diabetes Therapy Intensification', priority: 'high', type: 'Therapeutic' },
      { title: 'Colorectal Cancer Screening Due', priority: 'medium', type: 'Preventive' },
    ],
    metrics: [
      { label: 'Accepted Rate', value: '78%', trend: 'up' },
      { label: 'Avg Time to Action', value: '4.2h', trend: 'down' },
    ],
  },
  {
    id: 'orders',
    module: 'Smart Order Assistant',
    icon: Sparkles,
    gradient: 'from-emerald-600 to-teal-600',
    totalItems: 12,
    urgentItems: 0,
    recentActivity: 'Ready for natural language orders',
    topItems: [
      { title: 'Chest Pain Workup', priority: 'high', type: 'Order Set' },
      { title: 'Diabetes Annual Assessment', priority: 'medium', type: 'Order Set' },
      { title: 'Sepsis Bundle (SEP-1)', priority: 'urgent', type: 'Order Set' },
    ],
    metrics: [
      { label: 'Orders/Day', value: 45, trend: 'up' },
      { label: 'Time Saved', value: '3.5h', trend: 'up' },
    ],
  },
  {
    id: 'trials',
    module: 'Clinical Trial Matching',
    icon: FlaskConical,
    gradient: 'from-purple-600 to-pink-600',
    totalItems: 3,
    urgentItems: 0,
    recentActivity: '1 strong match found',
    topItems: [
      { title: 'Semaglutide in T2DM + CKD', priority: 'high', type: '92% Match' },
      { title: 'SGLT2 Inhibitor for HFpEF', priority: 'medium', type: '78% Match' },
      { title: 'Anti-Inflammatory in DKD', priority: 'low', type: '65% Match' },
    ],
    metrics: [
      { label: 'Patients Enrolled', value: 12, trend: 'up' },
      { label: 'Avg Match Score', value: '78%', trend: 'neutral' },
    ],
  },
  {
    id: 'sdoh',
    module: 'Social Determinants',
    icon: Heart,
    gradient: 'from-rose-600 to-pink-600',
    totalItems: 2,
    urgentItems: 1,
    recentActivity: 'Food insecurity identified',
    topItems: [
      { title: 'Food Insecurity - High Risk', priority: 'urgent', type: 'SDOH' },
      { title: 'Housing Instability - Moderate', priority: 'medium', type: 'SDOH' },
    ],
    metrics: [
      { label: 'Screenings Done', value: 156, trend: 'up' },
      { label: 'Referrals Made', value: 43, trend: 'up' },
    ],
  },
  {
    id: 'medications',
    module: 'Medication Optimizer',
    icon: Pill,
    gradient: 'from-amber-500 to-orange-500',
    totalItems: 7,
    urgentItems: 2,
    recentActivity: 'Deprescribing opportunity identified',
    topItems: [
      { title: 'Benzodiazepine Deprescribing', priority: 'high', type: 'Beers' },
      { title: 'NSAID + HF Contraindication', priority: 'urgent', type: 'Drug-Disease' },
      { title: 'Generic Substitution Available', priority: 'low', type: 'Cost' },
    ],
    metrics: [
      { label: 'Monthly Savings', value: '$385', trend: 'up' },
      { label: 'Pills Reduced', value: 4, trend: 'up' },
    ],
  },
  {
    id: 'coordination',
    module: 'Care Coordination',
    icon: Users,
    gradient: 'from-cyan-600 to-blue-600',
    totalItems: 6,
    urgentItems: 2,
    recentActivity: '1 handoff pending acknowledgment',
    topItems: [
      { title: 'Review Troponin Results', priority: 'urgent', type: 'Lab Review' },
      { title: 'Call Patient - Abnormal K+', priority: 'urgent', type: 'Phone Call' },
      { title: 'Schedule Post-Discharge F/U', priority: 'high', type: 'Follow-up' },
    ],
    metrics: [
      { label: 'Completion Rate', value: '92%', trend: 'up' },
      { label: 'Avg Response', value: '2.1h', trend: 'down' },
    ],
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const TrendIndicator: React.FC<{ trend?: 'up' | 'down' | 'neutral' }> = ({ trend }) => {
  if (!trend || trend === 'neutral') return null;
  return (
    <span className={`text-xs ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
      {trend === 'up' ? '↑' : '↓'}
    </span>
  );
};

const ModuleCard: React.FC<{
  summary: InterventionSummary;
  onNavigate: (moduleId: string) => void;
}> = ({ summary, onNavigate }) => {
  const Icon = summary.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className={`bg-gradient-to-r ${summary.gradient} px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Icon size={20} />
            </div>
            <div>
              <h3 className="font-semibold">{summary.module}</h3>
              <p className="text-xs opacity-80">{summary.recentActivity}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{summary.totalItems}</p>
            {summary.urgentItems > 0 && (
              <p className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {summary.urgentItems} urgent
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top Items */}
      <div className="p-4">
        <div className="space-y-2 mb-4">
          {summary.topItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  item.priority === 'urgent' ? 'bg-red-500' :
                  item.priority === 'high' ? 'bg-orange-500' :
                  item.priority === 'medium' ? 'bg-amber-500' :
                  'bg-slate-400'
                }`} />
                <span className="text-sm text-slate-700 truncate max-w-[180px]">{item.title}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[item.priority]}`}>
                {item.type}
              </span>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          {summary.metrics.map((metric, idx) => (
            <div key={idx} className="text-center">
              <p className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1">
                {metric.value}
                <TrendIndicator trend={metric.trend} />
              </p>
              <p className="text-xs text-slate-500">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onNavigate(summary.id)}
          className="w-full mt-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          View Details
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const InterventionsOverview: React.FC<{
  onNavigate: (moduleId: string) => void;
}> = ({ onNavigate }) => {
  const totalUrgent = interventionSummaries.reduce((sum, s) => sum + s.urgentItems, 0);
  const totalItems = interventionSummaries.reduce((sum, s) => sum + s.totalItems, 0);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <Zap className="text-amber-400" />
              Clinical Interventions Overview
            </h2>
            <p className="text-slate-300">
              AI-powered clinical decision support across {interventionSummaries.length} modules
            </p>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-white">{totalItems}</p>
              <p className="text-sm text-slate-400">Total Interventions</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-400">{totalUrgent}</p>
              <p className="text-sm text-slate-400">Urgent Actions</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-400">$385</p>
              <p className="text-sm text-slate-400">Monthly Savings</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-400">3</p>
              <p className="text-sm text-slate-400">Trial Matches</p>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Alerts Banner */}
      {totalUrgent > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">
                {totalUrgent} Urgent Action{totalUrgent > 1 ? 's' : ''} Required
              </h3>
              <p className="text-sm text-red-700">
                Review and address high-priority clinical interventions
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
            Review Urgent Items
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Module Grid */}
      <div className="grid grid-cols-3 gap-6">
        {interventionSummaries.map((summary) => (
          <ModuleCard
            key={summary.id}
            summary={summary}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="text-emerald-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">156</p>
            <p className="text-sm text-slate-500">Interventions Completed</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Activity className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">78%</p>
            <p className="text-sm text-slate-500">Recommendation Acceptance</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Clock className="text-amber-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">4.2h</p>
            <p className="text-sm text-slate-500">Avg Time to Action</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Target className="text-purple-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">12</p>
            <p className="text-sm text-slate-500">Patients Enrolled in Trials</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterventionsOverview;
