// ============================================================
// ATTENDING AI - Analytics Dashboard
// apps/provider-portal/components/analytics/AnalyticsDashboard.tsx
//
// Real-time metrics visualization for quality, operations, finance
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Clock,
  DollarSign,
  Heart,
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  ChevronDown,
  Target,
  Stethoscope,
  FileText,
  Shield,
} from 'lucide-react';

// Types from analytics package
interface MetricValue {
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
}

interface DataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

interface QualityMetrics {
  diabeticEyeExamRate: MetricValue;
  diabeticA1cControlRate: MetricValue;
  breastCancerScreeningRate: MetricValue;
  colorectalCancerScreeningRate: MetricValue;
  hypertensionControlRate: MetricValue;
  medicationReconciliationRate: MetricValue;
  fallRiskAssessmentRate: MetricValue;
  readmission30DayRate: MetricValue;
  totalCareGaps: number;
  highPriorityCareGaps: number;
  closedCareGapsThisMonth: number;
}

interface OperationalMetrics {
  totalPatientsSeen: MetricValue;
  newPatients: MetricValue;
  returnVisits: MetricValue;
  telehealth: MetricValue;
  avgWaitTime: MetricValue;
  avgVisitDuration: MetricValue;
  noShowRate: MetricValue;
  sameDayAppointments: MetricValue;
  patientsPerProvider: MetricValue;
  compassAssessmentsCompleted: MetricValue;
  avgTimeToDiagnosis: MetricValue;
}

interface FinancialMetrics {
  grossCharges: MetricValue;
  netRevenue: MetricValue;
  revenuePerVisit: MetricValue;
  collectionRate: MetricValue;
  daysInAR: MetricValue;
  denialRate: MetricValue;
  avgRVU: MetricValue;
  codingAccuracy: MetricValue;
  e_mDistribution: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
}

interface DashboardAlert {
  id: string;
  type: 'quality' | 'operational' | 'financial' | 'clinical';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric?: string;
  currentValue?: number;
  createdAt: Date;
  acknowledged: boolean;
}

interface AnalyticsDashboardProps {
  organizationId: string;
  quality: QualityMetrics;
  operational: OperationalMetrics;
  financial: FinancialMetrics;
  trends: {
    patientVolume: DataPoint[];
    qualityScore: DataPoint[];
    revenue: DataPoint[];
    compassUsage: DataPoint[];
  };
  alerts: DashboardAlert[];
  onRefresh?: () => void;
  onAcknowledgeAlert?: (alertId: string) => void;
  isLoading?: boolean;
}

type TimeRange = '7d' | '30d' | '90d' | '1y';
type MetricCategory = 'quality' | 'operational' | 'financial' | 'all';

