// ============================================================
// ATTENDING AI - Universal Accessibility System
// apps/shared/components/accessibility/AccessibilityProvider.tsx
//
// Phase 9E: Break down every barrier to healthcare
// Translation, voice-first, offline support, and more
// ============================================================

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Eye,
  Sun,
  Moon,
  Type,
  Wifi,
  WifiOff,
  Settings,
  X,
  Check,
  ChevronDown,
  Accessibility,
  Ear,
  Hand,
  Smartphone,
  Monitor,
  Maximize,
  Contrast,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type FontSize = 'small' | 'medium' | 'large' | 'x-large';
export type ColorScheme = 'light' | 'dark' | 'high-contrast';
export type Language = {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
};

export interface AccessibilitySettings {
  // Language & Translation
  language: string;
  autoTranslate: boolean;
  
  // Vision
  fontSize: FontSize;
  colorScheme: ColorScheme;
  reduceMotion: boolean;
  highContrast: boolean;
  
  // Hearing
  screenReader: boolean;
  closedCaptions: boolean;
  visualAlerts: boolean;
  
  // Motor
  stickyKeys: boolean;
  largeClickTargets: boolean;
  extendedTimeouts: boolean;
  
  // Voice
  voiceInput: boolean;
  voiceOutput: boolean;
  voiceSpeed: number;
  
  // Connectivity
  offlineMode: boolean;
  lowBandwidth: boolean;
  dataUsageLimit?: number;
}

export interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  isOnline: boolean;
  translate: (text: string, targetLang?: string) => Promise<TranslationResult>;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  showSettingsPanel: boolean;
  setShowSettingsPanel: (show: boolean) => void;
}

// ============================================================
// SUPPORTED LANGUAGES
// ============================================================

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl ayisyen' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
];

// ============================================================
// DEFAULT SETTINGS
// ============================================================

const DEFAULT_SETTINGS: AccessibilitySettings = {
  language: 'en',
  autoTranslate: false,
  fontSize: 'medium',
  colorScheme: 'light',
  reduceMotion: false,
  highContrast: false,
  screenReader: false,
  closedCaptions: false,
  visualAlerts: false,
  stickyKeys: false,
  largeClickTargets: false,
  extendedTimeouts: false,
  voiceInput: false,
  voiceOutput: false,
  voiceSpeed: 1,
  offlineMode: false,
  lowBandwidth: false,
};

// ============================================================
// CONTEXT
// ============================================================

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// ============================================================
// MOCK TRANSLATION SERVICE
// ============================================================

const mockTranslate = async (text: string, sourceLang: string, targetLang: string): Promise<TranslationResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In production, this would call a real translation API
  const translations: Record<string, Record<string, string>> = {
    es: {
      'Hello': 'Hola',
      'Welcome': 'Bienvenido',
      'How are you feeling today?': '¿Cómo se siente hoy?',
      'Please describe your symptoms': 'Por favor describa sus síntomas',
      'Emergency': 'Emergencia',
      'Submit': 'Enviar',
      'Cancel': 'Cancelar',
    },
    zh: {
      'Hello': '你好',
      'Welcome': '欢迎',
      'How are you feeling today?': '您今天感觉如何？',
      'Please describe your symptoms': '请描述您的症状',
      'Emergency': '紧急情况',
      'Submit': '提交',
      'Cancel': '取消',
    },
  };

  const translated = translations[targetLang]?.[text] || `[${targetLang}] ${text}`;
  
  return {
    original: text,
    translated,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    confidence: 0.95,
  };
};

