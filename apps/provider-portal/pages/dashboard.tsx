// =============================================================================
// ATTENDING AI - Provider Dashboard
// apps/provider-portal/pages/dashboard.tsx
//
// Layout: [Sidebar with work links] | [Main: Schedule + AI Insights]
// The sidebar provides quick access to labs, imaging, referrals, etc.
// The main area shows today's patient schedule with COMPASS AI summaries.
//
// March 2026
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Users,
  MessageSquare,
  Inbox,
  Brain,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  Stethoscope,
  FlaskConical,
  ImageIcon,
  Pill,
  FileText,
  TrendingUp,
  Zap,
  Calendar,
  Phone,
  ArrowRightLeft,
  FileClock,
  ClipboardList,
  Video,
  MapPin,
  PlayCircle,
  User,
  ScanLine,
} from 'lucide-react';
import { ProviderShell } from '@/components/layout/ProviderShell';

// =============================================================================
// Types
// =============================================================================

interface Appointment {
  id: string;
  patientName: string;
  patientAge: number;
  mrn: string;
  time: string;
  endTime: string;
  type: 'new' | 'follow-up' | 'urgent' | 'telehealth' | 'procedure';
  reason: string;
  status: 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'no-show' | 'cancelled';
  room?: string;
  hasRedFlags?: boolean;
  compassSummary?: string;
}

interface SidebarLink {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  urgent?: number;
  color: string;
}

// =============================================================================
// Sidebar work links
// =============================================================================

const WORK_LINKS: SidebarLink[] = [
  { id: 'inbox', label: 'Inbox', href: '/inbox', icon: Inbox, badge: 7, urgent: 1, color: '#14b8a6' },
  { id: 'phone', label: 'Phone Calls', href: '/inbox?filter=phone', icon: Phone, badge: 4, urgent: 0, color: '#3b82f6' },
  { id: 'refills', label: 'Rx Refills', href: '/inbox?filter=refills', icon: Pill, badge: 5, color: '#0F5F76' },
  { id: 'labs', label: 'Lab Results', href: '/labs', icon: FlaskConical, badge: 8, urgent: 1, color: '#f59e0b' },
  { id: 'imaging', label: 'Imaging', href: '/imaging', icon: ScanLine, badge: 3, color: '#06b6d4' },
  { id: 'referrals', label: 'Referrals', href: '/referrals', icon: ArrowRightLeft, badge: 2, color: '#e07a5f' },
  { id: 'charts', label: "CC'd Charts", href: '/inbox?filter=charts', icon: FileText, badge: 4, color: '#1A8FA8' },
  { id: 'incomplete', label: 'Incomplete', href: '/inbox?filter=incomplete', icon: FileClock, badge: 3, urgent: 1, color: '#f97316' },
  { id: 'schedule', label: 'Schedule', href: '/schedule', icon: Calendar, color: '#1A8FA8' },
  { id: 'assessments', label: 'Assessments', href: '/assessments', icon: ClipboardList, badge: 5, color: '#25B8A9' },
  { id: 'copilot', label: 'AI Copilot', href: '/interventions', icon: Zap, color: '#c8a44e' },
];

// =============================================================================
// Mock schedule with COMPASS AI summaries
// =============================================================================

