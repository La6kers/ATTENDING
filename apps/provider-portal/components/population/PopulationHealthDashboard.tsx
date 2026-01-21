// ============================================================
// ATTENDING AI - Population Health Intelligence
// apps/provider-portal/components/population/PopulationHealthDashboard.tsx
//
// Phase 9C: Proactive, not reactive healthcare
// Manage entire patient populations with AI-powered insights
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
  Heart,
  Droplets,
  Pill,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  ChevronRight,
  ChevronDown,
  Filter,
  Download,
  RefreshCw,
  Search,
  MapPin,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Settings,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type RiskStratum = 'critical' | 'high' | 'moderate' | 'low' | 'well';
export type QualityMeasure = 'diabetes' | 'hypertension' | 'preventive' | 'mental_health' | 'chronic';
export type OutreachStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'opted_out';

export interface PopulationMetrics {
  totalPatients: number;
  activePatients: number;
  riskDistribution: Record<RiskStratum, number>;
  qualityScores: Record<QualityMeasure, QualityScore>;
  careGaps: number;
  upcomingVisits: number;
  overdueVisits: number;
}

export interface QualityScore {
  name: string;
  currentRate: number;
  targetRate: number;
  nationalBenchmark: number;
  trend: 'up' | 'down' | 'stable';
  patientsInMeasure: number;
  patientsMeetingMeasure: number;
}

export interface PatientPanel {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  riskStratum: RiskStratum;
  riskScore: number;
  conditions: string[];
  careGaps: CareGap[];
  lastVisit: Date;
  nextVisit?: Date;
  pcp: string;
  insuranceType: string;
  outreachStatus?: OutreachStatus;
}

