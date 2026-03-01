// ============================================================
// ATTENDING AI — Profile Tab
// apps/patient-portal/pages/profile/index.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  User,
  Settings,
  Bell,
  Lock,
  Shield,
  HelpCircle,
  FileText,
  ChevronRight,
  LogOut,
  Smartphone,
  Globe,
  Moon,
  Heart,
  Share2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { usePatientData } from '../../hooks/usePatientData';

// ============================================================
// Profile Header
// ============================================================

function ProfileHeader({ profile }: { profile: any }) {
  const name = profile?.fullName ?? `${profile?.firstName ?? 'Scott'} ${profile?.lastName ?? 'Isbell'}`;
  const email = profile?.email ?? 'scott.isbell@email.com';
  const patientId = profile?.mrn ?? 'ATT-2024-0892';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 p-5">
      <div className="w-16 h-16 rounded-full bg-attending-gradient flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-xl">{initials}</span>
      </div>
      <div className="flex-1">
        <h2 className="text-lg font-bold text-attending-deep-navy">{name}</h2>
        <p className="text-sm text-attending-200">{email}</p>
        <p className="text-xs text-attending-200 mt-0.5">Patient ID: {patientId}</p>
      </div>
      <Link
        href="/profile/edit"
        className="px-3 py-1.5 bg-attending-50 text-attending-primary text-xs font-semibold rounded-lg hover:bg-attending-100 transition-colors"
      >
        Edit
      </Link>
    </div>
  );
}

// ============================================================
// Settings Group
// ============================================================

interface SettingItem {
  href: string;
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  badge?: string;
  danger?: boolean;
}

function SettingsGroup({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <section>
      {title && (
        <h3 className="text-xs font-semibold text-attending-200 uppercase tracking-wider mb-2 px-1">
          {title}
        </h3>
      )}
      <div className="card-attending divide-y divide-attending-50">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                item.danger ? 'bg-red-50' : 'bg-attending-50'
              }`}
            >
              <item.icon className={`w-4 h-4 ${item.danger ? 'text-red-500' : 'text-attending-primary'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.danger ? 'text-red-600' : 'text-attending-deep-navy'}`}>
                {item.label}
              </p>
              {item.sublabel && <p className="text-xs text-attending-200">{item.sublabel}</p>}
            </div>
            {item.badge && (
              <span className="text-[10px] font-semibold bg-attending-coral text-white px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
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

export default function ProfilePage() {
  const { profile } = usePatientData();

  return (
    <>
      <Head>
        <title>Profile | ATTENDING AI</title>
      </Head>

      <AppShell
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto">
              <ProfileHeader profile={profile} />
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto px-5 py-5 space-y-6">
          <SettingsGroup
            title="Health"
            items={[
              { href: '/emergency/medical-id', icon: Heart, label: 'Medical ID', sublabel: 'Allergies, conditions, blood type' },
              { href: '/health', icon: FileText, label: 'Health Records', sublabel: 'Labs, medications, vitals' },
              { href: '/profile/insurance', icon: Shield, label: 'Insurance', sublabel: 'Blue Cross Blue Shield' },
              { href: '/profile/pharmacy', icon: Globe, label: 'Preferred Pharmacy', sublabel: 'Walgreens — Parker, CO' },
            ]}
          />

          <SettingsGroup
            title="Notifications"
            items={[
              { href: '/profile/notifications', icon: Bell, label: 'Notification Preferences', sublabel: 'Push, email, SMS' },
              { href: '/profile/reminders', icon: Smartphone, label: 'Medication Reminders', sublabel: 'Daily at 8:00 AM' },
            ]}
          />

          <SettingsGroup
            title="Privacy & Security"
            items={[
              { href: '/profile/security', icon: Lock, label: 'Security', sublabel: 'Password, biometrics, 2FA' },
              { href: '/profile/data-sharing', icon: Share2, label: 'Data Sharing', sublabel: 'Control who sees your info' },
              { href: '/profile/consent', icon: FileText, label: 'Consent Management', sublabel: 'Review signed consents' },
            ]}
          />

          <SettingsGroup
            title="App"
            items={[
              { href: '/profile/appearance', icon: Moon, label: 'Appearance', sublabel: 'Light mode' },
              { href: '/profile/language', icon: Globe, label: 'Language', sublabel: 'English' },
              { href: '/profile/help', icon: HelpCircle, label: 'Help & Support' },
              { href: '/profile/about', icon: Settings, label: 'About ATTENDING AI', sublabel: 'v1.0.0' },
            ]}
          />

          <SettingsGroup
            title=""
            items={[{ href: '/auth/signout', icon: LogOut, label: 'Sign Out', danger: true }]}
          />

          <p className="text-center text-[10px] text-attending-200 pt-2 pb-4">
            ATTENDING AI · v1.0.0 · Patient App
          </p>
        </div>
      </AppShell>
    </>
  );
}
