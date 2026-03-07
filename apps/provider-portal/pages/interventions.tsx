// =============================================================================
// ATTENDING AI - Clinical Interventions Hub Page
// apps/provider-portal/pages/interventions.tsx
//
// Three-tab layout:
//   1. Clinical Intelligence — existing clinical intervention modules
//   2. My Performance — provider-specific AI feedback & learning areas
//   3. Regional Intelligence — antibiogram, outbreaks, health district data
//
// Redesigned March 2026
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Brain,
  Sparkles,
  FlaskConical,
  Heart,
  Pill,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserCircle,
  BarChart3,
  MapPin,
  Bug,
  Thermometer,
  Globe,
  FileText,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Award,
  BookOpen,
  Beaker,
  Calendar,
  Percent,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Info,
} from 'lucide-react';

import { ProviderShell } from '@/components/layout/ProviderShell';

import {
  ClinicalRecommendations,
  SmartOrderAssistant,
  ClinicalTrialsMatcher,
  MedicationOptimizer,
  CareCoordinationHub,
  SDOHDashboard,
  InterventionsOverview,
} from '../components/interventions';

// =============================================================================
// Theme Colors (matching inbox/labs)
// =============================================================================

const colors = {
  panelBg: '#1A5C6B',
  panelBgAlt: '#1D6374',
  cardDark: '#145566',
  cardBg: '#FFFFFF',
  sectionBg: '#F0FAF9',
  text: '#0C3547',
  textSecondary: '#3d6b7a',
  textMuted: '#7faaab',
  border: 'rgba(26, 143, 168, 0.15)',
  accent: '#1A8FA8',
  accentLight: '#E6F7F5',
  gold: '#c8a44e',
  coral: '#e07a5f',
  headerGradient: 'linear-gradient(135deg, #145566 0%, #1A8FA8 100%)',
};

// =============================================================================
// Types
// =============================================================================

type TopTab = 'copilot' | 'performance' | 'regional';

type CopilotModule =
  | 'overview'
  | 'recommendations'
  | 'orders'
  | 'trials'
  | 'sdoh'
  | 'medications'
  | 'coordination';

interface PerformanceMetric {
  label: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
}

interface OverridePattern {
  category: string;
  overrideRate: number;
  totalSuggestions: number;
  overrides: number;
  topReason: string;
  aiAccuracy: number;
}

interface OutbreakAlert {
  id: string;
  disease: string;
  severity: 'watch' | 'advisory' | 'alert' | 'emergency';
  region: string;
  date: string;
  cases: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  source: string;
  guidance: string;
}

interface AntibiogramEntry {
  organism: string;
  antibiotics: { name: string; susceptibility: number }[];
}

// =============================================================================
// Demo Patient
// =============================================================================

const demoPatient = {
  id: 'patient-demo-001',
  name: 'Robert Anderson',
  age: 68,
  gender: 'Male',
  mrn: '12345678',
  conditions: ['Type 2 Diabetes', 'Heart Failure (HFpEF)', 'CKD Stage 3b', 'Hypertension', 'Hyperlipidemia'],
  allergies: ['Penicillin', 'Sulfa'],
  medications: ['Metformin 1000mg BID', 'Lisinopril 20mg', 'Carvedilol 12.5mg BID', 'Atorvastatin 40mg', 'Furosemide 40mg', 'Aspirin 81mg'],
};

// =============================================================================
// Copilot Module Configs
// =============================================================================

const copilotModules: { key: CopilotModule; label: string; icon: any; description: string }[] = [
  { key: 'overview', label: 'Overview', icon: Activity, description: 'Summary dashboard' },
  { key: 'recommendations', label: 'Recommendations', icon: Brain, description: 'Evidence-based guidance' },
  { key: 'orders', label: 'Smart Orders', icon: Sparkles, description: 'Natural language ordering' },
  { key: 'trials', label: 'Trial Matching', icon: FlaskConical, description: 'Clinical trial connections' },
  { key: 'sdoh', label: 'SDOH', icon: Heart, description: 'Social determinants screening' },
  { key: 'medications', label: 'Med Optimizer', icon: Pill, description: 'AI medication review' },
  { key: 'coordination', label: 'Coordination', icon: Users, description: 'Care team tasks' },
];

