// ============================================================
// ATTENDING AI - Provider Shell
// apps/provider-portal/components/layout/ProviderShell.tsx
//
// Unified layout shell wrapping ALL provider portal pages.
// Provides: frosted-glass header with gradient-text ATTENDING
// logo (matching HTML prototypes), persistent tab navigation,
// mobile menu, search, notifications, user menu.
//
// Usage:
//   <ProviderShell contextBadge="Dashboard" currentPage="dashboard">
//     {page content}
//   </ProviderShell>
//
// Created: February 18, 2026
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { EhrConnectButton } from '../fhir/EhrConnectButton';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  Inbox,
  TestTube,
  FileImage,
  Pill,
  Users,
  ClipboardList,
  Activity,
  Zap,
  Bell,
  Search,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  HelpCircle,
  User,
  Menu,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

export interface ProviderShellProps {
  children: React.ReactNode;
  /** Page id for nav highlighting (auto-detected from route if omitted) */
  currentPage?: string;
  /** Badge text next to logo — e.g. "Pre-Visit Intelligence", "Inbox" */
  contextBadge?: string;
  /** Show the tab nav bar (default true) */
  showNav?: boolean;
  /** Full-bleed content — no max-width container */
  fullWidth?: boolean;
  /** Patient prev/next arrows */
  patientNav?: { onPrev?: () => void; onNext?: () => void };
  /** Extra elements injected into header right side */
  headerRight?: React.ReactNode;
  /** Red critical-alert banner */
  criticalAlert?: {
    message: string;
    onAction?: () => void;
    actionLabel?: string;
  };
}

// ============================================================
// Navigation items
// ============================================================

const navItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: Home },
  { id: 'assessments', label: 'Assessments', href: '/assessments', icon: Activity },
  { id: 'inbox', label: 'Inbox', href: '/inbox', icon: Inbox },
  { id: 'labs', label: 'Labs', href: '/labs', icon: TestTube },
  { id: 'imaging', label: 'Imaging', href: '/imaging', icon: FileImage },
  { id: 'medications', label: 'Medications', href: '/medications', icon: Pill },
  { id: 'referrals', label: 'Referrals', href: '/referrals', icon: Users },
  { id: 'treatment-plan', label: 'Treatment Plan', href: '/treatment-plan', icon: ClipboardList },
  { id: 'schedule', label: 'Schedule', href: '/schedule', icon: Calendar },
  { id: 'interventions', label: 'AI Copilot', href: '/interventions', icon: Zap },
];

// ============================================================
// Gradient-text ATTENDING logo — matches HTML prototype
// ============================================================

export const AttendingLogo: React.FC<{ badge?: string }> = ({ badge }) => (
  <Link href="/" className="flex items-center gap-3 select-none">
    <span
      className="text-[22px] font-extrabold tracking-tight leading-none"
      style={{
        background: 'linear-gradient(135deg, #1A8FA8 0%, #0C4C5E 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      ATTENDING
    </span>
    {badge && (
      <span
        className="px-3 py-0.5 text-[11px] font-semibold text-white rounded-full"
        style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C4C5E 100%)' }}
      >
        {badge}
      </span>
    )}
  </Link>
);

// ============================================================
// Live clock
// ============================================================

const LiveClock: React.FC = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden md:inline text-sm font-semibold text-gray-700">{time}</span>
  );
};

// ============================================================
// Main component
// ============================================================

