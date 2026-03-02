// FloatingActionButton.tsx
// Floating action button matching HTML prototype
// apps/provider-portal/components/shared/FloatingActionButton.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  X,
  Stethoscope,
  TestTube,
  FileImage,
  Pill,
  Users,
  AlertTriangle,
} from 'lucide-react';

export interface FABAction {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  color?: string;
  urgent?: boolean;
}

export interface FloatingActionButtonProps {
  actions?: FABAction[];
  mainIcon?: React.ElementType;
  mainLabel?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  showLabels?: boolean;
  onEmergency?: () => void;
  className?: string;
}

const defaultActions: FABAction[] = [
  { 
    id: 'new-assessment', 
    label: 'New Assessment', 
    icon: Stethoscope, 
    href: '/patient-assessment',
    color: 'bg-teal-500 hover:bg-teal-600'
  },
  { 
    id: 'order-labs', 
    label: 'Order Labs', 
    icon: TestTube, 
    href: '/labs',
    color: 'bg-green-500 hover:bg-green-600'
  },
  { 
    id: 'order-imaging', 
    label: 'Order Imaging', 
    icon: FileImage, 
    href: '/imaging',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  { 
    id: 'prescribe', 
    label: 'E-Prescribe', 
    icon: Pill, 
    href: '/medications',
    color: 'bg-indigo-500 hover:bg-indigo-600'
  },
  { 
    id: 'referral', 
    label: 'New Referral', 
    icon: Users, 
    href: '/referrals',
    color: 'bg-teal-500 hover:bg-teal-600'
  },
];

const positionClasses = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions = defaultActions,
  mainIcon: MainIcon = Plus,
  mainLabel = 'Quick Actions',
  position = 'bottom-right',
  showLabels = true,
  onEmergency,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleActionClick = (action: FABAction) => {
    if (action.onClick) {
      action.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 ${className}`}>
      {/* Action Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 animate-slide-up">
          {/* Emergency Protocol - Always at top when open */}
          {onEmergency && (
            <button
              onClick={() => {
                onEmergency();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 group"
            >
              {showLabels && (
                <span className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Emergency Protocol
                </span>
              )}
              <div className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 animate-pulse-urgent">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </button>
          )}

          {/* Regular Actions */}
          {actions.map((action, index) => {
            const Icon = action.icon;
            const content = (
              <div className="flex items-center gap-3 group">
                {showLabels && (
                  <span className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {action.label}
                  </span>
                )}
                <div
                  className={`w-12 h-12 ${action.color || 'bg-gray-600 hover:bg-gray-700'} rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            );

            if (action.href) {
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  onClick={() => setIsOpen(false)}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fab w-14 h-14 rounded-full flex items-center justify-center
          bg-gradient-to-br from-teal-500 to-teal-600
          shadow-lg hover:shadow-xl
          transition-all duration-300 ease-out
          ${isOpen ? 'rotate-45 scale-110' : 'hover:scale-110'}
        `}
        aria-label={mainLabel}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MainIcon className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Simple FAB without menu
export const SimpleFAB: React.FC<{
  icon?: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  color?: string;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}> = ({
  icon: Icon = Plus,
  label,
  href,
  onClick,
  color = 'from-teal-500 to-teal-600',
  position = 'bottom-right',
  className = '',
}) => {
  const positionClass = position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6';

  const buttonContent = (
    <button
      onClick={onClick}
      className={`
        fixed ${positionClass} z-40
        w-14 h-14 rounded-full flex items-center justify-center
        bg-gradient-to-br ${color}
        shadow-lg hover:shadow-xl hover:scale-110
        transition-all duration-200
        ${className}
      `}
      aria-label={label}
      title={label}
    >
      <Icon className="w-6 h-6 text-white" />
    </button>
  );

  if (href) {
    return <Link href={href}>{buttonContent}</Link>;
  }

  return buttonContent;
};

export default FloatingActionButton;
