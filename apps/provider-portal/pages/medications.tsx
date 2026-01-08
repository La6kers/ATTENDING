// ============================================================
// Medications Page - Refactored to use Zustand Store
// pages/medications.tsx
//
// Provider portal medication ordering with AI recommendations
// ============================================================

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { 
  MedicationCatalogBrowser,
  AIMedicationRecommendationsPanel,
  MedicationOrderSummary,
  DrugInteractionAlert,
  AllergyAlert,
} from '../components/medication-ordering';
import { 
  useMedicationOrderingStore,
  type PatientContext,
  type PharmacyInfo,
  type PrescriptionPriority,
} from '../store/medicationOrderingStore';
import { User, Building2, Phone, Clock, MapPin } from 'lucide-react';

// Sample patient context - in production, this would come from patient selection
const samplePatientContext: PatientContext = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 32,
  gender: 'Female',
  weight: 65,
  mrn: '78932145',
  chiefComplaint: 'Chronic migraine with aura, occurring 8-10 days per month',
  allergies: [
    { allergen: 'Penicillin', reaction: 'Rash, hives, difficulty breathing', severity: 'severe', crossReactivity: ['amoxicillin', 'ampicillin'] },
    { allergen: 'Sulfa drugs', reaction: 'Skin rash, nausea', severity: 'moderate' },
    { allergen: 'Codeine', reaction: 'Nausea, vomiting, drowsiness', severity: 'mild' },
  ],
  currentMedications: ['Ethinyl Estradiol/Norgestimate (oral contraceptive)'],
  medicalHistory: ['Migraine with aura', 'Anxiety disorder'],
  pregnant: false,
  breastfeeding: false,
};

// Sample pharmacy
const samplePharmacy: PharmacyInfo = {
  id: 'pharmacy-001',
  name: 'CVS Pharmacy #2847',
  address: '1234 Main Street, Denver, CO 80202',
  phone: '(303) 555-0123',
  fax: '(303) 555-0124',
  hours: 'Mon-Fri 8AM-10PM, Sat-Sun 9AM-8PM',
  isPreferred: true,
  acceptsEprescribe: true,
};

