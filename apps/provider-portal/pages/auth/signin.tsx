// ============================================================
// Sign-In Page — Provider Portal
// apps/provider-portal/pages/auth/signin.tsx
//
// Dev: email-only credentials form, lists seeded users
// Prod: "Sign in with your organization" → Azure AD B2C redirect
// ============================================================

import React, { useState } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { GetServerSidePropsContext } from 'next';
import Head from 'next/head';

interface Props {
  useAzureB2C: boolean;
  isDev: boolean;
  callbackUrl: string;
}

export default function SignInPage({ useAzureB2C, isDev, callbackUrl }: Props) {
  const [email, setEmail]       = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Dev credentials login ────────────────────────────────
  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }

    setLoading(true);
    setError(null);

    const result = await signIn('dev-credentials', {
      email: email.trim(),
      redirect: false,
    });

    if (result?.ok) {
      window.location.href = callbackUrl || '/dashboard';
    } else {
      setError(result?.error === 'CredentialsSignin'
        ? 'No active user found with that email. Check the seeded accounts below.'
        : result?.error ?? 'Sign-in failed');
      setLoading(false);
    }
  };

  // ── Azure AD B2C redirect ─────────────────────────────────
  const handleB2CLogin = () => {
    setLoading(true);
    signIn('azure-ad-b2c-azure-b2c-default', { callbackUrl: callbackUrl || '/dashboard' });
  };

  return (
    <>
      <Head>
        <title>Sign In — ATTENDING AI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: "'DM Sans', 'Source Sans 3', system-ui, sans-serif",
      }}>
        <div style={{
          background: 'white',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}>
          {/* Logo / header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>🏥</div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0C4C5E' }}>
              ATTENDING AI
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.875rem' }}>
              Provider Portal
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '0.5rem', padding: '0.75rem 1rem',
              marginBottom: '1.25rem', color: '#991B1B', fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          {/* ── Production: Azure AD B2C ── */}
          {useAzureB2C && (
            <div>
              <p style={{ textAlign: 'center', color: '#374151', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                Sign in with your organization credentials.
              </p>
              <button
                onClick={handleB2CLogin}
                disabled={isLoading}
                style={{
                  width: '100%', padding: '0.875rem 1rem',
                  background: isLoading ? '#9CA3AF' : 'linear-gradient(180deg, #1A8FA8 0%, #0C4C5E 100%)',
                  color: 'white', border: 'none', borderRadius: '0.625rem',
                  fontSize: '1rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                {isLoading ? 'Redirecting…' : 'Sign in with your organization'}
              </button>
              <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.7rem', marginTop: '1.5rem' }}>
                Powered by Azure Active Directory B2C
              </p>
            </div>
          )}

          {/* ── Development: email form ── */}
          {!useAzureB2C && isDev && (
            <div>
              <div style={{
                background: '#FEF9E7', border: '1px solid #F59E0B',
                borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
                marginBottom: '1.25rem', fontSize: '0.75rem', color: '#92400E',
              }}>
                ⚙️ Development mode — no password required
              </div>

              <form onSubmit={handleDevLogin}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                  Provider email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="scott.isbell@attending.ai"
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                    border: '1.5px solid #D1D5DB', fontSize: '0.9rem',
                    marginBottom: '1rem', outline: 'none', boxSizing: 'border-box',
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  style={{
                    width: '100%', padding: '0.875rem',
                    background: (isLoading || !email.trim()) ? '#9CA3AF'
                      : 'linear-gradient(180deg, #1A8FA8 0%, #0C4C5E 100%)',
                    color: 'white', border: 'none', borderRadius: '0.625rem',
                    fontSize: '1rem', fontWeight: 600,
                    cursor: (isLoading || !email.trim()) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {/* Quick-select seeded users */}
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.5rem', textAlign: 'center' }}>
                  Seeded accounts
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[
                    { label: 'Dr. Scott Isbell (Provider)', email: 'scott.isbell@attending.ai' },
                    { label: 'Nurse (Nurse)', email: 'nurse@attending.ai' },
                    { label: 'Admin', email: 'admin@attending.ai' },
                  ].map(u => (
                    <button
                      key={u.email}
                      onClick={() => setEmail(u.email)}
                      style={{
                        background: '#F9FAFB', border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem', padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem', color: '#4B5563', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {u.label} — <span style={{ color: '#1A8FA8' }}>{u.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Configuration error state */}
          {!useAzureB2C && !isDev && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', color: '#991B1B',
            }}>
              <strong>Authentication not configured.</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
                Set AZURE_AD_B2C_TENANT, AZURE_AD_B2C_CLIENT_ID, and
                AZURE_AD_B2C_CLIENT_SECRET environment variables.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── SSR: pass config state to the page ──────────────────────
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const callbackUrl = (context.query?.callbackUrl as string) || '/dashboard';

  return {
    props: {
      useAzureB2C: !!(
        process.env.AZURE_AD_B2C_TENANT &&
        process.env.AZURE_AD_B2C_CLIENT_ID &&
        process.env.AZURE_AD_B2C_CLIENT_SECRET
      ),
      isDev: process.env.NODE_ENV === 'development',
      callbackUrl,
    },
  };
}
