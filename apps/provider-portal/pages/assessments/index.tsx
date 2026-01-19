// Assessment Queue Page - Lists all COMPASS assessments for provider review
import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import type { PatientAssessment } from '@/store/assessmentQueueStore';
import { useAssessmentQueueStore } from '@/store/assessmentQueueStore';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Activity,
  Heart,
  FileText
} from 'lucide-react';
import Link from 'next/link';

// Urgency level color mapping
const urgencyColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  standard: 'bg-green-100 text-green-800 border-green-200',
};

// Status icon mapping
const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', label: 'Pending Review' },
  in_review: { icon: User, color: 'text-blue-600', label: 'In Review' },
  urgent: { icon: AlertTriangle, color: 'text-red-600', label: 'Urgent' },
  completed: { icon: CheckCircle, color: 'text-green-600', label: 'Completed' },
};

export default function AssessmentQueuePage() {
  const { 
    loading, 
    error,
    filters,
    fetchAssessments, 
    setFilters,
    getFilteredAssessments,
    getUrgentCount,
    getPendingCount 
  } = useAssessmentQueueStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAssessments();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAssessments]);

  const assessments = getFilteredAssessments();
  const urgentCount = getUrgentCount();
  const pendingCount = getPendingCount();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAssessments();
    setIsRefreshing(false);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assessment Queue</h1>
              <p className="mt-2 text-gray-600">
                Review patient assessments submitted through COMPASS
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
              label="Urgent Attention" 
              value={urgentCount} 
              color="red"
              icon={AlertTriangle}
              onClick={() => setFilters({ urgency: 'high', status: 'all' })}
            />
            <StatCard 
              label="Pending Review" 
              value={pendingCount} 
              color="amber"
              icon={Clock}
              onClick={() => setFilters({ status: 'pending', urgency: 'all' })}
            />
            <StatCard 
              label="In Review" 
              value={assessments.filter(a => a.status === 'in_review').length} 
              color="blue"
              icon={User}
              onClick={() => setFilters({ status: 'in_review', urgency: 'all' })}
            />
            <StatCard 
              label="Completed Today" 
              value={assessments.filter(a => a.status === 'completed').length} 
              color="green"
              icon={CheckCircle}
              onClick={() => setFilters({ status: 'completed', urgency: 'all' })}
            />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value as any })}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="urgent">Urgent</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={filters.urgency}
                onChange={(e) => setFilters({ urgency: e.target.value as any })}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              >
                <option value="all">All Urgency Levels</option>
                <option value="high">High Priority</option>
                <option value="moderate">Moderate Priority</option>
                <option value="standard">Standard Priority</option>
              </select>

              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({ timeRange: e.target.value as any })}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients, symptoms, diagnoses..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ searchQuery: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                />
              </div>

              {(filters.status !== 'all' || filters.urgency !== 'all' || filters.searchQuery) && (
                <button
                  onClick={() => setFilters({ status: 'all', urgency: 'all', searchQuery: '', timeRange: 'today' })}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Assessment List */}
          {loading && assessments.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading assessments...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
              <button 
                onClick={handleRefresh}
                className="ml-auto text-red-800 underline"
              >
                Try again
              </button>
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No assessments match your filters</p>
              <p className="text-gray-400 mt-2">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <AssessmentCard key={assessment.id} assessment={assessment} />
              ))}
            </div>
          )}

          {/* Results count */}
          {!loading && assessments.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-500">
              Showing {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Stat Card Component
function StatCard({ label, value, color, icon: Icon, onClick }: {
  label: string;
  value: number;
  color: 'red' | 'amber' | 'blue' | 'green';
  icon: any;
  onClick?: () => void;
}) {
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="h-10 w-10 opacity-50" />
      </div>
    </button>
  );
}

// Assessment Card Component
function AssessmentCard({ assessment }: { assessment: PatientAssessment }) {
  const status = statusConfig[assessment.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const urgencyClass = urgencyColors[assessment.urgencyLevel] || urgencyColors.standard;
  const timeAgo = getTimeAgo(assessment.submittedAt);

  return (
    <Link href={`/assessments/${assessment.id}`}>
      <div className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all cursor-pointer ${
        assessment.status === 'urgent' ? 'border-l-4 border-l-red-500' : ''
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Patient Info & Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {assessment.patientName}
              </h3>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${urgencyClass}`}>
                {assessment.urgencyLevel.toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${status.color} bg-opacity-10`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </span>
              <span className="text-sm text-gray-500">
                {assessment.patientAge}yo {assessment.patientGender}
              </span>
            </div>
            
            {/* Chief Complaint */}
            <p className="text-gray-700 mb-3">
              <span className="font-medium">Chief Complaint:</span> {assessment.chiefComplaint}
            </p>

            {/* Red Flags */}
            {assessment.redFlags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {assessment.redFlags.slice(0, 4).map((flag, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center px-2 py-1 text-xs bg-red-50 text-red-700 rounded-full border border-red-200"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {flag}
                  </span>
                ))}
                {assessment.redFlags.length > 4 && (
                  <span className="text-xs text-red-600">
                    +{assessment.redFlags.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Differential Diagnosis Preview */}
            <div className="flex flex-wrap gap-2 mb-3">
              {assessment.differentialDiagnosis.slice(0, 3).map((dx, i) => (
                <span 
                  key={i} 
                  className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  <Activity className="h-3 w-3 mr-1 text-gray-500" />
                  {dx.name}
                  <span className="ml-1 text-gray-500">
                    ({Math.round(dx.probability * 100)}%)
                  </span>
                </span>
              ))}
              {assessment.differentialDiagnosis.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{assessment.differentialDiagnosis.length - 3} more
                </span>
              )}
            </div>

            {/* Risk Factors (if any) */}
            {assessment.riskFactors.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {assessment.riskFactors.slice(0, 3).map((factor, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded"
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    {factor}
                  </span>
                ))}
                {assessment.riskFactors.length > 3 && (
                  <span className="text-xs text-amber-600">
                    +{assessment.riskFactors.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Footer - Timestamps */}
            <div className="flex items-center text-sm text-gray-500 mt-2">
              <Clock className="h-4 w-4 mr-1" />
              <span>Submitted {timeAgo}</span>
              {assessment.reviewedAt && (
                <>
                  <span className="mx-2">•</span>
                  <span>Reviewed {getTimeAgo(assessment.reviewedAt)}</span>
                </>
              )}
            </div>
          </div>

          <ChevronRight className="h-6 w-6 text-gray-400 flex-shrink-0 ml-4" />
        </div>
      </div>
    </Link>
  );
}

// Utility function for relative time
function getTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}
