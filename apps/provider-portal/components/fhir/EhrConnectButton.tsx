// =============================================================================
// ATTENDING AI — EHR Connect Button
// apps/provider-portal/components/fhir/EhrConnectButton.tsx
//
// Header-level button for connecting / disconnecting Epic (or Cerner).
// Shows a live status indicator and vendor name when connected.
//
// Usage in ProviderShell:
//   <ProviderShell headerRight={<EhrConnectButton />}>
//
// On connect: redirects to /api/fhir/auth/initiate?vendor=epic
// On disconnect: calls POST /api/fhir/auth/disconnect, reloads context
// =============================================================================

import React, { useEffect, useCallback } from 'react';
import { useFhirContext } from '@attending/shared/lib/fhir/FhirProvider';
import { useFhirConnection } from '@attending/shared/lib/fhir/hooks';
import { createFhirClient } from '@attending/shared/lib/fhir/FhirClient';
import type { EhrVendor } from '@attending/shared/lib/fhir/types';

// ---------------------------------------------------------------------------
// Vendor meta
// ---------------------------------------------------------------------------

const VENDOR_META: Record<EhrVendor, { name: string; color: string }> = {
  epic: { name: 'Epic', color: '#D41F2C' },
  cerner: { name: 'Oracle Health', color: '#C74634' },
  allscripts: { name: 'Allscripts', color: '#2563eb' },
  athenahealth: { name: 'athenahealth', color: '#059669' },
  meditech: { name: 'MEDITECH', color: '#7c3aed' },
  generic: { name: 'FHIR Server', color: '#6b7280' },
};

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-400 animate-pulse',
    disconnected: 'bg-gray-300',
    error: 'bg-red-500',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-300'}`} />
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface EhrConnectButtonProps {
  /** Vendor to connect to — defaults to 'epic' */
  vendor?: EhrVendor;
  /** Page to return to after auth — defaults to current path */
  returnTo?: string;
  /** Called when successfully connected (after page-load restore) */
  onConnected?: () => void;
}

export const EhrConnectButton: React.FC<EhrConnectButtonProps> = ({
  vendor = 'epic',
  returnTo,
  onConnected,
}) => {
  const { status, error } = useFhirConnection();
  const { connect, disconnect, vendor: connectedVendor } = useFhirContext();

  // ---------------------------------------------------------------------------
  // On mount: check server-side cookie for an existing token and restore it
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'disconnected') return;

    (async () => {
      try {
        const res = await fetch('/api/fhir/auth/token');
        const info = await res.json();
        if (info.connected && info.accessToken) {
          await connect({
            ehr: {
              vendor: info.vendor as EhrVendor,
              baseUrl: info.baseUrl,
              clientId: info.clientId,
              redirectUri: `${window.location.origin}/api/fhir/auth/callback`,
              scopes: (info.scope || '').split(' ').filter(Boolean),
            },
            accessToken: info.accessToken,
            patientId: info.patientId || undefined,
            encounterId: info.encounterId || undefined,
          });
          onConnected?.();
        }
      } catch {
        // Non-fatal — portal works without EHR
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------
  const handleDisconnect = useCallback(async () => {
    try {
      await fetch('/api/fhir/auth/disconnect', { method: 'POST' });
    } catch { /* ignore */ }
    disconnect();
  }, [disconnect]);

  // ---------------------------------------------------------------------------
  // Connect — redirect to initiate route (full-page redirect through OAuth)
  // ---------------------------------------------------------------------------
  const handleConnect = useCallback(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const params = new URLSearchParams({
      vendor,
      returnTo: returnTo || currentPath,
    });
    window.location.href = `/api/fhir/auth/initiate?${params.toString()}`;
  }, [vendor, returnTo]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (status === 'connected' && connectedVendor) {
    const meta = VENDOR_META[connectedVendor] || VENDOR_META.generic;
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
          style={{
            background: `${meta.color}10`,
            borderColor: `${meta.color}30`,
            color: meta.color,
          }}
          title={`Connected to ${meta.name}`}
        >
          <StatusDot status="connected" />
          <span className="hidden sm:inline">{meta.name}</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Disconnect from EHR"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-600">
        <StatusDot status="connecting" />
        <span className="hidden sm:inline">Connecting…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
        title={error?.message}
      >
        <StatusDot status="error" />
        <span className="hidden sm:inline">EHR Error — Retry</span>
      </button>
    );
  }

  // Disconnected — show "Connect Epic" button
  const meta = VENDOR_META[vendor] || VENDOR_META.epic;
  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-colors"
      title={`Connect to ${meta.name} EHR`}
    >
      <StatusDot status="disconnected" />
      <span className="hidden sm:inline">Connect {meta.name}</span>
    </button>
  );
};

export default EhrConnectButton;
