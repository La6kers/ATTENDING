// Recent Assessments Component for Dashboard
// Shows the most recent COMPASS assessments requiring review

import React, { useEffect } from 'react';
import Link from 'next/link';
import type { PatientAssessment } from '@/store/assessmentQueueStore';
import { useAssessmentQueueStore } from '@/store/assessmentQueueStore';
import { 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  Activity,
  User,
  ArrowRight
} from 'lucide-react';

const urgencyColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  standard: 'bg-green-100 text-green-800 border-green-200',
};

const RecentAssessments = () => {
  const { assessments, fetchAssessments, getFilteredAssessments, loading } = useAssessmentQueueStore();

  useEffect(() => {
    if (assessments.length === 0) {
      fetchAssessments();
    }
  }, [assessments.length, fetchAssessments]);

  // Get top 5 recent assessments that need review
  const recentAssessments = getFilteredAssessments()
    .filter(a => a.status === 'pending' || a.status === 'urgent')
    .slice(0, 5);

  if (loading && assessments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-indigo-600" />
            Recent COMPASS Assessments
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (recentAssessments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-indigo-600" />
            Recent COMPASS Assessments
          </h2>
        </div>
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No pending assessments</p>
          <p className="text-sm text-gray-400 mt-1">New assessments from COMPASS will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-indigo-600" />
          Recent COMPASS Assessments
        </h2>
        <Link 
          href="/assessments" 
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
        >
          View All
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
      
      <div className="divide-y">
        {recentAssessments.map((assessment) => (
          <AssessmentRow key={assessment.id} assessment={assessment} />
        ))}
      </div>
    </div>
  );
};

// Individual assessment row
const AssessmentRow = ({ assessment }: { assessment: PatientAssessment }) => {
  const timeAgo = getTimeAgo(assessment.submittedAt);
  const isUrgent = assessment.urgencyLevel === 'high' || assessment.status === 'urgent';

  return (
    <Link href={`/assessments/${assessment.id}`}>
      <div className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        isUrgent ? 'bg-red-50 hover:bg-red-100' : ''
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 truncate">
                {assessment.patientName}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${urgencyColors[assessment.urgencyLevel]}`}>
                {assessment.urgencyLevel}
              </span>
              {isUrgent && (
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 truncate">
              {assessment.chiefComplaint}
            </p>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                {assessment.patientAge}yo {assessment.patientGender}
              </span>
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {timeAgo}
              </span>
              {assessment.redFlags.length > 0 && (
                <span className="flex items-center text-red-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {assessment.redFlags.length} red flag{assessment.redFlags.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
        </div>
      </div>
    </Link>
  );
};

// Utility function
function getTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days}d ago`;
}

export default RecentAssessments;
