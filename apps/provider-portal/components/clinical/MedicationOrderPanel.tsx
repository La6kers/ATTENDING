/**
 * ATTENDING AI - Medication Order Panel
 * 
 * Component for viewing and managing medications with drug interaction checking.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  useActiveMedications,
  useCreateMedicationOrder,
  useDiscontinueMedication,
  useCheckDrugInteractions,
  MedicationOrderResponse,
  DrugInteractionResponse,
  CreateMedicationOrderRequest,
} from '../lib/api/backend';

// Severity colors for drug interactions
const severityColors: Record<string, string> = {
  Contraindicated: 'bg-red-600 text-white',
  Major: 'bg-red-100 text-red-800',
  Moderate: 'bg-yellow-100 text-yellow-800',
  Minor: 'bg-blue-100 text-blue-800',
};

interface MedicationOrderPanelProps {
  patientId: string;
  encounterId: string;
  onOrderCreated?: (orderNumber: string) => void;
}

export function MedicationOrderPanel({
  patientId,
  encounterId,
  onOrderCreated,
}: MedicationOrderPanelProps) {
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Fetch active medications
  const { data: medications, isLoading, error, refetch } = useActiveMedications(patientId);

  // Create mutation
  const { mutate: createOrder, isLoading: isCreating } = useCreateMedicationOrder();

  // Discontinue mutation
  const { mutate: discontinue, isLoading: isDiscontinuing } = useDiscontinueMedication();

  // Handle create order
  const handleCreateOrder = useCallback(async (request: CreateMedicationOrderRequest) => {
    try {
      const result = await createOrder(request);
      setShowOrderForm(false);
      refetch();
      onOrderCreated?.(result.orderNumber);
    } catch (err) {
      console.error('Failed to create medication order:', err);
    }
  }, [createOrder, refetch, onOrderCreated]);

  // Handle discontinue
  const handleDiscontinue = useCallback(async (id: string, reason: string) => {
    try {
      await discontinue({ id, reason });
      refetch();
    } catch (err) {
      console.error('Failed to discontinue medication:', err);
    }
  }, [discontinue, refetch]);

  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load medications: {error.detail}</p>
        <button onClick={() => refetch()} className="mt-2 text-sm text-red-600 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Active Medications</h3>
        <button
          onClick={() => setShowOrderForm(true)}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors"
        >
          + New Prescription
        </button>
      </div>

      {/* Medications List */}
      <div className="divide-y divide-gray-100">
        {medications?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No active medications</p>
          </div>
        ) : (
          medications?.map((med) => (
            <MedicationRow
              key={med.id}
              medication={med}
              onDiscontinue={handleDiscontinue}
              isDiscontinuing={isDiscontinuing}
            />
          ))
        )}
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <MedicationOrderForm
          patientId={patientId}
          encounterId={encounterId}
          onSubmit={handleCreateOrder}
          onClose={() => setShowOrderForm(false)}
          isSubmitting={isCreating}
        />
      )}
    </div>
  );
}

// =============================================================================
// Medication Row Component
// =============================================================================

interface MedicationRowProps {
  medication: MedicationOrderResponse;
  onDiscontinue: (id: string, reason: string) => void;
  isDiscontinuing: boolean;
}

