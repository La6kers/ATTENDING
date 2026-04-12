// ============================================================
// ATTENDING AI - Infectious Disease Specialty Landing Page
// apps/provider-portal/pages/specialty/infectious-disease.tsx
//
// Antimicrobial stewardship, culture tracking, resistance
// patterns, isolation precautions, outbreak monitoring,
// HIV/HCV viral load trends, travel medicine.
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
  Bug,
  TestTube,
  Shield,
  ClipboardList,
  UserPlus,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ThermometerSun,
} from 'lucide-react';

const ACCENT = '#1A8FA8';

// ============================================================
// Mock Data
// ============================================================

const PATIENT: PatientBannerData = {
  initials: 'TC',
  name: 'Thomas Crawford',
  dob: '08/14/1975',
  age: 50,
  mrn: '88102456',
  nextVisit: 'HIV Follow-up — Viral Load Check',
  riskLabel: 'Immune Status',
  riskValue: 'CD4 520 (Stable)',
  riskLevel: 'low',
};

const AI_INSIGHTS: AIInsight[] = [
  {
    type: 'recommendation',
    title: 'ART Regimen Optimization',
    detail:
      'Patient virally suppressed (< 20 copies/mL) x 2 years on TDF/FTC/DTG. Consider switch to TAF/FTC/BIC for improved renal and bone safety — eGFR has declined from 92 to 78 over 3 years on TDF.',
    confidence: '91% Confidence',
  },
  {
    type: 'alert',
    title: 'Resistance Mutation Detected',
    detail:
      'Historical genotype (2019) shows M184V mutation. Current regimen covers this, but if switching, avoid lamivudine/emtricitabine monotherapy backbone. Ensure NRTI backbone has high barrier to resistance.',
    confidence: 'High Priority',
  },
  {
    type: 'guideline',
    title: 'Opportunistic Infection Prophylaxis',
    detail:
      'CD4 >200 x 12 months — may discontinue TMP/SMX for PCP prophylaxis per DHHS guidelines. Continue annual TB screening. Hepatitis B immunity confirmed (anti-HBs >10).',
    confidence: '94% Complete',
  },
];

const ID_METRICS: SpecialtyMetric[] = [
  {
    label: 'HIV Viral Load',
    value: '<20',
    unit: 'copies/mL',
    trend: 'stable',
    trendLabel: 'Undetectable x 2 years',
  },
  {
    label: 'CD4 Count',
    value: '520',
    unit: 'cells/\u00B5L',
    trend: 'up',
    trendLabel: 'Up from 480 (6 months)',
  },
  {
    label: 'CD4/CD8 Ratio',
    value: '0.85',
    trend: 'up',
    trendLabel: 'Improving (was 0.72)',
  },
  {
    label: 'eGFR',
    value: '78',
    unit: 'mL/min',
    trend: 'down',
    trendLabel: 'Declining on TDF',
    upIsBad: false,
  },
];

const ACTION_CARDS: ActionCard[] = [
  {
    icon: TestTube,
    iconBg: '#1A8FA8',
    title: 'Infectious Disease Labs',
    description: 'Viral load, CD4, genotype, hepatitis panel, cultures, TB testing',
  },
  {
    icon: Shield,
    iconBg: '#25B8A9',
    title: 'Antimicrobial Stewardship',
    description: 'Antibiogram review, de-escalation recommendations, duration audits',
  },
  {
    icon: UserPlus,
    iconBg: '#0C3547',
    title: 'Referrals / Consults',
    description: 'Hepatology, oncology (screening), nephrology, travel medicine',
  },
  {
    icon: ClipboardList,
    iconBg: '#c8a44e',
    title: 'Prescriptions',
    description: 'ART regimens, prophylaxis, antimicrobials, vaccinations',
  },
];

const RISK_FACTORS: SidebarRiskFactor[] = [
  { label: 'Viral Breakthrough', level: 'low' },
  { label: 'Renal Toxicity (TDF)', level: 'moderate', value: 'eGFR 78' },
  { label: 'Metabolic Syndrome', level: 'moderate' },
  { label: 'Opportunistic Infection', level: 'low', value: 'CD4 >500' },
  { label: 'Drug Resistance', level: 'moderate', value: 'M184V hx' },
];

const MEDICATIONS: SidebarMedication[] = [
  { name: 'Tenofovir DF 300mg', dose: 'Daily', status: 'review' },
  { name: 'Emtricitabine 200mg', dose: 'Daily', status: 'active' },
  { name: 'Dolutegravir 50mg', dose: 'Daily', status: 'active' },
  { name: 'TMP/SMX DS', dose: 'Daily (PCP ppx)', status: 'review' },
  { name: 'Azithromycin 1200mg', dose: 'Weekly (MAC ppx — d/c)', status: 'discontinued' },
];

