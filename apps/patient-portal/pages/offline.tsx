// ============================================================
// COMPASS Patient Portal - Offline Fallback Page
// apps/patient-portal/pages/offline.tsx
//
// Shown when the user is offline and the requested page
// isn't in the service worker cache.
// ============================================================

import Head from 'next/head';

export default function OfflinePage() {
  return (
    <>
      <Head>
        <title>COMPASS - Offline</title>
      </Head>
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Offline icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12v.01M8.464 8.464l7.072 7.072"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white">You&apos;re Offline</h1>

          <p className="text-slate-400 text-base leading-relaxed">
            COMPASS needs an internet connection to complete your assessment.
            Your progress has been saved and will sync when you reconnect.
          </p>

          {/* Emergency notice */}
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
            <p className="text-red-300 text-sm font-medium">
              🚨 If this is a medical emergency, call{' '}
              <a href="tel:911" className="underline font-bold text-red-200">
                911
              </a>{' '}
              immediately.
            </p>
          </div>

          {/* Retry button */}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>

          <p className="text-slate-500 text-xs">
            Your data is stored securely on this device.
          </p>
        </div>
      </div>
    </>
  );
}
