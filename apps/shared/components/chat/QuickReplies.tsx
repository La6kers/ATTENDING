// =============================================================================
// ATTENDING AI - Unified Quick Replies Component
// apps/shared/components/chat/QuickReplies.tsx
//
// Shared quick reply buttons used by both Patient and Provider portals.
// Handles various button variants and layouts.
// =============================================================================

import React from 'react';
import type { QuickReply } from '../../types/chat.types';

// =============================================================================
// Props Interface
// =============================================================================

export interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  disabled?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// =============================================================================
// Icon Component
// =============================================================================

const QuickReplyIcon: React.FC<{ icon?: QuickReply['icon'] }> = ({ icon }) => {
  if (!icon) return null;

  const iconClasses = 'w-4 h-4';

  switch (icon) {
    case 'check':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'x':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'arrow':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      );
    case 'alert':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    default:
      return null;
  }
};

// =============================================================================
// Variant Styles
// =============================================================================

const getVariantStyles = (variant: QuickReply['variant'], disabled: boolean): string => {
  const baseStyles = 'transition-all duration-200 font-medium';
  
  if (disabled) {
    return `${baseStyles} opacity-50 cursor-not-allowed bg-gray-100 text-gray-400`;
  }

  switch (variant) {
    case 'primary':
      return `${baseStyles} bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg`;
    case 'success':
      return `${baseStyles} bg-green-100 text-green-700 hover:bg-green-200 border border-green-300`;
    case 'warning':
      return `${baseStyles} bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300`;
    case 'danger':
      return `${baseStyles} bg-red-100 text-red-700 hover:bg-red-200 border border-red-300`;
    default:
      return `${baseStyles} bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-purple-300`;
  }
};

const getSizeStyles = (size: 'sm' | 'md' | 'lg'): string => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-xs rounded-lg';
    case 'lg':
      return 'px-5 py-3 text-base rounded-xl';
    default:
      return 'px-4 py-2 text-sm rounded-xl';
  }
};

const getLayoutStyles = (layout: 'horizontal' | 'vertical' | 'grid'): string => {
  switch (layout) {
    case 'vertical':
      return 'flex flex-col gap-2';
    case 'grid':
      return 'grid grid-cols-2 gap-2';
    default:
      return 'flex flex-wrap gap-2';
  }
};

// =============================================================================
// Quick Replies Component
// =============================================================================

export const QuickReplies: React.FC<QuickRepliesProps> = ({
  replies,
  onSelect,
  disabled = false,
  layout = 'horizontal',
  size = 'md',
  className = '',
}) => {
  if (!replies.length) return null;

  // Group by category if present
  const hasCategories = replies.some(r => r.category);
  
  if (hasCategories) {
    const grouped = replies.reduce((acc, reply) => {
      const cat = reply.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(reply);
      return acc;
    }, {} as Record<string, QuickReply[]>);

    return (
      <div className={`space-y-3 ${className}`}>
        {Object.entries(grouped).map(([category, categoryReplies]) => (
          <div key={category}>
            <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">
              {category}
            </p>
            <div className={getLayoutStyles(layout)}>
              {categoryReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => !disabled && onSelect(reply)}
                  disabled={disabled}
                  className={`
                    ${getVariantStyles(reply.variant, disabled)}
                    ${getSizeStyles(size)}
                    flex items-center justify-center gap-2
                  `}
                >
                  <QuickReplyIcon icon={reply.icon} />
                  <span>{reply.text}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`${getLayoutStyles(layout)} ${className}`}>
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => !disabled && onSelect(reply)}
          disabled={disabled}
          className={`
            ${getVariantStyles(reply.variant, disabled)}
            ${getSizeStyles(size)}
            flex items-center justify-center gap-2
          `}
        >
          <QuickReplyIcon icon={reply.icon} />
          <span>{reply.text}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;
