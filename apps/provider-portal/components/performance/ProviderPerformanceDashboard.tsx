// ============================================================
// ATTENDING AI - Provider Performance Dashboard
// apps/provider-portal/components/performance/ProviderPerformanceDashboard.tsx
//
// Phase 8B: Individual provider metrics with peer comparison
// Drives quality improvement and continuous learning
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  User,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Clock,
  Users,
  Activity,
  Brain,
  CheckCircle,
  AlertCircle,
  Calendar,
  BarChart3,
  PieChart,
  Star,
  Medal,
  Zap,
  BookOpen,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface ProviderMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  peerAverage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  unit: string;
  category: 'quality' | 'efficiency' | 'patient_experience' | 'ai_adoption';
  description?: string;
}

export interface ProviderPerformanceData {
  providerId: string;
  providerName: string;
  credentials: string;
  specialty: string;
  department: string;
  metrics: ProviderMetric[];
  overallScore: number;
  peerRank: number;
  totalPeers: number;
  badges: Badge[];
  recentAchievements: Achievement[];
  improvementAreas: ImprovementArea[];
  aiUsageStats: AIUsageStats;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'star' | 'medal' | 'trophy' | 'target' | 'zap';
  earnedDate: Date;
  category: 'quality' | 'efficiency' | 'innovation' | 'leadership';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: Date;
  metric?: string;
  improvement?: number;
}

export interface ImprovementArea {
  id: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  peerAverage: number;
  recommendations: string[];
  resources: { title: string; link: string }[];
}

export interface AIUsageStats {
  totalRecommendationsReviewed: number;
  acceptanceRate: number;
  feedbackProvided: number;
  averageReviewTime: number;
  topUsedFeatures: { feature: string; count: number }[];
}

// ============================================================
// MOCK DATA
// ============================================================

const mockProviderData: ProviderPerformanceData = {
  providerId: 'P001',
  providerName: 'Dr. Sarah Smith',
  credentials: 'MD, FAAFP',
  specialty: 'Family Medicine',
  department: 'Primary Care',
  overallScore: 87,
  peerRank: 3,
  totalPeers: 15,
  metrics: [
    {
      id: 'm1',
      name: 'Patient Satisfaction',
      value: 92,
      target: 90,
      peerAverage: 85,
      trend: 'up',
      trendValue: 3,
      unit: '%',
      category: 'patient_experience',
      description: 'Based on post-visit surveys',
    },
    {
      id: 'm2',
      name: 'Documentation Time',
      value: 5.2,
      target: 6,
      peerAverage: 8.5,
      trend: 'down',
      trendValue: -15,
      unit: 'min/patient',
      category: 'efficiency',
      description: 'Average time spent on documentation per encounter',
    },
    {
      id: 'm3',
      name: 'Patients Seen Daily',
      value: 24,
      target: 22,
      peerAverage: 20,
      trend: 'up',
      trendValue: 8,
      unit: 'patients',
      category: 'efficiency',
    },
    {
      id: 'm4',
      name: 'Diabetes Control Rate',
      value: 78,
      target: 80,
      peerAverage: 72,
      trend: 'up',
      trendValue: 5,
      unit: '%',
      category: 'quality',
      description: 'Patients with A1c < 8%',
    },
    {
      id: 'm5',
      name: 'Hypertension Control',
      value: 82,
      target: 75,
      peerAverage: 70,
      trend: 'stable',
      trendValue: 1,
      unit: '%',
      category: 'quality',
      description: 'Patients with BP < 140/90',
    },
    {
      id: 'm6',
      name: 'Preventive Care Completion',
      value: 85,
      target: 85,
      peerAverage: 78,
      trend: 'up',
      trendValue: 7,
      unit: '%',
      category: 'quality',
      description: 'Age-appropriate screenings completed',
    },
    {
      id: 'm7',
      name: 'AI Recommendation Adoption',
      value: 76,
      target: 70,
      peerAverage: 62,
      trend: 'up',
      trendValue: 12,
      unit: '%',
      category: 'ai_adoption',
      description: 'AI suggestions reviewed and acted upon',
    },
    {
      id: 'm8',
      name: 'Referral Follow-through',
      value: 88,
      target: 85,
      peerAverage: 72,
      trend: 'up',
      trendValue: 6,
      unit: '%',
      category: 'quality',
    },
  ],
  badges: [
    {
      id: 'b1',
      name: 'Efficiency Champion',
      description: 'Top 10% in documentation efficiency',
      icon: 'zap',
      earnedDate: new Date('2026-01-15'),
      category: 'efficiency',
    },
    {
      id: 'b2',
      name: 'AI Pioneer',
      description: 'Early adopter of AI recommendations',
      icon: 'star',
      earnedDate: new Date('2026-01-10'),
      category: 'innovation',
    },
    {
      id: 'b3',
      name: 'Quality Star',
      description: 'Met all quality targets for 3 consecutive months',
      icon: 'medal',
      earnedDate: new Date('2025-12-01'),
      category: 'quality',
    },
  ],
  recentAchievements: [
    {
      id: 'a1',
      title: 'Reached 90%+ Patient Satisfaction',
      description: 'Consistently high patient satisfaction scores',
      date: new Date('2026-01-18'),
      metric: 'Patient Satisfaction',
      improvement: 5,
    },
    {
      id: 'a2',
      title: 'Documentation Time Reduced by 40%',
      description: 'Leveraging AI ambient documentation',
      date: new Date('2026-01-12'),
      metric: 'Documentation Time',
      improvement: 40,
    },
    {
      id: 'a3',
      title: 'Completed CME on Clinical Pathways',
      description: '2 CME credits earned',
      date: new Date('2026-01-08'),
    },
  ],
  improvementAreas: [
    {
      id: 'i1',
      metric: 'Diabetes Control Rate',
      currentValue: 78,
      targetValue: 80,
      peerAverage: 72,
      recommendations: [
        'Consider more frequent A1c monitoring for patients with recent increases',
        'Utilize clinical pathway for uncontrolled diabetes',
        'Review patients with A1c 8-9% for medication optimization',
      ],
      resources: [
        { title: 'ADA Standards of Care 2026', link: '#' },
        { title: 'Insulin Initiation Guide', link: '#' },
      ],
    },
  ],
  aiUsageStats: {
    totalRecommendationsReviewed: 342,
    acceptanceRate: 76,
    feedbackProvided: 89,
    averageReviewTime: 12,
    topUsedFeatures: [
      { feature: 'Differential Diagnosis', count: 156 },
      { feature: 'Lab Recommendations', count: 98 },
      { feature: 'Red Flag Detection', count: 45 },
      { feature: 'Clinical Pathways', count: 43 },
    ],
  },
};

