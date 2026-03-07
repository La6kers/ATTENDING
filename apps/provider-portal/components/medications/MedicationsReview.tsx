// =============================================================================
// ATTENDING AI - Medications Review (Inbox-Style Two-Column Layout)
// apps/provider-portal/components/medications/MedicationsReview.tsx
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Search, Brain, Pill, Send, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Eye, Zap, MessageSquare,
  RefreshCw, XCircle, TrendingUp, ShieldAlert, Printer,
  Sparkles, Check, Plus,
} from 'lucide-react';
import {
  MOCK_MED_REVIEWS,
  generateMedAIAnalysis,
  type MedicationReviewItem,
  type MedAIAnalysis,
  type InteractionSeverity,
} from '../../lib/services/medicationsAIAgent';

import { reviewColors } from '../../lib/reviewTheme';
import { ReviewTabBar } from '../shared/ReviewTabBar';

const colors = reviewColors;

const interactionColors: Record<InteractionSeverity, { bg: string; text: string; label: string }> = {
  contraindicated: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', label: 'Contraindicated' },
  major: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', label: 'Major' },
  moderate: { bg: 'rgba(251,191,36,0.15)', text: '#fcd34d', label: 'Moderate' },
  minor: { bg: 'rgba(96,165,250,0.15)', text: '#93c5fd', label: 'Minor' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' },
  'pending-refill': { bg: 'rgba(251,191,36,0.15)', text: '#fcd34d' },
  expiring: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5' },
  discontinued: { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.4)' },
  new: { bg: 'rgba(96,165,250,0.15)', text: '#93c5fd' },
};

export function MedicationsReview({ onNewOrder }: { onNewOrder?: () => void } = {}) {
  const [reviews] = useState<MedicationReviewItem[]>(MOCK_MED_REVIEWS);
  const [selectedMrn, setSelectedMrn] = useState<string>(reviews[0]?.mrn || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'issues' | 'refills'>('all');
  const [activeTab, setActiveTab] = useState<'analysis' | 'message' | 'actions'>('analysis');
  const [expandedInteractions, setExpandedInteractions] = useState<Set<number>>(new Set());
  const [expandedOptimizations, setExpandedOptimizations] = useState<Set<number>>(new Set());
  const [actionSelections, setActionSelections] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    return reviews.filter(r => {
      const matchSearch = !searchQuery || r.patientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterMode === 'all' ||
        (filterMode === 'issues' && r.hasIssues) ||
        (filterMode === 'refills' && r.medications.some(m => m.status === 'pending-refill'));
      return matchSearch && matchFilter;
    });
  }, [reviews, searchQuery, filterMode]);

  const selected = reviews.find(r => r.mrn === selectedMrn);
  const analysis = selected ? generateMedAIAnalysis(selected) : null;

  const handleSelect = (mrn: string) => {
    setSelectedMrn(mrn);
    setActiveTab('analysis');
    setExpandedInteractions(new Set());
    setExpandedOptimizations(new Set());
    setActionSelections(new Set());
  };

  const withIssues = reviews.filter(r => r.hasIssues).length;
  const withRefills = reviews.filter(r => r.medications.some(m => m.status === 'pending-refill')).length;

  return (
    <div className="flex h-full rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
      {/* LEFT PANEL: Patient Med Reviews */}
      <div className="w-[300px] flex-shrink-0 flex flex-col" style={{ background: colors.panelBg, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search patients..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:ring-2 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: colors.text }} />
          </div>
          <div className="flex gap-1.5">
            {([['all', `All (${reviews.length})`], ['issues', `Issues (${withIssues})`], ['refills', `Refills (${withRefills})`]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilterMode(key)}
                className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
                style={{ background: filterMode === key ? colors.accent : 'rgba(255,255,255,0.08)', color: filterMode === key ? 'white' : 'rgba(255,255,255,0.5)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filtered.map(review => {
            const isActive = review.mrn === selectedMrn;
            const pendingRefills = review.medications.filter(m => m.status === 'pending-refill').length;
            return (
              <button key={review.mrn} onClick={() => handleSelect(review.mrn)}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${colors.gold}` : '3px solid transparent',
                }}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {review.hasIssues && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.coral }} />}
                    <span className="text-sm font-semibold text-white">{review.patientName}</span>
                  </div>
                  {review.issueCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fcd34d' }}>
                      {review.issueCount} {review.issueCount === 1 ? 'issue' : 'issues'}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: colors.textMuted }}>{review.patientAge}yo {review.patientGender} &bull; {review.mrn}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Pill className="w-3 h-3" style={{ color: colors.accent }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{review.medications.length} medications</span>
                  {pendingRefills > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fcd34d' }}>
                      {pendingRefills} refill{pendingRefills > 1 ? 's' : ''} pending
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: colors.panelBgRight }}>
        {selected && analysis ? (
          <>
            {/* Patient Header */}
            <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ background: colors.headerGradient, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.2)' }}>
                  {selected.patientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selected.patientName}</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{selected.patientAge}yo {selected.patientGender} &bull; {selected.mrn}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4" style={{ color: colors.gold }} />
                <span className="text-sm font-semibold text-white">{selected.medications.length} Active Medications</span>
              </div>
            </div>

            {/* Medication List (compact pills) */}
            <div className="px-5 py-2 overflow-x-auto flex-shrink-0" style={{ background: colors.cardDark, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex gap-1.5 flex-wrap">
                {selected.medications.map(med => {
                  const sc = statusColors[med.status] || statusColors.active;
                  return (
                    <span key={med.id} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-full font-medium"
                      style={{ background: sc.bg, color: sc.text }}>
                      {med.medication} {med.dose}
                      {med.status === 'pending-refill' && <RefreshCw className="w-2.5 h-2.5" />}
                      {med.status === 'new' && <Zap className="w-2.5 h-2.5" />}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Tabs */}
            <ReviewTabBar
              tabs={[
                { id: 'analysis', label: 'AI Analysis', icon: Brain },
                { id: 'actions', label: 'Actions', icon: Zap, count: analysis.pendedActions.length },
                { id: 'message', label: 'Message', icon: Send },
              ]}
              activeTab={activeTab}
              onTabChange={(id) => setActiveTab(id as typeof activeTab)}
            />

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'analysis' && (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="rounded-xl p-3 flex items-start gap-3" style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: colors.headerGradient }}>
                      <Brain className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mb-1">AI Medication Review</div>
                      <p className="text-sm leading-relaxed" style={{ color: colors.text }}>{analysis.summary}</p>
                    </div>
                  </div>

                  {/* Drug Interactions */}
                  {analysis.interactions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" style={{ color: '#fca5a5' }} />
                        <span style={{ color: '#fca5a5' }}>Drug Interactions ({analysis.interactions.length})</span>
                      </h4>
                      {analysis.interactions.map((interaction, idx) => {
                        const ic = interactionColors[interaction.severity];
                        const expanded = expandedInteractions.has(idx);
                        return (
                          <div key={idx} className="rounded-xl overflow-hidden" style={{ background: colors.sectionBg, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-white">{interaction.drug1}</span>
                                    <span className="text-xs" style={{ color: colors.textMuted }}>+</span>
                                    <span className="text-sm font-bold text-white">{interaction.drug2}</span>
                                  </div>
                                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{interaction.description}</p>
                                </div>
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full ml-2" style={{ background: ic.bg, color: ic.text }}>
                                  {ic.label}
                                </span>
                              </div>
                              <button onClick={() => {
                                const n = new Set(expandedInteractions);
                                n.has(idx) ? n.delete(idx) : n.add(idx);
                                setExpandedInteractions(n);
                              }}
                                className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color: colors.accent }}>
                                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {expanded ? 'Less' : 'Details'}
                              </button>
                            </div>
                            {expanded && (
                              <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                {interaction.mechanism && (
                                  <div className="mt-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <p className="text-xs font-semibold text-white mb-0.5">Mechanism</p>
                                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{interaction.mechanism}</p>
                                  </div>
                                )}
                                <div className="p-2.5 rounded-lg" style={{ background: colors.accentLight }}>
                                  <p className="text-xs font-semibold text-white mb-0.5">Recommendation</p>
                                  <p className="text-xs" style={{ color: colors.text }}>{interaction.recommendation}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Optimizations */}
                  {analysis.optimizations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: colors.gold }} />
                        <span style={{ color: colors.gold }}>Optimization Opportunities</span>
                      </h4>
                      {analysis.optimizations.map((opt, idx) => {
                        const expanded = expandedOptimizations.has(idx);
                        const typeLabels: Record<string, string> = { 'dose-adjust': 'Dose Adjust', deprescribe: 'Deprescribe', substitute: 'Substitute', add: 'Add', monitor: 'Monitor' };
                        const priorityColors: Record<string, { bg: string; text: string }> = {
                          high: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5' },
                          medium: { bg: 'rgba(251,191,36,0.15)', text: '#fcd34d' },
                          low: { bg: colors.accentLight, text: '#7dd3c8' },
                        };
                        const pc = priorityColors[opt.priority];
                        return (
                          <div key={idx} className="rounded-xl overflow-hidden" style={{ background: colors.sectionBg, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="p-3">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded" style={{ background: colors.accentLight, color: '#7dd3c8' }}>
                                      {typeLabels[opt.type]}
                                    </span>
                                    <span className="text-sm font-semibold text-white">{opt.medication}</span>
                                  </div>
                                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{opt.recommendation}</p>
                                </div>
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ background: pc.bg, color: pc.text }}>
                                  {opt.priority}
                                </span>
                              </div>
                              <button onClick={() => {
                                const n = new Set(expandedOptimizations);
                                n.has(idx) ? n.delete(idx) : n.add(idx);
                                setExpandedOptimizations(n);
                              }}
                                className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: colors.accent }}>
                                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                Evidence
                              </button>
                            </div>
                            {expanded && (
                              <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="mt-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                  <p className="text-xs font-semibold text-white mb-0.5">Rationale</p>
                                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{opt.rationale}</p>
                                </div>
                                <div className="p-2.5 rounded-lg" style={{ background: colors.accentLight }}>
                                  <p className="text-xs font-semibold text-white mb-0.5">Evidence</p>
                                  <p className="text-xs" style={{ color: colors.text }}>{opt.evidence}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Adherence */}
                  <div className="rounded-xl p-3" style={{ background: colors.sectionBg, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: colors.textMuted }}>Adherence Insights</p>
                    <p className="text-sm" style={{ color: colors.text }}>{analysis.adherenceInsights}</p>
                    {selected.medications.some(m => m.adherenceScore) && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {selected.medications.filter(m => m.adherenceScore).map(med => (
                          <div key={med.id} className="flex items-center gap-1.5 text-[11px]">
                            <span style={{ color: colors.textMuted }}>{med.genericName}:</span>
                            <div className="w-16 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                              <div className="h-full rounded-full" style={{
                                width: `${med.adherenceScore}%`,
                                background: (med.adherenceScore || 0) >= 90 ? '#6ee7b7' : (med.adherenceScore || 0) >= 80 ? '#fcd34d' : '#fca5a5',
                              }} />
                            </div>
                            <span className="font-semibold" style={{
                              color: (med.adherenceScore || 0) >= 90 ? '#6ee7b7' : (med.adherenceScore || 0) >= 80 ? '#fcd34d' : '#fca5a5',
                            }}>{med.adherenceScore}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cost Savings */}
                  {analysis.costSavings && analysis.costSavings.length > 0 && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: colors.gold }}>Cost Savings Available</p>
                      {analysis.costSavings.map((cs, idx) => (
                        <div key={idx} className="text-sm" style={{ color: colors.text }}>
                          <span className="font-semibold" style={{ color: colors.gold }}>${cs.monthlySavings}/mo savings:</span> {cs.notes}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                    style={{ border: '2px solid rgba(255,255,255,0.1)', background: colors.sectionBg, outline: 'none', color: colors.text }}
                  />

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} title="Print">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button className="px-5 py-2 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                      <Send className="w-4 h-4" />
                      Send to Patient
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-3">
                  {analysis.pendedActions.length > 0 ? (
                    <>
                      <div className="p-3 rounded-xl flex items-start gap-3"
                        style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                        <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                        <div>
                          <div className="text-xs font-semibold text-white mb-1">AI-Pended Actions</div>
                          <div className="text-[11px]" style={{ color: colors.textMuted }}>
                            Select actions to execute. These were identified from medication review analysis.
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {analysis.pendedActions.map((action, idx) => {
                          const isSelected = actionSelections.has(idx);
                          const typeIcons: Record<string, React.ReactNode> = {
                            refill: <RefreshCw className="w-3.5 h-3.5" style={{ color: '#fcd34d' }} />,
                            'dose-change': <TrendingUp className="w-3.5 h-3.5" style={{ color: '#7dd3c8' }} />,
                            'new-rx': <Pill className="w-3.5 h-3.5" style={{ color: '#93c5fd' }} />,
                            discontinue: <XCircle className="w-3.5 h-3.5" style={{ color: '#fca5a5' }} />,
                            'lab-order': <Zap className="w-3.5 h-3.5" style={{ color: colors.gold }} />,
                            'prior-auth': <ShieldAlert className="w-3.5 h-3.5" style={{ color: '#c4b5fd' }} />,
                          };
                          return (
                            <div key={idx}
                              className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                              onClick={() => {
                                const n = new Set(actionSelections);
                                n.has(idx) ? n.delete(idx) : n.add(idx);
                                setActionSelections(n);
                              }}
                              style={{
                                background: isSelected ? colors.accentLight : colors.sectionBg,
                                border: isSelected ? '1px solid rgba(26,143,168,0.3)' : '1px solid rgba(255,255,255,0.08)',
                              }}>
                              <button className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: isSelected ? colors.accent : 'transparent', border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.2)' }}>
                                {isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />}
                              </button>
                              {typeIcons[action.type]}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white">{action.label}</p>
                                <p className="text-[11px]" style={{ color: colors.textMuted }}>{action.details}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {actionSelections.size > 0 && (
                        <button className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:shadow-lg hover:scale-[1.01]"
                          style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                          Execute {actionSelections.size} {actionSelections.size === 1 ? 'Action' : 'Actions'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
                      <p className="text-sm font-medium text-white/40">No pending actions</p>
                      <p className="text-xs mt-1" style={{ color: colors.textMuted }}>All medications are up to date</p>
                    </div>
                  )}

                  {/* New Order button */}
                  {onNewOrder && (
                    <button onClick={onNewOrder}
                      className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                      + New Prescription
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ background: colors.cardDark, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-2">
                {!selected.reviewed && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                    style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                    <Eye className="w-3.5 h-3.5" /> Mark as Reviewed
                  </button>
                )}
              </div>
              <div className="text-[11px]" style={{ color: colors.textMuted }}>
                {selected.medications.reduce((s, m) => s + (m.costPerMonth || 0), 0) > 0 &&
                  `Est. monthly cost: $${selected.medications.reduce((s, m) => s + (m.costPerMonth || 0), 0)}`}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Pill className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <div className="text-sm text-white/40">Select a patient to review medications</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
