// ============================================================
// Pre-Visit Summary - Main Component
// apps/provider-portal/components/previsit/PreVisitSummary.tsx
//
// Comprehensive pre-visit intelligence display matching the
// dashboard purple gradient theme with WHITE cards
// ============================================================

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  AlertTriangle,
  FlaskConical,
  Pill,
  ImageIcon,
  UserPlus,
  Calendar,
  BookOpen,
  FileText,
  Play,
  AlertCircle,
  Activity,
  Heart,
  Wind,
  Check,
  Minus,
  Plus,
  Shield,
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import { ProviderShell } from '@/components/layout/ProviderShell';

// ============================================================
// Theme - Matching Dashboard
// ============================================================

const theme = {
  gradient: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
};

// ============================================================
// Types
// ============================================================

export interface PatientVitals {
  bloodPressure: { systolic: number; diastolic: number; status: 'normal' | 'elevated' | 'high' | 'critical' };
  heartRate: { value: number; status: 'normal' | 'bradycardia' | 'tachycardia' | 'critical' };
  temperature: { value: number; unit: 'F' | 'C'; status: 'normal' | 'low' | 'elevated' | 'fever' };
  respRate: { value: number; status: 'normal' | 'low' | 'elevated' };
  oxygenSat: { value: number; status: 'normal' | 'low' | 'critical' };
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  status: 'active' | 'self-medicating' | 'discontinued' | 'prn';
}

export interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface ActionItem {
  id: string;
  description: string;
  priority: 'urgent' | 'high' | 'normal';
  completed?: boolean;
}

export interface RiskFactor {
  id: string;
  description: string;
}

export interface SuggestedDiagnosis {
  id: string;
  name: string;
  icdCode: string;
  confidence: number; // 0-1
  category: 'primary' | 'secondary' | 'rule-out';
  supportingEvidence: string[];
  concerns: string[];
  diagnosticCriteria?: string[];
  physicalExamInstructions?: string[];
  rationale?: string;
}

export interface PreVisitData {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    mrn: string;
    dob: string;
    lastVisit?: string;
    phone?: string;
  };
  appointment: {
    time: string;
    type: string;
  };
  chiefComplaint: {
    summary: string;
    patientQuote?: string;
    patientEmphasis?: string;
    details: string;
  };
  vitals: PatientVitals;
  medications: Medication[];
  allergies: Allergy[];
  riskAssessment: {
    level: 'low' | 'moderate' | 'high' | 'critical';
    summary: string;
    factors: RiskFactor[];
  };
  actionItems: ActionItem[];
  soapNote?: string;
  suggestedDiagnoses?: SuggestedDiagnosis[];
  criticalAlert?: {
    message: string;
    type: 'sah' | 'mi' | 'stroke' | 'sepsis' | 'other';
  };
}

export interface PreVisitSummaryProps {
  data: PreVisitData;
  onStartEncounter?: () => void;
  onOrderLabs?: () => void;
  onOrderImaging?: () => void;
  onPrescribe?: () => void;
  onRefer?: () => void;
  onScheduleFollowup?: () => void;
  onEmergencyProtocol?: () => void;
  onReviewChart?: () => void;
  onNavigatePatient?: (direction: 'prev' | 'next') => void;
}

// ============================================================
// Utility Components
// ============================================================

