// ============================================================
// ATTENDING AI - Gynecology Specialty Landing Page
// apps/provider-portal/pages/specialty/gynecology.tsx
//
// OB/GYN workflows: prenatal tracking, cervical screening,
// menstrual cycle analysis, contraception management,
// pelvic floor assessment, fertility monitoring.
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
  Heart,
  Baby,
  TestTube,
  Scan,
  ClipboardList,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

const ACCENT = '#1A8FA8';

// ============================================================
// Mock Data
// ============================================================

const PATIENT: PatientBannerData = {
  initials: 'AW',
  name: 'Amanda Williams',
  dob: '04/12/1992',
  age: 33,
  mrn: '55102938',
  nextVisit: 'Prenatal Visit — 28 weeks',
  riskLabel: 'Pregnancy Risk',
  riskValue: 'Low-Moderate',
  riskLevel: 'moderate',
};

const AI_INSIGHTS: AIInsight[] = [
  {
    type: 'recommendation',
    title: 'Gestational Diabetes Screening',
    detail:
      'Patient is 28 weeks — recommend 1-hour glucose challenge test (GCT) per ACOG guidelines. BMI 31 and family history of DM2 place her at elevated risk. If GCT >140 mg/dL, proceed to 3-hour GTT.',
    confidence: '96% Confidence',
  },
  {
    type: 'alert',
    title: 'Blood Pressure Trending Up',
    detail:
      'BP has risen from 118/72 at 20 weeks to 134/84 today. While below preeclampsia threshold (140/90), the trajectory warrants close monitoring. Recommend urine protein:creatinine ratio and twice-weekly BP checks.',
    confidence: 'High Priority',
  },
  {
    type: 'guideline',
    title: 'Prenatal Care Checklist — 28 Weeks',
    detail:
      'Due: Rh antibody screen, CBC, GCT, Tdap vaccine (27-36 weeks). Completed: anatomy scan, quad screen, GBS pending (35-37 weeks).',
    confidence: '78% Complete',
  },
];

const GYN_METRICS: SpecialtyMetric[] = [
  {
    label: 'Gestational Age',
    value: '28w 2d',
    trend: 'stable',
    trendLabel: 'EDD: May 31, 2026',
  },
  {
    label: 'Fundal Height',
    value: '28',
    unit: 'cm',
    trend: 'stable',
    trendLabel: 'Appropriate for dates',
  },
  {
    label: 'Fetal Heart Rate',
    value: '148',
    unit: 'bpm',
    trend: 'stable',
    trendLabel: 'Normal (110-160)',
  },
  {
    label: 'Weight Gain',
    value: '+18',
    unit: 'lbs',
    trend: 'up',
    trendLabel: 'Slightly above target (+15)',
    upIsBad: true,
  },
];

const ACTION_CARDS: ActionCard[] = [
  {
    icon: Scan,
    iconBg: '#1A8FA8',
    title: 'Obstetric Imaging',
    description: 'Growth US, biophysical profile, Doppler studies, cervical length',
  },
  {
    icon: TestTube,
    iconBg: '#25B8A9',
    title: 'Prenatal Labs',
    description: 'GCT, CBC, Rh screen, urine protein, GBS culture, STI panel',
  },
  {
    icon: Calendar,
    iconBg: '#0C3547',
    title: 'Schedule / Referral',
    description: 'MFM consult, genetic counseling, L&D tour, anesthesia pre-op',
  },
  {
    icon: ClipboardList,
    iconBg: '#c8a44e',
    title: 'Prescriptions',
    description: 'Prenatal vitamins, iron supplements, anti-nausea, progesterone',
  },
];

const RISK_FACTORS: SidebarRiskFactor[] = [
  { label: 'Preeclampsia', level: 'moderate' },
  { label: 'Gestational Diabetes', level: 'moderate' },
  { label: 'Preterm Labor', level: 'low' },
  { label: 'Placental Issues', level: 'low' },
  { label: 'Genetic Risk', level: 'low', value: 'Quad screen normal' },
];

const MEDICATIONS: SidebarMedication[] = [
  { name: 'Prenatal Vitamin + DHA', dose: '1 tab daily', status: 'active' },
  { name: 'Iron Sulfate', dose: '325mg daily', status: 'active' },
  { name: 'Low-dose Aspirin', dose: '81mg daily (preeclampsia ppx)', status: 'active' },
  { name: 'Ondansetron', dose: '4mg PRN nausea', status: 'active' },
];

