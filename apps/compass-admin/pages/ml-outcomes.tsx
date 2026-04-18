// =============================================================================
// COMPASS Admin - ML Outcomes Dashboard
// apps/compass-admin/pages/ml-outcomes.tsx
//
// Central visibility into the diagnostic feedback loop:
//   - Real-world accuracy metrics (top-1/3/5) from confirmed outcomes
//   - Per-clinic and per-provider breakdown
//   - Recent outcomes stream with AI vs physician vs confirmed comparison
//   - Misses grouped by (CC category, confirmed dx) — the iteration queue
//   - Tickets that route here when a clinic flags a systemic AI issue
//
// Data source: /api/outcomes/metrics + /api/outcomes recent rows.
// When no live data exists yet (pre-pilot), falls back to mock data so
// the dashboard is always demonstrable for investors / RHTP reviewers.
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Building2,
  UserCheck,
  Ticket,
  Download,
  RefreshCw,
  Filter,
  ChevronRight,
  FileText,
  Stethoscope,
  FlaskConical,
  Eye,
  Circle,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

// =============================================================================
// Types
// =============================================================================

type AccuracyAssessment = 'CONFIRMED' | 'PARTIAL' | 'REFUTED' | 'PENDING';

interface OutcomeMetrics {
  totalConfirmed: number;
  top1Hits: number;
  top3Hits: number;
  top5Hits: number;
  misses: number;
  top1Rate: number;
  top3Rate: number;
  top5Rate: number;
}

interface RecentOutcome {
  requestId: string;
  clinic: string;
  provider: string;
  chiefComplaint: string;
  aiPrimaryDiagnosis: string;
  physicianDiagnosis: string | null;
  finalConfirmedDiagnosis: string | null;
  aiAccuracyAssessment: AccuracyAssessment;
  aiTopKWasRight: 1 | 3 | 5 | 0 | null;
  createdAt: string; // ISO
  finalConfirmedAt: string | null;
}

interface MissGroup {
  chiefComplaintCategory: string;
  confirmedDiagnosis: string;
  missCount: number;
  totalForCategory: number;
  exampleRequestIds: string[];
}

interface ClinicOutcomeSummary {
  clinicId: string;
  clinicName: string;
  totalConfirmed: number;
  top3Rate: number;
  openTickets: number;
  pendingConfirmations: number;
}

interface ProviderOutcomeSummary {
  providerId: string;
  providerName: string;
  clinicName: string;
  totalConfirmed: number;
  top1Rate: number;
  top3Rate: number;
  feedbackRating: number | null;
}

interface RoutedTicket {
  id: string;
  title: string;
  clinic: string;
  provider: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  linkedRequestIds: string[];
  openedAt: string;
}

// =============================================================================
// Mock data — replaced with live /api/outcomes/* calls when available
// =============================================================================

const MOCK_METRICS: OutcomeMetrics = {
  totalConfirmed: 412,
  top1Hits: 256,
  top3Hits: 352,
  top5Hits: 378,
  misses: 34,
  top1Rate: 62.1,
  top3Rate: 85.4,
  top5Rate: 91.7,
};

