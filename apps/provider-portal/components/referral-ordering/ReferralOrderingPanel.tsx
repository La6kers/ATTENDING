// ============================================================
// Referral Ordering Panel - Main Orchestrating Component
// apps/provider-portal/components/referral-ordering/ReferralOrderingPanel.tsx
// ============================================================

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
} from 'lucide-react';
import { useReferralOrderingStore } from '@/store/referralOrderingStore';

// Import new modular components
import { PatientContextBanner } from './PatientContextBanner';
import { AIRecommendationsPanel } from './AIRecommendationsPanel';
import { CommonReferralsGrid } from './CommonReferralsGrid';
import { CustomReferralForm } from './CustomReferralForm';
import { ReferralCard } from './ReferralCard';
import { ReferralStatusSidebar } from './ReferralStatusSidebar';
import { ReferralPreviewModal } from './ReferralPreviewModal';
import { ProviderSearchModal } from './ProviderSearchModal';
import type { 
  PatientContext, 
  Specialty, 
  AIReferralRecommendation,
  ReferralUrgency,
  ActiveReferral,
  ReferralStatusUpdate,
} from './types';

// Default common referrals
const COMMON_REFERRAL_OPTIONS = [
  { specialty: 'CARDS', icon: '❤️', label: 'Cardiology', defaultUrgency: 'ROUTINE' as const },
  { specialty: 'ENDO', icon: '🩺', label: 'Endocrinology', defaultUrgency: 'ROUTINE' as const },
  { specialty: 'DERM', icon: '🧴', label: 'Dermatology', defaultUrgency: 'ROUTINE' as const },
  { specialty: 'ORTHO', icon: '🦴', label: 'Orthopedics', defaultUrgency: 'ROUTINE' as const },
  { specialty: 'PSYCH', icon: '🧠', label: 'Psychiatry', defaultUrgency: 'ROUTINE' as const },
  { specialty: 'GI', icon: '🫁', label: 'Gastroenterology', defaultUrgency: 'ROUTINE' as const },
];

interface ReferralOrderingPanelProps {
  patientContext: PatientContext;
  /** Pass undefined when there is no active encounter (e.g. pre-visit ordering). */
  encounterId: string | undefined;
  onOrderComplete?: (referralIds: string[]) => void;
  showSidebar?: boolean;
}

