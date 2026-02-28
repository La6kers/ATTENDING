// ============================================================
// ATTENDING AI — Emergency Tab
// apps/patient-portal/pages/emergency/index.tsx
//
// The patient's emergency hub:
// - 911 quick-dial
// - Medical ID card (always-visible critical info)
// - Emergency contacts
// - Crash detection settings
// - First responder access config
// - Access history
// ============================================================

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Shield,
  Phone,
  AlertTriangle,
  User,
  Car,
  ChevronRight,
  Heart,
  Droplets,
  Pill,
  FileText,
  Clock,
  Eye,
  Lock,
  Loader2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useEmergencySettings } from '../../hooks/useEmergencySettings';
import { usePatientData } from '../../hooks/usePatientData';

// ============================================================
// Medical ID Card
// ============================================================

function MedicalIDCard({ health }: { health: any }) {
  const allergies = health?.allergies ?? [{ allergen: 'Penicillin' }, { allergen: 'Sulfa drugs' }];
  const conditions = health?.conditions ?? [{ name: 'Hypertension' }, { name: 'Pre-diabetes' }];
  const medications = health?.medications ?? [{ name: 'Lisinopril 10mg' }, { name: 'Metformin 500mg' }];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0C4C5E 0%, #1A8FA8 60%, #25B8A9 100%)',
      }}
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-sm tracking-wide">MEDICAL ID</span>
        </div>
        <span className="text-white/60 text-[10px] font-mono">ATTENDING AI</span>
      </div>

      <div className="px-5 pb-4">
        <h2 className="text-white text-2xl font-bold">Scott Isbell</h2>
        <p className="text-white/70 text-sm mt-0.5">DOB: 1986-05-15 · Male · 39 yr</p>
      </div>

      <div className="bg-white/10 backdrop-blur mx-3 rounded-xl p-4 mb-3 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets className="w-3 h-3 text-red-300" />
            <span className="text-[10px] text-white/60 font-semibold uppercase">Blood Type</span>
          </div>
          <p className="text-white font-bold text-lg">O+</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3 text-yellow-300" />
            <span className="text-[10px] text-white/60 font-semibold uppercase">Allergies</span>
          </div>
          <p className="text-white font-bold text-sm">{allergies[0]?.allergen ?? allergies[0]?.name ?? 'None'}</p>
          {allergies[1] && <p className="text-white/70 text-xs">{allergies[1]?.allergen ?? allergies[1]?.name}</p>}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Heart className="w-3 h-3 text-pink-300" />
            <span className="text-[10px] text-white/60 font-semibold uppercase">Conditions</span>
          </div>
          <p className="text-white font-bold text-sm">{conditions[0]?.name ?? 'None'}</p>
          {conditions[1] && <p className="text-white/70 text-xs">{conditions[1]?.name}</p>}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Pill className="w-3 h-3 text-green-300" />
            <span className="text-[10px] text-white/60 font-semibold uppercase">Medications</span>
          </div>
          <p className="text-white font-bold text-sm">{medications[0]?.name ?? 'None'}</p>
          {medications[1] && <p className="text-white/70 text-xs">{medications[1]?.name}</p>}
        </div>
      </div>

      <div className="px-5 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-white/50" />
          <span className="text-white/50 text-xs">No advanced directive on file</span>
        </div>
        <Link
          href="/emergency/medical-id"
          className="text-white/70 text-xs font-medium underline underline-offset-2 hover:text-white"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Emergency Contacts
// ============================================================

