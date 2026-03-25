// ============================================================
// ATTENDING AI - Medicare Quality Dashboard
// apps/provider-portal/components/quality-measures/MedicareQualityDashboard.tsx
//
// Admin/Billing dashboard tracking CMS quality measures,
// compliance rates, care gaps, and revenue opportunities.
// Designed for rural health clinics pursuing RHTP funding.
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Target,
  Activity,
  Heart,
  Brain,
  Eye,
  Stethoscope,
  FileText,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  Calendar,
  Send,
  ClipboardList,
} from 'lucide-react';
import { ProviderShell } from '@/components/layout/ProviderShell';

// ============================================================
// TYPES
// ============================================================

interface QualityMeasure {
  id: string;
  code: string;
  name: string;
  category: 'preventive' | 'chronic' | 'behavioral';
  description: string;
  eligible: number;
  compliant: number;
  rate: number;
  target: number;
  revenuePerGap: number;
  patientAction: string;
  icon: React.ReactNode;
}

interface CampaignSummary {
  activeCampaigns: number;
  totalSent: number;
  totalScheduled: number;
  conversionRate: number;
}

// ============================================================
// MOCK DATA
// ============================================================

const QUALITY_MEASURES: QualityMeasure[] = [
  {
    id: 'breast-cancer-screening',
    code: 'NQF-2372',
    name: 'Breast Cancer Screening',
    category: 'preventive',
    description: 'Mammography within 27 months for women 50-74',
    eligible: 284,
    compliant: 198,
    rate: 69.7,
    target: 77.0,
    revenuePerGap: 45,
    patientAction: 'Schedule mammogram',
    icon: <Heart className="w-5 h-5" />,
  },
  {
    id: 'diabetes-hba1c',
    code: 'NQF-0059',
    name: 'Diabetes: HbA1c Control',
    category: 'chronic',
    description: 'HbA1c tested in past 12 months',
    eligible: 412,
    compliant: 289,
    rate: 70.1,
    target: 80.0,
    revenuePerGap: 62,
    patientAction: 'Order A1C lab',
    icon: <Activity className="w-5 h-5" />,
  },
  {
    id: 'colorectal-screening',
    code: 'NQF-0034',
    name: 'Colorectal Cancer Screening',
    category: 'preventive',
    description: 'Appropriate screening for ages 45-75',
    eligible: 356,
    compliant: 201,
    rate: 56.5,
    target: 72.0,
    revenuePerGap: 55,
    patientAction: 'Schedule colonoscopy',
    icon: <Eye className="w-5 h-5" />,
  },
  {
    id: 'bp-control',
    code: 'NQF-0018',
    name: 'Controlling High Blood Pressure',
    category: 'chronic',
    description: 'BP < 140/90 at most recent visit',
    eligible: 523,
    compliant: 381,
    rate: 72.8,
    target: 80.0,
    revenuePerGap: 38,
    patientAction: 'Schedule BP check',
    icon: <Heart className="w-5 h-5" />,
  },
  {
    id: 'awv',
    code: 'G0438/G0439',
    name: 'Annual Wellness Visit',
    category: 'preventive',
    description: 'AWV completed within 12 months',
    eligible: 891,
    compliant: 423,
    rate: 47.5,
    target: 70.0,
    revenuePerGap: 175,
    patientAction: 'Schedule AWV',
    icon: <Stethoscope className="w-5 h-5" />,
  },
  {
    id: 'depression-screening',
    code: 'NQF-0418',
    name: 'Depression Screening (PHQ-9)',
    category: 'behavioral',
    description: 'PHQ-9 screening and follow-up plan',
    eligible: 891,
    compliant: 534,
    rate: 59.9,
    target: 75.0,
    revenuePerGap: 32,
    patientAction: 'Complete PHQ-9',
    icon: <Brain className="w-5 h-5" />,
  },
];

