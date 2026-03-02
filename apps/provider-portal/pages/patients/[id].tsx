// =============================================================================
// ATTENDING AI - Patient Chart Page
// apps/provider-portal/pages/patients/[id].tsx
//
// Comprehensive patient chart with HPI, vitals, chief complaint, AI recommendations
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplets,
  Scale,
  AlertTriangle,
  Brain,
  Stethoscope,
  Pill,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
  MessageSquare,
  Calendar,
  FlaskConical,
  ImageIcon,
  ClipboardList,
  Send,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// Theme Constants
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
  mrn: string;
  chiefComplaint: string;
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  submittedAt: string;
  hpi: {
    onset: string;
    location: string;
    duration: string;
    character: string;
    severity: number;
    timing: string;
    aggravating: string[];
    relieving: string[];
    associated: string[];
  };
  vitals: {
    bp: string;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    weight: number;
    height: string;
    bmi: number;
    painLevel: number;
  };
  redFlags: string[];
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
  aiRecommendations: {
    differentialDiagnosis: Array<{ name: string; probability: number; reasoning: string }>;
    suggestedLabs: string[];
    suggestedImaging: string[];
    suggestedMedications: string[];
    clinicalPearls: string[];
    urgentActions: string[];
  };
}

// =============================================================================
// Mock Patient Data (Replace with API call)
// =============================================================================

const getMockPatient = (id: string): PatientData => ({
  id,
  name: 'Margaret White',
  age: 72,
  gender: 'Female',
  dob: '04/15/1952',
  mrn: 'MRN-020',
  chiefComplaint: 'Shortness of breath',
  urgencyLevel: 'high',
  submittedAt: new Date().toISOString(),
  hpi: {
    onset: '3 days ago, gradual',
    location: 'Bilateral chest',
    duration: 'Constant, worsening',
    character: 'Difficulty taking deep breaths, feels like "can\'t get enough air"',
    severity: 7,
    timing: 'Worse with exertion, lying flat; better when sitting up',
    aggravating: ['Walking', 'Climbing stairs', 'Lying flat', 'Physical activity'],
    relieving: ['Rest', 'Sitting upright', 'Propping up with pillows'],
    associated: ['Bilateral ankle swelling', 'Fatigue', 'Decreased exercise tolerance', 'Mild cough'],
  },
  vitals: {
    bp: '156/92',
    hr: 88,
    rr: 22,
    temp: 98.4,
    spo2: 94,
    weight: 185,
    height: '5\'4"',
    bmi: 31.8,
    painLevel: 3,
  },
  redFlags: ['Acute dyspnea', 'Orthopnea', 'Lower extremity edema', 'Elevated BP'],
  allergies: ['Penicillin', 'Sulfa drugs'],
  medications: ['Lisinopril 20mg daily', 'Metoprolol 50mg BID', 'Furosemide 40mg daily', 'Atorvastatin 40mg QHS'],
  medicalHistory: ['CHF (EF 40%)', 'Hypertension', 'Type 2 Diabetes', 'Hyperlipidemia', 'Obesity'],
  aiRecommendations: {
    differentialDiagnosis: [
      { name: 'Acute CHF Exacerbation', probability: 0.78, reasoning: 'History of CHF, orthopnea, bilateral edema, elevated BP' },
      { name: 'Pneumonia', probability: 0.12, reasoning: 'Cough present, though no fever reported' },
      { name: 'Pulmonary Embolism', probability: 0.06, reasoning: 'Acute dyspnea, though less likely given bilateral edema' },
      { name: 'COPD Exacerbation', probability: 0.04, reasoning: 'No prior COPD diagnosis, minimal smoking history' },
    ],
    suggestedLabs: ['BNP/NT-proBNP', 'BMP (renal function, electrolytes)', 'CBC', 'Troponin', 'TSH'],
    suggestedImaging: ['Chest X-Ray (PA and Lateral)', 'Echocardiogram'],
    suggestedMedications: ['Consider IV furosemide if severe', 'Continue home medications', 'O2 supplementation PRN'],
    clinicalPearls: [
      'BNP >400 pg/mL strongly suggests acute CHF',
      'Check daily weights - target 1-2 lb loss/day with diuresis',
      'Consider cardiology consult if not improving with initial management',
    ],
    urgentActions: [
      'Check oxygen saturation continuously',
      'Obtain STAT BNP and chest X-ray',
      'Prepare for possible admission if hypoxic',
    ],
  },
});

// =============================================================================
// Components
// =============================================================================

const VitalCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
}> = ({ icon, label, value, unit, status = 'normal' }) => {
  const statusColors = {
    normal: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    critical: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${statusColors[status]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-bold">
        {value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
};

const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'ai';
}> = ({ title, icon, children, variant = 'default' }) => {
  const variants = {
    default: 'bg-white',
    warning: 'bg-red-50 border-red-200',
    ai: 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200',
  };

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${variants[variant]}`}>
      <div className="px-6 py-4 border-b bg-white/50 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
          {icon}
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function PatientChartPage() {
  const router = useRouter();
  const { id } = router.query;
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // TODO: Replace with actual API call
      setTimeout(() => {
        setPatient(getMockPatient(id as string));
        setLoading(false);
      }, 300);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading patient chart...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
          <p>Patient not found</p>
          <Link href="/inbox" className="text-teal-200 hover:text-white underline mt-4 inline-block">
            Return to Inbox
          </Link>
        </div>
      </div>
    );
  }

  const urgencyColors = {
    standard: 'bg-green-500',
    moderate: 'bg-yellow-500',
    high: 'bg-orange-500',
    emergency: 'bg-red-500',
  };

  return (
    <>
      <Head>
        <title>{patient.name} - Patient Chart | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen" style={{ background: theme.gradient }}>
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/inbox"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${urgencyColors[patient.urgencyLevel]}`}>
                      {patient.urgencyLevel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-teal-200 text-sm">
                    {patient.age}yo {patient.gender} • MRN: {patient.mrn} • DOB: {patient.dob}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
                <button className="px-4 py-2 bg-white text-teal-700 rounded-lg font-medium flex items-center gap-2 hover:bg-teal-50 transition-colors">
                  <CheckCircle className="w-4 h-4" />
                  Complete Visit
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Chief Complaint Banner */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-teal-600 mb-1">CHIEF COMPLAINT</p>
                <h2 className="text-2xl font-bold text-gray-900">{patient.chiefComplaint}</h2>
                <p className="text-gray-500 mt-1">
                  Assessment submitted {new Date(patient.submittedAt).toLocaleString()}
                </p>
              </div>
              {patient.redFlags.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-700">{patient.redFlags.length} Red Flags</span>
                </div>
              )}
            </div>
          </div>

          {/* Red Flags Alert */}
          {patient.redFlags.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-red-800">Critical Red Flags Detected</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {patient.redFlags.map((flag, i) => (
                  <span key={i} className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-medium text-sm">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - HPI & Vitals */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vitals Grid */}
              <SectionCard title="Vital Signs" icon={<Activity className="w-5 h-5" />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <VitalCard
                    icon={<Heart className="w-5 h-5" />}
                    label="Blood Pressure"
                    value={patient.vitals.bp}
                    status={parseInt(patient.vitals.bp.split('/')[0]) > 140 ? 'warning' : 'normal'}
                  />
                  <VitalCard
                    icon={<Activity className="w-5 h-5" />}
                    label="Heart Rate"
                    value={patient.vitals.hr}
                    unit="bpm"
                    status={patient.vitals.hr > 100 ? 'warning' : 'normal'}
                  />
                  <VitalCard
                    icon={<Wind className="w-5 h-5" />}
                    label="Resp Rate"
                    value={patient.vitals.rr}
                    unit="/min"
                    status={patient.vitals.rr > 20 ? 'warning' : 'normal'}
                  />
                  <VitalCard
                    icon={<Droplets className="w-5 h-5" />}
                    label="SpO2"
                    value={patient.vitals.spo2}
                    unit="%"
                    status={patient.vitals.spo2 < 95 ? 'warning' : 'normal'}
                  />
                  <VitalCard
                    icon={<Thermometer className="w-5 h-5" />}
                    label="Temperature"
                    value={patient.vitals.temp}
                    unit="°F"
                  />
                  <VitalCard
                    icon={<Scale className="w-5 h-5" />}
                    label="Weight"
                    value={patient.vitals.weight}
                    unit="lbs"
                  />
                  <VitalCard
                    icon={<User className="w-5 h-5" />}
                    label="BMI"
                    value={patient.vitals.bmi.toFixed(1)}
                    status={patient.vitals.bmi > 30 ? 'warning' : 'normal'}
                  />
                  <VitalCard
                    icon={<AlertTriangle className="w-5 h-5" />}
                    label="Pain Level"
                    value={`${patient.vitals.painLevel}/10`}
                    status={patient.vitals.painLevel >= 7 ? 'critical' : patient.vitals.painLevel >= 4 ? 'warning' : 'normal'}
                  />
                </div>
              </SectionCard>

              {/* HPI Summary */}
              <SectionCard title="History of Present Illness" icon={<ClipboardList className="w-5 h-5" />}>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-teal-50 rounded-xl">
                      <p className="text-xs font-semibold text-teal-600 uppercase mb-1">Onset</p>
                      <p className="text-gray-900 font-medium">{patient.hpi.onset}</p>
                    </div>
                    <div className="p-4 bg-teal-50 rounded-xl">
                      <p className="text-xs font-semibold text-teal-600 uppercase mb-1">Location</p>
                      <p className="text-gray-900 font-medium">{patient.hpi.location}</p>
                    </div>
                    <div className="p-4 bg-teal-50 rounded-xl">
                      <p className="text-xs font-semibold text-teal-600 uppercase mb-1">Duration</p>
                      <p className="text-gray-900 font-medium">{patient.hpi.duration}</p>
                    </div>
                    <div className="p-4 bg-teal-50 rounded-xl">
                      <p className="text-xs font-semibold text-teal-600 uppercase mb-1">Severity</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${patient.hpi.severity >= 7 ? 'bg-red-500' : patient.hpi.severity >= 4 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${patient.hpi.severity * 10}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-900">{patient.hpi.severity}/10</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Character/Quality</p>
                    <p className="text-gray-900">{patient.hpi.character}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Timing</p>
                    <p className="text-gray-900">{patient.hpi.timing}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-red-50 rounded-xl">
                      <p className="text-xs font-semibold text-red-600 uppercase mb-2">Aggravating Factors</p>
                      <ul className="space-y-1">
                        {patient.hpi.aggravating.map((f, i) => (
                          <li key={i} className="text-red-800 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl">
                      <p className="text-xs font-semibold text-green-600 uppercase mb-2">Relieving Factors</p>
                      <ul className="space-y-1">
                        {patient.hpi.relieving.map((f, i) => (
                          <li key={i} className="text-green-800 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <p className="text-xs font-semibold text-amber-600 uppercase mb-2">Associated Symptoms</p>
                      <ul className="space-y-1">
                        {patient.hpi.associated.map((s, i) => (
                          <li key={i} className="text-amber-800 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Medical History */}
              <SectionCard title="Medical History & Medications" icon={<FileText className="w-5 h-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-3">Medical History</p>
                    <ul className="space-y-2">
                      {patient.medicalHistory.map((h, i) => (
                        <li key={i} className="text-gray-800 text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-3">Current Medications</p>
                    <ul className="space-y-2">
                      {patient.medications.map((m, i) => (
                        <li key={i} className="text-gray-800 text-sm flex items-center gap-2">
                          <Pill className="w-4 h-4 text-teal-400" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-3">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((a, i) => (
                        <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Right Column - AI Recommendations */}
            <div className="space-y-6">
              {/* AI Differential Diagnosis */}
              <SectionCard 
                title="AI Clinical Decision Support" 
                icon={<Brain className="w-5 h-5" />}
                variant="ai"
              >
                <div className="space-y-6">
                  {/* Urgent Actions */}
                  {patient.aiRecommendations.urgentActions.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Urgent Actions
                      </p>
                      <ul className="space-y-2">
                        {patient.aiRecommendations.urgentActions.map((a, i) => (
                          <li key={i} className="text-red-700 text-sm flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Differential Diagnosis */}
                  <div>
                    <p className="text-sm font-bold text-teal-800 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Differential Diagnosis
                    </p>
                    <div className="space-y-3">
                      {patient.aiRecommendations.differentialDiagnosis.map((dx, i) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-teal-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900 text-sm">{dx.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              dx.probability > 0.5 ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {Math.round(dx.probability * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{dx.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Labs */}
                  <div>
                    <p className="text-sm font-bold text-teal-800 mb-2 flex items-center gap-2">
                      <FlaskConical className="w-4 h-4" />
                      Suggested Labs
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {patient.aiRecommendations.suggestedLabs.map((lab, i) => (
                        <button key={i} className="px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-lg text-sm hover:bg-teal-50 transition-colors">
                          + {lab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Imaging */}
                  <div>
                    <p className="text-sm font-bold text-teal-800 mb-2 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Suggested Imaging
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {patient.aiRecommendations.suggestedImaging.map((img, i) => (
                        <button key={i} className="px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-lg text-sm hover:bg-teal-50 transition-colors">
                          + {img}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Pearls */}
                  <div className="p-4 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl">
                    <p className="text-sm font-bold text-teal-800 mb-3 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Clinical Pearls
                    </p>
                    <ul className="space-y-2">
                      {patient.aiRecommendations.clinicalPearls.map((pearl, i) => (
                        <li key={i} className="text-teal-900 text-sm flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-1.5 flex-shrink-0"></span>
                          {pearl}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </SectionCard>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href={`/labs?patient=${patient.id}`}
                    className="w-full flex items-center justify-between p-3 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <FlaskConical className="w-5 h-5 text-teal-600" />
                      <span className="font-medium text-gray-900">Order Labs</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                  <Link
                    href={`/imaging?patient=${patient.id}`}
                    className="w-full flex items-center justify-between p-3 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-teal-600" />
                      <span className="font-medium text-gray-900">Order Imaging</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                  <Link
                    href={`/medications?patient=${patient.id}`}
                    className="w-full flex items-center justify-between p-3 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Pill className="w-5 h-5 text-teal-600" />
                      <span className="font-medium text-gray-900">Prescribe Medication</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                  <Link
                    href={`/referrals?patient=${patient.id}`}
                    className="w-full flex items-center justify-between p-3 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Send className="w-5 h-5 text-teal-600" />
                      <span className="font-medium text-gray-900">Create Referral</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