export default function MedicationsPage() {
  const [viewMode, setViewMode] = useState<'prescribe' | 'review'>('prescribe');

  // Zustand store
  const {
    patientContext,
    selectedMedications,
    aiRecommendations,
    isLoadingRecommendations,
    detectedInteractions,
    allergyAlerts,
    searchQuery,
    categoryFilter,
    preferredPharmacy,
    submitting,
    error,
    setPatientContext,
    addMedication,
    removeMedication,
    updateMedication,
    setSearchQuery,
    setCategoryFilter,
    setPreferredPharmacy,
    addAIRecommendedMedication,
    submitPrescriptions,
    clearOrder,
    getSelectedMedicationsArray,
    getFilteredCatalog,
    getTotalCost,
    getControlledCount,
    hasBlackBoxWarnings,
  } = useMedicationOrderingStore();

  // Initialize patient context and pharmacy on mount
  useEffect(() => {
    setPatientContext(samplePatientContext);
    setPreferredPharmacy(samplePharmacy);
  }, [setPatientContext, setPreferredPharmacy]);

  // Computed values
  const selectedMedsArray = getSelectedMedicationsArray();
  const filteredCatalog = getFilteredCatalog();
  const totalCost = getTotalCost();
  const controlledCount = getControlledCount();
  const blackBoxWarnings = hasBlackBoxWarnings();
  const selectedIds = new Set(selectedMedications.keys());

  // Handlers
  const handleToggleMedication = (medId: string) => {
    if (selectedMedications.has(medId)) {
      removeMedication(medId);
    } else {
      addMedication(medId);
    }
  };

  const handlePriorityChange = (medId: string, priority: PrescriptionPriority) => {
    updateMedication(medId, { priority });
  };

  const handleStrengthChange = (medId: string, strength: string) => {
    updateMedication(medId, { strength });
  };

  const handleAddRecommendation = (medId: string, priority: PrescriptionPriority, rationale: string) => {
    addAIRecommendedMedication(medId, priority, rationale);
  };

  const handleSubmit = async () => {
    try {
      await submitPrescriptions('encounter-001'); // In production, use actual encounter ID
      // Show success message or redirect
    } catch (err) {
      // Error is already in store
      console.error('Prescription submission failed:', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Patient Banner */}
        {patientContext && (
          <div className="bg-white shadow-sm mx-6 mt-6 rounded-2xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {patientContext.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{patientContext.name}</h2>
                  <p className="text-gray-600">
                    {patientContext.age} y/o {patientContext.gender} • MRN: {patientContext.mrn}
                    {patientContext.weight && ` • ${patientContext.weight}kg`}
                  </p>
                  <p className="text-sm text-indigo-600 mt-1">
                    Chief Complaint: {patientContext.chiefComplaint}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode(viewMode === 'prescribe' ? 'review' : 'prescribe')}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  {viewMode === 'prescribe' ? 'Review Current Meds' : 'New Prescription'}
                </button>
                <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:shadow-lg transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  Print Med List
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Catalog & AI Recommendations */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Recommendations */}
              <AIMedicationRecommendationsPanel
                recommendations={aiRecommendations}
                isLoading={isLoadingRecommendations}
                selectedIds={selectedIds}
                onAddRecommendation={handleAddRecommendation}
              />

              {/* Drug Interactions */}
              {detectedInteractions.length > 0 && (
                <DrugInteractionAlert interactions={detectedInteractions} />
              )}

              {/* Medication Catalog */}
              <MedicationCatalogBrowser
                medications={filteredCatalog}
                selectedIds={selectedIds}
                selectedMedications={selectedMedications}
                searchQuery={searchQuery}
                categoryFilter={categoryFilter}
                onSearchChange={setSearchQuery}
                onCategoryChange={setCategoryFilter}
                onToggleMedication={handleToggleMedication}
                onPriorityChange={handlePriorityChange}
                onStrengthChange={handleStrengthChange}
              />
            </div>

            {/* Right Column - Order Summary & Info */}
            <div className="space-y-6">
              {/* Order Summary */}
              <MedicationOrderSummary
                selectedMedications={selectedMedsArray}
                pharmacy={preferredPharmacy}
                totalCost={totalCost}
                controlledCount={controlledCount}
                hasBlackBoxWarnings={blackBoxWarnings}
                isSubmitting={submitting}
                onRemove={removeMedication}
                onUpdateMed={updateMedication}
                onSubmit={handleSubmit}
                onClear={clearOrder}
              />

              {/* Patient Allergies */}
              {patientContext && (
                <AllergyAlert
                  allergyAlerts={allergyAlerts}
                  patientAllergies={patientContext.allergies}
                />
              )}

              {/* Pharmacy Information */}
              {preferredPharmacy && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-600" />
                    </div>
                    Preferred Pharmacy
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        CVS
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{preferredPharmacy.name}</h4>
                        <p className="text-sm text-gray-600">
                          {preferredPharmacy.isPreferred && 'Primary Pharmacy'}
                          {preferredPharmacy.acceptsEprescribe && ' • E-Prescribe Enabled'}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {preferredPharmacy.address}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {preferredPharmacy.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {preferredPharmacy.hours}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
                        Change Pharmacy
                      </button>
                      <button className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-1">
                        <Phone className="w-4 h-4" />
                        Call
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Current Medications */}
              {patientContext && patientContext.currentMedications.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    Current Medications
                  </h3>
                  <div className="space-y-2">
                    {patientContext.currentMedications.map((med, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-lg p-2 text-sm text-gray-700"
                      >
                        {med}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * AI recommendations consider interactions with current medications
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
