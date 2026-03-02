// ============================================================
// IT Admin Portal - Tier 1/2/3 Support Dashboard
// apps/provider-portal/components/admin/ITAdminPortal.tsx
//
// Comprehensive admin interface for IT support professionals:
//   Tier 1 (Help Desk): User management, password resets, sessions
//   Tier 2 (System Admin): Security center, logs, monitoring, integrations
//   Tier 3 (Engineering): DB explorer, feature flags, API tester, profiling
//
// Created: February 2, 2026
// Integrated into git: February 18, 2026
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Building2, Shield, Key, Mail, CheckCircle, AlertTriangle, Database,
  Globe, Lock, UserPlus, Settings, Activity, ChevronRight, ChevronDown, Zap,
  Search, RefreshCw, Terminal, Server, Cpu, HardDrive, Wifi, WifiOff,
  AlertCircle, XCircle, Clock, Eye, EyeOff, Download, Upload, Trash2,
  Edit, MoreVertical, Filter, Calendar, FileText, Code, Bug, Wrench,
  Monitor, Play, Pause, RotateCcw, Copy, ExternalLink, Bell, Send,
  Unlock, UserX, UserCheck, LogOut, LogIn, History, TrendingUp, TrendingDown,
  BarChart3, Layers, GitBranch, Package, Gauge, Timer, ShieldAlert, ShieldCheck,
  Network, Plug, Power, PowerOff, FolderOpen, FileJson, FileCode, Save,
  Maximize2, Minimize2, PanelLeft, LayoutDashboard, Flag, Hash
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

type AdminTier = 1 | 2 | 3;

interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'LOCKED';
  lastLogin: string;
  failedAttempts: number;
  mfaEnabled: boolean;
  createdAt: string;
  clinicIds: string[];
}

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface SystemMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
}

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  startedAt: string;
  lastActivity: string;
}

interface BackgroundJob {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'scheduled';
  lastRun: string;
  nextRun: string;
  duration: string;
  errorCount: number;
}

// ============================================================
// Mock Data Generators
// ============================================================

const FIRST_NAMES = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Lopez'];

const generateUsers = (count: number): AdminUser[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `usr_${Math.random().toString(36).substr(2, 9)}`,
    email: `user${i + 1}@attendingai.health`,
    username: `${FIRST_NAMES[i % 10][0].toLowerCase()}${LAST_NAMES[i % 10].toLowerCase()}${i > 9 ? i : ''}`,
    firstName: FIRST_NAMES[i % 10],
    lastName: LAST_NAMES[i % 10],
    role: (['ADMIN', 'PROVIDER', 'NURSE', 'STAFF'] as const)[i % 4],
    status: (['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'SUSPENDED', 'LOCKED'] as const)[i % 6],
    lastLogin: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    failedAttempts: Math.floor(Math.random() * 5),
    mfaEnabled: Math.random() > 0.4,
    createdAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
    clinicIds: [`clinic_${(i % 3) + 1}`],
  }));

const generateAuditLog = (count: number): AuditEntry[] =>
  Array.from({ length: count }, (_, i) => {
    const actions = [
      { action: 'LOGIN_SUCCESS', resource: 'auth', severity: 'INFO' as const },
      { action: 'LOGIN_FAILED', resource: 'auth', severity: 'WARNING' as const },
      { action: 'PASSWORD_RESET', resource: 'user', severity: 'INFO' as const },
      { action: 'PHI_ACCESS', resource: 'patient', severity: 'CRITICAL' as const },
      { action: 'RECORD_UPDATED', resource: 'patient', severity: 'INFO' as const },
      { action: 'ROLE_CHANGED', resource: 'admin', severity: 'WARNING' as const },
      { action: 'EXPORT_DATA', resource: 'reports', severity: 'WARNING' as const },
      { action: 'MFA_DISABLED', resource: 'security', severity: 'CRITICAL' as const },
    ];
    const a = actions[i % actions.length];
    return {
      id: `audit_${i}`,
      timestamp: new Date(Date.now() - i * 300000).toISOString(),
      userId: `usr_${i % 20}`,
      userName: `${FIRST_NAMES[i % 10]} ${LAST_NAMES[i % 10]}`,
      action: a.action,
      resource: a.resource,
      details: `${a.action} on ${a.resource} resource`,
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: ['Chrome/120', 'Firefox/121', 'Safari/17', 'Edge/120'][i % 4],
      severity: a.severity,
    };
  });

