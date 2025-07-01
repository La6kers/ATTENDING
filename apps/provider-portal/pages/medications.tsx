import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Pill, AlertTriangle, RefreshCw, ShieldAlert, Search, Filter, Plus, ChevronDown, ChevronUp, X, Phone, Edit2, Trash2, CheckCircle, Clock, DollarSign, User } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  generic: string;
  strength: string;
  form: string;
  quantity: number;
  refills: { current: number; total: number };
  prescriber: string;
  lastFilled: string;
  ndc: string;
  directions: string;
  status: 'active' | 'expiring' | 'refill-needed' | 'out-of-stock';
  hasInteraction?: boolean;
  interactionWarning?: string;
}

interface PatientInfo {
  name: string;
  age: number;
  mrn: string;
  dob: string;
}

export default function Medications() {
  const [expandedMeds, setExpandedMeds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [showAlternatePharmacies, setShowAlternatePharmacies] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const patient: PatientInfo = {
    name: 'Sarah Johnson',
    age: 32,
    mrn: '78932145',
    dob: '03/15/1992'
  };

  const medications: Medication[] = [
    {
      id: 'sumatriptan',
      name: 'Sumatriptan',
      generic: 'Sumatriptan Succinate',
      strength: '100mg',
      form: 'Tablet',
      quantity: 9,
      refills: { current: 3, total: 5 },
      prescriber: 'Dr. Reed',
      lastFilled: '04/15/2025',
      ndc: '0173-0453-00',
      directions: 'Take 1 tablet by mouth at onset of migraine. Max 2/day',
      status: 'active'
    },
    {
      id: 'topiramate',
      name: 'Topiramate',
      generic: 'Topiramate',
      strength: '50mg',
      form: 'Tablet',
      quantity: 60,
      refills: { current: 2, total: 5 },
      prescriber: 'Dr. Reed',
      lastFilled: '04/01/2025',
      ndc: '0555-0912-02',
      directions: 'Take 1 tablet by mouth twice daily for migraine prevention',
      status: 'active',
      hasInteraction: true,
      interactionWarning: 'Topiramate may reduce effectiveness of oral contraceptives. Consider backup contraception.'
    },
    {
      id: 'birth-control',
      name: 'Ethinyl Estradiol/Norgestimate',
      generic: 'Ortho Tri-Cyclen',
      strength: '0.035mg/0.25mg',
      form: 'Tablet',
      quantity: 28,
      refills: { current: 4, total: 11 },
      prescriber: 'Dr. Martinez (OB/GYN)',
      lastFilled: '04/18/2025',
      ndc: '0062-1915-15',
      directions: 'Take 1 tablet by mouth daily at same time each day',
      status: 'expiring'
    },
    {
      id: 'magnesium',
      name: 'Magnesium Oxide',
      generic: 'Over-the-Counter Supplement',
      strength: '400mg',
      form: 'Capsule',
      quantity: 0,
      refills: { current: 0, total: 0 },
      prescriber: 'Dr. Reed',
      lastFilled: '03/01/2025',
      ndc: '',
      directions: 'Take 1 capsule by mouth twice daily with food',
      status: 'active'
    },
    {
      id: 'ibuprofen',
      name: 'Ibuprofen',
      generic: 'Ibuprofen',
      strength: '800mg',
      form: 'Tablet',
      quantity: 0,
      refills: { current: 1, total: 3 },
      prescriber: 'Dr. Reed',
      lastFilled: '03/20/2025',
      ndc: '0904-5847-60',
      directions: 'Take 1 tablet by mouth every 8 hours as needed for headache',
      status: 'out-of-stock'
    }
  ];

  const toggleMedication = (medId: string) => {
    setExpandedMeds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(medId)) {
        newSet.delete(medId);
      } else {
        newSet.add(medId);
      }
      return newSet;
    });
  };

  const toggleAllMedications = () => {
    if (allExpanded) {
      setExpandedMeds(new Set());
      setAllExpanded(false);
    } else {
      setExpandedMeds(new Set(medications.map(m => m.id)));
      setAllExpanded(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expiring':
        return 'bg-yellow-100 text-yellow-800';
      case 'refill-needed':
        return 'bg-orange-100 text-orange-800';
      case 'out-of-stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string, quantity: number) => {
    switch (status) {
      case 'active':
        return { badge: 'Active', detail: '✓ In Stock' };
      case 'expiring':
        return { badge: 'Refill Soon', detail: '⚠️ 7 days left' };
      case 'refill-needed':
        return { badge: 'Refill Needed', detail: '⚠️ Low Stock' };
      case 'out-of-stock':
        return { badge: 'Out of Stock', detail: '⚠️ Out of Stock' };
      default:
        return { badge: 'Unknown', detail: '' };
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Patient Banner */}
        <div className="bg-white shadow-sm mx-6 mt-6 rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{patient.name}</h2>
                <p className="text-gray-600">{patient.age} y/o Female • MRN: {patient.mrn} • DOB: {patient.dob}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-2">
                <ChevronDown className="w-4 h-4" />
                Back to Chart
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:shadow-lg transition-all flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Med List
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Medications */}
            <div className="lg:col-span-2">
              {/* Medications Header */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Pill className="w-6 h-6 text-white" />
                    </div>
                    Current Medications (5 Active)
                  </h1>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleAllMedications}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
                    >
                      {allExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {allExpanded ? 'Collapse All' : 'Expand All'}
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Medication
                    </button>
                  </div>
                </div>
              </div>

              {/* Medications List */}
              <div className="space-y-3">
                {medications.map((med) => {
                  const isExpanded = expandedMeds.has(med.id);
                  const statusInfo = getStatusText(med.status, med.quantity);

                  return (
                    <div
                      key={med.id}
                      className={`bg-white rounded-xl shadow-sm transition-all cursor-pointer hover:shadow-md ${
                        isExpanded ? 'p-4' : 'p-3'
                      } ${med.hasInteraction ? 'border-2 border-yellow-200' : ''}`}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button')) {
                          toggleMedication(med.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{med.name}</h3>
                          <p className="text-gray-600 text-sm">Generic: {med.generic}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(med.status)}`}>
                              {statusInfo.badge}
                            </span>
                            <span className={`text-xs ${med.status === 'active' ? 'text-green-600' : med.status === 'out-of-stock' ? 'text-red-600' : 'text-yellow-600'}`}>
                              {statusInfo.detail}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {med.status === 'out-of-stock' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAlternatePharmacies(true);
                              }}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Find Alternatives
                            </button>
                          ) : (
                            <button className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              {med.status === 'expiring' ? 'Urgent Refill' : 'Refill'}
                            </button>
                          )}
                          <button className="px-3 py-1.5 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors text-xs font-medium flex items-center gap-1">
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button className="px-3 py-1.5 border-2 border-gray-400 text-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-colors text-xs font-medium flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Discontinue
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600 font-medium">Strength:</span> {med.strength}
                              </div>
                              <div>
                                <span className="text-gray-600 font-medium">Prescriber:</span> {med.prescriber}
                              </div>
                              <div>
                                <span className="text-gray-600 font-medium">Form:</span> {med.form}
                              </div>
                              <div>
                                <span className="text-gray-600 font-medium">Last Filled:</span> {med.lastFilled}
                              </div>
                              <div>
                                <span className="text-gray-600 font-medium">Quantity:</span> {med.quantity} tablets
                              </div>
                              <div>
                                <span className="text-gray-600 font-medium">NDC:</span> {med.ndc || 'N/A'}
                              </div>
                              <div>
                                <span className="text-gray-600 font-medium">Refills:</span> {med.refills.current} of {med.refills.total}
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 uppercase font-medium mb-1">Directions</p>
                              <p className="text-sm text-gray-900">{med.directions}</p>
                            </div>
                          </div>

                          {med.hasInteraction && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <strong className="text-yellow-800">Drug Interaction Warning:</strong>
                                <p className="text-yellow-700 mt-1">{med.interactionWarning}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Pharmacy & Info */}
            <div className="space-y-4">
              {/* Pharmacy Information */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-green-600" />
                  </div>
                  Preferred Pharmacy
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      CVS
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">CVS Pharmacy #2847</h3>
                      <p className="text-sm text-gray-600">Primary Pharmacy • Auto-Refill Enabled</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p><strong>Address:</strong> 1234 Main Street, Denver, CO 80202</p>
                    <p><strong>Phone:</strong> (303) 555-0123</p>
                    <p><strong>Hours:</strong> Mon-Fri 8AM-10PM, Sat-Sun 9AM-8PM</p>
                    <p><strong>Pharmacist:</strong> Dr. Jennifer Adams, PharmD</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
                      Change Pharmacy
                    </button>
                    <button className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-1">
                      <Phone className="w-4 h-4" />
                      Call
                    </button>
                  </div>

                  {/* Stock Alert */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800">Stock Alert</p>
                        <p className="text-xs text-red-700 mt-1">Ibuprofen 800mg out of stock at current pharmacy</p>
                        <button
                          onClick={() => setShowAlternatePharmacies(true)}
                          className="mt-2 w-full px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                        >
                          Find Alternate Pharmacies
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternate Pharmacies (shown when needed) */}
              {showAlternatePharmacies && (
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Alternate Pharmacies</h2>
                    <button
                      onClick={() => setShowAlternatePharmacies(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Walgreens #4821</h4>
                          <p className="text-sm text-gray-600">1.2 miles • In Stock</p>
                          <p className="text-sm text-gray-600 mt-1">Price: $8.50 (with insurance)</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Available</span>
                      </div>
                      <button className="mt-2 w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium">
                        Transfer & Fill
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Drug Allergies */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  Drug Allergies (3)
                </h2>
                <div className="space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="font-medium text-red-900">Penicillin</h4>
                    <p className="text-sm text-red-700">Rash, hives, difficulty breathing</p>
                    <span className="text-xs text-red-600 font-medium">SEVERE</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h4 className="font-medium text-orange-900">Sulfa Drugs</h4>
                    <p className="text-sm text-orange-700">Skin rash, nausea</p>
                    <span className="text-xs text-orange-600 font-medium">MODERATE</span>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="font-medium text-yellow-900">Codeine</h4>
                    <p className="text-sm text-yellow-700">Nausea, vomiting, drowsiness</p>
                    <span className="text-xs text-yellow-600 font-medium">MILD</span>
                  </div>
                </div>
              </div>

              {/* Drug Interactions */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-yellow-600" />
                  </div>
                  Drug Interactions (2)
                </h2>
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="font-medium text-yellow-900 text-sm">Topiramate ↔ Ethinyl Estradiol/Norgestimate</h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      Topiramate may decrease the effectiveness of oral contraceptives by increasing hepatic metabolism. Consider using additional or alternative contraceptive methods.
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded">Moderate</span>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="font-medium text-yellow-900 text-sm">Ibuprofen ↔ Topiramate</h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      NSAIDs may increase the risk of kidney stones when used with topiramate. Monitor renal function and ensure adequate hydration.
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded">Minor</span>
                  </div>
                </div>
                <button className="mt-3 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                  Run Full Interaction Check
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Medication Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  Add New Medication
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search medications by name or condition..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Common Medications */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Prescribed</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Lisinopril', 'Metformin', 'Atorvastatin', 'Amoxicillin', 'Omeprazole', 'Albuterol'].map((med) => (
                    <button
                      key={med}
                      className="p-3 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
                    >
                      <p className="font-medium text-gray-900">{med}</p>
                      <p className="text-sm text-gray-600">Common medication</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                  Browse Full Database
                </button>
                <button className="flex-1 px-4 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                  Custom Prescription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
