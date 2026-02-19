// =============================================================================
// ATTENDING AI - Treatment Planning Page
// apps/provider-portal/pages/visit/[id]/treatment.tsx
//
// Provider selects treatments based on selected diagnoses
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Home,
  Pill,
  FlaskConical,
  ImageIcon,
  Calendar,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  FileText,
  Send,
  Clock,
  Shield,
  DollarSign,
  X,
  Plus,
} from 'lucide-react';
import { PharmacyAvailabilityPanel } from '@/components/pharmacy';
import type { PharmacyMedication } from '@/components/pharmacy';
import type { PharmacyInfo } from '@attending/shared/services/PharmacyInventoryService';

// =============================================================================
// Theme
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface Treatment {
  id: string;
  category: 'medication' | 'lab' | 'imaging' | 'referral' | 'followup';
  name: string;
  details: string;
  tier: 'first-line' | 'second-line' | 'adjunctive';
  selected: boolean;
  insuranceCovered: boolean;
  fdaApproved?: boolean;
  contraindications?: string[];
  interactions?: string[];
  warning?: string;
}

interface PatientContext {
  name: string;
  age: number;
  gender: string;
  mrn: string;
  allergies: string[];
  medications: string[];
}

interface SelectedDiagnosis {
  id: string;
  name: string;
  icdCode: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const getMockTreatments = (): Treatment[] => [
  // First-line Medications
  {
    id: 'tx-1',
    category: 'medication',
    name: 'Sumatriptan',
    details: '100mg Oral, As needed for migraine, max 200mg/day',
    tier: 'first-line',
    selected: true,
    insuranceCovered: true,
    fdaApproved: true,
    contraindications: [],
    interactions: [],
  },
  {
    id: 'tx-2',
    category: 'medication',
    name: 'Rizatriptan',
    details: '10mg Oral, As needed for migraine, max 30mg/day',
    tier: 'first-line',
    selected: false,
    insuranceCovered: true,
    fdaApproved: true,
  },
  {
    id: 'tx-3',
    category: 'medication',
    name: 'Metoclopramide',
    details: '10mg IV/IM, For nausea/vomiting',
    tier: 'adjunctive',
    selected: true,
    insuranceCovered: true,
    fdaApproved: true,
  },
  // Second-line
  {
    id: 'tx-4',
    category: 'medication',
    name: 'Dihydroergotamine',
    details: '1mg Nasal spray, As needed for migraine',
    tier: 'second-line',
    selected: false,
    insuranceCovered: false,
    fdaApproved: true,
    contraindications: ['Pregnancy', 'Coronary artery disease'],
    interactions: ['MAOIs', 'SSRIs'],
    warning: 'This medication may interact with oral contraceptives. Consider alternative therapy or additional contraception methods.',
  },
  {
    id: 'tx-5',
    category: 'medication',
    name: 'Ketorolac',
    details: '30mg IV/IM, For acute pain',
    tier: 'second-line',
    selected: false,
    insuranceCovered: true,
    fdaApproved: true,
    contraindications: ['Renal impairment', 'GI bleeding history'],
  },
  // Labs
  {
    id: 'tx-6',
    category: 'lab',
    name: 'CBC with Differential',
    details: 'Complete blood count',
    tier: 'first-line',
    selected: true,
    insuranceCovered: true,
  },
  {
    id: 'tx-7',
    category: 'lab',
    name: 'Basic Metabolic Panel',
    details: 'Electrolytes, BUN, Creatinine, Glucose',
    tier: 'first-line',
    selected: true,
    insuranceCovered: true,
  },
  {
    id: 'tx-8',
    category: 'lab',
    name: 'Pregnancy Test (hCG)',
    details: 'Serum or urine',
    tier: 'first-line',
    selected: true,
    insuranceCovered: true,
  },
  // Imaging
  {
    id: 'tx-9',
    category: 'imaging',
    name: 'CT Head without Contrast',
    details: 'STAT - Rule out SAH/ICH',
    tier: 'first-line',
    selected: true,
    insuranceCovered: true,
  },
  {
    id: 'tx-10',
    category: 'imaging',
    name: 'MRI Brain with/without Contrast',
    details: 'If CT negative but clinical suspicion high',
    tier: 'second-line',
    selected: false,
    insuranceCovered: true,
  },
  // Follow-up
  {
    id: 'tx-11',
    category: 'followup',
    name: 'Follow-up Appointment',
    details: 'Schedule in 2-4 weeks to assess treatment efficacy',
    tier: 'first-line',
    selected: true,
    insuranceCovered: true,
  },
  {
    id: 'tx-12',
    category: 'followup',
    name: 'Headache Journal',
    details: 'Recommend patient maintains a headache journal to identify triggers',
    tier: 'adjunctive',
    selected: true,
    insuranceCovered: true,
  },
  // Referrals
  {
    id: 'tx-13',
    category: 'referral',
    name: 'Neurology Consultation',
    details: 'If refractory headaches or abnormal findings',
    tier: 'second-line',
    selected: false,
    insuranceCovered: true,
  },
];

// =============================================================================
// Treatment Option Component
// =============================================================================

interface TreatmentOptionProps {
  treatment: Treatment;
  onToggle: () => void;
  expanded: boolean;
  onExpand: () => void;
}

const TreatmentOption: React.FC<TreatmentOptionProps> = ({
  treatment,
  onToggle,
  expanded,
  onExpand,
}) => {
  const hasWarnings = treatment.warning || (treatment.contraindications && treatment.contraindications.length > 0);

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      treatment.selected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            onClick={onToggle}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              treatment.selected
                ? 'bg-purple-600 border-purple-600 text-white'
                : 'border-gray-300 hover:border-purple-400'
            }`}
          >
            {treatment.selected && <CheckCircle className="w-4 h-4" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{treatment.name}</h4>
              {treatment.tier === 'first-line' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  First-line
                </span>
              )}
              {treatment.tier === 'second-line' && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  Second-line
                </span>
              )}
              {treatment.tier === 'adjunctive' && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Adjunctive
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">{treatment.details}</p>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-2">
              {treatment.insuranceCovered ? (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                  <CheckCircle className="w-3 h-3" />
                  Insurance Covered
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                  <AlertCircle className="w-3 h-3" />
                  Not Covered
                </span>
              )}
              {treatment.fdaApproved && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  <Shield className="w-3 h-3" />
                  FDA Approved
                </span>
              )}
            </div>

            {/* Expand for details if has warnings */}
            {hasWarnings && (
              <button
                onClick={onExpand}
                className="text-sm text-purple-600 hover:text-purple-800 mt-2 flex items-center gap-1"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {expanded ? 'Hide Details' : 'View Warnings'}
              </button>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && hasWarnings && (
          <div className="mt-4 ml-10 space-y-3">
            {treatment.contraindications && treatment.contraindications.length > 0 && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-gray-700 mb-1">Contraindications:</h5>
                  <ul className="space-y-1">
                    {treatment.contraindications.map((c, i) => (
                      <li key={i} className="text-gray-600">• {c}</li>
                    ))}
                  </ul>
                </div>
                {treatment.interactions && treatment.interactions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Interactions:</h5>
                    <ul className="space-y-1">
                      {treatment.interactions.map((c, i) => (
                        <li key={i} className="text-gray-600">• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {treatment.warning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-amber-800 text-sm">Warning: Potential interaction</h5>
                  <p className="text-amber-700 text-sm">{treatment.warning}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function TreatmentPage() {
  const router = useRouter();
  const { id } = router.query;
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTreatment, setExpandedTreatment] = useState<string | null>(null);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<SelectedDiagnosis[]>([]);
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyInfo | null>(null);

  useEffect(() => {
    if (id) {
      // Load from session storage
      const storedDiagnoses = sessionStorage.getItem('selectedDiagnoses');
      const storedPatient = sessionStorage.getItem('patientContext');

      if (storedDiagnoses) {
        setSelectedDiagnoses(JSON.parse(storedDiagnoses));
      }
      if (storedPatient) {
        setPatientContext(JSON.parse(storedPatient));
      }

      setTimeout(() => {
        setTreatments(getMockTreatments());
        setLoading(false);
      }, 300);
    }
  }, [id]);

  const toggleTreatment = (txId: string) => {
    setTreatments(prev =>
      prev.map(tx =>
        tx.id === txId ? { ...tx, selected: !tx.selected } : tx
      )
    );
  };

  const selectedTreatments = treatments.filter(tx => tx.selected);
  const canProceed = selectedTreatments.length > 0;

  // Derive medication list for pharmacy inventory check
  const pharmacyMedications: PharmacyMedication[] = useMemo(() =>
    treatments
      .filter(tx => tx.category === 'medication' && tx.selected)
      .map(tx => ({
        id: tx.name.toLowerCase().replace(/\s+/g, '-'),
        name: tx.name,
        genericName: tx.name, // In production, resolve from MEDICATION_CATALOG
        strength: tx.details.match(/\d+mg/)?.[0] || '',
        isControlled: false,  // Set from catalog in production
      })),
    [treatments],
  );

  const handlePharmacyChange = (pharmacy: PharmacyInfo) => {
    setSelectedPharmacy(pharmacy);
    // In production: update medication store's preferredPharmacy
    // useMedicationOrderingStore.getState().setPreferredPharmacy(pharmacy);
  };

  const handleExecuteTreatmentPlan = () => {
    // Store treatments for billing page
    sessionStorage.setItem('selectedTreatments', JSON.stringify(selectedTreatments));
    router.push(`/visit/${id}/complete`);
  };

  // Group treatments by category
  const medicationTreatments = treatments.filter(tx => tx.category === 'medication');
  const labTreatments = treatments.filter(tx => tx.category === 'lab');
  const imagingTreatments = treatments.filter(tx => tx.category === 'imaging');
  const referralTreatments = treatments.filter(tx => tx.category === 'referral');
  const followupTreatments = treatments.filter(tx => tx.category === 'followup');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading treatment options...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Treatment Planning | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen" style={{ background: theme.gradient }}>
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link
                  href="/"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Home className="w-5 h-5" />
                </Link>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white">Treatment Planning</h1>
                    <span className="px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                      STEP 2 OF 3
                    </span>
                  </div>
                  <p className="text-purple-200 text-sm">
                    {patientContext ? `${patientContext.name} • ${patientContext.age}yo ${patientContext.gender}` : 'Loading...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right text-purple-200 text-sm">
                  <p className="font-medium text-white">{selectedTreatments.length} items selected</p>
                  <p>Select treatment options</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Selected Diagnoses & Patient Info */}
            <div className="space-y-6">
              {/* Selected Diagnoses */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Working Diagnoses
                </h3>
                <div className="space-y-2">
                  {selectedDiagnoses.map((dx) => (
                    <div key={dx.id} className="p-3 bg-purple-50 rounded-xl">
                      <p className="font-medium text-gray-900 text-sm">{dx.name}</p>
                      <p className="text-purple-600 text-xs font-mono">{dx.icdCode}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Allergies */}
              {patientContext && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Allergies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {patientContext.allergies.map((allergy, i) => (
                      <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pharmacy Availability Panel */}
              {pharmacyMedications.length > 0 && (
                <PharmacyAvailabilityPanel
                  selectedMedications={pharmacyMedications}
                  preferredPharmacyId={selectedPharmacy?.id || 'PH-001'}
                  onPharmacyChange={handlePharmacyChange}
                />
              )}

              {/* Treatment Summary */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Medications</span>
                    <span className="font-medium">{medicationTreatments.filter(t => t.selected).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Labs</span>
                    <span className="font-medium">{labTreatments.filter(t => t.selected).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Imaging</span>
                    <span className="font-medium">{imagingTreatments.filter(t => t.selected).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Referrals</span>
                    <span className="font-medium">{referralTreatments.filter(t => t.selected).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Follow-up</span>
                    <span className="font-medium">{followupTreatments.filter(t => t.selected).length}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total Items</span>
                    <span className="text-purple-700">{selectedTreatments.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Treatment Options */}
            <div className="lg:col-span-3 space-y-6">
              {/* Medications */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <Pill className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Medications</h2>
                    <p className="text-gray-600 text-sm">Acute treatment & supportive care</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">First-line Therapies</p>
                  {medicationTreatments.filter(t => t.tier === 'first-line' || t.tier === 'adjunctive').map((tx) => (
                    <TreatmentOption
                      key={tx.id}
                      treatment={tx}
                      onToggle={() => toggleTreatment(tx.id)}
                      expanded={expandedTreatment === tx.id}
                      onExpand={() => setExpandedTreatment(expandedTreatment === tx.id ? null : tx.id)}
                    />
                  ))}
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">Second-line Therapies</p>
                  {medicationTreatments.filter(t => t.tier === 'second-line').map((tx) => (
                    <TreatmentOption
                      key={tx.id}
                      treatment={tx}
                      onToggle={() => toggleTreatment(tx.id)}
                      expanded={expandedTreatment === tx.id}
                      onExpand={() => setExpandedTreatment(expandedTreatment === tx.id ? null : tx.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Labs */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <FlaskConical className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Laboratory Studies</h2>
                    <p className="text-gray-600 text-sm">Diagnostic workup</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {labTreatments.map((tx) => (
                    <TreatmentOption
                      key={tx.id}
                      treatment={tx}
                      onToggle={() => toggleTreatment(tx.id)}
                      expanded={expandedTreatment === tx.id}
                      onExpand={() => setExpandedTreatment(expandedTreatment === tx.id ? null : tx.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Imaging */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Imaging Studies</h2>
                    <p className="text-gray-600 text-sm">Diagnostic imaging</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {imagingTreatments.map((tx) => (
                    <TreatmentOption
                      key={tx.id}
                      treatment={tx}
                      onToggle={() => toggleTreatment(tx.id)}
                      expanded={expandedTreatment === tx.id}
                      onExpand={() => setExpandedTreatment(expandedTreatment === tx.id ? null : tx.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Follow-up & Referrals */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Follow-up & Referrals</h2>
                    <p className="text-gray-600 text-sm">Care coordination</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {[...followupTreatments, ...referralTreatments].map((tx) => (
                    <TreatmentOption
                      key={tx.id}
                      treatment={tx}
                      onToggle={() => toggleTreatment(tx.id)}
                      expanded={expandedTreatment === tx.id}
                      onExpand={() => setExpandedTreatment(expandedTreatment === tx.id ? null : tx.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleExecuteTreatmentPlan}
                  disabled={!canProceed}
                  className={`px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-3 transition-all ${
                    canProceed
                      ? 'bg-white text-purple-700 hover:bg-purple-50 shadow-lg hover:shadow-xl'
                      : 'bg-white/30 text-white/60 cursor-not-allowed'
                  }`}
                >
                  Execute Treatment Plan
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
