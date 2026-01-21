// ============================================================
// ATTENDING AI - Population Health Intelligence
// apps/provider-portal/components/population-health/PopulationHealthDashboard.tsx
//
// Phase 9D: Proactive, not reactive healthcare
// Managing entire patient panels with AI-powered insights
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Filter,
  Search,
  Download,
  Send,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Activity,
  Heart,
  Pill,
  Thermometer,
  Eye,
  ChevronRight,
  ChevronDown,
  BarChart3,
  PieChart,
  Zap,
  Shield,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Settings,
  FileText,
  UserCheck,
  UserX,
  Bell,
  Sparkles,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';
export type CareGapType = 'screening' | 'vaccination' | 'lab' | 'visit' | 'medication' | 'chronic_care';
export type OutreachStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'declined';
export type QualityMeasure = 'hedis' | 'cms' | 'custom';

export interface PatientRiskProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: string[];
  conditions: string[];
  lastVisit?: Date;
  nextVisit?: Date;
  careGaps: CareGap[];
  recentTrend: 'improving' | 'stable' | 'declining';
  engagementScore: number;
  primaryProvider: string;
}

export interface CareGap {
  id: string;
  type: CareGapType;
  measure: string;
  description: string;
  dueDate?: Date;
  isOverdue: boolean;
  lastCompleted?: Date;
  qualityMeasure?: QualityMeasure;
  pointsAtStake?: number;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  type: 'care_gap' | 'chronic_care' | 'preventive' | 'follow_up' | 'wellness';
  targetPopulation: string;
  eligiblePatients: number;
  contactedPatients: number;
  completedPatients: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  channels: ('sms' | 'email' | 'phone' | 'portal')[];
  startDate: Date;
  endDate?: Date;
  successRate: number;
}

export interface QualityMetric {
  id: string;
  name: string;
  category: 'preventive' | 'chronic' | 'utilization' | 'satisfaction';
  currentRate: number;
  targetRate: number;
  benchmark: number;
  trend: 'up' | 'down' | 'stable';
  trendAmount: number;
  eligiblePatients: number;
  numerator: number;
  denominator: number;
  gapCount: number;
  pointsValue: number;
}

