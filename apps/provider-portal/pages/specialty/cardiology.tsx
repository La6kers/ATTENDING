// ============================================================
// ATTENDING AI - Cardiology Specialty Landing Page
// apps/provider-portal/pages/specialty/cardiology.tsx
//
// Subspecialty environment for cardiology providers.
// Shows cardiac-specific metrics, AI insights, EKG preview,
// risk stratification, and specialty action cards.
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
  Scan,
  TestTube,
  UserPlus,
  ClipboardList,
  Zap,
} from 'lucide-react';

// ============================================================
// Cardiology accent — teal-shifted (not red, stays on brand)
// ============================================================

const CARDIO_ACCENT = '#1A8FA8';
const CARDIO_ACCENT_LIGHT = '#E6F7F5';

// ============================================================
// Mock Patient Data (would come from ClinicEnvironment + API)
// ============================================================

const PATIENT: PatientBannerData = {
  initials: 'MJ',
  name: 'Michael Johnson',
  dob: '03/15/1962',
  age: 63,
  mrn: '78932145',
  nextVisit: 'Follow-up - Cardiac Cath',
  riskLabel: 'ASCVD Risk',
  riskValue: '15.2% (Moderate)',
  riskLevel: 'moderate',
};

const AI_INSIGHTS: AIInsight[] = [
  {
    type: 'recommendation',
    title: 'Primary Recommendation',
    detail:
      'Consider stress testing — Patient\'s chest pain characteristics, family history of CAD, and elevated cholesterol suggest intermediate pre-test probability (45%) for obstructive CAD.',
    confidence: '94% Confidence',
  },
  {
    type: 'alert',
    title: 'Drug Interaction Alert',
    detail:
      'Simvastatin + Amiodarone: Increased risk of myopathy. Consider switching to rosuvastatin or reducing simvastatin dose to 20mg.',
    confidence: 'High Priority',
  },
  {
    type: 'guideline',
    title: 'Guideline Adherence',
    detail:
      'Missing: ACE inhibitor for secondary prevention post-MI. Consider lisinopril 5mg daily if BP and renal function stable.',
    confidence: '85% Complete',
  },
];

const CARDIAC_METRICS: SpecialtyMetric[] = [
  {
    label: 'Ejection Fraction',
    value: '52',
    unit: '%',
    trend: 'stable',
    trendLabel: 'Stable from 2 months ago',
  },
  {
    label: 'BNP',
    value: '245',
    unit: 'pg/mL',
    trend: 'down',
    trendLabel: 'Down 18% from last visit',
    upIsBad: true,
  },
  {
    label: 'LDL-C',
    value: '95',
    unit: 'mg/dL',
    trend: 'up',
    trendLabel: 'Above goal (<70)',
    upIsBad: true,
  },
  {
    label: 'Blood Pressure',
    value: '128/82',
    unit: 'mmHg',
    trend: 'stable',
    trendLabel: 'At target',
  },
];

const ACTION_CARDS: ActionCard[] = [
  {
    icon: Scan,
    iconBg: '#1A8FA8',
    title: 'Cardiac Imaging',
    description: 'Order echo, stress test, cardiac catheterization, CT angiography',
  },
  {
    icon: TestTube,
    iconBg: '#25B8A9',
    title: 'Cardiac Labs',
    description: 'Troponin, BNP, lipid panel, HbA1c, CRP, D-Dimer',
  },
  {
    icon: UserPlus,
    iconBg: '#0C3547',
    title: 'Specialist Referral',
    description: 'EP, cardiac surgery, interventional cardiology',
  },
  {
    icon: ClipboardList,
    iconBg: '#c8a44e',
    title: 'Prescriptions',
    description: 'Heart failure, CAD, arrhythmia medications',
  },
];

const RISK_FACTORS: SidebarRiskFactor[] = [
  { label: 'CAD Risk', level: 'moderate' },
  { label: 'HF Risk', level: 'low' },
  { label: 'Arrhythmia Risk', level: 'high' },
  { label: 'Bleeding Risk', level: 'low' },
  { label: 'Stroke Risk (CHA2DS2)', level: 'moderate', value: '4 Points' },
];

