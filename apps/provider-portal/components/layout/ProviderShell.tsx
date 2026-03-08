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
  Stethoscope,
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
  /** Active patient — when set, Treatment Plan tab shows with patient name */
  activePatient?: { name: string; id?: string };
}

// ============================================================
// Navigation items
// ============================================================

const DEFAULT_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: Home },
  { id: 'assessments', label: 'Assessments', href: '/assessments', icon: Activity },
  { id: 'inbox', label: 'Inbox', href: '/inbox', icon: Inbox },
  { id: 'labs', label: 'Labs', href: '/labs', icon: TestTube },
  { id: 'imaging', label: 'Imaging', href: '/imaging', icon: FileImage },
  { id: 'medications', label: 'Medications', href: '/medications', icon: Pill },
  { id: 'referrals', label: 'Referrals', href: '/referrals', icon: Users },
  { id: 'schedule', label: 'Schedule', href: '/schedule', icon: Calendar },
  { id: 'interventions', label: 'Clinical Intelligence', href: '/interventions', icon: Zap },
  { id: 'specialty', label: 'Specialty', href: '/specialty', icon: Stethoscope },
];

// Treatment Plan is a special nav item — only visible when a patient chart is open
const TREATMENT_PLAN_ITEM = { id: 'treatment-plan', href: '/treatment-plan', icon: ClipboardList };

const NAV_ORDER_KEY = 'attending-nav-order';

function getOrderedNavItems() {
  if (typeof window === 'undefined') return DEFAULT_NAV_ITEMS;
  try {
    const saved = localStorage.getItem(NAV_ORDER_KEY);
    if (!saved) return DEFAULT_NAV_ITEMS;
    const ids: string[] = JSON.parse(saved);
    const byId = new Map(DEFAULT_NAV_ITEMS.map(item => [item.id, item]));
    const ordered = ids.map(id => byId.get(id)).filter(Boolean) as typeof DEFAULT_NAV_ITEMS;
    // Append any new items not in saved order
    DEFAULT_NAV_ITEMS.forEach(item => {
      if (!ids.includes(item.id)) ordered.push(item);
    });
    return ordered;
  } catch {
    return DEFAULT_NAV_ITEMS;
  }
}

function saveNavOrder(ids: string[]) {
  try { localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(ids)); } catch {}
}

// ============================================================
// Gradient-text ATTENDING logo — matches HTML prototype
// ============================================================

