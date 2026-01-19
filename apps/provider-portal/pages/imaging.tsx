// ============================================================
// Imaging Page - Refactored to use imagingOrderingStore
// pages/imaging.tsx
//
// Updated to use @attending/ui-primitives design tokens
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
  type OrderPriority,
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
  Calendar,
  Monitor,
  Waves,
} from 'lucide-react';
import { Button, Badge, Card, cn, gradients } from '@attending/ui-primitives';

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

// ============================================================
// Stat Card Component (reusable)
// ============================================================

interface StatCardProps {
  label: string;
  value: number | string;
  color: 'yellow' | 'red' | 'blue' | 'green';
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon }) => {
  const colorStyles = {
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
  };

  return (
    <Card variant="default" className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={cn('text-2xl font-bold mt-1', colorStyles[color].text)}>{value}</p>
        </div>
        <div className={cn('p-3 rounded-xl', colorStyles[color].bg)}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

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

  // Transform patient context for PatientBanner (normalize allergies to strings)
  const patientForBanner = patientContext ? {
    ...patientContext,
    allergies: patientContext.allergies?.map(a => 
      typeof a === 'string' ? a : a.allergen
    ),
  } : null;

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
    priority: OrderPriority,
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

  const aiRecommendationCount = aiRecommendations.filter(r => r.category !== 'not-indicated').length;

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: gradients.imaging }}
                >
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
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCosts}
                    onChange={(e) => setShowCosts(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  Show Costs
                </label>

                {/* View Mode Toggle */}
                <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50">
                  <button
                    onClick={() => setViewMode('order')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      viewMode === 'order'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    Order Studies
                  </button>
                  <button
                    onClick={() => setViewMode('results')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      viewMode === 'results'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
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
                .filter(r => r.category === 'recommended')
                .forEach(r => addStudy(r.studyCode, { priority: 'STAT', aiRecommended: true, rationale: r.rationale }));
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
                  .filter(r => r.category === 'recommended')
                  .forEach(r => addStudy(r.studyCode, { priority: 'STAT', aiRecommended: true, rationale: r.rationale }));
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
                {patientForBanner && (
                  <PatientBanner
                    patient={patientForBanner}
                    accentColor="blue"
                    showRedFlags={true}
                    showSafetyInfo={true}
                    showActions={true}
                  />
                )}

                {/* Tab Navigation */}
                <Card variant="default" noPadding>
                  <div className="border-b border-gray-200">
                    <div className="flex">
                      <button
                        onClick={() => setActiveTab('ai')}
                        className={cn(
                          'flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors',
                          activeTab === 'ai'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        )}
                      >
                        <Brain className="w-4 h-4" />
                        AI Recommendations
                        {aiRecommendationCount > 0 && (
                          <Badge variant="primary" size="sm">{aiRecommendationCount}</Badge>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('catalog')}
                        className={cn(
                          'flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors',
                          activeTab === 'catalog'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        )}
                      >
                        <Search className="w-4 h-4" />
                        Full Catalog
                        <Badge variant="default" size="sm">{Object.keys(IMAGING_CATALOG).length}</Badge>
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div>
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
                </Card>
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
        <StatCard
          label="Pending Studies"
          value={8}
          color="yellow"
          icon={<Clock className="w-6 h-6 text-yellow-600" />}
        />
        <StatCard
          label="Critical Findings"
          value={2}
          color="red"
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
        />
        <StatCard
          label="Scheduled Today"
          value={5}
          color="blue"
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          label="Completed Today"
          value={12}
          color="green"
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
        />
      </div>

      {/* Filters */}
      <Card variant="default" className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search imaging studies..."
              className="border-gray-300 rounded-xl text-sm focus:ring-purple-500 focus:border-purple-500 px-4 py-2"
            />
          </div>
          <select className="border-gray-300 rounded-xl text-sm focus:ring-purple-500 focus:border-purple-500 px-4 py-2">
            <option>All Modalities</option>
            <option>CT</option>
            <option>MRI</option>
            <option>X-Ray</option>
            <option>Ultrasound</option>
            <option>Nuclear Medicine</option>
          </select>
          <select className="border-gray-300 rounded-xl text-sm focus:ring-purple-500 focus:border-purple-500 px-4 py-2">
            <option>All Results</option>
            <option>Critical Findings</option>
            <option>Abnormal</option>
            <option>Normal</option>
            <option>Pending Read</option>
          </select>
          <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
            More Filters
          </Button>
        </div>
      </Card>

      {/* Results Table */}
      <Card variant="default" noPadding className="overflow-hidden">
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
                <Badge variant="info" size="sm">
                  <Monitor className="w-3 h-3 mr-1" />
                  CT
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 2:15 PM</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant="success" size="sm">Final</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant="danger" size="sm">Critical - SAH</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-purple-600 hover:text-purple-900 mr-3 p-1 rounded hover:bg-purple-50">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
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
                <Badge variant="primary" size="sm">
                  <Waves className="w-3 h-3 mr-1" />
                  MRI
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 11:30 AM</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant="success" size="sm">Final</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant="success" size="sm">Normal</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-purple-600 hover:text-purple-900 mr-3 p-1 rounded hover:bg-purple-50">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
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
                <Badge variant="info" size="sm">
                  <Monitor className="w-3 h-3 mr-1" />
                  CT
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">Today, 3:45 PM</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant="warning" size="sm">Pending Read</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-400">—</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-purple-600 hover:text-purple-900 mr-3 p-1 rounded hover:bg-purple-50">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                  <Download className="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
