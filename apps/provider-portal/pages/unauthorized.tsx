// ============================================================
// Unauthorized Page - Provider Portal
// apps/provider-portal/pages/unauthorized.tsx
//
// Shown when a user doesn't have permission to access a resource
// ============================================================

import React from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { ShieldX, ArrowLeft, Home, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <>
      <Head>
        <title>Unauthorized - ATTENDING Provider Portal</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <ShieldX className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Access Denied</h1>
            </div>
            <p className="text-orange-100">
              You don't have permission to access this page
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-700">
                Your current role ({session?.user?.role || 'Unknown'}) does not have 
                access to the requested resource. If you believe this is an error, 
                please contact your administrator.
              </p>
            </div>

            {session?.user && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Signed in as:</p>
                <p className="font-medium text-gray-900">{session.user.name}</p>
                <p className="text-sm text-gray-600">{session.user.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Role: <span className="font-medium">{session.user.role}</span>
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="h-5 w-5" />
                Go to Dashboard
              </Link>
              
              <button
                onClick={() => router.back()}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-5 w-5" />
                Go Back
              </button>

              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="w-full bg-white text-gray-600 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Need different access? Contact your supervisor or IT administrator.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
