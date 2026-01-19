// ============================================================
// Medications Page - Refactored to use Zustand Store
// pages/medications.tsx
//
// Updated to use @attending/ui-primitives design tokens
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
  type DrugAllergy,
} from '../store/medicationOrderingStore';
import { User, Building2, Phone, Clock, MapPin, Printer, FileText } from 'lucide-react';
import { Button, Card, Badge, Avatar, gradients } from '@attending/ui-primitives';

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
    { allergen: 'Penicillin', reaction: 'Rash, hives, difficulty breathing', severity: 'severe' },
    { allergen: 'Sulfa drugs', reaction: 'Skin rash, nausea', severity: 'moderate' },
    { allergen: 'Codeine', reaction: 'Nausea, vomiting, drowsiness', severity: 'mild' },
  ],
  currentMedications: ['Ethinyl Estradiol/Norgestimate (oral contraceptive)'],
  medicalHistory: ['Migraine with aura', 'Anxiety disorder'],
  redFlags: [],
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

  // Transform allergies to DrugAllergy[] format for AllergyAlert component
  const normalizedAllergies: DrugAllergy[] = patientContext?.allergies?.map(a => 
    typeof a === 'string' 
      ? { allergen: a, reaction: 'Unknown', severity: 'moderate' as const }
      : { 
          allergen: a.allergen, 
          reaction: a.reaction || 'Unknown', 
          severity: a.severity || 'moderate' 
        }
  ) || [];

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
      <div className="min-h-screen">
        {/* Patient Banner */}
        {patientContext && (
          <Card variant="default" className="mx-6 mt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={patientContext.name} size="xl" />
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{patientContext.name}</h2>
                  <p className="text-gray-600">
                    {patientContext.age} y/o {patientContext.gender} • MRN: {patientContext.mrn}
                    {patientContext.weight && ` • ${patientContext.weight}kg`}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    Chief Complaint: {patientContext.chiefComplaint}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setViewMode(viewMode === 'prescribe' ? 'review' : 'prescribe')}
                  leftIcon={<FileText className="w-4 h-4" />}
                >
                  {viewMode === 'prescribe' ? 'Review Current Meds' : 'New Prescription'}
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  Print Med List
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
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
                  patientAllergies={normalizedAllergies}
                />
              )}

              {/* Pharmacy Information */}
              {preferredPharmacy && (
                <Card variant="default">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: gradients.referrals }}
                    >
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    Preferred Pharmacy
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: gradients.referrals }}
                      >
                        CVS
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{preferredPharmacy.name}</h4>
                        <div className="flex gap-2 mt-1">
                          {preferredPharmacy.isPreferred && (
                            <Badge variant="primary" size="sm">Primary</Badge>
                          )}
                          {preferredPharmacy.acceptsEprescribe && (
                            <Badge variant="success" size="sm">E-Prescribe</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                      <p className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {preferredPharmacy.address}
                      </p>
                      <p className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {preferredPharmacy.phone}
                      </p>
                      <p className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {preferredPharmacy.hours}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" fullWidth>
                        Change Pharmacy
                      </Button>
                      <Button variant="primary" size="sm" fullWidth leftIcon={<Phone className="w-4 h-4" />}>
                        Call
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Patient Current Medications */}
              {patientContext && patientContext.currentMedications && patientContext.currentMedications.length > 0 && (
                <Card variant="default">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    Current Medications
                  </h3>
                  <div className="space-y-2">
                    {patientContext.currentMedications.map((med, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700"
                      >
                        {med}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    * AI recommendations consider interactions with current medications
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
