// =============================================================================
// ATTENDING AI - Enhanced Conversation View
// apps/provider-portal/components/inbox/EnhancedConversationView.tsx
//
// Smart conversation view with AI analysis, lab detection, and patient context
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Beaker,
  Phone,
  Pill,
  AlertTriangle,
  Clock,
  User,
  Activity,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';
import type { Message } from '@/store/useInbox';

// Types
interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  date: string;
  trend?: 'up' | 'down' | 'stable';
  previousValue?: string;
}

interface DetectedIntent {
  type: 'lab_request' | 'refill_request' | 'appointment_request' | 'symptom_report' | 'question' | 'followup';
  confidence: number;
  details: string[];
}

interface PatientContext {
  recentVisits: Array<{ date: string; reason: string; provider: string }>;
  activeProblems: string[];
  recentLabs: LabResult[];
  dueLabs: string[];
  medications: Array<{ name: string; dose: string; lastRefill: string }>;
}

interface EnhancedConversationViewProps {
  message: Message;
}

// Analysis Functions
const analyzeMessageIntent = (content: string): DetectedIntent[] => {
  const intents: DetectedIntent[] = [];

  if (/lab|blood work|blood test|a1c|cholesterol|thyroid|cbc|metabolic/i.test(content)) {
    const labDetails: string[] = [];
    if (/a1c|hemoglobin/i.test(content)) labDetails.push('HbA1c');
    if (/cholesterol|lipid/i.test(content)) labDetails.push('Lipid Panel');
    if (/thyroid|tsh/i.test(content)) labDetails.push('Thyroid Panel');
    if (/cbc|blood count/i.test(content)) labDetails.push('CBC');
    if (/metabolic|cmp|bmp/i.test(content)) labDetails.push('Metabolic Panel');
    if (/vitamin d/i.test(content)) labDetails.push('Vitamin D');
    if (labDetails.length === 0) labDetails.push('Routine Labs');
    
    intents.push({ type: 'lab_request', confidence: 0.92, details: labDetails });
  }

  if (/refill|prescription|medication|running out|need more|renew/i.test(content)) {
    intents.push({ type: 'refill_request', confidence: 0.88, details: ['Medication refill requested'] });
  }

  if (/appointment|schedule|visit|see (you|the doctor)|come in/i.test(content)) {
    intents.push({ type: 'appointment_request', confidence: 0.85, details: ['Appointment scheduling requested'] });
  }

  if (/pain|fever|cough|headache|nausea|dizzy|tired|fatigue|symptom|feeling/i.test(content)) {
    intents.push({ type: 'symptom_report', confidence: 0.78, details: ['Patient reporting symptoms'] });
  }

  return intents;
};

const getPatientContext = (_patientId: string): PatientContext => {
  return {
    recentVisits: [
      { date: 'Oct 15, 2024', reason: 'Diabetes Follow-up', provider: 'Dr. Reed' },
      { date: 'Jul 22, 2024', reason: 'Annual Physical', provider: 'Dr. Reed' },
    ],
    activeProblems: ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia'],
    recentLabs: [
      { id: '1', testName: 'HbA1c', value: '7.2', unit: '%', referenceRange: '< 5.7%', status: 'high', date: 'Oct 15, 2024', trend: 'down', previousValue: '7.8' },
      { id: '2', testName: 'Fasting Glucose', value: '142', unit: 'mg/dL', referenceRange: '70-100', status: 'high', date: 'Oct 15, 2024', trend: 'stable', previousValue: '145' },
      { id: '3', testName: 'Total Cholesterol', value: '198', unit: 'mg/dL', referenceRange: '< 200', status: 'normal', date: 'Oct 15, 2024', trend: 'down', previousValue: '215' },
      { id: '4', testName: 'LDL', value: '118', unit: 'mg/dL', referenceRange: '< 100', status: 'high', date: 'Oct 15, 2024', trend: 'up', previousValue: '105' },
      { id: '5', testName: 'Creatinine', value: '1.1', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'normal', date: 'Oct 15, 2024', trend: 'stable', previousValue: '1.0' },
    ],
    dueLabs: ['HbA1c (due Jan 2025)', 'Lipid Panel (due Apr 2025)'],
    medications: [
      { name: 'Metformin 1000mg', dose: 'BID', lastRefill: 'Nov 1, 2024' },
      { name: 'Lisinopril 20mg', dose: 'Daily', lastRefill: 'Oct 15, 2024' },
      { name: 'Atorvastatin 40mg', dose: 'QHS', lastRefill: 'Oct 15, 2024' },
    ],
  };
};

