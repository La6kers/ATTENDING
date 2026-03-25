// ============================================================
// Pharmacy Components
// apps/provider-portal/components/pharmacy/index.ts
// ============================================================

import React from 'react';

export interface PharmacyMedication {
  id: string;
  name: string;
  genericName?: string;
  dose: string;
  route: string;
  frequency: string;
  pharmacyAvailability?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'special_order';
  estimatedCost?: number;
  alternatives?: { name: string; dose: string; cost?: number }[];
}

export interface PharmacyAvailabilityPanelProps {
  medications: PharmacyMedication[];
  patientId?: string;
  className?: string;
}

export const PharmacyAvailabilityPanel: React.FC<PharmacyAvailabilityPanelProps> = ({
  medications,
  className,
}) => {
  if (!medications || medications.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className || ''}`}>
        <p className="text-sm text-gray-500 text-center">No medications to check</p>
      </div>
    );
  }

  const stockColors: Record<string, { bg: string; text: string; label: string }> = {
    in_stock: { bg: 'bg-green-50', text: 'text-green-700', label: 'In Stock' },
    low_stock: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Low Stock' },
    out_of_stock: { bg: 'bg-red-50', text: 'text-red-700', label: 'Out of Stock' },
    special_order: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Special Order' },
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className || ''}`}>
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <span>💊</span>
        <h3 className="font-semibold text-gray-900 text-sm">Pharmacy Availability</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {medications.map((med) => {
          const stock = stockColors[med.pharmacyAvailability || 'in_stock'];
          return (
            <div key={med.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{med.name}</p>
                <p className="text-xs text-gray-500">{med.dose} {med.route} {med.frequency}</p>
              </div>
              <div className="flex items-center gap-2">
                {med.estimatedCost !== undefined && (
                  <span className="text-xs text-gray-400">${med.estimatedCost.toFixed(2)}</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stock.bg} ${stock.text}`}>
                  {stock.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
