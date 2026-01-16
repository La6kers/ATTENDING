// ============================================================
// Pre-Visit Summary - Collapsible Section Component
// apps/provider-portal/components/previsit/CollapsibleSection.tsx
// ============================================================

import React, { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp, Check, Clock } from 'lucide-react';

export interface CollapsibleSectionProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  status?: 'pending' | 'reviewed' | 'flagged';
  priority?: 'urgent' | 'high' | 'normal';
  children: ReactNode;
  onMarkReviewed?: () => void;
}

const statusConfig = {
  pending: {
    label: 'Pending Review',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  reviewed: {
    label: 'Reviewed',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: Check,
  },
  flagged: {
    label: 'Flagged',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: Clock,
  },
};

const priorityConfig = {
  urgent: 'border-l-red-500',
  high: 'border-l-amber-500',
  normal: 'border-l-gray-300',
};

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  badge,
  defaultOpen = true,
  status = 'pending',
  priority = 'normal',
  children,
  onMarkReviewed,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${priorityConfig[priority]} overflow-hidden mb-4`}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-900">
            {title}
            {badge !== undefined && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                {badge}
              </span>
            )}
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
          
          {/* Expand/Collapse Icon */}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-5 pb-4 border-t border-gray-100">
          {children}
        </div>
        
        {/* Mark as Reviewed Button */}
        {status === 'pending' && onMarkReviewed && (
          <div className="px-5 pb-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkReviewed();
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Mark as Reviewed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollapsibleSection;
