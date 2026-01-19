import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Home, 
  Inbox, 
  Settings,
  Menu,
  X,
  Bell,
  Search,
  FileImage,
  TestTube,
  Pill,
  ClipboardList,
  Activity,
  AlertTriangle,
  Keyboard,
  ChevronDown,
  LogOut,
  HelpCircle,
  User,
  Users,
} from 'lucide-react';
import { useAssessmentQueueStore } from '@/store/assessmentQueueStore';
import { NotificationCenter } from '@/components/shared';

const Navigation = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Get assessment counts for badge
  const { getUrgentCount, getPendingCount, fetchAssessments, assessments } = useAssessmentQueueStore();
  
  // Fetch assessments on mount for badge counts
  useEffect(() => {
    if (assessments.length === 0) {
      fetchAssessments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Search goes to assessments with query param
      router.push(`/assessments?search=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const urgentCount = getUrgentCount();
  const pendingCount = getPendingCount();

  // All navigation items with verified routes
  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { 
      name: 'Assessments', 
      href: '/assessments', 
      icon: Activity,
      badge: urgentCount > 0 ? urgentCount : (pendingCount > 0 ? pendingCount : null),
      badgeColor: urgentCount > 0 ? 'bg-red-500' : 'bg-amber-500'
    },
    { name: 'Inbox', href: '/inbox', icon: Inbox },
    { name: 'Labs', href: '/labs', icon: TestTube },
    { name: 'Imaging', href: '/imaging', icon: FileImage },
    { name: 'Medications', href: '/medications', icon: Pill },
    { name: 'Referrals', href: '/referrals', icon: Users },
    { name: 'Treatment Plans', href: '/treatment-plans', icon: ClipboardList },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 glass-nav z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand - ATTENDING AI | Provider Portal on same line with purple background pill */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl font-bold text-brand-gradient">
                ATTENDING AI
              </span>
              <span className="px-3 py-1 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-sm">
                Provider Portal
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    relative flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                  {item.badge && (
                    <span className={`absolute -top-1 -right-1 ${item.badgeColor} text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-2">
            {/* Search - Expandable */}
            {showSearch ? (
              <form onSubmit={handleSearch} className="flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    data-search-input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patients, orders..."
                    className="pl-9 pr-8 py-2 w-64 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSearch(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                title="Search (Ctrl+K)"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Keyboard shortcuts help */}
            <button
              className="hidden sm:flex p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
              title="Keyboard shortcuts (Shift+?)"
            >
              <Keyboard className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setShowNotificationCenter(true)}
              className="relative p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {(urgentCount > 0 || pendingCount > 0) && (
                <span className={`absolute top-1 right-1 min-w-[18px] h-[18px] ${urgentCount > 0 ? 'bg-red-500' : 'bg-amber-500'} text-white text-xs font-bold rounded-full flex items-center justify-center px-1`}>
                  {urgentCount || pendingCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 hover:bg-purple-50 rounded-lg transition-all duration-200"
              >
                <div className="w-8 h-8 bg-brand-gradient rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                  DR
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700">Dr. Reed</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 animate-slide-down">
                  <div className="p-4 border-b bg-gray-50">
                    <p className="font-semibold text-gray-900">Dr. Thomas Reed</p>
                    <p className="text-sm text-gray-500">Family Medicine</p>
                  </div>
                  <div className="py-2">
                    {/* These link to dashboard for now - stub pages can be created later */}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        alert('Profile settings coming soon!');
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 w-full text-left"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        alert('Settings coming soon!');
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 w-full text-left"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        window.open('https://docs.attending.ai', '_blank');
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 w-full text-left"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Help & Support
                    </button>
                  </div>
                  <div className="border-t py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/auth/signin');
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-purple-100">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg text-base font-medium transition-all duration-200
                    ${active
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                    }
                  `}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                  {item.badge && (
                    <span className={`${item.badgeColor} text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Urgent Alert Banner */}
      {urgentCount > 0 && router.pathname !== '/assessments' && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-2 flex items-center justify-between">
              <div className="flex items-center text-red-700">
                <AlertTriangle className="w-4 h-4 mr-2 animate-pulse" />
                <span className="text-sm font-medium">
                  {urgentCount} urgent assessment{urgentCount !== 1 ? 's' : ''} requiring immediate attention
                </span>
              </div>
              <Link 
                href="/assessments?urgency=high" 
                className="text-sm font-medium text-red-700 hover:text-red-900 underline"
              >
                View Now →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Notification Center Panel */}
      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </nav>
  );
};

export default Navigation;