export const AttendingLogo: React.FC<{ badge?: string }> = ({ badge }) => (
  <Link href="/" className="flex items-center gap-3 select-none">
    <span className="text-[22px] font-extrabold tracking-tight leading-none text-white">
      ATTENDING
    </span>
    {badge && (
      <span
        className="px-3 py-0.5 text-[11px] font-semibold rounded-full"
        style={{ background: 'rgba(26, 143, 168, 0.4)', color: '#7dd3c8' }}
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
    <span className="hidden md:inline text-sm font-semibold text-teal-200">{time}</span>
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
  activePatient,
}) => {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navItems, setNavItems] = useState(DEFAULT_NAV_ITEMS);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load saved order on mount
  useEffect(() => {
    setNavItems(getOrderedNavItems());
  }, []);

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

  const hx = 'px-4 lg:px-6'; // header always full-width
  const cx = fullWidth ? 'px-4 lg:px-6' : 'max-w-[1440px] mx-auto px-4 lg:px-6';

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)' }}
    >
      {/* ═══════════════════════════════════════════════
          HEADER — Frosted glass over teal gradient
          ═══════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(12, 53, 71, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className={hx}>
          <div className="flex items-center justify-between h-[60px]">
            {/* Left — hamburger + logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href="/" className="flex items-center gap-3 select-none">
                <span
                  className="text-[22px] font-extrabold tracking-tight leading-none text-white"
                >
                  ATTENDING
                </span>
                {contextBadge && (
                  <span
                    className="px-3 py-0.5 text-[11px] font-semibold rounded-full"
                    style={{ background: 'rgba(26, 143, 168, 0.4)', color: '#7dd3c8' }}
                  >
                    {contextBadge}
                  </span>
                )}
              </Link>

              {patientNav && (
                <div className="hidden md:flex items-center gap-1 ml-3 pl-3 border-l border-white/20">
                  <button
                    onClick={patientNav.onPrev}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Previous patient"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={patientNav.onNext}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Next patient"
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patients, orders…"
                    className="pl-9 pr-8 py-2 w-60 rounded-xl text-sm text-white placeholder-white/40 outline-none"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSearch(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    aria-label="Close search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Search (⌘K)"
                  aria-label="Search"
                >
                  <Search className="w-[18px] h-[18px]" />
                </button>
              )}

              <button className="relative p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Notifications">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <Link
                href="/settings"
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-[18px] h-[18px]" />
              </Link>

              {/* User */}
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-xl transition-colors"
                  aria-label="User menu"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: 'linear-gradient(180deg, #25B8A9 0%, #1A8FA8 100%)',
                    }}
                  >
                    TR
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40 hidden sm:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b" style={{ background: '#E6F7F5' }}>
                      <p className="font-semibold text-sm" style={{ color: '#0C3547' }}>Dr. Thomas Reed</p>
                      <p className="text-xs" style={{ color: '#1A8FA8' }}>Family Medicine</p>
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
          <div className="border-t border-white/10 hidden lg:block">
            <div className={hx}>
              <nav className="flex items-center gap-0.5 -mb-px overflow-x-auto scrollbar-hide">
                {navItems.map((item, idx) => {
                  const Icon = item.icon;
                  const active = activePage === item.id;
                  const isDragging = dragIdx === idx;
                  const isOver = dragOverIdx === idx;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      draggable
                      onDragStart={(e) => {
                        setDragIdx(idx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverIdx(idx);
                      }}
                      onDragLeave={() => { if (dragOverIdx === idx) setDragOverIdx(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIdx !== null && dragIdx !== idx) {
                          const updated = [...navItems];
                          const [moved] = updated.splice(dragIdx, 1);
                          updated.splice(idx, 0, moved);
                          setNavItems(updated);
                          saveNavOrder(updated.map(n => n.id));
                        }
                        setDragIdx(null);
                        setDragOverIdx(null);
                      }}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                      className={`
                        flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2
                        transition-all whitespace-nowrap select-none
                        ${active
                          ? 'text-white'
                          : 'border-transparent text-white/50 hover:text-white/80 hover:border-white/30'
                        }
                      `}
                      style={{
                        ...(active ? { borderBottomColor: '#c8a44e' } : {}),
                        opacity: isDragging ? 0.4 : 1,
                        ...(isOver && dragIdx !== null && dragIdx !== idx ? { borderLeftColor: '#c8a44e', borderLeftWidth: 2, borderLeftStyle: 'solid' as const } : {}),
                        cursor: 'grab',
                      }}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#c8a44e]' : ''}`} />
                      {item.label}
                    </Link>
                  );
                })}

                {/* Treatment Plan — only visible when a patient chart is open */}
                {activePatient && (
                  <>
                    <div className="w-px h-5 mx-1 self-center" style={{ background: 'rgba(255,255,255,0.2)' }} />
                    <Link
                      href={TREATMENT_PLAN_ITEM.href}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2
                        transition-all whitespace-nowrap rounded-t-lg
                        ${activePage === 'treatment-plan'
                          ? 'text-white'
                          : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                        }
                      `}
                      style={{
                        ...(activePage === 'treatment-plan'
                          ? { borderBottomColor: '#c8a44e', background: 'rgba(200,164,78,0.12)' }
                          : { background: 'rgba(255,255,255,0.05)' }
                        ),
                      }}
                    >
                      <TREATMENT_PLAN_ITEM.icon className={`w-3.5 h-3.5 ${activePage === 'treatment-plan' ? 'text-[#c8a44e]' : ''}`} />
                      <span>{activePatient.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(200,164,78,0.2)', color: '#c8a44e' }}>
                        Chart
                      </span>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        )}

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10" style={{ background: 'rgba(12, 53, 71, 0.95)' }}>
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
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
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
          <div className={`${hx} py-3`}>
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
