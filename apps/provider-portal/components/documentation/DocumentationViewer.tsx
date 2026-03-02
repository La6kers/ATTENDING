// ============================================================
// ATTENDING AI - Documentation Viewer & Editor
// apps/provider-portal/components/documentation/DocumentationViewer.tsx
//
// Revolutionary Feature: AI-generated clinical documentation
// with provider editing, signing, and export capabilities
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Edit3,
  Check,
  X,
  Copy,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
} from 'lucide-react';

// Types from documentation engine
interface DiagnosisEntry {
  diagnosis: string;
  icd10: string;
  probability: 'high' | 'moderate' | 'low';
  supportingFindings: string[];
  excludingFindings: string[];
}

interface MDMCalculation {
  level: 1 | 2 | 3 | 4 | 5;
  complexity: 'straightforward' | 'low' | 'moderate' | 'high';
  dataPoints: number;
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high';
  reasoning: string;
}

interface CodingSuggestion {
  primaryDiagnosis: { code: string; description: string };
  secondaryDiagnoses: { code: string; description: string }[];
  emCode: string;
  emLevel: string;
  cptCodes: { code: string; description: string }[];
}

interface DocumentationOutput {
  hpi: string;
  ros: string;
  assessment: {
    chiefComplaint: string;
    differentialDiagnoses: DiagnosisEntry[];
    workingDiagnosis: string;
    clinicalReasoning: string;
  };
  plan: {
    diagnosticPlan: string[];
    treatmentPlan: string[];
    patientEducation: string[];
    followUp: string;
    disposition: string;
  };
  mdm: MDMCalculation;
  fullNote: string;
  codes: CodingSuggestion;
}

interface DocumentationViewerProps {
  documentation: DocumentationOutput;
  patientName: string;
  encounterId: string;
  onSave?: (documentation: DocumentationOutput) => void;
  onSign?: (documentation: DocumentationOutput) => void;
  onExport?: (format: 'pdf' | 'text' | 'hl7') => void;
  onRegenerate?: () => void;
  isEditable?: boolean;
  isSigned?: boolean;
  signedBy?: string;
  signedAt?: Date;
}

type SectionKey = 'hpi' | 'ros' | 'assessment' | 'plan' | 'codes';