// ============================================================
// COMPONENTS
// ============================================================

const OverallScoreCard: React.FC<{ 
  score: number; 
  rank: number; 
  totalPeers: number;
}> = ({ score, rank, totalPeers }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'from-emerald-500 to-emerald-600';
    if (score >= 80) return 'from-blue-500 to-blue-600';
    if (score >= 70) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">Overall Performance Score</p>
          <p className="text-5xl font-bold mt-2">{score}</p>
          <p className="text-slate-400 text-sm mt-1">out of 100</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
            <Medal className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-lg font-bold">#{rank}</p>
              <p className="text-xs text-slate-400">of {totalPeers} peers</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Score Bar */}
      <div className="mt-6">
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getScoreBg(score)} rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ metric: ProviderMetric }> = ({ metric }) => {
  const isAboveTarget = metric.name.includes('Time') 
    ? metric.value <= metric.target 
    : metric.value >= metric.target;
  
  const isAbovePeer = metric.name.includes('Time')
    ? metric.value <= metric.peerAverage
    : metric.value >= metric.peerAverage;

  const categoryColors = {
    quality: 'border-l-emerald-500',
    efficiency: 'border-l-blue-500',
    patient_experience: 'border-l-purple-500',
    ai_adoption: 'border-l-amber-500',
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${categoryColors[metric.category]} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-slate-900">{metric.name}</h4>
          {metric.description && (
            <p className="text-xs text-slate-500 mt-0.5">{metric.description}</p>
          )}
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          metric.trend === 'up' 
            ? 'bg-emerald-100 text-emerald-700'
            : metric.trend === 'down'
            ? 'bg-red-100 text-red-700'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {metric.trend === 'up' ? <TrendingUp size={12} /> : 
           metric.trend === 'down' ? <TrendingDown size={12} /> : null}
          {metric.trendValue > 0 ? '+' : ''}{metric.trendValue}%
        </span>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900">
            {metric.value}
            <span className="text-base font-normal text-slate-500 ml-1">{metric.unit}</span>
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Target:</span>
            <span className={`font-medium ${isAboveTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
              {metric.target}{metric.unit}
            </span>
            {isAboveTarget && <CheckCircle size={14} className="text-emerald-500" />}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-500">Peers:</span>
            <span className={`font-medium ${isAbovePeer ? 'text-emerald-600' : 'text-slate-600'}`}>
              {metric.peerAverage}{metric.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Comparison Bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-12">You</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${Math.min((metric.value / Math.max(metric.target, metric.peerAverage, metric.value)) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-12">Peers</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-slate-300 rounded-full"
              style={{ width: `${Math.min((metric.peerAverage / Math.max(metric.target, metric.peerAverage, metric.value)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const BadgeDisplay: React.FC<{ badge: Badge }> = ({ badge }) => {
  const iconMap = {
    star: <Star className="w-5 h-5 text-amber-500" />,
    medal: <Medal className="w-5 h-5 text-purple-500" />,
    trophy: <Award className="w-5 h-5 text-emerald-500" />,
    target: <Target className="w-5 h-5 text-blue-500" />,
    zap: <Zap className="w-5 h-5 text-orange-500" />,
  };

  const categoryColors = {
    quality: 'bg-emerald-50 border-emerald-200',
    efficiency: 'bg-blue-50 border-blue-200',
    innovation: 'bg-purple-50 border-purple-200',
    leadership: 'bg-amber-50 border-amber-200',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${categoryColors[badge.category]}`}>
      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
        {iconMap[badge.icon]}
      </div>
      <div>
        <p className="font-medium text-slate-900">{badge.name}</p>
        <p className="text-xs text-slate-500">{badge.description}</p>
      </div>
    </div>
  );
};

const AchievementItem: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
        <CheckCircle className="w-4 h-4 text-emerald-600" />
      </div>
      <div>
        <p className="font-medium text-slate-900">{achievement.title}</p>
        <p className="text-sm text-slate-500">{achievement.description}</p>
        <p className="text-xs text-slate-400 mt-1">
          {achievement.date.toLocaleDateString()}
          {achievement.improvement && (
            <span className="ml-2 text-emerald-600">+{achievement.improvement}% improvement</span>
          )}
        </p>
      </div>
    </div>
  );
};

const ImprovementAreaCard: React.FC<{ area: ImprovementArea }> = ({ area }) => {
  const gap = area.targetValue - area.currentValue;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">{area.metric}</h4>
          <p className="text-sm text-slate-600">
            Current: {area.currentValue}% • Target: {area.targetValue}% • Gap: {gap}%
          </p>
        </div>
        <AlertCircle className="w-5 h-5 text-amber-500" />
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium text-slate-700 mb-2">Recommendations:</p>
        <ul className="space-y-1">
          {area.recommendations.map((rec, idx) => (
            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
              <span className="text-amber-500">•</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {area.resources.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Resources:</p>
          <div className="flex flex-wrap gap-2">
            {area.resources.map((resource, idx) => (
              <a
                key={idx}
                href={resource.link}
                className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <BookOpen size={12} />
                {resource.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AIUsageCard: React.FC<{ stats: AIUsageStats }> = ({ stats }) => {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-slate-900">AI Usage Statistics</h3>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.totalRecommendationsReviewed}</p>
          <p className="text-xs text-slate-500">Recommendations Reviewed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.acceptanceRate}%</p>
          <p className="text-xs text-slate-500">Acceptance Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.feedbackProvided}</p>
          <p className="text-xs text-slate-500">Feedback Given</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.averageReviewTime}s</p>
          <p className="text-xs text-slate-500">Avg Review Time</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Most Used Features</p>
        <div className="space-y-2">
          {stats.topUsedFeatures.map((feature, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{feature.feature}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(feature.count / stats.topUsedFeatures[0].count) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 w-8">{feature.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export const ProviderPerformanceDashboard: React.FC<{
  providerId?: string;
}> = ({ providerId }) => {
  const [data] = useState<ProviderPerformanceData>(mockProviderData);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { value: 'all', label: 'All Metrics' },
    { value: 'quality', label: 'Quality' },
    { value: 'efficiency', label: 'Efficiency' },
    { value: 'patient_experience', label: 'Patient Experience' },
    { value: 'ai_adoption', label: 'AI Adoption' },
  ];

  const filteredMetrics = selectedCategory === 'all'
    ? data.metrics
    : data.metrics.filter(m => m.category === selectedCategory);

  const metricsAboveTarget = data.metrics.filter(m => {
    if (m.name.includes('Time')) return m.value <= m.target;
    return m.value >= m.target;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data.providerName}</h1>
            <p className="text-slate-500">{data.credentials} • {data.specialty}</p>
            <p className="text-sm text-slate-400">{data.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <OverallScoreCard 
          score={data.overallScore} 
          rank={data.peerRank} 
          totalPeers={data.totalPeers} 
        />
        
        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Metrics Above Target</span>
              <span className="text-lg font-bold text-emerald-600">
                {metricsAboveTarget}/{data.metrics.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Improvement Areas</span>
              <span className="text-lg font-bold text-amber-600">
                {data.improvementAreas.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Badges Earned</span>
              <span className="text-lg font-bold text-purple-600">
                {data.badges.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">AI Feedback Given</span>
              <span className="text-lg font-bold text-blue-600">
                {data.aiUsageStats.feedbackProvided}
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Earned Badges</h3>
          <div className="space-y-3">
            {data.badges.slice(0, 3).map(badge => (
              <BadgeDisplay key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Performance Metrics</h2>
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {filteredMetrics.map(metric => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Improvement Areas */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Areas for Improvement
          </h3>
          {data.improvementAreas.length > 0 ? (
            <div className="space-y-4">
              {data.improvementAreas.map(area => (
                <ImprovementAreaCard key={area.id} area={area} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
              <p>All targets met! Great work!</p>
            </div>
          )}
        </div>

        {/* Recent Achievements */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Recent Achievements
          </h3>
          <div className="space-y-2">
            {data.recentAchievements.map(achievement => (
              <AchievementItem key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      </div>

      {/* AI Usage Stats */}
      <div className="mt-6">
        <AIUsageCard stats={data.aiUsageStats} />
      </div>
    </div>
  );
};

export default ProviderPerformanceDashboard;
