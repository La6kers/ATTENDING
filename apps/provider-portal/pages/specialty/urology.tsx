// ============================================================
// ATTENDING AI - Urology Specialty Landing Page
// apps/provider-portal/pages/specialty/urology.tsx
//
// PSA tracking, urodynamics, stone management, BPH scoring,
// prostate risk stratification, catheter management.
// ============================================================

import React, { useState } from 'react';
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
  SidebarCard,
  type PatientBannerData,
  type AIInsight,
  type SpecialtyMetric,
  type ActionCard,
  type SidebarRiskFactor,
  type SidebarMedication,
  type SidebarResult,
} from '../../components/specialty/SpecialtyShell';
import {
  Activity,
  TestTube,
  Scan,
  ClipboardList,
  UserPlus,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

const ACCENT = '#1A8FA8';

// ============================================================
// Mock Data
// ============================================================

const PATIENT: PatientBannerData = {
  initials: 'RH',
  name: 'Robert Henderson',
  dob: '11/08/1958',
  age: 67,
  mrn: '33891024',
  nextVisit: 'PSA Follow-up & Uroflow',
  riskLabel: 'Prostate Cancer Risk',
  riskValue: 'Intermediate',
  riskLevel: 'moderate',
};

const AI_INSIGHTS: AIInsight[] = [
  {
    type: 'alert',
    title: 'PSA Velocity Elevated',
    detail:
      'PSA increased from 4.2 to 6.8 ng/mL over 12 months (velocity 2.6 ng/mL/yr). Exceeds threshold of >0.75 ng/mL/yr. Per AUA guidelines, recommend multiparametric MRI and consider prostate biopsy.',
    confidence: '93% Confidence',
  },
  {
    type: 'recommendation',
    title: 'BPH Symptom Progression',
    detail:
      'IPSS score increased from 12 to 19 (moderate to severe). Current tamsulosin monotherapy may be insufficient. Consider adding 5-alpha reductase inhibitor (dutasteride) or surgical consultation.',
    confidence: '88% Confidence',
  },
  {
    type: 'guideline',
    title: 'Screening Compliance',
    detail:
      'Patient is due for annual DRE. Last cystoscopy was 18 months ago — consider repeat given hematuria history. Renal function stable (eGFR 62).',
    confidence: '90% Complete',
  },
];

const URO_METRICS: SpecialtyMetric[] = [
  {
    label: 'PSA',
    value: '6.8',
    unit: 'ng/mL',
    trend: 'up',
    trendLabel: 'Up from 4.2 (12 months)',
    upIsBad: true,
  },
  {
    label: 'IPSS Score',
    value: '19',
    unit: '/ 35',
    trend: 'up',
    trendLabel: 'Severe (was 12 moderate)',
    upIsBad: true,
  },
  {
    label: 'Post-Void Residual',
    value: '120',
    unit: 'mL',
    trend: 'up',
    trendLabel: 'Elevated (was 80 mL)',
    upIsBad: true,
  },
  {
    label: 'eGFR',
    value: '62',
    unit: 'mL/min',
    trend: 'stable',
    trendLabel: 'Stable CKD Stage 2',
  },
];

const ACTION_CARDS: ActionCard[] = [
  {
    icon: Scan,
    iconBg: '#1A8FA8',
    title: 'Urologic Imaging',
    description: 'Renal US, CT urogram, MRI prostate (mpMRI), voiding cystourethrogram',
  },
  {
    icon: TestTube,
    iconBg: '#25B8A9',
    title: 'Urology Labs',
    description: 'PSA (total, free), urinalysis, urine culture, 24hr urine, creatinine',
  },
  {
    icon: UserPlus,
    iconBg: '#0C3547',
    title: 'Procedure / Referral',
    description: 'Cystoscopy, urodynamics, prostate biopsy, TURP consult',
  },
  {
    icon: ClipboardList,
    iconBg: '#c8a44e',
    title: 'Prescriptions',
    description: 'Alpha-blockers, 5-ARIs, antimuscarinics, PDE5 inhibitors',
  },
];

const RISK_FACTORS: SidebarRiskFactor[] = [
  { label: 'Prostate Cancer', level: 'moderate', value: 'Intermediate' },
  { label: 'BPH Progression', level: 'high' },
  { label: 'Stone Recurrence', level: 'low' },
  { label: 'Urinary Retention', level: 'moderate' },
  { label: 'Renal Impairment', level: 'moderate', value: 'CKD 2' },
];

const MEDICATIONS: SidebarMedication[] = [
  { name: 'Tamsulosin', dose: '0.4mg daily', status: 'active' },
  { name: 'Finasteride', dose: '5mg daily', status: 'review' },
  { name: 'Oxybutynin ER', dose: '10mg daily', status: 'active' },
  { name: 'Ciprofloxacin', dose: '500mg BID (completed)', status: 'discontinued' },
];

const RECENT_RESULTS: SidebarResult[] = [
  { title: 'PSA', timeAgo: '1 week ago', detail: 'Total 6.8 ng/mL, Free PSA 12% (low ratio — suspicious)' },
  { title: 'Renal US', timeAgo: '3 months ago', detail: 'Mild bilateral hydronephrosis. No stones. Prostate 55g.' },
  { title: 'Uroflow', timeAgo: '6 months ago', detail: 'Qmax 9.2 mL/s (reduced). Voided 180 mL. PVR 80 mL.' },
];

// ============================================================
// PSA Trend Chart (urology-specific)
// ============================================================

const PSA_HISTORY = [
  { date: 'Mar 2023', value: 2.8 },
  { date: 'Sep 2023', value: 3.1 },
  { date: 'Mar 2024', value: 3.5 },
  { date: 'Sep 2024', value: 4.2 },
  { date: 'Mar 2025', value: 5.1 },
  { date: 'Mar 2026', value: 6.8 },
];

const PSATrendChart: React.FC = () => {
  const maxVal = 10;
  const chartH = 140;
  const chartW = 500;
  const padL = 40;
  const padR = 20;
  const padT = 10;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const points = PSA_HISTORY.map((p, i) => {
    const x = padL + (i / (PSA_HISTORY.length - 1)) * plotW;
    const y = padT + plotH - (p.value / maxVal) * plotH;
    return { x, y, ...p };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <BarChart3 style={{ width: 18, height: 18, color: ACCENT }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C3547', margin: 0 }}>PSA Trend (3-Year)</h3>
      </div>

      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 160 }}>
        {/* Threshold line at 4.0 */}
        <line x1={padL} y1={padT + plotH - (4 / maxVal) * plotH} x2={chartW - padR} y2={padT + plotH - (4 / maxVal) * plotH} stroke="#e07a5f" strokeWidth="1" strokeDasharray="4,4" />
        <text x={padL - 4} y={padT + plotH - (4 / maxVal) * plotH + 4} textAnchor="end" fontSize="9" fill="#e07a5f">4.0</text>

        {/* Grid lines */}
        {[0, 2, 4, 6, 8, 10].map((v) => (
          <g key={v}>
            <line x1={padL} y1={padT + plotH - (v / maxVal) * plotH} x2={chartW - padR} y2={padT + plotH - (v / maxVal) * plotH} stroke="#e2e8f0" strokeWidth="0.5" />
            <text x={padL - 4} y={padT + plotH - (v / maxVal) * plotH + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{v}</text>
          </g>
        ))}

        {/* Line */}
        <path d={pathD} stroke="#1A8FA8" strokeWidth="2.5" fill="none" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={p.value >= 4 ? '#e07a5f' : '#1A8FA8'} stroke="#FFFFFF" strokeWidth="2" />
            <text x={p.x} y={chartH - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.date.split(' ')[0]}</text>
            <text x={p.x} y={chartH - 14} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.date.split(' ')[1]}</text>
          </g>
        ))}
      </svg>

      <div
        style={{
          marginTop: 8,
          padding: '10px 14px',
          background: '#E6F7F5',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <TrendingUp style={{ width: 16, height: 16, color: '#e07a5f', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#0C3547' }}>
          <strong>AI Analysis:</strong> PSA velocity 2.6 ng/mL/yr exceeds 0.75 threshold. PSA doubling time ~18 months. Free PSA ratio 12% suggests higher malignancy risk.
        </span>
      </div>
    </div>
  );
};

// ============================================================
// Page
// ============================================================

export default function UrologyPage() {
  return (
    <ProviderShell contextBadge="Urology" currentPage="">
      <Head>
        <title>ATTENDING Urology | {PATIENT.name}</title>
      </Head>

      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)' }}>
        <SpecialtyLayout
          banner={<PatientBanner patient={PATIENT} accent={ACCENT} />}
          main={
            <>
              <AIInsightsPanel insights={AI_INSIGHTS} accent={ACCENT} />
              <MetricsGrid metrics={URO_METRICS} accent={ACCENT} />
              <PSATrendChart />
              <ActionCardsGrid actions={ACTION_CARDS} />
            </>
          }
          sidebar={
            <>
              <RiskAssessmentCard factors={RISK_FACTORS} />
              <MedicationsCard title="Urologic Medications" medications={MEDICATIONS} />
              <RecentResultsCard results={RECENT_RESULTS} />
            </>
          }
        />
      </div>

      <AIChatFAB accent={ACCENT} />
    </ProviderShell>
  );
}
