// ============================================================
// ATTENDING AI - Specialty Environment Shell
// apps/provider-portal/components/specialty/SpecialtyShell.tsx
//
// Reusable layout for all subspecialty landing pages.
// Provides: patient banner, two-column grid, AI insights panel,
// metrics grid, action cards, right sidebar.
//
// Each specialty page composes these building blocks with
// specialty-specific data and accent color.
// ============================================================

import React from 'react';
import {
  Heart,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ChevronRight,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

// ============================================================
// Brand Colors
// ============================================================

const BRAND = {
  navy: '#0C3547',
  teal: '#1A8FA8',
  tealAccent: '#25B8A9',
  tealLight: '#E6F7F5',
  gold: '#c8a44e',
  coral: '#e07a5f',
  white: '#FFFFFF',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray900: '#0f172a',
};

// ============================================================
// Types
// ============================================================

export interface SpecialtyConfig {
  /** Specialty name — e.g. "Cardiology", "Dermatology" */
  name: string;
  /** Accent color for this specialty (used on borders, badges, gradients) */
  accent: string;
  /** Lighter version of accent for backgrounds */
  accentLight: string;
  /** Icon for the specialty */
  icon: LucideIcon;
}

export interface PatientBannerData {
  initials: string;
  name: string;
  dob: string;
  age: number;
  mrn: string;
  nextVisit: string;
  riskLabel: string;
  riskValue: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

export interface AIInsight {
  type: 'recommendation' | 'alert' | 'guideline' | 'info';
  title: string;
  detail: string;
  confidence?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface SpecialtyMetric {
  label: string;
  value: string;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  /** Whether "up" is bad (e.g. LDL going up) or good (e.g. EF going up) */
  upIsBad?: boolean;
}

export interface ActionCard {
  icon: LucideIcon;
  iconBg: string;
  title: string;
  description: string;
  onClick?: () => void;
}

export interface SidebarRiskFactor {
  label: string;
  level: 'low' | 'moderate' | 'high';
  value?: string;
}

export interface SidebarMedication {
  name: string;
  dose: string;
  status: 'active' | 'review' | 'hold' | 'discontinued';
}

export interface SidebarResult {
  title: string;
  timeAgo: string;
  detail: string;
}

// ============================================================
// Patient Banner
// ============================================================

export const PatientBanner: React.FC<{
  patient: PatientBannerData;
  accent: string;
}> = ({ patient, accent }) => {
  const riskColors = {
    low: { bg: '#dcfce7', text: '#059669' },
    moderate: { bg: '#fef3c7', text: '#92400e' },
    high: { bg: '#fee2e2', text: '#dc2626' },
    critical: { bg: '#fecaca', text: '#991b1b' },
  };
  const rc = riskColors[patient.riskLevel];

  return (
    <div
      style={{
        background: BRAND.white,
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        gridColumn: '1 / -1',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${accent}, ${BRAND.navy})`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: BRAND.white,
              fontSize: 22,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {patient.initials}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND.navy, margin: 0 }}>{patient.name}</h2>
            <div style={{ display: 'flex', gap: 16, color: BRAND.gray500, fontSize: 14, marginTop: 4, flexWrap: 'wrap' }}>
              <span>DOB: {patient.dob} (Age {patient.age})</span>
              <span>MRN: {patient.mrn}</span>
              <span>Next: {patient.nextVisit}</span>
            </div>
          </div>
        </div>
        <div
          style={{
            background: rc.bg,
            color: rc.text,
            padding: '8px 16px',
            borderRadius: 20,
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap',
          }}
        >
          {patient.riskLabel}: {patient.riskValue}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// AI Clinical Insights Panel
// ============================================================

export const AIInsightsPanel: React.FC<{
  insights: AIInsight[];
  accent: string;
}> = ({ insights, accent }) => {
  const typeIcons: Record<AIInsight['type'], string> = {
    recommendation: '\u{1F3AF}',
    alert: '\u26A0\uFE0F',
    guideline: '\u{1F4CA}',
    info: '\u{2139}\uFE0F',
  };

  return (
    <div
      style={{
        background: BRAND.white,
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${accent}`,
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: `linear-gradient(135deg, ${accent}, ${BRAND.navy})`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles style={{ width: 18, height: 18, color: BRAND.white }} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy, margin: 0 }}>AI Clinical Decision Support</h3>
      </div>

      {insights.map((insight, i) => (
        <div
          key={i}
          style={{
            background: BRAND.tealLight,
            border: `1px solid rgba(26,143,168,0.2)`,
            borderRadius: 12,
            padding: 16,
            marginBottom: i < insights.length - 1 ? 12 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong style={{ color: BRAND.navy }}>
              {typeIcons[insight.type]} {insight.title}
            </strong>
            {insight.confidence && (
              <span
                style={{
                  background: accent,
                  color: BRAND.white,
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {insight.confidence}
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: BRAND.gray700, fontSize: 14, lineHeight: 1.5 }}>{insight.detail}</p>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// Specialty Metrics Grid
// ============================================================

export const MetricsGrid: React.FC<{
  metrics: SpecialtyMetric[];
  accent: string;
}> = ({ metrics, accent }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16,
      marginBottom: 24,
    }}
  >
    {metrics.map((m, i) => {
      const trendUp = m.trend === 'up';
      const trendDown = m.trend === 'down';
      const isGood = trendUp ? !m.upIsBad : trendDown ? m.upIsBad : true;
      const trendColor = m.trend === 'stable' ? BRAND.gray500 : isGood ? '#059669' : BRAND.coral;
      const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;

      return (
        <div
          key={i}
          style={{
            background: BRAND.white,
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            borderLeft: `4px solid ${accent}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: BRAND.gray500, fontWeight: 500 }}>{m.label}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: BRAND.navy }}>
            {m.value}
            {m.unit && <span style={{ fontSize: 14, fontWeight: 400, color: BRAND.gray500, marginLeft: 4 }}>{m.unit}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginTop: 8, color: trendColor }}>
            <TrendIcon style={{ width: 14, height: 14 }} />
            <span>{m.trendLabel}</span>
          </div>
        </div>
      );
    })}
  </div>
);

// ============================================================
// Action Cards Grid
// ============================================================

export const ActionCardsGrid: React.FC<{
  actions: ActionCard[];
}> = ({ actions }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: 16,
      marginBottom: 24,
    }}
  >
    {actions.map((a, i) => {
      const Icon = a.icon;
      return (
        <div
          key={i}
          onClick={a.onClick}
          style={{
            background: BRAND.white,
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: a.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon style={{ width: 20, height: 20, color: BRAND.white }} />
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, margin: 0 }}>{a.title}</h4>
          </div>
          <p style={{ margin: 0, color: BRAND.gray500, fontSize: 13, lineHeight: 1.5 }}>{a.description}</p>
        </div>
      );
    })}
  </div>
);

// ============================================================
// Sidebar Card — Risk Factors
// ============================================================

export const RiskAssessmentCard: React.FC<{
  factors: SidebarRiskFactor[];
}> = ({ factors }) => {
  const levelStyles = {
    low: { bg: '#dcfce7', color: '#059669' },
    moderate: { bg: '#fef3c7', color: '#d97706' },
    high: { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <SidebarCard title="Risk Assessment" icon={AlertTriangle}>
      {factors.map((f, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: i < factors.length - 1 ? `1px solid ${BRAND.gray100}` : 'none',
          }}
        >
          <span style={{ fontSize: 14, color: BRAND.gray700 }}>{f.label}</span>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: levelStyles[f.level].bg,
              color: levelStyles[f.level].color,
            }}
          >
            {f.value || f.level.charAt(0).toUpperCase() + f.level.slice(1)}
          </span>
        </div>
      ))}
    </SidebarCard>
  );
};

// ============================================================
// Sidebar Card — Medications
// ============================================================

export const MedicationsCard: React.FC<{
  title?: string;
  medications: SidebarMedication[];
}> = ({ title = 'Current Medications', medications }) => {
  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#dcfce7', color: '#059669', label: 'Active' },
    review: { bg: '#fef3c7', color: '#d97706', label: 'Review' },
    hold: { bg: '#fef3c7', color: '#d97706', label: 'Hold' },
    discontinued: { bg: '#fee2e2', color: '#dc2626', label: 'D/C' },
  };

  return (
    <SidebarCard title={title} icon={Activity}>
      {medications.map((med, i) => {
        const s = statusStyles[med.status] || statusStyles.active;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < medications.length - 1 ? `1px solid ${BRAND.gray100}` : 'none',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: BRAND.navy, fontSize: 14 }}>{med.name}</div>
              <div style={{ fontSize: 12, color: BRAND.gray500 }}>{med.dose}</div>
            </div>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                background: s.bg,
                color: s.color,
              }}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </SidebarCard>
  );
};

// ============================================================
// Sidebar Card — Recent Results
// ============================================================

export const RecentResultsCard: React.FC<{
  results: SidebarResult[];
}> = ({ results }) => (
  <SidebarCard title="Recent Results" icon={TrendingUp}>
    {results.map((r, i) => (
      <div key={i} style={{ marginBottom: i < results.length - 1 ? 14 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong style={{ fontSize: 14, color: BRAND.navy }}>{r.title}</strong>
          <span style={{ fontSize: 12, color: BRAND.gray400 }}>{r.timeAgo}</span>
        </div>
        <span style={{ fontSize: 13, color: BRAND.gray500, lineHeight: 1.4 }}>{r.detail}</span>
      </div>
    ))}
  </SidebarCard>
);

// ============================================================
// Generic Sidebar Card wrapper
// ============================================================

export const SidebarCard: React.FC<{
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div
    style={{
      background: BRAND.white,
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingBottom: 10,
        borderBottom: `1px solid ${BRAND.gray200}`,
      }}
    >
      <Icon style={{ width: 18, height: 18, color: BRAND.teal }} />
      <h4 style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, margin: 0 }}>{title}</h4>
    </div>
    {children}
  </div>
);

// ============================================================
// Two-Column Specialty Layout
// ============================================================

export const SpecialtyLayout: React.FC<{
  banner: React.ReactNode;
  main: React.ReactNode;
  sidebar: React.ReactNode;
}> = ({ banner, main, sidebar }) => (
  <div
    style={{
      maxWidth: 1600,
      margin: '0 auto',
      padding: 24,
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: 24,
    }}
    className="specialty-layout"
  >
    {banner}
    <div>{main}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>{sidebar}</div>

    <style jsx>{`
      @media (max-width: 1280px) {
        .specialty-layout {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  </div>
);

// ============================================================
// AI Chat FAB
// ============================================================

export const AIChatFAB: React.FC<{
  accent: string;
  onClick?: () => void;
}> = ({ accent, onClick }) => (
  <button
    onClick={onClick}
    style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      background: `linear-gradient(135deg, ${accent}, ${BRAND.navy})`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: BRAND.white,
      cursor: 'pointer',
      boxShadow: `0 4px 20px rgba(12, 53, 71, 0.3)`,
      border: 'none',
      zIndex: 1000,
      transition: 'transform 0.2s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    aria-label="AI Assistant"
  >
    <MessageSquare style={{ width: 24, height: 24 }} />
  </button>
);
