// ============================================================
// COMPASS Standalone — Results Panel
// Displays HPI narrative + differential diagnoses
// Matching PreVisitSummary design from provider-portal
// ============================================================

import React, { useState } from 'react';
import {
  FileText, Activity, AlertTriangle, ChevronDown, ChevronUp,
  Printer, RefreshCw, Stethoscope, ClipboardList, Beaker,
  Radio, Users, Shield, Camera, Share2, Check, Link,
} from 'lucide-react';
import type { DifferentialDiagnosisResult, DifferentialDiagnosis } from '@attending/shared/lib/ai/differentialDiagnosis';
import type { HPIData, RedFlag } from '@attending/shared/types/chat.types';
import { buildStructuredHpi, buildBulletedSummary, buildSoapNote, type SummaryFormat } from '../lib/hpiNarrative';
import type { AttachedImage } from '../store/useCompassStore';
import { buildShareableLink, type SharedAssessment } from '../lib/assessmentShare';
import { ConfidenceRing } from './ConfidenceRing';

interface ResultsPanelProps {
  hpiNarrative: string | null;
  hpiData: HPIData;
  chiefComplaint?: string;
  diagnosisResult: DifferentialDiagnosisResult | null;
  redFlags: RedFlag[];
  urgencyLevel: string;
  onStartNew: () => void;
  attachedImages?: AttachedImage[];
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
}

// ConfidenceRing imported from ./ConfidenceRing.tsx

// ============================================================
// Diagnosis Card
// ============================================================

