import React, { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, Stethoscope, AlertTriangle, GitBranch, ExternalLink, CheckCircle, Play, ChevronDown, ChevronRight, Shield } from 'lucide-react';

// =============================================================================
// GuidelinesModal - Rich clinical guidelines modal for diagnosis cards
// =============================================================================

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis: {
    name: string;
    icdCode: string;
    probability: number;
  };
}

type TabId = 'criteria' | 'exam' | 'redflags' | 'treatment' | 'references';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'criteria', label: 'Diagnostic Criteria', icon: <BookOpen style={{ width: 16, height: 16 }} /> },
  { id: 'exam', label: 'Physical Exam', icon: <Stethoscope style={{ width: 16, height: 16 }} /> },
  { id: 'redflags', label: 'Red Flags', icon: <AlertTriangle style={{ width: 16, height: 16 }} /> },
  { id: 'treatment', label: 'Treatment Algorithm', icon: <GitBranch style={{ width: 16, height: 16 }} /> },
  { id: 'references', label: 'References', icon: <ExternalLink style={{ width: 16, height: 16 }} /> },
];

const DIAGNOSTIC_CRITERIA = [
  'At least 5 attacks fulfilling criteria B-D',
  'Headache lasting 4-72 hours (untreated or unsuccessfully treated)',
  'At least 2 of: unilateral location, pulsating quality, moderate-severe intensity, aggravated by routine physical activity',
  'During headache, at least 1 of: nausea and/or vomiting, photophobia AND phonophobia',
  'Not better accounted for by another ICHD-3 diagnosis',
];

const AURA_CRITERIA = [
  'Fully reversible visual, sensory, or speech/language symptoms',
  'Gradual spread over >=5 minutes',
  'Duration 5-60 minutes per symptom',
  'Followed by headache within 60 minutes',
];

const QUICK_REFERENCE = [
  { label: 'Prevalence', value: '12-15%' },
  { label: 'Gender Ratio', value: '3:1 F:M' },
  { label: 'Peak Age', value: '25-55' },
  { label: 'Heritability', value: '40-65%' },
];

const EXAM_STEPS = [
  { num: 1, title: 'Assess level of consciousness (GCS)' },
  { num: 2, title: 'Cranial nerve exam (II-XII)' },
  { num: 3, title: 'Fundoscopic exam for papilledema' },
  { num: 4, title: 'Check for neck stiffness/meningeal signs' },
  { num: 5, title: 'Kernig and Brudzinski signs' },
  { num: 6, title: 'Motor strength and sensory testing' },
  { num: 7, title: 'Deep tendon reflexes' },
  { num: 8, title: 'Cerebellar testing (finger-to-nose, heel-to-shin)' },
];

const EXAM_VIDEOS = [
  { title: 'Fundoscopic Examination', desc: 'Proper technique for examining the optic disc', duration: '4:30' },
  { title: 'Kernig & Brudzinski Signs', desc: 'Testing for meningeal irritation', duration: '3:15' },
  { title: 'Cranial Nerve Assessment', desc: 'Systematic CN II-XII examination', duration: '8:45' },
  { title: 'Cerebellar Testing', desc: 'Finger-to-nose and rapid alternating movements', duration: '5:20' },
];

const RED_FLAGS = [
  { title: 'Thunderclap onset', desc: 'Sudden severe headache reaching maximum intensity in seconds' },
  { title: 'Altered consciousness', desc: 'Any change in mental status or level of awareness' },
  { title: 'Focal neurological deficit', desc: 'New weakness, numbness, or vision loss' },
  { title: 'Fever with neck stiffness', desc: 'Meningitis until proven otherwise' },
  { title: 'Papilledema', desc: 'Raised intracranial pressure on fundoscopy' },
  { title: 'Post-traumatic', desc: 'New headache after head injury' },
];

const DISPOSITION = {
  admit: ['GCS <15', 'Focal neurological deficits', 'SAH confirmed on imaging', 'Meningitis suspected'],
  observe: ['First severe migraine presentation', 'Dehydration requiring IV fluids', 'Failed outpatient treatment'],
  discharge: ['Known migraine pattern with typical features', 'Responding to acute treatment', 'Reliable follow-up arranged'],
};

const ACUTE_TREATMENTS = [
  { name: 'Triptans (sumatriptan, rizatriptan)', level: 'A', desc: 'First-line abortive therapy for moderate-severe migraine' },
  { name: 'NSAIDs + antiemetic', level: 'B', desc: 'Alternative first-line for mild-moderate attacks' },
  { name: 'Ketorolac IM or Prochlorperazine IV', level: 'B', desc: 'Rescue therapy for refractory migraine in ED setting' },
];

const PREVENTIVE_OPTIONS = [
  'Topiramate 25-100mg daily',
  'Propranolol 40-240mg daily',
  'Amitriptyline 10-75mg at bedtime',
  'CGRP monoclonal antibodies (erenumab, fremanezumab, galcanezumab)',
];

