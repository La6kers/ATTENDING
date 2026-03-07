// =============================================================================
// ATTENDING AI - Imaging Results Review (Inbox-Style Two-Column Layout)
// apps/provider-portal/components/imaging/ImagingResultsReview.tsx
//
// Dark teal theme matching labs/inbox pattern.
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Search, Brain, FileText, Send, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, ChevronRight, Clock, Eye,
  ScanLine, Zap, Plus, X, Printer, MessageSquare,
  Sparkles, ArrowRight, Beaker, Calendar, Check, Copy,
  Target, HelpCircle, Lightbulb,
} from 'lucide-react';
import {
  MOCK_IMAGING_RESULTS,
  generateImagingAIAnalysis,
  type ImagingResult,
  type ImagingAIAnalysis,
  type ImagingDxSuggestion,
  type AIFinding,
  type FollowUpStudy,
  type FindingSeverity,
} from '../../lib/services/imagingAIAgent';

// =============================================================================
// Theme (matching labs/inbox dark teal)
// =============================================================================

import { reviewColors } from '../../lib/reviewTheme';
import { ReviewTabBar } from '../shared/ReviewTabBar';

const colors = {
  ...reviewColors,
  cardBg: reviewColors.cardBg,
  sectionBg: reviewColors.cardSectionBg,
  text: reviewColors.cardText,
  textSecondary: reviewColors.cardTextSecondary,
  textMuted: reviewColors.cardTextMuted,
  border: reviewColors.cardBorder,
  accentLight: reviewColors.cardAccentLight,
};

const severityColors: Record<FindingSeverity, { bg: string; text: string; dot: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5', dot: '#ef4444', label: 'Critical' },
  significant: { bg: 'rgba(251,191,36,0.2)', text: '#fcd34d', dot: '#f59e0b', label: 'Significant' },
  moderate: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd', dot: '#3b82f6', label: 'Moderate' },
  mild: { bg: 'rgba(26,143,168,0.2)', text: '#7dd3c8', dot: '#25B8A9', label: 'Mild' },
  normal: { bg: 'rgba(34,197,94,0.2)', text: '#86efac', dot: '#10b981', label: 'Normal' },
};

const severityColorsLight: Record<FindingSeverity, { bg: string; text: string }> = {
  critical: { bg: '#fecaca', text: '#dc2626' },
  significant: { bg: '#fef3c7', text: '#d97706' },
  moderate: { bg: '#dbeafe', text: '#2563eb' },
  mild: { bg: colors.accentLight, text: colors.accent },
  normal: { bg: '#d1fae5', text: '#059669' },
};

const modalityLabels: Record<string, string> = {
  xray: 'X-Ray', ct: 'CT', mri: 'MRI', ultrasound: 'Ultrasound', nuclear: 'Nuclear', mammogram: 'Mammogram',
};

// =============================================================================
// Main Component
// =============================================================================

