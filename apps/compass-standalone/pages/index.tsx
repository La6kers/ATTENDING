// ============================================================
// COMPASS Standalone — Landing Page
// Dark branded theme matching ATTENDING COMPASS design
// ============================================================

import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Stethoscope, FileText, Activity, Shield, Clock, ArrowRight,
  MessageCircle, Sparkles, Heart, AlertTriangle,
} from 'lucide-react';

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
    <div className="flex items-start gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
      <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm text-white">{title}</h3>
        <p className="text-xs text-white/60 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>COMPASS | Clinical Assessment</title>
        <meta name="description" content="AI-powered clinical assessment — HPI generation and differential diagnosis" />
        <meta name="theme-color" content="#0C3547" />
      </Head>

      <div className="min-h-screen bg-attending-deep-navy flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/10">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-attending-gradient rounded-xl flex items-center justify-center shadow-teal">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">COMPASS</h1>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Clinical Assessment System</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 bg-white/10 rounded-full">
              <Shield className="w-3.5 h-3.5 text-attending-light-teal" />
              <span className="text-[10px] text-white/70 font-semibold">Secure</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
            {/* Hero */}
            <div className="text-center">
              <div className="w-20 h-20 bg-attending-gradient rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-teal-lg">
                <Stethoscope className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Clinical Assessment
              </h2>
              <p className="text-white/60 max-w-md mx-auto">
                Answer a few questions about your symptoms. COMPASS will generate a structured
                HPI and suggest possible diagnoses.
              </p>
            </div>

            {/* Time badge */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-attending-light-teal bg-white/10 rounded-full py-2 px-4">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Under 5 minutes</span>
              </div>
            </div>

            {/* What you'll get */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">What you'll receive</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <FileText className="w-6 h-6 text-attending-light-teal mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-white">HPI Narrative</h4>
                  <p className="text-[11px] text-white/50 mt-1">Structured OLDCARTS clinical narrative</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <Activity className="w-6 h-6 text-attending-gold mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-white">Differential Dx</h4>
                  <p className="text-[11px] text-white/50 mt-1">Ranked diagnoses with confidence scores</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <FeatureCard
                icon={<MessageCircle className="w-5 h-5 text-attending-light-teal" />}
                title="Simple Chat Format"
                description="No forms — just answer questions like you're texting"
              />
              <FeatureCard
                icon={<Sparkles className="w-5 h-5 text-attending-gold" />}
                title="AI-Powered Analysis"
                description="Intelligent symptom analysis with red flag detection"
              />
              <FeatureCard
                icon={<Heart className="w-5 h-5 text-attending-coral" />}
                title="Clinical Decision Support"
                description="Evidence-based differential diagnoses with workup recommendations"
              />
            </div>

            {/* Emergency warning */}
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-300 text-sm">Medical Emergency?</p>
                  <p className="text-sm text-red-300/70">
                    Call <strong className="text-red-200">911</strong> or go to your nearest ER immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => router.push('/assess')}
              className="w-full py-4 bg-attending-primary text-white rounded-xl font-semibold text-lg shadow-teal hover:shadow-teal-lg hover:bg-attending-400 transition-all flex items-center justify-center gap-2"
            >
              Start Assessment
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-center text-[11px] text-white/30">
              No account required. Your data is not stored.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-white/30">
            COMPASS by ATTENDING AI | For clinical decision support only — not a substitute for professional medical advice
          </p>
        </footer>
      </div>
    </>
  );
}
