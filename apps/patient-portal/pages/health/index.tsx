// ============================================================
// ATTENDING AI — Patient Health Tab
// apps/patient-portal/pages/health/index.tsx
//
// Unified health view with segmented sections:
// - Summary (vitals, conditions, allergies)
// - Labs & Results
// - Medications
// - Appointments
// ============================================================

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Activity,
  Beaker,
  Pill,
  Calendar,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Clock,
  CheckCircle2,
  Heart,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';

// ============================================================
// Types
// ============================================================

type HealthSection = 'summary' | 'labs' | 'medications' | 'appointments';

interface LabResult {
  id: string;
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  date: string;
  trend?: 'up' | 'down' | 'stable';
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescriber: string;
  refillDate: string;
  pillsRemaining: number;
}

interface Condition {
  name: string;
  since: string;
  status: 'active' | 'resolved' | 'monitoring';
}

interface Allergy {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
}

// ============================================================
// Segment Control
// ============================================================

function SegmentControl({
  active,
  onChange,
}: {
  active: HealthSection;
  onChange: (s: HealthSection) => void;
}) {
  const segments: { key: HealthSection; label: string; icon: React.ElementType }[] = [
    { key: 'summary', label: 'Summary', icon: Heart },
    { key: 'labs', label: 'Labs', icon: Beaker },
    { key: 'medications', label: 'Meds', icon: Pill },
    { key: 'appointments', label: 'Visits', icon: Calendar },
  ];

  return (
    <div className="flex bg-attending-50 rounded-xl p-1 gap-1">
      {segments.map((seg) => {
        const isActive = active === seg.key;
        const Icon = seg.icon;
        return (
          <button
            key={seg.key}
            onClick={() => onChange(seg.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-white text-attending-primary shadow-sm'
                : 'text-attending-200 hover:text-attending-deep-navy'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Summary Section
// ============================================================

function SummarySection() {
  const conditions: Condition[] = [
    { name: 'Hypertension', since: '2023', status: 'active' },
    { name: 'Pre-diabetes', since: '2024', status: 'monitoring' },
    { name: 'Seasonal Allergies', since: '2018', status: 'active' },
  ];

  const allergies: Allergy[] = [
    { name: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis' },
    { name: 'Sulfa drugs', severity: 'moderate', reaction: 'Rash' },
    { name: 'Latex', severity: 'mild', reaction: 'Skin irritation' },
  ];

  const severityColors = {
    mild: 'bg-yellow-50 text-yellow-700',
    moderate: 'bg-orange-50 text-orange-700',
    severe: 'bg-red-50 text-red-700',
  };

  const statusColors = {
    active: 'bg-attending-50 text-attending-primary',
    resolved: 'bg-green-50 text-green-700',
    monitoring: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Vitals Overview */}
      <section>
        <h3 className="text-sm font-semibold text-attending-deep-navy mb-3">Latest Vitals</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Blood Pressure', value: '128/82', unit: 'mmHg', icon: Activity, status: 'warning' as const },
            { label: 'Heart Rate', value: '72', unit: 'bpm', icon: Activity, status: 'normal' as const },
            { label: 'Weight', value: '185', unit: 'lbs', icon: TrendingDown, status: 'normal' as const },
            { label: 'Temperature', value: '98.6', unit: '°F', icon: Minus, status: 'normal' as const },
          ].map((vital) => (
            <div key={vital.label} className="card-attending p-3">
              <div className="flex items-center gap-2 mb-1">
                <vital.icon
                  className={`w-3.5 h-3.5 ${
                    vital.status === 'warning' ? 'text-attending-gold' : 'text-green-500'
                  }`}
                />
                <span className="text-[10px] text-attending-200 font-medium">{vital.label}</span>
              </div>
              <p className="text-lg font-bold text-attending-deep-navy">
                {vital.value}
                <span className="text-xs font-normal text-attending-200 ml-1">{vital.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Active Conditions */}
      <section>
        <h3 className="text-sm font-semibold text-attending-deep-navy mb-3">Conditions</h3>
        <div className="card-attending divide-y divide-attending-50">
          {conditions.map((c) => (
            <div key={c.name} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-attending-deep-navy">{c.name}</p>
                <p className="text-xs text-attending-200">Since {c.since}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${statusColors[c.status]}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Allergies */}
      <section>
        <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-attending-coral" />
          Allergies
        </h3>
        <div className="card-attending divide-y divide-attending-50">
          {allergies.map((a) => (
            <div key={a.name} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-attending-deep-navy">{a.name}</p>
                <p className="text-xs text-attending-200">{a.reaction}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${severityColors[a.severity]}`}>
                {a.severity}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Labs Section
// ============================================================

function LabsSection() {
  const results: LabResult[] = [
    { id: '1', name: 'Hemoglobin A1C', value: '5.8', unit: '%', referenceRange: '4.0-5.6', status: 'high', date: '2 days ago', trend: 'down' },
    { id: '2', name: 'Total Cholesterol', value: '195', unit: 'mg/dL', referenceRange: '<200', status: 'normal', date: '2 days ago', trend: 'stable' },
    { id: '3', name: 'TSH', value: '2.1', unit: 'mIU/L', referenceRange: '0.4-4.0', status: 'normal', date: '2 days ago', trend: 'stable' },
    { id: '4', name: 'Glucose (fasting)', value: '110', unit: 'mg/dL', referenceRange: '70-99', status: 'high', date: '2 days ago', trend: 'up' },
    { id: '5', name: 'WBC', value: '7.2', unit: 'K/uL', referenceRange: '4.5-11.0', status: 'normal', date: '1 week ago' },
    { id: '6', name: 'Creatinine', value: '1.0', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'normal', date: '1 week ago' },
  ];

  const statusStyles = {
    normal: { bg: 'bg-green-50', text: 'text-green-700', label: 'Normal' },
    high: { bg: 'bg-red-50', text: 'text-red-700', label: 'High' },
    low: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Low' },
    critical: { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' },
  };

  const TrendIcon = ({ trend }: { trend?: string }) => {
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-green-500" />;
    return <Minus className="w-3.5 h-3.5 text-attending-200" />;
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <p className="text-xs text-attending-200">Most recent results</p>
        <Link href="/health/labs/history" className="text-xs text-attending-primary font-medium">
          Full History
        </Link>
      </div>

      <div className="card-attending divide-y divide-attending-50">
        {results.map((lab) => {
          const style = statusStyles[lab.status];
          return (
            <div key={lab.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-attending-deep-navy truncate">{lab.name}</p>
                <p className="text-xs text-attending-200 mt-0.5">
                  Ref: {lab.referenceRange} · {lab.date}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {lab.trend && <TrendIcon trend={lab.trend} />}
                <span className="text-sm font-bold text-attending-deep-navy">
                  {lab.value}
                  <span className="text-xs font-normal text-attending-200 ml-0.5">{lab.unit}</span>
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Medications Section
// ============================================================

function MedicationsSection() {
  const meds: Medication[] = [
    { id: '1', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', prescriber: 'Dr. Chen', refillDate: '2026-03-15', pillsRemaining: 22 },
    { id: '2', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', prescriber: 'Dr. Chen', refillDate: '2026-03-10', pillsRemaining: 14 },
    { id: '3', name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', prescriber: 'Dr. Ruiz', refillDate: '2026-04-01', pillsRemaining: 45 },
  ];

  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-xs text-attending-200">{meds.length} active medications</p>

      <div className="space-y-3">
        {meds.map((med) => {
          const lowSupply = med.pillsRemaining < 15;
          return (
            <div key={med.id} className="card-attending p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm text-attending-deep-navy">{med.name}</p>
                  <p className="text-xs text-attending-primary font-medium mt-0.5">
                    {med.dosage} · {med.frequency}
                  </p>
                </div>
                <Pill className={`w-5 h-5 flex-shrink-0 ${lowSupply ? 'text-attending-coral' : 'text-attending-200'}`} />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-attending-50">
                <span className="text-xs text-attending-200">
                  Prescribed by {med.prescriber}
                </span>
                <div className="flex items-center gap-2">
                  {lowSupply && (
                    <span className="text-[10px] font-semibold text-attending-coral bg-red-50 px-2 py-0.5 rounded-full">
                      Low Supply
                    </span>
                  )}
                  <span className="text-xs text-attending-200">{med.pillsRemaining} pills left</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Appointments Section
// ============================================================

function AppointmentsSection() {
  const appointments = [
    {
      id: '1',
      provider: 'Dr. Sarah Chen',
      specialty: 'Primary Care — Annual Physical',
      date: '2026-03-03',
      time: '9:30 AM',
      status: 'confirmed' as const,
    },
    {
      id: '2',
      provider: 'Dr. Michael Ruiz',
      specialty: 'Cardiology — Follow-up',
      date: '2026-03-08',
      time: '2:00 PM',
      status: 'confirmed' as const,
    },
    {
      id: '3',
      provider: 'Quest Diagnostics',
      specialty: 'Lab Work — Lipid Panel',
      date: '2026-03-01',
      time: '7:30 AM',
      status: 'upcoming' as const,
    },
  ];

  const pastVisits = [
    {
      id: 'p1',
      provider: 'Dr. Sarah Chen',
      specialty: 'Primary Care',
      date: '2026-02-14',
      summary: 'Discussed blood pressure management. Adjusted Lisinopril dosage.',
    },
    {
      id: 'p2',
      provider: 'Dr. Michael Ruiz',
      specialty: 'Cardiology',
      date: '2026-01-22',
      summary: 'ECG normal. Continue current medications. Follow up in 6 weeks.',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Upcoming */}
      <section>
        <h3 className="text-sm font-semibold text-attending-deep-navy mb-3">Upcoming</h3>
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="card-attending p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-attending-50 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-attending-primary">
                  {new Date(appt.date).toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-lg font-bold text-attending-deep-navy leading-tight">
                  {new Date(appt.date).getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-attending-deep-navy truncate">{appt.provider}</p>
                <p className="text-xs text-attending-200 mt-0.5">{appt.specialty}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3 text-attending-primary" />
                  <span className="text-xs text-attending-primary font-medium">{appt.time}</span>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Past Visits */}
      <section>
        <h3 className="text-sm font-semibold text-attending-deep-navy mb-3">Past Visits</h3>
        <div className="card-attending divide-y divide-attending-50">
          {pastVisits.map((visit) => (
            <div key={visit.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-attending-deep-navy">{visit.provider}</p>
                <span className="text-xs text-attending-200">
                  {new Date(visit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-attending-200 line-clamp-2">{visit.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Main Health Page
// ============================================================

export default function HealthPage() {
  const [activeSection, setActiveSection] = useState<HealthSection>('summary');

  const sectionMap: Record<HealthSection, React.ReactNode> = {
    summary: <SummarySection />,
    labs: <LabsSection />,
    medications: <MedicationsSection />,
    appointments: <AppointmentsSection />,
  };

  return (
    <>
      <Head>
        <title>Health | ATTENDING AI</title>
      </Head>

      <AppShell
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 pt-5 pb-4">
              <h1 className="text-xl font-bold text-attending-deep-navy mb-4">My Health</h1>
              <SegmentControl active={activeSection} onChange={setActiveSection} />
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto px-5 py-5">
          {sectionMap[activeSection]}
        </div>
      </AppShell>
    </>
  );
}
