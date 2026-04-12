// ============================================================
// ATTENDING AI - Executive Analytics Dashboard
// apps/provider-portal/components/analytics/ExecutiveAnalytics.tsx
//
// Phase 10D: Real-time insights for leadership decisions
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Calendar,
  Activity,
  Star,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  RefreshCw,
  Settings,
  ChevronDown,
  Building,
  Stethoscope,
  Heart,
  Brain,
  Shield,
  FileText,
  Percent,
  Award,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'ytd';
export type MetricTrend = 'up' | 'down' | 'stable';

export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  format: 'number' | 'currency' | 'percent' | 'time';
  target?: number;
  previousValue?: number;
  trend: MetricTrend;
  trendValue: number;
  category: 'financial' | 'operational' | 'quality' | 'satisfaction';
  description?: string;
}

export interface ProviderMetrics {
  providerId: string;
  providerName: string;
  specialty: string;
  patientsSeenMTD: number;
  rvu: number;
  avgVisitTime: number;
  patientSatisfaction: number;
  qualityScore: number;
  noShowRate: number;
}

export interface DepartmentMetrics {
  departmentId: string;
  departmentName: string;
  revenue: number;
  expenses: number;
  visitVolume: number;
  utilization: number;
  avgWaitTime: number;
  qualityScore: number;
}

export interface QualityMeasure {
  id: string;
  name: string;
  category: string;
  currentRate: number;
  targetRate: number;
  benchmark: number;
  patientsEligible: number;
  patientsMet: number;
  trend: MetricTrend;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const mockKPIs: KPIMetric[] = [
  {
    id: 'k1',
    name: 'Total Revenue MTD',
    value: 2847500,
    format: 'currency',
    target: 3000000,
    previousValue: 2650000,
    trend: 'up',
    trendValue: 7.4,
    category: 'financial',
    description: 'Month-to-date gross revenue',
  },
  {
    id: 'k2',
    name: 'Patient Visits MTD',
    value: 4523,
    format: 'number',
    target: 5000,
    previousValue: 4200,
    trend: 'up',
    trendValue: 7.7,
    category: 'operational',
  },
  {
    id: 'k3',
    name: 'Avg Wait Time',
    value: 14.2,
    format: 'time',
    target: 15,
    previousValue: 16.5,
    trend: 'down',
    trendValue: -13.9,
    category: 'operational',
  },
  {
    id: 'k4',
    name: 'Patient Satisfaction',
    value: 4.6,
    format: 'number',
    target: 4.5,
    previousValue: 4.4,
    trend: 'up',
    trendValue: 4.5,
    category: 'satisfaction',
  },
  {
    id: 'k5',
    name: 'Quality Score',
    value: 92.3,
    format: 'percent',
    target: 90,
    previousValue: 88.1,
    trend: 'up',
    trendValue: 4.8,
    category: 'quality',
  },
  {
    id: 'k6',
    name: 'No-Show Rate',
    value: 6.8,
    format: 'percent',
    target: 8,
    previousValue: 8.2,
    trend: 'down',
    trendValue: -17.1,
    category: 'operational',
  },
  {
    id: 'k7',
    name: 'Revenue Per Visit',
    value: 629.50,
    format: 'currency',
    previousValue: 612.00,
    trend: 'up',
    trendValue: 2.9,
    category: 'financial',
  },
  {
    id: 'k8',
    name: 'Provider Utilization',
    value: 78.5,
    format: 'percent',
    target: 80,
    previousValue: 74.2,
    trend: 'up',
    trendValue: 5.8,
    category: 'operational',
  },
];

const mockProviders: ProviderMetrics[] = [
  { providerId: 'p1', providerName: 'Dr. Sarah Chen', specialty: 'Family Medicine', patientsSeenMTD: 412, rvu: 1847, avgVisitTime: 18, patientSatisfaction: 4.8, qualityScore: 94, noShowRate: 5.2 },
  { providerId: 'p2', providerName: 'Dr. Michael Rodriguez', specialty: 'Internal Medicine', patientsSeenMTD: 378, rvu: 1623, avgVisitTime: 22, patientSatisfaction: 4.5, qualityScore: 91, noShowRate: 7.1 },
  { providerId: 'p3', providerName: 'Dr. Emily Johnson', specialty: 'Pediatrics', patientsSeenMTD: 456, rvu: 1412, avgVisitTime: 16, patientSatisfaction: 4.9, qualityScore: 96, noShowRate: 4.8 },
  { providerId: 'p4', providerName: 'Dr. David Kim', specialty: 'Cardiology', patientsSeenMTD: 245, rvu: 2134, avgVisitTime: 28, patientSatisfaction: 4.6, qualityScore: 93, noShowRate: 6.5 },
  { providerId: 'p5', providerName: 'Dr. Lisa Wang', specialty: 'Endocrinology', patientsSeenMTD: 198, rvu: 1567, avgVisitTime: 25, patientSatisfaction: 4.7, qualityScore: 95, noShowRate: 5.8 },
];

const mockDepartments: DepartmentMetrics[] = [
  { departmentId: 'd1', departmentName: 'Primary Care', revenue: 1250000, expenses: 875000, visitVolume: 2450, utilization: 82, avgWaitTime: 12, qualityScore: 93 },
  { departmentId: 'd2', departmentName: 'Cardiology', revenue: 680000, expenses: 442000, visitVolume: 620, utilization: 78, avgWaitTime: 18, qualityScore: 91 },
  { departmentId: 'd3', departmentName: 'Pediatrics', revenue: 520000, expenses: 364000, visitVolume: 890, utilization: 85, avgWaitTime: 10, qualityScore: 96 },
  { departmentId: 'd4', departmentName: 'Endocrinology', revenue: 397500, expenses: 278250, visitVolume: 563, utilization: 75, avgWaitTime: 15, qualityScore: 94 },
];

const mockQualityMeasures: QualityMeasure[] = [
  { id: 'q1', name: 'Diabetes A1c Control', category: 'Chronic Care', currentRate: 78, targetRate: 80, benchmark: 75, patientsEligible: 420, patientsMet: 328, trend: 'up' },
  { id: 'q2', name: 'BP Control (<140/90)', category: 'Chronic Care', currentRate: 72, targetRate: 75, benchmark: 70, patientsEligible: 856, patientsMet: 616, trend: 'up' },
  { id: 'q3', name: 'Breast Cancer Screening', category: 'Preventive', currentRate: 81, targetRate: 85, benchmark: 78, patientsEligible: 345, patientsMet: 279, trend: 'stable' },
  { id: 'q4', name: 'Colorectal Screening', category: 'Preventive', currentRate: 68, targetRate: 80, benchmark: 72, patientsEligible: 512, patientsMet: 348, trend: 'up' },
  { id: 'q5', name: 'Annual Wellness Visit', category: 'Preventive', currentRate: 62, targetRate: 75, benchmark: 65, patientsEligible: 1245, patientsMet: 772, trend: 'up' },
];

const mockRevenueData: ChartDataPoint[] = [
  { date: 'Jan', value: 2450000 },
  { date: 'Feb', value: 2580000 },
  { date: 'Mar', value: 2720000 },
  { date: 'Apr', value: 2650000 },
  { date: 'May', value: 2890000 },
  { date: 'Jun', value: 2780000 },
  { date: 'Jul', value: 2920000 },
  { date: 'Aug', value: 3050000 },
  { date: 'Sep', value: 2980000 },
  { date: 'Oct', value: 3120000 },
  { date: 'Nov', value: 3080000 },
  { date: 'Dec', value: 2847500 },
];

// ============================================================
// COMPONENTS
// ============================================================

const formatValue = (value: number, format: KPIMetric['format']): string => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'time':
      return `${value.toFixed(1)} min`;
    default:
      return value.toLocaleString();
  }
};

