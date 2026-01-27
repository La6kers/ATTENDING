// ============================================================
// ATTENDING AI - Unified Navigation Sidebar
// apps/provider-portal/components/layout/NavigationSidebar.tsx
//
// Streamlined navigation that brings all features together
// ============================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  // Core Navigation
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  HelpCircle,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  
  // Clinical AI
  Brain,
  Mic,
  ImageIcon,
  Sparkles,
  
  // Care Management
  Heart,
  Activity,
  Stethoscope,
  ClipboardList,
  GitBranch,
  
  // Operations
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  
  // Integration & Admin
  Link as LinkIcon,
  Shield,
  Database,
  Key,
  
  // Patient & Population
  UserCircle,
  UsersRound,
  Home,
  Pill,
  
  // Misc
  BookOpen,
  Calculator,
  Webhook,
  Globe,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href?: string;
  badge?: string | number;
  badgeColor?: 'red' | 'amber' | 'green' | 'blue' | 'purple';
  children?: NavItem[];
  isNew?: boolean;
  isAI?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

// ============================================================
// NAVIGATION STRUCTURE
// ============================================================

export const navigationSections: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { id: 'patients', label: 'Patients', icon: Users, href: '/patients', badge: 'New' },
      { id: 'schedule', label: 'Schedule', icon: Calendar, href: '/scheduling' },
      { id: 'messages', label: 'Messages', icon: Bell, href: '/messages', badge: 3, badgeColor: 'red' },
    ],
  },
  {
    id: 'clinical-ai',
    label: 'Clinical AI',
    items: [
      { id: 'copilot', label: 'AI Copilot', icon: Brain, href: '/copilot', isAI: true, isNew: true },
      { id: 'ambient', label: 'Ambient Documentation', icon: Mic, href: '/ambient', isAI: true },
      { id: 'image-analysis', label: 'Image Analysis', icon: ImageIcon, href: '/image-analysis', isAI: true },
      { id: 'decision-support', label: 'Decision Support', icon: Calculator, href: '/decision-support' },
    ],
  },
  {
    id: 'care-management',
    label: 'Care Management',
    items: [
      { id: 'care-coordination', label: 'Care Coordination', icon: Heart, href: '/care-coordination' },
      { id: 'pathways', label: 'Clinical Pathways', icon: GitBranch, href: '/pathways' },
      { id: 'sdoh', label: 'Social Care (SDOH)', icon: Home, href: '/sdoh' },
      { id: 'patient-companion', label: 'Patient Companion', icon: UserCircle, href: '/patient-companion' },
    ],
  },
  {
    id: 'population-health',
    label: 'Population Health',
    items: [
      { id: 'population', label: 'Population Dashboard', icon: UsersRound, href: '/population-health' },
      { id: 'outcomes', label: 'Clinical Outcomes', icon: Target, href: '/outcomes' },
      { id: 'predictive', label: 'Predictive Analytics', icon: Sparkles, href: '/predictive', isAI: true },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    items: [
      { id: 'executive', label: 'Executive Dashboard', icon: BarChart3, href: '/executive-analytics' },
      { id: 'provider-performance', label: 'Provider Performance', icon: TrendingUp, href: '/provider-performance' },
      { id: 'quality', label: 'Quality Measures', icon: ClipboardList, href: '/quality' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      { id: 'integrations', label: 'Integration Hub', icon: LinkIcon, href: '/integrations' },
      { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
      { id: 'accessibility', label: 'Accessibility', icon: Globe, href: '/accessibility' },
    ],
  },
];

// ============================================================
// COMPONENTS
// ============================================================

const NavBadge: React.FC<{ 
  content: string | number; 
  color?: 'red' | 'amber' | 'green' | 'blue' | 'purple';
}> = ({ content, color = 'blue' }) => {
  const colors = {
    red: 'bg-red-500 text-white',
    amber: 'bg-amber-500 text-white',
    green: 'bg-green-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
  };
  
  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${colors[color]}`}>
      {content}
    </span>
  );
};

const NavItemComponent: React.FC<{
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  depth?: number;
}> = ({ item, isActive, collapsed, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;
  
  const baseClasses = `
    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
    ${depth > 0 ? 'ml-6' : ''}
  `;
  
  const activeClasses = isActive
    ? 'bg-purple-100 text-purple-700 font-medium'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  
  const content = (
    <>
      <Icon size={20} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.isAI && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded">
              AI
            </span>
          )}
          {item.isNew && !item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded">
              NEW
            </span>
          )}
          {item.badge && <NavBadge content={item.badge} color={item.badgeColor} />}
          {hasChildren && (
            <ChevronRight 
              size={16} 
              className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} 
            />
          )}
        </>
      )}
    </>
  );
  
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`${baseClasses} ${activeClasses} w-full`}
        >
          {content}
        </button>
        {expanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.id}
                item={child}
                isActive={false}
                collapsed={collapsed}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <Link href={item.href || '#'} className={`${baseClasses} ${activeClasses}`}>
      {content}
    </Link>
  );
};

const NavSectionComponent: React.FC<{
  section: NavSection;
  currentPath: string;
  collapsed: boolean;
}> = ({ section, currentPath, collapsed }) => {
  return (
    <div className="mb-6">
      {!collapsed && (
        <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {section.label}
        </h3>
      )}
      <nav className="space-y-1">
        {section.items.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            isActive={currentPath === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </div>
  );
};

// ============================================================
// MAIN SIDEBAR COMPONENT
// ============================================================

export interface NavigationSidebarProps {
  currentPath?: string;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentPath = '/dashboard',
  user = { name: 'Dr. Sarah Chen', role: 'Family Medicine' },
  onLogout,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <aside 
      className={`
        fixed left-0 top-0 h-screen bg-white border-r border-slate-200 
        flex flex-col transition-all duration-300 z-50
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Stethoscope size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">ATTENDING</span>
            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">AI</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>
      
      {/* Search */}
      {!collapsed && (
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {navigationSections.map((section) => (
          <NavSectionComponent
            key={section.id}
            section={section}
            currentPath={currentPath}
            collapsed={collapsed}
          />
        ))}
      </div>
      
      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={18} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default NavigationSidebar;