export interface PopulationSegment {
  id: string;
  name: string;
  description: string;
  patientCount: number;
  avgRiskScore: number;
  careGapRate: number;
  conditions: string[];
  color: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const mockPatients: PatientRiskProfile[] = [
  {
    id: 'p1',
    name: 'Robert Martinez',
    age: 72,
    gender: 'M',
    riskLevel: 'critical',
    riskScore: 92,
    riskFactors: ['Multiple ER visits', 'Medication non-adherence', 'Social isolation'],
    conditions: ['CHF', 'COPD', 'Type 2 Diabetes', 'CKD Stage 3'],
    lastVisit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    careGaps: [
      { id: 'cg1', type: 'lab', measure: 'A1c', description: 'A1c test overdue', isOverdue: true, qualityMeasure: 'hedis', pointsAtStake: 5 },
      { id: 'cg2', type: 'vaccination', measure: 'Flu', description: 'Annual flu vaccine', isOverdue: false, dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    ],
    recentTrend: 'declining',
    engagementScore: 35,
    primaryProvider: 'Dr. Chen',
  },
  {
    id: 'p2',
    name: 'Margaret Williams',
    age: 68,
    gender: 'F',
    riskLevel: 'high',
    riskScore: 78,
    riskFactors: ['Recent hospitalization', 'Polypharmacy'],
    conditions: ['Atrial Fibrillation', 'Hypertension', 'Osteoporosis'],
    lastVisit: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    careGaps: [
      { id: 'cg3', type: 'screening', measure: 'Mammogram', description: 'Breast cancer screening', isOverdue: true, qualityMeasure: 'hedis', pointsAtStake: 3 },
    ],
    recentTrend: 'stable',
    engagementScore: 65,
    primaryProvider: 'Dr. Chen',
  },
  {
    id: 'p3',
    name: 'James Thompson',
    age: 58,
    gender: 'M',
    riskLevel: 'moderate',
    riskScore: 55,
    riskFactors: ['BMI >35', 'Prediabetes'],
    conditions: ['Obesity', 'Prediabetes', 'Sleep Apnea'],
    lastVisit: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    careGaps: [
      { id: 'cg4', type: 'screening', measure: 'Colonoscopy', description: 'Colorectal cancer screening', isOverdue: true, qualityMeasure: 'hedis', pointsAtStake: 4 },
      { id: 'cg5', type: 'visit', measure: 'Annual Wellness', description: 'Annual wellness visit due', isOverdue: false },
    ],
    recentTrend: 'stable',
    engagementScore: 50,
    primaryProvider: 'Dr. Rodriguez',
  },
  {
    id: 'p4',
    name: 'Patricia Davis',
    age: 45,
    gender: 'F',
    riskLevel: 'low',
    riskScore: 25,
    riskFactors: ['Family history of breast cancer'],
    conditions: ['Anxiety', 'Migraine'],
    lastVisit: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    careGaps: [],
    recentTrend: 'improving',
    engagementScore: 85,
    primaryProvider: 'Dr. Chen',
  },
  {
    id: 'p5',
    name: 'William Johnson',
    age: 82,
    gender: 'M',
    riskLevel: 'high',
    riskScore: 81,
    riskFactors: ['Age >80', 'Falls risk', 'Cognitive decline'],
    conditions: ['Mild Cognitive Impairment', 'Hypertension', 'BPH'],
    lastVisit: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    careGaps: [
      { id: 'cg6', type: 'visit', measure: 'Cognitive Assessment', description: 'Annual cognitive assessment', isOverdue: true, qualityMeasure: 'cms', pointsAtStake: 3 },
    ],
    recentTrend: 'declining',
    engagementScore: 40,
    primaryProvider: 'Dr. Chen',
  },
];

const mockCampaigns: OutreachCampaign[] = [
  {
    id: 'oc1',
    name: 'Diabetic Eye Exam Outreach',
    type: 'care_gap',
    targetPopulation: 'Diabetic patients without eye exam in 12 months',
    eligiblePatients: 145,
    contactedPatients: 98,
    completedPatients: 67,
    status: 'active',
    channels: ['sms', 'email', 'portal'],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    successRate: 68,
  },
  {
    id: 'oc2',
    name: 'Annual Wellness Visit Reminder',
    type: 'preventive',
    targetPopulation: 'Medicare patients due for AWV',
    eligiblePatients: 312,
    contactedPatients: 245,
    completedPatients: 156,
    status: 'active',
    channels: ['phone', 'email'],
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    successRate: 64,
  },
  {
    id: 'oc3',
    name: 'Post-Discharge Follow-up',
    type: 'follow_up',
    targetPopulation: 'Patients discharged within 7 days',
    eligiblePatients: 23,
    contactedPatients: 23,
    completedPatients: 19,
    status: 'active',
    channels: ['phone'],
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    successRate: 83,
  },
];

const mockQualityMetrics: QualityMetric[] = [
  {
    id: 'qm1',
    name: 'Diabetes A1c Control (<8%)',
    category: 'chronic',
    currentRate: 72,
    targetRate: 80,
    benchmark: 75,
    trend: 'up',
    trendAmount: 3,
    eligiblePatients: 420,
    numerator: 302,
    denominator: 420,
    gapCount: 118,
    pointsValue: 15,
  },
  {
    id: 'qm2',
    name: 'Blood Pressure Control (<140/90)',
    category: 'chronic',
    currentRate: 68,
    targetRate: 75,
    benchmark: 70,
    trend: 'down',
    trendAmount: 2,
    eligiblePatients: 856,
    numerator: 582,
    denominator: 856,
    gapCount: 274,
    pointsValue: 12,
  },
  {
    id: 'qm3',
    name: 'Breast Cancer Screening',
    category: 'preventive',
    currentRate: 78,
    targetRate: 85,
    benchmark: 80,
    trend: 'stable',
    trendAmount: 0,
    eligiblePatients: 345,
    numerator: 269,
    denominator: 345,
    gapCount: 76,
    pointsValue: 8,
  },
  {
    id: 'qm4',
    name: 'Colorectal Cancer Screening',
    category: 'preventive',
    currentRate: 65,
    targetRate: 80,
    benchmark: 72,
    trend: 'up',
    trendAmount: 5,
    eligiblePatients: 512,
    numerator: 333,
    denominator: 512,
    gapCount: 179,
    pointsValue: 10,
  },
  {
    id: 'qm5',
    name: 'Annual Wellness Visit',
    category: 'preventive',
    currentRate: 58,
    targetRate: 75,
    benchmark: 65,
    trend: 'up',
    trendAmount: 8,
    eligiblePatients: 1245,
    numerator: 722,
    denominator: 1245,
    gapCount: 523,
    pointsValue: 6,
  },
];

const mockSegments: PopulationSegment[] = [
  { id: 's1', name: 'High-Risk Chronic', description: 'Multiple chronic conditions, high utilization', patientCount: 245, avgRiskScore: 78, careGapRate: 35, conditions: ['CHF', 'COPD', 'Diabetes'], color: 'bg-red-500' },
  { id: 's2', name: 'Rising Risk', description: 'New diagnoses, trending higher risk', patientCount: 412, avgRiskScore: 55, careGapRate: 28, conditions: ['Prediabetes', 'Hypertension'], color: 'bg-orange-500' },
  { id: 's3', name: 'Stable Chronic', description: 'Well-managed chronic conditions', patientCount: 678, avgRiskScore: 42, careGapRate: 18, conditions: ['Diabetes', 'Hypertension'], color: 'bg-amber-500' },
  { id: 's4', name: 'Healthy Active', description: 'Primarily preventive care', patientCount: 1234, avgRiskScore: 22, careGapRate: 12, conditions: [], color: 'bg-green-500' },
];

// ============================================================
// COMPONENTS
// ============================================================

const RiskBadge: React.FC<{ level: RiskLevel; score?: number }> = ({ level, score }) => {
  const config = {
    critical: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Critical' },
    high: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'High' },
    moderate: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Moderate' },
    low: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Low' },
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config[level].color}`}>
      {config[level].label}
      {score !== undefined && <span className="font-bold">({score})</span>}
    </span>
  );
};

const TrendIndicator: React.FC<{ trend: 'up' | 'down' | 'stable'; amount?: number; goodDirection?: 'up' | 'down' }> = ({ trend, amount, goodDirection = 'up' }) => {
  const isGood = trend === goodDirection || trend === 'stable';
  
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${
      trend === 'stable' ? 'text-slate-500' : isGood ? 'text-green-600' : 'text-red-600'
    }`}>
      {trend === 'up' && <ArrowUpRight size={14} />}
      {trend === 'down' && <ArrowDownRight size={14} />}
      {trend === 'stable' && <Minus size={14} />}
      {amount !== undefined && amount !== 0 && `${amount}%`}
    </span>
  );
};

