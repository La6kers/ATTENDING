// =============================================================================
// ATTENDING AI - Provider Inbox (Messages Only)
// apps/provider-portal/components/inbox/ProviderInbox.tsx
//
// Layout: [Message List (left)] | [AI Detail Panel (right)]
// Messages only — labs, imaging, referrals etc. are on the Dashboard.
//
// March 2026
// =============================================================================

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search, RefreshCw, Inbox, Clock, MessageSquare, Phone,
  CheckCheck, AlertTriangle, ChevronRight, ChevronDown, ChevronUp, Mail, FolderCheck,
} from 'lucide-react';
import type { InboxItem, Provider, PatientChartData } from './types';
import { ExpandedPanel } from './ExpandedPanel';
import { ActionModal } from './ActionModal';
import { Toast } from './Toast';

// =============================================================================
// Providers for forward/reassign
// =============================================================================

const PROVIDERS: Provider[] = [
  { id: 'dr-reed', name: 'Dr. Thomas Reed', role: 'Family Medicine', department: 'Primary Care' },
  { id: 'dr-patel', name: 'Dr. Amit Patel', role: 'Cardiologist', department: 'Cardiology' },
  { id: 'dr-kim', name: 'Dr. Jennifer Kim', role: 'Psychiatrist', department: 'Behavioral Health' },
  { id: 'dr-wong', name: 'Dr. Michelle Wong', role: 'Internal Medicine', department: 'Primary Care' },
  { id: 'np-johnson', name: 'Sarah Johnson, NP', role: 'Nurse Practitioner', department: 'Primary Care' },
];

// =============================================================================
// Chart data helper
// =============================================================================

function makeChart(conditions: string[], opts?: {
  allergies?: string[];
  extraMeds?: { id: string; name: string; dose: string; frequency: string }[];
  labs?: PatientChartData['recentLabs'];
  vitals?: Partial<PatientChartData['recentVitals']>;
}): PatientChartData {
  const hasDM = conditions.includes('Type 2 Diabetes');
  const hasHTN = conditions.includes('Hypertension');
  const hasHyperLip = conditions.includes('Hyperlipidemia');
  const hasPreDM = conditions.includes('Prediabetes');
  const hasCAD = conditions.includes('CAD');
  const hasThyroid = conditions.includes('Hypothyroidism');

  // Auto-generate relevant labs based on conditions
  const autoLabs: PatientChartData['recentLabs'] = [];
  if (hasDM || hasPreDM) {
    autoLabs.push(
      { id: 'l-a1c-1', name: 'HbA1c', value: hasDM ? '7.2' : '5.8', unit: '%', status: hasDM ? 'abnormal' : 'normal', referenceRange: '4.0-5.6', collectedAt: '2026-02-10' },
      { id: 'l-a1c-2', name: 'HbA1c', value: hasDM ? '7.8' : '5.6', unit: '%', status: hasDM ? 'abnormal' : 'normal', referenceRange: '4.0-5.6', collectedAt: '2025-11-05' },
      { id: 'l-glu', name: 'Fasting Glucose', value: hasDM ? '142' : '108', unit: 'mg/dL', status: 'abnormal', referenceRange: '70-100', collectedAt: '2026-02-10' },
    );
  }
  if (hasHyperLip) {
    autoLabs.push(
      { id: 'l-ldl', name: 'LDL Cholesterol', value: '162', unit: 'mg/dL', status: 'abnormal', referenceRange: '<100', collectedAt: '2026-02-10' },
      { id: 'l-tc', name: 'Total Cholesterol', value: '242', unit: 'mg/dL', status: 'abnormal', referenceRange: '<200', collectedAt: '2026-02-10' },
      { id: 'l-hdl', name: 'HDL Cholesterol', value: '48', unit: 'mg/dL', status: 'normal', referenceRange: '>40', collectedAt: '2026-02-10' },
      { id: 'l-trig', name: 'Triglycerides', value: '160', unit: 'mg/dL', status: 'abnormal', referenceRange: '<150', collectedAt: '2026-02-10' },
    );
  }
  if (hasThyroid) {
    autoLabs.push(
      { id: 'l-tsh-1', name: 'TSH', value: '8.2', unit: 'mIU/L', status: 'abnormal', referenceRange: '0.4-4.0', collectedAt: '2026-01-15' },
      { id: 'l-tsh-2', name: 'TSH', value: '6.8', unit: 'mIU/L', status: 'abnormal', referenceRange: '0.4-4.0', collectedAt: '2025-10-20' },
      { id: 'l-ft4-1', name: 'Free T4', value: '0.9', unit: 'ng/dL', status: 'normal', referenceRange: '0.8-1.8', collectedAt: '2026-01-15' },
      { id: 'l-ft4-2', name: 'Free T4', value: '1.0', unit: 'ng/dL', status: 'normal', referenceRange: '0.8-1.8', collectedAt: '2025-10-20' },
    );
  }
  if (hasCAD) {
    autoLabs.push(
      { id: 'l-bnp', name: 'BNP', value: '45', unit: 'pg/mL', status: 'normal', referenceRange: '<100', collectedAt: '2026-01-20' },
      { id: 'l-ldl-c', name: 'LDL Cholesterol', value: '68', unit: 'mg/dL', status: 'normal', referenceRange: '<70', collectedAt: '2026-01-20' },
    );
  }

  return {
    allergies: opts?.allergies || ['NKDA'],
    conditions,
    medications: [
      ...(hasDM ? [{ id: '1', name: 'Metformin', dose: '1000mg', frequency: 'BID' }] : []),
      ...(hasHTN ? [{ id: '2', name: 'Lisinopril', dose: '20mg', frequency: 'Daily' }] : []),
      ...(hasHyperLip || hasCAD ? [{ id: '3', name: 'Atorvastatin', dose: '40mg', frequency: 'QHS' }] : []),
      ...(hasCAD ? [{ id: '4', name: 'Aspirin', dose: '81mg', frequency: 'Daily' }, { id: '5', name: 'Metoprolol', dose: '50mg', frequency: 'BID' }] : []),
      ...(hasThyroid ? [{ id: '6', name: 'Levothyroxine', dose: '50mcg', frequency: 'Daily' }] : []),
      ...(opts?.extraMeds || []),
    ],
    recentLabs: opts?.labs || autoLabs,
    recentVitals: {
      bp: hasHTN ? '142/88' : hasCAD ? '128/76' : '122/78',
      hr: hasCAD ? '68' : '72',
      temp: '98.6',
      weight: '185',
      recordedAt: '2026-02-15',
      ...(opts?.vitals || {}),
    },
    lastVisit: { date: '02/15/2026', reason: 'Follow-up', provider: 'Dr. Reed' },
  };
}

