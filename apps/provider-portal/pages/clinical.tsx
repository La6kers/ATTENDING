// =============================================================================
// ATTENDING AI - Unified Clinical Workspace
// apps/provider-portal/pages/clinical.tsx
//
// Single page combining:
// - Previsit Summary (default view)
// - Labs ordering
// - Imaging ordering  
// - Medications / E-Prescribe
// - Referrals
// - Treatment Plan
//
// All share the same patient context with tab-based navigation
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  ClipboardList,
  TestTube,
  FileImage,
  Pill,
  Users,
  Calendar,
  Brain,
  Sparkles,
  AlertTriangle,
  Send,
} from 'lucide-react';
import ClinicalWorkspaceLayout from '@/components/layout/ClinicalWorkspaceLayout';
import type { PatientContextData } from '@/components/layout/PatientContextBar';

// =============================================================================
// Types
// =============================================================================

type ClinicalTab = 'previsit' | 'labs' | 'imaging' | 'medications' | 'referrals' | 'treatment';

interface TabConfig {
  id: ClinicalTab;
  label: string;
  icon: React.ElementType;
  shortLabel?: string;
}

// =============================================================================
// Tab Configuration
// =============================================================================

const TABS: TabConfig[] = [
  { id: 'previsit', label: 'Previsit Summary', icon: ClipboardList, shortLabel: 'Summary' },
  { id: 'labs', label: 'Labs', icon: TestTube },
  { id: 'imaging', label: 'Imaging', icon: FileImage },
  { id: 'medications', label: 'Medications', icon: Pill, shortLabel: 'Meds' },
  { id: 'referrals', label: 'Referrals', icon: Users },
  { id: 'treatment', label: 'Treatment Plan', icon: Calendar, shortLabel: 'Treatment' },
];

// =============================================================================
// Demo Patient Data
// =============================================================================

const DEMO_PATIENT: PatientContextData = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 34,
  gender: 'Female',
  mrn: 'MRN-2024-001',
  chiefComplaint: 'Severe headache with visual disturbances for 3 days',
  allergies: ['Penicillin', 'Sulfa drugs'],
  currentMedications: ['Metformin 500mg BID', 'Lisinopril 10mg daily', 'Ibuprofen PRN'],
  medicalHistory: ['Type 2 Diabetes', 'Hypertension', 'Migraines'],
  redFlags: ['Worst headache of life', 'Visual changes', 'Neck stiffness'],
  insurancePlan: 'Blue Cross PPO',
  assessmentId: 'assess-001',
};

// =============================================================================
// Previsit Summary Tab
// =============================================================================

