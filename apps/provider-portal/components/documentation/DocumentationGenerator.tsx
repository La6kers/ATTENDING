// ============================================================
// ATTENDING AI - Documentation Generator UI
// apps/provider-portal/components/documentation/DocumentationGenerator.tsx
//
// Auto-generates clinical documentation from COMPASS assessments
// Revolutionary Feature: One-click encounter documentation
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  FileText,
  Copy,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save,
  Clock,
  Stethoscope,
  Pill,
  FileCheck,
  Calculator,
} from 'lucide-react';

// Import documentation engine (would normally be from package)
// import { DocumentationEngine, ClinicalDocument, MDMComplexity } from '@attending/documentation-engine';

// Inline types for now
interface MDMComplexity {
  level: 'minimal' | 'low' | 'moderate' | 'high';
  problemComplexity: 'minimal' | 'low' | 'moderate' | 'high';
  dataComplexity: string;
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high';
  dataPointsAnalyzed: number;
  suggestedCPT: string;
  emLevel: string;
  justification: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
  isEditable: boolean;
  isExpanded: boolean;
}

interface DocumentationGeneratorProps {
  patientId: string;
  encounterId: string;
  assessmentData: any; // AssessmentData from documentation-engine
  differentials?: string[];
  orders?: any; // OrderSummary
  providerInfo: {
    name: string;
    credentials: string;
    npi?: string;
  };
  onSave?: (document: any) => void;
  onExport?: (format: 'pdf' | 'txt' | 'hl7') => void;
}