// =============================================================================
// Mock Performance Data
// =============================================================================

const performanceMetrics: PerformanceMetric[] = [
  { label: 'AI Recommendation Acceptance', value: 78, target: 85, unit: '%', trend: 'up', trendValue: '+4% from last month' },
  { label: 'Diagnostic Accuracy (AI-assisted)', value: 92, target: 90, unit: '%', trend: 'up', trendValue: '+2% from last quarter' },
  { label: 'Average Time to Diagnosis', value: 12, target: 15, unit: 'min', trend: 'down', trendValue: '-3 min from baseline' },
  { label: 'Preventive Care Gap Closure', value: 71, target: 80, unit: '%', trend: 'up', trendValue: '+8% this quarter' },
  { label: 'Medication Optimization Adoption', value: 65, target: 75, unit: '%', trend: 'stable', trendValue: 'No change' },
  { label: 'Patient Outcome Score', value: 88, target: 85, unit: '/100', trend: 'up', trendValue: '+3 pts from last quarter' },
];

const overridePatterns: OverridePattern[] = [
  { category: 'Antibiotic Selection', overrideRate: 42, totalSuggestions: 86, overrides: 36, topReason: 'Local resistance patterns differ from national data', aiAccuracy: 71 },
  { category: 'Lab Ordering', overrideRate: 18, totalSuggestions: 214, overrides: 39, topReason: 'Patient-specific factors not captured in model', aiAccuracy: 89 },
  { category: 'Medication Dosing', overrideRate: 12, totalSuggestions: 156, overrides: 19, topReason: 'Renal dosing adjustments', aiAccuracy: 94 },
  { category: 'Referral Timing', overrideRate: 28, totalSuggestions: 43, overrides: 12, topReason: 'Patient preference for conservative management', aiAccuracy: 82 },
  { category: 'Imaging Orders', overrideRate: 22, totalSuggestions: 67, overrides: 15, topReason: 'Recent imaging not yet in system', aiAccuracy: 85 },
  { category: 'Preventive Screening', overrideRate: 8, totalSuggestions: 112, overrides: 9, topReason: 'Patient declined', aiAccuracy: 96 },
];

const learningInsights = [
  {
    title: 'Antibiotic Selection Feedback',
    detail: 'Your override rate for antibiotic recommendations is 42%, significantly above the 15% peer average. Analysis shows 68% of your overrides align with local antibiogram data that the AI model has not yet incorporated. Your overrides are improving AI accuracy for your region.',
    action: 'The AI is learning from your patterns — antibiotic suggestions will incorporate local resistance data starting next quarter.',
    impact: 'positive',
  },
  {
    title: 'HbA1c Monitoring Frequency',
    detail: 'You order HbA1c every 2 months for newly diagnosed diabetics, while guidelines suggest every 3 months. Your patients show 12% faster time-to-target, supporting your approach.',
    action: 'Consider sharing this protocol with the diabetes care team. AI will adjust suggestions for your patient panel.',
    impact: 'positive',
  },
  {
    title: 'Statin Initiation Gap',
    detail: 'AI flagged 14 patients meeting ASCVD criteria for statin therapy who have not been started. 8 of these were deferred due to patient preference (documented). 6 may be care gaps.',
    action: 'Review the 6 unflagged patients at next visit. AI has pre-populated statin discussion templates.',
    impact: 'improvement',
  },
  {
    title: 'Imaging Utilization',
    detail: 'Your MRI ordering rate for low back pain is 34%, compared to 22% peer average. 60% of these show no actionable findings. Consider conservative management pathway for 4-6 weeks first.',
    action: 'AI will suggest a conservative pathway with red-flag screening before recommending imaging.',
    impact: 'improvement',
  },
];

