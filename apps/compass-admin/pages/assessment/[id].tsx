// =============================================================================
// COMPASS Admin - Assessment Detail View
// apps/compass-admin/pages/assessment/[id].tsx
//
// Full OLDCARTS assessment review for standalone COMPASS.
// Replaces provider portal's previsit page ordering actions with:
//   Print Summary | Export to EHR | Flag for Follow-up | Mark Reviewed
//
// Includes "Claim Patient" flow for multi-provider practices.
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Printer,
  Download,
  Flag,
  CheckCircle,
  UserCheck,
  Shield,
  Pill,
  Heart,
  Stethoscope,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

// =============================================================================
// Types
// =============================================================================

interface AssessmentDetail {
  id: string;
  sessionId: string;
  patientName: string;
  patientDOB?: string;
  patientGender?: string;
  patientMRN?: string;
  chiefComplaint: string;
  hpiNarrative?: string;
  triageLevel: string;
  redFlags: string[];
  medications?: string;   // JSON string
  allergies?: string;      // JSON string
  medicalHistory?: string; // JSON string
  reviewOfSystems?: string;// JSON string
  symptoms?: string;       // JSON string
  completedAt?: string;
  assignedProviderName?: string;
  assignedProviderId?: string;
  status: string;
  conversation?: string;  // JSON string
}

// =============================================================================
// Section Component
// =============================================================================