const RECENT_RESULTS: SidebarResult[] = [
  { title: 'HIV Viral Load', timeAgo: '1 month ago', detail: '<20 copies/mL. Undetectable. Continue current ART.' },
  { title: 'CD4 / CD8', timeAgo: '1 month ago', detail: 'CD4 520 (22%), CD8 612, Ratio 0.85. Immune reconstitution ongoing.' },
  { title: 'Renal Panel', timeAgo: '3 months ago', detail: 'Cr 1.1, eGFR 78 (was 85). Urine P/Cr ratio 0.08. Tubular markers pending.' },
];

// ============================================================
// Culture & Sensitivity Tracker (ID-specific)
// ============================================================

interface CultureResult {
  id: string;
  date: string;
  source: string;
  organism: string;
  status: 'final' | 'preliminary' | 'pending';
  susceptibilities?: { drug: string; result: 'S' | 'I' | 'R' }[];
}

const CULTURES: CultureResult[] = [
  {
    id: 'C1',
    date: '03/01/2026',
    source: 'Blood x2',
    organism: 'No growth (5 days)',
    status: 'final',
  },
  {
    id: 'C2',
    date: '02/15/2026',
    source: 'Urine',
    organism: 'E. coli (>100k CFU)',
    status: 'final',
    susceptibilities: [
      { drug: 'Ciprofloxacin', result: 'R' },
      { drug: 'TMP/SMX', result: 'S' },
      { drug: 'Nitrofurantoin', result: 'S' },
      { drug: 'Ceftriaxone', result: 'S' },
      { drug: 'Ampicillin', result: 'R' },
    ],
  },
  {
    id: 'C3',
    date: '03/05/2026',
    source: 'Sputum',
    organism: 'Normal flora',
    status: 'final',
  },
  {
    id: 'C4',
    date: '03/07/2026',
    source: 'Wound swab (L leg)',
    organism: 'Pending...',
    status: 'pending',
  },
];

