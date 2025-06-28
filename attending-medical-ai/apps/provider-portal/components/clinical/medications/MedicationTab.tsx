/**
 * Main Medication Tab Component - Container for the entire medication management system
 * Integrates the sophisticated medication management interface from the HTML prototype
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useMedicationStore, medicationSelectors } from '../../../stores/medicationStore';
import { usePharmacyStore, pharmacySelectors } from '../../../stores/pharmacyStore';
import { MedicationList } from './MedicationList';
import { PharmacyInfo } from './PharmacyManagement';
import { AddMedicationModal } from './Modals/AddMedicationModal';
import { Pill, Plus, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MedicationTabProps {
  patientId: string;
  className?: string;
}

export const MedicationTab: React.FC<MedicationTabProps> = ({
  patientId,
  className = '',
}) => {
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  
  // Medication store
  const {
    medications,
    summary,
    isLoading,
    error,
    expandedCards,
    isAddModalOpen,
    openAddModal,
    closeAddModal,
    expandAllCards,
    collapseAllCards,
    refresh,
  } = useMedicationStore();

  // Pharmacy store
  const {
    primaryPharmacy,
    showAlternatePharmacies,
    toggleAlternatePharmacies,
  } = usePharmacyStore();

  // Computed values
  const filteredMedications = useMedicationStore(medicationSelectors.filteredAndSortedMedications);
  const medicationCount = useMedicationStore(medicationSelectors.medicationCount);
  const hasActiveFilters = useMedicationStore(medicationSelectors.hasActiveFilters);

  // Handle expand/collapse all
  const handleToggleAll = () => {
    if (isAllExpanded) {
      collapseAllCards();
    } else {
      expandAllCards();
    }
    setIsAllExpanded(!isAllExpanded);
  };

  // Update expand state based on actual expanded cards
  useEffect(() => {
    const allExpanded = medications.length > 0 && medications.every(med => expandedCards.has(med.id));
    setIsAllExpanded(allExpanded);
  }, [expandedCards, medications]);

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh medications:', error);
    }
  };

  return (
    <div className={`medication-tab-container ${className}`}>
      {/* Patient Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md p-6 mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
              SJ
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Sarah Johnson</h2>
              <p className="text-gray-600">32 y/o Female • MRN: 78932145 • DOB: 03/15/1992</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to Chart
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print Med List
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Medications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Medications Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Current Medications ({medicationCount} Active)
                  </h1>
                  {hasActiveFilters && (
                    <p className="text-sm text-blue-600">Filtered results</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleAll}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  {isAllExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isAllExpanded ? 'Collapse All' : 'Expand All'}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Add New Medication
                </button>
              </div>
            </div>
          </motion.div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                    !
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">Error Loading Medications</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          {isLoading && medications.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-md p-8 text-center"
            >
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading medications...</p>
            </motion.div>
          )}

          {/* Medications List */}
          {!isLoading && medications.length === 0 && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md p-8 text-center"
            >
              <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medications Found</h3>
              <p className="text-gray-600 mb-4">This patient doesn't have any medications on file.</p>
              <button
                onClick={openAddModal}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Add First Medication
              </button>
            </motion.div>
          )}

          {/* Medication List Component */}
          {medications.length > 0 && (
            <MedicationList
              medications={filteredMedications}
              isLoading={isLoading}
              className="space-y-4"
            />
          )}
        </div>

        {/* Right Column - Pharmacy Info & Safety Checks */}
        <div className="space-y-6">
          {/* Pharmacy Information */}
          <PharmacyInfo
            pharmacy={primaryPharmacy}
            showAlternates={showAlternatePharmacies}
            onToggleAlternates={toggleAlternatePharmacies}
            className="bg-white rounded-xl shadow-md"
          />

          {/* Summary Stats */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Medication Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{summary.activeMedications}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{summary.needingRefill}</div>
                  <div className="text-sm text-gray-600">Need Refill</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{summary.withInteractions}</div>
                  <div className="text-sm text-gray-600">Interactions</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${summary.totalMonthlyCost.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600">Monthly Cost</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-left flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
                  🧪
                </div>
                <div>
                  <div className="font-medium">Order Labs</div>
                  <div className="text-sm text-blue-600">Check drug levels</div>
                </div>
              </button>
              <button className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-left flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white text-sm">
                  💊
                </div>
                <div>
                  <div className="font-medium">E-Prescribe</div>
                  <div className="text-sm text-green-600">Send new prescription</div>
                </div>
              </button>
              <button className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors text-left flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm">
                  👥
                </div>
                <div>
                  <div className="font-medium">Refer Patient</div>
                  <div className="text-sm text-purple-600">Specialist consultation</div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add Medication Modal */}
      <AddMedicationModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        patientId={patientId}
      />

      {/* Custom Styles */}
      <style jsx>{`
        .medication-tab-container {
          min-height: calc(100vh - 200px);
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        @media (max-width: 1024px) {
          .medication-tab-container {
            padding: 1rem;
          }
        }

        @media print {
          .medication-tab-container {
            background: white !important;
            padding: 0 !important;
          }
          
          button {
            display: none !important;
          }
          
          .shadow-md,
          .shadow-lg,
          .shadow-xl {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MedicationTab;