function MedicationRow({ medication, onDiscontinue, isDiscontinuing }: MedicationRowProps) {
  const [showDiscontinueDialog, setShowDiscontinueDialog] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');

  const handleDiscontinue = () => {
    if (discontinueReason.trim()) {
      onDiscontinue(medication.id, discontinueReason);
      setShowDiscontinueDialog(false);
      setDiscontinueReason('');
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{medication.medicationName}</span>
            <span className="text-gray-500">{medication.strength}</span>
            {medication.isControlledSubstance && (
              <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                C-{medication.deaSchedule}
              </span>
            )}
            {medication.hasBlackBoxWarning && (
              <span className="px-2 py-0.5 text-xs font-medium bg-black text-white rounded">
                ⚠️ Black Box
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {medication.dosage} {medication.form} {medication.route} {medication.frequency}
          </p>
          {medication.instructions && (
            <p className="text-sm text-gray-500 mt-1 italic">"{medication.instructions}"</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Qty: {medication.quantity} • Refills: {medication.refills}
          </p>

          {/* Drug Interactions */}
          {medication.interactions && medication.interactions.length > 0 && (
            <div className="mt-2 space-y-1">
              {medication.interactions.map((interaction, idx) => (
                <div
                  key={idx}
                  className={`px-2 py-1 text-xs rounded ${severityColors[interaction.severity]}`}
                >
                  <span className="font-medium">{interaction.severity}:</span> Interacts with{' '}
                  {interaction.drug2} - {interaction.description}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowDiscontinueDialog(true)}
          className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
          disabled={isDiscontinuing}
        >
          Discontinue
        </button>
      </div>

      {/* Discontinue Dialog */}
      {showDiscontinueDialog && (
        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
          <p className="text-sm text-red-800 mb-2">Discontinue this medication?</p>
          <input
            type="text"
            value={discontinueReason}
            onChange={(e) => setDiscontinueReason(e.target.value)}
            placeholder="Reason for discontinuation"
            className="w-full px-3 py-2 text-sm border border-red-300 rounded mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDiscontinue}
              disabled={!discontinueReason.trim() || isDiscontinuing}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:opacity-50"
            >
              Confirm Discontinue
            </button>
            <button
              onClick={() => setShowDiscontinueDialog(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Medication Order Form Component
// =============================================================================

interface MedicationOrderFormProps {
  patientId: string;
  encounterId: string;
  onSubmit: (request: CreateMedicationOrderRequest) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

// Common medications for quick selection
const commonMedications = [
  { code: 'RX-AMOX-500', brand: 'Amoxil', generic: 'Amoxicillin', strength: '500mg', form: 'Capsule', dosage: '500mg', frequency: 'Three times daily', route: 'PO' },
  { code: 'RX-LISIN-10', brand: 'Prinivil', generic: 'Lisinopril', strength: '10mg', form: 'Tablet', dosage: '10mg', frequency: 'Daily', route: 'PO' },
  { code: 'RX-METF-500', brand: 'Glucophage', generic: 'Metformin', strength: '500mg', form: 'Tablet', dosage: '500mg', frequency: 'Twice daily', route: 'PO' },
  { code: 'RX-ATOR-20', brand: 'Lipitor', generic: 'Atorvastatin', strength: '20mg', form: 'Tablet', dosage: '20mg', frequency: 'Daily at bedtime', route: 'PO' },
  { code: 'RX-OMEP-20', brand: 'Prilosec', generic: 'Omeprazole', strength: '20mg', form: 'Capsule', dosage: '20mg', frequency: 'Daily before breakfast', route: 'PO' },
  { code: 'RX-IBU-400', brand: 'Motrin', generic: 'Ibuprofen', strength: '400mg', form: 'Tablet', dosage: '400mg', frequency: 'Every 6 hours as needed', route: 'PO' },
];

function MedicationOrderForm({ patientId, encounterId, onSubmit, onClose, isSubmitting }: MedicationOrderFormProps) {
  const [selectedMed, setSelectedMed] = useState<typeof commonMedications[0] | null>(null);
  const [quantity, setQuantity] = useState(30);
  const [refills, setRefills] = useState(0);
  const [instructions, setInstructions] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [interactions, setInteractions] = useState<DrugInteractionResponse[]>([]);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);

  // Check interactions mutation
  const { mutate: checkInteractions } = useCheckDrugInteractions();

  // Check for interactions when medication is selected
  useEffect(() => {
    if (selectedMed) {
      setIsCheckingInteractions(true);
      checkInteractions({ patientId, medicationName: selectedMed.generic })
        .then(setInteractions)
        .catch(() => setInteractions([]))
        .finally(() => setIsCheckingInteractions(false));
    }
  }, [selectedMed, patientId, checkInteractions]);

  const hasContraindication = interactions.some(i => i.severity === 'Contraindicated');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed || !clinicalIndication || !diagnosisCode || hasContraindication) return;

    onSubmit({
      patientId,
      encounterId,
      medicationCode: selectedMed.code,
      medicationName: selectedMed.brand,
      genericName: selectedMed.generic,
      strength: selectedMed.strength,
      form: selectedMed.form,
      route: selectedMed.route,
      frequency: selectedMed.frequency,
      dosage: selectedMed.dosage,
      quantity,
      refills,
      instructions,
      clinicalIndication,
      diagnosisCode,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Prescription</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Medication Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Medication *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {commonMedications.map((med) => (
                <button
                  key={med.code}
                  type="button"
                  onClick={() => setSelectedMed(med)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedMed?.code === med.code
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{med.brand}</p>
                  <p className="text-xs text-gray-500">{med.generic} {med.strength}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Drug Interaction Warning */}
          {selectedMed && (
            <div>
              {isCheckingInteractions ? (
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  Checking for drug interactions...
                </div>
              ) : interactions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Drug Interaction Check:</p>
                  {interactions.map((interaction, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${severityColors[interaction.severity]}`}
                    >
                      <p className="font-medium">{interaction.severity} Interaction</p>
                      <p className="text-sm">
                        {interaction.drug1} + {interaction.drug2}: {interaction.description}
                      </p>
                    </div>
                  ))}
                  {hasContraindication && (
                    <p className="text-red-600 font-medium text-sm">
                      ⛔ Cannot prescribe - contraindicated interaction detected
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  ✓ No drug interactions detected
                </div>
              )}
            </div>
          )}

          {/* Quantity and Refills */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refills
              </label>
              <input
                type="number"
                value={refills}
                onChange={(e) => setRefills(parseInt(e.target.value) || 0)}
                min="0"
                max="11"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Special instructions for the patient..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={2}
            />
          </div>

          {/* Clinical Indication */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinical Indication *
            </label>
            <input
              type="text"
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              placeholder="Reason for prescribing..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ICD-10 Code *
            </label>
            <input
              type="text"
              value={diagnosisCode}
              onChange={(e) => setDiagnosisCode(e.target.value.toUpperCase())}
              placeholder="I10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMed || !clinicalIndication || !diagnosisCode || hasContraindication || isSubmitting}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Prescribing...' : 'Send to Pharmacy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MedicationOrderPanel;
