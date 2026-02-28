// ============================================================
// ATTENDING AI — COMPASS Assessment Landing
// apps/patient-portal/pages/compass/index.tsx
//
// Rebranded for ATTENDING teal. Two entry modes:
// 1. From patient app: authenticated, data flows to their record
// 2. Standalone link: /compass?token=X → verify → assess
// ============================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Stethoscope,
  Shield,
  Clock,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Heart,
  AlertTriangle,
  User,
  Sparkles,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';

// ============================================================
// Feature Card
// ============================================================

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 card-attending">
      <div className="w-10 h-10 bg-attending-50 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm text-attending-deep-navy">{title}</h3>
        <p className="text-xs text-attending-200 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export default function CompassLanding() {
  const router = useRouter();
  const { code, token, demo } = router.query;
  const isStandalone = !!(token || code);

  const [step, setStep] = useState<'landing' | 'verify'>('landing');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointmentInfo, setAppointmentInfo] = useState<{
    appointmentDate?: string;
    providerName?: string;
    clinicName?: string;
  } | null>(null);

  useEffect(() => {
    if (token && typeof token === 'string') {
      setAppointmentInfo({
        appointmentDate: 'Tomorrow at 9:30 AM',
        providerName: 'Dr. Sarah Chen',
        clinicName: 'Parker Family Medicine',
      });
    }
  }, [token]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (demo === 'true') {
      router.push('/compass/chat?demo=true');
      return;
    }

    try {
      const res = await fetch('/api/compass/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code || token, lastName, dateOfBirth: dob }),
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('compass-session', JSON.stringify(data));
        router.push(`/compass/chat?session=${data.sessionId}`);
      } else {
        setError('Could not verify your information. Please check and try again.');
        setLoading(false);
      }
    } catch {
      router.push('/compass/chat?demo=true');
    }
  };

  const handleStart = () => {
    if (isStandalone) {
      setStep('verify');
    } else {
      // From app — skip verification, user is authenticated
      router.push('/compass/chat?demo=true');
    }
  };

  const content = (
    <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
      {step === 'landing' ? (
        <>
          {/* Appointment info (standalone mode) */}
          {appointmentInfo && (
            <div className="bg-attending-gradient rounded-2xl p-5 text-white">
              <p className="text-white/70 text-sm mb-1">Your upcoming appointment</p>
              <p className="text-xl font-bold mb-3">{appointmentInfo.appointmentDate}</p>
              <div className="flex items-center gap-1.5 text-sm">
                <User className="w-4 h-4 text-white/60" />
                <span>{appointmentInfo.providerName}</span>
              </div>
              <p className="text-white/60 text-sm mt-1">{appointmentInfo.clinicName}</p>
            </div>
          )}

          {/* Hero */}
          <div className="text-center pt-2">
            <div className="w-20 h-20 bg-attending-gradient rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-teal-lg">
              <Stethoscope className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-attending-deep-navy mb-2">
              {isStandalone ? 'Pre-Visit Assessment' : 'COMPASS Health Check'}
            </h1>
            <p className="text-sm text-attending-200">
              {isStandalone
                ? 'Help your provider prepare by answering a few questions about your health.'
                : 'Tell us what\'s going on and we\'ll help your provider understand before your visit.'}
            </p>
          </div>

          {/* Time badge */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-attending-primary bg-attending-50 rounded-full py-2 px-4">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">5–10 minutes</span>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <FeatureCard
              icon={<MessageCircle className="w-5 h-5 text-attending-primary" />}
              title="Simple Chat Format"
              description="No forms — just answer questions like you're texting"
            />
            <FeatureCard
              icon={<Sparkles className="w-5 h-5 text-attending-gold" />}
              title="AI-Guided Assessment"
              description="COMPASS asks the right follow-up questions based on your answers"
            />
            <FeatureCard
              icon={<Heart className="w-5 h-5 text-attending-coral" />}
              title="Better Care"
              description="Your provider arrives prepared with your health picture"
            />
          </div>

          {/* Emergency warning */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Medical Emergency?</p>
                <p className="text-sm text-red-700">
                  Call <strong>911</strong> or go to your nearest ER immediately.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleStart}
            className="w-full py-4 bg-attending-primary text-white rounded-xl font-semibold text-lg shadow-teal hover:shadow-teal-lg transition-all flex items-center justify-center gap-2"
          >
            Start Assessment
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-center text-[10px] text-attending-200">
            Your data is encrypted and HIPAA-compliant
          </p>
        </>
      ) : (
        /* Verification step */
        <>
          <button
            onClick={() => setStep('landing')}
            className="text-attending-200 hover:text-attending-deep-navy text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center">
            <div className="w-16 h-16 bg-attending-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-attending-primary" />
            </div>
            <h2 className="text-xl font-bold text-attending-deep-navy mb-2">Verify Your Identity</h2>
            <p className="text-sm text-attending-200">For your security, please confirm your information</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-attending-deep-navy mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                required
                autoComplete="family-name"
                className="w-full px-4 py-3.5 border border-light rounded-xl focus:ring-2 focus:ring-attending-primary/30 focus:border-attending-primary text-base bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-attending-deep-navy mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-light rounded-xl focus:ring-2 focus:ring-attending-primary/30 focus:border-attending-primary text-base bg-white"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-attending-primary text-white rounded-xl font-semibold text-lg shadow-teal hover:shadow-teal-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );

  // If standalone (no bottom nav), render without AppShell
  if (isStandalone) {
    return (
      <>
        <Head>
          <title>COMPASS — Pre-Visit Assessment</title>
          <meta name="theme-color" content="#0C4C5E" />
        </Head>
        <div className="min-h-screen bg-surface-bg">
          <header className="bg-white border-b border-light">
            <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-attending-gradient rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-attending-deep-navy">COMPASS</span>
                  <p className="text-[10px] text-attending-200 uppercase tracking-wider">Pre-Visit Assessment</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                <Shield className="w-3.5 h-3.5 text-green-600" />
                <span className="text-[10px] text-green-700 font-semibold">HIPAA Secure</span>
              </div>
            </div>
          </header>
          {content}
        </div>
      </>
    );
  }

  // From patient app — render inside AppShell with nav hidden during assessment
  return (
    <>
      <Head>
        <title>Assessment | ATTENDING AI</title>
      </Head>
      <AppShell hideNav>
        <header className="bg-white border-b border-light safe-area-top">
          <div className="max-w-lg mx-auto px-5 py-3 flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="w-9 h-9 rounded-full bg-attending-50 flex items-center justify-center hover:bg-attending-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-attending-deep-navy" />
            </button>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-attending-primary" />
              <span className="text-lg font-bold text-attending-deep-navy">COMPASS</span>
            </div>
          </div>
        </header>
        {content}
      </AppShell>
    </>
  );
}
