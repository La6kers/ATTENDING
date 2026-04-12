// =============================================================================
// Custom 404 Page
// apps/provider-portal/pages/404.tsx
// =============================================================================

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 – Page Not Found | ATTENDING AI</title>
      </Head>
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <AlertTriangle size={64} style={{ opacity: 0.8, marginBottom: '1.5rem' }} />
        <h1 style={{ fontSize: '5rem', fontWeight: 700, margin: 0, lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 400, marginTop: '0.75rem', opacity: 0.85 }}>
          Page Not Found
        </h2>
        <p style={{ maxWidth: 400, opacity: 0.7, marginTop: '1rem', lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 500,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Home size={16} /> Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    </>
  );
}