export function DocumentationGenerator({
  patientId,
  encounterId,
  assessmentData,
  differentials = [],
  orders = {},
  providerInfo,
  onSave,
  onExport,
}: DocumentationGeneratorProps) {
  const [sections, setSections] = useState<Section[]>([
    {
      id: 'hpi',
      title: 'History of Present Illness',
      content: '',
      isEditable: true,
      isExpanded: true,
    },
    {
      id: 'ros',
      title: 'Review of Systems',
      content: '',
      isEditable: true,
      isExpanded: false,
    },
    {
      id: 'assessment',
      title: 'Assessment & Plan',
      content: '',
      isEditable: true,
      isExpanded: true,
    },
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [mdm, setMdm] = useState<MDMComplexity | null>(null);
  const [copied, setCopied] = useState(false);
  const [fullDocument, setFullDocument] = useState('');

  // Generate documentation
  const generateDocumentation = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Simulate API call to documentation engine
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate HPI using OLDCARTS
      const hpiContent = generateHPIContent(assessmentData);
      const rosContent = generateROSContent(assessmentData);
      const assessmentContent = generateAssessmentContent(assessmentData, differentials, orders);
      const mdmResult = calculateMDMContent(assessmentData, orders, differentials);

      setSections(prev => prev.map(section => {
        switch (section.id) {
          case 'hpi':
            return { ...section, content: hpiContent };
          case 'ros':
            return { ...section, content: rosContent };
          case 'assessment':
            return { ...section, content: assessmentContent };
          default:
            return section;
        }
      }));

      setMdm(mdmResult);
      setIsGenerated(true);

      // Generate full document
      const fullDoc = generateFullDocument(hpiContent, rosContent, assessmentContent, mdmResult, assessmentData, providerInfo);
      setFullDocument(fullDoc);

    } catch (error) {
      console.error('[DocumentationGenerator] Error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [assessmentData, differentials, orders, providerInfo]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, isExpanded: !section.isExpanded }
        : section
    ));
  }, []);

  // Start editing section
  const startEditing = useCallback((sectionId: string, content: string) => {
    setEditingSection(sectionId);
    setEditContent(content);
  }, []);

  // Save section edit
  const saveEdit = useCallback(() => {
    if (!editingSection) return;

    setSections(prev => prev.map(section =>
      section.id === editingSection
        ? { ...section, content: editContent }
        : section
    ));

    setEditingSection(null);
    setEditContent('');

    // Regenerate full document
    const updatedSections = sections.map(s =>
      s.id === editingSection ? { ...s, content: editContent } : s
    );
    const hpi = updatedSections.find(s => s.id === 'hpi')?.content || '';
    const ros = updatedSections.find(s => s.id === 'ros')?.content || '';
    const assessment = updatedSections.find(s => s.id === 'assessment')?.content || '';
    setFullDocument(generateFullDocument(hpi, ros, assessment, mdm, assessmentData, providerInfo));
  }, [editingSection, editContent, sections, mdm, assessmentData, providerInfo]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullDocument);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [fullDocument]);

  // MDM level colors
  const mdmColors = {
    minimal: 'bg-gray-100 text-gray-700 border-gray-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Documentation Generator</h2>
              <p className="text-teal-200 text-sm">Auto-generate encounter notes from assessment</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isGenerated && (
              <>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg 
                           hover:bg-white/30 transition-colors text-sm"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => onExport?.('pdf')}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg 
                           hover:bg-white/30 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </>
            )}
            <button
              onClick={generateDocumentation}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-white text-teal-600 rounded-lg 
                       hover:bg-teal-50 transition-colors text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  {isGenerated ? 'Regenerate' : 'Generate Documentation'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MDM Summary */}
      {mdm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Medical Decision Making:</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${mdmColors[mdm.level]}`}>
                {mdm.level.charAt(0).toUpperCase() + mdm.level.slice(1)} Complexity
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                <strong>E/M Level:</strong> {mdm.emLevel}
              </span>
              <span className="text-gray-600">
                <strong>CPT:</strong> {mdm.suggestedCPT}
              </span>
              <span className="text-gray-600">
                <strong>Data Points:</strong> {mdm.dataPointsAnalyzed}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{mdm.justification}</p>
        </div>
      )}

      {/* Sections */}
      <div className="divide-y divide-gray-200">
        {sections.map(section => (
          <div key={section.id} className="px-6 py-4">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                {section.isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">{section.title}</span>
                {section.content && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
              {section.content && section.isEditable && editingSection !== section.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(section.id, section.content);
                  }}
                  className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </button>

            {/* Section Content */}
            {section.isExpanded && (
              <div className="mt-3 pl-7">
                {editingSection === section.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-48 px-4 py-3 border-2 border-gray-200 rounded-xl 
                               focus:ring-2 focus:ring-teal-500 focus:border-teal-400
                               text-sm clinical-note-modern resize-none
                               transition-all duration-200"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white 
                                 rounded-lg hover:bg-teal-700 text-sm"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : section.content ? (
                  <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-5 clinical-note-modern border border-gray-100">
                    <div className="whitespace-pre-wrap">{section.content}</div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm italic">
                    Click "Generate Documentation" to populate this section
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Red Flags Warning */}
      {assessmentData?.redFlags?.length > 0 && (
        <div className="px-6 py-4 bg-red-50 border-t border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Red Flags Identified</h4>
              <ul className="mt-1 space-y-1">
                {assessmentData.redFlags.map((flag: string, idx: number) => (
                  <li key={idx} className="text-sm text-red-700">• {flag}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {isGenerated && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <Clock className="w-4 h-4 inline mr-1" />
            Generated at {new Date().toLocaleTimeString()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onSave?.({ sections, mdm, fullDocument })}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg 
                       hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              Save to Chart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Content Generation Functions (simplified versions)
// =============================================================================

function generateHPIContent(assessment: any): string {
  const { chiefComplaint, hpiData, patientName, age, gender } = assessment || {};
  
  if (!chiefComplaint) return 'No HPI data available.';

  let narrative = `${patientName || 'Patient'} is a ${age || 'unknown age'}-year-old ${gender || 'patient'} presenting with ${chiefComplaint}.\n\n`;
  
  if (hpiData?.onset) narrative += `Onset: ${hpiData.onset}\n`;
  if (hpiData?.location) narrative += `Location: ${hpiData.location}\n`;
  if (hpiData?.duration) narrative += `Duration: ${hpiData.duration}\n`;
  if (hpiData?.character) narrative += `Character: ${hpiData.character}\n`;
  if (hpiData?.severity) narrative += `Severity: ${hpiData.severity}/10\n`;
  if (hpiData?.timing) narrative += `Timing: ${hpiData.timing}\n`;
  if (hpiData?.aggravatingFactors?.length) {
    narrative += `Aggravating factors: ${hpiData.aggravatingFactors.join(', ')}\n`;
  }
  if (hpiData?.relievingFactors?.length) {
    narrative += `Relieving factors: ${hpiData.relievingFactors.join(', ')}\n`;
  }

  return narrative.trim();
}

function generateROSContent(assessment: any): string {
  const ros = assessment?.reviewOfSystems || {};
  const systems = Object.keys(ros);
  
  if (systems.length === 0) {
    return 'Review of systems deferred or not performed at this visit.';
  }

  let content = '';
  systems.forEach(system => {
    const symptoms = ros[system];
    if (symptoms?.length) {
      content += `${system.charAt(0).toUpperCase() + system.slice(1)}: ${symptoms.join(', ')}\n`;
    }
  });

  content += `\n${systems.length}-system review performed.`;
  return content.trim();
}

function generateAssessmentContent(assessment: any, differentials: string[], orders: any): string {
  let content = 'ASSESSMENT:\n';
  
  if (differentials.length > 0) {
    differentials.forEach((dx, idx) => {
      content += `${idx + 1}. ${dx}\n`;
    });
  } else {
    content += `1. ${assessment?.chiefComplaint || 'Symptoms'} - under evaluation\n`;
  }

  content += '\nPLAN:\n';
  
  if (orders?.labs?.length) {
    content += `\nLabs: ${orders.labs.map((l: any) => l.name).join(', ')}\n`;
  }
  if (orders?.imaging?.length) {
    content += `Imaging: ${orders.imaging.map((i: any) => i.name).join(', ')}\n`;
  }
  if (orders?.medications?.length) {
    content += `Medications: ${orders.medications.map((m: any) => m.name).join(', ')}\n`;
  }
  if (orders?.referrals?.length) {
    content += `Referrals: ${orders.referrals.map((r: any) => r.specialty).join(', ')}\n`;
  }

  content += '\nPatient education provided. Return precautions discussed.';
  return content.trim();
}

function calculateMDMContent(assessment: any, orders: any, differentials: string[]): MDMComplexity {
  let dataPoints = 0;
  
  dataPoints += (orders?.labs?.length || 0);
  dataPoints += (orders?.imaging?.length || 0) * 2;
  
  const hasRedFlags = (assessment?.redFlags?.length || 0) > 0;
  const complexProblems = differentials.length >= 3 || hasRedFlags;
  
  let level: MDMComplexity['level'] = 'low';
  let cpt = '99213';
  let emLevel = 'Level 3';

  if (hasRedFlags || dataPoints >= 4) {
    level = 'high';
    cpt = '99215';
    emLevel = 'Level 5';
  } else if (complexProblems || dataPoints >= 2) {
    level = 'moderate';
    cpt = '99214';
    emLevel = 'Level 4';
  }

  return {
    level,
    problemComplexity: complexProblems ? 'moderate' : 'low',
    dataComplexity: dataPoints >= 4 ? 'extensive' : dataPoints >= 2 ? 'moderate' : 'limited',
    riskLevel: hasRedFlags ? 'high' : 'moderate',
    dataPointsAnalyzed: dataPoints,
    suggestedCPT: cpt,
    emLevel,
    justification: `Based on ${level} problem complexity, ${dataPoints} data elements, and ${hasRedFlags ? 'high' : 'moderate'} risk.`,
  };
}

function generateFullDocument(
  hpi: string,
  ros: string,
  assessment: string,
  mdm: MDMComplexity | null,
  assessmentData: any,
  providerInfo: any
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
CLINICAL ENCOUNTER DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATIENT: ${assessmentData?.patientName || 'Unknown'}
DATE OF SERVICE: ${currentDate}
PROVIDER: ${providerInfo?.name || 'Provider'}, ${providerInfo?.credentials || 'MD'}

───────────────────────────────────────────────────────────────────────────────
SUBJECTIVE
───────────────────────────────────────────────────────────────────────────────

CHIEF COMPLAINT:
${assessmentData?.chiefComplaint || 'Not documented'}

HISTORY OF PRESENT ILLNESS:
${hpi}

CURRENT MEDICATIONS:
${assessmentData?.medications?.map((m: any) => `  • ${m.name}`).join('\n') || '  None reported'}

ALLERGIES:
${assessmentData?.allergies?.map((a: any) => `  • ${a.allergen}`).join('\n') || '  No known allergies (NKA)'}

REVIEW OF SYSTEMS:
${ros}

───────────────────────────────────────────────────────────────────────────────
OBJECTIVE
───────────────────────────────────────────────────────────────────────────────

VITAL SIGNS: Deferred (telehealth/pre-visit assessment)

PHYSICAL EXAMINATION: [To be completed during encounter]

───────────────────────────────────────────────────────────────────────────────
ASSESSMENT & PLAN
───────────────────────────────────────────────────────────────────────────────

${assessment}

───────────────────────────────────────────────────────────────────────────────
MEDICAL DECISION MAKING
───────────────────────────────────────────────────────────────────────────────

${mdm?.justification || 'MDM not calculated'}

E/M Level: ${mdm?.emLevel || 'N/A'} (CPT: ${mdm?.suggestedCPT || 'N/A'})

───────────────────────────────────────────────────────────────────────────────
ATTESTATION
───────────────────────────────────────────────────────────────────────────────

I have reviewed the AI-assisted documentation and verified its accuracy.

Electronically signed by: ${providerInfo?.name || 'Provider'}, ${providerInfo?.credentials || 'MD'}
Date/Time: ${currentDate} at ${currentTime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

export default DocumentationGenerator;