const generateSessions = (): ActiveSession[] =>
  Array.from({ length: 12 }, (_, i) => ({
    id: `sess_${i}`,
    userId: `usr_${i}`,
    userName: `${FIRST_NAMES[i % 10]} ${LAST_NAMES[i % 10]}`,
    device: ['Desktop', 'Laptop', 'Tablet', 'Mobile'][i % 4],
    browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][i % 4],
    ipAddress: `10.0.${i}.${Math.floor(Math.random() * 255)}`,
    location: ['Denver, CO', 'Fort Collins, CO', 'Pueblo, CO', 'Grand Junction, CO'][i % 4],
    startedAt: new Date(Date.now() - Math.random() * 28800000).toISOString(),
    lastActivity: new Date(Date.now() - Math.random() * 600000).toISOString(),
  }));

const generateJobs = (): BackgroundJob[] => [
  { id: 'j1', name: 'FHIR Data Sync', status: 'running', lastRun: '2 min ago', nextRun: 'In 13 min', duration: '1m 42s', errorCount: 0 },
  { id: 'j2', name: 'Audit Log Archival', status: 'completed', lastRun: '1 hour ago', nextRun: 'In 23 hours', duration: '4m 12s', errorCount: 0 },
  { id: 'j3', name: 'PHI Access Report', status: 'scheduled', lastRun: 'Yesterday', nextRun: 'In 6 hours', duration: '2m 30s', errorCount: 0 },
  { id: 'j4', name: 'Database Backup', status: 'completed', lastRun: '3 hours ago', nextRun: 'In 21 hours', duration: '8m 55s', errorCount: 0 },
  { id: 'j5', name: 'Cache Warm-up', status: 'failed', lastRun: '30 min ago', nextRun: 'In 30 min', duration: '0m 03s', errorCount: 3 },
  { id: 'j6', name: 'EHR Webhook Retry', status: 'paused', lastRun: '2 hours ago', nextRun: 'Paused', duration: '0m 15s', errorCount: 12 },
];

