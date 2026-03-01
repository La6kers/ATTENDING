// =============================================================================
// COMPASS Admin - Webhook Settings
// apps/compass-admin/pages/settings/webhooks.tsx
//
// Configure, test, and monitor webhook endpoints.
// Practices use this to connect COMPASS to their EHR, Slack, or any system.
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Webhook,
  Plus,
  TestTube,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

// =============================================================================
// Types
// =============================================================================

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;  // masked
  format: string;
  events: string;  // JSON string or parsed array
  isActive: boolean;
  consecutiveFailures: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  disabledAt?: string;
  disabledReason?: string;
  deliveryCount?: number;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: string;
  httpStatus?: number;
  latencyMs?: number;
  errorMessage?: string;
  attemptNumber: number;
  createdAt: string;
}

// =============================================================================
// Event Options
// =============================================================================

const EVENTS = [
  { value: 'assessment.completed', label: 'Assessment Completed', desc: 'When a patient finishes their check-in' },
  { value: 'assessment.emergency', label: 'Emergency Detected', desc: 'Critical red flag triggers immediate alert' },
  { value: 'assessment.updated', label: 'Assessment Updated', desc: 'Provider adds notes or changes triage' },
  { value: 'assessment.claimed', label: 'Assessment Claimed', desc: 'A provider claims/assigns the assessment' },
];

const FORMATS = [
  { value: 'json', label: 'COMPASS JSON', desc: 'Native format — richest data' },
  { value: 'fhir_r4', label: 'FHIR R4 Bundle', desc: 'For FHIR-enabled EHRs' },
  { value: 'hl7v2', label: 'HL7v2 ORU', desc: 'For legacy systems' },
];

// =============================================================================
// Create/Edit Modal
// =============================================================================