const CultureTracker: React.FC = () => {
  const susColors: Record<string, { bg: string; color: string }> = {
    S: { bg: '#dcfce7', color: '#059669' },
    I: { bg: '#fef3c7', color: '#d97706' },
    R: { bg: '#fee2e2', color: '#dc2626' },
  };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Bug style={{ width: 18, height: 18, color: ACCENT }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C3547', margin: 0 }}>Culture & Sensitivity Tracker</h3>
      </div>

      {CULTURES.map((c, i) => {
        const statusIcon =
          c.status === 'final' ? <CheckCircle style={{ width: 14, height: 14, color: '#059669' }} /> :
          c.status === 'pending' ? <Clock style={{ width: 14, height: 14, color: '#c8a44e' }} /> :
          <AlertTriangle style={{ width: 14, height: 14, color: '#d97706' }} />;

        return (
          <div
            key={c.id}
            style={{
              padding: 16,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: i < CULTURES.length - 1 ? 10 : 0,
              background: c.status === 'pending' ? '#fefce8' : '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {statusIcon}
                <strong style={{ fontSize: 14, color: '#0C3547' }}>{c.source}</strong>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{c.date}</span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 8,
                  background: c.status === 'final' ? '#dcfce7' : c.status === 'pending' ? '#fef3c7' : '#e0f2fe',
                  color: c.status === 'final' ? '#059669' : c.status === 'pending' ? '#d97706' : '#0369a1',
                }}
              >
                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
              </span>
            </div>

            <div style={{ fontSize: 13, color: '#334155', marginBottom: c.susceptibilities ? 8 : 0 }}>
              {c.organism}
            </div>

            {c.susceptibilities && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {c.susceptibilities.map((s, j) => (
                  <span
                    key={j}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: susColors[s.result].bg,
                      color: susColors[s.result].color,
                    }}
                  >
                    {s.drug}: {s.result}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* AI interpretation */}
      <div
        style={{
          marginTop: 12,
          padding: '10px 14px',
          background: '#E6F7F5',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Shield style={{ width: 16, height: 16, color: ACCENT, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#0C3547' }}>
          <strong>Stewardship Note:</strong> E. coli UTI — fluoroquinolone-resistant. Recommend nitrofurantoin 100mg BID x 5 days (narrow spectrum, good susceptibility). Avoid empiric cipro for this patient.
        </span>
      </div>
    </div>
  );
};

// ============================================================
// Viral Load Trend (ID-specific)
// ============================================================

const VL_HISTORY = [
  { date: 'Mar 2022', vl: 45000, cd4: 280 },
  { date: 'Jun 2022', vl: 1200, cd4: 320 },
  { date: 'Sep 2022', vl: 85, cd4: 380 },
  { date: 'Dec 2022', vl: 20, cd4: 410 },
  { date: 'Jun 2023', vl: 20, cd4: 440 },
  { date: 'Dec 2023', vl: 20, cd4: 460 },
  { date: 'Jun 2024', vl: 20, cd4: 480 },
  { date: 'Dec 2024', vl: 20, cd4: 490 },
  { date: 'Jun 2025', vl: 20, cd4: 510 },
  { date: 'Mar 2026', vl: 20, cd4: 520 },
];

const ViralLoadChart: React.FC = () => {
  const chartW = 560;
  const chartH = 180;
  const padL = 50;
  const padR = 50;
  const padT = 10;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  // Log scale for VL
  const maxLogVL = Math.log10(100000);
  const minLogVL = Math.log10(10);
  const logRange = maxLogVL - minLogVL;

  // Linear for CD4
  const maxCD4 = 600;

  const toX = (i: number) => padL + (i / (VL_HISTORY.length - 1)) * plotW;
  const toYvl = (vl: number) => padT + plotH - ((Math.log10(Math.max(vl, 10)) - minLogVL) / logRange) * plotH;
  const toYcd4 = (cd4: number) => padT + plotH - (cd4 / maxCD4) * plotH;

  const vlPath = VL_HISTORY.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toYvl(p.vl)}`).join(' ');
  const cd4Path = VL_HISTORY.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toYcd4(p.cd4)}`).join(' ');

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
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C3547', margin: 0 }}>Viral Load & CD4 Trend</h3>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 3, background: '#e07a5f', borderRadius: 2 }} /> VL (log)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 3, background: '#25B8A9', borderRadius: 2 }} /> CD4
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 200 }}>
        {/* Undetectable threshold */}
        <line x1={padL} y1={toYvl(50)} x2={chartW - padR} y2={toYvl(50)} stroke="#059669" strokeWidth="0.8" strokeDasharray="4,4" />
        <text x={padL - 4} y={toYvl(50) + 3} textAnchor="end" fontSize="8" fill="#059669">50</text>

        {/* VL Y-axis labels (left, log) */}
        {[10, 100, 1000, 10000, 100000].map((v) => (
          <g key={v}>
            <line x1={padL} y1={toYvl(v)} x2={chartW - padR} y2={toYvl(v)} stroke="#e2e8f0" strokeWidth="0.3" />
            <text x={padL - 4} y={toYvl(v) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">
              {v >= 1000 ? `${v / 1000}k` : v}
            </text>
          </g>
        ))}

        {/* CD4 Y-axis labels (right) */}
        {[100, 200, 300, 400, 500].map((v) => (
          <text key={v} x={chartW - padR + 4} y={toYcd4(v) + 3} fontSize="8" fill="#25B8A9">{v}</text>
        ))}

        {/* X-axis labels */}
        {VL_HISTORY.map((p, i) => (
          i % 2 === 0 && (
            <text key={i} x={toX(i)} y={chartH - 4} textAnchor="middle" fontSize="7" fill="#94a3b8">
              {p.date}
            </text>
          )
        ))}

        {/* CD4 line */}
        <path d={cd4Path} stroke="#25B8A9" strokeWidth="2" fill="none" />

        {/* VL line */}
        <path d={vlPath} stroke="#e07a5f" strokeWidth="2.5" fill="none" />

        {/* VL points */}
        {VL_HISTORY.map((p, i) => (
          <circle key={`vl${i}`} cx={toX(i)} cy={toYvl(p.vl)} r={3} fill={p.vl <= 50 ? '#059669' : '#e07a5f'} stroke="#FFFFFF" strokeWidth="1.5" />
        ))}

        {/* CD4 points */}
        {VL_HISTORY.map((p, i) => (
          <circle key={`cd4${i}`} cx={toX(i)} cy={toYcd4(p.cd4)} r={3} fill="#25B8A9" stroke="#FFFFFF" strokeWidth="1.5" />
        ))}

        {/* ART start annotation */}
        <line x1={toX(0)} y1={padT} x2={toX(0)} y2={padT + plotH} stroke="#0C3547" strokeWidth="0.8" strokeDasharray="2,3" />
        <text x={toX(0) + 4} y={padT + 10} fontSize="8" fill="#0C3547" fontWeight="600">ART Start</text>
      </svg>
    </div>
  );
};

// ============================================================
// Page
// ============================================================

export default function InfectiousDiseasePage() {
  return (
    <ProviderShell contextBadge="Infectious Disease" currentPage="">
      <Head>
        <title>ATTENDING ID | {PATIENT.name}</title>
      </Head>

      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)' }}>
        <SpecialtyLayout
          banner={<PatientBanner patient={PATIENT} accent={ACCENT} />}
          main={
            <>
              <AIInsightsPanel insights={AI_INSIGHTS} accent={ACCENT} />
              <MetricsGrid metrics={ID_METRICS} accent={ACCENT} />
              <ViralLoadChart />
              <CultureTracker />
              <ActionCardsGrid actions={ACTION_CARDS} />
            </>
          }
          sidebar={
            <>
              <RiskAssessmentCard factors={RISK_FACTORS} />
              <MedicationsCard title="Antimicrobials & ART" medications={MEDICATIONS} />
              <RecentResultsCard results={RECENT_RESULTS} />
            </>
          }
        />
      </div>

      <AIChatFAB accent={ACCENT} />
    </ProviderShell>
  );
}