// ============================================================
// Navigation Config
// ============================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  tier: AdminTier;
  subItems?: { id: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tier: 1 },
  {
    id: 'users', label: 'User Management', icon: Users, tier: 1,
    subItems: [
      { id: 'users-list', label: 'All Users' },
      { id: 'users-invitations', label: 'Invitations' },
      { id: 'users-sessions', label: 'Active Sessions' },
    ],
  },
  {
    id: 'organizations', label: 'Organizations', icon: Building2, tier: 1,
    subItems: [
      { id: 'orgs-list', label: 'All Organizations' },
      { id: 'orgs-clinics', label: 'Clinics' },
      { id: 'orgs-subscriptions', label: 'Subscriptions' },
    ],
  },
  {
    id: 'security', label: 'Security Center', icon: Shield, tier: 2,
    subItems: [
      { id: 'security-audit', label: 'Audit Logs' },
      { id: 'security-threats', label: 'Threat Detection' },
      { id: 'security-policies', label: 'Security Policies' },
      { id: 'security-compliance', label: 'HIPAA Compliance' },
    ],
  },
  {
    id: 'monitoring', label: 'System Monitoring', icon: Activity, tier: 2,
    subItems: [
      { id: 'monitoring-health', label: 'Health Status' },
      { id: 'monitoring-performance', label: 'Performance' },
      { id: 'monitoring-errors', label: 'Error Tracking' },
      { id: 'monitoring-alerts', label: 'Alerts' },
    ],
  },
  {
    id: 'logs', label: 'Logs & Diagnostics', icon: FileText, tier: 2,
    subItems: [
      { id: 'logs-application', label: 'Application Logs' },
      { id: 'logs-access', label: 'Access Logs' },
      { id: 'logs-api', label: 'API Logs' },
      { id: 'logs-database', label: 'Database Logs' },
    ],
  },
  {
    id: 'integrations', label: 'Integrations', icon: Plug, tier: 2,
    subItems: [
      { id: 'int-ehr', label: 'EHR Systems' },
      { id: 'int-azure', label: 'Azure Services' },
      { id: 'int-api', label: 'API Connections' },
      { id: 'int-webhooks', label: 'Webhooks' },
    ],
  },
  { id: 'jobs', label: 'Background Jobs', icon: Gauge, tier: 2 },
  {
    id: 'devtools', label: 'Dev Tools', icon: Terminal, tier: 3,
    subItems: [
      { id: 'dev-db', label: 'Database Explorer' },
      { id: 'dev-api', label: 'API Tester' },
      { id: 'dev-ws', label: 'WebSocket Monitor' },
      { id: 'dev-cache', label: 'Cache Manager' },
    ],
  },
  { id: 'flags', label: 'Feature Flags', icon: Flag, tier: 3 },
  { id: 'settings', label: 'Settings', icon: Settings, tier: 1 },
];

// ============================================================
// Utility Components
// ============================================================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: '#dcfce7', text: '#166534' },
    PENDING: { bg: '#fef3c7', text: '#92400e' },
    SUSPENDED: { bg: '#fee2e2', text: '#991b1b' },
    LOCKED: { bg: '#fecaca', text: '#7f1d1d' },
    running: { bg: '#dbeafe', text: '#1e40af' },
    completed: { bg: '#dcfce7', text: '#166534' },
    failed: { bg: '#fee2e2', text: '#991b1b' },
    paused: { bg: '#fef3c7', text: '#92400e' },
    scheduled: { bg: '#e0e7ff', text: '#3730a3' },
    INFO: { bg: '#dbeafe', text: '#1e40af' },
    WARNING: { bg: '#fef3c7', text: '#92400e' },
    CRITICAL: { bg: '#fee2e2', text: '#991b1b' },
    normal: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    critical: { bg: '#fee2e2', text: '#991b1b' },
  };
  const c = colors[status] || { bg: '#f3f4f6', text: '#374151' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, background: c.bg, color: c.text,
      textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {status}
    </span>
  );
};

const MetricBar: React.FC<SystemMetric> = ({ label, value, max, unit, status }) => {
  const pct = (value / max) * 100;
  const barColor = status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: '#6b7280' }}>{value}{unit} / {max}{unit}</span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
};

const TierBadge: React.FC<{ tier: AdminTier }> = ({ tier }) => {
  const colors = { 1: '#3b82f6', 2: '#f59e0b', 3: '#ef4444' };
  const labels = { 1: 'T1', 2: 'T2', 3: 'T3' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: 6, fontSize: 9, fontWeight: 700,
      background: colors[tier] + '20', color: colors[tier],
    }}>
      {labels[tier]}
    </span>
  );
};

// ============================================================
// Section Components
// ============================================================