function WebhookModal({ onClose, onSave, editing }: {
  onClose: () => void;
  onSave: () => void;
  editing?: WebhookConfig;
}) {
  const [name, setName] = useState(editing?.name || '');
  const [url, setUrl] = useState(editing?.url || '');
  const [format, setFormat] = useState(editing?.format || 'json');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    editing?.events ? (typeof editing.events === 'string' ? JSON.parse(editing.events) : editing.events) : ['assessment.completed']
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdSecret, setCreatedSecret] = useState('');

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!url.trim()) { setError('URL is required'); return; }
    if (!url.startsWith('https://')) { setError('URL must use HTTPS'); return; }
    if (selectedEvents.length === 0) { setError('Select at least one event'); return; }

    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const endpoint = editing ? `/api/webhooks/${editing.id}` : '/api/webhooks';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, format, events: selectedEvents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      if (data.signingSecret) {
        setCreatedSecret(data.signingSecret);
      } else {
        onSave();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Show secret after creation
  if (createdSecret) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Webhook Created</h2>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800 font-medium mb-2">
              ⚠️ Save this signing secret — it will NOT be shown again.
            </p>
            <p className="text-sm text-amber-700 mb-3">
              Use this secret to verify webhook signatures (X-Compass-Signature header).
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white p-2 rounded text-xs font-mono border border-amber-200 break-all">
                {createdSecret}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(createdSecret)}
                className="p-2 hover:bg-amber-100 rounded transition-colors"
              >
                <Copy className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          </div>

          <button
            onClick={onSave}
            className="w-full py-2.5 bg-compass-600 text-white rounded-lg font-medium hover:bg-compass-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {editing ? 'Edit Webhook' : 'Add Webhook Endpoint'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Name */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Epic Integration, Slack Alerts"
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-compass-300 focus:border-compass-400 outline-none"
          />
        </label>

        {/* URL */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Webhook URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-system.com/api/compass-intake"
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-compass-300 focus:border-compass-400 outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">Must use HTTPS. PHI will be transmitted.</p>
        </label>

        {/* Format */}
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-700">Payload Format</span>
          <div className="mt-2 space-y-2">
            {FORMATS.map((fmt) => (
              <label key={fmt.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                format === fmt.value ? 'border-compass-400 bg-compass-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value={fmt.value}
                  checked={format === fmt.value}
                  onChange={() => setFormat(fmt.value)}
                  className="accent-compass-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{fmt.label}</p>
                  <p className="text-xs text-gray-500">{fmt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Events */}
        <div className="mb-6">
          <span className="text-sm font-medium text-gray-700">Events</span>
          <div className="mt-2 space-y-2">
            {EVENTS.map((evt) => (
              <label key={evt.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedEvents.includes(evt.value) ? 'border-compass-400 bg-compass-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(evt.value)}
                  onChange={() => toggleEvent(evt.value)}
                  className="accent-compass-600 rounded"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{evt.label}</p>
                  <p className="text-xs text-gray-500">{evt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-compass-600 text-white rounded-lg font-medium hover:bg-compass-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : editing ? 'Update' : 'Create Webhook'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function WebhookSettingsPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});

  const loadWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      console.error('[Webhooks] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (webhookId: string) => {
    try {
      const res = await fetch(`/api/webhooks/${webhookId}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries((prev) => ({ ...prev, [webhookId]: data.webhook?.deliveries || [] }));
      }
    } catch (err) {
      console.error('[Webhooks] Delivery load error:', err);
    }
  };

  useEffect(() => { loadWebhooks(); }, []);

  const handleTest = async (webhookId: string) => {
    setTestingId(webhookId);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId }),
      });
      const data = await res.json();
      setTestResult({ webhookId, ...data });
    } catch (err) {
      setTestResult({ webhookId, success: false, message: 'Test request failed' });
    } finally {
      setTestingId(null);
    }
  };

  const handleToggle = async (webhook: WebhookConfig) => {
    try {
      await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });
      loadWebhooks();
    } catch (err) {
      console.error('[Webhooks] Toggle error:', err);
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Delete this webhook? All delivery history will be removed.')) return;
    try {
      await fetch(`/api/webhooks/${webhookId}`, { method: 'DELETE' });
      loadWebhooks();
    } catch (err) {
      console.error('[Webhooks] Delete error:', err);
    }
  };

  const handleExpand = (webhookId: string) => {
    if (expandedId === webhookId) {
      setExpandedId(null);
    } else {
      setExpandedId(webhookId);
      if (!deliveries[webhookId]) {
        loadDeliveries(webhookId);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Webhook Settings | COMPASS Admin</title>
      </Head>

      <CompassAdminShell title="Webhook Settings">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Webhook Endpoints</h1>
              <p className="text-sm text-gray-500 mt-1">
                Push assessment data to your EHR or other systems in real-time.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-compass-600 text-white rounded-lg font-medium hover:bg-compass-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Endpoint
            </button>
          </div>

          {/* Webhook List */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-compass-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading webhooks...</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No webhooks configured</h3>
              <p className="text-gray-500 text-sm mb-4">
                Add an endpoint to push assessment data to your EHR or other systems.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-compass-600 text-white rounded-lg text-sm font-medium hover:bg-compass-700 transition-colors"
              >
                Add Your First Webhook
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((wh) => {
                const events = typeof wh.events === 'string' ? JSON.parse(wh.events) : wh.events;
                const isDisabled = !!wh.disabledAt;
                const isExpanded = expandedId === wh.id;
                const whDeliveries = deliveries[wh.id] || [];

                return (
                  <div key={wh.id} className={`bg-white rounded-xl border overflow-hidden ${
                    isDisabled ? 'border-red-200' : wh.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
                  }`}>
                    {/* Disabled Banner */}
                    {isDisabled && (
                      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Auto-disabled:</span> {wh.disabledReason}
                        <button
                          onClick={() => handleToggle(wh)}
                          className="ml-auto text-xs bg-red-100 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                        >
                          Re-enable
                        </button>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{wh.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              wh.format === 'fhir_r4' ? 'bg-blue-100 text-blue-700' :
                              wh.format === 'hl7v2' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {FORMATS.find(f => f.value === wh.format)?.label || wh.format}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 font-mono truncate">{wh.url}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(events as string[]).map((evt: string) => (
                              <span key={evt} className="text-xs px-2 py-0.5 bg-compass-50 text-compass-700 rounded border border-compass-200">
                                {evt}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleTest(wh.id)}
                            disabled={testingId === wh.id}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Test fire"
                          >
                            {testingId === wh.id
                              ? <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                              : <TestTube className="w-4 h-4 text-gray-500" />
                            }
                          </button>
                          <button
                            onClick={() => handleToggle(wh)}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title={wh.isActive ? 'Disable' : 'Enable'}
                          >
                            {wh.isActive
                              ? <ToggleRight className="w-4 h-4 text-compass-600" />
                              : <ToggleLeft className="w-4 h-4 text-gray-400" />
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(wh.id)}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Health Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        {wh.lastSuccessAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            Last success: {new Date(wh.lastSuccessAt).toLocaleString()}
                          </span>
                        )}
                        {wh.consecutiveFailures > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <XCircle className="w-3 h-3" />
                            {wh.consecutiveFailures} consecutive failures
                          </span>
                        )}
                        {wh.deliveryCount !== undefined && (
                          <span>{wh.deliveryCount} deliveries</span>
                        )}
                        <button
                          onClick={() => handleExpand(wh.id)}
                          className="ml-auto text-compass-600 hover:text-compass-700 flex items-center gap-1"
                        >
                          {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {isExpanded ? 'Hide log' : 'View log'}
                        </button>
                      </div>

                      {/* Test Result */}
                      {testResult?.webhookId === wh.id && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${
                          testResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                          {testResult.success
                            ? <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {testResult.message}</span>
                            : <span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> {testResult.message}</span>
                          }
                        </div>
                      )}

                      {/* Delivery Log */}
                      {isExpanded && (
                        <div className="mt-4 border-t border-gray-100 pt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Deliveries</h4>
                          {whDeliveries.length === 0 ? (
                            <p className="text-xs text-gray-400">No deliveries yet</p>
                          ) : (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                              {whDeliveries.map((d) => (
                                <div key={d.id} className="flex items-center gap-3 text-xs p-2 bg-gray-50 rounded">
                                  {d.status === 'success'
                                    ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                    : d.status === 'retrying'
                                    ? <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                  }
                                  <span className="text-gray-600">{d.event}</span>
                                  {d.httpStatus && <span className="text-gray-400">HTTP {d.httpStatus}</span>}
                                  {d.latencyMs && <span className="text-gray-400">{d.latencyMs}ms</span>}
                                  <span className="text-gray-400 ml-auto">{new Date(d.createdAt).toLocaleString()}</span>
                                  {d.errorMessage && <span className="text-red-500 truncate max-w-48">{d.errorMessage}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <WebhookModal
            onClose={() => setShowModal(false)}
            onSave={() => { setShowModal(false); loadWebhooks(); }}
          />
        )}
      </CompassAdminShell>
    </>
  );
}
