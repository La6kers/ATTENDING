// ============================================================
// ATTENDING AI — Patient App Entry Point
// apps/patient-portal/pages/_app.tsx
//
// Initializes:
// - NextAuth SessionProvider
// - ATTENDING teal brand theme
// - PWA service worker registration
// - DM Sans typography
// ============================================================

import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // PWA Service Worker
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service worker registered:', reg.scope);
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version available');
                }
              });
            }
          });
        })
        .catch((err) => console.error('[PWA] Registration failed:', err));

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_ASSESSMENTS') {
          import('../lib/offline/syncManager').then((mod) => {
            mod.syncQueuedData?.().catch(console.error);
          });
        }
      });
    }
  }, []);

  if (!mounted) return null;

  return (
    <SessionProvider session={session}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0C4C5E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ATTENDING" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <title>ATTENDING AI — Patient</title>
      </Head>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
