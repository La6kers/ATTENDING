// ============================================================
// ATTENDING AI - Integration Hub
// apps/provider-portal/components/integrations/IntegrationHub.tsx
//
// Phase 10E: Connect everything, seamlessly
// FHIR R4, HL7, Webhooks, and API Management
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  Link,
  Plug,
  Database,
  Server,
  Shield,
  Key,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Settings,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Play,
  Pause,
  Code,
  FileJson,
  Webhook,
  Zap,
  Globe,
  Lock,
  Unlock,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing' | 'pending';
export type IntegrationType = 'ehr' | 'lab' | 'pharmacy' | 'imaging' | 'billing' | 'custom';
export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'smart_on_fhir';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  vendor: string;
  status: ConnectionStatus;
  authType: AuthType;
  fhirVersion?: string;
  lastSync?: Date;
  syncInterval?: number;
  endpoints: IntegrationEndpoint[];
  resources?: string[];
  errorMessage?: string;
  metadata?: Record<string, string>;
}

export interface IntegrationEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: ConnectionStatus;
  lastChecked?: Date;
  responseTime?: number;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'paused' | 'failed';
  secret?: string;
  createdAt: Date;
  lastTriggered?: Date;
  successRate: number;
  totalDeliveries: number;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  status: 'active' | 'revoked' | 'expired';
  rateLimit?: number;
  usageCount: number;
}

export interface DataMapping {
  id: string;
  sourcePath: string;
  targetPath: string;
  transform?: string;
  required: boolean;
}

export interface SyncLog {
  id: string;
  integrationId: string;
  integrationName: string;
  type: 'inbound' | 'outbound';
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsFailed: number;
  startTime: Date;
  endTime?: Date;
  errors?: string[];
}

// ============================================================
// MOCK DATA
// ============================================================

const mockIntegrations: Integration[] = [
  {
    id: 'int1',
    name: 'Epic MyChart',
    type: 'ehr',
    vendor: 'Epic Systems',
    status: 'connected',
    authType: 'smart_on_fhir',
    fhirVersion: 'R4',
    lastSync: new Date(Date.now() - 5 * 60 * 1000),
    syncInterval: 15,
    endpoints: [
      { id: 'e1', name: 'Patient', url: '/fhir/r4/Patient', method: 'GET', status: 'connected', lastChecked: new Date(), responseTime: 145 },
      { id: 'e2', name: 'Observation', url: '/fhir/r4/Observation', method: 'GET', status: 'connected', lastChecked: new Date(), responseTime: 234 },
      { id: 'e3', name: 'Condition', url: '/fhir/r4/Condition', method: 'GET', status: 'connected', lastChecked: new Date(), responseTime: 189 },
    ],
    resources: ['Patient', 'Observation', 'Condition', 'MedicationRequest', 'AllergyIntolerance', 'Immunization'],
  },
  {
    id: 'int2',
    name: 'Oracle Health (Cerner)',
    type: 'ehr',
    vendor: 'Oracle Health',
    status: 'connected',
    authType: 'smart_on_fhir',
    fhirVersion: 'R4',
    lastSync: new Date(Date.now() - 12 * 60 * 1000),
    syncInterval: 30,
    endpoints: [
      { id: 'e4', name: 'Patient', url: '/fhir/r4/Patient', method: 'GET', status: 'connected', lastChecked: new Date(), responseTime: 198 },
      { id: 'e5', name: 'Encounter', url: '/fhir/r4/Encounter', method: 'GET', status: 'connected', lastChecked: new Date(), responseTime: 267 },
    ],
    resources: ['Patient', 'Encounter', 'DiagnosticReport', 'Procedure'],
  },
  {
    id: 'int3',
    name: 'Quest Diagnostics',
    type: 'lab',
    vendor: 'Quest Diagnostics',
    status: 'connected',
    authType: 'api_key',
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
    syncInterval: 60,
    endpoints: [
      { id: 'e6', name: 'Results', url: '/api/v2/results', method: 'GET', status: 'connected', lastChecked: new Date(), responseTime: 312 },
      { id: 'e7', name: 'Orders', url: '/api/v2/orders', method: 'POST', status: 'connected', lastChecked: new Date(), responseTime: 445 },
    ],
  },
  {
    id: 'int4',
    name: 'Surescripts',
    type: 'pharmacy',
    vendor: 'Surescripts',
    status: 'error',
    authType: 'oauth2',
    lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000),
    errorMessage: 'OAuth token expired. Please re-authenticate.',
    endpoints: [
      { id: 'e8', name: 'Prescriptions', url: '/api/prescriptions', method: 'POST', status: 'error', lastChecked: new Date() },
    ],
  },
  {
    id: 'int5',
    name: 'RadNet Imaging',
    type: 'imaging',
    vendor: 'RadNet',
    status: 'syncing',
    authType: 'api_key',
    lastSync: new Date(),
    endpoints: [
      { id: 'e9', name: 'Studies', url: '/api/studies', method: 'GET', status: 'syncing', lastChecked: new Date(), responseTime: 523 },
    ],
  },
];

