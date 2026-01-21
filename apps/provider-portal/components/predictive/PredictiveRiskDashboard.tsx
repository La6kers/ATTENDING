// ============================================================
// ATTENDING AI - Predictive Risk Dashboard
// apps/provider-portal/components/predictive/PredictiveRiskDashboard.tsx
//
// Phase 8B: AI that anticipates problems before they happen
// Predictive models that flag patients before they deteriorate
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Brain,
  Pill,
  Calendar,
  Phone,
  ChevronRight,
  Filter,
  RefreshCw,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Zap,
  Shield,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type RiskCategory = 
  | 'ed_bounceback' 
  | 'chf_exacerbation' 
  | 'diabetic_crisis' 
  | 'fall_risk' 
  | 'no_show'
  | 'medication_nonadherence'
  | 'readmission_30day';

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';

export interface RiskFactor {
  id: string;
  name: string;
  value: string | number;
  impact: 'high' | 'medium' | 'low';
  trend?: 'increasing' | 'decreasing' | 'stable';
  description?: string;
}

export interface RecommendedIntervention {
  id: string;
  action: string;
  priority: 'immediate' | 'soon' | 'scheduled';
  type: 'call' | 'visit' | 'medication' | 'referral' | 'education' | 'monitoring';
  expectedImpact: string;
  completed?: boolean;
}

export interface PatientRiskProfile {
  patientId: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: string;
  primaryConditions: string[];
  riskCategory: RiskCategory;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  interventions: RecommendedIntervention[];
  lastAssessment: Date;
  nextScheduledVisit?: Date;
  trend: 'improving' | 'worsening' | 'stable';
  modelConfidence: number;
}