const TODAYS_SCHEDULE: Appointment[] = [
  {
    id: 'apt-1', patientName: 'James Anderson', patientAge: 58, mrn: 'MRN-101',
    time: '08:00 AM', endTime: '08:30 AM', type: 'follow-up', reason: 'Diabetes management',
    status: 'completed', room: 'Exam 1',
    compassSummary: 'A1c improved 7.8% to 7.2%. Continue metformin. Discussed diet modifications. Next A1c in 3 months.',
  },
  {
    id: 'apt-2', patientName: 'Maria Garcia', patientAge: 42, mrn: 'MRN-102',
    time: '08:30 AM', endTime: '09:00 AM', type: 'follow-up', reason: 'Hypertension follow-up',
    status: 'completed', room: 'Exam 2',
    compassSummary: 'BP well-controlled 128/82 on lisinopril 20mg. Continue current regimen. Annual labs ordered.',
  },
  {
    id: 'apt-3', patientName: 'Robert Chen', patientAge: 35, mrn: 'MRN-103',
    time: '09:00 AM', endTime: '09:30 AM', type: 'new', reason: 'New patient visit',
    status: 'completed', room: 'Exam 1',
    compassSummary: 'Healthy 35M establishing care. BMI 24.3. No chronic conditions. Routine screening labs ordered.',
  },
  {
    id: 'apt-4', patientName: 'Sarah Johnson', patientAge: 32, mrn: 'MRN-104',
    time: '09:30 AM', endTime: '10:00 AM', type: 'urgent', reason: 'Severe headache - 3 days',
    status: 'in-progress', room: 'Exam 3', hasRedFlags: true,
    compassSummary: 'AI PRE-VISIT: 32F with 3-day severe headache. Red flags: worst headache of life, sudden onset. Consider CT head to rule out SAH. Migraine history noted.',
  },
  {
    id: 'apt-5', patientName: 'Dorothy Clark', patientAge: 81, mrn: 'MRN-021',
    time: '10:00 AM', endTime: '10:30 AM', type: 'urgent', reason: 'Fall at home - evaluation',
    status: 'checked-in', room: 'Exam 2', hasRedFlags: true,
    compassSummary: 'AI PRE-VISIT: 81F fall evaluation. On warfarin for AFib. INR last 2.8. Check for head injury, fractures. Fall risk assessment needed. Review home safety.',
  },
  {
    id: 'apt-6', patientName: 'Michael Brown', patientAge: 67, mrn: 'MRN-105',
    time: '10:30 AM', endTime: '11:00 AM', type: 'telehealth', reason: 'Medication review',
    status: 'scheduled',
    compassSummary: 'AI PRE-VISIT: 67M on 8 medications. Potential interaction: metoprolol + verapamil (bradycardia risk). Consider deprescribing assessment.',
  },
  {
    id: 'apt-7', patientName: 'Jennifer Wilson', patientAge: 29, mrn: 'MRN-106',
    time: '11:00 AM', endTime: '11:30 AM', type: 'follow-up', reason: 'Anxiety management',
    status: 'scheduled',
    compassSummary: 'AI PRE-VISIT: GAD-7 score 12 (moderate). On sertraline 100mg x 8 weeks. PHQ-9 score 6. Consider dose adjustment if symptoms persist.',
  },
  {
    id: 'apt-8', patientName: 'William Davis', patientAge: 54, mrn: 'MRN-107',
    time: '11:30 AM', endTime: '12:00 PM', type: 'procedure', reason: 'Joint injection - R knee',
    status: 'scheduled', room: 'Procedure Room',
    compassSummary: 'AI PRE-VISIT: R knee OA. Last injection 4 months ago with good response. No anticoagulants. Allergies: NKDA.',
  },
  {
    id: 'apt-9', patientName: 'Linda Thompson', patientAge: 45, mrn: 'MRN-024',
    time: '01:00 PM', endTime: '01:30 PM', type: 'urgent', reason: 'Abdominal pain',
    status: 'scheduled', hasRedFlags: true,
    compassSummary: 'AI PRE-VISIT: 45F acute abdominal pain RLQ x2 days. Low-grade fever. Prior appendectomy. Consider CT abd/pelvis. Labs: CBC, CMP, lipase.',
  },
  {
    id: 'apt-10', patientName: 'Kevin Martinez', patientAge: 28, mrn: 'MRN-023',
    time: '01:30 PM', endTime: '02:00 PM', type: 'new', reason: 'Establish care',
    status: 'scheduled',
    compassSummary: 'AI PRE-VISIT: 28M new patient. Records received from prior PCP. Hx asthma (well-controlled). Due for preventive screening.',
  },
  {
    id: 'apt-11', patientName: 'Nancy White', patientAge: 71, mrn: 'MRN-109',
    time: '02:00 PM', endTime: '02:30 PM', type: 'follow-up', reason: 'COPD management',
    status: 'scheduled',
    compassSummary: 'AI PRE-VISIT: COPD GOLD Stage II. FEV1 62% predicted. On tiotropium + albuterol PRN. 1 exacerbation in past year. Pulmonary rehab referral pending.',
  },
  {
    id: 'apt-12', patientName: 'Thomas Lee', patientAge: 62, mrn: 'MRN-110',
    time: '02:30 PM', endTime: '03:00 PM', type: 'follow-up', reason: 'Post-surgery follow-up',
    status: 'cancelled',
  },
  {
    id: 'apt-13', patientName: 'Margaret White', patientAge: 72, mrn: 'MRN-020',
    time: '03:00 PM', endTime: '03:30 PM', type: 'urgent', reason: 'Shortness of breath',
    status: 'scheduled', hasRedFlags: true,
    compassSummary: 'AI PRE-VISIT: 72F SOB x3 days progressive. Hx CHF (EF 40%), on furosemide + carvedilol. Gained 5 lbs in 1 week. Likely decompensation. BNP, CXR recommended.',
  },
];

// =============================================================================
// Status / Type helpers
// =============================================================================

