// ============================================================
// ATTENDING AI - Endocrinology Specialty Landing Page
// apps/provider-portal/pages/specialty/endocrinology.tsx
//
// Diabetes management, thyroid monitoring, hormonal panels,
// glucose trend analysis, insulin adjustment, A1c tracking.
// ============================================================

import React from 'react';
import Head from 'next/head';
import ProviderShell from '../../components/layout/ProviderShell';
import {
  SpecialtyLayout,
  PatientBanner,
  AIInsightsPanel,
  MetricsGrid,
  ActionCardsGrid,
  RiskAssessmentCard,
  MedicationsCard,
  RecentResultsCard,
  AIChatFAB,
  type PatientBannerData,
  type AIInsight,
  type SpecialtyMetric,
  type ActionCard,
  type SidebarRiskFactor,
  type SidebarMedication,
  type SidebarResult,
} from '../../components/specialty/SpecialtyShell';
import {
  TestTube,
  Scan,
  ClipboardList,
  UserPlus,
  BarChart3,
  TrendingDown,
  Activity,
  AlertTriangle,
  Target,
} from 'lucide-react';

const ACCENT = '#1A8FA8';

// ============================================================
// Mock Data
// ============================================================

const PATIENT: PatientBannerData = {
  initials: 'DM',
  name: 'Diane Martinez',
  dob: '02/19/1968',
  age: 58,
  mrn: '72108453',
  nextVisit: 'Diabetes Management — Q3 Review',
  riskLabel: 'Cardiovascular Risk',
  riskValue: 'High (ASCVD 22%)',
  riskLevel: 'high',
};

const AI_INSIGHTS: AIInsight[] = [
  {
    type: 'recommendation',
    title: 'Insulin Regimen Optimization',
    detail:
      'A1c 8.4% despite max-dose metformin + glipizide. Time-in-range from CGM is 42% (target >70%). Recommend basal insulin initiation: Glargine 10 units QHS with weekly 2-unit titration to fasting BG <130.',
    confidence: '92% Confidence',
  },
  {
    type: 'alert',
    title: 'Hypoglycemia Pattern Detected',
    detail:
      'CGM shows recurring lows (< 70 mg/dL) between 2-4 AM on 4 of last 14 nights. Likely sulfonylurea-related. Consider reducing glipizide from 10mg to 5mg BID when starting basal insulin.',
    confidence: 'High Priority',
  },
  {
    type: 'guideline',
    title: 'ADA Standards of Care 2026',
    detail:
      'Missing: GLP-1 RA for cardiovascular risk reduction (ASCVD 22%). Consider semaglutide given A1c >7%, BMI 34, and established CVD risk. Also overdue for retinal exam and podiatry referral.',
    confidence: '71% Complete',
  },
];

const ENDO_METRICS: SpecialtyMetric[] = [
  {
    label: 'HbA1c',
    value: '8.4',
    unit: '%',
    trend: 'up',
    trendLabel: 'Up from 7.9% (3 months)',
    upIsBad: true,
  },
  {
    label: 'Time in Range',
    value: '42',
    unit: '%',
    trend: 'down',
    trendLabel: 'Below target (>70%)',
    upIsBad: false,
  },
  {
    label: 'TSH',
    value: '2.8',
    unit: 'mIU/L',
    trend: 'stable',
    trendLabel: 'Normal (0.4-4.0)',
  },
  {
    label: 'BMI',
    value: '34.2',
    unit: 'kg/m\u00B2',
    trend: 'stable',
    trendLabel: 'Obese Class I',
  },
];

const ACTION_CARDS: ActionCard[] = [
  {
    icon: Activity,
    iconBg: '#1A8FA8',
    title: 'CGM Review',
    description: 'Ambulatory glucose profile, time-in-range, hypo/hyper patterns',
  },
  {
    icon: TestTube,
    iconBg: '#25B8A9',
    title: 'Endocrine Labs',
    description: 'A1c, thyroid panel, cortisol, insulin levels, C-peptide, lipid panel',
  },
  {
    icon: UserPlus,
    iconBg: '#0C3547',
    title: 'Referrals',
    description: 'Ophthalmology (retinal), podiatry, diabetes education, nutrition',
  },
  {
    icon: ClipboardList,
    iconBg: '#c8a44e',
    title: 'Prescriptions',
    description: 'Insulin, GLP-1 RA, SGLT2i, metformin, thyroid replacement',
  },
];