// =============================================================================
// Demo messages
// =============================================================================

const DEMO_MESSAGES: InboxItem[] = [
  { id: 'msg-1', category: 'messages', patientId: 'P007', patientName: 'David Lee', patientAge: 54, patientDOB: '06/19/1970', mrn: 'MRN-007',
    subject: 'REQUEST: Medication Refill', preview: 'Metformin + Lisinopril', chiefComplaint: 'Medication refill request',
    content: 'REQUEST: Medication Refill\n\n\u2022 Metformin 500mg \u2014 Twice daily (Last filled: Feb 15)\n\u2022 Lisinopril 10mg \u2014 Once daily (Last filled: Feb 15)\n\nUrgency: Running low \u2014 3-5 days\nPharmacy: Walgreens \u2014 18366 Lincoln Ave, Parker, CO 80134',
    symptoms: ['Metformin 500mg BID', 'Lisinopril 10mg daily', 'Running low 3-5 days'],
    timestamp: new Date(Date.now() - 1800000), priority: 'normal', status: 'unread',
    chartData: makeChart(['Type 2 Diabetes', 'Hypertension'], { allergies: ['Penicillin'] }) },

  { id: 'msg-2', category: 'messages', patientId: 'P008', patientName: 'Ashley Brown', patientAge: 26, patientDOB: '12/05/1998', mrn: 'MRN-008',
    subject: 'REPORT: New Symptom', preview: 'Fatigue + hair loss', chiefComplaint: 'Fatigue',
    content: 'REPORT: New/Changed Symptom\n\nSymptom: Fatigue\nStarted: 2-3 weeks ago\nSeverity: 6/10\nWorse with: Exercise, Standing\nBetter with: Rest\n\nAlso noticing hair loss and feeling cold all the time. Family history of thyroid problems.',
    symptoms: ['Fatigue x3 wks', 'Hair loss', 'Cold intolerance', 'FHx thyroid'],
    timestamp: new Date(Date.now() - 5400000), priority: 'normal', status: 'unread',
    chartData: makeChart(['Asthma'], {
      labs: [
        { id: 'l-tsh-prev', name: 'TSH', value: '3.8', unit: 'mIU/L', status: 'normal', referenceRange: '0.4-4.0', collectedAt: '2025-09-12' },
        { id: 'l-cbc-prev', name: 'Hemoglobin', value: '12.1', unit: 'g/dL', status: 'normal', referenceRange: '12.0-16.0', collectedAt: '2025-09-12' },
        { id: 'l-fer-prev', name: 'Ferritin', value: '18', unit: 'ng/mL', status: 'abnormal', referenceRange: '20-200', collectedAt: '2025-09-12' },
      ],
      extraMeds: [{ id: 'm-alb', name: 'Albuterol', dose: '90mcg', frequency: 'PRN' }],
    }) },

  { id: 'msg-3', category: 'messages', patientId: 'P009', patientName: 'James Park', patientAge: 47, patientDOB: '08/11/1978', mrn: 'MRN-009',
    subject: 'QUESTION: Lab Results', preview: 'A1C + cholesterol', chiefComplaint: 'Lab question',
    content: 'QUESTION: Lab Results\n\n\u2022 Hemoglobin A1C: 5.8% (Feb 10) [borderline]\n\u2022 Lipid Panel: Total Cholesterol: 210 (Feb 10) [high]\n\nQuestion: Should I be concerned?\n\nI have been trying to eat better and exercise more since my last visit.',
    symptoms: ['A1C 5.8% borderline', 'Total cholesterol 210'],
    timestamp: new Date(Date.now() - 10800000), priority: 'normal', status: 'unread',
    chartData: makeChart(['Prediabetes', 'Hyperlipidemia']) },

  { id: 'msg-4', category: 'messages', patientId: 'P020', patientName: 'Karen Mitchell', patientAge: 61, patientDOB: '01/05/1965', mrn: 'MRN-020',
    subject: 'Referral Request', preview: 'Orthopedics for knee', chiefComplaint: 'Knee pain referral',
    content: 'I would like to request a referral to an orthopedic specialist for my right knee pain. It has been getting worse over the past 3 months. PT helped a little but pain comes back. Taking ibuprofen 400mg PRN.\n\nTried PT for 6 weeks with limited improvement.',
    symptoms: ['R knee pain x3 mo', 'PT 6 wks limited improvement', 'Ibuprofen PRN'],
    timestamp: new Date(Date.now() - 18000000), priority: 'normal', status: 'unread',
    chartData: makeChart(['Osteoarthritis', 'Hypertension'], {
      allergies: ['Sulfa'],
      extraMeds: [{ id: 'm-ibu', name: 'Ibuprofen', dose: '400mg', frequency: 'PRN' }],
    }) },

  { id: 'msg-5', category: 'messages', patientId: 'P030', patientName: 'William Torres', patientAge: 39, patientDOB: '11/14/1986', mrn: 'MRN-030',
    subject: 'Side effect question', preview: 'Cough on lisinopril', chiefComplaint: 'BP medication question',
    content: 'Dr. Reed,\n\nYou started me on lisinopril 10mg last month. I am getting a dry cough that is really annoying. Is this normal? Should I switch?\n\nMy home BPs have been around 128/82.\n\nThanks, Will',
    symptoms: ['Dry cough on lisinopril', 'Home BP 128/82'],
    timestamp: new Date(Date.now() - 43200000), priority: 'normal', status: 'read',
    chartData: makeChart(['Hypertension'], {
      labs: [
        { id: 'l-bmp-na', name: 'Sodium', value: '141', unit: 'mEq/L', status: 'normal', referenceRange: '136-145', collectedAt: '2026-02-01' },
        { id: 'l-bmp-k', name: 'Potassium', value: '4.2', unit: 'mEq/L', status: 'normal', referenceRange: '3.5-5.0', collectedAt: '2026-02-01' },
        { id: 'l-bmp-cr', name: 'Creatinine', value: '0.9', unit: 'mg/dL', status: 'normal', referenceRange: '0.7-1.3', collectedAt: '2026-02-01' },
      ],
    }) },

  { id: 'msg-6', category: 'messages', patientId: 'P001', patientName: 'Robert Martinez', patientAge: 66, patientDOB: '07/22/1958', mrn: 'MRN-001',
    subject: 'URGENT: Chest discomfort', preview: 'Intermittent tightness x2 days', chiefComplaint: 'Chest tightness',
    content: 'Dr. Reed,\n\nI have been having intermittent chest tightness for 2 days. It happens mostly with exertion like climbing stairs. No pain at rest. No shortness of breath or sweating.\n\nI am on my usual meds (aspirin, atorvastatin, metoprolol). Should I be concerned?',
    symptoms: ['Chest tightness x2 days', 'With exertion', 'Hx CAD s/p stent'],
    timestamp: new Date(Date.now() - 900000), priority: 'urgent', status: 'unread',
    chartData: makeChart(['CAD', 'Hypertension'], { allergies: ['Penicillin', 'Sulfa'] }) },

  { id: 'msg-7', category: 'messages', patientId: 'P002', patientName: 'Sarah Johnson', patientAge: 34, patientDOB: '03/15/1990', mrn: 'MRN-002',
    subject: 'Migraine frequency increasing', preview: '3-4 per week now', chiefComplaint: 'Migraines',
    content: 'Hi Dr. Reed,\n\nMy migraines are getting worse — 3-4 per week now despite sumatriptan. OTC ibuprofen gives mild relief. I am interested in preventive medications like topiramate or propranolol. Also wondering if I should see a neurologist?\n\nThank you.',
    symptoms: ['3-4 migraines/week', 'Sumatriptan ineffective', 'Asking re: preventive meds'],
    timestamp: new Date(Date.now() - 7200000), priority: 'high', status: 'unread',
    chartData: makeChart(['Migraines'], {
      extraMeds: [
        { id: 'm-suma', name: 'Sumatriptan', dose: '100mg', frequency: 'PRN' },
      ],
    }) },

  { id: 'msg-8', category: 'messages', patientId: 'P014', patientName: 'Susan Miller', patientAge: 45, patientDOB: '05/21/1979', mrn: 'MRN-014',
    subject: 'Follow-up on blood work', preview: 'Cholesterol results', chiefComplaint: 'Lipid follow-up',
    content: 'Dr. Reed,\n\nI got my lipid panel done last week as you requested. I saw the results in my portal — my LDL is 162. I have been trying to eat better but it does not seem to be working. Do I need to start a statin?\n\nAlso, what about fish oil? My friend swears by it.',
    symptoms: ['LDL 162', 'Diet changes ineffective', 'Asking about statins'],
    timestamp: new Date(Date.now() - 28800000), priority: 'normal', status: 'read',
    chartData: makeChart(['Hyperlipidemia']) },

  // Thyroid medication request — AI should pull up TSH/T4 history
  { id: 'msg-9', category: 'messages', patientId: 'P015', patientName: 'Nancy Chen', patientAge: 52, patientDOB: '07/03/1973', mrn: 'MRN-015',
    subject: 'REQUEST: Thyroid medication adjustment', preview: 'Still fatigued on levothyroxine', chiefComplaint: 'Thyroid medication adjustment',
    content: 'Dr. Reed,\n\nI have been on levothyroxine 50mcg for about 4 months now but I am still feeling very tired and gaining weight. My last TSH was 8.2 in January. I was wondering if my dose needs to be increased?\n\nI am taking it first thing in the morning on an empty stomach like you told me to. Waiting 30-60 minutes before eating.',
    symptoms: ['Persistent fatigue on levo 50mcg', 'Weight gain', 'TSH 8.2 (Jan)', 'Proper medication timing'],
    timestamp: new Date(Date.now() - 3600000), priority: 'normal', status: 'unread',
    chartData: makeChart(['Hypothyroidism'], {
      vitals: { weight: '168' },
    }) },
];