const PatientRiskCard: React.FC<{
  patient: PatientRiskProfile;
  onSelect: (id: string) => void;
  onOutreach: (id: string) => void;
}> = ({ patient, onSelect, onOutreach }) => {
  const overdueCareGaps = patient.careGaps.filter(g => g.isOverdue);
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
            patient.riskLevel === 'critical' ? 'bg-red-500' :
            patient.riskLevel === 'high' ? 'bg-orange-500' :
            patient.riskLevel === 'moderate' ? 'bg-amber-500' :
            'bg-green-500'
          }`}>
            {patient.riskScore}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{patient.name}</p>
            <p className="text-xs text-slate-500">{patient.age}{patient.gender} • {patient.primaryProvider}</p>
          </div>
        </div>
        <RiskBadge level={patient.riskLevel} />
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {patient.conditions.slice(0, 3).map((condition, idx) => (
          <span key={idx} className="text-xs px-2 py-0.5 bg-slate-100 rounded-full">
            {condition}
          </span>
        ))}
        {patient.conditions.length > 3 && (
          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full">
            +{patient.conditions.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          Last: {patient.lastVisit?.toLocaleDateString() || 'Never'}
        </span>
        <span className={`flex items-center gap-1 ${
          patient.recentTrend === 'improving' ? 'text-green-600' :
          patient.recentTrend === 'declining' ? 'text-red-600' :
          'text-slate-500'
        }`}>
          {patient.recentTrend === 'improving' ? <TrendingUp size={12} /> :
           patient.recentTrend === 'declining' ? <TrendingDown size={12} /> :
           <Minus size={12} />}
          {patient.recentTrend}
        </span>
      </div>

      {overdueCareGaps.length > 0 && (
        <div className="p-2 bg-red-50 rounded-lg mb-3">
          <p className="text-xs font-medium text-red-700 flex items-center gap-1">
            <AlertTriangle size={12} />
            {overdueCareGaps.length} overdue care gap(s)
          </p>
          <p className="text-xs text-red-600 mt-1">
            {overdueCareGaps.map(g => g.measure).join(', ')}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelect(patient.id)}
          className="flex-1 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={() => onOutreach(patient.id)}
          className="flex items-center gap-1 px-3 py-1.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-lg hover:bg-teal-200 transition-colors"
        >
          <Send size={12} />
          Outreach
        </button>
      </div>
    </div>
  );
};

const QualityMetricCard: React.FC<{ metric: QualityMetric }> = ({ metric }) => {
  const gapPercentage = ((metric.targetRate - metric.currentRate) / metric.targetRate) * 100;
  const meetsTarget = metric.currentRate >= metric.targetRate;
  const meetsBenchmark = metric.currentRate >= metric.benchmark;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">{metric.name}</h4>
          <p className="text-xs text-slate-500">{metric.gapCount} patients need attention</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-slate-900">{metric.currentRate}%</span>
            <TrendIndicator trend={metric.trend} amount={metric.trendAmount} />
          </div>
          <p className="text-xs text-slate-500">Target: {metric.targetRate}%</p>
        </div>
      </div>

      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
          style={{ left: `${metric.targetRate}%` }}
        />
        {/* Benchmark marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-10"
          style={{ left: `${metric.benchmark}%` }}
        />
        {/* Current rate */}
        <div
          className={`h-full rounded-full transition-all ${
            meetsTarget ? 'bg-green-500' : meetsBenchmark ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(metric.currentRate, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-slate-400 rounded-full" />
            Target
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            Benchmark
          </span>
        </div>
        <span className="text-purple-600 font-medium">{metric.pointsValue} points</span>
      </div>

      <button className="w-full mt-3 px-3 py-2 bg-slate-50 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-1">
        View {metric.gapCount} Patients
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

const CampaignCard: React.FC<{ campaign: OutreachCampaign }> = ({ campaign }) => {
  const completionRate = Math.round((campaign.completedPatients / campaign.eligiblePatients) * 100);
  const contactRate = Math.round((campaign.contactedPatients / campaign.eligiblePatients) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">{campaign.name}</h4>
          <p className="text-xs text-slate-500">{campaign.targetPopulation}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          campaign.status === 'active' ? 'bg-green-100 text-green-700' :
          campaign.status === 'paused' ? 'bg-amber-100 text-amber-700' :
          campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {campaign.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">{campaign.eligiblePatients}</p>
          <p className="text-xs text-slate-500">Eligible</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <p className="text-lg font-bold text-blue-600">{campaign.contactedPatients}</p>
          <p className="text-xs text-slate-500">Contacted</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">{campaign.completedPatients}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progress</span>
          <span>{completionRate}% complete</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {campaign.channels.map(channel => (
          <span key={channel} className="text-xs px-2 py-1 bg-slate-100 rounded-full flex items-center gap-1">
            {channel === 'sms' && <MessageSquare size={10} />}
            {channel === 'email' && <Mail size={10} />}
            {channel === 'phone' && <Phone size={10} />}
            {channel === 'portal' && <Users size={10} />}
            {channel}
          </span>
        ))}
      </div>
    </div>
  );
};

const SegmentBar: React.FC<{ segment: PopulationSegment; totalPatients: number }> = ({ segment, totalPatients }) => {
  const percentage = Math.round((segment.patientCount / totalPatients) * 100);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-3 h-3 rounded-full ${segment.color}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-900">{segment.name}</span>
          <span className="text-sm text-slate-600">{segment.patientCount} ({percentage}%)</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${segment.color} rounded-full`} style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-1">{segment.description}</p>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const PopulationHealthDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'quality' | 'campaigns'>('overview');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [patients] = useState<PatientRiskProfile[]>(mockPatients);
  const [campaigns] = useState<OutreachCampaign[]>(mockCampaigns);
  const [qualityMetrics] = useState<QualityMetric[]>(mockQualityMetrics);
  const [segments] = useState<PopulationSegment[]>(mockSegments);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesRisk = riskFilter === 'all' || p.riskLevel === riskFilter;
      const matchesSearch = searchTerm === '' || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.conditions.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesRisk && matchesSearch;
    });
  }, [patients, riskFilter, searchTerm]);

  const totalPatients = segments.reduce((sum, s) => sum + s.patientCount, 0);
  const totalCareGaps = qualityMetrics.reduce((sum, m) => sum + m.gapCount, 0);
  const avgQualityScore = Math.round(qualityMetrics.reduce((sum, m) => sum + m.currentRate, 0) / qualityMetrics.length);
  const criticalPatients = patients.filter(p => p.riskLevel === 'critical').length;

  const handleSelectPatient = (id: string) => {
    console.log('Selected patient:', id);
  };

  const handleOutreach = (id: string) => {
    console.log('Outreach to patient:', id);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Population Health Intelligence</h2>
              <p className="text-indigo-200 text-sm">Proactive care for your entire patient panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors">
              <Download size={16} />
              Export
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Patients</p>
              <p className="text-2xl font-bold text-slate-900">{totalPatients.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Critical Risk</p>
              <p className="text-2xl font-bold text-red-600">{criticalPatients}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Open Care Gaps</p>
              <p className="text-2xl font-bold text-amber-600">{totalCareGaps.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Quality Score</p>
              <p className="text-2xl font-bold text-green-600">{avgQualityScore}%</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'patients', label: 'At-Risk Patients', icon: Users },
          { key: 'quality', label: 'Quality Measures', icon: Target },
          { key: 'campaigns', label: 'Outreach Campaigns', icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Population Segments */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Population Segments</h3>
              <div className="space-y-2">
                {segments.map(segment => (
                  <SegmentBar key={segment.id} segment={segment} totalPatients={totalPatients} />
                ))}
              </div>
            </div>

            {/* Top Quality Gaps */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Top Quality Gaps</h3>
              <div className="space-y-3">
                {qualityMetrics
                  .sort((a, b) => b.gapCount - a.gapCount)
                  .slice(0, 4)
                  .map(metric => (
                    <div key={metric.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                      <div>
                        <p className="font-medium text-slate-900">{metric.name}</p>
                        <p className="text-xs text-slate-500">{metric.currentRate}% vs {metric.targetRate}% target</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-600">{metric.gapCount}</p>
                        <p className="text-xs text-slate-500">patients</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Active Campaigns Summary */}
            <div className="col-span-2 bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Active Outreach Campaigns</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View All
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

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patients by name or condition..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Risk Level:</span>
                {(['all', 'critical', 'high', 'moderate', 'low'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setRiskFilter(level)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      riskFilter === level
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Grid */}
            <div className="grid grid-cols-2 gap-4">
              {filteredPatients.map(patient => (
                <PatientRiskCard
                  key={patient.id}
                  patient={patient}
                  onSelect={handleSelectPatient}
                  onOutreach={handleOutreach}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quality Measures Tab */}
        {activeTab === 'quality' && (
          <div className="grid grid-cols-2 gap-4">
            {qualityMetrics.map(metric => (
              <QualityMetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Outreach Campaigns</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <Sparkles size={16} />
                Create AI Campaign
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {campaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopulationHealthDashboard;
