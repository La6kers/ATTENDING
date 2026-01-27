// =============================================================================
// ATTENDING AI - Completed Visit Detail Page
// apps/provider-portal/pages/visits/[id].tsx
//
// Shows full documentation for a completed visit
// UPDATED: Added edit documentation functionality
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  User,
  FileText,
  Download,
  Printer,
  Copy,
  DollarSign,
  Pill,
  FlaskConical,
  ImageIcon,
  Calendar,
  Stethoscope,
  Heart,
  Activity,
  AlertTriangle,
  Sparkles,
  Edit,
  Save,
  X,
  Home,
} from 'lucide-react';

// =============================================================================
// Theme - UPDATED to match login page
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface VisitDetail {
  id: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    mrn: string;
    dob: string;
    phone: string;
  };
  visit: {
    date: string;
    time: string;
    type: string;
    provider: string;
    location: string;
  };
  clinicalNote: string;
  diagnoses: Array<{
    code: string;
    description: string;
    isPrimary: boolean;
  }>;
  vitals: {
    bp: string;
    hr: number;
    temp: number;
    rr: number;
    spo2: number;
    weight: string;
  };
  orders: {
    medications: Array<{ name: string; dose: string; instructions: string }>;
    labs: Array<{ name: string; status: string }>;
    imaging: Array<{ name: string; status: string }>;
    referrals: Array<{ specialty: string; reason: string }>;
  };
  billing: {
    emLevel: string;
    cptCodes: Array<{ code: string; description: string; amount: number }>;
    total: number;
    status: string;
  };
  aiAssisted: boolean;
}

// =============================================================================
// Mock Data
// =============================================================================

const getMockVisitDetail = (id: string): VisitDetail => ({
  id,
  patient: {
    name: 'James Anderson',
    age: 58,
    gender: 'Male',
    mrn: 'MRN-101',
    dob: '03/15/1966',
    phone: '(555) 123-4567',
  },
  visit: {
    date: new Date().toISOString().split('T')[0],
    time: '08:00 AM',
    type: 'Follow-up Visit',
    provider: 'Dr. Thomas Reed, MD',
    location: 'Exam Room 1',
  },
  clinicalNote: `MEDICAL ENCOUNTER DOCUMENTATION
=====================================

PATIENT INFORMATION
-------------------
Name: James Anderson
DOB: 03/15/1966
Age: 58 years old
Gender: Male
MRN: MRN-101
Date of Service: ${new Date().toLocaleDateString()}
Provider: Dr. Thomas Reed, MD
Encounter Type: Follow-up Visit

CHIEF COMPLAINT
---------------
"Diabetes management - routine follow-up"

HISTORY OF PRESENT ILLNESS
--------------------------
58-year-old male with Type 2 Diabetes Mellitus presents for routine diabetes management follow-up. Patient reports good compliance with medications and diet. Home blood glucose readings have been within target range (90-140 mg/dL fasting). No hypoglycemic episodes reported. Denies polyuria, polydipsia, or blurred vision.

VITAL SIGNS
-----------
Blood Pressure: 128/82 mmHg
Heart Rate: 72 bpm
Temperature: 98.4°F
Respiratory Rate: 16/min
Oxygen Saturation: 98% on room air
Weight: 198 lbs (stable from last visit)

CURRENT MEDICATIONS
-------------------
• Metformin 1000mg twice daily
• Lisinopril 10mg daily
• Atorvastatin 20mg daily

ASSESSMENT/DIAGNOSIS
--------------------
1. Type 2 Diabetes Mellitus, well-controlled (E11.9)
2. Essential Hypertension, controlled (I10)
3. Hyperlipidemia (E78.5)

PLAN
----
1. Continue current diabetes management
2. Order HbA1c and lipid panel
3. Continue current medications
4. Reinforce diet and exercise recommendations
5. Follow-up in 3 months

PATIENT EDUCATION
-----------------
• Discussed importance of medication compliance
• Reviewed blood glucose monitoring technique
• Encouraged continued healthy lifestyle modifications

ATTESTATION
-----------
This encounter documentation represents my professional assessment and treatment of the patient.

Provider Signature: Dr. Thomas Reed, MD
Date: ${new Date().toLocaleDateString()}

---
Documentation generated with AI assistance - ATTENDING AI Medical Portal`,
  diagnoses: [
    { code: 'E11.9', description: 'Type 2 Diabetes Mellitus', isPrimary: true },
    { code: 'I10', description: 'Essential Hypertension', isPrimary: false },
    { code: 'E78.5', description: 'Hyperlipidemia', isPrimary: false },
  ],
  vitals: {
    bp: '128/82',
    hr: 72,
    temp: 98.4,
    rr: 16,
    spo2: 98,
    weight: '198 lbs',
  },
  orders: {
    medications: [
      { name: 'Metformin', dose: '1000mg', instructions: 'Twice daily with meals - continue' },
      { name: 'Lisinopril', dose: '10mg', instructions: 'Once daily - continue' },
    ],
    labs: [
      { name: 'HbA1c', status: 'Pending' },
      { name: 'Lipid Panel', status: 'Pending' },
    ],
    imaging: [],
    referrals: [],
  },
  billing: {
    emLevel: '99214',
    cptCodes: [
      { code: '99214', description: 'Office visit, established, moderate', amount: 145.00 },
    ],
    total: 145.00,
    status: 'Submitted',
  },
  aiAssisted: true,
});