// Sub-Components
const IntentBadge: React.FC<{ intent: DetectedIntent }> = ({ intent }) => {
  const config: Record<string, { icon: any; color: string; label: string }> = {
    lab_request: { icon: Beaker, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Lab Request' },
    refill_request: { icon: Pill, color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Refill Request' },
    appointment_request: { icon: Calendar, color: 'bg-green-100 text-green-700 border-green-200', label: 'Appointment' },
    symptom_report: { icon: Activity, color: 'bg-red-100 text-red-700 border-red-200', label: 'Symptoms' },
    question: { icon: FileText, color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Question' },
    followup: { icon: ClipboardList, color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Follow-up' },
  };

  const { icon: Icon, color, label } = config[intent.type] || config.followup;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
      <span className="opacity-60">({Math.round(intent.confidence * 100)}%)</span>
    </span>
  );
};

const LabResultsTable: React.FC<{ results: LabResult[]; title: string }> = ({ results, title }) => {
  const [expanded, setExpanded] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-900">{title}</span>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
            {results.length} results
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Test</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Result</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Reference</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Trend</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{result.testName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(result.status)}`}>
                      {result.value} {result.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{result.referenceRange}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(result.trend)}
                      {result.previousValue && (
                        <span className="text-xs text-gray-400">from {result.previousValue}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{result.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const PatientContextPanel: React.FC<{ context: PatientContext; expanded: boolean; onToggle: () => void }> = ({
  context, expanded, onToggle,
}) => {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">Patient Context</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Problems</h4>
            <div className="flex flex-wrap gap-2">
              {context.activeProblems.map((problem, i) => (
                <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">{problem}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Medications</h4>
            <div className="space-y-1">
              {context.medications.map((med, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{med.name} - {med.dose}</span>
                  <span className="text-xs text-slate-400">Refilled: {med.lastRefill}</span>
                </div>
              ))}
            </div>
          </div>

          {context.dueLabs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Labs Due</h4>
              <div className="flex flex-wrap gap-2">
                {context.dueLabs.map((lab, i) => (
                  <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />{lab}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Component
export const EnhancedConversationView: React.FC<EnhancedConversationViewProps> = ({ message }) => {
  const [intents, setIntents] = useState<DetectedIntent[]>([]);
  const [context, setContext] = useState<PatientContext | null>(null);
  const [showContext, setShowContext] = useState(true);

  useEffect(() => {
    const detectedIntents = analyzeMessageIntent(message.content);
    setIntents(detectedIntents);
    const patientContext = getPatientContext(message.patientDetails.id);
    setContext(patientContext);
  }, [message]);

  const isLabRequest = intents.some(i => i.type === 'lab_request');

  const getMessageIcon = () => {
    switch (message.type) {
      case 'lab': return <Beaker className="w-5 h-5 text-blue-600" />;
      case 'phone': return <Phone className="w-5 h-5 text-green-600" />;
      case 'refill': return <Pill className="w-5 h-5 text-purple-600" />;
      default: return <Mail className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Patient Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {message.patientDetails.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="font-semibold text-lg text-gray-900">{message.patientDetails.name}</h2>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{message.patientDetails.age}</span>
                <span>•</span>
                <span>MRN: {message.patientDetails.mrn}</span>
                <span>•</span>
                <span>Last visit: {message.patientDetails.lastVisit}</span>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <ExternalLink className="w-4 h-4" />
            Open Chart
          </button>
        </div>

        {message.patientDetails.allergies.length > 0 && message.patientDetails.allergies[0] !== 'None' && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">Allergies:</span>
            <span className="text-sm text-red-600">{message.patientDetails.allergies.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* AI Detected Intents */}
        {intents.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-800">AI Analysis</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {intents.map((intent, i) => (
                <IntentBadge key={i} intent={intent} />
              ))}
            </div>
            {isLabRequest && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-purple-100">
                <p className="text-sm text-purple-700">
                  <strong>Detected lab request:</strong> {intents.find(i => i.type === 'lab_request')?.details.join(', ')}
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  Previous results shown below for context.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Patient Context Panel */}
        {context && (
          <PatientContextPanel
            context={context}
            expanded={showContext}
            onToggle={() => setShowContext(!showContext)}
          />
        )}

        {/* Previous Lab Results */}
        {isLabRequest && context && context.recentLabs.length > 0 && (
          <LabResultsTable results={context.recentLabs} title="Previous Lab Results" />
        )}

        {/* Message Content */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getMessageIcon()}
              <span className="font-medium text-gray-900">{message.subject}</span>
            </div>
            <span className="text-sm text-gray-500">
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="p-4">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedConversationView;
