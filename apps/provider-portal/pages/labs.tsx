// ============================================================
// Labs Page - Refactored to use labOrderingStore
// pages/labs.tsx
//
// Full integration with Zustand store and modular components
// ============================================================

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
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
import {
  TestTube,
  Brain,
  Package,
  Search,
  Eye,
  Download,
  Filter,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Settings,
} from 'lucide-react';

// Sample patient context - in production this would come from assessment selection
const DEMO_PATIENT_CONTEXT = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 34,
  gender: 'Female',
  mrn: 'MRN-2024-001',
  chiefComplaint: 'Severe headache with visual disturbances for 3 days',
  allergies: ['Penicillin'],
  currentMedications: ['Metformin 500mg', 'Lisinopril 10mg'],
  medicalHistory: ['Type 2 Diabetes', 'Hypertension', 'Migraines'],
  redFlags: ['Worst headache of life', 'Visual changes'],
};

type ViewMode = 'order' | 'results';
type OrderTab = 'ai' | 'panels' | 'catalog';

export default function Labs() {
  const [viewMode, setViewMode] = useState<ViewMode>('order');
  const [activeTab, setActiveTab] = useState<OrderTab>('ai');
  const [showCosts, setShowCosts] = useState(true);

  // Zustand store
  const {
    // State
    patientContext,
    selectedLabs,
    aiRecommendations,
    isLoadingRecommendations,
    searchQuery,
    categoryFilter,
    clinicalIndication,
    specialInstructions,
    submitting,
    error,
    // Actions
    setPatientContext,
    addLab,
    addPanel,
    removeLab,
    updateLabPriority,
    setClinicalIndication,
    setSpecialInstructions,
    setSearchQuery,
    setCategoryFilter,
    addAIRecommendedLabs,
    submitOrder,
    clearOrder,
    // Computed
    getSelectedLabsArray,
    getFilteredCatalog,
    getTotalCost,
    getStatCount,
    getFastingRequired,
  } = useLabOrderingStore();

  // Load demo patient on mount (in production, this would come from route/context)
  useEffect(() => {
    if (!patientContext) {
      setPatientContext(DEMO_PATIENT_CONTEXT);
    }
  }, [patientContext, setPatientContext]);

  // Get computed values
  const selectedLabsArray = getSelectedLabsArray();
  const filteredCatalog = getFilteredCatalog();
  const totalCost = getTotalCost();
  const statCount = getStatCount();
  const fastingRequired = getFastingRequired();

  // Convert Map to Set for component compatibility
  const selectedCodes = new Set(selectedLabs.keys());

  // Handle lab toggle
  const handleToggleLab = (code: string) => {
    if (selectedLabs.has(code)) {
      removeLab(code);
    } else {
      addLab(code);
    }
  };

  // Handle single AI recommendation add
  const handleAddSingleRecommendation = (
    testCode: string,
    priority: 'STAT' | 'ASAP' | 'ROUTINE',
    rationale: string
  ) => {
    addLab(testCode, { priority, rationale, aiRecommended: true });
  };

  // Handle order submission
  const handleSubmit = async () => {
    try {
      const orderIds = await submitOrder('encounter-demo-001');
      // Show success notification (you could add a toast here)
      console.log('Lab order submitted:', orderIds);
      alert(`Lab order submitted successfully! Order IDs: ${orderIds.join(', ')}`);
    } catch (err) {
      console.error('Failed to submit order:', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <TestTube className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Laboratory Orders</h1>
                  <p className="text-sm text-gray-500">
                    {viewMode === 'order'
                      ? `Ordering for ${patientContext?.name || 'Select Patient'}`
                      : 'View lab results and trends'}
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
                    Order Labs
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
          {viewMode === 'order' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Lab Selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Patient Context Banner */}
                {patientContext && (
                  <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">
                            {patientContext.name}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {patientContext.age}yo {patientContext.gender}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {patientContext.mrn}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Chief Complaint:</strong> {patientContext.chiefComplaint}
                        </p>
                        {patientContext.redFlags.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-600">
                              Red Flags: {patientContext.redFlags.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Settings className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
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
                        {aiRecommendations.length > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                            {aiRecommendations.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('panels')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === 'panels'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        Lab Panels
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
                          {Object.keys(LAB_CATALOG).length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-0">
                    {activeTab === 'ai' && (
                      <AIRecommendationsPanel
                        recommendations={aiRecommendations}
                        isLoading={isLoadingRecommendations}
                        selectedCodes={selectedCodes}
                        onAddCategory={addAIRecommendedLabs}
                        onAddSingle={handleAddSingleRecommendation}
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
              <div className="space-y-6">
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
            /* Results View */
            <LabResultsView />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============================================================
// Lab Results View Component (kept inline for simplicity)
// ============================================================

function LabResultsView() {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Results</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TestTube className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Values</p>
              <p className="text-2xl font-bold text-red-600 mt-1">3</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Abnormal Results</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">8</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Results</p>
              <p className="text-2xl font-bold text-green-600 mt-1">24</p>
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
              placeholder="Search labs..."
              className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option>All Tests</option>
            <option>Chemistry</option>
            <option>Hematology</option>
            <option>Microbiology</option>
            <option>Immunology</option>
          </select>
          <select className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option>All Results</option>
            <option>Critical Only</option>
            <option>Abnormal Only</option>
            <option>Normal</option>
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
                Test Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Result
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Sample critical result */}
            <tr className="hover:bg-gray-50 bg-red-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">John Doe</div>
                  <div className="text-sm text-gray-500">MRN: 123456</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Troponin I</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-red-600">2.5 ng/mL ↑↑</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">&lt; 0.04 ng/mL</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 3:45 PM</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  Critical High
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
            
            {/* Sample abnormal result */}
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">Sarah Johnson</div>
                  <div className="text-sm text-gray-500">MRN: 789012</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">TSH</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-orange-600">8.2 mIU/L ↑</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">0.4-4.0 mIU/L</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 2:15 PM</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                  Abnormal High
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

            {/* Sample normal result */}
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">Mike Wilson</div>
                  <div className="text-sm text-gray-500">MRN: 345678</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">CBC with Diff</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-green-600">Within Normal Limits</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">See Report</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 11:30 AM</div>
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
          </tbody>
        </table>
      </div>
    </>
  );
}
