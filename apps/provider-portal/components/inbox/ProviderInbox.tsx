// =============================================================================
// ATTENDING AI - Provider Inbox with Resizable Panels (H + V)
// apps/provider-portal/components/inbox/ProviderInbox.tsx
//
// Features:
// - Horizontal resizing between left/right panels
// - Vertical resizing for each accordion section
// - Vertical resizing for entire expanded panel
// - Multiple sections can be open simultaneously
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, FileText, Mail, Pill, Beaker, ChevronDown, ChevronUp, ChevronRight,
  AlertCircle, User, Sparkles, Check, TrendingUp, TrendingDown, Minus,
  RefreshCw, Search, Inbox, CheckCircle, Activity, ClipboardList, AlertTriangle,
  ExternalLink, MessageSquare, X, Zap, Brain, Forward, UserPlus, GripVertical,
  GripHorizontal, Building2, UserCheck, Maximize2, Minimize2,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

type CategoryType = 'phone' | 'charts' | 'email' | 'refills' | 'labs';

interface Provider {
  id: string;
  name: string;
  role: string;
  department: string;
}

interface InboxItem {
  id: string;
  category: CategoryType;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientDOB: string;
  mrn: string;
  subject: string;
  preview: string;
  content: string;
  symptoms?: string[];
  chiefComplaint?: string;
  timestamp: Date;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'unread' | 'read' | 'pending' | 'completed' | 'forwarded' | 'reassigned';
  fromProvider?: string;
  medication?: string;
  pharmacy?: string;
  labType?: string;
  callbackNumber?: string;
  chartData: PatientChartData;
}

interface PatientChartData {
  allergies: string[];
  conditions: string[];
  medications: Array<{ name: string; dose: string; frequency: string }>;
  recentLabs: Array<{ name: string; value: string; unit: string; status: string; date: string; trend?: string; previous?: string }>;
  recentVitals: { bp: string; hr: string; temp: string; weight: string; date: string };
  lastVisit: { date: string; reason: string; provider: string };
}

interface ResponseTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
  confidence: number;
  reasoning: string;
  actions?: string[];
}

// =============================================================================
// Mock Data
// =============================================================================

const mockProviders: Provider[] = [
  { id: 'dr-reed', name: 'Dr. Thomas Reed', role: 'Family Medicine', department: 'Primary Care' },
  { id: 'dr-patel', name: 'Dr. Amit Patel', role: 'Cardiologist', department: 'Cardiology' },
  { id: 'dr-kim', name: 'Dr. Jennifer Kim', role: 'Psychiatrist', department: 'Behavioral Health' },
  { id: 'dr-santos', name: 'Dr. Maria Santos', role: 'Orthopedist', department: 'Orthopedics' },
  { id: 'np-johnson', name: 'Sarah Johnson, NP', role: 'Nurse Practitioner', department: 'Primary Care' },
  { id: 'rn-davis', name: 'Michelle Davis, RN', role: 'Triage Nurse', department: 'Nursing' },
];

const generateChartData = (conditions: string[]): PatientChartData => {
  const hasDiabetes = conditions.includes('Type 2 Diabetes');
  const hasHTN = conditions.includes('Hypertension');
  return {
    allergies: Math.random() > 0.5 ? ['Penicillin', 'Sulfa'] : ['NKDA'],
    conditions,
    medications: [
      ...(hasDiabetes ? [{ name: 'Metformin', dose: '1000mg', frequency: 'BID' }] : []),
      ...(hasHTN ? [{ name: 'Lisinopril', dose: '20mg', frequency: 'Daily' }] : []),
      { name: 'Atorvastatin', dose: '40mg', frequency: 'QHS' },
    ],
    recentLabs: [
      ...(hasDiabetes ? [{ name: 'HbA1c', value: '7.2', unit: '%', status: 'high', date: '10/15/24', trend: 'down', previous: '7.8' }] : []),
      { name: 'Creatinine', value: '1.1', unit: 'mg/dL', status: 'normal', date: '10/15/24' },
      { name: 'LDL', value: '118', unit: 'mg/dL', status: 'high', date: '10/15/24', trend: 'up', previous: '105' },
    ],
    recentVitals: { bp: hasHTN ? '142/88' : '122/78', hr: '72', temp: '98.6', weight: '185', date: '10/15/24' },
    lastVisit: { date: '10/15/24', reason: 'Follow-up', provider: 'Dr. Reed' },
  };
};

