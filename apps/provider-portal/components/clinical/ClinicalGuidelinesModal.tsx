// ============================================================
// ATTENDING AI - Clinical Guidelines Modal
// apps/provider-portal/components/clinical/ClinicalGuidelinesModal.tsx
//
// Comprehensive clinical guidelines display for providers
// - Diagnostic criteria tabs
// - Physical exam maneuvers with video links
// - Treatment algorithms
// - Red flags and warnings
// - Downloadable resources
// ============================================================

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Stethoscope, Pill, AlertTriangle, Download, Video, ChevronRight, ExternalLink, CheckCircle } from 'lucide-react';

// Types
interface DiagnosticCriteria {
  name: string;
  criteria: string[];
  source: string;
  year: number;
}

interface PhysicalExamManeuver {
  name: string;
  description: string;
  interpretation: string;
  sensitivity?: number;
  specificity?: number;
  videoUrl?: string;
}

interface TreatmentStep {
  step: number;
  action: string;
  details: string;
  dosing?: string;
  contraindications?: string[];
}

interface RedFlag {
  symptom: string;
  implication: string;
  action: string;
}

interface ClinicalGuideline {
  id: string;
  condition: string;
  icd10Codes: string[];
  lastUpdated: string;
  evidenceLevel: 'A' | 'B' | 'C';
  diagnosticCriteria: DiagnosticCriteria[];
  physicalExam: PhysicalExamManeuver[];
  treatmentAlgorithm: TreatmentStep[];
  medications: {
    firstLine: { name: string; dosing: string; notes?: string }[];
    alternatives: { name: string; dosing: string; notes?: string }[];
  };
  redFlags: RedFlag[];
  resources: { name: string; url: string; type: 'pdf' | 'video' | 'link' }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conditionId: string;
  conditionName: string;
}

