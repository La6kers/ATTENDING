// ============================================================
// Imaging Orders Page - Streamlined with consistent full-page gradient
// pages/imaging.tsx
// ============================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  FileImage, Brain, Search, AlertTriangle, Clock, CheckCircle,
  Calendar, ArrowLeft, Home, Monitor, Waves
} from 'lucide-react';
import { SimpleCriticalAlert, useToast } from '../components/shared';
import { ProviderShell } from '@/components/layout/ProviderShell';
import {
  ImagingCatalogBrowser,
  AIImagingRecommendationsPanel,
  ImagingOrderSummary,
} from '../components/imaging-ordering';
import { ImagingResultsReview } from '../components/imaging';
import {
  useImagingOrderingStore,
  IMAGING_CATALOG,
  type OrderPriority,
  type OrderingContext,
} from '../store/imagingOrderingStore';
import { useFhirConnected } from '@attending/shared/lib/fhir/hooks';
import { fetchPatientContext } from '../lib/fetchPatientContext';
import { DEMO_PATIENT } from '../lib/demoPatient';

const theme = {
  gradient: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
};

// DEMO_PATIENT imported from ../lib/demoPatient

type ViewMode = 'order' | 'results';
type OrderTab = 'ai' | 'catalog';

export default function Imaging() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('results');
  const [activeTab, setActiveTab] = useState<OrderTab>('ai');
  const [showCosts, setShowCosts] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const toast = useToast();

  const { patientId, assessmentId, chiefComplaint: ccParam } = router.query;

  const {
    patientContext, selectedStudies, aiRecommendations, loadingRecommendations,
    searchQuery, modalityFilter, clinicalIndication, submitting, error,
    setPatientContext, addStudy, removeStudy, updateStudyPriority, updateStudyContrast,
    setClinicalIndication, setSearchQuery, setModalityFilter,
    addAIRecommendedStudies, submitOrder, clearOrder,
    getSelectedStudiesArray, getFilteredCatalog, getTotalCost, getStatCount,
    hasContrastStudies, getRadiationTotal,
  } = useImagingOrderingStore();

  // Load real patient context when patientId is in URL, otherwise demo
  useEffect(() => {
    let cancelled = false;
    const pid = patientId as string | undefined;
    const aid = assessmentId as string | undefined;
    if (!pid) {
      if (!patientContext) setPatientContext(DEMO_PATIENT);
      return;
    }
    fetchPatientContext(pid, aid)
      .then((ctx) => {
        if (cancelled) return;
        // If chiefComplaint came via URL param, prefer it
        // Note: router.query values are already decoded by Next.js
        if (ccParam && !ctx.chiefComplaint) {
          ctx.chiefComplaint = ccParam as string;
        }
        setPatientContext(ctx as OrderingContext);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[Imaging] Failed to load patient context:', err);
        setPatientContext(DEMO_PATIENT);
      });
    return () => { cancelled = true; };
  }, [patientId, assessmentId, ccParam]);  // eslint-disable-line react-hooks/exhaustive-deps

  const selectedStudiesArray = getSelectedStudiesArray();
  const filteredCatalog = getFilteredCatalog();
  const totalCost = getTotalCost();
  const statCount = getStatCount();
  const hasContrast = hasContrastStudies();
  const radiationTotal = getRadiationTotal();

  const patientForBanner = patientContext ? {
    ...patientContext,
    allergies: patientContext.allergies?.map(a => typeof a === 'string' ? a : a.allergen),
  } : null;

  const selectedCodes = new Set(Object.keys(selectedStudies));

  const handleToggleStudy = (code: string) => {
    if (code in selectedStudies) { removeStudy(code); } else { addStudy(code); }
  };

  const handleSubmit = async () => {
    try {
      toast.loading('Submitting imaging orders...');
      // encounterId is optional — pre-visit imaging orders don't require an encounter
      const eid = router.query.encounterId;
      const encId = eid && typeof eid === 'string' ? eid : undefined;
      const orderIds = await submitOrder(encId);
      toast.success('Imaging orders submitted!', `Order IDs: ${orderIds.join(', ')}`);
    } catch (err) {
      toast.error('Failed to submit', 'Please try again.');
    }
  };

  const handleEmergencyProtocol = () => {
    aiRecommendations
      .filter(r => r.category === 'recommended')
      .forEach(r => addStudy(r.studyCode, { priority: 'STAT', aiRecommended: true, rationale: r.rationale }));
    toast.warning('Emergency Protocol', 'STAT imaging auto-selected');
    setAlertDismissed(true);
  };

  const aiRecommendationCount = aiRecommendations.filter(r => r.category !== 'not-indicated').length;

  return (
    <>
      <Head>
        <title>Imaging Orders | ATTENDING AI</title>
      </Head>

      <ProviderShell contextBadge="Imaging" currentPage="imaging">
        {/* Results mode: full-bleed panel */}
        {viewMode === 'results' && (
          <div className="px-4 pt-3 pb-3" style={{ height: 'calc(100vh - 100px)' }}>
            <ImagingResultsReview onNewOrder={() => setViewMode('order')} />
          </div>
        )}

        {viewMode === 'order' && (
        <main className="max-w-7xl mx-auto px-6 py-6">
          <button onClick={() => setViewMode('results')}
            className="mb-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/15 rounded-lg transition-colors">
            &larr; Back to Results
          </button>
          {/* Critical Alert - Click to dismiss */}
          {patientContext?.redFlags && patientContext.redFlags.length > 0 && !alertDismissed && (
            <SimpleCriticalAlert
              title="Critical Red Flags Detected"
              message={`${patientContext.redFlags.length} red flag(s): ${patientContext.redFlags.join(', ')}. Consider STAT imaging.`}
              actionLabel="Auto-Select STAT Imaging"
              onAction={handleEmergencyProtocol}
              onDismiss={() => setAlertDismissed(true)}
              className="mb-6"
            />
          )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Study Selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Patient Banner */}
                {patientForBanner && (
                  <div className="bg-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                        {patientForBanner.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{patientForBanner.name}</h3>
                        <p className="text-sm text-gray-500">{patientForBanner.age}yo {patientForBanner.gender} • {patientForBanner.mrn}</p>
                      </div>
                      {patientForBanner.allergies && patientForBanner.allergies.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-700 font-medium">
                            {patientForBanner.allergies.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-gray-600">{patientForBanner.chiefComplaint}</p>
                    {/* Safety info for imaging */}
                    <div className="mt-3 flex gap-4 text-xs text-gray-500">
                      <span>Weight: {patientContext?.weight || 'N/A'} kg</span>
                      <span>Cr: {patientContext?.creatinine || 'N/A'}</span>
                      <span>GFR: {patientContext?.gfr || 'N/A'}</span>
                      <span>Pregnant: {patientContext?.pregnant ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                )}

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="flex border-b">
                    {[
                      { id: 'ai', label: 'AI Recommendations', icon: Brain, count: aiRecommendationCount },
                      { id: 'catalog', label: 'Full Catalog', icon: Search, count: Object.keys(IMAGING_CATALOG).length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as OrderTab)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-teal-600 text-teal-600 bg-teal-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.count !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            activeTab === tab.id ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {activeTab === 'ai' && (
                      <AIImagingRecommendationsPanel
                        recommendations={aiRecommendations}
                        isLoading={loadingRecommendations}
                        selectedCodes={selectedCodes}
                        onAddCategory={addAIRecommendedStudies}
                        onAddSingle={(code, priority, rationale) => addStudy(code, { priority, rationale, aiRecommended: true })}
                      />
                    )}
                    {activeTab === 'catalog' && (
                      <ImagingCatalogBrowser
                        catalog={filteredCatalog}
                        selectedStudies={selectedStudies}
                        searchQuery={searchQuery}
                        modalityFilter={modalityFilter}
                        showCosts={showCosts}
                        onSearchChange={setSearchQuery}
                        onModalityChange={setModalityFilter}
                        onToggleStudy={handleToggleStudy}
                        onPriorityChange={updateStudyPriority}
                        onContrastChange={updateStudyContrast}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Order Summary */}
              <div>
                <ImagingOrderSummary
                  selectedStudies={selectedStudiesArray}
                  totalCost={totalCost}
                  statCount={statCount}
                  hasContrastStudies={hasContrast}
                  radiationTotal={radiationTotal}
                  clinicalIndication={clinicalIndication}
                  submitting={submitting}
                  error={error}
                  onIndicationChange={setClinicalIndication}
                  onRemoveStudy={removeStudy}
                  onSubmit={handleSubmit}
                  onClear={clearOrder}
                />
              </div>
            </div>
        </main>
        )}
      </ProviderShell>
    </>
  );
}

function ImagingResultsView() {
  const [search, setSearch] = React.useState('');
  const [modalityFilter, setModalityFilter] = React.useState('all');
  const isConnected = useFhirConnected();

  // Demo records used when EHR is not connected.
  // Names are fictional placeholders — no real patient data.
  const demoResults = [
    {
      id: 'demo-1',
      patientName: 'Demo Patient A',
      mrn: 'MRN-DEMO1',
      study: 'CT Head w/o Contrast',
      modality: 'CT',
      date: 'Today, 2:15 PM',
      status: 'Final',
      statusColor: 'green',
      finding: 'Critical - SAH',
      findingColor: 'red',
      rowBg: 'bg-red-50',
    },
    {
      id: 'demo-2',
      patientName: 'Demo Patient B',
      mrn: 'MRN-DEMO2',
      study: 'MRI Brain w/wo Contrast',
      modality: 'MRI',
      date: 'Today, 11:30 AM',
      status: 'Final',
      statusColor: 'green',
      finding: 'Normal',
      findingColor: 'green',
      rowBg: '',
    },
    {
      id: 'demo-3',
      patientName: 'Demo Patient C',
      mrn: 'MRN-DEMO3',
      study: 'CT Chest PE Protocol',
      modality: 'CT',
      date: 'Today, 3:45 PM',
      status: 'Pending Read',
      statusColor: 'amber',
      finding: '—',
      findingColor: 'gray',
      rowBg: '',
    },
  ];

  const filteredDemo = demoResults.filter(r => {
    const matchSearch = !search || r.study.toLowerCase().includes(search.toLowerCase());
    const matchModality = modalityFilter === 'all' || r.modality === modalityFilter;
    return matchSearch && matchModality;
  });

  const modalityIcon = (m: string) => m === 'MRI'
    ? <span className="flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs"><Waves className="w-3 h-3" /> MRI</span>
    : <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"><Monitor className="w-3 h-3" /> {m}</span>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: 8, color: 'amber', icon: Clock },
          { label: 'Critical', value: 2, color: 'red', icon: AlertTriangle },
          { label: 'Scheduled', value: 5, color: 'blue', icon: Calendar },
          { label: 'Today', value: 12, color: 'green', icon: CheckCircle },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2">
              <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              <p className="text-teal-200 text-sm">{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold text-${stat.color}-400 mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* EHR connection badge */}
      {isConnected && (
        <div className="flex items-center gap-2 text-sm text-green-300">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          Showing imaging results from EHR
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search imaging studies..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500"
            />
          </div>
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200"
          >
            <option value="all">All Modalities</option>
            <option value="CT">CT</option>
            <option value="MRI">MRI</option>
            <option value="XR">X-Ray</option>
            <option value="US">Ultrasound</option>
          </select>
        </div>

        {isConnected ? (
          <div className="p-8 text-center text-gray-500">
            <p className="font-medium mb-1">EHR connected</p>
            <p className="text-sm">Imaging result retrieval via FHIR DiagnosticReport is not yet implemented.</p>
          </div>
        ) : filteredDemo.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Study</th>
                <th className="px-4 py-3">Modality</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Findings</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDemo.map((r) => (
                <tr key={r.id} className={r.rowBg}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.patientName}</p>
                    <p className="text-sm text-gray-500">{r.mrn}</p>
                  </td>
                  <td className="px-4 py-3">{r.study}</td>
                  <td className="px-4 py-3">{modalityIcon(r.modality)}</td>
                  <td className="px-4 py-3 text-sm">{r.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 bg-${r.statusColor}-100 text-${r.statusColor}-700 rounded-full text-xs`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 bg-${r.findingColor}-100 text-${r.findingColor}-700 rounded-full text-xs font-medium`}>
                      {r.finding}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {search || modalityFilter !== 'all'
              ? 'No results match your filter.'
              : (
                <div>
                  <p className="font-medium mb-1">Connect to Epic to see real imaging results</p>
                  <p className="text-sm">Use the “Connect Epic” button in the header to link your EHR.</p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