const VitalBadge: React.FC<{
  label: string;
  value: string;
  status: 'normal' | 'elevated' | 'high' | 'critical' | 'low' | 'bradycardia' | 'tachycardia' | 'fever';
  icon: React.ReactNode;
  alertId?: string;
  isAcknowledged?: boolean;
  onAcknowledge?: (id: string) => void;
}> = ({ label: _label, value, status, icon, alertId, isAcknowledged, onAcknowledge }) => {
  const isPulsing = (status === 'critical' || status === 'high' || status === 'elevated' || status === 'tachycardia' || status === 'fever') && !isAcknowledged;
  
  const statusStyles = {
    normal: 'bg-green-50 text-green-700 border-green-200',
    elevated: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200',
    critical: 'bg-red-100 text-red-800 border-red-300',
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    bradycardia: 'bg-blue-50 text-blue-700 border-blue-200',
    tachycardia: 'bg-amber-50 text-amber-700 border-amber-200',
    fever: 'bg-red-50 text-red-700 border-red-200',
  };

  const statusLabels = {
    normal: 'Normal',
    elevated: 'Elevated',
    high: 'High',
    critical: 'Critical',
    low: 'Low',
    bradycardia: 'Bradycardia',
    tachycardia: 'Tachycardia',
    fever: 'Fever',
  };

  const handleClick = () => {
    if (alertId && onAcknowledge && isPulsing) {
      onAcknowledge(alertId);
    }
  };

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusStyles[status]} ${isPulsing ? 'animate-pulse cursor-pointer hover:opacity-80' : ''} ${isAcknowledged ? 'opacity-75' : ''} transition-all`}
      onClick={handleClick}
      title={isPulsing ? 'Click to acknowledge' : isAcknowledged ? 'Acknowledged' : ''}
    >
      {icon}
      <span className="font-medium text-sm">
        {statusLabels[status]}: {value}
      </span>
      {isAcknowledged && status !== 'normal' && (
        <Check className="w-3 h-3" />
      )}
    </div>
  );
};

const QuickActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
}> = ({ icon, label, href, onClick, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-50 hover:bg-teal-50 text-gray-700 border-gray-200 hover:border-teal-300 hover:text-teal-700',
    primary: 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
  };

  const content = (
    <>
      <div className={`p-2 rounded-lg ${variant === 'default' ? 'bg-teal-100 text-teal-600' : 'bg-white/20'}`}>
        {icon}
      </div>
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all hover:-translate-y-1 ${variants[variant]} shadow-sm hover:shadow-md`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all hover:-translate-y-1 ${variants[variant]} shadow-sm hover:shadow-md`}
    >
      {content}
    </button>
  );
};

const AllergyCard: React.FC<{ allergy: Allergy }> = ({ allergy }) => {
  const severityStyles = {
    mild: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    moderate: 'bg-orange-50 border-orange-200 text-orange-800',
    severe: 'bg-red-50 border-red-200 text-red-800',
  };

  const severityBadge = {
    mild: 'bg-yellow-100 text-yellow-700',
    moderate: 'bg-orange-100 text-orange-700',
    severe: 'bg-red-100 text-red-700',
  };

  return (
    <div className={`p-3 rounded-lg border ${severityStyles[allergy.severity]}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="font-semibold">{allergy.allergen}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${severityBadge[allergy.severity]}`}>
          {allergy.severity}
        </span>
      </div>
      <p className="text-sm opacity-80">{allergy.reaction}</p>
    </div>
  );
};

const ActionItemRow: React.FC<{ 
  item: ActionItem; 
  onToggle?: (id: string) => void;
}> = ({ item, onToggle }) => {
  const priorityStyles = {
    urgent: 'bg-red-50 border-red-200',
    high: 'bg-amber-50 border-amber-200',
    normal: 'bg-gray-50 border-gray-200',
  };

  const priorityBadge = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-amber-500 text-white',
    normal: 'bg-gray-500 text-white',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${priorityStyles[item.priority]} ${item.completed ? 'opacity-60' : ''}`}>
      <button
        onClick={() => onToggle?.(item.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          item.completed 
            ? 'bg-green-500 border-green-500 text-white' 
            : 'border-gray-300 hover:border-teal-500'
        }`}
      >
        {item.completed && <Check className="w-3 h-3" />}
      </button>
      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {item.description}
      </span>
      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${priorityBadge[item.priority]}`}>
        {item.priority}
      </span>
    </div>
  );
};

// ============================================================
// Diagnosis Card for Pre-Visit AI Suggestions
// ============================================================

