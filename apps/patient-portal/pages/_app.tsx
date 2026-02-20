// ============================================================
// Patient Portal - App Entry Point
// apps/patient-portal/pages/_app.tsx
//
// Initializes:
// - NextAuth SessionProvider (optional auth for patients)
// - WebSocket for real-time status updates
// - Global styling
// ============================================================

import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import '../styles/globals.css'
import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [mounted, setMounted] = useState(false)
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // ----------------------------------------------------------
  // PWA Service Worker Registration
  // Enables: offline symptom entry, push notifications,
  // background sync for queued assessments, add-to-home-screen.
  // ----------------------------------------------------------
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service worker registered:', registration.scope)

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New version available — could show an update banner
                  console.log('[PWA] New version available')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWA] Service worker registration failed:', error)
        })

      // Listen for sync messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_ASSESSMENTS') {
          // Trigger the syncManager to push queued assessments
          import('../lib/offline/syncManager').then((mod) => {
            mod.syncQueuedData?.().catch(console.error)
          })
        }
      })
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <SessionProvider session={session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="COMPASS" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <title>COMPASS - Patient Health Assessment</title>
      </Head>
      <div className="min-h-screen">
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  )
}