// =============================================================================
// Main Component
// =============================================================================

export default function VisitDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'note' | 'orders' | 'billing'>('note');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (id) {
      setTimeout(() => {
        const data = getMockVisitDetail(id as string);
        setVisit(data);
        setEditedNote(data.clinicalNote);
        setLoading(false);
      }, 300);
    }
  }, [id]);

  const handleCopyNote = () => {
    if (visit) {
      navigator.clipboard.writeText(isEditing ? editedNote : visit.clinicalNote);
      alert('Note copied to clipboard');
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedNote(visit?.clinicalNote || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedNote(visit?.clinicalNote || '');
  };

  const handleSaveEdit = async () => {
    if (!visit) return;
    
    setIsSaving(true);
    
    // Simulate API call to save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update local state
    setVisit({
      ...visit,
      clinicalNote: editedNote,
    });
    
    setLastSaved(new Date());
    setIsSaving(false);
    setIsEditing(false);
  };

  if (loading || !visit) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading visit details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Visit - {visit.patient.name} | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen" style={{ background: theme.gradient }}>
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/visits/completed"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Back to Completed Visits"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <Link
                  href="/"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Dashboard"
                >
                  <Home className="w-5 h-5" />
                </Link>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white">{visit.patient.name}</h1>
                    <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </span>
                    {visit.aiAssisted && (
                      <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI-Assisted
                      </span>
                    )}
                  </div>
                  <p className="text-purple-200 text-sm">
                    {visit.patient.age}yo {visit.patient.gender} • {visit.patient.mrn} • {visit.visit.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {lastSaved && (
                  <span className="text-purple-200 text-sm">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                <button 
                  onClick={handleCopyNote}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar */}
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Patient Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Date of Birth</p>
                    <p className="font-medium">{visit.patient.dob}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{visit.patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Visit Date</p>
                    <p className="font-medium">{visit.visit.date} at {visit.visit.time}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Provider</p>
                    <p className="font-medium">{visit.visit.provider}</p>
                  </div>
                </div>
              </div>

              {/* Vitals */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  Vital Signs
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">BP</p>
                    <p className="font-semibold">{visit.vitals.bp}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">HR</p>
                    <p className="font-semibold">{visit.vitals.hr} bpm</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">Temp</p>
                    <p className="font-semibold">{visit.vitals.temp}°F</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">SpO2</p>
                    <p className="font-semibold">{visit.vitals.spo2}%</p>
                  </div>
                </div>
              </div>

              {/* Diagnoses */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-purple-600" />
                  Diagnoses
                </h3>
                <div className="space-y-2">
                  {visit.diagnoses.map((dx, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg ${dx.isPrimary ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm text-purple-700">{dx.code}</span>
                        {dx.isPrimary && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Primary</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{dx.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Summary */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  Billing
                </h3>
                <div className="space-y-3">
                  {visit.billing.cptCodes.map((cpt, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{cpt.code}</span>
                      <span className="font-medium">${cpt.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-green-600">${visit.billing.total.toFixed(2)}</span>
                  </div>
                  <div className="pt-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {visit.billing.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {[
                  { value: 'note', label: 'Clinical Note', icon: FileText },
                  { value: 'orders', label: 'Orders', icon: Pill },
                  { value: 'billing', label: 'Billing Details', icon: DollarSign },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value as typeof activeTab)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${
                      activeTab === tab.value
                        ? 'bg-white text-purple-700'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                {activeTab === 'note' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Clinical Documentation
                      </h3>
                      <div className="flex items-center gap-2">
                        {visit.aiAssisted && !isEditing && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                            <Sparkles className="w-3 h-3" />
                            AI-Generated
                          </span>
                        )}
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1.5 text-sm transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={isSaving}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                              {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleStartEdit}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1.5 text-sm transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Documentation
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {isEditing ? (
                      <textarea
                        value={editedNote}
                        onChange={(e) => setEditedNote(e.target.value)}
                        className="w-full h-[600px] font-mono text-sm text-gray-700 bg-gray-50 p-6 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                        placeholder="Enter clinical documentation..."
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-6 rounded-xl overflow-auto max-h-[600px]">
                        {visit.clinicalNote}
                      </pre>
                    )}
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="space-y-6">
                    {/* Medications */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Pill className="w-5 h-5 text-green-600" />
                        Medications ({visit.orders.medications.length})
                      </h4>
                      {visit.orders.medications.length > 0 ? (
                        <div className="space-y-2">
                          {visit.orders.medications.map((med, i) => (
                            <div key={i} className="p-3 bg-green-50 rounded-lg">
                              <div className="flex justify-between">
                                <span className="font-medium text-gray-900">{med.name} {med.dose}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{med.instructions}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No medications ordered</p>
                      )}
                    </div>

                    {/* Labs */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-amber-600" />
                        Laboratory ({visit.orders.labs.length})
                      </h4>
                      {visit.orders.labs.length > 0 ? (
                        <div className="space-y-2">
                          {visit.orders.labs.map((lab, i) => (
                            <div key={i} className="p-3 bg-amber-50 rounded-lg flex justify-between items-center">
                              <span className="font-medium text-gray-900">{lab.name}</span>
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{lab.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No labs ordered</p>
                      )}
                    </div>

                    {/* Imaging */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                        Imaging ({visit.orders.imaging.length})
                      </h4>
                      {visit.orders.imaging.length > 0 ? (
                        <div className="space-y-2">
                          {visit.orders.imaging.map((img, i) => (
                            <div key={i} className="p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                              <span className="font-medium text-gray-900">{img.name}</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{img.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No imaging ordered</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'billing' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Billing Details
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">E&M Level</p>
                        <p className="text-xl font-bold text-purple-700">{visit.billing.emLevel}</p>
                        <p className="text-sm text-gray-600">Office visit, established patient, moderate complexity</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">CPT Codes</h5>
                        <div className="space-y-2">
                          {visit.billing.cptCodes.map((cpt, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                              <div>
                                <span className="font-mono font-semibold text-purple-700">{cpt.code}</span>
                                <p className="text-sm text-gray-600">{cpt.description}</p>
                              </div>
                              <span className="font-bold text-green-600">${cpt.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-xl flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Charges</span>
                        <span className="text-2xl font-bold text-green-600">${visit.billing.total.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {visit.billing.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