const RISK_FACTORS: SidebarRiskFactor[] = [
  { label: 'Cardiovascular', level: 'high', value: 'ASCVD 22%' },
  { label: 'Diabetic Nephropathy', level: 'moderate', value: 'eGFR 58' },
  { label: 'Retinopathy', level: 'moderate', value: 'Overdue exam' },
  { label: 'Neuropathy', level: 'moderate' },
  { label: 'Hypoglycemia', level: 'high', value: '4 nocturnal events' },
];

const MEDICATIONS: SidebarMedication[] = [
  { name: 'Metformin', dose: '1000mg BID', status: 'active' },
  { name: 'Glipizide', dose: '10mg BID', status: 'review' },
  { name: 'Atorvastatin', dose: '40mg daily', status: 'active' },
  { name: 'Lisinopril', dose: '20mg daily', status: 'active' },
  { name: 'Levothyroxine', dose: '75mcg daily', status: 'active' },
  { name: 'Semaglutide', dose: 'Pending initiation', status: 'review' },
];

const RECENT_RESULTS: SidebarResult[] = [
  { title: 'HbA1c', timeAgo: '1 week ago', detail: '8.4% (target <7%). Up from 7.9% three months ago.' },
  { title: 'Lipid Panel', timeAgo: '1 month ago', detail: 'TC 198, LDL 112, HDL 38, TG 190. LDL above goal.' },
  { title: 'Thyroid Panel', timeAgo: '3 months ago', detail: 'TSH 2.8, Free T4 1.1. Euthyroid on current dose.' },
];

// ============================================================
// Glucose Trend / AGP Chart (endo-specific)
// ============================================================

// Simulated 24-hour ambulatory glucose profile
const GLUCOSE_BANDS = [
  { hour: 0, p10: 72, p25: 85, p50: 105, p75: 145, p90: 185 },
  { hour: 2, p10: 65, p25: 78, p50: 95, p75: 130, p90: 165 },
  { hour: 4, p10: 58, p25: 70, p50: 88, p75: 120, p90: 155 },
  { hour: 6, p10: 68, p25: 80, p50: 98, p75: 140, p90: 175 },
  { hour: 8, p10: 95, p25: 120, p50: 165, p75: 210, p90: 260 },
  { hour: 10, p10: 88, p25: 110, p50: 148, p75: 195, p90: 240 },
  { hour: 12, p10: 80, p25: 100, p50: 135, p75: 180, p90: 225 },
  { hour: 14, p10: 92, p25: 115, p50: 160, p75: 205, p90: 250 },
  { hour: 16, p10: 85, p25: 108, p50: 145, p75: 190, p90: 238 },
  { hour: 18, p10: 90, p25: 118, p50: 158, p75: 200, p90: 245 },
  { hour: 20, p10: 82, p25: 100, p50: 132, p75: 170, p90: 210 },
  { hour: 22, p10: 75, p25: 90, p50: 115, p75: 155, p90: 195 },
  { hour: 24, p10: 72, p25: 85, p50: 105, p75: 145, p90: 185 },
];

