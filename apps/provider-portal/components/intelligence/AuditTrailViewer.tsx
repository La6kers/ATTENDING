// ============================================================
// ATTENDING AI - Clinical Audit Trail Viewer
// apps/provider-portal/components/intelligence/AuditTrailViewer.tsx
//
// Full transparency into AI clinical reasoning
// Revolutionary Feature: Complete decision explainability for compliance
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  FileSearch,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Filter,
  Download,
  Eye,
  Lightbulb,
  Shield,
  Activity,
  GitBranch,
} from 'lucide-react';

// Types
interface AuditEntry {
  id: string;
  timestamp: Date;
  sessionId: string;
  patientId: string;
  providerId: string;
  decisionType: string;
  category: string;
  inputData: {
    patientSnapshot: {
      age: number;
      gender: string;
      chiefComplaint: string;
      symptoms: string[];
    };
    clinicalContext?: {
      acuityLevel: string;
      redFlags: string[];
      urgencyScore: number;
    };
  };
  aiReasoning: {
    reasoningChain: ReasoningStep[];
    confidenceFactors: ConfidenceFactor[];
    evidenceSources: EvidenceSource[];
    differentialConsiderations?: DifferentialConsideration[];
    safetyChecks: SafetyCheck[];
    limitations: string[];
  };
  recommendation: {
    primaryRecommendation: string;
    alternatives?: string[];
    confidence: number;
    urgency: string;
    rationale: string;
    caveats?: string[];
  };
  providerAction?: {
    action: 'accepted' | 'modified' | 'rejected' | 'deferred';
    timestamp: Date;
    modificationType?: string;
    modificationDetails?: string;
    rejectionReason?: string;
    finalDecision: string;
    attestation: boolean;
  };
  outcome?: {
    recordedAt: Date;
    wasCorrect?: boolean;
    patientOutcome?: string;
    adverseEvents?: string[];
    notes?: string;
  };
  computationTimeMs: number;
}

interface ReasoningStep {
  step: number;
  type: string;
  description: string;
  input: string;
  output: string;
  confidence: number;
}

interface ConfidenceFactor {
  factor: string;
  value: number;
  impact: 'positive' | 'negative';
  explanation: string;
}

interface EvidenceSource {
  type: string;
  name: string;
  reference?: string;
  relevance: number;
}

interface DifferentialConsideration {
  diagnosis: string;
  probability: number;
  supportingFactors: string[];
  againstFactors: string[];
  ruledOut: boolean;
  reasonIfRuledOut?: string;
}

interface SafetyCheck {
  checkType: string;
  passed: boolean;
  details: string;
  severity?: string;
}

interface AuditTrailViewerProps {
  entries: AuditEntry[];
  onExport?: (entries: AuditEntry[]) => void;
  onViewDetails?: (entry: AuditEntry) => void;
}