const PrevisitSummaryTab: React.FC<{ patient: PatientContextData }> = ({ patient }) => {
  return (
    <div className="space-y-6">
      {/* AI Summary Card */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Clinical Summary</h3>
            <p className="text-sm text-gray-500">Generated from COMPASS assessment</p>
          </div>
          <span className="ml-auto flex items-center gap-1 text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            AI Generated
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            <strong>34-year-old female</strong> presenting with <strong>severe headache</strong> with visual disturbances 
            for 3 days. Patient describes this as the &ldquo;worst headache of her life&rdquo; with acute onset. 
            Associated symptoms include photophobia, neck stiffness, and nausea.
          </p>
          <p className="mt-3">
            <strong>Pertinent History:</strong> Type 2 Diabetes (controlled), Hypertension (on Lisinopril), 
            history of migraines (though patient states this is different from typical migraines).
          </p>
        </div>
      </div>

      {/* Red Flags Alert */}
      {patient.redFlags && patient.redFlags.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Critical Red Flags Identified</h3>
          </div>
          <ul className="space-y-2">
            {patient.redFlags.map((flag, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-red-700">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                {flag}
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-red-100 rounded-lg">
            <p className="text-sm font-medium text-red-800">
              ⚠️ Consider urgent neuroimaging to rule out subarachnoid hemorrhage or other intracranial pathology.
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: TestTube, label: 'Order Labs', desc: 'CBC, BMP, ESR', color: 'text-blue-600' },
          { icon: FileImage, label: 'Order Imaging', desc: 'CT Head, MRI', color: 'text-purple-600' },
          { icon: Users, label: 'Refer to Neuro', desc: 'Urgent consult', color: 'text-orange-600' },
          { icon: Pill, label: 'Prescribe', desc: 'Pain management', color: 'text-green-600' },
        ].map((action, i) => (
          <button
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <action.icon className={`w-6 h-6 mb-2 ${action.color}`} />
            <p className="font-medium text-gray-900 group-hover:text-purple-700">{action.label}</p>
            <p className="text-xs text-gray-500">{action.desc}</p>
          </button>
        ))}
      </div>

      {/* Differential Diagnosis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Differential Diagnosis
        </h3>
        <div className="space-y-3">
          {[
            { diagnosis: 'Subarachnoid Hemorrhage', probability: 'High', urgent: true },
            { diagnosis: 'Migraine with Aura', probability: 'Moderate', urgent: false },
            { diagnosis: 'Meningitis', probability: 'Moderate', urgent: true },
            { diagnosis: 'Hypertensive Emergency', probability: 'Low-Moderate', urgent: true },
            { diagnosis: 'Tension Headache', probability: 'Low', urgent: false },
          ].map((dx, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-lg ${
                dx.urgent ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  dx.probability === 'High' ? 'bg-red-500' :
                  dx.probability.includes('Moderate') ? 'bg-yellow-500' : 'bg-gray-400'
                }`} />
                <span className="font-medium text-gray-900">{dx.diagnosis}</span>
                {dx.urgent && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    Urgent workup
                  </span>
                )}
              </div>
              <span className={`text-sm ${
                dx.probability === 'High' ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}>
                {dx.probability}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Workup */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recommended Workup</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <TestTube className="w-4 h-4 text-blue-600" />
              Laboratory
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• CBC with differential</li>
              <li>• Basic Metabolic Panel</li>
              <li>• ESR, CRP</li>
              <li>• Coagulation studies (PT/INR, PTT)</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileImage className="w-4 h-4 text-purple-600" />
              Imaging
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• CT Head without contrast (STAT)</li>
              <li>• If CT negative: Lumbar puncture</li>
              <li>• Consider MRA/CTA for vascular evaluation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Labs Tab (Simplified)
// =============================================================================

const LabsTab: React.FC<{ patient: PatientContextData }> = ({ patient }) => {
  const [selectedLabs, setSelectedLabs] = useState<string[]>(['cbc', 'bmp', 'esr']);

  const labPanels = [
    { id: 'cbc', name: 'CBC with Differential', cpt: '85025', price: '$12' },
    { id: 'bmp', name: 'Basic Metabolic Panel', cpt: '80048', price: '$15' },
    { id: 'cmp', name: 'Comprehensive Metabolic Panel', cpt: '80053', price: '$18' },
    { id: 'esr', name: 'ESR (Sed Rate)', cpt: '85651', price: '$8' },
    { id: 'crp', name: 'C-Reactive Protein', cpt: '86140', price: '$10' },
    { id: 'coag', name: 'Coagulation Panel (PT/INR, PTT)', cpt: '85610', price: '$20' },
    { id: 'ua', name: 'Urinalysis', cpt: '81003', price: '$6' },
    { id: 'lipid', name: 'Lipid Panel', cpt: '80061', price: '$15' },
  ];

  const toggleLab = (id: string) => {
    setSelectedLabs(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* AI Recommendations */}
      <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">AI Recommended Labs</h3>
        </div>
        <p className="text-sm text-purple-700 mb-3">
          Based on the presentation of severe headache with red flags, the following labs are recommended:
        </p>
        <div className="flex flex-wrap gap-2">
          {['CBC', 'BMP', 'ESR/CRP', 'Coagulation'].map(lab => (
            <span key={lab} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {lab}
            </span>
          ))}
        </div>
      </div>

      {/* Lab Selection */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Select Lab Tests</h3>
          <span className="text-sm text-gray-500">{selectedLabs.length} selected</span>
        </div>
        <div className="divide-y divide-gray-100">
          {labPanels.map(lab => (
            <label
              key={lab.id}
              className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedLabs.includes(lab.id) ? 'bg-purple-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedLabs.includes(lab.id)}
                onChange={() => toggleLab(lab.id)}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{lab.name}</p>
                <p className="text-xs text-gray-500">CPT: {lab.cpt}</p>
              </div>
              <span className="text-sm text-gray-500">{lab.price}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      {selectedLabs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Order Summary</h3>
            <span className="text-sm font-medium text-purple-600">
              {selectedLabs.length} test{selectedLabs.length > 1 ? 's' : ''}
            </span>
          </div>
          <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            Submit Lab Orders
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Imaging Tab (Simplified)
// =============================================================================

const ImagingTab: React.FC<{ patient: PatientContextData }> = ({ patient }) => {
  const [selectedStudy, setSelectedStudy] = useState<string | null>('ct-head');

  const studies = [
    { id: 'ct-head', name: 'CT Head without Contrast', modality: 'CT', cpt: '70450', urgency: 'STAT' },
    { id: 'ct-head-c', name: 'CT Head with Contrast', modality: 'CT', cpt: '70460', urgency: 'Urgent' },
    { id: 'mri-brain', name: 'MRI Brain without Contrast', modality: 'MRI', cpt: '70551', urgency: 'Routine' },
    { id: 'mra-head', name: 'MRA Head', modality: 'MRI', cpt: '70544', urgency: 'Urgent' },
    { id: 'cta-head', name: 'CTA Head and Neck', modality: 'CT', cpt: '70496', urgency: 'STAT' },
  ];

  return (
    <div className="space-y-6">
      {/* AI Recommendation */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-red-800">Urgent Imaging Recommended</h3>
        </div>
        <p className="text-sm text-red-700">
          Given the red flags (worst headache of life, neck stiffness), <strong>STAT CT Head without contrast</strong> is 
          recommended to rule out subarachnoid hemorrhage. If negative, consider lumbar puncture.
        </p>
      </div>

      {/* Study Selection */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Select Imaging Study</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {studies.map(study => (
            <label
              key={study.id}
              className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedStudy === study.id ? 'bg-purple-50' : ''
              }`}
            >
              <input
                type="radio"
                name="imaging"
                checked={selectedStudy === study.id}
                onChange={() => setSelectedStudy(study.id)}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{study.name}</p>
                <p className="text-xs text-gray-500">CPT: {study.cpt} • {study.modality}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                study.urgency === 'STAT' ? 'bg-red-100 text-red-700' :
                study.urgency === 'Urgent' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {study.urgency}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Order Button */}
      {selectedStudy && (
        <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          Order Imaging Study
        </button>
      )}
    </div>
  );
};

// =============================================================================
// Placeholder Tabs
// =============================================================================

const MedicationsTab: React.FC<{ patient: PatientContextData }> = ({ patient }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
    <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">E-Prescribe Module</h3>
    <p className="text-gray-500 mb-4">Prescribe medications with drug interaction checking</p>
    <button className="px-6 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors">
      Open Full Prescribing Module
    </button>
  </div>
);

const ReferralsTab: React.FC<{ patient: PatientContextData }> = ({ patient }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Specialty Referrals</h3>
    <p className="text-gray-500 mb-4">Create and track specialist referrals</p>
    <button className="px-6 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors">
      Open Referrals Module
    </button>
  </div>
);

const TreatmentTab: React.FC<{ patient: PatientContextData }> = ({ patient }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Treatment Plan</h3>
    <p className="text-gray-500 mb-4">Create comprehensive treatment plans with follow-up scheduling</p>
    <button className="px-6 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors">
      Open Treatment Planner
    </button>
  </div>
);

// =============================================================================
// Main Clinical Page
// =============================================================================

export default function ClinicalWorkspace() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ClinicalTab>('previsit');
  const [patient] = useState<PatientContextData>(DEMO_PATIENT);

  // Sync tab with URL query param
  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab as ClinicalTab);
    }
  }, [router.query.tab]);

  // Update URL when tab changes
  const handleTabChange = (tab: ClinicalTab) => {
    setActiveTab(tab);
    router.push(`/clinical?tab=${tab}`, undefined, { shallow: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'previsit':
        return <PrevisitSummaryTab patient={patient} />;
      case 'labs':
        return <LabsTab patient={patient} />;
      case 'imaging':
        return <ImagingTab patient={patient} />;
      case 'medications':
        return <MedicationsTab patient={patient} />;
      case 'referrals':
        return <ReferralsTab patient={patient} />;
      case 'treatment':
        return <TreatmentTab patient={patient} />;
      default:
        return <PrevisitSummaryTab patient={patient} />;
    }
  };

  return (
    <>
      <Head>
        <title>Clinical Workspace | ATTENDING AI</title>
      </Head>

      <ClinicalWorkspaceLayout
        patient={patient}
        activeSection={activeTab}
        onSectionChange={(section) => handleTabChange(section as ClinicalTab)}
      >
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-all
                    ${isActive 
                      ? 'border-purple-600 text-purple-600 bg-purple-50' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </ClinicalWorkspaceLayout>
    </>
  );
}