export function DocumentationViewer({
  documentation,
  patientName,
  encounterId,
  onSave,
  onSign,
  onExport,
  onRegenerate,
  isEditable = true,
  isSigned = false,
  signedBy,
  signedAt,
}: DocumentationViewerProps) {
  // State
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['hpi', 'assessment', 'plan'])
  );
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [editedContent, setEditedContent] = useState<Record<SectionKey, string>>({
    hpi: documentation.hpi,
    ros: documentation.ros,
    assessment: documentation.assessment.clinicalReasoning,
    plan: documentation.plan.diagnosticPlan.join('\n'),
    codes: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);

  // Toggle section expansion
  const toggleSection = useCallback((section: SectionKey) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Start editing a section
  const startEditing = useCallback((section: SectionKey) => {
    if (!isEditable || isSigned) return;
    setEditingSection(section);
  }, [isEditable, isSigned]);

  // Save edits
  const saveEdits = useCallback(() => {
    setEditingSection(null);
    setHasUnsavedChanges(true);
  }, []);

  // Cancel edits
  const cancelEdits = useCallback((section: SectionKey) => {
    setEditedContent(prev => ({
      ...prev,
      [section]: section === 'hpi' ? documentation.hpi : 
                 section === 'ros' ? documentation.ros :
                 section === 'assessment' ? documentation.assessment.clinicalReasoning :
                 documentation.plan.diagnosticPlan.join('\n'),
    }));
    setEditingSection(null);
  }, [documentation]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // MDM badge color
  const mdmBadgeColor = useMemo(() => {
    switch (documentation.mdm.complexity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  }, [documentation.mdm.complexity]);

  // Probability badge color
  const probabilityColor = (prob: string) => {
    switch (prob) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'moderate': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Section header component
  const SectionHeader = ({ 
    title, 
    section, 
    icon: Icon 
  }: { 
    title: string; 
    section: SectionKey; 
    icon: React.ElementType;
  }) => (
    <div
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-2">
        {expandedSections.has(section) ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <Icon className="w-4 h-4 text-teal-600" />
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      {isEditable && !isSigned && expandedSections.has(section) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            startEditing(section);
          }}
          className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Clinical Documentation</h2>
              <p className="text-teal-200 text-sm">{patientName} • Encounter #{encounterId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* MDM Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${mdmBadgeColor}`}>
              Level {documentation.mdm.level} MDM
            </span>
            {/* Signed Badge */}
            {isSigned && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Signed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onRegenerate && !isSigned && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          )}
          <button
            onClick={() => copyToClipboard(documentation.fullNote)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy All
          </button>
          {onExport && (
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-10 min-w-32">
                <button
                  onClick={() => onExport('pdf')}
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => onExport('text')}
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export as Text
                </button>
                <button
                  onClick={() => onExport('hl7')}
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export as HL7
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Unsaved changes
            </span>
          )}
          {onSave && hasUnsavedChanges && !isSigned && (
            <button
              onClick={() => {
                onSave(documentation);
                setHasUnsavedChanges(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Save Draft
            </button>
          )}
          {onSign && !isSigned && (
            <button
              onClick={() => onSign(documentation)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Sign & Submit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Chief Complaint */}
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <h3 className="text-sm font-medium text-teal-800 mb-1">Chief Complaint</h3>
          <p className="text-teal-900">{documentation.assessment.chiefComplaint}</p>
        </div>

        {/* HPI Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title="History of Present Illness" section="hpi" icon={FileText} />
          {expandedSections.has('hpi') && (
            <div className="p-4">
              {editingSection === 'hpi' ? (
                <div>
                  <textarea
                    value={editedContent.hpi}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, hpi: e.target.value }))}
                    className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => cancelEdits('hpi')}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdits}
                      className="px-3 py-1.5 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{editedContent.hpi}</p>
              )}
            </div>
          )}
        </div>

        {/* ROS Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title="Review of Systems" section="ros" icon={FileText} />
          {expandedSections.has('ros') && (
            <div className="p-4">
              {editingSection === 'ros' ? (
                <div>
                  <textarea
                    value={editedContent.ros}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, ros: e.target.value }))}
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-mono text-sm"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => cancelEdits('ros')} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={saveEdits} className="px-3 py-1.5 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg">Save</button>
                  </div>
                </div>
              ) : (
                <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm">{editedContent.ros}</pre>
              )}
            </div>
          )}
        </div>

        {/* Assessment Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title="Assessment" section="assessment" icon={AlertTriangle} />
          {expandedSections.has('assessment') && (
            <div className="p-4 space-y-4">
              {/* Working Diagnosis */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Working Diagnosis</h4>
                <p className="text-blue-900 font-medium">{documentation.assessment.workingDiagnosis}</p>
              </div>

              {/* Differential Diagnoses */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Differential Diagnoses</h4>
                <div className="space-y-2">
                  {documentation.assessment.differentialDiagnoses.map((dx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{dx.diagnosis}</span>
                        <span className="text-gray-500 ml-2 text-sm">({dx.icd10})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${probabilityColor(dx.probability)}`}>
                        {dx.probability}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Reasoning */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Clinical Reasoning</h4>
                {editingSection === 'assessment' ? (
                  <div>
                    <textarea
                      value={editedContent.assessment}
                      onChange={(e) => setEditedContent(prev => ({ ...prev, assessment: e.target.value }))}
                      className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => cancelEdits('assessment')} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button onClick={saveEdits} className="px-3 py-1.5 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg">Save</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700">{editedContent.assessment}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Plan Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title="Plan" section="plan" icon={CheckCircle} />
          {expandedSections.has('plan') && (
            <div className="p-4 space-y-4">
              {documentation.plan.diagnosticPlan.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Diagnostic Plan</h4>
                  <ul className="space-y-1">
                    {documentation.plan.diagnosticPlan.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-teal-500 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {documentation.plan.treatmentPlan.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Treatment Plan</h4>
                  <ul className="space-y-1">
                    {documentation.plan.treatmentPlan.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-500 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Follow-up</h4>
                  <p className="text-gray-900 text-sm">{documentation.plan.followUp}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Disposition</h4>
                  <p className="text-gray-900 text-sm">{documentation.plan.disposition}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coding Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <SectionHeader title="Coding & Billing" section="codes" icon={FileText} />
          {expandedSections.has('codes') && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-xs font-medium text-green-800 uppercase mb-1">E/M Code</h4>
                  <p className="text-green-900 font-mono font-bold">{documentation.codes.emCode}</p>
                  <p className="text-green-700 text-sm">{documentation.codes.emLevel}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-xs font-medium text-blue-800 uppercase mb-1">Primary Diagnosis</h4>
                  <p className="text-blue-900 font-mono font-bold">{documentation.codes.primaryDiagnosis.code}</p>
                  <p className="text-blue-700 text-sm">{documentation.codes.primaryDiagnosis.description}</p>
                </div>
              </div>

              {documentation.codes.secondaryDiagnoses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Secondary Diagnoses</h4>
                  <div className="flex flex-wrap gap-2">
                    {documentation.codes.secondaryDiagnoses.map((dx, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        <span className="font-mono">{dx.code}</span>
                        <span className="text-gray-500 ml-1">- {dx.description}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* MDM Justification */}
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-xs font-medium text-amber-800 uppercase mb-2">MDM Justification</h4>
                <pre className="text-amber-900 text-sm whitespace-pre-wrap font-sans">{documentation.mdm.reasoning}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Signature Block */}
        {isSigned && signedBy && signedAt && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">Electronically Signed</p>
                <p className="text-green-700 text-sm">
                  {signedBy} • {signedAt.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copy Toast */}
      {showCopyToast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-green-400" />
          Copied to clipboard
        </div>
      )}
    </div>
  );
}

export default DocumentationViewer;
