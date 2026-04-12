// ============================================================
// ATTENDING AI — Patient App Home (Dashboard)
// apps/patient-portal/pages/home.tsx
//
// Draggable, resizable, collapsible dashboard widgets:
// - Quick Actions, Referral Tracker, Health Snapshot,
//   Upcoming Appointments, Recent Activity
// - Layout persisted to localStorage
// - Responsive: 1 col mobile, 2 col desktop
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
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
  ChevronDown,
  GripVertical,
  Maximize2,
  Minimize2,
  ClipboardList,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { usePatientData } from '../hooks/usePatientData';
import { useNotifications } from '../hooks/useNotifications';

const ResponsiveGridLayout = WidthProvider(Responsive);

// ============================================================
// Layout storage key
// ============================================================

const LAYOUT_VERSION = 'v3';
const LAYOUT_STORAGE_KEY = `attending-home-layouts-${LAYOUT_VERSION}`;
const COLLAPSED_STORAGE_KEY = `attending-home-collapsed-${LAYOUT_VERSION}`;

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
// Dashboard Widget Wrapper
// ============================================================

interface DashboardWidgetProps {
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

const DashboardWidget = React.forwardRef<HTMLDivElement, DashboardWidgetProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ title, collapsed, onToggleCollapse, children, headerExtra, style, className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        style={style}
        className={`bg-attending-50 rounded-xl border border-attending-100 flex flex-col overflow-hidden h-full ${className ?? ''}`}
        {...rest}
      >
        {/* Header — always visible, acts as drag handle */}
        <div className="widget-drag-handle flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing select-none flex-shrink-0">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-attending-300" />
            <h2 className="text-sm font-semibold text-attending-deep-navy">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
              className="p-1 rounded-md hover:bg-attending-100 transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronDown
                className={`w-4 h-4 text-attending-400 transition-transform duration-200 ${
                  collapsed ? '-rotate-90' : 'rotate-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Body — hidden when collapsed */}
        {!collapsed && (
          <div className="px-4 pb-4 flex-1 overflow-auto">
            {children}
          </div>
        )}
      </div>
    );
  }
);
DashboardWidget.displayName = 'DashboardWidget';

// ============================================================
// Sub-components (same as before, kept compact)
// ============================================================

function QuickAction({ href, icon: Icon, label, sublabel, color, iconBg }: {
  href: string; icon: React.ElementType; label: string; sublabel: string; color: string; iconBg: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-attending-100 p-3 sm:p-4 flex flex-col gap-2 hover:shadow-attending hover:border-attending-primary transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
      </div>
      <div>
        <p className="font-semibold text-sm text-attending-deep-navy">{label}</p>
        <p className="text-xs text-attending-600 mt-0.5">{sublabel}</p>
      </div>
    </Link>
  );
}

function ReferralSummary() {
  // Compact summary — shows counts and action-needed items only.
  // Full detail lives at /health/referrals via ReferralTracker component.
  const referrals = [
    { id: 'r1', specialty: 'Cardiology', status: 'scheduled', provider: 'Dr. Patel', date: 'Mar 18' },
    { id: 'r2', specialty: 'Endocrinology', status: 'pending-auth', provider: 'Awaiting insurance', date: '' },
    { id: 'r3', specialty: 'Dermatology', status: 'needs-scheduling', provider: 'Call to schedule', date: '' },
  ];
  const needsAction = referrals.filter(r => r.status === 'needs-scheduling' || r.status === 'pending-auth');

  return (
    <div className="space-y-2">
      {needsAction.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs text-amber-800 font-medium">{needsAction.length} referral{needsAction.length > 1 ? 's' : ''} need your attention</span>
        </div>
      )}
      {referrals.map((r) => {
        const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
          'scheduled': { bg: 'bg-green-50', text: 'text-green-700', label: 'Scheduled' },
          'pending-auth': { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending Auth' },
          'needs-scheduling': { bg: 'bg-red-50', text: 'text-red-700', label: 'Needs Scheduling' },
        };
        const s = statusStyles[r.status] ?? statusStyles['pending-auth'];
        return (
          <Link key={r.id} href="/health/referrals"
            className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-attending-100 hover:border-attending-primary transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-medium text-attending-deep-navy truncate">{r.specialty}</p>
              <p className="text-xs text-attending-600 mt-0.5 truncate">{r.provider}{r.date ? ` · ${r.date}` : ''}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${s.bg} ${s.text}`}>
              {s.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const dateObj = new Date(appointment.date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

  return (
    <div className="bg-white rounded-xl border border-attending-100 p-3 flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-attending-50 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-semibold text-attending-primary uppercase">{dayName}</span>
        <span className="text-base font-bold text-attending-deep-navy leading-tight">{dayNum}</span>
        <span className="text-[10px] text-attending-600">{month}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-attending-deep-navy truncate">{appointment.provider}</p>
        <p className="text-xs text-attending-600 mt-0.5">{appointment.specialty}</p>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-attending-primary" />
          <span className="text-xs text-attending-primary font-medium">{appointment.time}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            appointment.type === 'telehealth' ? 'bg-blue-50 text-blue-600' : 'bg-attending-50 text-attending-primary'
          }`}>
            {appointment.type === 'telehealth' ? 'Video' : 'In-Person'}
          </span>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex items-center gap-3 py-2.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-attending-deep-navy truncate">{item.title}</p>
        <p className="text-xs text-attending-600 truncate">{item.subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] text-attending-600">{item.timestamp}</span>
        {item.status && statusIcon[item.status]}
      </div>
    </div>
  );
}

function HealthSnap({ icon: Icon, label, value, unit, status }: {
  icon: React.ElementType; label: string; value: string; unit: string; status: 'normal' | 'warning' | 'alert';
}) {
  const statusColors = { normal: 'text-green-600', warning: 'text-attending-gold', alert: 'text-red-500' };
  return (
    <div className="bg-white rounded-xl border border-attending-100 p-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${statusColors[status]}`} />
      <p className="text-lg font-bold text-attending-deep-navy">
        {value}<span className="text-xs font-normal text-attending-600 ml-0.5">{unit}</span>
      </p>
      <p className="text-[10px] text-attending-600 mt-0.5">{label}</p>
    </div>
  );
}

