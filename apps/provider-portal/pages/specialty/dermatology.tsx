// ============================================================
// ATTENDING AI - Dermatology Specialty Landing Page
// apps/provider-portal/pages/specialty/dermatology.tsx
//
// Skin lesion analysis, dermoscopy, visual AI triage,
// body map with flagged regions, biopsy tracking.
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
  Eye,
  Camera,
  TestTube,
  Scissors,
  ClipboardList,
  FileText,
  Sun,
  AlertTriangle,
  Scan,
  MapPin,
  Clock,
} from 'lucide-react';

const ACCENT = '#1A8FA8';

// ============================================================
// Mock Data
// ============================================================

const PATIENT: PatientBannerData = {
  initials: 'RL',
  name: 'Rachel Liu',
  dob: '07/22/1985',
  age: 40,
  mrn: '45219876',
  nextVisit: 'Full-body skin exam',
  riskLabel: 'Melanoma Risk',
  riskValue: 'Elevated (Fitzpatrick I)',
  riskLevel: 'high',
};

const AI_INSIGHTS: AIInsight[] = [
  {
    type: 'alert',
    title: 'Lesion Change Detected',
    detail:
      'AI comparison of left shoulder lesion (Photo Set #3) shows 22% increase in diameter and irregular border evolution over 6 months. ABCDE score 4/5 — recommend excisional biopsy.',
    confidence: '91% Confidence',
  },
  {
    type: 'recommendation',
    title: 'Dermoscopy Pattern Analysis',
    detail:
      'Right forearm lesion shows atypical pigment network with blue-white veil on dermoscopy. Pattern consistent with dysplastic nevus vs. early melanoma. Recommend biopsy with 2mm margins.',
    confidence: '87% Confidence',
  },
  {
    type: 'guideline',
    title: 'Screening Adherence',
    detail:
      'Patient has >50 nevi and family history of melanoma. Per AAD guidelines, recommend total body photography baseline and 6-month surveillance intervals.',
    confidence: '92% Complete',
  },
];

const DERM_METRICS: SpecialtyMetric[] = [
  {
    label: 'Total Tracked Lesions',
    value: '14',
    trend: 'up',
    trendLabel: '+2 new since last visit',
    upIsBad: true,
  },
  {
    label: 'ABCDE Flagged',
    value: '3',
    trend: 'up',
    trendLabel: '1 new flag this visit',
    upIsBad: true,
  },
  {
    label: 'Biopsies Pending',
    value: '1',
    trend: 'stable',
    trendLabel: 'Awaiting path results',
  },
  {
    label: 'Last Full-Body Exam',
    value: '6 mo',
    trend: 'stable',
    trendLabel: 'Due for re-screening',
  },
];

const ACTION_CARDS: ActionCard[] = [
  {
    icon: Camera,
    iconBg: '#1A8FA8',
    title: 'Clinical Photography',
    description: 'Capture 3-view standardized photos (close-up, body part, wide context)',
  },
  {
    icon: Scan,
    iconBg: '#25B8A9',
    title: 'Dermoscopy Analysis',
    description: 'AI-assisted dermoscopy with pattern recognition and ABCDE scoring',
  },
  {
    icon: Scissors,
    iconBg: '#0C3547',
    title: 'Biopsy / Procedure',
    description: 'Shave, punch, excisional biopsy, cryotherapy, Mohs referral',
  },
  {
    icon: ClipboardList,
    iconBg: '#c8a44e',
    title: 'Prescriptions',
    description: 'Topical steroids, retinoids, antifungals, immunomodulators',
  },
];

const RISK_FACTORS: SidebarRiskFactor[] = [
  { label: 'Melanoma Risk', level: 'high' },
  { label: 'BCC/SCC Risk', level: 'moderate' },
  { label: 'UV Exposure', level: 'high', value: 'Frequent' },
  { label: 'Family Hx Melanoma', level: 'high', value: 'Mother' },
  { label: 'Immunosuppression', level: 'low' },
];

const MEDICATIONS: SidebarMedication[] = [
  { name: 'Tretinoin 0.025%', dose: 'Cream QHS to face', status: 'active' },
  { name: 'Clobetasol 0.05%', dose: 'Ointment BID x 2wk', status: 'active' },
  { name: 'Tacrolimus 0.1%', dose: 'Ointment BID to patches', status: 'active' },
  { name: 'Hydroxychloroquine', dose: '200mg BID', status: 'review' },
];

const RECENT_RESULTS: SidebarResult[] = [
  { title: 'Biopsy — L shoulder', timeAgo: '2 weeks ago', detail: 'Compound nevus, mild atypia. Clear margins.' },
  { title: 'Patch Testing', timeAgo: '1 month ago', detail: 'Positive for nickel, fragrance mix. Negative for latex.' },
  { title: 'ANA Panel', timeAgo: '3 months ago', detail: 'ANA 1:160 speckled. dsDNA negative. Consider lupus workup.' },
];

// ============================================================
// Lesion Body Map (derm-specific)
// ============================================================

