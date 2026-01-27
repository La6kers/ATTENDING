/**
 * ATTENDING AI - Assessment Queue
 * 
 * Component for viewing pending patient assessments from COMPASS.
 * Shows emergency assessments prominently with red flag indicators.
 */

import React, { useState } from 'react';
import {
  usePendingReviewAssessments,
  useRedFlagAssessments,
  AssessmentSummary,
} from '../lib/api/backend';

// Triage level colors and labels
const triageLevels: Record<string, { color: string; label: string; description: string }> = {
  Level1_Resuscitation: {
    color: 'bg-red-600 text-white',
    label: 'Level 1',
    description: 'Resuscitation - Immediate',
  },
  Level2_Emergent: {
    color: 'bg-orange-500 text-white',
    label: 'Level 2',
    description: 'Emergent - 10 min',
  },
  Level3_Urgent: {
    color: 'bg-yellow-500 text-black',
    label: 'Level 3',
    description: 'Urgent - 30 min',
  },
  Level4_LessUrgent: {
    color: 'bg-green-500 text-white',
    label: 'Level 4',
    description: 'Less Urgent - 60 min',
  },
  Level5_NonUrgent: {
    color: 'bg-blue-500 text-white',
    label: 'Level 5',
    description: 'Non-Urgent - 120 min',
  },
};

interface AssessmentQueueProps {
  onSelectAssessment?: (assessmentId: string) => void;
}

export function AssessmentQueue({ onSelectAssessment }: AssessmentQueueProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'emergency'>('pending');

  // Fetch pending assessments
  const { 
    data: pendingAssessments, 
    isLoading: pendingLoading, 
    refetch: refetchPending 
  } = usePendingReviewAssessments();

  // Fetch emergency assessments
  const { 
    data: emergencyAssessments, 
    isLoading: emergencyLoading, 
    refetch: refetchEmergency 
  } = useRedFlagAssessments();

  const isLoading = pendingLoading || emergencyLoading;
  const emergencyCount = emergencyAssessments?.length || 0;
  const pendingCount = pendingAssessments?.length || 0;

  const handleRefresh = () => {
    refetchPending();
    refetchEmergency();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Assessment Queue</h3>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Review
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'emergency'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🚨 Emergency
            {emergencyCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full animate-pulse">
                {emergencyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading assessments...</p>
          </div>
        ) : activeTab === 'emergency' ? (
          emergencyAssessments?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-2xl mb-2">✓</p>
              <p>No emergency assessments</p>
            </div>
          ) : (
            emergencyAssessments?.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                isEmergency={true}
                onClick={() => onSelectAssessment?.(assessment.id)}
              />
            ))
          )
        ) : pendingAssessments?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No pending assessments</p>
          </div>
        ) : (
          pendingAssessments?.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              isEmergency={assessment.hasRedFlags}
              onClick={() => onSelectAssessment?.(assessment.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Assessment Card Component
// =============================================================================

interface AssessmentCardProps {
  assessment: AssessmentSummary;
  isEmergency: boolean;
  onClick: () => void;
}

function AssessmentCard({ assessment, isEmergency, onClick }: AssessmentCardProps) {
  const triageInfo = assessment.triageLevel 
    ? triageLevels[assessment.triageLevel] 
    : null;

  const waitTime = calculateWaitTime(assessment.startedAt);

  return (
    <div
      onClick={onClick}
      className={`px-4 py-4 cursor-pointer transition-colors ${
        isEmergency 
          ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500' 
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Patient Info */}
          <div className="flex items-center gap-2 mb-1">
            {isEmergency && (
              <span className="text-red-500 animate-pulse">🚨</span>
            )}
            <span className="font-medium text-gray-900">
              {assessment.patient?.fullName || 'Unknown Patient'}
            </span>
            {assessment.patient?.mrn && (
              <span className="text-gray-500 text-sm">
                ({assessment.patient.mrn})
              </span>
            )}
          </div>

          {/* Chief Complaint */}
          <p className="text-gray-700 text-sm mb-2">
            {assessment.chiefComplaint}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {/* Triage Level */}
            {triageInfo && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${triageInfo.color}`}>
                {triageInfo.label} - {triageInfo.description}
              </span>
            )}

            {/* Red Flag Indicator */}
            {assessment.hasRedFlags && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                ⚠️ Red Flags
              </span>
            )}

            {/* Phase */}
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
              {formatPhase(assessment.currentPhase)}
            </span>

            {/* Assessment Number */}
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-600 rounded">
              {assessment.assessmentNumber}
            </span>
          </div>
        </div>

        {/* Right Side - Wait Time */}
        <div className="text-right ml-4">
          <p className={`text-sm font-medium ${
            waitTime.isLong ? 'text-red-600' : 'text-gray-500'
          }`}>
            {waitTime.display}
          </p>
          <p className="text-xs text-gray-400">
            waiting
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateWaitTime(startedAt: string): { display: string; isLong: boolean } {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return { display: 'Just now', isLong: false };
  } else if (diffMins < 60) {
    return { display: `${diffMins} min`, isLong: diffMins > 30 };
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { 
      display: `${hours}h ${mins}m`, 
      isLong: true 
    };
  }
}

function formatPhase(phase: string): string {
  const phaseMap: Record<string, string> = {
    Welcome: 'Welcome',
    ChiefComplaint: 'Chief Complaint',
    HPI: 'History',
    ReviewOfSystems: 'Review of Systems',
    MedicalHistory: 'Medical History',
    SocialHistory: 'Social History',
    FamilyHistory: 'Family History',
    Allergies: 'Allergies',
    Medications: 'Medications',
    VitalSigns: 'Vitals',
    Summary: 'Summary',
    Completed: 'Completed',
  };
  return phaseMap[phase] || phase;
}

export default AssessmentQueue;