const generateMockData = (): InboxItem[] => [
  {
    id: 'phone-1', category: 'phone', patientId: 'P001', patientName: 'Robert Martinez',
    patientAge: 66, patientDOB: '07/22/1958', mrn: 'MRN-001',
    subject: 'Chest discomfort - callback requested', preview: 'Intermittent chest tightness x2 days',
    chiefComplaint: 'Chest tightness', callbackNumber: '(303) 555-0142',
    symptoms: ['Intermittent chest tightness for 2 days', 'Pressure-like sensation', 'Occurs with exertion', 'Non-radiating', 'No shortness of breath', 'No nausea or diaphoresis', 'Taking aspirin 81mg daily'],
    content: 'Patient called at 2:15 PM. History of CAD with stent placement 2019. Requests callback today.',
    timestamp: new Date(Date.now() - 1800000), priority: 'urgent', status: 'unread',
    chartData: generateChartData(['CAD', 'Hypertension', 'Hyperlipidemia', 'Type 2 Diabetes']),
  },
  {
    id: 'phone-2', category: 'phone', patientId: 'P002', patientName: 'Sarah Johnson',
    patientAge: 34, patientDOB: '03/15/1990', mrn: 'MRN-002',
    subject: 'Migraine medication not working', preview: 'Sumatriptan no longer effective',
    chiefComplaint: 'Increased migraines', callbackNumber: '(303) 555-0198',
    symptoms: ['3-4 migraines per week (was 1-2 monthly)', 'Duration 6-8 hours each', 'Sumatriptan 100mg not providing relief', 'Associated nausea', 'Photophobia', 'Interested in preventive options'],
    content: 'Last tried rizatriptan 2 years ago with good results. Available after 3 PM.',
    timestamp: new Date(Date.now() - 7200000), priority: 'high', status: 'unread',
    chartData: generateChartData(['Migraines', 'Anxiety']),
  },
  {
    id: 'phone-3', category: 'phone', patientId: 'P003', patientName: 'James Wilson',
    patientAge: 39, patientDOB: '11/08/1985', mrn: 'MRN-003',
    subject: 'Lab results question', preview: 'Questions about cholesterol',
    chiefComplaint: 'Elevated cholesterol concern', callbackNumber: '(303) 555-0156',
    symptoms: ['LDL elevated at 145 mg/dL', 'Interested in lifestyle vs medication', 'Father had MI at age 55', 'Exercises regularly', 'Health-conscious'],
    content: 'Prefers to try lifestyle changes first if appropriate.',
    timestamp: new Date(Date.now() - 14400000), priority: 'normal', status: 'read',
    chartData: generateChartData(['Hyperlipidemia']),
  },
  {
    id: 'chart-1', category: 'charts', patientId: 'P004', patientName: 'Emily Chen',
    patientAge: 49, patientDOB: '04/12/1975', mrn: 'MRN-004',
    subject: 'Cardiology Consult - Echo Results', preview: 'Mild LVH, EF 55%',
    chiefComplaint: 'Dyspnea on exertion', fromProvider: 'Dr. Amit Patel, Cardiology',
    symptoms: ['Progressive dyspnea on exertion x3 months', 'SOB climbing stairs', 'SOB walking >2 blocks', 'No chest pain', 'No orthopnea or PND', 'Echo: EF 55%, mild LVH, Grade I diastolic dysfunction'],
    content: 'Dr. Patel recommends optimizing BP control, consider low-dose diuretic. Follow-up echo in 1 year.',
    timestamp: new Date(Date.now() - 3600000), priority: 'high', status: 'unread',
    chartData: generateChartData(['Hypertension', 'Type 2 Diabetes']),
  },
  {
    id: 'chart-2', category: 'charts', patientId: 'P005', patientName: 'Michael Thompson',
    patientAge: 32, patientDOB: '09/03/1992', mrn: 'MRN-005',
    subject: 'Psychiatry Note - Med Adjustment', preview: 'Sertraline increased to 100mg',
    chiefComplaint: 'Anxiety and depression follow-up', fromProvider: 'Dr. Jennifer Kim, Psychiatry',
    symptoms: ['Improved mood on sertraline 50mg', 'PHQ-9 improved: 14 → 8', 'GAD-7 still elevated at 12', 'Persistent worry about work', 'Difficulty relaxing', 'Sleep improved with trazodone'],
    content: 'Dr. Kim increased sertraline to 100mg. Continue therapy. Follow-up 4 weeks.',
    timestamp: new Date(Date.now() - 86400000), priority: 'normal', status: 'read',
    chartData: generateChartData(['GAD', 'MDD']),
  },
  {
    id: 'email-1', category: 'email', patientId: 'P007', patientName: 'David Lee',
    patientAge: 54, patientDOB: '06/19/1970', mrn: 'MRN-007',
    subject: 'Need lab work ordered', preview: 'Requesting routine diabetes labs',
    chiefComplaint: 'Lab work request',
    symptoms: ['Last A1c was 3 months ago', 'Home glucose: 110-140 fasting', 'Post-meal glucose: <180', 'Walking 30 min most days', 'Watching diet', 'Requesting A1c, lipids, kidney function'],
    content: 'Usually goes to Quest on Main Street. Asks about fasting requirements.',
    timestamp: new Date(Date.now() - 5400000), priority: 'normal', status: 'unread',
    chartData: generateChartData(['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia']),
  },
  {
    id: 'email-2', category: 'email', patientId: 'P008', patientName: 'Ashley Brown',
    patientAge: 26, patientDOB: '12/05/1998', mrn: 'MRN-008',
    subject: 'Feeling very tired lately', preview: 'Fatigue, hair loss, cold intolerance',
    chiefComplaint: 'Fatigue',
    symptoms: ['Exhausted despite 8-9 hours sleep', 'Hair falling out more than usual', 'Always cold when others comfortable', 'Weight gain ~5 lbs without diet change', 'Dry skin', 'Feeling foggy/down', "Mother has Hashimoto's thyroiditis"],
    content: 'Wondering if thyroid should be checked given family history.',
    timestamp: new Date(Date.now() - 10800000), priority: 'normal', status: 'unread',
    chartData: generateChartData(['Asthma']),
  },
  {
    id: 'email-3', category: 'email', patientId: 'P009', patientName: 'William Taylor',
    patientAge: 47, patientDOB: '08/14/1977', mrn: 'MRN-009',
    subject: 'Blood pressure readings at home', preview: 'BP consistently 150s/90s',
    chiefComplaint: 'Elevated blood pressure',
    symptoms: ['Morning BP: 148-158 / 88-96', 'Evening BP: 142-150 / 84-92', 'Taking lisinopril 20mg every morning', 'Reduced salt intake', 'Cut back on alcohol', 'Concerned about readings'],
    content: 'Asking if medication needs to be increased.',
    timestamp: new Date(Date.now() - 21600000), priority: 'high', status: 'unread',
    chartData: generateChartData(['Hypertension', 'Pre-diabetes', 'Obesity']),
  },
  {
    id: 'refill-1', category: 'refills', patientId: 'P010', patientName: 'Maria Garcia',
    patientAge: 56, patientDOB: '03/22/1968', mrn: 'MRN-010',
    subject: 'Refill: Metformin 1000mg', preview: 'CVS - 0 refills remaining',
    chiefComplaint: 'Medication refill', medication: 'Metformin 1000mg', pharmacy: 'CVS Pharmacy',
    symptoms: ['Metformin 1000mg BID', '0 refills remaining', 'Last filled: 12/18/2024', 'Last visit: 10/15/2024', 'Last A1c: 7.2%', 'Compliant with refills'],
    content: 'Routine refill request from CVS Pharmacy #4521.',
    timestamp: new Date(Date.now() - 3600000), priority: 'normal', status: 'unread',
    chartData: generateChartData(['Type 2 Diabetes', 'Hypertension']),
  },
  {
    id: 'refill-2', category: 'refills', patientId: 'P011', patientName: 'Thomas Wright',
    patientAge: 71, patientDOB: '11/30/1953', mrn: 'MRN-011',
    subject: 'Refill: Warfarin 5mg', preview: 'Needs INR check',
    chiefComplaint: 'Anticoagulation refill', medication: 'Warfarin 5mg', pharmacy: 'Walgreens',
    symptoms: ['Warfarin 5mg daily for AFib', 'Last INR: 2.4 (therapeutic)', 'Target INR: 2.0-3.0', 'Next INR due', 'Last visit: 12/15/2024', 'Stable dosing x6 months'],
    content: 'Refill request from Walgreens. INR monitoring required.',
    timestamp: new Date(Date.now() - 7200000), priority: 'high', status: 'unread',
    chartData: generateChartData(['Atrial Fibrillation', 'Hypertension', 'CHF']),
  },
  {
    id: 'refill-3', category: 'refills', patientId: 'P012', patientName: 'Jennifer Adams',
    patientAge: 38, patientDOB: '07/09/1986', mrn: 'MRN-012',
    subject: 'Refill: Alprazolam 0.5mg', preview: 'Controlled - Last visit 9 months ago',
    chiefComplaint: 'Controlled substance refill', medication: 'Alprazolam 0.5mg', pharmacy: 'King Soopers',
    symptoms: ['Alprazolam 0.5mg BID PRN', 'Schedule IV controlled substance', 'Last visit: 04/15/2024 (9 months ago)', 'Also seeing psychiatry', 'On medication x3 years', 'Office visit required per policy'],
    content: 'Controlled substance requires visit within 6 months.',
    timestamp: new Date(Date.now() - 14400000), priority: 'high', status: 'unread',
    chartData: generateChartData(['GAD', 'Panic Disorder']),
  },
  {
    id: 'lab-1', category: 'labs', patientId: 'P013', patientName: 'Richard Kim',
    patientAge: 58, patientDOB: '02/14/1966', mrn: 'MRN-013',
    subject: 'CRITICAL: Potassium 6.2', preview: 'Immediate attention required',
    chiefComplaint: 'Critical lab value', labType: 'Critical',
    symptoms: ['Potassium: 6.2 mEq/L (CRITICAL)', 'Creatinine: 1.8 mg/dL (elevated)', 'BUN: 28 mg/dL (elevated)', 'eGFR: 38 (CKD Stage 3b)', 'On Lisinopril 40mg + Spironolactone 25mg', 'Previous K+: 5.4 on 12/15'],
    content: 'Critical value called by lab at 9:45 AM. Hyperkalemia risk.',
    timestamp: new Date(Date.now() - 900000), priority: 'urgent', status: 'unread',
    chartData: generateChartData(['CKD Stage 3', 'Type 2 Diabetes', 'Hypertension', 'CHF']),
  },
  {
    id: 'lab-2', category: 'labs', patientId: 'P014', patientName: 'Susan Miller',
    patientAge: 45, patientDOB: '05/21/1979', mrn: 'MRN-014',
    subject: 'Lipid Panel - LDL elevated', preview: 'LDL 162, needs intervention',
    chiefComplaint: 'Abnormal lipids', labType: 'Abnormal',
    symptoms: ['Total Cholesterol: 245 mg/dL', 'LDL: 162 mg/dL (goal <100)', 'HDL: 52 mg/dL', 'Triglycerides: 155 mg/dL', '10-year ASCVD risk: 8.2%', 'Father had MI at 52', 'Not on statin'],
    content: 'Intermediate cardiovascular risk. Statin therapy indicated per guidelines.',
    timestamp: new Date(Date.now() - 28800000), priority: 'high', status: 'unread',
    chartData: generateChartData(['Hyperlipidemia']),
  },
  {
    id: 'lab-3', category: 'labs', patientId: 'P015', patientName: 'George Brown',
    patientAge: 63, patientDOB: '09/17/1961', mrn: 'MRN-015',
    subject: 'HbA1c Improved - 6.8%', preview: 'At goal, great progress',
    chiefComplaint: 'Improved diabetes control', labType: 'Normal',
    symptoms: ['HbA1c: 6.8% (goal <7%) ✓', 'Previous A1c: 7.4% (10/2024)', 'Trend: 8.1% → 7.8% → 7.4% → 6.8%', 'On Metformin + Jardiance', 'Improved diet adherence', 'Walking 30 min daily'],
    content: 'Excellent progress. Continue current regimen.',
    timestamp: new Date(Date.now() - 43200000), priority: 'normal', status: 'read',
    chartData: generateChartData(['Type 2 Diabetes', 'Hypertension']),
  },
];

