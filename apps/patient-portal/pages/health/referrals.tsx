// ============================================================
// ATTENDING AI — Patient Referral Tracking Page
// apps/patient-portal/pages/health/referrals.tsx
//
// Package-tracking style view of all patient referrals:
// - Real-time status updates
// - Specialist contact info
// - Insurance/prior auth status
// - Appeal flow for denied referrals
// ============================================================

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { ReferralTracker } from '../../components/referrals';

export default function ReferralsPage() {
  return (
    <>
      <Head>
        <title>My Referrals | ATTENDING AI</title>
        <meta name="description" content="Track your specialist referrals, see appointment details, and get contact information" />
      </Head>
      <AppShell>
        <div className="px-4 pt-4 pb-24">
          {/* Page header */}
          <div className="flex items-center gap-3 mb-5">
            <Link
              href="/health"
              className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">My Referrals</h1>
              <p className="text-xs text-gray-500">Track your specialist visits</p>
            </div>
          </div>

          <ReferralTracker />
        </div>
      </AppShell>
    </>
  );
}