const KPICard: React.FC<{ kpi: KPIMetric }> = ({ kpi }) => {
  const meetsTarget = kpi.target ? 
    (kpi.trend === 'up' ? kpi.value >= kpi.target : kpi.value <= kpi.target) : true;
  
  const categoryColors: Record<string, string> = {
    financial: 'text-emerald-600',
    operational: 'text-blue-600',
    quality: 'text-teal-600',
    satisfaction: 'text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-slate-500">{kpi.name}</p>
        {kpi.target && (
          <span className={`w-2 h-2 rounded-full ${meetsTarget ? 'bg-green-500' : 'bg-amber-500'}`} />
        )}
      </div>
      <p className={`text-2xl font-bold ${categoryColors[kpi.category]}`}>
        {formatValue(kpi.value, kpi.format)}
      </p>
      <div className="flex items-center justify-between mt-2">
        <div className={`flex items-center gap-1 text-sm ${
          kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-slate-500'
        }`}>
          {kpi.trend === 'up' && <ArrowUpRight size={14} />}
          {kpi.trend === 'down' && <ArrowDownRight size={14} />}
          {kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue.toFixed(1)}%
        </div>
        {kpi.target && (
          <span className="text-xs text-slate-400">
            Target: {formatValue(kpi.target, kpi.format)}
          </span>
        )}
      </div>
    </div>
  );
};

const MiniChart: React.FC<{ data: ChartDataPoint[]; color?: string }> = ({ data, color = '#1A8FA8' }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 50" className="w-full h-12">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
};

