// ============================================================
// ATTENDING AI - Main Layout Component
// apps/provider-portal/components/layout/MainLayout.tsx
//
// Unified layout that wraps all pages with navigation and header
// ============================================================

'use client';

import React, { useState } from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import {
  Bell,
  Search,
  Settings,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Mic,
  MicOff,
  Moon,
  Sun,
  Globe,
  AlertCircle,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface MainLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  pageTitle?: string;
  pageDescription?: string;
  showAIAssistant?: boolean;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

// ============================================================
// MOCK DATA
// ============================================================

const mockNotifications: Notification[] = [
  { id: 'n1', type: 'warning', title: 'Critical Lab Result', message: 'Patient John Smith has critical potassium level', time: new Date(Date.now() - 5 * 60 * 1000), read: false },
  { id: 'n2', type: 'info', title: 'Appointment Reminder', message: 'You have 3 patients scheduled in the next hour', time: new Date(Date.now() - 15 * 60 * 1000), read: false },
  { id: 'n3', type: 'success', title: 'Referral Accepted', message: 'Dr. Rodriguez accepted your cardiology referral', time: new Date(Date.now() - 30 * 60 * 1000), read: true },
];

// ============================================================
// COMPONENTS
// ============================================================

const TopBar: React.FC<{
  pageTitle?: string;
  pageDescription?: string;
  notifications: Notification[];
  showAIAssistant?: boolean;
}> = ({ pageTitle, pageDescription, notifications, showAIAssistant = true }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Left - Page Title */}
      <div>
        {pageTitle && (
          <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
        )}
        {pageDescription && (
          <p className="text-sm text-slate-500">{pageDescription}</p>
        )}
      </div>
      
      {/* Center - Global Search */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, encounters, orders..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-200 text-slate-500 text-xs rounded hidden md:inline">
            ⌘K
          </kbd>
        </div>
      </div>
      
      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* AI Voice Assistant */}
        {showAIAssistant && (
          <button
            onClick={() => setIsListening(!isListening)}
            className={`p-2.5 rounded-xl transition-all ${
              isListening 
                ? 'bg-purple-100 text-purple-600 ring-2 ring-purple-300 animate-pulse' 
                : 'hover:bg-slate-100 text-slate-500'
            }`}
            title={isListening ? 'Stop listening' : 'Start AI voice assistant'}
          >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
        )}
        
        {/* AI Quick Actions */}
        <button
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all"
        >
          <Sparkles size={16} />
          <span className="hidden md:inline">AI Assist</span>
        </button>
        
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Bell size={20} className="text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                <button className="text-xs text-purple-600 hover:underline">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={`p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      !notification.read ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle 
                        size={16} 
                        className={
                          notification.type === 'warning' ? 'text-amber-500' :
                          notification.type === 'error' ? 'text-red-500' :
                          notification.type === 'success' ? 'text-green-500' :
                          'text-blue-500'
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{notification.title}</p>
                        <p className="text-xs text-slate-500 truncate">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {Math.round((Date.now() - notification.time.getTime()) / 60000)}m ago
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-slate-200">
                <button className="w-full py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <Sun size={20} className="text-slate-500" /> : <Moon size={20} className="text-slate-500" />}
        </button>
        
        {/* Settings */}
        <button
          className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          title="Settings"
        >
          <Settings size={20} className="text-slate-500" />
        </button>
        
        {/* Help */}
        <button
          className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          title="Help"
        >
          <HelpCircle size={20} className="text-slate-500" />
        </button>
      </div>
    </header>
  );
};

const AIFloatingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg
          bg-gradient-to-r from-purple-600 to-indigo-600 text-white
          flex items-center justify-center
          hover:from-purple-700 hover:to-indigo-700
          transition-all z-50
          ${isOpen ? 'scale-0' : 'scale-100'}
        `}
      >
        <Sparkles size={24} />
      </button>
      
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded"
            >
              ×
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
            <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
              <p className="text-sm text-slate-600">
                Hi Dr. Chen! I'm your AI assistant. I can help you with:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-500">
                <li>• Patient summaries and history</li>
                <li>• Clinical decision support</li>
                <li>• Documentation assistance</li>
                <li>• Order recommendations</li>
              </ul>
            </div>
          </div>
          
          {/* Input */}
          <div className="p-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
                <Mic size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// MAIN LAYOUT COMPONENT
// ============================================================

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentPath = '/dashboard',
  pageTitle,
  pageDescription,
  showAIAssistant = true,
  user = { name: 'Dr. Sarah Chen', role: 'Family Medicine' },
}) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <NavigationSidebar 
        currentPath={currentPath}
        user={user}
      />
      
      {/* Main Content */}
      <div className="pl-64 transition-all duration-300">
        {/* Top Bar */}
        <TopBar 
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          notifications={mockNotifications}
          showAIAssistant={showAIAssistant}
        />
        
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
      
      {/* Floating AI Assistant */}
      {showAIAssistant && <AIFloatingAssistant />}
    </div>
  );
};

export default MainLayout;
