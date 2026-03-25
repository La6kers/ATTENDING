// =============================================================================
// ATTENDING AI - Referrals Review (Inbox-Style Two-Column Layout)
// apps/provider-portal/components/referrals/ReferralsReview.tsx
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Search, Brain, Send, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Eye, Zap, MessageSquare,
  Clock, ArrowRightLeft, Phone, FileText, Printer,
  Calendar, ExternalLink,
} from 'lucide-react';
import {
  MOCK_REFERRAL_REVIEWS,
  generateReferralAIAnalysis,
  type ReferralReviewItem,
  type ReferralAIAnalysis,
  type ReferralStatus,
} from '../../lib/services/referralsAIAgent';

const t = {
  darkTeal: '#0C3547',
  midTeal: '#1A8FA8',
  lightTeal: '#E6F7F5',
  accentTeal: '#25B8A9',
  coral: '#e07a5f',
  gold: '#c8a44e',
  white: '#ffffff',
};

const statusColors: Record<ReferralStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#d97706', label: 'Pending' },
  scheduled: { bg: '#dbeafe', text: '#2563eb', label: 'Scheduled' },
  completed: { bg: '#d1fae5', text: '#059669', label: 'Completed' },
  denied: { bg: '#fee2e2', text: '#dc2626', label: 'Denied' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', label: 'Cancelled' },
  overdue: { bg: '#fee2e2', text: '#dc2626', label: 'Overdue' },
};

const urgencyColors: Record<string, { bg: string; text: string }> = {
  stat: { bg: '#fee2e2', text: '#dc2626' },
  urgent: { bg: '#fef3c7', text: '#d97706' },
  routine: { bg: t.lightTeal, text: t.midTeal },
};

