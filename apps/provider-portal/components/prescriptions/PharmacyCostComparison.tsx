// ============================================================
// ATTENDING AI — Provider Pharmacy Cost Comparison Widget
// apps/provider-portal/components/prescriptions/PharmacyCostComparison.tsx
//
// Embedded in prescribing workflow. Shows pharmacy prices
// ranked by cost so providers can select cheapest option.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, MapPin, Check, Loader2, AlertCircle,
  TrendingDown, Building2, RefreshCw,
} from 'lucide-react';

interface PharmacyPrice {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyChain: string | null;
  pharmacyAddress: string;
  pharmacyPhone: string;
  price: number;
  source: string;
  lastVerified: string;
}

interface PricingResponse {
  medication: string;
  strength: string;
  form: string;
  quantity: number;
  averagePrice: number;
  lowestPrice: number | null;
  pharmacyCount: number;
  prices: PharmacyPrice[];
}

interface Props {
  medication: string;
  strength: string;
  form: string;
  quantity: number;
  patientZipCode?: string;
  selectedPharmacy?: string;
  onSelectPharmacy: (pharmacyName: string, pharmacyNpi?: string) => void;
}

export default function PharmacyCostComparison({
  medication,
  strength,
  form,
  quantity,
  patientZipCode,
  selectedPharmacy,
  onSelectPharmacy,
}: Props) {
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    if (!medication || !strength || !form || !quantity) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        medication,
        strength,
        form,
        quantity: String(quantity),
      });
      if (patientZipCode) params.set('zipCode', patientZipCode);

      const res = await fetch(`/api/prescriptions/pharmacy-pricing?${params}`);
      if (!res.ok) throw new Error('Failed to load pricing');

      const data = await res.json();
      setPricing(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [medication, strength, form, quantity, patientZipCode]);

  // Auto-fetch when prescription details change
  useEffect(() => {
    const debounce = setTimeout(fetchPricing, 500);
    return () => clearTimeout(debounce);
  }, [fetchPricing]);

  if (!medication || !strength) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400 text-sm">
        <DollarSign className="w-5 h-5 mx-auto mb-2 opacity-50" />
        Select a medication to see pharmacy pricing
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading pharmacy prices...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
          <button onClick={fetchPricing} className="text-red-400 hover:text-red-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!pricing || pricing.prices.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
        No pricing data available for this medication.
      </div>
    );
  }

  const savings = pricing.averagePrice && pricing.lowestPrice
    ? pricing.averagePrice - pricing.lowestPrice
    : 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-teal-600" />
            Pharmacy Pricing — {medication} {strength}
          </h4>
          <span className="text-xs text-gray-500">
            Qty {quantity} · {form}
          </span>
        </div>
        {savings > 1 && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Patient saves up to ${savings.toFixed(2)} vs. average
          </p>
        )}
      </div>

      {/* Pharmacy list */}
      <div className="divide-y divide-gray-100">
        {pricing.prices.map((pharmacy, idx) => {
          const isSelected = selectedPharmacy === pharmacy.pharmacyName;
          const isCheapest = idx === 0;

          return (
            <button
              key={pharmacy.pharmacyId}
              className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-teal-50 border-l-4 border-teal-500' : ''
              } ${isCheapest && !isSelected ? 'bg-green-50/50' : ''}`}
              onClick={() => onSelectPharmacy(pharmacy.pharmacyName)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-teal-100' : isCheapest ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-teal-600" />
                  ) : (
                    <Building2 className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {pharmacy.pharmacyName}
                    {isCheapest && (
                      <span className="ml-2 text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                        LOWEST
                      </span>
                    )}
                  </p>
                  {pharmacy.pharmacyAddress && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {pharmacy.pharmacyAddress}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-base font-bold ${
                  isCheapest ? 'text-green-700' : 'text-gray-900'
                }`}>
                  ${pharmacy.price.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">
                  {pharmacy.source === 'goodrx_api' ? 'GoodRx' : 'Est.'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Cash prices · Updated {new Date(pricing.prices[0]?.lastVerified).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
