// ============================================================
// Medication Orders Page - Streamlined with consistent layout
// pages/medications.tsx
// ============================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { 
  ArrowLeft,
  Home,
  Brain,
  User,
  Building2,
  Phone,
  Clock,
  MapPin,
  Printer,
  FileText,
  Pill,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Search,
  ChevronRight,
  Package,
  Truck,
  Star,
  Bell,
  Settings,
} from 'lucide-react';

// =============================================================================
// Theme
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  allergies: Array<{ allergen: string; reaction: string; severity: 'mild' | 'moderate' | 'severe' }>;
  currentMedications: string[];
}

interface Medication {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  form: string;
  quantity: number;
  refills: number;
  instructions: string;
  daysSupply: number;
}

interface PharmacyInventory {
  medicationId: string;
  inStock: boolean;
  quantity: number;
  estimatedRestock?: string;
  price?: number;
}

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  hours: string;
  distance: string;
  isPreferred: boolean;
  acceptsEprescribe: boolean;
  rating: number;
  inventory: PharmacyInventory[];
}

// =============================================================================
// Mock Data
// =============================================================================

const mockPatient: PatientContext = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 32,
  gender: 'Female',
  mrn: '78932145',
  allergies: [
    { allergen: 'Penicillin', reaction: 'Anaphylaxis', severity: 'severe' },
    { allergen: 'Sulfa drugs', reaction: 'Rash', severity: 'moderate' },
  ],
  currentMedications: ['Ethinyl Estradiol/Norgestimate (oral contraceptive)'],
};

const mockSelectedMedications: Medication[] = [
  {
    id: 'med-001',
    name: 'Sumatriptan',
    genericName: 'Sumatriptan Succinate',
    strength: '50mg',
    form: 'Tablet',
    quantity: 9,
    refills: 2,
    instructions: 'Take 1 tablet at onset of migraine. May repeat in 2 hours if needed. Max 2 tablets/day.',
    daysSupply: 30,
  },
  {
    id: 'med-002',
    name: 'Topiramate',
    genericName: 'Topiramate',
    strength: '25mg',
    form: 'Tablet',
    quantity: 60,
    refills: 5,
    instructions: 'Take 1 tablet twice daily for migraine prevention.',
    daysSupply: 30,
  },
  {
    id: 'med-003',
    name: 'Ondansetron',
    genericName: 'Ondansetron ODT',
    strength: '4mg',
    form: 'Orally Disintegrating Tablet',
    quantity: 12,
    refills: 1,
    instructions: 'Dissolve 1 tablet on tongue as needed for nausea. Max 3 tablets/day.',
    daysSupply: 30,
  },
];