export interface RiskSummary {
  category: RiskCategory;
  name: string;
  description: string;
  icon: React.ReactNode;
  totalPatients: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  avgRiskScore: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

// ============================================================
// MOCK DATA
// ============================================================

const RISK_CATEGORIES: Record<RiskCategory, { name: string; description: string; icon: React.ReactNode }> = {
  ed_bounceback: {
    name: 'ED Bounce-Back',
    description: '72-hour ED return risk',
    icon: <AlertCircle className="text-red-500" />,
  },
  chf_exacerbation: {
    name: 'CHF Exacerbation',
    description: '30-day heart failure admission',
    icon: <Heart className="text-red-500" />,
  },
  diabetic_crisis: {
    name: 'Diabetic Crisis',
    description: '90-day DKA/HHS risk',
    icon: <Activity className="text-orange-500" />,
  },
  fall_risk: {
    name: 'Fall Risk',
    description: '6-month fall probability',
    icon: <AlertTriangle className="text-amber-500" />,
  },
  no_show: {
    name: 'No-Show Risk',
    description: 'Appointment miss probability',
    icon: <Calendar className="text-blue-500" />,
  },
  medication_nonadherence: {
    name: 'Med Non-Adherence',
    description: 'Medication compliance risk',
    icon: <Pill className="text-purple-500" />,
  },
  readmission_30day: {
    name: '30-Day Readmission',
    description: 'Hospital readmission risk',
    icon: <TrendingUp className="text-red-500" />,
  },
};

const mockPatientRisks: PatientRiskProfile[] = [
  {
    patientId: 'P001',
    patientName: 'John Anderson',
    mrn: 'MRN-001',
    age: 65,
    gender: 'M',
    primaryConditions: ['CHF', 'Type 2 Diabetes', 'Hypertension'],
    riskCategory: 'chf_exacerbation',
    riskScore: 78,
    riskLevel: 'critical',
    trend: 'worsening',
    modelConfidence: 92,
    lastAssessment: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    nextScheduledVisit: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    riskFactors: [
      { id: 'rf1', name: 'Weight Gain', value: '+5 lbs in 3 days', impact: 'high', trend: 'increasing', description: 'Rapid weight gain indicates fluid retention' },
      { id: 'rf2', name: 'Missed Medications', value: '2 doses', impact: 'high', description: 'Missed Lasix doses in past week' },
      { id: 'rf3', name: 'Blood Pressure', value: '158/92 mmHg', impact: 'medium', trend: 'increasing' },
      { id: 'rf4', name: 'Previous Admissions', value: '2 in past year', impact: 'medium' },
      { id: 'rf5', name: 'Sodium Intake', value: 'Elevated', impact: 'low', description: 'Diet diary shows increased sodium' },
    ],
    interventions: [
      { id: 'i1', action: 'Call patient to assess symptoms', priority: 'immediate', type: 'call', expectedImpact: 'Early detection of decompensation' },
      { id: 'i2', action: 'Adjust diuretic dosage', priority: 'immediate', type: 'medication', expectedImpact: 'Reduce fluid retention' },
      { id: 'i3', action: 'Schedule in-person visit within 48 hours', priority: 'soon', type: 'visit', expectedImpact: 'Physical assessment and medication adjustment' },
      { id: 'i4', action: 'Reinforce low-sodium diet education', priority: 'scheduled', type: 'education', expectedImpact: 'Long-term weight management' },
    ],
  },
  {
    patientId: 'P002',
    patientName: 'Mary Johnson',
    mrn: 'MRN-002',
    age: 78,
    gender: 'F',
    primaryConditions: ['Osteoporosis', 'Hypertension', 'History of Falls'],
    riskCategory: 'fall_risk',
    riskScore: 65,
    riskLevel: 'high',
    trend: 'stable',
    modelConfidence: 88,
    lastAssessment: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    nextScheduledVisit: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    riskFactors: [
      { id: 'rf1', name: 'New Sedative Rx', value: 'Zolpidem started', impact: 'high', description: 'Sedatives increase fall risk in elderly' },
      { id: 'rf2', name: 'Age', value: '78 years', impact: 'medium' },
      { id: 'rf3', name: 'Prior Fall', value: '1 in past 6 months', impact: 'high' },
      { id: 'rf4', name: 'Gait Assessment', value: 'Unsteady', impact: 'medium', description: 'Timed Up and Go: 18 seconds' },
      { id: 'rf5', name: 'Vision', value: 'Cataracts', impact: 'low' },
    ],
    interventions: [
      { id: 'i1', action: 'Review sedative necessity', priority: 'immediate', type: 'medication', expectedImpact: 'Reduce medication-related fall risk' },
      { id: 'i2', action: 'Physical therapy referral', priority: 'soon', type: 'referral', expectedImpact: 'Improve balance and strength' },
      { id: 'i3', action: 'Home safety evaluation', priority: 'soon', type: 'visit', expectedImpact: 'Identify and mitigate environmental hazards' },
      { id: 'i4', action: 'Ophthalmology referral for cataracts', priority: 'scheduled', type: 'referral', expectedImpact: 'Improve vision' },
    ],
  },
  {
    patientId: 'P003',
    patientName: 'Robert Williams',
    mrn: 'MRN-003',
    age: 55,
    gender: 'M',
    primaryConditions: ['Type 2 Diabetes', 'Depression'],
    riskCategory: 'diabetic_crisis',
    riskScore: 52,
    riskLevel: 'moderate',
    trend: 'worsening',
    modelConfidence: 85,
    lastAssessment: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    nextScheduledVisit: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    riskFactors: [
      { id: 'rf1', name: 'A1c Trend', value: '8.2% → 9.1%', impact: 'high', trend: 'increasing', description: '0.9% increase over 3 months' },
      { id: 'rf2', name: 'Missed Appointments', value: '2 in 6 months', impact: 'medium' },
      { id: 'rf3', name: 'Refill Gaps', value: 'Metformin delayed 10 days', impact: 'high' },
      { id: 'rf4', name: 'Depression Score', value: 'PHQ-9: 14', impact: 'medium', description: 'Moderate depression affects self-care' },
    ],
    interventions: [
      { id: 'i1', action: 'Care coordinator outreach', priority: 'immediate', type: 'call', expectedImpact: 'Address barriers to care' },
      { id: 'i2', action: 'Review insulin initiation', priority: 'soon', type: 'medication', expectedImpact: 'Improve glycemic control' },
      { id: 'i3', action: 'Depression follow-up', priority: 'soon', type: 'visit', expectedImpact: 'Address mental health barrier' },
      { id: 'i4', action: 'Diabetes educator referral', priority: 'scheduled', type: 'education', expectedImpact: 'Reinforce self-management skills' },
    ],
  },
  {
    patientId: 'P004',
    patientName: 'Emily Brown',
    mrn: 'MRN-004',
    age: 34,
    gender: 'F',
    primaryConditions: ['Anxiety', 'Migraines'],
    riskCategory: 'no_show',
    riskScore: 72,
    riskLevel: 'high',
    trend: 'stable',
    modelConfidence: 91,
    lastAssessment: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    nextScheduledVisit: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    riskFactors: [
      { id: 'rf1', name: 'No-Show History', value: '3 in past year', impact: 'high' },
      { id: 'rf2', name: 'Appointment Day', value: 'Monday (high no-show day)', impact: 'medium' },
      { id: 'rf3', name: 'Transportation', value: 'No reliable transport', impact: 'high' },
      { id: 'rf4', name: 'Work Schedule', value: 'Variable shifts', impact: 'medium' },
    ],
    interventions: [
      { id: 'i1', action: 'Send appointment reminder (text + call)', priority: 'immediate', type: 'call', expectedImpact: 'Increase show rate by 25%' },
      { id: 'i2', action: 'Offer telehealth alternative', priority: 'immediate', type: 'visit', expectedImpact: 'Remove transportation barrier' },
      { id: 'i3', action: 'Reschedule to preferred day if possible', priority: 'soon', type: 'visit', expectedImpact: 'Accommodate schedule' },
    ],
  },
  {
    patientId: 'P005',
    patientName: 'James Davis',
    mrn: 'MRN-005',
    age: 72,
    gender: 'M',
    primaryConditions: ['CKD Stage 3', 'Atrial Fibrillation', 'GERD'],
    riskCategory: 'readmission_30day',
    riskScore: 45,
    riskLevel: 'moderate',
    trend: 'improving',
    modelConfidence: 87,
    lastAssessment: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    nextScheduledVisit: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    riskFactors: [
      { id: 'rf1', name: 'Recent Discharge', value: '5 days ago', impact: 'high' },
      { id: 'rf2', name: 'Polypharmacy', value: '8 medications', impact: 'medium' },
      { id: 'rf3', name: 'Kidney Function', value: 'eGFR: 42', impact: 'medium', trend: 'stable' },
      { id: 'rf4', name: 'Anticoagulation', value: 'On Apixaban', impact: 'low', description: 'Requires monitoring' },
    ],
    interventions: [
      { id: 'i1', action: 'Post-discharge follow-up call', priority: 'immediate', type: 'call', expectedImpact: 'Identify early warning signs', completed: true },
      { id: 'i2', action: 'Medication reconciliation review', priority: 'soon', type: 'medication', expectedImpact: 'Prevent adverse drug events' },
      { id: 'i3', action: 'Labs in 1 week (renal panel)', priority: 'scheduled', type: 'monitoring', expectedImpact: 'Monitor kidney function' },
    ],
  },
];

// ============================================================
// COMPONENTS
// ============================================================

const RiskLevelBadge: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const styles = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    moderate: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${styles[level]}`}>
      {level.toUpperCase()}
    </span>
  );
};

const RiskScoreGauge: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  const dimensions = {
    sm: { width: 60, height: 60, strokeWidth: 6, fontSize: 'text-sm' },
    md: { width: 80, height: 80, strokeWidth: 8, fontSize: 'text-lg' },
    lg: { width: 100, height: 100, strokeWidth: 10, fontSize: 'text-xl' },
  };

  const { width, height, strokeWidth, fontSize } = dimensions[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = () => {
    if (score >= 70) return '#ef4444'; // red
    if (score >= 50) return '#f97316'; // orange
    if (score >= 30) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  return (
    <div className="relative" style={{ width, height }}>
      <svg className="transform -rotate-90" width={width} height={height}>
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold ${fontSize}`} style={{ color: getColor() }}>
          {score}
        </span>
      </div>
    </div>
  );
};

