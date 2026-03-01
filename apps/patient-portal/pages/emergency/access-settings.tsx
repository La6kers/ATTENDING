// ============================================================
// ATTENDING AI — First Responder Access Settings
// apps/patient-portal/pages/emergency/access-settings.tsx
//
// Configure how first responders can access patient data:
// - PIN code for verification
// - Countdown timer duration
// - Access duration window
// - What data is visible (quick vs full facesheet)
// - Photo capture on access
// - Lock-screen widget
// ============================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Save,
  Shield,
  Lock,
  Clock,
  Eye,
  Camera,
  Smartphone,
  Timer,
  Info,
  AlertTriangle,
  FileText,
  Heart,
  Pill,
  Droplets,
  Activity,
  User,
  CheckCircle2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useEmergencySettings } from '../../hooks/useEmergencySettings';

// ============================================================
// Toggle Row
// ============================================================

function ToggleRow({
  label,
  sublabel,
  enabled,
  onToggle,
  icon: Icon,
}: {
  label: string;
  sublabel: string;
  enabled: boolean;
  onToggle: () => void;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-attending-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-attending-primary" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-attending-deep-navy">{label}</p>
          <p className="text-xs text-attending-200">{sublabel}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-3 ${
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
  );
}

// ============================================================
// Selector Row
// ============================================================

function SelectorRow({
  label,
  sublabel,
  value,
  options,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="py-3">
      <p className="text-sm font-medium text-attending-deep-navy">{label}</p>
      <p className="text-xs text-attending-200 mb-2">{sublabel}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(String(opt.value))}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              String(value) === String(opt.value)
                ? 'bg-attending-primary text-white shadow-teal'
                : 'bg-attending-50 text-attending-200 hover:text-attending-deep-navy'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export default function AccessSettingsPage() {
  const router = useRouter();
  const [showPIN, setShowPIN] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Live data from hook ──
  const {
    accessSettings,
    setAccessSettings,
    saveAccessSettings,
    saving,
    loading,
  } = useEmergencySettings();

  // Local settings mapped from hook
  const [settings, setSettings] = useState({
    enabled: true,
    pin: '2847',
    countdownSeconds: 30,
    accessDurationMinutes: 10,
    requirePhoto: true,
    lockScreenWidget: true,
    notifyOnAccess: true,
    notifyContacts: true,
    showAllergies: true,
    showConditions: true,
    showMedications: true,
    showBloodType: true,
    showEmergencyContacts: true,
    showVitals: true,
    showAdvancedDirective: true,
  });

  // Sync from hook when loaded
  useEffect(() => {
    if (accessSettings) {
      setSettings((prev) => ({
        ...prev,
        enabled: accessSettings.enabled ?? prev.enabled,
        pin: accessSettings.pin ?? prev.pin,
        countdownSeconds: accessSettings.countdownSeconds ?? prev.countdownSeconds,
        accessDurationMinutes: accessSettings.accessDurationMinutes ?? prev.accessDurationMinutes,
        showAllergies: accessSettings.showAllergies ?? prev.showAllergies,
        showConditions: accessSettings.showConditions ?? prev.showConditions,
        showMedications: accessSettings.showMedications ?? prev.showMedications,
        showBloodType: accessSettings.showBloodType ?? prev.showBloodType,
        showEmergencyContacts: accessSettings.showEmergencyContacts ?? prev.showEmergencyContacts,
        showVitals: accessSettings.showVitals ?? prev.showVitals,
      }));
    }
  }, [accessSettings]);

  const update = (key: keyof typeof settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    // Push local state into hook, then save
    setAccessSettings({
      ...accessSettings,
      enabled: settings.enabled,
      pin: settings.pin,
      countdownSeconds: settings.countdownSeconds,
      accessDurationMinutes: settings.accessDurationMinutes,
      requirePhoto: settings.requirePhoto,
      lockScreenWidget: settings.lockScreenWidget,
      notifyOnAccess: settings.notifyOnAccess,
      notifyContacts: settings.notifyContacts,
      showAllergies: settings.showAllergies,
      showConditions: settings.showConditions,
      showMedications: settings.showMedications,
      showBloodType: settings.showBloodType,
      showEmergencyContacts: settings.showEmergencyContacts,
      showVitals: settings.showVitals,
    });
    await saveAccessSettings();
    setSaveSuccess(true);
    setTimeout(() => router.back(), 800);
  };

  return (
    <>
      <Head>
        <title>Access Settings | ATTENDING AI</title>
      </Head>

      <AppShell
        hideNav
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="w-9 h-9 rounded-full bg-attending-50 flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5 text-attending-deep-navy" />
                </button>
                <h1 className="text-lg font-bold text-attending-deep-navy">First Responder Access</h1>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-attending-primary text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto px-5 py-5 space-y-6">
          {/* Master toggle */}
          <div className="card-attending p-4">
            <ToggleRow
              label="Emergency Medical Access"
              sublabel="Allow first responders to view your medical info"
              enabled={settings.enabled}
              onToggle={() => update('enabled', !settings.enabled)}
              icon={Shield}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Info banner */}
              <div className="bg-attending-50 border border-attending-200 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-attending-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs text-attending-deep-navy">
                  <p className="font-semibold mb-1">How it works</p>
                  <p className="text-attending-200">
                    If a severe impact is detected, a countdown begins. If not dismissed, your
                    phone displays a Quick Access screen. First responders enter your PIN to view
                    your full medical facesheet. Every access is logged and you're notified.
                  </p>
                </div>
              </div>

              {/* PIN */}
              <section>
                <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-attending-primary" />
                  Access PIN
                </h3>
                <div className="card-attending p-4">
                  <p className="text-xs text-attending-200 mb-3">
                    First responders enter this PIN to access your full medical record
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type={showPIN ? 'text' : 'password'}
                      value={settings.pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        update('pin', val);
                      }}
                      maxLength={6}
                      className="flex-1 px-4 py-3 bg-attending-50 border-0 rounded-xl text-2xl font-mono text-center tracking-[0.5em] text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                    />
                    <button
                      onClick={() => setShowPIN(!showPIN)}
                      className="w-10 h-10 rounded-lg bg-attending-50 flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 text-attending-primary" />
                    </button>
                  </div>
                  <p className="text-[10px] text-attending-200 mt-2">4–6 digit PIN · displayed on Quick Access screen to verified responders</p>
                </div>
              </section>

              {/* Timing */}
              <section>
                <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
                  <Timer className="w-4 h-4 text-attending-primary" />
                  Timing
                </h3>
                <div className="card-attending p-4 space-y-1 divide-y divide-attending-50">
                  <SelectorRow
                    label="Countdown Duration"
                    sublabel="Time to cancel before emergency mode activates"
                    value={settings.countdownSeconds}
                    options={[
                      { label: '15 sec', value: 15 },
                      { label: '30 sec', value: 30 },
                      { label: '45 sec', value: 45 },
                      { label: '60 sec', value: 60 },
                    ]}
                    onChange={(v) => update('countdownSeconds', parseInt(v))}
                  />
                  <SelectorRow
                    label="Access Duration"
                    sublabel="How long a responder can view your info after PIN entry"
                    value={settings.accessDurationMinutes}
                    options={[
                      { label: '5 min', value: 5 },
                      { label: '10 min', value: 10 },
                      { label: '15 min', value: 15 },
                      { label: '30 min', value: 30 },
                    ]}
                    onChange={(v) => update('accessDurationMinutes', parseInt(v))}
                  />
                </div>
              </section>

              {/* Security */}
              <section>
                <h3 className="text-sm font-semibold text-attending-deep-navy mb-3">Security</h3>
                <div className="card-attending px-4 divide-y divide-attending-50">
                  <ToggleRow
                    label="Capture Photo on Access"
                    sublabel="Front camera takes a photo when facesheet is viewed"
                    enabled={settings.requirePhoto}
                    onToggle={() => update('requirePhoto', !settings.requirePhoto)}
                    icon={Camera}
                  />
                  <ToggleRow
                    label="Lock Screen Widget"
                    sublabel="Show emergency access on lock screen"
                    enabled={settings.lockScreenWidget}
                    onToggle={() => update('lockScreenWidget', !settings.lockScreenWidget)}
                    icon={Smartphone}
                  />
                  <ToggleRow
                    label="Notify Me on Access"
                    sublabel="Push notification when your info is accessed"
                    enabled={settings.notifyOnAccess}
                    onToggle={() => update('notifyOnAccess', !settings.notifyOnAccess)}
                  />
                  <ToggleRow
                    label="Notify Emergency Contacts"
                    sublabel="SMS your contacts when emergency mode activates"
                    enabled={settings.notifyContacts}
                    onToggle={() => update('notifyContacts', !settings.notifyContacts)}
                  />
                </div>
              </section>

              {/* Visible Data */}
              <section>
                <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-attending-primary" />
                  Visible to Responders
                </h3>
                <div className="card-attending px-4 divide-y divide-attending-50">
                  {[
                    { key: 'showAllergies' as const, label: 'Allergies', icon: AlertTriangle },
                    { key: 'showConditions' as const, label: 'Medical Conditions', icon: Heart },
                    { key: 'showMedications' as const, label: 'Medications', icon: Pill },
                    { key: 'showBloodType' as const, label: 'Blood Type', icon: Droplets },
                    { key: 'showVitals' as const, label: 'Recent Vitals', icon: Activity },
                    { key: 'showEmergencyContacts' as const, label: 'Emergency Contacts', icon: User },
                    { key: 'showAdvancedDirective' as const, label: 'Advanced Directive', icon: FileText },
                  ].map((item) => (
                    <ToggleRow
                      key={item.key}
                      label={item.label}
                      sublabel=""
                      enabled={settings[item.key]}
                      onToggle={() => update(item.key, !settings[item.key])}
                      icon={item.icon}
                    />
                  ))}
                </div>

                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Allergies and blood type are always shown on the Quick Access screen (before PIN entry) for patient safety.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </AppShell>
    </>
  );
}
