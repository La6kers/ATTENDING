import '../styles/globals.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { AppProps } from 'next/app';
import { SessionProvider, useSession } from 'next-auth/react';
import { NotificationProvider } from '../lib/api/NotificationContext';
import { useAuthTokenBridge } from '../lib/api/useAuthTokenBridge';

/**
 * Inner app wrapper that has access to the NextAuth session context.
 * Bridges auth tokens to the .NET backend API client and SignalR.
 */
function AppInner({ Component, pageProps }: { Component: AppProps['Component']; pageProps: any }) {
  const { data: session } = useSession();
  
  // Sync NextAuth token → .NET API client & SignalR
  useAuthTokenBridge();

  const accessToken = (session as any)?.accessToken;

  return (
    <NotificationProvider
      accessToken={accessToken}
      autoConnect={!!session?.user}
    >
      <Component {...pageProps} />
    </NotificationProvider>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <AppInner Component={Component} pageProps={pageProps} />
    </SessionProvider>
  );
}
