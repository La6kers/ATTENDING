// =============================================================================
// COMPASS Admin - Assessment Queue
// apps/compass-admin/pages/queue.tsx
//
// The primary view for COMPASS standalone practices.
// Shows all submitted assessments sorted by triage urgency -> wait time.
// Providers can claim assessments, filter by status, and view details.
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  Activity,
  Users,
  CheckCircle,
  RefreshCw,
  Filter,
  Search,
  Inbox,
  Zap,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

// =============================================================================
// Types
// =============================================================================

interface Assessment {
  id: string;
  patientName: string;
  patientDOB?: string;
  chiefComplaint: string;
  triageLevel: string;
  redFlags: string[];
  completedAt: string;
  assignedProviderName?: string;
  status: string;
}

type QueueFilter = 'all' | 'unassigned' | 'mine' | 'reviewed';
type TriageLevel = 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'ROUTINE';

// =============================================================================
// Helpers
// =============================================================================

const triageOrder: Record<string, number> = {
  EMERGENCY: 0, URGENT: 1, MODERATE: 2, ROUTINE: 3,
};

const triageConfig: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
  EMERGENCY: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', label: 'EMERGENCY' },
  URGENT:    { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', label: 'URGENT' },
  MODERATE:  { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500', label: 'MODERATE' },
  ROUTINE:   { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500', label: 'ROUTINE' },
};

function getWaitTime(completedAt: string): string {
  const ms = Date.now() - new Date(completedAt).getTime();
  const min = Math.max(1, Math.floor(ms / 60000));
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const remainder = min % 60;
  return `${hr}h ${remainder}m`;
}

function getAge(dob?: string): number | null {
  if (!dob) return null;
  try {
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  } catch { return null; }
}

// =============================================================================
// Queue Card Component
// =============================================================================

function QueueCard({ assessment }: { assessment: Assessment }) {
  const triage = triageConfig[assessment.triageLevel] || triageConfig.ROUTINE;
  const age = getAge(assessment.patientDOB);
  const waitTime = getWaitTime(assessment.completedAt);
  const isEmergency = assessment.triageLevel === 'EMERGENCY';

  return (
    <Link
      href={`/assessment/${assessment.id}`}
      className={`block rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm hover:shadow-md transition-all group ${
        isEmergency ? 'border-red-300 animate-pulse-urgent ring-1 ring-red-200' : 'border-white/10 hover:border-compass-300'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Patient info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Triage dot */}
            <div className={`w-2 h-10 rounded-full ${triage.dot} flex-shrink-0 mt-0.5`} />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white truncate">
                  {assessment.patientName}
                </h3>
                {age !== null && (
                  <span className="text-teal-200/70 text-sm">{age}y</span>
                )}
                {assessment.redFlags.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {assessment.redFlags.length} red flag{assessment.redFlags.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-teal-200 text-sm mt-0.5 line-clamp-1">
                {assessment.chiefComplaint}
              </p>
              {assessment.redFlags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {assessment.redFlags.slice(0, 3).map((rf, i) => (
                    <span key={i} className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                      {rf}
                    </span>
                  ))}
                  {assessment.redFlags.length > 3 && (
                    <span className="text-xs text-teal-200/70">
                      +{assessment.redFlags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Triage badge + wait time */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${triage.bg} ${triage.color} ${triage.border}`}>
              {triage.label}
            </span>
            <span className="text-teal-200/70 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {waitTime}
            </span>
            {assessment.assignedProviderName && (
              <span className="text-xs text-compass-600 bg-compass-50 px-2 py-0.5 rounded-full">
                {assessment.assignedProviderName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="border-t border-white/5 px-5 py-2.5 flex items-center justify-between text-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-compass-600 font-medium">Review Assessment</span>
        <ChevronRight className="w-4 h-4 text-compass-400 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

// =============================================================================
// Stat Card
// =============================================================================

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-4 sm:p-5`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-teal-200/70">{label}</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function QueuePage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<QueueFilter>('unassigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch assessments
  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/assessments?pageSize=100');
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
      }
    } catch (err) {
      console.error('[Queue] Failed to load:', err);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 15_000); // Poll every 15s
    return () => clearInterval(interval);
  }, [loadQueue]);

  // Filter + sort
  const filtered = assessments
    .filter((a) => {
      if (filter === 'unassigned') return !a.assignedProviderName && a.status !== 'REVIEWED';
      if (filter === 'reviewed') return a.status === 'REVIEWED';
      // 'mine' would filter by current provider -- for now shows assigned
      if (filter === 'mine') return !!a.assignedProviderName && a.status !== 'REVIEWED';
      return true; // 'all'
    })
    .filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.chiefComplaint.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Primary: triage level
      const triageDiff = (triageOrder[a.triageLevel] ?? 3) - (triageOrder[b.triageLevel] ?? 3);
      if (triageDiff !== 0) return triageDiff;
      // Secondary: longest wait first
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
    });

  // Stats
  const stats = {
    total: assessments.length,
    pending: assessments.filter((a) => !a.assignedProviderName && a.status !== 'REVIEWED').length,
    inProgress: assessments.filter((a) => a.assignedProviderName && a.status !== 'REVIEWED').length,
    reviewed: assessments.filter((a) => a.status === 'REVIEWED').length,
    emergencies: assessments.filter((a) => a.triageLevel === 'EMERGENCY' && a.status !== 'REVIEWED').length,
  };

  return (
    <>
      <Head>
        <title>Assessment Queue | ATTENDING Admin</title>
      </Head>

      <CompassAdminShell title="Assessment Queue">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
          {/* Emergency Banner */}
          {stats.emergencies > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-pulse-urgent">
              <div className="p-2 bg-red-100 rounded-lg">
                <Zap className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800">
                  {stats.emergencies} emergency assessment{stats.emergencies !== 1 ? 's' : ''} requiring immediate attention
                </p>
              </div>
              <button
                onClick={() => setFilter('all')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                View Now
              </button>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Inbox className="w-5 h-5 text-compass-600" />}
              label="Pending Review"
              value={stats.pending}
              color="bg-compass-100"
            />
            <StatCard
              icon={<Activity className="w-5 h-5 text-blue-600" />}
              label="In Progress"
              value={stats.inProgress}
              color="bg-blue-100"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              label="Reviewed"
              value={stats.reviewed}
              color="bg-green-100"
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-purple-600" />}
              label="Total Today"
              value={stats.total}
              color="bg-purple-100"
            />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-1">
              {([
                { key: 'unassigned', label: 'Pending', count: stats.pending },
                { key: 'mine', label: 'In Progress', count: stats.inProgress },
                { key: 'reviewed', label: 'Reviewed', count: stats.reviewed },
                { key: 'all', label: 'All', count: stats.total },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-compass-600 text-white'
                      : 'text-teal-200 hover:bg-white/10'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                      filter === key ? 'bg-white/20' : 'bg-gray-200'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300/50" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-compass-300 focus:border-compass-400 w-64"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={loadQueue}
                className="p-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                title={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
              >
                <RefreshCw className={`w-4 h-4 text-teal-200/70 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            {loading && assessments.length === 0 ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-compass-600 mx-auto mb-4" />
                <p className="text-teal-200/70">Loading queue...</p>
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((a) => <QueueCard key={a.id} assessment={a} />)
            ) : (
              <div className="text-center py-16 rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm">
                <Inbox className="w-12 h-12 text-teal-300/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-teal-100 mb-1">
                  {filter === 'unassigned' ? 'No pending assessments' :
                   filter === 'mine' ? 'No assessments in progress' :
                   filter === 'reviewed' ? 'No reviewed assessments' :
                   'No assessments found'}
                </h3>
                <p className="text-teal-200/70 text-sm">
                  {searchQuery
                    ? 'Try a different search term.'
                    : 'New patient check-ins will appear here.'}
                </p>
              </div>
            )}
          </div>

          {/* Auto-refresh indicator */}
          <div className="mt-6 text-center">
            <p className="text-xs text-teal-300/50">
              Auto-refreshing every 15 seconds · Last updated {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}