const GlucoseProfileChart: React.FC = () => {
  const chartW = 560;
  const chartH = 200;
  const padL = 40;
  const padR = 20;
  const padT = 10;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxG = 300;
  const minG = 40;
  const range = maxG - minG;

  const toX = (hour: number) => padL + (hour / 24) * plotW;
  const toY = (gl: number) => padT + plotH - ((gl - minG) / range) * plotH;

  const makePath = (key: keyof typeof GLUCOSE_BANDS[0]) =>
    GLUCOSE_BANDS.map((b, i) => `${i === 0 ? 'M' : 'L'}${toX(b.hour)},${toY(b[key] as number)}`).join(' ');

  // Fill area between p25 and p75
  const areaPath =
    GLUCOSE_BANDS.map((b, i) => `${i === 0 ? 'M' : 'L'}${toX(b.hour)},${toY(b.p75)}`).join(' ') +
    ' ' +
    [...GLUCOSE_BANDS].reverse().map((b, i) => `${i === 0 ? 'L' : 'L'}${toX(b.hour)},${toY(b.p25)}`).join(' ') +
    ' Z';

  // Fill area between p10 and p90
  const outerArea =
    GLUCOSE_BANDS.map((b, i) => `${i === 0 ? 'M' : 'L'}${toX(b.hour)},${toY(b.p90)}`).join(' ') +
    ' ' +
    [...GLUCOSE_BANDS].reverse().map((b, i) => `${i === 0 ? 'L' : 'L'}${toX(b.hour)},${toY(b.p10)}`).join(' ') +
    ' Z';

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 style={{ width: 18, height: 18, color: ACCENT }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C3547', margin: 0 }}>Ambulatory Glucose Profile (14 days)</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 20, height: 3, background: '#1A8FA8', borderRadius: 2 }} /> Median
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 14, height: 8, background: 'rgba(26,143,168,0.25)', borderRadius: 2 }} /> IQR
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 14, height: 8, background: 'rgba(26,143,168,0.1)', borderRadius: 2 }} /> 10-90th
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 220 }}>
        {/* Target range band (70-180) */}
        <rect x={padL} y={toY(180)} width={plotW} height={toY(70) - toY(180)} fill="#dcfce7" opacity="0.4" />
        <line x1={padL} y1={toY(180)} x2={chartW - padR} y2={toY(180)} stroke="#059669" strokeWidth="0.5" strokeDasharray="4,4" />
        <line x1={padL} y1={toY(70)} x2={chartW - padR} y2={toY(70)} stroke="#059669" strokeWidth="0.5" strokeDasharray="4,4" />
        <text x={padL - 4} y={toY(180) + 3} textAnchor="end" fontSize="8" fill="#059669">180</text>
        <text x={padL - 4} y={toY(70) + 3} textAnchor="end" fontSize="8" fill="#059669">70</text>

        {/* Y-axis grid */}
        {[100, 150, 200, 250].map((v) => (
          <g key={v}>
            <line x1={padL} y1={toY(v)} x2={chartW - padR} y2={toY(v)} stroke="#e2e8f0" strokeWidth="0.5" />
            <text x={padL - 4} y={toY(v) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{v}</text>
          </g>
        ))}

        {/* X-axis labels */}
        {[0, 4, 8, 12, 16, 20, 24].map((h) => (
          <text key={h} x={toX(h)} y={chartH - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {h === 0 || h === 24 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
          </text>
        ))}

        {/* 10-90th percentile band */}
        <path d={outerArea} fill="rgba(26,143,168,0.08)" />

        {/* IQR band (25-75) */}
        <path d={areaPath} fill="rgba(26,143,168,0.2)" />

        {/* Median line */}
        <path d={makePath('p50')} stroke="#1A8FA8" strokeWidth="2.5" fill="none" />

        {/* Hypo line at 54 (clinically significant) */}
        <line x1={padL} y1={toY(54)} x2={chartW - padR} y2={toY(54)} stroke="#e07a5f" strokeWidth="1" strokeDasharray="3,3" />
        <text x={chartW - padR + 4} y={toY(54) + 3} fontSize="8" fill="#e07a5f">54</text>
      </svg>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginTop: 8,
          padding: '12px 16px',
          background: '#E6F7F5',
          borderRadius: 8,
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Time in Range', value: '42%', bad: true },
          { label: 'Time Below (<70)', value: '8%', bad: true },
          { label: 'Time Above (>180)', value: '50%', bad: true },
          { label: 'GMI', value: '8.2%', bad: true },
          { label: 'CV', value: '38%', bad: true },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.bad ? '#e07a5f' : '#0C3547' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Page
// ============================================================

export default function EndocrinologyPage() {
  return (
    <ProviderShell contextBadge="Endocrinology" currentPage="">
      <Head>
        <title>ATTENDING Endocrinology | {PATIENT.name}</title>
      </Head>

      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)' }}>
        <SpecialtyLayout
          banner={<PatientBanner patient={PATIENT} accent={ACCENT} />}
          main={
            <>
              <AIInsightsPanel insights={AI_INSIGHTS} accent={ACCENT} />
              <MetricsGrid metrics={ENDO_METRICS} accent={ACCENT} />
              <GlucoseProfileChart />
              <ActionCardsGrid actions={ACTION_CARDS} />
            </>
          }
          sidebar={
            <>
              <RiskAssessmentCard factors={RISK_FACTORS} />
              <MedicationsCard title="Endocrine Medications" medications={MEDICATIONS} />
              <RecentResultsCard results={RECENT_RESULTS} />
            </>
          }
        />
      </div>

      <AIChatFAB accent={ACCENT} />
    </ProviderShell>
  );
}