const typeColors: Record<string, { bg: string; text: string }> = {
  'new': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'follow-up': { bg: 'bg-gray-50', text: 'text-gray-600' },
  'urgent': { bg: 'bg-red-50', text: 'text-red-700' },
  'telehealth': { bg: 'bg-teal-50', text: 'text-teal-700' },
  'procedure': { bg: 'bg-amber-50', text: 'text-amber-700' },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  'completed': { label: 'Done', color: 'text-green-600', icon: CheckCircle },
  'in-progress': { label: 'In Room', color: 'text-blue-600', icon: PlayCircle },
  'checked-in': { label: 'Checked In', color: 'text-amber-600', icon: Clock },
  'scheduled': { label: 'Scheduled', color: 'text-gray-400', icon: Calendar },
  'no-show': { label: 'No Show', color: 'text-red-500', icon: AlertTriangle },
  'cancelled': { label: 'Cancelled', color: 'text-gray-400', icon: Clock },
};

// =============================================================================
// Main Component
// =============================================================================

export default function ProviderDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schedule] = useState<Appointment[]>(TODAYS_SCHEDULE);
  const [expandedAppt, setExpandedAppt] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #1A8FA8 0%, #0C4C5E 100%)' }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || 'Provider';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const completed = schedule.filter(a => a.status === 'completed').length;
  const inProgress = schedule.filter(a => a.status === 'in-progress').length;
  const upcoming = schedule.filter(a => a.status === 'scheduled' || a.status === 'checked-in').length;
  const cancelled = schedule.filter(a => a.status === 'cancelled').length;
  const redFlags = schedule.filter(a => a.hasRedFlags && a.status !== 'completed').length;
  const totalActive = schedule.filter(a => a.status !== 'cancelled').length;

  return (
    <>
      <Head>
        <title>Dashboard | ATTENDING AI</title>
      </Head>

      <ProviderShell contextBadge="Dashboard" currentPage="dashboard" fullWidth>
        <div className="flex h-[calc(100vh-112px)]">

          {/* ═══ SIDEBAR: Work Links ═══ */}
          <div className="w-[240px] flex-shrink-0 border-r border-gray-200 flex flex-col"
            style={{ background: 'linear-gradient(180deg, #0C3547 0%, #0F5F76 100%)' }}>

            {/* Sidebar Header */}
            <div className="px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">Work Queue</h2>
                  <p className="text-[10px] text-teal-300/70">Action Items</p>
                </div>
              </div>
            </div>

            {/* Links */}
            <nav className="flex-1 py-2 px-2 overflow-y-auto">
              {WORK_LINKS.map(link => {
                const Icon = link.icon;
                return (
                  <Link key={link.id} href={link.href}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all group"
                    style={{ color: 'rgba(200, 230, 230, 0.85)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,143,168,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-5 rounded-full" style={{ background: link.color, opacity: 0.7 }} />
                      <Icon className="w-4 h-4" />
                      <span className="font-medium text-[13px] group-hover:text-white transition-colors">{link.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(link.urgent ?? 0) > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                      {(link.badge ?? 0) > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full font-semibold"
                          style={{ background: 'rgba(26,143,168,0.5)', color: 'white' }}>
                          {link.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Stats */}
            <div className="px-4 py-3 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/10 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{totalActive}</p>
                  <p className="text-[9px] text-teal-300/70">Today</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-300">{completed}</p>
                  <p className="text-[9px] text-teal-300/70">Done</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ MAIN: Schedule ═══ */}
          <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #0C3547 0%, #1A8FA8 40%, #f0fdf9 100%)' }}>
            <div className="max-w-[1100px] mx-auto px-6 py-6">

              {/* Welcome + Date */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">
                  Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {userName.split(' ')[0]}
                </h1>
                <p className="text-teal-200 text-sm mt-1">{dateStr}</p>
              </div>

              {/* Quick Stats Bar */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                  <p className="text-2xl font-bold text-white">{totalActive}</p>
                  <p className="text-[11px] text-teal-200">Patients</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                  <p className="text-2xl font-bold text-green-300">{completed}</p>
                  <p className="text-[11px] text-teal-200">Completed</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                  <p className="text-2xl font-bold text-blue-300">{inProgress}</p>
                  <p className="text-[11px] text-teal-200">In Progress</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                  <p className="text-2xl font-bold text-amber-300">{upcoming}</p>
                  <p className="text-[11px] text-teal-200">Upcoming</p>
                </div>
                {redFlags > 0 && (
                  <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-3 border border-red-500/30 text-center">
                    <p className="text-2xl font-bold text-red-300">{redFlags}</p>
                    <p className="text-[11px] text-red-200">Red Flags</p>
                  </div>
                )}
                {redFlags === 0 && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                    <p className="text-2xl font-bold text-gray-300">{cancelled}</p>
                    <p className="text-[11px] text-teal-200">Cancelled</p>
                  </div>
                )}
              </div>

              {/* Schedule Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">Today's Schedule</h2>
                </div>
                <Link href="/schedule"
                  className="text-teal-200 hover:text-white text-sm flex items-center gap-1 transition-colors">
                  Full Schedule <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Schedule List */}
              <div className="space-y-2">
                {schedule.map(appt => {
                  const tColor = typeColors[appt.type] || typeColors['follow-up'];
                  const sConfig = statusConfig[appt.status] || statusConfig['scheduled'];
                  const StatusIcon = sConfig.icon;
                  const isExpanded = expandedAppt === appt.id;
                  const isCancelled = appt.status === 'cancelled';

                  return (
                    <div key={appt.id}
                      className={`rounded-xl border transition-all ${
                        isCancelled ? 'bg-gray-50/80 border-gray-200 opacity-60' :
                        appt.status === 'in-progress' ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-100' :
                        appt.hasRedFlags && appt.status !== 'completed' ? 'bg-white border-red-200 shadow-sm' :
                        appt.status === 'completed' ? 'bg-white/90 border-gray-100' :
                        'bg-white border-gray-200 shadow-sm hover:shadow-md'
                      }`}>

                      {/* Main Row */}
                      <button onClick={() => setExpandedAppt(isExpanded ? null : appt.id)}
                        className="w-full text-left p-4 flex items-center gap-4">

                        {/* Time */}
                        <div className="w-[75px] flex-shrink-0">
                          <p className={`text-sm font-bold ${appt.status === 'completed' ? 'text-gray-400' : 'text-gray-900'}`}>
                            {appt.time}
                          </p>
                          <p className="text-[10px] text-gray-400">{appt.endTime}</p>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex-shrink-0">
                          <StatusIcon className={`w-5 h-5 ${sConfig.color}`} />
                        </div>

                        {/* Patient Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {appt.patientName}
                            </span>
                            <span className="text-[11px] text-gray-400">{appt.patientAge}y</span>
                            <span className="text-[11px] text-gray-400">{appt.mrn}</span>
                            {appt.hasRedFlags && appt.status !== 'completed' && (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>{appt.reason}</p>
                        </div>

                        {/* Type + Room */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${tColor.bg} ${tColor.text}`}>
                            {appt.type === 'telehealth' ? 'Video' : appt.type.charAt(0).toUpperCase() + appt.type.slice(1)}
                          </span>
                          {appt.room && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {appt.room}
                            </span>
                          )}
                          {appt.type === 'telehealth' && (
                            <Video className="w-4 h-4 text-teal-500" />
                          )}
                        </div>

                        {/* Status label */}
                        <div className="w-[70px] text-right flex-shrink-0">
                          <span className={`text-[11px] font-medium ${sConfig.color}`}>{sConfig.label}</span>
                        </div>

                        <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {/* COMPASS AI Summary (expanded) */}
                      {isExpanded && appt.compassSummary && (
                        <div className="px-4 pb-4 pt-0">
                          <div className={`rounded-lg p-3 flex gap-3 ${
                            appt.status === 'completed'
                              ? 'bg-green-50 border border-green-100'
                              : 'bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100'
                          }`}>
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                                <Brain className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-1">
                                {appt.status === 'completed' ? 'COMPASS Visit Summary' : 'COMPASS Pre-Visit Intelligence'}
                              </p>
                              <p className="text-xs text-gray-700 leading-relaxed">{appt.compassSummary}</p>
                              {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                <div className="flex gap-2 mt-2">
                                  <Link href={`/previsit/${appt.id}`}
                                    className="px-3 py-1.5 text-[11px] font-semibold text-white rounded-lg transition-colors"
                                    style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}>
                                    Open Pre-Visit
                                  </Link>
                                  <Link href="/clinical"
                                    className="px-3 py-1.5 text-[11px] font-semibold text-teal-700 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors">
                                    Start Visit
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI Insights Footer */}
              <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}>
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900">COMPASS AI Insights</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {redFlags} patient{redFlags !== 1 ? 's' : ''} with red flags requiring attention.
                      {' '}{upcoming} upcoming appointments with pre-visit intelligence ready.
                    </p>
                  </div>
                  <Link href="/interventions"
                    className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}>
                    <Zap className="w-4 h-4" />
                    AI Copilot
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProviderShell>
    </>
  );
}
