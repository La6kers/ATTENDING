// ============================================================
// Enhanced Button Component - @attending/shared
// apps/shared/components/ui/Button.tsx
// 
// Aligned with HTML prototype design patterns
// ============================================================

import * as React from 'react';
import { cn } from '../../lib/utils';

// ============================================================
// DESIGN TOKENS (from HTML prototypes)
// ============================================================

export const GRADIENTS = {
  brand: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  brandHover: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)',
  brandExtended: 'linear-gradient(135deg, #4c51bf 0%, #553c9a 25%, #6b46c1 50%, #7c3aed 75%, #8b5cf6 100%)',
  danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  dangerHover: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  stat: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
} as const;

// ============================================================
// TYPES
// ============================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'emergency' | 'stat';
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Shape variant */
  shape?: 'default' | 'pill' | 'square';
  /** Show loading spinner */
  loading?: boolean;
  /** Icon to show before text */
  leftIcon?: React.ReactNode;
  /** Icon to show after text */
  rightIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Enable hover elevation animation */
  elevated?: boolean;
}

// ============================================================
// STYLES
// ============================================================

const baseStyles = `
  inline-flex items-center justify-center font-semibold
  transition-all duration-200 ease-out
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  cursor-pointer
`;

const variantStyles: Record<NonNullable<ButtonProps['variant']>, {
  className: string;
  style?: React.CSSProperties;
  hoverStyle?: React.CSSProperties;
}> = {
  primary: {
    className: 'text-white border-transparent focus:ring-purple-500 hover:shadow-lg hover:-translate-y-0.5',
    style: { background: GRADIENTS.brand },
    hoverStyle: { background: GRADIENTS.brandHover },
  },
  secondary: {
    className: 'bg-purple-100 text-purple-700 border-transparent hover:bg-purple-200 focus:ring-purple-500',
  },
  outline: {
    className: 'border-2 border-gray-300 bg-white text-gray-700 hover:border-purple-500 hover:text-purple-600 focus:ring-purple-500',
  },
  ghost: {
    className: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border-transparent',
  },
  danger: {
    className: 'text-white border-transparent focus:ring-red-500 hover:shadow-lg hover:-translate-y-0.5',
    style: { background: GRADIENTS.danger },
    hoverStyle: { background: GRADIENTS.dangerHover },
  },
  success: {
    className: 'text-white border-transparent focus:ring-green-500 hover:shadow-lg hover:-translate-y-0.5',
    style: { background: GRADIENTS.success },
  },
  warning: {
    className: 'text-white border-transparent focus:ring-yellow-500 hover:shadow-lg hover:-translate-y-0.5',
    style: { background: GRADIENTS.warning },
  },
  // Clinical-specific variants
  emergency: {
    className: 'text-white border-transparent focus:ring-red-500 animate-pulse-urgent hover:shadow-xl',
    style: { background: GRADIENTS.danger },
  },
  stat: {
    className: 'text-white border-transparent focus:ring-orange-500 hover:shadow-lg hover:-translate-y-0.5',
    style: { background: GRADIENTS.stat },
  },
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'px-3 py-1.5 text-xs gap-1.5',
  sm: 'px-4 py-2 text-sm gap-2',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const shapeStyles: Record<NonNullable<ButtonProps['shape']>, string> = {
  default: 'rounded-lg',
  pill: 'rounded-full',
  square: 'rounded-none',
};

// ============================================================
// COMPONENT
// ============================================================

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      shape = 'pill', // Default to pill for brand consistency
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      fullWidth = false,
      elevated = true,
      children,
      style,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const variantConfig = variantStyles[variant];

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(true);
      onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false);
      onMouseLeave?.(e);
    };

    const computedStyle: React.CSSProperties = {
      ...variantConfig.style,
      ...(isHovered && variantConfig.hoverStyle),
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantConfig.className,
          sizeStyles[size],
          shapeStyles[shape],
          fullWidth && 'w-full',
          elevated && 'active:translate-y-0 active:shadow-sm',
          className
        )}
        style={computedStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================
// QUICK ACTION BUTTON (from HTML prototypes)
// ============================================================

export interface QuickActionButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'shape'> {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

export const QuickActionButton = React.forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  ({ icon, label, active, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
        'transition-all duration-200 border',
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
        active 
          ? 'bg-purple-100 text-purple-700 border-purple-200' 
          : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50',
        'hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
      {...props}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  )
);

QuickActionButton.displayName = 'QuickActionButton';

// ============================================================
// FLOATING ACTION BUTTON (from HTML prototypes)
// ============================================================

export interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  /** Position preset */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Pulsing animation for recording state */
  pulsing?: boolean;
}

export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ icon, position = 'bottom-right', pulsing, className, style, ...props }, ref) => {
    const positionStyles: Record<NonNullable<FloatingActionButtonProps['position']>, string> = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'fixed w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'text-white shadow-lg',
          'transition-all duration-200',
          'hover:scale-110 hover:shadow-xl',
          'focus:outline-none focus:ring-4 focus:ring-purple-300',
          'active:scale-95',
          positionStyles[position],
          pulsing && 'animate-pulse',
          className
        )}
        style={{
          background: pulsing 
            ? GRADIENTS.danger
            : GRADIENTS.brand,
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          ...style,
        }}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

FloatingActionButton.displayName = 'FloatingActionButton';

// ============================================================
// STATUS TOGGLE BUTTON (✓/✗/? pattern from HTML)
// ============================================================

export type StatusValue = 'present' | 'absent' | 'unknown';

export interface StatusToggleProps {
  value: StatusValue;
  onChange: (value: StatusValue) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<StatusValue, { symbol: string; activeClass: string }> = {
  present: { symbol: '✓', activeClass: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md' },
  absent: { symbol: '✗', activeClass: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md' },
  unknown: { symbol: '?', activeClass: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md' },
};

export const StatusToggle: React.FC<StatusToggleProps> = ({
  value,
  onChange,
  disabled,
  size = 'md',
  className,
}) => {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  return (
    <div className={cn('flex gap-1', className)}>
      {(['present', 'absent', 'unknown'] as StatusValue[]).map((status) => (
        <button
          key={status}
          onClick={() => onChange(status)}
          disabled={disabled}
          className={cn(
            sizeClass,
            'rounded-full flex items-center justify-center font-medium',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1',
            value === status
              ? statusConfig[status].activeClass
              : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {statusConfig[status].symbol}
        </button>
      ))}
    </div>
  );
};

export default Button;
