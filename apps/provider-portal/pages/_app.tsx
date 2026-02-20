import '../styles/globals.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';

// NOTE: ServicesProvider removed — no pages currently use it and the heavy
// service-registry initialization chain was crashing the entire application.
// Re-add when individual services are production-ready and needed by pages.
// See: apps/shared/hooks/useServices.tsx

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
