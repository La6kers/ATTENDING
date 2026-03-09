// =============================================================================
// ATTENDING AI - Visit Completion / Note & Billing Page
// apps/provider-portal/pages/visit/[id]/complete.tsx
//
// Provider completes the note, reviews billing codes, and finalizes the visit
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  CheckCircle,
  Edit,
  Copy,
  Download,
  Printer,
  Send,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Stethoscope,
  Pill,
  FlaskConical,
  ImageIcon,
  ClipboardCheck,
  Home,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// Theme
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface BillingCode {
  code: string;
  description: string;
  type: 'ICD-10' | 'CPT' | 'E&M';
  amount?: number;
  selected: boolean;
}

interface SelectedDiagnosis {
  id: string;
  name: string;
  icdCode: string;
}

interface SelectedTreatment {
  id: string;
  name: string;
  category: string;
  details: string;
}

interface PatientContext {
  name: string;
  age: number;
  gender: string;
  mrn: string;
  dob?: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const getMockBillingCodes = (diagnoses: SelectedDiagnosis[]): BillingCode[] => {
  const codes: BillingCode[] = [];

  // Add ICD-10 codes from diagnoses
  diagnoses.forEach(dx => {
    codes.push({
      code: dx.icdCode,
      description: dx.name,
      type: 'ICD-10',
      selected: true,
    });
  });

  // Add E&M code
  codes.push({
    code: '99214',
    description: 'Office visit, established patient, moderate complexity',
    type: 'E&M',
    amount: 145.00,
    selected: true,
  });

  // Add procedure codes
  codes.push({
    code: '71046',
    description: 'Chest X-Ray, 2 views',
    type: 'CPT',
    amount: 85.00,
    selected: true,
  });

  return codes;
};

const generateNote = (
  patient: PatientContext | null,
  diagnoses: SelectedDiagnosis[],
  treatments: SelectedTreatment[]
): string => {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const medications = treatments.filter(t => t.category === 'medication');
  const labs = treatments.filter(t => t.category === 'lab');
  const imaging = treatments.filter(t => t.category === 'imaging');
  const followups = treatments.filter(t => t.category === 'followup' || t.category === 'referral');

  return `MEDICAL ENCOUNTER DOCUMENTATION
=====================================

PATIENT INFORMATION
-------------------
Name: ${patient?.name || 'Sarah Johnson'}
DOB: ${patient?.dob || '03/15/1992'}
Age: ${patient?.age || 32} years old
Gender: ${patient?.gender || 'Female'}
MRN: ${patient?.mrn || '78932145'}
Date of Service: ${date}
Provider: Dr. Thomas Reed, MD
Encounter Type: Office Visit

CHIEF COMPLAINT
---------------
"Severe headache for 3 days - worst headache of my life"

HISTORY OF PRESENT ILLNESS
--------------------------
32-year-old female presenting with a 3-day history of severe right-sided headache. Pain is described as throbbing and rated 9/10 at its worst intensity. The headache is associated with photophobia, phonophobia, and nausea with vomiting.

Key Features:
• Onset: 3 days ago, gradual development
• Location: Right-sided, unilateral
• Character: Throbbing, pulsating quality
• Severity: 9/10 at worst, currently 7/10
• Duration: Continuous for 72 hours
• Associated Symptoms: Visual aura (zigzag lines), photophobia, phonophobia, nausea with vomiting, intermittent confusion
• Aggravating Factors: Physical activity, bright lights, loud sounds
• Relieving Factors: Rest in dark, quiet room; minimal relief with OTC analgesics

VITAL SIGNS
-----------
Blood Pressure: 138/88 mmHg (elevated)
Heart Rate: 96 bpm (tachycardic)
Temperature: 98.6°F
Respiratory Rate: 18/min
Oxygen Saturation: 99% on room air

ALLERGIES
---------
• Penicillin - Rash, hives, difficulty breathing (SEVERE)
• Sulfa drugs - Skin rash, nausea (MODERATE)
• Codeine - Nausea, vomiting, drowsiness (MILD)

ASSESSMENT/DIAGNOSIS
--------------------
${diagnoses.map((dx, i) => `${i + 1}. ${dx.name} (${dx.icdCode})`).join('\n')}

PLAN
----
${medications.length > 0 ? `
Medications:
${medications.map(m => `• ${m.name} - ${m.details}`).join('\n')}
` : ''}
${labs.length > 0 ? `
Laboratory Studies:
${labs.map(l => `• ${l.name} - ${l.details}`).join('\n')}
` : ''}
${imaging.length > 0 ? `
Imaging:
${imaging.map(i => `• ${i.name} - ${i.details}`).join('\n')}
` : ''}
${followups.length > 0 ? `
Follow-up:
${followups.map(f => `• ${f.name} - ${f.details}`).join('\n')}
` : ''}

RETURN PRECAUTIONS
------------------
Patient instructed to return immediately for:
• Worsening headache
• New neurological symptoms
• Fever
• Vision changes
• Weakness or numbness

ATTESTATION
-----------
This encounter documentation represents my professional assessment and treatment of the patient. All clinical decisions were made using evidence-based guidelines and clinical decision support tools.

Provider Signature: _________________________
Dr. Thomas Reed, MD

Date: ${date}

---
Documentation generated with AI assistance - ATTENDING AI Medical Portal
All clinical decisions remain under physician supervision and responsibility`;
};

// =============================================================================
// Main Component
// =============================================================================

export default function CompletePage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<SelectedDiagnosis[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([]);
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
  const [billingCodes, setBillingCodes] = useState<BillingCode[]>([]);
  const [note, setNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (id) {
      // Load from session storage
      const storedDiagnoses = sessionStorage.getItem('selectedDiagnoses');
      const storedTreatments = sessionStorage.getItem('selectedTreatments');
      const storedPatient = sessionStorage.getItem('patientContext');

      let diagnoses: SelectedDiagnosis[] = [];
      let treatments: SelectedTreatment[] = [];
      let patient: PatientContext | null = null;

      if (storedDiagnoses) {
        diagnoses = JSON.parse(storedDiagnoses);
        setSelectedDiagnoses(diagnoses);
      }
      if (storedTreatments) {
        treatments = JSON.parse(storedTreatments);
        setSelectedTreatments(treatments);
      }
      if (storedPatient) {
        patient = JSON.parse(storedPatient);
        setPatientContext(patient);
      }

      // Generate billing codes and note
      setBillingCodes(getMockBillingCodes(diagnoses));
      setNote(generateNote(patient, diagnoses, treatments));
      setLoading(false);
    }
  }, [id]);

