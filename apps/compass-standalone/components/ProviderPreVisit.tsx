// ============================================================
// COMPASS Standalone — Provider Pre-Visit Summary
// Dark branded theme with teal, coral, gold accents
// ============================================================

import React, { useState } from 'react';
import {
  User, FileText, Activity, AlertTriangle, ChevronDown, ChevronUp,
  Printer, Stethoscope, ClipboardList, Beaker, Radio, Users,
  Shield, CheckCircle, Circle, Camera, ArrowRight, Clock,
  Heart, Zap,
} from 'lucide-react';
import type { DifferentialDiagnosisResult, DifferentialDiagnosis } from '@attending/shared/lib/ai/differentialDiagnosis';
import type { HPIData } from '@attending/shared/types/chat.types';
import type { SharedAssessment } from '../lib/assessmentShare';
import { buildStructuredHpi } from '../lib/hpiNarrative';
import { ConfidenceRing } from './ConfidenceRing';

// ============================================================
// Collapsible Section (dark theme)
// ============================================================

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  onReviewed?: () => void;
  isReviewed?: boolean;
}> = ({ title, icon, children, defaultOpen = true, badge, onReviewed, isReviewed }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
      <div className="w-full px-5 py-4 flex items-center gap-3">
        <div className="text-attending-light-teal">{icon}</div>
        <h3
          className="font-semibold text-white flex-1 text-left cursor-pointer hover:text-attending-light-teal transition-colors"
          onClick={() => setOpen(!open)}
        >
          {title}
        </h3>
        {badge}
        {onReviewed && (
          <button
            onClick={onReviewed}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              isReviewed
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/10 text-white/50 hover:bg-attending-light-teal/20 hover:text-attending-light-teal border border-white/10'
            }`}
          >
            {isReviewed ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
            {isReviewed ? 'Reviewed' : 'Mark Reviewed'}
          </button>
        )}
        <button onClick={() => setOpen(!open)} className="p-1 hover:bg-white/10 rounded transition-colors">
          {open ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
        </button>
      </div>
      {open && <div className="px-5 pb-5 border-t border-white/10">{children}</div>}
    </div>
  );
};

// ConfidenceRing imported from ./ConfidenceRing.tsx

// ============================================================
// Diagnosis Card (dark theme)
// ============================================================

const ProviderDiagnosisCard: React.FC<{
  dx: DifferentialDiagnosis;
  rank: number;
  isPrimary?: boolean;
  isMustRuleOut?: boolean;
}> = ({ dx, rank, isPrimary, isMustRuleOut }) => {
  const [expanded, setExpanded] = useState(isPrimary);

  const badge = isPrimary
    ? { text: 'PRIMARY', cls: 'bg-attending-light-teal text-attending-deep-navy' }
    : isMustRuleOut
      ? { text: 'RULE OUT', cls: 'bg-attending-coral text-white' }
      : { text: `#${rank}`, cls: 'bg-white/20 text-white/70' };

  const urgencyBorder = dx.urgency === 'emergent' ? 'border-l-4 border-l-attending-coral'
    : dx.urgency === 'urgent' ? 'border-l-4 border-l-attending-gold' : '';

  return (
    <div className={`bg-white/5 rounded-lg border border-white/10 overflow-hidden ${urgencyBorder}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
      >
        <ConfidenceRing confidence={dx.confidence} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
            {dx.icdCode && <span className="text-[10px] text-white/30 font-mono">{dx.icdCode}</span>}
          </div>
          <h4 className="font-semibold text-white mt-0.5">{dx.diagnosis}</h4>
          <p className="text-xs text-white/40 line-clamp-1">{dx.reasoning}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
          {dx.supportingFindings.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">Supporting Evidence</h5>
              <ul className="space-y-0.5">
                {dx.supportingFindings.map((f, i) => (
                  <li key={i} className="text-sm text-white/70 flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">+</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dx.againstFindings.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-attending-coral uppercase tracking-wider mb-1">Against</h5>
              <ul className="space-y-0.5">
                {dx.againstFindings.map((f, i) => (
                  <li key={i} className="text-sm text-white/50 flex items-start gap-1.5">
                    <span className="text-attending-coral mt-0.5">-</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dx.recommendedWorkup && (
            <div>
              <h5 className="text-xs font-semibold text-attending-gold uppercase tracking-wider mb-1">Recommended Workup</h5>
              <div className="grid grid-cols-2 gap-2">
                {dx.recommendedWorkup.labs?.length ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-400 mb-1">
                      <Beaker className="w-3 h-3" /> Labs
                    </div>
                    <p className="text-xs text-blue-300">{dx.recommendedWorkup.labs.join(', ')}</p>
                  </div>
                ) : null}
                {dx.recommendedWorkup.imaging?.length ? (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-purple-400 mb-1">
                      <Radio className="w-3 h-3" /> Imaging
                    </div>
                    <p className="text-xs text-purple-300">{dx.recommendedWorkup.imaging.join(', ')}</p>
                  </div>
                ) : null}
                {dx.recommendedWorkup.consults?.length ? (
                  <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-attending-light-teal mb-1">
                      <Users className="w-3 h-3" /> Consults
                    </div>
                    <p className="text-xs text-teal-300">{dx.recommendedWorkup.consults.join(', ')}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Main Provider Pre-Visit Component
// ============================================================

interface ProviderPreVisitProps {
  assessment: SharedAssessment;
  onPrint: () => void;
  onNewAssessment: () => void;
}

export const ProviderPreVisit: React.FC<ProviderPreVisitProps> = ({
  assessment,
  onPrint,
  onNewAssessment,
}) => {
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const toggleReview = (key: string) => setReviewed(prev => ({ ...prev, [key]: !prev[key] }));

  const structuredHpi = buildStructuredHpi(assessment.hpi);
  const dx = assessment.diagnosisResult;
  const mustRuleOutIds = new Set(dx?.mustRuleOut.map(d => d.diagnosis) || []);

  let age: string | null = null;
  if (assessment.dateOfBirth) {
    const dob = new Date(assessment.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      age = `${Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))}yo`;
    }
  }

  const reviewKeys = ['cc', 'hpi', 'dx', 'actions'];
  const allReviewed = reviewKeys.every(k => reviewed[k]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 print:px-0 print:max-w-none">
      {/* Provider Header */}
      <div className="bg-attending-gradient rounded-xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-attending-light-teal" />
            <span className="font-bold text-lg text-white">COMPASS</span>
            <span className="text-white/40 text-sm">Provider Review</span>
          </div>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors print:hidden"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Pre-Visit Assessment Summary</h1>
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>Generated {new Date(assessment.generatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Patient Demographics */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-attending-primary/20 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-attending-light-teal" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {assessment.patientName || 'Unknown Patient'}
            </h2>
            <div className="flex items-center gap-3 text-sm text-white/40 mt-0.5">
              {age && <span>{age}</span>}
              {assessment.gender && <span>{assessment.gender}</span>}
              {assessment.dateOfBirth && <span>DOB: {assessment.dateOfBirth}</span>}
            </div>
          </div>
          {assessment.urgencyLevel !== 'standard' && (
            <span className={`ml-auto px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
              assessment.urgencyLevel === 'emergency' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              assessment.urgencyLevel === 'high' ? 'bg-attending-gold/20 text-attending-gold border border-attending-gold/30' :
              'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {assessment.urgencyLevel}
            </span>
          )}
        </div>
      </div>

      {/* Red Flags */}
      {assessment.redFlags.length > 0 && (
        <div className={`rounded-xl p-4 border-2 ${
          assessment.urgencyLevel === 'emergency'
            ? 'bg-red-900/30 border-red-500/40'
            : 'bg-attending-gold/10 border-attending-gold/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-5 h-5 ${
              assessment.urgencyLevel === 'emergency' ? 'text-red-400' : 'text-attending-gold'
            }`} />
            <h3 className={`font-bold ${
              assessment.urgencyLevel === 'emergency' ? 'text-red-300' : 'text-attending-gold'
            }`}>
              {assessment.urgencyLevel === 'emergency' ? 'EMERGENCY — Immediate Attention Required' : 'Red Flags Detected'}
            </h3>
          </div>
          <ul className="space-y-1">
            {assessment.redFlags.map((rf, i) => (
              <li key={i} className="text-sm flex items-center gap-2 text-white/80">
                <span className={`w-2 h-2 rounded-full ${
                  rf.severity === 'critical' ? 'bg-attending-coral' : 'bg-attending-gold'
                }`} />
                <span className="font-medium">{rf.symptom}</span>
                <span className="text-white/40">({rf.severity})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chief Complaint */}
      <Section
        title="Chief Complaint"
        icon={<Heart className="w-5 h-5" />}
        onReviewed={() => toggleReview('cc')}
        isReviewed={reviewed['cc']}
      >
        <div className="mt-3">
          {assessment.chiefComplaint && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-sm text-indigo-300 italic">"{assessment.chiefComplaint}"</p>
              <p className="text-[10px] text-indigo-400/50 mt-1">Patient's own words</p>
            </div>
          )}
        </div>
      </Section>

      {/* Clinical Images */}
      {assessment.images.length > 0 && (
        <Section
          title="Clinical Images"
          icon={<Camera className="w-5 h-5" />}
          badge={
            <span className="text-xs bg-attending-primary/20 text-attending-light-teal px-2 py-0.5 rounded-full font-medium">
              {assessment.images.length} photo{assessment.images.length > 1 ? 's' : ''}
            </span>
          }
          onReviewed={() => toggleReview('images')}
          isReviewed={reviewed['images']}
        >
          <div className="mt-3 space-y-3">
            {assessment.images.map((img) => (
              <div key={img.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                {img.analysis ? (
                  <>
                    <p className="text-sm text-white/70 mb-2">{img.analysis.imageDescription}</p>
                    {img.analysis.suggestedConditions.length > 0 && (
                      <div className="space-y-1">
                        {img.analysis.suggestedConditions.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <ConfidenceRing confidence={c.confidence} size={32} />
                            <div>
                              <span className="text-sm font-medium text-white">{c.name}</span>
                              <span className="text-xs text-white/40 ml-2">{c.reasoning}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-white/20 mt-2">via {img.analysis.provider}</p>
                  </>
                ) : (
                  <p className="text-sm text-white/40 italic">Photo attached — analysis not available</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* HPI */}
      <Section
        title="History of Present Illness"
        icon={<FileText className="w-5 h-5" />}
        onReviewed={() => toggleReview('hpi')}
        isReviewed={reviewed['hpi']}
      >
        <div className="mt-3">
          {assessment.hpiNarrative && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
              <p className="text-sm text-white/70 leading-relaxed italic">{assessment.hpiNarrative}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(structuredHpi).map(([key, value]) => (
              <div key={key} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                <span className="text-[10px] font-semibold text-attending-light-teal/60 uppercase tracking-wider">{key}</span>
                <p className="text-sm text-white font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Differential Diagnoses */}
      {dx && (
        <Section
          title="Differential Diagnoses"
          icon={<ClipboardList className="w-5 h-5" />}
          badge={
            <span className="text-xs bg-attending-primary/20 text-attending-light-teal px-2 py-0.5 rounded-full font-medium">
              {dx.differentials.length} considered
            </span>
          }
          onReviewed={() => toggleReview('dx')}
          isReviewed={reviewed['dx']}
        >
          <div className="mt-3 space-y-3">
            {dx.clinicalImpression && (
              <div className="bg-attending-primary/10 border border-attending-primary/20 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-attending-light-teal uppercase tracking-wider mb-1">Clinical Impression</h4>
                <p className="text-sm text-white/70">{dx.clinicalImpression}</p>
              </div>
            )}
            <div className="space-y-2">
              {dx.differentials.map((d, i) => (
                <ProviderDiagnosisCard
                  key={d.diagnosis}
                  dx={d}
                  rank={i + 1}
                  isPrimary={i === 0}
                  isMustRuleOut={mustRuleOutIds.has(d.diagnosis)}
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Recommended Actions */}
      {dx && dx.recommendedActions.length > 0 && (
        <Section
          title="Recommended Next Steps"
          icon={<Zap className="w-5 h-5 text-attending-gold" />}
          onReviewed={() => toggleReview('actions')}
          isReviewed={reviewed['actions']}
        >
          <div className="mt-3">
            <div className="bg-attending-gold/10 border border-attending-gold/20 rounded-lg p-4">
              <ul className="space-y-2">
                {dx.recommendedActions.map((action, i) => (
                  <li key={i} className="text-sm text-attending-gold flex items-start gap-2">
                    <span className="font-bold">{i + 1}.</span> {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {/* Review Status */}
      <div className={`rounded-xl p-4 border-2 transition-colors ${
        allReviewed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-center gap-2">
          {allReviewed ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-green-400">All Sections Reviewed</span>
            </>
          ) : (
            <>
              <Circle className="w-5 h-5 text-white/30" />
              <span className="font-medium text-white/50">
                {Object.values(reviewed).filter(Boolean).length} of {reviewKeys.length} sections reviewed
              </span>
            </>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-attending-coral/10 border border-attending-coral/20 rounded-xl p-4">
        <p className="text-xs text-attending-coral/80">
          <strong className="text-attending-coral">Clinical Disclaimer:</strong> This assessment is generated by AI for clinical decision support only.
          It does not constitute a medical diagnosis. All findings should be reviewed and confirmed by a qualified healthcare provider.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={onPrint}
          className="flex-1 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/15 transition-all flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print Summary
        </button>
        <button
          onClick={onNewAssessment}
          className="flex-1 py-3 bg-attending-primary text-white rounded-xl font-semibold hover:shadow-teal transition-all flex items-center justify-center gap-2"
        >
          <ArrowRight className="w-5 h-5" />
          New Assessment
        </button>
      </div>
    </div>
  );
};
