// =============================================================================
// ATTENDING AI - Provider Inbox Main Component
// apps/provider-portal/components/inbox/ProviderInbox.tsx
// =============================================================================

'use client';

import React, { useEffect } from 'react';
import { Search, RefreshCw, Inbox, Filter, SortAsc } from 'lucide-react';
import { useInboxStore } from './inbox-store';
import type { InboxItem, Provider } from './types';
import { theme, categoryConfig, getPurpleGradientStyle } from './theme';
import { Sidebar } from './Sidebar';
import { PatientRow } from './PatientRow';
import { ExpandedPanel } from './ExpandedPanel';
import { ActionModal } from './ActionModal';
import { Toast } from './Toast';

const mockProviders: Provider[] = [
  { id: 'dr-reed', name: 'Dr. Thomas Reed', role: 'Family Medicine', department: 'Primary Care' },
  { id: 'dr-patel', name: 'Dr. Amit Patel', role: 'Cardiologist', department: 'Cardiology' },
  { id: 'dr-kim', name: 'Dr. Jennifer Kim', role: 'Psychiatrist', department: 'Behavioral Health' },
  { id: 'dr-wong', name: 'Dr. Michelle Wong', role: 'Internal Medicine', department: 'Primary Care' },
  { id: 'np-johnson', name: 'Sarah Johnson, NP', role: 'Nurse Practitioner', department: 'Primary Care' },
  { id: 'pa-davis', name: 'Michael Davis, PA', role: 'Physician Assistant', department: 'Urgent Care' },
];

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
    recentVitals: {
      bp: hasHTN ? '142/88' : '122/78',
      hr: '72',
      temp: '98.6',
      weight: '185',
      recordedAt: new Date().toISOString(),
    },
    lastVisit: { date: '10/15/24', reason: 'Follow-up', provider: 'Dr. Reed' },
  };
};

