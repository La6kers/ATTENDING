// Header.tsx
// Enhanced header component matching HTML prototype
// apps/provider-portal/components/layout/Header.tsx

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Bell,
  Search,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Users,
  HelpCircle,
  X,
  Check,
  Clock,
  AlertTriangle,
  MessageSquare,
  FileText,
} from 'lucide-react';

// Types
interface Notification {
  id: string;
  type: 'urgent' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

interface CollaboratorStatus {
  id: string;
  name: string;
  initials: string;
  status: 'editing' | 'viewing' | 'away';
  location?: string;
}

interface HeaderProps {
  notifications?: Notification[];
  collaborators?: CollaboratorStatus[];
  onStartHuddle?: () => void;
  onSearch?: (query: string) => void;
  showCollaborators?: boolean;
  className?: string;
}

// Sample notifications
const defaultNotifications: Notification[] = [
  {
    id: '1',
    type: 'urgent',
    title: 'Critical Lab Result',
    message: 'Troponin elevated for John Doe - requires immediate review',
    time: '2 min ago',
    read: false,
    actionUrl: '/labs?patient=john-doe',
  },
  {
    id: '2',
    type: 'warning',
    title: 'New COMPASS Assessment',
    message: 'Sarah Johnson completed assessment - High urgency',
    time: '15 min ago',
    read: false,
    actionUrl: '/assessments/sarah-johnson',
  },
  {
    id: '3',
    type: 'info',
    title: 'Imaging Results Ready',
    message: 'CT Head results available for Mike Wilson',
    time: '1 hour ago',
    read: true,
    actionUrl: '/imaging?patient=mike-wilson',
  },
  {
    id: '4',
    type: 'success',
    title: 'Referral Accepted',
    message: 'Neurology accepted referral for Maria Santos',
    time: '2 hours ago',
    read: true,
    actionUrl: '/referrals',
  },
];

// Sample collaborators
const defaultCollaborators: CollaboratorStatus[] = [
  { id: '1', name: 'Dr. Smith', initials: 'DS', status: 'editing', location: 'Sarah Johnson chart' },
  { id: '2', name: 'Nurse Williams', initials: 'NW', status: 'viewing', location: 'Lab results' },
];

const Header: React.FC<HeaderProps> = ({
  notifications = defaultNotifications,
  collaborators = defaultCollaborators,
  onStartHuddle,
  onSearch,
  showCollaborators = true,
  className = '',
}) => {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localNotifications, setLocalNotifications] = useState(notifications);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Unread count
  const unreadCount = localNotifications.filter(n => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  // Mark notification as read
  const markAsRead = (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  // Notification type styles
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-amber-500 bg-amber-50';
      case 'success':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <header className={`header text-white ${className}`} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">ATTENDING AI</h1>
              <span className="text-sm font-medium text-white/80 border-l border-white/30 pl-3">
                Provider Portal
              </span>
            </Link>
          </div>

          {/* Center - Search (expandable) */}
          {showSearch ? (
            <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patients, orders, results..."
                  className="w-full pl-10 pr-10 py-2 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <button
                  type="button"
                  onClick={() => setShowSearch(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </form>
          ) : (
            /* Collaborators Section */
            showCollaborators && collaborators.length > 0 && (
              <div className="hidden md:flex items-center gap-3 mx-8">
                <div className="flex -space-x-2">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-purple-600 ${
                        collab.status === 'editing'
                          ? 'bg-green-500 text-white'
                          : collab.status === 'viewing'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                      title={`${collab.name} - ${collab.status}${collab.location ? ` (${collab.location})` : ''}`}
                    >
                      {collab.initials}
                      {collab.status === 'editing' && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-purple-600 animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-purple-200">
                  {collaborators.filter(c => c.status === 'editing').length > 0 && (
                    <>{collaborators.find(c => c.status === 'editing')?.initials} editing</>
                  )}
                </span>
                {onStartHuddle && (
                  <button
                    onClick={onStartHuddle}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Start Team Huddle
                  </button>
                )}
              </div>
            )
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Search Toggle */}
            {!showSearch && (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Guidelines Button */}
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
              <FileText className="w-4 h-4" />
              Guidelines
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="notification-icon relative p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={`Notifications, ${unreadCount} unread`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="notification-badge absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-slide-down">
                  <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {localNotifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      localNotifications.map((notification) => (
                        <Link
                          key={notification.id}
                          href={notification.actionUrl || '#'}
                          onClick={() => {
                            markAsRead(notification.id);
                            setShowNotifications(false);
                          }}
                          className={`block p-4 border-l-4 hover:bg-gray-50 transition-colors ${getNotificationStyle(notification.type)} ${
                            !notification.read ? 'bg-opacity-100' : 'bg-opacity-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium text-gray-900 ${!notification.read ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-0.5 truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.time}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  <Link
                    href="/notifications"
                    className="block p-3 text-center text-sm font-medium text-purple-600 hover:bg-purple-50 border-t"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="user-menu flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center text-sm font-bold">
                  TR
                </div>
                <span className="hidden sm:inline text-sm font-medium">Dr. Thomas Reed</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-slide-down">
                  <div className="p-4 border-b bg-gray-50">
                    <p className="font-semibold text-gray-900">Dr. Thomas Reed</p>
                    <p className="text-sm text-gray-500">Family Medicine</p>
                    <p className="text-xs text-gray-400 mt-1">thomas.reed@clinic.com</p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <Link
                      href="/help"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <HelpCircle className="w-4 h-4" />
                      Help & Support
                    </Link>
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
