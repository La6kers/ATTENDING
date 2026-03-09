// ============================================================
// ATTENDING AI - Billing & Coding Panel
// apps/provider-portal/components/analytics/BillingCodingPanel.tsx
//
// Display code suggestions, HCC opportunities, compliance scoring
// ============================================================

import React, { useState } from 'react';
import {
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Info,
  Shield,
  TrendingUp,
  Zap,
  Target,
  AlertCircle,
} from 'lucide-react';

// Types from BillingCoding service
interface DiagnosisCode {
  code: string;
  description: string;
  codeSystem: 'ICD-10-CM' | 'ICD-9-CM' | 'SNOMED';
  confidence: number;
  isPrimary: boolean;
  hccCategory?: string;
  rafScore?: number;
  supportingEvidence: string[];
}

interface ProcedureCode {
  code: string;
  description: string;
  codeSystem: 'CPT' | 'HCPCS';
  modifiers?: string[];
  rvu: {
    work: number;
    practice: number;
    malpractice: number;
    total: number;
  };
  expectedReimbursement?: number;
  confidence: number;
  supportingEvidence: string[];
}

interface EMLevel {
  code: string;
  level: 1 | 2 | 3 | 4 | 5;
  newOrEstablished: 'new' | 'established';
  setting: 'office' | 'inpatient' | 'observation' | 'emergency' | 'telehealth';
  mdmComplexity: 'straightforward' | 'low' | 'moderate' | 'high';
  timeBasedAllowed: boolean;
  totalTimeMinutes?: number;
  rvu: number;
}

interface HCCOpportunity {
  hccCode: string;
  hccDescription: string;
  suggestedICD10: string;
  icd10Description: string;
  rafValue: number;
  clinicalEvidence: string[];
  lastCaptured?: Date;
}

interface ComplianceIssue {
  type: 'missing_documentation' | 'code_mismatch' | 'unbundling' | 'upcoding_risk' | 'downcoding_risk';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  affectedCode?: string;
  recommendation: string;
}

interface CodingSuggestion {
  encounterId: string;
  patientId: string;
  providerId: string;
  encounterDate: Date;
  suggestedEMCode: EMLevel;
  alternativeEMCodes: EMLevel[];
  emJustification: string;
  diagnosisCodes: DiagnosisCode[];
  hccOpportunities: HCCOpportunity[];
  procedureCodes: ProcedureCode[];
  totalRVU: number;
  estimatedReimbursement: number;
  complianceScore: number;
  complianceIssues: ComplianceIssue[];
  documentationStrength: 'weak' | 'moderate' | 'strong';
  auditRiskLevel: 'low' | 'medium' | 'high';
  missingElements: string[];
}

interface BillingCodingPanelProps {
  suggestion: CodingSuggestion;
  onAcceptCode?: (type: 'em' | 'diagnosis' | 'procedure', code: string) => void;
  onRejectCode?: (type: 'em' | 'diagnosis' | 'procedure', code: string, reason: string) => void;
  onModifyCode?: (type: 'em' | 'diagnosis' | 'procedure', oldCode: string, newCode: string) => void;
  onAcceptHCC?: (hccCode: string, icd10Code: string) => void;
  onCopyAllCodes?: (codes: string[]) => void;
}