const MOCK_RECENT: RecentOutcome[] = [
  {
    requestId: '7b1a-0e25',
    clinic: 'Reed Family Medicine',
    provider: 'Dr. Thomas Reed',
    chiefComplaint: 'chest pain radiating to left arm, diaphoresis',
    aiPrimaryDiagnosis: 'Acute Myocardial Infarction',
    physicianDiagnosis: 'STEMI',
    finalConfirmedDiagnosis: 'Non-ST-elevation myocardial infarction',
    aiAccuracyAssessment: 'CONFIRMED',
    aiTopKWasRight: 1,
    createdAt: '2026-04-18T14:12:03Z',
    finalConfirmedAt: '2026-04-18T16:48:11Z',
  },
  {
    requestId: 'c92b-441f',
    clinic: 'Coastal Urgent Care',
    provider: 'Dr. Maria Santos',
    chiefComplaint: 'cant breathe, ankles swollen, cant lay flat',
    aiPrimaryDiagnosis: 'Congestive Heart Failure',
    physicianDiagnosis: 'CHF exacerbation',
    finalConfirmedDiagnosis: 'Congestive Heart Failure, acute on chronic',
    aiAccuracyAssessment: 'CONFIRMED',
    aiTopKWasRight: 1,
    createdAt: '2026-04-18T13:55:02Z',
    finalConfirmedAt: '2026-04-18T17:22:00Z',
  },
  {
    requestId: '2f31-88ad',
    clinic: 'Harbor Pediatrics',
    provider: 'Dr. Lisa Chang',
    chiefComplaint: 'baby screaming, pulling knees to chest every 15 min',
    aiPrimaryDiagnosis: 'Colic',
    physicianDiagnosis: 'Intussusception',
    finalConfirmedDiagnosis: 'Intussusception',
    aiAccuracyAssessment: 'PARTIAL',
    aiTopKWasRight: 3,
    createdAt: '2026-04-18T11:02:14Z',
    finalConfirmedAt: '2026-04-18T13:40:00Z',
  },
  {
    requestId: '5d03-7c11',
    clinic: 'Reed Family Medicine',
    provider: 'Dr. Sarah Kim',
    chiefComplaint: 'tingling hands, cant breathe, mouth numb',
    aiPrimaryDiagnosis: 'Carpal Tunnel Syndrome',
    physicianDiagnosis: 'Hyperventilation syndrome',
    finalConfirmedDiagnosis: 'Hyperventilation syndrome, panic attack',
    aiAccuracyAssessment: 'REFUTED',
    aiTopKWasRight: 0,
    createdAt: '2026-04-18T10:44:09Z',
    finalConfirmedAt: '2026-04-18T12:15:42Z',
  },
  {
    requestId: 'a88f-9021',
    clinic: 'Coastal Urgent Care',
    provider: 'Dr. Alex Chen',
    chiefComplaint: 'sudden severe abdominal pain, bloody stool, post-op',
    aiPrimaryDiagnosis: 'Mesenteric Ischemia',
    physicianDiagnosis: 'Mesenteric ischemia',
    finalConfirmedDiagnosis: null,
    aiAccuracyAssessment: 'PENDING',
    aiTopKWasRight: null,
    createdAt: '2026-04-18T15:38:11Z',
    finalConfirmedAt: null,
  },
];

const MOCK_MISSES: MissGroup[] = [
  { chiefComplaintCategory: 'respiratory', confirmedDiagnosis: 'Hyperventilation syndrome', missCount: 3, totalForCategory: 48, exampleRequestIds: ['5d03-7c11', '8f22-0011', '1cc2-3388'] },
  { chiefComplaintCategory: 'abdominal_pain', confirmedDiagnosis: 'Diverticulitis', missCount: 2, totalForCategory: 62, exampleRequestIds: ['4a11-bc90', '7d33-eeff'] },
  { chiefComplaintCategory: 'musculoskeletal', confirmedDiagnosis: 'Polymyalgia Rheumatica', missCount: 2, totalForCategory: 38, exampleRequestIds: ['9e22-aa01', '2b44-cc12'] },
  { chiefComplaintCategory: 'headache', confirmedDiagnosis: 'Temporal Arteritis', missCount: 1, totalForCategory: 54, exampleRequestIds: ['6f88-1a2b'] },
];

const MOCK_CLINIC_SUMMARIES: ClinicOutcomeSummary[] = [
  { clinicId: '1', clinicName: 'Reed Family Medicine', totalConfirmed: 142, top3Rate: 87.3, openTickets: 2, pendingConfirmations: 14 },
  { clinicId: '2', clinicName: 'Coastal Urgent Care', totalConfirmed: 218, top3Rate: 84.9, openTickets: 3, pendingConfirmations: 22 },
  { clinicId: '3', clinicName: 'Harbor Pediatrics', totalConfirmed: 52, top3Rate: 80.8, openTickets: 1, pendingConfirmations: 6 },
];

const MOCK_PROVIDER_SUMMARIES: ProviderOutcomeSummary[] = [
  { providerId: 'p1', providerName: 'Dr. Thomas Reed', clinicName: 'Reed Family Medicine', totalConfirmed: 78, top1Rate: 64.1, top3Rate: 89.7, feedbackRating: 4.6 },
  { providerId: 'p2', providerName: 'Dr. Maria Santos', clinicName: 'Coastal Urgent Care', totalConfirmed: 104, top1Rate: 61.5, top3Rate: 85.6, feedbackRating: 4.4 },
  { providerId: 'p3', providerName: 'Dr. Lisa Chang', clinicName: 'Harbor Pediatrics', totalConfirmed: 52, top1Rate: 57.7, top3Rate: 80.8, feedbackRating: 4.3 },
  { providerId: 'p4', providerName: 'Dr. Sarah Kim', clinicName: 'Reed Family Medicine', totalConfirmed: 64, top1Rate: 60.9, top3Rate: 84.4, feedbackRating: 4.5 },
  { providerId: 'p5', providerName: 'Dr. Alex Chen', clinicName: 'Coastal Urgent Care', totalConfirmed: 82, top1Rate: 63.4, top3Rate: 87.8, feedbackRating: 4.5 },
];