const mockWebhooks: WebhookConfig[] = [
  {
    id: 'wh1',
    name: 'Patient Admission Alert',
    url: 'https://api.example.com/webhooks/admission',
    events: ['patient.admitted', 'patient.transferred'],
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000),
    successRate: 98.5,
    totalDeliveries: 1247,
  },
  {
    id: 'wh2',
    name: 'Lab Result Notification',
    url: 'https://api.example.com/webhooks/lab-results',
    events: ['lab.result.final', 'lab.result.critical'],
    status: 'active',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    lastTriggered: new Date(Date.now() - 30 * 60 * 1000),
    successRate: 99.2,
    totalDeliveries: 5823,
  },
  {
    id: 'wh3',
    name: 'Appointment Reminder',
    url: 'https://api.example.com/webhooks/appointments',
    events: ['appointment.created', 'appointment.updated', 'appointment.cancelled'],
    status: 'paused',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    successRate: 95.8,
    totalDeliveries: 3456,
  },
];

const mockAPIKeys: APIKey[] = [
  {
    id: 'ak1',
    name: 'Production API Key',
    key: 'att_live_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    prefix: 'att_live_',
    permissions: ['read:patients', 'write:patients', 'read:encounters', 'write:encounters'],
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 5 * 60 * 1000),
    status: 'active',
    rateLimit: 1000,
    usageCount: 245678,
  },
  {
    id: 'ak2',
    name: 'Development API Key',
    key: 'att_test_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    prefix: 'att_test_',
    permissions: ['read:patients', 'read:encounters'],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'active',
    rateLimit: 100,
    usageCount: 12345,
  },
  {
    id: 'ak3',
    name: 'Legacy Integration Key',
    key: 'att_live_sk_yyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    prefix: 'att_live_',
    permissions: ['read:patients'],
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    status: 'expired',
    usageCount: 89012,
  },
];

const mockSyncLogs: SyncLog[] = [
  { id: 'sl1', integrationId: 'int1', integrationName: 'Epic MyChart', type: 'inbound', status: 'success', recordsProcessed: 145, recordsFailed: 0, startTime: new Date(Date.now() - 5 * 60 * 1000), endTime: new Date(Date.now() - 4 * 60 * 1000) },
  { id: 'sl2', integrationId: 'int2', integrationName: 'Oracle Health', type: 'inbound', status: 'success', recordsProcessed: 89, recordsFailed: 2, startTime: new Date(Date.now() - 12 * 60 * 1000), endTime: new Date(Date.now() - 11 * 60 * 1000) },
  { id: 'sl3', integrationId: 'int3', integrationName: 'Quest Diagnostics', type: 'inbound', status: 'partial', recordsProcessed: 234, recordsFailed: 12, startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000), errors: ['Invalid specimen ID: SP-12345', 'Missing patient DOB for order 67890'] },
  { id: 'sl4', integrationId: 'int4', integrationName: 'Surescripts', type: 'outbound', status: 'failed', recordsProcessed: 0, recordsFailed: 15, startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), errors: ['OAuth token expired'] },
];

// ============================================================
// COMPONENTS
// ============================================================

const StatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const config: Record<ConnectionStatus, { color: string; icon: React.ReactNode; label: string }> = {
    connected: { color: 'text-green-500', icon: <CheckCircle size={16} />, label: 'Connected' },
    disconnected: { color: 'text-slate-400', icon: <XCircle size={16} />, label: 'Disconnected' },
    error: { color: 'text-red-500', icon: <AlertTriangle size={16} />, label: 'Error' },
    syncing: { color: 'text-blue-500', icon: <RefreshCw size={16} className="animate-spin" />, label: 'Syncing' },
    pending: { color: 'text-amber-500', icon: <Clock size={16} />, label: 'Pending' },
  };
  
  const { color, icon, label } = config[status];
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      {icon}
      <span className="text-sm">{label}</span>
    </span>
  );
};

const IntegrationTypeIcon: React.FC<{ type: IntegrationType }> = ({ type }) => {
  const icons: Record<IntegrationType, React.ReactNode> = {
    ehr: <Database size={18} />,
    lab: <Activity size={18} />,
    pharmacy: <Plug size={18} />,
    imaging: <Server size={18} />,
    billing: <FileJson size={18} />,
    custom: <Code size={18} />,
  };
  return <>{icons[type]}</>;
};