export function AuditTrailViewer({
  entries,
  onExport,
  onViewDetails,
}: AuditTrailViewerProps) {
  const [expandedEntries, setExpandedEntries] = useState<string[]>([]);
  const [filter, setFilter] = useState<{
    decisionType?: string;
    providerAction?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});
  const [showFilters, setShowFilters] = useState(false);

  const toggleEntry = (entryId: string) => {
    setExpandedEntries(prev =>
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filter.decisionType && entry.decisionType !== filter.decisionType) return false;
      if (filter.providerAction && entry.providerAction?.action !== filter.providerAction) return false;
      if (filter.dateFrom && new Date(entry.timestamp) < new Date(filter.dateFrom)) return false;
      if (filter.dateTo && new Date(entry.timestamp) > new Date(filter.dateTo)) return false;
      return true;
    });
  }, [entries, filter]);

  const decisionTypes = [...new Set(entries.map(e => e.decisionType))];
  
  const actionColors = {
    accepted: 'bg-green-100 text-green-700 border-green-300',
    modified: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    rejected: 'bg-red-100 text-red-700 border-red-300',
    deferred: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = entries.length;
    const accepted = entries.filter(e => e.providerAction?.action === 'accepted').length;
    const modified = entries.filter(e => e.providerAction?.action === 'modified').length;
    const rejected = entries.filter(e => e.providerAction?.action === 'rejected').length;
    const withOutcomes = entries.filter(e => e.outcome?.wasCorrect !== undefined);
    const correct = withOutcomes.filter(e => e.outcome?.wasCorrect).length;
    const avgConfidence = entries.reduce((sum, e) => sum + e.recommendation.confidence, 0) / total;

    return {
      total,
      accepted,
      modified,
      rejected,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      modificationRate: total > 0 ? Math.round((modified / total) * 100) : 0,
      accuracyRate: withOutcomes.length > 0 ? Math.round((correct / withOutcomes.length) * 100) : null,
      avgConfidence: Math.round(avgConfidence * 100),
    };
  }, [entries]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <FileSearch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Clinical Decision Audit Trail</h2>
              <p className="text-slate-300 text-sm">
                {filteredEntries.length} of {entries.length} decisions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-white text-slate-700' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            {onExport && (
              <button
                onClick={() => onExport(filteredEntries)}
                className="flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-5 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-300">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.acceptanceRate}%</div>
            <div className="text-slate-300">Accepted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.modificationRate}%</div>
            <div className="text-slate-300">Modified</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.avgConfidence}%</div>
            <div className="text-slate-300">Avg Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {stats.accuracyRate !== null ? `${stats.accuracyRate}%` : 'N/A'}
            </div>
            <div className="text-slate-300">Accuracy</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision Type</label>
              <select
                value={filter.decisionType || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, decisionType: e.target.value || undefined }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Types</option>
                {decisionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider Action</label>
              <select
                value={filter.providerAction || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, providerAction: e.target.value || undefined }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Actions</option>
                <option value="accepted">Accepted</option>
                <option value="modified">Modified</option>
                <option value="rejected">Rejected</option>
                <option value="deferred">Deferred</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filter.dateFrom || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filter.dateTo || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => setFilter({})}
            className="mt-3 text-sm text-slate-600 hover:text-slate-800"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Audit Entries */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileSearch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No audit entries found</p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="hover:bg-gray-50">
              {/* Entry Header */}
              <button
                onClick={() => toggleEntry(entry.id)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  {expandedEntries.includes(entry.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 capitalize">
                        {entry.decisionType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize">
                        {entry.category}
                      </span>
                      {entry.providerAction && (
                        <span className={`text-xs px-2 py-0.5 rounded border capitalize ${
                          actionColors[entry.providerAction.action]
                        }`}>
                          {entry.providerAction.action}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {entry.recommendation.primaryRecommendation.slice(0, 80)}
                      {entry.recommendation.primaryRecommendation.length > 80 && '...'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className={`font-medium ${confidenceColor(entry.recommendation.confidence)}`}>
                    {Math.round(entry.recommendation.confidence * 100)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedEntries.includes(entry.id) && (
                <div className="px-6 pb-4 pl-16 space-y-4">
                  {/* Patient Context */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Patient Context
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Chief Complaint:</strong> {entry.inputData.patientSnapshot.chiefComplaint}</p>
                      <p><strong>Age/Gender:</strong> {entry.inputData.patientSnapshot.age}/{entry.inputData.patientSnapshot.gender}</p>
                      {entry.inputData.patientSnapshot.symptoms.length > 0 && (
                        <p><strong>Symptoms:</strong> {entry.inputData.patientSnapshot.symptoms.join(', ')}</p>
                      )}
                      {entry.inputData.clinicalContext?.redFlags && entry.inputData.clinicalContext.redFlags.length > 0 && (
                        <p className="text-red-600">
                          <strong>Red Flags:</strong> {entry.inputData.clinicalContext.redFlags.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI Reasoning Chain
                    </h4>
                    <div className="space-y-2">
                      {entry.aiReasoning.reasoningChain.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs flex-shrink-0">
                            {step.step}
                          </span>
                          <div>
                            <span className="text-xs text-blue-600 uppercase">{step.type}:</span>
                            <span className="ml-1 text-gray-700">{step.description}</span>
                            <span className="ml-2 text-xs text-blue-500">
                              ({Math.round(step.confidence * 100)}% confident)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Safety Checks */}
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Safety Checks
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {entry.aiReasoning.safetyChecks.map((check, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {check.passed ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={check.passed ? 'text-green-700' : 'text-red-700'}>
                            {check.checkType}: {check.details}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Differentials */}
                  {entry.aiReasoning.differentialConsiderations && entry.aiReasoning.differentialConsiderations.length > 0 && (
                    <div className="p-3 bg-teal-50 rounded-lg">
                      <h4 className="text-sm font-medium text-teal-700 mb-2 flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        Differential Considerations
                      </h4>
                      <div className="space-y-2">
                        {entry.aiReasoning.differentialConsiderations.map((diff, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className={diff.ruledOut ? 'text-gray-500 line-through' : 'text-teal-900 font-medium'}>
                                {diff.diagnosis}
                              </span>
                              <span className="text-teal-600">{Math.round(diff.probability * 100)}%</span>
                            </div>
                            {diff.ruledOut && diff.reasonIfRuledOut && (
                              <p className="text-xs text-gray-500 mt-0.5">Ruled out: {diff.reasonIfRuledOut}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Recommendation
                    </h4>
                    <p className="text-sm text-gray-700">{entry.recommendation.primaryRecommendation}</p>
                    <p className="text-sm text-gray-600 mt-1"><strong>Rationale:</strong> {entry.recommendation.rationale}</p>
                    {entry.recommendation.caveats && entry.recommendation.caveats.length > 0 && (
                      <div className="mt-2 text-xs text-amber-700">
                        <strong>Caveats:</strong> {entry.recommendation.caveats.join('; ')}
                      </div>
                    )}
                  </div>

                  {/* Provider Action */}
                  {entry.providerAction && (
                    <div className={`p-3 rounded-lg border ${actionColors[entry.providerAction.action]}`}>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Provider Action
                      </h4>
                      <p className="text-sm">
                        <strong>Action:</strong> {entry.providerAction.action}
                      </p>
                      <p className="text-sm">
                        <strong>Final Decision:</strong> {entry.providerAction.finalDecision}
                      </p>
                      {entry.providerAction.modificationDetails && (
                        <p className="text-sm">
                          <strong>Modifications:</strong> {entry.providerAction.modificationDetails}
                        </p>
                      )}
                      {entry.providerAction.rejectionReason && (
                        <p className="text-sm">
                          <strong>Rejection Reason:</strong> {entry.providerAction.rejectionReason}
                        </p>
                      )}
                      <p className="text-xs mt-2 opacity-70">
                        {new Date(entry.providerAction.timestamp).toLocaleString()} • 
                        Attestation: {entry.providerAction.attestation ? 'Yes' : 'No'}
                      </p>
                    </div>
                  )}

                  {/* Outcome */}
                  {entry.outcome && (
                    <div className={`p-3 rounded-lg ${
                      entry.outcome.wasCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Outcome
                      </h4>
                      <p className="text-sm">
                        <strong>Correct:</strong> {entry.outcome.wasCorrect ? 'Yes' : 'No'}
                      </p>
                      {entry.outcome.patientOutcome && (
                        <p className="text-sm">
                          <strong>Patient Outcome:</strong> {entry.outcome.patientOutcome}
                        </p>
                      )}
                      {entry.outcome.adverseEvents && entry.outcome.adverseEvents.length > 0 && (
                        <p className="text-sm text-red-600">
                          <strong>Adverse Events:</strong> {entry.outcome.adverseEvents.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Limitations */}
                  {entry.aiReasoning.limitations.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <strong>Acknowledged Limitations:</strong> {entry.aiReasoning.limitations.join('; ')}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-200">
                    <span>Session: {entry.sessionId}</span>
                    <span>Computation: {entry.computationTimeMs}ms</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AuditTrailViewer;