const ProviderShell: React.FC<ProviderShellProps> = ({
  children,
  currentPage,
  contextBadge = 'Provider Portal',
  showNav = true,
  fullWidth = false,
  patientNav,
  headerRight,
  criticalAlert,
}) => {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-detect active page from route path
  const activePage =
    currentPage ||
    (() => {
      const p = router.pathname;
      if (p === '/') return 'dashboard';
      if (p.startsWith('/previsit')) return '';
      return navItems.find((n) => n.href !== '/' && p.startsWith(n.href))?.id || '';
    })();

  // Close menus on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Focus search input
  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/assessments?search=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const cx = fullWidth ? 'px-4 lg:px-6' : 'max-w-[1440px] mx-auto px-4 lg:px-6';

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)' }}
    >
      {/* ═══════════════════════════════════════════════
          HEADER — Frosted white glass
          ═══════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div className={cx}>
          <div className="flex items-center justify-between h-[60px]">
            {/* Left — hamburger + logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-500 hover:text-teal-DEFAULT hover:bg-teal-pale rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <AttendingLogo badge={contextBadge} />

              {patientNav && (
                <div className="hidden md:flex items-center gap-1 ml-3 pl-3 border-l border-gray-200">
                  <button
                    onClick={patientNav.onPrev}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-teal-DEFAULT hover:bg-teal-pale transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={patientNav.onNext}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-teal-DEFAULT hover:bg-teal-pale transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Center — clock */}
            <LiveClock />

            {/* Right — search, notifications, settings, user */}
            <div className="flex items-center gap-1.5">
            {headerRight}
              <EhrConnectButton />

              {showSearch ? (
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patients, orders…"
                    className="pl-9 pr-8 py-2 w-60 rounded-xl border border-gray-200 text-sm focus:border-teal-DEFAULT focus:ring-2 focus:ring-teal-pale outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSearch(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 text-gray-400 hover:text-teal-DEFAULT hover:bg-teal-pale rounded-lg transition-colors"
                  title="Search (⌘K)"
                >
                  <Search className="w-[18px] h-[18px]" />
                </button>
              )}

              <button className="relative p-2 text-gray-400 hover:text-teal-DEFAULT hover:bg-teal-pale rounded-lg transition-colors">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <Link
                href="/settings"
                className="p-2 text-gray-400 hover:text-teal-DEFAULT hover:bg-teal-pale rounded-lg transition-colors"
              >
                <Settings className="w-[18px] h-[18px]" />
              </Link>

              {/* User */}
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 hover:bg-teal-pale rounded-xl transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: 'linear-gradient(180deg, #1A8FA8 0%, #0C4C5E 100%)',
                    }}
                  >
                    SI
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <p className="font-semibold text-gray-900 text-sm">Dr. Thomas Reed</p>
                      <p className="text-xs text-gray-500">Family Medicine</p>
                    </div>
                    <div className="py-1">
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-pale hover:text-teal-dark" onClick={() => setShowUserMenu(false)}>
                        <User className="w-4 h-4" /> My Profile
                      </Link>
                      <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-pale hover:text-teal-dark" onClick={() => setShowUserMenu(false)}>
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      <Link href="/help" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-pale hover:text-teal-dark" onClick={() => setShowUserMenu(false)}>
                        <HelpCircle className="w-4 h-4" /> Help
                      </Link>
                    </div>
                    <div className="border-t py-1">
                      <button
                        onClick={() => { setShowUserMenu(false); router.push('/auth/signin'); }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            TAB NAVIGATION
            ═══════════════════════════════════════════════ */}
        {showNav && (
          <div className="border-t border-gray-100 hidden lg:block">
            <div className={cx}>
              <nav className="flex items-center gap-0.5 -mb-px overflow-x-auto scrollbar-hide">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activePage === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`
                        flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2
                        transition-all whitespace-nowrap
                        ${active
                          ? 'border-teal-DEFAULT text-teal-dark'
                          : 'border-transparent text-gray-500 hover:text-teal-DEFAULT hover:border-teal-light'
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium ${
                      active
                        ? 'bg-teal-pale text-teal-dark'
                        : 'text-gray-600 hover:bg-teal-pale hover:text-teal-DEFAULT'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" /> {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════
          CRITICAL ALERT BANNER
          ═══════════════════════════════════════════════ */}
      {criticalAlert && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
          <div className={`${cx} py-3`}>
            <div className="flex items-center gap-3">
              <span className="animate-pulse text-lg">⚠️</span>
              <span className="flex-1 text-sm font-medium">{criticalAlert.message}</span>
              {criticalAlert.onAction && (
                <button
                  onClick={criticalAlert.onAction}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors"
                >
                  {criticalAlert.actionLabel || 'Take Action'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          PAGE CONTENT
          ═══════════════════════════════════════════════ */}
      <main>{children}</main>
    </div>
  );
};

export { ProviderShell };
export default ProviderShell;