// =============================================================================
// Mock Regional Data
// =============================================================================

const outbreakAlerts: OutbreakAlert[] = [
  {
    id: 'ob-1', disease: 'Influenza A (H3N2)', severity: 'advisory',
    region: 'Metro Nashville, TN', date: '2026-03-04', cases: 347,
    trend: 'increasing', source: 'TN Dept of Health',
    guidance: 'Increase index of suspicion for ILI. Rapid flu testing recommended for all patients with fever + respiratory symptoms. Consider early antiviral treatment within 48 hours of symptom onset.',
  },
  {
    id: 'ob-2', disease: 'RSV', severity: 'watch',
    region: 'Davidson County, TN', date: '2026-03-01', cases: 89,
    trend: 'stable', source: 'CDC NREVSS',
    guidance: 'Monitor pediatric and elderly patients with bronchiolitis symptoms. Consider RSV testing for hospitalized patients > 65 years.',
  },
  {
    id: 'ob-3', disease: 'Group A Streptococcus (invasive)', severity: 'alert',
    region: 'Middle Tennessee', date: '2026-02-28', cases: 12,
    trend: 'increasing', source: 'TN Dept of Health',
    guidance: 'Increased invasive GAS cases in community. Maintain high suspicion for necrotizing fasciitis in patients with rapidly progressive soft tissue infections. Low threshold for blood cultures and early surgical consultation.',
  },
  {
    id: 'ob-4', disease: 'Norovirus (GII.4)', severity: 'advisory',
    region: 'Williamson County, TN', date: '2026-03-03', cases: 156,
    trend: 'increasing', source: 'Local Health Dept',
    guidance: 'Outbreak linked to multiple facilities. Emphasize hand hygiene. Consider norovirus in all acute gastroenteritis presentations. Oral rehydration is mainstay of treatment.',
  },
  {
    id: 'ob-5', disease: 'Measles', severity: 'watch',
    region: 'Southeast US', date: '2026-02-20', cases: 8,
    trend: 'stable', source: 'CDC MMWR',
    guidance: 'Verify vaccination status for all patients. Report suspected cases immediately. Maintain isolation precautions (airborne) for any febrile rash illness pending workup.',
  },
];

const antibiogramData: AntibiogramEntry[] = [
  {
    organism: 'E. coli',
    antibiotics: [
      { name: 'Ampicillin', susceptibility: 52 },
      { name: 'Amox/Clav', susceptibility: 78 },
      { name: 'Cephalexin', susceptibility: 85 },
      { name: 'Ciprofloxacin', susceptibility: 68 },
      { name: 'Nitrofurantoin', susceptibility: 95 },
      { name: 'TMP-SMX', susceptibility: 72 },
      { name: 'Gentamicin', susceptibility: 91 },
    ],
  },
  {
    organism: 'Klebsiella pneumoniae',
    antibiotics: [
      { name: 'Ampicillin', susceptibility: 0 },
      { name: 'Amox/Clav', susceptibility: 82 },
      { name: 'Cephalexin', susceptibility: 88 },
      { name: 'Ciprofloxacin', susceptibility: 85 },
      { name: 'Nitrofurantoin', susceptibility: 45 },
      { name: 'TMP-SMX', susceptibility: 80 },
      { name: 'Gentamicin', susceptibility: 93 },
    ],
  },
  {
    organism: 'Staph aureus (MSSA)',
    antibiotics: [
      { name: 'Oxacillin', susceptibility: 100 },
      { name: 'Cephalexin', susceptibility: 98 },
      { name: 'Clindamycin', susceptibility: 88 },
      { name: 'TMP-SMX', susceptibility: 95 },
      { name: 'Doxycycline', susceptibility: 92 },
      { name: 'Vancomycin', susceptibility: 100 },
      { name: 'Linezolid', susceptibility: 100 },
    ],
  },
  {
    organism: 'Staph aureus (MRSA)',
    antibiotics: [
      { name: 'Oxacillin', susceptibility: 0 },
      { name: 'Cephalexin', susceptibility: 0 },
      { name: 'Clindamycin', susceptibility: 72 },
      { name: 'TMP-SMX', susceptibility: 95 },
      { name: 'Doxycycline', susceptibility: 93 },
      { name: 'Vancomycin', susceptibility: 100 },
      { name: 'Linezolid', susceptibility: 100 },
    ],
  },
  {
    organism: 'Strep pneumoniae',
    antibiotics: [
      { name: 'Penicillin', susceptibility: 58 },
      { name: 'Amoxicillin', susceptibility: 92 },
      { name: 'Ceftriaxone', susceptibility: 96 },
      { name: 'Azithromycin', susceptibility: 55 },
      { name: 'Levofloxacin', susceptibility: 98 },
      { name: 'Vancomycin', susceptibility: 100 },
      { name: 'Doxycycline', susceptibility: 82 },
    ],
  },
  {
    organism: 'Pseudomonas aeruginosa',
    antibiotics: [
      { name: 'Piperacillin/Tazo', susceptibility: 88 },
      { name: 'Cefepime', susceptibility: 82 },
      { name: 'Ciprofloxacin', susceptibility: 72 },
      { name: 'Gentamicin', susceptibility: 85 },
      { name: 'Meropenem', susceptibility: 90 },
      { name: 'Tobramycin', susceptibility: 88 },
      { name: 'Colistin', susceptibility: 98 },
    ],
  },
];