const generateMockItems = (): InboxItem[] => [
  // Encounters
  { id: 'enc-1', category: 'encounters', patientId: 'P020', patientName: 'Margaret White', patientAge: 72, patientDOB: '04/15/1952', mrn: 'MRN-020', subject: 'Exam Room 3', preview: 'SOB', chiefComplaint: 'Shortness of breath', content: 'Vitals: BP 156/92, HR 88, O2 94% RA.', encounterType: 'Office Visit', encounterStatus: 'Ready', roomNumber: 'Exam 3', waitTime: '12 min', symptoms: ['Progressive SOB x1 week', 'Worse with exertion', 'Ankle swelling'], timestamp: new Date(Date.now() - 720000), priority: 'high', status: 'unread', chartData: generateChartData(['CHF', 'Hypertension']) },
  { id: 'enc-2', category: 'encounters', patientId: 'P021', patientName: 'Kevin Martinez', patientAge: 28, patientDOB: '08/22/1996', mrn: 'MRN-021', subject: 'Exam Room 1', preview: 'New patient', chiefComplaint: 'Establish care', content: 'Vitals: BP 118/76, HR 68.', encounterType: 'New Patient', encounterStatus: 'Ready', roomNumber: 'Exam 1', waitTime: '8 min', symptoms: ['New to area', 'History of anxiety'], timestamp: new Date(Date.now() - 480000), priority: 'normal', status: 'unread', chartData: generateChartData(['Anxiety']) },
  { id: 'enc-3', category: 'encounters', patientId: 'P022', patientName: 'Dorothy Clark', patientAge: 81, patientDOB: '02/28/1943', mrn: 'MRN-022', subject: 'Exam Room 5', preview: 'Fall', chiefComplaint: 'Fall at home', content: 'URGENT: Elderly fall.', encounterType: 'Same Day', encounterStatus: 'Urgent', roomNumber: 'Exam 5', waitTime: '5 min', symptoms: ['Fall this AM', 'Right hip pain', 'On anticoagulation'], timestamp: new Date(Date.now() - 300000), priority: 'urgent', status: 'unread', chartData: generateChartData(['AFib', 'Osteoporosis']) },

  // Phone Calls
  { id: 'phone-1', category: 'phone', patientId: 'P001', patientName: 'Robert Martinez', patientAge: 66, patientDOB: '07/22/1958', mrn: 'MRN-001', subject: 'Chest discomfort', preview: 'Callback', chiefComplaint: 'Chest tightness', content: 'History of CAD with stent.', callbackNumber: '(303) 555-0142', symptoms: ['Chest tightness x2 days', 'With exertion'], timestamp: new Date(Date.now() - 1800000), priority: 'urgent', status: 'unread', chartData: generateChartData(['CAD', 'Hypertension']) },
  { id: 'phone-2', category: 'phone', patientId: 'P002', patientName: 'Sarah Johnson', patientAge: 34, patientDOB: '03/15/1990', mrn: 'MRN-002', subject: 'Migraine meds', preview: 'Not working', chiefComplaint: 'Migraines', content: 'Wants preventive options.', callbackNumber: '(303) 555-0198', symptoms: ['3-4 migraines/week', 'Sumatriptan ineffective'], timestamp: new Date(Date.now() - 7200000), priority: 'high', status: 'unread', chartData: generateChartData(['Migraines']) },

  // CC'd Charts
  { id: 'chart-1', category: 'charts', patientId: 'P004', patientName: 'Emily Chen', patientAge: 49, patientDOB: '04/12/1975', mrn: 'MRN-004', subject: 'Cardiology Consult', preview: 'Echo results', chiefComplaint: 'Dyspnea', content: 'Optimize BP.', fromProvider: 'Dr. Patel', symptoms: ['Dyspnea x3 mo', 'Echo: EF 55%'], timestamp: new Date(Date.now() - 3600000), priority: 'high', status: 'unread', chartData: generateChartData(['Hypertension']) },
  { id: 'chart-2', category: 'charts', patientId: 'P005', patientName: 'Michael Thompson', patientAge: 32, patientDOB: '09/03/1992', mrn: 'MRN-005', subject: 'Psychiatry Note', preview: 'Med change', chiefComplaint: 'Anxiety f/u', content: 'Increased sertraline.', fromProvider: 'Dr. Kim', symptoms: ['PHQ-9: 14 to 8'], timestamp: new Date(Date.now() - 86400000), priority: 'normal', status: 'read', chartData: generateChartData(['GAD']) },

  // Patient Messages
  { id: 'msg-1', category: 'messages', patientId: 'P007', patientName: 'David Lee', patientAge: 54, patientDOB: '06/19/1970', mrn: 'MRN-007', subject: 'Need lab work', preview: 'DM labs', chiefComplaint: 'Lab request', content: 'Asks about fasting.', symptoms: ['Last A1c 3 mo ago'], timestamp: new Date(Date.now() - 5400000), priority: 'normal', status: 'unread', chartData: generateChartData(['Type 2 Diabetes']) },
  { id: 'msg-2', category: 'messages', patientId: 'P008', patientName: 'Ashley Brown', patientAge: 26, patientDOB: '12/05/1998', mrn: 'MRN-008', subject: 'Feeling tired', preview: 'Fatigue', chiefComplaint: 'Fatigue', content: 'Thyroid concern.', symptoms: ['Exhausted', 'Hair loss', 'Always cold'], timestamp: new Date(Date.now() - 10800000), priority: 'normal', status: 'unread', chartData: generateChartData(['Asthma']) },

  // Rx Refills
  { id: 'refill-1', category: 'refills', patientId: 'P010', patientName: 'Maria Garcia', patientAge: 56, patientDOB: '03/22/1968', mrn: 'MRN-010', subject: 'Metformin 1000mg', preview: 'CVS', chiefComplaint: 'Refill', content: 'Routine refill.', medication: 'Metformin 1000mg', pharmacy: 'CVS', symptoms: ['Metformin BID', 'A1c: 7.2%'], timestamp: new Date(Date.now() - 3600000), priority: 'normal', status: 'unread', chartData: generateChartData(['Type 2 Diabetes']) },
  { id: 'refill-2', category: 'refills', patientId: 'P011', patientName: 'Thomas Wright', patientAge: 71, patientDOB: '11/30/1953', mrn: 'MRN-011', subject: 'Warfarin 5mg', preview: 'INR due', chiefComplaint: 'Anticoag', content: 'INR required.', medication: 'Warfarin 5mg', pharmacy: 'Walgreens', symptoms: ['Warfarin for AFib', 'INR due'], timestamp: new Date(Date.now() - 7200000), priority: 'high', status: 'unread', chartData: generateChartData(['AFib']) },

  // Lab Results
  { id: 'lab-1', category: 'labs', patientId: 'P013', patientName: 'Richard Kim', patientAge: 58, patientDOB: '02/14/1966', mrn: 'MRN-013', subject: 'CRITICAL: K+ 6.2', preview: 'Urgent', chiefComplaint: 'Critical lab', content: 'Critical value.', labType: 'critical', symptoms: ['K+: 6.2', 'Cr: 1.8'], timestamp: new Date(Date.now() - 900000), priority: 'urgent', status: 'unread', chartData: generateChartData(['CKD Stage 3']) },
  { id: 'lab-2', category: 'labs', patientId: 'P014', patientName: 'Susan Miller', patientAge: 45, patientDOB: '05/21/1979', mrn: 'MRN-014', subject: 'Lipid Panel', preview: 'LDL 162', chiefComplaint: 'Lipids', content: 'Statin indicated.', labType: 'abnormal', symptoms: ['LDL: 162'], timestamp: new Date(Date.now() - 28800000), priority: 'high', status: 'unread', chartData: generateChartData(['Hyperlipidemia']) },

  // Imaging Results
  { id: 'img-1', category: 'imaging', patientId: 'P025', patientName: 'James Wilson', patientAge: 55, patientDOB: '09/10/1969', mrn: 'MRN-025', subject: 'Chest X-Ray', preview: 'Normal', chiefComplaint: 'CXR results', content: 'No acute findings.', imagingType: 'Chest X-Ray', imagingStatus: 'completed', symptoms: ['Annual screening'], timestamp: new Date(Date.now() - 14400000), priority: 'normal', status: 'unread', chartData: generateChartData(['COPD']) },
  { id: 'img-2', category: 'imaging', patientId: 'P026', patientName: 'Linda Davis', patientAge: 62, patientDOB: '03/18/1962', mrn: 'MRN-026', subject: 'CT Abdomen', preview: 'Review needed', chiefComplaint: 'CT results', content: 'Incidental finding noted.', imagingType: 'CT Abdomen/Pelvis', imagingStatus: 'completed', symptoms: ['3cm renal cyst'], timestamp: new Date(Date.now() - 21600000), priority: 'high', status: 'unread', chartData: generateChartData(['Hypertension']) },

  // Incomplete Charts
  { id: 'inc-1', category: 'incomplete', patientId: 'P016', patientName: 'Patricia Moore', patientAge: 58, patientDOB: '09/12/1966', mrn: 'MRN-016', subject: 'AWV - Unsigned', preview: '3d open', chiefComplaint: 'Signature', content: 'Normal exam.', daysOpen: 3, missingElements: ['Provider signature', 'ICD-10 codes'], timestamp: new Date(Date.now() - 259200000), priority: 'high', status: 'unread', chartData: generateChartData(['Hypertension']) },
  { id: 'inc-2', category: 'incomplete', patientId: 'P017', patientName: 'Daniel Harris', patientAge: 42, patientDOB: '03/28/1982', mrn: 'MRN-017', subject: 'Sick Visit - HPI', preview: '5d open', chiefComplaint: 'Incomplete', content: 'Needs completion.', daysOpen: 5, missingElements: ['HPI incomplete', 'ROS missing'], timestamp: new Date(Date.now() - 432000000), priority: 'urgent', status: 'unread', chartData: generateChartData(['Asthma']) },
];