const ProviderTable: React.FC<{ providers: ProviderMetrics[] }> = ({ providers }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-200">
          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Provider</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Patients MTD</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">RVU</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Avg Visit</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Satisfaction</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Quality</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">No-Show</th>
        </tr>
      </thead>
      <tbody>
        {providers.map((p) => (
          <tr key={p.providerId} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-3 px-4">
              <p className="font-medium text-slate-900">{p.providerName}</p>
              <p className="text-xs text-slate-500">{p.specialty}</p>
            </td>
            <td className="py-3 px-4 text-right text-slate-900">{p.patientsSeenMTD}</td>
            <td className="py-3 px-4 text-right text-slate-900">{p.rvu.toLocaleString()}</td>
            <td className="py-3 px-4 text-right text-slate-900">{p.avgVisitTime} min</td>
            <td className="py-3 px-4 text-right">
              <span className="flex items-center justify-end gap-1">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                {p.patientSatisfaction}
              </span>
            </td>
            <td className="py-3 px-4 text-right">
              <span className={`px-2 py-1 rounded-full text-xs ${
                p.qualityScore >= 95 ? 'bg-green-100 text-green-700' :
                p.qualityScore >= 90 ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {p.qualityScore}%
              </span>
            </td>
            <td className="py-3 px-4 text-right">
              <span className={`${p.noShowRate < 6 ? 'text-green-600' : p.noShowRate < 8 ? 'text-amber-600' : 'text-red-600'}`}>
                {p.noShowRate}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const QualityGauge: React.FC<{ measure: QualityMeasure }> = ({ measure }) => {
  const progress = (measure.currentRate / measure.targetRate) * 100;
  const gapPercent = measure.patientsEligible - measure.patientsMet;
  
  return (
    <div className="p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-slate-900">{measure.name}</p>
          <p className="text-xs text-slate-500">{measure.category}</p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          {measure.trend === 'up' && <TrendingUp size={14} className="text-green-500" />}
          {measure.trend === 'down' && <TrendingDown size={14} className="text-red-500" />}
        </div>
      </div>
      
      <div className="flex items-end gap-4 mb-2">
        <p className="text-3xl font-bold text-slate-900">{measure.currentRate}%</p>
        <p className="text-sm text-slate-500 mb-1">/ {measure.targetRate}% target</p>
      </div>
      
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full ${
            measure.currentRate >= measure.targetRate ? 'bg-green-500' :
            measure.currentRate >= measure.benchmark ? 'bg-amber-500' :
            'bg-red-500'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
          style={{ left: `${(measure.benchmark / measure.targetRate) * 100}%` }}
        />
      </div>
      
      <p className="text-xs text-slate-500">
        {measure.patientsMet.toLocaleString()} / {measure.patientsEligible.toLocaleString()} patients • 
        <span className="text-amber-600 ml-1">{gapPercent.toLocaleString()} care gaps</span>
      </p>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const ExecutiveAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'departments' | 'quality'>('overview');

  const financialKPIs = mockKPIs.filter(k => k.category === 'financial');
  const operationalKPIs = mockKPIs.filter(k => k.category === 'operational');
  const qualitySatisfactionKPIs = mockKPIs.filter(k => ['quality', 'satisfaction'].includes(k.category));

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Executive Analytics Dashboard</h2>
              <p className="text-slate-300 text-sm">Real-time operational intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="ytd">Year to Date</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              <Download size={18} />
              Export
            </button>
            <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors" aria-label="Refresh data">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'providers', label: 'Provider Performance', icon: Stethoscope },
          { key: 'departments', label: 'Departments', icon: Building },
          { key: 'quality', label: 'Quality Measures', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-slate-900 bg-white border-b-2 border-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Financial KPIs */}
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                <DollarSign size={18} className="text-emerald-600" />
                Financial Performance
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {financialKPIs.map(kpi => (
                  <KPICard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>

            {/* Operational KPIs */}
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                <Activity size={18} className="text-blue-600" />
                Operational Metrics
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {operationalKPIs.map(kpi => (
                  <KPICard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>

            {/* Quality & Satisfaction */}
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                <Heart size={18} className="text-teal-600" />
                Quality & Satisfaction
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {qualitySatisfactionKPIs.map(kpi => (
                  <KPICard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Revenue Trend (12 Months)</h3>
              <div className="h-32">
                <MiniChart data={mockRevenueData} />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                {mockRevenueData.map((d, i) => (
                  <span key={i}>{d.date}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Provider Performance</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm">
                <Filter size={16} />
                Filter
              </button>
            </div>
            <ProviderTable providers={mockProviders} />
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="grid grid-cols-2 gap-4">
            {mockDepartments.map((dept) => (
              <div key={dept.departmentId} className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900 mb-4">{dept.departmentName}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Revenue</p>
                    <p className="text-xl font-bold text-emerald-600">${(dept.revenue / 1000000).toFixed(2)}M</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Margin</p>
                    <p className="text-xl font-bold text-blue-600">
                      {(((dept.revenue - dept.expenses) / dept.revenue) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Visit Volume</p>
                    <p className="text-xl font-bold text-slate-900">{dept.visitVolume.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Utilization</p>
                    <p className="text-xl font-bold text-teal-600">{dept.utilization}%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
                  <span className="text-slate-500">Avg Wait: {dept.avgWaitTime} min</span>
                  <span className="text-slate-500">Quality: {dept.qualityScore}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === 'quality' && (
          <div className="grid grid-cols-2 gap-4">
            {mockQualityMeasures.map((measure) => (
              <QualityGauge key={measure.id} measure={measure} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveAnalytics;
