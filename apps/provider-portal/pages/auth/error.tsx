// ============================================================
// Auth Error Page
// apps/provider-portal/pages/auth/error.tsx
//
// NextAuth redirects here on authentication failures.
// Provides user-friendly messages for each error code
// without exposing internal system details.
// ============================================================

import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  Configuration: {
    title: 'Authentication not configured',
    body: 'The authentication provider is not set up correctly. Please contact your system administrator.',
  },
  AccessDenied: {
    title: 'Access denied',
    body: 'You do not have permission to access the ATTENDING AI Provider Portal. Contact your organization administrator to request access.',
  },
  Verification: {
    title: 'Verification link expired',
    body: 'The sign-in link has expired or has already been used. Please request a new one.',
  },
  OAuthSignin: {
    title: 'Sign-in error',
    body: 'There was a problem connecting to your identity provider. Please try again.',
  },
  OAuthCallback: {
    title: 'Authentication callback error',
    body: 'The authentication response was invalid. Please try signing in again.',
  },
  OAuthCreateAccount: {
    title: 'Account creation error',
    body: 'Unable to create your account. Please contact your system administrator.',
  },
  SessionRequired: {
    title: 'Session required',
    body: 'You must be signed in to access this page.',
  },
  Default: {
    title: 'Authentication error',
    body: 'An unexpected error occurred during sign-in. Please try again or contact support.',
  },
};

export default function AuthErrorPage() {
  const router = useRouter();
  const errorCode = (router.query.error as string) || 'Default';
  const { title, body } = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.Default;

  return (
    <>
      <Head>
        <title>Sign-In Error — ATTENDING AI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{
          background: 'white',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>

          <h1 style={{ margin: '0 0 0.75rem', color: '#991B1B', fontSize: '1.25rem', fontWeight: 700 }}>
            {title}
          </h1>

          <p style={{ color: '#6B7280', marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.9rem' }}>
            {body}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              href="/auth/signin"
              style={{
                display: 'block',
                padding: '0.75rem 1rem',
                background: 'linear-gradient(180deg, #1A8FA8 0%, #0C4C5E 100%)',
                color: 'white',
                borderRadius: '0.625rem',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              Try signing in again
            </Link>

            <a
              href="mailto:support@attendingai.health"
              style={{
                display: 'block',
                padding: '0.75rem 1rem',
                background: '#F3F4F6',
                color: '#374151',
                borderRadius: '0.625rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Contact support
            </a>
          </div>

          {process.env.NODE_ENV === 'development' && errorCode !== 'Default' && (
            <p style={{
              marginTop: '1.25rem',
              background: '#FEF9E7',
              border: '1px solid #F59E0B',
              borderRadius: '0.375rem',
              padding: '0.5rem',
              fontSize: '0.7rem',
              color: '#92400E',
            }}>
              Dev: error code = <code>{errorCode}</code>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
