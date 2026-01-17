// PageHeader.tsx
// Standardized page header matching HTML prototype design
// apps/provider-portal/components/shared/PageHeader.tsx

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface PageHeaderAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
}

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Icon to display (Lucide icon component) */
  icon?: LucideIcon;
  /** Gradient color for icon background */
  iconColor?: 'purple' | 'blue' | 'green' | 'indigo' | 'amber' | 'red' | 'teal';
  /** Right-side content (actions, toggles, etc.) */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const iconGradients: Record<string, string> = {
  purple: 'from-purple-500 to-indigo-600',
  blue: 'from-blue-500 to-indigo-600',
  green: 'from-green-500 to-teal-600',
  indigo: 'from-indigo-500 to-purple-600',
  amber: 'from-amber-500 to-orange-600',
  red: 'from-red-500 to-rose-600',
  teal: 'from-teal-500 to-cyan-600',
};

/**
 * PageHeader - Standardized page header component
 * 
 * Matches the HTML prototype design with:
 * - Gradient icon background
 * - Title and subtitle
 * - Right-side action area
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   title="Laboratory Orders"
 *   subtitle="AI-Guided Diagnostic Workup"
 *   icon={TestTube}
 *   iconColor="green"
 * >
 *   <ModeToggle value={mode} onChange={setMode} />
 * </PageHeader>
 * ```
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'purple',
  children,
  className = '',
}) => {
  return (
    <div className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Icon, Title, Subtitle */}
          <div className="flex items-center gap-4">
            {Icon && (
              <div 
                className={`w-12 h-12 bg-gradient-to-br ${iconGradients[iconColor]} 
                           rounded-xl flex items-center justify-center shadow-lg`}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: Actions/Children */}
          {children && (
            <div className="flex items-center gap-3 flex-wrap">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;

// ============================================================================
// Sub-components for common header patterns
// ============================================================================

export interface ModeToggleProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * ModeToggle - Common toggle pattern for view modes
 */
export const ModeToggle: React.FC<ModeToggleProps> = ({
  options,
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex rounded-lg border border-gray-300 p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export interface FilterToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * FilterToggle - Common checkbox toggle for filters
 */
export const FilterToggle: React.FC<FilterToggleProps> = ({
  label,
  checked,
  onChange,
}) => {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
};