export const ProviderInbox: React.FC = () => {
  const {
    items,
    activeCategory,
    expandedItemId,
    searchQuery,
    isLoading,
    isRefreshing,
    toast,
    modalState,
    setItems,
    setActiveCategory,
    setExpandedItem,
    setSearchQuery,
    setLoading,
    setRefreshing,
    hideToast,
    openModal,
    closeModal,
    completeItem,
    forwardItem,
    reassignItem,
    getCategoryCounts,
    getFilteredItems,
  } = useInboxStore();

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setItems(generateMockItems());
      setLoading(false);
    }, 500);
  }, [setItems, setLoading]);

  const filteredItems = getFilteredItems();
  const categoryCounts = getCategoryCounts();
  const categoryAccent = categoryConfig[activeCategory];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setItems(generateMockItems());
      setRefreshing(false);
    }, 500);
  };

  const handleItemToggle = (itemId: string) => {
    setExpandedItem(expandedItemId === itemId ? null : itemId);
  };

  const handleComplete = (response: string) => {
    if (expandedItemId) {
      completeItem(expandedItemId, response);
    }
  };

  const handleModalSubmit = (providerId: string, note: string) => {
    if (modalState.itemId) {
      if (modalState.type === 'forward') {
        forwardItem(modalState.itemId, providerId, note);
      } else if (modalState.type === 'reassign') {
        reassignItem(modalState.itemId, providerId, note);
      }
    }
  };

  const expandedItem = items.find((item) => item.id === expandedItemId);

  return (
    <div className="flex h-screen" style={getPurpleGradientStyle()}>
      {/* Sidebar */}
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        counts={categoryCounts}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden m-3 ml-0">
        {/* Header */}
        <div
          className="rounded-t-2xl px-5 py-4 flex items-center justify-between text-white"
          style={{
            ...getPurpleGradientStyle(),
            boxShadow: theme.shadow.md,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-1.5 h-10 rounded-full"
              style={{ background: categoryAccent.accent }}
            />
            <div>
              <h2 className="font-bold text-xl">{categoryAccent.label}</h2>
              <p className="text-sm" style={{ color: theme.purple[200] }}>
                {categoryCounts[activeCategory]?.total || 0} items •{' '}
                {categoryCounts[activeCategory]?.unread || 0} unread
                {categoryCounts[activeCategory]?.urgent > 0 && (
                  <span className="ml-2 text-red-300">
                    • {categoryCounts[activeCategory].urgent} urgent
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: theme.purple[300] }}
              />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 rounded-xl text-sm text-white placeholder-purple-300 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: `1px solid ${theme.purple[400]}50`,
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onBlur={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              />
            </div>

            {/* Filter Button */}
            <button
              className="p-2 rounded-xl transition-colors"
              style={{ color: theme.purple[200] }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.purple[200];
              }}
              title="Filter"
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* Sort Button */}
            <button
              className="p-2 rounded-xl transition-colors"
              style={{ color: theme.purple[200] }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.purple[200];
              }}
              title="Sort"
            >
              <SortAsc className="w-5 h-5" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl transition-colors"
              style={{ color: theme.purple[200] }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.purple[200];
              }}
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* List Area */}
        <div
          className="flex-1 overflow-y-auto rounded-b-2xl"
          style={{
            background: theme.purple[100],
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
          }}
        >
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw
                className="w-8 h-8 animate-spin mx-auto"
                style={{ color: theme.purple[600] }}
              />
              <p className="mt-3 font-medium" style={{ color: theme.purple[700] }}>
                Loading inbox...
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-16 h-16 mx-auto mb-4" style={{ color: theme.purple[300] }} />
              <p className="font-medium text-lg" style={{ color: theme.purple[700] }}>
                No items in {categoryAccent.label.toLowerCase()}
              </p>
              <p className="text-sm mt-1" style={{ color: theme.purple[500] }}>
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'New items will appear here'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id}>
                <PatientRow
                  item={item}
                  isExpanded={expandedItemId === item.id}
                  onToggle={() => handleItemToggle(item.id)}
                />
                {expandedItemId === item.id && expandedItem && (
                  <ExpandedPanel
                    item={expandedItem}
                    onClose={() => setExpandedItem(null)}
                    onComplete={handleComplete}
                    onForward={() => openModal('forward', item.id)}
                    onReassign={() => openModal('reassign', item.id)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Modal - Only for forward/reassign, not complete */}
      {modalState.type && modalState.type !== 'complete' && modalState.itemId && (
        <ActionModal
          isOpen={true}
          type={modalState.type}
          providers={mockProviders}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
        />
      )}

      {/* Toast Notification */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </div>
  );
};

export default ProviderInbox;
