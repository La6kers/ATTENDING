// ============================================================
// ATTENDING AI - Ambient Intelligence Panel
// apps/provider-portal/components/intelligence/AmbientIntelligencePanel.tsx
//
// Real-time clinical extraction from patient conversations
// Revolutionary Feature: Auto-documentation while provider focuses on patient
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Mic,
  MicOff,
  Stethoscope,
  Pill,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Lightbulb,
  HelpCircle,
  Activity,
  History,
  User,
} from 'lucide-react';

// Types from clinical-intelligence package
interface ExtractedSymptom {
  term: string;
  normalized: string;
  severity?: number;
  duration?: string;
  location?: string;
  onset?: string;
  confidence: number;
  sourceUtterance: string;
}

interface ExtractedMedication {
  name: string;
  normalizedName?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  indication?: string;
  isCurrentlyTaking: boolean;
  confidence: number;
}

interface ExtractedHistory {
  type: 'medical' | 'surgical' | 'family' | 'social';
  condition: string;
  details?: string;
  year?: number;
  confidence: number;
}

interface ClinicalInsight {
  type: 'warning' | 'suggestion' | 'question' | 'info';
  category: 'diagnosis' | 'medication' | 'procedure' | 'safety' | 'documentation';
  title: string;
  description: string;
  evidence: string[];
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  relatedConcepts?: string[];
}

interface AmbientExtractionResult {
  symptoms: ExtractedSymptom[];
  medications: ExtractedMedication[];
  history: ExtractedHistory[];
  allergies: Array<{ allergen: string; reaction?: string; severity?: string }>;
  vitalSigns: Record<string, any>;
  socialFactors: Record<string, any>;
  insights: ClinicalInsight[];
  suggestedQuestions: string[];
  documentationDraft: {
    hpiSnippet: string;
    rosSnippet: string;
    assessmentSnippet: string;
  };
}

interface AmbientIntelligencePanelProps {
  patientId: string;
  sessionId: string;
  extractionResult?: AmbientExtractionResult;
  isListening?: boolean;
  onToggleListening?: () => void;
  onCopyToNote?: (section: string, content: string) => void;
  onAskQuestion?: (question: string) => void;
  onDismissInsight?: (insight: ClinicalInsight) => void;
}

