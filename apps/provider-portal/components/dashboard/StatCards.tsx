import React, { useEffect } from 'react';
import { Activity, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAssessmentQueueStore } from '@/store/assessmentQueueStore';

interface StatCardsProps {
  compact?: boolean;
}

const StatCards: React.FC<StatCardsProps> = ({ compact = false }) => {
  // Get assessment counts from store
  const { 
    assessments, 
    fetchAssessments, 
    getUrgentCount, 
    getPendingCount 
  } = useAssessmentQueueStore();

  useEffect(() => {
    if (assessments.length === 0) {
      fetchAssessments();
    }
  }, [assessments.length, fetchAssessments]);

  const urgentCount = getUrgentCount();
  const pendingCount = getPendingCount();
  const inReviewCount = assessments.filter(a => a.status === 'in_review').length;
  const completedTodayCount = assessments.filter(a => {
    if (!a.completedAt) return false;
    const completedDate = new Date(a.completedAt);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  }).length;

  const stats = [
    {
      title: 'COMPASS Assessments',
      shortTitle: 'Assessments',
      value: pendingCount.toString(),
      subtitle: 'Awaiting review',
      icon: Activity,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      href: '/assessments',
    },
    {
      title: 'Urgent Alerts',
      shortTitle: 'Urgent',
      value: urgentCount.toString(),
      subtitle: 'Require immediate attention',
      icon: AlertCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      href: '/assessments?urgency=high',
      pulse: urgentCount > 0,
    },
    {
      title: 'In Review',
      shortTitle: 'In Review',
      value: inReviewCount.toString(),
      subtitle: 'Currently being reviewed',
      icon: Clock,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      href: '/assessments?status=in_review',
    },
    {
      title: 'Completed Today',
      shortTitle: 'Completed',
      value: completedTodayCount.toString(),
      subtitle: 'Reviews finished',
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      href: '/assessments?status=completed',
    },
  ];

  // Compact mode for resizable grid cards
  if (compact) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 h-full">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} href={stat.href} className="block h-full">
              <div className={`bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-all cursor-pointer h-full flex flex-col justify-center ${
                stat.pulse ? 'ring-2 ring-red-300 animate-pulse' : ''
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`${stat.bgColor} p-1.5 rounded ${stat.pulse ? 'animate-pulse' : ''}`}>
                    <Icon className={`w-4 h-4 ${stat.textColor}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 truncate">
                    {stat.shortTitle}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  // Default full-size mode
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Link key={index} href={stat.href}>
            <div className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all cursor-pointer border-l-4 ${
              stat.pulse ? 'border-l-red-500 animate-pulse' : 'border-l-transparent hover:border-l-indigo-500'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg ${stat.pulse ? 'animate-pulse' : ''}`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default StatCards;
