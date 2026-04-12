// =============================================================================
// ATTENDING AI - Emergency Access Settings Page
// apps/patient-portal/pages/emergency-settings.tsx
//
// Configure crash detection and emergency medical access features
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Phone,
  User,
  Camera,
  Lock,
  Bell,
  Heart,
  Info,
  Car,
  Activity,
  Eye,
  Plus,
  Edit2,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

interface EmergencySettings {
  crashDetectionEnabled: boolean;
  emergencyAccessEnabled: boolean;
  firstResponderPIN: string;
  capturePhoto: boolean;
  countdownSeconds: number;
  notifyContacts: boolean;
  autoCall911: boolean;
  showOnLockScreen: boolean;
  gForceThreshold: number;
}

// =============================================================================
// Main Component
// =============================================================================

export default function EmergencySettingsPage() {
  const [settings, setSettings] = useState<EmergencySettings>({
    crashDetectionEnabled: false,
    emergencyAccessEnabled: true,
    firstResponderPIN: '911911',
    capturePhoto: true,
    countdownSeconds: 30,
    notifyContacts: true,
    autoCall911: false,
    showOnLockScreen: true,
    gForceThreshold: 4.0,
  });

  const [contacts, _setContacts] = useState<EmergencyContact[]>([
    { id: '1', name: 'Rachel Anderson', relationship: 'Fiancée', phone: '(555) 123-4567', isPrimary: true },
    { id: '2', name: 'Michael Anderson', relationship: 'Brother', phone: '(555) 234-5678', isPrimary: false },
  ]);

  const [_showPINModal, setShowPINModal] = useState(false);
  const [_showContactModal, setShowContactModal] = useState(false);
  const [_editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [testMode, setTestMode] = useState(false);

  // Save settings when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('emergency-settings', JSON.stringify(settings));
    }
  }, [settings]);

  const updateSetting = <K extends keyof EmergencySettings>(
    key: K,
    value: EmergencySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTestCrashDetection = () => {
    setTestMode(true);
    // Would trigger the crash detection service here
    setTimeout(() => {
      alert('Test triggered! In production, this would show the emergency countdown screen.');
      setTestMode(false);
    }, 1000);
  };

  return (
    <>
      <Head>
        <title>Emergency Settings | ATTENDING AI</title>
        <meta name="description" content="Configure emergency medical access and crash detection" />
      </Head>

      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0C3547 0%, #0C4C5E 30%, #115E72 100%)' }}>
        {/* Header */}
        <header className="bg-gradient-to-r from-red-600 to-red-700 text-white">
          <div className="max-w-lg mx-auto px-4 py-6">
            <Link href="/profile" className="flex items-center gap-2 text-red-200 mb-4">
              <ArrowLeft size={20} />
              Back to Profile
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Shield size={24} />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Emergency Settings</h1>
                <p className="text-red-200 text-sm">Crash detection & first responder access</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Feature Overview */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
            <h2 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} />
              Emergency Medical Access
            </h2>
            <p className="text-sm text-red-800 mb-3">
              When enabled, first responders can access your critical medical information 
              if you're unconscious or unable to communicate. Your phone can detect severe 
              impacts and automatically display your medical ID.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
                <Car size={12} /> Crash Detection
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
                <Camera size={12} /> Security Photo
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
                <Lock size={12} /> PIN Protected
              </span>
            </div>
          </div>

          {/* Crash Detection */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Car size={18} className="text-red-400" />
                Crash Detection
              </h3>
            </div>
            <div className="divide-y divide-white/10">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">Enable Crash Detection</p>
                  <p className="text-sm text-white/60">Detect severe impacts using phone sensors</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.crashDetectionEnabled}
                    onChange={(e) => updateSetting('crashDetectionEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {settings.crashDetectionEnabled && (
                <>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-white">G-Force Sensitivity</p>
                      <span className="text-sm text-white/60">{settings.gForceThreshold}G</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="0.5"
                      value={settings.gForceThreshold}
                      onChange={(e) => updateSetting('gForceThreshold', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-1">
                      <span>More Sensitive</span>
                      <span>Less Sensitive</span>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">Countdown Timer</p>
                      <p className="text-sm text-white/60">Seconds before emergency activation</p>
                    </div>
                    <select
                      value={settings.countdownSeconds}
                      onChange={(e) => updateSetting('countdownSeconds', parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>
                  </div>

                  <div className="p-4">
                    <button
                      onClick={handleTestCrashDetection}
                      disabled={testMode}
                      className="w-full py-3 bg-red-100 text-red-700 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      {testMode ? (
                        <>
                          <Activity size={16} className="animate-pulse" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Activity size={16} />
                          Test Crash Detection
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Emergency Access Settings */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Heart size={18} className="text-red-400" />
                Emergency Access
              </h3>
            </div>
            <div className="divide-y divide-white/10">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">Enable Emergency Access</p>
                  <p className="text-sm text-white/60">Allow first responders to view your medical info</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emergencyAccessEnabled}
                    onChange={(e) => updateSetting('emergencyAccessEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">First Responder PIN</p>
                  <p className="text-sm text-white/60">PIN required to access your medical info</p>
                </div>
                <button
                  onClick={() => setShowPINModal(true)}
                  className="px-3 py-2 bg-white/10 text-white/80 rounded-lg text-sm font-medium"
                >
                  {settings.firstResponderPIN ? '••••••' : 'Set PIN'}
                </button>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">Capture Photo on Access</p>
                  <p className="text-sm text-white/60">Take photo of person accessing your info</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.capturePhoto}
                    onChange={(e) => updateSetting('capturePhoto', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">Show on Lock Screen</p>
                  <p className="text-sm text-white/60">Display emergency access button when locked</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showOnLockScreen}
                    onChange={(e) => updateSetting('showOnLockScreen', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bell size={18} className="text-red-400" />
                Emergency Notifications
              </h3>
            </div>
            <div className="divide-y divide-white/10">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">Notify Emergency Contacts</p>
                  <p className="text-sm text-white/60">Send SMS when emergency mode activates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyContacts}
                    onChange={(e) => updateSetting('notifyContacts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">Auto-Call 911</p>
                  <p className="text-sm text-white/60">Automatically call emergency services</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoCall911}
                    onChange={(e) => updateSetting('autoCall911', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Emergency Contacts */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Phone size={18} className="text-red-400" />
                Emergency Contacts
              </h3>
              <button
                onClick={() => {
                  setEditingContact(null);
                  setShowContactModal(true);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="divide-y divide-white/10">
              {contacts.map((contact) => (
                <div key={contact.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <User size={20} className="text-white/40" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {contact.name}
                      {contact.isPrimary && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                          PRIMARY
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-white/60">{contact.relationship} • {contact.phone}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingContact(contact);
                      setShowContactModal(true);
                    }}
                    className="p-2 text-white/40 hover:text-white/60"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Preview / Test */}
          <section className="space-y-3">
            <Link href="/emergency-access">
              <button className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                <Eye size={20} />
                Preview Emergency Medical ID
              </button>
            </Link>
            <p className="text-center text-sm text-white/60">
              See how first responders will view your medical information
            </p>
          </section>

          {/* Info Footer */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Info size={16} />
              How It Works
            </h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>If a crash is detected, your phone shows a countdown screen</li>
              <li>If you don't cancel, your medical ID becomes accessible</li>
              <li>First responders enter the universal PIN (911911) to view your info</li>
              <li>A photo is captured for security and logged with timestamp</li>
              <li>Your emergency contacts are notified automatically</li>
            </ol>
          </div>
        </main>
      </div>
    </>
  );
}
