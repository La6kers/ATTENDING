// =============================================================================
// ATTENDING AI - EHR Integrations Settings Page
// apps/provider-portal/pages/settings/integrations.tsx
//
// Connect to Epic, Cerner, and other EHR systems via SMART on FHIR
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface FhirStatus {
  connected: boolean;
  vendor?: string;
  patientId?: string;
  encounterId?: string;
  tokenExpired: boolean;
  lastSyncAt?: string;
  availableData: {
    patient: boolean;
    medications: number;
    allergies: number;
    conditions: number;
    labResults: number;
    vitals: number;
    encounters: number;
  };
}

interface EhrProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  sandboxUrl: string;
  docsUrl: string;
}

const ehrProviders: EhrProvider[] = [
  {
    id: 'epic',
    name: 'Epic MyChart',
    logo: '/images/epic-logo.png',
    description: 'Connect to Epic-based health systems including MyChart',
    sandboxUrl: 'https://fhir.epic.com',
    docsUrl: 'https://fhir.epic.com/Documentation',
  },
  {
    id: 'cerner',
    name: 'Oracle Cerner',
    logo: '/images/cerner-logo.png',
    description: 'Connect to Cerner/Oracle Health systems',
    sandboxUrl: 'https://code.cerner.com',
    docsUrl: 'https://fhir.cerner.com/millennium/r4/',
  },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [epicStatus, setEpicStatus] = useState<FhirStatus | null>(null);
  const [cernerStatus, setCernerStatus] = useState<FhirStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for redirect message
  useEffect(() => {
    if (router.query.fhir_connected === 'true') {
      setMessage({ type: 'success', text: `Successfully connected to ${router.query.vendor}!` });
      // Clear query params
      router.replace('/settings/integrations', undefined, { shallow: true });
    }
  }, [router.query]);

  // Fetch connection status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const [epicRes, cernerRes] = await Promise.all([
          fetch('/api/fhir/status?vendor=epic'),
          fetch('/api/fhir/status?vendor=cerner'),
        ]);
        
        if (epicRes.ok) setEpicStatus(await epicRes.json());
        if (cernerRes.ok) setCernerStatus(await cernerRes.json());
      } catch (error) {
        console.error('Failed to fetch FHIR status:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const handleConnect = (vendor: string) => {
    window.location.href = `/api/fhir/launch?vendor=${vendor}`;
  };

  const handleSync = async (vendor: string) => {
    setSyncing(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/fhir/sync/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Synced ${Object.values(result.syncResult.counts).reduce((a: any, b: any) => a + b, 0)} records from ${vendor}` 
        });
        // Refresh status
        const statusRes = await fetch(`/api/fhir/status?vendor=${vendor}`);
        if (statusRes.ok) {
          const newStatus = await statusRes.json();
          if (vendor === 'epic') setEpicStatus(newStatus);
          if (vendor === 'cerner') setCernerStatus(newStatus);
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Sync failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusForVendor = (vendor: string): FhirStatus | null => {
    if (vendor === 'epic') return epicStatus;
    if (vendor === 'cerner') return cernerStatus;
    return null;
  };

  return (
    <>
      <Head>
        <title>EHR Integrations | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">EHR Integrations</h1>
            <p className="mt-2 text-gray-600">
              Connect to your Electronic Health Record system to sync patient data, 
              send orders, and access medical history.
            </p>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
              'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* EHR Providers */}
          <div className="space-y-6">
            {ehrProviders.map((provider) => {
              const status = getStatusForVendor(provider.id);
              
              return (
                <div key={provider.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-400">
                            {provider.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{provider.name}</h3>
                          <p className="text-gray-500 mt-1">{provider.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {status?.connected && !status.tokenExpired ? (
                          <>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Connected
                            </span>
                            <button
                              onClick={() => handleSync(provider.id)}
                              disabled={syncing}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnect(provider.id)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Connection Details */}
                    {status?.connected && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Synced Data</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <DataCard label="Patient" value={status.availableData.patient ? '✓' : '-'} />
                          <DataCard label="Medications" value={status.availableData.medications} />
                          <DataCard label="Allergies" value={status.availableData.allergies} />
                          <DataCard label="Conditions" value={status.availableData.conditions} />
                          <DataCard label="Lab Results" value={status.availableData.labResults} />
                          <DataCard label="Vitals" value={status.availableData.vitals} />
                        </div>
                        
                        {status.lastSyncAt && (
                          <p className="text-sm text-gray-500 mt-4">
                            Last synced: {new Date(status.lastSyncAt).toLocaleString()}
                          </p>
                        )}

                        {status.tokenExpired && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              ⚠️ Your session has expired. Please reconnect to continue syncing.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Links */}
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex gap-4">
                    <a 
                      href={provider.sandboxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Developer Portal →
                    </a>
                    <a 
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Documentation →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Setup Instructions */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h3>
            
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900">For Epic:</h4>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Register at <a href="https://fhir.epic.com" className="text-indigo-600">fhir.epic.com</a></li>
                  <li>Create a new application in App Orchard</li>
                  <li>Add your Client ID to the environment configuration</li>
                  <li>Request sandbox access for testing</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">For Cerner:</h4>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Register at <a href="https://code.cerner.com" className="text-indigo-600">code.cerner.com</a></li>
                  <li>Create a SMART on FHIR application</li>
                  <li>Add your Client ID to the environment configuration</li>
                  <li>Use the provided sandbox for testing</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DataCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