const DiagnosisCard: React.FC<{
  dx: SuggestedDiagnosis;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ dx, isExpanded, onToggle }) => {
  const categoryStyles = {
    primary: { badge: 'bg-green-100 text-green-700', label: 'PRIMARY' },
    secondary: { badge: 'bg-gray-100 text-gray-700', label: 'SECONDARY' },
    'rule-out': { badge: 'bg-red-100 text-red-700', label: 'RULE OUT' },
  };
  const cat = categoryStyles[dx.category];
  const pct = Math.round(dx.confidence * 100);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header row */}
      <button onClick={onToggle} className="w-full p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors text-left">
        {/* Confidence ring */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none"
              stroke={pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#9ca3af'}
              strokeWidth="3" strokeDasharray={`${pct * 0.975} 100`} strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
            {pct}%
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">{dx.name}</h4>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{dx.icdCode}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cat.badge}`}>{cat.label}</span>
          </div>
          {dx.rationale && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{dx.rationale}</p>
          )}
        </div>

        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 mt-1" /> : <ChevronDown className="w-5 h-5 text-gray-400 mt-1" />}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          {/* Supporting Evidence */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" /> Supporting Evidence
            </h5>
            <ul className="space-y-1">
              {dx.supportingEvidence.map((e, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />{e}
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns */}
          {dx.concerns.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Clinical Concerns
              </h5>
              <ul className="space-y-1">
                {dx.concerns.map((c, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Diagnostic Criteria */}
          {dx.diagnosticCriteria && dx.diagnosticCriteria.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-teal-700 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Diagnostic Criteria
              </h5>
              <ol className="space-y-1">
                {dx.diagnosticCriteria.map((c, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {c}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Physical Exam Instructions */}
          {dx.physicalExamInstructions && dx.physicalExamInstructions.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" /> Physical Exam Guide
              </h5>
              <ul className="space-y-1">
                {dx.physicalExamInstructions.map((p, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0 mt-1.5" />{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export const PreVisitSummary: React.FC<PreVisitSummaryProps> = ({
  data,
  onStartEncounter,
  onOrderLabs,
  onOrderImaging,
  onPrescribe,
  onRefer,
  onScheduleFollowup,
  onEmergencyProtocol,
  onReviewChart,
  onNavigatePatient,
}) => {
  const router = useRouter();
  const patientId = data.patient.id;
  
  const [allExpanded, setAllExpanded] = useState(true);
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'pending' | 'reviewed'>>({
    soapNote: 'pending',
    chiefComplaint: 'pending',
    diagnoses: 'pending',
    medications: 'pending',
    vitals: 'pending',
    riskAssessment: 'pending',
    allergies: 'pending',
    actionItems: 'pending',
  });
  const [actionItems, setActionItems] = useState(data.actionItems);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [expandedDxId, setExpandedDxId] = useState<string | null>(null);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
  }, []);

  const isAlertAcknowledged = useCallback((alertId: string) => {
    return acknowledgedAlerts.has(alertId);
  }, [acknowledgedAlerts]);

  const markSectionReviewed = useCallback((section: string) => {
    setSectionStatus(prev => ({ ...prev, [section]: 'reviewed' }));
  }, []);

  const toggleActionItem = useCallback((id: string) => {
    setActionItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const allReviewed = Object.values(sectionStatus).every(s => s === 'reviewed');
  const { patient, vitals, chiefComplaint, riskAssessment } = data;

  return (
    <ProviderShell
      contextBadge="Pre-Visit Intelligence"
      currentPage=""
      patientNav={{
        onPrev: () => onNavigatePatient?.('prev'),
        onNext: () => onNavigatePatient?.('next'),
      }}
      criticalAlert={
        data.criticalAlert
          ? {
              message: `CRITICAL ALERT: ${data.criticalAlert.message}`,
              onAction: onEmergencyProtocol,
              actionLabel: 'Emergency Protocol',
            }
          : undefined
      }
    >
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Patient Header Card - WHITE */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Patient Info */}
            <div className="flex items-start gap-4 flex-1">
              {/* Avatar */}
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
              
              {/* Details */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {patient.firstName} {patient.lastName}
                </h2>
                <p className="text-gray-600 mt-1">
                  {patient.age} y/o {patient.gender} • MRN: {patient.mrn} • DOB: {patient.dob}
                  {patient.lastVisit && ` • Last Visit: ${patient.lastVisit}`}
                </p>
                
                {/* Vital Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <VitalBadge
                    label="BP"
                    value={`${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`}
                    status={vitals.bloodPressure.status}
                    icon={<Activity className="w-4 h-4" />}
                    alertId="vital-bp"
                    isAcknowledged={isAlertAcknowledged('vital-bp')}
                    onAcknowledge={acknowledgeAlert}
                  />
                  <VitalBadge
                    label="HR"
                    value={`${vitals.heartRate.value} BPM`}
                    status={vitals.heartRate.status}
                    icon={<Heart className="w-4 h-4" />}
                    alertId="vital-hr"
                    isAcknowledged={isAlertAcknowledged('vital-hr')}
                    onAcknowledge={acknowledgeAlert}
                  />
                  <VitalBadge
                    label="O2"
                    value={`${vitals.oxygenSat.value}%`}
                    status={vitals.oxygenSat.status}
                    icon={<Wind className="w-4 h-4" />}
                    alertId="vital-o2"
                    isAcknowledged={isAlertAcknowledged('vital-o2')}
                    onAcknowledge={acknowledgeAlert}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions - Using Links to correct pages */}
            <div className="flex flex-wrap gap-2 lg:gap-3">
              <QuickActionButton
                icon={<FlaskConical className="w-5 h-5" />}
                label="Order Labs"
                onClick={onOrderLabs}
                href={onOrderLabs ? undefined : `/labs?patientId=${patientId}`}
              />
              <QuickActionButton
                icon={<Pill className="w-5 h-5" />}
                label="E-Prescribe"
                onClick={onPrescribe}
                href={onPrescribe ? undefined : `/medications?patientId=${patientId}`}
              />
              <QuickActionButton
                icon={<ImageIcon className="w-5 h-5" />}
                label="Order Imaging"
                onClick={onOrderImaging}
                href={onOrderImaging ? undefined : `/imaging?patientId=${patientId}`}
              />
              <QuickActionButton
                icon={<UserPlus className="w-5 h-5" />}
                label="Refer Specialist"
                onClick={onRefer}
                href={onRefer ? undefined : `/referrals?patientId=${patientId}`}
              />
              <QuickActionButton
                icon={<Calendar className="w-5 h-5" />}
                label="Schedule Follow-up"
                onClick={onScheduleFollowup}
                href={onScheduleFollowup ? undefined : `/schedule?patientId=${patientId}`}
              />
              <QuickActionButton
                icon={<BookOpen className="w-5 h-5" />}
                label="Patient Education"
                href={`/help?patientId=${patientId}`}
              />
            </div>
          </div>
        </div>

        {/* Section Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAllExpanded(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Minus className="w-4 h-4" />
              Collapse All
            </button>
            <button
              onClick={() => setAllExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Expand All
            </button>
            {acknowledgedAlerts.size > 0 && (
              <button
                onClick={() => setAcknowledgedAlerts(new Set())}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Reset Alerts ({acknowledgedAlerts.size})
              </button>
            )}
          </div>
          
          <button
            onClick={() => {
              Object.keys(sectionStatus).forEach(key => markSectionReviewed(key));
            }}
            disabled={allReviewed}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              allReviewed
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-white text-teal-700 hover:bg-teal-50 shadow-md'
            }`}
          >
            <Check className="w-4 h-4" />
            {allReviewed ? 'All Reviewed' : 'Mark All as Reviewed'}
          </button>
        </div>

        {/* Collapsible Sections - WHITE CARDS */}
        <div className="space-y-4">
          {/* SOAP Note (Pre-Visit) — Default first section */}
          {data.soapNote && (
            <CollapsibleSection
              title="SOAP Note (Pre-Visit)"
              defaultOpen={true}
              status={sectionStatus.soapNote}
              priority="normal"
              onMarkReviewed={() => markSectionReviewed('soapNote')}
            >
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <p className="text-sm text-indigo-800">
                    Auto-generated from COMPASS assessment. Objective and Plan sections update after provider exam.
                  </p>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 rounded-lg p-4 leading-relaxed border border-gray-200">
                  {data.soapNote}
                </pre>
              </div>
            </CollapsibleSection>
          )}

          {/* Chief Complaint & History */}
          <CollapsibleSection
            title="Chief Complaint & History"
            defaultOpen={allExpanded}
            status={sectionStatus.chiefComplaint}
            priority={riskAssessment.level === 'high' || riskAssessment.level === 'critical' ? 'urgent' : 'normal'}
            onMarkReviewed={() => markSectionReviewed('chiefComplaint')}
          >
            <div className="pt-4 space-y-4">
              {chiefComplaint.patientQuote && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <p className="text-indigo-900 font-medium italic">
                    "{chiefComplaint.patientQuote}"
                  </p>
                  {chiefComplaint.patientEmphasis && (
                    <p className="text-indigo-700 text-sm mt-2">
                      {chiefComplaint.patientEmphasis}
                    </p>
                  )}
                </div>
              )}
              
              <div className="text-gray-700 text-sm leading-relaxed">
                <p>{chiefComplaint.details}</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* AI Suggested Diagnoses — always shown */}
          <CollapsibleSection
            title="AI Suggested Diagnoses"
            badge={data.suggestedDiagnoses?.length || 0}
            defaultOpen={allExpanded}
            status={sectionStatus.diagnoses}
            priority={data.suggestedDiagnoses?.some(d => d.category === 'rule-out' && d.confidence >= 0.25) ? 'high' : 'normal'}
            onMarkReviewed={() => markSectionReviewed('diagnoses')}
          >
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-4 p-3 bg-teal-50 border border-teal-100 rounded-lg">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <p className="text-sm text-teal-800">
                  Based on COMPASS assessment, patient history, and clinical data. Tap a diagnosis to see criteria, rationale, and PE instructions.
                </p>
              </div>
              {data.suggestedDiagnoses && data.suggestedDiagnoses.length > 0 ? (
                <div className="space-y-3">
                  {data.suggestedDiagnoses
                    .sort((a, b) => b.confidence - a.confidence)
                    .map((dx) => (
                      <DiagnosisCard
                        key={dx.id}
                        dx={dx}
                        isExpanded={expandedDxId === dx.id}
                        onToggle={() => setExpandedDxId(expandedDxId === dx.id ? null : dx.id)}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">Differential diagnosis pending</p>
                  <p className="text-sm mt-1">Will be generated after clinical evaluation</p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Current Medications */}
          <CollapsibleSection
            title="Current Medications"
            badge={data.medications.length}
            defaultOpen={allExpanded}
            status={sectionStatus.medications}
            onMarkReviewed={() => markSectionReviewed('medications')}
          >
            <div className="pt-4 space-y-3">
              {data.medications.map((med) => (
                <div key={med.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">{med.name}</h4>
                    <p className="text-sm text-gray-600">{med.dosage} • {med.frequency}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                    med.status === 'active' ? 'bg-green-100 text-green-700' :
                    med.status === 'self-medicating' ? 'bg-amber-100 text-amber-700' :
                    med.status === 'prn' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {med.status === 'self-medicating' ? 'Self-medicating' : med.status}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Vital Signs */}
          <CollapsibleSection
            title="Vital Signs"
            defaultOpen={allExpanded}
            status={sectionStatus.vitals}
            priority={
              vitals.bloodPressure.status === 'critical' || vitals.heartRate.status === 'critical' 
                ? 'urgent' 
                : vitals.bloodPressure.status === 'high' || vitals.heartRate.status === 'tachycardia'
                  ? 'high'
                  : 'normal'
            }
            onMarkReviewed={() => markSectionReviewed('vitals')}
          >
            <div className="pt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${
                  vitals.bloodPressure.status === 'normal' ? 'text-green-600' :
                  vitals.bloodPressure.status === 'elevated' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {vitals.bloodPressure.systolic}/{vitals.bloodPressure.diastolic}
                </div>
                <div className="text-sm text-gray-500 mt-1">Blood Pressure</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${
                  vitals.heartRate.status === 'normal' ? 'text-green-600' :
                  vitals.heartRate.status === 'tachycardia' ? 'text-amber-600' :
                  vitals.heartRate.status === 'bradycardia' ? 'text-blue-600' :
                  'text-red-600'
                }`}>
                  {vitals.heartRate.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">Heart Rate</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${
                  vitals.temperature.status === 'normal' ? 'text-green-600' :
                  vitals.temperature.status === 'fever' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {vitals.temperature.value}°{vitals.temperature.unit}
                </div>
                <div className="text-sm text-gray-500 mt-1">Temperature</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${
                  vitals.respRate.status === 'normal' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {vitals.respRate.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">Resp Rate</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${
                  vitals.oxygenSat.status === 'normal' ? 'text-green-600' :
                  vitals.oxygenSat.status === 'low' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {vitals.oxygenSat.value}%
                </div>
                <div className="text-sm text-gray-500 mt-1">O2 Saturation</div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Risk Assessment */}
          <CollapsibleSection
            title="Risk Assessment"
            defaultOpen={allExpanded}
            status={sectionStatus.riskAssessment}
            priority={riskAssessment.level === 'high' || riskAssessment.level === 'critical' ? 'urgent' : 'normal'}
            onMarkReviewed={() => markSectionReviewed('riskAssessment')}
          >
            <div className="pt-4">
              <div 
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold mb-4 transition-all ${
                  riskAssessment.level === 'low' ? 'bg-green-100 text-green-800' :
                  riskAssessment.level === 'moderate' ? 'bg-amber-100 text-amber-800' :
                  riskAssessment.level === 'high' ? 'bg-red-100 text-red-800' :
                  'bg-red-200 text-red-900'
                } ${
                  (riskAssessment.level === 'high' || riskAssessment.level === 'critical') && !isAlertAcknowledged('risk-level')
                    ? 'animate-pulse cursor-pointer hover:opacity-80'
                    : ''
                }`}
                onClick={() => {
                  if ((riskAssessment.level === 'high' || riskAssessment.level === 'critical') && !isAlertAcknowledged('risk-level')) {
                    acknowledgeAlert('risk-level');
                  }
                }}
              >
                <Shield className="w-5 h-5" />
                {riskAssessment.level.toUpperCase()} RISK - {riskAssessment.summary}
                {isAlertAcknowledged('risk-level') && (riskAssessment.level === 'high' || riskAssessment.level === 'critical') && (
                  <Check className="w-4 h-4 ml-1" />
                )}
              </div>

              <ul className="space-y-2">
                {riskAssessment.factors.map((factor) => (
                  <li key={factor.id} className="flex items-start gap-2 text-gray-700">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{factor.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleSection>

          {/* Drug Allergies */}
          <CollapsibleSection
            title="Drug Allergies"
            badge={data.allergies.length}
            defaultOpen={allExpanded}
            status={sectionStatus.allergies}
            priority={data.allergies.some(a => a.severity === 'severe') ? 'high' : 'normal'}
            onMarkReviewed={() => markSectionReviewed('allergies')}
          >
            <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.allergies.map((allergy) => (
                <AllergyCard key={allergy.id} allergy={allergy} />
              ))}
            </div>
          </CollapsibleSection>

          {/* Immediate Action Items */}
          <CollapsibleSection
            title="Immediate Action Items"
            defaultOpen={allExpanded}
            status={sectionStatus.actionItems}
            priority={actionItems.some(a => a.priority === 'urgent') ? 'urgent' : 'normal'}
            onMarkReviewed={() => markSectionReviewed('actionItems')}
          >
            <div className="pt-4 space-y-2">
              {actionItems.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  onToggle={toggleActionItem}
                />
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onEmergencyProtocol}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                <AlertTriangle className="w-5 h-5" />
                Emergency Protocol
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onStartEncounter}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl font-medium shadow-lg transition-all"
                >
                  <Play className="w-5 h-5" />
                  Start Encounter
                </button>

                <button
                  onClick={onReviewChart}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl font-medium transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  Review Full Chart
                </button>

                <button
                  className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl font-medium transition-colors"
                >
                  <BookOpen className="w-5 h-5" />
                  Add Notes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Padding for Fixed Footer */}
        <div className="h-24" />
      </div>
    </ProviderShell>
  );
};

export default PreVisitSummary;
