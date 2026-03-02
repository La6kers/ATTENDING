// Clinical Hub / Diagnosis Page
// The central clinical decision-making page that ties all ordering modules together
// apps/provider-portal/pages/clinical-hub.tsx

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { 
  QuickActionsBar, 
  PatientBanner, 
  ClinicalAlertBanner,
  EmergencyProtocolModal 
} from '../components/shared';
import {
  Brain,
  TestTube,
  FileImage,
  Pill,
  Users,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Stethoscope,
  Target,
  Lightbulb,
  Shield,
} from 'lucide-react';

// Demo patient data - in production this would come from context/API
const DEMO_PATIENT = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 32,
  gender: 'Female',
  mrn: '78932145',
  chiefComplaint: 'Severe headache with visual disturbances and confusion for 3 days',
  allergies: ['Penicillin', 'Sulfa drugs'],
  currentMedications: ['Oral contraceptive', 'Metformin 500mg'],
  medicalHistory: ['Type 2 Diabetes', 'Migraines', 'Anxiety disorder'],
  redFlags: ['Worst headache of life', 'Confusion', 'Visual changes'],
  insurancePlan: 'Blue Cross PPO',
};

// Demo clinical alerts
const DEMO_ALERTS = [
  {
    id: 'alert-001',
    type: 'critical' as const,
    title: 'Clinical Decision Support Alert',
    message: 'Patient reports "worst headache of life" - Consider ruling out subarachnoid hemorrhage',
    action: 'emergency-protocol',
    actionLabel: 'View Emergency Protocol',
    timestamp: new Date(),
    acknowledged: false,
  },
];

// Demo AI differential diagnosis
const DEMO_DIFFERENTIAL = [
  {
    id: 'dx-1',
    diagnosis: 'Migraine with Aura',
    icdCode: 'G43.109',
    confidence: 65,
    category: 'primary',
    reasoning: 'History of migraines, visual disturbances typical of aura',
    supportingFindings: ['History of migraines', 'Visual changes', 'Age/gender profile'],
    redFlags: [],
  },
  {
    id: 'dx-2',
    diagnosis: 'Subarachnoid Hemorrhage',
    icdCode: 'I60.9',
    confidence: 25,
    category: 'must-rule-out',
    reasoning: '"Worst headache of life" is classic presentation - requires urgent evaluation',
    supportingFindings: ['Thunderclap headache description', 'Severity'],
    redFlags: ['Worst headache of life', 'Sudden onset'],
  },
  {
    id: 'dx-3',
    diagnosis: 'Meningitis',
    icdCode: 'G03.9',
    confidence: 15,
    category: 'must-rule-out',
    reasoning: 'Headache with confusion warrants consideration',
    supportingFindings: ['Headache', 'Confusion'],
    redFlags: ['Altered mental status'],
  },
  {
    id: 'dx-4',
    diagnosis: 'Intracranial Mass',
    icdCode: 'D43.2',
    confidence: 10,
    category: 'consider',
    reasoning: 'Progressive headache with neurologic symptoms',
    supportingFindings: ['Progressive headache', 'Visual changes'],
    redFlags: [],
  },
];

// Demo orders placed
const DEMO_ORDERS = {
  labs: [
    { id: 'lab-1', name: 'CBC with Differential', status: 'pending', priority: 'STAT' },
    { id: 'lab-2', name: 'Comprehensive Metabolic Panel', status: 'pending', priority: 'STAT' },
    { id: 'lab-3', name: 'PT/INR', status: 'pending', priority: 'STAT' },
  ],
  imaging: [
    { id: 'img-1', name: 'CT Head without Contrast', status: 'ordered', priority: 'STAT' },
  ],
  medications: [],
  referrals: [
    { id: 'ref-1', name: 'Neurology Consultation', status: 'pending', priority: 'URGENT' },
  ],
};