const mockPharmacies: Pharmacy[] = [
  {
    id: 'pharm-001',
    name: 'CVS Pharmacy #2847',
    address: '1234 Main Street, Denver, CO 80202',
    phone: '(303) 555-0123',
    fax: '(303) 555-0124',
    hours: 'Mon-Fri 8AM-10PM, Sat-Sun 9AM-8PM',
    distance: '0.8 mi',
    isPreferred: true,
    acceptsEprescribe: true,
    rating: 4.5,
    inventory: [
      { medicationId: 'med-001', inStock: true, quantity: 45, price: 15.99 },
      { medicationId: 'med-002', inStock: true, quantity: 120, price: 12.50 },
      { medicationId: 'med-003', inStock: false, quantity: 0, estimatedRestock: 'Tomorrow', price: 8.99 },
    ],
  },
  {
    id: 'pharm-002',
    name: 'Walgreens #5621',
    address: '567 Oak Avenue, Denver, CO 80203',
    phone: '(303) 555-0456',
    fax: '(303) 555-0457',
    hours: '24 Hours',
    distance: '1.2 mi',
    isPreferred: false,
    acceptsEprescribe: true,
    rating: 4.2,
    inventory: [
      { medicationId: 'med-001', inStock: true, quantity: 30, price: 16.99 },
      { medicationId: 'med-002', inStock: true, quantity: 90, price: 13.25 },
      { medicationId: 'med-003', inStock: true, quantity: 24, price: 9.50 },
    ],
  },
  {
    id: 'pharm-003',
    name: 'King Soopers Pharmacy',
    address: '890 Broadway, Denver, CO 80204',
    phone: '(303) 555-0789',
    fax: '(303) 555-0790',
    hours: 'Mon-Sat 9AM-9PM, Sun 10AM-6PM',
    distance: '1.5 mi',
    isPreferred: false,
    acceptsEprescribe: true,
    rating: 4.0,
    inventory: [
      { medicationId: 'med-001', inStock: true, quantity: 60, price: 14.50 },
      { medicationId: 'med-002', inStock: false, quantity: 0, estimatedRestock: '2-3 days', price: 11.99 },
      { medicationId: 'med-003', inStock: true, quantity: 36, price: 7.99 },
    ],
  },
  {
    id: 'pharm-004',
    name: 'Costco Pharmacy',
    address: '1500 Market St, Denver, CO 80205',
    phone: '(303) 555-1234',
    fax: '(303) 555-1235',
    hours: 'Mon-Fri 10AM-8:30PM, Sat 9:30AM-6PM, Sun Closed',
    distance: '2.3 mi',
    isPreferred: false,
    acceptsEprescribe: true,
    rating: 4.7,
    inventory: [
      { medicationId: 'med-001', inStock: true, quantity: 100, price: 11.99 },
      { medicationId: 'med-002', inStock: true, quantity: 200, price: 9.50 },
      { medicationId: 'med-003', inStock: true, quantity: 48, price: 6.50 },
    ],
  },
];

// =============================================================================
// Components
// =============================================================================

