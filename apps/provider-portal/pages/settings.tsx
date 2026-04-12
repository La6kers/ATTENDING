// =============================================================================
// Settings Page
// apps/provider-portal/pages/settings.tsx
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ProviderShell } from '@/components/layout/ProviderShell';
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Monitor,
  Keyboard,
  Volume2,
  Moon,
  Sun,
  Check,
  Smartphone,
  Mail,
  MessageSquare,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Key,
  LogOut,
} from 'lucide-react';

// Settings sections
type SettingsSection = 'notifications' | 'appearance' | 'security' | 'shortcuts' | 'audio';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: React.ElementType;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('notifications');
  const [darkMode, setDarkMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'critical', label: 'Critical Alerts', description: 'Immediate notification for red flags and emergencies', enabled: true, icon: AlertTriangle },
    { id: 'new-assessment', label: 'New Assessments', description: 'When a patient completes a COMPASS assessment', enabled: true, icon: MessageSquare },
    { id: 'lab-results', label: 'Lab Results', description: 'When lab results are ready for review', enabled: true, icon: Clock },
    { id: 'messages', label: 'Patient Messages', description: 'New messages from patients', enabled: true, icon: Mail },
    { id: 'email-digest', label: 'Daily Email Digest', description: 'Summary of daily activity sent each morning', enabled: false, icon: Mail },
    { id: 'sms', label: 'SMS Notifications', description: 'Text messages for urgent alerts', enabled: false, icon: Smartphone },
  ]);

  const toggleNotification = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, enabled: !n.enabled } : n
    ));
  };

  const sections = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'audio', label: 'Audio & Alerts', icon: Volume2 },
  ];

  const shortcuts = [
    { keys: ['Ctrl', 'K'], action: 'Open search' },
    { keys: ['Ctrl', 'N'], action: 'New assessment' },
    { keys: ['Ctrl', 'L'], action: 'Go to Labs' },
    { keys: ['Ctrl', 'I'], action: 'Go to Imaging' },
    { keys: ['Ctrl', 'M'], action: 'Go to Medications' },
    { keys: ['Ctrl', 'R'], action: 'Go to Referrals' },
    { keys: ['Shift', '?'], action: 'Show shortcuts help' },
    { keys: ['Esc'], action: 'Close modal / Cancel' },
  ];

  return (
    <>
      <Head>
        <title>Settings | ATTENDING AI</title>
      </Head>

      <ProviderShell contextBadge="Settings" currentPage="settings">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <nav className="text-sm text-gray-500 mb-2">
              <Link href="/" className="hover:text-teal-600">Dashboard</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900">Settings</span>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-teal-600" />
              Settings
            </h1>
            <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <nav className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id as SettingsSection)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive 
                          ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-600' 
                          : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                
                {/* Notifications Section */}
                {activeSection === 'notifications' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                    <div className="space-y-4">
                      {notifications.map((notification) => {
                        const Icon = notification.icon;
                        return (
                          <div
                            key={notification.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                notification.enabled ? 'bg-teal-100' : 'bg-gray-200'
                              }`}>
                                <Icon className={`w-5 h-5 ${notification.enabled ? 'text-teal-600' : 'text-gray-400'}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{notification.label}</p>
                                <p className="text-sm text-gray-500">{notification.description}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleNotification(notification.id)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                notification.enabled ? 'bg-teal-600' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  notification.enabled ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Appearance Section */}
                {activeSection === 'appearance' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Appearance</h2>
                    <div className="space-y-6">
                      {/* Theme */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            {darkMode ? <Moon className="w-5 h-5 text-teal-600" /> : <Sun className="w-5 h-5 text-teal-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Dark Mode</p>
                            <p className="text-sm text-gray-500">Use dark theme for the interface</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setDarkMode(!darkMode)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            darkMode ? 'bg-teal-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              darkMode ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Compact Mode */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Compact Mode</p>
                            <p className="text-sm text-gray-500">Reduce spacing for more content on screen</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setCompactMode(!compactMode)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            compactMode ? 'bg-teal-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              compactMode ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Color Theme Preview */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900 mb-4">Color Theme</p>
                        <div className="flex gap-3">
                          {['teal', 'blue', 'green', 'indigo'].map((color) => (
                            <button
                              key={color}
                              className={`w-10 h-10 rounded-full bg-${color}-600 ring-2 ring-offset-2 ${
                                color === 'teal' ? 'ring-teal-600' : 'ring-transparent'
                              }`}
                              title={color}
                            >
                              {color === 'teal' && <Check className="w-5 h-5 text-white mx-auto" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Section */}
                {activeSection === 'security' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                    <div className="space-y-6">
                      {/* Change Password */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <Lock className="w-5 h-5 text-teal-600" />
                          <h3 className="font-medium text-gray-900">Change Password</h3>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Current Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">New Password</label>
                            <input
                              type="password"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              placeholder="••••••••"
                            />
                          </div>
                          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                            Update Password
                          </button>
                        </div>
                      </div>

                      {/* Two-Factor Authentication */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Key className="w-5 h-5 text-teal-600" />
                            <div>
                              <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                              <p className="text-sm text-gray-500">Add an extra layer of security</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                            Enabled
                          </span>
                        </div>
                      </div>

                      {/* Active Sessions */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-teal-600" />
                            <h3 className="font-medium text-gray-900">Active Sessions</h3>
                          </div>
                          <button className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                            <LogOut className="w-4 h-4" />
                            Sign out all
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">Chrome on Windows</p>
                              <p className="text-sm text-gray-500">Current session • Santa Clara, CA</p>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Keyboard Shortcuts Section */}
                {activeSection === 'shortcuts' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Keyboard Shortcuts</h2>
                    <div className="grid gap-3">
                      {shortcuts.map((shortcut, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">{shortcut.action}</span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, keyIndex) => (
                              <React.Fragment key={keyIndex}>
                                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-sm font-mono text-gray-600 shadow-sm">
                                  {key}
                                </kbd>
                                {keyIndex < shortcut.keys.length - 1 && (
                                  <span className="text-gray-400 mx-1">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audio Section */}
                {activeSection === 'audio' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Audio & Alert Settings</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Volume2 className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Audio Alerts</p>
                            <p className="text-sm text-gray-500">Play sound for critical notifications</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setAudioAlerts(!audioAlerts)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            audioAlerts ? 'bg-teal-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              audioAlerts ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900 mb-3">Alert Sound</p>
                        <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                          <option>Default Alert</option>
                          <option>Urgent Chime</option>
                          <option>Soft Bell</option>
                          <option>Clinical Alert</option>
                        </select>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900 mb-3">Volume</p>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          defaultValue="70"
                          className="w-full accent-teal-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </ProviderShell>
    </>
  );
}