function DetailSection({ title, icon, children, defaultOpen = true, urgency }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  urgency?: 'critical' | 'warning' | 'info';
}) {
  const [open, setOpen] = useState(defaultOpen);

  const urgencyStyles = {
    critical: 'border-red-200 bg-red-50/50',
    warning: 'border-orange-200 bg-orange-50/50',
    info: 'border-gray-200 bg-white',
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${urgencyStyles[urgency || 'info']}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// =============================================================================
// Badge Components
// =============================================================================

function TriageBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string; ring: string }> = {
    EMERGENCY: { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-200' },
    URGENT:    { bg: 'bg-orange-100', text: 'text-orange-800', ring: 'ring-orange-200' },
    MODERATE:  { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-200' },
    ROUTINE:   { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-200' },
  };
  const c = config[level] || config.ROUTINE;
  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ring-1 ${c.bg} ${c.text} ${c.ring}`}>
      {level}
    </span>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function AssessmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const res = await fetch(`/api/assessments/${id}`);
        if (res.ok) {
          const data = await res.json();
          setAssessment(data);
        }
      } catch (err) {
        console.error('[Assessment Detail] Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Parse JSON fields safely
  const parse = (json?: string): any => {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      // In production, this would assign the current provider
      await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim' }),
      });
      setAssessment((prev) => prev ? { ...prev, assignedProviderName: 'Current Provider', status: 'IN_REVIEW' } : prev);
    } catch (err) {
      console.error('[Claim] Error:', err);
    } finally {
      setClaiming(false);
    }
  };

  const handleMarkReviewed = async () => {
    setMarking(true);
    try {
      await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review' }),
      });
      setAssessment((prev) => prev ? { ...prev, status: 'REVIEWED' } : prev);
    } catch (err) {
      console.error('[Review] Error:', err);
    } finally {
      setMarking(false);
    }
  };

  const handleCopyNarrative = () => {
    if (!assessment?.hpiNarrative) return;
    navigator.clipboard.writeText(assessment.hpiNarrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <CompassAdminShell title="Loading...">
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-compass-600" />
        </div>
      </CompassAdminShell>
    );
  }

  if (!assessment) {
    return (
      <CompassAdminShell title="Not Found">
        <div className="text-center py-32">
          <h2 className="text-xl font-semibold text-gray-700">Assessment not found</h2>
          <Link href="/" className="text-compass-600 mt-4 inline-block hover:underline">← Back to Queue</Link>
        </div>
      </CompassAdminShell>
    );
  }

  const redFlags = assessment.redFlags || [];
  const medications = parse(assessment.medications) || [];
  const allergies = parse(assessment.allergies) || [];
  const medicalHistory = parse(assessment.medicalHistory) || [];
  const ros = parse(assessment.reviewOfSystems) || {};
  const symptoms = parse(assessment.symptoms) || [];
  const isEmergency = assessment.triageLevel === 'EMERGENCY';
  const isClaimed = !!assessment.assignedProviderName;
  const isReviewed = assessment.status === 'REVIEWED';

  return (
    <>
      <Head>
        <title>{assessment.patientName} — Assessment | COMPASS Admin</title>
      </Head>

      <CompassAdminShell title={assessment.patientName}>
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
          {/* Back + Header */}
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-compass-600 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Queue
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{assessment.patientName}</h1>
                  <TriageBadge level={assessment.triageLevel} />
                  {isReviewed && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Reviewed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {assessment.patientDOB && <span>DOB: {new Date(assessment.patientDOB).toLocaleDateString()}</span>}
                  {assessment.patientGender && <span>{assessment.patientGender}</span>}
                  {assessment.patientMRN && <span>MRN: {assessment.patientMRN}</span>}
                  {assessment.completedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Submitted {new Date(assessment.completedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar (replaces ordering quick actions) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-3">
            {!isClaimed && !isReviewed && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="px-4 py-2.5 bg-compass-600 text-white rounded-lg font-medium hover:bg-compass-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                {claiming ? 'Claiming...' : "I'll Take This Patient"}
              </button>
            )}

            {isClaimed && !isReviewed && (
              <button
                onClick={handleMarkReviewed}
                disabled={marking}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {marking ? 'Marking...' : 'Mark Reviewed'}
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Summary
            </button>

            <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export to EHR
            </button>

            <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Flag className="w-4 h-4" /> Flag for Follow-up
            </button>

            {isClaimed && assessment.assignedProviderName && (
              <span className="ml-auto text-sm text-gray-500">
                Assigned to: <strong className="text-gray-700">{assessment.assignedProviderName}</strong>
              </span>
            )}
          </div>

          {/* Assessment Content */}
          <div className="space-y-4">
            {/* Red Flags */}
            {redFlags.length > 0 && (
              <DetailSection
                title={`Red Flags (${redFlags.length})`}
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                urgency="critical"
              >
                <div className="space-y-2 mt-3">
                  {redFlags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-800 font-medium">{flag}</span>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* Chief Complaint + HPI */}
            <DetailSection
              title="Chief Complaint & HPI"
              icon={<Stethoscope className="w-5 h-5 text-compass-500" />}
            >
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Chief Complaint</p>
                  <p className="text-gray-900 font-medium">{assessment.chiefComplaint}</p>
                </div>
                {assessment.hpiNarrative && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500 uppercase font-medium">HPI Narrative</p>
                      <button
                        onClick={handleCopyNarrative}
                        className="text-xs text-compass-600 hover:text-compass-700 flex items-center gap-1"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                      {assessment.hpiNarrative}
                    </div>
                  </div>
                )}
                {symptoms.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Symptoms</p>
                    <div className="flex flex-wrap gap-2">
                      {symptoms.map((s: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-compass-50 text-compass-700 rounded-full text-sm border border-compass-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DetailSection>

            {/* Medications */}
            {medications.length > 0 && (
              <DetailSection
                title={`Medications (${medications.length})`}
                icon={<Pill className="w-5 h-5 text-amber-500" />}
              >
                <ul className="mt-3 space-y-1.5">
                  {medications.map((med: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <Pill className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      {med}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            {/* Allergies */}
            {allergies.length > 0 && (
              <DetailSection
                title={`Allergies (${allergies.length})`}
                icon={<Shield className="w-5 h-5 text-red-400" />}
                urgency={allergies.length > 0 ? 'warning' : 'info'}
              >
                <div className="mt-3 flex flex-wrap gap-2">
                  {allergies.map((allergy: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 font-medium">
                      {allergy}
                    </span>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* Medical History */}
            {medicalHistory.length > 0 && (
              <DetailSection
                title="Medical History"
                icon={<Heart className="w-5 h-5 text-pink-500" />}
                defaultOpen={false}
              >
                <ul className="mt-3 space-y-1.5">
                  {medicalHistory.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            {/* Review of Systems */}
            {Object.keys(ros).length > 0 && (
              <DetailSection
                title="Review of Systems"
                icon={<Activity className="w-5 h-5 text-blue-500" />}
                defaultOpen={false}
              >
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(ros).map(([system, findings]: [string, any]) => (
                    <div key={system} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1 capitalize">{system}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(findings as string[]).map((finding: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-white text-gray-700 rounded text-xs border border-gray-200">
                            {finding}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* Assessment Metadata */}
            <DetailSection
              title="Assessment Info"
              icon={<FileText className="w-5 h-5 text-gray-400" />}
              defaultOpen={false}
            >
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Session ID</span>
                  <p className="font-mono text-gray-700 text-xs mt-0.5">{assessment.sessionId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Assessment ID</span>
                  <p className="font-mono text-gray-700 text-xs mt-0.5">{assessment.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="text-gray-700 mt-0.5">{assessment.status}</p>
                </div>
                <div>
                  <span className="text-gray-500">Triage Level</span>
                  <p className="text-gray-700 mt-0.5">{assessment.triageLevel}</p>
                </div>
              </div>
            </DetailSection>
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}
