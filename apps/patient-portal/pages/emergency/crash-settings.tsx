// ============================================================
// ATTENDING AI — Crash Detection Settings + Simulation
// apps/patient-portal/pages/emergency/crash-settings.tsx
//
// - Dark navy background for contrast
// - Full settings: sensitivity, activity modes, countdown, audio
// - "Simulate Crash" button triggers realistic countdown
// - Alarm design: starts at 80 BPM beeps, accelerates to 140 BPM,
//   pitch rises, then continuous two-tone siren after countdown
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Save,
  Car,
  Activity,
  Volume2,
  VolumeX,
  Vibrate,
  Mountain,
  Timer,
  Gauge,
  Info,
  Bike,
  PersonStanding,
  AlertTriangle,
  CheckCircle2,
  Play,
  X,
  Shield,
  Phone,
  MapPin,
  Heart,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useEmergencySettings } from '../../hooks/useEmergencySettings';

// ============================================================
// Colors
// ============================================================
const C = {
  navy: '#0C3547',
  headerDark: '#0C4C5E',
  midTeal: '#0F5F76',
  teal: '#1A8FA8',
  lightTeal: '#25B8A9',
  paleMint: '#E6F7F5',
  gold: '#c8a44e',
  coral: '#E87461',
  red: '#DC2626',
  white: '#ffffff',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
};

// ============================================================
// Alarm Sound Engine (Web Audio API)
// ============================================================
class AlarmSoundEngine {
  private ctx: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];
  private sirenInterval: ReturnType<typeof setInterval> | null = null;
  private beepTimeout: ReturnType<typeof setTimeout> | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play a single beep at a given frequency and duration.
   */
  playBeep(frequency: number, durationMs: number = 120, volume: number = 0.3): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Envelope: quick attack, sustain, quick release
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gain.gain.setValueAtTime(volume, ctx.currentTime + durationMs / 1000 - 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationMs / 1000 + 0.01);
    } catch {
      // Audio not available
    }
  }

  /**
   * Countdown beep schedule:
   * - Starts at 80 BPM (750ms interval)
   * - Accelerates to ~140 BPM in final 5 seconds
   * - Pitch rises from 600Hz to 1200Hz
   * - Volume increases from 0.2 to 0.5
   */
  startCountdownBeeps(
    totalSeconds: number,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ): void {
    let remaining = totalSeconds;

    const scheduleNext = () => {
      if (remaining <= 0) {
        onComplete();
        return;
      }

      onTick(remaining);

      // Calculate parameters based on progress
      const progress = 1 - remaining / totalSeconds; // 0 → 1
      const finalPhase = remaining <= 5; // last 5 seconds

      // BPM: 80 → 100 normally, then 100 → 140 in final 5s
      let bpm: number;
      if (finalPhase) {
        const finalProgress = 1 - remaining / 5;
        bpm = 100 + finalProgress * 40; // 100 → 140
      } else {
        bpm = 80 + progress * 20; // 80 → 100
      }
      const intervalMs = (60 / bpm) * 1000;

      // Pitch: 600Hz → 900Hz normally, 900 → 1200Hz in final phase
      let frequency: number;
      if (finalPhase) {
        const finalProgress = 1 - remaining / 5;
        frequency = 900 + finalProgress * 300;
      } else {
        frequency = 600 + progress * 300;
      }

      // Volume: 0.2 → 0.35 normally, 0.35 → 0.5 final
      let volume: number;
      if (finalPhase) {
        const finalProgress = 1 - remaining / 5;
        volume = 0.35 + finalProgress * 0.15;
      } else {
        volume = 0.2 + progress * 0.15;
      }

      // Beep duration: 100ms normally, 80ms fast phase
      const beepDuration = finalPhase ? 80 : 100;

      this.playBeep(frequency, beepDuration, volume);

      remaining--;
      this.beepTimeout = setTimeout(scheduleNext, intervalMs);
    };

    scheduleNext();
  }

  /**
   * Continuous two-tone siren after countdown expires.
   * Alternates between 800Hz and 1000Hz, ~4 cycles/second.
   */
  startSiren(): void {
    let highTone = true;
    this.sirenInterval = setInterval(() => {
      const freq = highTone ? 1000 : 800;
      this.playBeep(freq, 200, 0.5);
      highTone = !highTone;
    }, 250);
  }

  /**
   * Stop everything immediately.
   */
  stopAll(): void {
    if (this.beepTimeout) {
      clearTimeout(this.beepTimeout);
      this.beepTimeout = null;
    }
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    this.activeOscillators.forEach(o => {
      try { o.stop(); } catch {}
    });
    this.activeOscillators = [];
    this.activeGains = [];
  }

  dispose(): void {
    this.stopAll();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}

