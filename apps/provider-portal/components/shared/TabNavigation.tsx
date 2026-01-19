// TabNavigation.tsx
// Standardized tab navigation matching HTML prototype design
// apps/provider-portal/components/shared/TabNavigation.tsx

import type { ReactNode } from 'react';
import React from 'react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon (Lucide icon component) */
  icon?: LucideIcon;
  /** Optional badge count */
  badge?: number;
  /** Badge color variant */
  badgeColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Whether tab is disabled */
  disabled?: boolean;
}

export interface TabNavigationProps {
  /** Array of tab items */
  tabs: TabItem[];
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tabId: string) => void;
  /** Visual variant */
  variant?: 'underline' | 'pills' | 'buttons';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const badgeColors: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-indigo-100 text-indigo-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
};

const sizeClasses = {
  sm: {
    tab: 'px-4 py-2 text-xs',
    icon: 'w-3 h-3',
    badge: 'text-xs px-1.5 py-0.5',
  },
  md: {
    tab: 'px-6 py-3 text-sm',
    icon: 'w-4 h-4',
    badge: 'text-xs px-2 py-0.5',
  },
  lg: {
    tab: 'px-8 py-4 text-base',
    icon: 'w-5 h-5',
    badge: 'text-sm px-2.5 py-0.5',
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * TabNavigation - Standardized tab component matching HTML prototype
 * 
 * Supports multiple visual variants:
 * - `underline`: Traditional underlined tabs (default)
 * - `pills`: Pill-style background tabs
 * - `buttons`: Button group style
 * 
 * @example
 * ```tsx
 * const tabs = [
 *   { id: 'ai', label: 'AI Recommendations', icon: Brain, badge: 3 },
 *   { id: 'panels', label: 'Lab Panels', icon: Package },
 *   { id: 'catalog', label: 'Full Catalog', icon: Search, badge: 156 },
 * ];
 * 
 * <TabNavigation
 *   tabs={tabs}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 *   variant="underline"
 * />
 * ```
 */
const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  const sizes = sizeClasses[size];

  // ========================================
  // Underline Variant
  // ========================================
  if (variant === 'underline') {
    return (
      <div className={`border-b border-gray-200 ${className}`}>
        <div className={`flex ${fullWidth ? '' : 'space-x-0'}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                disabled={tab.disabled}
                className={`
                  flex items-center gap-2 ${sizes.tab} font-medium
                  border-b-2 transition-all duration-200
                  ${fullWidth ? 'flex-1 justify-center' : ''}
                  ${isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {Icon && <Icon className={sizes.icon} />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`
                    ${sizes.badge} rounded-full font-semibold
                    ${isActive 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : badgeColors[tab.badgeColor || 'default']
                    }
                  `}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ========================================
  // Pills Variant
  // ========================================
  if (variant === 'pills') {
    return (
      <div className={`flex gap-2 p-1 bg-gray-100 rounded-lg ${fullWidth ? 'w-full' : 'w-fit'} ${className}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={`
                flex items-center gap-2 ${sizes.tab} font-medium rounded-md
                transition-all duration-200
                ${fullWidth ? 'flex-1 justify-center' : ''}
                ${isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {Icon && <Icon className={sizes.icon} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`
                  ${sizes.badge} rounded-full font-semibold
                  ${isActive 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : badgeColors[tab.badgeColor || 'default']
                  }
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ========================================
  // Buttons Variant
  // ========================================
  return (
    <div className={`inline-flex rounded-lg border border-gray-300 p-1 ${fullWidth ? 'w-full' : ''} ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              flex items-center gap-2 ${sizes.tab} font-medium rounded-md
              transition-all duration-200
              ${fullWidth ? 'flex-1 justify-center' : ''}
              ${isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
              }
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {Icon && <Icon className={sizes.icon} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`
                ${sizes.badge} rounded-full font-semibold
                ${isActive 
                  ? 'bg-white/20 text-white' 
                  : badgeColors[tab.badgeColor || 'default']
                }
              `}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;

// ============================================================================
// Tab Panel Helper
// ============================================================================

export interface TabPanelProps {
  /** Tab ID this panel belongs to */
  tabId: string;
  /** Currently active tab ID */
  activeTab: string;
  /** Panel content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TabPanel - Conditionally renders content based on active tab
 * 
 * @example
 * ```tsx
 * <TabPanel tabId="ai" activeTab={activeTab}>
 *   <AIRecommendations />
 * </TabPanel>
 * ```
 */
export const TabPanel: React.FC<TabPanelProps> = ({
  tabId,
  activeTab,
  children,
  className = '',
}) => {
  if (tabId !== activeTab) return null;
  
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
};
