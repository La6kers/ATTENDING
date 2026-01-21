// ============================================================
// Auth Error Page - Provider Portal
// apps/provider-portal/pages/auth/error.tsx
// ============================================================

import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  Configuration: {
    title: 'Configuration Error',
    message: 'There is a problem with the server configuration. Please contact your administrator.',
  },
  AccessDenied: {
    title: 'Access Denied',
    message: 'You do not have permission to sign in to this application.',
  },
  Verification: {
    title: 'Verification Error',
    message: 'The verification link may have expired or has already been used.',
  },
  OAuthSignin: {
    title: 'Sign In Error',
    message: 'There was a problem signing in with your identity provider.',
  },
  OAuthCallback: {
    title: 'Callback Error',
    message: 'There was a problem processing the authentication response.',
  },
  OAuthCreateAccount: {
    title: 'Account Creation Error',
    message: 'There was a problem creating your account.',
  },
  EmailCreateAccount: {
    title: 'Email Error',
    message: 'There was a problem creating your account with this email.',
  },
  Callback: {
    title: 'Callback Error',
    message: 'There was a problem with the authentication callback.',
  },
  OAuthAccountNotLinked: {
    title: 'Account Not Linked',
    message: 'This email is already associated with another account. Please sign in using your original method.',
  },
  EmailSignin: {
    title: 'Email Sign In Error',
    message: 'The email could not be sent. Please try again.',
  },
  CredentialsSignin: {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect.',
  },
  SessionRequired: {
    title: 'Session Required',
    message: 'Please sign in to access this page.',
  },
  SessionExpired: {
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again.',
  },
  Default: {
    title: 'Authentication Error',
    message: 'An unexpected error occurred during authentication.',
  },
};

export default function AuthErrorPage() {
  const router = useRouter();
  const { error } = router.query;
  
  const errorKey = typeof error === 'string' && error in ERROR_MESSAGES ? error : 'Default';
  const { title, message } = ERROR_MESSAGES[errorKey];

  return (
    <>
      <Head>
        <title>Error - ATTENDING Provider Portal</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-orange-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-8 w-8" />
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{message}</p>
            </div>

            {error && (
              <p className="text-xs text-gray-500">
                Error code: <code className="bg-gray-100 px-1 rounded">{error}</code>
              </p>
            )}

            <div className="flex flex-col gap-3">
              <Link
                href="/auth/signin"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Try Again
              </Link>
              
              <button
                onClick={() => router.back()}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-5 w-5" />
                Go Back
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              If this problem persists, please contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