// =============================================================================
// AI Templates
// =============================================================================

const generateAITemplates = (item: InboxItem): ResponseTemplate[] => {
  const templates: ResponseTemplate[] = [];
  const firstName = item.patientName.split(' ')[0];

  if (item.category === 'phone' && item.priority === 'urgent') {
    templates.push({ id: 'call-urgent', title: '📞 Call Immediately', category: 'urgent', confidence: 0.95, reasoning: 'Urgent cardiac symptoms', content: `Call ${item.patientName} at ${item.callbackNumber}\n\nAssess current symptoms, need for ED`, actions: ['Call', 'Document'] });
    templates.push({ id: 'send-ed', title: '🚨 Direct to ED', category: 'refer', confidence: 0.80, reasoning: 'CAD history with new symptoms', content: 'Advise ED evaluation for cardiac workup.', actions: ['Call', 'ED referral'] });
  } else if (item.category === 'phone') {
    templates.push({ id: 'callback', title: '📞 Schedule Callback', category: 'followup', confidence: 0.85, reasoning: 'Non-urgent, routine callback', content: `Add to callback list: ${item.callbackNumber}`, actions: ['Add to list'] });
  }

  if (item.category === 'email') {
    if (item.symptoms?.some(s => s.toLowerCase().includes('lab') || s.toLowerCase().includes('a1c'))) {
      templates.push({ id: 'order-labs', title: '✓ Order Labs', category: 'approve', confidence: 0.94, reasoning: 'Due for routine monitoring', content: `Dear ${firstName},\n\nI've ordered: HbA1c, CMP, Lipid Panel.\n\nPlease fast 12 hours.\n\nDr. Reed`, actions: ['Order labs'] });
    }
    if (item.symptoms?.some(s => s.toLowerCase().includes('thyroid') || s.toLowerCase().includes('tired'))) {
      templates.push({ id: 'thyroid', title: '🔬 Order Thyroid Panel', category: 'order', confidence: 0.92, reasoning: 'Classic hypothyroid symptoms', content: `Dear ${firstName},\n\nOrdered: TSH, Free T4, CBC, B12, Vit D.\n\nDr. Reed`, actions: ['Order thyroid'] });
    }
    if (item.symptoms?.some(s => s.toLowerCase().includes('bp') || s.toLowerCase().includes('blood pressure'))) {
      templates.push({ id: 'bp-med', title: '💊 Increase BP Med', category: 'order', confidence: 0.90, reasoning: 'BP not at goal', content: `Dear ${firstName},\n\nIncreasing lisinopril to 40mg daily.\n\nDr. Reed`, actions: ['Prescribe'] });
    }
  }

  if (item.category === 'refills') {
    if (item.medication?.toLowerCase().includes('alprazolam')) {
      templates.push({ id: 'deny', title: '⚠️ Deny - Visit Required', category: 'deny', confidence: 0.94, reasoning: 'Controlled, visit >6 months', content: `Dear ${firstName},\n\nUnable to refill - office visit required.\n\nDr. Reed`, actions: ['Deny'] });
      templates.push({ id: 'bridge', title: '💊 14-Day Bridge', category: 'approve', confidence: 0.75, reasoning: 'Prevent withdrawal', content: 'Approve 14-day supply. Appointment required.', actions: ['Bridge supply'] });
    } else {
      templates.push({ id: 'approve', title: '✓ Approve Refill', category: 'approve', confidence: 0.95, reasoning: 'Patient compliant', content: `Approve ${item.medication}. 90-day, 3 refills.`, actions: ['Approve'] });
    }
  }

  if (item.category === 'labs') {
    if (item.priority === 'urgent') {
      templates.push({ id: 'critical', title: '🚨 Call - Critical', category: 'urgent', confidence: 0.98, reasoning: 'Critical K+ needs intervention', content: 'CALL NOW\n\n1. Assess symptoms\n2. Hold K+ meds\n3. Repeat BMP\n4. Consider ED', actions: ['Call', 'Hold meds'] });
    } else if (item.priority === 'high') {
      templates.push({ id: 'statin', title: '💊 Start Statin', category: 'order', confidence: 0.88, reasoning: 'Elevated LDL + family hx', content: `Dear ${firstName},\n\nStarting Atorvastatin 20mg.\n\nDr. Reed`, actions: ['Prescribe'] });
    } else {
      templates.push({ id: 'letter', title: '✓ Send Results', category: 'info', confidence: 0.92, reasoning: 'Good news to share', content: `Dear ${firstName},\n\nGreat news! A1c improved to 6.8%!\n\nDr. Reed`, actions: ['Send letter'] });
    }
  }

  if (item.category === 'charts') {
    templates.push({ id: 'ack', title: '✓ Acknowledge', category: 'info', confidence: 0.90, reasoning: 'Review complete', content: `Reviewed ${item.fromProvider} note.`, actions: ['Mark reviewed'] });
    templates.push({ id: 'action', title: '📋 Create Tasks', category: 'followup', confidence: 0.80, reasoning: 'Needs implementation', content: 'Action items:\n□ Optimize BP\n□ Follow-up', actions: ['Create tasks'] });
  }

  return templates;
};