export function ReferralsReview() {
  const [reviews] = useState<ReferralReviewItem[]>(MOCK_REFERRAL_REVIEWS);
  const [selectedMrn, setSelectedMrn] = useState<string>(reviews[0]?.mrn || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'action' | 'completed'>('all');
  const [activeTab, setActiveTab] = useState<'analysis' | 'message' | 'actions'>('analysis');
  const [expandedConsults, setExpandedConsults] = useState<Set<number>>(new Set());
  const [actionSelections, setActionSelections] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    return reviews.filter(r => {
      const matchSearch = !searchQuery || r.patientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterMode === 'all' ||
        (filterMode === 'action' && r.hasActionNeeded) ||
        (filterMode === 'completed' && r.referrals.some(ref => ref.status === 'completed'));
      return matchSearch && matchFilter;
    });
  }, [reviews, searchQuery, filterMode]);

  const selected = reviews.find(r => r.mrn === selectedMrn);
  const analysis = selected ? generateReferralAIAnalysis(selected) : null;

  const handleSelect = (mrn: string) => {
    setSelectedMrn(mrn);
    setActiveTab('analysis');
    setExpandedConsults(new Set());
    setActionSelections(new Set());
  };

  const actionNeeded = reviews.filter(r => r.hasActionNeeded).length;

  return (
    <div className="flex h-full rounded-xl overflow-hidden border" style={{ borderColor: '#C3ECE7' }}>
      {/* ═══ LEFT PANEL ═══ */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: '#C3ECE7', background: t.lightTeal }}>
        <div className="p-3 border-b" style={{ borderColor: '#C3ECE7' }}>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.midTeal }} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search referrals..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:ring-2 focus:outline-none"
              style={{ borderColor: '#8ED9CE', background: t.white }} />
          </div>
          <div className="flex gap-1.5">
            {([['all', `All (${reviews.length})`], ['action', `Action (${actionNeeded})`], ['completed', 'Completed']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilterMode(key)}
                className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
                style={{ background: filterMode === key ? t.midTeal : 'rgba(26,143,168,0.1)', color: filterMode === key ? t.white : t.midTeal }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(review => {
            const isActive = review.mrn === selectedMrn;
            return (
              <button key={review.mrn} onClick={() => handleSelect(review.mrn)}
                className="w-full text-left px-3 py-3 border-b transition-all"
                style={{
                  borderColor: '#C3ECE7',
                  background: isActive ? t.white : 'transparent',
                  borderLeft: isActive ? `4px solid ${t.gold}` : '4px solid transparent',
                }}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {review.hasActionNeeded && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.coral }} />}
                    <span className="text-sm font-semibold text-gray-900">{review.patientName}</span>
                  </div>
                  {review.actionCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full" style={{ background: '#fef3c7', color: '#d97706' }}>
                      {review.actionCount} action{review.actionCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{review.patientAge}yo {review.patientGender} • {review.mrn}</p>
                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                  {review.referrals.map(ref => {
                    const sc = statusColors[ref.status];
                    return (
                      <span key={ref.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full"
                        style={{ background: sc.bg, color: sc.text }}>
                        {ref.specialty}
                        {ref.status === 'completed' && <CheckCircle className="w-2.5 h-2.5" />}
                        {ref.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F0FAF9' }}>
        {selected && analysis ? (
          <>
            {/* Patient Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#C3ECE7', background: t.white }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: `linear-gradient(135deg, ${t.midTeal}, ${t.accentTeal})` }}>
                  {selected.patientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{selected.patientName}</h3>
                  <p className="text-xs text-gray-500">{selected.patientAge}yo {selected.patientGender} • {selected.mrn}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" style={{ color: t.coral }} />
                <span className="text-sm font-semibold" style={{ color: t.darkTeal }}>{selected.referrals.length} Referral{selected.referrals.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Referral Status Cards */}
            <div className="px-5 py-2 border-b overflow-x-auto" style={{ borderColor: '#C3ECE7', background: '#F8FDFC' }}>
              <div className="flex gap-2">
                {selected.referrals.map(ref => {
                  const sc = statusColors[ref.status];
                  const uc = urgencyColors[ref.urgency];
                  return (
                    <div key={ref.id} className="flex-shrink-0 p-2 rounded-lg border" style={{ borderColor: '#C3ECE7', background: t.white, minWidth: 180 }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900">{ref.specialty}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                      </div>
                      <p className="text-[11px] text-gray-500">{ref.referredTo}</p>
                      {ref.appointmentDate && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                          <Calendar className="w-2.5 h-2.5" /> {ref.appointmentDate}
                        </div>
                      )}
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full mt-1 inline-block" style={{ background: uc.bg, color: uc.text }}>
                        {ref.urgency.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: '#C3ECE7', background: t.white }}>
              {([
                { id: 'analysis', label: 'AI Analysis', icon: Brain },
                { id: 'message', label: 'Patient Message', icon: MessageSquare },
                { id: 'actions', label: 'Actions', icon: Zap, count: analysis.recommendedActions.length },
              ] as const).map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                    style={{
                      borderBottomColor: active ? t.gold : 'transparent',
                      color: active ? t.darkTeal : '#9ca3af',
                      background: active ? '#F8FDFC' : 'transparent',
                    }}>
                    <Icon className="w-4 h-4" style={active ? { color: t.gold } : undefined} />
                    {tab.label}
                    {'count' in tab && tab.count! > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded-full" style={{ background: active ? t.lightTeal : '#f3f4f6', color: active ? t.midTeal : '#6b7280' }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'analysis' && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-xl p-4 border" style={{ background: t.white, borderColor: '#C3ECE7' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${t.midTeal}, ${t.accentTeal})` }}>
                        <Brain className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: t.midTeal }}>Referral Status Summary</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Status Update */}
                  <div className="rounded-xl p-3 border" style={{ background: '#F8FDFC', borderColor: '#C3ECE7' }}>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Current Status</p>
                    <p className="text-sm text-gray-700">{analysis.statusUpdate}</p>
                  </div>

                  {/* Consult Notes */}
                  {selected.referrals.filter(r => r.consultNote).map((ref, idx) => {
                    const expanded = expandedConsults.has(idx);
                    return (
                      <div key={ref.id} className="rounded-xl border overflow-hidden" style={{ background: t.white, borderColor: '#C3ECE7' }}>
                        <button onClick={() => {
                          const n = new Set(expandedConsults);
                          n.has(idx) ? n.delete(idx) : n.add(idx);
                          setExpandedConsults(n);
                        }}
                          className="w-full text-left p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" style={{ color: t.midTeal }} />
                            <div>
                              <span className="text-sm font-semibold text-gray-900">{ref.specialty} Consult Note</span>
                              <span className="text-xs text-gray-500 ml-2">{ref.referredTo}</span>
                            </div>
                          </div>
                          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                        {expanded && (
                          <div className="px-3 pb-3 border-t" style={{ borderColor: '#C3ECE7' }}>
                            <p className="text-sm text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">{ref.consultNote}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* AI Consult Findings */}
                  {analysis.consultFindings && analysis.consultFindings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Key Consult Findings</h4>
                      {analysis.consultFindings.map((cf, idx) => (
                        <div key={idx} className="rounded-xl p-3 border" style={{ background: t.white, borderColor: cf.requiresAction ? '#fcd34d' : '#C3ECE7' }}>
                          <div className="flex items-start gap-2">
                            {cf.requiresAction && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{cf.finding}</p>
                              <p className="text-xs text-gray-600 mt-0.5">{cf.significance}</p>
                              <p className="text-xs mt-1" style={{ color: t.midTeal }}><span className="font-semibold">Action:</span> {cf.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Follow-Up Plan */}
                  <div className="rounded-xl p-3 border" style={{ background: t.white, borderColor: '#C3ECE7' }}>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Follow-Up Plan</p>
                    <p className="text-sm text-gray-700">{analysis.followUpPlan}</p>
                  </div>
                </div>
              )}

              {activeTab === 'message' && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4 border" style={{ background: t.white, borderColor: '#C3ECE7' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4" style={{ color: t.midTeal }} />
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: t.midTeal }}>AI-Drafted Patient Update</span>
                    </div>
                    <textarea
                      defaultValue={analysis.patientMessage}
                      className="w-full h-56 p-4 text-sm border rounded-lg resize-none focus:ring-2 focus:outline-none leading-relaxed"
                      style={{ borderColor: '#8ED9CE' }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${t.midTeal}, ${t.darkTeal})` }}>
                      <Send className="w-4 h-4" /> Send to Patient
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border"
                      style={{ borderColor: '#8ED9CE', color: t.midTeal }}>
                      <Phone className="w-4 h-4" /> Call Patient
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-4">
                  {analysis.recommendedActions.length > 0 ? (
                    <>
                      <div className="rounded-xl p-4 border" style={{ background: t.white, borderColor: '#C3ECE7' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4" style={{ color: t.gold }} />
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: t.gold }}>Recommended Actions</span>
                        </div>
                        <div className="space-y-2">
                          {analysis.recommendedActions.map((action, idx) => {
                            const isSelected = actionSelections.has(idx);
                            const pc = {
                              high: { bg: '#fee2e2', text: '#dc2626' },
                              medium: { bg: '#fef3c7', text: '#d97706' },
                              low: { bg: t.lightTeal, text: t.midTeal },
                            }[action.priority];
                            const typeIcons: Record<string, React.ReactNode> = {
                              schedule: <Calendar className="w-3.5 h-3.5 text-blue-600" />,
                              'follow-up': <Clock className="w-3.5 h-3.5" style={{ color: t.midTeal }} />,
                              order: <Zap className="w-3.5 h-3.5" style={{ color: t.gold }} />,
                              message: <MessageSquare className="w-3.5 h-3.5 text-blue-600" />,
                              'close-loop': <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
                              escalate: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
                            };
                            return (
                              <div key={idx}
                                className="p-3 rounded-lg border transition-all cursor-pointer"
                                onClick={() => {
                                  const n = new Set(actionSelections);
                                  n.has(idx) ? n.delete(idx) : n.add(idx);
                                  setActionSelections(n);
                                }}
                                style={{
                                  borderColor: isSelected ? t.midTeal : '#C3ECE7',
                                  background: isSelected ? t.lightTeal : t.white,
                                }}>
                                <div className="flex items-center gap-3">
                                  <div className="w-5 h-5 rounded border-2 flex items-center justify-center"
                                    style={{
                                      borderColor: isSelected ? t.midTeal : '#d1d5db',
                                      background: isSelected ? t.midTeal : 'transparent',
                                    }}>
                                    {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                  </div>
                                  {typeIcons[action.type]}
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                                    <p className="text-xs text-gray-500">{action.details}</p>
                                  </div>
                                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ background: pc.bg, color: pc.text }}>
                                    {action.priority}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {actionSelections.size > 0 && (
                        <button className="w-full py-3 text-sm font-semibold text-white rounded-lg"
                          style={{ background: `linear-gradient(135deg, ${t.midTeal}, ${t.darkTeal})` }}>
                          Execute {actionSelections.size} {actionSelections.size === 1 ? 'Action' : 'Actions'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                      <p className="text-sm font-medium">No pending actions</p>
                      <p className="text-xs mt-1">All referrals are on track</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="px-5 py-3 border-t flex items-center justify-end" style={{ borderColor: '#C3ECE7', background: t.white }}>
              <div className="text-[11px] text-gray-400">
                {selected.referrals.length} referral{selected.referrals.length !== 1 ? 's' : ''} • {selected.referrals.filter(r => r.status === 'completed').length} completed
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <ArrowRightLeft className="w-16 h-16 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Select a patient to review referrals</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