export function BillingCodingPanel({
  suggestion,
  onAcceptCode,
  onRejectCode,
  onModifyCode,
  onAcceptHCC,
  onCopyAllCodes,
}: BillingCodingPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['em', 'diagnoses', 'compliance']);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedEM, setSelectedEM] = useState<string>(suggestion.suggestedEMCode.code);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {
      console.warn('Failed to copy to clipboard');
    });
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyAll = () => {
    const allCodes = [
      selectedEM,
      ...suggestion.diagnosisCodes.map(d => d.code),
      ...suggestion.procedureCodes.map(p => p.code),
    ];
    onCopyAllCodes?.(allCodes);
    navigator.clipboard.writeText(allCodes.join(', ')).catch(() => {
      console.warn('Failed to copy to clipboard');
    });
  };

  const complianceColors = {
    high: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500' },
    low: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500' },
  };

  const auditRisk = complianceColors[suggestion.auditRiskLevel];
  const docStrengthColors = {
    strong: 'text-green-600',
    moderate: 'text-yellow-600',
    weak: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Coding Suggestions</h2>
              <p className="text-emerald-200 text-sm">
                AI-powered code recommendations based on documentation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Summary Stats */}
            <div className="flex items-center gap-6 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{suggestion.totalRVU.toFixed(2)}</div>
                <div className="text-xs text-emerald-200">Total RVU</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">${suggestion.estimatedReimbursement.toFixed(0)}</div>
                <div className="text-xs text-emerald-200">Est. Reimburse</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${suggestion.complianceScore >= 80 ? '' : 'text-yellow-300'}`}>
                  {suggestion.complianceScore}%
                </div>
                <div className="text-xs text-emerald-200">Compliance</div>
              </div>
            </div>

            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
            >
              <Copy className="w-4 h-4" />
              Copy All
            </button>
          </div>
        </div>
      </div>

      {/* Audit Risk & Documentation Strength */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${auditRisk.text}`} />
            <span className="text-sm text-gray-600">Audit Risk:</span>
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${auditRisk.bg} ${auditRisk.text}`}>
              {suggestion.auditRiskLevel.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className={`w-4 h-4 ${docStrengthColors[suggestion.documentationStrength]}`} />
            <span className="text-sm text-gray-600">Documentation:</span>
            <span className={`text-sm font-medium ${docStrengthColors[suggestion.documentationStrength]}`}>
              {suggestion.documentationStrength.charAt(0).toUpperCase() + suggestion.documentationStrength.slice(1)}
            </span>
          </div>
        </div>

        {suggestion.missingElements.length > 0 && (
          <div className="flex items-center gap-2 text-orange-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {suggestion.missingElements.length} missing element{suggestion.missingElements.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-200">
        {/* E/M Code Section */}
        <Section
          title="E/M Code"
          icon={<Target className="w-5 h-5 text-teal-500" />}
          isExpanded={expandedSections.includes('em')}
          onToggle={() => toggleSection('em')}
          badge={<span className="text-lg font-bold text-teal-600">{selectedEM}</span>}
        >
          <div className="space-y-4">
            {/* Primary Suggestion */}
            <div className={`p-4 rounded-lg border-2 ${
              selectedEM === suggestion.suggestedEMCode.code
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="em-code"
                  checked={selectedEM === suggestion.suggestedEMCode.code}
                  onChange={() => setSelectedEM(suggestion.suggestedEMCode.code)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg text-gray-900">{suggestion.suggestedEMCode.code}</span>
                      <span className="ml-2 text-gray-600">Level {suggestion.suggestedEMCode.level}</span>
                      <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">
                        Recommended
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{suggestion.suggestedEMCode.rvu} RVU</div>
                      <div className="text-sm text-gray-500">
                        ~${(suggestion.suggestedEMCode.rvu * 33.29).toFixed(0)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">MDM:</span> {suggestion.suggestedEMCode.mdmComplexity} |{' '}
                    <span className="font-medium">Patient:</span> {suggestion.suggestedEMCode.newOrEstablished} |{' '}
                    <span className="font-medium">Setting:</span> {suggestion.suggestedEMCode.setting}
                    {suggestion.suggestedEMCode.totalTimeMinutes && (
                      <> | <span className="font-medium">Time:</span> {suggestion.suggestedEMCode.totalTimeMinutes} min</>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 italic">{suggestion.emJustification}</p>
                </div>
              </label>
            </div>

            {/* Alternative Codes */}
            {suggestion.alternativeEMCodes.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-500 font-medium">Alternative Options:</div>
                {suggestion.alternativeEMCodes.map(alt => (
                  <div
                    key={alt.code}
                    className={`p-3 rounded-lg border ${
                      selectedEM === alt.code ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                    }`}
                  >
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="em-code"
                          checked={selectedEM === alt.code}
                          onChange={() => setSelectedEM(alt.code)}
                        />
                        <div>
                          <span className="font-medium text-gray-900">{alt.code}</span>
                          <span className="ml-2 text-gray-500">Level {alt.level}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">{alt.rvu} RVU</div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Diagnosis Codes Section */}
        <Section
          title="Diagnosis Codes (ICD-10)"
          icon={<FileText className="w-5 h-5 text-blue-500" />}
          count={suggestion.diagnosisCodes.length}
          isExpanded={expandedSections.includes('diagnoses')}
          onToggle={() => toggleSection('diagnoses')}
        >
          <div className="space-y-2">
            {suggestion.diagnosisCodes.map((dx, index) => (
              <div
                key={dx.code}
                className={`p-3 rounded-lg border ${dx.isPrimary ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dx.isPrimary && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs">Primary</span>
                    )}
                    <span className="font-mono font-medium text-gray-900">{dx.code}</span>
                    <button
                      onClick={() => handleCopyCode(dx.code)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {copiedCode === dx.code ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {dx.hccCategory && (
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">
                        {dx.hccCategory}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">{Math.round(dx.confidence * 100)}%</span>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-600">{dx.description}</div>
                {dx.rafScore && (
                  <div className="mt-1 text-xs text-teal-600">RAF: +{dx.rafScore.toFixed(3)}</div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* HCC Opportunities Section */}
        {suggestion.hccOpportunities.length > 0 && (
          <Section
            title="HCC Capture Opportunities"
            icon={<TrendingUp className="w-5 h-5 text-teal-500" />}
            count={suggestion.hccOpportunities.length}
            isExpanded={expandedSections.includes('hcc')}
            onToggle={() => toggleSection('hcc')}
          >
            <div className="space-y-3">
              {suggestion.hccOpportunities.map((hcc, index) => (
                <div key={index} className="p-4 rounded-lg border border-teal-200 bg-teal-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-teal-900">{hcc.hccCode}</span>
                      <span className="ml-2 text-teal-700">{hcc.hccDescription}</span>
                    </div>
                    <span className="px-3 py-1 bg-teal-200 text-teal-800 rounded-full text-sm font-medium">
                      +{hcc.rafValue.toFixed(3)} RAF
                    </span>
                  </div>
                  <div className="mt-2 p-2 bg-white rounded border border-teal-200">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Consider:</span>{' '}
                      <span className="font-mono text-teal-600">{hcc.suggestedICD10}</span>
                      <span className="text-gray-600"> - {hcc.icd10Description}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-teal-600">
                    {hcc.clinicalEvidence.join(' • ')}
                  </div>
                  <button
                    onClick={() => onAcceptHCC?.(hcc.hccCode, hcc.suggestedICD10)}
                    className="mt-2 px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                  >
                    Add to Encounter
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Procedure Codes Section */}
        {suggestion.procedureCodes.length > 0 && (
          <Section
            title="Procedure Codes (CPT)"
            icon={<Zap className="w-5 h-5 text-orange-500" />}
            count={suggestion.procedureCodes.length}
            isExpanded={expandedSections.includes('procedures')}
            onToggle={() => toggleSection('procedures')}
          >
            <div className="space-y-2">
              {suggestion.procedureCodes.map((proc, index) => (
                <div key={proc.code} className="p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-gray-900">{proc.code}</span>
                      {proc.modifiers && proc.modifiers.map(mod => (
                        <span key={mod} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {mod}
                        </span>
                      ))}
                      <button
                        onClick={() => handleCopyCode(proc.code)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {copiedCode === proc.code ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{proc.rvu.total} RVU</div>
                      {proc.expectedReimbursement && (
                        <div className="text-xs text-gray-500">${proc.expectedReimbursement}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{proc.description}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Compliance Issues Section */}
        <Section
          title="Compliance Check"
          icon={<Shield className="w-5 h-5 text-green-500" />}
          count={suggestion.complianceIssues.length}
          isExpanded={expandedSections.includes('compliance')}
          onToggle={() => toggleSection('compliance')}
          badge={
            <span className={`text-lg font-bold ${
              suggestion.complianceScore >= 80 ? 'text-green-600' :
              suggestion.complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {suggestion.complianceScore}%
            </span>
          }
        >
          {suggestion.complianceIssues.length > 0 ? (
            <div className="space-y-3">
              {suggestion.complianceIssues.map((issue, index) => {
                const severityColors = {
                  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500' },
                  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-500' },
                  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500' },
                };
                const colors = severityColors[issue.severity];

                return (
                  <div key={index} className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${colors.icon}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{issue.type.replace(/_/g, ' ').toUpperCase()}</span>
                          {issue.affectedCode && (
                            <span className="font-mono text-sm text-gray-600">{issue.affectedCode}</span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{issue.description}</p>
                        <p className="mt-2 text-sm text-gray-700">
                          <span className="font-medium">Recommendation:</span> {issue.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <div className="font-medium text-green-800">All compliance checks passed</div>
                <div className="text-sm text-green-600">Documentation supports selected codes</div>
              </div>
            </div>
          )}

          {/* Missing Elements */}
          {suggestion.missingElements.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-orange-50 border border-orange-200">
              <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
                <Info className="w-4 h-4" />
                Missing Documentation Elements
              </div>
              <ul className="list-disc list-inside text-sm text-orange-600 space-y-1">
                {suggestion.missingElements.map((element, index) => (
                  <li key={index}>{element}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// Helper component for expandable sections
function Section({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {badge}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isExpanded && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

export default BillingCodingPanel;
