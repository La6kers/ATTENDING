// =============================================================================
// ATTENDING AI - Assessment Results Page
// apps/patient-portal/pages/results/[id].tsx
//
// Detailed view of a specific assessment including:
// - Assessment summary
// - Provider notes and diagnosis
// - Treatment plan and recommendations
// - Follow-up instructions
// =============================================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  Pill,
  Activity,
  MessageSquare,
  Download,
  Share2,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Types
import type { UrgencyLevel, HPIData } from '../../../shared/types/chat.types';

// ============================================================================
// Types
// ============================================================================

interface AssessmentResult {
  id: string;
  chiefComplaint: string;
  status: 'in_progress' | 'pending' | 'in_review' | 'completed';
  urgencyLevel: UrgencyLevel;
  submittedAt: string;
  reviewedAt?: string;

  // Patient info
  patientName: string;

  // Clinical data
  hpi: HPIData;
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  redFlags: string[];

  // Provider additions (only for completed)
  providerName?: string;
  diagnosis?: string[];
  icdCodes?: string[];
  treatmentPlan?: string;
  followUpInstructions?: string;
  providerNotes?: string;
  ordersPlaced?: string[];
}

// ============================================================================
// Section Component
// ============================================================================

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && <div className="px-4 pb-4 border-t border-gray-100">{children}</div>}
    </div>
  );
};

// ============================================================================
// Status Header Component
// ============================================================================

const StatusHeader: React.FC<{ result: AssessmentResult }> = ({ result }) => {
  const statusConfig = {
    in_progress: { label: 'In Progress', color: 'bg-blue-500', icon: Clock },
    pending: { label: 'Pending Review', color: 'bg-yellow-500', icon: Clock },
    in_review: { label: 'Under Review', color: 'bg-purple-500', icon: Activity },
    completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle },
  };

  const { label, color, icon: Icon } = statusConfig[result.status];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={`${color} text-white p-4 rounded-xl`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{label}</span>
      </div>
      <h2 className="text-lg font-medium mb-1">{result.chiefComplaint}</h2>
      <p className="text-sm opacity-90">Submitted: {formatDate(result.submittedAt)}</p>
      {result.reviewedAt && <p className="text-sm opacity-90">Reviewed: {formatDate(result.reviewedAt)}</p>}
    </div>
  );
};

// ============================================================================
// HPI Display Component
// ============================================================================