// =============================================================================
// Sidebar
// =============================================================================

const Sidebar: React.FC<{
  activeCategory: CategoryType;
  onCategoryChange: (cat: CategoryType) => void;
  counts: Record<CategoryType, { total: number; unread: number }>;
}> = ({ activeCategory, onCategoryChange, counts }) => {
  const categories: { id: CategoryType; label: string; icon: React.ReactNode }[] = [
    { id: 'phone', label: 'Phone Calls', icon: <Phone className="w-5 h-5" /> },
    { id: 'charts', label: "CC'd Charts", icon: <FileText className="w-5 h-5" /> },
    { id: 'email', label: 'Messages', icon: <Mail className="w-5 h-5" /> },
    { id: 'refills', label: 'Rx Refills', icon: <Pill className="w-5 h-5" /> },
    { id: 'labs', label: 'Lab Results', icon: <Beaker className="w-5 h-5" /> },
  ];

  return (
    <div className="w-52 bg-slate-900 text-white flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-purple-400" />
          <div>
            <h1 className="font-bold text-sm">Provider Inbox</h1>
            <p className="text-xs text-slate-400">ATTENDING AI</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-1 text-sm ${
              activeCategory === cat.id ? 'bg-purple-600' : 'hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">{cat.icon}<span>{cat.label}</span></div>
            {counts[cat.id].unread > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeCategory === cat.id ? 'bg-white/20' : 'bg-red-500'}`}>
                {counts[cat.id].unread}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

// =============================================================================
// Patient Row
// =============================================================================

const PatientRow: React.FC<{ item: InboxItem; isExpanded: boolean; onToggle: () => void }> = ({ item, isExpanded, onToggle }) => {
  const getTimeAgo = (date: Date): string => {
    const diff = Date.now() - new Date(date).getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    if (min < 60) return `${min}m`;
    if (hr < 24) return `${hr}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <div
      className={`border-b border-gray-100 cursor-pointer transition-all ${
        isExpanded ? 'bg-purple-50' : item.status === 'unread' ? 'bg-blue-50/30 hover:bg-gray-50' : 'hover:bg-gray-50'
      }`}
      onClick={onToggle}
    >
      <div className="px-4 py-2.5 flex items-center gap-3">
        <div className={`w-1 h-8 rounded-full ${item.priority === 'urgent' ? 'bg-red-500' : item.priority === 'high' ? 'bg-orange-400' : 'bg-transparent'}`} />
        <div className="text-gray-400">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${item.status === 'unread' ? 'text-gray-900' : 'text-gray-600'}`}>{item.patientName}</span>
            <span className="text-xs text-gray-400">{item.patientAge}y</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">{item.mrn}</span>
            {item.status === 'unread' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
          </div>
          <p className="text-xs text-gray-500 truncate">{item.chiefComplaint || item.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          {item.priority === 'urgent' && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">URGENT</span>}
          <span className="text-xs text-gray-400">{getTimeAgo(item.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Resizable Section Component
// =============================================================================

interface ResizableSectionProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  badge?: string | number;
  isOpen: boolean;
  onToggle: () => void;
  height: number;
  onHeightChange: (delta: number) => void;
  children: React.ReactNode;
}

const ResizableSection: React.FC<ResizableSectionProps> = ({
  title, icon, iconColor, badge, isOpen, onToggle, height, onHeightChange, children
}) => {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientY - startY.current;
      onHeightChange(Math.max(60, Math.min(400, startHeight.current + delta)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onHeightChange]);

  return (
    <div className="border-b border-gray-100">
      <button onClick={onToggle} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className={`w-4 h-4 ${iconColor}`} /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className={iconColor}>{icon}</span>
          <span className="font-medium text-sm text-gray-900">{title}</span>
          {badge && <span className={`px-1.5 py-0.5 text-xs rounded-full ${iconColor.replace('text-', 'bg-').replace('600', '100')} ${iconColor}`}>{badge}</span>}
        </div>
      </button>
      {isOpen && (
        <>
          <div className="px-3 pb-2 overflow-y-auto" style={{ height: `${height}px` }}>
            {children}
          </div>
          {/* Vertical resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="h-2 bg-gray-100 hover:bg-purple-200 cursor-row-resize flex items-center justify-center group"
          >
            <GripHorizontal className="w-4 h-4 text-gray-300 group-hover:text-purple-500" />
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// Expanded Panel
// =============================================================================

const ExpandedPanel: React.FC<{
  item: InboxItem;
  onClose: () => void;
  onComplete: (response: string) => void;
  onForward: () => void;
  onReassign: () => void;
}> = ({ item, onClose, onComplete, onForward, onReassign }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['symptoms']));
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [panelWidth, setPanelWidth] = useState(50);
  const [totalHeight, setTotalHeight] = useState(420);
  const [sectionHeights, setSectionHeights] = useState({ symptoms: 150, chart: 150, ai: 120 });
  const templates = generateAITemplates(item);
  const chart = item.chartData;
  
  const isDraggingH = useRef(false);
  const isDraggingTotal = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startH = useRef(0);

  const handleHResize = (e: React.MouseEvent) => {
    isDraggingH.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleTotalResize = (e: React.MouseEvent) => {
    isDraggingTotal.current = true;
    startY.current = e.clientY;
    startH.current = totalHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingH.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPanelWidth(Math.min(70, Math.max(30, ((e.clientX - rect.left) / rect.width) * 100)));
      }
      if (isDraggingTotal.current) {
        const delta = e.clientY - startY.current;
        setTotalHeight(Math.max(250, Math.min(700, startH.current + delta)));
      }
    };
    const handleMouseUp = () => {
      isDraggingH.current = false;
      isDraggingTotal.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const toggleSection = (s: string) => {
    setOpenSections(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  };

  const updateSectionHeight = (section: string, height: number) => {
    setSectionHeights(prev => ({ ...prev, [section]: height }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { high: 'bg-amber-100 text-amber-800', low: 'bg-blue-100 text-blue-800', critical: 'bg-red-100 text-red-800', normal: 'bg-green-100 text-green-800' };
    return <span className={`px-1 py-0.5 text-xs rounded ${colors[status] || colors.normal}`}>{status[0].toUpperCase()}</span>;
  };

  return (
    <div className="bg-white border-b-2 border-purple-200 shadow-md">
      {/* Header */}
      <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="font-medium">{item.patientName}</span>
          <span className="text-slate-400">{item.patientAge}y • {item.mrn}</span>
          {chart.allergies[0] !== 'NKDA' && (
            <span className="px-2 py-0.5 bg-red-500/30 text-red-200 text-xs rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />{chart.allergies.join(', ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onForward} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1"><Forward className="w-3 h-3" />Forward</button>
          <button onClick={onReassign} className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-1"><UserPlus className="w-3 h-3" />Reassign</button>
          <button className="px-2 py-1 text-xs text-slate-300 hover:text-white"><ExternalLink className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex" style={{ height: `${totalHeight}px` }}>
        {/* Left: Collapsible Sections */}
        <div style={{ width: `${panelWidth}%` }} className="border-r border-gray-200 overflow-y-auto">
          <ResizableSection
            title="Presenting Symptoms" icon={<Activity className="w-4 h-4" />} iconColor="text-purple-600"
            badge={item.symptoms?.length} isOpen={openSections.has('symptoms')} onToggle={() => toggleSection('symptoms')}
            height={sectionHeights.symptoms} onHeightChange={(h) => updateSectionHeight('symptoms', h)}
          >
            <div className="text-xs font-medium text-gray-700 mb-1">Chief: {item.chiefComplaint}</div>
            <ul className="space-y-1">
              {item.symptoms?.map((s, i) => <li key={i} className="text-xs text-gray-600 flex items-start gap-1"><span className="text-purple-400">•</span>{s}</li>)}
            </ul>
            {item.callbackNumber && (
              <div className="mt-2 p-2 bg-blue-50 rounded flex items-center justify-between">
                <span className="text-xs text-blue-700">📞 {item.callbackNumber}</span>
                <button className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">Call</button>
              </div>
            )}
            {item.content && <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">{item.content}</div>}
          </ResizableSection>

          <ResizableSection
            title="Chart Summary" icon={<ClipboardList className="w-4 h-4" />} iconColor="text-blue-600"
            badge={chart.conditions.length} isOpen={openSections.has('chart')} onToggle={() => toggleSection('chart')}
            height={sectionHeights.chart} onHeightChange={(h) => updateSectionHeight('chart', h)}
          >
            <div className="space-y-2">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Problems</div>
                <div className="flex flex-wrap gap-1">{chart.conditions.map((c, i) => <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-700 text-xs rounded">{c}</span>)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Medications</div>
                {chart.medications.map((m, i) => <div key={i} className="text-xs text-gray-600">{m.name} {m.dose} {m.frequency}</div>)}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Vitals</div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <span>BP: {chart.recentVitals.bp}</span>
                  <span>HR: {chart.recentVitals.hr}</span>
                  <span>T: {chart.recentVitals.temp}</span>
                  <span>Wt: {chart.recentVitals.weight}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Labs</div>
                {chart.recentLabs.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span>{l.name}</span>
                    <span>{getStatusBadge(l.status)} {l.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ResizableSection>

          <ResizableSection
            title="AI Recommendations" icon={<Sparkles className="w-4 h-4" />} iconColor="text-amber-600"
            badge={templates.length} isOpen={openSections.has('ai')} onToggle={() => toggleSection('ai')}
            height={sectionHeights.ai} onHeightChange={(h) => updateSectionHeight('ai', h)}
          >
            <div className="space-y-1.5">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setResponse(t.content); setSelectedTemplate(t.id); }}
                  className={`p-2 rounded border cursor-pointer text-xs ${selectedTemplate === t.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.title}</span>
                    <span className="text-gray-400">{Math.round(t.confidence * 100)}%</span>
                  </div>
                  <p className="text-gray-500 mt-0.5">{t.reasoning}</p>
                </div>
              ))}
            </div>
          </ResizableSection>
        </div>

        {/* Horizontal resize handle */}
        <div onMouseDown={handleHResize} className="w-2 bg-gray-100 hover:bg-purple-200 cursor-col-resize flex items-center justify-center">
          <GripVertical className="w-3 h-3 text-gray-300" />
        </div>

        {/* Right: Response */}
        <div style={{ width: `${100 - panelWidth}%` }} className="p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Response</label>
            <div className="flex gap-1">
              {!openSections.has('ai') && (
                <button onClick={() => toggleSection('ai')} className="text-xs text-purple-600 hover:underline">Show AI</button>
              )}
            </div>
          </div>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="flex-1 w-full p-2 border border-gray-300 rounded-lg text-sm resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            placeholder="Select AI suggestion or type..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onClose} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancel</button>
            <button onClick={() => onComplete(response)} disabled={!response.trim()} className="px-4 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
              <Check className="w-4 h-4" />Complete
            </button>
          </div>
        </div>
      </div>

      {/* Bottom resize handle for total panel height */}
      <div onMouseDown={handleTotalResize} className="h-2 bg-gray-100 hover:bg-purple-200 cursor-row-resize flex items-center justify-center">
        <GripHorizontal className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  );
};

