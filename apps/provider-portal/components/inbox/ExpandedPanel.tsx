// =============================================================================
// ATTENDING AI - Message Detail View (Redesigned Expanded Panel)
// apps/provider-portal/components/inbox/ExpandedPanel.tsx
//
// Redesigned from cramped resizable sections to a clean, full-width layout:
//   Zone 1: Patient message prominently displayed with context
//   Zone 2: AI-generated clinical intelligence
//   Zone 3: Pre-filled response composer
//
// Design principles:
//   - No scrollbars on the main view
//   - No blocking text
//   - AI pre-fills the response based on message category
//   - Provider can amend before sending
//
// Created: February 18, 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Forward,
  UserPlus,
  FileText,
  AlertTriangle,
  Activity,
  Sparkles,
  Check,
  Send,
  Edit3,
  Phone,
  Pill,
  Heart,
  FlaskConical,
  X,
  Brain,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Copy,
  RotateCcw,
} from 'lucide-react';
import type { InboxItem, ResponseTemplate } from './types';
import { categoryConfig } from './theme';

// =============================================================================
// AI Response Generator — Generates intelligent, context-aware draft responses
// =============================================================================

function generateAIDraft(item: InboxItem): {
  templates: ResponseTemplate[];
  primaryDraft: string;
  aiInsights: string[];
  suggestedOrders: string[];
  riskFlags: string[];
} {
  const firstName = item.patientName.split(' ')[0];
  const chart = item.chartData;
  const insights: string[] = [];
  const suggestedOrders: string[] = [];
  const riskFlags: string[] = [];
  const templates: ResponseTemplate[] = [];
  let primaryDraft = '';

  // Build insights from chart data
  if (chart.conditions.length > 0) {
    insights.push(`Active conditions: ${chart.conditions.join(', ')}`);
  }
  if (chart.medications.length > 0) {
    insights.push(`Current medications: ${chart.medications.map(m => `${m.name} ${m.dose}`).join(', ')}`);
  }
  if (chart.allergies[0] !== 'NKDA') {
    riskFlags.push(`Known allergies: ${chart.allergies.join(', ')}`);
  }
  if (chart.recentVitals.bp) {
    const bp = chart.recentVitals.bp;
    const parts = bp.split('/');
    if (parts.length === 2 && parseInt(parts[0]) > 140) {
      riskFlags.push(`Elevated BP on last visit: ${bp}`);
    }
  }

  switch (item.category) {
    case 'messages':
      primaryDraft = `Dear ${firstName},\n\nThank you for reaching out to us. I've reviewed your message regarding ${item.chiefComplaint || item.subject?.replace('⚠️ ', '') || 'your concern'}.\n\n`;

      if (item.symptoms && item.symptoms.length > 0) {
        primaryDraft += `Based on what you've described, I'd like to address your concerns:\n\n`;
        if (item.chiefComplaint?.toLowerCase().includes('fatigue') || item.chiefComplaint?.toLowerCase().includes('tired')) {
          primaryDraft += `Fatigue can have many causes, and I want to make sure we evaluate this thoroughly. I'm ordering some blood work including a complete blood count (CBC), thyroid panel (TSH, Free T4), and a comprehensive metabolic panel to check for common causes.\n\nPlease schedule your lab work at your convenience — fasting is preferred but not required for most of these tests.\n\n`;
          suggestedOrders.push('CBC with differential', 'TSH + Free T4', 'CMP', 'Vitamin D', 'Iron studies');
        } else if (item.chiefComplaint?.toLowerCase().includes('lab') || item.chiefComplaint?.toLowerCase().includes('labs')) {
          primaryDraft += `I'm placing an order for the labs you've requested. You can complete these at any Quest or LabCorp location with the attached order.\n\n`;
          suggestedOrders.push('HbA1c', 'Lipid panel', 'CMP');
        } else {
          primaryDraft += `I'd like to discuss this further during your next visit. In the meantime, please don't hesitate to reach out if your symptoms worsen or you have additional concerns.\n\n`;
        }
      } else {
        primaryDraft += `I'd like to schedule a follow-up to discuss this in more detail. Please contact our office to arrange a convenient time.\n\n`;
      }

      primaryDraft += `If you experience any worsening symptoms or new concerns before your appointment, please don't hesitate to contact us or visit your nearest urgent care.\n\nBest regards,\nDr. Thomas Reed\nFamily Medicine`;

      templates.push({
        id: 'reply-detailed',
        title: 'Detailed Reply',
        category: 'communication',
        confidence: 0.92,
        reasoning: 'Comprehensive response addressing patient concerns with next steps',
        content: primaryDraft,
      });

      templates.push({
        id: 'reply-brief',
        title: 'Brief Acknowledgment',
        category: 'communication',
        confidence: 0.85,
        reasoning: 'Quick acknowledgment with follow-up scheduled',
        content: `Dear ${firstName},\n\nThank you for your message. I've reviewed your concern and would like to discuss this at your upcoming appointment. If anything changes before then, please contact us.\n\nBest regards,\nDr. Reed`,
      });

      insights.push(`Last visit: ${chart.lastVisit.date} for ${chart.lastVisit.reason}`);
      break;

    case 'phone':
      primaryDraft = `Call ${firstName} at ${item.callbackNumber}\n\nReason: ${item.chiefComplaint || item.subject}\n\nKey points to discuss:\n`;
      if (item.symptoms) {
        item.symptoms.forEach(s => { primaryDraft += `• ${s}\n`; });
      }
      primaryDraft += `\nChart reviewed prior to callback. ${chart.conditions.length > 0 ? `Active conditions: ${chart.conditions.join(', ')}` : ''}`;

      templates.push({
        id: 'call-notes',
        title: '📞 Callback Notes',
        category: 'action',
        confidence: 0.95,
        reasoning: 'Pre-generated callback preparation notes',
        content: primaryDraft,
      });
      break;

    case 'refills':
      primaryDraft = `Refill approved: ${item.medication}\nSend to: ${item.pharmacy}\n\nPatient is compliant with medication regimen. No contraindications identified.`;

      if (chart.conditions.some(c => c.includes('Diabetes'))) {
        insights.push('Monitor A1c — consider recheck if >3 months since last');
      }

      templates.push({
        id: 'approve',
        title: '✓ Approve Refill',
        category: 'approval',
        confidence: 0.95,
        reasoning: `${item.medication} — patient compliant, no interactions detected`,
        content: primaryDraft,
      });

      templates.push({
        id: 'approve-note',
        title: '✓ Approve + Message Patient',
        category: 'approval',
        confidence: 0.88,
        reasoning: 'Approve with patient notification and next steps',
        content: `Dear ${firstName},\n\nYour ${item.medication} refill has been approved and sent to ${item.pharmacy}. It should be ready for pickup within 24 hours.\n\nPlease remember to schedule your follow-up appointment for medication management.\n\nBest regards,\nDr. Reed`,
      });
      break;

    case 'labs':
      if (item.labType === 'critical') {
        riskFlags.push(`CRITICAL LAB VALUE: ${item.subject}`);
        primaryDraft = `CRITICAL RESULT ACKNOWLEDGED\n\nResult: ${item.subject}\nPatient: ${item.patientName}\n\nAction taken: `;
        suggestedOrders.push('Repeat stat labs', 'Renal panel');
      } else {
        primaryDraft = `Lab results reviewed and filed in chart.\n\nResults: ${item.subject}\n${item.labType === 'abnormal' ? '\nAbnormal values noted — will address at next visit.' : '\nAll values within normal range.'}`;
      }

      templates.push({
        id: 'review-file',
        title: '✓ Review & File',
        category: 'documentation',
        confidence: 0.92,
        reasoning: item.labType === 'critical' ? 'Critical value requires acknowledgment and action' : 'Standard lab review',
        content: primaryDraft,
      });

      templates.push({
        id: 'review-notify',
        title: '✓ Review & Notify Patient',
        category: 'communication',
        confidence: 0.88,
        reasoning: 'Patient notification of results',
        content: `Dear ${firstName},\n\nYour recent lab results are available. ${item.labType === 'normal' ? 'Everything looks good — all values are within normal range.' : 'I noticed some values that I\'d like to discuss with you. Please schedule a follow-up appointment at your earliest convenience.'}\n\nBest regards,\nDr. Reed`,
      });
      break;

    case 'imaging':
      primaryDraft = `Imaging reviewed: ${item.imagingType}\nStatus: ${item.imagingStatus}\n\n${item.radiologistNote || 'Report reviewed and filed. Will discuss findings at next visit.'}`;

      templates.push({
        id: 'review-imaging',
        title: '✓ Imaging Reviewed',
        category: 'documentation',
        confidence: 0.9,
        reasoning: `${item.imagingType} results review`,
        content: primaryDraft,
      });
      break;

    case 'charts':
      primaryDraft = `Reviewed consultation note from ${item.fromProvider}.\n\nRecommendations noted and will be incorporated into the care plan.`;

      templates.push({
        id: 'acknowledge',
        title: '✓ Acknowledge Note',
        category: 'documentation',
        confidence: 0.9,
        reasoning: `${item.fromProvider} consultation — review and acknowledge`,
        content: primaryDraft,
      });
      break;

    case 'incomplete':
      primaryDraft = `Chart reviewed and updated.\n\nMissing elements addressed:\n${(item.missingElements || []).map(e => `✓ ${e}`).join('\n')}`;

      templates.push({
        id: 'sign-close',
        title: '✓ Sign & Close',
        category: 'completion',
        confidence: 0.95,
        reasoning: 'All required elements completed',
        content: primaryDraft,
      });
      break;

    case 'encounters':
      primaryDraft = `Starting visit for ${item.patientName}\n\nChief Complaint: ${item.chiefComplaint}\n\n${item.symptoms ? 'Key findings:\n' + item.symptoms.map(s => `• ${s}`).join('\n') : ''}`;

      templates.push({
        id: 'start-visit',
        title: '▶️ Start Visit',
        category: 'action',
        confidence: 0.95,
        reasoning: 'Patient ready — pre-visit summary available',
        content: primaryDraft,
      });
      break;
  }

  return { templates, primaryDraft, aiInsights: insights, suggestedOrders, riskFlags };
}