const IntegrationCard: React.FC<{
  integration: Integration;
  onConfigure: (id: string) => void;
  onSync: (id: string) => void;
}> = ({ integration, onConfigure, onSync }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl border ${
      integration.status === 'error' ? 'border-red-200' : 'border-slate-200'
    } overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              integration.status === 'connected' ? 'bg-green-100 text-green-600' :
              integration.status === 'error' ? 'bg-red-100 text-red-600' :
              'bg-slate-100 text-slate-600'
            }`}>
              <IntegrationTypeIcon type={integration.type} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{integration.name}</h4>
              <p className="text-sm text-slate-500">{integration.vendor}</p>
            </div>
          </div>
          <StatusIndicator status={integration.status} />
        </div>

        {integration.errorMessage && (
          <div className="mb-3 p-2 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">{integration.errorMessage}</p>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
          {integration.fhirVersion && (
            <span className="flex items-center gap-1">
              <FileJson size={14} />
              FHIR {integration.fhirVersion}
            </span>
          )}
          {integration.lastSync && (
            <span className="flex items-center gap-1">
              <Clock size={14} />
              Last sync: {Math.round((Date.now() - integration.lastSync.getTime()) / 60000)}m ago
            </span>
          )}
          <span className="flex items-center gap-1">
            <Shield size={14} />
            {integration.authType.replace('_', ' ')}
          </span>
        </div>

        {integration.resources && (
          <div className="flex flex-wrap gap-1 mb-3">
            {integration.resources.slice(0, 4).map(resource => (
              <span key={resource} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                {resource}
              </span>
            ))}
            {integration.resources.length > 4 && (
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                +{integration.resources.length - 4} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSync(integration.id)}
            disabled={integration.status === 'syncing'}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={integration.status === 'syncing' ? 'animate-spin' : ''} />
            Sync Now
          </button>
          <button
            onClick={() => onConfigure(integration.id)}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Settings size={14} />
            Configure
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <h5 className="font-medium text-slate-700 mb-3">Endpoints</h5>
          <div className="space-y-2">
            {integration.endpoints.map(endpoint => (
              <div key={endpoint.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-mono rounded ${
                    endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {endpoint.method}
                  </span>
                  <span className="text-sm font-mono text-slate-600">{endpoint.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  {endpoint.responseTime && (
                    <span className="text-xs text-slate-500">{endpoint.responseTime}ms</span>
                  )}
                  <StatusIndicator status={endpoint.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const WebhookCard: React.FC<{
  webhook: WebhookConfig;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ webhook, onToggle, onDelete }) => {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Webhook size={18} className="text-purple-600" />
          <h4 className="font-semibold text-slate-900">{webhook.name}</h4>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          webhook.status === 'active' ? 'bg-green-100 text-green-700' :
          webhook.status === 'paused' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {webhook.status}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-1">Endpoint URL</p>
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded font-mono text-sm">
          <span className="truncate flex-1">{webhook.url}</span>
          <button className="p-1 hover:bg-slate-200 rounded">
            <Copy size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {webhook.events.map(event => (
          <span key={event} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
            {event}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
        <span>Success rate: {webhook.successRate}%</span>
        <span>{webhook.totalDeliveries.toLocaleString()} deliveries</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(webhook.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            webhook.status === 'active' 
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {webhook.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
          {webhook.status === 'active' ? 'Pause' : 'Resume'}
        </button>
        <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Edit size={16} className="text-slate-500" />
        </button>
        <button 
          onClick={() => onDelete(webhook.id)}
          className="p-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const APIKeyCard: React.FC<{
  apiKey: APIKey;
  onRevoke: (id: string) => void;
}> = ({ apiKey, onRevoke }) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className={`bg-white rounded-xl border p-4 ${
      apiKey.status === 'active' ? 'border-slate-200' :
      apiKey.status === 'revoked' ? 'border-red-200 bg-red-50' :
      'border-amber-200 bg-amber-50'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key size={18} className={
            apiKey.status === 'active' ? 'text-green-600' :
            apiKey.status === 'revoked' ? 'text-red-600' :
            'text-amber-600'
          } />
          <h4 className="font-semibold text-slate-900">{apiKey.name}</h4>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          apiKey.status === 'active' ? 'bg-green-100 text-green-700' :
          apiKey.status === 'revoked' ? 'bg-red-100 text-red-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {apiKey.status}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-1">API Key</p>
        <div className="flex items-center gap-2 p-2 bg-slate-100 rounded font-mono text-sm">
          <span className="flex-1 truncate">
            {showKey ? apiKey.key : `${apiKey.prefix}${'•'.repeat(32)}`}
          </span>
          <button onClick={() => setShowKey(!showKey)} className="p-1 hover:bg-slate-200 rounded">
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="p-1 hover:bg-slate-200 rounded">
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {apiKey.permissions.slice(0, 3).map(perm => (
          <span key={perm} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
            {perm}
          </span>
        ))}
        {apiKey.permissions.length > 3 && (
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            +{apiKey.permissions.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
        <span>{apiKey.usageCount.toLocaleString()} requests</span>
        {apiKey.rateLimit && <span>Rate limit: {apiKey.rateLimit}/min</span>}
      </div>

      {apiKey.status === 'active' && (
        <button
          onClick={() => onRevoke(apiKey.id)}
          className="w-full px-3 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
        >
          Revoke Key
        </button>
      )}
    </div>
  );
};

const SyncLogRow: React.FC<{ log: SyncLog }> = ({ log }) => (
  <div className={`p-3 rounded-lg border ${
    log.status === 'success' ? 'border-green-100 bg-green-50' :
    log.status === 'partial' ? 'border-amber-100 bg-amber-50' :
    'border-red-100 bg-red-50'
  }`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className={`p-1 rounded ${
          log.type === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
        }`}>
          {log.type === 'inbound' ? '↓' : '↑'}
        </span>
        <span className="font-medium text-slate-900">{log.integrationName}</span>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        log.status === 'success' ? 'bg-green-100 text-green-700' :
        log.status === 'partial' ? 'bg-amber-100 text-amber-700' :
        'bg-red-100 text-red-700'
      }`}>
        {log.status}
      </span>
    </div>
    <div className="flex items-center gap-4 text-sm text-slate-500">
      <span>{log.recordsProcessed} processed</span>
      {log.recordsFailed > 0 && <span className="text-red-600">{log.recordsFailed} failed</span>}
      <span>{log.startTime.toLocaleTimeString()}</span>
    </div>
    {log.errors && log.errors.length > 0 && (
      <div className="mt-2 text-xs text-red-600">
        {log.errors[0]}
        {log.errors.length > 1 && ` (+${log.errors.length - 1} more)`}
      </div>
    )}
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

export const IntegrationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'webhooks' | 'api_keys' | 'logs'>('integrations');
  const [integrations] = useState<Integration[]>(mockIntegrations);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(mockWebhooks);
  const [apiKeys] = useState<APIKey[]>(mockAPIKeys);
  const [syncLogs] = useState<SyncLog[]>(mockSyncLogs);

  const handleConfigureIntegration = (id: string) => {
    console.log('Configure integration:', id);
  };

  const handleSyncIntegration = (id: string) => {
    console.log('Sync integration:', id);
  };

  const handleToggleWebhook = (id: string) => {
    setWebhooks(prev => prev.map(wh => 
      wh.id === id ? { ...wh, status: wh.status === 'active' ? 'paused' : 'active' as any } : wh
    ));
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(wh => wh.id !== id));
  };

  const handleRevokeKey = (id: string) => {
    console.log('Revoke key:', id);
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const errorCount = integrations.filter(i => i.status === 'error').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Integration Hub</h2>
              <p className="text-violet-200 text-sm">Connect, manage, and monitor all integrations</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full">
                <CheckCircle size={14} />
                {connectedCount} Connected
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 px-3 py-1 bg-red-500/20 rounded-full">
                  <AlertTriangle size={14} />
                  {errorCount} Errors
                </span>
              )}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
              <Plus size={18} />
              Add Integration
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'integrations', label: 'Integrations', icon: Database, count: integrations.length },
          { key: 'webhooks', label: 'Webhooks', icon: Webhook, count: webhooks.length },
          { key: 'api_keys', label: 'API Keys', icon: Key, count: apiKeys.filter(k => k.status === 'active').length },
          { key: 'logs', label: 'Sync Logs', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-violet-600 border-b-2 border-violet-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="grid grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConfigure={handleConfigureIntegration}
                onSync={handleSyncIntegration}
              />
            ))}
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Webhook Configurations</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
                <Plus size={16} />
                Create Webhook
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {webhooks.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  onToggle={handleToggleWebhook}
                  onDelete={handleDeleteWebhook}
                />
              ))}
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api_keys' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">API Keys</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
                <Plus size={16} />
                Generate New Key
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {apiKeys.map((key) => (
                <APIKeyCard
                  key={key.id}
                  apiKey={key}
                  onRevoke={handleRevokeKey}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sync Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Recent Sync Activity</h3>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                <Filter size={16} />
                Filter
              </button>
            </div>
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <SyncLogRow key={log.id} log={log} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationHub;