export function AmbientIntelligencePanel({
  patientId,
  sessionId,
  extractionResult,
  isListening = false,
  onToggleListening,
  onCopyToNote,
  onAskQuestion,
  onDismissInsight,
}: AmbientIntelligencePanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['insights', 'symptoms']);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleCopy = (section: string, content: string) => {
    onCopyToNote?.(section, content);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Count items
  const symptomCount = extractionResult?.symptoms.length || 0;
  const medCount = extractionResult?.medications.length || 0;
  const historyCount = extractionResult?.history.length || 0;
  const insightCount = extractionResult?.insights.length || 0;
  const allergyCount = extractionResult?.allergies.length || 0;

  const priorityColors = {
    high: 'bg-red-100 border-red-300 text-red-800',
    medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    low: 'bg-blue-100 border-blue-300 text-blue-800',
  };

  const insightTypeIcons = {
    warning: <AlertTriangle className="w-4 h-4 text-red-500" />,
    suggestion: <Lightbulb className="w-4 h-4 text-yellow-500" />,
    question: <HelpCircle className="w-4 h-4 text-blue-500" />,
    info: <Activity className="w-4 h-4 text-gray-500" />,
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ambient Intelligence</h2>
              <p className="text-indigo-200 text-sm">Real-time clinical extraction</p>
            </div>
          </div>
          
          <button
            onClick={onToggleListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start Listening
              </>
            )}
          </button>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center gap-4 text-sm text-indigo-200">
          <span className="flex items-center gap-1">
            <Stethoscope className="w-4 h-4" />
            {symptomCount} symptoms
          </span>
          <span className="flex items-center gap-1">
            <Pill className="w-4 h-4" />
            {medCount} medications
          </span>
          <span className="flex items-center gap-1">
            <History className="w-4 h-4" />
            {historyCount} history items
          </span>
          <span className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4" />
            {insightCount} insights
          </span>
        </div>
      </div>

      {/* No data state */}
      {!extractionResult && (
        <div className="p-8 text-center">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {isListening 
              ? 'Listening... Clinical data will appear as the conversation progresses.'
              : 'Click "Start Listening" to begin extracting clinical information from the conversation.'
            }
          </p>
        </div>
      )}

      {extractionResult && (
        <div className="divide-y divide-gray-200">
          {/* Clinical Insights - Always show first */}
          {insightCount > 0 && (
            <div>
              <button
                onClick={() => toggleSection('insights')}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium text-gray-900">Clinical Insights ({insightCount})</span>
                  {extractionResult.insights.some(i => i.priority === 'high') && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                {expandedSections.includes('insights') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.includes('insights') && (
                <div className="px-6 pb-4 space-y-3">
                  {extractionResult.insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${priorityColors[insight.priority]}`}
                    >
                      <div className="flex items-start gap-3">
                        {insightTypeIcons[insight.type]}
                        <div className="flex-1">
                          <div className="font-medium">{insight.title}</div>
                          <p className="text-sm mt-1 opacity-80">{insight.description}</p>
                          {insight.evidence.length > 0 && (
                            <div className="mt-2 text-xs opacity-70">
                              Evidence: {insight.evidence.join(', ')}
                            </div>
                          )}
                          {insight.relatedConcepts && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {insight.relatedConcepts.map((concept, i) => (
                                <span key={i} className="px-2 py-0.5 bg-white/50 rounded text-xs">
                                  {concept}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {insight.actionable && onDismissInsight && (
                          <button
                            onClick={() => onDismissInsight(insight)}
                            className="text-xs px-2 py-1 bg-white/50 rounded hover:bg-white/80"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Extracted Symptoms */}
          {symptomCount > 0 && (
            <div>
              <button
                onClick={() => toggleSection('symptoms')}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-purple-500" />
                  <span className="font-medium text-gray-900">Symptoms ({symptomCount})</span>
                </div>
                {expandedSections.includes('symptoms') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.includes('symptoms') && (
                <div className="px-6 pb-4">
                  <div className="grid gap-2">
                    {extractionResult.symptoms.map((symptom, index) => (
                      <div
                        key={index}
                        className="p-3 bg-purple-50 rounded-lg border border-purple-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-purple-900">{symptom.term}</span>
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                            {Math.round(symptom.confidence * 100)}% confident
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-purple-700 space-x-3">
                          {symptom.severity && <span>Severity: {symptom.severity}/10</span>}
                          {symptom.duration && <span>Duration: {symptom.duration}</span>}
                          {symptom.location && <span>Location: {symptom.location}</span>}
                        </div>
                        {symptom.sourceUtterance && (
                          <div className="mt-2 text-xs text-purple-600 italic">
                            "{symptom.sourceUtterance}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Medications */}
          {medCount > 0 && (
            <div>
              <button
                onClick={() => toggleSection('medications')}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-900">Medications ({medCount})</span>
                </div>
                {expandedSections.includes('medications') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.includes('medications') && (
                <div className="px-6 pb-4">
                  <div className="space-y-2">
                    {extractionResult.medications.map((med, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          med.isCurrentlyTaking 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{med.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            med.isCurrentlyTaking 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {med.isCurrentlyTaking ? 'Active' : 'Discontinued'}
                          </span>
                        </div>
                        {(med.dose || med.frequency) && (
                          <div className="mt-1 text-sm text-gray-600">
                            {med.dose && <span>{med.dose}</span>}
                            {med.frequency && <span> {med.frequency}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Allergies */}
          {allergyCount > 0 && (
            <div>
              <button
                onClick={() => toggleSection('allergies')}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-gray-900">Allergies ({allergyCount})</span>
                </div>
                {expandedSections.includes('allergies') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.includes('allergies') && (
                <div className="px-6 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {extractionResult.allergies.map((allergy, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm border border-red-200"
                      >
                        {allergy.allergen}
                        {allergy.reaction && ` (${allergy.reaction})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Medical History */}
          {historyCount > 0 && (
            <div>
              <button
                onClick={() => toggleSection('history')}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-900">Medical History ({historyCount})</span>
                </div>
                {expandedSections.includes('history') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.includes('history') && (
                <div className="px-6 pb-4">
                  <div className="space-y-2">
                    {extractionResult.history.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-900">{item.condition}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">
                            {item.type}
                          </span>
                        </div>
                        {item.details && (
                          <div className="mt-1 text-sm text-blue-700">{item.details}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggested Questions */}
          {extractionResult.suggestedQuestions.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('questions')}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-orange-500" />
                  <span className="font-medium text-gray-900">
                    Suggested Questions ({extractionResult.suggestedQuestions.length})
                  </span>
                </div>
                {expandedSections.includes('questions') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.includes('questions') && (
                <div className="px-6 pb-4 space-y-2">
                  {extractionResult.suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => onAskQuestion?.(question)}
                      className="w-full p-3 text-left bg-orange-50 rounded-lg border border-orange-200 
                               hover:bg-orange-100 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-orange-800">{question}</span>
                        <span className="text-xs text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to ask →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documentation Draft */}
          {extractionResult.documentationDraft.hpiSnippet && (
            <div>
              <button
                onClick={() => toggleSection('draft')}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span className="font-medium text-gray-900">Documentation Draft</span>
                </div>
                {expandedSections.includes('draft') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.includes('draft') && (
                <div className="px-6 pb-4 space-y-4">
                  {/* HPI */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">HPI</span>
                      <button
                        onClick={() => handleCopy('hpi', extractionResult.documentationDraft.hpiSnippet)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        {copiedSection === 'hpi' ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy to note
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                      {extractionResult.documentationDraft.hpiSnippet}
                    </div>
                  </div>

                  {/* ROS */}
                  {extractionResult.documentationDraft.rosSnippet && (
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Review of Systems</span>
                        <button
                          onClick={() => handleCopy('ros', extractionResult.documentationDraft.rosSnippet)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          {copiedSection === 'ros' ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy to note
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                        {extractionResult.documentationDraft.rosSnippet}
                      </div>
                    </div>
                  )}

                  {/* Assessment */}
                  {extractionResult.documentationDraft.assessmentSnippet && (
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Assessment</span>
                        <button
                          onClick={() => handleCopy('assessment', extractionResult.documentationDraft.assessmentSnippet)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          {copiedSection === 'assessment' ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy to note
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                        {extractionResult.documentationDraft.assessmentSnippet}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AmbientIntelligencePanel;
