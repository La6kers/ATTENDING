// ============================================================
// ATTENDING AI - User Profile Menu
// apps/provider-portal/components/auth/UserProfileMenu.tsx
//
// User profile dropdown with account management
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Bell,
  HelpCircle,
  Building2,
  Key,
  Palette,
  Globe,
  Clock,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  roles: string[];
  organizationName?: string;
  npi?: string;
  specialty?: string;
  avatarUrl?: string;
  sessionExpiresAt: Date;
}

interface UserProfileMenuProps {
  user: UserProfile;
  onLogout: () => void;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export function UserProfileMenu({
  user,
  onLogout,
  onEditProfile,
  onChangePassword,
  onOpenSettings,
  onOpenHelp,
}: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate session time remaining
  const sessionTimeRemaining = () => {
    const remaining = new Date(user.sessionExpiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const initials = user.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const primaryRole = user.roles[0]?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User';

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-medium">
            {initials}
          </div>
        )}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
          <div className="text-xs text-gray-500">{primaryRole}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* User Info Header */}
          <div className="p-4 bg-gradient-to-r from-teal-600 to-teal-700">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{user.displayName}</div>
                <div className="text-sm text-teal-200 truncate">{user.email}</div>
                {user.npi && (
                  <div className="text-xs text-teal-300 mt-1">NPI: {user.npi}</div>
                )}
              </div>
            </div>

            {/* Roles */}
            <div className="mt-3 flex flex-wrap gap-1">
              {user.roles.slice(0, 3).map(role => (
                <span
                  key={role}
                  className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full"
                >
                  {role.replace(/_/g, ' ')}
                </span>
              ))}
              {user.roles.length > 3 && (
                <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                  +{user.roles.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Organization & Session Info */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            {user.organizationName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{user.organizationName}</span>
              </div>
            )}
            {user.specialty && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <User className="w-4 h-4" />
                <span>{user.specialty}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
              <Clock className="w-3 h-3" />
              <span>Session: {sessionTimeRemaining()}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <MenuItem
              icon={<User className="w-4 h-4" />}
              label="Edit Profile"
              onClick={() => { onEditProfile(); setIsOpen(false); }}
            />
            <MenuItem
              icon={<Key className="w-4 h-4" />}
              label="Change Password"
              onClick={() => { onChangePassword(); setIsOpen(false); }}
            />
            <MenuItem
              icon={<Bell className="w-4 h-4" />}
              label="Notification Preferences"
              onClick={() => { onOpenSettings(); setIsOpen(false); }}
            />
            <MenuItem
              icon={<Settings className="w-4 h-4" />}
              label="Settings"
              onClick={() => { onOpenSettings(); setIsOpen(false); }}
            />

            <div className="my-2 border-t border-gray-200" />

            <MenuItem
              icon={<Shield className="w-4 h-4" />}
              label="Security & Privacy"
              onClick={() => { onOpenSettings(); setIsOpen(false); }}
            />
            <MenuItem
              icon={<HelpCircle className="w-4 h-4" />}
              label="Help & Support"
              onClick={() => { onOpenHelp(); setIsOpen(false); }}
            />

            <div className="my-2 border-t border-gray-200" />

            <MenuItem
              icon={<LogOut className="w-4 h-4" />}
              label="Sign Out"
              onClick={() => { onLogout(); setIsOpen(false); }}
              variant="danger"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  const variants = {
    default: 'text-gray-700 hover:bg-gray-100',
    danger: 'text-red-600 hover:bg-red-50',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${variants[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}

export default UserProfileMenu;
