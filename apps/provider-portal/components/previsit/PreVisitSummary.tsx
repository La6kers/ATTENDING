// ============================================================
// Pre-Visit Summary - Main Component
// apps/provider-portal/components/previsit/PreVisitSummary.tsx
//
// Comprehensive pre-visit intelligence display matching the
// HTML prototype layout with full functionality integration
// ============================================================

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  AlertTriangle,
  Clock,
  FlaskConical,
  Pill,
  Image as ImageIcon,
  UserPlus,
  Calendar,
  BookOpen,
  ChevronLeft,
  ChevronRight,
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
  Stethoscope,
} from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';

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
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
}> = ({ icon, label, onClick, variant = 'default' }) => {
  const variants = {
    default: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all ${variants[variant]} shadow-sm hover:shadow`}
    >
      <div className="p-2 rounded-lg bg-opacity-10 bg-current">
        {icon}
      </div>
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
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
            : 'border-gray-300 hover:border-indigo-500'
        }`}
      >
        {item.completed && <Check className="w-3 h-3" />}
      </button>
      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
        {item.description}
      </span>
      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${priorityBadge[item.priority]}`}>
        {item.priority}
      </span>
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
  const [allExpanded, setAllExpanded] = useState(true);
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'pending' | 'reviewed'>>({
    chiefComplaint: 'pending',
    medications: 'pending',
    vitals: 'pending',
    riskAssessment: 'pending',
    allergies: 'pending',
    actionItems: 'pending',
  });
  const [actionItems, setActionItems] = useState(data.actionItems);
  
  // Track acknowledged (no longer pulsing) alerts
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

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
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo & Title */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">ATTENDING</h1>
                  <p className="text-xs text-gray-500">Pre-Visit Intelligence</p>
                </div>
              </div>
            </div>

            {/* Center - Time */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-indigo-600 font-medium">
                Next: {data.appointment.time} Appointment
              </div>
            </div>

            {/* Right - Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigatePatient?.('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Previous patient"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => onNavigatePatient?.('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Next patient"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {data.criticalAlert && (
        <div 
          className={`bg-gradient-to-r from-red-600 to-red-700 text-white cursor-pointer transition-all ${
            isAlertAcknowledged('critical-banner') ? 'opacity-90' : ''
          }`}
          onClick={() => acknowledgeAlert('critical-banner')}
          title={isAlertAcknowledged('critical-banner') ? 'Alert acknowledged' : 'Click to acknowledge'}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className={`w-6 h-6 ${isAlertAcknowledged('critical-banner') ? '' : 'animate-pulse'}`} />
              </div>
              <div className="flex-1">
                <span className="font-bold">CRITICAL ALERT:</span>{' '}
                <span>{data.criticalAlert.message}</span>
                {isAlertAcknowledged('critical-banner') && (
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">✓ Acknowledged</span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEmergencyProtocol?.();
                }}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
              >
                Emergency Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Patient Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Patient Info */}
            <div className="flex items-start gap-4 flex-1">
              {/* Avatar */}
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
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

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 lg:gap-3">
              <QuickActionButton
                icon={<FlaskConical className="w-5 h-5" />}
                label="Order Labs"
                onClick={onOrderLabs}
              />
              <QuickActionButton
                icon={<Pill className="w-5 h-5" />}
                label="E-Prescribe"
                onClick={onPrescribe}
              />
              <QuickActionButton
                icon={<ImageIcon className="w-5 h-5" />}
                label="Order Imaging"
                onClick={onOrderImaging}
              />
              <QuickActionButton
                icon={<UserPlus className="w-5 h-5" />}
                label="Refer Specialist"
                onClick={onRefer}
              />
              <QuickActionButton
                icon={<Calendar className="w-5 h-5" />}
                label="Schedule Follow-up"
                onClick={onScheduleFollowup}
              />
              <QuickActionButton
                icon={<BookOpen className="w-5 h-5" />}
                label="Patient Education"
                onClick={() => {}}
              />
            </div>
          </div>
        </div>

        {/* Section Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAllExpanded(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Minus className="w-4 h-4" />
              Collapse All
            </button>
            <button
              onClick={() => setAllExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Expand All
            </button>
            {acknowledgedAlerts.size > 0 && (
              <button
                onClick={() => setAcknowledgedAlerts(new Set())}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
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
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Check className="w-4 h-4" />
            {allReviewed ? 'All Reviewed' : 'Mark All as Reviewed'}
          </button>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-4">
          {/* Chief Complaint & History */}
          <CollapsibleSection
            title="Chief Complaint & History"
            defaultOpen={allExpanded}
            status={sectionStatus.chiefComplaint}
            priority={riskAssessment.level === 'high' || riskAssessment.level === 'critical' ? 'urgent' : 'normal'}
            onMarkReviewed={() => markSectionReviewed('chiefComplaint')}
          >
            <div className="pt-4 space-y-4">
              {/* Patient Quote */}
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
              
              {/* Detailed History */}
              <div className="prose prose-sm max-w-none text-gray-700">
                <p>{chiefComplaint.details}</p>
              </div>
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
              {/* Blood Pressure */}
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

              {/* Heart Rate */}
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

              {/* Temperature */}
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

              {/* Resp Rate */}
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${
                  vitals.respRate.status === 'normal' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {vitals.respRate.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">Resp Rate</div>
              </div>

              {/* O2 Sat */}
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
              {/* Risk Level Badge */}
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
                } ${
                  isAlertAcknowledged('risk-level') ? 'opacity-75' : ''
                }`}
                onClick={() => {
                  if ((riskAssessment.level === 'high' || riskAssessment.level === 'critical') && !isAlertAcknowledged('risk-level')) {
                    acknowledgeAlert('risk-level');
                  }
                }}
                title={(riskAssessment.level === 'high' || riskAssessment.level === 'critical') && !isAlertAcknowledged('risk-level') ? 'Click to acknowledge' : ''}
              >
                <Shield className="w-5 h-5" />
                {riskAssessment.level.toUpperCase()} RISK - {riskAssessment.summary}
                {isAlertAcknowledged('risk-level') && (riskAssessment.level === 'high' || riskAssessment.level === 'critical') && (
                  <Check className="w-4 h-4 ml-1" />
                )}
              </div>

              {/* Risk Factors */}
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
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg transition-all"
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
    </div>
  );
};

export default PreVisitSummary;
