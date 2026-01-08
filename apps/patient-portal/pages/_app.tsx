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
import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [mounted, setMounted] = useState(false)
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <SessionProvider session={session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#8b5cf6" />
        <title>COMPASS - Patient Health Assessment</title>
      </Head>
      <div className="min-h-screen bg-background">
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  )
}
