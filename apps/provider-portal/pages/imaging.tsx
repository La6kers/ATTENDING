// ============================================================
// Imaging Page - Refactored to use imagingOrderingStore
// pages/imaging.tsx
//
// Full integration with Zustand store and modular components
// ============================================================

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { QuickActionsBar, PatientBanner, SimpleCriticalAlert, useToast } from '../components/shared';
import {
  ImagingCatalogBrowser,
  AIImagingRecommendationsPanel,
  ImagingOrderSummary,
} from '../components/imaging-ordering';
import {
  useImagingOrderingStore,
  IMAGING_CATALOG,
} from '../store/imagingOrderingStore';
import {
  FileImage,
  Brain,
  Search,
  Eye,
  Download,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle,
  Settings,
  Calendar,
  Monitor,
  Waves,
  Zap,
} from 'lucide-react';

// Sample patient context - in production this would come from assessment selection
const DEMO_PATIENT_CONTEXT = {
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
  const [viewMode, setViewMode] = useState<ViewMode>('order');
  const [activeTab, setActiveTab] = useState<OrderTab>('ai');
  const [showCosts, setShowCosts] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const toast = useToast();

  // Zustand store
  const {
    // State
    patientContext,
    selectedStudies,
    aiRecommendations,
    isLoadingRecommendations,
    searchQuery,
    modalityFilter,
    clinicalIndication,
    submitting,
    error,
    // Actions
    setPatientContext,
    addStudy,
    removeStudy,
    updateStudyPriority,
    updateStudyContrast,
    setClinicalIndication,
    setSearchQuery,
    setModalityFilter,
    addAIRecommendedStudies,
    submitOrder,
    clearOrder,
    // Computed
    getSelectedStudiesArray,
    getFilteredCatalog,
    getTotalCost,
    getStatCount,
    hasContrastStudies,
    getRadiationTotal,
  } = useImagingOrderingStore();

  // Load demo patient on mount
  useEffect(() => {
    if (!patientContext) {
      setPatientContext(DEMO_PATIENT_CONTEXT);
    }
  }, [patientContext, setPatientContext]);

  // Get computed values
  const selectedStudiesArray = getSelectedStudiesArray();
  const filteredCatalog = getFilteredCatalog();
  const totalCost = getTotalCost();
  const statCount = getStatCount();
  const hasContrast = hasContrastStudies();
  const radiationTotal = getRadiationTotal();

  // Convert Map to Set for component compatibility
  const selectedCodes = new Set(selectedStudies.keys());

  // Handle study toggle
  const handleToggleStudy = (code: string) => {
    if (selectedStudies.has(code)) {
      removeStudy(code);
    } else {
      addStudy(code);
    }
  };

  // Handle single AI recommendation add
  const handleAddSingleRecommendation = (
    studyCode: string,
    priority: 'STAT' | 'URGENT' | 'ROUTINE',
    rationale: string
  ) => {
    addStudy(studyCode, { priority, rationale, aiRecommended: true });
  };

  // Handle order submission
  const handleSubmit = async () => {
    try {
      toast.loading('Submitting imaging orders...');
      const orderIds = await submitOrder('encounter-demo-001');
      toast.success('Imaging orders submitted successfully!', `Order IDs: ${orderIds.join(', ')}`);
      console.log('Imaging order submitted:', orderIds);
    } catch (err) {
      toast.error('Failed to submit imaging orders', 'Please try again or contact support.');
      console.error('Failed to submit order:', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FileImage className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Imaging Orders</h1>
                  <p className="text-sm text-gray-500">
                    {viewMode === 'order'
                      ? `Ordering for ${patientContext?.name || 'Select Patient'}`
                      : 'View imaging results and reports'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Cost Toggle */}
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showCosts}
                    onChange={(e) => setShowCosts(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Show Costs
                </label>

                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => setViewMode('order')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'order'
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Order Studies
                  </button>
                  <button
                    onClick={() => setViewMode('results')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'results'
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    View Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Quick Actions Bar - Cross-page navigation */}
          <QuickActionsBar
            currentPage="imaging"
            patientId={patientContext?.id}
            showBackButton={true}
            backButtonLabel="Back to Diagnosis"
            backButtonHref="/assessments"
            showEmergencyButton={patientContext?.redFlags && patientContext.redFlags.length > 0}
            onEmergencyProtocol={() => {
              // Auto-select STAT imaging for emergency protocol
              aiRecommendations
                .filter(r => r.category === 'critical' || r.category === 'strongly-recommended')
                .forEach(r => r.studies?.forEach((study: any) => addStudy(study.studyCode, { priority: 'STAT', aiRecommended: true })));
              toast.warning('Emergency Protocol Activated', 'STAT imaging auto-selected');
            }}
          />

          {/* Critical Alert Banner - Shows when patient has red flags */}
          {patientContext?.redFlags && patientContext.redFlags.length > 0 && !alertDismissed && (
            <SimpleCriticalAlert
              title="Critical Red Flags Detected"
              message={`Patient has ${patientContext.redFlags.length} red flag${patientContext.redFlags.length > 1 ? 's' : ''}: ${patientContext.redFlags.join(', ')}. Consider STAT imaging studies.`}
              actionLabel="Auto-Select STAT Imaging"
              onAction={() => {
                aiRecommendations
                  .filter(r => r.category === 'critical' || r.category === 'strongly-recommended')
                  .forEach(r => r.studies?.forEach((study: any) => addStudy(study.studyCode, { priority: 'STAT', aiRecommended: true })));
                toast.success('STAT Imaging Selected', 'Critical imaging studies have been added to your order');
                setAlertDismissed(true);
              }}
              onDismiss={() => setAlertDismissed(true)}
              className="mb-4"
            />
          )}

          {viewMode === 'order' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Study Selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Patient Context Banner - Using shared component */}
                {patientContext && (
                  <PatientBanner
                    patient={patientContext}
                    accentColor="blue"
                    showRedFlags={true}
                    showSafetyInfo={true}
                    showActions={true}
                  />
                )}

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="border-b">
                    <div className="flex">
                      <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === 'ai'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Brain className="w-4 h-4" />
                        AI Recommendations
                        {aiRecommendations.filter(r => r.category !== 'not-indicated').length > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                            {aiRecommendations.filter(r => r.category !== 'not-indicated').length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('catalog')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === 'catalog'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Search className="w-4 h-4" />
                        Full Catalog
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {Object.keys(IMAGING_CATALOG).length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-0">
                    {activeTab === 'ai' && (
                      <AIImagingRecommendationsPanel
                        recommendations={aiRecommendations}
                        isLoading={isLoadingRecommendations}
                        selectedCodes={selectedCodes}
                        onAddCategory={addAIRecommendedStudies}
                        onAddSingle={handleAddSingleRecommendation}
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
              <div className="space-y-6">
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
            /* Results View */
            <ImagingResultsView />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============================================================
// Imaging Results View Component
// ============================================================

function ImagingResultsView() {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Studies</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">8</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Findings</p>
              <p className="text-2xl font-bold text-red-600 mt-1">2</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled Today</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">5</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-green-600 mt-1">12</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search imaging studies..."
              className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option>All Modalities</option>
            <option>CT</option>
            <option>MRI</option>
            <option>X-Ray</option>
            <option>Ultrasound</option>
            <option>Nuclear Medicine</option>
          </select>
          <select className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option>All Results</option>
            <option>Critical Findings</option>
            <option>Abnormal</option>
            <option>Normal</option>
            <option>Pending Read</option>
          </select>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Study
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modality
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Findings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Critical finding */}
            <tr className="hover:bg-gray-50 bg-red-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">John Doe</div>
                  <div className="text-sm text-gray-500">MRN: 123456</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">CT Head without Contrast</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                  <Monitor className="w-3 h-3" />
                  CT
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 2:15 PM</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Final
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  Critical - SAH
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <Download className="w-4 h-4" />
                </button>
              </td>
            </tr>
            
            {/* Normal result */}
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">Sarah Johnson</div>
                  <div className="text-sm text-gray-500">MRN: 789012</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">MRI Brain with Contrast</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs">
                  <Waves className="w-3 h-3" />
                  MRI
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 11:30 AM</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Final
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Normal
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <Download className="w-4 h-4" />
                </button>
              </td>
            </tr>

            {/* Pending read */}
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">Mike Wilson</div>
                  <div className="text-sm text-gray-500">MRN: 345678</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">CT Chest PE Protocol</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                  <Monitor className="w-3 h-3" />
                  CT
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 3:45 PM</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Pending Read
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-400">—</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <Download className="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
