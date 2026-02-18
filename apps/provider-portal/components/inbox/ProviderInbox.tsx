// =============================================================================
// ATTENDING AI - Provider Inbox Main Component
// apps/provider-portal/components/inbox/ProviderInbox.tsx
//
// UPDATED: Now fetches real COMPASS assessments from database
// UPDATED: Added back button for navigation
// =============================================================================

'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { Search, RefreshCw, Inbox, Filter, SortAsc, AlertTriangle } from 'lucide-react';
import { useInboxStore } from './inbox-store';
import type { InboxItem, Provider, PriorityLevel } from './types';
import { theme, categoryConfig, getPurpleGradientStyle } from './theme';
import { Sidebar } from './Sidebar';
import { PatientRow } from './PatientRow';
import { ExpandedPanel } from './ExpandedPanel';
import { ActionModal } from './ActionModal';
import { Toast } from './Toast';

// =============================================================================
// Provider List
// =============================================================================

const mockProviders: Provider[] = [
  { id: 'dr-reed', name: 'Dr. Thomas Reed', role: 'Family Medicine', department: 'Primary Care' },
  { id: 'dr-patel', name: 'Dr. Amit Patel', role: 'Cardiologist', department: 'Cardiology' },
  { id: 'dr-kim', name: 'Dr. Jennifer Kim', role: 'Psychiatrist', department: 'Behavioral Health' },
  { id: 'dr-wong', name: 'Dr. Michelle Wong', role: 'Internal Medicine', department: 'Primary Care' },
  { id: 'np-johnson', name: 'Sarah Johnson, NP', role: 'Nurse Practitioner', department: 'Primary Care' },
  { id: 'pa-davis', name: 'Michael Davis, PA', role: 'Physician Assistant', department: 'Urgent Care' },
];

// =============================================================================
// API Response Types
// =============================================================================