// =============================================================================
// Time helper
// =============================================================================

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// Main Component
// =============================================================================

export const ProviderInbox: React.FC = () => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });
  const [modalState, setModalState] = useState<{ type: 'forward' | 'reassign' | null; itemId: string | null }>({ type: null, itemId: null });
  const [showCompleted, setShowCompleted] = useState(false);

  // Load
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => { setItems(DEMO_MESSAGES); setIsLoading(false); }, 300);
  }, []);

  // Filtered & sorted — split active vs completed
  const { activeItems, completedItems } = useMemo(() => {
    const isCompleted = (i: InboxItem) => i.status === 'completed' || i.status === 'forwarded' || i.status === 'reassigned';
    let active = items.filter(i => !isCompleted(i));
    let completed = items.filter(i => isCompleted(i));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchFn = (i: InboxItem) =>
        i.patientName.toLowerCase().includes(q) ||
        i.subject?.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.mrn.toLowerCase().includes(q);
      active = active.filter(matchFn);
      completed = completed.filter(matchFn);
    }

    const sortFn = (a: InboxItem, b: InboxItem) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      if (a.priority === 'high' && b.priority !== 'high' && b.priority !== 'urgent') return -1;
      if (b.priority === 'high' && a.priority !== 'high' && a.priority !== 'urgent') return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    };
    active.sort(sortFn);
    completed.sort(sortFn);

    return { activeItems: active, completedItems: completed };
  }, [items, searchQuery]);

  const selectedItem = items.find(i => i.id === selectedId);
  const unreadCount = items.filter(i => i.status === 'unread').length;

  // Auto-select first item
  useEffect(() => {
    if (activeItems.length > 0 && !isLoading && !selectedId) {
      setSelectedId(activeItems[0].id);
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as read on select
  useEffect(() => {
    if (selectedId) {
      setItems(prev => prev.map(i => i.id === selectedId && i.status === 'unread' ? { ...i, status: 'read' as const } : i));
    }
  }, [selectedId]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => { setItems(DEMO_MESSAGES); setIsLoading(false); showToast('Inbox refreshed'); }, 400);
  };

  const handleComplete = (response: string) => {
    if (!selectedId) return;
    setItems(prev => prev.map(i => i.id === selectedId ? { ...i, status: 'completed' as const } : i));
    showToast('Completed — moved to today\'s completed work');
    // Auto-advance to next active item
    const idx = activeItems.findIndex(i => i.id === selectedId);
    const remaining = activeItems.filter(i => i.id !== selectedId);
    const next = remaining[Math.min(idx, remaining.length - 1)];
    setSelectedId(next?.id || null);
  };

  const handleModalSubmit = (providerId: string, note: string) => {
    if (!modalState.itemId) return;
    const provider = PROVIDERS.find(p => p.id === providerId);
    const action = modalState.type === 'forward' ? 'forwarded' : 'reassigned';
    const itemId = modalState.itemId;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: action as 'forwarded' | 'reassigned' } : i));
    setModalState({ type: null, itemId: null });
    showToast(`${action === 'forwarded' ? 'Forwarded' : 'Reassigned'} to ${provider?.name || 'provider'} — moved to completed`);
    // Auto-advance
    if (selectedId === itemId) {
      const remaining = activeItems.filter(i => i.id !== itemId);
      const idx = activeItems.findIndex(i => i.id === itemId);
      const next = remaining[Math.min(idx, remaining.length - 1)];
      setSelectedId(next?.id || null);
    }
  };

  return (
    <div className="flex h-full rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>

      {/* ═══ LEFT: Message List ═══ */}
      <div className="w-[300px] flex flex-col flex-shrink-0 overflow-hidden"
        style={{ background: '#1A5C6B', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base text-white">Messages</h1>
                <p className="text-[11px]" style={{ color: '#7dd3c8' }}>
                  {activeItems.length > 0 ? `${activeItems.length} active${unreadCount > 0 ? ` \u00b7 ${unreadCount} unread` : ''}` : 'All caught up'}
                </p>
              </div>
            </div>
            <button onClick={handleRefresh} className="p-2 rounded-lg transition-colors" style={{ color: '#7dd3c8' }}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input type="text" placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-white/40 outline-none"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }} />
          </div>
        </div>

        {/* Message Items */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-300" />
              <p className="mt-2 text-xs text-teal-300/60">Loading messages...</p>
            </div>
          ) : activeItems.length === 0 && completedItems.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCheck className="w-10 h-10 mx-auto mb-3 text-teal-400/30" />
              <p className="text-sm font-medium text-teal-200/60">No messages found</p>
            </div>
          ) : (
            <>
              {/* Active Messages */}
              {activeItems.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCheck className="w-8 h-8 mx-auto mb-2 text-teal-400/40" />
                  <p className="text-sm font-medium text-teal-200/60">All caught up!</p>
                  <p className="text-xs text-teal-300/40 mt-1">No active messages remaining</p>
                </div>
              ) : (
                activeItems.map(item => {
                  const isSelected = selectedId === item.id;
                  const isUnread = item.status === 'unread';
                  return (
                    <button key={item.id} onClick={() => setSelectedId(item.id)}
                      className="w-full text-left px-3 py-2 transition-all"
                    >
                      <div className="rounded-xl p-3 transition-all" style={{
                        background: isSelected ? '#145566' : isUnread ? '#145566' : '#2A7A8A',
                        border: isSelected ? '1px solid #25B8A9' : isUnread ? '1px solid rgba(26,143,168,0.3)' : '1px solid transparent',
                        boxShadow: isSelected ? '0 2px 8px rgba(12, 53, 71, 0.3)' : 'none',
                      }}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            item.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                            item.priority === 'high' ? 'bg-amber-500/20 text-amber-300' : ''
                          }`} style={item.priority !== 'urgent' && item.priority !== 'high' ? {
                            background: isUnread ? 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' : 'rgba(255,255,255,0.1)',
                            color: isUnread ? 'white' : 'rgba(200,230,230,0.6)',
                          } : undefined}>
                            {item.patientName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-medium'}`}
                                style={{ color: isUnread ? 'white' : 'rgba(255, 255, 255, 0.65)' }}>
                                {item.patientName}
                              </span>
                              <span className="text-[11px] text-teal-300/40 flex-shrink-0 ml-2">{timeAgo(item.timestamp)}</span>
                            </div>
                            <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-teal-100 font-medium' : 'text-teal-300/50'}`}>
                              {item.subject?.replace(/^(REQUEST|REPORT|QUESTION): /, '')}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[11px] text-teal-300/40 truncate">{item.preview}</span>
                              {item.priority === 'urgent' && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-500/25 text-red-300 animate-pulse flex-shrink-0">URGENT</span>
                              )}
                              {item.priority === 'high' && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/25 text-amber-300 flex-shrink-0">HIGH</span>
                              )}
                            </div>
                          </div>
                          {isSelected && <ChevronRight className="w-4 h-4 text-teal-400 flex-shrink-0 mt-2.5" />}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}

              {/* Completed Today Folder */}
              {completedItems.length > 0 && (
                <div className="mx-3 mt-2 mb-3">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: 'rgba(37, 184, 169, 0.12)', border: '1px solid rgba(37, 184, 169, 0.2)' }}
                  >
                    <FolderCheck className="w-4 h-4" style={{ color: '#25B8A9' }} />
                    <span className="text-xs font-semibold" style={{ color: '#7dd3c8' }}>Completed Today</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: 'rgba(37, 184, 169, 0.2)', color: '#25B8A9' }}>
                      {completedItems.length}
                    </span>
                    <div className="flex-1" />
                    {showCompleted
                      ? <ChevronUp className="w-3.5 h-3.5" style={{ color: '#7dd3c8' }} />
                      : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#7dd3c8' }} />
                    }
                  </button>

                  {showCompleted && (
                    <div className="mt-1.5 space-y-1">
                      {completedItems.map(item => {
                        const isSelected = selectedId === item.id;
                        return (
                          <button key={item.id} onClick={() => setSelectedId(item.id)}
                            className="w-full text-left px-1 py-1 transition-all"
                          >
                            <div className="rounded-lg p-2.5 transition-all opacity-70" style={{
                              background: isSelected ? '#145566' : 'rgba(255,255,255,0.05)',
                              border: isSelected ? '1px solid #25B8A9' : '1px solid transparent',
                            }}>
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                  style={{ background: 'rgba(37, 184, 169, 0.15)', color: '#25B8A9' }}>
                                  {item.patientName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-teal-200/60 truncate">{item.patientName}</span>
                                    <span className="flex items-center gap-1 flex-shrink-0 ml-2">
                                      <CheckCheck className="w-3 h-3" style={{ color: '#25B8A9' }} />
                                      <span className="text-[10px]" style={{ color: '#25B8A9' }}>
                                        {item.status === 'forwarded' ? 'Fwd' : item.status === 'reassigned' ? 'Reassigned' : 'Done'}
                                      </span>
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-teal-300/40 truncate">
                                    {item.subject?.replace(/^(REQUEST|REPORT|QUESTION): /, '')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: AI Detail Panel ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden"
        style={{ background: '#1D6374' }}>
        {selectedItem ? (
          <ExpandedPanel
            item={selectedItem}
            onClose={() => setSelectedId(null)}
            onComplete={handleComplete}
            onForward={() => setModalState({ type: 'forward', itemId: selectedItem.id })}
            onReassign={() => setModalState({ type: 'reassign', itemId: selectedItem.id })}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
              <Mail className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-bold text-white">Select a message</p>
            <p className="text-sm mt-1 text-teal-200/60">Choose a message to view details and AI-suggested responses.</p>
          </div>
        )}
      </div>

      {/* Modal & Toast */}
      {modalState.type && modalState.itemId && (
        <ActionModal isOpen type={modalState.type} providers={PROVIDERS}
          onClose={() => setModalState({ type: null, itemId: null })} onSubmit={handleModalSubmit} />
      )}
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />
    </div>
  );
};

export default ProviderInbox;