function EmergencyContacts({ contactsData }: { contactsData: any[] | null }) {
  const contacts = (contactsData ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    relationship: c.relationship,
    phone: c.phone,
    isPrimary: c.isPrimary ?? false,
  }));
  if (contacts.length === 0) {
    contacts.push(
      { id: '1', name: 'Kelli Isbell', relationship: 'Spouse', phone: '(555) 123-4567', isPrimary: true },
      { id: '2', name: 'Ken Isbell', relationship: 'Father', phone: '(555) 987-6543', isPrimary: false },
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-attending-deep-navy">Emergency Contacts</h3>
        <Link href="/emergency/contacts" className="text-xs text-attending-primary font-medium">
          Edit
        </Link>
      </div>
      <div className="card-attending divide-y divide-attending-50">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-attending-50 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-attending-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-attending-deep-navy">{c.name}</p>
                {c.isPrimary && (
                  <span className="text-[10px] font-semibold bg-attending-50 text-attending-primary px-2 py-0.5 rounded-full">
                    Primary
                  </span>
                )}
              </div>
              <p className="text-xs text-attending-200">{c.relationship} · {c.phone}</p>
            </div>
            <a
              href={`tel:${c.phone.replace(/\D/g, '')}`}
              className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0"
            >
              <Phone className="w-4 h-4 text-green-600" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Crash Detection
// ============================================================

function CrashDetection() {
  const [enabled, setEnabled] = useState(true);

  return (
    <section>
      <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
        <Car className="w-4 h-4 text-attending-coral" />
        Crash Detection
      </h3>

      <div className="card-attending overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-attending-deep-navy">Impact Detection</p>
            <p className="text-xs text-attending-200 mt-0.5">
              Accelerometer monitors for severe impacts
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              enabled ? 'bg-attending-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div className="border-t border-attending-50 px-4 py-3 space-y-2">
            {[
              { label: 'Auto-dial 911 after countdown', on: true },
              { label: 'Alert sound to help locate you', on: true },
              { label: 'Notify emergency contacts via SMS', on: true },
              { label: 'Share GPS with first responders', on: true },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-1">
                <span className="text-xs text-attending-deep-navy">{s.label}</span>
                <div
                  className={`w-9 h-5 rounded-full relative ${s.on ? 'bg-attending-primary' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      s.on ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/emergency/crash-settings"
          className="block border-t border-attending-50 px-4 py-3 text-xs text-attending-primary font-medium hover:bg-surface-hover transition-colors"
        >
          Advanced Settings →
        </Link>
      </div>
    </section>
  );
}

// ============================================================
// Settings Links
// ============================================================

function SettingsLinks() {
  const links = [
    { href: '/emergency/access-settings', icon: Lock, label: 'First Responder Access', sub: 'PIN, countdown, access duration' },
    { href: '/emergency/history', icon: Eye, label: 'Access History', sub: 'View who accessed your info' },
    { href: '/emergency/medical-id', icon: FileText, label: 'Edit Medical ID', sub: 'Conditions, allergies, medications' },
    { href: '/emergency/directive', icon: Heart, label: 'Advanced Directive', sub: 'DNR, living will, healthcare proxy' },
  ];

  return (
    <section>
      <h3 className="text-sm font-semibold text-attending-deep-navy mb-3">Settings</h3>
      <div className="card-attending divide-y divide-attending-50">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-attending-50 flex items-center justify-center flex-shrink-0">
              <link.icon className="w-4 h-4 text-attending-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-attending-deep-navy">{link.label}</p>
              <p className="text-xs text-attending-200">{link.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-attending-200 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Main
// ============================================================

export default function EmergencyPage() {
  const { contacts, crashSettings, loading } = useEmergencySettings();
  const { health } = usePatientData();

  return (
    <>
      <Head>
        <title>Emergency | ATTENDING AI</title>
      </Head>

      <AppShell
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 pt-5 pb-4">
              <h1 className="text-xl font-bold text-attending-deep-navy flex items-center gap-2">
                <Shield className="w-6 h-6 text-attending-primary" />
                Emergency
              </h1>
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto px-5 py-5 space-y-6">
          {/* 911 Button */}
          <a
            href="tel:911"
            className="block w-full py-4 bg-red-600 text-white text-center rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition-colors"
            style={{ boxShadow: '0 0 0 0 rgba(220,38,38,0.4)' }}
          >
            <Phone className="w-5 h-5 inline-block mr-2 -mt-0.5" />
            Call 911
          </a>

          <MedicalIDCard health={health} />
          <EmergencyContacts contactsData={contacts} />
          <CrashDetection />
          <SettingsLinks />
        </div>
      </AppShell>
    </>
  );
}