const CAMPAIGN_SUMMARY: CampaignSummary = {
  activeCampaigns: 3,
  totalSent: 151,
  totalScheduled: 62,
  conversionRate: 41.1,
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ComplianceBar({ rate, target }: { rate: number; target: number }) {
  const met = rate >= target;
  const barColor = met
    ? 'bg-emerald-500'
    : rate > target * 0.85
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div className="relative h-2.5 bg-gray-100 rounded-full overflow-visible">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
        style={{ width: `${Math.min(rate, 100)}%` }}
      />
      <div
        className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-gray-400 rounded-full"
        style={{ left: `${target}%` }}
        title={`Target: ${target}%`}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={`p-5 rounded-xl border ${accent ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${accent ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${accent ? 'text-teal-700' : 'text-gray-900'}`}>{value}</div>
      <div className="text-sm text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

const CATEGORY_STYLES = {
  preventive: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'Preventive' },
  chronic: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Chronic' },
  behavioral: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Behavioral' },
};

function MeasureCard({ measure }: { measure: QualityMeasure }) {
  const gap = measure.eligible - measure.compliant;
  const revenue = gap * measure.revenuePerGap;
  const met = measure.rate >= measure.target;
  const cat = CATEGORY_STYLES[measure.category];

  return (
    <div className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${met ? 'border-emerald-200' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cat.bg} ${cat.text}`}>
              {cat.label}
            </span>
            <span className="text-xs text-gray-400 font-mono">{measure.code}</span>
          </div>
          <h3 className="text-sm font-bold text-gray-900">{measure.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{measure.description}</p>
        </div>
        {met && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            MET
          </span>
        )}
      </div>

      {/* Compliance bar */}
      <ComplianceBar rate={measure.rate} target={measure.target} />
      <div className="flex justify-between mt-1.5 mb-4">
        <span className="text-xs text-gray-600">
          <span className="font-bold text-gray-900">{measure.rate}%</span> compliance
        </span>
        <span className="text-xs text-gray-400">Target: {measure.target}%</span>
      </div>

      {/* Gap stats */}
      <div className="flex gap-3">
        <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xl font-bold text-gray-900">{gap}</div>
          <div className="text-xs text-gray-500 mt-0.5">Patients with gaps</div>
        </div>
        <div className="flex-1 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="text-xl font-bold text-emerald-700">${revenue.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">Revenue opportunity</div>
        </div>
      </div>

      {/* Action */}
      {!met && (
        <Link
          href={`/patient-outreach?measure=${measure.id}`}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Send className="w-4 h-4" />
          Launch Outreach Campaign ({gap} patients)
        </Link>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function MedicareQualityDashboard() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredMeasures = useMemo(() => {
    if (categoryFilter === 'all') return QUALITY_MEASURES;
    return QUALITY_MEASURES.filter(m => m.category === categoryFilter);
  }, [categoryFilter]);

  const totalGaps = QUALITY_MEASURES.reduce((sum, m) => sum + (m.eligible - m.compliant), 0);
  const totalRevenue = QUALITY_MEASURES.reduce((sum, m) => sum + (m.eligible - m.compliant) * m.revenuePerGap, 0);
  const avgRate = (QUALITY_MEASURES.reduce((sum, m) => sum + m.rate, 0) / QUALITY_MEASURES.length).toFixed(1);
  const metCount = QUALITY_MEASURES.filter(m => m.rate >= m.target).length;

  return (
      <div className="min-h-screen bg-slate-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Medicare Quality Measures</h1>
              <p className="text-sm text-gray-500 mt-1">CMS Quality Reporting &bull; MIPS 2026 &bull; Rural Health Compliance</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/patient-outreach"
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Send className="w-4 h-4" />
                Outreach Hub
              </Link>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Avg Compliance"
              value={`${avgRate}%`}
              sub={`${metCount}/${QUALITY_MEASURES.length} measures met`}
              accent
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Open Gaps"
              value={totalGaps.toLocaleString()}
              sub="patients need action"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Revenue Opportunity"
              value={`$${totalRevenue.toLocaleString()}`}
              sub="from closing all gaps"
            />
            <StatCard
              icon={<Send className="w-5 h-5" />}
              label="Active Campaigns"
              value={CAMPAIGN_SUMMARY.activeCampaigns}
              sub={`${CAMPAIGN_SUMMARY.totalScheduled} appointments booked`}
            />
          </div>

          {/* Revenue impact banner */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-5 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Annual Wellness Visit — Largest Gap</h2>
                <p className="text-teal-100 text-sm mt-1">
                  468 Medicare patients haven&apos;t completed their AWV. At $175 each, that&apos;s{' '}
                  <span className="font-bold text-white">${(468 * 175).toLocaleString()}</span> in reachable revenue.
                  No copay for Medicare patients — the message writes itself.
                </p>
              </div>
              <Link
                href="/patient-outreach?measure=awv"
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-teal-700 rounded-lg text-sm font-bold hover:bg-teal-50 transition-colors shrink-0"
              >
                Launch AWV Campaign
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              {['all', 'preventive', 'chronic', 'behavioral'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === cat
                      ? 'bg-teal-100 text-teal-700 border border-teal-200'
                      : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {cat === 'all' ? 'All Measures' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">
              Showing {filteredMeasures.length} of {QUALITY_MEASURES.length} measures
            </span>
          </div>

          {/* Measures grid */}
          <div className="grid grid-cols-2 gap-4">
            {filteredMeasures.map(m => (
              <MeasureCard key={m.id} measure={m} />
            ))}
          </div>

          {/* Bottom context */}
          <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <ClipboardList className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">About These Measures</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Quality measures are tracked per CMS Merit-based Incentive Payment System (MIPS) requirements.
                  Compliance rates are calculated from your EHR data against eligible patient populations.
                  Gap counts represent patients who are eligible but have not met the measure criteria within the reporting period.
                  Revenue estimates are based on average reimbursement rates for your region and payer mix.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default MedicareQualityDashboard;
