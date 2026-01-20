// ============================================================
// ATTENDING AI - Data Reconciliation Panel
// apps/provider-portal/components/intelligence/DataReconciliationPanel.tsx
//
// Multi-EHR data conflict detection and resolution
// Revolutionary Feature: Unified patient view across healthcare systems
// ============================================================

import React, { useState } from 'react';
import {
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  GitMerge,
  FileWarning,
  Zap,
  Shield,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: string;
  priority: number;
  lastSyncAt?: Date;
}

interface Conflict {
  id: string;
  recordType: string;
  field: string;
  sources: ConflictSource[];
  suggestedResolution: {
    resolvedValue: any;
    reason: string;
    confidence: number;
    rules: string[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  clinicalImpact: string;
  autoResolvable: boolean;
}

interface ConflictSource {
  sourceId: string;
  sourceName: string;
  value: any;
  timestamp: Date;
  confidence: number;
}

interface DataQualityMetrics {
  overallScore: number;
  completeness: number;
  consistency: number;
  accuracy: number;
  timeliness: number;
}

interface DataGap {
  field: string;
  importance: 'required' | 'recommended' | 'optional';
  suggestedAction: string;
}

interface ReconciliationResult {
  patientId: string;
  reconciledAt: Date;
  sourcesUsed: DataSource[];
  conflicts: Conflict[];
  autoResolvedCount: number;
  pendingCount: number;
  dataQuality: DataQualityMetrics;
  dataGaps: DataGap[];
}

interface DataReconciliationPanelProps {
  patientId: string;
  patientName: string;
  reconciliation: ReconciliationResult;
  onResolveConflict?: (conflictId: string, resolution: { resolvedValue: any; reason: string }) => void;
  onRefresh?: () => void;
}

export function DataReconciliationPanel({
  patientId,
  patientName,
  reconciliation,
  onResolveConflict,
  onRefresh,
}: DataReconciliationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['conflicts', 'quality']);
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const severityColors = {
    low: 'bg-blue-100 border-blue-300 text-blue-800',
    medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    high: 'bg-orange-100 border-orange-300 text-orange-800',
    critical: 'bg-red-100 border-red-300 text-red-800',
  };

  const qualityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const pendingConflicts = reconciliation.conflicts.filter(c => !c.autoResolvable);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <GitMerge className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Data Reconciliation</h2>
              <p className="text-emerald-200 text-sm">
                {reconciliation.sourcesUsed.length} sources • Last sync {new Date(reconciliation.reconciledAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{reconciliation.sourcesUsed.length}</div>
            <div className="text-emerald-200">Sources</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{reconciliation.autoResolvedCount}</div>
            <div className="text-emerald-200">Auto-resolved</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${reconciliation.pendingCount > 0 ? 'text-yellow-300' : 'text-white'}`}>
              {reconciliation.pendingCount}
            </div>
            <div className="text-emerald-200">Pending</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${qualityScoreColor(reconciliation.dataQuality.overallScore)}`}>
              {reconciliation.dataQuality.overallScore}%
            </div>
            <div className="text-emerald-200">Quality</div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('sources')}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            <span className="font-medium text-gray-900">
              Connected Sources ({reconciliation.sourcesUsed.length})
            </span>
          </div>
          {expandedSections.includes('sources') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('sources') && (
          <div className="px-6 pb-4">
            <div className="grid gap-2">
              {reconciliation.sourcesUsed.map(source => (
                <div
                  key={source.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      source.lastSyncAt && new Date(source.lastSyncAt).getTime() > Date.now() - 3600000
                        ? 'bg-green-500'
                        : 'bg-yellow-500'
                    }`} />
                    <div>
                      <div className="font-medium text-gray-900">{source.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{source.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Priority: {source.priority}</div>
                    {source.lastSyncAt && (
                      <div className="text-xs text-gray-400">
                        Last sync: {new Date(source.lastSyncAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Quality */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('quality')}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900">Data Quality Score</span>
            <span className={`text-sm font-bold ${qualityScoreColor(reconciliation.dataQuality.overallScore)}`}>
              {reconciliation.dataQuality.overallScore}%
            </span>
          </div>
          {expandedSections.includes('quality') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('quality') && (
          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Completeness', value: reconciliation.dataQuality.completeness, icon: CheckCircle },
                { label: 'Consistency', value: reconciliation.dataQuality.consistency, icon: GitMerge },
                { label: 'Accuracy', value: reconciliation.dataQuality.accuracy, icon: Zap },
                { label: 'Timeliness', value: reconciliation.dataQuality.timeliness, icon: Clock },
              ].map(metric => (
                <div key={metric.label} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <metric.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{metric.label}</span>
                    </div>
                    <span className={`font-bold ${qualityScoreColor(metric.value * 100)}`}>
                      {Math.round(metric.value * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        metric.value >= 0.8 ? 'bg-green-500' :
                        metric.value >= 0.6 ? 'bg-yellow-500' :
                        metric.value >= 0.4 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${metric.value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conflicts */}
      {pendingConflicts.length > 0 && (
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('conflicts')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-gray-900">
                Data Conflicts ({pendingConflicts.length})
              </span>
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            </div>
            {expandedSections.includes('conflicts') ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.includes('conflicts') && (
            <div className="px-6 pb-4 space-y-3">
              {pendingConflicts.map(conflict => (
                <div
                  key={conflict.id}
                  className={`p-4 rounded-lg border ${severityColors[conflict.severity]}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{conflict.field}</span>
                        <span className="text-xs px-2 py-0.5 bg-white/50 rounded capitalize">
                          {conflict.recordType}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded uppercase font-medium ${
                          conflict.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          conflict.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {conflict.severity}
                        </span>
                      </div>
                      <p className="text-sm mt-1 opacity-80">{conflict.clinicalImpact}</p>
                    </div>
                  </div>

                  {/* Conflicting values */}
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium opacity-70">Conflicting Values:</div>
                    {conflict.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white/50 rounded text-sm"
                      >
                        <div>
                          <span className="font-medium">{source.sourceName}:</span>
                          <span className="ml-2">{String(source.value)}</span>
                        </div>
                        <div className="text-xs opacity-70">
                          {new Date(source.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Suggested resolution */}
                  <div className="mt-3 p-3 bg-white/70 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Zap className="w-4 h-4" />
                      Suggested Resolution
                      <span className="text-xs opacity-70">
                        ({Math.round(conflict.suggestedResolution.confidence * 100)}% confident)
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      Use value: <strong>{String(conflict.suggestedResolution.resolvedValue)}</strong>
                    </p>
                    <p className="text-xs opacity-70 mt-1">{conflict.suggestedResolution.reason}</p>
                    
                    {onResolveConflict && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => onResolveConflict(conflict.id, {
                            resolvedValue: conflict.suggestedResolution.resolvedValue,
                            reason: 'Accepted AI suggestion',
                          })}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Accept Suggestion
                        </button>
                        <button
                          onClick={() => setSelectedConflict(conflict.id)}
                          className="px-3 py-1.5 text-sm bg-white border rounded hover:bg-gray-50"
                        >
                          Choose Different
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Gaps */}
      {reconciliation.dataGaps.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('gaps')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">
                Data Gaps ({reconciliation.dataGaps.length})
              </span>
            </div>
            {expandedSections.includes('gaps') ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.includes('gaps') && (
            <div className="px-6 pb-4 space-y-2">
              {reconciliation.dataGaps.map((gap, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    gap.importance === 'required' ? 'bg-red-50 border-red-200' :
                    gap.importance === 'recommended' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{gap.field}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded capitalize ${
                        gap.importance === 'required' ? 'bg-red-100 text-red-700' :
                        gap.importance === 'recommended' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {gap.importance}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{gap.suggestedAction}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All clear state */}
      {pendingConflicts.length === 0 && reconciliation.dataGaps.length === 0 && (
        <div className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">All Data Reconciled</p>
          <p className="text-sm text-gray-500 mt-1">
            No conflicts or gaps detected across {reconciliation.sourcesUsed.length} sources
          </p>
        </div>
      )}
    </div>
  );
}

export default DataReconciliationPanel;
