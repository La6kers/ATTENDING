// ============================================================
// Medication Order Summary Component
// components/medication-ordering/MedicationOrderSummary.tsx
//
// Order summary/checkout component for medications with cost breakdown
// ============================================================

import React, { useState } from 'react';
import { 
  ShoppingCart, Trash2, AlertTriangle, Loader2, 
  DollarSign, Pill, ShieldAlert, FileText, Edit2, Send
} from 'lucide-react';
import type { SelectedMedication, PharmacyInfo } from '../../store/medicationOrderingStore';

interface MedicationOrderSummaryProps {
  selectedMedications: SelectedMedication[];
  pharmacy: PharmacyInfo | null;
  totalCost: { generic: number; brand: number };
  controlledCount: number;
  hasBlackBoxWarnings: boolean;
  isSubmitting: boolean;
  onRemove: (medId: string) => void;
  onUpdateMed: (medId: string, updates: Partial<SelectedMedication>) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export const MedicationOrderSummary: React.FC<MedicationOrderSummaryProps> = ({
  selectedMedications,
  pharmacy,
  totalCost,
  controlledCount,
  hasBlackBoxWarnings,
  isSubmitting,
  onRemove,
  onUpdateMed,
  onSubmit,
  onClear,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  const canSubmit = selectedMedications.length > 0 && 
    selectedMedications.every(m => m.indication && m.indication.trim() !== '');

  const missingIndications = selectedMedications.filter(m => !m.indication || m.indication.trim() === '');

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Prescription Order</h3>
              <p className="text-sm opacity-90">
                {selectedMedications.length} {selectedMedications.length === 1 ? 'medication' : 'medications'} to prescribe
              </p>
            </div>
          </div>
          {selectedMedications.length > 0 && (
            <button
              onClick={onClear}
              className="text-sm text-white/80 hover:text-white flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {selectedMedications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Pill className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No medications selected</p>
            <p className="text-sm">Search or browse the catalog to add prescriptions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Warnings */}
            {controlledCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <strong>{controlledCount} controlled substance{controlledCount > 1 ? 's' : ''}</strong> in order.
                  E-prescribing or paper Rx required.
                </div>
              </div>
            )}

            {hasBlackBoxWarnings && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <strong>Black box warnings present.</strong> Review medication warnings before prescribing.
                </div>
              </div>
            )}

            {missingIndications.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <strong>{missingIndications.length} medication{missingIndications.length > 1 ? 's' : ''}</strong> need clinical indication before submitting.
                </div>
              </div>
            )}

            {/* Selected Medications */}
            {selectedMedications.map((selected) => {
              const isEditing = editingId === selected.medication.id;
              
              return (
                <div
                  key={selected.medication.id}
                  className={`border rounded-lg p-3 ${
                    selected.medication.isControlled ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {selected.medication.brandName}
                        </span>
                        <span className="text-sm text-gray-600">
                          {selected.strength} {selected.form}
                        </span>
                        {selected.aiRecommended && (
                          <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">AI</span>
                        )}
                        {selected.medication.isControlled && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            {selected.medication.schedule}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{selected.medication.genericName}</p>
                      
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            placeholder="Clinical indication (required)"
                            value={selected.indication}
                            onChange={(e) => onUpdateMed(selected.medication.id, { indication: e.target.value })}
                            className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500"
                          />
                          <textarea
                            placeholder="Directions"
                            value={selected.directions}
                            onChange={(e) => onUpdateMed(selected.medication.id, { directions: e.target.value })}
                            rows={2}
                            className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-gray-500">Qty</label>
                              <input
                                type="number"
                                value={selected.quantity}
                                onChange={(e) => onUpdateMed(selected.medication.id, { quantity: parseInt(e.target.value) || 0 })}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Days Supply</label>
                              <input
                                type="number"
                                value={selected.daysSupply}
                                onChange={(e) => onUpdateMed(selected.medication.id, { daysSupply: parseInt(e.target.value) || 0 })}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Refills</label>
                              <input
                                type="number"
                                value={selected.refills}
                                max={selected.medication.maxRefills}
                                onChange={(e) => onUpdateMed(selected.medication.id, { refills: parseInt(e.target.value) || 0 })}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`daw-${selected.medication.id}`}
                              checked={selected.dispenseAsWritten}
                              onChange={(e) => onUpdateMed(selected.medication.id, { dispenseAsWritten: e.target.checked })}
                              className="rounded"
                            />
                            <label htmlFor={`daw-${selected.medication.id}`} className="text-xs text-gray-600">
                              Dispense As Written (Brand only)
                            </label>
                          </div>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-teal-600 hover:text-teal-800"
                          >
                            Done editing
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          <p>
                            <strong>Qty:</strong> {selected.quantity} | 
                            <strong> Days:</strong> {selected.daysSupply} | 
                            <strong> Refills:</strong> {selected.refills}
                          </p>
                          <p className="truncate"><strong>Sig:</strong> {selected.directions}</p>
                          {selected.indication ? (
                            <p className="text-green-600"><strong>Indication:</strong> {selected.indication}</p>
                          ) : (
                            <p className="text-red-600"><strong>Indication:</strong> Required</p>
                          )}
                          {selected.dispenseAsWritten && (
                            <p className="text-amber-600">DAW - Brand only</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        selected.priority === 'STAT' ? 'bg-red-100 text-red-800' :
                        selected.priority === 'URGENT' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {selected.priority}
                      </span>
                      <span className="text-sm text-gray-600">
                        ${selected.dispenseAsWritten ? selected.medication.cost.brand : selected.medication.cost.generic}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingId(isEditing ? null : selected.medication.id)}
                          className="p-1 text-gray-400 hover:text-teal-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemove(selected.medication.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Cost Summary */}
            <div className="border-t pt-3 mt-3">
              <button
                onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                className="w-full flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">Estimated Cost</span>
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {totalCost.generic.toFixed(2)}
                </span>
              </button>
              
              {showCostBreakdown && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Generic total:</span>
                    <span>${totalCost.generic.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Brand total:</span>
                    <span>${totalCost.brand.toFixed(2)}</span>
                  </div>
                  <p className="text-gray-500 italic mt-1">
                    *Actual costs may vary by pharmacy and insurance coverage
                  </p>
                </div>
              )}
            </div>

            {/* Pharmacy */}
            {pharmacy && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-gray-500 mb-1">Send to:</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center text-green-600 text-xs font-bold">
                    Rx
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pharmacy.name}</p>
                    <p className="text-xs text-gray-500">{pharmacy.address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                canSubmit && !isSubmitting
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending prescriptions...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  E-Prescribe ({selectedMedications.length})
                </>
              )}
            </button>

            {!canSubmit && selectedMedications.length > 0 && (
              <p className="text-xs text-center text-gray-500">
                Add clinical indication to all medications to continue
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationOrderSummary;
