// ============================================================
// ATTENDING AI — Crash Detection Advanced Settings
// apps/patient-portal/pages/emergency/crash-settings.tsx
//
// Advanced configuration for impact detection:
// - G-force threshold with presets
// - Sensitivity calibration
// - Activity-aware detection
// - Countdown audio/haptic settings
// - Rural area / extended response mode
// ============================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Save,
  Car,
  Activity,
  Volume2,
  Vibrate,
  Mountain,
  Timer,
  Gauge,
  Info,
  Bike,
  PersonStanding,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useEmergencySettings } from '../../hooks/useEmergencySettings';

// ============================================================
// Threshold Visualization
// ============================================================

function ThresholdVisual({ value, max }: { value: number; max: number }) {
  const pct = (value / max) * 100;
  const zones = [
    { label: 'Walk', end: 15, color: 'bg-green-400' },
    { label: 'Bike fall', end: 30, color: 'bg-yellow-400' },
    { label: 'Car crash', end: 55, color: 'bg-orange-400' },
    { label: 'High-speed', end: 100, color: 'bg-red-400' },
  ];

  return (
    <div className="space-y-2">
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        {zones.map((zone, i) => {
          const prev = i === 0 ? 0 : zones[i - 1].end;
          return (
            <div
              key={zone.label}
              className={`absolute top-0 h-full ${zone.color} opacity-30`}
              style={{ left: `${prev}%`, width: `${zone.end - prev}%` }}
            />
          );
        })}
        <div
          className="absolute top-0 h-full bg-attending-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-attending-primary rounded-full shadow transition-all"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-attending-200">
        {zones.map((z) => (
          <span key={z.label}>{z.label}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export default function CrashSettingsPage() {
  const router = useRouter();
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Live data from hook ──
  const {
    crashSettings: hookCrashSettings,
    setCrashSettings: setHookCrashSettings,
    saveCrashSettings,
    saving,
    loading,
  } = useEmergencySettings();

  const [settings, setSettings] = useState({
    gForceThreshold: 4.0,
    sensitivityPreset: 'standard' as 'low' | 'standard' | 'high' | 'custom',
    activityAware: true,
    ignoreWhileStationary: true,
    countdownSeconds: 30,
    countdownAudio: true,
    countdownHaptic: true,
    alertSiren: true,
    sirenVolumeMax: true,
    extendedResponseMode: false,
    extendedCountdownSeconds: 120,
    drivingMode: true,
    cyclingMode: false,
    hikingMode: false,
  });

  // Sync from hook when loaded
  useEffect(() => {
    if (hookCrashSettings) {
      setSettings((prev) => ({
        ...prev,
        gForceThreshold: hookCrashSettings.gForceThreshold ?? prev.gForceThreshold,
        sensitivityPreset: hookCrashSettings.sensitivityPreset ?? prev.sensitivityPreset,
        activityAware: hookCrashSettings.activityAware ?? prev.activityAware,
        countdownSeconds: hookCrashSettings.countdownSeconds ?? prev.countdownSeconds,
        countdownAudio: hookCrashSettings.countdownAudio ?? prev.countdownAudio,
        countdownHaptic: hookCrashSettings.countdownHaptic ?? prev.countdownHaptic,
        alertSiren: hookCrashSettings.alertSiren ?? prev.alertSiren,
        drivingMode: hookCrashSettings.drivingMode ?? prev.drivingMode,
      }));
    }
  }, [hookCrashSettings]);

  const update = (key: keyof typeof settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const presets = {
    low: { threshold: 6.0, label: 'Low (6G)', desc: 'Only severe impacts — fewer false alarms' },
    standard: { threshold: 4.0, label: 'Standard (4G)', desc: 'Typical car crash detection' },
    high: { threshold: 2.0, label: 'High (2G)', desc: 'More sensitive — bike falls, hard drops' },
  };

  const handlePreset = (preset: 'low' | 'standard' | 'high') => {
    update('sensitivityPreset', preset);
    update('gForceThreshold', presets[preset].threshold);
  };

  const handleSave = async () => {
    setHookCrashSettings({
      ...hookCrashSettings!,
      gForceThreshold: settings.gForceThreshold,
      sensitivityPreset: settings.sensitivityPreset,
      activityAware: settings.activityAware,
      ignoreWhileStationary: settings.ignoreWhileStationary,
      countdownSeconds: settings.countdownSeconds,
      countdownAudio: settings.countdownAudio,
      countdownHaptic: settings.countdownHaptic,
      alertSiren: settings.alertSiren,
      extendedResponseMode: settings.extendedResponseMode,
      extendedCountdownSeconds: settings.extendedCountdownSeconds,
      drivingMode: settings.drivingMode,
      cyclingMode: settings.cyclingMode,
      hikingMode: settings.hikingMode,
    });
    await saveCrashSettings();
    setSaveSuccess(true);
    setTimeout(() => router.back(), 800);
  };

  return (
    <>
      <Head>
        <title>Crash Detection | ATTENDING AI</title>
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
                <h1 className="text-lg font-bold text-attending-deep-navy">Crash Detection</h1>
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
          {/* Sensitivity Presets */}
          <section>
            <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-attending-primary" />
              Sensitivity
            </h3>
            <div className="space-y-2">
              {(Object.keys(presets) as Array<'low' | 'standard' | 'high'>).map((key) => {
                const p = presets[key];
                const isActive = settings.sensitivityPreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => handlePreset(key)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-attending-primary bg-attending-50'
                        : 'border-light bg-white hover:border-attending-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${isActive ? 'text-attending-primary' : 'text-attending-deep-navy'}`}>
                        {p.label}
                      </p>
                      {isActive && (
                        <span className="w-5 h-5 bg-attending-primary rounded-full flex items-center justify-center">
                          <span className="w-2 h-2 bg-white rounded-full" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-attending-200 mt-0.5">{p.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Visual threshold */}
            <div className="card-attending p-4 mt-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-attending-200 font-medium">
                  Threshold: <span className="text-attending-primary font-bold">{settings.gForceThreshold}G</span>
                </p>
              </div>
              <ThresholdVisual value={settings.gForceThreshold} max={8} />
            </div>
          </section>

          {/* Activity Modes */}
          <section>
            <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-attending-primary" />
              Activity Modes
            </h3>
            <div className="card-attending px-4 divide-y divide-attending-50">
              {[
                { key: 'drivingMode' as const, icon: Car, label: 'Driving', sub: 'Standard vehicle crash detection' },
                { key: 'cyclingMode' as const, icon: Bike, label: 'Cycling', sub: 'Adjusted for bicycle impacts' },
                { key: 'hikingMode' as const, icon: Mountain, label: 'Hiking / Outdoors', sub: 'Fall detection on trails' },
              ].map((mode) => (
                <div key={mode.key} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <mode.icon className="w-4 h-4 text-attending-200" />
                    <div>
                      <p className="text-sm text-attending-deep-navy">{mode.label}</p>
                      <p className="text-xs text-attending-200">{mode.sub}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => update(mode.key, !settings[mode.key])}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings[mode.key] ? 'bg-attending-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settings[mode.key] ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <PersonStanding className="w-4 h-4 text-attending-200" />
                  <div>
                    <p className="text-sm text-attending-deep-navy">Ignore while stationary</p>
                    <p className="text-xs text-attending-200">No alerts when not moving</p>
                  </div>
                </div>
                <button
                  onClick={() => update('ignoreWhileStationary', !settings.ignoreWhileStationary)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings.ignoreWhileStationary ? 'bg-attending-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      settings.ignoreWhileStationary ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Countdown Settings */}
          <section>
            <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
              <Timer className="w-4 h-4 text-attending-primary" />
              Countdown
            </h3>
            <div className="card-attending p-4 space-y-4">
              <div>
                <p className="text-xs text-attending-200 mb-2">Countdown duration before emergency activates</p>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => update('countdownSeconds', sec)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        settings.countdownSeconds === sec
                          ? 'bg-attending-primary text-white'
                          : 'bg-attending-50 text-attending-200'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-attending-50">
                {[
                  { key: 'countdownAudio' as const, icon: Volume2, label: 'Countdown audio', sub: 'Beeps during countdown' },
                  { key: 'countdownHaptic' as const, icon: Vibrate, label: 'Haptic vibration', sub: 'Phone vibrates during countdown' },
                  { key: 'alertSiren' as const, icon: Volume2, label: 'Alert siren after countdown', sub: 'Loud sound to help locate you' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5 text-attending-200" />
                      <div>
                        <p className="text-xs text-attending-deep-navy">{item.label}</p>
                        <p className="text-[10px] text-attending-200">{item.sub}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => update(item.key, !settings[item.key])}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        settings[item.key] ? 'bg-attending-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          settings[item.key] ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Rural / Extended Mode */}
          <section>
            <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
              <Mountain className="w-4 h-4 text-attending-primary" />
              Rural / Extended Response
            </h3>
            <div className="card-attending p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-attending-deep-navy">Extended Response Mode</p>
                  <p className="text-xs text-attending-200">
                    For rural areas with longer EMS response times
                  </p>
                </div>
                <button
                  onClick={() => update('extendedResponseMode', !settings.extendedResponseMode)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    settings.extendedResponseMode ? 'bg-attending-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      settings.extendedResponseMode ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {settings.extendedResponseMode && (
                <div className="pt-3 border-t border-attending-50">
                  <p className="text-xs text-attending-200 mb-2">Extended countdown (before 911 auto-dial)</p>
                  <div className="flex gap-2">
                    {[60, 90, 120, 180].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => update('extendedCountdownSeconds', sec)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                          settings.extendedCountdownSeconds === sec
                            ? 'bg-attending-primary text-white'
                            : 'bg-attending-50 text-attending-200'
                        }`}
                      >
                        {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 bg-amber-50 rounded-lg p-3 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800">
                      Extended mode gives you more time to cancel a false alarm but delays emergency response.
                      Only enable if you're in an area with long EMS response times.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 bg-attending-50 rounded-xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-attending-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-attending-deep-navy">
                Crash detection uses your phone's accelerometer and gyroscope to detect sudden
                deceleration patterns consistent with vehicle collisions. It works even when your
                phone is locked and in your pocket.
              </p>
            </div>
          </section>
        </div>
      </AppShell>
    </>
  );
}