// ============================================================
// Threshold Visualization (dark themed)
// ============================================================
function ThresholdVisual({ value, max }: { value: number; max: number }) {
  const pct = (value / max) * 100;
  const zones = [
    { label: 'Walk', end: 15, color: '#22c55e' },
    { label: 'Bike fall', end: 30, color: '#eab308' },
    { label: 'Car crash', end: 55, color: '#f97316' },
    { label: 'High-speed', end: 100, color: '#ef4444' },
  ];

  return (
    <div>
      <div style={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' }}>
        {zones.map((zone, i) => {
          const prev = i === 0 ? 0 : zones[i - 1].end;
          return (
            <div
              key={zone.label}
              style={{
                position: 'absolute', top: 0, height: '100%',
                left: `${prev}%`, width: `${zone.end - prev}%`,
                background: zone.color, opacity: 0.2,
              }}
            />
          );
        })}
        <div style={{
          position: 'absolute', top: 0, height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${C.teal}, ${C.lightTeal})`,
          borderRadius: 5, transition: 'width 0.3s ease',
        }} />
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: `calc(${pct}% - 7px)`, width: 14, height: 14,
          background: C.white, borderRadius: '50%', border: `2px solid ${C.teal}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)', transition: 'left 0.3s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {zones.map(z => (
          <span key={z.label} style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{z.label}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Crash Simulation Overlay
// ============================================================
function CrashSimulation({
  countdownSeconds,
  onCancel,
  audioEngine,
}: {
  countdownSeconds: number;
  onCancel: () => void;
  audioEngine: AlarmSoundEngine;
}) {
  const [remaining, setRemaining] = useState(countdownSeconds);
  const [phase, setPhase] = useState<'impact' | 'countdown' | 'siren'>('impact');
  const [sirenActive, setSirenActive] = useState(false);

  // Impact flash → countdown
  useEffect(() => {
    const impactTimer = setTimeout(() => {
      setPhase('countdown');
      audioEngine.startCountdownBeeps(
        countdownSeconds,
        (r) => setRemaining(r),
        () => {
          setPhase('siren');
          setSirenActive(true);
          audioEngine.startSiren();
        }
      );
    }, 800); // 800ms impact flash

    return () => {
      clearTimeout(impactTimer);
      audioEngine.stopAll();
    };
  }, [countdownSeconds, audioEngine]);

  const handleCancel = () => {
    audioEngine.stopAll();
    onCancel();
  };

  const progress = phase === 'countdown' ? remaining / countdownSeconds : phase === 'impact' ? 1 : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: phase === 'impact'
        ? '#DC2626'
        : phase === 'siren'
          ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
          : `linear-gradient(135deg, ${C.navy}, #1a1a2e)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.5s ease',
    }}>
      {/* Impact flash */}
      {phase === 'impact' && (
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle style={{ width: 80, height: 80, color: C.white, marginBottom: 16 }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: C.white }}>IMPACT DETECTED</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
            Analyzing crash severity...
          </div>
        </div>
      )}

      {/* Countdown */}
      {phase === 'countdown' && (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: 360, padding: '0 24px' }}>
          {/* Circular progress */}
          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 24px' }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="88" fill="none"
                stroke={remaining <= 5 ? '#ef4444' : remaining <= 10 ? '#f97316' : C.teal}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={553}
                strokeDashoffset={553 * (1 - progress)}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontSize: 64, fontWeight: 900, color: C.white,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {remaining}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                seconds
              </div>
            </div>
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 8 }}>
            Emergency services will be contacted
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.5 }}>
            If you are OK, press the button below to cancel.
            {remaining <= 10 && (
              <span style={{ display: 'block', color: '#fca5a5', fontWeight: 600, marginTop: 4 }}>
                Hurry — calling 911 in {remaining} seconds
              </span>
            )}
          </div>

          {/* Cancel button */}
          <button
            onClick={handleCancel}
            style={{
              width: '100%', padding: '18px 24px', borderRadius: 16, border: 'none',
              background: C.white, color: C.navy,
              fontSize: 20, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(255,255,255,0.2)',
            }}
          >
            I'M OK — Cancel
          </button>

          {/* Info row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 24, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              <MapPin style={{ width: 12, height: 12 }} /> Location shared
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              <Phone style={{ width: 12, height: 12 }} /> 911 on standby
            </div>
          </div>
        </div>
      )}

      {/* Siren phase */}
      {phase === 'siren' && (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: 360, padding: '0 24px' }}>
          <div style={{
            width: 120, height: 120, margin: '0 auto 24px', borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'siren-pulse 0.5s infinite alternate',
          }}>
            <Phone style={{ width: 48, height: 48, color: C.white }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.white, marginBottom: 8 }}>
            CONTACTING 911
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
            Emergency services are being notified
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>
            Your location and medical information are being shared
          </div>

          <button
            onClick={handleCancel}
            style={{
              width: '100%', padding: '16px 24px', borderRadius: 16,
              border: '2px solid rgba(255,255,255,0.3)', background: 'transparent',
              color: C.white, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Cancel — False Alarm
          </button>

          {/* Simulation badge */}
          <div style={{
            marginTop: 24, padding: '8px 16px', borderRadius: 8,
            background: 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600,
          }}>
            <Info style={{ width: 12, height: 12 }} /> SIMULATION MODE — No real call is being made
          </div>
        </div>
      )}

      <style>{`
        @keyframes siren-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          100% { transform: scale(1.1); box-shadow: 0 0 40px 20px rgba(239, 68, 68, 0.2); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Settings Card (dark themed)
// ============================================================
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(8px)',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.1)',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '14px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  fontWeight: 700,
  color: C.white,
};

const toggleStyle = (active: boolean): React.CSSProperties => ({
  position: 'relative' as const,
  width: 44,
  height: 24,
  borderRadius: 12,
  background: active ? C.teal : 'rgba(255,255,255,0.15)',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.2s ease',
  flexShrink: 0,
});

const toggleKnobStyle = (active: boolean): React.CSSProperties => ({
  position: 'absolute' as const,
  top: 2,
  left: active ? 22 : 2,
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: C.white,
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  transition: 'left 0.2s ease',
});

// ============================================================
// Main Page
// ============================================================
export default function CrashSettingsPage() {
  const router = useRouter();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const audioEngineRef = useRef<AlarmSoundEngine | null>(null);

  // Audio engine lifecycle
  useEffect(() => {
    audioEngineRef.current = new AlarmSoundEngine();
    return () => {
      audioEngineRef.current?.dispose();
    };
  }, []);

  // Hook for persistence
  const {
    crashSettings: hookCrashSettings,
    setCrashSettings: setHookCrashSettings,
    saveCrashSettings,
    saving,
  } = useEmergencySettings();

  const [settings, setSettings] = useState({
    gForceThreshold: 4.0,
    sensitivityPreset: 'standard' as 'low' | 'standard' | 'high',
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

  useEffect(() => {
    if (hookCrashSettings) {
      setSettings(prev => ({
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
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const presets = {
    low: { threshold: 6.0, label: 'Low Sensitivity', gLabel: '6G', desc: 'Only severe impacts — fewer false alarms' },
    standard: { threshold: 4.0, label: 'Standard', gLabel: '4G', desc: 'Typical car crash detection' },
    high: { threshold: 2.0, label: 'High Sensitivity', gLabel: '2G', desc: 'More sensitive — bike falls, hard drops' },
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

  const testBeep = useCallback(() => {
    audioEngineRef.current?.playBeep(800, 150, 0.3);
  }, []);

  return (
    <>
      <Head>
        <title>Crash Detection | ATTENDING AI</title>
      </Head>

      {/* Simulation overlay */}
      {simulating && audioEngineRef.current && (
        <CrashSimulation
          countdownSeconds={settings.countdownSeconds}
          onCancel={() => setSimulating(false)}
          audioEngine={audioEngineRef.current}
        />
      )}

      <AppShell
        hideNav
        header={
          <header style={{
            background: 'rgba(12, 53, 71, 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => router.back()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft style={{ width: 18, height: 18, color: C.white }} />
                </button>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: C.white }}>Crash Detection</h1>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: saveSuccess ? '#22c55e' : C.teal,
                  color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saveSuccess ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
                {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
              </button>
            </div>
          </header>
        }
      >
        <div style={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${C.navy} 0%, ${C.midTeal} 100%)`,
          backgroundAttachment: 'fixed',
        }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 120px' }}>

            {/* ── Simulate Crash Button ── */}
            <div style={{ ...cardStyle, marginBottom: 20, border: '1px solid rgba(220, 38, 38, 0.3)' }}>
              <div style={{
                padding: 20,
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15), rgba(239, 68, 68, 0.08))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(220, 38, 38, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle style={{ width: 18, height: 18, color: '#fca5a5' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>Test Crash Detection</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      Simulates a crash event with full countdown and alarm
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSimulating(true)}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #DC2626, #ef4444)',
                    color: C.white, fontSize: 16, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(220, 38, 38, 0.3)',
                  }}
                >
                  <Play style={{ width: 18, height: 18 }} />
                  Simulate Crash
                </button>
                <div style={{
                  marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  <Info style={{ width: 10, height: 10 }} />
                  No real emergency call will be made
                </div>
              </div>
            </div>

            {/* ── Alarm Behavior Info ── */}
            <div style={{
              ...cardStyle, marginBottom: 20, padding: 16,
              background: 'rgba(26, 143, 168, 0.1)', border: '1px solid rgba(26, 143, 168, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Volume2 style={{ width: 16, height: 16, color: C.teal, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 6 }}>How the Alarm Works</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Countdown phase:</strong> Beeps start at 80 BPM (heartbeat pace) and gradually
                    accelerate to 140 BPM. Pitch and volume rise as time runs out, creating urgency without immediate panic.
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginTop: 6 }}>
                    <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Final 5 seconds:</strong> Rapid beeping with high-pitched tone to signal imminent 911 call.
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginTop: 6 }}>
                    <strong style={{ color: 'rgba(255,255,255,0.8)' }}>After countdown:</strong> Continuous two-tone siren to help first responders locate you.
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sensitivity ── */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={cardHeaderStyle}>
                <Gauge style={{ width: 16, height: 16, color: C.teal }} />
                Sensitivity Preset
              </div>
              <div style={{ padding: '8px 16px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(Object.keys(presets) as Array<'low' | 'standard' | 'high'>).map(key => {
                    const p = presets[key];
                    const active = settings.sensitivityPreset === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handlePreset(key)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                          border: `2px solid ${active ? C.teal : 'rgba(255,255,255,0.1)'}`,
                          background: active ? 'rgba(26, 143, 168, 0.15)' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: active ? C.lightTeal : 'rgba(255,255,255,0.8)' }}>
                            {p.label} <span style={{ fontSize: 12, fontWeight: 800, color: active ? C.teal : C.gray400 }}>({p.gLabel})</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.desc}</div>
                        </div>
                        {active && (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.white }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Threshold visualization */}
                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Threshold</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.teal }}>{settings.gForceThreshold}G</span>
                  </div>
                  <ThresholdVisual value={settings.gForceThreshold} max={8} />
                </div>
              </div>
            </div>

            {/* ── Activity Modes ── */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={cardHeaderStyle}>
                <Activity style={{ width: 16, height: 16, color: C.teal }} />
                Activity Modes
              </div>
              <div style={{ padding: '0 16px' }}>
                {[
                  { key: 'drivingMode' as const, icon: Car, label: 'Driving', sub: 'Standard vehicle crash detection' },
                  { key: 'cyclingMode' as const, icon: Bike, label: 'Cycling', sub: 'Adjusted for bicycle impacts' },
                  { key: 'hikingMode' as const, icon: Mountain, label: 'Hiking / Outdoors', sub: 'Fall detection on trails' },
                  { key: 'ignoreWhileStationary' as const, icon: PersonStanding, label: 'Ignore while stationary', sub: 'No alerts when not moving' },
                ].map((mode, i) => {
                  const Icon = mode.icon;
                  return (
                    <div key={mode.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 0',
                      borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.4)' }} />
                        <div>
                          <div style={{ fontSize: 13, color: C.white }}>{mode.label}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{mode.sub}</div>
                        </div>
                      </div>
                      <button onClick={() => update(mode.key, !settings[mode.key])} style={toggleStyle(settings[mode.key])}>
                        <span style={toggleKnobStyle(settings[mode.key])} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Countdown Settings ── */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={cardHeaderStyle}>
                <Timer style={{ width: 16, height: 16, color: C.teal }} />
                Countdown Duration
              </div>
              <div style={{ padding: '8px 16px 16px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                  Time before emergency services are contacted
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[15, 30, 45, 60].map(sec => (
                    <button
                      key={sec}
                      onClick={() => update('countdownSeconds', sec)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                        background: settings.countdownSeconds === sec ? C.teal : 'rgba(255,255,255,0.08)',
                        color: settings.countdownSeconds === sec ? C.white : 'rgba(255,255,255,0.5)',
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                {/* Audio/haptic toggles */}
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                  {[
                    { key: 'countdownAudio' as const, icon: Volume2, label: 'Countdown beeps', sub: 'Escalating beeps during countdown' },
                    { key: 'countdownHaptic' as const, icon: Vibrate, label: 'Haptic vibration', sub: 'Phone vibrates with each beep' },
                    { key: 'alertSiren' as const, icon: Volume2, label: 'Locator siren', sub: 'Continuous siren after countdown expires' },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 0',
                        borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)' }} />
                          <div>
                            <div style={{ fontSize: 12, color: C.white }}>{item.label}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{item.sub}</div>
                          </div>
                        </div>
                        <button onClick={() => update(item.key, !settings[item.key])} style={toggleStyle(settings[item.key])}>
                          <span style={toggleKnobStyle(settings[item.key])} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Test sound button */}
                <button
                  onClick={testBeep}
                  style={{
                    marginTop: 12, width: '100%', padding: '10px 0', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                    color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Volume2 style={{ width: 14, height: 14 }} />
                  Test Beep Sound
                </button>
              </div>
            </div>

            {/* ── Extended Response (Rural) ── */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={cardHeaderStyle}>
                <Mountain style={{ width: 16, height: 16, color: C.teal }} />
                Rural / Extended Response
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>Extended Response Mode</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Longer countdown for rural areas</div>
                  </div>
                  <button onClick={() => update('extendedResponseMode', !settings.extendedResponseMode)} style={toggleStyle(settings.extendedResponseMode)}>
                    <span style={toggleKnobStyle(settings.extendedResponseMode)} />
                  </button>
                </div>

                {settings.extendedResponseMode && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Extended countdown duration</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[60, 90, 120, 180].map(sec => (
                        <button
                          key={sec}
                          onClick={() => update('extendedCountdownSeconds', sec)}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                            background: settings.extendedCountdownSeconds === sec ? C.teal : 'rgba(255,255,255,0.08)',
                            color: settings.extendedCountdownSeconds === sec ? C.white : 'rgba(255,255,255,0.5)',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                        </button>
                      ))}
                    </div>
                    <div style={{
                      marginTop: 10, padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)',
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                        Extended mode delays emergency response. Only enable if you're in an area with long EMS response times.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Info Footer ── */}
            <div style={{
              padding: '16px 18px', borderRadius: 12,
              background: 'rgba(26, 143, 168, 0.08)', border: '1px solid rgba(26, 143, 168, 0.15)',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <Shield style={{ width: 18, height: 18, color: C.teal, flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Crash detection uses your phone's accelerometer and gyroscope to detect sudden deceleration
                consistent with vehicle collisions. It works even when your phone is locked and in your pocket.
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