export interface CareGap {
  id: string;
  type: string;
  description: string;
  dueDate?: Date;
  isOverdue: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface OutreachCampaign {
  id: string;
  name: string;
  type: 'care_gap' | 'wellness' | 'chronic_care' | 'preventive';
  targetCriteria: string;
  targetCount: number;
  status: 'draft' | 'active' | 'completed' | 'paused';
  channels: ('phone' | 'email' | 'sms' | 'portal')[];
  startDate: Date;
  endDate?: Date;
  metrics: {
    sent: number;
    delivered: number;
    responded: number;
    scheduled: number;
    completed: number;
  };
}

export interface SDOHFactor {
  category: string;
  factor: string;
  prevalence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  affectedPatients: number;
}

// ============================================================
// MOCK DATA
// ============================================================

const mockMetrics: PopulationMetrics = {
  totalPatients: 2847,
  activePatients: 2156,
  riskDistribution: {
    critical: 42,
    high: 186,
    moderate: 524,
    low: 892,
    well: 1203,
  },
  qualityScores: {
    diabetes: {
      name: 'Diabetes Control (A1c <8%)',
      currentRate: 76,
      targetRate: 80,
      nationalBenchmark: 65,
      trend: 'up',
      patientsInMeasure: 312,
      patientsMeetingMeasure: 237,
    },
    hypertension: {
      name: 'Blood Pressure Control',
      currentRate: 72,
      targetRate: 75,
      nationalBenchmark: 58,
      trend: 'stable',
      patientsInMeasure: 856,
      patientsMeetingMeasure: 616,
    },
    preventive: {
      name: 'Preventive Care Completion',
      currentRate: 68,
      targetRate: 85,
      nationalBenchmark: 62,
      trend: 'up',
      patientsInMeasure: 2156,
      patientsMeetingMeasure: 1466,
    },
    mental_health: {
      name: 'Depression Screening',
      currentRate: 82,
      targetRate: 90,
      nationalBenchmark: 55,
      trend: 'up',
      patientsInMeasure: 1820,
      patientsMeetingMeasure: 1492,
    },
    chronic: {
      name: 'Chronic Care Management',
      currentRate: 71,
      targetRate: 80,
      nationalBenchmark: 52,
      trend: 'up',
      patientsInMeasure: 648,
      patientsMeetingMeasure: 460,
    },
  },
  careGaps: 1247,
  upcomingVisits: 156,
  overdueVisits: 89,
};

const mockPatients: PatientPanel[] = [
  {
    id: 'p1',
    name: 'John Anderson',
    age: 68,
    gender: 'M',
    mrn: 'MRN-001',
    riskStratum: 'critical',
    riskScore: 92,
    conditions: ['CHF', 'Type 2 Diabetes', 'CKD Stage 3'],
    careGaps: [
      { id: 'cg1', type: 'Lab', description: 'A1c overdue', isOverdue: true, priority: 'high' },
      { id: 'cg2', type: 'Visit', description: 'Cardiology follow-up overdue', isOverdue: true, priority: 'high' },
    ],
    lastVisit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    pcp: 'Dr. Sarah Smith',
    insuranceType: 'Medicare',
    outreachStatus: 'pending',
  },
  {
    id: 'p2',
    name: 'Mary Johnson',
    age: 72,
    gender: 'F',
    mrn: 'MRN-002',
    riskStratum: 'high',
    riskScore: 78,
    conditions: ['COPD', 'Osteoporosis', 'Anxiety'],
    careGaps: [
      { id: 'cg3', type: 'Screening', description: 'Bone density scan due', isOverdue: false, priority: 'medium' },
    ],
    lastVisit: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    nextVisit: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    pcp: 'Dr. Sarah Smith',
    insuranceType: 'Medicare Advantage',
    outreachStatus: 'completed',
  },
  {
    id: 'p3',
    name: 'Robert Williams',
    age: 55,
    gender: 'M',
    mrn: 'MRN-003',
    riskStratum: 'moderate',
    riskScore: 54,
    conditions: ['Type 2 Diabetes', 'Hypertension'],
    careGaps: [
      { id: 'cg4', type: 'Screening', description: 'Eye exam overdue', isOverdue: true, priority: 'medium' },
      { id: 'cg5', type: 'Vaccine', description: 'Flu vaccine due', isOverdue: false, priority: 'low' },
    ],
    lastVisit: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    pcp: 'Dr. Michael Chen',
    insuranceType: 'Commercial',
    outreachStatus: 'in_progress',
  },
];

const mockCampaigns: OutreachCampaign[] = [
  {
    id: 'oc1',
    name: 'Diabetes A1c Gap Closure',
    type: 'care_gap',
    targetCriteria: 'Diabetic patients with A1c >9% or no A1c in 6 months',
    targetCount: 87,
    status: 'active',
    channels: ['phone', 'sms', 'portal'],
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    metrics: {
      sent: 87,
      delivered: 82,
      responded: 34,
      scheduled: 28,
      completed: 19,
    },
  },
  {
    id: 'oc2',
    name: 'Annual Wellness Visit',
    type: 'wellness',
    targetCriteria: 'Medicare patients without AWV in past 12 months',
    targetCount: 234,
    status: 'active',
    channels: ['email', 'sms'],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    metrics: {
      sent: 234,
      delivered: 218,
      responded: 89,
      scheduled: 67,
      completed: 42,
    },
  },
  {
    id: 'oc3',
    name: 'CHF Monitoring Program',
    type: 'chronic_care',
    targetCriteria: 'High-risk CHF patients',
    targetCount: 45,
    status: 'active',
    channels: ['phone', 'portal'],
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    metrics: {
      sent: 45,
      delivered: 45,
      responded: 38,
      scheduled: 0,
      completed: 32,
    },
  },
];

const mockSDOH: SDOHFactor[] = [
  { category: 'Transportation', factor: 'Lack of reliable transportation', prevalence: 12, trend: 'increasing', affectedPatients: 258 },
  { category: 'Food Security', factor: 'Food insecurity', prevalence: 8, trend: 'stable', affectedPatients: 172 },
  { category: 'Housing', factor: 'Housing instability', prevalence: 5, trend: 'decreasing', affectedPatients: 107 },
  { category: 'Social Support', factor: 'Social isolation', prevalence: 15, trend: 'increasing', affectedPatients: 323 },
  { category: 'Financial', factor: 'Medication cost concerns', prevalence: 18, trend: 'stable', affectedPatients: 387 },
];

// ============================================================
// COMPONENTS
// ============================================================

const RiskStratumBadge: React.FC<{ stratum: RiskStratum; count?: number }> = ({ stratum, count }) => {
  const config = {
    critical: { color: 'bg-red-500', label: 'Critical' },
    high: { color: 'bg-orange-500', label: 'High' },
    moderate: { color: 'bg-amber-500', label: 'Moderate' },
    low: { color: 'bg-blue-500', label: 'Low' },
    well: { color: 'bg-green-500', label: 'Well' },
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${config[stratum].color}`} />
      <span className="text-sm text-slate-700">{config[stratum].label}</span>
      {count !== undefined && (
        <span className="text-sm font-semibold text-slate-900">({count})</span>
      )}
    </div>
  );
};

const QualityMeasureCard: React.FC<{ measure: QualityScore }> = ({ measure }) => {
  const isAtTarget = measure.currentRate >= measure.targetRate;
  const isAboveBenchmark = measure.currentRate >= measure.nationalBenchmark;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-slate-900 text-sm">{measure.name}</h4>
        <span className={`flex items-center gap-1 text-xs font-medium ${
          measure.trend === 'up' ? 'text-green-600' : 
          measure.trend === 'down' ? 'text-red-600' : 'text-slate-500'
        }`}>
          {measure.trend === 'up' ? <TrendingUp size={12} /> : 
           measure.trend === 'down' ? <TrendingDown size={12} /> : null}
          {measure.trend}
        </span>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-3xl font-bold text-slate-900">{measure.currentRate}%</p>
          <p className="text-xs text-slate-500">
            {measure.patientsMeetingMeasure}/{measure.patientsInMeasure} patients
          </p>
        </div>
        <div className="text-right text-xs">
          <p className={isAtTarget ? 'text-green-600' : 'text-amber-600'}>
            Target: {measure.targetRate}%
          </p>
          <p className={isAboveBenchmark ? 'text-green-600' : 'text-slate-500'}>
            National: {measure.nationalBenchmark}%
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`absolute h-full rounded-full ${isAtTarget ? 'bg-green-500' : 'bg-amber-500'}`}
          style={{ width: `${measure.currentRate}%` }}
        />
        {/* Target marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-slate-600"
          style={{ left: `${measure.targetRate}%` }}
        />
      </div>
    </div>
  );
};

const PatientRow: React.FC<{
  patient: PatientPanel;
  onSelect: () => void;
  onOutreach: () => void;
}> = ({ patient, onSelect, onOutreach }) => {
  const stratumColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    moderate: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    well: 'bg-green-100 text-green-700 border-green-200',
  };

  const daysSinceVisit = Math.floor((Date.now() - patient.lastVisit.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <tr className="hover:bg-slate-50 cursor-pointer" onClick={onSelect}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="font-medium text-slate-900">{patient.name}</p>
            <p className="text-xs text-slate-500">{patient.age}{patient.gender} • {patient.mrn}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${stratumColors[patient.riskStratum]}`}>
          {patient.riskStratum.toUpperCase()} ({patient.riskScore})
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {patient.conditions.slice(0, 3).map((condition, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
              {condition}
            </span>
          ))}
          {patient.conditions.length > 3 && (
            <span className="text-xs text-slate-500">+{patient.conditions.length - 3}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {patient.careGaps.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-sm ${
              patient.careGaps.some(g => g.isOverdue) ? 'text-red-600' : 'text-amber-600'
            }`}>
              <AlertCircle size={14} />
              {patient.careGaps.length} gap{patient.careGaps.length !== 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle size={14} />
            None
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm ${daysSinceVisit > 30 ? 'text-red-600' : 'text-slate-600'}`}>
          {daysSinceVisit} days ago
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onOutreach(); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
        >
          <Phone size={14} />
          Outreach
        </button>
      </td>
    </tr>
  );
};

const CampaignCard: React.FC<{ campaign: OutreachCampaign }> = ({ campaign }) => {
  const responseRate = campaign.metrics.sent > 0 
    ? Math.round((campaign.metrics.responded / campaign.metrics.sent) * 100) 
    : 0;
  const conversionRate = campaign.metrics.responded > 0 
    ? Math.round((campaign.metrics.completed / campaign.metrics.responded) * 100) 
    : 0;

  const statusConfig = {
    draft: { color: 'bg-slate-100 text-slate-600', label: 'Draft' },
    active: { color: 'bg-green-100 text-green-700', label: 'Active' },
    completed: { color: 'bg-blue-100 text-blue-700', label: 'Completed' },
    paused: { color: 'bg-amber-100 text-amber-700', label: 'Paused' },
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900">{campaign.name}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[campaign.status].color}`}>
              {statusConfig[campaign.status].label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{campaign.targetCriteria}</p>
        </div>
        <div className="flex gap-1">
          {campaign.channels.map(channel => (
            <span key={channel} className="p-1.5 bg-slate-100 rounded">
              {channel === 'phone' && <Phone size={12} className="text-slate-500" />}
              {channel === 'email' && <Mail size={12} className="text-slate-500" />}
              {channel === 'sms' && <MessageSquare size={12} className="text-slate-500" />}
              {channel === 'portal' && <Building2 size={12} className="text-slate-500" />}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">{campaign.metrics.sent}</p>
          <p className="text-xs text-slate-500">Sent</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">{campaign.metrics.delivered}</p>
          <p className="text-xs text-slate-500">Delivered</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <p className="text-lg font-bold text-blue-600">{campaign.metrics.responded}</p>
          <p className="text-xs text-slate-500">Responded</p>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <p className="text-lg font-bold text-amber-600">{campaign.metrics.scheduled}</p>
          <p className="text-xs text-slate-500">Scheduled</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">{campaign.metrics.completed}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-slate-500">Response Rate: </span>
          <span className="font-semibold text-slate-900">{responseRate}%</span>
        </div>
        <div>
          <span className="text-slate-500">Conversion: </span>
          <span className="font-semibold text-green-600">{conversionRate}%</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const PopulationHealthDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'campaigns' | 'sdoh'>('overview');
  const [metrics] = useState<PopulationMetrics>(mockMetrics);
  const [patients] = useState<PatientPanel[]>(mockPatients);
  const [campaigns] = useState<OutreachCampaign[]>(mockCampaigns);
  const [sdohFactors] = useState<SDOHFactor[]>(mockSDOH);
  const [selectedRisk, setSelectedRisk] = useState<RiskStratum | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = patients.filter(p => {
    if (selectedRisk !== 'all' && p.riskStratum !== selectedRisk) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Population Health Intelligence</h1>
                <p className="text-indigo-200">Proactive care management for your patient panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                <Download size={18} />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                <Zap size={18} />
                New Campaign
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-indigo-200 text-sm">Total Patients</p>
              <p className="text-3xl font-bold mt-1">{metrics.totalPatients.toLocaleString()}</p>
              <p className="text-xs text-indigo-200 mt-1">{metrics.activePatients} active</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-indigo-200 text-sm">High Risk</p>
              <p className="text-3xl font-bold mt-1 text-red-300">
                {metrics.riskDistribution.critical + metrics.riskDistribution.high}
              </p>
              <p className="text-xs text-indigo-200 mt-1">Need attention</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-indigo-200 text-sm">Care Gaps</p>
              <p className="text-3xl font-bold mt-1 text-amber-300">{metrics.careGaps}</p>
              <p className="text-xs text-indigo-200 mt-1">Open gaps</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-indigo-200 text-sm">Upcoming Visits</p>
              <p className="text-3xl font-bold mt-1">{metrics.upcomingVisits}</p>
              <p className="text-xs text-indigo-200 mt-1">Next 7 days</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-indigo-200 text-sm">Overdue Visits</p>
              <p className="text-3xl font-bold mt-1 text-red-300">{metrics.overdueVisits}</p>
              <p className="text-xs text-indigo-200 mt-1">Need scheduling</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-6">
            {[
              { key: 'overview', label: 'Quality Overview' },
              { key: 'patients', label: 'Patient Panel' },
              { key: 'campaigns', label: 'Outreach Campaigns' },
              { key: 'sdoh', label: 'Social Determinants' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-white text-white'
                    : 'border-transparent text-indigo-200 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Quality Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Risk Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk Stratification</h3>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(metrics.riskDistribution).map(([stratum, count]) => (
                  <div 
                    key={stratum}
                    className="text-center p-4 rounded-xl border border-slate-200 hover:border-purple-300 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedRisk(stratum as RiskStratum);
                      setActiveTab('patients');
                    }}
                  >
                    <RiskStratumBadge stratum={stratum as RiskStratum} />
                    <p className="text-3xl font-bold text-slate-900 mt-2">{count}</p>
                    <p className="text-xs text-slate-500">
                      {((count / metrics.totalPatients) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Measures */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Quality Measures</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.values(metrics.qualityScores).map((measure, idx) => (
                  <QualityMeasureCard key={idx} measure={measure} />
                ))}
              </div>
            </div>

            {/* Active Campaigns Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Active Campaigns</h3>
                <button 
                  onClick={() => setActiveTab('campaigns')}
                  className="text-purple-600 text-sm font-medium hover:text-purple-700"
                >
                  View All →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {campaigns.filter(c => c.status === 'active').map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Patient Panel Tab */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                  />
                </div>
                <select
                  value={selectedRisk}
                  onChange={(e) => setSelectedRisk(e.target.value as RiskStratum | 'all')}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Low</option>
                  <option value="well">Well</option>
                </select>
              </div>
              <p className="text-sm text-slate-500">{filteredPatients.length} patients</p>
            </div>

            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Conditions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Care Gaps</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Last Visit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map(patient => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    onSelect={() => console.log('Select:', patient.id)}
                    onOutreach={() => console.log('Outreach:', patient.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Outreach Campaigns</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Zap size={18} />
                Create Campaign
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {campaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        )}

        {/* SDOH Tab */}
        {activeTab === 'sdoh' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Social Determinants of Health</h3>
              <div className="space-y-4">
                {sdohFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{factor.factor}</p>
                      <p className="text-sm text-slate-500">{factor.category}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{factor.prevalence}%</p>
                        <p className="text-xs text-slate-500">{factor.affectedPatients} patients</p>
                      </div>
                      <span className={`flex items-center gap-1 text-sm ${
                        factor.trend === 'increasing' ? 'text-red-600' :
                        factor.trend === 'decreasing' ? 'text-green-600' :
                        'text-slate-500'
                      }`}>
                        {factor.trend === 'increasing' ? <ArrowUpRight size={16} /> :
                         factor.trend === 'decreasing' ? <ArrowDownRight size={16} /> : null}
                        {factor.trend}
                      </span>
                      <button className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                        View Patients
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopulationHealthDashboard;
