// ============================================================
// ATTENDING AI — Patient App Home
// apps/patient-portal/pages/home.tsx
//
// Main patient home screen with:
// - Greeting header with notifications
// - Quick actions (Start Assessment, Emergency, Appointments)
// - Upcoming appointments
// - Recent activity feed
// - Health snapshot cards
// ============================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Bell,
  ChevronRight,
  MessageSquare,
  Calendar,
  Activity,
  FileText,
  Shield,
  Clock,
  Pill,
  Beaker,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Loader2,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { usePatientData } from '../hooks/usePatientData';
import { useNotifications } from '../hooks/useNotifications';

// ============================================================
// Types
// ============================================================

interface Appointment {
  id: string;
  provider: string;
  specialty: string;
  date: string;
  time: string;
  type: 'in-person' | 'telehealth';
}

interface ActivityItem {
  id: string;
  type: 'assessment' | 'lab' | 'message' | 'prescription' | 'appointment';
  title: string;
  subtitle: string;
  timestamp: string;
  status?: 'completed' | 'pending' | 'new';
}

// ============================================================
// Quick Action Card
// ============================================================

function QuickAction({
  href,
  icon: Icon,
  label,
  sublabel,
  color,
  iconBg,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  iconBg: string;
}) {
  return (
    <Link href={href} className="card-attending-interactive p-4 flex flex-col gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
      </div>
      <div>
        <p className="font-semibold text-sm text-attending-deep-navy">{label}</p>
        <p className="text-xs text-attending-200 mt-0.5">{sublabel}</p>
      </div>
    </Link>
  );
}

// ============================================================
// Appointment Card
// ============================================================

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const dateObj = new Date(appointment.date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

  return (
    <div className="card-attending p-4 flex items-center gap-4">
      {/* Date block */}
      <div className="w-14 h-14 rounded-xl bg-attending-50 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-semibold text-attending-primary uppercase">{dayName}</span>
        <span className="text-lg font-bold text-attending-deep-navy leading-tight">{dayNum}</span>
        <span className="text-[10px] text-attending-200">{month}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-attending-deep-navy truncate">
          {appointment.provider}
        </p>
        <p className="text-xs text-attending-200 mt-0.5">{appointment.specialty}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Clock className="w-3 h-3 text-attending-primary" />
          <span className="text-xs text-attending-primary font-medium">{appointment.time}</span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              appointment.type === 'telehealth'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-attending-50 text-attending-primary'
            }`}
          >
            {appointment.type === 'telehealth' ? 'Video' : 'In-Person'}
          </span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-attending-200 flex-shrink-0" />
    </div>
  );
}

// ============================================================
// Activity Item
// ============================================================

function ActivityRow({ item }: { item: ActivityItem }) {
  const iconMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    assessment: { icon: Stethoscope, bg: 'bg-attending-50', color: 'text-attending-primary' },
    lab: { icon: Beaker, bg: 'bg-purple-50', color: 'text-purple-600' },
    message: { icon: MessageSquare, bg: 'bg-blue-50', color: 'text-blue-600' },
    prescription: { icon: Pill, bg: 'bg-green-50', color: 'text-green-600' },
    appointment: { icon: Calendar, bg: 'bg-orange-50', color: 'text-orange-600' },
  };

  const statusIcon: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    pending: <Clock className="w-4 h-4 text-attending-gold" />,
    new: <AlertCircle className="w-4 h-4 text-attending-coral" />,
  };

  const { icon: Icon, bg, color } = iconMap[item.type] || iconMap.assessment;

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-attending-deep-navy truncate">{item.title}</p>
        <p className="text-xs text-attending-200 truncate">{item.subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] text-attending-200">{item.timestamp}</span>
        {item.status && statusIcon[item.status]}
      </div>
    </div>
  );
}

// ============================================================
// Health Snapshot Card
// ============================================================

function HealthSnap({
  icon: Icon,
  label,
  value,
  unit,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'alert';
}) {
  const statusColors = {
    normal: 'text-green-600',
    warning: 'text-attending-gold',
    alert: 'text-red-500',
  };

  return (
    <div className="card-attending p-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${statusColors[status]}`} />
      <p className="text-lg font-bold text-attending-deep-navy">
        {value}
        <span className="text-xs font-normal text-attending-200 ml-0.5">{unit}</span>
      </p>
      <p className="text-[10px] text-attending-200 mt-0.5">{label}</p>
    </div>
  );
}

// ============================================================
// Main Home Page
// ============================================================