const MEDICATIONS: SidebarMedication[] = [
  { name: 'Metoprolol XL', dose: '50mg daily', status: 'active' },
  { name: 'Simvastatin', dose: '40mg evening', status: 'review' },
  { name: 'Aspirin', dose: '81mg daily', status: 'active' },
  { name: 'Lisinopril', dose: '10mg daily', status: 'active' },
];

const RECENT_RESULTS: SidebarResult[] = [
  { title: 'Echo', timeAgo: '2 weeks ago', detail: 'EF 52%, mild LVH, no wall motion abnormalities' },
  { title: 'Lipid Panel', timeAgo: '1 month ago', detail: 'TC 185, LDL 95, HDL 42, TG 145' },
  { title: 'Stress Test', timeAgo: '3 months ago', detail: 'Negative for ischemia, 8.5 METs achieved' },
];

// ============================================================
// EKG Preview Component (cardiology-specific)
// ============================================================

const EKGPreview: React.FC = () => {
  const [showComparison, setShowComparison] = useState(false);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap style={{ width: 18, height: 18, color: CARDIO_ACCENT }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C3547', margin: 0 }}>
            Latest ECG — Normal Sinus Rhythm
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            View Full 12-Lead
          </button>
          <button
            onClick={() => setShowComparison(!showComparison)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: CARDIO_ACCENT,
              color: '#FFFFFF',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Compare Previous
          </button>
        </div>
      </div>

      {/* EKG Waveform Display */}
      <div
        style={{
          height: 120,
          background: '#0C3547',
          borderRadius: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage:
              'linear-gradient(to right, rgba(26,143,168,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,143,168,0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Major grid lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage:
              'linear-gradient(to right, rgba(26,143,168,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,143,168,0.3) 1px, transparent 1px)',
            backgroundSize: '100px 60px',
          }}
        />
        {/* EKG Trace */}
        <svg
          viewBox="0 0 800 120"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 L50,60 L55,20 L60,100 L65,40 L70,60 L120,60 L125,20 L130,100 L135,40 L140,60 L190,60 L195,20 L200,100 L205,40 L210,60 L260,60 L265,20 L270,100 L275,40 L280,60 L330,60 L335,20 L340,100 L345,40 L350,60 L400,60 L405,20 L410,100 L415,40 L420,60 L470,60 L475,20 L480,100 L485,40 L490,60 L540,60 L545,20 L550,100 L555,40 L560,60 L610,60 L615,20 L620,100 L625,40 L630,60 L680,60 L685,20 L690,100 L695,40 L700,60 L750,60 L755,20 L760,100 L765,40 L770,60 L800,60"
            stroke="#25B8A9"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        {/* Rate label */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            color: '#25B8A9',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          HR: 72 bpm
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 12,
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        >
          Lead II &middot; 25mm/s &middot; 10mm/mV
        </div>
      </div>

      {/* ECG Interpretation Summary */}
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
        <Heart style={{ width: 16, height: 16, color: CARDIO_ACCENT, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#0C3547' }}>
          <strong>AI Interpretation:</strong> Normal sinus rhythm, rate 72 bpm. Normal axis. No ST-T changes. PR 160ms, QRS 88ms, QTc 420ms.
        </span>
      </div>
    </div>
  );
};

// ============================================================
// Cardiology Page
// ============================================================

export default function CardiologyPage() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <ProviderShell contextBadge="Cardiology" currentPage="">
      <Head>
        <title>ATTENDING Cardiology | {PATIENT.name}</title>
      </Head>

      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)' }}>
        <SpecialtyLayout
          banner={<PatientBanner patient={PATIENT} accent={CARDIO_ACCENT} />}
          main={
            <>
              <AIInsightsPanel insights={AI_INSIGHTS} accent={CARDIO_ACCENT} />
              <MetricsGrid metrics={CARDIAC_METRICS} accent={CARDIO_ACCENT} />
              <EKGPreview />
              <ActionCardsGrid actions={ACTION_CARDS} />
            </>
          }
          sidebar={
            <>
              <RiskAssessmentCard factors={RISK_FACTORS} />
              <MedicationsCard title="Cardiac Medications" medications={MEDICATIONS} />
              <RecentResultsCard results={RECENT_RESULTS} />
            </>
          }
        />
      </div>

      <AIChatFAB accent={CARDIO_ACCENT} onClick={() => setChatOpen(!chatOpen)} />
    </ProviderShell>
  );
}
