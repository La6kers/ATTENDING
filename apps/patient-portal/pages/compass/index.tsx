// =============================================================================
// COMPASS - Standalone Pre-Visit Assessment
// apps/patient-portal/pages/compass/index.tsx
//
// Landing page for standalone pre-visit assessment
// Patients access via link in appointment reminder (SMS/email)
// URL format: /compass?token=ABC123 or /compass?demo=true
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Stethoscope,
  Shield,
  Clock,
  ArrowRight,
  MessageCircle,
  Heart,
  AlertTriangle,
  User,
} from 'lucide-react';

// =============================================================================
// Feature Card
// =============================================================================

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3 p-4 bg-white/60 backdrop-blur rounded-xl border border-white/80">
    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

// =============================================================================
// Main Component
// =============================================================================

export default function CompassLanding() {
  const router = useRouter();
  const { code, token, demo } = router.query;
  
  const [step, setStep] = useState<'landing' | 'verify'>('landing');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointmentInfo, setAppointmentInfo] = useState<{
    patientName?: string;
    appointmentDate?: string;
    providerName?: string;
    clinicName?: string;
  } | null>(null);

  // If token provided, fetch appointment info
  useEffect(() => {
    if (token && typeof token === 'string') {
      setAppointmentInfo({
        patientName: 'Patient',
        appointmentDate: 'Tomorrow at 9:00 AM',
        providerName: 'Dr. Thomas Reed',
        clinicName: 'Mountain View Family Medicine',
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
        setError('We couldn\'t verify your information. Please check and try again.');
        setLoading(false);
      }
    } catch {
      router.push('/compass/chat?demo=true');
    }
  };

  const handleStartDemo = () => {
    router.push('/compass/chat?demo=true');
  };

  return (
    <>
      <Head>
        <title>COMPASS - Pre-Visit Health Assessment</title>
        <meta name="description" content="Complete your health assessment before your appointment" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#7c3aed" />
        <link rel="icon" href="/compass-icon.png" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  COMPASS
                </span>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pre-Visit Assessment</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
              <Shield className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs text-green-700 font-medium">HIPAA Secure</span>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 pb-20">
          {step === 'landing' ? (
            <div className="space-y-6">
              {/* Appointment Info Card */}
              {appointmentInfo && (
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-xl">
                  <p className="text-purple-200 text-sm mb-1">Your upcoming appointment</p>
                  <p className="text-xl font-bold mb-3">{appointmentInfo.appointmentDate}</p>
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="w-4 h-4 text-purple-200" />
                    <span>{appointmentInfo.providerName}</span>
                  </div>
                  <p className="text-purple-200 text-sm mt-2">{appointmentInfo.clinicName}</p>
                </div>
              )}

              {/* Hero */}
              <div className="text-center pt-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-purple-200">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Complete Your Pre-Visit Assessment
                </h1>
                <p className="text-gray-600">
                  Help your provider prepare by answering a few questions about your health.
                </p>
              </div>

              {/* Time Badge */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-purple-700 bg-purple-100 rounded-full py-2 px-4">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">5-10 minutes</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <FeatureCard
                  icon={<MessageCircle className="w-5 h-5 text-purple-600" />}
                  title="Simple Chat Format"
                  description="No forms - just answer questions like you're texting"
                />
                <FeatureCard
                  icon={<Heart className="w-5 h-5 text-red-500" />}
                  title="Better Care"
                  description="Your doctor will be prepared with your info before you arrive"
                />
                <FeatureCard
                  icon={<Clock className="w-5 h-5 text-blue-500" />}
                  title="Save Time"
                  description="Less paperwork in the waiting room"
                />
              </div>

              {/* Emergency Warning */}
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

              {/* CTA Button */}
              {token || code ? (
                <button
                  onClick={() => setStep('verify')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  Start Assessment
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleStartDemo}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  Try Demo
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}

              <p className="text-center text-xs text-gray-400 pt-2">
                By continuing, you agree to our{' '}
                <a href="#" className="text-purple-600 hover:underline">Terms</a>
                {' & '}
                <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>
              </p>
            </div>
          ) : (
            // Verification Step
            <div className="space-y-6">
              <button
                onClick={() => setStep('landing')}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
              >
                ← Back
              </button>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
                <p className="text-gray-600 text-sm">For your security, please confirm your information</p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                    required
                    autoComplete="family-name"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

              <p className="text-center text-sm text-gray-500">
                Need help? <a href="tel:+13035550100" className="text-purple-600 hover:underline">Call your clinic</a>
              </p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t border-gray-100 py-2">
          <p className="text-center text-xs text-gray-400">
            Powered by <span className="font-semibold text-purple-600">ATTENDING</span> AI
          </p>
        </footer>
      </div>
    </>
  );
}
