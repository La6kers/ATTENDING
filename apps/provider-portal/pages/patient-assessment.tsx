// patient-assessment.tsx
// Patient Assessment Page with HTML Prototype Features
// apps/provider-portal/pages/patient-assessment.tsx

import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { 
  QuickActionsBar, 
  PatientBanner, 
  SimpleCriticalAlert,
  FindingList,
  type Finding,
  type FindingStatus 
} from '../components/shared';
import EmergencyProtocolModal from '../components/shared/EmergencyProtocolModal';
import { 
  Stethoscope, 
  Brain, 
  FileText, 
  Shield, 
  ChevronDown,
  ChevronUp,
  Activity,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';

// Sample patient for demonstration
const DEMO_PATIENT = {
  id: 'patient-demo-001',
  name: 'Sarah Johnson',
  age: 32,
  gender: 'Female',
  mrn: '78932145',
  chiefComplaint: '"Worst headache of my life" with confusion and neck stiffness',
  allergies: ['Penicillin', 'Sulfa'],
  currentMedications: ['Oral contraceptives'],
  medicalHistory: ['Migraines', 'Anxiety'],
  redFlags: ['Worst headache of life', 'Confusion', 'Neck stiffness'],
  insurancePlan: 'Blue Cross PPO',
};

// Sample findings from COMPASS AI assessment
const INITIAL_FINDINGS: Finding[] = [
  {
    id: 'f1',
    text: 'Sudden onset headache (thunderclap)',
    status: 'present',
    critical: true,
    aiSuggested: true,
    source: 'patient-reported',
    rationale: 'Patient describes sudden onset reaching maximum intensity within seconds - classic thunderclap pattern requiring immediate evaluation for SAH.',
  },
  {
    id: 'f2',
    text: 'Neck stiffness/meningismus',
    status: 'present',
    critical: true,
    aiSuggested: true,
    source: 'ai-detected',
    rationale: 'Nuchal rigidity in context of sudden severe headache significantly increases probability of subarachnoid hemorrhage.',
  },
  {
    id: 'f3',
    text: 'Altered mental status / confusion',
    status: 'present',
    critical: true,
    aiSuggested: true,
    source: 'patient-reported',
    rationale: 'Any neurological deficit accompanying thunderclap headache mandates emergent workup.',
  },
  {
    id: 'f4',
    text: 'Photophobia',
    status: 'unknown',
    aiSuggested: true,
    source: 'ai-detected',
    rationale: 'Light sensitivity often accompanies meningeal irritation; assess during examination.',
  },
  {
    id: 'f5',
    text: 'Nausea / vomiting',
    status: 'present',
    aiSuggested: true,
    source: 'patient-reported',
    rationale: 'Nausea with severe headache supports increased intracranial pressure.',
  },
  {
    id: 'f6',
    text: 'Vision changes / diplopia',
    status: 'absent',
    aiSuggested: true,
    source: 'patient-reported',
    rationale: 'No visual disturbances reported; helps narrow differential.',
  },
  {
    id: 'f7',
    text: 'Recent head trauma',
    status: 'absent',
    aiSuggested: true,
    source: 'patient-reported',
    rationale: 'Patient denies any recent trauma.',
  },
];

// Tab definitions matching HTML prototype
const TABS = [
  { id: 'summary', label: 'Pre-Visit Summary', icon: FileText },
  { id: 'differential', label: 'AI Differential', icon: Brain },
  { id: 'treatment', label: 'Treatment Options', icon: Activity },
  { id: 'guidelines', label: 'Clinical Guidelines', icon: Shield },
];

export default function PatientAssessment() {
  const [activeTab, setActiveTab] = useState('summary');
  const [findings, setFindings] = useState<Finding[]>(INITIAL_FINDINGS);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showCriticalAlert, setShowCriticalAlert] = useState(true);
  const [allSectionsCollapsed, setAllSectionsCollapsed] = useState(false);

  // Handle finding status change
  const handleStatusChange = (findingId: string, status: FindingStatus) => {
    setFindings(prev => 
      prev.map(f => f.id === findingId ? { ...f, status } : f)
    );
  };

  // Count critical present findings
  const criticalPresentCount = findings.filter(
    f => f.critical && f.status === 'present'
  ).length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Critical Alert Banner - HTML Prototype Style */}
        {showCriticalAlert && criticalPresentCount > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <SimpleCriticalAlert
              title="Clinical Decision Support Alert"
              message={`Patient reports "${DEMO_PATIENT.chiefComplaint}" - Consider ruling out subarachnoid hemorrhage. ${criticalPresentCount} critical findings present.`}
              actionLabel="View Emergency Protocol"
              onAction={() => setShowEmergencyModal(true)}
              onDismiss={() => setShowCriticalAlert(false)}
            />
          </div>
        )}

        {/* Patient Banner - HTML Prototype Style */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <PatientBanner
            patient={DEMO_PATIENT}
            showRedFlags={true}
            onToggleAll={() => setAllSectionsCollapsed(!allSectionsCollapsed)}
            allCollapsed={allSectionsCollapsed}
          />
        </div>

        {/* Quick Actions Bar - HTML Prototype Style */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <QuickActionsBar
            currentPage="diagnosis"
            patientId={DEMO_PATIENT.id}
            showBackButton={true}
            backButtonLabel="Back to Queue"
            backButtonHref="/"
            showEmergencyButton={criticalPresentCount > 0}
            onEmergencyProtocol={() => setShowEmergencyModal(true)}
            onCollapseAll={() => setAllSectionsCollapsed(true)}
            onExpandAll={() => setAllSectionsCollapsed(false)}
            allCollapsed={allSectionsCollapsed}
          />
        </div>

        {/* Tab Navigation - HTML Prototype Style */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="tabs-container flex" role="tablist">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab flex items-center gap-2 ${
                      activeTab === tab.id ? 'active' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tab Content */}
              {activeTab === 'summary' && (
                <>
                  {/* Findings Section - HTML Prototype Style */}
                  <FindingList
                    findings={findings}
                    onStatusChange={handleStatusChange}
                    title="Clinical Findings Assessment"
                    showAddButton={true}
                    onAddFinding={() => {
                      const newFinding: Finding = {
                        id: `f${findings.length + 1}`,
                        text: 'New custom finding',
                        status: 'unknown',
                        source: 'provider-added',
                      };
                      setFindings([...findings, newFinding]);
                    }}
                  />

                  {/* COMPASS Assessment Summary */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-purple-600" />
                      COMPASS Assessment Summary
                    </h3>
                    <div className="prose prose-sm max-w-none text-gray-600">
                      <p>
                        Patient is a 32-year-old female presenting with sudden onset severe headache 
                        described as "the worst headache of my life" accompanied by confusion and 
                        neck stiffness. Symptom onset was approximately 2 hours ago.
                      </p>
                      <p className="mt-4">
                        <strong className="text-red-600">Red Flags Identified:</strong>
                      </p>
                      <ul className="mt-2 space-y-1">
                        <li>Thunderclap headache (sudden onset, maximal at onset)</li>
                        <li>Altered mental status</li>
                        <li>Meningismus/neck stiffness</li>
                      </ul>
                      <p className="mt-4">
                        <strong className="text-purple-600">AI Recommendation:</strong> 
                        {' '}Urgent evaluation for subarachnoid hemorrhage. Consider immediate 
                        CT head without contrast followed by lumbar puncture if CT negative.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'differential' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    AI Differential Diagnosis
                  </h3>
                  
                  {/* Differential list with probabilities */}
                  <div className="space-y-4">
                    {[
                      { diagnosis: 'Subarachnoid Hemorrhage (SAH)', probability: 45, urgency: 'critical' },
                      { diagnosis: 'Bacterial Meningitis', probability: 25, urgency: 'critical' },
                      { diagnosis: 'Viral Meningitis', probability: 15, urgency: 'high' },
                      { diagnosis: 'Severe Migraine with Aura', probability: 10, urgency: 'moderate' },
                      { diagnosis: 'Hypertensive Emergency', probability: 5, urgency: 'high' },
                    ].map((item, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border-l-4 ${
                          item.urgency === 'critical' ? 'border-l-red-500 bg-red-50' :
                          item.urgency === 'high' ? 'border-l-amber-500 bg-amber-50' :
                          'border-l-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{item.diagnosis}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  item.urgency === 'critical' ? 'bg-red-500' :
                                  item.urgency === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${item.probability}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 w-12">
                              {item.probability}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-800">AI Reasoning</p>
                        <p className="text-sm text-purple-700 mt-1">
                          Given the classic presentation of thunderclap headache with meningismus 
                          and altered mental status, subarachnoid hemorrhage must be ruled out 
                          emergently. The Ottawa SAH Rule would classify this patient as high risk.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'treatment' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    Recommended Treatment Plan
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Treatment recommendations will be available after diagnostic workup is complete.
                  </p>
                </div>
              )}

              {activeTab === 'guidelines' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    Clinical Guidelines
                  </h3>
                  <div className="space-y-3">
                    <a href="#" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <p className="text-sm font-medium text-blue-800">AHA/ASA Guidelines</p>
                      <p className="text-xs text-blue-600 mt-1">Management of Aneurysmal Subarachnoid Hemorrhage</p>
                    </a>
                    <a href="#" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <p className="text-sm font-medium text-blue-800">ACEP Clinical Policy</p>
                      <p className="text-xs text-blue-600 mt-1">Critical Issues in Evaluation of Adult Patients with Acute Headache</p>
                    </a>
                    <a href="#" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <p className="text-sm font-medium text-blue-800">Ottawa SAH Rule</p>
                      <p className="text-xs text-blue-600 mt-1">Clinical Decision Rule for SAH</p>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Orders & Actions */}
            <div className="space-y-6">
              {/* Order Summary Card */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Pending Orders
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">CT Head w/o Contrast</p>
                      <p className="text-xs text-red-600">STAT</p>
                    </div>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">CBC, BMP, Coags</p>
                      <p className="text-xs text-amber-600">URGENT</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                </div>
                <div className="p-4 border-t bg-gray-50">
                  <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium">
                    Sign All Orders
                  </button>
                </div>
              </div>

              {/* Clinical Guidelines Quick Access */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Quick Guidelines
                </h3>
                <div className="space-y-2">
                  <a href="#" className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <p className="text-sm font-medium text-blue-800">Ottawa SAH Rule</p>
                    <p className="text-xs text-blue-600">Sensitivity: 100%</p>
                  </a>
                  <a href="#" className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <p className="text-sm font-medium text-blue-800">Hunt & Hess Scale</p>
                    <p className="text-xs text-blue-600">SAH Grading</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Protocol Modal */}
        <EmergencyProtocolModal
          isOpen={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          patientName={DEMO_PATIENT.name}
          chiefComplaint={DEMO_PATIENT.chiefComplaint}
          redFlags={DEMO_PATIENT.redFlags}
          onOrderStatLabs={(labs) => console.log('Ordering STAT labs:', labs)}
          onOrderStatImaging={(imaging) => console.log('Ordering STAT imaging:', imaging)}
          onRequestConsult={(specialty) => console.log('Requesting consult:', specialty)}
        />
      </div>
    </DashboardLayout>
  );
}
