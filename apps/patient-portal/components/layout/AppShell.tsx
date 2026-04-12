// ============================================================
// ATTENDING AI — Patient App Shell
// components/layout/AppShell.tsx
//
// Mobile-first app layout with:
// - Status bar / header area
// - Scrollable content area
// - Bottom tab navigation (Home, Health, Emergency, Messages, Profile)
// - Safe area handling for iOS
// ============================================================

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  Heart,
  Shield,
  MessageCircle,
  User,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface AppShellProps {
  children: React.ReactNode;
  /** Hide bottom nav on specific screens (e.g., assessment flow) */
  hideNav?: boolean;
  /** Optional custom header */
  header?: React.ReactNode;
}

interface TabItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Matches these path prefixes for active state */
  matchPaths: string[];
  /** Optional badge count */
  badge?: number;
  /** Emergency tab gets special styling */
  isEmergency?: boolean;
}

// ============================================================
// Tab Configuration
// ============================================================

const TABS: TabItem[] = [
  {
    href: '/home',
    label: 'Home',
    icon: Home,
    matchPaths: ['/home', '/dashboard'],
  },
  {
    href: '/health',
    label: 'Health',
    icon: Heart,
    matchPaths: ['/health', '/results', '/labs', '/medications'],
  },
  {
    href: '/emergency',
    label: 'Services',
    icon: Shield,
    matchPaths: ['/emergency'],
    isEmergency: true,
  },
  {
    href: '/messages',
    label: 'Messages',
    icon: MessageCircle,
    matchPaths: ['/messages'],
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: User,
    matchPaths: ['/profile', '/settings'],
  },
];

// ============================================================
// Bottom Tab Bar
// ============================================================

function BottomTabBar() {
  const router = useRouter();

  const isActive = (tab: TabItem) =>
    tab.matchPaths.some((p) => router.pathname.startsWith(p));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{
        background: 'linear-gradient(135deg, #0C3547, #0C4C5E)',
        boxShadow: '0 -2px 16px rgba(12, 53, 71, 0.25)',
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-[68px] px-2">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          if (tab.isEmergency) {
            return (
              <Link key={tab.href} href={tab.href} aria-label={tab.label} role="button" className="flex flex-col items-center -mt-4">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    active
                      ? 'bg-attending-primary shadow-teal'
                      : 'bg-attending-header-dark shadow-attending'
                  }`}
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <span
                  className={`text-[10px] mt-1 font-semibold ${
                    active ? 'text-[#4FD1C5]' : 'text-white/50'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors relative"
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    active ? 'text-[#4FD1C5]' : 'text-white/40'
                  }`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? 'text-[#4FD1C5] font-semibold' : 'text-white/40'
                }`}
              >
                {tab.label}
              </span>
              {active && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#4FD1C5] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================
// App Shell
// ============================================================

export default function AppShell({ children, hideNav = false, header }: AppShellProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col" style={{ background: 'linear-gradient(180deg, #0C3547 0%, #0C4C5E 30%, #115E72 100%)' }}>
      {/* Optional custom header */}
      {header}

      {/* Main scrollable content */}
      <main
        className={`flex-1 ${!hideNav ? 'page-with-nav' : ''}`}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && <BottomTabBar />}
    </div>
  );
}

export { BottomTabBar, TABS };
export type { TabItem };