const DiagnosisCard: React.FC<{
  dx: DifferentialDiagnosis;
  rank: number;
  isPrimary?: boolean;
  isMustRuleOut?: boolean;
}> = ({ dx, rank, isPrimary, isMustRuleOut }) => {
  const [expanded, setExpanded] = useState(isPrimary);

  const urgencyColor = dx.urgency === 'emergent'
    ? 'border-red-300 bg-red-50'
    : dx.urgency === 'urgent'
      ? 'border-amber-300 bg-amber-50'
      : 'border-gray-200 bg-white';

  const badge = isPrimary
    ? { text: 'PRIMARY', bg: 'bg-teal-600' }
    : isMustRuleOut
      ? { text: 'RULE OUT', bg: 'bg-red-600' }
      : { text: `#${rank}`, bg: 'bg-gray-500' };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${urgencyColor}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-black/5 transition-colors"
      >
        <ConfidenceRing confidence={dx.confidence} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`${badge.bg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
              {badge.text}
            </span>
            {dx.icdCode && (
              <span className="text-[10px] text-gray-400 font-mono">{dx.icdCode}</span>
            )}
          </div>
          <h4 className="font-semibold text-gray-800 mt-0.5">{dx.diagnosis}</h4>
          <p className="text-xs text-gray-500 line-clamp-1">{dx.reasoning}</p>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3 animate-fade-in-up">
          {/* Supporting Evidence */}
          {dx.supportingFindings.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Supporting Evidence</h5>
              <ul className="space-y-1">
                {dx.supportingFindings.map((f, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">+</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Against Findings */}
          {dx.againstFindings.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Against</h5>
              <ul className="space-y-1">
                {dx.againstFindings.map((f, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">-</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Workup */}
          {dx.recommendedWorkup && (
            <div>
              <h5 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Recommended Workup</h5>
              <div className="grid grid-cols-2 gap-2">
                {dx.recommendedWorkup.labs && dx.recommendedWorkup.labs.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-700 mb-1">
                      <Beaker className="w-3 h-3" /> Labs
                    </div>
                    <p className="text-xs text-blue-600">{dx.recommendedWorkup.labs.join(', ')}</p>
                  </div>
                )}
                {dx.recommendedWorkup.imaging && dx.recommendedWorkup.imaging.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-purple-700 mb-1">
                      <Radio className="w-3 h-3" /> Imaging
                    </div>
                    <p className="text-xs text-purple-600">{dx.recommendedWorkup.imaging.join(', ')}</p>
                  </div>
                )}
                {dx.recommendedWorkup.consults && dx.recommendedWorkup.consults.length > 0 && (
                  <div className="bg-teal-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-teal-700 mb-1">
                      <Users className="w-3 h-3" /> Consults
                    </div>
                    <p className="text-xs text-teal-600">{dx.recommendedWorkup.consults.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Treatment Considerations */}
          {dx.treatmentConsiderations && dx.treatmentConsiderations.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Treatment Notes</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                {dx.treatmentConsiderations.map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Stethoscope className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Main Results Panel
// ============================================================

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  hpiNarrative,
  hpiData,
  chiefComplaint,
  diagnosisResult,
  redFlags,
  urgencyLevel,
  onStartNew,
  attachedImages = [],
  patientName,
  dateOfBirth,
  gender,
}) => {
  const structuredHpi = buildStructuredHpi(hpiData);
  const mustRuleOutIds = new Set(diagnosisResult?.mustRuleOut.map(d => d.diagnosis) || []);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>('narrative');

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const sharedData: SharedAssessment = {
      patientName,
      dateOfBirth,
      gender,
      chiefComplaint,
      hpi: hpiData,
      hpiNarrative,
      diagnosisResult,
      redFlags: redFlags.map(rf => ({ symptom: rf.symptom, severity: rf.severity, category: rf.category })),
      urgencyLevel,
      images: attachedImages.map(img => ({
        id: img.id,
        phase: img.phase,
        analysis: img.analysis || null,
      })),
      generatedAt: new Date().toISOString(),
      compassVersion: '1.0.0',
    };
    const link = await buildShareableLink(sharedData);
    setShareLink(link);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }).catch(() => {});
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 print:px-0">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full mb-3">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">Clinical Assessment Complete</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">COMPASS Assessment Results</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generated {new Date().toLocaleString()} | For clinical reference only
        </p>
      </div>

      {/* Red Flag Alert */}
      {redFlags.length > 0 && (
        <div className={`rounded-xl p-4 border-2 ${
          urgencyLevel === 'emergency' ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-5 h-5 ${urgencyLevel === 'emergency' ? 'text-red-600' : 'text-amber-600'}`} />
            <h3 className={`font-bold ${urgencyLevel === 'emergency' ? 'text-red-800' : 'text-amber-800'}`}>
              {urgencyLevel === 'emergency' ? 'EMERGENCY — Call 911' : 'Red Flags Detected'}
            </h3>
          </div>
          <ul className="space-y-1">
            {redFlags.map((rf, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  rf.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <span className="font-medium">{rf.symptom}</span>
                <span className="text-gray-500">({rf.severity})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chief Complaint */}
      {chiefComplaint && (
        <div className="card-attending p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-gray-800">Chief Complaint</h3>
          </div>
          <p className="text-gray-700">{chiefComplaint}</p>
        </div>
      )}

      {/* Clinical Images */}
      {attachedImages.length > 0 && (
        <div className="card-attending p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-gray-800">Clinical Images</h3>
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
              {attachedImages.length} photo{attachedImages.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {attachedImages.map((img) => (
              <div key={img.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex gap-3">
                  <img
                    src={img.dataUrl}
                    alt="Clinical"
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    {img.analysis ? (
                      <>
                        <p className="text-sm text-gray-700 mb-1">{img.analysis.imageDescription}</p>
                        {img.analysis.findings.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {img.analysis.findings.map((f, i) => (
                              <span key={i} className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                        {img.analysis.suggestedConditions.length > 0 && (
                          <div className="space-y-0.5">
                            {img.analysis.suggestedConditions.map((c, i) => (
                              <p key={i} className="text-xs text-gray-600">
                                <span className="font-medium">{c.name}</span> ({c.confidence}%)
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">via {img.analysis.provider}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Photo attached — analysis not available</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HPI — Format Selector + Content */}
      <div className="card-attending p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-gray-800">History of Present Illness</h3>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([
              { key: 'narrative' as const, label: 'Narrative' },
              { key: 'bulleted' as const, label: 'Bulleted' },
              { key: 'soap' as const, label: 'SOAP' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSummaryFormat(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  summaryFormat === key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Narrative format */}
        {summaryFormat === 'narrative' && (
          <>
            {hpiNarrative && (
              <p className="text-gray-700 leading-relaxed mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100 italic">
                {hpiNarrative}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(structuredHpi).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-2.5">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</span>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Bulleted format */}
        {summaryFormat === 'bulleted' && (
          <pre className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100 whitespace-pre-wrap font-sans">
            {buildBulletedSummary(hpiData, chiefComplaint, patientName)}
          </pre>
        )}

        {/* SOAP format */}
        {summaryFormat === 'soap' && (
          <pre className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100 whitespace-pre-wrap font-sans">
            {buildSoapNote(hpiData, chiefComplaint, patientName, diagnosisResult, redFlags)}
          </pre>
        )}
      </div>

      {/* Differential Diagnoses */}
      {diagnosisResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-gray-800">Differential Diagnoses</h3>
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
              {diagnosisResult.differentials.length} considered
            </span>
          </div>

          {/* Clinical Impression */}
          {diagnosisResult.clinicalImpression && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-teal-800 mb-1">Clinical Impression</h4>
              <p className="text-sm text-teal-700">{diagnosisResult.clinicalImpression}</p>
            </div>
          )}

          {/* Recommended Actions */}
          {diagnosisResult.recommendedActions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Recommended Next Steps</h4>
              <ul className="space-y-1">
                {diagnosisResult.recommendedActions.map((action, i) => (
                  <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                    <span className="text-blue-500 font-bold">{i + 1}.</span> {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Diagnosis Cards */}
          <div className="space-y-3">
            {diagnosisResult.differentials.map((dx, i) => (
              <DiagnosisCard
                key={dx.diagnosis}
                dx={dx}
                rank={i + 1}
                isPrimary={i === 0}
                isMustRuleOut={mustRuleOutIds.has(dx.diagnosis)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No diagnosis fallback */}
      {!diagnosisResult && (
        <div className="card-attending p-6 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">Assessment Data Collected</h3>
          <p className="text-sm text-gray-500">
            Differential diagnosis generation was unavailable. The HPI data above has been captured and can be shared with your provider.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700">
          <strong>Clinical Disclaimer:</strong> This assessment is generated by AI for clinical decision support only.
          It does not constitute a medical diagnosis. All findings should be reviewed and confirmed by a qualified healthcare provider.
          If you are experiencing a medical emergency, call 911 immediately.
        </p>
      </div>

      {/* Share with Provider */}
      <div className="print:hidden">
        <button
          onClick={handleShare}
          className="w-full py-3.5 bg-attending-deep-navy text-white rounded-xl font-semibold hover:bg-attending-800 transition-all flex items-center justify-center gap-2 mb-3"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-green-400" />
              Link Copied to Clipboard
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              Share with Provider
            </>
          )}
        </button>

        {shareLink && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Link className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Provider Review Link</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(shareLink).catch(() => {});
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Send this link to your provider. No login required — data is encoded in the URL.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 py-3 bg-white border-2 border-teal-300 text-teal-700 rounded-xl font-semibold hover:bg-teal-50 transition-all flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print / Export
        </button>
        <button
          onClick={onStartNew}
          className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-teal-800 text-white rounded-xl font-semibold hover:shadow-teal transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          New Assessment
        </button>
      </div>
    </div>
  );
};