interface LesionMarker {
  id: string;
  label: string;
  region: string;
  x: number;
  y: number;
  status: 'stable' | 'changed' | 'new' | 'biopsied';
}

const LESION_MARKERS: LesionMarker[] = [
  { id: 'L1', label: '#1 Nevus', region: 'L Shoulder', x: 34, y: 28, status: 'changed' },
  { id: 'L2', label: '#2 Nevus', region: 'R Forearm', x: 72, y: 45, status: 'changed' },
  { id: 'L3', label: '#3 Papule', region: 'Upper Back', x: 50, y: 22, status: 'stable' },
  { id: 'L4', label: '#4 Macule', region: 'L Shin', x: 38, y: 78, status: 'new' },
  { id: 'L5', label: '#5 Plaque', region: 'R Elbow', x: 70, y: 38, status: 'biopsied' },
];

const LesionBodyMap: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);

  const statusColors: Record<string, { fill: string; label: string }> = {
    stable: { fill: '#059669', label: 'Stable' },
    changed: { fill: '#e07a5f', label: 'Changed' },
    new: { fill: '#c8a44e', label: 'New' },
    biopsied: { fill: '#1A8FA8', label: 'Biopsied' },
  };

  const sel = LESION_MARKERS.find((m) => m.id === selected);

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
        <MapPin style={{ width: 18, height: 18, color: ACCENT }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C3547', margin: 0 }}>Lesion Body Map</h3>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Body silhouette with markers */}
        <div
          style={{
            width: 220,
            height: 360,
            background: '#f0faf9',
            borderRadius: 12,
            border: '1px solid rgba(26,143,168,0.15)',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {/* Simplified body outline */}
          <svg viewBox="0 0 100 160" style={{ width: '100%', height: '100%' }}>
            {/* Head */}
            <circle cx="50" cy="14" r="8" fill="none" stroke="#0C3547" strokeWidth="0.8" opacity="0.3" />
            {/* Torso */}
            <path d="M38,22 L38,65 L62,65 L62,22" fill="none" stroke="#0C3547" strokeWidth="0.8" opacity="0.3" />
            {/* Arms */}
            <path d="M38,26 L22,50 L20,60" fill="none" stroke="#0C3547" strokeWidth="0.8" opacity="0.3" />
            <path d="M62,26 L78,50 L80,60" fill="none" stroke="#0C3547" strokeWidth="0.8" opacity="0.3" />
            {/* Legs */}
            <path d="M42,65 L38,110 L36,140" fill="none" stroke="#0C3547" strokeWidth="0.8" opacity="0.3" />
            <path d="M58,65 L62,110 L64,140" fill="none" stroke="#0C3547" strokeWidth="0.8" opacity="0.3" />
          </svg>

          {/* Lesion markers overlaid */}
          {LESION_MARKERS.map((m) => {
            const sc = statusColors[m.status];
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(isSelected ? null : m.id)}
                style={{
                  position: 'absolute',
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: isSelected ? 20 : 14,
                  height: isSelected ? 20 : 14,
                  borderRadius: '50%',
                  background: sc.fill,
                  border: isSelected ? '3px solid #0C3547' : '2px solid #FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  transition: 'all 0.15s ease',
                  padding: 0,
                }}
                title={`${m.label} — ${m.region}`}
              />
            );
          })}
        </div>

        {/* Legend + detail */}
        <div style={{ flex: 1, minWidth: 200 }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {Object.entries(statusColors).map(([key, { fill, label }]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: fill }} />
                <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Lesion list */}
          {LESION_MARKERS.map((m) => {
            const sc = statusColors[m.status];
            return (
              <div
                key={m.id}
                onClick={() => setSelected(selected === m.id ? null : m.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 6,
                  cursor: 'pointer',
                  background: selected === m.id ? '#E6F7F5' : 'transparent',
                  border: selected === m.id ? '1px solid rgba(26,143,168,0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#0C3547' }}>{m.label}</span>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{m.region}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: `${sc.fill}18`,
                      color: sc.fill,
                    }}
                  >
                    {sc.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Page
// ============================================================

export default function DermatologyPage() {
  return (
    <ProviderShell contextBadge="Dermatology" currentPage="">
      <Head>
        <title>ATTENDING Dermatology | {PATIENT.name}</title>
      </Head>

      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)' }}>
        <SpecialtyLayout
          banner={<PatientBanner patient={PATIENT} accent={ACCENT} />}
          main={
            <>
              <AIInsightsPanel insights={AI_INSIGHTS} accent={ACCENT} />
              <MetricsGrid metrics={DERM_METRICS} accent={ACCENT} />
              <LesionBodyMap />
              <ActionCardsGrid actions={ACTION_CARDS} />
            </>
          }
          sidebar={
            <>
              <RiskAssessmentCard factors={RISK_FACTORS} />
              <MedicationsCard title="Topical & Systemic Rx" medications={MEDICATIONS} />
              <RecentResultsCard results={RECENT_RESULTS} />
            </>
          }
        />
      </div>

      <AIChatFAB accent={ACCENT} />
    </ProviderShell>
  );
}
