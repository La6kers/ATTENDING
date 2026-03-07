// =============================================================================
// COMPASS Admin - Home Dashboard
// apps/compass-admin/pages/index.tsx
//
// Central hub for the ATTENDING AI admin portal.
// Shows system stats, recent tickets, system health, clinics, and activity.
// =============================================================================

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Building2,
  Stethoscope,
  Ticket,
  Activity,
  Plus,
  UserPlus,
  Eye,
  Clock,
  ChevronRight,
  Zap,
  Brain,
  Database,
  Server,
  Wifi,
  Shield,
  Users,
  MapPin,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

// =============================================================================
// Types
// =============================================================================

interface TicketItem {
  id: string;
  title: string;
  clinic: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved';
  timeAgo: string;
}

interface SystemService {
  name: string;
  detail?: string;
  status: 'operational' | 'degraded' | 'down';
  icon: React.ReactNode;
}

interface Clinic {
  name: string;
  address: string;
  providerCount: number;
  patientsToday: number;
}

interface ActivityEvent {
  id: string;
  message: string;
  timeAgo: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const mockTickets: TicketItem[] = [
  { id: 'TK-1042', title: 'Login timeout on tablet kiosk', clinic: 'Coastal Urgent Care', severity: 'high', status: 'open', timeAgo: '12 min ago' },
  { id: 'TK-1041', title: 'AI differential not loading for new patients', clinic: 'Reed Family Medicine', severity: 'critical', status: 'in-progress', timeAgo: '34 min ago' },
  { id: 'TK-1040', title: 'COMPASS assessment stuck on ROS', clinic: 'Harbor Pediatrics', severity: 'high', status: 'open', timeAgo: '1 hr ago' },
  { id: 'TK-1039', title: 'Billing meter showing incorrect counts', clinic: 'Coastal Urgent Care', severity: 'medium', status: 'in-progress', timeAgo: '2 hr ago' },
  { id: 'TK-1038', title: 'Need to add Dr. Martinez to Clinic B', clinic: 'Reed Family Medicine', severity: 'low', status: 'open', timeAgo: '3 hr ago' },
];

const mockServices: SystemService[] = [
  { name: 'Provider Portal', detail: 'port 4502', status: 'operational', icon: <Server className="w-4 h-4" /> },
  { name: 'Patient Portal', detail: 'port 4501', status: 'operational', icon: <Server className="w-4 h-4" /> },
  { name: 'Database', status: 'operational', icon: <Database className="w-4 h-4" /> },
  { name: 'Redis Cache', status: 'degraded', icon: <Zap className="w-4 h-4" /> },
  { name: 'AI Engine', status: 'operational', icon: <Brain className="w-4 h-4" /> },
  { name: 'FHIR Gateway', status: 'operational', icon: <Shield className="w-4 h-4" /> },
];

const mockClinics: Clinic[] = [
  { name: 'Reed Family Medicine', address: '1200 Harbor Blvd, Suite 100', providerCount: 3, patientsToday: 12 },
  { name: 'Coastal Urgent Care', address: '450 Oceanview Dr', providerCount: 5, patientsToday: 28 },
  { name: 'Harbor Pediatrics', address: '789 Bayshore Ln, Bldg C', providerCount: 2, patientsToday: 8 },
];

const mockActivity: ActivityEvent[] = [
  { id: 'a1', message: 'Dr. Reed completed encounter #1247', timeAgo: '5 min ago' },
  { id: 'a2', message: 'New COMPASS assessment from Sarah Chen', timeAgo: '12 min ago' },
  { id: 'a3', message: 'AI cache refreshed (differential patterns)', timeAgo: '25 min ago' },
  { id: 'a4', message: 'Dr. Martinez added to Coastal Urgent Care', timeAgo: '1 hr ago' },
  { id: 'a5', message: 'System backup completed successfully', timeAgo: '2 hr ago' },
];

// =============================================================================
// Helpers
// =============================================================================

const severityDotColor: Record<TicketItem['severity'], string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const statusBadge: Record<TicketItem['status'], { label: string; classes: string }> = {
  open: { label: 'Open', classes: 'bg-red-50 text-red-700 border-red-200' },
  'in-progress': { label: 'In Progress', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  resolved: { label: 'Resolved', classes: 'bg-green-50 text-green-700 border-green-200' },
};

const serviceStatusConfig: Record<SystemService['status'], { dot: string; label: string; textColor: string }> = {
  operational: { dot: 'bg-green-500', label: 'Operational', textColor: 'text-green-700' },
  degraded: { dot: 'bg-yellow-500', label: 'Not Connected', textColor: 'text-yellow-700' },
  down: { dot: 'bg-red-500', label: 'Down', textColor: 'text-red-700' },
};

function getHealthColor(pct: number): string {
  if (pct > 95) return 'bg-green-100';
  if (pct > 85) return 'bg-yellow-100';
  return 'bg-red-100';
}

function getHealthIconColor(pct: number): string {
  if (pct > 95) return 'text-green-600';
  if (pct > 85) return 'text-yellow-600';
  return 'text-red-600';
}

// =============================================================================
// Stat Card
// =============================================================================

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-teal-200/70">{label}</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Dashboard
// =============================================================================

export default function AdminDashboard() {
  // Mock stats
  const activeClinics = 3;
  const activeProviders = 10;
  const openTickets = mockTickets.filter((t) => t.status !== 'resolved').length;
  const systemHealth = 96.4;

  return (
    <>
      <Head>
        <title>Admin Dashboard | ATTENDING AI</title>
      </Head>

      <CompassAdminShell title="Dashboard">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">

          {/* ================================================================ */}
          {/* Welcome Banner                                                   */}
          {/* ================================================================ */}
          <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">ATTENDING AI Admin</h1>
                <p className="text-teal-200/70 mt-1">System Administration &amp; Clinic Management</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/clinics/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-compass-600 text-white rounded-lg text-sm font-medium hover:bg-compass-700 transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Add Clinic
                </Link>
                <Link
                  href="/settings/providers/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 text-teal-100 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Provider
                </Link>
                <Link
                  href="/tickets"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 text-teal-100 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Tickets
                </Link>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* Stats Row                                                        */}
          {/* ================================================================ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Building2 className="w-5 h-5 text-compass-600" />}
              label="Active Clinics"
              value={activeClinics}
              color="bg-compass-100"
            />
            <StatCard
              icon={<Stethoscope className="w-5 h-5 text-blue-600" />}
              label="Active Providers"
              value={activeProviders}
              color="bg-blue-100"
            />
            <StatCard
              icon={<Ticket className="w-5 h-5 text-orange-600" />}
              label="Open Tickets"
              value={openTickets}
              color="bg-orange-100"
            />
            <StatCard
              icon={<Activity className={`w-5 h-5 ${getHealthIconColor(systemHealth)}`} />}
              label="System Health"
              value={`${systemHealth}%`}
              color={getHealthColor(systemHealth)}
            />
          </div>

          {/* ================================================================ */}
          {/* Two-Column Layout                                                */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ------------------------------------------------------------- */}
            {/* LEFT COLUMN (3/5 = ~60%)                                      */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-3 space-y-6">

              {/* Recent Tickets */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">Recent Tickets</h2>
                  <span className="text-xs text-teal-300/50 bg-white/10 px-2 py-1 rounded-full">
                    {openTickets} open
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {mockTickets.map((ticket) => {
                    const badge = statusBadge[ticket.status];
                    return (
                      <div key={ticket.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/5 transition-colors">
                        {/* Severity dot */}
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${severityDotColor[ticket.severity]}`} />

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{ticket.title}</p>
                          <p className="text-xs text-teal-200/70 mt-0.5">
                            {ticket.clinic} &middot; {ticket.timeAgo}
                          </p>
                        </div>

                        {/* Status badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-white/5">
                  <Link href="/tickets" className="text-sm text-compass-600 font-medium hover:text-compass-700 inline-flex items-center gap-1">
                    View All Tickets
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* System Health */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">System Health</h2>
                  <div className="flex items-center gap-1.5 text-xs text-teal-300/50">
                    <Wifi className="w-3.5 h-3.5" />
                    Real-time status
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {mockServices.map((service) => {
                    const cfg = serviceStatusConfig[service.status];
                    return (
                      <div key={service.name} className="px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-teal-300/50">{service.icon}</div>
                          <div>
                            <p className="text-sm font-medium text-white">{service.name}</p>
                            {service.detail && (
                              <p className="text-xs text-teal-300/50">{service.detail}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className={`text-xs font-medium ${cfg.textColor}`}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT COLUMN (2/5 = ~40%)                                     */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-2 space-y-6">

              {/* Clinics */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">Clinics</h2>
                  <span className="text-xs text-teal-300/50 bg-white/10 px-2 py-1 rounded-full">
                    {mockClinics.length} connected
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {mockClinics.map((clinic) => (
                    <div key={clinic.name} className="px-5 py-3.5">
                      <p className="text-sm font-medium text-white">{clinic.name}</p>
                      <p className="text-xs text-teal-300/50 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {clinic.address}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-teal-200/70 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {clinic.providerCount} providers
                        </span>
                        <span className="text-xs text-teal-200/70 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {clinic.patientsToday} patients today
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-white/5">
                  <Link href="/clinics" className="text-sm text-compass-600 font-medium hover:text-compass-700 inline-flex items-center gap-1">
                    Manage Clinics
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">Quick Stats</h2>
                </div>
                <div className="px-5 py-3 space-y-3">
                  {[
                    { label: 'AI Diagnoses Today', value: '47', icon: <Brain className="w-4 h-4 text-compass-500" /> },
                    { label: 'Cache Hit Rate', value: '68%', icon: <Zap className="w-4 h-4 text-yellow-500" /> },
                    { label: 'Avg Encounter Cost', value: '$0.03', icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
                    { label: 'COMPASS Assessments', value: '15', icon: <CheckCircle className="w-4 h-4 text-blue-500" /> },
                    { label: 'Active Encounters', value: '3', icon: <AlertCircle className="w-4 h-4 text-orange-500" /> },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2.5">
                        {stat.icon}
                        <span className="text-sm text-teal-200">{stat.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {mockActivity.map((event) => (
                    <div key={event.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-compass-400 mt-2 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-teal-100">{event.message}</p>
                        <p className="text-xs text-teal-300/50 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.timeAgo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}