export default function PatientHome() {
  const [patientName, setPatientName] = useState('');

  // ── Live data from API ──
  const { vitals, appointments, labs, medications, loading: healthLoading } = usePatientData({ autoRefreshMs: 60000 });
  const { unreadCount, notifications } = useNotifications({ pollIntervalMs: 30000 });

  useEffect(() => {
    const name = localStorage.getItem('attending-patient-name') || 'Patient';
    setPatientName(name);
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Map API appointments → component shape
  const upcomingAppointments: Appointment[] = (appointments ?? []).slice(0, 3).map((a) => ({
    id: a.id,
    provider: a.provider,
    specialty: a.specialty,
    date: a.date,
    time: a.time,
    type: a.type?.toLowerCase().includes('tele') ? 'telehealth' : 'in-person',
  }));

  // Map recent notifications → activity feed
  const typeMap: Record<string, ActivityItem['type']> = {
    'lab-result': 'lab',
    message: 'message',
    appointment: 'appointment',
    prescription: 'prescription',
    assessment: 'assessment',
  };

  const recentActivity: ActivityItem[] = (notifications ?? []).slice(0, 5).map((n) => {
    const ago = formatTimeAgo(n.timestamp);
    return {
      id: n.id,
      type: typeMap[n.type] ?? 'assessment',
      title: n.title,
      subtitle: n.body,
      timestamp: ago,
      status: n.read ? 'completed' : 'new',
    };
  });

  // Fallback when API hasn't returned yet
  if (upcomingAppointments.length === 0 && !healthLoading) {
    upcomingAppointments.push(
      { id: '1', provider: 'Dr. Sarah Chen', specialty: 'Primary Care', date: new Date(Date.now() + 86400000 * 3).toISOString(), time: '9:30 AM', type: 'in-person' },
      { id: '2', provider: 'Dr. Michael Ruiz', specialty: 'Cardiology', date: new Date(Date.now() + 86400000 * 8).toISOString(), time: '2:00 PM', type: 'telehealth' },
    );
  }
  if (recentActivity.length === 0 && !healthLoading) {
    recentActivity.push(
      { id: '1', type: 'lab', title: 'Lab Results Available', subtitle: 'Complete Blood Count (CBC)', timestamp: '2h ago', status: 'new' },
      { id: '2', type: 'assessment', title: 'Assessment Reviewed', subtitle: 'Dr. Chen reviewed your headache assessment', timestamp: 'Yesterday', status: 'completed' },
      { id: '3', type: 'prescription', title: 'Prescription Renewed', subtitle: 'Lisinopril 10mg — 90 day supply', timestamp: '2 days ago', status: 'completed' },
      { id: '4', type: 'message', title: 'New Message', subtitle: 'From Dr. Chen\'s office', timestamp: '3 days ago', status: 'pending' },
    );
  }

  return (
    <>
      <Head>
        <title>Home | ATTENDING AI</title>
      </Head>

      <AppShell
        header={
          <header className="bg-attending-gradient text-white safe-area-top">
            <div className="max-w-lg mx-auto px-5 pt-6 pb-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-attending-100 text-sm">{greeting()},</p>
                  <h1 className="text-xl font-bold mt-0.5">{patientName}</h1>
                </div>
                <Link href="/notifications" className="relative p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-attending-coral text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Start Assessment CTA */}
              <Link href="/compass" className="block">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-4 hover:bg-white/15 transition-colors border border-white/10">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Start Health Assessment</p>
                    <p className="text-sm text-white/70 mt-0.5">
                      COMPASS will guide you through your symptoms
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/50" />
                </div>
              </Link>
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto px-5 -mt-2 space-y-6 pb-4">
          {/* Quick Actions Grid */}
          <section className="grid grid-cols-3 gap-3">
            <QuickAction
              href="/compass"
              icon={FileText}
              label="Assessment"
              sublabel="New check"
              color="text-attending-primary"
              iconBg="bg-attending-50"
            />
            <QuickAction
              href="/emergency"
              icon={Shield}
              label="Emergency"
              sublabel="Medical ID"
              color="text-red-600"
              iconBg="bg-red-50"
            />
            <QuickAction
              href="/health/appointments"
              icon={Calendar}
              label="Book"
              sublabel="Appointment"
              color="text-attending-gold"
              iconBg="bg-amber-50"
            />
          </section>

          {/* Health Snapshot */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-attending-deep-navy">Health Snapshot</h2>
              <Link href="/health" className="text-xs text-attending-primary font-medium">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <HealthSnap
                icon={Activity}
                label="Blood Pressure"
                value={vitals ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}` : '---'}
                unit="mmHg"
                status={vitals && vitals.bloodPressureSystolic > 130 ? 'warning' : 'normal'}
              />
              <HealthSnap
                icon={Activity}
                label="Heart Rate"
                value={vitals ? String(vitals.heartRate) : '---'}
                unit="bpm"
                status={vitals && (vitals.heartRate > 100 || vitals.heartRate < 50) ? 'warning' : 'normal'}
              />
              {(() => {
                const a1c = labs?.find((l) => l.testName?.toLowerCase().includes('a1c'));
                return (
                  <HealthSnap
                    icon={Beaker}
                    label="A1C"
                    value={a1c ? a1c.value : '---'}
                    unit="%"
                    status={a1c && parseFloat(a1c.value) > 5.6 ? 'warning' : 'normal'}
                  />
                );
              })()}
            </div>
          </section>

          {/* Upcoming Appointments */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-attending-deep-navy">Upcoming</h2>
              <Link href="/health/appointments" className="text-xs text-attending-primary font-medium">
                See All
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingAppointments.map((appt) => (
                <AppointmentCard key={appt.id} appointment={appt} />
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-attending-deep-navy">Recent Activity</h2>
            </div>
            <div className="card-attending px-4 divide-y divide-attending-50">
              {recentActivity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    </>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