// =============================================================================
// Helper Components
// =============================================================================

function SusceptibilityCell({ value }: { value: number }) {
  const bg = value >= 90 ? '#dcfce7' : value >= 70 ? '#fef3c7' : value >= 50 ? '#fed7aa' : '#fecaca';
  const text = value >= 90 ? '#166534' : value >= 70 ? '#92400e' : value >= 50 ? '#9a3412' : '#991b1b';
  return (
    <td className="px-2 py-2 text-center text-xs font-bold" style={{ background: bg, color: text }}>
      {value > 0 ? `${value}%` : 'R'}
    </td>
  );
}

function SeverityBadge({ severity }: { severity: OutbreakAlert['severity'] }) {
  const config = {
    watch: { bg: '#dbeafe', text: '#1e40af', label: 'WATCH' },
    advisory: { bg: '#fef3c7', text: '#92400e', label: 'ADVISORY' },
    alert: { bg: '#fed7aa', text: '#9a3412', label: 'ALERT' },
    emergency: { bg: '#fecaca', text: '#991b1b', label: 'EMERGENCY' },
  };
  const c = config[severity];
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

function MetricCard({ metric }: { metric: PerformanceMetric }) {
  const atTarget = metric.unit === 'min'
    ? metric.value <= metric.target
    : metric.value >= metric.target;
  const pct = metric.unit === 'min'
    ? Math.min(100, (metric.target / metric.value) * 100)
    : Math.min(100, (metric.value / metric.target) * 100);

  return (
    <div className="p-4 rounded-xl" style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>{metric.label}</span>
        <div className="flex items-center gap-1">
          {metric.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
          {metric.trend === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
          {metric.trend === 'stable' && <Minus className="w-3 h-3 text-gray-400" />}
        </div>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold" style={{ color: colors.text }}>{metric.value}</span>
        <span className="text-sm" style={{ color: colors.textMuted }}>{metric.unit}</span>
        <span className="text-xs ml-auto" style={{ color: colors.textMuted }}>target: {metric.target}{metric.unit}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
        <div className="h-full rounded-full transition-all" style={{
          width: `${pct}%`,
          background: atTarget ? '#10b981' : pct > 80 ? colors.gold : colors.coral,
        }} />
      </div>
      <div className="text-[10px] mt-1.5" style={{ color: atTarget ? '#10b981' : colors.gold }}>
        {metric.trendValue}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function InterventionsPage() {
  const router = useRouter();
  const { module } = router.query;

  const [topTab, setTopTab] = useState<TopTab>('copilot');
  const [copilotModule, setCopilotModule] = useState<CopilotModule>(() => {
    if (module && typeof module === 'string') {
      const valid: CopilotModule[] = ['overview', 'recommendations', 'orders', 'trials', 'sdoh', 'medications', 'coordination'];
      if (valid.includes(module as CopilotModule)) return module as CopilotModule;
    }
    return 'overview';
  });
  const [showPatientBanner, setShowPatientBanner] = useState(true);
  const [expandedOutbreak, setExpandedOutbreak] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  React.useEffect(() => {
    if (module && typeof module === 'string') {
      const valid: CopilotModule[] = ['overview', 'recommendations', 'orders', 'trials', 'sdoh', 'medications', 'coordination'];
      if (valid.includes(module as CopilotModule)) {
        setCopilotModule(module as CopilotModule);
        setTopTab('copilot');
      }
    }
  }, [module]);

  return (
    <>
      <Head>
        <title>Clinical Intelligence | ATTENDING AI</title>
      </Head>

      <ProviderShell currentPage="interventions" contextBadge="Clinical Intelligence">
        {/* Sub-header with top tabs */}
        <div style={{ background: 'rgba(12, 53, 71, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="max-w-[1800px] mx-auto px-6">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5" style={{ color: colors.gold }} />
                <span className="text-lg font-bold text-white">Clinical Interventions Hub</span>
              </div>
              {/* Quick stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-xs text-teal-200">Active Alerts</span>
                  <span className="text-sm font-bold text-white">12</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-xs text-teal-200">AI Acceptance</span>
                  <span className="text-sm font-bold text-green-400">78%</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-xs text-teal-200">Regional Alerts</span>
                  <span className="text-sm font-bold" style={{ color: colors.coral }}>{outbreakAlerts.filter(a => a.severity === 'alert' || a.severity === 'emergency').length}</span>
                </div>
              </div>
            </div>

            {/* Top Tabs */}
            <div className="flex gap-1 pb-0">
              {([
                { id: 'copilot', label: 'Clinical Intelligence', icon: Brain },
                { id: 'performance', label: 'My Performance', icon: BarChart3 },
                { id: 'regional', label: 'Regional Intelligence', icon: Globe },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setTopTab(tab.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-all"
                  style={topTab === tab.id
                    ? { background: colors.panelBg, color: 'white', borderTop: `2px solid ${colors.gold}` }
                    : { color: 'rgba(255,255,255,0.5)' }
                  }>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'regional' && outbreakAlerts.some(a => a.severity === 'alert' || a.severity === 'emergency') && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ================================================================
            TAB: AI COPILOT
            ================================================================ */}
        {topTab === 'copilot' && (
          <div style={{ background: colors.panelBg }}>
            {/* Patient Context Banner */}
            {showPatientBanner && copilotModule !== 'overview' && (
              <div className="border-b" style={{ background: colors.headerGradient, borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="max-w-[1800px] mx-auto px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">RA</div>
                        <div>
                          <span className="font-semibold text-white">{demoPatient.name}</span>
                          <p className="text-teal-200 text-xs">{demoPatient.age}yo {demoPatient.gender} · MRN: {demoPatient.mrn}</p>
                        </div>
                      </div>
                      <div className="h-6 w-px bg-white/20" />
                      <div className="flex flex-wrap gap-1">
                        {demoPatient.conditions.slice(0, 3).map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/15 rounded-full text-xs text-white">{c}</span>
                        ))}
                        {demoPatient.conditions.length > 3 && (
                          <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/50">+{demoPatient.conditions.length - 3}</span>
                        )}
                      </div>
                      <div className="h-6 w-px bg-white/20" />
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
                        {demoPatient.allergies.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-500/25 rounded-full text-xs text-red-200">{a}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setShowPatientBanner(false)} className="text-white/40 hover:text-white text-sm">✕</button>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-[1800px] mx-auto px-6 py-6">
              {copilotModule === 'overview' ? (
                <InterventionsOverview onNavigate={(id) => setCopilotModule(id as CopilotModule)} />
              ) : (
                <div className="flex gap-6">
                  {/* Sidebar */}
                  <div className="w-72 flex-shrink-0">
                    <div className="rounded-xl overflow-hidden" style={{ background: colors.cardDark, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 className="text-sm font-semibold text-white">Modules</h3>
                      </div>
                      <div className="p-2">
                        {copilotModules.map(mod => {
                          const Icon = mod.icon;
                          const isActive = copilotModule === mod.key;
                          return (
                            <button key={mod.key} onClick={() => setCopilotModule(mod.key)}
                              className="w-full p-2.5 rounded-lg mb-1 text-left transition-all flex items-center gap-3"
                              style={isActive
                                ? { background: colors.accent, color: 'white' }
                                : { color: 'rgba(255,255,255,0.6)' }
                              }
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium">{mod.label}</div>
                                <div className="text-[10px]" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>{mod.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* AI Summary card */}
                      <div className="p-3 m-2 rounded-lg" style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-3.5 h-3.5" style={{ color: colors.gold }} />
                          <span className="text-xs font-semibold text-white">AI Summary</span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between"><span style={{ color: 'rgba(255,255,255,0.5)' }}>High-priority</span><span className="font-bold text-red-400">4</span></div>
                          <div className="flex justify-between"><span style={{ color: 'rgba(255,255,255,0.5)' }}>Care gaps</span><span className="font-bold" style={{ color: colors.gold }}>3</span></div>
                          <div className="flex justify-between"><span style={{ color: 'rgba(255,255,255,0.5)' }}>Savings potential</span><span className="font-bold text-green-400">$385/mo</span></div>
                          <div className="flex justify-between"><span style={{ color: 'rgba(255,255,255,0.5)' }}>Trials</span><span className="font-bold" style={{ color: colors.accent }}>3</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    {copilotModule === 'recommendations' && <ClinicalRecommendations patientId={demoPatient.id} patientName={demoPatient.name} />}
                    {copilotModule === 'orders' && <SmartOrderAssistant patientId={demoPatient.id} patientName={demoPatient.name} patientAllergies={demoPatient.allergies} patientMedications={demoPatient.medications} />}
                    {copilotModule === 'trials' && <ClinicalTrialsMatcher patientId={demoPatient.id} patientName={demoPatient.name} />}
                    {copilotModule === 'sdoh' && <SDOHDashboard patientId={demoPatient.id} patientName={demoPatient.name} />}
                    {copilotModule === 'medications' && <MedicationOptimizer patientId={demoPatient.id} patientName={demoPatient.name} />}
                    {copilotModule === 'coordination' && <CareCoordinationHub providerId="provider-001" providerName="Dr. Thomas Reed" />}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            TAB: MY PERFORMANCE
            ================================================================ */}
        {topTab === 'performance' && (
          <div style={{ background: colors.panelBg, minHeight: 'calc(100vh - 200px)' }}>
            <div className="max-w-[1400px] mx-auto px-6 py-6">
              {/* Metrics Grid */}
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: colors.gold }} />
                <h2 className="text-lg font-bold text-white">Performance Metrics</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,164,78,0.2)', color: colors.gold }}>Last 90 days</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {performanceMetrics.map((m, i) => <MetricCard key={i} metric={m} />)}
              </div>

              {/* Override Patterns */}
              <div className="flex items-center gap-2 mb-4" style={{ borderTop: `2px solid ${colors.gold}`, paddingTop: '1.5rem' }}>
                <Target className="w-5 h-5" style={{ color: colors.gold }} />
                <h2 className="text-lg font-bold text-white">AI Override Patterns</h2>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Where you disagree with AI — and what it's learning</span>
              </div>

              <div className="rounded-xl overflow-hidden mb-6" style={{ background: colors.cardBg }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: colors.sectionBg }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: colors.textSecondary }}>Category</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: colors.textSecondary }}>Override Rate</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: colors.textSecondary }}>Suggestions</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: colors.textSecondary }}>Overrides</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: colors.textSecondary }}>AI Accuracy</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: colors.textSecondary }}>Top Override Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overridePatterns.map((p, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: colors.text }}>{p.category}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold" style={{ color: p.overrideRate > 30 ? colors.coral : p.overrideRate > 15 ? colors.gold : '#10b981' }}>
                            {p.overrideRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm" style={{ color: colors.textSecondary }}>{p.totalSuggestions}</td>
                        <td className="px-4 py-3 text-center text-sm" style={{ color: colors.textSecondary }}>{p.overrides}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold" style={{ color: p.aiAccuracy >= 90 ? '#10b981' : p.aiAccuracy >= 80 ? colors.gold : colors.coral }}>
                            {p.aiAccuracy}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: colors.textMuted }}>{p.topReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Learning Insights */}
              <div className="flex items-center gap-2 mb-4" style={{ borderTop: `2px solid ${colors.gold}`, paddingTop: '1.5rem' }}>
                <Brain className="w-5 h-5" style={{ color: colors.gold }} />
                <h2 className="text-lg font-bold text-white">AI Learning Insights</h2>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>How your practice patterns are improving the AI</span>
              </div>

              <div className="space-y-2">
                {learningInsights.map((insight, i) => {
                  const isExpanded = expandedInsight === i;
                  return (
                    <div key={i} className="rounded-xl overflow-hidden" style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                      <button onClick={() => setExpandedInsight(isExpanded ? null : i)}
                        className="w-full p-4 text-left flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: insight.impact === 'positive' ? '#dcfce7' : '#fef3c7' }}>
                          {insight.impact === 'positive'
                            ? <ThumbsUp className="w-4 h-4 text-green-600" />
                            : <AlertCircle className="w-4 h-4" style={{ color: colors.gold }} />
                          }
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold" style={{ color: colors.text }}>{insight.title}</div>
                          <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                            {isExpanded ? insight.detail : insight.detail.slice(0, 120) + '...'}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: colors.accent }} /> : <ChevronDown className="w-4 h-4" style={{ color: colors.accent }} />}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 ml-11">
                          <div className="p-3 rounded-lg" style={{ background: colors.sectionBg }}>
                            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: colors.accent }}>Recommended Action</div>
                            <p className="text-xs" style={{ color: colors.text }}>{insight.action}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB: REGIONAL INTELLIGENCE
            ================================================================ */}
        {topTab === 'regional' && (
          <div style={{ background: colors.panelBg, minHeight: 'calc(100vh - 200px)' }}>
            <div className="max-w-[1400px] mx-auto px-6 py-6">

              {/* Outbreak Alerts */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bug className="w-5 h-5" style={{ color: colors.coral }} />
                  <h2 className="text-lg font-bold text-white">Active Outbreak Alerts</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(224,122,95,0.2)', color: colors.coral }}>
                    {outbreakAlerts.length} active
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <RefreshCw className="w-3 h-3" />
                  Updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · Sources: TN DOH, CDC, Local Health Depts
                </div>
              </div>

              <div className="space-y-2 mb-8">
                {outbreakAlerts.map(alert => {
                  const isExpanded = expandedOutbreak === alert.id;
                  return (
                    <div key={alert.id} className="rounded-xl overflow-hidden" style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                      <button onClick={() => setExpandedOutbreak(isExpanded ? null : alert.id)}
                        className="w-full p-4 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                background: alert.severity === 'emergency' ? '#fecaca' : alert.severity === 'alert' ? '#fed7aa' : alert.severity === 'advisory' ? '#fef3c7' : '#dbeafe',
                              }}>
                              <Thermometer className="w-5 h-5" style={{
                                color: alert.severity === 'emergency' ? '#dc2626' : alert.severity === 'alert' ? '#ea580c' : alert.severity === 'advisory' ? '#d97706' : '#2563eb',
                              }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold" style={{ color: colors.text }}>{alert.disease}</span>
                                <SeverityBadge severity={alert.severity} />
                                <span className="text-xs" style={{ color: colors.textMuted }}>{alert.cases} cases</span>
                                <span className="flex items-center gap-1 text-xs" style={{
                                  color: alert.trend === 'increasing' ? '#dc2626' : alert.trend === 'decreasing' ? '#10b981' : colors.textMuted,
                                }}>
                                  {alert.trend === 'increasing' ? <TrendingUp className="w-3 h-3" /> : alert.trend === 'decreasing' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                  {alert.trend}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: colors.textMuted }}>
                                <MapPin className="w-3 h-3" /> {alert.region}
                                <span>·</span>
                                {alert.date}
                                <span>·</span>
                                {alert.source}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-medium" style={{ color: colors.accent }}>{isExpanded ? 'Less' : 'Guidance'}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: colors.accent }} /> : <ChevronDown className="w-4 h-4" style={{ color: colors.accent }} />}
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                          <div className="p-3 mt-3 rounded-lg" style={{ background: colors.sectionBg }}>
                            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>Clinical Guidance</div>
                            <p className="text-xs leading-relaxed" style={{ color: colors.text }}>{alert.guidance}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{ background: colors.accentLight, color: colors.accent }}>
                              <FileText className="w-3 h-3" /> View Full Report
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{ background: colors.accentLight, color: colors.accent }}>
                              <ExternalLink className="w-3 h-3" /> {alert.source} Website
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Local Antibiogram */}
              <div className="flex items-center justify-between mb-4" style={{ borderTop: `2px solid ${colors.gold}`, paddingTop: '1.5rem' }}>
                <div className="flex items-center gap-2">
                  <Beaker className="w-5 h-5" style={{ color: colors.gold }} />
                  <h2 className="text-lg font-bold text-white">Local Antibiogram</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,164,78,0.2)', color: colors.gold }}>
                    2025 Annual Data
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span>Source: Regional Hospital Consortium · Middle Tennessee</span>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden mb-4" style={{ background: colors.cardBg }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: colors.sectionBg }}>
                        <th className="text-left px-4 py-3 font-semibold sticky left-0 z-10" style={{ color: colors.text, background: colors.sectionBg, minWidth: 180 }}>Organism</th>
                        {antibiogramData[0].antibiotics.map(a => (
                          <th key={a.name} className="px-2 py-3 text-center font-semibold" style={{ color: colors.textSecondary, minWidth: 80 }}>
                            <div className="whitespace-nowrap">{a.name}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {antibiogramData.map((org, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td className="px-4 py-2 font-medium sticky left-0 z-10" style={{ color: colors.text, background: colors.cardBg }}>
                            <span className="italic">{org.organism}</span>
                          </td>
                          {org.antibiotics.map(a => (
                            <SusceptibilityCell key={a.name} value={a.susceptibility} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Susceptibility:</span>
                {[
                  { label: '≥90% (Preferred)', bg: '#dcfce7', text: '#166534' },
                  { label: '70-89%', bg: '#fef3c7', text: '#92400e' },
                  { label: '50-69%', bg: '#fed7aa', text: '#9a3412' },
                  { label: '<50% / Resistant', bg: '#fecaca', text: '#991b1b' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ background: l.bg }} />
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{l.label}</span>
                  </div>
                ))}
              </div>

              {/* API Integration Note */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Health District API Integration</div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      This data is currently sourced from public health surveillance feeds. ATTENDING AI supports direct API integration
                      with state and county health departments for real-time outbreak data, antibiogram updates, and reportable disease alerts.
                      Connect your local health district via Settings → Integrations → Public Health APIs.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: colors.accent, color: 'white' }}>
                        <Globe className="w-3 h-3" /> Configure Health District API
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ color: colors.gold }}>
                        <BookOpen className="w-3 h-3" /> View Documentation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ProviderShell>
    </>
  );
}
