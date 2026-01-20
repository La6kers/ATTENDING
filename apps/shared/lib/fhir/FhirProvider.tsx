// =============================================================================
// ATTENDING AI - FHIR Provider
// apps/shared/lib/fhir/FhirProvider.tsx
//
// React context provider for FHIR/EHR connection state
// =============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { FhirClient, createFhirClient, createEpicClient, createCernerClient } from './FhirClient';
import { FhirClientConfig, EhrVendor, SmartTokenResponse, SmartLaunchContext } from './types';
import { AttendingPatient, mapFhirPatientToAttending } from './resourceMappers';

// =============================================================================
// Context Types
// =============================================================================

type FhirConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface FhirContextValue {
  client: FhirClient | null;
  status: FhirConnectionStatus;
  error: Error | null;
  patient: AttendingPatient | null;
  patientId: string | null;
  encounterId: string | null;
  launchContext: SmartLaunchContext | null;
  vendor: EhrVendor | null;

  // Actions
  connect: (config: FhirClientConfig) => Promise<void>;
  connectEpic: (baseUrl: string, clientId: string, redirectUri: string) => Promise<void>;
  connectCerner: (baseUrl: string, clientId: string, redirectUri: string) => Promise<void>;
  disconnect: () => void;
  handleAuthCallback: (code: string, state: string) => Promise<SmartTokenResponse>;
  refreshPatient: () => Promise<void>;
  setPatientId: (patientId: string) => void;
  setEncounterId: (encounterId: string) => void;
}

const FhirContext = createContext<FhirContextValue | null>(null);

// =============================================================================
// Provider Props
// =============================================================================

interface FhirProviderProps {
  children: ReactNode;
  autoLoadPatient?: boolean;
  onConnect?: (client: FhirClient) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onPatientChange?: (patient: AttendingPatient | null) => void;
}

// =============================================================================
// State Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  CONFIG: 'attending_fhir_config',
  TOKEN: 'attending_fhir_token',
  STATE: 'attending_fhir_state',
};

// =============================================================================
// Provider Component
// =============================================================================