export default function ClinicalHubPage() {
  const _router = useRouter();
  // const { assessmentId, patientId } = router.query; // Available for future use
  
  const [patient] = useState(DEMO_PATIENT);
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [differential] = useState(DEMO_DIFFERENTIAL);
  const [orders] = useState(DEMO_ORDERS);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);

  // Handle alert action (e.g., emergency protocol)
  const handleAlertAction = (alertId: string, action: string) => {
    if (action === 'emergency-protocol') {
      setShowEmergencyModal(true);
    }
  };

  // Handle acknowledging alerts
  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
    );
  };

  // Handle dismissing alerts
  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // Calculate order counts
  const orderCounts = {
    labs: orders.labs.length,
    imaging: orders.imaging.length,
    medications: orders.medications.length,
    referrals: orders.referrals.length,
    total: orders.labs.length + orders.imaging.length + orders.medications.length + orders.referrals.length,
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Clinical Hub | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Clinical Decision Hub</h1>
                <p className="text-teal-200">AI-Powered Diagnostic Support & Order Management</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Clinical Alerts */}
          <ClinicalAlertBanner
            alerts={alerts}
            onAction={handleAlertAction}
            onAcknowledge={handleAcknowledgeAlert}
            onDismiss={handleDismissAlert}
            className="mb-6"
          />

          {/* Patient Banner */}
          <PatientBanner
            patient={patient}
            accentColor="teal"
            showRedFlags={true}
            showActions={true}
            className="mb-6"
          />

          {/* Quick Actions */}
          <QuickActionsBar
            currentPage="diagnosis"
            patientId={patient.id}
            showBackButton={false}
            showEmergencyButton={patient.redFlags.length > 0}
            onEmergencyProtocol={() => setShowEmergencyModal(true)}
          />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Left Column - AI Differential */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Differential Diagnosis Panel */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-teal-600 to-teal-800 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6" />
                    <div>
                      <h2 className="font-semibold">AI Differential Diagnosis</h2>
                      <p className="text-teal-100 text-sm">Based on COMPASS assessment and clinical data</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {differential.map((dx, index) => (
                    <div
                      key={dx.id}
                      onClick={() => setSelectedDiagnosis(dx.id === selectedDiagnosis ? null : dx.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        dx.category === 'must-rule-out'
                          ? 'border-red-200 bg-red-50 hover:border-red-400'
                          : dx.category === 'primary'
                          ? 'border-green-200 bg-green-50 hover:border-green-400'
                          : 'border-gray-200 bg-gray-50 hover:border-teal-300'
                      } ${selectedDiagnosis === dx.id ? 'ring-2 ring-teal-500' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                            dx.category === 'must-rule-out'
                              ? 'bg-red-500'
                              : dx.category === 'primary'
                              ? 'bg-green-500'
                              : 'bg-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{dx.diagnosis}</h3>
                              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono">
                                {dx.icdCode}
                              </span>
                            </div>
                            {dx.category === 'must-rule-out' && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium mt-1">
                                <AlertTriangle className="w-3 h-3" />
                                Must Rule Out
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{dx.confidence}%</div>
                          <div className="text-xs text-gray-500">confidence</div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {selectedDiagnosis === dx.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-700 mb-3">
                            <Lightbulb className="w-4 h-4 inline mr-2 text-amber-500" />
                            {dx.reasoning}
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Supporting Findings</p>
                              <div className="space-y-1">
                                {dx.supportingFindings.map((finding, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    {finding}
                                  </div>
                                ))}
                              </div>
                            </div>
                            {dx.redFlags.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-2">Red Flags</p>
                                <div className="space-y-1">
                                  {dx.redFlags.map((flag, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                                      <AlertTriangle className="w-4 h-4" />
                                      {flag}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Workup */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-teal-600" />
                  Recommended Diagnostic Workup
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link href={`/labs?patientId=${patient.id}`}>
                    <div className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <TestTube className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">Laboratory Studies</p>
                          <p className="text-sm text-green-600">CBC, CMP, Coagulation, ESR/CRP</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <Link href={`/imaging?patientId=${patient.id}`}>
                    <div className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <FileImage className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-800">Imaging Studies</p>
                          <p className="text-sm text-blue-600">CT Head, consider CTA/MRI</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <Link href={`/referrals?patientId=${patient.id}`}>
                    <div className="p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-teal-600" />
                        <div>
                          <p className="font-medium text-teal-800">Specialist Consult</p>
                          <p className="text-sm text-teal-600">Neurology - Urgent</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <Link href={`/medications?patientId=${patient.id}`}>
                    <div className="p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Pill className="w-6 h-6 text-orange-600" />
                        <div>
                          <p className="font-medium text-orange-800">Medications</p>
                          <p className="text-sm text-orange-600">Symptomatic management</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-900 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="w-5 h-5" />
                      <h2 className="font-semibold">Order Summary</h2>
                    </div>
                    <span className="bg-teal-500 px-3 py-1 rounded-full text-sm font-medium">
                      {orderCounts.total} Orders
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Labs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <TestTube className="w-4 h-4 text-green-600" />
                        Labs
                      </span>
                      <span className="text-sm text-gray-500">{orderCounts.labs} ordered</span>
                    </div>
                    {orders.labs.map(lab => (
                      <div key={lab.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm">{lab.name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          lab.priority === 'STAT' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {lab.priority}
                        </span>
                      </div>
                    ))}
                    {orders.labs.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No labs ordered</p>
                    )}
                  </div>

                  {/* Imaging */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileImage className="w-4 h-4 text-blue-600" />
                        Imaging
                      </span>
                      <span className="text-sm text-gray-500">{orderCounts.imaging} ordered</span>
                    </div>
                    {orders.imaging.map(img => (
                      <div key={img.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm">{img.name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          img.priority === 'STAT' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {img.priority}
                        </span>
                      </div>
                    ))}
                    {orders.imaging.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No imaging ordered</p>
                    )}
                  </div>

                  {/* Referrals */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-teal-600" />
                        Referrals
                      </span>
                      <span className="text-sm text-gray-500">{orderCounts.referrals} ordered</span>
                    </div>
                    {orders.referrals.map(ref => (
                      <div key={ref.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm">{ref.name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          ref.priority === 'URGENT' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {ref.priority}
                        </span>
                      </div>
                    ))}
                    {orders.referrals.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No referrals ordered</p>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t bg-gray-50">
                  <button className="w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
                    Sign All Orders
                  </button>
                </div>
              </div>

              {/* Clinical Guidelines */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Clinical Guidelines
                </h3>
                <div className="space-y-2">
                  <a href="#" className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <p className="text-sm font-medium text-blue-800">AHA/ASA Guidelines</p>
                    <p className="text-xs text-blue-600">Evaluation of Acute Headache</p>
                  </a>
                  <a href="#" className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <p className="text-sm font-medium text-blue-800">ACEP Clinical Policy</p>
                    <p className="text-xs text-blue-600">Headache in the ED</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Protocol Modal */}
      <EmergencyProtocolModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        patientName={patient.name}
        chiefComplaint={patient.chiefComplaint}
        redFlags={patient.redFlags}
        onOrderStatLabs={(labs) => {
          console.log('Ordering STAT labs:', labs);
          // In production, this would call the lab ordering store
        }}
        onOrderStatImaging={(imaging) => {
          console.log('Ordering STAT imaging:', imaging);
          // In production, this would call the imaging ordering store
        }}
        onRequestConsult={(specialty) => {
          console.log('Requesting consult:', specialty);
          // In production, this would call the referral ordering store
        }}
      />
    </DashboardLayout>
  );
}