export function ImagingResultsReview({ onNewOrder }: { onNewOrder?: () => void } = {}) {
  const [results] = useState<ImagingResult[]>(MOCK_IMAGING_RESULTS);
  const [selectedId, setSelectedId] = useState<string>(results[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unreviewed' | 'abnormal'>('all');
  const [activeTab, setActiveTab] = useState<'analysis' | 'dxvalidation' | 'followup' | 'message'>('analysis');
  const [expandedDx, setExpandedDx] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  const [addendumText, setAddendumText] = useState('');
  const [showAddendum, setShowAddendum] = useState(false);
  const [followUpSelections, setFollowUpSelections] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    return results.filter(r => {
      const matchSearch = !searchQuery || r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.studyType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterMode === 'all' ||
        (filterMode === 'unreviewed' && !r.reviewed) ||
        (filterMode === 'abnormal' && r.hasAbnormalities);
      return matchSearch && matchFilter;
    });
  }, [results, searchQuery, filterMode]);

  const selected = results.find(r => r.id === selectedId);
  const analysis = selected ? generateImagingAIAnalysis(selected) : null;

  const handleSelectResult = (id: string) => {
    setSelectedId(id);
    setActiveTab('analysis');
    setExpandedFindings(new Set());
    setExpandedDx(null);
    setShowAddendum(false);
    setFollowUpSelections(new Set());
    const sel = results.find(r => r.id === id);
    if (sel) {
      setAddendumText(generateImagingAIAnalysis(sel).addendumDraft);
    }
  };

  const toggleFinding = (idx: number) => {
    setExpandedFindings(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const toggleFollowUp = (idx: number) => {
    setFollowUpSelections(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const unreviewed = results.filter(r => !r.reviewed).length;
  const abnormal = results.filter(r => r.hasAbnormalities).length;

  return (
    <div className="h-full flex rounded-xl overflow-hidden" style={{ background: colors.panelBg }}>
      {/* ═══ LEFT PANEL: Results List ═══ */}
      <div className="w-[300px] flex flex-col flex-shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Search & Filters */}
        <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search imaging results..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-teal-400"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div className="flex gap-1">
            {([['all', `All (${results.length})`], ['unreviewed', `New (${unreviewed})`], ['abnormal', `Abnormal (${abnormal})`]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilterMode(key)}
                className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={filterMode === key
                  ? { background: colors.accent, color: 'white' }
                  : { color: 'rgba(255,255,255,0.5)' }
                }>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Stack */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filtered.map(result => {
            const sev = severityColors[result.severity];
            const isActive = result.id === selectedId;
            return (
              <button key={result.id} onClick={() => handleSelectResult(result.id)}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{
                  background: isActive ? colors.accent : result.reviewed ? colors.cardRead : colors.cardDark,
                  border: isActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                }}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{result.patientName}</span>
                    {!result.reviewed && (
                      <span className="w-2 h-2 rounded-full bg-teal-300 flex-shrink-0" />
                    )}
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded" style={{ background: sev.bg, color: sev.text }}>
                    {sev.label}
                  </span>
                </div>
                <div className="text-xs text-white/60 mb-1">{result.studyType}</div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{modalityLabels[result.modality]}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                  <span className="text-white/50">{result.bodyPart}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{result.resultDate}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-white/30 text-sm">No results match your filters</div>
          )}
        </div>

        {/* Footer stats */}
        <div className="p-3 text-center text-[10px] flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
          {unreviewed} unreviewed of {results.length} results
        </div>
      </div>

      {/* ═══ RIGHT PANEL: Detail & AI ═══ */}
      {selected && analysis ? (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: colors.panelBgRight }}>
          {/* Patient Header */}
          <div className="px-6 py-3 flex items-center justify-between flex-shrink-0"
            style={{ background: colors.headerGradient }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                {selected.patientName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{selected.patientName}</span>
                  <span className="text-teal-200 text-sm">{selected.patientAge}y {selected.patientGender} · {selected.mrn}</span>
                </div>
                <div className="flex items-center gap-3 text-teal-200 text-xs mt-0.5">
                  <span>{selected.studyType}</span>
                  <span>·</span>
                  <span>{modalityLabels[selected.modality]} — {selected.bodyPart}</span>
                  <span>·</span>
                  <span>Read by {selected.radiologist}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.encounterId && (
                <button className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.95)', color: '#0C4C5E' }}
                  onClick={() => { setShowAddendum(!showAddendum); if (!addendumText) setAddendumText(analysis.addendumDraft); }}>
                  <FileText className="w-3.5 h-3.5" />
                  {showAddendum ? 'Hide Addendum' : 'Add to Encounter'}
                </button>
              )}
              <button
                className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 text-white/90 hover:bg-white/20 transition-colors"
                style={{ background: selected.reviewed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.15)' }}>
                {selected.reviewed ? <CheckCircle className="w-3.5 h-3.5 text-green-300" /> : <Eye className="w-3.5 h-3.5" />}
                {selected.reviewed ? 'Reviewed' : 'Mark Reviewed'}
              </button>
            </div>
          </div>

          {/* Indication strip */}
          <div className="px-6 py-2 text-xs flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="font-semibold text-white/50">Indication: </span>
            <span className="text-white/70">{selected.indication}</span>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Report */}
            <div className="w-[35%] p-4 overflow-y-auto" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              {/* Official Report */}
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" style={{ color: colors.gold }} />
                <span className="text-sm font-bold text-white">Official Report</span>
              </div>

              <div className="mb-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Findings
                </div>
                <p className="text-xs leading-relaxed text-white/70">{selected.findings}</p>
              </div>

              <div className="mb-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Impression
                </div>
                <p className="text-xs leading-relaxed font-medium text-white/80">{selected.impression}</p>
              </div>

              {/* Comparison Notes */}
              {analysis.comparisonNotes && (
                <div className="p-2.5 rounded-xl mb-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Prior Study Comparison</span>
                  </div>
                  <p className="text-xs text-amber-200/80">{analysis.comparisonNotes}</p>
                </div>
              )}

              {/* Clinical Correlation */}
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Clinical Correlation
                </div>
                <p className="text-xs leading-relaxed text-white/70">{analysis.clinicalCorrelation}</p>
              </div>

              {/* Ordering info */}
              <div className="mt-3 text-[10px] text-white/30">
                {selected.orderingProvider} · Ordered {selected.orderedDate} · Resulted {selected.resultDate}
              </div>
            </div>

            {/* Right: AI Panel */}
            <div className="w-[65%] flex flex-col overflow-hidden">
              <ReviewTabBar
                tabs={[
                  { id: 'analysis', label: 'AI Analysis', icon: Brain },
                  { id: 'dxvalidation', label: 'Dx Coding', icon: Target },
                  { id: 'followup', label: 'Orders', icon: Beaker },
                  { id: 'message', label: 'Message', icon: Send },
                ]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as typeof activeTab)}
              />

              <div className="flex-1 overflow-y-auto p-4">
                {/* ============ AI Analysis Tab ============ */}
                {activeTab === 'analysis' && (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="p-3 rounded-xl flex items-start gap-3"
                      style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                      <div>
                        <div className="text-xs font-semibold text-white mb-1">AI Summary</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{analysis.summary}</div>
                      </div>
                    </div>

                    {/* Key Findings */}
                    {analysis.keyFindings.length > 0 ? (
                      <>
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Key Findings
                        </div>
                        {analysis.keyFindings.map((finding, idx) => {
                          const fSev = severityColorsLight[finding.severity];
                          const expanded = expandedFindings.has(idx);
                          return (
                            <div key={idx} className="rounded-xl overflow-hidden"
                              style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                              <button onClick={() => toggleFinding(idx)}
                                className="w-full p-3 text-left">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: severityColors[finding.severity].dot }} />
                                      <span className="text-sm font-semibold" style={{ color: colors.text }}>{finding.finding}</span>
                                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full" style={{ background: fSev.bg, color: fSev.text }}>
                                        {severityColors[finding.severity].label}
                                      </span>
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{finding.explanation}</p>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                    <span className="text-[10px] font-medium" style={{ color: colors.accent }}>
                                      {expanded ? 'Less' : 'Dive Deeper'}
                                    </span>
                                    {expanded ? <ChevronUp className="w-4 h-4" style={{ color: colors.accent }} /> : <ChevronDown className="w-4 h-4" style={{ color: colors.accent }} />}
                                  </div>
                                </div>
                              </button>

                              {expanded && (
                                <div className="px-3 pb-3 space-y-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                                  {finding.detailedExplanation && (
                                    <div className="pt-3">
                                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                        Detailed Explanation
                                      </div>
                                      <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{finding.detailedExplanation}</p>
                                    </div>
                                  )}
                                  <div className="p-2.5 rounded-lg" style={{ background: colors.sectionBg }}>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                      Clinical Significance
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: colors.text }}>{finding.clinicalSignificance}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                        Possible Causes
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {finding.possibleCauses.map((cause, i) => (
                                          <span key={i} className="px-2 py-1 rounded-lg text-[11px]"
                                            style={{ background: colors.accentLight, color: colors.text }}>{cause}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                        Recommended Actions
                                      </div>
                                      {finding.recommendedActions.map((action, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs py-0.5" style={{ color: colors.textSecondary }}>
                                          <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: colors.accent }} />
                                          {action}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="p-6 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                        <div className="text-sm font-semibold text-white mb-1">Normal Study</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>No significant abnormalities identified.</div>
                      </div>
                    )}

                    {/* Encounter Addendum (inline) */}
                    {showAddendum && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4" style={{ color: colors.gold }} />
                          <span className="text-sm font-bold text-white">Encounter Addendum</span>
                        </div>
                        <textarea
                          value={addendumText}
                          onChange={e => setAddendumText(e.target.value)}
                          className="w-full h-40 p-3 rounded-xl text-xs leading-relaxed resize-none"
                          style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, color: colors.text, outline: 'none' }}
                        />
                        <button className="mt-2 px-4 py-2 text-xs text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-[1.02]"
                          style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                          <FileText className="w-3.5 h-3.5" />
                          Sign & Add to Encounter
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ============ Dx Coding Tab ============ */}
                {activeTab === 'dxvalidation' && analysis && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl flex items-start gap-3"
                      style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                      <Target className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                      <div>
                        <div className="text-xs font-semibold text-white mb-1">ML Diagnosis Suggestions</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          AI analyzes imaging findings to suggest appropriate diagnosis codes. Review and add to the encounter as appropriate.
                        </div>
                      </div>
                    </div>

                    {analysis.dxSuggestions.length === 0 ? (
                      <div className="p-6 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                        <div className="text-sm font-semibold text-white mb-1">No Diagnosis Suggestions</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Normal findings — no new diagnoses indicated.</div>
                      </div>
                    ) : (
                      analysis.dxSuggestions.map(dx => {
                        const isExpanded = expandedDx === dx.icdCode;
                        return (
                          <div key={dx.icdCode} className="rounded-xl overflow-hidden"
                            style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                            <button onClick={() => setExpandedDx(isExpanded ? null : dx.icdCode)}
                              className="w-full p-3 text-left">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold" style={{ color: colors.text }}>{dx.suggestedDiagnosis}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: 'rgba(26,143,168,0.1)', color: colors.accent }}>
                                      {dx.icdCode}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                                      {dx.confidence}% confidence
                                    </span>
                                  </div>
                                  <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>{dx.basis}</p>
                                </div>
                                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                  <span className="text-[10px] font-medium" style={{ color: colors.accent }}>
                                    {isExpanded ? 'Less' : 'Details'}
                                  </span>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: colors.accent }} /> : <ChevronDown className="w-4 h-4" style={{ color: colors.accent }} />}
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                                {/* Supporting Findings */}
                                <div className="pt-3">
                                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                    Supporting Findings
                                  </div>
                                  <div className="space-y-1">
                                    {dx.supportingFindings.map((f, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
                                        <CheckCircle className="w-3 h-3 flex-shrink-0 text-green-500" />
                                        {f}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Differentials */}
                                {dx.differentials.length > 0 && (
                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#f59e0b' }}>
                                      Differential / Alternative Codes
                                    </div>
                                    {dx.differentials.map((alt, i) => (
                                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg text-xs mb-1"
                                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                        <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold" style={{ color: colors.text }}>{alt.diagnosis}</span>
                                            <span className="text-[10px] px-1 py-0.5 rounded font-mono" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                                              {alt.icdCode}
                                            </span>
                                          </div>
                                          <p className="mt-0.5" style={{ color: colors.textMuted }}>{alt.reasoning}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Coding Note */}
                                <div className="flex items-start gap-2 p-2.5 rounded-lg"
                                  style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-blue-400">Coding Guidance</div>
                                    <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{dx.codingNote}</p>
                                  </div>
                                </div>

                                {/* Add to Encounter button */}
                                <button className="w-full py-2 text-xs text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                                  style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                                  <Plus className="w-3.5 h-3.5" />
                                  Add {dx.icdCode} to Problem List
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ============ Follow-up Orders Tab ============ */}
                {activeTab === 'followup' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl flex items-start gap-3"
                      style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                      <Brain className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                      <div>
                        <div className="text-xs font-semibold text-white mb-1">AI-Recommended Follow-up</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Based on imaging findings and clinical context, these follow-up studies are recommended.
                        </div>
                      </div>
                    </div>

                    {analysis.followUpRecommendations.length > 0 ? (
                      <>
                        <div className="space-y-1.5">
                          {analysis.followUpRecommendations.map((study, idx) => {
                            const isSelected = followUpSelections.has(idx);
                            return (
                              <div key={idx}
                                className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                                onClick={() => toggleFollowUp(idx)}
                                style={{
                                  background: isSelected ? colors.accentLight : 'rgba(255,255,255,0.06)',
                                  border: isSelected ? '1px solid rgba(26,143,168,0.2)' : '1px solid rgba(255,255,255,0.1)',
                                }}>
                                <button className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: isSelected ? colors.accent : 'transparent', border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.2)' }}>
                                  {isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />}
                                </button>
                                <ScanLine className="w-4 h-4 flex-shrink-0" style={{ color: isSelected ? colors.accent : 'rgba(255,255,255,0.4)' }} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold" style={{ color: isSelected ? colors.text : 'rgba(255,255,255,0.8)' }}>
                                      {study.study}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                                      style={{
                                        background: study.priority === 'stat' ? 'rgba(239,68,68,0.2)' : study.priority === 'urgent' ? 'rgba(245,158,11,0.2)' : 'rgba(26,143,168,0.2)',
                                        color: study.priority === 'stat' ? '#fca5a5' : study.priority === 'urgent' ? '#fcd34d' : '#7dd3c8',
                                      }}>
                                      {study.priority}
                                    </span>
                                  </div>
                                  <div className="text-[10px]" style={{ color: isSelected ? colors.textMuted : 'rgba(255,255,255,0.4)' }}>
                                    {study.rationale}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <Calendar className="w-3 h-3" style={{ color: isSelected ? colors.accent : 'rgba(255,255,255,0.3)' }} />
                                  <span className="text-[10px] font-medium" style={{ color: isSelected ? colors.accent : 'rgba(255,255,255,0.4)' }}>
                                    {study.timeframe}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {followUpSelections.size > 0 && (
                          <div className="flex items-center justify-between pt-2">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                              style={{ background: 'rgba(37,184,169,0.15)', color: '#7dd3c8' }}>
                              <ScanLine className="w-3 h-3" />
                              {followUpSelections.size} {followUpSelections.size === 1 ? 'study' : 'studies'} selected
                            </span>
                            <button className="px-5 py-2 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02]"
                              style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                              <ScanLine className="w-4 h-4" />
                              Order Follow-up Studies
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-6 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                        <div className="text-sm font-semibold text-white mb-1">No Follow-up Needed</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Normal findings — routine monitoring schedule applies.</div>
                      </div>
                    )}

                    {/* New Order button */}
                    {onNewOrder && (
                      <button onClick={onNewOrder}
                        className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                        + New Imaging Order
                      </button>
                    )}
                  </div>
                )}

                {/* ============ Patient Message Tab ============ */}
                {activeTab === 'message' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(200,164,78,0.1)' }}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: colors.gold }} />
                      <span className="text-xs font-medium" style={{ color: colors.gold }}>AI-generated draft — click to edit</span>
                    </div>

                    <textarea
                      ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                      defaultValue={analysis.patientMessage}
                      className="w-full p-4 rounded-xl text-sm leading-relaxed resize-none transition-all"
                      style={{ border: `2px solid rgba(255,255,255,0.1)`, background: colors.sectionBg, outline: 'none', color: colors.text }}
                    />

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} title="Print">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button className="px-5 py-2 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                        <Send className="w-4 h-4" />
                        Send Results to Patient
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ background: colors.panelBgRight }}>
          <div className="text-center">
            <ScanLine className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <div className="text-sm text-white/40">Select an imaging result to review</div>
          </div>
        </div>
      )}
    </div>
  );
}
