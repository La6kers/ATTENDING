// =============================================================================
// ATTENDING Admin - System Health & Monitoring
// apps/compass-admin/pages/system.tsx
// =============================================================================

import React from 'react';
import Head from 'next/head';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  Cpu,
  Zap,
  Globe,
  DollarSign,
  BarChart3,
  Clock,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

// =============================================================================
// Service Status Data
// =============================================================================

interface ServiceStatus {
  name: string;
  status: 'Operational' | 'Not Connected' | 'Degraded';
  detail: string;
  icon: React.ReactNode;
}

const services: ServiceStatus[] = [
  {
    name: 'Provider Portal',
    status: 'Operational',
    detail: 'Uptime 99.9% | Port 4502',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    name: 'Patient Portal',
    status: 'Operational',
    detail: 'Uptime 99.8% | Port 4501',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    name: 'Database (SQL Server)',
    status: 'Operational',
    detail: 'Connections 12/100',
    icon: <Database className="w-5 h-5" />,
  },
  {
    name: 'Redis Cache',
    status: 'Not Connected',
    detail: '0% hit rate',
    icon: <Server className="w-5 h-5" />,
  },
  {
    name: 'AI Engine (BioMistral)',
    status: 'Operational',
    detail: 'Avg latency 245ms',
    icon: <Cpu className="w-5 h-5" />,
  },
  {
    name: 'FHIR Gateway',
    status: 'Operational',
    detail: '0 errors today',
    icon: <Zap className="w-5 h-5" />,
  },
];

// =============================================================================
// Error Log Data
// =============================================================================

interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  service: string;
  message: string;
}

const errorLog: LogEntry[] = [
  { timestamp: '5 min ago', level: 'WARN', service: 'Redis', message: 'Connection refused at 127.0.0.1:6379' },
  { timestamp: '15 min ago', level: 'INFO', service: 'AI Engine', message: 'Cache refreshed, 247 patterns loaded' },
  { timestamp: '1 hr ago', level: 'WARN', service: 'FHIR Gateway', message: 'Timeout connecting to Epic sandbox' },
  { timestamp: '2 hr ago', level: 'ERROR', service: 'Billing', message: 'Failed to flush meter buffer to database' },
  { timestamp: '3 hr ago', level: 'INFO', service: 'System', message: 'Automated backup completed' },
  { timestamp: '4 hr ago', level: 'INFO', service: 'Auth', message: 'Provider Dr. Martinez session started' },
  { timestamp: '6 hr ago', level: 'WARN', service: 'AI Engine', message: 'BioMistral response latency exceeded 500ms threshold' },
  { timestamp: '8 hr ago', level: 'INFO', service: 'System', message: 'Daily maintenance window completed successfully' },
];

// =============================================================================
// Helper Components
// =============================================================================

function ServiceCard({ service }: { service: ServiceStatus }) {
  const isOperational = service.status === 'Operational';
  const isWarning = service.status === 'Not Connected';

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-5 ${
      isWarning ? 'border-yellow-300' : 'border-white/10'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${
          isOperational ? 'bg-green-100 text-green-600' :
          isWarning ? 'bg-yellow-100 text-yellow-600' :
          'bg-red-100 text-red-600'
        }`}>
          {service.icon}
        </div>
        <div className="flex items-center gap-1.5">
          {isOperational ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          )}
          <span className={`text-xs font-medium ${
            isOperational ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {service.status}
          </span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{service.name}</h3>
      <p className="text-xs text-teal-200/70">{service.detail}</p>
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function SystemHealthPage() {
  const levelColors: Record<string, { bg: string; text: string }> = {
    ERROR: { bg: 'bg-red-100', text: 'text-red-700' },
    WARN: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    INFO: { bg: 'bg-blue-100', text: 'text-blue-700' },
  };

  return (
    <>
      <Head>
        <title>System Health | ATTENDING Admin</title>
      </Head>

      <CompassAdminShell title="System Health">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">System Health & Monitoring</h1>
            <div className="flex items-center gap-2 text-sm text-teal-200/70">
              <Activity className="w-4 h-4" />
              <span>Live</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          {/* Service Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {services.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>

          {/* AI Performance Section */}
          <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-compass-600" />
              AI Performance
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cache Hit Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-teal-100">Cache Hit Rate</span>
                  <span className="text-sm font-bold text-compass-600">68%</span>
                </div>
                <ProgressBar value={68} color="bg-compass-500" />
              </div>

              {/* Local Pattern Match Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-teal-100">Local Pattern Match Rate</span>
                  <span className="text-sm font-bold text-compass-600">72%</span>
                </div>
                <ProgressBar value={72} color="bg-compass-400" />
                <p className="text-xs text-teal-300/50 mt-1">These avoided LLM calls entirely</p>
              </div>

              {/* Cost Metrics */}
              <div className="md:col-span-2 grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-sm text-teal-200/70 mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Avg Cost/Query
                  </div>
                  <p className="text-2xl font-bold text-white">$0.008</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-sm text-teal-200/70 mb-1">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Cost Today
                  </div>
                  <p className="text-2xl font-bold text-white">$0.47</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-sm text-teal-200/70 mb-1">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Cost This Month
                  </div>
                  <p className="text-2xl font-bold text-white">$12.83</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Log */}
          <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-compass-600" />
                Recent Log Entries
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-xs font-medium text-teal-200/70 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Timestamp</th>
                    <th className="px-6 py-3 text-left">Level</th>
                    <th className="px-6 py-3 text-left">Service</th>
                    <th className="px-6 py-3 text-left">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {errorLog.map((entry, idx) => {
                    const lc = levelColors[entry.level];
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-3 text-teal-200/70 whitespace-nowrap">{entry.timestamp}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${lc.bg} ${lc.text}`}>
                            {entry.level}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-teal-100 font-medium whitespace-nowrap">{entry.service}</td>
                        <td className="px-6 py-3 text-teal-200">{entry.message}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}
