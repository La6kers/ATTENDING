// =============================================================================
// COMPASS Admin - Layout Shell
// apps/compass-admin/components/layout/CompassAdminShell.tsx
//
// Unified layout for all COMPASS Admin pages.
// Teal branding (distinct from ATTENDING purple provider portal).
// Simplified sidebar: Queue, Settings, Help.
// =============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Inbox,
  Settings,
  HelpCircle,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Users,
  LayoutDashboard,
  Building2,
  Ticket,
  Activity,
} from 'lucide-react';

interface CompassAdminShellProps {
  children: React.ReactNode;
  title?: string;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { id: 'clinics', label: 'Clinics', href: '/clinics', icon: Building2 },
  { id: 'providers', label: 'Providers', href: '/settings/providers', icon: Users },
  { id: 'tickets', label: 'Tickets', href: '/tickets', icon: Ticket },
  { id: 'queue', label: 'Queue', href: '/queue', icon: Inbox },
  { id: 'system', label: 'System Health', href: '/system', icon: Activity },
];

export function CompassAdminShell({ children, title }: CompassAdminShellProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentNav = navItems.find((item) => {
    if (item.href === '/') return router.pathname === '/';
    return router.pathname.startsWith(item.href);
  });

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0C3547 0%, #0F5F76 100%)' }}>
      {/* Top Header */}
      <header className="bg-compass-gradient text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Mobile Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-lg font-bold backdrop-blur-sm">
                  C
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight">ATTENDING</span>
                  <span className="text-xs text-teal-200 ml-2 hidden sm:inline">Admin Portal</span>
                </div>
              </Link>

              {title && (
                <span className="hidden md:block text-sm text-teal-200 border-l border-teal-400/30 pl-4 ml-2">
                  {title}
                </span>
              )}
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentNav?.id === item.id;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-teal-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Notifications + User */}
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-white/10 relative">
                <Bell className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-teal-200" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border z-50 py-1">
                      <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      <Link href="/help" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <HelpCircle className="w-4 h-4" /> Help
                      </Link>
                      <hr className="my-1" />
                      <button className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-teal-400/30 px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentNav?.id === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                    isActive
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-teal-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}