export function FhirProvider({
  children,
  autoLoadPatient = true,
  onConnect,
  onDisconnect,
  onError,
  onPatientChange,
}: FhirProviderProps): JSX.Element {
  const [client, setClient] = useState<FhirClient | null>(null);
  const [status, setStatus] = useState<FhirConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [patient, setPatient] = useState<AttendingPatient | null>(null);
  const [launchContext, setLaunchContext] = useState<SmartLaunchContext | null>(null);
  const [vendor, setVendor] = useState<EhrVendor | null>(null);

  // ===========================================================================
  // Load Patient
  // ===========================================================================

  const loadPatient = useCallback(async (fhirClient: FhirClient) => {
    const patientId = fhirClient.getPatientId();
    if (!patientId) return;

    try {
      const fhirPatient = await fhirClient.getPatient(patientId);
      const mappedPatient = mapFhirPatientToAttending(fhirPatient);
      setPatient(mappedPatient);
      onPatientChange?.(mappedPatient);
    } catch (err) {
      console.error('[FhirProvider] Failed to load patient:', err);
    }
  }, [onPatientChange]);

  // ===========================================================================
  // Connect
  // ===========================================================================

  const connect = useCallback(async (config: FhirClientConfig) => {
    setStatus('connecting');
    setError(null);

    try {
      const newClient = createFhirClient(config);

      // Get SMART configuration
      const smartConfig = await newClient.getSmartConfiguration();
      (newClient as any).config.smart = smartConfig;

      setClient(newClient);
      setVendor(config.ehr.vendor);

      // Store config for session restoration
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
      }

      // If we have tokens, we're connected
      if (config.accessToken) {
        setStatus('connected');
        onConnect?.(newClient);

        if (autoLoadPatient) {
          await loadPatient(newClient);
        }
      } else {
        // Need to start OAuth flow
        setStatus('disconnected');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed');
      setError(error);
      setStatus('error');
      onError?.(error);
    }
  }, [autoLoadPatient, loadPatient, onConnect, onError]);

  const connectEpic = useCallback(async (baseUrl: string, clientId: string, redirectUri: string) => {
    const epicClient = createEpicClient({ baseUrl, clientId, redirectUri });
    await connect(epicClient.getConfig());
  }, [connect]);

  const connectCerner = useCallback(async (baseUrl: string, clientId: string, redirectUri: string) => {
    const cernerClient = createCernerClient({ baseUrl, clientId, redirectUri });
    await connect(cernerClient.getConfig());
  }, [connect]);

  // ===========================================================================
  // Disconnect
  // ===========================================================================

  const disconnect = useCallback(() => {
    setClient(null);
    setStatus('disconnected');
    setError(null);
    setPatient(null);
    setLaunchContext(null);
    setVendor(null);

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.CONFIG);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.STATE);
    }

    onDisconnect?.();
    onPatientChange?.(null);
  }, [onDisconnect, onPatientChange]);

  // ===========================================================================
  // OAuth Callback Handler
  // ===========================================================================

  const handleAuthCallback = useCallback(async (code: string, state: string): Promise<SmartTokenResponse> => {
    if (!client) throw new Error('Client not initialized');

    // Verify state
    const storedState = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.STATE) : null;
    if (storedState && storedState !== state) {
      throw new Error('State mismatch - possible CSRF attack');
    }

    setStatus('connecting');

    try {
      const tokenResponse = await client.exchangeCodeForToken(code);

      setStatus('connected');
      setLaunchContext({
        patient: tokenResponse.patient,
        encounter: tokenResponse.encounter,
      });

      // Store token
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(tokenResponse));
      }

      onConnect?.(client);

      if (autoLoadPatient && tokenResponse.patient) {
        await loadPatient(client);
      }

      return tokenResponse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Token exchange failed');
      setError(error);
      setStatus('error');
      onError?.(error);
      throw error;
    }
  }, [client, autoLoadPatient, loadPatient, onConnect, onError]);

  // ===========================================================================
  // Refresh Patient
  // ===========================================================================

  const refreshPatient = useCallback(async () => {
    if (client) {
      await loadPatient(client);
    }
  }, [client, loadPatient]);

  // ===========================================================================
  // Set Patient/Encounter ID
  // ===========================================================================

  const setPatientId = useCallback((patientId: string) => {
    if (client) {
      client.setPatientId(patientId);
      if (autoLoadPatient) {
        loadPatient(client);
      }
    }
  }, [client, autoLoadPatient, loadPatient]);

  const setEncounterId = useCallback((encounterId: string) => {
    if (client) {
      client.setEncounterId(encounterId);
    }
  }, [client]);

  // ===========================================================================
  // Get Authorization URL
  // ===========================================================================

  const getAuthorizationUrl = useCallback((launch?: string): string | null => {
    if (!client) return null;

    const state = crypto.randomUUID();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.STATE, state);
    }

    return client.getAuthorizationUrl(state, launch);
  }, [client]);

  // ===========================================================================
  // Context Value
  // ===========================================================================

  const contextValue: FhirContextValue = {
    client,
    status,
    error,
    patient,
    patientId: client?.getPatientId() || null,
    encounterId: client?.getEncounterId() || null,
    launchContext,
    vendor,
    connect,
    connectEpic,
    connectCerner,
    disconnect,
    handleAuthCallback,
    refreshPatient,
    setPatientId,
    setEncounterId,
  };

  return (
    <FhirContext.Provider value={contextValue}>
      {children}
    </FhirContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useFhirContext(): FhirContextValue {
  const context = useContext(FhirContext);
  if (!context) {
    throw new Error('useFhirContext must be used within a FhirProvider');
  }
  return context;
}

// =============================================================================
// Connection Status Component
// =============================================================================

interface FhirConnectionStatusProps {
  showPatient?: boolean;
  className?: string;
}

export function FhirConnectionStatus({ showPatient = true, className = '' }: FhirConnectionStatusProps): JSX.Element {
  const { status, vendor, patient, error } = useFhirContext();

  const statusColors: Record<FhirConnectionStatus, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
  };

  const vendorNames: Record<EhrVendor, string> = {
    epic: 'Epic',
    cerner: 'Oracle Health',
    allscripts: 'Allscripts',
    athenahealth: 'athenahealth',
    meditech: 'MEDITECH',
    generic: 'FHIR Server',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      <span className="text-sm">
        {status === 'connected' && vendor && vendorNames[vendor]}
        {status === 'connecting' && 'Connecting...'}
        {status === 'disconnected' && 'Not connected'}
        {status === 'error' && 'Connection error'}
      </span>
      {showPatient && patient && status === 'connected' && (
        <span className="text-sm text-gray-500">• {patient.fullName}</span>
      )}
      {error && <span className="text-xs text-red-500">{error.message}</span>}
    </div>
  );
}

export { FhirContext };