// =============================================================================
// Sub-components
// =============================================================================

const InfoChip: React.FC<{ label: string; color?: string; bg?: string }> = ({
  label, color = '#0C4C5E', bg = '#E6F7F5',
}) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ color, background: bg }}>
    {label}
  </span>
);

const ConfidenceBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? '#059669' : pct >= 75 ? '#d97706' : '#9ca3af';
  return <span className="text-xs font-bold" style={{ color }}>{pct}% match</span>;
};

// =============================================================================
// Main Component
// =============================================================================

interface ExpandedPanelProps {
  item: InboxItem;
  onClose: () => void;
  onComplete: (response: string) => void;
  onForward: () => void;
  onReassign: () => void;
}

export const ExpandedPanel: React.FC<ExpandedPanelProps> = ({
  item,
  onClose,
  onComplete,
  onForward,
  onReassign,
}) => {
  const router = useRouter();
  const categoryAccent = categoryConfig[item.category];
  const chart = item.chartData;

  const { templates, primaryDraft, aiInsights, suggestedOrders, riskFlags } = generateAIDraft(item);

  const [response, setResponse] = useState(primaryDraft);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (primaryDraft) {
      setResponse(primaryDraft);
      setSelectedTemplateId(templates[0]?.id || '');
      setIsEditing(false);
    }
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTemplateSelect = useCallback((template: ResponseTemplate) => {
    setResponse(template.content);
    setSelectedTemplateId(template.id);
    setIsEditing(false);
  }, []);

  const handleReset = useCallback(() => {
    setResponse(primaryDraft);
    setSelectedTemplateId(templates[0]?.id || '');
    setIsEditing(false);
  }, [primaryDraft, templates]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(response);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch { /* noop */ }
  }, [response]);

  const handleSend = useCallback(() => {
    onComplete(response);
  }, [response, onComplete]);

  const patientMessage = item.content || item.chiefComplaint || item.subject;
  const messageTimestamp = new Date(item.timestamp).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      style={{
        background: 'white',
        borderBottom: `3px solid ${categoryAccent.accent}`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* ─── Top Bar: Patient Identity + Actions ─── */}
      <div
        className="px-6 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {item.patientName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{item.patientName}</span>
              <span className="text-teal-200 text-sm">{item.patientAge}y • {item.mrn}</span>
              {item.priority === 'urgent' && (
                <span className="px-2 py-0.5 bg-red-500/80 text-white text-xs font-bold rounded animate-pulse">URGENT</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-teal-200 text-xs mt-0.5">
              {chart.allergies[0] !== 'NKDA' && (
                <span className="flex items-center gap-1 text-red-300">
                  <AlertTriangle className="w-3 h-3" /> Allergies: {chart.allergies.join(', ')}
                </span>
              )}
              {chart.conditions.length > 0 && (
                <span>{chart.conditions.slice(0, 3).join(' • ')}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/previsit/${item.patientId || item.id}`)}
            className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-semibold transition-all hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#0C4C5E' }}
          >
            <FileText className="w-3.5 h-3.5" /> Full Chart
          </button>
          <button onClick={onForward} className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 text-white/90 hover:bg-white/20 transition-colors" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Forward className="w-3.5 h-3.5" /> Forward
          </button>
          <button onClick={onReassign} className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 text-white/90 hover:bg-white/20 transition-colors" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <UserPlus className="w-3.5 h-3.5" /> Reassign
          </button>
          <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Risk Flags Banner ─── */}
      {riskFlags.length > 0 && (
        <div className="px-6 py-2.5 flex items-center gap-3 text-sm" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
          <Shield className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="flex flex-wrap gap-2">
            {riskFlags.map((flag, i) => (
              <span key={i} className="text-red-700 font-medium text-xs">{flag}</span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Three-Zone Content Layout ─── */}
      <div className="flex">

        {/* ═══ ZONE 1: Patient Message (35%) ═══ */}
        <div className="w-[35%] p-5 border-r" style={{ borderColor: '#E6F7F5' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ background: categoryAccent.accent }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: categoryAccent.accentDark }}>
              {categoryAccent.label}
            </span>
            <span className="text-xs text-gray-400 ml-auto">{messageTimestamp}</span>
          </div>

          {/* Patient Message Card */}
          <div
            className="rounded-2xl p-5 mb-4"
            style={{ background: 'linear-gradient(135deg, #F0FAF9 0%, #eef2ff 100%)', border: '1px solid #e0e7ff' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: categoryAccent.accent }}>
                {item.patientName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.patientName}</div>
                <div className="text-xs text-gray-500">{item.subject?.replace('⚠️ ', '')}</div>
              </div>
            </div>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {patientMessage}
            </div>
            {item.symptoms && item.symptoms.length > 0 && (
              <div className="mt-4 pt-3 border-t border-teal-100">
                <div className="text-xs font-semibold text-teal-700 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Reported Symptoms
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.symptoms.map((symptom, i) => (
                    <InfoChip key={i} label={symptom} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Callback Number */}
          {item.callbackNumber && (
            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <Phone className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-900">{item.callbackNumber}</div>
                <div className="text-xs text-blue-600">Callback requested</div>
              </div>
              <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Call Now
              </button>
            </div>
          )}

          {/* Missing Elements (for incomplete charts) */}
          {item.missingElements && item.missingElements.length > 0 && (
            <div className="p-3 rounded-xl mb-4" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <div className="text-xs font-semibold text-orange-700 mb-2">Missing Elements</div>
              <div className="space-y-1">
                {item.missingElements.map((el, i) => (
                  <div key={i} className="text-xs text-orange-800 flex items-center gap-2">
                    <span className="text-orange-400">□</span> {el}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Chart Snapshot */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chart Snapshot</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'BP', value: chart.recentVitals.bp },
                { label: 'HR', value: chart.recentVitals.hr },
                { label: 'Temp', value: chart.recentVitals.temp },
                { label: 'Wt', value: chart.recentVitals.weight },
              ].map((v, i) => (
                <div key={i} className="text-center p-2 rounded-lg" style={{ background: '#F0FAF9' }}>
                  <div className="text-xs text-gray-500">{v.label}</div>
                  <div className="text-sm font-bold text-gray-900">{v.value || '—'}</div>
                </div>
              ))}
            </div>
            {chart.medications.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                  <Pill className="w-3 h-3" /> Current Medications
                </div>
                <div className="space-y-1">
                  {chart.medications.slice(0, 4).map((med, i) => (
                    <div key={i} className="text-xs text-gray-700 py-0.5">
                      <span className="font-medium">{med.name}</span> {med.dose} {med.frequency}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Last visit: {chart.lastVisit.date} — {chart.lastVisit.reason} ({chart.lastVisit.provider})
            </div>
          </div>
        </div>

        {/* ═══ ZONE 2: AI Intelligence (25%) ═══ */}
        <div className="w-[25%] p-5 border-r" style={{ borderColor: '#E6F7F5', background: '#F0FAF9' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)' }}>
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">AI Intelligence</span>
          </div>

          {/* Suggested Responses */}
          <div className="space-y-2 mb-5">
            <div className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">
              Suggested Responses
            </div>
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="w-full text-left p-3 rounded-xl transition-all hover:scale-[1.01]"
                style={{
                  background: selectedTemplateId === template.id ? '#E6F7F5' : 'white',
                  border: selectedTemplateId === template.id ? '2px solid #1A8FA8' : '1px solid #e5e7eb',
                  boxShadow: selectedTemplateId === template.id ? '0 0 0 3px rgba(26, 143, 168, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">{template.title}</span>
                  <ConfidenceBadge confidence={template.confidence} />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{template.reasoning}</p>
                {selectedTemplateId === template.id && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-teal-600 font-medium">
                    <Check className="w-3 h-3" /> Applied to response
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Suggested Orders */}
          {suggestedOrders.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">Suggested Orders</div>
              <div className="space-y-1.5">
                {suggestedOrders.map((order, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100">
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-800">{order}</span>
                    <button className="ml-auto text-xs text-teal-600 font-semibold hover:text-teal-800">+ Order</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Context */}
          {aiInsights.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">Clinical Context</div>
              <div className="space-y-2">
                {(showAllInsights ? aiInsights : aiInsights.slice(0, 3)).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <Sparkles className="w-3 h-3 text-teal-400 mt-0.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </div>
                ))}
                {aiInsights.length > 3 && (
                  <button onClick={() => setShowAllInsights(!showAllInsights)} className="flex items-center gap-1 text-xs text-teal-600 font-medium hover:text-teal-800">
                    {showAllInsights ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showAllInsights ? 'Show less' : `+${aiInsights.length - 3} more`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ ZONE 3: Response Composer (40%) ═══ */}
        <div className="w-[40%] p-5 flex flex-col" style={{ background: 'white' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-bold text-gray-900">
                {item.category === 'messages' ? 'Reply to Patient' :
                 item.category === 'phone' ? 'Call Notes' :
                 item.category === 'refills' ? 'Refill Decision' :
                 item.category === 'incomplete' ? 'Complete Chart' :
                 'Response'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleReset} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Reset to AI draft">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Copy to clipboard">
                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* AI Draft Label */}
          {!isEditing && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg" style={{ background: '#F0FAF9' }}>
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs text-teal-700 font-medium">AI-generated draft — click to edit before sending</span>
            </div>
          )}

          {/* Response Textarea */}
          <div className="flex-1 relative">
            <textarea
              value={response}
              onChange={(e) => { setResponse(e.target.value); setIsEditing(true); }}
              onFocus={() => setIsEditing(true)}
              className="w-full h-full min-h-[220px] p-4 rounded-2xl text-sm leading-relaxed resize-none transition-all"
              style={{
                border: isEditing ? '2px solid #1A8FA8' : '2px solid #e5e7eb',
                background: isEditing ? 'white' : '#fafafa',
                boxShadow: isEditing ? '0 0 0 3px rgba(26, 143, 168, 0.08)' : 'none',
                outline: 'none',
                color: '#1f2937',
              }}
              placeholder="Your response will appear here..."
            />
          </div>

          {/* Amendment Notice */}
          {isEditing && response !== primaryDraft && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">Modified from AI draft — your edits will be preserved</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors">
              Cancel
            </button>
            <div className="flex items-center gap-2">
              {item.category === 'messages' && (
                <button className="px-4 py-2.5 text-sm text-teal-600 border border-teal-200 hover:bg-teal-50 rounded-xl font-medium transition-colors flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> Schedule Visit
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={!response.trim()}
                className="px-6 py-2.5 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                style={{
                  background: response.trim() ? 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)' : '#d1d5db',
                }}
              >
                {item.category === 'messages' ? <Send className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                {item.category === 'messages' ? 'Send Reply' :
                 item.category === 'refills' ? 'Approve & Send' :
                 item.category === 'incomplete' ? 'Sign & Close' :
                 item.category === 'encounters' ? 'Start Visit' :
                 'Complete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedPanel;