const NON_PHARM = [
  'Trigger identification and avoidance',
  'Sleep hygiene optimization',
  'Stress management and cognitive behavioral therapy',
  'Biofeedback and relaxation training',
];

const REFERENCES_DATA = [
  { title: 'ICHD-3 Classification', source: 'International Headache Society, 2018', level: 'A' },
  { title: 'AAN Practice Guideline: Acute Migraine', source: '2024 Update', level: 'A' },
  { title: 'ACR Appropriateness Criteria: Headache', source: '2023', level: 'B' },
  { title: 'Red Flag Headaches: A Clinical Review', source: 'NEJM, 2023', level: 'A' },
  { title: 'Triptan Safety in Reproductive Age', source: 'Headache, 2024', level: 'B' },
];

// =============================================================================
// Sub-components for each tab
// =============================================================================

const DiagnosticCriteriaTab: React.FC = () => {
  const [auraExpanded, setAuraExpanded] = useState(false);
  const [hoveredCriteria, setHoveredCriteria] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ICHD-3 Section */}
      <div style={{ borderLeft: '4px solid #1A8FA8', background: '#f0fdfa', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0C3547', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen style={{ width: 20, height: 20, color: '#1A8FA8' }} />
          ICHD-3 Diagnostic Criteria
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DIAGNOSTIC_CRITERIA.map((criterion, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredCriteria(i)}
              onMouseLeave={() => setHoveredCriteria(null)}
              style={{
                background: '#ffffff',
                border: `2px solid ${hoveredCriteria === i ? '#1A8FA8' : '#e5e7eb'}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                transition: 'all 0.2s ease',
                transform: hoveredCriteria === i ? 'translateY(-1px)' : 'none',
                boxShadow: hoveredCriteria === i ? '0 4px 12px rgba(26,143,168,0.15)' : 'none',
              }}
            >
              <CheckCircle style={{ width: 20, height: 20, color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                <strong style={{ color: '#0C3547' }}>{i + 1}.</strong> {criterion}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Aura Criteria (expandable) */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <button
          onClick={() => setAuraExpanded(!auraExpanded)}
          style={{
            width: '100%',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f9fafb',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
            color: '#0C3547',
          }}
        >
          <span>Aura Criteria</span>
          {auraExpanded
            ? <ChevronDown style={{ width: 20, height: 20, color: '#6b7280' }} />
            : <ChevronRight style={{ width: 20, height: 20, color: '#6b7280' }} />}
        </button>
        {auraExpanded && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {AURA_CRITERIA.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#f0fdfa', borderRadius: 8 }}>
                <CheckCircle style={{ width: 18, height: 18, color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 14, color: '#374151' }}>{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Reference Card */}
      <div style={{ background: '#1f2937', borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Reference</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {QUICK_REFERENCE.map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>{item.value}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PhysicalExamTab: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
    {/* Exam Steps */}
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0C3547', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Stethoscope style={{ width: 20, height: 20, color: '#1A8FA8' }} />
        Recommended Examination Steps
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {EXAM_STEPS.map((step) => (
          <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1A8FA8, #25B8A9)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
              {step.num}
            </div>
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{step.title}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Video Cards */}
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0C3547', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Play style={{ width: 20, height: 20, color: '#1A8FA8' }} />
        Physical Exam Maneuver Videos
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {EXAM_VIDEOS.map((video, i) => (
          <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}>
            {/* Thumbnail */}
            <div style={{
              height: 140,
              background: 'linear-gradient(135deg, #1A8FA8, #0C3547)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}>
                <div style={{
                  width: 0, height: 0,
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                  borderLeft: '16px solid #0C3547',
                  marginLeft: 3,
                }} />
              </div>
              <span style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              }}>
                {video.duration}
              </span>
            </div>
            {/* Info */}
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0C3547', marginBottom: 4 }}>{video.title}</div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>{video.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RedFlagsTab: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
    {/* Red Flag Cards */}
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle style={{ width: 20, height: 20, color: '#dc2626' }} />
        When to Escalate
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {RED_FLAGS.map((flag, i) => (
          <div key={i} style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>{flag.title}</div>
            <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>{flag.desc}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Disposition Criteria */}
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0C3547', marginBottom: 16 }}>Disposition Criteria</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Admit */}
        <div style={{ borderLeft: '4px solid #dc2626', background: '#fef2f2', borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>When to Admit</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DISPOSITION.admit.map((item, i) => (
              <li key={i} style={{ fontSize: 14, color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {/* Observe */}
        <div style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb', borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>When to Observe</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DISPOSITION.observe.map((item, i) => (
              <li key={i} style={{ fontSize: 14, color: '#78350f', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {/* Discharge */}
        <div style={{ borderLeft: '4px solid #22c55e', background: '#f0fdf4', borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Safe for Discharge</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DISPOSITION.discharge.map((item, i) => (
              <li key={i} style={{ fontSize: 14, color: '#14532d', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const TreatmentAlgorithmTab: React.FC = () => {
  const [preventiveOpen, setPreventiveOpen] = useState(false);
  const [nonPharmOpen, setNonPharmOpen] = useState(false);

  const evidenceBadge = (level: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      A: { bg: '#dcfce7', text: '#166534' },
      B: { bg: '#dbeafe', text: '#1e40af' },
      C: { bg: '#fef9c3', text: '#854d0e' },
    };
    const c = colors[level] || colors.C;
    return (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
        background: c.bg, color: c.text, letterSpacing: 0.3,
      }}>
        Level {level}
      </span>
    );
  };

  const expandableSection = (
    title: string, isOpen: boolean, toggle: () => void, children: React.ReactNode,
  ) => (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: '#f9fafb', border: 'none',
          cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#0C3547',
        }}
      >
        <span>{title}</span>
        {isOpen
          ? <ChevronDown style={{ width: 20, height: 20, color: '#6b7280' }} />
          : <ChevronRight style={{ width: 20, height: 20, color: '#6b7280' }} />}
      </button>
      {isOpen && <div style={{ padding: 20, borderTop: '1px solid #e5e7eb' }}>{children}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Acute Treatment */}
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0C3547', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitBranch style={{ width: 20, height: 20, color: '#1A8FA8' }} />
          Acute Treatment
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ACUTE_TREATMENTS.map((tx, i) => (
            <div key={i} style={{
              padding: '14px 18px', background: '#f0fdfa', border: '1px solid #ccfbf1',
              borderRadius: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A8FA8' }}>
                    {i === 0 ? 'First-line' : i === 1 ? 'Alternative' : 'Rescue'}
                  </span>
                  {evidenceBadge(tx.level)}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0C3547', marginBottom: 2 }}>{tx.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{tx.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preventive */}
      {expandableSection('Preventive Therapy', preventiveOpen, () => setPreventiveOpen(!preventiveOpen), (
        <div>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
            Consider when: 4+ headache days/month or significant disability
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PREVENTIVE_OPTIONS.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f0fdfa', borderRadius: 8 }}>
                <Shield style={{ width: 16, height: 16, color: '#1A8FA8', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#374151' }}>{opt}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Non-pharmacological */}
      {expandableSection('Non-Pharmacological', nonPharmOpen, () => setNonPharmOpen(!nonPharmOpen), (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NON_PHARM.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
              <CheckCircle style={{ width: 16, height: 16, color: '#25B8A9', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#374151' }}>{item}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const ReferencesTab: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {REFERENCES_DATA.map((ref, i) => {
      const levelColors: Record<string, { bg: string; text: string }> = {
        A: { bg: '#dcfce7', text: '#166534' },
        B: { bg: '#dbeafe', text: '#1e40af' },
      };
      const c = levelColors[ref.level] || levelColors.B;
      return (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <ExternalLink style={{ width: 18, height: 18, color: '#1A8FA8', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0C3547', marginBottom: 2 }}>{ref.title}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{ref.source}</div>
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 6,
            background: c.bg, color: c.text, flexShrink: 0,
          }}>
            Level {ref.level}
          </span>
        </div>
      );
    })}
  </div>
);

// =============================================================================
// Main Modal Component
// =============================================================================

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ isOpen, onClose, diagnosis }) => {
  const [activeTab, setActiveTab] = useState<TabId>('criteria');
  const [visible, setVisible] = useState(false);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      setVisible(false);
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const tabContent: Record<TabId, React.ReactNode> = {
    criteria: <DiagnosticCriteriaTab />,
    exam: <PhysicalExamTab />,
    redflags: <RedFlagsTab />,
    treatment: <TreatmentAlgorithmTab />,
    references: <ReferencesTab />,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(12, 53, 71, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        transition: 'opacity 0.3s ease',
        opacity: visible ? 1 : 0,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          maxWidth: 1200,
          width: '100%',
          maxHeight: '90vh',
          borderRadius: 24,
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1A8FA8, #0C3547)',
          padding: '20px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0 }}>{diagnosis.name}</h2>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.2)', color: '#ffffff',
                }}>
                  {diagnosis.icdCode}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.2)', color: '#ffffff',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <BookOpen style={{ width: 12, height: 12 }} />
                  Evidence-Based
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  Probability: {Math.round(diagnosis.probability * 100)}%
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto', flexShrink: 0,
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1 0 auto',
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#1A8FA8' : '#6b7280',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #1A8FA8' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content (scrollable) */}
        <div style={{
          padding: 28,
          overflowY: 'auto',
          maxHeight: 'calc(90vh - 160px)',
          flex: 1,
        }}>
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  );
};

export default GuidelinesModal;
