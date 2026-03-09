import '../styles/globals.css';
import '@attending/shared/styles/breakpoints.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { AppProps } from 'next/app';
import { SessionProvider, useSession } from 'next-auth/react';
import { NotificationProvider } from '../lib/api/NotificationContext';
import { ToastProvider } from '../components/shared';
import { useAuthTokenBridge } from '../lib/api/useAuthTokenBridge';
import { FhirProvider } from '@attending/shared/lib/fhir/FhirProvider';

/**
 * Inner app wrapper that has access to the NextAuth session context.
 *
 * Layer order (outside-in):
 *   FhirProvider        — FHIR/EHR connection state + SMART auth lifecycle.
 *                         autoLoadPatient=false: providers don't have a global
 *                         patient context; individual pages load their own patient.
 *   NotificationProvider — SignalR real-time clinical alerts.
 *   Component            — the active page.
 *
 * Tokens flow:
 *   useAuthTokenBridge syncs the NextAuth session token to both
 *   backendClient (HTTP) and notificationClient (SignalR) on every
 *   session change, so every downstream call is always authenticated.
 */
function AppInner({ Component, pageProps }: { Component: AppProps['Component']; pageProps: any }) {
  const { data: session } = useSession();

  // Sync NextAuth token → .NET API client & SignalR
  // Verified: useAuthTokenBridge calls notificationClient.setAccessToken(token)
  // and notificationClient.connect() when authenticated. The NotificationProvider
  // below also receives accessToken for its own configure() call. Both paths
  // ensure the SignalR client has the current JWT. (See issue #18)
  useAuthTokenBridge();

  const accessToken = (session as any)?.accessToken;

  return (
    <ToastProvider>
      <FhirProvider
        autoLoadPatient={false}
        onError={(err) => {
          // Non-fatal — EHR connection failure should not crash the portal.
          // The portal functions without EHR data; FHIR enrichment is additive.
          console.warn('[FhirProvider] EHR connection error (non-fatal):', err.message);
        }}
      >
        <NotificationProvider
          accessToken={accessToken}
          autoConnect={!!session?.user}
        >
          <Component {...pageProps} />
        </NotificationProvider>
      </FhirProvider>
    </ToastProvider>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <AppInner Component={Component} pageProps={pageProps} />
    </SessionProvider>
  );
}
