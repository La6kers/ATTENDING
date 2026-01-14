// ============================================================
// App Layout - Main layout with navigation and chat
// apps/provider-portal/components/layout/AppLayout.tsx
// ============================================================

import React from 'react';
import Navigation from './Navigation';
import { ChatPanel, ChatToggleButton } from '@/components/chat';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Chat Toggle Button - Fixed position */}
      <div className="fixed bottom-6 right-6 z-30">
        <ChatToggleButton />
      </div>

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  );
};

export default AppLayout;
