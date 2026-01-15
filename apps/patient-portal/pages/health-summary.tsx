// =============================================================================
// ATTENDING AI - Health Summary Page
// apps/patient-portal/pages/health-summary.tsx
//
// Comprehensive view of patient's health history including:
// - All past assessments
// - Health trends
// - Medical history summary
// - Medications and allergies
// =============================================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  FileText,
  Pill,
  AlertTriangle,
  Activity,
  Calendar,
  ChevronRight,
  Filter,
  Search,
  Clock,
  CheckCircle,
  Heart,
  Stethoscope,
} from 'lucide-react';

// Types
import type { UrgencyLevel } from '../../shared/types/chat.types';

// ============================================================================
// Types
// ============================================================================

interface Assessment {
  id: string;
  chiefComplaint: string;
  status: 'in_progress' | 'pending' | 'in_review' | 'completed';
  urgencyLevel: UrgencyLevel;
  submittedAt: string;
  reviewedAt?: string;
  providerName?: string;
  diagnosis?: string[];
  followUp?: string;
}

interface HealthProfile {
  conditions: string[];
  medications: string[];
  allergies: string[];
  lastUpdated: string;
}

// ============================================================================
// Filter Tabs Component
// ============================================================================

const FilterTabs: React.FC<{
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}> = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeFilter === filter.id
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// Assessment List Item
// ============================================================================

const AssessmentListItem: React.FC<{ assessment: Assessment }> = ({ assessment }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusConfig = {
    in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100' },
    pending: { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    in_review: { label: 'In Review', color: 'text-purple-600', bg: 'bg-purple-100' },
    completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
  };

  const { label, color, bg } = statusConfig[assessment.status];

  return (
    <Link href={`/results/${assessment.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>{label}</span>
              {assessment.urgencyLevel !== 'standard' && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    assessment.urgencyLevel === 'emergency'
                      ? 'bg-red-100 text-red-700'
                      : assessment.urgencyLevel === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {assessment.urgencyLevel}
                </span>
              )}
            </div>
            <h3 className="font-medium text-gray-900">{assessment.chiefComplaint}</h3>
            <p className="text-sm text-gray-500 mt-1">{formatDate(assessment.submittedAt)}</p>

            {assessment.diagnosis && assessment.diagnosis.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {assessment.diagnosis.slice(0, 2).map((dx, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {dx}
                  </span>
                ))}
                {assessment.diagnosis.length > 2 && (
                  <span className="text-xs text-gray-400">+{assessment.diagnosis.length - 2} more</span>
                )}
              </div>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
};

// ============================================================================
// Health Profile Card
// ============================================================================

const HealthProfileCard: React.FC<{ profile: HealthProfile }> = ({ profile }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Health Profile
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Conditions */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-purple-600" />
            Medical Conditions
          </h4>
          {profile.conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {profile.conditions.map((condition, i) => (
                <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                  {condition}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">None reported</p>
          )}
        </div>

        {/* Medications */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Pill className="w-4 h-4 text-blue-600" />
            Current Medications
          </h4>
          {profile.medications.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {profile.medications.map((med, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {med}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">None reported</p>
          )}
        </div>

        {/* Allergies */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Allergies
          </h4>
          {profile.allergies.length > 0 && profile.allergies[0] !== 'NKDA' ? (
            <div className="flex flex-wrap gap-1">
              {profile.allergies.map((allergy, i) => (
                <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No known drug allergies (NKDA)</p>
          )}
        </div>

        <p className="text-xs text-gray-400 pt-2 border-t">
          Last updated: {new Date(profile.lastUpdated).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function HealthSummaryPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/patient/assessments');
        if (res.ok) {
          const data = await res.json();
          setAssessments(data.assessments || []);
        }

        const profileRes = await fetch('/api/patient/health-profile');
        if (profileRes.ok) {
          const data = await profileRes.json();
          setHealthProfile(data.profile);
        }
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Mock data
  useEffect(() => {
    if (loading) return;
    if (assessments.length === 0) {
      setAssessments([
        {
          id: '1',
          chiefComplaint: 'Persistent headache for 3 days',
          status: 'completed',
          urgencyLevel: 'moderate',
          submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          reviewedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          providerName: 'Smith',
          diagnosis: ['Tension headache', 'Dehydration'],
          followUp: '2 weeks',
        },
        {
          id: '2',
          chiefComplaint: 'Follow-up for blood pressure',
          status: 'pending',
          urgencyLevel: 'standard',
          submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: '3',
          chiefComplaint: 'Annual wellness check',
          status: 'completed',
          urgencyLevel: 'standard',
          submittedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          reviewedAt: new Date(Date.now() - 86400000 * 29).toISOString(),
          providerName: 'Johnson',
          diagnosis: ['Routine examination - no issues'],
        },
      ]);
    }

    if (!healthProfile) {
      setHealthProfile({
        conditions: ['Hypertension', 'Type 2 Diabetes'],
        medications: ['Lisinopril 10mg', 'Metformin 500mg'],
        allergies: ['Penicillin', 'Sulfa'],
        lastUpdated: new Date(Date.now() - 86400000 * 7).toISOString(),
      });
    }
  }, [loading, assessments.length, healthProfile]);

  // Filter assessments
  const filteredAssessments = assessments.filter((a) => {
    // Status filter
    if (filter === 'pending' && !['pending', 'in_review', 'in_progress'].includes(a.status)) return false;
    if (filter === 'completed' && a.status !== 'completed') return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        a.chiefComplaint.toLowerCase().includes(query) ||
        a.diagnosis?.some((d) => d.toLowerCase().includes(query))
      );
    }

    return true;
  });

  return (
    <>
      <Head>
        <title>Health Summary | COMPASS - ATTENDING AI</title>
        <meta name="description" content="View your health history and past assessments" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Health Summary</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Health Profile */}
          {healthProfile && <HealthProfileCard profile={healthProfile} />}

          {/* Assessments Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Assessment History</h2>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <FilterTabs activeFilter={filter} onFilterChange={setFilter} />

            {/* Assessment List */}
            <div className="space-y-3 mt-4">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))
              ) : filteredAssessments.length > 0 ? (
                filteredAssessments.map((assessment) => (
                  <AssessmentListItem key={assessment.id} assessment={assessment} />
                ))
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No assessments found</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-sm text-purple-600 hover:text-purple-700 mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