// ============================================================
// PROVIDER COMPONENT
// ============================================================

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isOnline, setIsOnline] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    const fontSizes: Record<FontSize, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'x-large': '22px',
    };
    root.style.fontSize = fontSizes[settings.fontSize];
    
    // Color scheme
    root.classList.remove('light', 'dark', 'high-contrast');
    root.classList.add(settings.colorScheme);
    
    // Reduce motion
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // RTL support
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === settings.language);
    root.dir = lang?.rtl ? 'rtl' : 'ltr';
    root.lang = settings.language;
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const translate = useCallback(async (text: string, targetLang?: string): Promise<TranslationResult> => {
    const target = targetLang || settings.language;
    if (target === 'en') {
      return { original: text, translated: text, sourceLanguage: 'en', targetLanguage: 'en', confidence: 1 };
    }
    return mockTranslate(text, 'en', target);
  }, [settings.language]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.voiceSpeed;
      utterance.lang = settings.language;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [settings.voiceSpeed, settings.language]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const startListening = useCallback(() => {
    setIsListening(true);
    // In production, initialize Web Speech API for recognition
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    isOnline,
    translate,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    isListening,
    isSpeaking,
    showSettingsPanel,
    setShowSettingsPanel,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {showSettingsPanel && <AccessibilitySettingsPanel />}
    </AccessibilityContext.Provider>
  );
};

// ============================================================
// SETTINGS PANEL COMPONENT
// ============================================================

const AccessibilitySettingsPanel: React.FC = () => {
  const { settings, updateSettings, setShowSettingsPanel, isOnline } = useAccessibility();
  const [activeSection, setActiveSection] = useState<'language' | 'vision' | 'hearing' | 'motor' | 'voice' | 'connection'>('language');

  const sections = [
    { key: 'language', label: 'Language', icon: Globe },
    { key: 'vision', label: 'Vision', icon: Eye },
    { key: 'hearing', label: 'Hearing', icon: Ear },
    { key: 'motor', label: 'Motor', icon: Hand },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'connection', label: 'Connection', icon: isOnline ? Wifi : WifiOff },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <Accessibility size={24} />
            <h2 className="text-lg font-semibold">Accessibility Settings</h2>
          </div>
          <button
            onClick={() => setShowSettingsPanel(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-slate-200 p-2 bg-slate-50">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.key
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Language Section */}
            {activeSection === 'language' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Preferred Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => updateSettings({ language: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>
                
                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Auto-translate content</p>
                    <p className="text-sm text-slate-500">Automatically translate interface to your language</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoTranslate}
                    onChange={(e) => updateSettings({ autoTranslate: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            )}

            {/* Vision Section */}
            {activeSection === 'vision' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Text Size
                  </label>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large', 'x-large'] as FontSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => updateSettings({ fontSize: size })}
                        className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                          settings.fontSize === size
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span style={{ fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : size === 'large' ? '16px' : '20px' }}>
                          Aa
                        </span>
                        <p className="text-xs mt-1 capitalize">{size.replace('-', ' ')}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color Scheme
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'high-contrast', label: 'High Contrast', icon: Contrast },
                    ].map((scheme) => {
                      const Icon = scheme.icon;
                      return (
                        <button
                          key={scheme.value}
                          onClick={() => updateSettings({ colorScheme: scheme.value as ColorScheme })}
                          className={`flex-1 py-3 px-4 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                            settings.colorScheme === scheme.value
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Icon size={20} />
                          <span className="text-xs">{scheme.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Reduce motion</p>
                    <p className="text-sm text-slate-500">Minimize animations and transitions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reduceMotion}
                    onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            )}

            {/* Hearing Section */}
            {activeSection === 'hearing' && (
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Screen reader optimization</p>
                    <p className="text-sm text-slate-500">Enhanced support for screen readers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.screenReader}
                    onChange={(e) => updateSettings({ screenReader: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Closed captions</p>
                    <p className="text-sm text-slate-500">Show captions for audio content</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.closedCaptions}
                    onChange={(e) => updateSettings({ closedCaptions: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Visual alerts</p>
                    <p className="text-sm text-slate-500">Flash screen for audio notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.visualAlerts}
                    onChange={(e) => updateSettings({ visualAlerts: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            )}

            {/* Motor Section */}
            {activeSection === 'motor' && (
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Large click targets</p>
                    <p className="text-sm text-slate-500">Increase size of buttons and links</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.largeClickTargets}
                    onChange={(e) => updateSettings({ largeClickTargets: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Extended timeouts</p>
                    <p className="text-sm text-slate-500">More time for form submissions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.extendedTimeouts}
                    onChange={(e) => updateSettings({ extendedTimeouts: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Sticky keys</p>
                    <p className="text-sm text-slate-500">Press modifier keys sequentially</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.stickyKeys}
                    onChange={(e) => updateSettings({ stickyKeys: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            )}

            {/* Voice Section */}
            {activeSection === 'voice' && (
              <div className="space-y-6">
                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Voice input</p>
                    <p className="text-sm text-slate-500">Control the app with your voice</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voiceInput}
                    onChange={(e) => updateSettings({ voiceInput: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Voice output</p>
                    <p className="text-sm text-slate-500">Read content aloud</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voiceOutput}
                    onChange={(e) => updateSettings({ voiceOutput: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Voice Speed: {settings.voiceSpeed}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={settings.voiceSpeed}
                    onChange={(e) => updateSettings({ voiceSpeed: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Slower</span>
                    <span>Faster</span>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Section */}
            {activeSection === 'connection' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <Wifi className="text-green-600" size={20} />
                    ) : (
                      <WifiOff className="text-red-600" size={20} />
                    )}
                    <p className={`font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                      {isOnline ? 'Connected to internet' : 'No internet connection'}
                    </p>
                  </div>
                </div>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Offline mode</p>
                    <p className="text-sm text-slate-500">Save data for offline access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.offlineMode}
                    onChange={(e) => updateSettings({ offlineMode: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Low bandwidth mode</p>
                    <p className="text-sm text-slate-500">Reduce data usage for slow connections</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.lowBandwidth}
                    onChange={(e) => updateSettings({ lowBandwidth: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            Reset to defaults
          </button>
          <button
            onClick={() => setShowSettingsPanel(false)}
            className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ACCESSIBILITY BUTTON COMPONENT
// ============================================================

export const AccessibilityButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { setShowSettingsPanel } = useAccessibility();

  return (
    <button
      onClick={() => setShowSettingsPanel(true)}
      className={`p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors ${className}`}
      aria-label="Accessibility settings"
    >
      <Accessibility size={20} />
    </button>
  );
};

export default AccessibilityProvider;