export function AnalyticsDashboard({
  organizationId,
  quality,
  operational,
  financial,
  trends,
  alerts,
  onRefresh,
  onAcknowledgeAlert,
  isLoading = false,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeCategory, setActiveCategory] = useState<MetricCategory>('all');
  const [showAlerts, setShowAlerts] = useState(true);

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-teal-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500">Real-time performance metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              {(['7d', '30d', '90d', '1y'] as TimeRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-4 mt-4">
          {[
            { key: 'all', label: 'Overview', icon: Activity },
            { key: 'quality', label: 'Quality', icon: Heart },
            { key: 'operational', label: 'Operations', icon: Clock },
            { key: 'financial', label: 'Financial', icon: DollarSign },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key as MetricCategory)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeCategory === key
                  ? 'bg-teal-100 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Banner */}
      {showAlerts && unacknowledgedAlerts.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                {unacknowledgedAlerts.length} alert{unacknowledgedAlerts.length > 1 ? 's' : ''} require attention
              </span>
            </div>
            <div className="flex items-center gap-2">
              {unacknowledgedAlerts.slice(0, 2).map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    alert.severity === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : alert.severity === 'warning'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {alert.title}
                  <button
                    onClick={() => onAcknowledgeAlert?.(alert.id)}
                    className="text-xs underline"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowAlerts(false)}
                className="text-yellow-600 hover:text-yellow-700 text-sm"
              >
                Hide
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* KPI Cards Row */}
        {(activeCategory === 'all' || activeCategory === 'operational') && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KPICard
              title="Patients Seen"
              value={operational.totalPatientsSeen.value}
              metric={operational.totalPatientsSeen}
              icon={<Users className="w-5 h-5" />}
              color="blue"
            />
            <KPICard
              title="COMPASS Completed"
              value={operational.compassAssessmentsCompleted.value}
              metric={operational.compassAssessmentsCompleted}
              icon={<Stethoscope className="w-5 h-5" />}
              color="teal"
            />
            <KPICard
              title="Avg Wait Time"
              value={`${operational.avgWaitTime.value} min`}
              metric={operational.avgWaitTime}
              icon={<Clock className="w-5 h-5" />}
              color="green"
              invertTrend
            />
            <KPICard
              title="Net Revenue"
              value={`$${(financial.netRevenue.value / 1000).toFixed(0)}K`}
              metric={financial.netRevenue}
              icon={<DollarSign className="w-5 h-5" />}
              color="emerald"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Quality Metrics Panel */}
          {(activeCategory === 'all' || activeCategory === 'quality') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Quality Metrics
                </h2>
                <span className="text-xs text-gray-500">HEDIS-aligned</span>
              </div>

              <div className="space-y-3">
                <MetricRow label="Diabetic A1c Control" metric={quality.diabeticA1cControlRate} target={70} />
                <MetricRow label="Hypertension Control" metric={quality.hypertensionControlRate} target={70} />
                <MetricRow label="Breast Cancer Screening" metric={quality.breastCancerScreeningRate} target={75} />
                <MetricRow label="Colorectal Screening" metric={quality.colorectalCancerScreeningRate} target={70} />
                <MetricRow label="Med Reconciliation" metric={quality.medicationReconciliationRate} target={90} />
                <MetricRow label="30-Day Readmission" metric={quality.readmission30DayRate} target={10} invertColor />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Care Gaps</span>
                  <div className="flex items-center gap-4">
                    <span className="text-red-600 font-medium">{quality.highPriorityCareGaps} high priority</span>
                    <span className="text-gray-500">{quality.totalCareGaps} total</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-green-600">
                  +{quality.closedCareGapsThisMonth} closed this month
                </div>
              </div>
            </div>
          )}

          {/* Operational Metrics Panel */}
          {(activeCategory === 'all' || activeCategory === 'operational') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Operations
                </h2>
              </div>

              <div className="space-y-3">
                <MetricRow label="New Patients" metric={operational.newPatients} />
                <MetricRow label="Return Visits" metric={operational.returnVisits} />
                <MetricRow label="Telehealth Visits" metric={operational.telehealth} />
                <MetricRow label="No-Show Rate" metric={operational.noShowRate} suffix="%" invertColor />
                <MetricRow label="Avg Visit Duration" metric={operational.avgVisitDuration} suffix=" min" />
                <MetricRow label="Time to Diagnosis" metric={operational.avgTimeToDiagnosis} suffix=" min" invertColor />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Patients/Provider</span>
                  <span className="font-medium">{operational.patientsPerProvider.value.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Same-Day Appts</span>
                  <span className="font-medium">{operational.sameDayAppointments.value}</span>
                </div>
              </div>
            </div>
          )}

          {/* Financial Metrics Panel */}
          {(activeCategory === 'all' || activeCategory === 'financial') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Financial
                </h2>
              </div>

              <div className="space-y-3">
                <MetricRow label="Gross Charges" metric={financial.grossCharges} prefix="$" divisor={1000} suffix="K" />
                <MetricRow label="Revenue/Visit" metric={financial.revenuePerVisit} prefix="$" />
                <MetricRow label="Collection Rate" metric={financial.collectionRate} suffix="%" />
                <MetricRow label="Days in A/R" metric={financial.daysInAR} invertColor />
                <MetricRow label="Denial Rate" metric={financial.denialRate} suffix="%" invertColor />
                <MetricRow label="Coding Accuracy" metric={financial.codingAccuracy} suffix="%" />
              </div>

              {/* E/M Distribution */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">E/M Level Distribution</div>
                <div className="flex items-end gap-1 h-16">
                  {Object.entries(financial.e_mDistribution).map(([level, percent]) => (
                    <div key={level} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-teal-500 rounded-t"
                        style={{ height: `${percent * 1.5}px` }}
                      />
                      <span className="text-xs text-gray-500 mt-1">{level.replace('level', 'L')}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center text-sm text-gray-500 mt-2">
                  Avg RVU: <span className="font-medium text-gray-900">{financial.avgRVU.value.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trend Charts */}
        {activeCategory === 'all' && (
          <div className="grid grid-cols-2 gap-6 mt-6">
            <TrendChart
              title="Patient Volume"
              data={trends.patientVolume}
              color="#3B82F6"
              icon={<Users className="w-5 h-5" />}
            />
            <TrendChart
              title="COMPASS Usage"
              data={trends.compassUsage}
              color="#1A8FA8"
              suffix="%"
              icon={<Stethoscope className="w-5 h-5" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function KPICard({
  title,
  value,
  metric,
  icon,
  color,
  invertTrend = false,
}: {
  title: string;
  value: string | number;
  metric: MetricValue;
  icon: React.ReactNode;
  color: 'blue' | 'teal' | 'green' | 'emerald' | 'red';
  invertTrend?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };

  const isPositive = invertTrend ? metric.trend === 'down' : metric.trend === 'up';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div className="flex items-center gap-1 text-sm">
          {metric.trend === 'up' && <TrendingUp className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />}
          {metric.trend === 'down' && <TrendingDown className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />}
          {metric.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
          <span className={isPositive ? 'text-green-600' : metric.trend === 'stable' ? 'text-gray-500' : 'text-red-600'}>
            {metric.changePercent !== undefined ? `${metric.changePercent > 0 ? '+' : ''}${metric.changePercent}%` : ''}
          </span>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{title}</div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  metric,
  target,
  prefix = '',
  suffix = '',
  divisor = 1,
  invertColor = false,
}: {
  label: string;
  metric: MetricValue;
  target?: number;
  prefix?: string;
  suffix?: string;
  divisor?: number;
  invertColor?: boolean;
}) {
  const displayValue = metric.value / divisor;
  const isPositive = invertColor ? metric.trend === 'down' : metric.trend === 'up';
  const meetsTarget = target !== undefined ? (invertColor ? displayValue <= target : displayValue >= target) : true;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-3">
        {target !== undefined && (
          <div className={`w-2 h-2 rounded-full ${meetsTarget ? 'bg-green-500' : 'bg-red-500'}`} />
        )}
        <span className="font-medium text-gray-900">
          {prefix}{displayValue.toFixed(divisor > 1 ? 0 : 1)}{suffix}
        </span>
        <div className="flex items-center gap-1 text-xs w-16 justify-end">
          {metric.trend === 'up' && <TrendingUp className={`w-3 h-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />}
          {metric.trend === 'down' && <TrendingDown className={`w-3 h-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />}
          {metric.trend === 'stable' && <Minus className="w-3 h-3 text-gray-400" />}
          <span className={isPositive ? 'text-green-600' : metric.trend === 'stable' ? 'text-gray-400' : 'text-red-600'}>
            {metric.changePercent !== undefined ? `${Math.abs(metric.changePercent)}%` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function TrendChart({
  title,
  data,
  color,
  suffix = '',
  icon,
}: {
  title: string;
  data: DataPoint[];
  color: string;
  suffix?: string;
  icon: React.ReactNode;
}) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-gray-400">{icon}</div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="h-32 flex items-end gap-1">
        {data.slice(-30).map((point, index) => {
          const height = ((point.value - minValue) / range) * 100;
          return (
            <div
              key={index}
              className="flex-1 rounded-t transition-all hover:opacity-80 cursor-pointer group relative"
              style={{ backgroundColor: color, height: `${Math.max(height, 5)}%` }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {point.value}{suffix}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{data.length > 0 ? new Date(data[0].timestamp).toLocaleDateString() : ''}</span>
        <span>{data.length > 0 ? new Date(data[data.length - 1].timestamp).toLocaleDateString() : ''}</span>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