const DashboardSection: React.FC = () => {
  const [metrics] = useState({
    totalUsers: 247,
    activeNow: 23,
    pendingInvites: 8,
    lockedAccounts: 3,
    avgResponseTime: 142,
    uptime: 99.97,
    openAlerts: 5,
    todayLogins: 156,
  });

  const systemMetrics: SystemMetric[] = [
    { label: 'CPU Usage', value: 34, max: 100, unit: '%', status: 'normal' },
    { label: 'Memory', value: 6.2, max: 16, unit: 'GB', status: 'normal' },
    { label: 'Disk (Primary)', value: 124, max: 500, unit: 'GB', status: 'normal' },
    { label: 'Database Connections', value: 18, max: 50, unit: '', status: 'warning' },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: metrics.totalUsers, icon: Users, color: '#3b82f6' },
          { label: 'Active Now', value: metrics.activeNow, icon: Activity, color: '#22c55e' },
          { label: 'Pending Invites', value: metrics.pendingInvites, icon: Mail, color: '#f59e0b' },
          { label: 'Locked Accounts', value: metrics.lockedAccounts, icon: Lock, color: '#ef4444' },
          { label: 'Avg Response', value: `${metrics.avgResponseTime}ms`, icon: Timer, color: '#1A8FA8' },
          { label: 'Uptime', value: `${metrics.uptime}%`, icon: TrendingUp, color: '#14b8a6' },
          { label: 'Open Alerts', value: metrics.openAlerts, icon: AlertTriangle, color: '#f59e0b' },
          { label: "Today's Logins", value: metrics.todayLogins, icon: LogIn, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <s.icon size={16} color={s.color} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: -1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* System Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={16} /> System Resources
          </h3>
          {systemMetrics.map(m => <MetricBar key={m.label} {...m} />)}
        </div>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plug size={16} /> Integration Status
          </h3>
          {[
            { name: 'Epic FHIR', status: 'Connected', ok: true },
            { name: 'Azure AD B2C', status: 'Connected', ok: true },
            { name: 'BioMistral AI', status: 'Connected', ok: true },
            { name: 'WebSocket Server', status: 'Degraded', ok: false },
            { name: 'Redis Cache', status: 'Connected', ok: true },
            { name: 'Notification Service', status: 'Connected', ok: true },
          ].map(int => (
            <div key={int.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid #f3f4f6',
            }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{int.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: int.ok ? '#16a34a' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                {int.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {int.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UserManagementSection: React.FC<{ subSection: string }> = ({ subSection }) => {
  const [users] = useState(() => generateUsers(30));
  const [sessions] = useState(() => generateSessions());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (search && !`${u.firstName} ${u.lastName} ${u.email} ${u.username}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  if (subSection === 'users-sessions') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Active Sessions ({sessions.length})</h3>
          <button style={{ padding: '8px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Force Logout All
          </button>
        </div>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['User', 'Device', 'Browser', 'IP Address', 'Location', 'Started', 'Last Active', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.userName}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{s.device}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{s.browser}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{s.ipAddress}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{s.location}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{new Date(s.startedAt).toLocaleTimeString()}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{new Date(s.lastActivity).toLocaleTimeString()}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button style={{ padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      End Session
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text" placeholder="Search users by name, email, or username..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white' }}>
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="PROVIDER">Provider</option>
          <option value="NURSE">Nurse</option>
          <option value="STAFF">Staff</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white' }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="LOCKED">Locked</option>
        </select>
        <button style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserPlus size={14} /> Invite User
        </button>
      </div>

      {/* Users Table */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['User', 'Role', 'Status', 'MFA', 'Last Login', 'Failed Attempts', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.email}</div>
                </td>
                <td style={{ padding: '10px 14px' }}><StatusBadge status={u.role} /></td>
                <td style={{ padding: '10px 14px' }}><StatusBadge status={u.status} /></td>
                <td style={{ padding: '10px 14px' }}>
                  {u.mfaEnabled ? <ShieldCheck size={16} color="#16a34a" /> : <ShieldAlert size={16} color="#d97706" />}
                </td>
                <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{new Date(u.lastLogin).toLocaleDateString()}</td>
                <td style={{ padding: '10px 14px', color: u.failedAttempts > 3 ? '#dc2626' : '#6b7280', fontWeight: u.failedAttempts > 3 ? 600 : 400 }}>{u.failedAttempts}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button title="Reset Password" style={{ padding: 6, background: '#f3f4f6', borderRadius: 6, border: 'none', cursor: 'pointer' }}><Key size={13} /></button>
                    {u.status === 'LOCKED' && <button title="Unlock" style={{ padding: 6, background: '#dcfce7', borderRadius: 6, border: 'none', cursor: 'pointer' }}><Unlock size={13} /></button>}
                    {u.status === 'ACTIVE' && <button title="Suspend" style={{ padding: 6, background: '#fef3c7', borderRadius: 6, border: 'none', cursor: 'pointer' }}><UserX size={13} /></button>}
                    <button title="Force Logout" style={{ padding: 6, background: '#fee2e2', borderRadius: 6, border: 'none', cursor: 'pointer' }}><LogOut size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>
    </div>
  );
};

const SecurityAuditSection: React.FC = () => {
  const [auditLog] = useState(() => generateAuditLog(50));
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filtered = auditLog.filter(e => severityFilter === 'ALL' || e.severity === severityFilter);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>HIPAA Audit Trail</h3>
        {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)} style={{
            padding: '6px 14px', borderRadius: 20, border: '1px solid #e5e7eb', background: severityFilter === s ? '#111827' : 'white',
            color: severityFilter === s ? 'white' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {s === 'ALL' ? 'All' : s}
          </button>
        ))}
        <button style={{ padding: '8px 16px', background: '#f3f4f6', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Severity'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 30).map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{new Date(e.timestamp).toLocaleString()}</td>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{e.userName}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{e.action}</td>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{e.resource}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{e.ipAddress}</td>
                <td style={{ padding: '8px 12px' }}><StatusBadge status={e.severity} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BackgroundJobsSection: React.FC = () => {
  const [jobs] = useState(generateJobs);
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Background Jobs</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {jobs.map(j => (
          <div key={j.id} style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{j.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Last: {j.lastRun} · Next: {j.nextRun} · Duration: {j.duration}</div>
            </div>
            <StatusBadge status={j.status} />
            {j.errorCount > 0 && <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{j.errorCount} errors</span>}
            <div style={{ display: 'flex', gap: 4 }}>
              {j.status === 'paused' && <button style={{ padding: 6, background: '#dcfce7', borderRadius: 6, border: 'none', cursor: 'pointer' }} title="Resume"><Play size={14} /></button>}
              {j.status === 'running' && <button style={{ padding: 6, background: '#fef3c7', borderRadius: 6, border: 'none', cursor: 'pointer' }} title="Pause"><Pause size={14} /></button>}
              {j.status === 'failed' && <button style={{ padding: 6, background: '#dbeafe', borderRadius: 6, border: 'none', cursor: 'pointer' }} title="Retry"><RotateCcw size={14} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FeatureFlagsSection: React.FC = () => {
  const [flags, setFlags] = useState([
    { key: 'COMPASS_ASSESSMENT', label: 'COMPASS Patient Assessment', enabled: true, tier: 'MVP' },
    { key: 'PROVIDER_INBOX', label: 'Provider Smart Inbox', enabled: true, tier: 'MVP' },
    { key: 'LAB_ORDERING', label: 'Lab Ordering Module', enabled: true, tier: 'MVP' },
    { key: 'IMAGING_ORDERING', label: 'Imaging Ordering Module', enabled: true, tier: 'MVP' },
    { key: 'MEDICATION_ORDERING', label: 'Medication Ordering Module', enabled: true, tier: 'MVP' },
    { key: 'PREVISIT_SUMMARY', label: 'Pre-Visit Summary', enabled: true, tier: 'MVP' },
    { key: 'RED_FLAG_DETECTION', label: 'Red Flag Detection', enabled: true, tier: 'MVP' },
    { key: 'AMBIENT_DOCUMENTATION', label: 'Ambient Documentation', enabled: false, tier: 'Enterprise' },
    { key: 'TELEHEALTH', label: 'Telehealth Video Panel', enabled: false, tier: 'Enterprise' },
    { key: 'POPULATION_HEALTH', label: 'Population Health Dashboard', enabled: false, tier: 'Enterprise' },
    { key: 'CLINICAL_TRIALS', label: 'Clinical Trials Matcher', enabled: false, tier: 'Enterprise' },
    { key: 'RPM', label: 'Remote Patient Monitoring', enabled: false, tier: 'Enterprise' },
    { key: 'SDOH', label: 'Social Determinants of Health', enabled: false, tier: 'Enterprise' },
    { key: 'PREDICTIVE_ALERTS', label: 'Predictive Deterioration Alerts', enabled: false, tier: 'Enterprise' },
    { key: 'PRIOR_AUTH', label: 'Prior Authorization Automation', enabled: false, tier: 'Enterprise' },
  ]);

  const toggle = (key: string) => setFlags(f => f.map(fl => fl.key === key ? { ...fl, enabled: !fl.enabled } : fl));

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Feature Flags</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {flags.map(f => (
          <div key={f.key} style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 16, opacity: f.enabled ? 1 : 0.6,
          }}>
            <button onClick={() => toggle(f.key)} style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
              background: f.enabled ? '#22c55e' : '#d1d5db', transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: f.enabled ? 22 : 2, width: 20, height: 20,
                borderRadius: 10, background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{f.label}</div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af' }}>{f.key}</div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: f.tier === 'MVP' ? '#dbeafe' : '#E6F7F5', color: f.tier === 'MVP' ? '#1e40af' : '#0C4C5E',
            }}>
              {f.tier}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DevToolsSection: React.FC<{ subSection: string }> = ({ subSection }) => {
  const [query, setQuery] = useState('SELECT * FROM "User" LIMIT 10;');
  const [apiUrl, setApiUrl] = useState('/api/health');
  const [apiMethod, setApiMethod] = useState('GET');

  if (subSection === 'dev-api') {
    return (
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>API Tester</h3>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={apiMethod} onChange={e => setApiMethod(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'white' }}>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
            </select>
            <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} style={{ flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'monospace' }} />
            <button style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', minHeight: 200, whiteSpace: 'pre' }}>
{`{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": "4d 12h 36m",
  "services": {
    "database": "connected",
    "redis": "connected",
    "websocket": "degraded"
  }
}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Database Explorer <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 400 }}>(Read-Only)</span></h3>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: 'white' }}>
            <option>Template Queries</option>
            <option>Active Users</option>
            <option>Recent Assessments</option>
            <option>Failed Logins (24h)</option>
            <option>PHI Access Log</option>
          </select>
        </div>
        <textarea value={query} onChange={e => setQuery(e.target.value)} style={{
          width: '100%', height: 80, padding: 12, fontFamily: 'monospace', fontSize: 13,
          border: '1px solid #e5e7eb', borderRadius: 8, resize: 'vertical', background: '#f8fafc',
        }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button style={{ padding: '8px 20px', background: '#22c55e', color: 'white', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Execute</button>
          <button style={{ padding: '8px 16px', background: '#f3f4f6', borderRadius: 8, border: 'none', fontSize: 13, cursor: 'pointer' }}>Clear</button>
        </div>
        <div style={{ marginTop: 16, background: '#1e293b', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', minHeight: 120 }}>
          <span style={{ color: '#6b7280' }}>-- Execute a query to see results</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Main Admin Portal Component
// ============================================================

export default function ITAdminPortal() {
  const [currentTier, setCurrentTier] = useState<AdminTier>(3);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [activeSubNav, setActiveSubNav] = useState('');
  const [expandedNav, setExpandedNav] = useState<string[]>(['users', 'security']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const visibleNav = NAV_ITEMS.filter(n => n.tier <= currentTier);

  const toggleExpand = (id: string) => {
    setExpandedNav(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleNavClick = (item: NavItem) => {
    if (item.subItems) {
      toggleExpand(item.id);
      if (!expandedNav.includes(item.id)) {
        setActiveNav(item.id);
        setActiveSubNav(item.subItems[0].id);
      }
    } else {
      setActiveNav(item.id);
      setActiveSubNav('');
    }
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard': return <DashboardSection />;
      case 'users': return <UserManagementSection subSection={activeSubNav || 'users-list'} />;
      case 'security': return <SecurityAuditSection />;
      case 'jobs': return <BackgroundJobsSection />;
      case 'flags': return <FeatureFlagsSection />;
      case 'devtools': return <DevToolsSection subSection={activeSubNav || 'dev-db'} />;
      default:
        return (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <Wrench size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#6b7280' }}>Section: {activeNav}</h3>
            <p style={{ fontSize: 13, marginTop: 8 }}>This section is available in the full implementation.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", background: '#f8fafc' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? 60 : 260, background: '#111827', color: 'white',
        display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 10 }}>
          {!sidebarCollapsed && (
            <>
              <Shield size={20} color="#1A8FA8" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>Admin Portal</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>ATTENDING AI</div>
              </div>
            </>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{
            marginLeft: 'auto', padding: 4, background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer',
          }}>
            <PanelLeft size={16} />
          </button>
        </div>

        {/* Tier Selector */}
        {!sidebarCollapsed && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Access Tier</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {([1, 2, 3] as AdminTier[]).map(t => (
                <button key={t} onClick={() => setCurrentTier(t)} style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: currentTier >= t ? ['#3b82f6', '#f59e0b', '#ef4444'][t - 1] : '#374151',
                  color: 'white', fontSize: 11, fontWeight: 700, opacity: currentTier >= t ? 1 : 0.4,
                }}>
                  Tier {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {visibleNav.map(item => (
            <div key={item.id}>
              <button onClick={() => handleNavClick(item)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: sidebarCollapsed ? '10px 20px' : '10px 16px',
                background: activeNav === item.id ? '#1f2937' : 'transparent',
                border: 'none', color: activeNav === item.id ? 'white' : '#9ca3af',
                cursor: 'pointer', fontSize: 13, fontWeight: activeNav === item.id ? 600 : 400,
                borderLeft: activeNav === item.id ? '3px solid #1A8FA8' : '3px solid transparent',
              }}>
                <item.icon size={16} />
                {!sidebarCollapsed && (
                  <>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    <TierBadge tier={item.tier} />
                    {item.subItems && (expandedNav.includes(item.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                  </>
                )}
              </button>
              {!sidebarCollapsed && item.subItems && expandedNav.includes(item.id) && (
                <div style={{ paddingLeft: 42 }}>
                  {item.subItems.map(sub => (
                    <button key={sub.id} onClick={() => { setActiveNav(item.id); setActiveSubNav(sub.id); }} style={{
                      width: '100%', textAlign: 'left', padding: '7px 12px', background: activeSubNav === sub.id ? '#1f2937' : 'transparent',
                      border: 'none', color: activeSubNav === sub.id ? '#1A8FA8' : '#6b7280',
                      cursor: 'pointer', fontSize: 12, borderRadius: 6,
                    }}>
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div style={{ padding: 16, borderTop: '1px solid #1f2937', fontSize: 11, color: '#6b7280' }}>
            <div style={{ fontWeight: 600 }}>Scott Isbell, MD</div>
            <div>Tier 3 · Engineering</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Top Bar */}
        <div style={{
          padding: '12px 24px', background: 'white', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1, letterSpacing: -0.3 }}>
            {NAV_ITEMS.find(n => n.id === activeNav)?.label || 'Dashboard'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: '#22c55e', display: 'inline-block' }} />
            All systems operational
          </div>
          <button style={{ padding: '6px 14px', background: '#f3f4f6', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: 24 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