const RECENT_RESULTS: SidebarResult[] = [
  { title: 'Anatomy Scan (20w)', timeAgo: '8 weeks ago', detail: 'Normal anatomy. Anterior placenta. AFI normal. Cervix 3.8cm.' },
  { title: 'Quad Screen', timeAgo: '12 weeks ago', detail: 'Low risk: Trisomy 21 1:8500, Trisomy 18 1:15000, NTD negative.' },
  { title: 'CBC', timeAgo: '2 weeks ago', detail: 'Hgb 11.2 (mildly low), MCV 84, Plt 210k. Iron studies pending.' },
];

// ============================================================
// Prenatal Timeline (gyne-specific)
// ============================================================

interface PrenatalMilestone {
  week: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  detail?: string;
}

const MILESTONES: PrenatalMilestone[] = [
  { week: '8w', label: 'Dating US', status: 'completed', detail: 'EDD confirmed May 31' },
  { week: '12w', label: 'NT Scan + Labs', status: 'completed', detail: 'NT 1.2mm, low risk' },
  { week: '16w', label: 'Quad Screen', status: 'completed', detail: 'All low risk' },
  { week: '20w', label: 'Anatomy Scan', status: 'completed', detail: 'Normal anatomy' },
  { week: '24w', label: 'Viability Visit', status: 'completed', detail: 'FHR 152, fundal 24cm' },
  { week: '28w', label: 'GCT + Rh + Tdap', status: 'current', detail: 'Due today' },
  { week: '32w', label: 'Growth Scan', status: 'upcoming' },
  { week: '36w', label: 'GBS Culture + NST', status: 'upcoming' },
  { week: '38w', label: 'Cervical Check', status: 'upcoming' },
  { week: '40w', label: 'EDD', status: 'upcoming' },
];

const PrenatalTimeline: React.FC = () => (
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
      <Baby style={{ width: 18, height: 18, color: ACCENT }} />
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C3547', margin: 0 }}>Prenatal Care Timeline</h3>
    </div>

    <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', gap: 0, paddingBottom: 8 }}>
      {MILESTONES.map((m, i) => {
        const statusColor =
          m.status === 'completed' ? '#059669' : m.status === 'current' ? '#1A8FA8' : '#cbd5e1';
        const StatusIcon = m.status === 'completed' ? CheckCircle : m.status === 'current' ? AlertTriangle : Calendar;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 80,
              position: 'relative',
              flex: '1 0 80px',
            }}
          >
            {/* Connector line */}
            {i > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 11,
                  right: '50%',
                  width: '100%',
                  height: 2,
                  background: m.status === 'upcoming' ? '#e2e8f0' : '#1A8FA8',
                  zIndex: 0,
                }}
              />
            )}

            {/* Node */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: m.status === 'current' ? '#1A8FA8' : statusColor === '#059669' ? '#dcfce7' : '#f1f5f9',
                border: `2px solid ${statusColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                position: 'relative',
              }}
            >
              {m.status === 'completed' && <CheckCircle style={{ width: 12, height: 12, color: '#059669' }} />}
              {m.status === 'current' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: 11,
                fontWeight: m.status === 'current' ? 700 : 500,
                color: m.status === 'upcoming' ? '#94a3b8' : '#0C3547',
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              {m.week}
            </span>
            <span
              style={{
                fontSize: 10,
                color: m.status === 'upcoming' ? '#cbd5e1' : '#64748b',
                textAlign: 'center',
                maxWidth: 70,
                lineHeight: 1.3,
              }}
            >
              {m.label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

// ============================================================
// Page
// ============================================================

export default function GynecologyPage() {
  return (
    <ProviderShell contextBadge="OB/GYN" currentPage="">
      <Head>
        <title>ATTENDING OB/GYN | {PATIENT.name}</title>
      </Head>

      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)' }}>
        <SpecialtyLayout
          banner={<PatientBanner patient={PATIENT} accent={ACCENT} />}
          main={
            <>
              <AIInsightsPanel insights={AI_INSIGHTS} accent={ACCENT} />
              <MetricsGrid metrics={GYN_METRICS} accent={ACCENT} />
              <PrenatalTimeline />
              <ActionCardsGrid actions={ACTION_CARDS} />
            </>
          }
          sidebar={
            <>
              <RiskAssessmentCard factors={RISK_FACTORS} />
              <MedicationsCard title="Prenatal Medications" medications={MEDICATIONS} />
              <RecentResultsCard results={RECENT_RESULTS} />
            </>
          }
        />
      </div>

      <AIChatFAB accent={ACCENT} />
    </ProviderShell>
  );
}
