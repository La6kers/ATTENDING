// ============================================================
// Lab Orders Page - Streamlined with consistent full-page gradient
// pages/labs.tsx
// ============================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  TestTube, Brain, Package, Search, Filter, AlertTriangle,
  CheckCircle, RefreshCw, X
} from 'lucide-react';
import { QuickActionsBar, PatientBanner, SimpleCriticalAlert, useToast } from '../components/shared';
import { ProviderShell } from '@/components/layout/ProviderShell';
import {
  LabCatalogBrowser,
  AIRecommendationsPanel,
  LabOrderSummary,
  LabPanelsSelector,
} from '../components/lab-ordering';
import {
  useLabOrderingStore,
  LAB_CATALOG,
  LAB_PANELS,
} from '../store/labOrderingStore';
import { useLabResults, useFhirConnected } from '@attending/shared/lib/fhir/hooks';
import { useFhirContext } from '@attending/shared/lib/fhir/FhirProvider';

const theme = {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const DEMO_PATIENT = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 34,
  gender: 'Female',
  mrn: 'MRN-2024-001',
  chiefComplaint: 'Severe headache with visual disturbances for 3 days',
  allergies: [{ allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate' as const }],
  currentMedications: ['Metformin 500mg', 'Lisinopril 10mg'],
  medicalHistory: ['Type 2 Diabetes', 'Hypertension', 'Migraines'],
  redFlags: ['Worst headache of life', 'Visual changes'],
};

/**
 * Fetch real patient context from the API when patientId is provided via URL.
 * Falls back to DEMO_PATIENT for standalone browsing / demo mode.
 */
async function fetchPatientContext(patientId: string): Promise<typeof DEMO_PATIENT | null> {
  try {
    const res = await fetch(`/api/patients/${patientId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const patient = data.patient || data;

    // Map API response to the shape the lab ordering store expects
    const dob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / 31557600000) : 0;

    return {
      id: patient.id,
      name: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown',
      age,
      gender: patient.gender || 'Unknown',
      mrn: patient.mrn || '',
      chiefComplaint: patient.chiefComplaint || data.chiefComplaint || '',
      allergies: (patient.allergies || []).map((a: any) =>
        typeof a === 'string'
          ? { allergen: a, reaction: 'Unknown', severity: 'moderate' as const }
          : { allergen: a.allergen || a.name || a, reaction: a.reaction || 'Unknown', severity: (a.severity || 'moderate') as 'moderate' }
      ),
      currentMedications: patient.medications || patient.currentMedications || [],
      medicalHistory: patient.medicalHistory || patient.conditions || [],
      redFlags: patient.redFlags || data.redFlags || [],
    };
  } catch (err) {
    console.error('[Labs] Failed to fetch patient:', err);
    return null;
  }
}

type ViewMode = 'order' | 'results';
type OrderTab = 'ai' | 'panels' | 'catalog';

export default function Labs() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('order');
  const [activeTab, setActiveTab] = useState<OrderTab>('ai');
  const [showCosts, setShowCosts] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const toast = useToast();

  const {
    patientContext, selectedLabs, aiRecommendations, isLoadingRecommendations,
    searchQuery, categoryFilter, clinicalIndication, specialInstructions, submitting, error,
    setPatientContext, addLab, addPanel, removeLab, updateLabPriority,
    setClinicalIndication, setSpecialInstructions, setSearchQuery, setCategoryFilter,
    addAIRecommendedLabs, submitOrder, clearOrder,
    getSelectedLabsArray, getFilteredCatalog, getTotalCost, getStatCount, getFastingRequired,
  } = useLabOrderingStore();

  // Load real patient from URL params, or fall back to DEMO_PATIENT
  const { patientId, encounterId, assessmentId, chiefComplaint } = router.query;

  useEffect(() => {
    let cancelled = false;

    async function loadPatient() {
      // If a real patientId is in the URL, fetch from API
      if (patientId && typeof patientId === 'string') {
        setPatientLoading(true);
        const ctx = await fetchPatientContext(patientId);
        if (!cancelled) {
          if (ctx) {
            // Overlay chiefComplaint from URL if provided (e.g., from assessment)
            if (chiefComplaint && typeof chiefComplaint === 'string') {
              ctx.chiefComplaint = chiefComplaint;
            }
            setPatientContext(ctx);
          } else {
            // Patient not found — fall back to demo
            toast.error('Patient not found', 'Using demo patient data');
            setPatientContext(DEMO_PATIENT);
          }
          setPatientLoading(false);
        }
      } else if (!patientContext) {
        // No patientId in URL — use demo patient
        setPatientContext(DEMO_PATIENT);
      }
    }

    loadPatient();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, chiefComplaint]);

  const selectedLabsArray = getSelectedLabsArray();
  const filteredCatalog = getFilteredCatalog();
  const totalCost = getTotalCost();
  const statCount = getStatCount();
  const fastingRequired = getFastingRequired();

  const patientForBanner = patientContext ? {
    ...patientContext,
    allergies: patientContext.allergies?.map(a => typeof a === 'string' ? a : a.allergen),
  } : null;

  const selectedCodes = new Set(selectedLabs.keys());

  const handleToggleLab = (code: string) => {
    if (selectedLabs.has(code)) { removeLab(code); } else { addLab(code); }
  };

  const handleSubmit = async () => {
    try {
      toast.loading('Submitting lab orders...');
      const eid = (encounterId && typeof encounterId === 'string') ? encounterId : 'encounter-demo-001';
      const orderIds = await submitOrder(eid);
      toast.success('Lab orders submitted!', `Order IDs: ${Array.isArray(orderIds) ? orderIds.join(', ') : orderIds}`);
      // If we came from an assessment, navigate back to it
      if (assessmentId && typeof assessmentId === 'string') {
        router.push(`/assessments/${assessmentId}`);
      }
    } catch (err) {
      toast.error('Failed to submit', 'Please try again.');
    }
  };

  const handleEmergencyProtocol = () => {
    aiRecommendations
      .filter(r => r.category === 'recommended')
      .forEach(r => addLab(r.labCode, { priority: 'STAT', aiRecommended: true, rationale: r.rationale }));
    toast.warning('Emergency Protocol', 'STAT labs auto-selected');
    setAlertDismissed(true);
  };

  return (
    <>
      <Head>
        <title>Lab Orders | ATTENDING AI</title>
      </Head>

      <ProviderShell contextBadge="Lab Orders" currentPage="labs"
        headerRight={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showCosts} onChange={(e) => setShowCosts(e.target.checked)} className="rounded text-purple-600" />
              Show Costs
            </label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setViewMode('order')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'order' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>Order Labs</button>
              <button onClick={() => setViewMode('results')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'results' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>View Results</button>
            </div>
          </div>
        }
      >
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Critical Alert - Click to dismiss */}
          {patientContext?.redFlags && patientContext.redFlags.length > 0 && !alertDismissed && (
            <SimpleCriticalAlert
              title="Critical Red Flags Detected"
              message={`${patientContext.redFlags.length} red flag(s): ${patientContext.redFlags.join(', ')}. Consider STAT lab orders.`}
              actionLabel="Auto-Select STAT Labs"
              onAction={handleEmergencyProtocol}
              onDismiss={() => setAlertDismissed(true)}
              className="mb-6"
            />
          )}

          {viewMode === 'order' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Lab Selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Patient Banner */}
                {patientForBanner && (
                  <div className="bg-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
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
                  </div>
                )}

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="flex border-b">
                    {[
                      { id: 'ai', label: 'AI Recommendations', icon: Brain, count: aiRecommendations.length },
                      { id: 'panels', label: 'Lab Panels', icon: Package },
                      { id: 'catalog', label: 'Full Catalog', icon: Search, count: Object.keys(LAB_CATALOG).length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as OrderTab)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-purple-600 text-purple-600 bg-purple-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.count !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {activeTab === 'ai' && (
                      <AIRecommendationsPanel
                        recommendations={aiRecommendations}
                        isLoading={isLoadingRecommendations}
                        selectedCodes={selectedCodes}
                        onAddCategory={addAIRecommendedLabs}
                        onAddSingle={(code, priority, rationale) => addLab(code, { priority, rationale, aiRecommended: true })}
                      />
                    )}
                    {activeTab === 'panels' && (
                      <LabPanelsSelector
                        panels={LAB_PANELS}
                        selectedLabs={selectedLabs}
                        showCosts={showCosts}
                        onAddPanel={addPanel}
                      />
                    )}
                    {activeTab === 'catalog' && (
                      <LabCatalogBrowser
                        catalog={filteredCatalog}
                        selectedLabs={selectedLabs}
                        searchQuery={searchQuery}
                        categoryFilter={categoryFilter}
                        showCosts={showCosts}
                        onSearchChange={setSearchQuery}
                        onCategoryChange={setCategoryFilter}
                        onToggleLab={handleToggleLab}
                        onPriorityChange={updateLabPriority}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Order Summary */}
              <div>
                <LabOrderSummary
                  selectedLabs={selectedLabsArray}
                  totalCost={totalCost}
                  statCount={statCount}
                  fastingRequired={fastingRequired}
                  clinicalIndication={clinicalIndication}
                  specialInstructions={specialInstructions}
                  submitting={submitting}
                  error={error}
                  onIndicationChange={setClinicalIndication}
                  onInstructionsChange={setSpecialInstructions}
                  onRemoveLab={removeLab}
                  onSubmit={handleSubmit}
                  onClear={clearOrder}
                />
              </div>
            </div>
          ) : (
            <LabResultsView />
          )}
        </main>
      </ProviderShell>
    </>
  );
}

function LabResultsView() {
  const [search, setSearch] = React.useState('');
  const [filterInterpretation, setFilterInterpretation] = React.useState('all');
  const isConnected = useFhirConnected();
  const { patientId: fhirPatientId } = useFhirContext();
  const { data: labResults, isLoading } = useLabResults(fhirPatientId || undefined);

  const filteredResults = React.useMemo(() => {
    if (!labResults) return [];
    return labResults.filter((r) => {
      const matchSearch = !search || r.testName.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filterInterpretation === 'all' || r.interpretation === filterInterpretation;
      return matchSearch && matchFilter;
    });
  }, [labResults, search, filterInterpretation]);

  const counts = React.useMemo(() => {
    const all = labResults || [];
    return {
      critical: all.filter((r) => r.interpretation === 'critical').length,
      abnormal: all.filter((r) => r.interpretation === 'abnormal' || r.interpretation === 'high' || r.interpretation === 'low').length,
      normal: all.filter((r) => r.interpretation === 'normal').length,
      total: all.length,
    };
  }, [labResults]);

  const interpColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    abnormal: 'bg-orange-100 text-orange-700',
    high: 'bg-orange-100 text-orange-700',
    low: 'bg-blue-100 text-blue-700',
    normal: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Results', value: isConnected ? counts.total : 24, color: 'text-white' },
          { label: 'Critical', value: isConnected ? counts.critical : 3, color: 'text-red-400' },
          { label: 'Abnormal', value: isConnected ? counts.abnormal : 8, color: 'text-orange-400' },
          { label: 'Normal', value: isConnected ? counts.normal : 13, color: 'text-green-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-purple-200 text-sm">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* EHR badge */}
      {isConnected && (
        <div className="flex items-center gap-2 text-sm text-green-300">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          Showing lab results from EHR
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search labs..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-500" />
          </div>
          <select value={filterInterpretation} onChange={(e) => setFilterInterpretation(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200">
            <option value="all">All Results</option>
            <option value="critical">Critical Only</option>
            <option value="abnormal">Abnormal Only</option>
            <option value="normal">Normal Only</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading lab results from EHR…</div>
        ) : filteredResults.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Test</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredResults.map((r) => (
                <tr key={r.id} className={r.interpretation === 'critical' ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.testName}</td>
                  <td className={`px-4 py-3 font-semibold ${r.interpretation === 'critical' ? 'text-red-600' : r.interpretation === 'abnormal' || r.interpretation === 'high' || r.interpretation === 'low' ? 'text-orange-600' : 'text-gray-700'}`}>
                    {r.value}{r.unit ? ` ${r.unit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{r.referenceRange || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{r.resultedAt ? new Date(r.resultedAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    {r.interpretation && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${interpColors[r.interpretation] || 'bg-gray-100 text-gray-600'}`}>
                        {r.interpretation.charAt(0).toUpperCase() + r.interpretation.slice(1)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {isConnected
              ? search || filterInterpretation !== 'all'
                ? 'No results match your filter.'
                : 'No lab results found in EHR for this patient.'
              : (
                <div>
                  <p className="font-medium mb-1">Connect to Epic to see real lab results</p>
                  <p className="text-sm">Use the "Connect Epic" button in the header to link your EHR.</p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