// ============================================================
// Default Layouts
// ============================================================

const ROW_H = 60;

const DEFAULT_LAYOUTS: Record<string, Layout[]> = {
  lg: [
    { i: 'quick-actions', x: 0, y: 0, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'health',        x: 1, y: 0, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'referrals',     x: 0, y: 3, w: 1, h: 6, minW: 1, minH: 2 },
    { i: 'appointments',  x: 1, y: 3, w: 1, h: 6, minW: 1, minH: 2 },
    { i: 'activity',      x: 0, y: 9, w: 2, h: 5, minW: 1, minH: 2 },
  ],
  sm: [
    { i: 'quick-actions', x: 0, y: 0,  w: 1, h: 3,  minW: 1, minH: 2 },
    { i: 'health',        x: 0, y: 3,  w: 1, h: 3,  minW: 1, minH: 2 },
    { i: 'referrals',     x: 0, y: 6,  w: 1, h: 6,  minW: 1, minH: 2 },
    { i: 'appointments',  x: 0, y: 12, w: 1, h: 6,  minW: 1, minH: 2 },
    { i: 'activity',      x: 0, y: 18, w: 1, h: 5,  minW: 1, minH: 2 },
  ],
};

// ============================================================
// Main Home Page
// ============================================================

export default function PatientHome() {
  const [patientName, setPatientName] = useState('');
  const [mounted, setMounted] = useState(false);
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>(DEFAULT_LAYOUTS);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Live data
  const { vitals, appointments, labs, loading: healthLoading } = usePatientData({ autoRefreshMs: 60000 });
  const { unreadCount, notifications } = useNotifications({ pollIntervalMs: 30000 });

  // Load saved state
  useEffect(() => {
    setMounted(true);
    const name = localStorage.getItem('attending-patient-name') || 'Patient';
    setPatientName(name);

    try {
      const savedLayouts = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (savedLayouts) setLayouts(JSON.parse(savedLayouts));
    } catch { /* use defaults */ }

    try {
      const savedCollapsed = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (savedCollapsed) setCollapsed(JSON.parse(savedCollapsed));
    } catch { /* use defaults */ }
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Save layout changes
  const onLayoutChange = useCallback((_current: Layout[], allLayouts: Record<string, Layout[]>) => {
    setLayouts(allLayouts);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  // Toggle collapse
  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Map data
  const upcomingAppointments: Appointment[] = (appointments ?? []).slice(0, 3).map((a) => ({
    id: a.id, provider: a.provider, specialty: a.specialty,
    date: a.date, time: a.time,
    type: a.type?.toLowerCase().includes('tele') ? 'telehealth' : 'in-person',
  }));

  const typeMap: Record<string, ActivityItem['type']> = {
    'lab-result': 'lab', message: 'message', appointment: 'appointment',
    prescription: 'prescription', assessment: 'assessment',
  };
  const recentActivity: ActivityItem[] = (notifications ?? []).slice(0, 5).map((n) => ({
    id: n.id, type: typeMap[n.type] ?? 'assessment',
    title: n.title, subtitle: n.body,
    timestamp: formatTimeAgo(n.timestamp),
    status: n.read ? 'completed' as const : 'new' as const,
  }));

  // Fallbacks
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
          <header className="bg-white border-b border-attending-100 safe-area-top">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-attending-600 text-sm">{greeting()},</p>
                  <h1 className="text-xl font-bold mt-0.5 text-attending-deep-navy">{patientName}</h1>
                </div>
                <Link href="/notifications" className="relative p-2.5 bg-attending-50 rounded-full hover:bg-attending-100 transition-colors">
                  <Bell className="w-5 h-5 text-attending-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-attending-coral text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
              {/* Compact COMPASS entry — clear single purpose */}
              <Link href="/compass" className="block">
                <div className="bg-attending-primary rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-attending-primary/90 transition-colors">
                  <Stethoscope className="w-5 h-5 text-white flex-shrink-0" />
                  <span className="font-semibold text-white text-sm">New COMPASS Assessment</span>
                  <ChevronRight className="w-4 h-4 text-white/60 ml-auto" />
                </div>
              </Link>
            </div>
          </header>
        }
      >
        <div className="bg-attending-800 dashboard-bg pb-8">
          <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 pt-4">
            {mounted && (
              <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 768, sm: 0 }}
                cols={{ lg: 2, sm: 1 }}
                rowHeight={ROW_H}
                onLayoutChange={onLayoutChange}
                draggableHandle=".widget-drag-handle"
                isResizable={true}
                isDraggable={true}
                resizeHandles={['s']}
                margin={[16, 16]}
                containerPadding={[0, 0]}
              >
                {/* Quick Actions */}
                <div key="quick-actions" className="h-full">
                  <DashboardWidget
                    title="Quick Actions"
                    collapsed={!!collapsed['quick-actions']}
                    onToggleCollapse={() => toggleCollapse('quick-actions')}
                  >
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                      <QuickAction href="/health" icon={FileText} label="My Health" sublabel="Records" color="text-attending-primary" iconBg="bg-attending-50" />
                      <QuickAction href="/health/referrals" icon={ClipboardList} label="Referrals" sublabel="Track status" color="text-blue-600" iconBg="bg-blue-50" />
                      <QuickAction href="/health/appointments" icon={Calendar} label="Book" sublabel="Appointment" color="text-attending-gold" iconBg="bg-amber-50" />
                      <QuickAction href="/emergency" icon={Shield} label="Emergency" sublabel="Get help" color="text-red-600" iconBg="bg-red-50" />
                    </div>
                  </DashboardWidget>
                </div>

                {/* Referral Summary — links to full tracker */}
                <div key="referrals" className="h-full">
                  <DashboardWidget
                    title="My Referrals"
                    collapsed={!!collapsed['referrals']}
                    onToggleCollapse={() => toggleCollapse('referrals')}
                    headerExtra={
                      <Link href="/health/referrals" className="text-xs text-attending-primary font-medium mr-1" onClick={e => e.stopPropagation()}>
                        View All
                      </Link>
                    }
                  >
                    <ReferralSummary />
                  </DashboardWidget>
                </div>

                {/* Health Snapshot */}
                <div key="health" className="h-full">
                  <DashboardWidget
                    title="Health Snapshot"
                    collapsed={!!collapsed['health']}
                    onToggleCollapse={() => toggleCollapse('health')}
                    headerExtra={
                      <Link href="/health" className="text-xs text-attending-primary font-medium mr-1" onClick={e => e.stopPropagation()}>
                        View All
                      </Link>
                    }
                  >
                    <div className="grid grid-cols-3 gap-3">
                      <HealthSnap
                        icon={Activity} label="Blood Pressure"
                        value={vitals ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}` : '---'}
                        unit="mmHg"
                        status={vitals && vitals.bloodPressureSystolic > 130 ? 'warning' : 'normal'}
                      />
                      <HealthSnap
                        icon={Activity} label="Heart Rate"
                        value={vitals ? String(vitals.heartRate) : '---'} unit="bpm"
                        status={vitals && (vitals.heartRate > 100 || vitals.heartRate < 50) ? 'warning' : 'normal'}
                      />
                      {(() => {
                        const a1c = labs?.find((l) => l.testName?.toLowerCase().includes('a1c'));
                        return (
                          <HealthSnap icon={Beaker} label="A1C"
                            value={a1c ? a1c.value : '---'} unit="%"
                            status={a1c && parseFloat(a1c.value) > 5.6 ? 'warning' : 'normal'}
                          />
                        );
                      })()}
                    </div>
                  </DashboardWidget>
                </div>

                {/* Upcoming Appointments */}
                <div key="appointments" className="h-full">
                  <DashboardWidget
                    title="Upcoming Appointments"
                    collapsed={!!collapsed['appointments']}
                    onToggleCollapse={() => toggleCollapse('appointments')}
                    headerExtra={
                      <Link href="/health/appointments" className="text-xs text-attending-primary font-medium mr-1" onClick={e => e.stopPropagation()}>
                        See All
                      </Link>
                    }
                  >
                    <div className="space-y-2">
                      {upcomingAppointments.map((appt) => (
                        <AppointmentCard key={appt.id} appointment={appt} />
                      ))}
                    </div>
                  </DashboardWidget>
                </div>

                {/* Recent Activity */}
                <div key="activity" className="h-full">
                  <DashboardWidget
                    title="Recent Activity"
                    collapsed={!!collapsed['activity']}
                    onToggleCollapse={() => toggleCollapse('activity')}
                  >
                    <div className="bg-white rounded-xl px-4 divide-y divide-attending-50">
                      {recentActivity.map((item) => (
                        <ActivityRow key={item.id} item={item} />
                      ))}
                    </div>
                  </DashboardWidget>
                </div>
              </ResponsiveGridLayout>
            )}
          </div>
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
