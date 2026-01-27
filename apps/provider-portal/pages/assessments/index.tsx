// =============================================================================
// ATTENDING AI - Pending Assessments Page
// apps/provider-portal/pages/assessments/index.tsx
//
// Shows all pending COMPASS assessments awaiting provider review
// List/Card toggle view
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Home,
  Brain,
  Activity,
  AlertTriangle,
  Clock,
  ChevronRight,
  User,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Sparkles,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';

// =============================================================================
// Theme
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface Assessment {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  mrn: string;
  chiefComplaint: string;
  submittedAt: string;
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  redFlags: string[];
  status: 'pending' | 'in_review' | 'completed';
  aiConfidence: number;
  primaryDiagnosis?: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const getMockAssessments = (): Assessment[] => [
  {
    id: 'a1',
    patientName: 'Sarah Johnson',
    patientAge: 32,
    patientGender: 'Female',
    mrn: '78932145',
    chiefComplaint: 'Severe headache for 3 days',
    submittedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    urgencyLevel: 'high',
    redFlags: ['Worst headache of life', 'Confusion', 'Elevated BP'],
    status: 'pending',
    aiConfidence: 0.85,
    primaryDiagnosis: 'Migraine with Aura',
  },
  {
    id: 'a2',
    patientName: 'Margaret White',
    patientAge: 72,
    patientGender: 'Female',
    mrn: 'MRN-020',
    chiefComplaint: 'Shortness of breath',
    submittedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    urgencyLevel: 'high',
    redFlags: ['Acute dyspnea', 'Orthopnea', 'Lower extremity edema'],
    status: 'pending',
    aiConfidence: 0.78,
    primaryDiagnosis: 'Acute CHF Exacerbation',
  },
  {
    id: 'a3',
    patientName: 'Dorothy Clark',
    patientAge: 81,
    patientGender: 'Female',
    mrn: 'MRN-021',
    chiefComplaint: 'Fall at home',
    submittedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    urgencyLevel: 'emergency',
    redFlags: ['Head injury', 'On anticoagulation', 'Loss of consciousness'],
    status: 'pending',
    aiConfidence: 0.92,
    primaryDiagnosis: 'Traumatic Brain Injury',
  },
  {
    id: 'a4',
    patientName: 'Robert Martinez',
    patientAge: 66,
    patientGender: 'Male',
    mrn: 'MRN-022',
    chiefComplaint: 'Chest discomfort',
    submittedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    urgencyLevel: 'high',
    redFlags: ['Chest pain', 'Diaphoresis'],
    status: 'pending',
    aiConfidence: 0.72,
    primaryDiagnosis: 'Acute Coronary Syndrome',
  },
  {
    id: 'a5',
    patientName: 'Kevin Martinez',
    patientAge: 28,
    patientGender: 'Male',
    mrn: 'MRN-023',
    chiefComplaint: 'Establish care',
    submittedAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    urgencyLevel: 'standard',
    redFlags: [],
    status: 'pending',
    aiConfidence: 0.95,
    primaryDiagnosis: 'Wellness Visit',
  },
  {
    id: 'a6',
    patientName: 'Linda Thompson',
    patientAge: 45,
    patientGender: 'Female',
    mrn: 'MRN-024',
    chiefComplaint: 'Abdominal pain',
    submittedAt: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    urgencyLevel: 'moderate',
    redFlags: ['RLQ tenderness'],
    status: 'in_review',
    aiConfidence: 0.81,
    primaryDiagnosis: 'Appendicitis',
  },
  {
    id: 'a7',
    patientName: 'James Wilson',
    patientAge: 55,
    patientGender: 'Male',
    mrn: 'MRN-025',
    chiefComplaint: 'Chronic back pain',
    submittedAt: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    urgencyLevel: 'standard',
    redFlags: [],
    status: 'pending',
    aiConfidence: 0.88,
    primaryDiagnosis: 'Lumbar Radiculopathy',
  },
  {
    id: 'a8',
    patientName: 'Patricia Brown',
    patientAge: 38,
    patientGender: 'Female',
    mrn: 'MRN-026',
    chiefComplaint: 'Anxiety and insomnia',
    submittedAt: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
    urgencyLevel: 'standard',
    redFlags: [],
    status: 'pending',
    aiConfidence: 0.76,
    primaryDiagnosis: 'Generalized Anxiety Disorder',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

const getTimeAgo = (dateString: string): string => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getUrgencyColor = (level: Assessment['urgencyLevel']) => {
  switch (level) {
    case 'emergency': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'moderate': return 'bg-yellow-500';
    case 'standard': return 'bg-green-500';
  }
};

const getUrgencyBadge = (level: Assessment['urgencyLevel']) => {
  switch (level) {
    case 'emergency': return 'bg-red-100 text-red-700 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'moderate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'standard': return 'bg-green-100 text-green-700 border-green-200';
  }
};

// =============================================================================
// List Row Component
// =============================================================================

const AssessmentListRow: React.FC<{ assessment: Assessment; onClick: () => void }> = ({ assessment, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all group"
    >
      {/* Urgency Indicator */}
      <div className={`w-1.5 h-14 rounded-full flex-shrink-0 ${getUrgencyColor(assessment.urgencyLevel)}`} />

      {/* Patient Info */}
      <div className="w-48 flex-shrink-0">
        <p className="font-semibold text-gray-900">{assessment.patientName}</p>
        <p className="text-sm text-gray-500">{assessment.patientAge}yo {assessment.patientGender} • {assessment.mrn}</p>
      </div>

      {/* Chief Complaint */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 truncate">{assessment.chiefComplaint}</p>
        {assessment.primaryDiagnosis && (
          <div className="flex items-center gap-2 mt-1">
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span className="text-sm text-purple-600">{assessment.primaryDiagnosis}</span>
            <span className="text-xs text-purple-500 font-medium">({Math.round(assessment.aiConfidence * 100)}%)</span>
          </div>
        )}
      </div>

      {/* Red Flags */}
      <div className="w-64 flex-shrink-0">
        {assessment.redFlags.length > 0 ? (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-600 truncate">{assessment.redFlags.slice(0, 2).join(', ')}</span>
            {assessment.redFlags.length > 2 && (
              <span className="text-xs text-red-500">+{assessment.redFlags.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400">No red flags</span>
        )}
      </div>

      {/* Status & Time */}
      <div className="w-32 flex-shrink-0 text-right">
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyBadge(assessment.urgencyLevel)}`}>
          {assessment.urgencyLevel.toUpperCase()}
        </span>
        <p className="text-xs text-gray-500 mt-1">{getTimeAgo(assessment.submittedAt)}</p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </div>
  );
};

// =============================================================================
// Card Component
// =============================================================================

const AssessmentCard: React.FC<{ assessment: Assessment; onClick: () => void }> = ({ assessment, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-l-4 ${
        assessment.urgencyLevel === 'emergency' ? 'border-l-red-500' :
        assessment.urgencyLevel === 'high' ? 'border-l-orange-500' :
        assessment.urgencyLevel === 'moderate' ? 'border-l-yellow-500' : 'border-l-green-500'
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getUrgencyColor(assessment.urgencyLevel)}`}>
              {assessment.patientName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{assessment.patientName}</h3>
              <p className="text-gray-500 text-sm">
                {assessment.patientAge}yo {assessment.patientGender} • {assessment.mrn}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getUrgencyBadge(assessment.urgencyLevel)}`}>
            {assessment.urgencyLevel.toUpperCase()}
          </span>
        </div>

        {/* Chief Complaint */}
        <div className="mb-3">
          <p className="text-sm text-gray-500 mb-1">Chief Complaint</p>
          <p className="font-medium text-gray-900">{assessment.chiefComplaint}</p>
        </div>

        {/* Red Flags */}
        {assessment.redFlags.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">Red Flags ({assessment.redFlags.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {assessment.redFlags.map((flag, i) => (
                <span key={i} className="px-2 py-0.5 bg-white rounded text-xs text-red-700">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Diagnosis */}
        {assessment.primaryDiagnosis && (
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <div className="flex-1">
              <p className="text-xs text-purple-600 font-medium">AI Diagnosis</p>
              <p className="text-sm font-semibold text-purple-900">{assessment.primaryDiagnosis}</p>
            </div>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
              {Math.round(assessment.aiConfidence * 100)}%
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Clock className="w-4 h-4" />
            {getTimeAgo(assessment.submittedAt)}
          </div>
          <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
            Review
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function AssessmentsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_review'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  useEffect(() => {
    setTimeout(() => {
      setAssessments(getMockAssessments());
      setLoading(false);
    }, 300);
  }, []);

  const filteredAssessments = assessments
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => 
      searchQuery === '' ||
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.mrn.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const urgencyOrder = { emergency: 0, high: 1, moderate: 2, standard: 3 };
      if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
        return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  const pendingCount = assessments.filter(a => a.status === 'pending').length;
  const inReviewCount = assessments.filter(a => a.status === 'in_review').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pending Assessments | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen" style={{ background: theme.gradient }}>
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link
                  href="/"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Home className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-white">Pending Assessments</h1>
                  <p className="text-purple-200 text-sm">COMPASS patient assessments awaiting review</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex items-center bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-purple-700' : 'text-white hover:bg-white/10'}`}
                    title="List View"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white text-purple-700' : 'text-white hover:bg-white/10'}`}
                    title="Card View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => {
                      setAssessments(getMockAssessments());
                      setLoading(false);
                    }, 300);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm">Pending Review</p>
                  <p className="text-2xl font-bold text-white">{pendingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm">In Review</p>
                  <p className="text-2xl font-bold text-white">{inReviewCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm">High Priority</p>
                  <p className="text-2xl font-bold text-white">
                    {assessments.filter(a => a.urgencyLevel === 'high' || a.urgencyLevel === 'emergency').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              {[
                { value: 'pending', label: 'Pending', count: pendingCount },
                { value: 'in_review', label: 'In Review', count: inReviewCount },
                { value: 'all', label: 'All', count: assessments.length },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as typeof filter)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${
                    filter === f.value
                      ? 'bg-white text-purple-700'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {f.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    filter === f.value ? 'bg-purple-100 text-purple-700' : 'bg-white/20'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
              <input
                type="text"
                placeholder="Search by patient name, complaint, or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>

          {/* Assessments - List or Grid */}
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredAssessments.map((assessment) => (
                <AssessmentListRow
                  key={assessment.id}
                  assessment={assessment}
                  onClick={() => router.push(`/previsit/${assessment.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  onClick={() => router.push(`/previsit/${assessment.id}`)}
                />
              ))}
            </div>
          )}

          {filteredAssessments.length === 0 && (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
              <p className="text-purple-200">No assessments match your current filter.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
