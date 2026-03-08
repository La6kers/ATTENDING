// ============================================================
// ATTENDING AI - Patient Outreach Hub
// apps/provider-portal/components/patient-outreach/PatientOutreachHub.tsx
//
// Provider tools for launching outreach campaigns to close
// gaps in Medicare quality measures. Designed around the
// principle: patients get a big button, not a wall of text.
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Send,
  Mail,
  Phone,
  MessageSquare,
  Plus,
  Eye,
  ChevronRight,
  CheckCircle,
  Clock,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  Filter,
  Calendar,
  Heart,
  Activity,
  Brain,
  Stethoscope,
  ArrowRight,
  X,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ProviderShell } from '@/components/layout/ProviderShell';

// ============================================================
// TYPES
// ============================================================

interface OutreachMeasure {
  id: string;
  code: string;
  name: string;
  category: 'preventive' | 'chronic' | 'behavioral';
  gap: number;
  revenuePerGap: number;
  patientAction: string;
  patientMessage: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}

interface Campaign {
  id: number;
  name: string;
  measureId: string;
  status: 'active' | 'draft' | 'completed';
  sent: number;
  opened: number;
  clicked: number;
  scheduled: number;
  createdAt: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const MEASURES: OutreachMeasure[] = [
  {
    id: 'breast-cancer-screening',
    code: 'NQF-2372',
    name: 'Breast Cancer Screening',
    category: 'preventive',
    gap: 86,
    revenuePerGap: 45,
    patientAction: 'Schedule Your Mammogram',
    patientMessage: 'Your records show it\'s been over 2 years since your last mammogram. This quick screening can catch issues early.',
    icon: <Heart className="w-5 h-5" />,
    accentColor: 'text-rose-600',
    accentBg: 'bg-rose-50',
    accentBorder: 'border-rose-200',
  },
  {
    id: 'diabetes-hba1c',
    code: 'NQF-0059',
    name: 'Diabetes: HbA1c Control',
    category: 'chronic',
    gap: 123,
    revenuePerGap: 62,
    patientAction: 'Get Your A1C Checked',
    patientMessage: 'Your next A1C check is due. It takes just a few minutes and helps us keep your diabetes management on track.',
    icon: <Activity className="w-5 h-5" />,
    accentColor: 'text-amber-600',
    accentBg: 'bg-amber-50',
    accentBorder: 'border-amber-200',
  },
  {
    id: 'colorectal-screening',
    code: 'NQF-0034',
    name: 'Colorectal Cancer Screening',
    category: 'preventive',
    gap: 155,
    revenuePerGap: 55,
    patientAction: 'Schedule Your Screening',
    patientMessage: 'You\'re due for your colorectal screening. Early detection saves lives — and we\'ve made scheduling easy.',
    icon: <Target className="w-5 h-5" />,
    accentColor: 'text-cyan-600',
    accentBg: 'bg-cyan-50',
    accentBorder: 'border-cyan-200',
  },
  {
    id: 'bp-control',
    code: 'NQF-0018',
    name: 'Controlling High Blood Pressure',
    category: 'chronic',
    gap: 142,
    revenuePerGap: 38,
    patientAction: 'Check Your Blood Pressure',
    patientMessage: 'Time for a blood pressure check! A quick visit helps us make sure your numbers are looking good.',
    icon: <Heart className="w-5 h-5" />,
    accentColor: 'text-red-600',
    accentBg: 'bg-red-50',
    accentBorder: 'border-red-200',
  },
  {
    id: 'awv',
    code: 'G0438/G0439',
    name: 'Annual Wellness Visit',
    category: 'preventive',
    gap: 468,
    revenuePerGap: 175,
    patientAction: 'Schedule Your Annual Checkup',
    patientMessage: 'Your annual wellness visit is a great chance to review your health goals and catch anything early. No copay for Medicare patients!',
    icon: <Stethoscope className="w-5 h-5" />,
    accentColor: 'text-teal-600',
    accentBg: 'bg-teal-50',
    accentBorder: 'border-teal-200',
  },
  {
    id: 'depression-screening',
    code: 'NQF-0418',
    name: 'Depression Screening (PHQ-9)',
    category: 'behavioral',
    gap: 357,
    revenuePerGap: 32,
    patientAction: 'Complete Quick Wellness Check',
    patientMessage: 'We\'d like to check in on how you\'re feeling. This quick 2-minute survey helps us support your whole health.',
    icon: <Brain className="w-5 h-5" />,
    accentColor: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
  },
];

const CAMPAIGNS: Campaign[] = [
  { id: 1, name: 'Mammogram Reminder — Spring 2026', measureId: 'breast-cancer-screening', status: 'active', sent: 62, opened: 48, clicked: 31, scheduled: 24, createdAt: '2026-02-18' },
  { id: 2, name: 'A1C Lab Reminder — Q1', measureId: 'diabetes-hba1c', status: 'active', sent: 89, opened: 67, clicked: 42, scheduled: 38, createdAt: '2026-02-10' },
  { id: 3, name: 'AWV Outreach — Medicare Patients', measureId: 'awv', status: 'draft', sent: 0, opened: 0, clicked: 0, scheduled: 0, createdAt: '2026-03-01' },
  { id: 4, name: 'BP Follow-up — January Cohort', measureId: 'bp-control', status: 'completed', sent: 45, opened: 38, clicked: 28, scheduled: 22, createdAt: '2026-01-15' },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

function FunnelBar({ sent, opened, clicked, scheduled }: { sent: number; opened: number; clicked: number; scheduled: number }) {
  if (sent === 0) return <div className="text-xs text-gray-400 italic">No messages sent yet</div>;

  const steps = [
    { label: 'Sent', value: sent, color: 'bg-gray-400' },
    { label: 'Opened', value: opened, color: 'bg-blue-500' },
    { label: 'Clicked', value: clicked, color: 'bg-amber-500' },
    { label: 'Scheduled', value: scheduled, color: 'bg-emerald-500' },
  ];

  return (
    <div className="flex gap-1">
      {steps.map((step, i) => {
        const pct = (step.value / sent) * 100;
        return (
          <div key={i} className="flex-1 text-center">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${step.color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-lg font-bold text-gray-900">{step.value}</div>
            <div className="text-xs text-gray-500">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const measure = MEASURES.find(m => m.id === campaign.measureId);
  const statusStyles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="text-sm font-bold text-gray-900">{campaign.name}</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${statusStyles[campaign.status]}`}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {measure && <span>{measure.name}</span>}
            <span>&bull;</span>
            <span>Created {campaign.createdAt}</span>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
      </div>

      <FunnelBar
        sent={campaign.sent}
        opened={campaign.opened}
        clicked={campaign.clicked}
        scheduled={campaign.scheduled}
      />

      {campaign.sent > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Conversion rate: <span className="font-bold text-gray-900">{((campaign.scheduled / campaign.sent) * 100).toFixed(1)}%</span>
          </span>
          {campaign.status === 'active' && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {campaign.scheduled} appointments booked
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function QuickOutreachCard({ measure }: { measure: OutreachMeasure }) {
  const revenue = measure.gap * measure.revenuePerGap;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow hover:border-teal-200 cursor-pointer">
      <div className={`w-10 h-10 rounded-lg ${measure.accentBg} flex items-center justify-center ${measure.accentColor} mb-3`}>
        {measure.icon}
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-1">{measure.name}</h3>
      <p className="text-xs text-gray-500 mb-3">
        {measure.gap} patients &bull; ${revenue.toLocaleString()} revenue
      </p>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-600">
        <Send className="w-3.5 h-3.5" />
        Launch Campaign
      </div>
    </div>
  );
}

function OutreachComposer({
  measure,
  onClose,
  onPreview,
}: {
  measure: OutreachMeasure;
  onClose: () => void;
  onPreview: () => void;
}) {
  const [channel, setChannel] = useState<'email' | 'sms' | 'call'>('email');
  const [timing, setTiming] = useState<'now' | 'tomorrow' | 'schedule'>('now');

  const channels = [
    { id: 'email' as const, icon: <Mail className="w-5 h-5" />, label: 'Email', desc: 'Clickable action button' },
    { id: 'sms' as const, icon: <MessageSquare className="w-5 h-5" />, label: 'SMS', desc: 'Short link to schedule' },
    { id: 'call' as const, icon: <Phone className="w-5 h-5" />, label: 'Auto-Call', desc: 'Voice reminder' },
  ];

  const filters = [
    { label: 'Medicare only', active: true },
    { label: 'Last visit > 6 months', active: true },
    { label: 'No appointment scheduled', active: true },
    { label: 'Previously engaged', active: false },
    { label: 'High risk patients first', active: false },
    { label: 'Spanish speaking', active: false },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-auto max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">New Outreach Campaign</h2>
            <p className="text-sm text-gray-500">{measure.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Target audience */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Target Patients</div>
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">{measure.gap}</div>
                <div className="text-xs text-gray-500">patients with gaps</div>
              </div>
              <div className="border-l border-teal-200 pl-6">
                <div className="text-2xl font-bold text-emerald-600">${(measure.gap * measure.revenuePerGap).toLocaleString()}</div>
                <div className="text-xs text-gray-500">potential revenue</div>
              </div>
            </div>
          </div>

          {/* Channel */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Delivery Method</div>
            <div className="flex gap-3">
              {channels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setChannel(ch.id)}
                  className={`flex-1 p-3.5 rounded-xl border text-center transition-colors ${
                    channel === ch.id
                      ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`mx-auto mb-1.5 ${channel === ch.id ? 'text-teal-600' : 'text-gray-400'}`}>{ch.icon}</div>
                  <div className={`text-xs font-bold ${channel === ch.id ? 'text-teal-700' : 'text-gray-600'}`}>{ch.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{ch.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Smart filters */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Smart Filters</div>
            <div className="flex flex-wrap gap-2">
              {filters.map((f, i) => (
                <button
                  key={i}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    f.active
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f.active && <span className="mr-1">✓</span>}{f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Send Timing</div>
            <div className="flex gap-2">
              {[
                { id: 'now' as const, label: 'Send now' },
                { id: 'tomorrow' as const, label: 'Tomorrow 9am' },
                { id: 'schedule' as const, label: 'Schedule...' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTiming(t.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    timing === t.id
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onPreview}
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview Patient Email
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              <Zap className="w-4 h-4" />
              Launch Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientEmailPreview({
  measure,
  onClose,
}: {
  measure: OutreachMeasure;
  onClose: () => void;
}) {
  const [completed, setCompleted] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-medium">PATIENT EMAIL PREVIEW</div>
            <div className="text-xs text-gray-500">How the patient sees it</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors" aria-label="Close preview">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {!completed ? (
          <div className="px-7 py-8 text-center">
            {/* Clinic icon */}
            <div className={`w-14 h-14 rounded-2xl ${measure.accentBg} ${measure.accentColor} flex items-center justify-center mx-auto mb-5`}>
              {measure.icon}
            </div>

            <p className="text-sm text-gray-400 mb-1.5">Mountain Valley Rural Health</p>

            <h2 className="text-xl font-bold text-gray-900 leading-snug mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Hi Sarah, it&apos;s time to {measure.patientAction.toLowerCase()}
            </h2>

            <p className="text-sm text-gray-600 leading-relaxed mb-7 max-w-xs mx-auto">
              {measure.patientMessage}
            </p>

            {/* THE BIG BUTTON */}
            <button
              onClick={() => setCompleted(true)}
              className="w-full max-w-xs mx-auto block py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-lg font-bold transition-all shadow-lg shadow-teal-200 hover:shadow-xl hover:shadow-teal-200"
            >
              {measure.patientAction}
            </button>

            <p className="text-xs text-gray-400 mt-4">
              One tap. We&apos;ll find the next available time for you.
            </p>

            <div className="mt-7 pt-5 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">
              Questions? Call us at (555) 234-5678<br />
              Mountain Valley Rural Health &bull; 123 Main St, Elk Creek, CO
            </div>
          </div>
        ) : (
          /* Satisfying completion */
          <div className="px-7 py-10 text-center bg-gradient-to-b from-emerald-50 to-white">
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              You&apos;re all set!
            </h2>

            <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-xs mx-auto">
              Your appointment has been requested. We&apos;ll text you a confirmation with the date and time within 24 hours.
            </p>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">Taking care of your health — great job!</span>
            </div>

            <div className="mt-7 pt-5 border-t border-gray-100 text-xs text-gray-400">
              We&apos;ll send a reminder the day before your appointment.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function PatientOutreachHub() {
  const [selectedMeasure, setSelectedMeasure] = useState<OutreachMeasure | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCampaigns = useMemo(() => {
    if (statusFilter === 'all') return CAMPAIGNS;
    return CAMPAIGNS.filter(c => c.status === statusFilter);
  }, [statusFilter]);

  const totalScheduled = CAMPAIGNS.reduce((s, c) => s + c.scheduled, 0);
  const totalSent = CAMPAIGNS.reduce((s, c) => s + c.sent, 0);
  const overallConversion = totalSent > 0 ? ((totalScheduled / totalSent) * 100).toFixed(1) : '0';

  const handleLaunchCampaign = (measure: OutreachMeasure) => {
    setSelectedMeasure(measure);
    setShowComposer(true);
  };

  return (
    <ProviderShell>
      <div className="min-h-screen bg-slate-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Patient Outreach Hub</h1>
              <p className="text-sm text-gray-500 mt-1">
                Close gaps in care with simple, actionable campaigns. Patients get a big button — not a wall of text.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/quality-measures"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Quality Dashboard
              </Link>
              <button
                onClick={() => {
                  setSelectedMeasure(MEASURES[4]); // AWV as default
                  setShowComposer(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Send className="w-5 h-5" /></div>
                <span className="text-sm text-gray-500 font-medium">Active Campaigns</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{CAMPAIGNS.filter(c => c.status === 'active').length}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Mail className="w-5 h-5" /></div>
                <span className="text-sm text-gray-500 font-medium">Messages Sent</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{totalSent}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Calendar className="w-5 h-5" /></div>
                <span className="text-sm text-gray-500 font-medium">Appointments Booked</span>
              </div>
              <div className="text-3xl font-bold text-emerald-700">{totalScheduled}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><TrendingUp className="w-5 h-5" /></div>
                <span className="text-sm text-gray-500 font-medium">Conversion Rate</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{overallConversion}%</div>
            </div>
          </div>

          {/* Design philosophy banner */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-5 mb-6 text-white flex items-center gap-5">
            <div className="p-3 bg-white/10 rounded-xl shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold">Outreach that respects patients&apos; time</h2>
              <p className="text-teal-100 text-sm mt-1">
                Every email has one clear message and one big button. No medical jargon, no walls of text.
                Patients tap a button, get a satisfying confirmation, and you close a gap in care.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedMeasure(MEASURES[0]);
                setShowPreview(true);
              }}
              className="px-4 py-2 bg-white text-teal-700 rounded-lg text-sm font-bold hover:bg-teal-50 transition-colors shrink-0"
            >
              See Example Email
            </button>
          </div>

          {/* Campaigns section */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Campaigns</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              {['all', 'active', 'draft', 'completed'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === s
                      ? 'bg-teal-100 text-teal-700 border border-teal-200'
                      : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {filteredCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
            {filteredCampaigns.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No campaigns match this filter.
              </div>
            )}
          </div>

          {/* Quick outreach by measure */}
          <h2 className="text-base font-bold text-gray-900 mb-4">Quick Outreach by Measure</h2>
          <div className="grid grid-cols-3 gap-4">
            {MEASURES.map(m => (
              <div key={m.id} onClick={() => handleLaunchCampaign(m)}>
                <QuickOutreachCard measure={m} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showComposer && selectedMeasure && (
        <OutreachComposer
          measure={selectedMeasure}
          onClose={() => { setShowComposer(false); setSelectedMeasure(null); }}
          onPreview={() => { setShowComposer(false); setShowPreview(true); }}
        />
      )}

      {showPreview && selectedMeasure && (
        <PatientEmailPreview
          measure={selectedMeasure}
          onClose={() => { setShowPreview(false); setSelectedMeasure(null); }}
        />
      )}
    </ProviderShell>
  );
}

export default PatientOutreachHub;
