// ============================================================
// ATTENDING AI — Medication Cost Comparison Component
// apps/patient-portal/components/MedicationCosts.tsx
//
// Shows patients their medication costs and cheaper pharmacy options.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  DollarSign, ChevronDown, ChevronUp, MapPin, Phone,
  TrendingDown, Pill, AlertCircle, Loader2, RefreshCw,
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

interface MedicationCostItem {
  name: string;
  genericName: string;
  strength: string;
  form: string;
  quantity: number;
  averageRetailPrice: number;
  lowestPrice: number;
  savings: number;
  savingsPercent: number;
  cheapestPharmacy: string;
  pharmacyPrices: PharmacyPrice[];
}

interface CostSummary {
  totalMonthlyEstimate: number;
  totalLowestCost: number;
  totalSavings: number;
  medicationCount: number;
  medications: MedicationCostItem[];
}

export default function MedicationCosts() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMed, setExpandedMed] = useState<string | null>(null);

  useEffect(() => {
    fetchPrices();
  }, []);

  async function fetchPrices() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/patient/medication-prices');
      if (!res.ok) throw new Error('Failed to load prices');
      const data = await res.json();
      setSummary(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          <span className="text-gray-500">Loading medication prices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={fetchPrices} className="ml-auto text-teal-600 hover:text-teal-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!summary || summary.medicationCount === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <Pill className="w-5 h-5" />
          <span>No active medications to price.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-teal-600" />
              Medication Cost Estimate
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Monthly estimate for {summary.medicationCount} medication{summary.medicationCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={fetchPrices} className="text-gray-400 hover:text-gray-600" title="Refresh prices">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg. Retail</p>
            <p className="text-2xl font-bold text-gray-900">${summary.totalMonthlyEstimate.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Lowest Available</p>
            <p className="text-2xl font-bold text-teal-700">${summary.totalLowestCost.toFixed(2)}</p>
          </div>
          {summary.totalSavings > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">You Could Save</p>
              <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                <TrendingDown className="w-5 h-5" />
                ${summary.totalSavings.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Per-Medication Breakdown */}
      {summary.medications.map((med) => (
        <div key={med.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
            onClick={() => setExpandedMed(expandedMed === med.name ? null : med.name)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{med.name}</p>
                  <p className="text-sm text-gray-500">
                    {med.genericName} · {med.strength} · Qty {med.quantity}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-teal-700">${med.lowestPrice.toFixed(2)}</p>
                  {med.savings > 0 && (
                    <p className="text-xs text-green-600">
                      Save ${med.savings.toFixed(2)} ({med.savingsPercent}%)
                    </p>
                  )}
                </div>
                {expandedMed === med.name ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
            {med.savings > 0 && (
              <p className="text-xs text-gray-500 mt-2 ml-13">
                Cheapest at <span className="font-medium text-teal-700">{med.cheapestPharmacy}</span>
              </p>
            )}
          </button>

          {/* Expanded pharmacy list */}
          {expandedMed === med.name && (
            <div className="border-t border-gray-100 bg-gray-50">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Compare Pharmacy Prices
              </div>
              {med.pharmacyPrices.map((pharmacy, idx) => (
                <div
                  key={pharmacy.pharmacyId}
                  className={`px-4 py-3 flex items-center justify-between border-t border-gray-100 ${
                    idx === 0 ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {idx === 0 && (
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        LOWEST
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{pharmacy.pharmacyName}</p>
                      {pharmacy.pharmacyAddress && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {pharmacy.pharmacyAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${idx === 0 ? 'text-green-700' : 'text-gray-900'}`}>
                      ${pharmacy.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {pharmacy.source === 'goodrx_api' ? 'GoodRx' : 'Estimated'}
                    </p>
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 text-xs text-gray-400 text-center">
                Prices are estimates and may vary. Ask your pharmacist for exact pricing.
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