const MOCK_ROUTED_TICKETS: RoutedTicket[] = [
  {
    id: 'TK-1041',
    title: 'AI differential not loading for new patients',
    clinic: 'Reed Family Medicine',
    provider: 'Dr. Thomas Reed',
    severity: 'critical',
    linkedRequestIds: ['7b1a-0e25', '5d03-7c11'],
    openedAt: '2026-04-18T13:28:00Z',
  },
  {
    id: 'TK-1044',
    title: 'Engine suggests wrong dx for pediatric intussusception',
    clinic: 'Harbor Pediatrics',
    provider: 'Dr. Lisa Chang',
    severity: 'high',
    linkedRequestIds: ['2f31-88ad'],
    openedAt: '2026-04-18T14:02:11Z',
  },
  {
    id: 'TK-1039',
    title: 'Hyperventilation being routed to carpal tunnel',
    clinic: 'Reed Family Medicine',
    provider: 'Dr. Sarah Kim',
    severity: 'high',
    linkedRequestIds: ['5d03-7c11'],
    openedAt: '2026-04-18T11:18:40Z',
  },
];

// =============================================================================
// Helpers
// =============================================================================

function assessmentStyle(a: AccuracyAssessment) {
  switch (a) {
    case 'CONFIRMED':
      return { label: 'Confirmed', bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-400/30', icon: CheckCircle2 };
    case 'PARTIAL':
      return { label: 'Partial', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-400/30', icon: AlertTriangle };
    case 'REFUTED':
      return { label: 'Refuted', bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-400/30', icon: XCircle };
    case 'PENDING':
      return { label: 'Pending', bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-400/30', icon: Clock };
  }
}

function severityStyle(s: RoutedTicket['severity']) {
  switch (s) {
    case 'critical': return 'bg-rose-500/15 text-rose-300 border-rose-400/30';
    case 'high':     return 'bg-orange-500/15 text-orange-300 border-orange-400/30';
    case 'medium':   return 'bg-amber-500/15 text-amber-300 border-amber-400/30';
    case 'low':      return 'bg-slate-500/15 text-slate-300 border-slate-400/30';
  }
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// =============================================================================
// Metric card
// =============================================================================

function MetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  trend,
  accent = 'teal',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: { direction: 'up' | 'down'; value: string };
  accent?: 'teal' | 'emerald' | 'amber' | 'rose';
}) {
  const accentClasses = {
    teal: 'bg-compass-500/15 text-compass-300',
    emerald: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
    rose: 'bg-rose-500/15 text-rose-300',
  }[accent];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/60">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            {trend && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${trend.direction === 'up' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trend.value}
              </span>
            )}
          </div>
          {sublabel && <p className="mt-1 text-xs text-white/50">{sublabel}</p>}
        </div>
        <div className={`p-2 rounded-lg ${accentClasses}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function MLOutcomesPage() {
  const [metrics, setMetrics] = useState<OutcomeMetrics>(MOCK_METRICS);
  const [recent] = useState<RecentOutcome[]>(MOCK_RECENT);
  const [misses] = useState<MissGroup[]>(MOCK_MISSES);
  const [clinicSummaries] = useState<ClinicOutcomeSummary[]>(MOCK_CLINIC_SUMMARIES);
  const [providerSummaries] = useState<ProviderOutcomeSummary[]>(MOCK_PROVIDER_SUMMARIES);
  const [routedTickets] = useState<RoutedTicket[]>(MOCK_ROUTED_TICKETS);
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState(false);
  const [filterAssessment, setFilterAssessment] = useState<AccuracyAssessment | 'ALL'>('ALL');

  // Attempt to load live metrics; fall back silently to mock data if
  // organizationId isn't available or endpoint isn't wired yet.
  useEffect(() => {
    async function loadMetrics() {
      try {
        const params = new URLSearchParams({ organizationId: 'current' });
        const resp = await fetch(`/api/outcomes/metrics?${params}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (typeof data.totalConfirmed === 'number') {
          setMetrics(data);
          setLiveData(true);
        }
      } catch {
        // Fall through to mock data — no-op.
      }
    }
    loadMetrics();
  }, []);

  const filteredRecent = useMemo(
    () => (filterAssessment === 'ALL' ? recent : recent.filter(r => r.aiAccuracyAssessment === filterAssessment)),
    [recent, filterAssessment]
  );

  return (
    <>
      <Head>
        <title>ML Outcomes — COMPASS Admin</title>
      </Head>
      <CompassAdminShell title="ML Outcomes">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Brain className="w-6 h-6 text-compass-300" />
                ML Outcomes Dashboard
              </h1>
              <p className="text-sm text-white/60 mt-1">
                Real-world diagnostic accuracy across clinics and providers. Feeds the
                COMPASS engine iteration loop.
                {!liveData && <span className="ml-2 text-amber-300">(showing demo data — live /api/outcomes/metrics not yet available)</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoading(l => !l)}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm text-white transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-compass-500 hover:bg-compass-600 px-3 py-2 text-sm text-white transition">
                <Download className="w-4 h-4" />
                Export JSONL
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={Target}
              label="Top-1 accuracy"
              value={`${metrics.top1Rate}%`}
              sublabel={`${metrics.top1Hits} of ${metrics.totalConfirmed} confirmed`}
              trend={{ direction: 'up', value: '+2.4pp' }}
              accent="emerald"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Top-3 accuracy"
              value={`${metrics.top3Rate}%`}
              sublabel={`${metrics.top3Hits} of ${metrics.totalConfirmed} confirmed`}
              trend={{ direction: 'up', value: '+1.1pp' }}
              accent="teal"
            />
            <MetricCard
              icon={Activity}
              label="Top-5 accuracy"
              value={`${metrics.top5Rate}%`}
              sublabel={`${metrics.top5Hits} of ${metrics.totalConfirmed} confirmed`}
              accent="teal"
            />
            <MetricCard
              icon={XCircle}
              label="Misses"
              value={metrics.misses}
              sublabel="confirmed dx not in AI top-5"
              trend={{ direction: 'down', value: '−12%' }}
              accent="rose"
            />
          </div>

          {/* Two-col layout: clinics + providers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clinics */}
            <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-compass-300" />
                  Clinics
                </h2>
                <Link href="/clinics" className="text-xs text-compass-300 hover:text-compass-200 flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/5">
                {clinicSummaries.map(c => (
                  <div key={c.clinicId} className="px-5 py-3 hover:bg-white/[0.03] transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{c.clinicName}</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {c.totalConfirmed} confirmed · {c.pendingConfirmations} pending
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{c.top3Rate}% top-3</p>
                        {c.openTickets > 0 && (
                          <p className="text-xs text-rose-300 flex items-center justify-end gap-1 mt-0.5">
                            <Ticket className="w-3 h-3" />
                            {c.openTickets} open ticket{c.openTickets !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Providers */}
            <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-compass-300" />
                  Top providers
                </h2>
                <Link href="/settings/providers" className="text-xs text-compass-300 hover:text-compass-200 flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/5">
                {providerSummaries.slice(0, 5).map(p => (
                  <div key={p.providerId} className="px-5 py-3 hover:bg-white/[0.03] transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{p.providerName}</p>
                        <p className="text-xs text-white/50 mt-0.5">{p.clinicName} · {p.totalConfirmed} confirmed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{p.top3Rate}% top-3</p>
                        {p.feedbackRating != null && (
                          <p className="text-xs text-white/50 mt-0.5">{p.feedbackRating.toFixed(1)} / 5 rating</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent outcomes */}
          <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-compass-300" />
                Recent outcomes
              </h2>
              <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-white/50" />
                {(['ALL', 'CONFIRMED', 'PARTIAL', 'REFUTED', 'PENDING'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterAssessment(f)}
                    className={`text-xs px-2.5 py-1 rounded-full transition ${
                      filterAssessment === f
                        ? 'bg-compass-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                  <tr>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Clinic / Provider</th>
                    <th className="px-5 py-2.5">Chief complaint</th>
                    <th className="px-5 py-2.5">AI primary</th>
                    <th className="px-5 py-2.5">Physician dx</th>
                    <th className="px-5 py-2.5">Confirmed dx</th>
                    <th className="px-5 py-2.5">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecent.map(r => {
                    const style = assessmentStyle(r.aiAccuracyAssessment);
                    const StatusIcon = style.icon;
                    return (
                      <tr key={r.requestId} className="hover:bg-white/[0.03] transition">
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${style.bg} ${style.text} ${style.border}`}>
                            <StatusIcon className="w-3 h-3" />
                            {style.label}
                            {r.aiTopKWasRight && r.aiTopKWasRight > 0 && (
                              <span className="opacity-70">· top-{r.aiTopKWasRight}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-white/80">
                          <p className="text-xs text-white/50">{r.clinic}</p>
                          <p>{r.provider}</p>
                        </td>
                        <td className="px-5 py-3 text-white/80 max-w-[240px] truncate" title={r.chiefComplaint}>{r.chiefComplaint}</td>
                        <td className="px-5 py-3 text-white/90 font-medium">{r.aiPrimaryDiagnosis}</td>
                        <td className="px-5 py-3 text-white/70">{r.physicianDiagnosis ?? '—'}</td>
                        <td className="px-5 py-3 text-white/70">{r.finalConfirmedDiagnosis ?? '—'}</td>
                        <td className="px-5 py-3 text-white/50 text-xs">{timeAgo(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {filteredRecent.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-white/50 text-sm">
                        No outcomes match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-col: misses + tickets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Iteration queue (misses) */}
            <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-300" />
                    Iteration queue
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">Refuted dx grouped by CC category — fix targets for the engine.</p>
                </div>
                <span className="text-xs text-white/50">{misses.reduce((s, m) => s + m.missCount, 0)} total</span>
              </div>
              <div className="divide-y divide-white/5">
                {misses.map((m, i) => (
                  <div key={i} className="px-5 py-3 hover:bg-white/[0.03] transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{m.confirmedDiagnosis}</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          in <span className="text-compass-300">{m.chiefComplaintCategory}</span> · example:{' '}
                          <code className="bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{m.exampleRequestIds[0]}</code>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-300 border border-amber-400/30">
                          <XCircle className="w-3 h-3" />
                          {m.missCount} miss{m.missCount !== 1 ? 'es' : ''}
                        </span>
                        <p className="text-[10px] text-white/40 mt-1">of {m.totalForCategory} in category</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Routed tickets */}
            <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-rose-300" />
                    Tickets routed here
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">Clinic-reported issues linked to specific AI outputs.</p>
                </div>
                <Link href="/tickets" className="text-xs text-compass-300 hover:text-compass-200 flex items-center gap-1">
                  All tickets <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/5">
                {routedTickets.map(t => (
                  <div key={t.id} className="px-5 py-3 hover:bg-white/[0.03] transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/70">{t.id}</code>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border uppercase tracking-wider ${severityStyle(t.severity)}`}>
                            {t.severity}
                          </span>
                        </div>
                        <p className="text-sm text-white mt-1">{t.title}</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {t.clinic} · {t.provider} · {timeAgo(t.openedAt)}
                        </p>
                        {t.linkedRequestIds.length > 0 && (
                          <p className="text-[10px] text-white/40 mt-1">
                            Linked requestId{t.linkedRequestIds.length !== 1 ? 's' : ''}:{' '}
                            {t.linkedRequestIds.map(id => (
                              <code key={id} className="bg-white/5 px-1.5 py-0.5 rounded ml-1 text-white/60">{id}</code>
                            ))}
                          </p>
                        )}
                      </div>
                      <Link href={`/tickets?id=${t.id}`} className="text-compass-300 hover:text-compass-200">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer: data pipeline legend */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-compass-300" />
              How this data gets here
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs text-white/70">
              <PipelineStep n={1} icon={Brain} title="AI output" desc="/api/diagnose writes DiagnosticOutcome row with matchProvenance" />
              <PipelineStep n={2} icon={Stethoscope} title="Physician dx" desc="POST /api/outcomes action=physician-diagnosis" />
              <PipelineStep n={3} icon={FlaskConical} title="Labs + imaging" desc="POST /api/outcomes action=lab-results / imaging-results" />
              <PipelineStep n={4} icon={CheckCircle2} title="Finalize" desc="POST /api/outcomes action=finalize → computes aiAccuracyAssessment" />
              <PipelineStep n={5} icon={Download} title="Export" desc="scripts/export-training-data.mjs → JSONL for offline ML" />
            </div>
            <p className="text-[11px] text-white/50 mt-4">
              Details in <code className="bg-white/10 px-1 rounded">docs/ML-FEEDBACK-LOOP.md</code>. Live metrics require the
              Prisma migration <code className="bg-white/10 px-1 rounded">add_diagnostic_outcome</code> to be applied.
            </p>
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}

function PipelineStep({
  n,
  icon: Icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-compass-500/20 text-compass-300 flex items-center justify-center text-[10px] font-bold">
        {n}
      </div>
      <div>
        <p className="font-medium text-white flex items-center gap-1.5">
          <Icon className="w-3 h-3" />
          {title}
        </p>
        <p className="text-white/60 mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