// Mock guidelines data - in production, fetch from API
const CLINICAL_GUIDELINES: Record<string, ClinicalGuideline> = {
  'migraine': {
    id: 'migraine',
    condition: 'Migraine with Aura',
    icd10Codes: ['G43.1', 'G43.10', 'G43.11'],
    lastUpdated: '2024-01-15',
    evidenceLevel: 'A',
    diagnosticCriteria: [
      {
        name: 'ICHD-3 Criteria',
        criteria: [
          'At least 2 attacks fulfilling criteria B and C',
          'One or more fully reversible aura symptoms (visual, sensory, speech)',
          'At least 3 of: aura develops over ≥5 min, symptoms last 5-60 min, headache within 60 min',
          'Not better accounted for by another ICHD-3 diagnosis'
        ],
        source: 'International Headache Society',
        year: 2018
      }
    ],
    physicalExam: [
      {
        name: 'Fundoscopic Exam',
        description: 'Direct visualization of optic disc and retina',
        interpretation: 'Rule out papilledema suggesting increased ICP',
        sensitivity: 90,
        specificity: 87,
        videoUrl: 'https://example.com/fundoscopy'
      },
      {
        name: 'Jolt Accentuation',
        description: 'Patient rotates head horizontally 2-3 times per second',
        interpretation: 'Positive if headache worsens - suggests meningitis',
        sensitivity: 97,
        specificity: 60
      }
    ],
    treatmentAlgorithm: [
      {
        step: 1,
        action: 'Assess severity and rule out secondary causes',
        details: 'Consider CT/LP if thunderclap onset, fever, or focal deficits',
        contraindications: ['Defer treatment if secondary cause suspected']
      },
      {
        step: 2,
        action: 'Acute treatment for mild-moderate migraine',
        details: 'Start with NSAIDs or acetaminophen',
        dosing: 'Ibuprofen 400-800mg or Naproxen 500-550mg'
      },
      {
        step: 3,
        action: 'Triptans for moderate-severe or NSAID failure',
        details: 'Contraindicated in CAD, uncontrolled HTN, prior stroke',
        dosing: 'Sumatriptan 50-100mg PO or 6mg SC'
      }
    ],
    medications: {
      firstLine: [
        { name: 'Sumatriptan', dosing: '50-100mg PO, may repeat x1 after 2h', notes: 'Max 200mg/day' },
        { name: 'Rizatriptan', dosing: '10mg PO, may repeat x1 after 2h', notes: 'Max 30mg/day' },
        { name: 'Ibuprofen', dosing: '400-800mg PO', notes: 'Take with food' }
      ],
      alternatives: [
        { name: 'Naproxen', dosing: '500-550mg PO', notes: 'Longer half-life' },
        { name: 'Metoclopramide', dosing: '10mg IV/IM', notes: 'For nausea, enhances NSAID absorption' }
      ]
    },
    redFlags: [
      { symptom: 'Thunderclap onset', implication: 'SAH until proven otherwise', action: 'Stat CT, LP if negative' },
      { symptom: 'Fever + headache', implication: 'Meningitis', action: 'LP, empiric antibiotics' },
      { symptom: 'New onset >50 years', implication: 'GCA, mass lesion', action: 'ESR/CRP, consider CT/MRI' },
      { symptom: 'Worst headache of life', implication: 'SAH, CVT, dissection', action: 'Urgent imaging' }
    ],
    resources: [
      { name: 'AHS Treatment Guidelines 2024', url: '#', type: 'pdf' },
      { name: 'Fundoscopy Technique Video', url: '#', type: 'video' },
      { name: 'Patient Migraine Diary', url: '#', type: 'pdf' }
    ]
  },
  'chest-pain': {
    id: 'chest-pain',
    condition: 'Acute Coronary Syndrome',
    icd10Codes: ['I21', 'I20.0', 'I24.9'],
    lastUpdated: '2024-02-01',
    evidenceLevel: 'A',
    diagnosticCriteria: [
      {
        name: 'ACC/AHA Criteria',
        criteria: [
          'Chest pain or equivalent symptoms (dyspnea, diaphoresis)',
          'ECG changes: ST elevation, ST depression, T-wave inversions, new LBBB',
          'Elevated cardiac biomarkers (troponin)',
          'Risk stratification using HEART or TIMI score'
        ],
        source: 'American College of Cardiology',
        year: 2023
      }
    ],
    physicalExam: [
      {
        name: 'JVD Assessment',
        description: 'Assess jugular venous distension at 45 degrees',
        interpretation: 'Elevated JVP suggests RV infarct or heart failure',
        sensitivity: 65,
        specificity: 90
      },
      {
        name: 'S3/S4 Auscultation',
        description: 'Listen for gallops with bell at apex',
        interpretation: 'S3 = acute HF, S4 = stiff LV',
        sensitivity: 50,
        specificity: 85
      }
    ],
    treatmentAlgorithm: [
      {
        step: 1,
        action: 'Immediate assessment and stabilization',
        details: 'ECG within 10 minutes, establish IV access, continuous monitoring',
        contraindications: []
      },
      {
        step: 2,
        action: 'STEMI: Activate cath lab',
        details: 'Door-to-balloon time <90 minutes goal',
        dosing: 'Aspirin 325mg chewed, heparin bolus'
      },
      {
        step: 3,
        action: 'NSTEMI/UA: Risk stratification',
        details: 'TIMI/GRACE score, serial troponins, consider early invasive strategy',
        dosing: 'Aspirin, P2Y12 inhibitor, anticoagulation'
      }
    ],
    medications: {
      firstLine: [
        { name: 'Aspirin', dosing: '325mg chewed immediately', notes: 'No allergy/bleeding' },
        { name: 'Nitroglycerin', dosing: '0.4mg SL q5min x3', notes: 'Avoid if RV infarct, hypotensive' },
        { name: 'Heparin', dosing: '60 U/kg bolus, 12 U/kg/hr', notes: 'Weight-based dosing' }
      ],
      alternatives: [
        { name: 'Morphine', dosing: '2-4mg IV prn', notes: 'Caution: may mask symptoms' },
        { name: 'Ticagrelor', dosing: '180mg loading', notes: 'Alternative to clopidogrel' }
      ]
    },
    redFlags: [
      { symptom: 'ST elevation', implication: 'STEMI - urgent reperfusion', action: 'Cath lab activation' },
      { symptom: 'Cardiogenic shock', implication: 'Massive MI, mechanical complication', action: 'ICU, pressors, emergent cath' },
      { symptom: 'Widened mediastinum', implication: 'Aortic dissection', action: 'Stat CT angio, BP control' }
    ],
    resources: [
      { name: 'ACC STEMI Guidelines 2024', url: '#', type: 'pdf' },
      { name: 'HEART Score Calculator', url: '#', type: 'link' },
      { name: 'ECG Interpretation Guide', url: '#', type: 'pdf' }
    ]
  }
};

type TabType = 'criteria' | 'exam' | 'treatment' | 'medications' | 'redflags';

