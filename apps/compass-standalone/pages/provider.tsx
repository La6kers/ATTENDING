// ============================================================
// COMPASS Standalone — Provider Pre-Visit Summary Page
// Dark branded theme matching COMPASS product
// ============================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Stethoscope, AlertTriangle, ArrowLeft } from 'lucide-react';
import { decodeAssessment, type SharedAssessment } from '../lib/assessmentShare';
import { ProviderPreVisit } from '../components/ProviderPreVisit';

export default function ProviderPage() {
  const router = useRouter();
  const [assessment, setAssessment] = useState<SharedAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssessment = async () => {
      const hash = window.location.hash;
      if (!hash || !hash.includes('data=')) {
        setError('No assessment data found. Please use a valid COMPASS share link.');
        setLoading(false);
        return;
      }
      const encoded = hash.split('data=')[1];
      if (!encoded) { setError('Invalid share link format.'); setLoading(false); return; }
      const decoded = await decodeAssessment(encoded);
      if (!decoded) {
        setError('Failed to decode assessment data. The link may be corrupted or tampered with.');
        setLoading(false);
        return;
      }
      setAssessment(decoded);
      setLoading(false);
    };
    loadAssessment();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-attending-deep-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-attending-light-teal/30 border-t-attending-light-teal rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/50">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <>
        <Head><title>COMPASS Provider Review</title></Head>
        <div className="min-h-screen bg-attending-deep-navy flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Unable to Load Assessment</h1>
            <p className="text-white/50 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-attending-primary text-white rounded-xl font-semibold hover:shadow-teal transition-all"
            >
              Go to COMPASS Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Provider Review — {assessment.patientName || 'COMPASS'}</title>
        <meta name="theme-color" content="#0C3547" />
      </Head>

      <div className="min-h-screen bg-attending-deep-navy">
        {/* Top bar */}
        <header className="bg-[#0A2D3D] border-b border-white/10 print:hidden">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-attending-light-teal" />
              <span className="font-bold text-white">COMPASS</span>
              <span className="text-white/30">|</span>
              <span className="text-sm text-white/50">Provider Review</span>
            </div>
          </div>
        </header>

        <ProviderPreVisit
          assessment={assessment}
          onPrint={() => window.print()}
          onNewAssessment={() => router.push('/assess')}
        />
      </div>
    </>
  );
}