const RiskFactorItem: React.FC<{ factor: RiskFactor }> = ({ factor }) => {
  const impactColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${
          factor.impact === 'high' ? 'bg-red-500' : 
          factor.impact === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
        }`} />
        <div>
          <p className="text-sm font-medium text-slate-900">{factor.name}</p>
          {factor.description && (
            <p className="text-xs text-slate-500">{factor.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">{factor.value}</span>
        {factor.trend && (
          <span className={factor.trend === 'increasing' ? 'text-red-500' : factor.trend === 'decreasing' ? 'text-green-500' : 'text-slate-400'}>
            {factor.trend === 'increasing' ? <TrendingUp size={14} /> : 
             factor.trend === 'decreasing' ? <TrendingDown size={14} /> : null}
          </span>
        )}
      </div>
    </div>
  );
};

const InterventionItem: React.FC<{ 
  intervention: RecommendedIntervention;
  onComplete: (id: string) => void;
}> = ({ intervention, onComplete }) => {
  const priorityColors = {
    immediate: 'border-red-200 bg-red-50',
    soon: 'border-amber-200 bg-amber-50',
    scheduled: 'border-slate-200 bg-slate-50',
  };

  const typeIcons = {
    call: <Phone size={14} />,
    visit: <Calendar size={14} />,
    medication: <Pill size={14} />,
    referral: <ArrowUpRight size={14} />,
    education: <Brain size={14} />,
    monitoring: <Activity size={14} />,
  };

  return (
    <div className={`p-3 rounded-lg border ${priorityColors[intervention.priority]} ${
      intervention.completed ? 'opacity-60' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-slate-500 mt-0.5">{typeIcons[intervention.type]}</span>
          <div>
            <p className={`text-sm font-medium ${intervention.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
              {intervention.action}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Expected: {intervention.expectedImpact}
            </p>
          </div>
        </div>
        {!intervention.completed && (
          <button
            onClick={() => onComplete(intervention.id)}
            className="p-1 hover:bg-white rounded transition-colors"
            title="Mark complete"
          >
            <CheckCircle size={16} className="text-slate-400 hover:text-green-500" />
          </button>
        )}
        {intervention.completed && (
          <CheckCircle size={16} className="text-green-500" />
        )}
      </div>
    </div>
  );
};

const PatientRiskCard: React.FC<{
  patient: PatientRiskProfile;
  onViewDetails: (patientId: string) => void;
  onInterventionComplete: (patientId: string, interventionId: string) => void;
}> = ({ patient, onViewDetails, onInterventionComplete }) => {
  const [expanded, setExpanded] = useState(false);
  const categoryInfo = RISK_CATEGORIES[patient.riskCategory];

  return (
    <div className={`bg-white rounded-xl border ${
      patient.riskLevel === 'critical' ? 'border-red-200' : 
      patient.riskLevel === 'high' ? 'border-orange-200' : 'border-slate-200'
    } overflow-hidden hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <RiskScoreGauge score={patient.riskScore} size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{patient.patientName}</h3>
                <RiskLevelBadge level={patient.riskLevel} />
              </div>
              <p className="text-sm text-slate-500">
                {patient.age}{patient.gender} • {patient.mrn} • {patient.primaryConditions.slice(0, 2).join(', ')}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {categoryInfo.icon}
                <span className="text-sm font-medium text-slate-700">{categoryInfo.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  patient.trend === 'worsening' ? 'bg-red-100 text-red-600' :
                  patient.trend === 'improving' ? 'bg-green-100 text-green-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {patient.trend}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Quick Interventions */}
        {patient.interventions.filter(i => i.priority === 'immediate' && !i.completed).length > 0 && (
          <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xs font-medium text-red-700 mb-1">Immediate Actions Required:</p>
            {patient.interventions
              .filter(i => i.priority === 'immediate' && !i.completed)
              .slice(0, 2)
              .map(intervention => (
                <div key={intervention.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-red-800">{intervention.action}</span>
                  <button
                    onClick={() => onInterventionComplete(patient.patientId, intervention.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Mark Done
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Risk Factors */}
          <div className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Risk Factors</h4>
            <div className="space-y-1">
              {patient.riskFactors.map(factor => (
                <RiskFactorItem key={factor.id} factor={factor} />
              ))}
            </div>
          </div>

          {/* All Interventions */}
          <div className="p-4 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Recommended Interventions</h4>
            <div className="space-y-2">
              {patient.interventions.map(intervention => (
                <InterventionItem
                  key={intervention.id}
                  intervention={intervention}
                  onComplete={(id) => onInterventionComplete(patient.patientId, id)}
                />
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <p>Model confidence: {patient.modelConfidence}%</p>
              <p>Last assessed: {patient.lastAssessment.toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => onViewDetails(patient.patientId)}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Full Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const RiskCategorySummaryCard: React.FC<{ summary: RiskSummary }> = ({ summary }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {summary.icon}
          <h3 className="font-semibold text-slate-900">{summary.name}</h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          summary.trend === 'up' ? 'bg-red-100 text-red-600' :
          summary.trend === 'down' ? 'bg-green-100 text-green-600' :
          'bg-slate-100 text-slate-600'
        }`}>
          {summary.trend === 'up' ? '↑' : summary.trend === 'down' ? '↓' : '→'} {Math.abs(summary.trendValue)}%
        </span>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900">{summary.totalPatients}</p>
          <p className="text-sm text-slate-500">patients at risk</p>
        </div>
        <div className="flex gap-1">
          {summary.criticalCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
              {summary.criticalCount} critical
            </span>
          )}
          {summary.highCount > 0 && (
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
              {summary.highCount} high
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export const PredictiveRiskDashboard: React.FC = () => {
  const [patients, setPatients] = useState<PatientRiskProfile[]>(mockPatientRisks);
  const [selectedCategory, setSelectedCategory] = useState<RiskCategory | 'all'>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate summaries
  const summaries: RiskSummary[] = Object.entries(RISK_CATEGORIES).map(([category, info]) => {
    const categoryPatients = patients.filter(p => p.riskCategory === category);
    return {
      category: category as RiskCategory,
      name: info.name,
      description: info.description,
      icon: info.icon,
      totalPatients: categoryPatients.length,
      criticalCount: categoryPatients.filter(p => p.riskLevel === 'critical').length,
      highCount: categoryPatients.filter(p => p.riskLevel === 'high').length,
      moderateCount: categoryPatients.filter(p => p.riskLevel === 'moderate').length,
      lowCount: categoryPatients.filter(p => p.riskLevel === 'low').length,
      avgRiskScore: categoryPatients.length > 0 
        ? Math.round(categoryPatients.reduce((sum, p) => sum + p.riskScore, 0) / categoryPatients.length)
        : 0,
      trend: 'stable' as const,
      trendValue: Math.floor(Math.random() * 10) - 5,
    };
  });

  // Filter patients
  const filteredPatients = patients.filter(p => {
    if (selectedCategory !== 'all' && p.riskCategory !== selectedCategory) return false;
    if (selectedRiskLevel !== 'all' && p.riskLevel !== selectedRiskLevel) return false;
    return true;
  }).sort((a, b) => b.riskScore - a.riskScore);

  const handleInterventionComplete = (patientId: string, interventionId: string) => {
    setPatients(prev => prev.map(patient => {
      if (patient.patientId !== patientId) return patient;
      return {
        ...patient,
        interventions: patient.interventions.map(intervention =>
          intervention.id === interventionId
            ? { ...intervention, completed: true }
            : intervention
        ),
      };
    }));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const totalCritical = patients.filter(p => p.riskLevel === 'critical').length;
  const totalHigh = patients.filter(p => p.riskLevel === 'high').length;
  const pendingInterventions = patients.reduce(
    (sum, p) => sum + p.interventions.filter(i => !i.completed && i.priority === 'immediate').length,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Predictive Risk Dashboard</h1>
          <p className="text-slate-500 mt-1">AI-powered early warning system for patient deterioration</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Alert Banner */}
      {(totalCritical > 0 || pendingInterventions > 0) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-900">
                {totalCritical} critical risk patient{totalCritical !== 1 ? 's' : ''} • {pendingInterventions} immediate intervention{pendingInterventions !== 1 ? 's' : ''} pending
              </p>
              <p className="text-sm text-red-700">Review and take action to prevent adverse outcomes</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
            Review Now
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Critical Risk</p>
              <p className="text-2xl font-bold text-red-600">{totalCritical}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">High Risk</p>
              <p className="text-2xl font-bold text-orange-600">{totalHigh}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Interventions</p>
              <p className="text-2xl font-bold text-purple-600">{pendingInterventions}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Model Accuracy</p>
              <p className="text-2xl font-bold text-green-600">89%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Summaries */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {summaries.filter(s => s.totalPatients > 0).map(summary => (
          <RiskCategorySummaryCard key={summary.category} summary={summary} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm text-slate-600">Filter by:</span>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as RiskCategory | 'all')}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Categories</option>
          {Object.entries(RISK_CATEGORIES).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </select>
        <select
          value={selectedRiskLevel}
          onChange={(e) => setSelectedRiskLevel(e.target.value as RiskLevel | 'all')}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="moderate">Moderate</option>
          <option value="low">Low</option>
        </select>
        <span className="text-sm text-slate-500">
          Showing {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Patient Risk Cards */}
      <div className="space-y-4">
        {filteredPatients.map(patient => (
          <PatientRiskCard
            key={patient.patientId}
            patient={patient}
            onViewDetails={(id) => console.log('View details:', id)}
            onInterventionComplete={handleInterventionComplete}
          />
        ))}

        {filteredPatients.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Shield size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No patients match the current filters</p>
            <p className="text-sm">Try adjusting your filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveRiskDashboard;
