// =============================================================================
// ATTENDING AI - EHR Connection Settings Page
// apps/provider-portal/pages/settings/ehr-connection.tsx
//
// UI for connecting to Epic, Cerner, and other EHR systems via FHIR
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface VendorStatus {
  available: boolean;
  configured: boolean;
  connected: boolean;
  expiresAt?: string;
  patientId?: string;
  needsRefresh: boolean;
  sandboxUrl?: string;
  registrationUrl?: string;
  configErrors?: string[];
}

interface FhirStatus {
  fhirEnabled: boolean;
  vendors: {
    epic: VendorStatus;
    cerner: VendorStatus;
  };
  configuredVendors: string[];
}

export default function EhrConnectionPage() {
  const router = useRouter();
  const [status, setStatus] = useState<FhirStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingVendor, setConnectingVendor] = useState<string | null>(null);

  // Check for connection result from callback
  useEffect(() => {
    const { connected, vendor, error: queryError, message } = router.query;
    
    if (connected === 'true') {
      // Show success message
      alert(`Successfully connected to ${vendor}!`);
      router.replace('/settings/ehr-connection', undefined, { shallow: true });
    }
    
    if (queryError) {
      setError(`${queryError}: ${message || 'Unknown error'}`);
      router.replace('/settings/ehr-connection', undefined, { shallow: true });
    }
  }, [router.query]);

  // Fetch FHIR status
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/fhir/status');
      if (!response.ok) throw new Error('Failed to fetch FHIR status');
      const data = await response.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (vendor: string) => {
    setConnectingVendor(vendor);
    window.location.href = `/api/fhir/auth/authorize?vendor=${vendor}`;
  };

  const handleDisconnect = async (vendor: string) => {
    if (!confirm(`Are you sure you want to disconnect from ${vendor}?`)) return;
    
    try {
      await fetch(`/api/fhir/disconnect?vendor=${vendor}`, { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>EHR Connection Settings | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">EHR Connection Settings</h1>
            <p className="mt-2 text-gray-600">
              Connect ATTENDING AI to your Electronic Health Record system to sync patient data.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {!status?.fhirEnabled && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                FHIR integration is currently disabled. Set <code>FHIR_ENABLED=true</code> in your environment.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Epic Card */}
            <VendorCard
              name="Epic"
              logo="/images/epic-logo.png"
              description="Connect to Epic MyChart and Epic-based health systems"
              status={status?.vendors.epic}
              onConnect={() => handleConnect('epic')}
              onDisconnect={() => handleDisconnect('epic')}
              connecting={connectingVendor === 'epic'}
            />

            {/* Cerner Card */}
            <VendorCard
              name="Cerner"
              logo="/images/cerner-logo.png"
              description="Connect to Cerner PowerChart and Oracle Health systems"
              status={status?.vendors.cerner}
              onConnect={() => handleConnect('cerner')}
              onDisconnect={() => handleDisconnect('cerner')}
              connecting={connectingVendor === 'cerner'}
            />
          </div>

          {/* Setup Instructions */}
          <div className="mt-12 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Instructions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900">Epic Integration</h3>
                <ol className="mt-2 list-decimal list-inside text-gray-600 space-y-2">
                  <li>Register your app at <a href="https://fhir.epic.com/Developer/Apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Epic App Orchard</a></li>
                  <li>Copy your Client ID to <code className="bg-gray-100 px-1 rounded">EPIC_CLIENT_ID</code> in .env.local</li>
                  <li>Set redirect URI to: <code className="bg-gray-100 px-1 rounded">http://localhost:3000/api/fhir/auth/callback</code></li>
                  <li>Request access to the Epic sandbox for testing</li>
                  <li>Click "Connect to Epic" above to authorize</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Cerner Integration</h3>
                <ol className="mt-2 list-decimal list-inside text-gray-600 space-y-2">
                  <li>Register at <a href="https://code.cerner.com/developer/smart-on-fhir" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Cerner Code Console</a></li>
                  <li>Copy your Client ID to <code className="bg-gray-100 px-1 rounded">CERNER_CLIENT_ID</code> in .env.local</li>
                  <li>Configure the same redirect URI</li>
                  <li>Click "Connect to Cerner" above to authorize</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Data Sync Info */}
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">What data is synced?</h3>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-blue-800">
              <li>✓ Patient demographics</li>
              <li>✓ Medications</li>
              <li>✓ Allergies</li>
              <li>✓ Conditions/Diagnoses</li>
              <li>✓ Lab results</li>
              <li>✓ Vital signs</li>
              <li>✓ Encounters/Visits</li>
              <li>✓ Diagnostic reports</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// Vendor Card Component
// =============================================================================

interface VendorCardProps {
  name: string;
  logo: string;
  description: string;
  status?: VendorStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
}

function VendorCard({ name, logo, description, status, onConnect, onDisconnect, connecting }: VendorCardProps) {
  const isConfigured = status?.available || status?.configured;
  const isConnected = status?.connected;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-400">{name[0]}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <p className="text-gray-600">{description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isConnected ? (
            <>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Connected
              </span>
              <button
                onClick={onDisconnect}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Disconnect
              </button>
            </>
          ) : isConfigured ? (
            <button
              onClick={onConnect}
              disabled={connecting}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? 'Connecting...' : `Connect to ${name}`}
            </button>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
              Not Configured
            </span>
          )}
        </div>
      </div>

      {/* Configuration Errors */}
      {status?.configErrors && status.configErrors.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm font-medium text-yellow-800">Configuration needed:</p>
          <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
            {status.configErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Connection Details */}
      {isConnected && status?.expiresAt && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Token expires:</span>
            <span className="text-gray-700">{new Date(status.expiresAt).toLocaleString()}</span>
          </div>
          {status.patientId && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-500">Patient context:</span>
              <span className="text-gray-700">{status.patientId}</span>
            </div>
          )}
          {status.needsRefresh && (
            <p className="mt-2 text-sm text-yellow-600">⚠️ Token needs refresh</p>
          )}
        </div>
      )}

      {/* Registration Link */}
      {!isConfigured && status?.registrationUrl && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <a
            href={status.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Register for {name} Developer Account →
          </a>
        </div>
      )}
    </div>
  );
}