// =============================================================================
// Modal
// =============================================================================

const ActionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  type: 'forward' | 'reassign';
  item: InboxItem;
  onSubmit: (providerId: string, note: string) => void;
}> = ({ isOpen, onClose, type, item, onSubmit }) => {
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = mockProviders.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.department.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className={`px-4 py-3 ${type === 'forward' ? 'bg-blue-600' : 'bg-purple-600'} text-white rounded-t-xl flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {type === 'forward' ? <Forward className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span className="font-medium">{type === 'forward' ? 'Forward' : 'Reassign'}</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-3 text-sm" />
          <div className="max-h-40 overflow-y-auto border rounded-lg mb-3">
            {filtered.map(p => (
              <button key={p.id} onClick={() => setSelected(p.id)} className={`w-full px-3 py-2 text-left flex items-center gap-2 border-b last:border-0 text-sm ${selected === p.id ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium">{p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div className="flex-1"><div className="font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.department}</div></div>
                {selected === p.id && <CheckCircle className="w-4 h-4 text-purple-600" />}
              </button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note..." className="w-full px-3 py-2 border rounded-lg text-sm resize-none" rows={2} />
        </div>
        <div className="px-4 py-3 bg-gray-50 rounded-b-xl flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-gray-600 text-sm">Cancel</button>
          <button onClick={() => { onSubmit(selected, note); onClose(); }} disabled={!selected} className={`px-4 py-1.5 text-white text-sm rounded-lg disabled:opacity-50 ${type === 'forward' ? 'bg-blue-600' : 'bg-purple-600'}`}>
            {type === 'forward' ? 'Forward' : 'Reassign'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const ProviderInbox: React.FC = () => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('phone');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [modal, setModal] = useState<{ type: 'forward' | 'reassign'; item: InboxItem } | null>(null);

  useEffect(() => {
    setTimeout(() => { setItems(generateMockData()); setIsLoading(false); }, 300);
  }, []);

  const showToast = (msg: string) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id) {
      setItems(prev => prev.map(item => item.id === id && item.status === 'unread' ? { ...item, status: 'read' } : item));
    }
  };

  const handleComplete = (id: string, response: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'completed' } : item));
    showToast('Completed');
    setExpandedId(null);
  };

  const handleForward = (id: string, providerId: string) => {
    const p = mockProviders.find(x => x.id === providerId);
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'forwarded' } : item));
    showToast(`Forwarded to ${p?.name}`);
    setExpandedId(null);
  };

  const handleReassign = (id: string, providerId: string) => {
    const p = mockProviders.find(x => x.id === providerId);
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'reassigned' } : item));
    showToast(`Reassigned to ${p?.name}`);
    setExpandedId(null);
  };

  const filtered = items.filter(item => {
    if (item.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.patientName.toLowerCase().includes(q) || item.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    phone: { total: items.filter(i => i.category === 'phone').length, unread: items.filter(i => i.category === 'phone' && i.status === 'unread').length },
    charts: { total: items.filter(i => i.category === 'charts').length, unread: items.filter(i => i.category === 'charts' && i.status === 'unread').length },
    email: { total: items.filter(i => i.category === 'email').length, unread: items.filter(i => i.category === 'email' && i.status === 'unread').length },
    refills: { total: items.filter(i => i.category === 'refills').length, unread: items.filter(i => i.category === 'refills' && i.status === 'unread').length },
    labs: { total: items.filter(i => i.category === 'labs').length, unread: items.filter(i => i.category === 'labs' && i.status === 'unread').length },
  };

  const labels: Record<CategoryType, string> = { phone: 'Phone Calls', charts: "CC'd Charts", email: 'Messages', refills: 'Rx Refills', labs: 'Lab Results' };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeCategory={activeCategory} onCategoryChange={setActiveCategory} counts={counts} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{labels[activeCategory]}</h2>
            <p className="text-xs text-gray-500">{counts[activeCategory].total} items • {counts[activeCategory].unread} unread</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-7 pr-3 py-1 w-40 bg-gray-100 rounded text-sm border-0" />
            </div>
            <button onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 300); }} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {toast.show && (
          <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg z-50">
            <CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-800">{toast.message}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-white">
          {isLoading ? (
            <div className="p-8 text-center"><RefreshCw className="w-6 h-6 text-purple-600 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500"><Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />No items</div>
          ) : (
            filtered.map(item => (
              <div key={item.id}>
                <PatientRow item={item} isExpanded={expandedId === item.id} onToggle={() => handleToggle(item.id)} />
                {expandedId === item.id && (
                  <ExpandedPanel
                    item={item}
                    onClose={() => setExpandedId(null)}
                    onComplete={(r) => handleComplete(item.id, r)}
                    onForward={() => setModal({ type: 'forward', item })}
                    onReassign={() => setModal({ type: 'reassign', item })}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {modal && (
        <ActionModal
          isOpen={true}
          onClose={() => setModal(null)}
          type={modal.type}
          item={modal.item}
          onSubmit={(pid, note) => {
            if (modal.type === 'forward') handleForward(modal.item.id, pid);
            else handleReassign(modal.item.id, pid);
            setModal(null);
          }}
        />
      )}
    </div>
  );
};

export default ProviderInbox;