const PharmacyCard: React.FC<{
  pharmacy: Pharmacy;
  medications: Medication[];
  isSelected: boolean;
  onSelect: () => void;
}> = ({ pharmacy, medications, isSelected, onSelect }) => {
  const allInStock = medications.every(med => {
    const inv = pharmacy.inventory.find(i => i.medicationId === med.id);
    return inv?.inStock;
  });
  
  const someInStock = medications.some(med => {
    const inv = pharmacy.inventory.find(i => i.medicationId === med.id);
    return inv?.inStock;
  });

  const totalPrice = medications.reduce((sum, med) => {
    const inv = pharmacy.inventory.find(i => i.medicationId === med.id);
    return sum + (inv?.price || 0);
  }, 0);

  return (
    <div 
      onClick={onSelect}
      className={`bg-white rounded-2xl p-5 shadow-lg border-2 transition-all cursor-pointer hover:shadow-xl ${
        isSelected 
          ? 'border-purple-500 ring-2 ring-purple-200' 
          : 'border-transparent hover:border-purple-200'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
            allInStock ? 'bg-green-500' : someInStock ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              {pharmacy.name}
              {pharmacy.isPreferred && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> Preferred
                </span>
              )}
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <MapPin className="w-3 h-3" />
              {pharmacy.distance}
              <span className="text-gray-300">•</span>
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {pharmacy.rating}
              </span>
            </div>
          </div>
        </div>
        
        {isSelected && (
          <div className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">
            Selected
          </div>
        )}
      </div>

      {/* Inventory Status */}
      <div className="space-y-2 mb-4">
        {medications.map(med => {
          const inv = pharmacy.inventory.find(i => i.medicationId === med.id);
          return (
            <div key={med.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">{med.name} {med.strength}</span>
              <div className="flex items-center gap-2">
                {inv?.inStock ? (
                  <>
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      In Stock ({inv.quantity})
                    </span>
                    <span className="text-sm font-medium text-gray-900">${inv.price?.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-600">
                    <XCircle className="w-3.5 h-3.5" />
                    Out of Stock
                    {inv?.estimatedRestock && (
                      <span className="text-gray-500">• Restock: {inv.estimatedRestock}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-sm">
          {allInStock ? (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <Package className="w-4 h-4" />
              All medications in stock
            </span>
          ) : someInStock ? (
            <span className="text-amber-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Some medications unavailable
            </span>
          ) : (
            <span className="text-red-600 font-medium flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              No medications in stock
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Est. Total</p>
          <p className="text-lg font-bold text-gray-900">${totalPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Phone className="w-3 h-3" />
          {pharmacy.phone}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {pharmacy.hours.split(',')[0]}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function MedicationsPage() {
  const router = useRouter();
  const { patientId } = router.query;
  
  const [patient] = useState<PatientContext>(mockPatient);
  const [medications] = useState<Medication[]>(mockSelectedMedications);
  const [pharmacies] = useState<Pharmacy[]>(mockPharmacies);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('pharm-001');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInStock, setFilterInStock] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Filter pharmacies
  const filteredPharmacies = pharmacies.filter(pharmacy => {
    const matchesSearch = pharmacy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pharmacy.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterInStock) {
      const allInStock = medications.every(med => {
        const inv = pharmacy.inventory.find(i => i.medicationId === med.id);
        return inv?.inStock;
      });
      return matchesSearch && allInStock;
    }
    
    return matchesSearch;
  });

  const handleSendPrescriptions = async () => {
    setIsSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSending(false);
    setSentSuccess(true);
  };

  const selectedPharmacyData = pharmacies.find(p => p.id === selectedPharmacy);

  return (
    <>
      <Head>
        <title>Medication Orders | ATTENDING AI</title>
      </Head>

      <ProviderShell contextBadge="Medication Orders" currentPage="medications">
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Success Message */}
          {sentSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Prescriptions Sent Successfully!</h3>
                <p className="text-sm text-green-700">
                  {medications.length} prescriptions have been sent to {selectedPharmacyData?.name}
                </p>
              </div>
              <button 
                onClick={() => router.push('/')}
                className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Patient & Medications */}
            <div className="space-y-6">
              {/* Patient Card */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Patient
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{patient.name}</h4>
                    <p className="text-sm text-gray-500">
                      {patient.age}yo {patient.gender} • MRN: {patient.mrn}
                    </p>
                  </div>
                </div>
                
                {/* Allergies */}
                {patient.allergies.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      ALLERGIES
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {patient.allergies.map((allergy, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${
                          allergy.severity === 'severe' ? 'bg-red-200 text-red-800' :
                          allergy.severity === 'moderate' ? 'bg-orange-200 text-orange-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {allergy.allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Medications to Send */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-purple-600" />
                  Prescriptions ({medications.length})
                </h3>
                <div className="space-y-3">
                  {medications.map((med) => (
                    <div key={med.id} className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{med.name}</h4>
                          <p className="text-xs text-gray-500">{med.genericName}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {med.strength}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="text-gray-400">Qty:</span> {med.quantity} {med.form}s</p>
                        <p><span className="text-gray-400">Refills:</span> {med.refills}</p>
                        <p className="text-xs mt-2 p-2 bg-white rounded">{med.instructions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Pharmacy Selection */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pharmacy Search & Filter */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    Select Pharmacy
                  </h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filterInStock}
                      onChange={(e) => setFilterInStock(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-600">Show only with all meds in stock</span>
                  </label>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pharmacies by name or address..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Pharmacy List */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredPharmacies.map((pharmacy) => (
                  <PharmacyCard
                    key={pharmacy.id}
                    pharmacy={pharmacy}
                    medications={medications}
                    isSelected={selectedPharmacy === pharmacy.id}
                    onSelect={() => setSelectedPharmacy(pharmacy.id)}
                  />
                ))}
              </div>

              {filteredPharmacies.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No pharmacies match your criteria</p>
                  <button 
                    onClick={() => { setSearchQuery(''); setFilterInStock(false); }}
                    className="mt-2 text-purple-600 text-sm hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* Send Button */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Ready to Send</h4>
                    <p className="text-sm text-gray-500">
                      {medications.length} prescriptions → {selectedPharmacyData?.name}
                    </p>
                  </div>
                  <button
                    onClick={handleSendPrescriptions}
                    disabled={isSending || sentSuccess}
                    className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
                      sentSuccess
                        ? 'bg-green-500 text-white cursor-default'
                        : isSending
                          ? 'bg-purple-400 text-white cursor-wait'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {sentSuccess ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Sent!
                      </>
                    ) : isSending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Prescriptions
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </ProviderShell>
    </>
  );
}
