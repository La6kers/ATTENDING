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
import {
  useImagingOrderingStore,
  IMAGING_CATALOG,
  type OrderPriority,
} from '../store/imagingOrderingStore';

const theme = {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const DEMO_PATIENT = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 34,
  gender: 'Female',
  mrn: 'MRN-2024-001',
  chiefComplaint: 'Severe headache with visual disturbances and confusion for 3 days',
  allergies: [{ allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate' as const }],
  currentMedications: ['Oral contraceptive', 'Metformin 500mg'],
  medicalHistory: ['Type 2 Diabetes', 'Migraines'],
  redFlags: ['Worst headache of life', 'Confusion', 'Visual changes'],
  weight: 68,
  creatinine: 0.9,
  gfr: 95,
  pregnant: false,
};

type ViewMode = 'order' | 'results';
type OrderTab = 'ai' | 'catalog';

export default function Imaging() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('order');
  const [activeTab, setActiveTab] = useState<OrderTab>('ai');
  const [showCosts, setShowCosts] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const toast = useToast();

  const {
    patientContext, selectedStudies, aiRecommendations, isLoadingRecommendations,
    searchQuery, modalityFilter, clinicalIndication, submitting, error,
    setPatientContext, addStudy, removeStudy, updateStudyPriority, updateStudyContrast,
    setClinicalIndication, setSearchQuery, setModalityFilter,
    addAIRecommendedStudies, submitOrder, clearOrder,
    getSelectedStudiesArray, getFilteredCatalog, getTotalCost, getStatCount,
    hasContrastStudies, getRadiationTotal,
  } = useImagingOrderingStore();

  useEffect(() => {
    if (!patientContext) setPatientContext(DEMO_PATIENT);
  }, [patientContext, setPatientContext]);

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

  const selectedCodes = new Set(selectedStudies.keys());

  const handleToggleStudy = (code: string) => {
    if (selectedStudies.has(code)) { removeStudy(code); } else { addStudy(code); }
  };

  const handleSubmit = async () => {
    try {
      toast.loading('Submitting imaging orders...');
      const orderIds = await submitOrder('encounter-demo-001');
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

      <ProviderShell contextBadge="Imaging Orders" currentPage="imaging"
        headerRight={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showCosts} onChange={(e) => setShowCosts(e.target.checked)} className="rounded text-purple-600" />
              Show Costs
            </label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setViewMode('order')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'order' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>Order Studies</button>
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
              message={`${patientContext.redFlags.length} red flag(s): ${patientContext.redFlags.join(', ')}. Consider STAT imaging.`}
              actionLabel="Auto-Select STAT Imaging"
              onAction={handleEmergencyProtocol}
              onDismiss={() => setAlertDismissed(true)}
              className="mb-6"
            />
          )}

          {viewMode === 'order' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Study Selection */}
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
                      <AIImagingRecommendationsPanel
                        recommendations={aiRecommendations}
                        isLoading={isLoadingRecommendations}
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
          ) : (
            <ImagingResultsView />
          )}
        </main>
      </ProviderShell>
    </>
  );
}

function ImagingResultsView() {
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
              <p className="text-purple-200 text-sm">{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold text-${stat.color}-400 mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search imaging studies..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
            />
          </div>
          <select className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200">
            <option>All Modalities</option>
            <option>CT</option>
            <option>MRI</option>
            <option>X-Ray</option>
            <option>Ultrasound</option>
          </select>
        </div>

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
            <tr className="bg-red-50">
              <td className="px-4 py-3">
                <p className="font-medium">John Doe</p>
                <p className="text-sm text-gray-500">MRN: 123456</p>
              </td>
              <td className="px-4 py-3">CT Head w/o Contrast</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  <Monitor className="w-3 h-3" /> CT
                </span>
              </td>
              <td className="px-4 py-3 text-sm">Today, 2:15 PM</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Final</span>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Critical - SAH</span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <p className="font-medium">Sarah Johnson</p>
                <p className="text-sm text-gray-500">MRN: 789012</p>
              </td>
              <td className="px-4 py-3">MRI Brain w/wo Contrast</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                  <Waves className="w-3 h-3" /> MRI
                </span>
              </td>
              <td className="px-4 py-3 text-sm">Today, 11:30 AM</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Final</span>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Normal</span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <p className="font-medium">Mike Wilson</p>
                <p className="text-sm text-gray-500">MRN: 345678</p>
              </td>
              <td className="px-4 py-3">CT Chest PE Protocol</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  <Monitor className="w-3 h-3" /> CT
                </span>
              </td>
              <td className="px-4 py-3 text-sm">Today, 3:45 PM</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">Pending Read</span>
              </td>
              <td className="px-4 py-3 text-gray-400">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