interface AssessmentApiResponse {
  id: string;
  sessionId: string;
  patientId: string;
  patientName: string;
  patientAge: number | null;
  patientDOB: string;
  patientMRN: string;
  patientGender: string | null;
  chiefComplaint: string;
  hpiOnset: string | null;
  hpiLocation: string | null;
  hpiDuration: string | null;
  hpiCharacter: string | null;
  hpiSeverity: number | null;
  hpiTiming: string | null;
  hpiAggravating: string[];
  hpiRelieving: string[];
  hpiAssociated: string[];
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  urgencyLevel: string;
  urgencyScore: number;
  redFlags: string[];
  status: string;
  assignedProviderId: string | null;
  assignedProviderName: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapUrgencyToPriority(urgencyLevel: string): PriorityLevel {
  switch (urgencyLevel.toUpperCase()) {
    case 'EMERGENCY': return 'urgent';
    case 'HIGH': return 'high';
    case 'MODERATE': return 'normal';
    default: return 'low';
  }
}

function transformAssessmentToInboxItem(assessment: AssessmentApiResponse): InboxItem {
  const hasRedFlags = assessment.redFlags && assessment.redFlags.length > 0;
  const isUrgent = assessment.urgencyLevel === 'EMERGENCY' || assessment.urgencyLevel === 'HIGH';
  
  const symptoms: string[] = [];
  if (assessment.chiefComplaint) symptoms.push(assessment.chiefComplaint);
  if (assessment.hpiOnset) symptoms.push(`Onset: ${assessment.hpiOnset}`);
  if (assessment.hpiDuration) symptoms.push(`Duration: ${assessment.hpiDuration}`);
  if (assessment.hpiSeverity) symptoms.push(`Severity: ${assessment.hpiSeverity}/10`);
  if (assessment.hpiAssociated?.length) symptoms.push(`Associated: ${assessment.hpiAssociated.join(', ')}`);

  let content = assessment.chiefComplaint || 'No chief complaint';
  if (hasRedFlags) content += ` | RED FLAGS: ${assessment.redFlags.join(', ')}`;
  if (assessment.hpiSeverity && assessment.hpiSeverity >= 7) content += ` | Severity: ${assessment.hpiSeverity}/10`;

  return {
    id: assessment.id,
    category: 'encounters',
    patientId: assessment.patientId,
    patientName: assessment.patientName || 'Unknown Patient',
    patientAge: assessment.patientAge || 0,
    patientDOB: assessment.patientDOB || '',
    mrn: assessment.patientMRN || '',
    subject: hasRedFlags ? `⚠️ ${assessment.chiefComplaint}` : assessment.chiefComplaint,
    preview: isUrgent ? 'URGENT' : 'COMPASS Assessment',
    content,
    chiefComplaint: assessment.chiefComplaint,
    symptoms,
    timestamp: new Date(assessment.submittedAt || assessment.createdAt),
    priority: mapUrgencyToPriority(assessment.urgencyLevel),
    status: assessment.status === 'PENDING' ? 'unread' : 'read',
    encounterType: 'COMPASS Assessment',
    encounterStatus: assessment.status === 'PENDING' ? 'Waiting' : assessment.status,
    chartData: {
      allergies: assessment.allergies?.length ? assessment.allergies : ['NKDA'],
      conditions: assessment.medicalHistory || [],
      medications: assessment.medications?.map((med, idx) => ({ id: `med-${idx}`, name: med, dose: '', frequency: '' })) || [],
      recentLabs: [],
      recentVitals: { bp: '-', hr: '-', temp: '-', weight: '-', recordedAt: new Date().toISOString() },
      lastVisit: { date: new Date(assessment.submittedAt || assessment.createdAt).toLocaleDateString(), reason: 'COMPASS Assessment', provider: assessment.assignedProviderName || 'Pending Assignment' },
    },
  };
}

const generateChartData = (conditions: string[]) => {
  const hasDiabetes = conditions.includes('Type 2 Diabetes');
  const hasHTN = conditions.includes('Hypertension');
  return {
    allergies: Math.random() > 0.5 ? ['Penicillin', 'Sulfa'] : ['NKDA'],
    conditions,
    medications: [
      ...(hasDiabetes ? [{ id: '1', name: 'Metformin', dose: '1000mg', frequency: 'BID' }] : []),
      ...(hasHTN ? [{ id: '2', name: 'Lisinopril', dose: '20mg', frequency: 'Daily' }] : []),
      { id: '3', name: 'Atorvastatin', dose: '40mg', frequency: 'QHS' },
    ],
    recentLabs: [],
    recentVitals: { bp: hasHTN ? '142/88' : '122/78', hr: '72', temp: '98.6', weight: '185', recordedAt: new Date().toISOString() },
    lastVisit: { date: '10/15/24', reason: 'Follow-up', provider: 'Dr. Reed' },
  };
};

const generateMockItems = (): InboxItem[] => [
  { id: 'phone-1', category: 'phone', patientId: 'P001', patientName: 'Robert Martinez', patientAge: 66, patientDOB: '07/22/1958', mrn: 'MRN-001', subject: 'Chest discomfort', preview: 'Callback', chiefComplaint: 'Chest tightness', content: 'History of CAD with stent.', callbackNumber: '(303) 555-0142', symptoms: ['Chest tightness x2 days', 'With exertion'], timestamp: new Date(Date.now() - 1800000), priority: 'urgent', status: 'unread', chartData: generateChartData(['CAD', 'Hypertension']) },
  { id: 'phone-2', category: 'phone', patientId: 'P002', patientName: 'Sarah Johnson', patientAge: 34, patientDOB: '03/15/1990', mrn: 'MRN-002', subject: 'Migraine meds', preview: 'Not working', chiefComplaint: 'Migraines', content: 'Wants preventive options.', callbackNumber: '(303) 555-0198', symptoms: ['3-4 migraines/week', 'Sumatriptan ineffective'], timestamp: new Date(Date.now() - 7200000), priority: 'high', status: 'unread', chartData: generateChartData(['Migraines']) },
  { id: 'chart-1', category: 'charts', patientId: 'P004', patientName: 'Emily Chen', patientAge: 49, patientDOB: '04/12/1975', mrn: 'MRN-004', subject: 'Cardiology Consult', preview: 'Echo results', chiefComplaint: 'Dyspnea', content: 'Optimize BP.', fromProvider: 'Dr. Patel', symptoms: ['Dyspnea x3 mo', 'Echo: EF 55%'], timestamp: new Date(Date.now() - 3600000), priority: 'high', status: 'unread', chartData: generateChartData(['Hypertension']) },
  { id: 'chart-2', category: 'charts', patientId: 'P005', patientName: 'Michael Thompson', patientAge: 32, patientDOB: '09/03/1992', mrn: 'MRN-005', subject: 'Psychiatry Note', preview: 'Med change', chiefComplaint: 'Anxiety f/u', content: 'Increased sertraline.', fromProvider: 'Dr. Kim', symptoms: ['PHQ-9: 14 to 8'], timestamp: new Date(Date.now() - 86400000), priority: 'normal', status: 'read', chartData: generateChartData(['GAD']) },
  { id: 'msg-1', category: 'messages', patientId: 'P007', patientName: 'David Lee', patientAge: 54, patientDOB: '06/19/1970', mrn: 'MRN-007', subject: 'Need lab work', preview: 'DM labs', chiefComplaint: 'Lab request', content: 'Asks about fasting.', symptoms: ['Last A1c 3 mo ago'], timestamp: new Date(Date.now() - 5400000), priority: 'normal', status: 'unread', chartData: generateChartData(['Type 2 Diabetes']) },
  { id: 'msg-2', category: 'messages', patientId: 'P008', patientName: 'Ashley Brown', patientAge: 26, patientDOB: '12/05/1998', mrn: 'MRN-008', subject: 'Feeling tired', preview: 'Fatigue', chiefComplaint: 'Fatigue', content: 'Thyroid concern.', symptoms: ['Exhausted', 'Hair loss', 'Always cold'], timestamp: new Date(Date.now() - 10800000), priority: 'normal', status: 'unread', chartData: generateChartData(['Asthma']) },
  { id: 'refill-1', category: 'refills', patientId: 'P010', patientName: 'Maria Garcia', patientAge: 56, patientDOB: '03/22/1968', mrn: 'MRN-010', subject: 'Metformin 1000mg', preview: 'CVS', chiefComplaint: 'Refill', content: 'Routine refill.', medication: 'Metformin 1000mg', pharmacy: 'CVS', symptoms: ['Metformin BID', 'A1c: 7.2%'], timestamp: new Date(Date.now() - 3600000), priority: 'normal', status: 'unread', chartData: generateChartData(['Type 2 Diabetes']) },
  { id: 'refill-2', category: 'refills', patientId: 'P011', patientName: 'Thomas Wright', patientAge: 71, patientDOB: '11/30/1953', mrn: 'MRN-011', subject: 'Warfarin 5mg', preview: 'INR due', chiefComplaint: 'Anticoag', content: 'INR required.', medication: 'Warfarin 5mg', pharmacy: 'Walgreens', symptoms: ['Warfarin for AFib', 'INR due'], timestamp: new Date(Date.now() - 7200000), priority: 'high', status: 'unread', chartData: generateChartData(['AFib']) },
  { id: 'lab-1', category: 'labs', patientId: 'P013', patientName: 'Richard Kim', patientAge: 58, patientDOB: '02/14/1966', mrn: 'MRN-013', subject: 'CRITICAL: K+ 6.2', preview: 'Urgent', chiefComplaint: 'Critical lab', content: 'Critical value.', labType: 'critical', symptoms: ['K+: 6.2', 'Cr: 1.8'], timestamp: new Date(Date.now() - 900000), priority: 'urgent', status: 'unread', chartData: generateChartData(['CKD Stage 3']) },
  { id: 'lab-2', category: 'labs', patientId: 'P014', patientName: 'Susan Miller', patientAge: 45, patientDOB: '05/21/1979', mrn: 'MRN-014', subject: 'Lipid Panel', preview: 'LDL 162', chiefComplaint: 'Lipids', content: 'Statin indicated.', labType: 'abnormal', symptoms: ['LDL: 162'], timestamp: new Date(Date.now() - 28800000), priority: 'high', status: 'unread', chartData: generateChartData(['Hyperlipidemia']) },
  { id: 'img-1', category: 'imaging', patientId: 'P025', patientName: 'James Wilson', patientAge: 55, patientDOB: '09/10/1969', mrn: 'MRN-025', subject: 'Chest X-Ray', preview: 'Normal', chiefComplaint: 'CXR results', content: 'No acute findings.', imagingType: 'Chest X-Ray', imagingStatus: 'completed', symptoms: ['Annual screening'], timestamp: new Date(Date.now() - 14400000), priority: 'normal', status: 'unread', chartData: generateChartData(['COPD']) },
  { id: 'img-2', category: 'imaging', patientId: 'P026', patientName: 'Linda Davis', patientAge: 62, patientDOB: '03/18/1962', mrn: 'MRN-026', subject: 'CT Abdomen', preview: 'Review needed', chiefComplaint: 'CT results', content: 'Incidental finding noted.', imagingType: 'CT Abdomen/Pelvis', imagingStatus: 'completed', symptoms: ['3cm renal cyst'], timestamp: new Date(Date.now() - 21600000), priority: 'high', status: 'unread', chartData: generateChartData(['Hypertension']) },
  { id: 'inc-1', category: 'incomplete', patientId: 'P016', patientName: 'Patricia Moore', patientAge: 58, patientDOB: '09/12/1966', mrn: 'MRN-016', subject: 'AWV - Unsigned', preview: '3d open', chiefComplaint: 'Signature', content: 'Normal exam.', daysOpen: 3, missingElements: ['Provider signature', 'ICD-10 codes'], timestamp: new Date(Date.now() - 259200000), priority: 'high', status: 'unread', chartData: generateChartData(['Hypertension']) },
  { id: 'inc-2', category: 'incomplete', patientId: 'P017', patientName: 'Daniel Harris', patientAge: 42, patientDOB: '03/28/1982', mrn: 'MRN-017', subject: 'Sick Visit - HPI', preview: '5d open', chiefComplaint: 'Incomplete', content: 'Needs completion.', daysOpen: 5, missingElements: ['HPI incomplete', 'ROS missing'], timestamp: new Date(Date.now() - 432000000), priority: 'urgent', status: 'unread', chartData: generateChartData(['Asthma']) },
];

// =============================================================================
// Main Component
// =============================================================================

export const ProviderInbox: React.FC = () => {
  const {
    items, activeCategory, expandedItemId, searchQuery, isLoading, isRefreshing, toast, modalState,
    setItems, setActiveCategory, setExpandedItem, setSearchQuery, setLoading, setRefreshing,
    hideToast, openModal, closeModal, completeItem, forwardItem, reassignItem, getCategoryCounts, getFilteredItems, showToast,
  } = useInboxStore();

  const [apiError, setApiError] = useState<string | null>(null);
  const [realAssessmentCount, setRealAssessmentCount] = useState(0);

  const fetchAssessments = useCallback(async (): Promise<InboxItem[]> => {
    try {
      const response = await fetch('/api/assessments?status=PENDING&pageSize=50');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (data.assessments && Array.isArray(data.assessments)) {
        setRealAssessmentCount(data.assessments.length);
        return data.assessments.map(transformAssessmentToInboxItem);
      }
      return [];
    } catch (error) {
      console.error('[INBOX] Failed to fetch assessments:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to fetch assessments');
      return [];
    }
  }, []);

  const loadInboxData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const realAssessments = await fetchAssessments();
      const mockItems = generateMockItems();
      const allItems = [...realAssessments, ...mockItems];
      allItems.sort((a, b) => {
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setItems(allItems);
      if (realAssessments.length > 0) console.log(`[INBOX] Loaded ${realAssessments.length} real COMPASS assessments`);
    } catch (error) {
      console.error('[INBOX] Error loading data:', error);
      setItems(generateMockItems());
    } finally {
      setLoading(false);
    }
  }, [fetchAssessments, setItems, setLoading]);