  const toggleBillingCode = (code: string) => {
    setBillingCodes(prev =>
      prev.map(bc =>
        bc.code === code ? { ...bc, selected: !bc.selected } : bc
      )
    );
  };

  const calculateTotal = () => {
    return billingCodes
      .filter(bc => bc.selected && bc.amount)
      .reduce((sum, bc) => sum + (bc.amount || 0), 0);
  };

  const handleCompleteVisit = () => {
    setShowSuccessModal(true);
    // Clear session storage
    setTimeout(() => {
      sessionStorage.removeItem('selectedDiagnoses');
      sessionStorage.removeItem('selectedTreatments');
      sessionStorage.removeItem('patientContext');
    }, 500);
  };

  const handleReturnToDashboard = () => {
    router.push('/');
  };

  const handleNextPatient = () => {
    router.push('/inbox');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Generating documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Complete Visit | ATTENDING AI</title>
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
                    <h1 className="text-xl font-bold text-white">Note & Billing Summary</h1>
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                      STEP 3 OF 3
                    </span>
                  </div>
                  <p className="text-teal-200 text-sm">
                    {patientContext ? `${patientContext.name} • ${patientContext.mrn}` : 'Loading...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Billing Codes */}
            <div className="space-y-6">
              {/* Billing Summary */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Billing Codes</h2>
                    <p className="text-gray-600 text-sm">Review and confirm</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* ICD-10 Codes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Diagnosis Codes (ICD-10)</p>
                    {billingCodes.filter(bc => bc.type === 'ICD-10').map((bc) => (
                      <div
                        key={bc.code}
                        className={`p-3 rounded-xl border mb-2 cursor-pointer transition-colors ${
                          bc.selected ? 'border-teal-300 bg-teal-50' : 'border-gray-200 hover:border-teal-200'
                        }`}
                        onClick={() => toggleBillingCode(bc.code)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            bc.selected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                          }`}>
                            {bc.selected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-mono text-sm font-semibold text-teal-700">{bc.code}</p>
                            <p className="text-gray-600 text-xs">{bc.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* E&M Codes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">E&M Level</p>
                    {billingCodes.filter(bc => bc.type === 'E&M').map((bc) => (
                      <div
                        key={bc.code}
                        className={`p-3 rounded-xl border mb-2 cursor-pointer transition-colors ${
                          bc.selected ? 'border-teal-300 bg-teal-50' : 'border-gray-200 hover:border-teal-200'
                        }`}
                        onClick={() => toggleBillingCode(bc.code)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              bc.selected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                            }`}>
                              {bc.selected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="font-mono text-sm font-semibold text-teal-700">{bc.code}</p>
                              <p className="text-gray-600 text-xs">{bc.description}</p>
                            </div>
                          </div>
                          {bc.amount && (
                            <span className="font-semibold text-green-600">${bc.amount.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CPT Codes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Procedure Codes (CPT)</p>
                    {billingCodes.filter(bc => bc.type === 'CPT').map((bc) => (
                      <div
                        key={bc.code}
                        className={`p-3 rounded-xl border mb-2 cursor-pointer transition-colors ${
                          bc.selected ? 'border-teal-300 bg-teal-50' : 'border-gray-200 hover:border-teal-200'
                        }`}
                        onClick={() => toggleBillingCode(bc.code)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              bc.selected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                            }`}>
                              {bc.selected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="font-mono text-sm font-semibold text-teal-700">{bc.code}</p>
                              <p className="text-gray-600 text-xs">{bc.description}</p>
                            </div>
                          </div>
                          {bc.amount && (
                            <span className="font-semibold text-green-600">${bc.amount.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Estimated Total</span>
                      <span className="text-2xl font-bold text-green-600">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit Summary */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-teal-600" />
                  Visit Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{patientContext?.name || 'Sarah Johnson'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <Stethoscope className="w-4 h-4 text-gray-500" />
                    <span>{selectedDiagnoses.length} diagnoses</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <Pill className="w-4 h-4 text-gray-500" />
                    <span>{selectedTreatments.filter(t => t.category === 'medication').length} medications</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <FlaskConical className="w-4 h-4 text-gray-500" />
                    <span>{selectedTreatments.filter(t => t.category === 'lab').length} lab orders</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    <span>{selectedTreatments.filter(t => t.category === 'imaging').length} imaging studies</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Clinical Note */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-teal-50 to-teal-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-xl">
                      <FileText className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">Clinical Documentation</h2>
                      <p className="text-gray-600 text-sm">AI-generated note for review</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-teal-100 rounded-full">
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      <span className="text-teal-700 text-xs font-medium">AI-Generated</span>
                    </div>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200 transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      {isEditing ? 'Preview' : 'Edit'}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(note).catch(() => {
                        console.warn('Failed to copy to clipboard');
                      })}
                      className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {isEditing ? (
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full h-[600px] p-4 font-mono text-sm border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-6 rounded-xl overflow-auto max-h-[600px]">
                      {note}
                    </pre>
                  )}
                </div>
              </div>

              {/* Complete Visit Button */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => router.push(`/visit/${id}/treatment`)}
                  className="px-6 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors"
                >
                  Back to Treatment
                </button>
                <button
                  onClick={handleCompleteVisit}
                  className="px-8 py-4 bg-white text-teal-700 rounded-2xl font-semibold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl hover:bg-teal-50 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete Visit & Sign Note
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Visit Completed!</h2>
            <p className="text-gray-600 mb-6">
              Documentation has been signed and saved. Orders have been submitted.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Clinical note signed and filed</li>
                <li>✓ Billing codes submitted</li>
                <li>✓ {selectedTreatments.filter(t => t.category === 'medication').length} medication orders sent to pharmacy</li>
                <li>✓ {selectedTreatments.filter(t => t.category === 'lab').length} lab orders submitted</li>
                <li>✓ {selectedTreatments.filter(t => t.category === 'imaging').length} imaging orders submitted</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReturnToDashboard}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={handleNextPatient}
                className="flex-1 px-6 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-colors"
                style={{ background: theme.gradient }}
              >
                Next Patient
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