const HPIDisplay: React.FC<{ hpi: HPIData }> = ({ hpi }) => {
  const items = [
    { label: 'Onset', value: hpi.onset },
    { label: 'Location', value: hpi.location },
    { label: 'Duration', value: hpi.duration },
    { label: 'Character', value: hpi.character },
    { label: 'Severity', value: hpi.severity ? `${hpi.severity}/10` : undefined },
    { label: 'Aggravating Factors', value: hpi.aggravating?.join(', ') },
    { label: 'Relieving Factors', value: hpi.relieving?.join(', ') },
    { label: 'Associated Symptoms', value: hpi.associated?.join(', ') },
  ].filter((item) => item.value);

  return (
    <div className="mt-3 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex">
          <span className="text-sm text-gray-500 w-36 flex-shrink-0">{item.label}:</span>
          <span className="text-sm text-gray-900">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Tag List Component
// ============================================================================

const TagList: React.FC<{ items: string[]; color?: 'purple' | 'blue' | 'red' | 'green' | 'gray' }> = ({
  items,
  color = 'gray',
}) => {
  const colors = {
    purple: 'bg-purple-50 text-purple-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  if (items.length === 0) {
    return <p className="text-sm text-gray-400 mt-2">None reported</p>;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {items.map((item, i) => (
        <span key={i} className={`text-sm px-3 py-1 rounded-full ${colors[color]}`}>
          {item}
        </span>
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function AssessmentResultPage() {
  const router = useRouter();
  const { id } = router.query;
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch assessment data
  useEffect(() => {
    if (!id) return;

    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/patient/assessments/${id}`);
        if (res.ok) {
          const data = await res.json();
          setResult(data.assessment);
        } else if (res.status === 404) {
          setError('Assessment not found');
        } else {
          setError('Failed to load assessment');
        }
      } catch (err) {
        setError('Failed to load assessment');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  // Mock data for demonstration
  useEffect(() => {
    if (!loading || !id) return;

    // Simulate API response with mock data
    setTimeout(() => {
      setResult({
        id: id as string,
        chiefComplaint: 'Persistent headache for 3 days',
        status: 'completed',
        urgencyLevel: 'moderate',
        submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        reviewedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        patientName: 'John Doe',
        hpi: {
          onset: 'Started 3 days ago, gradual',
          location: 'Bilateral frontal area',
          duration: 'Constant, varies in intensity',
          character: 'Pressure-like, dull',
          severity: 6,
          aggravating: ['Stress', 'Screen time', 'Lack of sleep'],
          relieving: ['Rest', 'Dark room', 'Ibuprofen'],
          associated: ['Mild nausea', 'Light sensitivity'],
        },
        medications: ['Ibuprofen 400mg PRN', 'Vitamin D 2000IU daily'],
        allergies: ['NKDA'],
        medicalHistory: ['Migraines (diagnosed 2020)', 'Anxiety'],
        redFlags: [],
        providerName: 'Smith',
        diagnosis: ['Tension-type headache', 'Possible migraine variant'],
        icdCodes: ['G44.2', 'G43.909'],
        treatmentPlan:
          'Continue OTC pain relief. Try stress management techniques. Consider preventive therapy if frequency increases.',
        followUpInstructions:
          'Return in 2 weeks if symptoms persist. Seek immediate care if experiencing sudden severe headache, vision changes, or neurological symptoms.',
        providerNotes:
          'Patient presents with typical tension-type headache pattern. No red flags identified. Discussed lifestyle modifications and trigger avoidance.',
        ordersPlaced: ['Headache diary for 2 weeks'],
      });
      setLoading(false);
    }, 500);
  }, [loading, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{error || 'Assessment not found'}</h2>
          <Link href="/dashboard">
            <button className="text-purple-600 hover:text-purple-700">Return to Dashboard</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Assessment Results | COMPASS - ATTENDING AI</title>
        <meta name="description" content="View your assessment results" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-lg font-semibold text-gray-900">Assessment Details</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Download">
                  <Download className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Print">
                  <Printer className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Status Header */}
          <StatusHeader result={result} />

          {/* Red Flags Warning */}
          {result.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Red Flags Identified</h3>
                  <ul className="mt-2 space-y-1">
                    {result.redFlags.map((flag, i) => (
                      <li key={i} className="text-sm text-red-700">
                        • {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Provider Review (for completed assessments) */}
          {result.status === 'completed' && result.providerName && (
            <Section title="Provider Review" icon={<User className="w-5 h-5 text-purple-600" />}>
              <div className="mt-3 space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Reviewed by Dr. {result.providerName}</span>
                </div>

                {/* Diagnosis */}
                {result.diagnosis && result.diagnosis.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Diagnosis</h4>
                    <TagList items={result.diagnosis} color="purple" />
                    {result.icdCodes && (
                      <p className="text-xs text-gray-400 mt-1">ICD-10: {result.icdCodes.join(', ')}</p>
                    )}
                  </div>
                )}

                {/* Treatment Plan */}
                {result.treatmentPlan && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Treatment Plan</h4>
                    <p className="text-sm text-gray-600 mt-1">{result.treatmentPlan}</p>
                  </div>
                )}

                {/* Follow-up Instructions */}
                {result.followUpInstructions && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-purple-800">Follow-up Instructions</h4>
                    <p className="text-sm text-purple-700 mt-1">{result.followUpInstructions}</p>
                  </div>
                )}

                {/* Provider Notes */}
                {result.providerNotes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Provider Notes</h4>
                    <p className="text-sm text-gray-600 mt-1 italic">{result.providerNotes}</p>
                  </div>
                )}

                {/* Orders */}
                {result.ordersPlaced && result.ordersPlaced.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Orders Placed</h4>
                    <TagList items={result.ordersPlaced} color="blue" />
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* History of Present Illness */}
          <Section title="History of Present Illness" icon={<FileText className="w-5 h-5 text-blue-600" />}>
            <HPIDisplay hpi={result.hpi} />
          </Section>

          {/* Medications */}
          <Section title="Medications" icon={<Pill className="w-5 h-5 text-green-600" />} defaultOpen={false}>
            <TagList items={result.medications} color="green" />
          </Section>

          {/* Allergies */}
          <Section title="Allergies" icon={<AlertTriangle className="w-5 h-5 text-red-600" />} defaultOpen={false}>
            <TagList
              items={result.allergies[0] === 'NKDA' ? [] : result.allergies}
              color="red"
            />
            {result.allergies[0] === 'NKDA' && (
              <p className="text-sm text-gray-500 mt-2">No known drug allergies (NKDA)</p>
            )}
          </Section>

          {/* Medical History */}
          <Section title="Medical History" icon={<Activity className="w-5 h-5 text-purple-600" />} defaultOpen={false}>
            <TagList items={result.medicalHistory} color="purple" />
          </Section>

          {/* Pending Review Notice */}
          {(result.status === 'pending' || result.status === 'in_review') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <h3 className="font-medium text-yellow-800">Awaiting Provider Review</h3>
              <p className="text-sm text-yellow-700 mt-1">
                A healthcare provider will review your assessment soon. You'll be notified when results are ready.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link href="/chat" className="flex-1">
              <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl py-3 font-medium hover:shadow-lg transition-shadow">
                Start New Assessment
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                Dashboard
              </button>
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