  useEffect(() => { loadInboxData(); }, [loadInboxData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInboxData();
    setRefreshing(false);
    showToast('Inbox refreshed', 'success');
  }, [loadInboxData, setRefreshing, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAssessments().then((realAssessments) => {
        if (realAssessments.length > 0) {
          const mockItems = generateMockItems();
          const allItems = [...realAssessments, ...mockItems];
          allItems.sort((a, b) => {
            if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
            if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
          setItems(allItems);
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAssessments, setItems]);

  const filteredItems = getFilteredItems();
  const categoryCounts = getCategoryCounts();
  const categoryAccent = categoryConfig[activeCategory];

  const handleItemToggle = (itemId: string) => setExpandedItem(expandedItemId === itemId ? null : itemId);
  const handleComplete = (response: string) => { if (expandedItemId) completeItem(expandedItemId, response); };
  const handleModalSubmit = (providerId: string, note: string) => {
    if (modalState.itemId) {
      if (modalState.type === 'forward') forwardItem(modalState.itemId, providerId, note);
      else if (modalState.type === 'reassign') reassignItem(modalState.itemId, providerId, note);
    }
  };

  const expandedItem = items.find((item) => item.id === expandedItemId);

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <Sidebar activeCategory={activeCategory} onCategoryChange={setActiveCategory} counts={categoryCounts} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Category header bar */}
        <div className="px-5 py-3 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full" style={{ background: categoryAccent.accent }} />
            <div>
              <h2 className="font-bold text-lg text-gray-900">{categoryAccent.label}</h2>
              <p className="text-xs text-gray-500">
                {categoryCounts[activeCategory]?.total || 0} items • {categoryCounts[activeCategory]?.unread || 0} unread
                {categoryCounts[activeCategory]?.urgent > 0 && <span className="ml-2 text-red-600 font-medium">• {categoryCounts[activeCategory].urgent} urgent</span>}
                {activeCategory === 'encounters' && realAssessmentCount > 0 && <span className="ml-2 text-green-600 font-medium">• {realAssessmentCount} COMPASS</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {apiError && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200" title={apiError}>
                <AlertTriangle className="w-3.5 h-3.5" /><span>API Error</span>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-56 rounded-xl text-sm border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
              />
            </div>

            <button className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Filter"><Filter className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Sort"><SortAsc className="w-4 h-4" /></button>
            <button onClick={handleRefresh} className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Refresh"><RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-500" />
              <p className="mt-3 font-medium text-gray-600">Loading inbox...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="font-medium text-lg text-gray-600">No items in {categoryAccent.label.toLowerCase()}</p>
              <p className="text-sm mt-1 text-gray-400">{searchQuery ? 'Try adjusting your search' : 'New items will appear here'}</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id}>
                <PatientRow item={item} isExpanded={expandedItemId === item.id} onToggle={() => handleItemToggle(item.id)} />
                {expandedItemId === item.id && expandedItem && (
                  <ExpandedPanel item={expandedItem} onClose={() => setExpandedItem(null)} onComplete={handleComplete} onForward={() => openModal('forward', item.id)} onReassign={() => openModal('reassign', item.id)} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {modalState.type && modalState.type !== 'complete' && modalState.itemId && (
        <ActionModal isOpen={true} type={modalState.type} providers={mockProviders} onClose={closeModal} onSubmit={handleModalSubmit} />
      )}

      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={hideToast} />
    </div>
  );
};

export default ProviderInbox;