export function ReferralOrderingPanel({ 
  patientContext, 
  encounterId,
  onOrderComplete,
  showSidebar = true,
}: ReferralOrderingPanelProps) {
  // UI State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showProviderSearch, setShowProviderSearch] = useState<string | null>(null);
  const [expandedReferral, setExpandedReferral] = useState<string | null>(null);
  const [showNewReferralForm, setShowNewReferralForm] = useState(false);
  const [previewReferral, setPreviewReferral] = useState<string | null>(null);
  
  // Static demo data — not state since these values never change at runtime.
  // Replace with store/API calls when the backend referral status endpoint is ready.
  const statusUpdates: ReferralStatusUpdate[] = [
    { id: '1', status: 'SENT', timestamp: new Date(), message: 'Referral submitted to provider', completed: true },
    { id: '2', status: 'PENDING', timestamp: new Date(), message: 'Insurance authorization pending', completed: false },
    { id: '3', status: 'PENDING', timestamp: new Date(), message: 'Appointment scheduled', completed: false },
    { id: '4', status: 'PENDING', timestamp: new Date(), message: 'Patient notified', completed: false },
  ];

  const activeReferrals: ActiveReferral[] = [
    { id: 'ref-1', specialty: 'CARDS', specialtyName: 'Cardiology', status: 'SCHEDULED', appointmentDate: 'March 15' },
    { id: 'ref-2', specialty: 'ENDO', specialtyName: 'Endocrinology', status: 'PENDING' },
  ];

  // Store state and actions
  const {
    specialtyCatalog,
    selectedReferrals,
    aiRecommendations,
    loadingRecommendations,
    filteredProviders,
    searchQuery,
    submitting,
    error,
    setPatientContext: setStorePatientContext,
    generateAIRecommendations,
    addReferral,
    removeReferral,
    updateReferral,
    setPreferredProvider,
    searchProviders,
    setSearchQuery,
    submitReferrals,
    getSelectedReferralsArray,
    getFilteredCatalog,
    getStatCount,
    getAuthRequiredCount,
  } = useReferralOrderingStore();

  // Sync patient context into store, then generate AI recommendations
  useEffect(() => {
    if (patientContext) {
      setStorePatientContext(patientContext);
      generateAIRecommendations();
    }
  }, [patientContext]);  // eslint-disable-line react-hooks/exhaustive-deps

  const selectedArray = getSelectedReferralsArray();
  const filteredSpecialties = getFilteredCatalog();
  const statCount = getStatCount();
  const authRequired = getAuthRequiredCount();

  const categories = [
    { id: 'all', label: 'All Specialties' },
    { id: 'medical', label: 'Medical' },
    { id: 'surgical', label: 'Surgical' },
    { id: 'behavioral', label: 'Behavioral' },
    { id: 'therapeutic', label: 'Therapeutic' },
    { id: 'diagnostic', label: 'Diagnostic' },
  ];

  // Handlers
  const handleSubmit = async () => {
    try {
      const ids = await submitReferrals(encounterId);
      onOrderComplete?.(ids);
    } catch (err) {
      console.error('Failed to submit referrals:', err);
    }
  };

  const handleAddRecommendation = (rec: AIReferralRecommendation, specialty: Specialty) => {
    addReferral(specialty, rec.urgency);
    updateReferral(rec.specialty, {
      clinicalQuestion: rec.clinicalQuestion
    });
    setExpandedReferral(rec.specialty);
  };

  const handleCommonReferralSelect = (specialty: Specialty, urgency: string) => {
    addReferral(specialty, urgency as ReferralUrgency);
    setExpandedReferral(specialty.code);
  };

  const handleCustomReferralCreate = (data: {
    specialty: Specialty;
    provider?: string;
    urgency: ReferralUrgency;
    clinicalReason: string;
  }) => {
    addReferral(data.specialty, data.urgency);
    updateReferral(data.specialty.code, {
      clinicalQuestion: data.clinicalReason
    });
    setShowNewReferralForm(false);
    setExpandedReferral(data.specialty.code);
  };

  const handlePreviewReferral = (specialtyCode: string) => {
    setPreviewReferral(specialtyCode);
  };

  const handleConfirmSubmit = async () => {
    if (!previewReferral) return;

    try {
      // Submit ONLY the previewed referral — not the entire store batch.
      const ref = selectedArray.find(r => r.specialty.code === previewReferral);
      if (!ref) return;

      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: encounterId || undefined,
          referrals: [{
            specialtyCode: ref.specialty.code,
            specialtyName: ref.specialty.name,
            urgency: ref.urgency,
            clinicalQuestion: ref.clinicalQuestion,
            relevantHistory: ref.relevantHistory,
            preferredProviderId: ref.preferredProvider?.id,
          }],
        }),
      });

      if (!res.ok) throw new Error(`Referral submission failed (${res.status})`);
      const data = await res.json();
      const ids: string[] = data.referralIds || data.ids || [];

      setPreviewReferral(null);
      onOrderComplete?.(ids);
    } catch (err) {
      console.error('Failed to submit referral:', err);
    }
  };

  // Get the referral being previewed
  const previewedReferral = previewReferral 
    ? selectedArray.find(r => r.specialty.code === previewReferral)
    : null;

  return (
    <div className="space-y-6">
      {/* Patient Context Banner */}
      <PatientContextBanner patient={patientContext} />

      {/* Main Content Grid */}
      <div className={`grid gap-6 ${showSidebar ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Left Column - Main Content */}
        <div className={`space-y-6 ${showSidebar ? 'lg:col-span-2' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Specialty Referrals</h2>
              <p className="text-sm text-gray-500">
                {selectedArray.length} referral{selectedArray.length !== 1 ? 's' : ''} selected
                {statCount > 0 && <span className="text-red-600 ml-2">({statCount} STAT)</span>}
                {authRequired > 0 && <span className="text-orange-600 ml-2">({authRequired} need auth)</span>}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search specialties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <AIRecommendationsPanel
            recommendations={aiRecommendations}
            specialtyCatalog={specialtyCatalog}
            selectedReferrals={new Set(Object.keys(selectedReferrals))}
            loading={loadingRecommendations}
            onAddRecommendation={handleAddRecommendation}
            onRemoveRecommendation={removeReferral}
          />

          {/* Selected Referrals */}
          {selectedArray.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">
                Selected Referrals ({selectedArray.length})
              </h3>
              {selectedArray.map(ref => {
                const recommendation = aiRecommendations.find(
                  r => r.specialty === ref.specialty.code
                );
                return (
                  <ReferralCard
                    key={ref.specialty.code}
                    selectedReferral={ref}
                    recommendation={recommendation}
                    isSelected={true}
                    isExpanded={expandedReferral === ref.specialty.code}
                    onToggleExpand={() => setExpandedReferral(
                      expandedReferral === ref.specialty.code ? null : ref.specialty.code
                    )}
                    onRemove={() => removeReferral(ref.specialty.code)}
                    onUpdateUrgency={(urgency) => updateReferral(ref.specialty.code, { urgency })}
                    onUpdateClinicalQuestion={(q) => updateReferral(ref.specialty.code, { clinicalQuestion: q })}
                    onUpdateHistory={(h) => updateReferral(ref.specialty.code, { relevantHistory: h })}
                    onSelectProvider={() => {
                      setShowProviderSearch(ref.specialty.code);
                      searchProviders(ref.specialty.code, patientContext.insurancePlan);
                    }}
                    onPreview={() => handlePreviewReferral(ref.specialty.code)}
                    onSubmit={() => handlePreviewReferral(ref.specialty.code)}
                  />
                );
              })}
            </div>
          )}

          {/* Add New Referral Section */}
          <div className="bg-white rounded-xl border-2 border-dashed border-blue-300 overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-blue-50 transition-colors"
              onClick={() => setShowNewReferralForm(!showNewReferralForm)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Add New Referral</h3>
                  <p className="text-sm text-gray-500">Create additional specialist referrals</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                NEW
              </span>
            </button>

            {showNewReferralForm && (
              <div className="p-4 border-t border-gray-100 space-y-6">
                {/* Common Referrals Grid */}
                <CommonReferralsGrid
                  options={COMMON_REFERRAL_OPTIONS}
                  specialtyCatalog={specialtyCatalog}
                  onSelectReferral={handleCommonReferralSelect}
                />

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-semibold uppercase">OR</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Custom Referral Form */}
                <CustomReferralForm
                  specialtyCatalog={specialtyCatalog}
                  onCreateReferral={handleCustomReferralCreate}
                  onCancel={() => setShowNewReferralForm(false)}
                />
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Specialty Catalog Browser */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b">
              <h3 className="font-medium text-gray-900">
                {activeCategory === 'all' 
                  ? 'All Specialties' 
                  : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Specialties`}
              </h3>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {filteredSpecialties
                .filter(spec => activeCategory === 'all' || spec.category === activeCategory)
                .map(specialty => {
                  const isSelected = specialty.code in selectedReferrals;
                  const recommendation = aiRecommendations.find(r => r.specialty === specialty.code);
                  
                  return (
                    <SpecialtyListItem
                      key={specialty.code}
                      specialty={specialty}
                      isSelected={isSelected}
                      hasRecommendation={!!recommendation}
                      onSelect={() => {
                        if (isSelected) {
                          removeReferral(specialty.code);
                        } else {
                          addReferral(specialty);
                          setExpandedReferral(specialty.code);
                        }
                      }}
                    />
                  );
                })}
            </div>
          </div>

          {/* Submit Button */}
          {selectedArray.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="text-sm text-gray-600">
                {selectedArray.length} referral{selectedArray.length !== 1 ? 's' : ''} ready to submit
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-medium hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit All Referrals'}
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        {showSidebar && (
          <ReferralStatusSidebar
            statusUpdates={statusUpdates}
            activeReferrals={activeReferrals}
            onViewAllReferrals={() => { /* TODO: navigate to full referral history page */ }}
            onInitiateAppeal={(_id) => { /* TODO: open appeal workflow modal */ }}
          />
        )}
      </div>

      {/* Provider Search Modal */}
      {showProviderSearch && (
        <ProviderSearchModal
          isOpen={!!showProviderSearch}
          specialtyCode={showProviderSearch}
          specialtyName={specialtyCatalog.find(s => s.code === showProviderSearch)?.name || 'Specialist'}
          providers={filteredProviders}
          insurance={patientContext.insurancePlan}
          onSelect={(provider) => {
            setPreferredProvider(showProviderSearch, provider);
            setShowProviderSearch(null);
          }}
          onClose={() => setShowProviderSearch(null)}
          onSearch={(specialty, insurance) => searchProviders(specialty, insurance)}
        />
      )}

      {/* Referral Preview Modal */}
      <ReferralPreviewModal
        isOpen={!!previewReferral}
        onClose={() => setPreviewReferral(null)}
        referral={previewedReferral || null}
        patient={patientContext}
        onConfirmSubmit={handleConfirmSubmit}
        isSubmitting={submitting}
      />
    </div>
  );
}

// Helper component for specialty list items
function SpecialtyListItem({
  specialty,
  isSelected,
  hasRecommendation,
  onSelect,
}: {
  specialty: Specialty;
  isSelected: boolean;
  hasRecommendation: boolean;
  onSelect: () => void;
}) {
  return (
    <div className={`p-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-teal-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{specialty.name}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {specialty.code}
            </span>
            {specialty.requiresAuth && (
              <span className="text-xs text-orange-600">Auth Required</span>
            )}
            {hasRecommendation && (
              <span className="text-xs text-teal-600">✨ AI Recommended</span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {specialty.subspecialties.slice(0, 4).map(sub => (
              <span key={sub} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {sub}
              </span>
            ))}
            {specialty.subspecialties.length > 4 && (
              <span className="text-xs text-gray-400">
                +{specialty.subspecialties.length - 4} more
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>Routine: ~{specialty.averageWaitDays.routine} days</span>
            <span>Urgent: ~{specialty.averageWaitDays.urgent} days</span>
          </div>
        </div>
        
        <button
          onClick={onSelect}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isSelected
              ? 'bg-teal-600 text-white'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isSelected ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  );
}

export default ReferralOrderingPanel;