export const ClinicalGuidelinesModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  conditionId, 
  conditionName 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('criteria');
  const [guideline, setGuideline] = useState<ClinicalGuideline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && conditionId) {
      setLoading(true);
      // Simulate API fetch - in production, call actual API
      setTimeout(() => {
        const guidelineData = CLINICAL_GUIDELINES[conditionId] || CLINICAL_GUIDELINES['migraine'];
        setGuideline(guidelineData);
        setLoading(false);
      }, 300);
    }
  }, [isOpen, conditionId]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'criteria', label: 'Diagnostic Criteria', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'exam', label: 'Physical Exam', icon: <Stethoscope className="w-4 h-4" /> },
    { id: 'treatment', label: 'Treatment Algorithm', icon: <ChevronRight className="w-4 h-4" /> },
    { id: 'medications', label: 'Medications', icon: <Pill className="w-4 h-4" /> },
    { id: 'redflags', label: 'Red Flags', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const getEvidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{conditionName || guideline?.condition}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {guideline && (
                    <>
                      <span className="text-purple-200 text-sm">
                        ICD-10: {guideline.icd10Codes.join(', ')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getEvidenceBadgeColor(guideline.evidenceLevel)}`}>
                        Level {guideline.evidenceLevel} Evidence
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : guideline ? (
              <>
                {/* Diagnostic Criteria Tab */}
                {activeTab === 'criteria' && (
                  <div className="space-y-6">
                    {guideline.diagnosticCriteria.map((criteria, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{criteria.name}</h3>
                          <span className="text-xs text-gray-500">
                            {criteria.source} ({criteria.year})
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {criteria.criteria.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Physical Exam Tab */}
                {activeTab === 'exam' && (
                  <div className="space-y-4">
                    {guideline.physicalExam.map((exam, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                          {exam.videoUrl && (
                            <a 
                              href={exam.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm"
                            >
                              <Video className="w-4 h-4" />
                              Watch
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{exam.description}</p>
                        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm">
                          <span className="font-medium text-blue-800">Interpretation:</span>
                          <span className="text-blue-700 ml-1">{exam.interpretation}</span>
                        </div>
                        {(exam.sensitivity || exam.specificity) && (
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            {exam.sensitivity && <span>Sensitivity: {exam.sensitivity}%</span>}
                            {exam.specificity && <span>Specificity: {exam.specificity}%</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Treatment Algorithm Tab */}
                {activeTab === 'treatment' && (
                  <div className="space-y-4">
                    {guideline.treatmentAlgorithm.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-sm">{step.step}</span>
                        </div>
                        <div className="flex-1 border-l-2 border-purple-200 pl-4 pb-4">
                          <h3 className="font-semibold text-gray-900">{step.action}</h3>
                          <p className="text-sm text-gray-600 mt-1">{step.details}</p>
                          {step.dosing && (
                            <div className="mt-2 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
                              <span className="font-medium text-green-800">Dosing:</span>
                              <span className="text-green-700 ml-1">{step.dosing}</span>
                            </div>
                          )}
                          {step.contraindications && step.contraindications.length > 0 && (
                            <div className="mt-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">
                              <span className="font-medium text-red-800">Contraindications:</span>
                              <ul className="text-red-700 ml-4 list-disc">
                                {step.contraindications.map((ci, ciIdx) => (
                                  <li key={ciIdx}>{ci}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Medications Tab */}
                {activeTab === 'medications' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        First-Line Medications
                      </h3>
                      <div className="grid gap-3">
                        {guideline.medications.firstLine.map((med, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{med.name}</span>
                              <span className="text-sm text-gray-500">{med.dosing}</span>
                            </div>
                            {med.notes && (
                              <p className="text-xs text-gray-500 mt-1">{med.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        Alternative Medications
                      </h3>
                      <div className="grid gap-3">
                        {guideline.medications.alternatives.map((med, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{med.name}</span>
                              <span className="text-sm text-gray-500">{med.dosing}</span>
                            </div>
                            {med.notes && (
                              <p className="text-xs text-gray-500 mt-1">{med.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Red Flags Tab */}
                {activeTab === 'redflags' && (
                  <div className="space-y-3">
                    {guideline.redFlags.map((flag, idx) => (
                      <div key={idx} className="border-l-4 border-red-500 bg-red-50 rounded-r-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-red-800">{flag.symptom}</h4>
                            <p className="text-sm text-red-700 mt-1">
                              <span className="font-medium">Implication:</span> {flag.implication}
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                              <span className="font-medium">Action:</span> {flag.action}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No guidelines available for this condition
              </div>
            )}
          </div>

          {/* Footer with Resources */}
          {guideline && guideline.resources.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Resources</span>
                <div className="flex gap-2">
                  {guideline.resources.map((resource, idx) => (
                    <a
                      key={idx}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {resource.type === 'pdf' && <Download className="w-4 h-4 text-red-500" />}
                      {resource.type === 'video' && <Video className="w-4 h-4 text-blue-500" />}
                      {resource.type === 'link' && <ExternalLink className="w-4 h-4 text-purple-500" />}
                      <span className="text-gray-700">{resource.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalGuidelinesModal;
