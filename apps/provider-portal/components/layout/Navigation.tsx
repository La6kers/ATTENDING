import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Home, 
  Inbox, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Bell,
  Search,
  Stethoscope,
  FileImage,
  TestTube,
  Pill,
  ClipboardList,
  MessageSquare,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useAssessmentQueueStore } from '@/store/assessmentQueueStore';

const Navigation = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get assessment counts for badge
  const { getUrgentCount, getPendingCount, fetchAssessments, assessments } = useAssessmentQueueStore();
  
  // Fetch assessments on mount for badge counts
  useEffect(() => {
    if (assessments.length === 0) {
      fetchAssessments();
    }
  }, []);

  const urgentCount = getUrgentCount();
  const pendingCount = getPendingCount();

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { 
      name: 'Assessments', 
      href: '/assessments', 
      icon: Activity,
      badge: urgentCount > 0 ? urgentCount : (pendingCount > 0 ? pendingCount : null),
      badgeColor: urgentCount > 0 ? 'bg-red-500' : 'bg-amber-500'
    },
    { name: 'Patient Assessment', href: '/patient-assessment', icon: Stethoscope },
    { name: 'Inbox', href: '/inbox', icon: Inbox },
    { name: 'Imaging', href: '/imaging', icon: FileImage },
    { name: 'Labs', href: '/labs', icon: TestTube },
    { name: 'Medications', href: '/medications', icon: Pill },
    { name: 'Treatment Plans', href: '/treatment-plans', icon: ClipboardList },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ATTENDING
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                AI Health
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
                    relative flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${active
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              {(urgentCount > 0 || pendingCount > 0) && (
                <span className={`absolute top-1 right-1 w-2.5 h-2.5 ${urgentCount > 0 ? 'bg-red-500' : 'bg-amber-500'} rounded-full animate-pulse`}></span>
              )}
            </button>

            {/* User Avatar */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                DR
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors
                    ${active
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                <AlertTriangle className="w-4 h-4 mr-2" />
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
    </nav>
  );
};

export default Navigation;
